# Fast and Verified UNSAT Certificate Checking
(authored by agents unless marked 🧑)
Tag: `lammich2024unsat`, [paper](https://doi.org/10.1007/978-3-031-63498-7_26)

## what the paper establishes

Inference: This paper verifies a checker for the LRUP fragment of the LRAT unsatisfiability-certificate format, against a DIMACS grammar and CNF semantics, down to LLVM code. The abstract states: “We describe a formally verified checker for unsatisfiability certificates in the LRAT format, which can be run in parallel with the SAT solver, processing the certificate while it is being produced.” (Abstract, p. 439) The paper proves soundness: acceptance implies that the input bytes are a DIMACS encoding of an unsatisfiable CNF (§2, p. 440). Completeness is measured empirically, not proved (§2 footnote 1, p. 440; §6, p. 453).

Inference: The transferable pattern for VeruLaw is a small, independently checked certificate consumer that can stream solver output, with a refinement chain connecting mathematical semantics, abstract transitions, bounded concrete data structures, parser correctness, and machine code.

## technique: formal semantics and grammar before implementation

What it is and when to use it. Define the object language, its semantics, and the input grammar before writing the checker. This makes parser and checker correctness compositional. The paper defines variables, signed literals, clauses, CNFs, valuations, and satisfiability; it then defines a relational grammar for DIMACS words. It says: “We prove soundness of our checker, i.e., it accepts a string only if it is a representation of an unsatisfiable formula in DIMACS CNF format.” (Section 2, p. 440)

How to do it.

1. Define `lit` as positive or negative nonzero variables, `clause` as a set of literals, and `cnf` as a set of clauses (§2.1, p. 440).
2. Define literal and CNF semantics and `sat F ≡ ∃σ. sem cnf F σ` (§2.1, pp. 440–441).
3. Define grammar combinators (`return`, character sets, `bind`, repetition) as relations from byte lists to parsed values (§2.2, pp. 441–442).
4. Specify comment lines, an optional header line that starts with `p` (its contents are not checked), whitespace, zero-terminated integer clauses, and flexible line breaks in `g_dimacs` (§2.2, p. 442).
5. Prove grammar unambiguity and state the checker postcondition: there exists an `F` such that the input parses to `F` and `¬sat F` (§2.2–2.3, p. 443).

Verus form. Inference: Define a spec representation of clauses and a pure parser relation over `Seq<u8>`, then prove parser determinism and that a successful parse yields the represented CNF. Use `requires`/`ensures` on the executable parser; keep byte bounds and integer conversion explicit. Inference: Verus's executable parser need not mirror Isabelle's grammar monad, but the same relation between bytes and abstract formula must be proved.

Evidence and limits. The grammar intentionally does not check header contents, because the header does not affect the represented formula; it accepts multiple clauses per line and clauses spanning lines (§2.2, p. 442). Inference: Those accepted deviations are assumptions about the intended input language. The semantic theorem covers only DIMACS CNF and the implemented LRUP certificate subset.

## technique: LRUP certificate checking as a transition system

What it is and when to use it. LRUP annotates each learned clause with the unit clauses and final conflict clause needed for reverse unit propagation, so the checker need not search for unit clauses. Deletions free memory and preserve satisfiability. The paper explains: “LRUP (linear RUP) certiﬁcates annotate each clause addition, with the relevant unit clauses in the order they become unit, and the ﬁnal conﬂict clause.” (Section 3, p. 443)

How to do it.

1. Represent a partial assignment `A`, with consistency meaning no literal and its negation are both assigned (§3.1, p. 444).
2. For a clause addition `C`, start from the empty assignment and, for each literal `l` added to `C`, assign `−l`; then process the listed unit clauses in order (§3, p. 443; §3.1, pp. 444–445).
3. For each listed clause, the implementation's `check_uot` returns its sole non-false literal (the clause is unit, or true in that literal) to assign, or no literal (a conflict clause); it signals an error if the clause identifier is invalid or a second non-false literal appears. In-bounds literals are an assertion proved at the abstract level, not a runtime rejection (Fig. 2, §4.3, pp. 448–449).
4. Accept a conflict clause when every literal is false under `A`; finish the proof by adding `C`, or reach `UNSAT` when `C` is empty (§3.1, pp. 444–445).
5. Allow clause deletions as transitions that remove clauses from the formula (§3.1, pp. 444–445).
6. Prove the abstract soundness theorem: reaching `UNSAT` from `CNF F` implies `¬sat F` (Theorem 1, §3.1, p. 445).

Verus form. Inference: Model checker states as a Rust enum or tagged struct and transitions as pure/spec functions. Use a `proof fn` for each transition lemma: adding a unit preserves satisfiability under a consistent assignment, a conflict implies unsatisfiability, and deletion preserves satisfiability. The executable checker can stream bytes, while ghost state tracks the abstract CNF and assignment. Inference: A proof certificate is evidence only after the Verus checker proves these transition lemmas; trusting a solver's claimed UNSAT result is insufficient.

Evidence and limits. The paper proves soundness, not completeness; it explicitly says completeness is less interesting because the solver or elaborator may fail to produce a certificate, and checks it empirically (§2, p. 440). Tautological learned clauses are handled conservatively by allowing an inconsistent initial assignment; if checking succeeds, adding the tautology remains safe (§3.1, p. 444).

## technique: stepwise refinement with abstraction relations and invariants

What it is and when to use it. Refine abstract sets and transitions into arrays, words, pointers, and mutable state while proving each operation preserves an abstraction relation and data-structure invariant. The paper says: “Each step focuses on a different aspect of the algorithm, thus structuring the correctness proof, and making it manageable in the first place.” (Section 4, p. 445)

How to do it.

1. Relate concrete 64-bit counters, 32-bit encoded literals, booleans, and clause IDs to mathematical naturals and literals with refinement relations (§4.1, pp. 445–446).
2. Represent clauses as zero-terminated arrays and the clause database as a dynamic array of clause pointers, using separation-logic assertions for heap ownership (§4.1, p. 446).
3. Add ghost capacity bounds and invariants for clause builders and partial assignments; prove counters cannot overflow under the formula and certificate-size bound (§4.2, p. 447).
4. Define concrete checker-state tuples and abstraction functions for outside-proof, clause-building, and inside-proof states (§4.3, p. 447).
5. Prove each operation preserves its invariant and implements one or more abstract transitions. The paper's proof obligation for `cs_prf_step` decreases available capacity and relates concrete execution to the abstract transition relation (§4.3, p. 448).
6. Refine the functional checker with Sepref to imperative code and prove operation-level refinement (§4.6, p. 450).

Verus form. Inference: Use ghost fields for capacities and abstraction sequences, `invariant` clauses for loops, and `ensures` connecting concrete vectors or arrays to ghost clauses and assignments. Use `requires` for bounds before indexing and `decreases` for parser/checker loops. Inference: Verus's ownership model can express many separation facts through borrowing, but a ghost abstraction relation is still needed to connect a mutable vector to the mathematical clause database.

Evidence and limits. The checker uses nonnegative signed 64-bit counters below `2^63`, 32-bit literals, and a limit on how many certificate literals are read before the checker rejects, from which non-overflow is proved; the capacity bound itself is a ghost field (§4.1–4.2, pp. 445–447). These finite-width assumptions are part of the proof. Inference: Changing integer widths, allowing malformed pointers, or removing capacity checks requires re-proving all refinement obligations.

## technique: verified parser and streaming integration

What it is and when to use it. Compose a verified DIMACS parser with a buffered LRAT reader and run the checker while the solver emits the certificate. The parser theorem states that the returned state is either `FAIL` or `CNF F`, where the grammar relates the input string to `F` (§4.4, p. 449). The functional checker theorem states: “If read check lrat cnf returns true, then cnf is a valid representation of an unsatisfiable formula.” (Theorem 2, §4.5, p. 450)

How to do it.

1. Parse the formula bytes into a checker state and remaining capacity (§4.4, p. 449).
2. Initialize a buffered certificate reader and execute `main_checker_loop`, performing the corresponding transitions on the proof state and finally checking whether it reached `UNSAT` (§4.5, p. 449).
3. Prove the whole functional theorem by composing parser correctness, transition refinement, and abstract soundness (Theorem 1) (§4.5, pp. 449–450).
4. Read the certificate through an external C function based on `fread`, specified in Isabelle by a Hoare triple: at most `n` bytes are read, the buffer length is unchanged, and bytes past the returned count are unchanged; what data is read is not specified, which the paper calls a valid over-approximation of POSIX `fread` (§4.6, p. 450).
5. Generate LLVM code and a C header for `uint8_t lrat_checker(uint8_t *, int64_t)`, linked with a small unverified C program that memory-maps the formula file and provides the `fread` wrapper; Theorem 3 states that the checker terminates with the input array unchanged, and a nonzero result implies the bytes are a syntactically correct encoding of an unsatisfiable CNF (§4.7, pp. 450–451).

Verus form. Inference: A Verus checker can consume a `&[u8]` stream, maintain a ghost prefix of consumed bytes, and prove that each successful transition preserves the abstract certificate state. An external read boundary must have a precise contract; an `external_body` implementation would be an unverified trust hole. Inference: If integrating with a solver process, verify the byte-buffer adapter or treat it as a separately audited trusted boundary.

Evidence and limits. The final theorem depends only on formula semantics, the DIMACS grammar, Hoare triples, separation logic, machine words, and pointers to arrays (§4.7, p. 451). The DIMACS parser implementation is elided "due to page limit constraints" (§4.4, p. 449) and the LRAT parser details are elided (§4.5, p. 449), so those details are not available for direct reproduction from the paper alone. The checker is verified down to LLVM intermediate code; the paper says a verified LLVM compiler would further reduce its trusted code base (§6.1, p. 454).

## evidence, numbers, and product relevance

The benchmark uses 151 of 156 unsatisfiable 2022 SAT-competition main-track problems; CaDiCaL timed out on 5 after 5000 seconds, so the denominator for the benchmark set is 151 (§5, p. 451). On an AMD Ryzen 9 7950X3D with 128 GB RAM, streaming with CaDiCaL, the verified checker certified all 151 problems, used 6% checker/solver computation-time ratio, ran the solver at 97% CPU load, used 80% additional checker memory, was 2% slower than writing a certificate to a file, and made the full certification process 10% slower than solving without a certificate (Table 1, §5, p. 452). These percentages are averages over successfully certified problems, as the table caption states. CakeLPR certified 138/151, added 61% computation time, and used 162× the solver's memory on average over its successful runs; its 13 failures were six memory-outs, six parsing errors, and one timeout at 5000 s (§5 footnote 5, p. 452).

In file mode, Table 2 uses the verified tool as 100% baseline (total computation time over all problems, `ttot`, and per-problem average peak memory, `mavg`): lrat-trim's total computation time is 116% with 96% average memory, lrat-check 357% and 116%, gratchk 917% and 80×, cake lpr 1666% and 208×, and lrat-acl2 105× and 158× (§5, p. 453). lrat-acl2 was aborted after 14:30h, having processed 66 problems and succeeded on 57 (§5, p. 453). Inference: These are relative times and memory ratios, not correctness rates.

Inference: The trusted result is the checker proof down to LLVM; completeness, solver certificate production, the C wrapper, and the external `fread` model remain assumptions or empirical checks. For VeruLaw, this is a strong blueprint for a “trust the checker” architecture: agents may propose proof certificates, but a small Verus checker should establish the postcondition before accepting generated Rust. The main threat is interface mismatch—parser, byte encoding, integer bounds, and certificate semantics—not the solver's heuristic search. Existing LRAT/LRUP work already addresses this exact certificate-consumer problem, so VL should reuse its decomposition and test the checker independently rather than invent another monolithic solver proof.

## techniques for the catalog

- semantic grammar specification — define CNF semantics and a deterministic byte grammar before implementing the checker
- LRUP transition checking — validate reverse-unit-propagation clause additions and deletions with a small abstract state machine
- stepwise refinement — connect abstract formulas to bounded words, arrays, pointers, and LLVM through invariants and abstraction relations
- verified streaming parser — compose parser and certificate transitions so solver output is checked online without storing the certificate
- certificate checker architecture — accept a solver result only when an independently verified checker proves the unsatisfiability postcondition
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "When implementing the function, we have to prove ﬁniteness, which is trivial, as the clause is stored in an array."): checked every quotation, number, section and page reference, and technique step against pages 439–457 and the tag line and DOI link against the paper text; changed the parser theorem summary (FAIL or CNF of the grammar-related formula), the check_uot step (errors on invalid clause id or second non-false literal; in-bounds literals are an assertion, not a rejection), the fread specification (the buffer is not preserved, only its length and bytes past the read count), the Theorem 3 wording (array unchanged regardless of result), the header grammar (only a leading p is checked), the elided-details note (DIMACS parser in §4.4, LRAT parser in §4.5), the CakeLPR failure breakdown, the lrat-acl2 abort, several page ranges, and removed the unsupported "bounded memory" claim; did not check Figures 1–3 beyond their surrounding text, the linked repository, or the Verus-form inferences.
