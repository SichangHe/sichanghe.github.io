# A Programmer-Centric Approach to Program Verification in ATS
(authored by agents unless marked 🧑)
Tag: `ren2012programmer`, [paper](http://arxiv.org/abs/1203.6102v1)

## what is proved and what remains trusted
ATS combines implementation and proof in one language. The abstract says: “ATS is a programming language equipped with a highly expressive type system that allows the programmer to specify and implement and then verify within the language itself that an implementation meets its specification.” The paper’s examples are Fibonacci, generic insertion sort, and generic quicksort; the code is erased of proofs after typechecking (Sections 2–4, pp. 2–8). There is no benchmark denominator or runtime evaluation: evidence is typechecking of the presented examples and the stated types.

The programmer supplies specifications, proof constructors, and external lemmas. The paper is explicit that “The implementation of insertion sort on generic lists in Figure 3, which can be obtained from erasing proofs in Figure 4, is guaranteed to be correct if all of the lemmas in Figure 6 are true” (Section 4.1, p. 6). Thus the guarantee is conditional on the lemmas and on ATS’s typechecker. Inference: arithmetic overflow is outside these examples—the paper itself notes that it does not address it—so a Verus port needs explicit machine-range contracts.

## technique 1: indexed data and proof-carrying results

What it is. ATS separates static terms (types, propositions, indexes) from dynamic terms (programs), then gives values singleton types indexed by mathematical values. A proving type `(P | T)` pairs a proof of proposition `P` with a runtime value of type `T` (Section 2, pp. 2–3). For Fibonacci, `dataprop FIB(int,int)` encodes the recursive equations, and the function type is `∀n:nat. int(n) → ∃r:int.(FIB(n,r) | int(r))` (Section 3, pp. 3–4).

How to apply it.
1. Define a proposition or `dataprop` whose constructors mirror the specification equations. `FIB0`, `FIB1`, and `FIB2` encode the three Fibonacci cases.
2. Index the input by its static value (`int(n)`) and return an existential result index `r` together with proof `FIB(n,r)`.
3. Write the efficient loop with proof parameters for the loop invariant: the example carries `FIB(i,r0)`, `FIB(i+1,r1)`, and a natural counter `n-i`.
4. In each branch, construct the next proof (`FIB2`) alongside the next runtime values; return the proof/value pair at the end.
5. Erase proof terms after typechecking; the executable loop remains.

Verus form (Inference). Use a `spec fn` for Fibonacci, `requires`/`ensures` on an executable Rust `fn`, and a `while` loop with an `invariant` relating the two accumulators and the loop index. Verus proofs are `proof fn`s and are erased, but Verus does not use ATS’s dependent singleton value syntax; values remain ordinary Rust values and the relation is stated in specifications.

Evidence. The paper says: “proofs are completely erased after typechecking.” The type of `fibats` is the evidence: a successful typecheck establishes the returned relation for every natural `n`, subject to ATS’s arithmetic model.

## technique 2: abstract props and literate external lemmas for insertion sort

What it is. The verified generic list uses a static integer sequence `ilist`, a dynamic `glist(a,xs)` whose element types carry those indexes, and an abstract proposition `SORT(xs,ys)`. The target function type is `glist(a,xs) × lte(a) → ∃ys.(SORT(xs,ys) | glist(a,ys))` (Section 4.1, pp. 4–5).

How to apply it.
1. Define `E(a,x)` as an indexed singleton type and `glist` constructors that preserve the static sequence.
2. Declare abstract props `ORD`, `PERM`, and `SORT`; state conversion lemmas `SORT2ORD`, `SORT2PERM`, and `ORDPERM2SORT`.
3. Implement insertion structurally. In the `x≤y` branch, use `ORD_ins`, `PERM_refl`, and `ORDPERM2SORT`; in the recursive branch, use `ORD_tail`, recurse, then use `SORT_ins`.
4. Compose the returned proofs with the list constructors so the result type states sorted permutation, not only equal length.
5. Keep difficult facts as named, readable lemmas. The authors call `SORT_ins` manually introduced and explain its informal argument in prose (Section 4.1, p. 6).

Verus form (Inference). Define a ghost sequence model and `spec fn sorted`, `spec fn permutation`; keep the executable `Vec` or list and prove correspondence with `ensures`. Loop or recursion invariants replace ATS’s indexed recursive types. Abstract props become `spec fn` predicates, and lemmas become `proof fn`s; do not mark a `spec fn` with `ensures`.

The evidence is conditional: the implementation is correct if every external lemma is true. The paper proposes formal ATS proofs, specialized theorem provers, or peer review for those lemmas, so external facts remain trusted until discharged.

## technique 3: bounds and multiset accounting for quicksort

Quicksort uses lower-bound `LB`, upper-bound `UB`, and `UNION4` propositions. `UNION4(x,xs,ys,zs,res)` records the multiset equation `|res|={x}∪|xs|∪|ys|∪|zs|`; partition maintains `UB` for the lower partition and `LB` for the upper partition (Section 4.2, pp. 7–8).

Apply it by initializing `UB_nil` and `LB_nil`, moving each input element into the partition branch with `UB_cons` or `LB_cons`, recursively sorting both partitions, and proving the final append ordered with `APPEND_ord`. Convert the resulting union fact to a permutation with `UNION4_perm`, then conclude `SORT` using `ORDPERM2SORT` (Figures 9–11, pp. 7–9). Inference: Verus can represent the multiset as a ghost `Seq`/multiset abstraction and carry lower/upper-bound predicates in loop invariants; the exact ATS static datasort encoding does not carry over.

## limitations, prior work, and VL threat
The paper’s trusted base includes the ATS typechecker, the semantics of abstract props, and every external lemma not formally re-proved. It reports no proof-size, compile-time, or defect-rate denominator. The paper notes that statics cannot define recursive functions, which drives this proof style (Section 4.1, p. 4). Existing ATS already demonstrates in-language, programmer-readable contracts and proof erasure; VL should reuse the discipline of proof-carrying APIs and explicit lemmas instead of assuming SMT automation can infer all invariants. Inference: agent-written Verus Rust is threatened where specifications drift from implementation or where manually asserted lemmas hide missing cases; the paper’s literate explanations are a practical review target.

## techniques for the catalog
- indexed proof-carrying values — encode a relation in static indexes and return a proof/value pair
- abstract props with external lemmas — state reusable data-structure properties and justify each implementation branch with named proofs
- ghost bounds and multiset accounting — verify partition algorithms by carrying lower/upper bounds and exact multiset equations
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
