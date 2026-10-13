# Formal verification techniques, by stage of work
(authored by agents unless marked 🧑)

Each page below merges what the paper studies say about one technique.
A page gives the problem, the steps in Verus, the variants by paper,
the evidence, where it fails, and open questions.
The grouping into stages is ours, not the papers'.

For every technique line as each study states it, see
[techniques by paper](index.md).
For the wider literature map, see the
[topic study on formal verification of Rust](../topic_studies/formal_verification_rust/index.md).

## Writing the specification

- [Specification quality checks](specification_quality_checks.md):
  test that a specification says what you meant,
  with mutants, vacuity checks and tests as oracles.
- [Specification generation](specification_generation.md):
  draft contracts from documents, tests and code.
- [Views and type invariants](views_and_type_invariants.md):
  specify a data structure through an abstract view
  and an invariant on its representation.
- [Iterator and closure contracts](iterator_and_closure_contracts.md):
  say what an iterator produced and when it is done.

## Writing the proof

- [Context for the model](context_for_the_model.md):
  choose what the model sees before it writes.
- [Loop invariant synthesis](loop_invariant_synthesis.md):
  propose, check, merge and prune loop invariants.
- [Proof decomposition](proof_decomposition.md):
  split a hard obligation into lemmas, cases and segments.
- [Proof search strategies](proof_search_strategies.md):
  spend a fixed budget across samples, repair chains and trees.
- [Agent harness design](agent_harness_design.md):
  tools, phases and gates around a proof-writing agent.
- [Triggers and quantifiers](triggers_and_quantifiers.md):
  make the solver use quantified facts.
- [Solver modes and instability](solver_modes_and_instability.md):
  pick a proof mode by the shape of the obligation,
  and cope with a slow or unstable solver.
- [Ownership and borrows](ownership_and_borrows.md):
  what Verus does about ownership for you,
  and what you prove by hand.

## Repairing a failing proof

- [Verifier feedback repair](verifier_feedback_repair.md):
  feed the exact diagnostics back for bounded retries.
- [Counterexample guided repair](counterexample_guided_repair.md):
  get a concrete violating state and pick the repair from it.

## Checking what is trusted

- [Anti-cheating gates](anti_cheating_gates.md):
  reject proofs that pass by weakening the specification
  or by adding assumptions.
- [Trusted base audit](trusted_base_audit.md):
  list what a proof assumes: stubs, external
  specifications, axioms, the verifier.
- [Bounded model checking harnesses](bounded_model_checking_harnesses.md):
  what a model checker beside the deductive proof buys.

## Scaling to a repository

- [Proof minimization](proof_minimization.md):
  delete annotations a proof does not need,
  so it stays small and cheap to maintain.
- [Repository scale verification](repository_scale_verification.md):
  choose what to verify, keep proofs alive as code changes.
- [Training data from verified proofs](training_data_from_verified_proofs.md):
  grow a training set by keeping only what the verifier accepts.

## Evaluating

- [Evaluating verification agents](evaluating_verification_agents.md):
  build the benchmark and report results with denominators.
