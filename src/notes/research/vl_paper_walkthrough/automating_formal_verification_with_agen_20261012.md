# Automating Formal Verification with Agent-Guided Tree Search
(authored by agents unless marked 🧑)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## identity and scope

Leo Yao's MIT MEng thesis (arXiv:2605.27485v1, 26 May 2026) evaluates LLM-generated Lean proofs for verified-code specifications and adds two language-model-directed tree searches. The experiments use 423 Lean tasks: 62 bignum, 172 VerifiedCogen, and 189 Verina. The paper's practical object is an implementation plus proof that Lean checks. The thesis states the motivation plainly: "Formal verification offers a path to provably correct software, but writing verified code remains expensive enough that the technique is rarely used in production." (Abstract, p. 3). This study records procedures that can be applied to VeruLaw (VL), whose target is Rust verified with Verus. Statements about Verus below are my inference unless the paper explicitly says otherwise.

The paper is about Lean, not Verus, so its rates measure proof-generation behavior in Lean and are transfer evidence rather than VL performance.

## technique 1: iterative replacement with compiler feedback (vericoder)

what it is and when to use it

The baseline presents a formal specification containing `sorry` holes and asks a model to fill all holes. A harness substitutes the returned strings, invokes Lean, and gives the compiler diagnostics to the next attempt. This is useful when the model can make a complete attempt but needs machine feedback to repair syntax, typing, or proof failures. It is a restart-per-round method: each new replacement is applied to the unchanged original file, so the model does not accumulate prior edits except through the error message.

how to do it

1. Select a spec and expose every missing implementation or proof as a placeholder; optional helper definitions are marked `<vc-helpers>`.
2. Prompt the model to return a JSON array with exactly one replacement string per placeholder, in source order. The paper's prompt says: "Return a JSON array with EXACTLY N replacements... in order from top to bottom" (Sec. 3.1.5, p. 30).
3. Insert the replacements into the unmodified original specification.
4. Run Lean. On failure, send the failing code and Lean's error log in the next prompt.
5. Reject cheating blocks before counting success: reject `sorry`, `admit`, axiom declarations, `unsafe`, `Unchecked.cast`, and `@[extern]` native-code escapes.
6. Repeat for five attempts per spec in this reproduction, then count a task solved only when Lean verifies and bypass validation passes.

The study's implementation detail matters for replication: it used a 16,384-token output cap and no explicit reasoning setting for this baseline. The selected tasks deliberately exclude natural-language autoformalizations and GitHub-scraped sources. The three subsets had original union pass rates of 12.9% (bignum), 25.4% (Verina), and 44.2% (VerifiedCogen), giving a difficulty gradient (Sec. 3.1.1, pp. 25–26).

verus form (inference)

Use a Verus source file with `requires`, `ensures`, loop invariants, and proof functions containing `assert` or `by` blocks. Replace `todo!`/proof holes with model-provided Rust/Verus strings, invoke `verus`, and return diagnostics. Keep the source contract fixed across attempts, and reject unsound escapes such as axioms, unchecked external functions, or disabled verification. Verus syntax and diagnostics differ from Lean, so the JSON replacement protocol and restart policy transfer, while Lean tactics and `sorry` names do not.

evidence, assumptions, and failure

Across the 423-task set, GPT-5.4 solved 24.6% (104/423) without reasoning; the ten-model union solved 32.2% (Table 3.1, p. 30). GPT-5.4's 24.6% is 9.7% (6/62) on bignum, 33.1% (57/172) on VerifiedCogen, and 21.7% (41/189) on Verina. The benchmark therefore leaves most proofs unsolved. The first-code-block parser also creates a validity problem: Claude Sonnet 4.6 emitted multiple JSON blocks in 53.9% of 1,817 responses, so later self-corrections were discarded (Table 3.4, p. 33). The authors caution that model comparisons are not strict when models differ in visible deliberation and block count (Sec. 3.1.5, p. 32). The setup trusts Lean's kernel and the anti-cheating filter, but trusts the benchmark specifications, parser, provider APIs, and the assumption that forbidden constructs are comprehensively detected.

## technique 2: persistent agent loop with mathlib search

what it is and when to use it

The stronger baseline keeps one conversation alive. Each turn can query Lean's library and submit a candidate; the next turn sees the previous attempt and compiler result. Use it when the proof needs repeated lemma discovery and incremental repair. The thesis identifies three ingredients: reasoning tokens, an agent loop, and external Lean search. It describes the tool's role as follows: "The tool provides access to multiple Lean search providers which handle natural language and type-pattern queries, allowing the model to broadly access lemma names and confirm type signatures when constructing proofs." (Sec. 3.2.1, p. 34).

how to do it

1. Present the same spec and replacement format as the baseline.
2. Expose a schema-validated `submit_code` tool instead of parsing free-form JSON.
3. Expose `search_mathlib`, backed by LeanFinder and Loogle through Lean-LSP-MCP; let the model issue natural-language or type-pattern searches.
4. Return filtered compiler diagnostics as tool output.
5. Continue the same context after each search or failed submission. Nudge a model that writes prose to call a tool.
6. Give each spec a call budget K; stop immediately after a verified submission, otherwise stop at K.
7. Measure unique input plus output tokens, treating repeated cached prefixes as one block, and report solved tasks over the fixed 423-task denominator.

The initial evaluation used six models, medium reasoning, and K=10. The loop's search behavior is itself actionable: GPT-5.4 averaged 17.53 searches and 3.48 submissions over ten turns (search/submit ratio 5.29); GPT-5.4-mini averaged 13.77 and 1.93 (ratio 7.17); Gemini 3.1 Flash-Lite searched 2.11 times and submitted 7.89 times (ratio 0.28) (Table 3.6, p. 39). Models often batch searches, but never submitted more than once in a turn.

verus form (inference)

Expose a `search_verus` tool over the project's verified lemmas, Rust signatures, and examples, plus a `submit_code` tool that runs Verus and returns only relevant diagnostics. Keep one conversation per task so discovered lemma names, failed invariants, and successful proof fragments remain available. A search index must include Verus-specific contracts; LeanFinder/Loogle and Lean tactic names do not carry over. Count unique tokens only if prompt caching is actually configured, otherwise report both billed and logical context tokens.

evidence, assumptions, and failure

At K=10, the six-model union solved 263/423 = 62.2%, versus 31.7% for the same models in the Vericoder-style restart harness (Table 3.5, p. 35). This jump bundles three changes the paper lists together (medium reasoning instead of none, the agent loop, and Lean search); the paper reports no ablation separating search from the other two. GPT-5.4 rose to 60.3% (255/423), from 24.6%. Extending four models to K=50 raised GPT-5.4 to 95.0% (402/423): 54/62 bignum (87.1%), 166/172 VerifiedCogen (96.5%), and 182/189 Verina (96.3%) (Table 3.7, p. 42). The bignum trajectory is nonmonotone in marginal gains: 12/62 at K=10, 20/62 at K=20, 42/62 at K=30, and 54/62 at K=50 (Table 3.8, p. 42). This is evidence that long uninterrupted iteration can eventually find proofs, not evidence that every real Verus task will saturate. The authors explicitly flag likely benchmark saturation and possible training contamination (Conclusion, p. 64). Costs assume perfect prompt caching and free cache reads, so the reported unique-token cost is not a production bill.

## technique 3: state-based parent and subagent tree search

what it is and when to use it

A parent agent chooses proof directions and commits partial states; multiple short-lived subagents explore those directions. A node is a partial proof with open holes. Use this when one long context may anchor on a bad strategy and independent branches can expose alternatives. The thesis states the intended roles: "A parent agent handles evaluation and selection, proposing the next high-level strategy to attempt. A subagent then handles expansion, attempting to extend the partial-proof state towards a complete, verified solution." (Sec. 4.1.1, p. 44).

how to do it

1. Start with the original spec as the base state.
2. The parent calls `explore_variations` to dispatch up to four subagents, each for at most five turns.
3. Prime each subagent with a distinct advice string from a five-class strategy palette; include modern tactics such as `grind`.
4. Give each subagent the parent's full conversation and current partial state, plus `search_mathlib` and `submit_code`.
5. If a subagent verifies a complete proof, return it and terminate. Otherwise collect its debrief, including dead ends and useful lemma names.
6. On the parent side, call `update_base` to commit a promising partial state or `undo_base` to backtrack. A commit can reduce holes or introduce helper lemmas with new holes.
7. Dispatch another variation round with advice refined from debriefs. Continue until success or K=50 total parent and subagent calls.

verus form (inference)

Represent a state as a Verus file plus unresolved proof holes. Let a parent choose invariant strategies (for example, sequence-length invariants versus element-permutation lemmas), while subagents edit and run Verus. `update_base` commits a compilable partial Rust proof; `undo_base` restores its prior version. The five-class palette should be redesigned around Verus idioms such as `requires` strengthening, loop invariant decomposition, trigger/quantifier changes, arithmetic lemma calls, and ghost-state isolation. A state may add helper proof functions, so the orchestrator must track newly introduced obligations.

evidence, assumptions, and failure

At K=50, the state orchestrator solved 287/423 = 67.8% with GPT-5.4 and 210/423 = 49.6% with GPT-5.4-mini, below the persistent-agent 95.0% and 57.0% respectively (Table 4.1, p. 48; Table 3.7, p. 42). GPT-5.4's subset rates were 20/62 = 32.3% bignum, 139/172 = 80.8% VerifiedCogen, and 128/189 = 67.7% Verina. The first branch alone solved 41.8% for GPT-5.4 and 29.1% for GPT-5.4-mini (Sec. 4.1.3, p. 46). Fresh branches repeatedly redo library searches: first-round GPT-5.4 subagents averaged 11.24 searches and 0.98 submissions, ratio 11.47, versus the agent's 5.29 ratio (Table 4.3, p. 50). Adding `resume_variations` to preserve a selected subagent context reduced GPT-5.4 to 281/423 = 66.4% and GPT-5.4-mini to 199/423 = 47.0%; resumed agents searched instead of submitting (Table 4.4 and Table 4.6, pp. 51–54). Dynamic budgets, a skeptical reviewer, and Elo-ranking submissions produced no change beyond run-to-run variance on their small batches (Sec. 4.1.5, pp. 50–51). The parent, debrief summaries, strategy palette, and partial-state serialization are trusted orchestration components; only the verifier certifies the final proof.

## technique 4: context-based tree search with endpoint branching

what it is and when to use it

The context-based design treats a complete subagent transcript as a tree endpoint. It preserves searches, diagnostics, and failed tactics, rather than only a partial file. The central implementation observation is: "The reframing is to save the path (context), instead of just the node (partial proof)." (Sec. 4.2.1, p. 54). This is suited to tasks where redoing library searches is expensive and where several proof approaches should branch from a known evidence base.

how to do it

1. The parent dispatches one subagent with up to ten turns, rather than many five-turn branches.
2. Record the subagent's full transcript, including tool calls, as an endpoint after success, failure, or abandonment.
3. Give the parent `dispatch_subagent` (fresh advice, optionally branched from an endpoint) and `resume_endpoint` (continue the exact endpoint context with a fresh turn allowance).
4. At every parent decision, either resume an endpoint, dispatch a new branch from a useful endpoint, or abandon an infeasible task.
5. Keep the total parent plus subagent budget at K=50; advise the parent to resume endpoints instead of always branching from root.
6. A new branch inherits the selected endpoint's prior history and receives new advice, so it can change strategy without losing lemma searches.

The intermediate design's round-2 comparison quantifies the value of context. For GPT-5.4, 95 empty-context dispatches solved 17.9% with 15.1 searches and 1.9 submissions on average, while 62 resumed contexts solved 38.7% with 2.3 searches and 2.7 submissions; search/submit was 8.1 versus 0.8 (Table 4.8, p. 58). The final design branches from non-root endpoints. At K=50 it solved 88.2% with GPT-5.4 (the three subset rates below correspond to 45 + 162 + 166 = 373 of 423; the paper gives only the percentage, so I use 373/423 = 88.2%, not 374) and 232/423 = 54.8% with GPT-5.4-mini (Table 4.9, p. 60). GPT-5.4's final rates were 45/62 = 72.6% bignum, 162/172 = 94.2% VerifiedCogen, and 166/189 = 87.8% Verina. Final round-2 dispatch achieved 18.0% (18/100) and resume 48.6% (34/70); their search/submit ratios were 3.8 and 0.6 (Table 4.10, p. 62).

verus form (inference)

Store each Verus proof attempt as an endpoint containing the exact Rust source, verifier diagnostics, search queries and results, and model messages. Let `resume_endpoint` continue that same context; let `dispatch_subagent` fork from an endpoint with a new invariant strategy. Preserve tool history in the prompt or a structured retrieval record. This should reduce repeated lemma lookup, but context length and stale diagnostics must be managed when the base source changes. A Verus implementation should invalidate endpoints whose source contracts were changed, just as the Lean design invalidates contexts after a base update in the state search.

evidence, assumptions, and failure

The final context orchestrator beats the state orchestrator by 20.4 percentage points for GPT-5.4 (88.2% versus 67.8%) and approaches the agent baseline through K=20, but the uninterrupted agent reaches 95.0% at K=50 (Sec. 4.2.5, p. 59; Conclusion, pp. 63–64). On bignum, the orchestrator leads through much of the token range and reaches 72.6% versus the agent's 87.1% at K=50; on easier subsets the agent catches up or wins. The authors infer a width/depth tradeoff: branching finds distinct strategies, while parent decisions interrupt deep iteration. My inference: this conclusion is limited to two models and three Lean subsets. Endpoint selection, parent reasoning, context truncation, provider caching, and benchmark contamination remain trusted or uncontrolled factors.

## what is proved, measured, and trusted

Lean's kernel checks each accepted proof, and the harness's anti-bypass validation rejects listed escape hatches. The experiments measure pass rate, unique-token trajectories, tool-call ratios, and provider-list-rate costs. They do not prove that the generated specifications describe intended behavior, that the benchmark is uncontaminated, or that a proof remains correct after translation to Rust/Verus. Reported costs idealize caching: the paper says, "In practice, actual cache hit rates vary depending on timing of requests, provider routing, and other uncontrollable factors" (footnote 3, p. 35). The 423 tasks are translated or curated Lean exercises, not deployed Rust systems. A VL deployment must separately review contracts, trust the Verus verifier and compiler integration, and prevent unsound external-code escape paths.

## contradictions and numbers that need care

The abstract's 95.0% at K=50 is the GPT-5.4 persistent-agent result on all 423 tasks, not a tree-search result. The final context orchestrator's headline is 88.2%, so calling the latter saturation would be wrong. The state-search resume variant was intended to save search work but lowered solve rate and raised search/submit ratios; this is an observed regression, not evidence that resume is intrinsically harmful. GPT-5.4's bignum table has 54/62 solved at K=50 (87.1%), while the combined 423-task rate is 95.0% (402/423); these denominators refer to different subsets and should never be merged. Cost figures use published rates and perfect caching assumptions, while real cache reads are discounted rather than free.

## what VL should not redo

VL should not spend its first effort reproducing Lean's 423-task benchmark, its parser-specific chain-of-thought study, or a state tree that discards subagent histories. Those experiments already establish that persistent tool use and context retention dominate restart attempts, and they show the failure mode quantitatively. Reusing the design means building a Verus-native benchmark from recent Rust code, indexing project lemmas, preserving verifier diagnostics, and comparing a continuous agent with endpoint branching under identical token and wall-clock budgets. VL should not claim a 95% production result from this thesis: benchmark saturation, contract quality, and translation differences remain open.

## threat to a product of agent-written verified Rust (inference)

The thesis increases the threat estimate. A model with a Verus analogue of `search_mathlib`, persistent context, and K=50 calls could turn many small proof obligations into routine work, reducing the effort needed to produce large volumes of verified Rust. The 95.0% Lean rate on 423 synthetic specifications is evidence of automation capability, not evidence that an agent can safely design system contracts or maintain a real codebase. Threat is therefore high for boilerplate and local invariant repair, medium for composed modules whose contracts are already fixed, and unresolved for end-to-end security properties. This grading is my inference from the denominators and task construction, not a claim made by Yao.

## techniques for the catalog

- iterative replacement with compiler feedback — fill fixed formal holes, run the verifier, and retry from the original source using diagnostics while rejecting bypass constructs
- persistent verifier agent with library search — keep one context, search lemmas through a Lean/Verus service, submit code through a schema-checked tool, and scale the call budget
- state-based parent/subagent tree — branch short proof-state explorations, commit or undo partial states, and let a parent choose the next strategy
- context endpoint tree search — save full subagent transcripts, resume promising endpoints, and fork new advice from retained evidence to avoid repeated searches
- verifier-gated anti-cheating harness — count success only after kernel verification and explicit rejection of incomplete, axiomatic, unsafe, or native-code escapes

Audited 2026-10-12 against the paper: recomputed every fraction and percentage in the study against Tables 3.1, 3.5 to 3.8, 4.1, 4.3, 4.8, 4.9 and 4.10 and the text of sections 3.1 to 4.2.5 and the conclusion; the steps of the four techniques follow sections 3.1.2, 3.2.2, 4.1.2 and 4.2.2. Changed: 374/423 was not in the paper and is wrong (the subset rates sum to 373/423, which is 88.2%); page references corrected for Table 3.4 (p. 33), Table 3.7 (p. 42), the first-branch rate (p. 46), the other-modifications paragraph (pp. 50 to 51), the context-saving passage (p. 54), Sec. 3.1.5 caution (p. 32), the caching footnote (p. 35) and the saturation and contamination remarks (p. 64); noted that the 31.7% to 62.2% jump bundles reasoning, agent loop and search with no ablation (finding in technique_pages_study_findings.md, confirmed; the 373 versus 374 count also confirmed); marked one unmarked inference; removed a meta sentence about a note search; fixed a misdescription of the 95.0% as a union. Verus forms are marked inference and are sound as sketches; they were not run.
