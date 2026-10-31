# interwhen: A Generalizable Framework for Steering Reasoning Models with Test-time Verification
(authored by agents unless marked 🧑)
Tag: `bhat2026interwhen`, [paper](https://arxiv.org/abs/2602.11202v3)

## system and assumptions

interwhen addresses process verification for reasoning models. A model emits a token trace, but the final answer alone can hide an earlier invalid move. The framework extracts verifiable state from partial traces, runs programmable verifiers during generation, and intervenes when a check fails. The paper describes the architecture as “a single-trajectory verification” method (Abstract, PDF p.1) and states that “The core operations are: extract state, verify, and intervene.” (§4.3, PDF p.8).

The framework has an offline phase and an online phase. Offline, a frontier LLM converts a free-text policy and domain description into verifiers and a map from state patterns to applicable verifiers. Online, a model generates one trajectory while forked extraction and asynchronous verification run beside it. If a verifier rejects a state, generation rolls back to the checked prefix, receives feedback, and resumes. Algorithm 1 returns a policy-compliant trace or `ABSTAIN`; §4.1 sets the correction limit to 5 and outputs “No solution” if it is exceeded (Algorithm 1, PDF p.8; §4.1, PDF p.6). The claimed compliance guarantee depends on extraction: “if it does output an answer, it is guaranteed to satisfy all verifiers (modulo any LLM-based variable extraction errors)” (§1, PDF p.3).

## technique 1: extract verifiable state from a partial trace

Inference: Use state extraction when raw reasoning tokens are too unconstrained for a verifier. At each step boundary, fork an extractor model and ask it to produce only the variables needed by relevant checks. The paper's Algorithm 1 performs `σk ← s(τ≤k)` at every boundary, then chooses `Vk ← µ(σk)` (§4.1–4.3, PDF pp.5–8). For agentic tasks, tool calls and responses are states; for non-agentic tasks, states are extracted every 40 occurrences of a blank-line marker (§5, PDF p.9).

The state must preserve unknown values. A verifier returns true, false, or unknown; missing input variables therefore do not force a false violation; the verifier “returns Unknown.” (§4.1, PDF pp.5–6). The paper's retail example extracts order id and refund target from a `cancel order` tool call and payment source from the preceding trace. It then checks that the refund target equals the payment source before allowing the tool call (§4.2, PDF p.7).

Inference: In Verus, state extraction can produce a ghost/specification record containing the function name, arguments, current contract, and verifier-reported facts. Keep extraction outside trusted proof code; treat every extracted field as an assumption until a Rust or Verus check validates it. A `spec fn` can describe a predicate over the extracted state, while executable code serializes the state for the orchestration process.

## technique 2: asynchronous single-trajectory steering

Inference: Use asynchronous checks to avoid paying verification latency on traces that are already valid. Algorithm 1 starts generation, extracts each state in a fork, selects applicable verifiers, and launches `async Vk(σk, Π)` without blocking the main model (Algorithm 1, PDF p.8). When a pending check completes, an invalid result halts the model, rolls the trace back to `τ≤k`, appends feedback, and resumes from that prefix. A retry counter returns `ABSTAIN` after more than `R` retries (Algorithm 1, PDF p.8).

The paper states, “Thus, for a trace without any violations, there is no increase in latency due to verification.” (§4.1, PDF p.6). Writes are the exception: asynchronous checks cannot allow a side-effecting tool call before its check completes (§4.1, PDF p.6).

## technique 3: synthesize policy verifiers and prove them against a specification

Inference: Use this technique when hand-written domain verifiers are scarce or hard to audit. Give a frontier LLM the policy, domain/workflow description, and available tools. It emits one verifier implementation per policy rule plus a mapping from state patterns to verifiers (§4.2, PDF p.7). The paper uses Python checks, the Z3 SMT solver, and the Lean4 compiler or Lean verifiers in different tasks (Table 1, PDF p.10).

For stronger assurance, generate three Lean artifacts in sequence: a propositional specification of each rule, a Boolean verifier function, and a theorem proving the function equivalent to the specification. Figure 3 shows this for the rule that a refund must go to the original payment method or a gift card (§4.2, PDF p.7). The paper states, “The verifier function is accepted only when the equivalence proof is successful.” (Figure 3 caption, PDF p.7). The paper proposes feedback to the LLM when the proof fails and describes iteratively prompting for (spec, verifier code, proof) triplets while they are inconsistent, such as when code fails to compile (§4.2, PDF p.7; §6.2, PDF p.14). Human review is still required to ensure that the generated specification matches the text policy and has no conflicting rules (§4.2, PDF p.7).

Inference: For Verus, write each policy as a `spec fn` predicate and implement a Boolean checker whose `ensures` clause states equivalence to that predicate. Prove equivalence in a `proof fn`; call the proof only during verification. Keep the policy specification human-reviewed because Verus can prove a wrong predicate exactly. The paper's Lean code shape does not transfer verbatim.

## technique 4: compose policy, trace, and prompt verifiers

Inference: Policy text may omit constraints that appear in actual failures. interwhen therefore supports three layers: policy verifiers, trace-derived verifiers mined from recurring failure patterns, and prompt-derived verifiers that encode instance-specific requirements (§5, PDF p.11). Add layers incrementally and measure each contribution.

In τ²-bench telecom (114 tasks), Qwen3-30B in solo mode scores 32.17% `Pass^4` with CoT, 42.11% with policy checks, 71.10% with policy plus trace checks, and 87.70% with policy, trace, and completeness checks; token use is 100.00%, 116.71%, 97.37%, and 96.93% of the same-mode CoT baseline (Table 3 caption and rows, PDF p.13). `Pass^4` is strict: a task scores one only when environment and action pass on four independent runs (Table 3 caption, PDF p.13). The authors found a policy ambiguity: “refueling exactly 2GB” was required according to the authors’ trace analysis although the policy said “at most 2GB” (§5.1, PDF p.11).

Inference: For verified Rust, policy verifiers correspond to API contracts, trace verifiers to invariants learned from failing executions, and prompt verifiers to per-request postconditions. Preserve their provenance so a generated check cannot silently become a product requirement. A trace-derived check is evidence for a missing requirement, not proof that the inferred behavior is intended.

## technique 5: use verifier feedback as an intervention signal

Inference: When a check fails, return a concise textual explanation at the rollback point. The Maze example feeds invalid-move or turn-count feedback back into the model by prepending reflective text (§4.1, PDF p.6). The verifier therefore both rejects a state and supplies a repair direction. A post-hoc probe replayed the same trace with and without feedback: on Maze, the mean probability of the correct answer rose from 0.4892 to 0.8148 across 460 events; on SpatialMap it rose from 0.1256 to 0.2042 across 448 events (Table 6, PDF p.14).

## techniques for the catalog

- state extraction: fork a model to turn partial traces into verifier input variables
- asynchronous steering: run checks beside one trajectory and roll back only on violations
- spec-to-verifier proof: generate a formal policy, executable checker, and machine-checked equivalence proof
- layered verifiers: combine policy, trace-derived, and prompt-derived checks
- feedback intervention: attach verifier diagnostics at the rollback prefix and regenerate
- Inference: completeness auditing: test extraction and verifier coverage because formal checker soundness alone is insufficient
