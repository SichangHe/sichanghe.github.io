# Pythagoras-Prover: Advancing Efficient Formal Proving via Augmented Lean Formalisation
(authored by agents unless marked 🧑)
Tag: `leang2026pythagoras`, [paper](https://www.semanticscholar.org/paper/fe3fee858cc1e92e0897319b23bce6b592fac33c)

low-compute Lean prover training: verified curriculum SFT, GRPO, Augmented Lean Formalisation (ALF) self-distillation
- 4B beats DeepSeek-Prover-V2-671B at pass@32 on MiniF2F-Test: 82.4% -> 86.1%, ~167x fewer parameters
- 32B: 93.0% at pass@2048 MiniF2F-Test, 93/672 PutnamBench
- Lean only, no Verus evidence
verified curriculum corpus: ~800K instances in easy/medium/hard tiers
- pipeline: autoformalize, auto-informalize to drop logical drift, 2 proof attempts, keep pair if one compiles
- failures: classify compiler errors into 7 categories, prompt for rubric-targeted simpler variants
  - rubric gives 30% relative gain in autoformalization success
- hard problems: 4 synthesized variants per source for SFT, originals held out for RL
dynamic proof-reasoning filter under 8,192-token context
- reasoning + proof fits: keep both
- only proof fits: drop reasoning
- proof alone too long: discard
- Verus analogue (inference): drop optional reasoning before truncating proof syntax; remeasure thresholds for Rust
GRPO with verifier reward
- reward 1 iff proof compiles and matches the formal statement
- 8 rollouts per problem, keep problems with 1-5 successes (DAPO-style), no KL penalty
- full-parameter tuning, LoRA unstable under GRPO
- RL gain over curriculum SFT is modest
- Verus analogue (inference): reward only if verus accepts and target is unchanged; reject external_body escape hatches
ALF: one mutation per seed in 5 categories
- categories: simplification, generalization, lemma proposal, step decomposition, reformulation
- keep pair if the proof references the mutated statement, no Lean check
  - paper warns this does not certify validity
  - 2,000-instance sample: 87.8% Lean pass, so the ~2M corpus is not fully verified
- Verus analogue (inference): mark mutations untrusted until Verus checks them
restart vs self-correction on PutnamBench
- Goedel-Prover-V2 self-correction: 57/672 at pass@32, 86/672 at pass@184
- Pythagoras restarts: 48/672 at pass@32, 93/672 at pass@2048
- argument: restarts avoid inheriting an early logical error
MiniF2F-ALF: 488 mutated statements from the 244 test statements
- every model loses accuracy; pass@32: 32B 85.0%, 4B 83.2%, Goedel-V2-32B 83.6%
- 4B drops 2.9 points vs 4.5 for Goedel-32B
- drop shows surface sensitivity, not isolated contamination
tactic-level diffusion: mask whole tactic spans, never structural tokens
- 4B diffusion 63.25% vs 86.1% autoregressive at pass@32
- authors blame sparse supervision and scarce data
