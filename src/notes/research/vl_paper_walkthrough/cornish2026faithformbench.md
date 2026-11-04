# FaithformBench: Benchmarking Faithfulness of Mathematical Chain-of-Thought Autoformalisation
(authored by agents unless marked 🧑)
Tag: `cornish2026faithformbench`, [paper](https://arxiv.org/abs/2608.10916)

core risk: silent correction
- autoformaliser (AF) turns an invalid nl step into a provable formal statement
- example: Kimina changes `x ∈ R` to `x ∈ N` while keeping `3^x = 5`
  - premise becomes unsatisfiable, so the invalid conclusion `3^(x+2) = 51` follows vacuously
- relevant to spec drift: type/precondition/bound changes can make a wrong requirement provable
paired validity test
- per step x, also make a perturbed invalid Pert(x), run AF on both
- prover returns proved / refuted / inconclusive for each formal output (statement and its negation)
  - prover: DeepSeek-Prover-V2-7B at pass@2
- faithful AF: x proved, Pert(x) refuted
perturbation
- GPT-5.2 prompt makes a small edit to conclusion/equation/deduction
- or regex: change rightmost number, swap operator, or flip "not"
- judged effective on 97.8% of 12,784 steps
  - human agreement with GPT-5.2: 95.9% on 219 audited items
metrics
- FNR = valid steps refuted / N
- FPR = perturbed steps proved / N
- AFFR = AF failures (extraction, type-check) / 2N
- UFLB = 1/2 FNR + 1/2 FPR + AFFR, a lower bound on unfaithfulness
  - small UFLB does not imply faithful (paper's own limitation)
pair taxonomy
- (proved, refuted) faithfulness
- (proved, proved) sycophancy
- (refuted, refuted) abstention
- (refuted, proved) inversion
- anything undetermined: inconclusive
benchmark
- from ProcessBench: 1,179 error-free chains, parsed by GPT-5.2 into dependency DAGs
- 15,082 steps, 12,784 verifiable, each with perturbed counterpart
- datasets: GSM8K, MATH, OlympiadBench, OmniMATH
- parsing audit: 100% GSM8K, 94.2% MATH, 95.6% OlympiadBench, 96.7% OmniMATH
results
- evaluated Goedel 8B, Herald 7B, Kimina 7B, StepFun-Formaliser 7B, Claude Opus 4.7, GPT 5.2, Gemini 3.1 Pro, Qwen Plus
- fine-tuned AFs silently correct more; general-purpose models less
  - Goedel: lowest UFLB among specialised AFs despite highest FPR
  - Claude Opus 4.7 and Gemini 3.1 Pro beat Goedel's UFLB on every dataset
- Goedel on GSM8K: 71.2% faithful, 21.4% sycophancy, 0.9% abstention, 0.5% inversion, 6.1% inconclusive
caveats
- a proof certifies the formal statement, not its match to the nl input
- prover weakness only inflates inconclusive, lowering the bound
