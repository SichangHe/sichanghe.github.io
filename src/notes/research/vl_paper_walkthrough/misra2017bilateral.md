# Bilateral Proofs of Safety and Progress Properties of Concurrent Programs
(authored by agents unless marked 🧑)
Tag: `misra2017bilateral`, [paper](http://arxiv.org/abs/1704.01814v1)

## scope and specification model
The paper proposes a compositional specification for concurrent components that combines terminal properties (pre/post behavior if execution terminates) with perpetual properties (safety and progress during execution). Its abstract states: “The specification consists of both terminal properties that hold at the end of a program execution (if the execution terminates) and perpetual properties that hold throughout an execution.” (abstract, p. 1). The same abstract explains the bilateral idea: “We employ terminal properties of components to derive perpetual properties of a program and conversely.” (abstract, p. 1)

Components are actions, nondeterministic joins `f [] g`, or sequential compositions `seq(...)` (Section 2.1, p. 2). Every action has a guard and body. Execution is fair: every control point is eventually chosen, while an ineffective guarded action models busy waiting (Section 2.2, pp. 2–3). A specification is `{r} f {Q  s}`, where `r` is a precondition, `s` a terminal postcondition, and `Q` a set of perpetual properties (Section 3.1, p. 5).

Inference: the practical lesson is to make liveness and safety part of component interfaces, so a parent can prove properties without source code for every child. This is a paper inference applied to VL, not a claim about Verus.

## technique 1: local annotations and compositional terminal proofs

when to use it
Use local annotations for each program point of a component. An annotation gives the precondition of each action and a valid component pre/postcondition in any environment (Section 3.2, p. 5).

how to apply it
1. For an action `b → α`, prove `{p ∧ b} α {q}`, then infer `{p} b → α {q}` (Section 3.2, p. 5).
2. For sequential `seq(f0,...,fn)`, annotate each child using variables local to that child and the parent, then compose with the sequential proof rules (Section 3.2, p. 5).
3. For a join `g [] h`, build local annotations independently and combine `{r}g{s}` and `{r'}h{s'}` into `{r∧r'} g [] h {s∧s'}` (Section 3.2, p. 5).
4. Apply strengthening/weakening and conjunction/disjunction meta-rules to adapt interfaces. The conjunction rule unions perpetual properties; the disjunction rule intersects them (Section 3.4, pp. 6–7).

verus form
Inference: encode each action's state relation as a Verus function with `requires` and `ensures`; encode local assertions as loop `invariant` clauses and lemmas. For a concurrent join, Verus has no built-in scheduler semantics, so a product-specific state-transition model and interference lemmas are required. The paper's local-variable restriction can correspond to disjoint ownership predicates, but this correspondence is an inference.

## technique 2: safety via co, stable, constant, and invariant

The safety relation `p co q` means every effective action executed in a `p`-state establishes `q`; ineffective execution preserves `p`. The paper states: “in any execution of f once p holds it continues to hold until q is established, though q may never be established” (Section 4.1, p. 7). For an annotated component, inspect every action with annotation precondition `pre` and prove `{pre ∧ b ∧ p} α {q}`; then infer `{r}f{p co q  s}` (Section 4.1, p. 7).

Special cases are `stable p ≡ p co p`, `constant e ≡ (∀c :: stable e=c)`, and `invariant p ≡ initially p and stable p` (Section 4.2, p. 8). The inheritance rule lifts a safety property proved for every subcomponent to the whole component. The invariance rule permits a local invariant to be substituted for `true` in any annotation or property; for a whole program, any invariant may be conjoined to an assertion (Section 4.3, p. 8).

The distributed-counter example proves `ctr=m co ctr=m∨ctr=m+1` for every thread, then inherits it to the join (Section 4.4, p. 8). Only the action that writes `ctr` needs a Hoare proof.

verus form
Inference: represent `co` as a transition lemma: if a step starts in `p`, its post-state satisfies `q`, and ineffective steps preserve `p`. Use Verus `ensures` for action relations and `invariant` for stable predicates. A concurrent inheritance proof would quantify over a scheduler step and establish the property for each component transition. Verus does not have the paper's `co` operator; define it as a ghost/spec relation and prove its composition lemmas.

## technique 3: progress through transient and ensures

A predicate `p` is transient when it is eventually falsified. The basis rule proves each enabled action can establish `¬p`; sequencing, concurrency, and inheritance rules derive transient properties from component facts (Section 5.1, pp. 9–10). The paper emphasizes: “Basis rule is the only rule that needs program code for its application, others are derived from properties of the components, and hence, permit specification composition.” (Section 5.1, p. 10)

The stronger property `p en q` (ensures) means `p` persists until `q`, and `q` eventually holds. It is defined by proving both `p ∧ ¬q co p ∨ q` and `transient (p ∧ ¬q)` (Section 5.2, p. 11). In the counter example, for every thread and values `m,N`, the proof establishes `ctr=m ∧ nb=N en (ctr=m ∧ nb<N) ∨ ctr>m`; each loop step either increases the counter or decreases `nb` (Section 5.2, pp. 11–12).

verus form
Inference: encode `p en q` with a preservation invariant plus a well-founded decrease measure. Use a Verus `decreases` clause for the measure when the progress argument is structurally recursive or loop-based; prove that each scheduler step either reaches `q` or decreases the measure. Fairness is an additional assumption that must be modeled and proved; Verus alone does not grant it.

## technique 4: leads-to closure and bilateral composition

The paper defines `p ↦ q` (“leads-to”) as eventual `q` without requiring `p` to remain true. It gives three rules: `p en q` implies `p↦q`; transitivity composes `p↦q` and `q↦r`; and disjunction combines a finite or infinite family of premises (Section 5.3, p. 12). Leads-to is not conjunctive and does not obey inheritance automatically (Section 5.3, p. 12).

The counter proof first establishes the ensures property, applies the basis rule to obtain `ctr=m ↦ ctr>m`, then uses the leads-to induction rule with the well-founded natural-number order to show `true ↦ ctr>C` for every integer `C` (Section 5.3, pp. 12–13). This is the bilateral direction from terminal-like component progress facts to a perpetual property of the assembled program.

Inference: for VL, expose each verified component's safety and progress contracts as reusable lemmas. A parent proof can combine contracts for opaque components, but it must carry scheduler fairness and rely on explicit well-founded measures. This is an inference.

## technique 5: derived safety and progress rules

The appendices provide reusable rules that avoid reopening action code. For `co`, use conjunction, disjunction, left strengthening, and right weakening (Appendix A.1, p. 15). For `transient`, use strengthening: `transient p` entails `transient (p ∧ q)` (Appendix A.2, p. 15). For `ensures`, use implication, right weakening, partial conjunction, and the PSP rule. PSP combines `p en q` with `r co s` to derive `p ∧ r en (q ∧ r) ∨ (¬r ∧ s)`; with stable `r`, it simplifies to `p ∧ r en q ∧ r` (Appendix A.3.2, pp. 16–17).

For leads-to, lightweight rules include implication, left strengthening/right weakening, disjunction, and cancellation. Heavyweight rules include impossibility, PSP, well-founded induction, and completion. The induction rule requires a total measure `M` into a well-founded set `(W,≺)` and assumes `p ∧ M=m ↦ (p ∧ M≺m) ∨ q` for every `m` (Appendix A.4.1–A.4.2, pp. 18–19). The lifting rule carries `p↦q` from `f` to `f[]g` when `g` either preserves shared variables under `r` or establishes `¬r` (Appendix A.4.3, p. 19).

verus form
Inference: encode these as Verus proof lemmas over a ghost transition relation. The induction rule corresponds to a `decreases` measure, PSP to a conjunction of step-postconditions, and lifting to an interference lemma over shared state. Fairness and the paper's component scheduler remain explicit model assumptions.

## evidence, assumptions, and trusted material
The paper is a proof-theory proposal with detailed distributed-counter, mutual-exclusion, and recursive-fold examples; it reports no runtime benchmark or success-rate denominator. Its introduction explicitly says soundness and relative completeness “has not been proved yet” (Section 1, p. 2). The execution model assumes each action body terminates and assumes a fairness constraint that eventually chooses every control point (Section 2.1–2.2, pp. 2–3). Those are trusted assumptions, not derived results.

Inference: the product threat is medium to high for concurrent VL code. The compositional contracts can reduce proof scope and support hidden vendor components, but progress claims are unsound if fairness, action termination, or interference assumptions are omitted. VL should reuse the contract structure and safety/progress decomposition; it should not claim the paper's completeness or treat its rules as a Verus library without re-proving them.

## techniques for the catalog
- local annotation — assign point assertions and derive component pre/postconditions from action proofs
- safety co calculus — prove stepwise `p co q` and lift it with inheritance and invariance
- transient/ensures progress — combine eventual falsification with safety to prove `p en q`
- leads-to closure — derive eventual properties by basis, transitivity, disjunction, and well-founded induction
- bilateral component composition — use terminal facts to derive perpetual properties and perpetual contracts to compose opaque components
- derived progress rules — reuse PSP, well-founded induction, completion, and interference lifting without re-proving action code
Checked 2026-10-14 against the paper by a Codex agent: audit record misra2017bilateral; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
