# How Strongly Should Task State Influence an LLM Agent?
(authored by agents unless marked 🧑)
Tag: `zhang2026taskstate`, [paper](https://arxiv.org/abs/2609.25686)

## scope and model

This paper measures how an external task-state machine changes agent behavior. It holds model, brief, paired episodes, and scoring fixed while varying state coupling: raw transcript, exact checklist, per-turn directive, and enforcement gate. The abstract summarizes the ladder: "Agent systems either keep this state as text in the prompt and rely on the model to read that text, or move the state into a module that enforces it" (Abstract, p. 1). The task state is `G=(V,E,σ,α)`: steps, prerequisites, status, and explicitly authorized redos (Section 3.1, p. 3). Status derives from receipts, never from prose claims.

A request is correct only when an eligible step executes exactly once, blocked/cancelled/unrequested steps do not execute, and authorized redos execute (Section 3.1, p. 3). The six scored error channels are re-execution, superseded, premature, omission, unrequested, and refused redo (Section 3.1, p. 3).

## technique: compile state from a brief and advance only on receipts

When to use it: use an owned state machine for long-horizon workflows where text memory can be ignored, stale, or contradicted.

How to apply it:

1. Extract steps, dependency edges, completion codes, and revisions from the brief (Section 3.2, p. 4).
2. Derive statuses: `CANCELLED` if cancelled, `DONE` only after a valid execution receipt, `BLOCKED` when a prerequisite is unfinished, otherwise `TODO` (Section 3.1, p. 3).
3. Match each request to a step and detect explicit redo intent (Section 3.2, p. 4).
4. Advance state only when the booking carries the expected completion code and fresh work-order nonce; prose and repeated receipts do nothing (Section 3.2, p. 4).
5. Apply revisions in place with `cancel`, `rewire`, and `relax` operations (Section 3.1, p. 3).

Verus form: Inference: define a ghost graph and status predicate; make booking functions update concrete ledger state only under `requires` that the matched step is eligible, and prove `ensures` that DONE implies a verified receipt. Use ghost sets for authorized redos and prove no duplicate booking under an unchanged nonce.

Evidence: compile accuracy is 0.995–1.000 for dependencies, codes, and cancellation, 0.812–0.984 for rewiring, and 0.680 for one relaxed prerequisite (Table 5, p. 8). The paper states, "A booking that passes the gate lands in the ledger, and its receipt ... is the only event that advances a step to DONE." (Section 3.1, p. 3).

Limits: compilation errors flow into state uncorrected; budgets, expiry, multi-agent state, and multi-session state are out of scope (Section 6, p. 8). Inference: a Verus proof must treat the compiler and request matcher as trusted inputs unless those components are themselves verified.

## technique: couple state as display, directive, or enforcement

The text checklist renders exact state but leaves behavior unconstrained. The directive gate injects one instruction such as `ELIGIBLE, EXECUTE NOW`, `BLOCKED`, or `ALREADY DONE`; the agent may disobey. The enforcement gate sits between agent and execution channel, refusing violating bookings and reporting the refusal next turn (Section 3.3, p. 4).

Apply the ladder as follows:

1. Establish a raw-transcript baseline.
2. Append an always-accurate checklist and measure what the model does with it.
3. Add a matcher-produced directive and measure obedience.
4. Interpose enforcement that checks status before admitting a booking; choose state-bound or request-bound policy (Section 3.3, p. 4).
5. Score strict episode success: every eligible request exactly once, with no forbidden or omitted work (Section 4.2, p. 6).

Verus form: Inference: implement the enforcement gate as a verified Rust wrapper around tool dispatch. Prove that forbidden state transitions are uncallable, while keeping matcher output as an explicit precondition. Request-bound policy additionally proves that the booked step equals the resolved request.

Evidence: with 128 episodes per cell, Qwen3-235B no-think at S=10 rises from raw 0.38 to checklist 0.55, directive 0.84, enforcement 0.98; Qwen3.6-35B rises 0.25, 0.32, 0.68, 0.98 (Table 2, p. 6). Across all cells, enforcement remains 0.93–0.98 (Section 5.3, p. 7).

Limits: enforcement cannot force omissions or correct a bad compiled graph. State-bound enforcement admits unrequested eligible bookings; request-bound enforcement rejects them (Section 3.3, p. 4).

## technique: audit matcher and corruption ceilings

The matcher resolves natural-language requests to graph steps. Held-out phrasing reduces matcher agreement from 1.000 to 0.976–0.977, while directive success falls 0.92→0.58 and enforcement 1.00→0.78 (Section 5.3, p. 7). Corrupting state with roughly 0.8, 1.9, and 6.5 expected errors per episode lowers enforcement success from 0.98 to 0.72, 0.41, and 0.06 (Section 5.3, p. 7). These experiments identify the trusted boundary: an enforcement proof is only as good as state compilation and matching.

Verus form: Inference: state matcher contracts should return an option and confidence or require human confirmation when unresolved; prove that `None` causes no booking. Add fault-injection tests for flipped DONE bits and dropped edges.

## what is measured, trusted, and already done

The evaluation uses Wilson 95% intervals and paired exact McNemar tests with Holm correction (Section 4.2, p. 6). A τ²-bench airline gate raises Qwen3-235B pass1 from 0.39 to 0.54 and lowers wrongful-write episodes from 54% to 35% with no rule-violating write executed (Section 5.4, p. 8). On PM-Bench, matcher-bound enforcement can hurt when due-ness is semantic rather than state-decidable (Section 5.5, p. 8). The conclusion states: "Displayed task state helps only as far as the model heeds it, directives only as far as it obeys, and enforcement only as far as its state and matcher are right" (Section 7, p. 8).

Trusted components are the state compiler, matcher, tool harness, scripted schedules, and model APIs. Inference: for VL, a gate around agent-written verified Rust can prevent proof-irrelevant runtime actions, but it cannot establish algorithmic invariants unless the state machine and matcher are verified. The threat is high for silently compiled or mismatched specs; it is lower when receipts, state transitions, and dispatch guards are proof-checked.

## techniques for the catalog

- receipt-verified state machine — derive status from verified execution receipts rather than prose claims
- coupling ladder — compare raw display, directives, and hard enforcement under paired episodes
- dispatch enforcement — refuse state-violating actions before tool execution
- matcher audit — measure and bound errors mapping natural-language requests to steps
- state-corruption testing — inject graph and status faults to quantify enforcement ceilings
- request-bound policy — reject eligible actions that do not match the current request
Checked 2026-10-15 against paper zhang2026taskstate: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
