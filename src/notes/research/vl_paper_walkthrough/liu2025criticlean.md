# CriticLean: Critic-Guided Reinforcement Learning for Mathematical Formalization
(authored by agents unless marked 🧑)
Tag: `liu2025criticlean`, [paper](https://arxiv.org/abs/2507.06181)

criticlean: train a critic that checks whether compiling lean code means what the nl problem asked
- compiler catches syntax/type, not semantic drift
- relevant to verus: proof of an under-specified contract is still a valid proof (spec drift)
- criticleangpt trained with sft + rl
- criticleanbench: 500 pairs (250 correct, 250 incorrect), includes compilable-but-wrong
- best critic qwen3-32b-rl 87.0% acc, gemini-2.5-pro 89.2%
  - table's fpr/fnr headings are swapped vs standard definitions
  - no confidence intervals, small benchmark
compiler + critic loop
- generate → compile → repair on error → critic checks meaning → regenerate with critique
- 50 omni-math problems, human accuracy: 38.0% one pass, 54.0% until compiles, 84.0% with critic loop
- retained formalizations of 500 problems: 12.6% at 1 attempt, 52.8% at 200
  - base formalizer is the bottleneck
benchmark construction
- sources: omni-math, aime, u-math, olympiadbench, etc
- compiler failures = negatives, compiling ones classified by deepseek r1 then human-reviewed
- error taxonomy: premise/goal translation, concept misuse, wrong assumptions, incomplete formalization, ...
hard negatives
- 2,000 real compile failures with explanations
- gemini 2.5 pro injects 2 checklist errors into correct formalmath code
- verus analogue (inference): drop a boundary condition, weaken `ensures`, alter aliasing; human review for accidental equivalence
training
- criticleaninstruct 48k, critic:other = 1:3, seed 2k correct + 2k incorrect with expert feedback
- rl: grpo, reward = min(accuracy, format)
- mixed sft beats critic-only (7b 69.8 vs 64.0, 32b 76.2 vs 71.0)
  - does not isolate rl
corpus
- fineleancorpus 285,957 entries, diamond subset 36,033
- "fully verified" means pipeline checks, not semantic guarantee: per-source human accuracy 69–100%
- statements only, proofs omitted
