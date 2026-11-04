# PolyVer: A Compositional Approach for Polyglot System Modeling and Verification
(authored by agents unless marked 🧑)
Tag: `chen2025polyver`, [paper](http://arxiv.org/abs/2503.03207v3) (link from the fetch record)

verify multi-language systems by replacing each procedure with a pre/post contract in a small IL
- avoids compiling all languages into one encoding
  - language-specific verifiers (CBMC, Kani) check each procedure against its contract
  - composed abstract model checked in UCLID5 for trace inclusion
- soundness is conditional
  - IL compiler must preserve semantics
  - verifier and model checker assumed sound and complete, in the TCB
  - no termination guarantee
  - contract is an overapproximation, so spurious counterexamples are possible
- LLM synthesizer is outside the TCB
  - every contract must pass the verifier
CEGIS inner loop synthesizes a contract per procedure
- loop: synth (P,Q) from examples, verify on the procedure, add the failing concrete pair as a positive example
- 18 of 22 benchmarks needed a single CEGIS loop, 37 s average
- SyGuS/SyMO baselines lack procedure bodies
  - needed many CEGAR iterations, failed to terminate in most benchmarks
CEGAR outer loop prunes spurious traces
- model-check the abstract model, extract each call's (d,d') from the counterexample
- if `{V=d} C {V'≠d'}` holds, the pair is impossible, so add it as a negative example and resynthesize
- if no pair is impossible, return the trace as a real counterexample
- resolves all 22 LF benchmarks, LFVerifier fails on TrafficLight
  - total runtime generally slower than LFVerifier
LLM synthesis oracle
- o1-mini, 3 parallel queries per procedure
  - prompt: task + Python DSL, reason about behavior, generate contract
  - syntax or type errors trigger a retry
- handles C and Rust with FFI, ROS2 patterns, LF systems
  - Satellite PID controller was hard, a code comment on the controller logic helped greatly
- unavailable library functions (atan) are overapproximated by nondeterminism, which can block proofs
- no repeated-run variance reported
Verus transfer (inference)
- `requires`/`ensures` per procedure plus a Rust abstract state machine
- failed proof alone is not a valid positive example
  - CEGIS needs a concrete violating input/output pair
