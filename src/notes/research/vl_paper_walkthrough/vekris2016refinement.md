# Refinement types for TypeScript
(authored by agents unless marked 🧑)
Tag: `vekris2016refinement`, [paper](https://doi.org/10.1145/2908080.2908110)

## scope and contribution
The paper presents Refined TypeScript (RSC), a refinement type checker for TypeScript. Its core claim is that lightweight SMT-backed refinements can combine mutation, higher-order functions, and dynamic TypeScript features. The paper says: “We develop a core calculus that formalizes the interaction of mutability and refinements via declarative refinement type checking that we prove sound” (Introduction, PDF p. 1). It also reports a working implementation evaluated on real programs.

## technique: refinement contracts and safe array access
A refinement type is a base type constrained by a logical predicate. The paper defines `nat = {v:number | 0 ≤ v}`, `pos = {v:number | 0 < v}`, `natN<n> = {v:nat | v=n}`, and `idx<a> = {v:nat | v < len(a)}` (Section 2, PDF pp. 1–2). Function types use named inputs as preconditions and the result as a postcondition: “In essence, the input types Ti specify the function’s preconditions, and the output type T describes the postcondition” (Section 2, PDF p. 2).

To verify `head(arr) { return arr[0]; }`, declare `NEArray<T> = {v:T[] | 0 < len(v)}`; translate `arr[0]` to `get(arr,0)`; check that `0` is a subtype of `idx<arr>`; and discharge the resulting implication with an SMT solver. The paper’s exact verification condition is `0 < len(arr) ⇒ (ν = 0 ⇒ 0 ≤ ν < len(arr))` (Section 2.1.1, PDF p. 2). Inference: in Verus, represent the precondition with `requires 0 < arr.len()` and prove the index bound before indexing, using `assert` or a lemma; Rust indexing itself still requires a runtime-valid index unless the proof establishes it.

Evidence is the soundness theorem for the core calculus and the solver-checked verification conditions; this theorem does not cover every TypeScript extension in the implementation. Assumptions are that predicates lie in the solver’s decidable fragment and that array length is modeled by the uninterpreted `len` function. Failure occurs when aliases or dynamic features hide the needed relationship.

## technique: path-sensitive flow and higher-order summaries
RSC adds branch predicates to the typing environment. In `head0(a)`, the branch `if (0 < a.length)` gives the environment `a:number[], 0 < len(a)`, making the call to `head` type-correct (Section 2.1.1, PDF p. 2). For higher-order code, `reduce` receives the summary `<A,B>(a:A[], f:(B,A,idx<a>)⇒B, x:B)⇒B`; this states that callbacks receive only valid indexes and that the accumulator type is preserved (Section 2, PDF pp. 2–3). The paper says: “This type is a precise summary for the higher-order behavior of reduce” (Section 2, PDF p. 2).

The application steps are: write a polymorphic summary; instantiate `A` and `B` at the call site; check the callback under the instantiated argument types; and verify the callback result and array accesses. Inference: a Verus analogue is a generic function with `requires` for the index relation and a quantified callback specification, but Rust closures need explicit specification patterns and cannot directly use RSC’s dependent type syntax. What carries over is the proof obligation; what changes is encoding it as traits, ghost state, and quantified assertions.

## technique: liquid-style inference and SSA for mutation
RSC infers unknown refinements in three steps: “(a) creates templates for unknown refinement type instantiations, (b) performs type-checking over the templates to generate subtyping constraints over the templates that capture value-flow in the program, (c) solves the constraints via a fixpoint” (Section 2.2.1, PDF pp. 3–4). For assignments, it first translates code to static single assignment (SSA), generates templates for phi variables, type-checks the SSA program, then solves the generated constraints (Section 2.2.2, PDF p. 4). The paper states: “To ease refinement reasoning, we translate FRSC to a functional, yet still mutable, intermediate language IRSC.” (Section 3, PDF p. 5).

Use this when mutation makes a variable’s value path-dependent. Steps are: create fresh SSA names at assignments; add branch joins as phi variables; attach unknown predicates; generate subtyping constraints; solve them; and check the resulting refinements. Inference: Verus does not expose an SSA transformation to the programmer; write mutable Rust normally and use `old(...)`, loop invariants, and ghost variables to state relationships across iterations. The mathematical role of SSA joins is supplied by invariants and snapshots.

## technique: intersections, reflection, downcasts, and class invariants
RSC models value-based overloads with intersection types, replacing impossible branches by `assert(false)` under contradictory environments (Section 2.1.2, PDF p. 3). It specifies class invariants, such as positive `width` and `height`, and checks methods against them (Section 2.2.3, PDF pp. 4–5). For JavaScript reflection, refinements encode object hierarchies; a `typeof` test adds the corresponding predicate to the environment. Downcasts are verified by proving the tested predicate before a cast (Sections 4.2–4.3, PDF pp. 10–11). Inference: Verus can encode these as enums, datatypes, `requires`/`ensures`, and proof lemmas, but dynamic `typeof` and unchecked casts must be replaced by explicit Rust representations or trusted boundaries.

## technique: make mutability explicit
RSC permits refinements to refer only to immutable variables and fields. Its TypeScript extension distinguishes immutable (`IM`), mutable (`MU`), read-only (`RO`), and unique (`UQ`) references (Section 4.4, PDF pp. 11–12). Read-only prevents mutation through that reference but permits mutation through another alias; immutable excludes both. For arrays, `length` yields the exact `len(a)` only for immutable arrays. Constructor checks delay field-invariant obligations until exit, while forbidding leaked `this` references and field reads during construction. Unique references allow further initialization outside the constructor under restrictions that prevent alias creation. Inference: Rust ownership can supply a related discipline, but a translation must preserve the difference between a read-only reference and an object that no alias can mutate.

## evidence, trust, and limitations
The evaluation covers D3 arrays, Octane benchmarks, Transducers, and the TypeScript compiler. Figure 6 reports 2,522 non-comment source lines and 529 specification annotations, partitioned into 334 trivial type annotations, 104 mutability annotations, and 91 refinement annotations (Section 5, PDF pp. 12–13). The figure’s benchmark rows give the per-program breakdown. The paper proves SSA consistency and type safety for its formal core, while the SMT solver, parser, compiler implementation, and trusted TypeScript libraries remain trusted. RSC cannot recover unique references after an object is converted to mutable state and has limitations around aliases and method calls (Section 5.3). Inference: the study shows obstacles to automatic invariant inference involving mutation and aliases; it does not measure a competitive threat to agent-written verified Rust.

## what VL should reuse
Inference: RSC’s reusable ideas are refinement contracts, solver-generated subtyping obligations, path-sensitive environments, higher-order summaries, and SSA-inspired handling of mutation. VL should not redo the basic insight that array safety can be expressed as an index refinement; its effort should focus on translating these obligations into valid Verus syntax and on robust handling of aliasing and external code.

## techniques for the catalog
- refinement contracts — constrain values with SMT-decidable predicates and check calls by subtyping
- path-sensitive typing — add branch predicates to the environment before checking a use
- higher-order summaries — specify callback arguments and preserved accumulator properties
- liquid-style inference — generate templates, constraints, and a fixpoint solution
- SSA mutation reasoning — split assigned variables and solve join constraints
- intersection overload checking — represent alternatives as intersections and prove impossible branches unreachable
- reflection and downcast verification — refine object types from runtime tests before casts
- explicit mutability — distinguish immutable, mutable, read-only and unique references before retaining field facts
- class invariants — require every constructor and method update to preserve field predicates

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Overall, we had to add about 1 line of annotation per 5 lines of code (529 for 2522 LOC)."): checked the full extracted paper, formal-system claims, quotations, benchmark counts, limitations, printed page references, and author/year tag; corrected the Figure 6 interpretation, PDF page references, core-versus-implementation scope and unsupported threat wording; added the omitted mutability and initialization technique; read the included supplemental system and proofs; did not independently reconstruct the proofs, rerun rsc, SMT queries or benchmarks, inspect implementation code, or independently resolve the retained DOI.
