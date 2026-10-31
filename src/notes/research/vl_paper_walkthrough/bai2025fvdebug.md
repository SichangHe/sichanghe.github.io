# FVDebug: An LLM-Driven Debugging Assistant for Automated Root Cause Analysis of Formal Verification Failures
(authored by agents unless marked 🧑)
Tag: `bai2025fvdebug`, [paper](https://arxiv.org/abs/2510.15906)

## scope and result

Bai et al. present FVDebug, an LLM pipeline for diagnosing hardware formal-verification counterexamples (CEXs), proposing RTL fixes, and reporting evidence. Its four stages are causal-graph synthesis, Graph Scanner, Insight Rover, and Fix Generator. The paper states: “FVDebug is, to our knowledge, the first realistic debugger that automates the entire FV debug loop—from CEX to validated patch—while closely mimicking industrial engineering practice.” (Introduction, p. 2). The open benchmark is SVA-Eval-Human with 38 real hardware failures and human-verified fixes. On those cases the full system reports Quality@Best 0.956, Pass@1 71.1%, and Pass@5 86.8% (Introduction, p. 2; Table 1, p. 7).

“This structured output report enables verification engineers and RTL designers to collaborate effectively with a shared, precise understanding of the failure mechanism, replacing the fragmented debugging discussions currently scattered across communication channels or email threads.” (Introduction, p. 2)

Inference: the direct Verus use is debugging failed proof obligations and counterexamples. Hardware waveforms and Jasper commands do not carry over; the causal dependency, balanced analysis, competing hypotheses, and verified-patch loop do.

## technique: construct and consolidate a causal graph

Inference: use an explicit dependency graph when a counterexample is too long or temporally spread for flat-text inspection. Given a failing property, RTL, and CEX, create a graph G=(V,E). A node is a signal event `(signal, cycle, value)`; an edge is an immediate causal dependency (Section III-B, p. 3). Start at the property node and recursively query JasperGold's `visualize -why` at the violation cycle. For example, the paper says querying `ready_add@5=0` can return `valid_out@5=0` and `valid_in@5=1` as parents, creating edges from those events (Section III-B.1, p. 3).

Use a trace depth of 20 cycles by default to bound cost while retaining relevant history (Section III-B.1, p. 3). The recursive result is initially a tree. Merge duplicate nodes identified by the same signal-cycle pair (the implementation details specify `(signal_name, cycle, value)`), preserving all incoming edges, to obtain a DAG (Section III-B.2, p. 3; Appendix C-A, p. 15). The authors report that consolidation removes redundant analysis while preserving paths. In a CVA6 LSU failure, the graph has 170 nodes and 239 edges for 122 unique signals, while the design has 1,918 RTL lines across seven files (Table 2, p. 8).

Inference: for Verus, build a dependency graph from a failed Verus proof's counterexample, loop invariant variables, call chain, and relevant memory/state-machine transitions. A node can be `(function, source location, symbolic value or violated obligation)`; edges can come from dataflow, control flow, or a failed `requires`/`ensures` relation. Use compiler diagnostics and proof traces instead of `visualize -why`. A 20-step depth is a tunable heuristic, not a Verus rule. Keep the graph as diagnostic metadata; it does not itself prove causality.

## technique: retrieve context once and scan graph levels in token-aware batches

Before scanning, FVDebug extracts unique signal names and caches RTL snippets, specification excerpts, and design-documentation chunks. It uses a global cache for design-wide context and a node-specific cache for local context (Appendix C-B, p. 15). Fuzzy matching maps signal names to documentation variants; matches above a similarity threshold of 0.7 are accepted (Appendix C-B, p. 15).

Algorithm 1 scans nodes by topological level. For each level, it repeatedly binary-searches the largest batch that fits `max_tokens`, builds a prompt with the batch and cached context, invokes the LLM, parses one analysis per node, records suspicious nodes, and advances to the next batch (Algorithm 1, p. 4). The implementation configures a 50,000-token prompt budget; estimated single-node contexts are 800–1,200 tokens, and binary search usually needs 4–6 iterations. Observed batch sizes range from 3 to 8 around a target of 5 (Appendix C-C, pp. 15–16).

Inference: for Verus, cache source snippets, contracts, relevant lemma declarations, and the exact verifier diagnostic for each obligation. Batch independent proof nodes while preserving dependency order. A token budget controls LLM cost only; Verus still checks each generated patch. Fuzzy retrieval must be audited because an incorrect contract or similarly named function can mislead diagnosis.

## technique: force balanced for-and-against analysis

For every node, Graph Scanner asks the LLM for signal behavior, at least two arguments for suspicion, at least two arguments against suspicion, a balanced conclusion, a 0–1 suspicion score, root-cause-versus-symptom classification, and possible fixes (Section III-C.2, p. 4; Figures 4–6, pp. 18–20). The paper's prompt requires exact RTL file-and-line references and quoted RTL code; if context is absent it requires the explicit statement “RTL context not available for this signal” (Figure 4, p. 18).

The motivation is to avoid accepting behavior merely because it matches current RTL. In the accumulator example, `assign ready_add = valid_out | !valid_in;` evaluates to zero when `valid_in=1` and `valid_out=0`. Standard prompting calls this correct because the value matches RTL. For-and-against prompting instead argues that inverted `valid_in` is counterintuitive, while acknowledging that an unusual design or reset convention could explain it; it identifies a likely root cause and proposes `assign ready_add = valid_in & !valid_out;` (Appendix B, pp. 14–15).

Inference: for Verus, require the diagnostic model to list evidence that a failed obligation is a real code defect and evidence that the contract, invariant, or environment assumption could be wrong. Require exact Rust file/line and quoted code. Keep both branches in the report so engineers can distinguish implementation bugs from specification or harness errors.

## technique: explore competing hypotheses as narratives

Insight Rover initializes a hypothesis for each suspicious node. Each hypothesis stores a narrative, chronological timeline, evidence, confidence, and unexplored frontier (Section III-D.1, p. 4). Algorithm 2 repeatedly selects active hypotheses with confidence below 0.9, asks the LLM to choose a frontier node, analyzes it, updates the narrative, expands the frontier, manages weak narratives, and checks convergence; final hypotheses are ranked by an LLM (Algorithm 2, p. 5).

“This selective exploration reduces the search space by over 90% compared to breadth-first search.” (Section III-D.2, p. 5)

The narrative count is described inconsistently. Appendix C-D states “FVDebug maintains exactly three active narratives throughout exploration.” It then selects three seeds with suspicion scores differing by at least 0.1. Appendix C-E instead states “if 5 nodes are flagged as suspicious, 5 initial narratives are created.” Section III-D.1 likewise describes expansion to all suspicious nodes (pp. 4, 16). Inference: the paper does not establish which narrative limit the evaluated implementation used.

Appendix C-D caps each frontier at 20 nodes, prioritizing suspicion scores, and retains narratives below 0.2 confidence after three iterations for reporting. Appendix C-E considers relevance, information gain, and graph structure, and reports 15–20 explored nodes per hypothesis versus more than 100 for breadth-first search (p. 16). Section III-D.2 separately claims the reduction of over 90% quoted above (p. 5). Inference: the appendix's counts alone do not establish a reduction above 90%.

Appendix C-F describes pairwise ranking with weighted criteria: causal sufficiency 0.3, evidence quality 0.25, mechanistic clarity 0.25, actionability 0.15, narrative coherence 0.05 (p. 16). Figure 14 instead annotates its overall score as “Average of the five scores” (p. 26). Inference: the weighting used in the evaluated ranking is unclear.

Inference: for Verus, seed hypotheses from failed assertions, counterexample states, suspicious contract clauses, and call sites. Explore caller/callee and dataflow neighbors, but include alternate explanations such as a missing precondition or an over-strong postcondition. Rank by whether the explanation reproduces the verifier failure and whether a candidate repair verifies. LLM confidence is advisory.

## technique: generate and validate fixes through diverse strategies

Section III-E lists “full context, suspicious focus, narrative focus, minimal context, bugs-and-suggestions-only”, followed by a best-of meta-strategy (p. 5). Figure 12 supplies those five context templates (p. 24). Appendix C-G instead describes five strategies by listing four contexts plus best-of, and limits narrative focus to the top hypothesis, whereas Figure 12 includes up to five narratives (Appendix C-G, p. 16; Figure 12, p. 24). Inference: the strategy count and narrative coverage are inconsistent; the study cannot establish a single exact configuration.

Appendix C-G says each strategy operates by “attempting up to twice if initial generation fails validation” (p. 16). `ValidateFix` checks that buggy code can be located in the RTL: Section III-E.1 names exact substring matching, whitespace handling, and structural alignment (p. 5). Appendix C-I calls the process three stages but explains only exact and whitespace-normalized matching before discarding failures (p. 17). Inference: this application check alone does not establish functional correctness; Jasper reruns provide the separate Pass@k evaluation.

`CreateSignature` normalizes and hashes buggy/fixed code pairs for deduplication (Appendix C-H, pp. 16–17). Appendix C-J states “the consensus boost is calculated as min(0.2 · 𝑘, 0.6)”, with k strategies out of five, and combines it with the original confidence (p. 17).

Algorithm 3 therefore is: build a strategy prompt, generate and parse fixes, validate each against RTL, merge equal signatures, and rank by consensus (Algorithm 3, p. 6). Reports include ranked hypotheses, evidence, a causal timeline, concrete fixes with validation status, and specification references (Section III-E.2, p. 6).

Inference: for Verus, generate candidate Rust edits, contract changes, or proof lemmas under several context selections. Validate that the edit applies cleanly, then run Verus and relevant tests. Deduplicate patches by normalized source and contract text. Consensus among LLM prompts is only a ranking signal; a patch passes only if the verifier and tests accept it.

## evidence, measurements, and boundaries

On SVA-Eval-Human's 38 failures, Table 1 reports for full FVDebug: Quality@Best 0.956, NDCG@5 0.983, MRR 0.858, Kendall's τ 0.708, Pass@1 0.711, and Pass@5 0.868 (p. 7). Pass@k is measured by applying each proposed fix to RTL and rerunning Jasper; Pass@1 is first-attempt success and Pass@5 means at least one of five suggestions fixes the failure (Section IV-A.2, p. 7). Removing Rover lowers Quality@Best to 0.795 and Kendall's τ to −0.176; removing the ensemble leaves Quality@Best 0.956 but lowers Pass@5 to 0.763 (Table 1, p. 7).

On two CVA6 processor failures, full FVDebug reaches Quality@Best 0.713, NDCG@5 0.875, MRR 0.667, and Kendall's τ 0.371 (Table 3, p. 9). On two proprietary designs of 560,202 and 554,983 RTL lines, the system uses 163 and 67 Jasper calls, 25 and 21 LLM calls, and runs in 4m12s and 6m07s; these are case-study counts, not averages (Table 4, p. 9). The paper reports expert-rated “Excellent Match” and “Strong Match” diagnoses for the two masked cases (Section IV-E, p. 9).

The benchmark uses o3-mini for every compared method (Section IV-A.1, p. 6). Hypothesis metrics are LLM evaluations against human ground truth: “Quality@Best: Evaluates the absolute quality of the best hypothesis generated, regardless of ranking.” (Section IV-A.2, p. 7). Figures 15–16 score relevance, preciseness, causal timeline, and correctness, then average the four scores (pp. 27–28). Inference: Quality@Best 0.956 is an evaluator score, not a 95.6% verified diagnosis rate.

The CVA6 results cover the MMU ghost response and LSU transaction-ID mismatch. The paper states “automated fix generation for such multi-line issues remains future work” (Section IV-D, p. 8). Table 2 gives the LSU graph as 170 nodes and 239 edges, while the adjacent prose gives 169 nodes and 1,145 edges (p. 8). Inference: use the table values as reported table values, without treating the conflicting graph counts as resolved.

Inference: a Verus adaptation would depend on faithful proof traces, source/contract retrieval, LLM diagnosis, ground truth, and the verifier used to check patches. A diagnosis can confuse an implementation bug with a specification error, and a suggested contract change can weaken the property. Use the approach to collect evidence and propose repairs; check the intended contract as well as verification and regression results. The paper evaluates hardware debugging, so benefits for Verus remain untested.

## techniques for the catalog

- causal CEX graph — recursively derive signal-event dependencies and merge reconvergent trees into a DAG
- token-aware graph scanning — pre-cache context and binary-search batches under a token budget while scanning topological levels
- for-and-against prompting — require evidence on both sides, exact source references, and a balanced suspicion score
- agentic hypothesis exploration — maintain competing narratives, select informative frontier nodes, and rank evidence-backed explanations
- ensemble fix generation — generate patches from diverse context strategies, validate application, deduplicate, and rank by consensus
- structured debug report — emit hypotheses, evidence, causal timeline, validated fixes, and specification cross-references
