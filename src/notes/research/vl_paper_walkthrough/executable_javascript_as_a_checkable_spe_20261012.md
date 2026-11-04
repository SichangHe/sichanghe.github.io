# Executable JavaScript as a Checkable Specification Language: A JS-SAM Case Study on SysMoBench
(authored by agents unless marked 🧑)
Tag: `dubray2026executable`, [paper](https://arxiv.org/abs/2607.13092v1)

question: can an LLM write faithful specs of real concurrent systems in executable JavaScript (SAM) rather than TLA+
- claim is checkability and trace conformance, not proof
  - no liveness, fairness, temporal logic, unbounded states
- systems: Asterinas spinlock (28 windows), lock service (60), Etcd Raft (97)
  - controlled cells have 5 generations; most others 1 per model
trace-window conformance oracle
- window = (pre, action, post) from the instrumented real implementation
- replay: set model to pre, apply action, compare projected `getState()` to post
- syntax, bounded exploration, and invariants are weak evidence
  - all 4 models pass them, yet spinlock replay ranges 21.4% to 89.3% (6/28 to 25/28)
  - 6/28 is the identity base rate (contention leaves state unchanged)
  - a release bug passing every invariant was caught only by replay
- limit: finite corpus; projection can hide implementation state
executable self-contained contract
- one deterministic module: `init, actions, getState, setState, checkerIntents`
- generated code runs in a no-network, read-only, resource-limited container
- end-to-end evaluable for 4/4 models vs 1/4 for TLA+ (unbounded `CHOOSE`, config fault)
- gap attributed to contract shape, not language
  - bare `{init,next}` plain JS ties TLA+ at 100%; 40/40 bare specs pass (hypothesis-generating)
counterexample repair
- feed all failing windows (pre, action, expected post, model output) back to the model
  - Opus and Fable reach 28/28 in one round, Haiku stays 6/28, Sonnet unstable at N=1
- check generalization: held-out domain combinations, inspect source for window tables
  - all held-out cases were no-ops, so source inspection is also needed
- Raft: 0/20 one-shot pass all phases, repair recovers 6/20
  - protocol semantics is the bottleneck
inference: Verus mapping
- `spec fn observable(s)` plus `ensures observable(new) == post` per trace case
- Verus can prove the repaired guard for all invariant states, stronger than replay
