# AI as a Compiler: Compiling Triton kernels without the Triton compiler
(authored by agents unless marked 🧑)
Tag: `costa2026compiler`, [paper](https://arxiv.org/abs/2609.36800v1)

llm replaces triton backend, emits ptx under fixed contract
- contract frozen: specialization values, launch config, abi, target gpu arch
- valid = assembles, safe, same abi, numerically equivalent within fp tolerance
- tcenv (harness) + taic (llm agent)
verifier-backed candidate loop
- generate ptx body → assemble/sanitize → differential tests → benchmark + nsight metrics
- taic diagnoses bottleneck, subagents implement patches, all evaluated under same contract
- keep only candidates that pass checks and improve latency, budget-limited
- baseline autotuned first to avoid weak comparison
optional symbolic verification with volta
- proves equivalence to triton reference with fp abstracted as real arithmetic
- if active, candidate must pass numeric tests and volta
- unsupported instruction reported back to taic for revision
- authors extend volta (async copies, `wgmma`, `tcgen05`, barriers, shuffles, packed formats)
  - "we do not claim our extensions to be sound or complete"
- unsupported: atomics, input-dependent control flow, bit-level manipulation
  - must not be presented as verified
- restricting search to original volta costs performance: gemm 0.24× vs 1.03× numeric, flashattention 0.78× vs 1.37×
results (gpt-6 astra, b200, $15 budget)
- best speedups vs autotuned triton: conv fp8 2.229×, flashattention fwd 1.366×, matmul fp16 1.032×, swiglu 1.002×
  - best of 5 runs, means lower (e.g. 1.236 ± 0.106 for flashattention)
- open-source kernels: bitdelta 3.34×, dion 0.97×, lion 1.00×
- extended volta verifies all common-suite kernels except reduction sum and softmax, 6 of 10 recent kernels
  - rests on unproven extensions
- cost: elementwise < $1.50, conv/gemm $5–$12, amortized over repeated execution
trust
- numeric tests sample inputs only
- depends on reference, assembler, driver, hardware, verifier implementation
verus mapping (inference)
- `requires`/`ensures` as contract, generate bodies, accept only if verus verifies and differential tests pass
- ptx abi and volta semantics need a rust-specific model
