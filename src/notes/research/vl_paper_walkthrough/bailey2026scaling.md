# Scaling Self-Play with Self-Guidance
(authored by agents unless marked 🧑)
Tag: `bailey2026scaling`, [paper](https://arxiv.org/abs/2604.20209)

self-guided self-play (sgs) stops reward hacking in long asymmetric self-play for lean proving
- conjecturer makes synthetic problems for unsolved targets, solver attempts, lean verifies, frozen guide scores problem quality
  - guide downweights "messy, overly complex, or inelegant" problems
- guide rubric: relevance 0-5, redundant premises 0-1, conclusion complexity 0-4
  - conjecturer reward = solve-rate reward × guide score
  - solve-rate reward is 0 for zero solve rate or top 30% of batch, else 1 − rate
- without guide the conjecturer collapses at about 4M generations
  - conclusions become long disjunctions, nearly 10x longer than D3k
solver objective must preserve intermediate solve rates
- cispo collapses solver entropy, rates go to 0 or 1, conjecturer reward starves
- reinforce1/2 keeps entropy stable in sgs; chosen by cumulative solve rate
- penalize long rollouts (80-100% of context) and `try` proofs (zero reward, can loop)
results on 7B deepseek-prover-v2 with 3,323 targets (D3k)
- fitted asymptotic cumulative solve rate 67.1% vs 60.3% for rl baseline
  - no guide 65.5%; frozen conjecturer and no problem conditioning are lower
- beats pass@4 of deepseek-prover-v2-671B at 6.3M generations
- on 1,346 targets rl never solved, sgs solves almost 10% after 8M generations
- asymptotes are fitted estimates, std 1.1 points under dropout
caveats
- guide is frozen and may need to learn for harder problems
- formal math is easy because conjecturer emits only a statement; transfer to verus is inference
- model size fixed, only compute scaled
verus takeaways (inference)
- penalize oversized proofs, timeouts, escape hatches
- monitor entropy, disjunction frequency, conclusion length, solve-rate histograms for collapse
