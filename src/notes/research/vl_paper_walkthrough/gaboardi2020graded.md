# Graded Hoare Logic and its Categorical Semantics
(authored by agents unless marked 🧑)
Tag: `gaboardi2020graded`, [paper](http://arxiv.org/abs/2007.11235v2)

## takeaway
Inference: the paper gives a parameterised Hoare-logic method for attaching an ordered, compositional grade to an ordinary pre/postcondition proof. A grade can count cost, record control-flow events, bound probability of failure, or carry a relational privacy distance. The reusable engineering idea is to make each effectful primitive carry a contract indexed by a grade, then compose grades with a preordered monoid.

"We propose Graded Hoare Logic (GHL), a parameterisable framework for augmenting program logics with a preordered monoidal analysis." (Abstract, p. 1)

Inference: this is a logic and categorical semantics, rather than an implementation or an empirical benchmark. The paper reports no runtime, proof-time, or success-rate denominator. Its evidence is mathematical: inference rules, definitions, soundness theorems, and worked semantic instantiations.

## technique 1: grade effectful primitives and compose the grades

What it is. GHL judgments have the form `⊢m {φ} P {ψ}`, where `φ` and `ψ` are assertions and `m` is an element of a preordered monoid `(M, ≤, 1, ·)`. The order permits a proof to be weakened from a precise grade to an upper bound. The monoid operation combines sequential effects.

"GHL is built over this language and an assertion logic which is parametric in the basic predicates that can be used to reason about programs. GHL is also parametric in a preordered monoid of grades, and in the axioms associated with basic procedures and commands with side effects." (§2, p. 4)

When to use it. Inference: use this technique when a property has a compositional quantity or trace that ordinary Hoare logic would discard: units of work, a sequence of branch labels, an error probability, or a relational distance.

How to do it.
1. Choose a pomonoid `(M, ≤, 1, ·)` whose elements are safe grades. The paper's cost example uses `(N, ≤, 0, +)`; its control-flow example uses words over `{tt, ff}` with prefix order and concatenation; its probability example uses `(R≥0, ≤, 0, +)` (§3.5, pp. 11–12).
2. Declare effectful commands and procedures through `Cc` and `Cp`. A command belongs to `Cc(φ,m)` when it establishes its contract under precondition `φ` at grade `m`; a procedure belongs to `Cp(φ,m,ψ)` with a return-value postcondition (§3.4, p. 9).
3. Prove primitive judgments with the command/procedure rules. Commands preserve their precondition; procedures existentially quantify the overwritten variable in the precondition and conjoin the return postcondition with the return variable `r` replaced by `v`, as in Floyd's assignment rule (Table 1 and text, p. 10).
4. Compose `P1; P2` by multiplying grades: `⊢m {ψ} P1 {ψ1}` and `⊢m' {ψ1} P2 {φ}` imply `⊢m·m' {ψ} P1;P2 {φ}` (Table 1, p. 10).
5. Use consequence to strengthen or weaken assertions and replace `m` with any `m'` satisfying `m ≤ m'` (Table 1, p. 10).

Paper example. In the cost instance, `tick ∈ Cc(φ,1)`, so `do tick` has grade 1, while assignments and `skip` have grade 0; sequential composition adds the grades. The paper also makes a primitive's grade depend on its precondition: `tick ∈ Cc(x = ⌈0⌉,1)` and `tick ∈ Cc(x ≠ ⌈0⌉,2)` (§3.5, p. 11).

Verus form. Inference: represent the grade as a ghost/specification value, keep the executable operation in a normal Rust function, and state the grade in `requires`/`ensures` or in a ghost transition predicate. For a cost counter, a Verus-style sketch is:

```rust
fn tick(x: int, ghost cost: &mut int)
    requires *cost >= 0,
    ensures *cost == old(*cost) + if x == 0 { 1 } else { 2 }
{ *cost = *cost + if x == 0 { 1 } else { 2 }; }
```

Inference: this sketch was not compiled or checked with Verus. It uses a mutable ghost state only as a specification device; the paper's categorical grade is not an executable counter. In a real Verus proof, the function's Rust types and ownership must be made explicit, and arithmetic facts may need `assert` or a lemma. The paper's `Cc`/`Cp` membership is a semantic contract table, so it does not carry over as a Verus keyword; it becomes function contracts and proof lemmas.

Evidence and limits. "The rule for commands uses as the pre-condition as its post-condition, since commands have only side effects and they do not return any value." (§3.4, p. 10) Theorem 1 (§5.2, p. 22) says that for any derivation of a GHL judgment, erasing the interpreted morphism with `q` gives the non-graded denotation `[[P]]`; the interpretation is defined over a GHL structure (Definition 9, p. 20). Inference: there is no measured denominator beyond the theorem's universal quantification over derivable judgments. The semantic model requires, for each command or procedure in `Cc`/`Cp`, a morphism whose erasure is its non-graded denotation (§5.2, p. 20); Inference: a wrong `Cc`/`Cp` axiom is therefore trusted input.

## technique 2: use an indexed loop rule for precise accumulated grades

What it is. The language has a bounded `loop en do P`; the loop count is evaluated once. Instead of one invariant, the rule uses assertions `ψz` indexed by iteration number and requires the count expression to equal a known numeral `N`.

"This rule brings together the assertion language and grading, creating a dependency from the former to the latter, and giving us the structure needed for a categorical model." (§2, p. 6)

How to do it.
1. Establish `⊢m {ψz+1} P {ψz}` for every `0 ≤ z < N`.
2. Prove in the assertion logic that `ψN ⊢ en = ⌈N⌉`.
3. Conclude `⊢mN {ψN} loop en do P {ψ0}`, where `mN` is the N-fold monoid product (`m0 = 1`, `mk+1 = m·mk`) (Table 1, p. 10).
4. For a common invariant `θ`, instantiate `ψz` with `θ ∧ en = ⌈z⌉`; this yields the derived rule printed on p. 10.

When to use it. Inference: use it when a statically known bound lets you replace a loose worst-case loop grade with an exact N-fold composition. It is unsuitable when the loop count is dynamic unless a stronger dependent assertion language is added.

Verus form. Inference: encode the loop counter and grade in ghost variables, maintain a loop `invariant` describing the per-iteration assertion and accumulated grade, and use `old(...)` in postconditions to relate the final value to entry state. A Verus proof can unroll a fixed N or prove an arithmetic lemma that repeated grade addition/multiplication equals the closed form. Verus does not have the paper's `ψz` family or a graded-loop rule, so the index family is represented by an invariant parameterised by the counter.

Evidence and limits. "The right premise is a judgment of the assertion logic ... requiring that e is statically determinable as N." (§2, p. 6) Inference: this is an explicit applicability restriction. The paper says "We expect a more “dependent” version of this rule is possible with a more complex semantics internalizing some form of data-dependency" (§2, p. 6), and that the bounded loop lets it "focus on the grading structures for total functions, leaving the study of the interaction between grading and partiality to future work" (§2, p. 4). Inference: termination is therefore built into the bounded-loop language rather than proved.

## technique 3: preserve sound conditionals with a boolean decidability side condition

What it is. The conditional rule proves both branches under `ψ ∧ eb = tt` and `ψ ∧ eb = ff`, but also requires `ψ ⊢ eb = tt ∨ eb = ff`.

"We resolve this problem by introducing a side condition to guarantee the decidability of the boolean expression." (§2, pp. 5–6)

How to do it.
1. Choose the relational or ordinary assertion semantics.
2. Prove the branch-specific judgments at the same grade `m`.
3. Prove the side condition that the guard is either true or false under the precondition.
4. Apply the conditional rule to obtain the judgment for `if eb then P1 else P2` (Table 1, pp. 10–11).

Paper example. In a relational model over `Set²` the paper notes `Set²(1, 1+1) ≅ 4`, so `Bool` has four global elements and the conditional rule without the side condition may be unsound (§2, p. 5). The side condition guarantees that, for any memory pair satisfying the precondition, the pair of guard values is `(tt,tt)` or `(ff,ff)` (§3.4, p. 11).

Verus form. Inference: state the guard's two-valuedness as a lemma or precondition, then split the proof with `if` and discharge each branch's invariant. Rust's `bool` already has two runtime values, but a relational Verus encoding or an abstract guard may still require an explicit lemma. The paper's categorical equality and fibration machinery has no direct Verus syntax.

## technique 4: instrument control flow and prove a relational security property

What it is. Insert `cfTT` or `cfFF` commands into each branch, and use a word monoid to record the path. The assertion logic then relates two executions.

"Firstly, any conditional statement if eb then Pt else Pf in a program is elaborated to a statement if eb then (cfTT; Pt ) else (cfFF; Pf )." (§3.5, p. 11)

How to do it.
1. Transform each branch as above (§3.5, p. 11).
2. Use `({tt,ff}* , ≤, ε, ·)` with prefix order, assigning grade `tt` to `cfTT` and `ff` to `cfFF` (§3.5, p. 11).
3. Interpret expressions relationally as pairs; assert public equality with `e⟨1⟩ = e⟨2⟩`, leaving private values arbitrary (§3.5, p. 11).
4. Prove a judgment whose single grade `b` (the recorded path) covers both runs, with the relational precondition and postcondition `x⟨1⟩=x⟨2⟩` on the public variable. The paper's first example proves a public `x` is independent of private `y`; its second is non-interferent but fails the program-counter property because the path leaks `y` (§3.5, pp. 11–12).

Verus form. Inference: model two runs as two ghost states and define a ghost sequence of branch labels. Each branch appends a label; a relational postcondition asserts equal public fields and equal ghost traces. Use Verus `seq`, `old`, `requires`, `ensures`, and loop `invariant`; executable logging can be erased or kept separately. The paper's word-prefix order and relational predicates must be encoded as spec functions and lemmas.

Evidence and limits. "This judgment shows the program is non-interferent, since the value of x is independent from the value of the private variable y, and secure in the program counter model, since the control flow does not depend on the value of y." (§3.5, p. 12) Inference: the example proves properties of the instrumented model, not machine-level side-channel resistance; timing, compiler transformations, and the logging implementation remain outside the stated logic.

## technique 5: instantiate grades as probabilistic failure bounds

What it is. Use nonnegative real grades and define a sampling procedure's contract by a probability bound: from every state satisfying `φ`, the probability of violating `ψ` is at most `β`.

"This definition captures that, assuming the pre-condition holds for an input memory state s, then for output value s′ from sampling sampleµ,e, the probability that the post-condition is false is bounded above by β." (§3.5, p. 12)

How to do it.
1. Choose `(R≥0, ≤, 0, +)`.
2. Define `Cp(φ,β,ψ)` semantically using the distribution of `sampleµ,e` (§3.5, p. 12).
3. Give each primitive sampling fact its base β.
4. Compose sequential samples by addition; the overview's two Gaussian samples each contribute `0.025`, yielding a `0.05` failure grade (§2, pp. 3–4).
5. Use assignment and consequence at grade 0 for pure computation.

Verus form. Inference: Verus can represent a probability bound only after introducing a trusted or separately verified probabilistic model; ordinary deterministic Verus specs do not supply a probability distribution. Encode a ghost event or measure abstraction and prove an arithmetic union-bound lemma, while marking the sampler and measure axioms as trusted external specifications. Do not claim that a deterministic `ensures` proves the probability statement itself.

Evidence and limits. The paper's soundness theorem covers any GHL structure (Theorem 1, §5.2, p. 22). Example 7 (§5.3, p. 22) gives the discrete Union Bound model via the subdistribution monad, and Example 12 (Appendix D.1, p. 38) gives a continuous one via the sub-Giry monad. Inference: no experiment reports a sampled-run count or confidence interval; β is a formal bound inherited from primitive distribution facts. The model assumes those distribution facts and measurable semantics.

## semantic construction and trust boundary

Inference: to build a model rather than only syntax, the paper (i) interprets values and pure expressions in a cartesian category `V`, (ii) interprets effects in a Freyd category `C`, (iii) models assertions with a posetal fibration `p : P → V`, and (iv) combines them in a graded Freyd category. The erasure map `q` forgets assertions and grades and returns the effectful denotation; the paper says it is not quite a functor because `E` is a graded category (§2, pp. 4–5 and footnote 5, p. 5).

"The benefit of using a Freyd category as a building block is that they are more flexible than other structures (e.g., monads) for constructing models of computational effects" (§2, p. 5).

Inference: the categorical layer is useful to VL as a design checklist for separating pure Rust state, effectful operations, assertions, and grade metadata. It is not a Verus implementation and it does not verify Rust, Z3 encodings, compiler behavior, or external libraries. The paper's proof is conditional on the chosen category, fibration, primitive contracts, and soundness assumptions of those mathematical structures.

## what is proved, measured, and trusted

- proved
  - soundness of the interpretation of GHL derivations in a GHL structure (Theorem 1, §5.2, p. 22)
  - constructions from graded monads/comonads and Freyd categories (Propositions 1–2, §4, pp. 14–16; proofs in Appendices B–C, pp. 34–35)
  - worked instances: cost (Examples 2, 13), program counter security (Examples 3, 8), Union Bound Logic (Examples 4, 7, 12), product-comonad security levels (Example 9), continuous apRHL for differential privacy (Example 14, pp. 40–41), span-apRHL (Example 15, pp. 41–42), dataflow-aware reading (Appendix A, pp. 31–33)
  - Inference: the later instances are verified briefly; for Example 15 the paper says "It is straightforward to check the conditions of the GHL structure." (p. 42)
- measured
  - no empirical measurements, benchmark denominator, model, or success percentage are reported
- trusted or assumed
  - primitive `Cc`/`Cp` contracts and distribution/security axioms
  - correctness of the selected categorical and fibration models
  - the assertion logic's entailment judgments
  - Inference: in a Verus deployment, the verifier, solver, Rust compiler, unsafe code, hardware, and environment would add the usual trust boundary documented for Verus

## contradictions, omissions, and reuse implications

Inference: the paper calls the framework parameterisable and gives many semantic instances, but it restricts the core language to bounded loops, leaves partiality to future work (§2, p. 4), and notes that the loop rule is hard to use when the count is dynamic (§2, p. 6). This is a scope limitation, not a contradiction. The overview rule and Table 1 give the loop the same grade, the N-fold product `m^N` (the extracted text prints it as `mN`).

Inference: VL should not redo the abstract construction of graded Hoare logic, graded categories, or the published examples. A useful product contribution would instead connect grade contracts to real Verus Rust APIs, check that dependency upgrades preserve the grade assumptions, and measure proof maintenance on actual code. The threat to a product of agent-written verified Rust is medium: the paper supplies a disciplined vocabulary for effect contracts and quantitative obligations, but it does not prevent an agent from choosing an irrelevant postcondition, misstating a primitive grade, or omitting an environmental side channel.

## techniques for the catalog

- graded primitive contracts — index every effectful command/procedure by a precondition, postcondition, and grade from a preordered monoid, then compose grades sequentially
- indexed bounded-loop rule — prove one assertion per iteration and a statically known count to obtain an N-fold grade
- boolean side condition — require a guard to be provably true or false under the precondition before applying the conditional rule
- control-flow trace grading — instrument branches with labels and compare relational traces using a word monoid
- probabilistic failure grading — assign distribution-specific failure bounds and add them with the union-bound composition rule
- categorical refinement model — separate values, effects, predicates, grades, and grade-erasing denotations with Freyd categories and fibrations
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Hence, the derivation of proof tree of this logic forces the target program to have the same control flow under the precondition."): I read the whole paper text (main text pp. 1–25, references, Appendices A–D pp. 31–42) and checked every quotation, rule, grade and monoid, example, theorem and page reference in this study against it; I corrected the page of Theorem 1 (p. 22, not p. 25), the Abstract versus §1 citation, the location of the Union Bound examples (Example 7 is in §5.3, p. 22; Example 12 is in Appendix D.1, p. 38), the pages for the Set² and partiality remarks, the proposition pages, the description of the procedure rule, the loop-rule quote (now complete) and the loop/partiality limits, and I marked the Verus sketch as unchecked; I did not check the Verus code or any claim about Verus (all marked Inference), the cited external works, or the PDF figures and diagrams beyond the extracted text.
