# From Noisy Traces to Root Causes: Structural Trajectory Analysis and Causal Extraction for Agent Optimization
(authored by agents unless marked 🧑)
Tag: `chang2026noisy`, [paper](https://arxiv.org/abs/2607.07702)

Audit: audited 2026-10-13 against the paper (text, and PDF pages 18-22 for Figures 5-9); checked Tables 1-7 numbers, the denominator inferences (every printed percentage re-derived), Figure 5 counts, Figures 6-9 steps and rules, Appendix D rules, quotations and page references, and the Verus forms; changed: single run per setting was not stated by the paper; cascade ranking and router-attribution list reworded to the figures' words; unmarked inferences marked; Appendix D rules no longer called usable as written by any agent; NRKernel GPT-5 tie and IronKV claim corrected against Table 7; IronKV 41.6% rounding misfit added; Sonnet 4 comparison made within one point. Not checked: the 41, 39, 39 runs cited from the VeruSAGE study (read only that study's text), the identity of Figure 3's benchmark.

source: Ying Chang, Jiahang Xu, Xuan Feng, Chenyuan Yang, Peng Cheng, Yuqing Yang (University of Chinese Academy of Sciences; Microsoft Research), arXiv:2607.07702v1, 8 Jul 2026, 22 pages: 9 of text, references, Appendices A-D (pp.12-17), and Figures 5-9 (pp.18-22). Figures 5-9 are images; their content is absent from the PDF's extracted text, so what is taken from them below is transcribed from the page images and is not placed in quotation marks. Code: https://github.com/moomight/STRACE (abstract, p.1).

## the subject is the agent, not the proof

The system, STRACE, improves an LLM agent by reading its failed runs and rewriting the prompts of the agent's modules. It proves nothing and changes no code. Its bearing on verification is the third benchmark: the agent being improved is the VeruSAGE router-executor agent that repairs Verus proofs, and the reported effect is on how many proof tasks that agent finishes. The abstract's sentence: “Notably, on a challenging formal verification task (VeruSAGE-Bench), it successfully optimizes human-expert designed agents, delivering 1.4× success-rate improvement (42.5% to 58.5%).” (Abstract, p.1) 58.5/42.5 is 1.38.

Measured: success rate of the agent on held-out tasks before and after prompt changes, with no repeated runs or variance reported, with o4-mini as the agent's model and Claude Sonnet 4.5 at temperature 1.0 as the optimizer for every method (Section 4.1, pp.6-7).

Trusted or unexamined:
- Inference: Verus remains the judge of each task, so a prompt change cannot make a wrong proof pass; but the paper does not say whether VeruSAGE's cheat checker (against `assume`, `admit()`, `#[verifier::external_body]` or edited contracts) was applied to STRACE's runs. Its description of success is only “The process terminates when the code verifies successfully or when the budget (20 attempts or 20 minutes) is exhausted.” (Appendix A.3, p.12)
- the dependency graph, the failure attribution and the rules written into prompts are all LLM output; the one human check reported is an expert reading of five graphs (Table 3, p.14)

## the agent under optimization (Appendix A.3, pp.12-13)

Each task runs a loop: submit the code to Verus; on failure an Error Analyzer parses the message; a Router picks one of 35 repair actions from the error type and code context; the chosen sub-agent writes a patch; the patch is applied; repeat, up to 20 attempts or 20 minutes. There are 15 sub-agents, among them an Invariant Manager, a Proof Strategy Applicator (case analysis, induction), a Prover Mode Activator (bit-vector and non-linear arithmetic modes), a Syntax Fixer and a Standard Lemma Guider. Section 4.1 (p.6) counts 16 optimizable modules. What STRACE edits: “STRACE targets the system prompts of the Router and the top-k most frequently triggered Executors, injecting synthesized domain heuristics (e.g., specific strategies for handling "nonlinear arithmetic" errors) directly into their context windows.” (Appendix A.3, p.13)

## technique 1: a textual dependency prior over the agent's modules

what it is: before reading any trace, an LLM reads the agent's repository and writes an edge list saying which module consumes what another produces (data dependency) and which module decides whether or which other module runs (control dependency). The paper is careful about what the graph is: “Notably, the term “graph” reflects its node–edge structure, but its implementation is a text edge list rather than a learned graph object or a static-program-analysis graph.” (Appendix B.2, p.13)

when to use: a multi-module agent whose source and prompts can be read. The limits section: “Therefore, STRACE is most directly applicable to systems where the optimizer can inspect the implementation or harness, rather than fully black-box agents with hidden components and control flow.” (Limitations, p.9)

how it is done (Section 3.2, pp.3-4; Appendix B.2, p.13; Figure 6, p.19):
1. read a background file for the agent system if there is one, else the source: README, documentation, configuration, agent definitions (Appendix B.2)
2. list components: active ones, split into decision-makers (routers, planners, dispatchers) and executors (action agents, tools, verifiers); passive ones (state managers, memory, message channels) (Figure 6)
3. for each component write what it produces and what it consumes, including updated shared state (Figure 6)
4. write edges: A to B is a data edge if B consumes an artifact A produces; a control edge if A's decision, routing or guard determines whether B runs or which sub-agent is chosen (Section 3.2, p.4)
5. output only a compact list, one line per edge with the artifact or condition and a rationale; the instruction says not to build an explicit graph (Figure 6)

Verus form. Inference: for a Verus proof-repair loop the list is short and mostly fixed: verifier run produces error list; error parser consumes it and produces a typed failure; router consumes failure, code and action history and controls which executor runs; executors consume code and guidance and produce a patch; an acceptance check controls whether the patch becomes the new code state. The one fact worth writing down exactly, because technique 4 depends on it, is the state-change rule: which events alter the code that the next step sees. In the paper's IronKV summary this rule reads: accepted executor actions update code state; routers and rejected actions do not (Figure 5, p.18).

evidence: Table 4 (p.14), success rate on an evaluation set whose size is not stated there (see the denominators part): base agent 48%; no dependency graph 48%; remove 25% of edges 54%; add 25% 56%; remove 10% 56%; add 10% 62%; STRACE 56%. The ablation in Table 2 (p.8) gives 48% and a cost of $5.10 without structural modeling, against 56% and $2.96 with it. Table 3 (p.14) is an expert's verbal assessment of graphs built by five models; the weakest, MiniMax-M2.5, is said to add about 10% noisy edges.

where it fails or what it assumes: Inference: Table 4 shows a graph with 10% random extra edges scoring 62%, above the unperturbed 56%. If the set has 50 tasks, that is 31 against 28; random noise helping by three tasks says the differences among the perturbed rows are within run-to-run variation, and only the gap to having no graph (48%) is large. The paper reads the table as stability: “These results indicate that STRACE benefits substantially from having a dependency prior, but does not require this prior to be perfectly specified.” (Appendix B.2, p.14)

## technique 2: a failure summarization map, computed by a generated parser

what it is: turn the whole batch of traces into counts before any LLM reads a trace. An LLM writes a deterministic Python parser for the agent's log format; the parser produces per-trace records; aggregates over records show which modules fail most and which call sequences recur.

when to use: more traces than fit in context, with repetitive failures.

how it is done (Section 3.3, p.4; Appendix B.3, p.14; Figure 7, p.20):
1. infer the trace schema from one pilot trace, find its delimiters, and write the parser (Section 3.3)
2. run it over all traces; record for each the global outcome and each node's local status, and the module invocation sequence (Section 3.3)
3. write two files: per-trace summaries holding a per-position sequence of module name and outcome, with the choice made at router positions; and an analysis report (Figure 7, step 2.1)
4. statistical severity: “The summary estimates the conditional failure probability P (Task Fail | vi Fail), where vi denotes a local node error extracted from the structured trace record.” (Appendix B.3, p.14)
5. structural path patterns: module sequences that recur, in particular self-loops, oscillations and dead ends (Appendix B.3, p.14)
6. if modules fail silently, with no node-level error signal, cluster on global outcome plus path pattern alone (Fallback Mechanism, Section 3.3, p.5)

the paper's example (Figure 5, p.18, IronKV): 94 traces, 47 successful and 47 failed; 1,363 executor calls and 928 router calls. Top bottlenecks by call: `postcondition_repair` 251 failures in 366 calls (68.6%), present in all 47 failed traces; `case_analysis` 153 of 199 (76.9%); `induction` 90 of 103 (87.4%); `seqsetmap` 71 of 73 (97.3%); `compute` 57 of 62 (91.9%). Repeated-failure loops: 18 traces have three or more consecutive rejected `postcondition_repair` attempts, the longest run being 20. Router patterns: SEQSETMAP chosen 73 times, 63 of them in failed traces (86.3%). The percentages match their fractions.

Verus form. Inference: this applies as is to logs of any Verus agent, and the useful record per step is: action chosen, whether Verus accepted the result, error class before and after (precondition, postcondition, invariant, assertion, syntax, timeout), and whether the code state changed. Two of the map's readings are specific to proof repair and come from the figure's interpretation lines: a rejected patch leaves the code unchanged, so a long run of rejections exposes routing or prompt behaviour and not accumulated bad code; and a module that appears in every failed trace (here `postcondition_repair`) is, in the figure's words, the dominant manifestation point; that it is thereby not the cause is this study's reading.

evidence: Table 2 (p.8): without trace filtering, 46% success and $8.45, against 56% and $2.96; Table 5 (p.15) locates the extra cost in Phase 4, $7.602 of $8.4489 (90.0%).

where it fails or what it assumes: step 4 defines severity as a conditional probability of task failure given a node error, but the example map prints per-call failure rates and counts of failed traces, not that probability; with 47 of 47 failed traces containing a failed `postcondition_repair`, the conditional the definition asks for cannot be read from the figure without the count in successful traces.

## technique 3: choose a few modules and a few distinct traces per module

what it is: pick the modules whose prompts are worth changing and, for each, a small set of traces with different failure patterns.

how it is done (Section 3.3, pp.4-5; Figure 7, p.20, steps 2.2-2.3):
1. list all active components
2. for each, ask how often it appears in failed traces, its error contribution, whether it is a manifestation point, and its cascade impact: with the dependency prior, a frequently failing upstream module with many dependents may cause more total damage than a frequently failing leaf (Figure 7)
3. rank and select 1 to 5 components, weighing failure frequency and cascade impact (Figure 7)
4. for each selected component choose at most 5 traces, each a distinct failure pattern; do not add traces to fill the quota if 2 or 3 cover the patterns; group by the summaries first and read full traces only if needed (Figure 7)
5. the paper's wording of the aim: “It then selects a minimal exemplar set from each distinct cluster with a predefined size.” (Section 3.3, p.5)

settings used: bottleneck threshold k = 5 and exemplar count s = 5 (Section 4.1, p.7).

Verus form. Inference: nothing changes; the clusters for a Verus agent are natural ones (error class crossed with the action sequence that followed).

evidence: the case study's numbers: “In the 200-case setting, STRACE selects 5 high-impact manifest modules and 5 representative traces for each, yielding 25 traces in total.” (Section 4.4, p.8) Inference: the optimizer thus reads 25 traces out of a 200-case run.

where it fails or what it assumes: clustering and ranking are done by the LLM following the instruction; the paper gives no measure of whether the chosen 25 cover the failure modes of the rest.

## technique 4: backward slicing of one trace by state changes

what it is: from one failed trace, keep only the steps that could have influenced the failure, using the dependency prior, and drop the rest. The paper separates two nodes: the manifestation node, where the error surfaces (or the last node if nothing errors), and the root cause node, the module with the actual defect (Section 3.4, p.5).

when to use: long traces where the failing step repeats many times and most steps changed nothing.

how it is done (Section 3.4, p.5 for the idea; Figure 8, p.21, part 3.1 for the procedure):
1. from the trace summary take the sequence of positions, each with its module name; mark which positions updated the shared state, using the acceptance criteria noted in the dependency prior
2. only state-changing positions carry causal dependencies downstream; the rest do not affect later context
3. find all positions where the target module appears without changing state
4. group those positions into segments: a new segment starts whenever a new state-changing position lies between two of them; inside a segment the shared state is identical, so all its positions share one causal context
5. take the first position of each segment as its representative
6. the causal chain of a segment is: all state-changing positions before the representative, with their router positions, in order, then the representative and its router position
7. the stated principle: “By retaining only steps that can reach the manifestation node through the dependency closure (→∗ ), the system prunes nodes with no structural influence on the failure, thereby discarding mere temporal antecedents.” (Section 3.4, p.5)

Verus form. Inference: in a Verus repair loop the shared state is the source file, and a step changes it only when its patch is accepted. A trace of 20 attempts with 3 accepted patches therefore reduces to at most four segments, and for each the chain is the accepted patches so far plus one failing attempt with the routing decision that led to it. That is the context to give whoever diagnoses the failure, human or model. What does not carry over directly: an agent that keeps rejected attempts in its conversation history has a second channel of influence (the history itself), which the state-change rule ignores; the instruction's attribution rules do mention ignored action history as a router fault.

evidence: Table 2 (p.8), single runs: full STRACE 56% at $2.96; without causal localization, using the current node only, 54% at $2.88; using the full trace, 54% at $5.93.

where it fails or what it assumes: Inference: the technique named in the title moves the success rate by two points, which is one task if the set has 50, at equal cost to the current-node variant; on this evidence slicing is a cost control against full traces more than a demonstrated accuracy gain. The paper's reading is “using only the current node may miss upstream causes, while using the full trace introduces unnecessary noise and cost” (Section 4.5, p.8).

## technique 5: attribution rules between the router and the executor

what it is: rules for deciding, within a causal chain, which module's prompt is at fault. These are in the Phase 3 instruction only (Figure 8, p.21, part 3.2); the body text says only that the system reasons over the slice to find where execution first deviated (Section 3.4, p.5).

how it is done (Figure 8):
1. read the actual trace content at the representative position and at each earlier position of the chain; the root cause is not fixed in advance
2. default for a router-executor pair: when the router selects an executor and the executor fails, attribute to the router; the burden of proof is on blaming the executor
3. attribute to the executor only if all hold: the router's choice was clearly reasonable for this problem, with a stated reason; the executor's own approach is demonstrably flawed; a different executor would not have succeeded on the same input; and the failure is not incidental generation noise such as a syntax error
4. attribute to the router when these hold (the paper labels the list default for most cases and does not say any or all): the choice cannot be justified; another executor type would likely have fit better; the router repeats a failing executor without diversifying; the router ignores available context such as action history
5. attribute to a previously accepted node when several different executor types then fail in a row on the same error, the router is diversifying properly, and reading the accepted output shows it committed to a direction that makes the rest harder; the target is the node at the position where it was accepted
6. record a one or two sentence reason that says what went wrong in the node's behaviour
7. group segments by root-cause module; self-check: if every root cause equals a Phase 2 manifestation node, the backtracking was probably not done, so redo it

Verus form. Inference: rule 5 is the one with a Verus-specific meaning. An accepted patch is one that reduced or changed the verifier's errors, and such a patch can still be a wrong turn: a loop invariant or lemma statement that Verus accepts as stated but that is too weak or shaped wrongly for the remaining goal. Later failures of `assert` repair then trace back to that accepted invariant. A diagnosis procedure for a Verus agent should include this case explicitly, since error-count progress hides it.

evidence: “However, by applying root cause isolation, 12 of the 25 traces are re-mapped to upstream root-cause actions, expanding the optimization targets to 6 distinct nodes, with an additional upstream “assertion_reasoning_pipeline” module.” (Section 4.4, p.8) 12 of 25 is 48%. The second case: an IronKV task where a repair module is invoked until timeout, and slicing traces the loop to the upstream controller having sent the task down an unsuitable repair path (Section 4.4, p.8; Figure 4).

where it fails or what it assumes: no ground truth for root causes exists in the paper; that 12 traces were re-mapped shows the procedure changes the target, not that the new target is right. Inference: rule 2's default pushes attribution toward the router, and the self-check in step 7 pushes toward answers that differ from the manifestation nodes.

## technique 6: turn localized failures into general rules, injected only at the root-cause module

what it is: for each root-cause module, write per-trace diagnoses, abstract them into rules, and add the rules to that module's prompt. “Rather than translating recurring errors into instance-specific failure records (which risk overfitting), the optimizer performs inductive abstraction to formulate robust, reusable heuristics for future executions.” (Section 3.5, p.5)

how it is done (Section 3.5, p.5; Figure 9, p.22; Appendix B.1, p.13):
1. run this phase in a fresh context holding only the root-cause locations and reasons; Phases 1-3 share one context, Phase 4 is isolated (Appendix B.1)
2. for each trace location write one block: trace, attribution (sub-agent error or router error), position, quoted evidence, what should have happened, what happened, the gap, why the prompt led to this, and one specific improvement, which the instruction calls a trace-level gradient (Figure 9, part 4.1)
3. collect the improvements and edit the prompts (Figure 9, part 4.2)
4. for executor prompts, keep one task and make it clearer: better syntax examples, clearer constraints, more precise instructions; do not add duties such as pre-checks, fallbacks or extra validation. The instruction's test: if the improvement amounts to doing more, it belongs in the router (Figure 9)
5. for router prompts, add criteria for choosing between actions, stopping rules after N failures, and more specific guidance templates (Figure 9)
6. add at most 1 to 3 abstract examples; do not copy trace content (Figure 9)
7. save revised prompts and a mapping from original to revised, listing unchanged prompts (Figure 9)

Verus form: the rules it produced for a Verus agent. Appendix D (p.17) prints the rules synthesized for the `assertion_reasoning_pipeline` module, which chooses how to prove a failing assertion. Inference: they name VeruSAGE's own actions, so another Verus agent would need them mapped to its action set:
1. stopping and switching: keep count of how often each action type was tried and rejected in the current proof context; after 2 to 3 consistent rejections, do not choose it again there; switch to another action, and if all reasonable ones are exhausted, mark the issue as needing a human. The appendix's example is INDUCTION failing three times with syntax errors, then switching to USELEMMA or CASE_ANALYSIS.
2. guidance must be concrete, with anchors from the visible code and the current goal, per action:
   - USELEMMA: name the helper lemmas or proof functions in the file and what each establishes; do not choose it when no relevant lemma exists
   - CASE_ANALYSIS: “Specify the exact variable or expression to split on and what each branch should establish (e.g., which inequality or domain condition is proven in each case).” (Appendix D, p.17)
   - INDUCTION: state the base case, the inductive hypothesis, and how the hypothesis connects to the goal
   - EXTENSIONAL_EQUALITY: say which collection equality needs element-wise reasoning and which domain or length conditions must be shown
   - SEQSETMAP: “List the 2–3 most relevant Seq/Set/Map lemmas to invoke; avoid invoking an overly broad lemma set to prevent timeouts.” (Appendix D, p.17)
3. multi-round planning: say what earlier accepted fixes established and how the next action extends it; for a complex goal outline a short plan (an auxiliary fact, the main implication, the link to the final goal); do not jump between unrelated actions.

Inference on the constructs behind the action names, which the paper does not show: case analysis is an `if`/`else` inside a `proof { }` block with an `assert` per branch; induction is a recursive `proof fn` with a `decreases` clause, called at the point of use; using a lemma is a call to a `proof fn` whose `ensures` gives the needed fact; the Seq/Set/Map rule corresponds to a narrow `broadcast use` of named library lemmas instead of a whole group, the breadth being what causes solver timeouts.

evidence, main result (Table 1, p.6, VeruSAGE-Bench success rate, agent model o4-mini, held-out 20% of each of five projects):
- base agent: IronKV 41.6%, Memory Allocator 66.7%, Node Replication 80.0%, NRKernel 20.0%, Storage 46.2%, all 42.5%
- STRACE: 62.5%, 88.9%, 100.0%, 31.7%, 61.5%, all 58.5% (+16.0 points)
- GEPA, the best baseline: 54.2%, 61.1%, 80.0%, 29.3%, 46.2%, all 47.2%
- naive few-shot 39.6% and retrieval-based selection 41.5% are below the base agent; failure-aware RAG equals it at 42.5%; summary-based selection 45.3%
- TextGrad was not run on this benchmark because full traces exceed 100k tokens (Section 4.1, p.6)

Turns per task (Table 6, p.16; failures counted at the maximum): IronKV 12.04 to 8.42, Memory Allocator 9.17 to 7.39, Node Replication 7.80 to 4.00, NRKernel 14.83 to 8.20, Storage 13.00 to 8.31. Against larger models used without a designed controller (Table 7, p.16; numbers the paper says are taken from the VeruSAGE study): GPT-5 50.0% overall, o4-mini with STRACE 58.5%, Claude Sonnet 4 59.4%. Cost of one optimization run: $2.96, of which Phase 4 is $1.8052 (61.1%) and Phase 3 $0.8515 (28.8%) (Table 5 and Appendix C.1, p.15).

where it fails or what it assumes:
- the paper reports one run per cell and no variance, with the optimizer sampling at temperature 1.0
- train and test tasks come from the same five projects: “We enforce an 80%/20% split per project to test generalization.” (Section 4.1, p.6) Inference: rules learned from IronKV traces are tested on other IronKV tasks; transfer to an unseen codebase is not tested
- gains are uneven: NRKernel moves from 20.0% to 31.7% and stays the hardest; on IronKV Claude Sonnet 4 and GPT-5 both lead STRACE, and on NRKernel Claude Sonnet 4 leads (46.3% against 31.7%) while GPT-5 ties (Table 7); the paper says: “Meanwhile, the gap on IronKV and NRKernel suggests that some failure modes still benefit from stronger general reasoning and long-horizon robustness.” (Appendix C.3, p.17)

## denominators, and figures that do not fit

The paper prints percentages only. The following counts are inferred by finding the denominators that reproduce every printed percentage.

- Inference: the VeruSAGE test set has 106 tasks: IronKV 24, Memory Allocator 18, Node Replication 10, NRKernel 41, Storage 13. With these, STRACE is 15 + 16 + 10 + 13 + 8 = 62 of 106 (58.5%), and every method's row sums to its printed overall rate, as do the two rows of Table 7 taken from the VeruSAGE study. The training side is 453 traces (Figure 3 caption, p.7), and 453 of 559 is 81%, consistent with the stated split.
- Inference: two cells do not fit. IronKV's base 41.6% is 10 of 24, which is 41.67% and would print as 41.7%; the paper's other cells round correctly. The second: The base agent's overall 42.5% is 45 of 106, which needs 9 NRKernel successes, 22.0%; the table prints 20.0%, which is no whole number of 41. So the gain is 17 tasks: 45 to 62 of 106.
- Inference: WebArena's test set is 139 tasks (Shopping 39, CMS 37, Reddit 22, GitLab 41); retrieval-based selection's Reddit cell, 14.3%, is no whole number of 22 (3 of 22 is 13.6%), while its overall 14.4% is 20 of 139 with 3 Reddit successes.
- The ablations use another evaluation set. Table 2 and Table 4 give STRACE 56% and, in Table 4, the base agent 48%, against 58.5% and 42.5% in Table 1. Figure 3's caption speaks of “Success rate on 50 independent tasks” (p.7). Inference: Tables 2 and 4 are on those 50 tasks, where 56%, 54%, 48% and 46% are 28, 27, 24 and 23 tasks; the paper does not say so. On 50 tasks the base-to-STRACE gain is 4 tasks, and each ablation differs from the full system by 1 to 5 tasks.
- The case study is in a “200-case setting” (Section 4.4, p.8), a third size, neither 453 nor 50.
- Section 4.1 says the benchmark consists of five projects. The walkthrough's VeruSAGE study (`verusage_20261012.md`) records 849 tasks over more projects in the original benchmark, and for that same o4-mini agent three independent runs on 100 tasks scoring 41%, 39% and 39% with 56% solved by at least one of the three. Inference: run-to-run spread for this agent is thus a few points, and repeated attempts alone lift the solved share by about 15 points; a single before/after pair on 106 tasks, 16 points apart, is suggestive but needs repeated runs to separate prompt effect from sampling.
- “Statistical Bottleneck Diagnosis module” (Section 4.3, p.7) is a name used once; it appears to be Phase 2.

## what VL can take as done

- Inference: the pipeline (edge list, parser-made summary, at most 25 traces, state-change slicing, router-first attribution, rules injected at one module) is fully specified by the paper plus its four instruction figures, and the repository is said to hold the full templates and a packaged skill (Appendix B.4, p.14). Rebuilding it is unnecessary.
- Inference: the Appendix D rules are already distilled from Verus proof-repair traces and can be put into a Verus agent's prompt today.
- Not done here: any check that learned rules transfer across projects, any repeated-run statistics, and any use of the diagnosis to change code or tools instead of prompts; the conclusion only asserts that the diagnoses could guide updates to skills and tool-use policies (Section 5, pp.8-9).

## what it means for a product built on agents writing Verus-verified Rust

Inference: low as competition, real as a sign of pace. This is not a verifier or a product; it is a method from Microsoft Research, the group that also produced the Verus agents and benchmark it tunes, and it shows that a small model's Verus repair rate can be raised from 45 to 62 of 106 tasks for about three dollars of optimizer calls, within one point of the 59.4% reported for Claude Sonnet 4 without a designed controller. The implication for VL is that prompt-level tuning of a Verus agent from its own traces is cheap and available to anyone with traces, so a lasting advantage has to rest on something else (specifications, coverage of real Rust, the trust story), and that VL should run this kind of loop on its own agent.

## techniques for the catalog

- textual dependency prior — have an LLM read the agent's code and write a short edge list of data and control dependencies between modules, plus the rule for which steps change shared state
- failure summarization map — generate a parser for the trace format and aggregate all traces into per-module failure rates, repeated-rejection runs and router choice patterns before reading any trace
- bottleneck and exemplar selection — choose up to five modules by failure frequency and downstream reach, and up to five traces per module that show different failure patterns
- state-change backward slicing — reduce a trace to the accepted state changes before a failing step plus that step and its routing decision, treating repeats under identical state as one segment
- router-first attribution — blame the routing decision by default, the executor only when its own approach is shown flawed, and an earlier accepted step when varied executors all fail after it
- trace-level gradient to general rule — write expected, actual and gap for each localized failure, abstract them into a few rules, and inject them only into the root-cause module's prompt
- repair-agent stopping and switching rules — in a Verus repair loop, drop an action after 2 to 3 rejections in one proof context, switch strategy, and name concrete lemmas, split variables or induction structure in the guidance
