# Not All Invariants Are Equal: Curating Training Data to Accelerate Program Verification with SLMs
(authored by agents unless marked 🧑)
Tag: `pinto2026not`, [paper](https://arxiv.org/abs/2603.15510)

claim: data quality, not model scale, bottlenecks neural loop-invariant synthesis
- WONDA pipeline: take UAutomizer-printed invariants for C, simplify, re-verify, keep correct+sufficient ones
  - fine-tune 0.6B to 14B models to emit one invariant per loop per call
- proved: normalization preserves meaning, every output is correct and sufficient because the verifier checked it
- trusted: UAutomizer (SV-COMP 2025, 600 s timeout), assumed sound
split a query into two parallel checks
- V1 correctness: `assert(I)` at loop head
- V2 sufficiency: `assume(I)` at loop head, prove the property
  - both true: true, V2 false: false, else unknown
  - time is the max of the two, race against the unaided verifier
- correct but insufficient candidate witnesses a real bug in the program
- Verus (inference): no unaided mode, so no speedup baseline
  - checks still locate failures: `assume(I)` with empty `invariant` tests sufficiency, `invariant` alone tests correctness
  - loop isolation means a clause the paper deletes as redundant may be needed
four-level grade
- 0 invalid or incorrect, 1 correct not sufficient, 2 sufficient, 3 sufficient and faster than unaided
- keep grades 2 and 3 as training data
data curation
- normalize by bottom-up tree rewriting: drop tautologies, propagate contradictions, strip parentheses
  - strip integer casts, can change meaning so re-verify
  - alone worth little (see ablation)
- strong LLM (Kimi K2 Thinking) proposes 4 shorter rewrites of each invariant over 20 chars, verifier grades them
  - range generalization: `x==1||..||x==k` to bounds
  - constraint factoring, closed-form discovery (prefer linear), redundancy removal
  - unsound rewriter is fine because the verifier filters
  - 55.0% of rewrites of verbose invariants reach grade 2 or 3, 98.3% of the 4000 raw invariants yield one
  - final 7,284 samples (5,827 train, 1,457 val), mean target 15.8 tokens
results on InvBench Hard (123 loop instances, unaided mean 193 s)
- correct rate, base to fine-tuned
  - Qwen3-4B 22.8 to 44.4, Llama-3.1-8B 14.9 to 45.5, Mistral-7B 18.4 to 31.4, Qwen3-14B 36.3 to 43.4
  - Qwen3-0.6B flat 28.5 to 27.9
- best time saving 30.9 s of 193 s (16.0%, Qwen3-14B)
- ablation: raw verifier output V0 often hurts, normalized V1 helps some, full V2 best
  - Mistral-7B valid outputs: V0 68.8% vs V2 99.5%
- GPT-5.2 not fine-tuned: correct 72.4%, mean 163.4 s, comparable time to fine-tuned 14B at 162.9 s
caveats
- fewer than half of proposals correct, under a quarter speed anything up
- time metric is best-of-two, 16% is an upper bound
- timeouts barely resolved, about 3.3 of 20 per run
- no verifier feedback at inference
- only quantifier-free integer invariants on small C programs
  - nothing on array invariants, which most Verus loops over `Vec` need
- possible train/benchmark overlap unchecked
- internal inconsistencies in reported numbers: Mistral valid 65.0 vs 68.8, curated rows 7,763 vs summed 7,793
