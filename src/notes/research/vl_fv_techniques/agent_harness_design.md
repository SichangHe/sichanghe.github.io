# Agent harness design
(authored by agents unless marked 🧑)

## short version

- the harness is everything around the model: its tools, its context, its phases, its hooks, its sandbox, its memory
- the studies rarely change these one at a time; most compare whole harnesses
- the Lean thesis compares a persistent context with search and submit tools against restarting each round
  - 62.2% against 31.7% at ten calls, six models, 423 tasks
  - the jump bundles three changes: medium reasoning instead of none, the agent loop, and Lean search; no ablation separates them
- a strong model did better with less harness, a weak one with more
  - Sonnet 4.5: 688/849 hands-off against 569/849 with a controller
  - o4-mini and GPT-5 went the other way
- prerequisite checks and rollback protect the user's file, not the proof
  - the verifier still decides; see [anti-cheating prerequisite checks](anti_cheating_prerequisites.md)
- nothing here is measured on Verus except VeruSAGE and VeriStruct; the other mappings are my inference

Neighbours, not covered here
- what to retry and how: [verifier feedback repair](verifier_feedback_repair.md)
- how to spend the call budget: [proof search strategies](proof_search_strategies.md)
- what goes in the prompt: [context for the model](context_for_the_model.md)
- how to stop the agent cheating: [anti-cheating prerequisite checks](anti_cheating_prerequisites.md)
- wider background: [LLMs for code and agents](../topic_studies/formal_verification_rust/llm_for_verification/code_and_agents.md)

## the problem

A bare model call writes a proof and stops.
It cannot run Verus, cannot look up a lemma, and cannot see its last failure.
Someone has to decide what it may do, in what order, and what happens when it breaks the file.
Those choices are the harness.
They change results as much as the model does, and most papers do not isolate them.

## how to do it in Verus

The Verus steps below are my inference unless a study gives Verus code.
Only VeruSAGE and VeriStruct run on Verus.
The others are Lean, Eiffel, Move, Coq, CUDA or C, and I mapped them.

1. Give the agent a run tool.
   - `verus` on one file, returning the diagnostics
   - filter the output to what matters, as the Lean thesis does with compiler diagnostics
2. Give it a search tool over the library.
   - lemma names and signatures from `vstd` and the project
   - the Lean thesis says such a tool lets the model "confirm type signatures when constructing proofs"
3. Give it a submit tool that checks the schema.
   - the tool runs Verus and rejects banned constructs (`assume`, `admit`, new axioms, contract edits) before it reports a pass
   - this is the "checked tool" through which a result counts
4. Keep one conversation per task.
   - discovered lemma names and failed attempts stay in view
   - set a call budget K and stop at the first verified submission
5. Order the work in phases with a check between them.
   - read the task and freeze the contract
   - write a plan; a separate reviewer or script passes or fails it
   - write code and proof skeleton from the plan
   - fill the leaves
   - run mechanical checks, then a compliance check
   - a failed prerequisite check goes back one phase, not forward
6. Add edit hooks.
   - after every edit to a `.rs` file run the formatter and a parser check
   - return the result in the transcript so the agent sees it before it calls Verus
7. Wrap risky edits in a transaction.
   - copy the function into a scratch module with the same `requires` and `ensures`
   - try the new body there
   - copy it back only when Verus passes; otherwise keep the last good source
8. Run it in a container.
   - no proof bodies from the source project
   - log the whole transcript and the final file
9. Keep memory across tasks.
   - store repairs that Verus has checked, as original, error, explanation, fixed code
   - review the guide before it changes; do not store unverified advice

Mark generated clauses (for example `[inferred]`) so a rerun does not overwrite user-written ones.

### persistent agent with search and submit tools

[study](../vl_paper_walkthrough/automating_formal_verification_with_agen_20261012.md)
The Lean thesis keeps one conversation, a `search_mathlib` tool and a schema-checked `submit_code` tool.
The baseline restarts from the unchanged file each round and passes only the error message.
Step 6 of the study gives the stop rule: stop at a verified submission, else at K.
Models differ in behaviour: GPT-5.4 averaged 17.53 searches and 3.48 submissions over ten turns.
Gemini 3.1 Flash-Lite searched 2.11 times and submitted 7.89 times.
The study's Verus form is its own inference.

### subagents against one context

[same study](../vl_paper_walkthrough/automating_formal_verification_with_agen_20261012.md)
Two tree designs add a parent and short-lived subagents.
In the state design a subagent gets a partial proof; the parent commits it or undoes it.
In the context design the whole transcript of a subagent is a node.
The thesis puts it as "The reframing is to save the path (context), instead of just the node (partial proof)."
These words are the thesis's, quoted in the study.
Fresh branches repeat the library searches.
Details of the search budget belong to [proof search strategies](proof_search_strategies.md).

### hands-off against hands-on

[study](../vl_paper_walkthrough/verusage_20261012.md)
Hands-off: a coding CLI with Verus, `vstd` and a cheat checker, inside a container.
The prompt says "Please invoke Verus to check the proof annotation you added" (hands-off prompt, in the study).
Hands-on: a planner agent picks an action; an action agent returns a small diff; Verus runs; the candidate is accepted or reverted.
The stop rule is 20 minutes or 20 proof steps.
The study says the hands-off setting has no stop rule; the model gives up.
Acceptance depends on the action: a case split may add errors if the targeted one goes; a solver repair must strictly reduce them.

### phase prerequisite checks and a plan

[study](../vl_paper_walkthrough/p_3_20261012.md)
P^3 (Lean) fixes a plan first.
The paper's rule, quoted in the study: "repair local errors in place, but return to Step 1 if elaboration requires an unplanned algorithm, invariant, or structural lemma".
Appendix E in the study gives six phases, an external PASS-PLAN verdict, read-only specifications, and final mechanical and compliance checks.
The study says the paper reports no ablation of each prerequisite check.
The study notes the paper allows refining the current plan once or twice before discarding it.

### planner decomposition

[study](../vl_paper_walkthrough/veristruct_20261012.md)
VeriStruct runs on Verus.
A planner decides whether the module needs a View, a type invariant, specifications and proof code, then calls one prompt per component.
Diagnostics go to repair modules that classify the error.
The baseline asks once per iteration for all annotations and feeds back the last failure.

### edit hooks, markers and cached tools

[study](../vl_paper_walkthrough/combining_mechanical_and_agentic_specifi_20261012.md)
The Move plugin fixes the task order: invariants, weakest precondition, simplify, verify, fix, timeouts.
A hook runs after every write to a `.move` file and returns parse and format diagnostics.
The MCP server caches the package.
The study quotes the authors: "The advantage of MCP over a CLI is a long-lived cache for the active package."
They also found that running the mechanical step first gave "vacuous specifications ... unhelpful and led the model into unfavourable chains of thought."
So the order of phases mattered to them.
The paper reports no denominators.

### isolated body repair and rollback

[study](../vl_paper_walkthrough/large_language_models_and_language_serve_20261012.md)
Eiffel-tools (AutoProof) puts a candidate body in a subclass that overrides the feature.
Only on success is the body copied to the original.
Batch repair keeps a backup of the feature and restores it after a failure.
The authors' words, quoted in the study: "If verification still fails, the original is restored and another candidate is tried".
The study notes that Section 5 of the paper says the failed fix is kept for the next attempt.
The paper disagrees with itself; pick a baseline policy and write it down.

### deterministic cleanup and prompt grammar

[study](../vl_paper_walkthrough/can_llms_enable_verification_in_mainstre_20261012.md)
A converter fixes recurring syntax errors (Python chained comparisons in Nagini) before another model call.
The study warns a converter must not change the contract silently.
[Lemur](../vl_paper_walkthrough/lemur_20261012.md) goes further on the output side.
It forces the oracle to print only an assertion with a loop marker, parses it, drops duplicates by syntax tree, and ranks by frequency.

### separate loops by evidence

[study](../vl_paper_walkthrough/knowledge_graphs_formal_verification_20261012.md)
Syntax, counterexample and coverage each get their own loop with their own stop rule.
The point is to know which kind of failure a change fixed.
This is SystemVerilog; the study offers the Verus mapping as a suggestion.

### active and passive feedback

[study](../vl_paper_walkthrough/towards_large_language_model_aided_progr_20261012.md)
The framework builds each prompt from the current specification and the failure history.
The model only picks a law and writes a fragment.
The framework checks the law's premise and retries a bounded number of times.
On repeated failure it backtracks to the last node of the refinement tree.

### state-machine orchestrator: SpecAgent

[study](../vl_paper_walkthrough/specagent_20261012.md)
Agents use ReAct tool calls, but a deterministic state machine controls role changes, budgets and stopping.
Planning and critique get ten steps, generation and repair thirty, and total invocations are capped at ten.
Agents share a workspace but no conversation state.
Cost on DeepSeek per program: 1,684.49 seconds, 99.40 model calls, $0.6228.

### persistent annotation guide

[study](../vl_paper_walkthrough/proofwright_20261012.md)
ProofWright (VerCors) seeds a guide from ten hand-annotated kernels.
After each successful proof the model records new principles, and a human reviews them.
Error and fix pairs are stored as `ORIGINAL`, `ERROR`, `EXPLANATION`, `CODE`.

### investigate recurring failures before editing the harness

[study](../vl_paper_walkthrough/so_rsi_20261012.md)
SO-RSI (Lean and Verus) lets an outer agent edit the workflow, not the model.
A detector flags recurrence, reversal or expectation mismatch in past edits.
Each flag becomes a hypothesis with a prediction and a check.
Probes replay saved artifacts, or vary one mechanism, in isolated workspaces.
Example from the paper (§2, per the study): compare raw model output with extracted code,
to tell a missing definition from one the extractor discarded.
Memory keeps linked hypotheses, tests and negative results.
The study quotes the paper: "Matching compiler messages alone is insufficient to merge investigations."
Mechanism success stays separate from task success.
Verus steps here are the paper's Lean-structure workflow with Verus replacing Lean compilation, per the study.

### scratch checks versus official checks

[study](../vl_paper_walkthrough/lean_backed_rust_verifier_20261012.md)
Rust-Prover (Lean) gives each agent three hours and 40 official checks, with unrestricted scratch Lean checks between submissions.
The study quotes the paper: "most of the revision happens there."
The agent cannot change the statement or generated code (see [anti-cheating prerequisite checks](anti_cheating_prerequisites.md)).
Study inference: first official acceptance is not one-shot generation; 944/1,325 passed the first official check, maximum seven.

### planner and syntax agents

What's in a Proof? (F*, AutoGen and GraphRAG) [study](../vl_paper_walkthrough/what_s_in_a_proof_analyzing_expert_proof_20261012.md).
A Proof Expert writes a specification-first roadmap: representations, helper functions, lemmas.
A Syntax Expert turns it into valid F* and iterates on verifier feedback.
It gets verified solutions on T4 and T1 in 8 and 7 verifier loops; the o4-mini baseline fails within 30 loops.
The study reads this as a 3.75x reduction; it is two tasks and one model setup.
The Verus form (planner drafts contracts and invariants, a syntax agent edits Rust, diagnostics go back to the planner) is the study's inference.
The study also suggests logging each verifier call, edit and active diagnostic as process evidence outside the trust base; that is its inference too.

## evidence

- Lean thesis, 423 tasks, [study](../vl_paper_walkthrough/automating_formal_verification_with_agen_20261012.md)
  - ten calls: persistent agent 263/423 (62.2%), six-model union, against 31.7% for the restart harness; the gap bundles reasoning, loop and search
  - GPT-5.4 alone: 255/423 (60.3%) against 24.6%
  - fifty calls, GPT-5.4: 402/423 (95.0%)
  - state tree, fifty calls: 287/423 (67.8%); context tree: 88.2%, which is 373/423 from its subset counts (the paper gives only the percentage)
  - so the plain agent beat both trees for GPT-5.4
  - the study flags likely benchmark saturation and possible contamination
  - costs assume perfect caching
- VeruSAGE, 849 Verus tasks, [study](../vl_paper_walkthrough/verusage_20261012.md)
  - Sonnet 4.5 hands-off 688/849 (81%), hands-on 569/849 (67%)
  - o4-mini hands-on 348/849 (41%); GPT-5 hands-on 467/849 (55%)
  - cheating without the checker: 14% for Sonnet 4, 7% for Sonnet 4.5, 2% for GPT-5; under 1.5% for every model with it
  - the paper gives no denominator for these rates and does not say whether they cover all 849 tasks or the ablation runs (the paper's own gap, per the study)
  - the study concludes that a controller can constrain a strong model
- P^3, one run per cell, [study](../vl_paper_walkthrough/p_3_20261012.md)
  - full restarts on Verina: 11.7%, 7.8%, 5.3%, 8.5% (four backends) against 28.6%, 24.7%, 18.5%, 24.9% for program-then-proof
  - 131/141 successes in 189 traces kept their first plan (92.9%); the paper calls this a proxy
  - no within-task variance
- VeriStruct, [study](../vl_paper_walkthrough/veristruct_20261012.md)
  - 10 of 11 modules, 128/129 functions; baseline 4/11 modules, 52 functions
  - the planner is not isolated from the repair modules and syntax guide; the study says no ablation separates them
- Eiffel, 539 bugs, [study](../vl_paper_walkthrough/large_language_models_and_language_serve_20261012.md)
  - Sonnet 4.6 fixed 513/539 (95.2%) with the full prompt, 486/539 (90.2%) with the minimal one
  - this tests the prompt, not the rollback; no run without rollback is reported
- ProofWright, [study](../vl_paper_walkthrough/proofwright_20261012.md)
  - no knowledge base and no guide: zero kernels verified; knowledge base alone: zero
  - ten examples without the evolving guide: 13 kernels (13% of the benchmark)
  - one model, one benchmark, hand-reviewed guide
- Move plugin: no denominators, no comparison with a plain model
- SO-RSI, three outer runs, [study](../vl_paper_walkthrough/so_rsi_20261012.md)
  - Lean held-out: seed 29.4%, naive outer loop 49.4 +- 2.8%, SO-RSI 71.2 +- 1.9%
  - Verus: seed 14.8%, naive 33.4 +- 5.2%, SO-RSI 59.2 +- 3.7%
  - without executable probes: Lean 63.4%, Verus 33.0%; without investigation memory: 60.9%, 36.7%
  - tested investigations: Lean 1,482/3,223, Verus 1,037/2,491
  - the study notes the one-decimal means cannot be rebuilt from 48 and 46 held-out tasks, and no per-run counts are given
  - the abstract says zero-progress loops are eliminated; Table 5 still shows 7.2 and 8.6 per 100 edits

## where the studies disagree

- how much structure
  - the Lean thesis finds that interrupting a deep run with a parent hurts
  - P^3 and VeriStruct find that up-front planning helps
  - they test different things: P^3 plans once and then lets one agent work; the thesis's parent keeps splitting
  - I read these as compatible, but no study tests both
- hands-off against hands-on depends on the model, per VeruSAGE
- the Eiffel paper contradicts itself on keeping or restoring a failed fix

## where it fails

- the weak spot of every harness is the same: the verifier proves the stated obligation
  - the harness cannot tell a wrong contract from a right one
- a prerequisite check that checks text misses what it does not list
  - VeruSAGE: residual cheating remains when a model gives up and leaves `assume`, `admit` or an axiom
- long persistent runs grow long contexts
  - the thesis counts unique tokens under ideal caching; real cache hits differ (footnote 3 of the thesis, in the study)
- a stale memory can mislead
  - the guide is trusted infrastructure in ProofWright; a bad entry persists
- an isolated body can pass in a scratch module and fail in the repository
  - VeruSAGE's extracted tasks trust `external_body` dependencies; its whole-project test of three IronKV tasks cost 1.6 times the time and 2.2 times the money
- SO-RSI: "aggregate token cost is not reported" ([study](../vl_paper_walkthrough/so_rsi_20261012.md), the paper's words)
  - matched wall time is not matched spending; the Verus check's coverage beyond verifier acceptance is not stated
  - one outer model, two domains; the paper calls generalization open
- Eiffel rollback and Verus: Rust ownership may forbid the subclass trick; I would use a scratch module

## open questions

- does a persistent context beat restarts on Verus? Only the Lean thesis tests it
- does a phase prerequisite check pay for itself? P^3 reports no per-check ablation
- what does rollback buy? No study runs with and without it
- how long should memory live before pruning? No study measures guide decay
- which model needs a controller? VeruSAGE gives three models and one benchmark
