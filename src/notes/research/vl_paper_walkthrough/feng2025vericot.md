# VeriCoT: Neuro-symbolic Chain-of-Thought Validation via Logical Consistency Checks
(authored by agents unless marked 🧑)
Tag: `feng2025vericot`, [paper](https://arxiv.org/abs/2511.04662)

validate chain-of-thought step by step with a solver
- LLM autoformalizes each step to SMT-LIB, Z3 checks against accumulated premises
- step labels: entailed, contradiction, untranslatable, ungrounded
- if not entailed, LLM generates premises, filtered for consistency, judged by LLM-as-judge for attribution/commonsense
- valid trace = consistent premise set entails every step
- executor Claude-3.5-Sonnet-V2, fine-tuning Qwen2.5-7B
vocabulary-growing autoformalization
- if translation fails, LLM adds declare-fun / declare-sort then retries, ≤ 3 times
results (pass rate / precision, %)
- ProofWriter 45.2 / 94.1, BioASQ 25.3 / 84.3, LegalBench-SARA 15.2 / 87.0
  - precision = correct answers among verified CoTs
- most CoTs fail to verify, but verified ones are mostly right
verifier feedback for repair and training
- feed steps, premises, solver results back for self-reflection
  - pass rate +46.4% relative on average, but task accuracy not improved (ProofWriter 75.8 → 74.1)
- verified vs failed trace pairs used for SFT and DPO
trust gap
- autoformalization and premise inference are LLM-made, may mistranslate or add unfounded premises
- a solver proof covers only the formalized steps
Verus relevance (inference)
- LLM judge verdict = triage only, require machine-checkable lemma
- treat translation as an assumption unless validated
