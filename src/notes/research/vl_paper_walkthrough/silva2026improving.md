# Improving Debugging in Verification-Aware Languages Through Automated Fault Localization: A Case Study in Dafny
(authored by agents unless marked 🧑)
Tag: `silva2026improving`, [paper](https://arxiv.org/abs/2608.05399)

setup
- localize faults in Dafny implementations that violate a correct spec; output = ranked source lines
- compares state-based SNAP, counterexample methods CNTB/CNTS/CNTM, and an LLM baseline
- 500 valid mutants of DafnyBench via MutDafny; metrics EXAM, Top-k, Found, Empty
- claim: counterexample-based methods substantially beat state-based
contract-derived tests (DafnyCBT)
- inputs and expected outputs derived from contracts, independent of implementation
  - split contract to DNF, Z3 picks input per clause, add boundary cases and anti-trivial soft assertion
- availability limit: valid tests for only 387 of 500 programs
  - 61 did not exercise the faulty method, 11 timeouts, 11 out of memory
SNAP snapshots
- rank predicates true at a location in failing but not passing runs (Daikon-style invariants plus enumerated predicates)
- weak: file EXAM 0.324, Top-1 8%, Found 47%, Empty 39.2%
  - empty rate caused by incomplete test generation
counterexample methods
- CNTB: lines of the single verifier counterexample path
  - file EXAM 0.243, Top-1 12%, Found 61.4%, Empty 5.2%
- CNTS: add enclosing if/while/for conditions, rank by frequency, nesting depth, node type
  - file EXAM 0.127, Top-1 27%, Found 80.8%
- CNTM: block each failing path with temporary `assume false` at the deepest branch point, re-verify, aggregate lines over paths
  - rank by recurrence, then depth, then branch guard, then order
  - file EXAM 0.109, Top-1/3/5 43/71/78%, Found 84.0%, Empty 1.4%
  - ablation: removing depth hurts most (Top-1 22%)
LLM baseline (Qwen3-coder-next, numbered lines, JSON ranking)
- LLM: file EXAM 0.159, Top-1 58%, Found 72.6%
  - CNTM vs LLM EXAM difference not significant (p=0.101); LLM wins Top-1 (p<0.05)
- adding verifier error hurts (EXAM 0.264, Found 50.8%); error plus CNTM ranking recovers (0.131, 77.2%)
  - authors call it a minimal, under-optimized baseline
Verus form (inference)
- needs stable failing model and source locations from Verus diagnostics; not an existing feature
- `assume false` path blocking must stay in diagnostic copies, never in accepted code
- learned runtime invariants differ from Verus loop `invariant`
- localization ranking is diagnostic, not proof evidence
limits
- synthetic mutations, pedagogical DafnyBench programs, one LLM setup
- does not show a ranked line is the causal fault
