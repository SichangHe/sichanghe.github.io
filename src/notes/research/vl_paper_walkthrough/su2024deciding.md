# Deciding Separation Logic with Pointer Arithmetic and Inductive Definitions
(authored by agents unless marked 🧑)
Tag: `su2024deciding`, [paper](http://arxiv.org/abs/2403.01867v1)

## scope and result
The paper defines SLAH, a separation-logic fragment with points-to cells, contiguous memory blocks, pointer arithmetic, and an inductive heap-list predicate `hls`. The abstract states: “We tackle this challenge and achieve decision procedures for both satisfiability and entailment of SLAH formulas.” (Abstract, p. 1). Theorems 1 and 2 state NP-complete satisfiability and coNP-complete entailment (Sections 4–5, pp. 7–9). The entailment result requires a quantifier-free consequent and no consequent free variables absent from the antecedent: “We consider the following entailment problem: Given the symbolic heaps φ and ψ in SLAH such that ψ is quantifier free and fv(ψ) ⊆ fv(φ), decide if φ |= ψ.” (Section 5, p. 8). Appendix D contains unfinished proof notes, discussed below.

The motivating `search` routine scans chunks from `hbeg` to `hend`, reading a size at each chunk and advancing by that size. `hls(x,y;v)` is either empty when `x=y`, or a chunk beginning at x, with size at least 2 and at most v, followed by another heap list with the same bound. The header stores the chunk size; the body occupies the remaining cells. `blk(x,y)` occupies `[x,y)`, requires `x<y`, and leaves cell values unspecified. Addresses and stored values are natural numbers (Sections 2–3, pp. 3–7).

## technique: Presburger abstraction for satisfiability

When to use it. Use this procedure for SLAH symbolic heaps: terms use natural-number variables, constants, and addition; pure formulas conjoin equality, disequality, and order constraints; spatial formulas combine `emp`, `t1 7-> t2`, `blk(t1,t2)`, and `hls(t1,t2;t3)` by separating conjunction. Existential quantifiers are allowed, and the chunk-size bound may be ∞ (Definition 1, p. 6).

How to apply it.
1. Replace each points-to atom with a one-cell block: `t1 7-> t2` becomes `blk(t1,t1+1)` (Section 4, p. 8).
2. Encode each block as `t1<t2`.
3. Encode `hls(t1,t2;t3)` as `t1=t2` or `t1<t2` plus the computed QFPA summary `Abs+(hls(...))` (Section 4, p. 8).
4. Add pairwise interval-disjointness constraints, guarded by nonemptiness for `hls` atoms, which may denote empty heaps (Appendix A.2, p. 18).
5. Conjoin the pure arithmetic part. For satisfiability, drop the symbolic heap's existential quantifiers and treat their variables as free in the SMT query; the resulting abstraction is quantifier-free Presburger arithmetic (QFPA). Submit it to an SMT solver such as Z3 (Section 4, p. 8; Appendix A.2, p. 18).

For a nonempty heap list, the summary starts from `exists k >= 1: 2k <= y-x <= k z`. Although the upper product is nonlinear when z is variable, Lemma 1 gives an equivalent QFPA formula in polynomial time (Section 4, p. 8). Writing `N=y-x`, Appendix A.1 (p. 17) gives `(z=2 and N>=2 and N is even) or (z>2 and N>=2)`. For an unbounded `hls(x,y)` the nonempty summary reduces to `2 <= y-x`. Add `x=y` for the empty case.

Verus form. Inference: A possible adaptation would represent chunk sizes with a ghost sequence, connect it to owned memory intervals, and prove the arithmetic summary and disjointness lemmas. The paper does not implement or evaluate a Verus adaptation.

Evidence and limits. Theorem 1 states NP-completeness (Section 4, p. 7). Proposition 1 states: “A SLAH formula φ is satisfiable iff Abs(φ) is satisfiable.” (Section 4, p. 8; proof in Appendix A.2, pp. 18–19). Inference: These results apply to the specified SLAH syntax and semantics; they do not establish decidability for arbitrary inductive definitions or address operations.

## technique: ordered entailment decomposition

What it is. For the restricted entailment problem above, CompSPEN+ enumerates total preorders over the spatial atoms' start and end address terms in both formulas. A total preorder assigns an order while allowing ties. Each compatible preorder creates an ordered entailment in which empty `hls` atoms are removed and the remaining spatial atoms are sorted. The paper notes: “There may be exponentially many total preorders over A(φ) ∪ A(ψ) that are compatible with φ in the worst case.” (Section 5.1, p. 10).

How to apply it.
1. Compute `Abs(phi)` and `Abs(psi)`. An unsatisfiable antecedent gives a valid entailment. Otherwise, the abstraction must entail `Abs(psi)` before spatial matching can succeed (Sections 5–5.1, pp. 9–10).
2. Enumerate each total preorder `preceq` compatible with `Abs(phi)`; encode equal addresses as equalities and strict order as `<` (Definition 3, Section 5.1, p. 9).
3. Remove empty `hls` atoms and sort antecedent and consequent spatial atoms by the resulting order (Section 5.1, p. 10).
4. For a one-atom consequent, first check that the antecedent spans the same continuous interval; then match by case on points-to, block, or hls (Section 5.2, pp. 10–12).
5. For a multi-atom consequent, enumerate partitions of the antecedent sequence. Split a block or hls atom when the consequent boundary falls inside it, and recurse on prefix and suffix. For hls, distinguish a chunk boundary from a cut inside a chunk body, exposing its header and body when needed (Section 5.3, p. 13).
6. Return valid only when every compatible preorder and every required partition yields a valid ordered entailment.

A heap-list-to-heap-list match uses an effective upper bound (EUB): the maximum chunk size attainable across all unfoldings consistent with a fixed stack. Lemma 3 constructs a QFPA formula characterizing this value in linear time; the procedure does not enumerate chunk-size decompositions. Lemma 4 checks that the EUB never exceeds the consequent's bound, using an existential Presburger counterexample query (Section 5.2, pp. 11–12; Appendices B–C, pp. 19–21). This handles the valid entailment `hls(x,y;3) |= hls(x,y;2)` under `y-x=4`, because only size-2 chunks can realize the antecedent (Example 2, p. 11).

Verus form. Inference: A possible proof library would represent region boundaries, justify splits by ownership lemmas, and prove the EUB property over chunk-size sequences. This is a proposed transfer of the paper's ideas, not an evaluated Verus technique.

## implementation and evidence

CompSPEN+ extends CompSPEN, parses SL-COMP input, and uses SMT queries for arithmetic. Section 6 calls the satisfiability encoding EPA (existential Presburger arithmetic); Section 4 and Appendix A give the QFPA abstraction. Heuristics extract known address orders and decompose contiguous block matches to reduce the number of preorder terms (Section 6, pp. 13–14). The benchmark contains 190 formulas: 38 MEM-SAT, 50 RANDOM-SAT, 43 MEM-ENT, and 59 RANDOM-ENT. On an Ubuntu 16.04 64-bit laptop with Intel Core i5-8250U and 2 GB RAM, Table 1 reports zero timeouts for 88 satisfiability cases, average 0.07 s (0.05 MEM-SAT; 0.09 RANDOM-SAT), and two timeouts among 102 entailment cases, average 8.94 s overall (3.05 MEM-ENT; 13.39 RANDOM-ENT). The timeout instances count toward suite sizes, but timing statistics omit them: “The statistics of average time and maximum time do not include the time of timeout instances.” (Section 6, p. 14). The experimental setup says 60 seconds, while the discussion of the two RANDOM-ENT timeouts says “more than 2 min” (p. 15). Inference: The paper leaves the timeout threshold inconsistent.

The authors report MEM-SAT and MEM-ENT as verification-derived allocator formulas; RANDOM-SAT and RANDOM-ENT contain random or manually generated formulas, including unfoldings of verification-derived formulas (Section 6, p. 14). They attribute challenging entailments to splitting spatial atoms and exploring all total preorders for valid queries (p. 15). Inference: These timings support performance on the reported suites, not a general speed guarantee.

## what is proved, trusted, and threat to VL

The paper supplies the satisfiability abstraction proof in Appendix A and EUB proofs in Appendices B–C. Section 5 states the coNP-completeness result and explains the ordered matching procedure. However, Appendix D (pp. 21–22) opens by describing Theorem 2's upper bound as EXPTIME, contrary to the theorem's coNP statement, and contains unfinished notes: “M: TODO” and “M: difficult in P!” Inference: This version should not be described as containing a finished appendix proof of the entailment complexity bound.

Inference: Using the solver for verification would require trusting its implementation, the underlying arithmetic solver, and the correspondence between program memory and SLAH's mathematical semantics. No implementation audit or mechanized metatheory is established here. The authors could not access SLar and found its example format difficult to translate; they provide no competing-solver timing comparison (Section 6, pp. 14–15). Inference: This limits comparative performance evidence.

Inference: For VeruLaw, interval summaries, effective size bounds, and spatial splitting are candidate techniques for allocator proofs. The paper does not evaluate verified Rust, Verus, or agent-generated code, so it does not establish a comparative threat level. Its natural-number memory model also does not itself establish machine-address overflow or Rust pointer validity properties.

## techniques for the catalog

- inductive heap-list summaries: replace recursive pointer-arithmetic list predicates with equivalent Presburger constraints
- separating-conjunction abstraction: encode points-to, blocks, and pairwise interval disjointness in arithmetic
- ordered entailment decomposition: enumerate compatible address preorders and reduce entailment to sorted spatial matches
- effective upper bounds: compute realizable chunk-size bounds to decide heap-list entailments with arithmetic constraints
- spatial atom splitting: partition block or heap-list atoms at consequent boundaries and recurse on the resulting regions
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "This case splitting is due to the fact that the ordered entailment problems always assume non-empty hls atoms in the formulas."): read the full paper including references and Appendices A–D; checked quotations, numerical results, page and section references, syntax, and technique steps; corrected entailment scope, QFPA construction, EUB computation, splitting reference, unsupported Verus claims, and overstatement of the unfinished entailment proof; noted inconsistent timeout statements; retained the tag and arXiv link identified on p. 1; did not run CompSPEN+, reproduce experiments, audit code, or independently prove the theorems.
