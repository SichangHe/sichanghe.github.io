# Deciding Separation Logic with Pointer Arithmetic and Inductive Definitions
(authored by agents unless marked 🧑)
Tag: `su2024deciding`, [paper](http://arxiv.org/abs/2403.01867v1)

## scope and result
The paper defines SLAH, a separation-logic fragment with points-to cells, contiguous memory blocks, pointer arithmetic, and an inductive heap-list predicate `hls`. It gives decision procedures for satisfiability and entailment. The abstract states: “We tackle this challenge and achieve decision procedures for both satisfiability and entailment of SLAH formulas.” (Abstract, p. 1). The key result is NP-complete satisfiability and coNP-complete entailment (Section 1, p. 3).

The motivating `search` routine scans chunks from `hbeg` to `hend`, reading a size at each chunk and advancing by that size. `hls(x,y;v)` is either empty when `x=y`, or a chunk beginning at x, with size at least 2 and at most v, followed by another heap list. Pointer arithmetic occurs in chunk boundaries and in the inductive definition itself.

## technique: Presburger abstraction for satisfiability

When to use it. Use this procedure for a symbolic heap whose spatial atoms are `t1 7-> t2`, `blk(t1,t2)`, `hls(t1,t2;t3)`, and separating conjunction, with linear arithmetic pure constraints.

How to apply it.
1. Replace each points-to atom with a one-cell block: `t1 7-> t2` becomes `blk(t1,t1+1)` (Section 4, p. 8).
2. Encode each block as `t1<t2`.
3. Encode `hls(t1,t2;t3)` as `t1=t2` or `t1<t2` plus the computed QFPA summary `Abs+(hls(...))` (Section 4, p. 8).
4. Add disjointness constraints for every pair of spatial atoms in the separating conjunction; these constrain interval starts and ends (Section 4, p. 8).
5. Conjoin the pure arithmetic part and submit the resulting existential Presburger arithmetic formula to an SMT solver such as Z3.

The summary starts from k unfoldings: `2k <= y-x <= k z`. Although the upper product is nonlinear when z is variable, Lemma 1 gives an equivalent quantifier-free Presburger formula in polynomial time (Section 4, p. 8). For an unbounded `hls(x,y)` the summary reduces to `2 <= y-x`. Proposition 1 states that the SLAH formula is satisfiable iff its abstraction is satisfiable.

Verus form. Inference: Model an owned heap list with a Rust struct or ghost sequence and expose its address interval and chunk-size constraints as predicates. Inference: Use Verus arithmetic facts and quantified ghost lemmas to prove disjointness and list-summary properties; an external Presburger preprocessor could discharge linear address constraints before Verus. Inference: Verus ownership can enforce separation directly for safe references, but raw allocator code still needs explicit pointer-range predicates, making this abstraction relevant to unsafe Rust.

Evidence and limits. Theorem 1 proves NP-completeness (Section 4, p. 7). The paper emphasizes that “The crux of this encoding and its originality with respect to the ones proposed for ASL in [6] is the computation of Abs+ (hls(t1, t2; t3)), which are the least-fixed-point summaries in QFPA for hls(t1, t2; t3).” (Section 4, p. 8). Inference: The procedure is complete only for SLAH's restricted syntax and semantics; arbitrary pointer arithmetic, data-dependent values, or richer inductive predicates fall outside the theorem.

## technique: ordered entailment decomposition

What it is. To decide `phi |= psi`, CompSPEN+ enumerates total preorders over every start and end address appearing in either formula. Each compatible preorder creates an ordered entailment in which all spatial atoms are sorted and nonempty. The paper says: “The entailment problem phi |= psi can be decomposed into a finite number of ordered entailment problems phi′ |=⪯ psi′ where all the terms used as start and end addresses of spatial atoms in phi′ and psi′ are ordered by a preorder ⪯.” (Section 5, p. 9)

How to apply it.
1. Compute `Abs(phi)` and `Abs(psi)`.
2. Enumerate each total preorder `preceq` compatible with `Abs(phi)`; encode equal addresses as equalities and strict order as `<` (Definition 3, Section 5.1, p. 9).
3. Remove empty `hls` atoms and sort antecedent and consequent spatial atoms by the resulting order (Section 5.1, p. 10).
4. For a one-atom consequent, first check that the antecedent spans the same continuous interval; then match by case on points-to, block, or hls (Section 5.2, pp. 10–12).
5. For a multi-atom consequent, enumerate partitions of the antecedent sequence. Split a block or hls atom when the consequent boundary falls inside it, and recurse on prefix and suffix (Section 5.3, pp. 12–13).
6. Return valid only when every compatible preorder and every required partition yields a valid ordered entailment.

A heap-list-to-heap-list match uses an effective upper bound (EUB): enumerate chunk-size decompositions consistent with the antecedent's interval and upper bound, compute the maximum achievable chunk size, and check that the consequent's bound dominates that EUB (Lemmas 3–4, Section 5.2, pp. 11–12). This handles the counterintuitive valid entailment `hls(x,y;3) |= hls(x,y;2)` when `y-x=4`, because only size-2 chunks can realize the antecedent.

Verus form. Inference: Represent each spatial region with ghost start/end addresses and prove a total order or disjointness partition as a lemma. Inference: Recursive matching corresponds to a proof function that consumes a list of region descriptors, splitting a descriptor at a boundary while maintaining ownership and arithmetic invariants. Inference: EUB reasoning can become a quantified lemma over chunk-size sequences; Verus will need explicit induction and arithmetic triggers rather than an automatic preorder enumerator.

## implementation and evidence

CompSPEN+ extends CompSPEN, parses SL-COMP input, translates satisfiability queries to EPA/QFPA, and enumerates preorders for entailment. Heuristics extract known address orders and decompose contiguous block matches to reduce the number of preorder terms (Section 6, pp. 13–14). The benchmark contains 190 formulas: 38 MEM-SAT, 50 RANDOM-SAT, 43 MEM-ENT, and 59 RANDOM-ENT. On an Ubuntu 16.04 64-bit laptop with Intel Core i5-8250U and 2 GB RAM, timeout 60 s, Table 1 reports zero timeouts for 88 satisfiability cases, average 0.07 s (0.05 MEM-SAT; 0.09 RANDOM-SAT), and two timeouts among 102 entailment cases, average 8.94 s overall (3.05 MEM-ENT; 13.39 RANDOM-ENT). The two RANDOM-ENT timeouts are included in the 102 denominator but excluded from average and maximum timing, as the paper states (Section 6, p. 15).

The authors report MEM-SAT and MEM-ENT as verification-derived allocator formulas; the random suites test scalability. Entailment is harder because it may explore all preorders and split spatial atoms. Inference: Results show practical performance on this benchmark, not worst-case speed; the theoretical coNP bound permits exponential preorder enumeration.

## what is proved, trusted, and threat to VL

The paper proves the two complexity results and correctness of the abstractions and matching algorithms. Trusted elements include the separation-logic semantics, Presburger solver, SMT implementation, and CompSPEN+ implementation. The paper compares no competing solver on the same SLAH formulas because it could not access SLar and found format translation difficult (Section 6, p. 15). Inference: This is an evidence gap for comparative performance.

Inference: Threat to VeruLaw is moderate for unsafe memory-manipulating Rust. SLAH supplies a complete decision core for one allocator-shaped fragment and demonstrates how pointer arithmetic can coexist with inductive heap predicates. VL should reuse the interval-summary and splitting ideas for allocator proofs, while retaining Rust ownership where available. Inference: Agent-generated verified Rust remains exposed when it uses raw pointers, integer addresses, variable chunk sizes, or list predicates outside SLAH's linear arithmetic fragment.

## techniques for the catalog

- inductive heap-list summaries: replace recursive pointer-arithmetic list predicates with equivalent Presburger constraints
- separating-conjunction abstraction: encode points-to, blocks, and pairwise interval disjointness in arithmetic
- ordered entailment decomposition: enumerate compatible address preorders and reduce entailment to sorted spatial matches
- effective upper bounds: compute realizable chunk-size bounds to decide heap-list entailments with arithmetic constraints
- spatial atom splitting: partition block or heap-list atoms at consequent boundaries and recurse on the resulting regions
Checked 2026-10-15 against paper su2024deciding: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
