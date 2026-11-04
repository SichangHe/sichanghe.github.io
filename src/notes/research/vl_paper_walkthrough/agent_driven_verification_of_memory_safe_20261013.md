# Agent-Driven Verification of Memory Safety for liblzma Decoder Components with VST
(authored by agents unless marked 🧑)
Tag: `shlyakhtun2026agentdriven`, [paper](https://arxiv.org/abs/2608.29716)

experience report: Claude Code agents write Rocq proofs in VST (separation logic for C) for liblzma decoder
- 27 closed body theorems (22 decoder + 5 common layer)
  - each: no stuck execution in CompCert Clight, result agrees with a Rocq functional model
  - not proved: termination, total correctness, caller/callee contract compatibility
- trusted: models, specs, allocator axioms, imported contracts, Clight semantics
  - proof is of a normalized snapshot (goto, Duff's device, struct assignment rewritten), so upstream equivalence is an extra gap
- scale: 1.19M lines of Rocq, 1,595 agent sessions over 70 days (128 cores, 1 TB RAM)
  - 183k lines for `lzma_decode` alone, 42% of lines are verbatim repeats
  - one 18-conjunct well-formedness argument written 63 times: agents don't factor proofs unless told
- found undefined behavior: null pointer arithmetic on zero-input raw LZMA1 decode
- no human-only baseline, human time on models/specs/review unreported
workflow: model / spec / proof stages, humans own meaning, agents own proof
- humans write and review model and spec; any contract change goes back through human review
- Verus form: agents may not touch `spec fn`, `requires`, `ensures`, type invariants
- failed proof yields a proposed refinement, never applied by the prover
  - report: why underivable, why the state is unreachable in the code, one exact diff
  - worked example: loop invariant had to couple outer phase and child stage
    - fix was not local, 9 producer sites got new obligations
proving agent rules
- one agent, one file, may add proved helpers, never edits definitions/statements/specs
- bank unfinished goals as explicit admits so the file always compiles, never revert checked work
  - Verus form: `assume`s, closed only with no `assume`/`admit`/`external_body`
- forward-looking hand-off file (state, next steps, gotchas) spans many context windows
  - a session yields only a few hundred tactics before context runs out
- orchestrator rechecks the file itself before commit
  - contract fix: apply in a separate worktree, spawn repair agents for broken proofs, open merge request
- hooks enforce workflow mechanically
  - deny reads of ~100k-line generated goal files
  - block slow batch compiler
  - on timeout remind agent it is a proof defect, not tooling (narrow automation tactic)
  - Verus form: also reject edits touching frozen spec lines
tooling
- MCP server over rocq-lsp: goals at position, env query, speculative tactic run, incremental check
  - needed since one file takes hours and up to 20 GB
  - Verus checks are fast, so mostly unnecessary: verify one function per edit
- cut a mid-proof goal into its own lemma file for a separate agent
  - hash marker detects parent divergence; replaced by plain `eapply` at the end
  - Verus form: plain `proof fn`, divergence shows as failed precondition
- proof-speed swarm: one optimize task per file
  - most files got at least 30% faster, no file count given
  - pre-shape goals before heavy solver, extract single facts
  - Verus analogue: opaque `spec fn` + `reveal`, targeted hints
model validation
- differential test of the model against real C binary via debugger snapshots, including intermediate state
  - 6 model bugs found before proving
  - Verus form: needs runnable twin of `spec fn`
  - shows model matches implementation, not that the model is the intended behavior
source normalization
- build-intercepted translation: compiler wrapper in CMake gives real defines and include paths
- macro that duplicates code expanded 32 times, ~65% of body: duplication multiplies proof size
- Verus form: agent-written code is in the subset from the start, so no equivalence gap
- per-field focus/unfocus lemmas for a 29-field struct, only sped up intermediate versions
