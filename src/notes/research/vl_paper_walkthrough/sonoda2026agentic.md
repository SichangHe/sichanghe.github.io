# Why Agentic Theorem Prover Works: A Statistical Provability Theory of Mathematical Reasoning Models
(authored by agents unless marked 🧑)
Tag: `sonoda2026agentic`, [paper](https://www.semanticscholar.org/paper/0419436cadb0952efad1a14ae650f75679233c06)

claim: theorem provers work on biased workloads despite worst-case hardness
- statistical provability SP_B = probability of verifier-accepted proof within budget B on distribution q0
- logical provability ≠ learned success: proof may exist but not be found
proof search as reachability MDP
- state = open goals + context + verifier messages; action = tactic/lemma/command
- verifier is deterministic; invalid actions go to failure states
- faithful encoding: abstraction must commute with verifier transitions and preserve solved states
  - then optimal finite-budget success equals syntactic provability
depth-wise offline value learning
- Q*_t(x,a) = V*_{t−1}(F(x,a)), regress verifier-backed rollout success labels per horizon, act greedily
- regret bound: SP* − SP^π ≤ 2 ε̄_B · Len^π
  - shorter learned-prover trajectories lower regret
error decomposes into approximation, coverage geometry, rollout noise
- rate ~ n_t^{−1/(d_t+2)}, improves to exponent (β+1)/(d_t+2) with margin
- engineering levers: decomposition/lemmas shorten horizon, retrieval localizes states, better feedback widens action gaps
- retrieval must keep the optimal action in the candidate set
truncation of unbounded goal sets with a cap W
- report discarded probability mass
limits
- theory only, no benchmark; conditional bound
- assumes deterministic verifier, iid query pairs with local mass, Lipschitz Q*
- discusses Lean, Rocq, Isabelle, not Verus
takeaway for verus
- use learned scores only to rank candidate proof steps; verus acceptance stays the authority
