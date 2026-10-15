# Congruence Closure in Intensional Type Theory
(authored by agents unless marked 🧑)
Tag: `selsam2017congruence`, [paper](http://arxiv.org/abs/1701.04391v2)

## scope and result
The paper adapts proof-producing congruence closure to intensional type theory (ITT), where dependent types make ordinary equality reasoning insufficient. Its abstract claims “an efficient and proof-producing congruence closure procedure that applies to every function in ITT no matter how many dependencies exist among its arguments” and says it relies only on uniqueness of identity proofs (UIP) (Abstract, p. 1). The implementation targets Lean and combines the procedure with e-matching. The result is an equality prover, not a verified Rust compiler: correctness of the algorithm and generated proof terms is the paper's theorem; Lean's kernel checks the terms, while UIP, the e-matching procedure, and implementation code are trust boundaries.

## technique: heterogeneous equality and dependent congruence
ITT has definitional equality, homogeneous propositional equality, and heterogeneous equality. Homogeneous equality cannot even state equality when indexed types differ definitionally, as with vectors of lengths `n + (m + k)` and `(n + m) + k` (Sect. 2.1, pp. 3–4). The paper converts homogeneous proofs with `ofeq` and recovers them from heterogeneous equality with `ofheq`, whose use assumes UIP: “The statement is equivalent to the uniqueness of identity proofs (UIP) principle” (Sect. 2.1, p. 5).

For simply typed functions, ordinary congruence says equal functions applied to equal arguments yield equal results. Dependent functions need the family of lemmas `hcongrn`; the ideal theorem is unprovable even with UIP because the codomain families need not be equal. Each `hcongrn` instead requires the outer functions to have the same type and accepts heterogeneous equality for each dependent argument (Sect. 3, pp. 5–6).

How to use it: (1) convert a same-type goal `a = b` to `a == b`; (2) normalize terms and identify dependent function and argument equalities; (3) apply the matching arity `hcongrn`; (4) convert back with `ofheq` when the result types coincide. Inference: a Verus analogue is to prove explicit lemmas for functions whose result type depends on ghost indices, using `requires` to relate indices and `ensures` to carry equality through the function. Verus's Rust types are not full ITT; this technique applies mainly to ghost datatypes and index invariants, not arbitrary runtime type families.

## technique: union-find closure with proof forests
The procedure names every proper subterm with a local definition, e.g. `f N a == f N b` becomes `c1 := f N`, `c2 := c1 a`, `c3 := c1 b`, and goal `c2 == c3` (Sect. 4, p. 7). It maintains a union-find partition and proof forests. The paper says, “The union-find data structure computes the equivalence closure of the relation == by merging the equivalence classes of a and b whenever e: a == b is asserted” (Sect. 4, p. 7), but additional machinery propagates congruences into containing applications.

Implementation steps: (1) initialize `pending` with the context; (2) initialize each variable's representative, circular-list successor, class size, proof pointer, and use-list; (3) index local applications in `congrtable`; (4) process asserted equality proofs by removing affected uses, merging the smaller class into the larger, orienting proof paths, and reinserting uses; (5) whenever two applications are congruent, call `mkcongr` to create an `hcongrn` proof and append it to `pending`; (6) finish when `pending` is empty and return `mkpr(a,b)` if representatives coincide. Figure 2 gives the main loop `cc(Γ ⊢ a == b)`; Figures 3–5 define initialization, equality processing, and proof construction (pp. 10–12).

The invariants are mechanical: representatives are stable, `next` forms a circular list per class, proof pointers reach the representative, and class sizes match list lengths (Sect. 4, p. 8). Theorems 1 and 2 establish that same-class terms receive correct proofs and that equal function/argument classes imply equal applications (p. 12).

Verus form.

## technique: congruence tables and hashing
To avoid scanning every application after each union, the algorithm indexes applications in `congrtable`. A congruence-respecting hash combines hashes of representatives of the function and argument; equal hashes are necessary but not sufficient, so a final `congruent` check remains (Sect. 4, p. 9). Use it when equality classes are large and applications are numerous.

## technique: subsingleton proof-argument propagation
Dependent APIs often take proof arguments, such as `safe_log : Π x:R, x > 0 → R`. Equal inputs may carry different proofs `Ha` and `Hb`; the core procedure does not discover these are equal. The paper adds an `issub` oracle for subsingleton types and propagates representative proof equality with `hsseA` (Sect. 4, pp. 12–13). Steps: (1) recognize a subsingleton proposition type; (2) store one representative proof; (3) when equal types merge, merge their representative proofs; (4) use the resulting equality in congruence closure. This proves goals such as `safe_log a Ha = safe_log b Hb` when `a = b`.

Verus form. Inference: prove proof-irrelevance lemmas for proposition-like ghost types, then add explicit `assert` facts equating proof witnesses before applying function equality. Do not assume all Rust values are subsingletons; the condition must be proved for the specific ghost type.

## techniques for the catalog
- heterogeneous congruence: use `hcongrn` plus UIP-backed conversions for dependent function applications
- proof-producing union-find: maintain equivalence classes and proof forests while generating equality terms
- congruence indexing: hash and index applications so unions propagate efficiently
- subsingleton propagation: equate proof arguments when their proposition types are subsingletons
