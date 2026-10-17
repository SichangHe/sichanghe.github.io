# Executable JavaScript as a Checkable Specification Language: A JS-SAM Case Study on SysMoBench
(authored by agents unless marked 🧑)
Tag: `dubray2026executable`, [paper](https://arxiv.org/abs/2607.13092v1)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## identity, question, and boundaries

Dubray (2026) asks whether an LLM can produce a faithful specification of a real concurrent system more reliably in executable JavaScript using the State-Action-Model (SAM) pattern than in TLA+. The central claim is about checkability and trace conformance, not formal proof. The paper says: “What this paper demonstrates is that executable JavaScript specifications can be checked: bounded safety exploration over reachable states, and conformance replay against finite execution traces.” It explicitly does not establish liveness, fairness, temporal logic, unbounded-state verification, or mechanical proof. The experiments use an Asterinas spinlock (28 trace windows), a distributed lock service (60 windows), and an Etcd Raft implementation (97 windows). The controlled factorial has five generations per cell; the other experiments are mostly one generation per model, so effect sizes matter more than broad statistical generalization.

## technique 1: make conformance a transition-window oracle

what it is and when to use it. Treat the running implementation as the source of ground truth. A trace window is a tuple `(pre, action, post)`. It tests whether the generated specification, started at the observed pre-state and given the observed action and arguments, produces the observed post-state. Use this whenever a model can produce a syntactically valid or internally consistent model that may still describe a textbook protocol rather than the implementation.

how to do it. First pin the exact implementation revision. Instrument the real system to emit one event per operation. Run a workload that exercises the behavior of interest. Parse events into windows keyed only on observable state. For the spinlock, the paper uses a two-thread single-CPU test and avoids deadlock by expressing the second actor's contention with non-blocking `try_lock`: “actor0.lock()       -> TryAcquireBlocking(0), AcquireSuccess(0) // 0 holds” followed by “actor1.try_lock()   -> AcquireFail(1)          // contention, no deadlock”. It folds low-level events (`TryAcquireBlocking`, `AcquireSuccess`, `AcquireFail`, `Release`) into `{lockHeld, lockHolder}` transitions. The longer scenario yields 28 windows: 17 acquires and 11 releases. During replay, set the model to `pre`, apply the named action, and compare `getState()` to `post`; project only keys present in the trace post-state so model-private bookkeeping is ignored.

verus form (inference). In Verus, the implementation itself can expose a ghost or executable state projection, and a harness can call a transition function from a supplied pre-state. The analogous proof obligation is a lemma or `ensures` clause that the action's post-state matches the recorded projection for each trace case. The replay corpus and parser remain external test infrastructure; Verus does not make the trace oracle a proof of all executions. A `spec fn observable(s)` can define the projection, while `requires` fixes the precondition and `ensures observable(new) == post` states the checked result.

evidence, assumptions, failure. All four models pass syntax, bounded exploration, and the shipped safety invariants, yet Phase 3 ranges from 21.4% to 89.3% (6/28 to 25/28). The identity base rate is 6/28 because contention failures leave state unchanged; conditional on 22 state-changing windows, results are 0–86.4%. Thus syntax and internal consistency are weak evidence. A release defect that passed every invariant was caught only by replay: “Only replay against the real kernel’s transitions caught it.” The corpus is deterministic and finite; it cannot establish behavior outside captured windows, and a projection can hide implementation state.

## technique 2: use an executable, self-contained specification contract

what it is and when to use it. JS-SAM packages the generated artifact as one deterministic CommonJS module. The contract is deliberately explicit:

```js
module.exports = {
  instance, init, actions, getState, setState, checkerIntents
};
```

`actions` contains exactly the target actions; `getState` returns plain JSON; `setState` exists for Phase-3 replay; `checkerIntents` declares finite action/input domains for bounded exploration and invariants. Use this shape when the model should fill observable transition semantics while the harness supplies evaluation machinery.

how to do it. Prompt the model to emit only the module. Run validation, bounded exploration, replay, and invariant checks through four helper subcommands. Execute generated JavaScript in a throwaway `node:20-slim` container with no network, a read-only root, non-root user, and CPU/memory/PID limits. For each replay window execute `setState(pre); actions[name](data);` and diff `getState()` against `post`. The paper later removes SAM-specific machinery and tests a bare `{init,next}` contract; 40/40 bare-next specifications pass every phase on spin and a lock service. The paper attributes the SAM Phase-3 gap to the contract shape, not the language, from its controlled arms (a plain-JS bare-next arm ties TLA+ at 100% for every model); it calls the 40/40 a hypothesis-generating result, not a settled conclusion.

verus form (inference). A Verus module would keep a Rust state type and verified transition functions, with `init` as an initial-state function, `next` or action methods as transition relations, and a pure observable projection. `setState` is a test harness operation and should not be trusted as an implementation method; in proofs, instantiate a state value satisfying the required invariant instead. `checkerIntents` becomes a finite enumeration used by an external harness, while Verus `forall` lemmas can reason over all values when finite enumeration is insufficient.

evidence and limits. JS-SAM reaches end-to-end evaluability for 4/4 models versus 1/4 for TLA+ in the default comparison. Two TLA+ failures were unbounded `CHOOSE`; one was a configuration-generation fault. The advantage is operational, not proof-theoretic. The paper warns that its safety checker cannot detect a never-releasing lock: “For verification: no. Liveness, fairness, temporal-logic properties, large-state and unbounded checking, and mechanical proof ... have no equivalent in either bounded safety explorer.”

## technique 3: repair from precise counterexamples and audit generalization

what it is and when to use it. Give the model every failing window, including pre-state, action/data, expected post-state, and model output, then request a rewritten module. Use this inside an agentic verification loop after an oracle has localized failures.

how to do it. Score the baseline; build a repair prompt containing the full module and all failing windows; regenerate; rerun syntax and replay. Then prevent memorization: hold out observable-domain combinations absent from the prompt, rerun bounded exploration and invariants, and inspect the repaired source for window tables or literal branches. The paper's repair changed a release guard from auxiliary `threadStatus` to authoritative `lockHeld/lockHolder`. Opus and Fable rose to 28/28 in one round; Haiku stayed at 6/28. A replication made Sonnet's outcome unstable at N=1. All repaired specifications passed the held-out combinations and reached seven semantic states, while unrepaired Haiku reached one.

verus form (inference). Translate each counterexample into a failing `assert` or a test lemma, then repair the Rust transition or its invariant. Re-run `cargo verus` and a separate executable trace harness. A proof that only covers supplied examples is insufficient; use quantified lemmas or finite-domain coverage to rule out memorization. Verus can prove the root-cause guard is sufficient for all states satisfying the invariant, which is stronger than replay.

evidence and limits. The repair prompt measures “can the model exploit precise, correct feedback,” not unaided generation. All held-out lock cases were observable no-ops, so source inspection and bounded-state evidence are needed. At Raft scale, 0/20 one-shot bare-next specifications pass every phase and one repair round recovers 6/20; protocol semantic derivation remains the bottleneck.

## what is proved, trusted, and relevant to VL

The paper proves only what its finite checkers and replay oracle establish: deterministic bounded exploration, invariant predicates over reachable states, and agreement with captured traces. Trusted components include the instrumentation, trace parser, projection rule, benchmark harness, container boundary, expert invariants, prompts, and the correctness of the hand-written reference model. The paper reports a real methodological contradiction: headline replay rates are inflated by six identity windows, so unconditional and conditional rates must both be reported. It also shows that Phase-2 “326,592 states explored” is actually step count `(d+1)·6^d`, not semantic-state coverage.

For VL (VeruLaw), the reusable ideas are trace windows as a concrete debugging oracle, minimal observable transition contracts, and repair prompts generated from failed postconditions. The threat to agent-written verified Rust is substantial for specification fidelity: a Verus proof can certify the wrong contract unless traces or a reference specification constrain it. The threat is lower for memory safety and functional proof once the contract is correct. This threat assessment is an inference from the paper's distinction between internal consistency and implementation conformance.

## techniques for the catalog

- trace-window conformance: instrument the real system and replay `(pre, action, post)` windows against a generated transition model
- observable-state projection: compare only implementation-visible keys while allowing private model bookkeeping
- executable transition contract: require a deterministic self-contained module with init, actions, state projection, reset, and finite intents
- sandboxed specification execution: run untrusted generated code in a resource-limited no-network container
- counterexample repair: regenerate from complete transition failures, then test held-out domains and inspect for memorization
- semantic-state accounting: distinguish checker step counts from unique reachable states
Audited 2026-10-12 against the paper: checked window counts (28, 60, 97; 17 acquires, 11 releases), Phase-3 rates and the 6/28 identity base rate, 0-86.4 percent conditional range, 326,592 = 7*6^6 step count, four helper subcommands, sandbox settings, 4/4 vs 1/4 evaluability and causes, Table 2 repair numbers, held-out audit, 40/40, Raft 0/20 and 6/20, quotations, and the marked Verus forms (sound as sketches). Changed two things: the 40/40 sentence no longer credits that count with showing contract shape was decisive (the paper bases that on its controlled arms and calls 40/40 hypothesis-generating), and held-out cases were all, not mostly, observable no-ops. Not checked: pdf tables beyond the text extraction, the per-model TLA+ details beyond Table 4.
