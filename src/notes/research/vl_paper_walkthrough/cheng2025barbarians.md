# Barbarians at the Gate: How AI is Upending Systems Research
(authored by agents unless marked 🧑)
Tag: `cheng2025barbarians`, [paper](https://arxiv.org/abs/2510.06189v3)

## what the paper proposes

The paper describes AI-Driven Research for Systems (ADRS), a loop that generates candidate algorithms, evaluates them in a simulator or system, stores results, and feeds selected candidates back into prompts. Its components are Prompt Generator, Solution Generator, Evaluator, Storage, and Solution Selector (Section 4.2, pp. 5–6). The authors state: “At its core, ADRS implements a loop that, in each iteration, creates or refines prompts for LLMs to generate new solutions or improve existing ones, and then evaluates these solutions in either a real system or a simulator.” (Section 4.2, p. 6.) The paper argues that systems-performance tasks are suitable because candidate behavior can often be measured and correctness constraints can be tested, while emphasizing that results are early case studies with inconsistent configurations (Sections 3 and 5, pp. 4, 8).

Inference: ADRS is an evolutionary search pattern with testing-based evaluation, not formal verification. For VeruLaw, a Verus checker can strengthen the Evaluator for functional contracts, while performance measurements and workload traces remain separate evidence.

## technique 1: specify a complete problem and evaluator schema

What it is. Table 2 expands the setup into dimensions for the Prompt Generator, Solution Generator, Evaluator, Solution Selector, result analysis, and evolution analysis (Section 5, pp. 8–9). The schema records the problem, optimization objective, constraints, model configuration, and iteration budget. Its Evaluator entries cover the environment and traces, initial program, additional baselines, and feedback. Section 6.1 additionally recommends specifying required APIs in the prompt (p. 18). Result analysis compares performance, cost, robustness, and generalization; evolution analysis records trajectories, failure patterns, and feedback utility (Table 2, p. 9).

How to apply it. Inference: these steps combine the cited recommendations into a procedure.

1. Write a structured problem statement with domain, objective, constraints, workloads, and required interfaces (Section 6.1, p. 18).
2. Choose a clean base program and identify published and simple baselines (Section 6.1, p. 18).
3. Define the evaluator environment, traces, correctness checks, score, and feedback granularity before searching (Table 2, p. 9).
4. Define how candidates are selected and how search trajectory and failures will be recorded (Table 2, p. 9).
5. Compare final candidates against the initial program and state-of-the-art baseline on the full evaluation set (Table 2 and Section 5.1.1, pp. 9–10).

Verus form. Inference: put safety and functional requirements in explicit Verus `requires`, `ensures`, loop invariants, and proof lemmas, while retaining performance metrics as evaluator outputs. Inference: include API contracts and external assumptions in the schema so a passing proof cannot silently rely on undocumented behavior. The paper does not use Verus syntax.

Evidence and limits. The authors report that missing context causes execution and algorithm failures and recommend structured specifications (Section 6.1, p. 18). Inference: this supports a specification-first VL workflow, but it does not show that a structured prompt guarantees correct requirements.

## technique 2: iterative generator–evaluator loop with storage and selection

What it is. ADRS repeatedly generates or mutates a solution, executes it on a predefined workload, scores it, stores the solution and feedback, and selects promising candidates for future prompts (Section 4.2, pp. 5–6). A human can provide high-level observations through an outer loop (Section 4.2, p. 6). Most case studies use OpenEvolve with island-based evolutionary search.

How to apply it. Inference: these steps combine the cited recommendations into a procedure.

1. Initialize Storage with a base program and its score (Sections 4.2 and 6.1, pp. 6, 18).
2. Have the Prompt Generator combine the problem statement, context, and selected prior solutions and feedback (Section 4.2, p. 6).
3. Ask one or more LLMs to generate a new or refined implementation (Section 4.2, p. 6).
4. Run syntax/interface checks and workload evaluation, then record score, metrics, and feedback (Sections 4.2 and 5.1.1, pp. 6, 10).
5. Select diverse high-quality candidates, feed them back into prompts, and stop on a target score, budget exhaustion, or researcher decision (Sections 4.2 and 6.4, pp. 6, 19).

Verus form. Inference: compile every generated Rust change with Verus and retain only candidates that pass the required proof obligations before performance ranking. Inference: store the exact source, verifier version, specification hash, solver settings, workload, and proof diagnostics with each candidate. This extends ADRS’s Storage and Evaluator but is not reported by the paper.

Evidence. The paper’s Table 1 summarizes 11 tasks. For example, Telemetry Repair used 300 iterations over eight hours at ≤$10, Global Model Placement 70 iterations over 40 minutes at ≤$5, and Transaction Scheduling 100 iterations in under two hours at ≤$20 (Table 1, p. 8). The authors caution that reported time excludes researcher setup and that students used widely different configurations, so direct comparisons are difficult (Table 1 footnote and Section 5, pp. 7–8).

## technique 3: simulator-based evaluation and sampled feedback

What it is. ADRS usually evaluates in a simulator because a real system is too large for current context windows and simulator runs are much faster (Section 4.2, p. 6). In the single-region deadline case, OpenEvolve samples 30% of traces for search feedback to reduce overfitting, then reports final results on the full evaluation set (Section 5.1.1, p. 10). The evaluator checks syntax and interface compliance, tests sampled traces, and reports mean, deviation, count, and trace features (Section 5.1.1, p. 10).

How to apply it. Inference: these steps combine the cited recommendations into a procedure.

1. Build a simulator that captures behaviors relevant to the objective and correctness constraints (Sections 3 and 7.2.1, pp. 4, 20–21).
2. Use a feedback subset during evolution and reserve a broader set for final evaluation (Section 5.1.1, p. 10).
3. Include workload diversity and edge cases to detect overfitting (Section 6.3, p. 19).
4. Compare candidates on the full evaluation set and report per-configuration statistics, not only an aggregate score (Section 5.1.1, p. 10).
5. Validate promising candidates on an emulator or real system when simulator fidelity is uncertain (Section 7.2.1, pp. 20–21).

Verus form. Inference: use Verus proofs as a fast semantic evaluator and simulator or benchmark runs as a separate performance evaluator. Inference: a simulator cannot discharge proof obligations about memory safety, ownership, or crash behavior; those require explicit specifications and checked proofs.

Evidence and limits. The paper states: “Simulator-based verification is relatively cheap.” (Section 3, p. 4.) It also warns that building inexpensive but faithful simulators for complex systems is difficult (Section 3, p. 4). Inference: a simulator can reward an implementation that exploits an abstraction mismatch, so VL should test abstraction boundaries and linked implementations.

## technique 4: evolutionary algorithm discovery with concrete systems examples

What it is. OpenEvolve’s case studies show how a search can discover local algorithmic changes. In deadline scheduling, the evolved policy tracks recent spot availability with a sliding window, classifies stability, compares slack to adaptive safety margins, switches to on-demand to rebuild slack, and waits rather than taking unreliable spots (Section 5.1.1, pp. 10–11). It used four islands, 400 iterations, 20% GPT-5 and 80% Gemini 2.5 Pro, and cost under $20 (Section 5.1.1, p. 10). The best policy appeared at iteration 389, improved average cost savings 7% over Uniform Progress, up to 16.7% per trace, and met all deadlines (Section 5.1.1, p. 10).

In the MoE load-balancing case, the search replaced Python loops with tensor operations and discovered a zigzag placement pattern that alternates assignment order across blocks (Section 5.2, pp. 12–13). The simulator has 168 lines, uses ShareGPT and GSM8K traces, and the baseline rebalances in 19.6 ms with imbalance factor 0.66; the evolved policy takes 3.7 ms with similar imbalance, a 5.0× speedup (Section 5.2, pp. 12–13).

In the SQL case, the search preserves row and field membership while reordering for prefix KV-cache reuse. The evolved policy caches value lengths, raises a recursion threshold, uses a lazily updated frequency map, avoids expensive Pandas lookups, and orders fields to match the preceding row; it achieves similar prefix hit rate with 3× lower reordering runtime (Section 5.3, pp. 13–15).

In transaction scheduling, online search rediscovers Shortest Makespan First but does not beat the state of the art under O(n) and online constraints. Offline search combines lexicographic initialization by write count and length, greedy insertion, pair-swap hill climbing, and random restarts; it reduces makespan 34% relative to SMF (Section 5.4, pp. 15–17).

Verus form. Inference: these patterns suggest a search space of small Rust policy changes constrained by Verus contracts. A candidate should preserve functional invariants while optimization metrics rank verified implementations. Inference: the paper’s measured speedups do not establish semantic equivalence beyond its simulator checks; Verus can supply that missing obligation only where the behavior is specified.

## technique 5: failure taxonomy and defensive search practice

What it is. The paper groups ADRS failures into runtime errors, search failures, and algorithm failures (Section 6, pp. 16–18). Runtime errors include syntax/interface errors and budget exhaustion. Search failures include premature convergence, stuck loops, and mutation drift. Algorithm failures include misaligned objectives, shallow optimizations, overfitting, and reward hacking (Table 3, p. 18). Table 3’s distribution is estimated from 420 LLM-judged traces.

How to apply it. Inference: these steps combine the cited recommendations into a procedure.

1. Reject candidates that fail compilation, interface checks, or resource limits (Section 6, p. 17).
2. Detect repeated candidates, mutation drift, and early local optima in the search history (Table 3, p. 18).
3. Test objective constraints separately from the score so candidates cannot ignore them (Section 6.3, p. 19).
4. Use broad, diverse workloads and adversarial tests to reduce overfitting and reward hacking (Section 6.3, p. 19).
5. Balance exploration and exploitation with diverse selectors or island methods rather than purely greedy or random selection (Section 6.4, p. 19).

Verus form. Inference: classify verifier failures, solver timeouts, specification weakening, and proof-preserving semantic regressions as separate failure types. Inference: reject candidates that pass by adding `assume`, strengthening `requires` or weakening `ensures`, or moving the target function outside the proof boundary; these are VL controls, not ADRS findings.

Evidence and limits. The authors recommend two-model ensembles: reasoning models for exploration and non-reasoning models for efficient refinement, while warning that more than two models can create conflicting ideas and mutation drift (Section 6.2, p. 19). They recommend combining correctness, efficiency, and robustness signals and adding adversarial tests to resist reward hacking (Section 6.3, p. 19).

## technique 6: cascading evaluators and suitability boundaries

What it is. Section 7 recommends evaluator cascades from fast coarse cost models to slower high-fidelity simulators, emulators, and real-system tests (Section 7.2.1, pp. 20–21). It also identifies ADRS-suitable problems as those with isolated changes, reliable semantic/performance evaluation, and efficient evaluation; large cross-system changes, weak verifiers, expensive workloads, and directly solvable optimization problems are poor fits (Section 7.1, p. 20).

How to apply it. Inference: these steps combine the cited recommendations into a procedure.

1. Run a cheap syntax and contract check on every candidate; using Verus here is a proposed extension, not a paper result.
2. Begin performance evaluation with a fast, coarse cost model (Section 7.2.1, p. 21).
3. Run a higher-fidelity simulator and broader traces for survivors (Section 7.2.1, pp. 20–21).
4. Validate finalists on an emulator or real system and compare against baselines (Section 7.2.1, p. 21).
5. Check whether an existing solver can address the optimization problem directly; the authors expect ADRS to be less effective in that setting (Section 7.1, p. 20).

Inference: the first two stages can be Verus proof checks and lightweight tests, but performance, distributed failure, and hardware effects still require system-level evaluation. Inference: this cascade limits wasted LLM iterations while preserving evidence quality.

## what is measured, trusted, and not established

Table 1 summarizes 11 tasks, with four representative case studies in Section 5. It reports 26% lower multi-region scheduling cost against a single-region baseline, 18.5% cheaper global model placement, 3.9× faster LLM-SQL reordering, and 20% better offline transaction scheduling than greedy (Table 1, p. 8). However, several detailed accounts differ from the summary:

- Multi-region scheduling: Section 5's overview says “achieves 48% improvements over a strong baseline in a multiple-region setting” (p. 7), whereas Section 5.1.2 reports 26% average cost savings against a multi-region Uniform Progress baseline (p. 11).
- MoE placement: Table 1 says “Same balanceness, 2× faster runtime vs. internal implementation.” (p. 8), whereas Section 5.2 reports 5.0× and gives runtimes of 19.6 ms and 3.7 ms (p. 12).
- LLM-SQL: Table 1 says “Comparable hit rate, 3.9× faster runtime.” (p. 8); Section 5.3 reports 3× (pp. 13–14).
- Offline transactions: Table 1 compares against greedy and reports 20% (p. 8); Section 5.4 compares against SMF and reports a 34% makespan reduction (p. 16). Section 5.4 also names SMF as its initial program, then later names the random-scheme baseline as its initial program (p. 15).
- Global placement: Table 1 reports “18.5% cheaper than published solution.” (p. 8), while Appendix C.4 reports an 18.5% higher score for an objective based on maximum KV pressure ratio (p. 31).

Inference: these statements should remain separately attributed; the paper does not establish that the differing metrics and baselines are interchangeable. The authors explicitly caution that configurations differed: “This makes direct comparison difficult and highlights the need for systematic ablation studies to identify which configurations work best for different problems—an important direction for future work (see Section 7.2.2).” (Section 5, p. 8.)

Inference: the workflow relies on the problem formulation, evaluator and simulator fidelity, baseline implementation, workload selection, metric weighting, LLM-generated code, and human interpretation of results. The paper’s conclusion is empirical: “Our case studies show that the ADRS approach can already outperform human baselines on key performance problems.” (Section 9, p. 23.) Inference: this does not prove safety, functional correctness, or semantic equivalence for arbitrary generated code. Inference: threat to agent-written verified Rust is high if a benchmark score is treated as a correctness proof; it is lower when every candidate must first pass Verus contracts and then performance tests.

The paper already covers LLM evolutionary search, simulator feedback, island selection, workload evaluation, reward-hacking defenses, and cascading evaluators. Inference: VL should not redo these as generic ideas; a new VL contribution would connect the ADRS loop to machine-checked functional and safety specifications, quantify proof-repair cost, and test whether performance evolution preserves those specifications under real dependency and hardware changes.

## techniques for the catalog

- structured ADRS schema: specify problem, objective, constraints, code context, evaluator, baselines, selector, and analysis metrics before search
- generator–evaluator loop: generate or mutate candidates, execute them, store feedback, and select diverse promising solutions
- simulator with held-out traces: use fast sampled feedback during evolution and broad final workloads to detect overfitting
- failure taxonomy: separate runtime, search, and algorithm failures, including interface errors, mutation drift, reward hacking, and constraint violations
- cascading evaluation: progress from cheap checks to high-fidelity simulators, emulators, and real-system validation
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The search begins with the published GGR algorithm, which achieves a good Prefix Hit Rate (PHR) but suffers from repeated counter operations and deep recursion."): read the full paper, including references and appendices, and the full study; checked quotations, numbers, section and printed-page references, and technique steps; corrected the unrelated DOI to the paper’s arXiv identifier, page references, schema wording, and Verus precondition wording, and separated conflicting reported metrics and baselines; marked proposed procedures and conclusions as Inference; did not reproduce experiments, inspect implementation code, or independently validate the proposed Verus extensions.
