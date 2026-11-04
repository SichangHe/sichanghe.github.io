# Inference-Time Amplification of Weak Reasoning Models
(authored by agents unless marked 🧑)
Tag: `sunkaraneni2026inference`, [paper](https://doi.org/10.1007/BF00058655)

inference-time amplification: separate coverage from identifiability
- coverage: a useful candidate appears in the pool
- identifiability: the selector can recognize it
- more samples raise coverage but give no info on which one is useful
  - counterexample: M actions, each sound w.p. 1−1/M, identical proposal distributions across worlds, so no selector edge
- use to decide where to spend calls: proposals, judging, or richer evidence
setup
- valid-state system with rank d_x strictly decreasing under sound actions, so trajectory ends within L_x steps
- committee protocol per step
  - k proposals, m critic calls each, drop any rejected
  - r odd pairwise comparator votes, Copeland winner
- final verifier hidden from selector
weak critic amplified by repetition
- local error ≤ proposal miss + k²(1−β)^m e^(−2rσ), proposal miss ≤ (1−α)^k
- adaptive trajectory: total failure ≤ expected sum of per-step failures, uniform ε gives L_x ε
- needs fresh independent randomness and positive edges
  - misaligned comparator can be worse than simple selection
local verifier as identifiability signal
- one-sided checker accepts sound actions, rejects unsound w.p. ≥ 1−ν
  - gives critic edge β_0 = 1−ν, comparator edge σ_0 = (1−ν)/2
- verifier of completed outputs only does not help rank intermediate candidates
- verus analogue: `verify` result on a partial proof as critic, tied to the source hash
oracle failure splits into blind spot B_s + finite width R_k
- B_s = P(q_s(Z)=0): proposer has no support, more samples do not help
- SWE-bench oracle coverage 79.0% at k=8, 79.2% at k=16, so extra width saturates
  - this does not prove 20.8% is the asymptotic blind-spot floor
context raises identifiability
- fixed Qwen3.6-27B pool (oracle 79.2%), comparator with repo access
  - σ̂ 0.04 to 0.09, solve rate 67.0% to 69.6%, oracle-gap recovery 24% to 40%
  - latency 178s to 739s
- verus analogue: give judge module, specs, dependency contracts, verifier diagnostics
empirical results, SWE-bench Verified (500 tasks), 8 GPT-5.4 nano Mini-SWE-agent runs
- pass@1 67.0%, oracle@8 79.0%, critic-comparator 76.4%
  - recovery Rec=(p_system−p_1)/(p_oracle−p_1) = 78.3%
- misses: 89.0% no passing patch in pool, 11.0% selection misses
- GSM-Plus: pairwise recovers 77-80% for k=2,4,8, critic-only degrades as top-score ties go 56% to 93%
- one comparator vote 75.48% at $0.97/task, three votes 76.16% at $1.10/task
limits
- theory assumes uniform local edges and independence, practical critics not shown to satisfy them
- terminal selection mostly single-step, multi-step rank model untested
- no verus experiment
