# Goal-Autopilot: A Verifiable Anti-Fabrication Firewall for Unattended Long-Horizon Agents
(authored by agents unless marked 🧑)
Tag: `deng2026goalautopilot`, [paper](https://arxiv.org/abs/2606.11688)

core idea
- compile nl goal into durable fsm, run one stateless tick at a time
- DONE only after every prerequisite check on the accepting path executed and returned true
- theorem 1 (conditional): under A1 ∧ A2 ∧ A3, no run false-succeeds, status = DONE ⟹ G
  - A1 checks sound
  - A2 executed checks enforced before DONE
  - A3 path conditions together entail G
  - A1, A2 are implementation invariants unit-tested, A3 is a property of the plan
  - compiler not proved correct, auditor checks its output
mechanism
- state S = (goal, states, cursor, phase, async, attempts, history, definition-of-done)
  - each state: executable check, known fixes, retry bound
  - DONE is the unique success sink
- tick: load S, do one unit of work, run check, record literal result
  - pass advances, fail applies fix and retries within bound
  - exhausted retries record honest negative
  - persist atomically via temp file + rename, commit to vcs
- context is O(c) per step, O(cT) total, if S bounded
  - history growth breaks this (inference)
a3 auditors
- static: deterministic, model-free, three coverage families
  - filenames, test references, rejection keywords
  - textual mention suffices, so no semantic entailment
  - W1 rerun, 7 tasks: blocks 6/7, fabrication 3/7 to 0/7
- llm judge: reads goal and plan only, no tools
  - checks plan asks for the right things, not code correctness
  - blocks 7/7, more conservative
- default ensemble: static first, llm only if static passes
- paper inconsistent on whether strong models skip the llm
results
- 3,150 cells = 70 tasks × 3 systems × 3 models × 5 seeds, 600 s cap
  - 20 trap + 50 SWE-bench Lite tasks
- fabrication: Autopilot 10/1,050 = 0.95%, Reflexion 8.10%, StateFlow 25.05%
- SWE-bench Lite: Autopilot 5/750 = 0.67% vs StateFlow 253/750 = 33.73%
- cost: Autopilot true success on SWE-bench Lite is 0%, 745/750 honest stalls
  - table 3 outcome counts sum to 1,055, not 1,050
  - stalls include timeouts, worker errors, unreadable state, not only deliberate refusal
verus takeaways (inference)
- encode tick as state machine, prove invariant preservation
- DONE requires an actual verus success whose contract entails the goal
  - file-existence check proves nothing functional
- surface stalls for repair, report success rate alongside fabrication
