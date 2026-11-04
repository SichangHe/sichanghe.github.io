# Training Verifiers to Solve Math Word Problems
(authored by agents unless marked 🧑)
Tag: `cobbe2021training`, [paper](https://arxiv.org/abs/2110.14168)

learned verifier ranks sampled solutions on gsm8k, not formal proof
- gsm8k: 8.5k problems, 7.5k train / 1k test, 2-8 step arithmetic
- 6b verification slightly beats finetuned 175b, about a 30x model-size boost
recipe
- finetune generator 2 epochs
- sample 100 solutions per training problem, label by final answer correctness
- train verifier 1 epoch
- test time: sample 100, return highest verifier score
  - wrong derivation with right answer is a false positive label
  - larger generator with smaller verifier beats the reverse
design findings
- token-level verifier (value function) beats solution-level, which overfits
- language-modeling loss alongside verifier loss strictly helps
- residual dropout (20%) helps both finetuning and verification, more for solution-level
- gains grow to 400 samples for 6b verifier, then decline as adversarial solutions fool it
- voting among top-ranked: best about 3-5 voters at 100 samples, about 30 at 3200
- calculator override for `<<...>>` arithmetic, fixing calculator bugs gave about 1%
limits
- gsm8k has about 1.7% residual label disagreement
verus takeaways (inference)
- rank candidate proofs by learned score, but the `verus` run is the real oracle
- vote only among candidates that verify
- a calculator-style suggestion must be rechecked by verus as an `assert`
