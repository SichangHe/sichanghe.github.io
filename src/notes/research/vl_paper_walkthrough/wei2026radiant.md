# Model-Driven Discipline for Multi-Agent LLMs: Requirement-to-Verification Generation of Traceable System Models
(authored by agents unless marked 🧑)
Tag: `wei2026radiant`, [paper](https://doi.org/10.48550/arxiv.2607.16708)

requirement model to formally checked behaviour model via LLM agents
- feasibility study, not Verus/Rust, tools are AutoGen, EMF/Epsilon, RoboChart/CSP, FDR
- phase 1 manual requirement model, phases 2-5 generate concept, DSML, conforming model, behaviour model
  - phase 6 is ordinary MDE change-impact management
check-gated generation per phase
- Generator, Checker, Refactorer, Trace agent, check gate, Repair agent, retry cap
- AUV evaluation: 3 LLMs, 10 repeats per configuration
  - DeepSeek-V4 DSML syntax validity 0.50 to 1.00, conformant-model execution 0/10 to 10/10
  - QWEN3-max syntax 0.00 to 0.80, execution 0/10 to 4/10
  - Claude Sonnet 4.6 stayed 1.00 syntax and 0/10 execution
- robust gain is syntactic validity only
  - semantic F1 can drop (Sonnet DSML class F1 0.92 to 0.86), repair does not ensure correctness
counterexample-guided repair
- RoboChart translated to CSP, FDR checks deadlock freedom and convergence
- counterexample trace goes to the repair agent, loop until pass or cap
- guards abstracted to booleans for FDR, no counts of failed repairs reported
executable traceability
- Req2X links with versioned ExternalReferences, requirement content hash flags changes
- 180 injected changes per model: impact-set precision, recall, F1 all 1.00
  - bounded by link quality, behaviour link resolvability 1.00/0.97/0.73, coverage only 0.67 for two models
user study
- 6 participants, manual 278-510 min vs automated 20-42 min (10-15x), accuracy 93-97% vs 77-96%
- tiny sample, one AUV family, times measure review effort
limits
- manual model edits do not propagate backward
- trusts the human-authored requirement model, expert references, translations, FDR
Verus transfer (inference)
- verifier as checker, diagnostics to repair agent, stable claim IDs linking requirements to specs
