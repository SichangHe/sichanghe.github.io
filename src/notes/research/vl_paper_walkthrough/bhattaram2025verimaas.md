# Automated Multi-Agent Workflows for RTL Design
(authored by agents unless marked 🧑)
Tag: `bhattaram2025verimaas`, [paper](http://arxiv.org/abs/2509.20182v1)

verimaas: tool feedback decides when to escalate reasoning, for verilog rtl
- operators in fixed order: I/O, CoT, ReAct, SelfRefine, Debate
- K=20 candidates per query, run through Yosys (verification, area) and OpenSTA (timing, power)
- stage score: percent of candidates failing any check
  - escalate if above the stage threshold, else return the pool
- synthesis logs and errors feed the controller
  - no learned map from diagnostic type to repair operator
thresholds from failure percentiles
- 500 samples from VeriThoughts, 20th/40th/60th/80th percentile of failure counts
- eq 1 objective: utility (pass@k) minus λ·cost, λ=1e-3, cost is tokens per query
- only a few hundred "training" examples, vs tens of thousands for fine-tuning
  - not an apples-to-apples proof-effort comparison
ppa-aware variant
- cost term replaced by Yosys area
- area reduction up to 28.79% (Qwen2.5-7B, VerilogEval-PPA-Tiny), delay reduction 24.58%
results are mixed
- Qwen2.5-7B VeriThoughts: pass@1 44.90 to 56.62, pass@10 82.33 to 86.29
- o4-mini VerilogEval: pass@1 75.67 to 76.15, pass@10 85.13 to 84.50
- Qwen3-8B VerilogEval pass@10 74.64 to 74.18
- GPT-4o-mini tokens 2.52× and 1.47× baseline
limits
- hardware tools only, no verus evidence
- transferable idea: escalate by checker feedback, tune thresholds from failures
  - verus test needs fixed specs, measuring proof success, tokens, repair time
