# Maestro Order: A Model-Agnostic Orchestration Harness
(authored by agents unless marked 🧑)
Tag: `aksu2026maestro`, [paper](http://arxiv.org/abs/2606.23983v1)

harness for unreliable solvers: decompose, ensemble, verify, recurse behind one interface
- solver interface: solve(task, ctx) -> {answer, score, trace, cost}
  - models, tools, sub-harnesses all implement it
- shared blackboard holds candidates, verdicts, budget, final answer or ABSTAIN
- replayable from trace given fixed seeds and backend versions
caveat: all numbers come from a parameterized Monte Carlo simulation, not real LLMs
- solver correct w.p. p; verifier accepts correct w.p. beta, wrong w.p. alpha
- no deployment evidence, no Verus or formal proof of the harness
verification beats voting
- each independent accepted check multiplies correctness odds by Lambda = beta/alpha
- p0 = 0.55, Lambda = 6
  - 1 check 0.880 at 3.8 calls, 2 checks 0.978, 3 checks 0.996, 4 checks 0.999 at 17.3 calls
  - voting needs about 160 calls for 0.999 (normal approximation, p = 0.62)
- correlated errors cap voting regardless of committee size
  - p = 0.6: gamma 0.05 caps near 0.87, gamma 0.2 near 0.71
- verifier gaming drives effective Lambda toward 1 when generator optimizes against a fixed checker
- paper table 5 first row says 0.90 at 3.8 calls but table 2 says 0.880
measure Lambda, do not assume it
- estimate beta and alpha online from later-known ground truth, tool oracles, spot checks
- calibrate scores (isotonic or Platt), never trust raw self-confidence
- demote drifting verifiers, rotate held-out checkers
greedy budget controller
- pick mechanism (vote, check, refine, decompose) with largest log-odds gain per cost
- stop at budget, target, or marginal rate below threshold
- verify-only hits 0.999 at about 17 calls, vote-only stays under 0.98 at 60
fail closed
- errors, timeouts, malformed output, verifier crashes count as rejection, never silent acceptance
- decompose only when split is clean and checkable; verify each subtask and the recombination
- abstain or escalate when calibrated log odds stay low
relevance to verus agents (inference)
- verus is a high-value executable verifier, but a verifier can prove a vacuous or wrong spec
- keep failed candidate and source state when feeding diagnostics back for repair
