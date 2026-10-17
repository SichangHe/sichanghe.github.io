# Efficient Branch-and-Bound Testing and Verification of zkVMs
(authored by agents unless marked 🧑)
Tag: `takahashi2026zebra`, [paper](http://arxiv.org/abs/2609.15020v1)

## problem and correctness criterion
Takahashi, Jana, and Yang introduce ZEBRA for checking zero-knowledge virtual-machine constraint systems. A zkVM constraint system should admit exactly the valid execution traces for a fixed program and input. The paper states: “for a given program and input, the constraint system must admit exactly one valid execution trace—no more (soundness) and no fewer (completeness).” (abstract, p. 1). The abstract says a single missing or incorrect constraint can admit forged proofs (under-constrained) or reject valid executions (over-constrained) (abstract, p. 1); in terms of traces, more than one valid trace is under-constrained and none is over-constrained (section 1, p. 2).

ZEBRA reduces this to cardinality over a canonical trace space. For program `P`, input `x`, and trace `T`, it defines `S(P,x) = {T | C(P,x,T)}`. Completeness is `|S| ≥ 1`, soundness is `|S| ≤ 1`, and full correctness is `|S| = 1`; `|S| > 1` flags under-constraint and `|S| = 0` flags over-constraint (section 1, p. 2). Canonicalization is required before counting because padding, row permutations, and unconstrained witness cells can represent one execution multiple ways (section 1, p. 2).

The framework targets local correctness in bounded input regions. It isolates one target table and assumes the other trace tables are correct and consistent with the instance tables (section 5.1, p. 5). Its local proof theorem gives soundness and completeness for the localized constraint system under those assumptions (Theorem 5.2, p. 6; proof sketch in Appendix B.4). The paper does not implement its proposed fixed-point composition of local certificates into a global proof; that iteration is future work (section 1, p. 2; section 9, p. 13).

## technique: canonicalize traces before counting
Use canonicalization whenever different table encodings can represent the same semantic execution. ZEBRA defines a canonicalizer `R` that removes padding and internal helper columns and normalizes row permutations (section 4.4, p. 5; section 6.2, p. 7). Semantic equivalence is `T1 ~R T2` exactly when `R(T1)=R(T2)`, and the canonical trace space is the quotient by this relation (Definitions 4.7–4.8, p. 5).

Steps:

1. Identify the semantic execution record for each table type (section 6.2, p. 7).
2. Project each raw trace table to that record, ignoring padding and helper witnesses (section 4.4, p. 5).
3. Normalize row order and other representational variation (section 4.4, p. 5).
4. Deduplicate canonical records before computing solution-set cardinality (Algorithm 1, line 9, p. 6).
5. Prove injectivity: distinct executions map to distinct canonical forms (section 6.2, p. 7; Appendix C.1).

For ALU and control-flow tables, a row is represented by current and next program counters plus operands; memory rows include accessed values and immediates; CPU rows reconstruct clock, program counter, and writes (section 6.2, p. 7). The authors formalize generator independence, a bijection between the canonical trace space and the canonicalizer image, and injectivity with respect to distinct executions in Lean 4 at the algorithmic-specification level (section 6.2, p. 7; footnote 1, p. 2). They assume that the trace-table generator records every execution step as a non-padding row, with no spurious or missing records (section 6.2, p. 7); Appendix C.1 calls this the faithful table generation assumption and also requires the record encoding to be injective.

Inference: In Verus, define a canonical record type and a pure `spec fn` mapping raw traces to records. Prove that semantically equivalent traces map to equal records and that distinct executions map to unequal records, using `requires` and `ensures` on proof functions. The mapping is an inferred adaptation; the paper’s Lean development is not a Verus implementation.

## technique: sound interval over-approximation
Use interval abstraction to reason about many finite-field assignments at once. ZEBRA embeds integer intervals into the field by reducing every integer in `[a,b]` modulo the field prime (section 5.2, p. 5). An abstract constraint returns `True` only when all concrete points satisfy it, `False` only when all violate it, and `Uncertain` otherwise (Definition 5.1, p. 5).

Steps:

1. Initialize every target-table cell to `[0,p−1]`, where `p` is the field characteristic (Algorithm 1, p. 6).
2. Apply interval propagation to AIR polynomials, lookup constraints, and public-value checks (section 5.3, pp. 5–6; details in Appendix B).
3. For AIR, return `False` if any polynomial has no field value consistent with its interval; return `True` only when every polynomial has a singleton zero-compatible result; otherwise return `Uncertain` (Equation 10, p. 6).
4. For lookups, use type-specific interval rules: program membership, byte ranges and bit masks, ALU arithmetic, control-flow transitions, and memory read-after-write consistency (section 5.3, p. 6; Appendix B.3).
5. Preserve conservatism around modular wrap-around: the paper says wrap-around breaks standard interval behavior, so it designs conservative propagation rules (section 1, p. 2). For example, its ALU interval rule for multiplication returns the full word when the upper-bound product reaches the word size and the operands are not singletons (Table 8, Appendix B.3).

The paper emphasizes that “Modular arithmetic creates the main challenge: wrap-around at the field characteristic breaks standard interval behavior, so we design conservative propagation rules that preserve soundness.” (section 1, p. 2). The paper argues that, because real zkVM constraints are sparse, local propagation has limited over-approximation error; the measured density averages 0.140 over 50 tables from five zkVMs (section 1, p. 2; Appendix A, Table 6).

Inference: A Verus analogue uses interval-valued ghost state and proof lemmas for each arithmetic operation, with explicit modulo behavior. Verus’s SMT arithmetic is not automatically a sound interval abstract interpreter; the interval rules would need to be specified and proved. This is an inference.

## technique: branch-and-bound lattice search
Use branch-and-bound after interval propagation returns `Uncertain`. Algorithm 1 maintains a queue of interval states (section 5.4, p. 6).

Steps from Algorithm 1:

1. Push the root interval table into a queue and initialize the canonical solution set `Q` to empty (Algorithm 1, p. 6).
2. Pop an interval table and evaluate the abstract constraint (Algorithm 1, p. 6).
3. If the result is `False`, prune the entire sub-lattice (Algorithm 1, p. 6).
4. If the result is `True`, concretize the interval, canonicalize every concrete table, and insert unseen canonical records into `Q` (Algorithm 1, p. 6).
5. If the result is `Uncertain`, choose a divisible cell and split its interval into smaller intervals; enqueue both children (Algorithm 1, p. 6).
6. After the queue empties, report under-constraint when `|Q|>1` and over-constraint when `|Q|=0` (Algorithm 1, lines 14–15, p. 6); a singleton `|Q|=1` certifies local correctness (section 1, p. 2).

The search is parallel because branches are independent. The paper says: “Each branch splits the trace space into independent subproblems, enabling natural parallelism in contrast to SMT solvers.” (section 1, p. 2). The theorem states termination, local soundness, and local completeness under the stated fixed-table assumptions (Theorem 5.2, p. 6). The implementation uses worker threads on a shared queue and a priority score (the number of constraints already definitely satisfied) that only orders exploration and is never used to prune (section 6.3, pp. 7–8). Measured speedup from 1 to 4 workers is up to 2.12× (Ziren) and 1.24–1.63× on SP1, Sphinx, and Pico (section 7.3, p. 9; Table 3).

Inference: For Verus, the same structure can be represented by a recursive proof over a finite queue or by verified Rust code with a ghost set of intervals. A proof function should establish that pruning preserves the set of concrete satisfying traces and that splitting covers the parent interval. The paper does not provide Verus code.

## technique: range verification
Use range verification for instruction tables (such as ALU and control-flow tables) whose columns cleanly partition into inputs, output, and auxiliary cells. Initialize input cells with a broad interval `[L,R]`; branch-and-bound keeps a total cover of the search space. If `V` is the number of discrete input combinations, compare canonical solution cardinality to `V`: `|Q|=V` means sound and complete, `|Q|>V` under-constrained, and `|Q|<V` over-constrained (section 5.5, pp. 6–7).

This amortizes verification across a region rather than repeating a point check. At input volume `|V|=2^14`, the reported speedups over iterative point-wise verification are 63.1× for Valida, 42.1× Sphinx, 44.2× Pico, 34.1× SP1, and 39.7× Ziren (Table 2, p. 10; section 7.2, p. 9). These are five backend-specific comparisons against a theoretical baseline defined as volume times mean single-point verification time from the RQ1 experiment, not a measured run of repeated point checks (section 7.2, p. 9).

Inference: In Verus, range proofs can quantify over bounded integer or sequence domains when the invariant is uniform. The result must state the bound explicitly; it does not imply correctness for unbounded inputs.

## technique: automated constraint extraction and optimization
ZEBRA extracts constraints from Plonky3-based zkVMs using a dual path. Rust macros intercept AIR symbolic nodes such as `Add`, `Mul`, and `IsTransition`; static semantic lifting reconstructs lookup constraints transferred through channel-like buses; public-value checks are manually rewritten into symbolic form (section 6.1, p. 7). Porting to a new zkVM requires around 500 lines of tailored code, while the implementation has approximately 4,500 lines of Rust (section 6, p. 7).

Two optimizations are evaluated. Backward Refinement propagates constraints in reverse to shrink intervals, using three patterns: a selector fixed to 1 forcing a variable to a constant, a selector fixed to 1 forcing two variables equal, and an affine limb-and-quotient relation `a = L − d·e` with a side condition that rules out wrap-around; soundness lemmas are in Appendix C.2 (section 6.3, p. 8; Figure 4). Certified Circuit Elision lifts range-check circuits over four-limb field elements (BabyBear or KoalaBear ranges) into dedicated nodes so the interval evaluator applies bounds immediately and the symbolic tree shrinks (section 6.3, p. 8). Ablation results are in Table 4 (p. 10). Removing Backward Refinement reduces opcode-wise coverage from 48.0% to 23.6%; removing Certified Circuit Elision reduces it to 36.2%. The 127-opcode total comes from Table 1 (p. 10); Table 4 reports 61, 30, and 46 verified opcodes for the full tool, without Backward Refinement, and without Certified Circuit Elision. The Table 4 caption attributes 24.4 and 11.8 percentage points of coverage to Backward Refinement and Certified Circuit Elision, respectively; the RQ4 answer says Certified Circuit Elision adds up to 11.8 points (section 7.4, pp. 10–11).

Inference: In a Verus project, extraction macros or traits can expose arithmetic and transition constraints to a separate checker, but macro expansion itself must be covered by review or proof. Optimization passes should carry proof-preserving lemmas rather than rely on testing, as the paper does for Backward Refinement in Appendix C.2.

## evidence and comparison
ZEBRA evaluates Pico, SP1, Sphinx, Valida, and Ziren. At opcode level it verifies 61/127 targets (48.0%) versus Z3’s 40/127 (31.5%); on the 31 targets both verify, ZEBRA is 51.5× faster on average (Table 1, p. 10; section 7.1, p. 9). At table level it fully verifies 24 of 44 tables versus 10 for Z3, with Succ% of 55.8% versus 27.2% (Table 1, p. 10); the caption defines table-wise Succ% as the fraction of verified opcodes averaged over tables, so it is not 24/44. Each target used 200 single-point runs with 32-bit random operands and a 100-second timeout (section 7, p. 9). Deep nonlinearities such as division and multi-byte stores remained beyond the 100-second timeout, and Z3 solved Valida’s division table that ZEBRA could not (section 7.1, p. 9).

For bug finding, ZEBRA flags 13 under- or over-constrained behaviors, 11 previously unknown, across five zkVMs; the 11 came from a warm-started bug-finding mode, and the other two (IDs 11 and 13) are intentional design choices surfaced during exhaustive verification (section 7.5, p. 11). Warm-starting lifts random subsets of columns of an honest seed trace to intervals while the other cells keep their concrete values, and it extends the scope to non-instruction tables such as the CPU table (section 7, pp. 8–9). Of the 11, Table 5 (p. 12) lists four Critical (IDs 1, 2, 3, 7), two High, one Medium, and four Design Flaw (IDs 8, 9, 10, 12; program-counter overflow, which developers left unfixed in favor of performance). The abstract says 6 of the 11 were independently confirmed and 3 fixed by developers (abstract, p. 1); Table 5 marks IDs 1–3 Fixed, IDs 5, 9, 12 Confirmed, and IDs 4, 6, 7, 8, 10 In contact. Arguzz, a mutation-based fuzzer, found none after six hours per target, while ZEBRA used a 100-second budget per table, on average 900 seconds per zkVM (section 7.6, p. 11). The paper explains the gap: Arguzz mutates the executor, so the tables it reaches are a proper subset of all tables, and a bug needing helper-column values the table generator never produces is out of its reach (section 7.6, p. 11). Inference: the 11 bugs were found in the bounded warm-started mode with a per-table budget, so this is not an all-input completeness claim.

Inference: the trusted components include the finite-field semantics, interval rules, canonicalizer assumptions, constraint extraction, Lean proofs of canonicalizer properties, and the implementation. The paper explicitly limits its Lean verification to the algorithmic specification and leaves the equivalence between the Lean specification and the Rust implementation for future work (footnote 1, p. 2; section 9, p. 13). The local theorem assumes valid peripheral tables, and cross-table interface bugs fall outside the guarantee (section 5.1, p. 5; section 9, p. 13). The paper also says interval abstraction is sound but incomplete: imprecision cannot yield a false certificate or spurious bug report, but can reduce coverage under a finite time budget (section 9, p. 13).

Inference: The threat to agent-written verified Rust is moderate for infrastructure that translates Rust semantics into constraints, and low for ordinary Rust proofs. ZEBRA could expose under- and over-constrained verifier bugs that ordinary Verus proofs of individual functions miss, but it does not prove a Rust program’s functional specification. VL should reuse canonicalization, sparse interval propagation, cardinality-based bug classification, and proof-preserving branch splitting; it should not claim global soundness from a bounded region or copy the zkVM-specific extraction assumptions.

## techniques for the catalog
- canonical trace space — normalize representationally different traces before counting executions
- sound interval abstraction — propagate conservative True, False, or Uncertain results over finite-field intervals
- branch-and-bound certification — split uncertain regions until cardinality is empty, singleton, or multiple
- input range verification — certify a bounded input volume by comparing canonical solutions with expected volume
- automated constraint extraction — lift AIR, lookup, and public checks from zkVM source into symbolic constraints
- backward refinement — propagate constraints backward (selector-fixed constants, selector-fixed equalities, affine limb relations) to tighten intervals and increase pruning
- certified circuit elision — lift range-check circuits into dedicated interval-evaluator nodes so bounds apply immediately and the constraint tree shrinks
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "This sublinear growth in verification time with respect to volume is the core benefit of input range verification: branch-and-bound collapses large contiguous regions into a single sound judgment"): read all 21 pages and appendices; checked both quotations word for word, every number (Tables 1, 2, 3, 4, 5, 6), the Algorithm 1 steps, the definitions and Theorem 5.2, and re-derived every page reference from the PDF pages; changed many page references (most were off by 2 to 3 pages), the table-level Succ% wording, the description of Certified Circuit Elision (it lifts range-check circuits; the earlier selector claim was unsupported), the Lean generator assumption wording, the range-verification applicability, the abstract-versus-section 1 attribution, and marked the trusted-components paragraph and the 11-bug scope note as Inference, adding the bug severity and status breakdown, warm-start and Arguzz reachability details; did not check the Lean code, the code repository, the cited works, the proofs of the Appendix C lemmas beyond reading them, or the ZEBRA artifact.
