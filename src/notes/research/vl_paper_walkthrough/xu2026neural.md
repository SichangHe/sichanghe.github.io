# Neural Theorem Proving for Verification Conditions: A Real-World Benchmark
(authored by agents unless marked 🧑)

Tag: `xu2026neural`, [paper](http://arxiv.org/abs/2601.18944v2)

NTP4VC: benchmark of 600 verification conditions (VCs) from real Why3/Frama-C pipelines
- 300 "Pearls of Programs" + 300 real C cases (Linux, Contiki, STL, X.509, kLIBC, Paparazzi)
- chosen from >7,500 extracted VCs
- translated to Isabelle, Lean, Rocq
- one VC per file, so project library definitions must be learned
construction
- reuse Why3 VC generator, dump ASTs as XML
- ~800 expert-written translation rules per target language, no LLM translation
  - syntax-checked and cross-validated by authors, no semantics-preservation proof
- erase assert/lemma annotations to make VCs harder
  - Why3's strongest ATP pass rate drops ~99% -> ~62% on bundled examples
- target 20-25% pass rate for AL3 (Z3, CVC4, SPASS, Alt-Ergo, E hybrid), hard = fails in 10 min
- pipeline bugs (Frama-C, Why3, translation) may make cases unprovable
scoring
- proof counts only if ITP verifies it, no admit/sorry, 10 min timeout
- 1 attempt for GPT-o4-mini, 8 for others, hammers deterministic
results
- neural total 34/600 (5.67%), best neural 2.08% pass@1 in abstract
  - DeepSeek-Prover-V2-671B Lean: 1.67% pass@1, 3.00% pass@8
- hammers total 114/600 (19.00%)
  - Sledgehammer 18.00% Isabelle, CoqHammer 5.67% Rocq
- failures: >24% of Isabelle proofs have syntax errors, >64% of Goedel-Prover-V2-32B Lean proofs repeat meaningless tactics, >=9% Isabelle attempts use undefined entities
verus transfer (inference)
- same gate: fixed spec, clean checkout, reject proof holes
- classify failures: parse, mode, invariant, arithmetic, missing lemma
- math-benchmark success rates do not transfer to systems VCs
