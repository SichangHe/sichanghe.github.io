# Refinement types for TypeScript
(authored by agents unless marked 🧑)
Tag: `vekris2016refinement`, [paper](https://arxiv.org/abs/1604.02480)

## scope and contribution
The paper presents Refined TypeScript (RSC), a refinement type checker for TypeScript. Its core claim is that lightweight SMT-backed refinements can combine mutation, higher-order functions, and dynamic TypeScript features. The paper says: “We develop a core calculus that formalizes the interaction of mutability and refinements via declarative refinement type checking that we prove sound” (Introduction, PDF p. 1). It also reports a working implementation evaluated on real programs. The paper identifies this version as “arXiv:1604.02480v1 [cs.PL] 8 Apr 2016” (PDF p. 1).

## technique: refinement contracts and safe array access
A refinement type is a base type constrained by a logical predicate. The paper defines `nat = {v:number | 0 ≤ v}`, `pos = {v:number | 0 < v}`, `natN<n> = {v:nat | v=n}`, and `idx<a> = {v:nat | v < len(a)}` (Section 2, PDF pp. 1–2). Function types use named inputs as preconditions and the result as a postcondition: “In essence, the input types Ti specify the function’s preconditions, and the output type T describes the postcondition” (Section 2, PDF p. 2).

To verify `head(arr) { return arr[0]; }`, declare `NEArray<T> = {v:T[] | 0 < len(v)}`; translate `arr[0]` to `get(arr,0)`; check that the singleton type `{ν = 0}` is a subtype of `idx<arr>`; and discharge the resulting implication with an SMT solver. The paper’s exact verification condition is `0 < len(arr) ⇒ (ν = 0 ⇒ 0 ≤ ν < len(arr))` (Section 2.1.1, PDF p. 2). Inference: a candidate Verus encoding would state the nonempty-array precondition and prove the index bound before indexing. This study does not validate that encoding.

The formal result concerns the core: “We establish type soundness results for IRSC in the form of a subject reduction (preservation) and a progress theorem that connect the static and dynamic semantics of IRSC” (Section 3.3, PDF p. 9). Section 2 describes predicates from an SMT-decidable logic and `len` as an uninterpreted function. The implementation’s non-linear arithmetic difficulties are discussed separately below.

## technique: path-sensitive flow and higher-order summaries
RSC adds branch predicates to the typing environment. In `head0(a)`, the branch `if (0 < a.length)` gives the environment `a:number[], 0 < len(a)`, making the call to `head` type-correct (Section 2.1.1, PDF p. 2). For higher-order code, `reduce` receives the summary `<A,B>(a:A[], f:(B,A,idx<a>)⇒B, x:B)⇒B`; this states that callbacks receive only valid indexes and that the accumulator type is preserved (Section 2, PDF pp. 2–3). The paper says: “This type is a precise summary for the higher-order behavior of reduce” (Section 2, PDF p. 2).

The application steps are: write a polymorphic summary; instantiate `A` and `B` at the call site; check the callback under the instantiated argument types; and verify the callback result and array accesses. Inference: a candidate translation should preserve both the callback’s valid-index precondition and its accumulator postcondition. The paper does not establish how to encode or infer those contracts in Verus.

## technique: liquid-style inference and SSA for mutation
RSC infers unknown refinements in three steps: “(a) creates templates for unknown refinement type instantiations, (b) performs type-checking over the templates to generate subtyping constraints over the templates that capture value-flow in the program, (c) solves the constraints via a fixpoint computation (abstract interpretation).” (Section 2.2.1, PDF pp. 3–4). For assignments, it first translates code to static single assignment (SSA), generates templates for phi variables, type-checks the SSA program, then solves the generated constraints (Section 2.2.2, PDF p. 4). The paper states: “To ease refinement reasoning, we translate FRSC to a functional, yet still mutable, intermediate language IRSC.” (Section 3, PDF p. 5).

Use this when mutation makes a variable’s value path-dependent. Steps are: create fresh SSA names at assignments; add branch joins as phi variables; attach unknown predicates; generate subtyping constraints; solve them; and check the resulting refinements.

## technique: intersections, reflection, downcasts, and class invariants
RSC models value-based overloads with intersection types, replacing impossible branches by `assert(false)` under contradictory environments (Section 2.1.2, PDF p. 3). It specifies class invariants, such as positive `w` and `h`, and checks methods against them (Section 2.2.3, PDF pp. 4–5). For JavaScript reflection, refinements encode object hierarchies; a `typeof` test adds the corresponding predicate to the environment. Downcasts are verified by proving the tested predicate before a cast (Sections 4.2–4.3, PDF pp. 10–11). The cast result is explicit: “Cast operations can safely be erased when compiling to executable code” (Corollary 4, Section 3.3, PDF p. 9). Inference: an explicit Rust representation of each alternative could replace the dynamic tags, provided the translation preserves the tested predicates.

## technique: make mutability explicit
RSC permits refinements to refer only to immutable variables and fields. Its TypeScript extension distinguishes immutable (`IM`), mutable (`MU`), read-only (`RO`), and unique (`UQ`) references (Section 4.4, PDF pp. 11–12). Read-only prevents mutation through that reference but permits mutation through another alias; immutable excludes both. For arrays, `length` yields the exact `len(a)` only for immutable arrays. Constructor checks delay field-invariant obligations until exit, while forbidding leaked `this` references and field reads during construction. Unique references allow further initialization outside the constructor: “they cannot be re-assigned” and “they cannot be cast to types of a different mutability” (Section 4.4, PDF pp. 11–12). Their uses are restricted to contexts that guarantee no aliases are produced, such as a field-assignment receiver or a returned expression. Inference: Rust ownership can supply a related discipline, but a translation must preserve the difference between a read-only reference and an object that no alias can mutate.

## evidence, trust, and limitations
The evaluation covers D3 arrays, Octane benchmarks, Transducers, and the TypeScript compiler. Figure 6 reports 2,522 non-comment source lines and 529 specification annotations, partitioned into 334 trivial type annotations, 104 mutability annotations, and 91 refinement annotations (Section 5, PDF pp. 12–13). Figure 6 reports analysis times from 6 seconds for splay to 473 seconds for navier-stokes. Figure 7 reports 469 important changed lines and 1,052 changed lines including trivial changes (Section 5.1, PDF pp. 12–13). The authors ported the programs and modified their source to facilitate verification. In splay, the authors “added 5 explicit non-null checks for mutable objects” (PDF p. 13). For navier-stokes they introduced ghost functions to establish non-linear arithmetic facts: “The reported performance assumes the use of ghost functions. In the cases where they were not used RSC would time out” (PDF p. 13).

The paper proves SSA consistency and type safety for its formal core (Sections 3.1.3 and 3.3; appendices A–B). Inference: these results do not by themselves validate the implementation or a translation to Verus. Section 5.3 says: “RSC cannot recover the Unique state for objects after they have been converted to Mutable (or other state), as it lacks a fine-grained alias tracking mechanism” (PDF p. 14). It also excludes method calls on the object under construction and cannot express local annotations specific to one overload (PDF pp. 13–14). Inference: these limitations identify obstacles involving mutation, aliases, and overload-specific inference; the evaluation supplies no comparison with agent-written verified Rust.

## techniques for the catalog
- refinement contracts — constrain values with SMT-decidable predicates and check calls by subtyping
- path-sensitive typing — add branch predicates to the environment before checking a use
- higher-order summaries — specify callback arguments and preserved accumulator properties
- liquid-style inference — generate templates, constraints, and a fixpoint solution
- SSA mutation reasoning — split assigned variables and solve join constraints
- intersection overload checking — represent alternatives as intersections and prove impossible branches unreachable
- reflection and downcast verification — refine object types from runtime tests before casts
- explicit mutability — distinguish immutable, mutable, read-only and unique references before retaining field facts
- class invariants — check field predicates at constructor exit and preserve them on subsequent field updates
