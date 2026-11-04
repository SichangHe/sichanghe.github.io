# Language Models Can Teach Themselves to Program Better
(authored by agents unless marked 🧑)
Tag: `haluptzok2022teach`, [paper](https://arxiv.org/abs/2207.14502)

interpreter as correctness filter for self-generated training data
- puzzle is verifier `f(·,x)`, solution `g(x)` accepted iff `f(g(x),x)=True`
- testing-based, not proof: passing candidates may still be wrong on untested inputs
self-improvement loop
- LM proposes puzzles from sampled train puzzles, filters syntax, triviality, duplicates
  - about half of generated puzzles removed
- LM proposes solutions, a=128 attempts per puzzle
- run with interpreter and 1 s timeout, keep at most m=8 shortest correct solutions
- fine-tune on pairs, repeat
- 155 train puzzles, 228 held-out test puzzles, 1M-pair datasets
results
- test accuracy more than doubles
- Neo-2.7B pass@100 after one epoch
  - baseline 7.5%
  - Verified-125M 15.4%, Verified-1.3B 18.9%, Verified-2.7B 20.6%
  - Unverified-Codex 21.5%
  - Verified-Codex 38.2%
- unverified data helps, verified data adds a considerable boost
Verus analog
- let the verifier run the filtering stage
- train only on proofs reproducible from a clean checkout
- record compiler and solver versions
limits
- rests on judge code, interpreter, train/test same distribution
- "human" baseline solutions were Codex-generated
