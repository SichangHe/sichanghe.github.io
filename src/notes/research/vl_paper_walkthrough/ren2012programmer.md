# A Programmer-Centric Approach to Program Verification in ATS
(authored by agents unless marked 🧑)
Tag: `ren2012programmer`, [paper](http://arxiv.org/abs/1203.6102v1)

## what is proved and what remains trusted
ATS combines implementation and proof in one language. The abstract says: “ATS is a programming language equipped with a highly expressive type system that allows the programmer to specify and implement and then verify within the language itself that an implementation meets its specification.” The paper’s examples are Fibonacci, generic insertion sort, and generic quicksort; the paper states “proofs are completely erased after typechecking” (Sections 2–4, pp. 3–13; page numbers are those of the arXiv PDF). There is no benchmark denominator or runtime evaluation, and the paper reports no typechecking results; the evidence is the code and types it presents. Inference: the paper’s claims rest on those listings typechecking in ATS.

The programmer supplies specifications, proof constructors, and external lemmas. The paper is explicit that “The implementation of insertion sort on generic lists in Figure 3, which can be obtained from erasing proofs in Figure 4, is guaranteed to be correct if all of the lemmas in Figure 6 are true” (Section 4.1, p. 9). Inference: the guarantee is therefore conditional on the lemmas and on ATS’s typechecker. Footnote 1 (Section 3, p. 4) says “We do not address the issue of possible arithmetic overflow here.” Inference: arithmetic overflow is outside these examples, so a Verus port needs explicit machine-range contracts.

## technique 1: indexed data and proof-carrying results

What it is. ATS separates static terms (types, props, type indexes) from dynamic terms (programs and proofs), then gives values singleton types indexed by mathematical values. A proving type `(P | T)` pairs a proof of prop `P` with a value of type `T` (Section 2, p. 3). For Fibonacci, `dataprop FIB(int,int)` encodes the recursive equations, and the function type is `∀n:nat. int(n) → ∃r:int.(FIB(n,r) | int(r))` (Section 3, pp. 4–5, Fig. 2).

How to apply it.
1. Define a proposition or `dataprop` whose constructors mirror the specification equations. `FIB0`, `FIB1`, and `FIB2` encode the three Fibonacci cases.
2. Index the input by its static value (`int(n)`) and return an existential result index `r` together with proof `FIB(n,r)`.
3. Write the efficient loop with proof parameters for the loop invariant: the example’s `loop` takes `FIB(i,r0)`, `FIB(i+1,r1)`, and a counter `ni: int(n-i)`.
4. In the recursive branch, construct the next proof (`FIB2 (pf0, pf1)`) alongside the next runtime values; in the base branch return the proof/value pair `(pf0 | r0)`.
5. Proofs are erased after typechecking; the executable loop remains.

Verus form (Inference). Use a `spec fn` for Fibonacci, `requires`/`ensures` on an executable Rust `fn`, and a `while` loop with an `invariant` relating the two accumulators and the loop index. Verus proofs are `proof fn`s and are erased, but Verus does not use ATS’s dependent singleton value syntax; values remain ordinary Rust values and the relation is stated in specifications.

Evidence. The paper says: “proofs are completely erased after typechecking.” It also says that when `fibats` is applied to an integer of value n it returns a pair whose proof “asserts fib(n) = r” (Section 3, p. 4). Inference: a successful typecheck establishes that relation for every natural `n`, subject to ATS’s arithmetic model (see footnote 1).

## technique 2: abstract props and literate external lemmas for insertion sort

What it is. The verified generic list uses a static integer sequence `ilist`, a dynamic `glist(a,xs)` whose element types carry those indexes, and an abstract prop `SORT(xs,ys)`. The target function type is `∀a:type ∀xs:ilist. (glist(a,xs), lte(a)) → ∃ys:ilist.(SORT(xs,ys) | glist(a,ys))` (Section 4.1, pp. 5–8, Figs. 4–5).

How to apply it.
1. Define `E(a,x)` as an abstract indexed singleton type and `glist` constructors that preserve the static sequence.
2. Declare abstract props `ORD`, `PERM`, and `SORT`; state conversion lemmas `SORT2ORD`, `SORT2PERM`, and `ORDPERM2SORT` (Fig. 6, p. 8).
3. Implement insertion structurally. In the `lte (x, y1)` branch, use `ORD_ins`, `PERM_refl`, and `ORDPERM2SORT`; in the other branch, use `ORD_tail`, recurse, then use `SORT_ins` (Fig. 4, p. 7).
4. Compose the returned proofs with the list constructors so the result type states sorted permutation, not only equal length.
5. Keep difficult facts as named, readable lemmas. The authors say all lemmas in Figure 6 are “evidently true except the last one: SORT ins” and that it “is a lemma that is manually introduced and can be readily understood by any programmer with adequate training”; they give an informal proof of it in prose (Section 4.1, pp. 9–10).

Verus form (Inference). Define a ghost sequence model and `spec fn sorted`, `spec fn permutation`; keep the executable `Vec` or list and prove correspondence with `ensures`. Loop or recursion invariants replace ATS’s indexed recursive types. Abstract props become `spec fn` predicates, and lemmas become `proof fn`s; do not mark a `spec fn` with `ensures`.

The evidence is conditional: the implementation is correct if every external lemma is true. The paper says an unsure lemma can be proved “in ATS or elsewhere” (p. 9). In its conclusion it names formal ATS proofs, specialized external theorem-provers, and a peer-review process (Section 5, p. 14). Inference: external facts remain trusted until discharged.

## technique 3: bounds and multiset accounting for quicksort

Quicksort uses abstract props lower-bound `LB`, upper-bound `UB`, and `UNION4` (and `APPEND` for the type of `append`). `UNION4(x,xs,ys,zs,res)` records the multiset equation `|res| = {x} ∪ |xs| ∪ |ys| ∪ |zs|`; in `part`, the accumulator `ys` carries `UB(x0, ys)` and `zs` carries `LB(x0, zs)` (Section 4.2, pp. 10–13, Fig. 9).

Apply it by initializing with `UB_nil` and `LB_nil`, moving each input element into the `ys` or `zs` accumulator with `UB_cons` or `LB_cons`, recursively sorting both partitions, and proving the final append ordered with `APPEND_ord`. In `qsrt`, `UNION4_perm` converts the resulting union fact to a permutation and `ORDPERM2SORT` concludes `SORT` (Figs. 9–11, pp. 11–13). Inference: Verus can represent the multiset as a ghost `Seq`/multiset abstraction and carry lower/upper-bound predicates in loop invariants; the exact ATS static datasort encoding does not carry over.

## limitations, prior work, and VL threat
The paper reports no proof-size, compile-time, or defect-rate figures. It notes that “there is no mechanism for defining recursive functions in the statics, and this is a profound restriction that give rise to a unique style of verification in ATS” (Section 4.1, p. 8). It also says that proving lemmas from basic definitions “can be too great a burden in practice” (p. 9). Inference: the trusted base includes the ATS typechecker, the semantics of abstract props, and every external lemma not formally re-proved. Inference: existing ATS already demonstrates in-language, programmer-readable contracts and proof erasure; VL should reuse the discipline of proof-carrying APIs and explicit lemmas instead of assuming SMT automation can infer all invariants. Inference: agent-written Verus Rust is threatened where specifications drift from implementation or where manually asserted lemmas hide missing cases; the paper’s literate explanations are a practical review target.

## techniques for the catalog
- indexed proof-carrying values — encode a relation in static indexes and return a proof/value pair
- abstract props with external lemmas — state reusable data-structure properties and justify each implementation branch with named proofs
- ghost bounds and multiset accounting — verify partition algorithms by carrying lower/upper bounds and exact multiset equations
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "However, this style of verifying everything from basic definitions can be too great a burden in practice."): read all 15 pages; checked every quotation word for word, the Fibonacci, insertion sort and quicksort construction steps against Figs. 2, 4, 6, 9, 10, and the arXiv link; changed page references to the arXiv PDF page numbers, replaced “code erased of proofs” and “paper itself notes” wording with exact quotes, added the footnote 1 quote, dropped the unsupported ATS typechecker-trust sentence as a paper claim and marked it Inference, and added the Section 5 lemma-discharge pointers; did not check the Verus translations (Inference) or the cited related work beyond the paper’s own text.
