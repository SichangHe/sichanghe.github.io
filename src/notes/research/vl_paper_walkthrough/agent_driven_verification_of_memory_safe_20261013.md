# Agent-Driven Verification of Memory Safety for liblzma Decoder Components with VST
(authored by agents unless marked 🧑)
Tag: `shlyakhtun2026agentdriven`, [paper](https://arxiv.org/abs/2608.29716)

Audit: audited 2026-10-13 against the paper; checked every number, page and quotation, the steps of techniques 1-11, the line inventory sums and Table 2 row count; fixed an unmarked inference on prompts, pass for exceed on the 300-second timeout, struct-copy expansion widened to macros only, 1,595 sessions not tied to lzma_decode, the Normalize/IsMatch gap given as an order effect alone, and the allocator-wrapper reading; Verus statements on external_body and Verus check times unchecked.

source: Shlyakhtun, Gryzlov, Kukharenko, Nesterov, Vasiliev, Ziborov, Zolotarev, Pokras (GenProof; IMDEA), arXiv:2608.29716v1, 30 Aug 2026; 22 pages with appendices A-D. Page numbers are the running-head ones.

earlier note: /ssd1/sichanghe.github.io/src/notes/research/topic_studies/formal_verification_rust/llm_for_verification/c_and_systems_proofs.md has a ten-line summary (27 bodies, transformed snapshot, assumed allocator, 1,595 sessions, no human baseline). This study adds the techniques, their steps and the size accounting.

## the result and its boundary

The paper is an experience report: agents (Claude Code) wrote Rocq proof scripts in VST, a separation logic for C whose proofs are checked by the Rocq kernel, for existing decoder functions of liblzma. The division of labour in the paper's words: “AI agents complete proof goals and propose refinements; humans write and review models and specifications, and approve semantic changes; the Rocq kernel checks the proof terms.” (Abstract, p.1).

proved: one theorem per C function body (27 of them: 22 in the decoder scope, 5 supporting common-layer functions; Section 6.2, p.14). What one such theorem says (Section 2.1, p.3): “Under the funspec precondition and imported contracts, a closed semax body theorem establishes that execution cannot get stuck in the CompCert Clight operational semantics.” If the function returns, its result agrees with a functional model written in Rocq.

not proved, per the paper: “It does not by itself establish termination, total correctness, trace refinement, or compatibility between separately maintained caller and callee contracts.” (Section 2.1, p.3).

trusted or assumed:
- the models and function specifications, written and approved by humans
- that the verified source equals upstream: the proof is of a transformed snapshot (goto, struct assignment and Duff's device rewritten, Section 5.3), and the paper says “applying the result to upstream liblzma additionally requires source equivalence” (Section 6.4, p.16)
- the allocator: “The project-local assumptions are concentrated in the memory-allocation interface: the malloc and free body lemmas are declared as Rocq Parameters, and an axiom (mem mgr rep) introduces the memory-manager predicate.” (Section 6.2, p.16)
- imported contracts, including VST's `memcpy` specification and one placeholder specification for `lz_decoder_end` left in the outer module's environment (Section 6.2, p.16)
- the precondition of `lzma_decode`, which excludes the zero-input call where the undefined behaviour was found (Section 6.4, p.16)
- CompCert's Clight semantics as the meaning of C, and the standard axioms that come with VST
- excluded code: the .xz container and stream layer, the filter framework, index machinery, all encoders (Section 2.2, p.4)

## technique 1: three stages with a human gate on meaning

what it is: split the work into Model (executable Rocq definitions of a routine's abstract state and transition), Spec (representation predicates tying model values to C structs and buffers, plus a pre/postcondition requiring the C outcome to agree with the model), and Proof. Agents own only Proof. Any change to Model or Spec passes human review.

when to use it: whenever an agent that can edit the contract could make the proof pass by weakening it.

how it is done (Section 3.1, pp.5-6):
1. a human writes the functional model, e.g. the LZMA2 model holds the framing phase, dictionary and remaining input as values, and the model function maps a state to a return code and successor state
2. a human writes the specification on top of the model
3. proof agents discharge the body obligations by symbolic execution and entailment solving
4. a failed proof may yield a proposed refinement; it goes back through review: “Humans review and approve the models and funspecs; a proof failure may produce a proposed refinement, but it returns through the same review gate rather than being applied by the proving agent.” (p.5)
5. review is organized by artifact: model, specification and body-proof contributors each review changes to their stage against the C source and neighbouring artifacts (pp.5-6)

Verus form. Inference: Model = `spec fn` definitions over `Seq`, `Map` and plain data types; Spec = a `View` implementation or a `closed spec fn inv(&self) -> bool` relating the Rust struct to the model, plus `requires` and `ensures` on the executable function that mention the model function; Proof = function-body annotations (`invariant`, `decreases`, `assert ... by`) and `proof fn` helpers. The gate becomes a file or diff rule: agents may not touch `spec fn` bodies, `requires`, `ensures` or type invariants. What does not carry over: in VST the representation predicate also carries memory ownership; in safe Rust the type system does that, so the Spec stage is smaller.

evidence: one traced refinement (technique 4). The paper has no count of proposals made, accepted or rejected.

## technique 2: a proving agent with single-file scope, frozen statements and banked progress

what it is: a subagent role with hard limits, given verbatim in Appendix A (pp.19-20).

the rules (Section 3.2, p.7; Appendix A):
1. one agent, one proof file; it works on that file's open `admit`s and edits nothing else
2. it may add helper lemmas, which must be proved; it may never change a definition, a theorem statement or a specification
3. it keeps the file compiling at all times by leaving unfinished subgoals as explicit `admit`s, and never reverts checked work: “It banks verified work behind explicit, provable admits so the file always compiles, and validated progress is never reverted to restore a clean baseline.” (p.7)
4. it first reads a hand-off file and keeps it updated; the file is forward-looking (state, next steps, gotchas, no diary)
5. it cannot commit
6. it ends in one of three states: goals closed; progress banked and hand-off updated; or goal judged unprovable as stated, in which case it reports one concrete contract fix with an exact diff, why it is unavoidable and why it holds of the C code, without applying it (pp.7-8)
7. the orchestrator's context line to the agent says what changed and what is now available, not which tactics to run (Appendix A: “orient, don’t prescribe”)

the prompt's own wording of rule 6 (Appendix A, p.20): `If a goal is unprovable, work out WHY and report ONE concrete fix -- do NOT apply it.`

Verus form. Inference: one agent per Rust module or per function; unfinished obligations are banked as `assume(...)` statements placed exactly where the open fact is needed (the Verus counterpart of an explicit `admit`), so the file verifies after every step and the remaining work is the list of `assume`s. A function counts as closed only when it contains no `assume`, no `admit()` and no `#[verifier::external_body]`. Helper `proof fn`s are allowed; `requires`/`ensures` of the target and `spec fn` definitions are frozen. The hand-off file and the three end states carry over unchanged.

limits: the paper reports that agents occasionally break the intended workflow “out of confusion”, which is why it enforces key rules with hooks (technique 6). Inference: this suggests the prompt rules alone were not enough, but the paper does not say so.

## technique 3: orchestrator that rechecks and routes contract fixes

how it is done (Section 3.2, Orchestration, p.8):
1. an orchestrator agent spawns proving subagents per file and keeps the high-level view; the stated reason is context size: “a typical session produces a few hundred new tactics before exhausting its context window, so a large proof is closed over many hand-off-chained sessions”
2. when a subagent stops, the orchestrator rechecks the file itself with the incremental checker and commits what passed
3. when a subagent reports a contract fix, the orchestrator applies it in a separate worktree, rebuilds, spawns repair subagents for the proofs that break, and opens a merge request for the human

Verus form. Inference: identical in shape; step 2 is a Verus run on the module by a process other than the one that wrote it, step 3 gives the reviewer the specification diff together with evidence that every dependent proof was repaired under it.

## technique 4: report-only handling of an invariant gap, then multi-site repair

what it is: the worked example of the gate (Section 4, pp.9-11; Appendix B, pp.20-21).

the setting: the LZMA2 framing loop has an outer phase (`sequence`, with a `next_sequence` remembered across partial headers) and an embedded LZMA1 child whose initialization stage the model records with four constructors (`NoChild`, `Raw`, `Sized`, `DecodeReady`). The loop invariant must couple the two, because treating them independently admits states no execution reaches. The paper lists four coupling clauses (a)-(d), each stated with the unreachable state it excludes (p.10), e.g. (b): “A Sized child is never in the Lzma or Copy sequence.”

the episode:
1. in the `Compressed1` branch an agent reached an obligation needing `next_sequence <> Copy` when the child was `Sized`; the invariant's `Copy` alternative carried no stage constraint
2. the agent stopped and reported three things: why the goal is not derivable, why the state is unreachable in the C code, and a candidate strengthening it did not apply (p.10)
3. the specification owner reviewed the reachability argument and approved the stronger clause
4. the change was not local: “The change was not local: every producer of the invariant acquired a new obligation.” (p.10); agents re-established the clause at nine producer sites and at its consumers
5. the same gap reappeared on the uncompressed-copy paths and went through the same process (Appendix B, p.21)

the accepted clause (Appendix B, p.21): `view next_sequence coder = Copy /\ stage <> Lzma1Sized /\ (view sequence coder = Compressed0 \/ view sequence coder = Compressed1)`, one conjunct before, three after.

Verus form. Inference: the coupling is a boolean `spec fn` over two enum-valued fields, used in the loop's `invariant` clause or as a `#[verifier::type_invariant]`. When an agent's `assert` of an unreachable-state fact fails although the code never produces that state, the invariant is too weak; the agent writes the three-part report instead of editing the invariant. Strengthening a shared invariant in Verus has the same cost as here: every site that re-establishes it (each loop back-edge, each function that `ensures` it) gets a new obligation.

lesson stated by the paper: a stuck goal is first triaged as proof work or possible specification gap (p.10).

## technique 5: interactive, incremental checking through a tool server

the problem (Section 3.2, p.6): one file can take hours and up to 20 GB of RAM to elaborate, so edit-and-recompile from the top is unusable. Four requirements are named: reuse the checked prefix; keep the backend alive; let it free memory without dropping its cache; let a proof be split across files.

how it is done: an MCP server (a fork of LLM4Rocq's rocq-mcp, driving rocq-lsp directly) exposing, among others, four tools the agents used most (p.6): get the goals at a position; query the environment for lemmas, types and definitions; run a tactic block speculatively at a position without changing the file; check the file incrementally, optionally only up to a position. A finished check can be saved as a snapshot that a new session reloads in seconds. Table 1 (p.7) lists what the fork adds over upstream: check up to a point, save compiled output from the interactive session, cache trim on high memory use, timeouts that keep the session warm, per-sentence timing; it drops the upstream's Gym-like tactic exploration.

Verus form. Inference: Verus has no goal state and no tactic stepping, so "get state" and "step" have no direct counterpart; the nearest is inserting a temporary `assert` and re-verifying one function. The requirement that transfers is cost control: verify only the function under edit, and keep whole-crate runs for the orchestrator's recheck. Verus checks are seconds to minutes per function, not hours, so the warm-cache machinery is mostly unnecessary.

## technique 6: hooks that enforce the workflow mechanically

what it is: scripts the harness runs before or after a tool call, to block it or attach a reminder. Three are reported as most useful (Section 3.2, p.8):
1. deny reading or editing the roughly 100k-line generated goal files, which only consume context
2. block the slow batch compiler and require confirmation before `make`, so agents stay on the incremental path
3. on a proof-checking timeout, attach a reminder that the timeout is a defect of the proof, not of the tooling: “One addresses a recurring misdiagnosis: agents sometimes treated a proof-checking timeout as a tooling failure and tried to route around it, so a reminder clarifies that the timeout is a real problem in the proof, which agents then fix, typically by replacing an over-broad automation tactic with a more targeted one.”

Verus form. Inference: (1) keep generated or vendored files unreadable to proof agents; (2) block whole-workspace verification from proving agents; (3) on a Verus resource-limit or timeout result, remind the agent that the fix is in the proof: narrow the solver's work with a targeted `assert(...) by(nonlinear_arith)` or `by(bit_vector)` with explicit `requires`, move reasoning into a `proof fn`, mark a `spec fn` opaque and `reveal` it where needed, or drop a broad `broadcast use`. A fourth hook follows from technique 2: reject edits that touch frozen specification lines.

## technique 7: cut a mid-proof goal out into its own file

why (Section 3.2, p.7): inside one huge body proof, a helper lemma near the top is invisible to the main proof until the prefix is re-elaborated; the prover holds all other goals in memory; one file allows one agent. VST offers no natural place to cut, since a mid-proof goal carries its whole symbolic-execution context.

how it is done:
1. at a chosen point the tool reads the goal from the live session
2. it writes two files: the goal as a definition with its hypotheses lifted under universal quantifiers, and a lemma skeleton whose first proof state equals the state at that point
3. agents treat the definition (which can exceed 100,000 lines) as opaque and work on the skeleton
4. a separate agent proves the lemma in its own file with its own cache
5. the parent applies it with a single `eapply`
6. the cut point carries a marker that hashes the parent goal and detects divergence; before the body is counted closed the marker is replaced by a plain application of the lemma, so the final proof depends on neither marker nor plugin (p.7)

Verus form. Inference: this is ordinary in Verus and needs no tool: state the fact as a `proof fn` whose `requires` are the hypotheses in scope and whose `ensures` is the goal, call it from the body, and give it to another agent. The risk the paper's hash marker addresses exists in Verus in a different form: if the parent's invariant changes, the extracted `proof fn` may still verify but its `requires` no longer hold at the call site, which Verus reports as a failed precondition there. So divergence is detected by the verifier, not by a hash.

evidence: `lzma_decode` was closed as one body file plus 28 extracted proof files; the generated goal statements total 775,768 lines (Section 6.2, p.14).

## technique 8: agents that make finished proofs faster to check

orchestration (Section 3.3, pp.8-9): one “optimize file X” task per file in a task tracker; a script repeatedly spawns an optimizing agent on each unblocked task; the agent profiles, refactors and files follow-up tasks. Reported outcome, without a file count: “Most files optimized this way became at least 30% faster to check in wall-clock time.”

patterns the agents found (p.9):
- reshape the goal before a heavyweight solver runs; the grouping of pure conjuncts that the entailment solver leaves is unstable, so adding one conjunct to a loop invariant can break a script written against the old shape. Repair: inspect the resulting goal and script against it, or use shape-insensitive discharge
- cold-cache time: a tactic instantaneous on a warm cache can exceed a 300-second sentence timeout cold, which an agent misdiagnoses as a logic failure
- countermeasures: do a few rewrites before the solver so it has almost nothing left; extract one pure fact instead of running the full solver; never reduce a whole model function, unfold one step and rewrite under control. Effect claimed: individual tactic calls from 40 s or more to under a second
- a field read from a large nested record cost 40 s or more per access because the library's load tactic reduced through the whole record type; an agent rebound that tactic to use a once-proved equality when present and fall back otherwise, without modifying VST or the specification

Verus form. Inference: the analogue is proof stabilization and speed-up after first success: profile per function, then replace broad automation by targeted hints, hide definitions the solver need not unfold (opaque `spec fn` plus `reveal`), and prove a fact once in a `proof fn` instead of re-deriving it at each use. The instability described for conjunct grouping corresponds to SMT proof brittleness under small edits. The tactic rebinding has no Verus counterpart.

## technique 9: test the model against real executions before proving

what it is: differential testing of the hand-written functional model against the configured C binary, call by call, including intermediate state (Section 5.2, pp.11-12).

why intermediate state: “This matters for a resumable decoder: matching final output may not reveal an incorrect intermediate range-coder or dictionary state that affects a later call.” (p.11)

how it is done:
1. script the debugger (LLDB) to break at entry to and return from `lzma_decode`
2. a Python handler reads the live buffers and structs and lifts them to the model's representation through a mapping from C layouts
3. vary buffer sizes to force both complete calls and suspend-then-resume
4. write snapshots as JSONL, generate a Rocq module from them
5. run the model on the recorded inputs inside Rocq and compare with the recorded outcome
6. a mismatch names the call and transition

evidence: six corrective commits to the model (probability-table offsets, the dictionary position used for `pos_state`, literal and repetition tracking, range-coder state across normalization on resumable paths, stopping behaviour), all found before the corresponding body proof was built (Section 5.2, p.12).

Verus form. Inference: a `spec fn` model is not executable, so this needs a runnable twin of the model (plain Rust mirroring the `spec fn`) or an executable function proved equal to it; then record entry and exit states of the real implementation under tests or fuzzing and compare. The value is the same: a wrong model is found in minutes by testing, instead of after an agent has spent days failing to prove, or worse, after the code has been bent to fit it. What it does not give: assurance that the model is the intended behaviour; it only shows model and implementation agree on the runs tried.

## technique 10: normalize the source to the verifier's subset, and prove through the build configuration

build-aware translation (Section 5.1, p.11): run the project's CMake with a compiler wrapper that lets feature probes compile with CompCert and replaces each real compilation with the Clight generator, passing that unit's defines and include paths. No separate list of flags is maintained.

source changes (Section 5.3, pp.12-13):
- anonymous structs given tags, so generated types have stable names
- a translation-only harness that references static-inline functions so their bodies are emitted
- struct assignments expanded fieldwise: initialization copies by macros, the local dictionary and range-decoder copies directly
- the `goto out` in `lzma_decode` replaced by a macro that saves state and returns
- Duff's device replaced by an explicit state-machine dispatch
- the deliberate index −1 pointer arithmetic left unchanged and reasoned about with raw offsets, since CompCert permits forming such pointers

cost of the normalization, measured by the paper (Section 6.2, p.15): the state-save macro expands 32 times, about 55 statement nodes each, about 65% of the compiled body (32 × 55 = 1,760 of 2,717 nodes = 64.8%, consistent); for each expansion the proof re-establishes the full postcondition from a mid-symbol state.

Verus form. Inference: Verus accepts a subset of Rust, so the same step exists (rewrite unsupported constructs, or wrap them behind `#[verifier::external_body]` with a specification, which then is trusted). The paper's two lessons transfer: every such rewrite puts a source-equivalence gap between what is proved and what ships, and a rewrite that duplicates code (their macro) multiplies proof size. For agent-written code the gap disappears, because the code is written in the subset from the start.

## technique 11: per-field focus on a large struct

what it is (Appendix C, p.21): a per-field predicate, a whole-struct predicate parameterized by the list of fields currently taken out, and two lemmas, focus and unfocus, that move one field out and back. A proof touching one field of the 29-field decoder struct keeps the other fields as one framed predicate. The paper notes the final proof does not use it; it sped up intermediate versions.

Verus form. Inference: for ordinary Rust structs the borrow checker already frames untouched fields. The pattern matters only where ghost permissions model raw memory, by splitting one permission per field and rejoining.

## size and effort figures

- line inventory (Section 6.2, p.14): 1,187,329 lines of Rocq other than generated program syntax = 1,042,399 code + 120,286 comments + 24,644 blank (sums correctly). The code lines: 775,768 generated goal statements; 183,268 `lzma_decode` body and its 28 extracted proofs; 39,760 helper libraries for those; 34,077 other body proofs and glue; 5,314 specifications; 3,684 models and a range-decoder well-formedness development; 528 infrastructure (sums to 1,042,399)
- proof-size accounting: main lemmas only, 101,854 proof lines for the 338-line `lzma_decode` and 4,590 for the 98-line `lzma2_decode`; per Clight statement node 37.5 and 38.3 (2,717 and 120 nodes; both divisions check) (Section 6.2, pp.14-15)
- what the proof lines are (p.16): about 2% of lines in the 28 extracted proofs are symbolic-execution steps; about 42% belong to blocks repeated verbatim across proofs; “The largest source of repetition is an 18-conjunct decoder-state well-formedness argument, written out 63 times to re-establish the loop invariant.”
- Normalize against IsMatch (Appendix D, p.22): the `Normalize` case took six extracted files and 16,957 main-lemma lines against 10,071 for the byte-identical fall-through `IsMatch` case. The paper gives two sources of the extra lines: a case split on `might_finish_without_eopm`, and each extracted exit path re-establishing the full postcondition. It also notes that the six `Normalize` proofs were developed first, while the loop invariants were still being settled, and the other 22 later as single goals
- effort (Section 6.3, p.16): 1,595 agent sessions over the 70-day `lzma_decode` development interval, one machine with 128 cores and 1 TB RAM. The paper declines to turn this into cost: “These figures characterize scale and observed outcomes, not human effort or labor savings; no human-only baseline is available.”
- defect found (Section 6.1, p.14): in raw LZMA1 decoding with zero input, a macro adds zero to a null pointer and another subtracts two null pointers, undefined under the C standard text the paper uses

Inference: the 42% verbatim repetition and the 63 copies of one argument show agents not factoring proofs unless told to; a human would have stated that argument once as a lemma. For Verus agents the corresponding rule is to put any repeated invariant re-establishment in a `proof fn`.

## places where the text is unclear or uneven

- sessions: the introduction says proof construction “spanned 1,595 agent sessions over 70 days”, while Section 6.3 and the conclusion tie the 1,595 sessions to the `lzma_decode` development. Whether the other 26 bodies are inside that count is not stated.
- 22 versus 27: the introduction and conclusion count 22 closed bodies (decoder scope), the abstract and Table 2 count 27 (adding five common-layer bodies). Table 2's rows do number 27.
- Table 2 gives 5,643 proof lines for `lzma2_decode` while the ratio paragraph uses 4,590; the second is the main lemma only, the first the attributed files, so they are different measures and not in conflict.
- the allocator bodies appear in Table 2 as closed proofs (`lzma_alloc`, `lzma_alloc_zero`, `lzma_free`) while `malloc` and `free` themselves are parameters; Inference: the closed proofs are of liblzma's wrappers.
- the 30% speed-up and the tactic timings come without counts of files or calls.
- no figure is given for human time spent on models, specifications and review, which is the cost the workflow moves work onto.

## already done here

- a complete agent workflow for proving existing low-level code under frozen human specifications, with the prompt published (Appendix A)
- evidence that current agents can close very large foundational proofs (183,268 lines for one function) when given incremental checking, goal extraction and hand-off files
- the observation, credited to Fang and Xiong, that explicit proof goals are a better repair signal than SMT timeouts (Section 7, p.17)

Inference: left open and relevant to VL: no measurement of cost or human effort; no proof of equivalence to the shipped source; no caller-callee composition theorem; nothing about agents writing the specifications.

## what GenProof's result means for VL

Inference: moderate as a competitor signal, low as a direct overlap. GenProof is a company doing agent-driven verification of existing C with a foundational prover, and it shows the approach reaching production code. Its costs are what VL's design avoids: a transformed source that then needs an equivalence argument, 37 proof lines per statement, hours-long checks, an assumed allocator. Code written in verified Rust from the start has none of the first three. The parts VL should copy are organizational, not logical: frozen specifications with report-only gaps, banked progress, independent recheck before commit, mechanical hooks, model testing before proof.

## techniques for the catalog

- model-spec-proof stages with a review gate: humans own executable models and contracts, agents own proofs, and every contract change returns through human review
- single-file frozen-statement prover: a proving agent edits one proof file, may add proved helpers, and may never change a definition, statement or contract
- banked admits: keep the file always checking by leaving open subgoals as explicit admits and never reverting checked work
- report-only contract fix: on an unprovable goal the agent reports why it is underivable, why the fact holds of the code, and one exact diff, without applying it
- forward-looking hand-off file: each session reads and updates a file of state, next steps and gotchas so a long proof spans many context windows
- orchestrator recheck before commit: a separate agent re-runs the checker on a stopped subagent's file and only then commits
- worktree propagation of approved contract changes: apply the change aside, rebuild, spawn repair agents for broken proofs, open a merge request
- coupling invariant for nested state machines: state the allowed pairs of outer phase and child initialization stage, each clause named by the unreachable state it excludes
- goal extraction with a divergence marker: cut a mid-proof goal into a standalone lemma file for a separate agent and guard the cut with a hash of the parent goal until the lemma is applied normally
- workflow hooks: block reads of huge generated files, block the slow checker, and remind agents that a checking timeout is a proof defect
- proof-speed swarm: one optimize task per file, agents profile per sentence, refactor and file follow-up tasks
- solver pre-shaping: do the few needed rewrites before a heavyweight solver and extract single facts instead of running it on the whole goal
- execution-grounded model tests: record entry and exit states of real calls with a debugger, replay them through the functional model in the prover, and compare call by call
- build-intercepted translation: wrap the compiler in the project's build so each unit is translated for verification with its real defines and include paths
- source normalization to the verifiable subset: rewrite goto, struct assignment and unstructured switch, and account for the equivalence gap this opens
- per-field focus lemmas: parameterize a struct predicate by absent fields with focus and unfocus lemmas so one field can be used while the others stay framed
