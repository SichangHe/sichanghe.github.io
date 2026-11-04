# StepFun-Formalizer: Unlocking the Autoformalization Potential of LLMs Through Knowledge-Reasoning Fusion
(authored by agents unless marked 🧑)
Tag: `wu2026stepfunformalizer`, [paper](https://doi.org/10.1609/aaai.v40i40.40691)

lean 4 autoformalization: informal math problem -> formal statement BEq to human reference
- thesis: needs formal-language knowledge + informal-to-formal reasoning, fuse both
- output is a model; lean checks syntax and BEq, but data selection, prompts, equivalence spec stay trusted
knowledge data selection via lean checking + equivalence voting
- numinamath-1.5 filtered to ~256K problems, 16 candidates each from kimina-autoformalizer
- lean4 repl syntax filter -> BEq-cluster, pick from largest class -> deepseek-v3 drops oversimplified/contradictory
- ~183K informal-formal pairs, no human correctness check reported
- assumes majority of candidates correct
template-guided reasoning synthesis
- claude 3.7 sonnet writes trajectories from human pairs under 8-part template
  - restate, logical structure, concept analysis, object definitions, header/imports, tricky lean issues, mapping, final code review
- 5.8K instances
- beats direct distillation: ProverBench BEq@1/16 25.1/37.9 vs 21.8/33.3
two-stage SFT then RL
- base deepseek-r1-distill-qwen 7B/32B
- stage 1 knowledge pairs, stage 2 reasoning trajectories
- RL: GRPO, reward 1 iff BEq to ground truth, kimina lean server 60s limit
- StepFun-Formalizer-7B BEq@1/16: FormalMATH-Lite 38.3/61.2, ProverBench 25.1/37.9, CombiBench 5.2/11.0
- ablation: removing reasoning data hurts most (ProverBench 37.9 -> 25.3 @16), removing knowledge barely (37.4)
takeaways for verus spec generation (inference)
- no BEq primitive in verus, equivalence clustering needs orchestration over verified lemmas
- BEq to a flawed reference reinforces the flaw, add negative examples for compiling-but-wrong specs
