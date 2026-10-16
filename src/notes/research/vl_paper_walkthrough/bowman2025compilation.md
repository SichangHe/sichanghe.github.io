# Compilation as Multi-Language Semantics
(authored by agents unless marked 🧑)
Tag: `bowman2025compilation`, [paper](http://arxiv.org/abs/2509.19613v1)

## purpose and model
This extended abstract presents one reduction system that models source execution, compilation, and target execution together. The concrete instance translates a Scheme-like source language to A-normal form (ANF), within a five-pass model compiler aimed at an x86-64-like language. The paper's central claim is: “We introduce a novel work-in-progress approach to uniformly model both variants as a single reduction system on open terms in a multi-language semantics.” Existing approaches separately define syntactic translation on open terms and run-time translation at boundaries, then prove those definitions coincide. Here, boundary terms embed source and ANF terms in one syntax.

## technique 1: embed languages with explicit boundaries
Use this when a compiler or interoperability proof must relate open source terms, target terms, and run-time crossings. Extend each language's syntax with `SA A.e` (source outside, ANF inside) and `AS S.e` (ANF outside, source inside). A source term has a heap-based call-by-value small-step relation `(H S.e1) → (H S.e2)`; ANF terms restrict computations to values as operands and use `(H A.e1) → (H A.e2)`. The heap is indexed in the multi-language relation.

Steps: define syntax for both languages; add both boundary constructors; define each language's ordinary reduction; define translation and boundary-cancellation reductions; combine all transitions into one relation. Boundary cancellation includes `C[(AS (SA A.e))] → C[A.e]` and `C[(SA (AS S.e))] → C[S.e]`. The paper states: “The multi-language reduction allows reducing in the source language, or translating then reducing in the target language.”

Inference: a Verus model can represent source and target states as datatypes, with a ghost boundary state and `spec fn` transition relation. A `proof fn` can establish that an allowed transition preserves an invariant; executable Rust should carry only the selected runtime representation. Verus does not directly execute the paper's lambda-calculus reductions, so this encoding is a model of a compiler, not a drop-in compiler implementation.

## technique 2: treat compilation as normalization
Define A-reductions `→ᵃ` that rewrite source expressions in source evaluation contexts while making boundary transitions explicit. Rules include A-normal, A-merge-l, A-merge-b, A-join, and A-lift. Translation reductions extend these under any translation context `T`; one step either performs an A-reduction or boundary cancellation. AOT compilation is then normalization: `S.e ⇓ᴬᴺᶠ A.e` exactly when `(AS S.e) →ᵃ* A.e`.

Apply it by choosing a translation strategy and reducing all cross-language redexes to a target normal form. The paper says: “We get a model of ahead-of-time (AOT) compilation by normalizing cross-language redexes; the normal form with respect to these redexes is a target language term.” Side conditions on evaluation contexts prevent reductions in target redexes or empty contexts and fresh names are required for generated `let`/`letrec` bindings.

Inference: for Verus, represent source and target configurations with `struct`s and state transitions as specification functions; prove normalization properties as lemmas, with explicit `requires` for freshness and well-formedness. A Verus proof of termination would need a decreasing measure; the paper's rules and side conditions alone do not provide a Rust termination proof.

## technique 3: model JIT as nondeterministic multi-language reduction
For JIT, retain both choices at each state: step in the source, or cross a boundary and step in ANF. The paper's Figure 5 rules include source interpretation, ANF execution, boundary-mediated runs, and `[JIT]` translation. This nondeterminism captures compilation at run time instead of requiring a precomputed target normal form. The authors state: “We model just-in-time (JIT) compilation as nondeterministic evaluation in the multi-language: a term can either step in the source, or translate then step in the target.”

Steps: start with a heap and embedded source term; apply a source reduction, translation reduction, or target reduction; preserve the heap across the language boundary; repeat until a value or stuck state. The paper notes an assumption: terms already in the heap are not translated, corresponding to identical source and target memory models. It says speculative optimization would require assumption instructions, which this model does not include.

Inference: a Verus state machine can encode the nondeterministic transition relation and prove that every permitted implementation step refines an abstract transition. The memory-identity assumption must be made an explicit model invariant; real Rust pointers, layouts, and unsafe operations require additional trusted specifications.

## technique 4: derive compiler theorems from confluence and subject reduction
The multi-language semantics makes ordinary metatheory imply compiler properties. Subject reduction says typing is preserved by source-to-ANF reduction; the paper states Theorem 1: if typed source reduction preserves type, then an ANF result has corresponding target context and type. Confluence is stated as joining any two reduction paths from a common configuration. From it, the authors derive AOT and JIT compiler correctness and part of full abstraction. They state: “We prove that confluence of multi-language reduction implies compiler correctness and part of full abstraction; and that subject reduction implies type-preservation of the compiler.”

To use the method: define the multi-language relation; prove subject reduction; prove or assume confluence; define contextual equivalence over all multi-language contexts; show compilation preserves and reflects that equivalence. The paper's contextual equivalence requires all contexts to co-terminate. Full abstraction is then stated as equivalence before reduction iff equivalence after reduction under the multi-language relation. Whole-program correctness is a corollary for source and target values that are equal.

Inference: in Verus, encode typing and contextual invariants as ghost predicates and prove each transition's preservation with `ensures`. Confluence may require a separate relational proof and is unlikely to be discharged by default solver automation. The theorem structure can guide VL compiler verification, but source-language semantics, target semantics, and context quantification remain substantial modeling work.

## what is proved, assumed, and left open
The artifact is a work-in-progress semantic model, not an empirical benchmark. It reports no implementation-size, runtime, or proof-time measurements. The trusted assumptions include identical memory models across languages, correctness of the reduction rules, and the confluence conjecture used to derive correctness. The paper says: “Note the multi-language semantics can reduce open terms, so confluence implies correctness of both the AOT and the JIT compiler.” It does not prove speculative optimization, real x86-64 execution, or a complete compiler implementation.

Inference: threat to agent-written verified Rust is medium for compiler and serialization components: this method provides a principled proof architecture, but a proof can still rest on an unrealistically identical memory model or an unproved semantic correspondence. VL should reuse the boundary-state and refinement pattern where it needs interoperability, and should not claim this abstract model verifies arbitrary Rust code.

## techniques for the catalog
- embed source and target syntax with explicit boundary constructors in one open-term reduction system
- define AOT compilation as normalization of cross-language redexes under translation contexts
- model JIT by nondeterministically choosing source execution or translation then target execution
- derive type preservation, compiler correctness, and full abstraction from subject reduction and confluence
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
