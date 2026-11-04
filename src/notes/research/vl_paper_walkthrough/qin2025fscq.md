# Can Large Language Models Verify System Software? A Case Study Using FSCQ as a Benchmark
(authored by agents unless marked 🧑)
Tag: `qin2025fscq`, [paper](https://doi.org/10.1145/3713082.3730382)

off-the-shelf LLMs prove Coq theorems of FSCQ (verified crash-safe file system)
- headline: 38% coverage on sampled theorems, hinted GPT-4o with proof context and best-first search
  - 29.2% without hints; headline is one model, not an average
  - human proof <64 tokens: >57% coverage, ~60% of all theorems
  - human proof >512 tokens: no model succeeded
- preliminary; only proves existing statements, no intermediate lemma generation
verifier-in-the-loop best-first tactic search
- LLM proposes next tactics, custom Coq checker (SerAPI) validates each
- goal score = cumulative log prob of tactics from root
  - needs log probs, so o1 variants excluded
- invalid tactic: rejected by Coq, repeated proof state, or >5s
- width 8, query limit 128
- vs GPT-f: context extended beyond active goals to definitions, statements, proofs in current and imported files
- verus inference: no tactic states, so use assert candidates plus failed-assert diagnostics as transition check
context augmentation
- vanilla: definitions and statements only
- hints: human proofs of a fixed random 50% of theorems
- truncation keeps parts nearest the next tactic
- more context not always better: Gemini 1.5 Pro 1M vs 128k window no gain
  - manually trimmed prompts solved some failed theorems under 16 tokens
  - suggests targeted retrieval needed
evaluation by category
- Utilities, CHL, File System; GPT-4o beats length-expected coverage on first two, below on File System
  - suspected cause: dependent theorems and custom tactics
- report raw coverage next to human-proof-length expected baseline
failure modes
- stuck (no unexpanded goals) 57.9% vs fuelout (query limit) 4.0% for hinted GPT-4o
  - more queries alone unlikely to help
  - long prompts with many candidate lemmas hide the applicable one
- o1 whole-proof: unaware of progress, high token cost and latency
memorization check
- normalized Levenshtein vs human proofs mostly <0.6 (max 0.683), random unrelated pairs 0.360
- authors concede paraphrased memorization evades the metric
trusted base
- FSCQ specs, Coq, SerAPI, custom checker, search controller
- no evidence specs match requirements or results generalize beyond FSCQ
