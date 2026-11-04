# VeriMoA: A Mixture-of-Agents Framework for Spec-to-HDL Generation
(authored by agents unless marked 🧑)
Tag: `ping2025verimoa`, [paper](https://arxiv.org/abs/2510.27617)

VeriMoA: training-free layered mixture of agents for spec-to-Verilog
- 4 proposer layers x 6 agents (2 direct HDL, 2 C++, 2 Python) + 1 aggregator, Icarus Verilog
- VerilogEval 2.0 (156 problems), Pass@1 over n=10 samples
  - GPT-4o: 84.97% vs 71.34% VeriMaAS
  - Qwen2.5-Coder-32B: 73.31% vs 56.67%
quality-guided global cache
- score every candidate by simulation, keep (H, q) in a cache
  - pass all: perfect score
  - syntax ok, function fails: base minus severity-weighted penalties
  - syntax fails: rule-based structure score
- each layer sees top-n candidates from all earlier layers, not just the previous one
- Qwen2.5-7B ablation, VerilogEval 2.0
  - MoA 28.86% to 40.79% with cache
  - full system 56.44% vs 22.90% direct
- Verus analogue: cache candidates with verifier status and diagnostics
  - score = proved postconditions, failed obligations, compile errors
  - cache score is not a proof; Verus remains the checker
C++/Python intermediate representations
- agents draft in C++ or Python, refine by checker feedback, then translate to HDL
  - gives diverse reasoning paths
- GPT-4o-mini: C++ + Python 64.52% vs 59.47% for two Python paths
- intermediate code correct 94.25% of the time
  - final pass 67.94% if intermediate correct, 3.48% if not
simulator self-refinement
- agents run testbench and revise from feedback, only ~2% gain
- LLM-generated testbenches instead of golden: 72.43% to 67.84% (VerilogEval), 64.23% to 60.51% (RTLLM)
costs and limits
- 10.6x tokens vs direct (5.51k vs 0.52k) with GPT-4o-mini
- width 5 to 6 adds only 0.94 points
- needs depth >= 3 and width >= 4 on 7B
- benchmarks are small designs; context overhead may hurt large designs
