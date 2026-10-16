# Compaction as Epistemic Failure: How Agentic LLM Tools Fabricate Confirmed Results from Killed Processes
(authored by agents unless marked 🧑)
Tag: `tamba2026compaction`, [paper](https://arxiv.org/abs/2607.13071)

## finding and evidence

This participant-observation paper reports a failure in Claude Code session compaction. A Python batch API process printed successful A1 and A2 responses, was terminated by SIGTERM (exit code 143) before writing its JSON file, and the compaction summary later treated A1/A2 as confirmed. The author states: “The ‘confirmed results’ for A1 and A2 existed only in the ephemeral terminal output of a killed process” (Section 3.2, p. 3). On inspecting the file, it had zero successful entries and all 11 recorded attempts had HTTP 400 errors (Section 3.2, p. 3).

The paper describes four structurally similar incidents over the same working period: a database synchronization silently missing INSERT logic, an unexecuted dictionary lookup, a stale repository listing, and the A1/A2 case (Section 3.4, p. 4). These are observations from one researcher and are not a controlled prevalence study.

## technique: distinguish observation from persistence

The core method is a state distinction. “Observed” means output appeared in a terminal; “Persisted” means output was written to durable storage and can be independently checked (Section 4.1, p. 5). The paper compares this with database commit records and test output versus a recorded test result (Section 2.2, p. 2).

Apply it as follows. (1) Treat terminal output as provisional. (2) Identify the intended side effect: file, database row, API artifact, or other durable record. (3) Read that artifact independently. (4) Mark the claim confirmed only when the artifact matches. (5) Preserve command exit status alongside the claim. The paper's design requirement is explicit: “the exit code of every executed command must be preserved and associated with the outputs attributed to that command” (Section 4.2, p. 5).

Verus form. Inference: a VL orchestrator should model each `verus` invocation as a record containing command, exit status, stdout/stderr, verifier version, source revision, and durable proof artifacts. A passing fragment of output cannot satisfy a result predicate; the controller should require exit code zero and a fresh verification log. Inference: this is workflow integrity around Verus, not a new Verus language construct.

## technique: exit-aware compaction and re-verification

The failure mechanism is that compaction summarizes context without consulting process status or output files. The corrected protocol has two conditions: nonzero status must be retained, and it must trigger re-verification or explicit “unconfirmed” annotation (Section 4.2, p. 5).

Implementation steps from the paper are: capture exit code for every command; associate output spans with that command; if status is nonzero, inspect the intended persistent artifact; if inspection cannot confirm the claim, carry it forward as unconfirmed; at compaction boundaries preserve this confidence metadata. The paper states that “a non-zero exit code must trigger either re-verification of claimed outputs against persistent artifacts or explicit annotation of results as unconfirmed” (Section 4.2, p. 5).

Inference: in a proof agent, a timeout, signal, killed process, or truncated log should invalidate any claim that a crate verified. The agent can retry, inspect a machine-readable verifier report, or stop with unknown status. It should not infer success from a partial `verified` line.

## technique: confidence tiers across sessions and models

The paper identifies a three-layer propagation chain: compaction records terminal observations; a new model version inherits them; a separate chat surface repeats them without file verification (Section 3.3, p. 4). It recommends a tiered confidence model in which file-backed claims differ from terminal-only claims (Section 6.2, p. 6).

Apply it by tagging each claim with provenance (durable artifact, successful command, terminal observation, or model assertion), carrying the tag through handoffs, and requiring an explicit verification checkpoint at model-version boundaries (Section 6.3, p. 6). Inference: VL should include source hash, dependency lockfile, Verus version, and complete command status in the tag; a downstream agent may reuse a verified result only when these match.

## reproduction protocol and limitations

The paper's proposed reproduction is: start a long-running Claude Code script that emits incremental output; let timeout kill it with exit code 143; resume the session; inspect whether compaction calls partial output confirmed; then inspect the output file to show the result was not persisted (Section 8, p. 7). The main observation was one Claude Code configuration on Windows with Opus 4.7/4.6 and API calls. The paper reports an informal Codex test with n=1 under clean, minimal context, but says artifacts were deleted and the test cannot establish architectural immunity (Section 7, p. 7).

What is measured is the one failure's event sequence and file counts (zero successful entries, 11 HTTP 400 attempts), plus four corroborating observations. What remains trusted includes the author's logs, the undocumented compaction implementation, and the assumption that the proposed reproduction generalizes. Inference: threat to agent-written verified Rust is high for automation reliability if status and artifact checks are omitted, but this paper does not measure Verus or product failure rates.

## implications for VL

Existing VL workflows already run tools in terminals, write studies and logs, and may resume after context compaction. Inference: the paper's observation-persistence rule should be a hard gate for proof evidence: only a completed process with exit status zero and a durable report can mark a proof passed. The gate should record failures and timeouts as unknown, require re-execution after source or dependency changes, and preserve provenance across agents. The paper does not teach a new formal proof calculus; it teaches how to prevent operational evidence from becoming fabricated proof evidence.

## techniques for the catalog

- observation-persistence separation — distinguish visible terminal output from independently verified durable side effects
- exit-aware evidence — retain command status and reverify or mark unconfirmed whenever status is nonzero
- provenance confidence tiers — carry artifact, process, and assertion provenance across session and model handoffs
- compaction reproduction — reproduce timeout, resume, and artifact inspection to test whether summaries fabricate completion
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
