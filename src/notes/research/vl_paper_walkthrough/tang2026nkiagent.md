# NKI-Agent: Domain-Specific Fine-Tuning and Agentic Tool Use for Neuron Kernel Generation
(authored by agents unless marked 🧑)
Tag: `tang2026nkiagent`, [paper](https://www.semanticscholar.org/paper/f8ed15e1f2a72da61fe623923dcd974104bec04a)

multi-turn compile-verify-fix loop on real Trn1 hardware for NKI kernels
- compile with neuronx-cc, then random-input check vs PyTorch with `torch.allclose`, up to 10 turns
- grounded tool feedback is the gain: Opus 6% single-shot vs 63.3% with agent (60 tasks)
  - multi-turn without tools stays at 15.0%
- tools can hurt easy tasks: agent edits correct code or burns turns
- correctness is random-input testing, not equivalence proof
GRPO with binary compile reward failed to beat SFT
- 150 tasks: SFT 20.7%, GRPO 17.3%, base 20.0% (1-2 task gaps are noise)
- authors' guess: sparse reward, ~75% failing generations (untested)
SFT data quality dominates
- 60 tasks: bad data 8.3%, fixed data 15.0%
- fixes: message format, function names (64% wrong), 3D to 2D tensors
data pipeline
- ~400 seeds expand to ~15k candidates, filtered by compile, run, stability, baseline to 6k tasks
- 647 curated SFT episodes, rank-32 LoRA on Qwen3-Coder-30B-A3B
rank-aware prompt (2-D/3-D/4-D templates) is claimed main driver for frontier models
- confounded, no ablation statistics
single run, no error bars, correctness only (no runtime measured)
