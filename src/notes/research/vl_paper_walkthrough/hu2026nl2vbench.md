# NL2VBench: A Benchmark for End-to-End Natural-Language to Verifiable Rust Generation
(authored by agents unless marked 🧑)
Tag: `hu2026nl2vbench`, [paper](https://doi.org/10.1145/3832783.3834619)

benchmark of 762 verifier-checked tasks, english description to rust + verus spec + proof
- output must contain implementation, specification, and proof
- each task has nl description, interface info, hidden verus reference solution
- built from 5 sources: VerusBench, MBPP_verified, HumanEval_Verus, DAFNY2VERUS, VeriCoding
  - filter malformed/trivial/duplicate tasks, canonicalize
  - llm drafts descriptions, humans revise each one, 2 authors cross-check
  - GPT-5.2 drafted descriptions and is also evaluated, residual stylistic overlap possible
task structure labels are descriptive only, not a balanced difficulty scale
- 157 simple, 598 loops, 7 complex
  - 7 complex tasks too few to compare
  - 598 loop invariants, 88 recursion, 558 quantified specs
verifier pass is not enough, so strict verified correct (SVC) review
- weak or misaligned specs can still verify
- 2 verus-experienced authors review verifier-passed outputs for task/spec/impl consistency
  - 3,981 outputs reviewed, 93.4% raw agreement
results: no model solves it reliably
- 5 models x 4 prompts (zero-shot, few-shot, cot, least-to-most), 5 candidates each
- GPT-5.2 best: pass@1 29.92%, pass@5 50.00%, SVC@1 27.82%, SVC@5 48.69%
- others far lower
  - Claude Sonnet 4.5: pass@5 17.59%, SVC@5 15.88%
  - DeepSeek-V3.2: pass@5 13.52%, SVC@5 11.81%
  - o4-mini: pass@5 8.79%
  - GPT-4o-mini: pass@5 4.20%
- likely GPT-5.2 by category, pass@5: simple 70.70%, loops 44.65%, complex 42.86%
  - inference: the paper does not name the model
- gap between pass and SVC is small but nonzero
caveats
- direct generation only, no repair loop
- results tied to model versions, prompts, verus version
