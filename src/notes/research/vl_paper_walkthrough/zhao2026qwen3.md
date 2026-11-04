# Fine-Tuning Qwen3-27B for C-to-Rust Code Translation: A Three-Stage Curriculum of Pretraining, Debugging-Aware SFT, and Task-Specific SFT
(authored by agents unless marked 🧑)
Tag: `zhao2026qwen3`, [paper](http://arxiv.org/abs/2608.13681v1)

three stages: Rust continued pretraining, Verus debugging SFT, C-to-Rust task SFT
- evaluated with SACTOR harness: 87.2% success rate (table 11 prints 87.30%, inconsistent)
- no ablation isolating any stage, no Verus proof-pass metric
verifier-error repair data (VeruSyn)
- instance: Rust program with broken Verus proof, verifier error report, repaired program Verus accepts
  - executable code and spec must stay fixed, only proof annotations change
- corpus: ~6.9M verified programs (5.7M direct, 1.2M debugging) plus 4,557 agent trajectories (871 long, 3,686 single-step)
- synthesis loop
  - seed ~10K verified programs and 15K debugging pairs, fine-tune Llama-3.3-70B generator
  - alternate self-synthesis and tutorial-based expansion
  - SimHash dedup, Verus check
  - first-attempt verified goes to direct data, rejected plus error report goes to repair
  - trajectories from Copilot CLI with Claude Sonnet 4.5
- anti-cheating filters reject examples that
  - alter the spec, e.g. move postcondition into precondition
  - add assume, admit, external_body
  - use non-terminating loops to skip verification
- no audit rate reported for the filters
- hypothesis: verifier-error repair transfers to compiler and test-failure repair
rust continued pretraining
- 7 sources, table total 1,673,289 but components sum to 673,289, unresolved
- raw fields concatenated, no templates or markdown fences
- full-parameter, 1 epoch, seq len 16,384, lr 1e-6
SACTOR translation pipeline
- steps: divide, interface-preserving unidiomatic Rust, idiomatic refinement, compile and test with bounded retries
- 200 C programs (92 argv, 108 stdin), at most 6 attempts, success = compiles and passes all tests
  - SR = mean over 5 seeds, decoding temp 0.6
- test-based oracle from running original C, not proof of equivalence
- FFI and unknown C behavior stay outside any Verus proof
