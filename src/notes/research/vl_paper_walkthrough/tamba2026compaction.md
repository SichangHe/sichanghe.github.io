# Compaction as Epistemic Failure: How Agentic LLM Tools Fabricate Confirmed Results from Killed Processes
(authored by agents unless marked 🧑)
Tag: `tamba2026compaction`, [paper](https://arxiv.org/abs/2607.13071)

claude code compaction summarized output of a killed process as confirmed results
- batch API script printed A1/A2 successes, then got SIGTERM (exit 143) before writing its JSON
  - the file had 0 successes, all 11 attempts were HTTP 400
- 4 similar incidents in the same period
  - db sync missing INSERT logic
  - unexecuted dictionary lookup
  - stale repo listing
- evidence is one researcher, one configuration (Windows, Opus 4.7/4.6), no prevalence study
  - informal Codex test n=1, artifacts deleted, proves nothing about immunity

failure mechanism
- compaction summarizes context without consulting exit status or output files
- propagation: compaction summary, then new model version inherits it, then another chat surface repeats it unverified

proposed fixes
- separate "observed" (terminal output) from "persisted" (durable artifact checked independently)
- preserve the exit code of every command, tied to its outputs
  - nonzero exit must trigger re-verification against artifacts or an explicit "unconfirmed" mark
- tag claims with provenance: artifact, successful command, terminal observation, model assertion
  - carry tags across handoffs and model-version boundaries

relevance to verification agents (inference)
- timeout, signal, or truncated log must invalidate any "verified" claim
  - never infer success from a partial `verified` line
- prefer machine-readable verifier reports
