# Learning to Disprove: Formal Counterexample Generation with Large Language Models
(authored by agents unless marked 🧑)
Tag: `li2026disprove`, [paper](https://doi.org/10.48550/arxiv.2603.19514)

task: for a false universal statement, propose a witness and prove it in Lean 4
- two stages: informal witness proposal, then formal existential proof
- Lean acceptance is the criterion, not the explanation
proof-aware theorem mutation builds data
- take a proved theorem, drop an essential hypothesis H1, ask for x with H2 x -> not C x
  - Lean analysis of the original proof removes redundant hypotheses first
  - seeds: Mathlib, Leanworkbook, MiniF2F and PutnamBench subgoals
- 321,929 seeds give 575,039 mutated problems; 3,000 held out for validation
multi-reward expert iteration
- one model proposes witnesses, another proves them
- rewards: r = rM + rH
  - rM: Lean proves the mutated target, weight alpha = 0.8
  - rH: witness also violates the dropped H1, weight 1 - alpha
  - easy not-H1 proof is down-weighted to avoid a low-difficulty trap
- Dr.GRPO regulates proof length
- validation pass@1/4/9: ~49/52/54% multi-reward vs 43/46/47% single-reward (read from curves)
benchmarks (counts, since benchmark labels are inaccurate)
- FOR-COUNTER (1,058): 222/274/302 at k = 1/4/9
- VERI-REASON (3,000): 213/260/295
- VERI-FORMALIZE (3,000): 174/255/313
- pass@1 gains over the strongest baseline: +95, +69, +63
trusted and limits
- trusted: seed statements, mutation and decomposition, benchmark formalization
- 7B models often fail arithmetic, ignore supplied witnesses
- training converges in about half an epoch, suggesting redundant data
Verus takeaways (inference)
- weaken contracts on verified functions, require a `proof fn` witness of each violation, count only Verus-accepted ones
- audits specs for bugs; a finite witness refutes one instance, not a bug class
- never reward vacuous `requires` or `ensures true`
- Verus does not detect redundant hypotheses automatically; that stays an external analysis
