# Imandra CodeLogician: Neuro-Symbolic Reasoning for Precise Analysis of Software Logic
(authored by agents unless marked 🧑)
Tag: `lin2026codelogician`, [paper](http://arxiv.org/abs/2601.11840v2)

Inference: CodeLogician combines an LLM that translates source into an explicit formal model with ImandraX, which proves properties and decomposes state spaces. The paper states, “CodeLogician uses LLMs to help construct explicit formal models (“mental models”) of software systems” (Abstract, p. 1). The useful lesson for VL is to make model construction and proof checking separate artifacts.

## technique: verification goals with counterexamples

Inference: Use a boolean-valued predicate over the model to state a property, ask the prover to establish it for all inputs, and treat a counterexample as a model-refinement input. The paper defines VGs as “boolean-valued IML functions that encode properties of the system being analyzed” (Sec. 3.2, p. 8). Its example is an order-ranking transitivity lemma:

```text
lemma rank_transitivity side order1 order2 order3 mkt =
  order_higher_ranked(side,order1,order2,mkt) &&
  order_higher_ranked(side,order2,order3,mkt)
  ==> order_higher_ranked(side,order1,order3,mkt)
```

Inference: The steps are (1) encode the intended predicate, (2) run bounded and inductive verification, (3) inspect a synthesized violating execution when it fails, and (4) add missing preconditions or repair the model, then rerun. The paper says, “In practice, verification is iterative: counterexamples often reveal missing preconditions, modeling gaps, or specification errors” (Sec. 3.2, p. 8). In Verus, the analogous form is a `spec fn` predicate plus a `requires`/`ensures` contract and a proof function; a runtime function cannot call a proof function, and a `spec fn` cannot carry `ensures`.

Inference: Evidence is the paper’s trading-venue counterexample and its claim that goals quantify over typically infinite input spaces, but no denominator is supplied for industrial defects. The trusted components are ImandraX’s mechanized semantics and solver; the LLM translation, abstraction choice, and assumptions remain outside that guarantee.

## technique: region decomposition and witness tests

Inference: Partition a function’s input space into finitely many symbolic regions, each with path constraints, an invariant output, and a satisfying sample. The paper says, “Each region comprises: constraints over inputs that characterize when execution enters the region, an invariant result describing the output … and sample points witnessing satisfiable instances of the constraints” (Sec. 3.3, p. 9). Use side conditions to restrict the explored domain and basis functions to make selected functions atomic; the paper says a side condition “is a boolean predicate with the same signature as the decomposed function” and that a basis “specifies functions to be treated as atomic during decomposition” (Sec. 3.4, p. 10).

Inference: Steps are (1) select the function, (2) add an optional side predicate, (3) choose basis functions, (4) run decomposition, (5) check that regions cover the state space, and (6) extract each witness as a test. The paper’s discount example has four regions for customer type Premium/Standard crossed with amount above/below 100, and generated Python tests such as `discount(order(0, Standard())) == 0` (Sec. 5.7, pp. 15–16). In Verus, represent the partition as predicates over inputs and prove disjointness/coverage with `ensures`; use executable test inputs separately because Verus specifications are erased.

Inference: The evidence is exhaustive symbolic coverage by construction, but the paper reports no independent coverage denominator for the discount example. Region count can still explode, so basis abstraction and side conditions are assumptions that affect what is covered.

## technique: pure-functional autoformalization with explicit unknowns

Inference: Translate imperative code into pure IML: thread mutable state through arguments, rewrite loops as recursive functions, and model systems as state machines. The paper says, “All formal models produced by CodeLogician are expressed in the Imandra Modeling Language (IML), a pure functional subset of OCaml” (Sec. 4.1, p. 11). For unknown libraries, use opaque functions, explicit axioms, or sound approximation functions; the paper says, “Opaque functions allow models to type-check and support reasoning without making any assumptions about the function’s internal behavior” (Sec. 4.4.1, p. 13).

Inference: Steps are (1) extract types and control flow, (2) refactor effects into state transitions, (3) mark external behavior opaque, (4) add only documented axioms, (5) replace opaque operations with bounded approximations when executable tests are needed, and (6) admit, then refine toward executability. Verus can keep mutable Rust and specify state transitions directly; use `assume` only as an explicit trusted boundary, `external_body` only for genuinely external code, and `assert`/lemmas to connect abstractions. This is an inference because the paper does not use Verus.

## technique: dependency-aware incremental formalization

Inference: Maintain a project metamodel of modules, imports, formalization status, and dependency context. Formalize bottom-up in topological dependency order, then recompute only changed modules and downstream dependents. The paper lists the PyIML steps as: “1. Analyzes Python modules and infers their dependency structure from imports; 2. Translates source constructs …; 3. Manages formalization across the codebase in dependency-consistent order; 4. Maintains a project metamodel” (Sec. 6.2, p. 19). Re-formalization is triggered by source changes or direct/indirect dependency-status changes (Sec. 6.6, p. 20).

Inference: A Verus implementation can mirror this with one crate/module per component, checked proof dependencies, and a build cache keyed by source and specification hashes. This is an inference. The paper’s 50-model benchmark reports LLM-only mean scores of 0.186 for state-space estimation and 0.490 for coverage completeness, while formal augmentation is described as complete coverage (Sec. 7.4, pp. 27–30); the denominator is 50 models × three questions per model, but the paper does not give per-question raw counts. The LLM-as-judge evaluation is therefore weaker evidence than kernel-checked proofs.

## technique: interaction counterexamples and numeric invariant repair

Inference: Express feature-interaction hazards as predicates over a bounded message prefix and initial state, then ask the verifier for a witness. In the LSE expiry example, the paper defines `conflict_reachable` over `List.take k msgs` and refutes the claim that uncross and expiry cannot coincide; the witness uses two ticks at time 2699 with both expiry and uncross at 2700 (Sec. 8.1.1, pp. 33–34). The formal repair target is the interaction between auction protection extending expiry and a market-order extension delaying uncross.

Inference: For financial arithmetic, state invariants over all input combinations, decompose fee regions at minimum floors and rebates, and replace binary floating point when exact conservation is required. The paper reports a negative-trade counterexample that violates netting efficiency and a floating-point counterexample to zero-sum conservation, then fixes the implementation by migrating from Python `float` to `Decimal` and re-verifies three goals (Sec. 8.3, pp. 35–36). In Verus, use integer/fixed-point or a trusted decimal model and prove conservation with `ensures`; this is an inference.

## what is proved, measured, and trusted

Inference: ImandraX proves stated VGs and computes symbolic regions under the admitted model; it does not prove that an LLM’s model matches source semantics. Axioms, opaque functions, approximations, and abstraction boundaries remain trusted assumptions. The paper explicitly says, “The resulting model is functionally equivalent to the source program at the chosen level of abstraction” (Sec. 5.1, p. 14), which is a design objective rather than an independently established theorem.

Inference: For VL, the strongest reusable ideas are counterexample-driven specification repair, region witnesses as systematic tests, and dependency-aware incremental proof state. The product threat is medium: an agent can produce a plausible but semantically wrong model, and a proof of that model will not detect the mismatch. Verus contracts and executable Rust tests should therefore be paired with an explicit model-to-code correspondence review.

## techniques for the catalog

- Inference: verification goals and counterexamples — state universal properties, prove or refute them, and refine assumptions from concrete witnesses
- Inference: region decomposition — partition behavior into constrained invariant regions and turn witnesses into coverage tests
- Inference: pure-functional autoformalization — expose state, recursion, abstraction levels, and unknown behavior in a checkable model
- Inference: interaction counterexamples and numeric invariants — verify feature interactions and exact conservation, then repair assumptions exposed by witnesses
- Inference: dependency-aware incremental formalization — formalize in import order and recompute only affected modules
Checked 2026-10-15 against paper lin2026codelogician: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
