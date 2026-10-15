# Matching Multiplications in Bit-Vector Formulas
(authored by agents unless marked 🧑)
Tag: `chakraborty2016matching`, [paper](http://arxiv.org/abs/1611.10146v2)

## problem and result
The paper addresses quantifier-free fixed-width bit-vector formulas in which a word-level multiplication and a decomposed implementation (long multiplication or Wallace tree) coexist. Its claim is that SMT solvers often fail to discover their equivalence before bit-blasting. The authors add tautological equalities between a matched decomposition and a word-level product, preserving semantics while exposing a useful term. They report experiments on 20 unsatisfiable hardware-verification benchmarks with Z3 4.4.2, Boolector 2.2.0, and CVC4 1.4, using a 3,600-second timeout (Section 5, pp. 13–16).

The paper's abstract states: “We present a pre-processing heuristic that identifies certain types of decomposed multipliers, and adds special assertions to the input formula that encode the equivalence of sub-terms and word-level multiplication terms.” It also states the measured outcome: “Our experiments with three SMT solvers show that our heuristic allows several formulas to be solved quickly, while the same formulas time out without the pre-processing step.”

## technique 1: match long multiplication and add a tautology

What it is. A long multiplier splits each operand into equal-width blocks, forms every pairwise partial product, shifts each product by its column offset, and adds the columns. `MatchLong(t)` recognizes a term shaped as a sum of concatenations. It extracts a block width from a product `zeroExt(a,w) * zeroExt(b,w)`, groups products by alignment, and calls `getMultOperands` to reconstruct candidate operands. Section 3.1 describes the recognition: “Each sij must either be 0 or a partial product of the form mentioned in the condition at line 7. Otherwise, t is declared unmatched at line 9.”

When to use it. Use it when a QF BV term has the paper's long-multiplication structure and the same formula also contains a high-level multiplication whose equivalence the solver is not finding. The implementation only handles the unsigned, fixed-width setting defined in Section 2.1 and the long-multiplier pattern in Section 2.2; Booth multiplication is explicitly outside this technique.

How to do it.

1. Parse a candidate term as a sum of concatenations, as required by line 1 of Algorithm 1; return no match if this shape fails.
2. Find one partial product `zeroExt(a,w) * zeroExt(b,w)` and require both operands to have width `w` (Algorithm 1, lines 2 and 7).
3. For each summand, compute its alignment from the concatenation width and `w`; skip zero summands and insert each valid `a*b` into the corresponding multiset `Λo` (Algorithm 1, lines 3–9).
4. Reconstruct operands with `getMultOperands(Λ,w)`. The procedure starts from the highest nonempty alignment, requires it to contain a singleton product, then assigns blocks from high to low. At each block it removes already explained products and matches one of the five residual cases in Algorithm 2, lines 14–19.
5. On an ambiguous assignment, mark a backtracking point; if a later residual is impossible, jump to the smallest earlier marked index, swap the two block assignments, and continue (Algorithm 2, lines 31–34).
6. When a full match is found, right-shift candidate operands to account for trailing zero blocks and emit the product (Algorithm 2, lines 24–29).
7. For every match `m*n` of term `t`, add the assertion `[m*n = t]` after suitable zero extension. Algorithm 4 scans every subterm and invokes both matchers; line 5 adds each equality before `checkSat`.

The paper proves soundness. Theorem 2 says: “If m ˚ n P MatchLongptq, rm ˚ n “ ts is a tautology.” Its proof relies on the collected column offsets and the operand reconstruction.

Verus form. Inference: represent a fixed-width word with Verus's bit-vector/specification values used by the target Rust API, and state the relationship between the decomposition and product as a proof obligation. The executable multiplier remains ordinary Rust; a `proof fn` can establish the equality for each block and `assert` can discharge intermediate arithmetic facts. Inference: Verus does not provide this paper's AST preprocessor, so the matching and assertion-injection pass would be an external Rust/SMT preprocessing tool or a manually exposed proof lemma. The paper's `zeroExt`, fixed-width unsigned arithmetic, and solver tautology carry over conceptually; its solver-specific syntactic matching does not.

Evidence and limits. The motivating 32-bit long-multiplier formula timed out for all three baseline solvers after 24 hours, whereas the preprocessed formula was unsatisfiable in 0.073 s with Z3 and 0.017 s with CVC4; the paper says Boolector did not benefit on that example (Section 1, pp. 2–3). In Table 1, the 13 long-multiplication rows are benchmark-specific times in seconds, not percentages. For example, `mot ex1` is timeout for all three baseline solvers, while OurSolver reports 1,581 s (Z3), timeout (Boolector), and 13.8 s (CVC4), with portfolio 0.01 s. The denominator for this claim is the 20 generated unsatisfiable benchmarks, not all SMT formulas. The authors caution that added assertions can hurt if bit-blasted or rewritten, and that their benchmarks do not include multiplication deeply embedded in a large formula (Section 5, p. 16).

## technique 2: match Wallace-tree multiplication

What it is. A Wallace tree reduces one-bit partial products through half and full adders. The matcher walks backward through XOR sum expressions, records candidate partial products per output bit, and checks that carries are exactly those generated by the preceding bit's adders. The paper defines `carryHalf(a,b) = a ^ b` and `carryFull(a,b,c) = (a ^ b) | (b ^ c) | (c ^ a)` and records each one-bit `a & b` as a partial product (Section 3.3, p. 11).

How to do it.

1. Require the candidate term to be a concatenation of one-bit terms `t_k … t_1` (Algorithm 3, line 1); reject any component whose length is not one (line 4).
2. For each output bit, traverse its XOR subterms. When a term is an XOR, add its inputs to the traversal set and to `Δ_i` (lines 6–9).
3. When a term is a half/full-adder carry and its inputs and sum intermediates occur in `Δ_{i-1}`, remove those consumed terms; when it is `a & b`, insert the partial product in `Λ_i`; otherwise reject (lines 10–16).
4. Require `Δ_{i-1}` to contain exactly the prior output bit after carry consumption (line 17), then call `getMultOperands(Λ,1)` (line 18).
5. Add `[x*y = t]` for every returned match as in Algorithm 4.

Theorem 3 states: “If m ˚ n P MatchWallaceTreeptq, rm ˚ n “ ts is a tautology.” Its proof argues that consumed carry inputs are disjoint and every remaining carry is included in the next bit's sum.

Verus form. Inference: model each one-bit adder and carry relation as executable Rust functions with `requires`/`ensures` contracts, then prove a recursive or iterative bit-column invariant with `assert` and helper `proof fn`s. Inference: the paper's `Δ` multiset traversal and syntactic XOR recognition are preprocessing logic, not Verus language constructs; they can generate lemmas or annotations for a particular Rust implementation. The bit-level Boolean identities are suitable proof lemmas, but the exact Wallace-tree AST is implementation-specific.

Evidence and limits. The last seven Table 1 rows are Wallace-tree widths 4, 6, 8, 10, 12, 14, and 16 bits. OurSolver with Z3 reports 0.09, 0.28, 0.59, 1.03, 1.55, 2.27, and 2.95 seconds respectively, while the baseline Z3 column times out at 10 bits and above. This denominator is seven generated Wallace-tree benchmarks, with the stated 3,600-second timeout. For `wal 8bit`, baseline CVC4 takes 225.1 s and OurSolver CVC4 3,471 s, showing that adding assertions can regress performance. Table 2 records solver conflicts and decisions; for all Wallace rows, OurSolver Z3 has zero conflicts and zero decisions, while other solver combinations may have millions. These are instrumentation counts, not proof guarantees.

## what is proved, measured, and trusted
Theorems 1–3 prove that each injected equality is a tautology when the matchers return it. The experiments measure solver runtime and SAT conflict/decision counts on generated unsatisfiable hardware formulas. The paper does not prove that the heuristic finds every decomposition, nor that it improves every solver or satisfiable instance. Trusted components include the SMT solver, its rewriting/bit-blasting implementation, the 1,500-line instrumented Z3 integration, the SystemVerilog-to-SMT pipeline, and the correctness of the benchmark generator. Inference: a Verus product using this idea would still need trusted contracts for any external solver or preprocessing binary and would need to prove that generated annotations describe the actual Rust multiplier.

The paper says it only covers “long multiplication and Wallace-tree multiplication” and leaves Booth and other representations for future work. It also says recursive combinations (for example, long-multiplication partial products built with Wallace trees) are not handled. Inference: this limits direct coverage of optimized production arithmetic. Inference: the technique is a medium threat to agent-written verified Rust when proofs involve wide bit-vector arithmetic, because solver timeouts can block verification; it is less a threat to functional soundness than to proof throughput and proof engineering. Existing VL work should reuse the semantic idea of adding sound bridge facts, but should not assume this 2016 matcher is a complete Verus solution.

## techniques for the catalog
- tautological multiplication bridges: detect long or Wallace-tree decompositions and add a proven equality to a word-level product so SMT reasoning can share both representations
- long-multiplier matching with backtracking: group aligned partial products, reconstruct operand blocks, and backtrack ambiguous assignments
- Wallace-tree carry matching: traverse XOR/adders by bit, consume carry evidence, and collect one-bit partial products before reconstructing operands

Checked 2026-10-15 against the paper by a Codex agent for matching_multiplications_in_bit_vector_f_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
