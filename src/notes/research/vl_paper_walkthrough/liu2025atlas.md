# ATLAS: Autoformalizing Theorems through Lifting, Augmentation, and Synthesis of Data
(authored by agents unless marked 🧑)
Tag: `liu2025atlas`, [paper](https://arxiv.org/abs/2502.05567)

atlas: synthesize parallel nl–lean4 theorem-statement data for training autoformalizers
- target is faithful formalization, not truth: 40/100 sampled propositions were false
- data lifting: concept repository from mathlib (13 domains, 55 topics, 350 concepts)
  - sample 2 concepts per statement, teacher writes nl theorem
  - verus analogue (inference): repo of verified rust apis/invariants/contracts
synthesis with compiler feedback
- student translates nl → lean, `#check` splits statement for readable error locations
- failure → teacher reviser (fl-rev) sees nl + errors, one retry
- fl-align rates nl–fl alignment good/average/poor; keep good+average
- poor and doubly-failed statements recycled as nl for next round
- compiling ≠ aligned: alignment is a model judgment
augmentation
- proof-state: run deepseek-prover-v1.5, turn final intermediate infoview state into new statement
- contraposition: `contrapose!` each hypothesis, keep most dissimilar by levenshtein
- reconstructed statements recompiled (infoview loses type info), back-translated to nl
- verus: equivalent contracts need verifier-proved equivalence (inference)
training
- teacher deepseek-v2.5, student llama3.1-8b-instruct, lora
- 10 expert-iteration rounds × 10k new nl statements
- final 117,145 pairs (54,641 synthetic, 22,103 proof-aug, 40,401 contraposition)
evidence
- eval: compile + back-translate + nli check
- pass@1/8/32: proofnet 39.46/67.28/78.71, putnambench 23.16/55.51/72.93
- removing synthetic data hurts most
- human check of proofnet passes: 99/151 correct, 26 minor, 26 major errors
  - llm validation diverges from human judgment, false positives
