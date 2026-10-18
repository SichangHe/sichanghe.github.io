# General Interpolation and Strong Amalgamation for Contiguous Arrays
(authored by agents unless marked 🧑)
Tag: `ghilardi2022general`, [paper](http://arxiv.org/abs/2204.11771v1)

## scope and claims
This paper defines CARD(TI), contiguous arrays with a semantically fixed `maxdiff`, and CARDC(TI), which adds constant arrays. It proves amalgamation and strong amalgamation results and gives a quantifier-free interpolation algorithm for CARD(TI) that reduces to a polynomial-size problem in TI ∪ EUF; the paper says its implementation “is still missing” (Section 8, p. 23). The abstract says: “By showing via an algebraic analysis that its models strongly amalgamate, we prove that this theory admits quantifier-free interpolants and, notably, that interpolation transfers to theory combinations.” (Abstract, p. 1) The target is software-verification formulas over arrays; the paper’s examples of index theories are the theory of linear orders TO, integer difference logic IDL, integer linear arithmetic LIA and real linear arithmetic LRA (p. 8).

## technique 1: contiguous-array theory with maxdiff
what it is
CARD(TI) has ARRAY, ELEM and INDEX sorts; `rd`, `wr`, `diff`, and strong length `|a|`. Arrays are defined exactly on `[0,|a|]`, and `diff(x,y)` returns the greatest differing index (or 0 when equal). Axioms (2)–(11) in Section 3 constrain writes, reads, allocation and maxdiff (pp. 8–9). CARDC(TI) adds `Const(i)` with default element `el` through axioms (12)–(13), enabling finite constant arrays (p. 9).

when to use it
Inference: use this theory when verification annotations need bounded, fully initialized arrays and quantifier-free interpolation. The index theory TI must be universal, stably infinite, decidable, extend linear order with 0, and have general quantifier-free interpolation (Definition 4, p. 8). The paper lists IDL, LIA and LRA as examples, with division by positive integers added to the arithmetic language (p. 8).

how to apply
1. Give each array a strong length and require reads inside `[0,|a|]`; Section 3 warns that code verification conditions must include this bound (p. 9).
2. Use the write axioms: writing a non-bottom element inside the interval changes that index and preserves other indices; writing bottom has no effect (axioms 3–5, p. 9).
3. Use `diff` axioms to identify a differing index and equality above the maximum difference (axioms 8–10, p. 9).
4. Normalize equalities using Lemmas 1–4: array equality becomes `diff(a,b)=0` plus equality at index 0; writes and lengths become read formulas; iterated `diff_k` terms become seven universal/read conditions (pp. 9–11).
5. For general interpolation or strong amalgamation, include `Const` and its length/default-value axioms (Section 3, p. 9; Theorem 5, p. 16).

verus form
Inference: In Verus, model an array as a sequence/map plus a length and define `rd`, `wr`, and `diff` as `spec fn`s. State read/write axioms as `ensures` on proof lemmas, and require index bounds with `requires`. A Verus proof cannot use a free uninterpreted `diff` without axioms; it must either implement a ghost maximum-difference function or assume and separately justify its specification. `Const` becomes a ghost constructor whose every in-range cell equals `el`.

evidence and limits
The paper proves the theory's algebraic properties, not a Rust implementation. Illegal out-of-range operations are semantically made ineffectual in the theory but must be rejected by program verification conditions (p. 9). Inference: a product should treat bounds as executable preconditions, since silently modeling errors as no-ops would mask memory bugs.

## technique 2: strong amalgamation construction
what it is
Amalgamation combines two models over a shared substructure; strong amalgamation additionally prevents accidental identification of nonshared elements. The paper constructs a CARD/CARDC amalgam by first embedding both models into a functional intermediate model and then extending it to a full array model. It states: “We build the amalgamated model in two steps.” (Section 5.1, p. 14)

steps
1. Rename index and element domains so nonshared parts are disjoint, and assume functional models without loss of generality (Section 5.1, p. 14).
2. Take a strong amalgam of the two INDEX models using TI's strong amalgamation; take the union of ELEM domains (p. 15).
3. Set ARRAY to all positive-support functions over the combined index and element domains (p. 15).
4. Define the embedding µi of Mi: on indices of Mi itself, keep the array's own value. On indices of the other model that are not in A, use the value of an A-array c at that index when relation (2⋆) holds, that is, when some b cardinality-equivalent (finitely many differences, same length) to the array has `diff(b, fi(c))` below the index. Otherwise use bottom outside `[0,|a|]` and `el` inside it. On indices in neither model, use bottom or `el` the same way (displayed construction on p. 15).
5. Prove well-definedness, injectivity, preservation of length/read/write/diff, agreement on the common substructure, and preservation of constant arrays (p. 15).
6. The amalgam M is then embedded diff-faithfully into a full model using Theorem 3 (p. 14–15). For CARDC, strongness uses Lemma 12 (appendix): every array whose length is in A is, after extending the models, either cardinality-equivalent to the image of an A-array (condition 1) or has a fresh index with a fresh element value (condition 2). Condition 2 is shown impossible when two arrays have the same image, and in condition 1 an A-array c is built with f1(c)=a1; this yields Theorem 5 and Corollary 1 (Section 5.2, p. 16, proof details in the appendix).

verus form
Inference: The construction maps to a refinement proof over a ghost disjoint-union domain. Use ghost maps and an injectivity invariant; prove preservation lemmas for read, write, length and maxdiff with `ensures`. Verus has no model-theoretic amalgamation primitive, so the result must be encoded as a theorem about the chosen ghost representation. The strongest reusable artifact is a lemma that two independently verified array modules compose when their shared ghost symbols agree.

evidence and limits
Theorem 4 proves both CARD(TI) and CARDC(TI) amalgamate (p. 15). Theorem 5 proves only CARDC(TI) strongly amalgamates; Example 1 (p. 16) gives an unsatisfiable pair over a free predicate `P` whose only common variable is `e`; the interpolant it offers is `P(wr(Const(0),0,e))`, and the paper concludes that “the language lacking constant arrays does not suffice”. This is a semantic limitation, not a benchmark result.

## technique 3: polynomial hierarchical interpolation algorithm
what it is
The algorithm reduces an unsatisfiable pair of CARD(TI) constraints to a polynomial-size interpolation problem in TI ∪ EUF. It uses separated pairs, 0-instantiation, and named iterated differences. The introduction states that it “reduces the computation of interpolants of a jointly unsatisfiable pair of constraints to a polynomial size instance of the same problem in the underlying index theory enriched with unary function symbols.” (Introduction, p. 3)

steps
1. Preprocess each quantifier-free input into a finite separated pair `(Φ1,Φ2)` (Lemma 7, Section 6, p. 18). `Φ1` contains length, write and iterated-diff equalities; `Φ2` contains TI/EUF-style read equalities.
2. For every pair of distinct AB-common array constants, set `N = 1 + max(NA,NB)` where NA/NB count local index constants under writes, introduce common constants `k1…kN`, and add `diff_n(c1,c2)=kn` to both sides (Step 1, Section 7.1, p. 20).
3. Perform 0-instantiation: instantiate universal read formulas only at local index constants (Step 2, p. 20).
4. Call the black-box TI ∪ EUF interpolation algorithm on the resulting inconsistent pair (Step 3, p. 20).
5. Replace each fresh common `kn` by its named `diff_n` term to recover a CARD(TI) interpolant (Step 3 and Examples 2–4, pp. 20–21).

verus form
Inference: A Verus implementation can represent separated constraints as ghost enums and prove each preprocessing rewrite with `ensures`. The black-box arithmetic/EUF interpolant must remain an external trusted solver unless a proof-producing backend is verified. Verus lemmas should state that replacing a fresh name by its ghost term preserves the interpolant's shared-symbol condition; this is a meta-level theorem, not an executable function.

evidence and limits
Theorem 7 proves the three-step algorithm computes a quantifier-free interpolant for every mutually unsatisfiable pair (p. 21). The generated TI ∪ EUF problem is polynomial size, but the paper notes that TI ∪ EUF interpolation is at least exponential (p. 23). Examples 2 and 4 (pp. 20–21) give the resulting interpolants and the recovery of `diff` terms; Example 3 gives only the Step 1 atoms and says the TI ∪ EUF interpolant gives the CARD(TI) interpolant. The algorithm is for CARD(TI) only; extending it to CARDC(TI) is left open because the guessing of index equalities it would need creates branches (Section 8, p. 24). Inference: the algorithm reduces array reasoning but does not guarantee fast end-to-end verification; the arithmetic backend remains the principal cost and trust boundary.

## what is proved, measured, and trusted
Proved results include the equivalences of Lemmas 2–4, amalgamation (Theorem 4), CARDC strong amalgamation, decidability (Theorem 6), and interpolation correctness (Theorem 7). The paper reports no wall-clock benchmark table; its “polynomial size” claim is a symbolic size bound, while the underlying interpolation can be exponential.

## techniques for the catalog
- contiguous arrays with maxdiff: axiomatize bounded, fully initialized arrays and a greatest-difference operator for quantifier-free reasoning
- amalgamation construction: combine array models through diff-faithful embeddings into a model whose index sort is a strong amalgam of the index models and whose element sort is the union of the element sorts
- constant-array strong amalgamation: add fixed-length default arrays to prevent unwanted identifications and obtain general interpolation
- hierarchical interpolation: preprocess, 0-instantiate, and reduce array interpolation to a polynomial-size TI ∪ EUF problem
