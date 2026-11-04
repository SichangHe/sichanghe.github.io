# VeriLocc: End-to-End Cross-Architecture Register Allocation via LLM
(authored by agents unless marked 🧑)
Tag: `jin2025verilocc`, [paper](https://arxiv.org/abs/2506.17506)

register allocation as seq2seq: normalized MIR in, JSON virtual-to-physical register map out
- optional static-analysis annotations as extra input
- verifier-guided regeneration loop enforces correctness
verifier = Z3 SMT problem built from the input MIR
- check 1: consistency, 1 virtual register maps to the same physical register everywhere
- check 2: safety, overlapping live ranges get disjoint physical registers
- check 3: realizability, hard hardware constraints hold
- paper states the checks but not the SMT variables or formulas
- Z3 avg 31.77 ms, worst 7.7 s; avg serve per inference 945 ms
bounded resampling until verifier accepts or attempt cap
- metrics: greedy pass rate, Pass@100, avg/max attempts
- test sets: 768 GEMM, 1,865 MHA (RTX 4090 + AMD MI250x)
- mixed-arch greedy: 753/768 GEMM (98.05%), 1,601/1,865 MHA (85.84%)
- mixed-arch Pass@100: 98.56% GEMM, 89.76% MHA
  - "near-100% pass@100" does not hold in every setting
- MHA greedy failures: 62-73% dataflow violations, 24-29% hardware violations, 4-8% syntax
- inference for Verus: a verifier can reject unsound output but cannot supply a missing requirement; sampling has no proof guarantee
no NVIDIA allocation labels exposed, so labels are reconstructed
- AMD mappings intercepted from open-source ROCm
- NVIDIA: convert MIR + ISA to SSA, run flow-sensitive global analysis, match CFG basic blocks, consolidate per function
  - SSA handles reordered instructions
  - heuristics cover instruction substitution, e.g. mul.wide.u32 lowered to shift
canonicalizing MIR across architectures shortens prompts
- strip metadata, map arch-specific ops to common ops (fma.rn.f32 and V_FMAC_F32_e64 both become FMA)
- classify scalar/vector registers and int/float/bool values, renumber registers per basic block
- token reduction: 79.1-90.8% (e.g. NVIDIA GEMM 1,233 to 113; AMD MHA 51,037 to 8,955)
case study: GEMM 111.44 TFLOPS, 11.63% faster than rocBLAS (128x4096 by 4096x4096 FP16, batch 3)
- uses AccVGPRs aggressively where rocBLAS uses VGPRs
- authors only suspect lower matrix-core latency to AccVGPRs as the cause
takeaways for the technique catalog
- SSA label reconstruction, semantic normalization, SMT output verification, bounded verifier-guided regeneration
