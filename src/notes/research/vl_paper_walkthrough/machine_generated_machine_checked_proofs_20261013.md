# Machine-Generated, Machine-Checked Proofs for a Verified Compiler (Experience Report)
(authored by agents unless marked 🧑)
Tag: `paraskevopoulou2026machinegenerated`, [paper](https://doi.org/10.1145/3828700)

## scope and result
The paper reports an agent-assisted Rocq proof of CertiCoq's administrative-normal-form (ANF) transformation. The abstract says: “The proof establishes semantic preservation for the administrative normal form (ANF) transformation in the CertiCoq verified compiler for Rocq.” The task is a compiler-correctness proof, not a benchmark of arbitrary programs. The paper says the proof was “developed in approximately 96 hours” and describes Claude Code (Claude Opus 4.6), high-level human guidance, and human review; the authors “did not write Rocq proofs directly”. The paper has inconsistent size statements: the abstract says approximately 7,800 lines, the introduction says approximately 6,000 lines, and Section 5.4 reports 7,783 total lines versus 5,294 for CPS. Those denominators and contexts must remain distinct.

## technique 1: replace forward simulation by a step-indexed logical relation
Use this when a transformation inserts administrative reductions or fresh names, so a source step cannot be matched by a target term using ordinary syntactic forward simulation. Section 2 first states the ordinary goal: “whenever the source program takes a step 𝑒 → 𝑒 ′, the compiled program takes one or more steps to reach the translation of 𝑒 ′”. It then exhibits the failure: the CPS application case creates an administrative beta-redex, and after reducing it the target is the contractum of the goal rather than the goal itself; “We would need to step backwards to close the diagram, which is impossible.” Fresh counters create a second mismatch because the result can be alpha-equivalent but not syntactically equal.

The paper's repair is to define a reflexive, transitive logical relatedness relation. It states: “The key insight of Paraskevopoulou and Grover [2021] is to replace the reduction relation at the target level with logical relatedness.” The relation includes Reduce-App, so a redex is related to its contractum in either direction, and it relates alpha-equivalent terms. The application proof chains the original term to its contractum, applies the induction hypothesis to the source substep, chains back through the new redex, then uses transitivity. This is the paper's worked proof shape in Section 2.

Inference: in Verus, encode the relation as a `spec fn` over source and target states and prove the redex and transitivity lemmas as `proof fn`s; use `ensures` on those proof functions and `requires` for well-formedness. Keep executable translation separate from the relation. Verus has no Rocq tactics or step-index notation built in, so the index, relation clauses, and transitivity obligations must be explicit. Do not put `ensures` on a `spec fn`.

Evidence is the mechanized CPS technique reused for ANF and the central semantic-preservation theorem. The paper says the LLM “correctly identified that the technique that is used to show that the CPS transformation preserves diverging behaviors does not generalize to the ANF setting, proving a counterexample.” Thus the proved scope is terminating semantic preservation, not divergence preservation.

## technique 2: relational transformation first, executable transformation second
Use this when a name-generating implementation would entangle state or freshness with the semantic simulation proof. Section 4 defines the relation `S; x; e ▷ C; r; S'`, where `S` is a fresh-name set, `x` maps de Bruijn indices to names, `C` is a one-hole context, and `r` is the result variable. It first proves semantic preservation for that relation. It then proves that the executable state-monad ANF transformation over a fresh-name supply satisfies the relational specification. The paper says this “allows us to separate the monadic reasoning from the core simulation argument”.

The paper's concrete rules are reusable. A variable maps `n` to `x[n]` and the empty context. A lambda chooses fresh function and parameter names, recursively translates the body under `x1 :: x`, and emits `fun f x1 = C1[ret(r1)] in •`. An application recursively translates both operands and emits `C1 ◦ C2 ◦ let r = x1 x2 in •`. A constructor recursively translates its argument and emits a constructor let. A source let composes the two contexts and extends the environment for the second expression.

Inference: a Verus implementation can use a `spec fn` for the relational judgment and a Rust function with a ghost fresh-name state; prove a lemma that the executable output satisfies the relation. Use `old(...)` only where a post-state refers to a pre-state value, and use `invariant` as a loop invariant statement, never as a call. Freshness and context composition need explicit predicates and lemmas.

## technique 3: make correctness compositional with arbitrary continuations
Theorem 4.1 quantifies over any continuation expression `ek` satisfying a free-variable freshness condition. It relates source evaluation to the target context followed by `ek`, using `anf_val_rel` for values and `anf_env_rel` for environments. The paper explains: “The universally quantified continuation 𝑒𝑘 is what makes the statement compositional: it allows the theorem to be applied inductively in larger contexts.” In the Let case, apply the induction hypothesis first to the second expression with `ek`, then to the first expression with `C2[ek]`, and close with transitivity.

Inference: in Verus, represent the continuation as a ghost/spec-level expression or relation parameter, and state the theorem with quantified postconditions over continuations that satisfy the freshness predicate. This enables recursive composition but may require finite, executable encodings of syntax.

## techniques for the catalog
- logical-relatedness simulation: replace exact target-step matching with a reflexive, transitive relation that absorbs administrative redexes and alpha-equivalence
- relational ANF specification: prove a fresh-name relational judgment first, then show the executable stateful translator refines it
- continuation-parametric correctness: quantify over arbitrary fresh continuations so induction composes across contexts
- template-based proof adaptation: reuse a human-designed logical-relation proof architecture for related compiler passes
