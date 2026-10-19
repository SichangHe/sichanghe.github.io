# RFCAUDIT: AI Agent for Auditing Protocol Implementations Against RFC Specifications
(authored by agents unless marked 🧑)
Tag: `zheng2025rfcaudit`, [paper](https://arxiv.org/abs/2506.00714v2)

## scope and result

Zheng et al. present RFCAUDIT, a two-agent system for finding functional inconsistencies between network-protocol code and RFC prose. An indexing agent builds hierarchical natural-language summaries of functions, files, directories, and repositories. A detection agent localizes code for each RFC property, compares code with the property, retrieves additional context on demand, and self-critiques suspected bugs (Sections III-A–B, pp. 4–6). The introduction claims, “We introduce a multi-agent design that summarizes code functionalities as semantic indexes and leverages them for demand-driven code retrieval, facilitating functional bug detection with high precision.” (Section I, p. 2)

The method targets non-crashing semantic bugs (Section II-A, p. 3). Its main evaluation covers six protocol implementations from FRRouting and lwIP and produces 83 bug reports. It reports 68 true positives among 83 reports (81.9% precision), 47 unique bugs (40 new, 7 previously reported), and 20 of the 47 confirmed by developers or with patches approved or merged (Section IV-B1 and Tables I–II, p. 7). The 131 RFC properties belong to a sampled context-retrieval study, not the entire bug-detection evaluation (Section IV-B2, p. 8). Inference: these counts measure report accuracy and distinct bugs, not formal proof success.

The authors frame the system as “the first LLM agent for detecting functional bugs in network protocol implementations.” (Section I, p. 2)

## technique: bottom-up semantic indexing

What it is: summarize code from functions upward so RFC prose can be mapped to implementation regions (Section III-A, pp. 4–5). The index is produced once and can be incrementally updated when code changes.

How to apply it:

1. Prompt an LLM for a one- or two-sentence summary of each function (Figure 4, p. 5)
2. Aggregate function summaries within each file and prompt a file-level description
3. Combine summaries of files and subdirectories into directory descriptions, continuing upward to the repository summary (Section III-A, pp. 4–5)
4. Preserve the hierarchy so a detector can navigate from an RFC section to likely files and functions (Figure 4)

The Babel example summarizes `route_lost`, `find_best_route`, and `send_update_resend`; retrieval then reaches related code in a different file (Examples 1–2, pp. 5–6). The paper reports an average Phase 1 cost of $1.89 per repository using Claude 3.5 Sonnet, 287K input and 66K output tokens, and 42 minutes (Table V, p. 9). Inference: for VL, a similar index can summarize Rust modules, trait implementations, state-machine transitions, and proof lemmas before asking an agent to align a natural-language requirement with code.

Verus form: Inference: keep the index as retrieval metadata. Express the selected requirements with explicit `requires`, `ensures`, invariants, and `proof fn` lemmas. Verus can check the resulting proof obligations; neither successful verification nor index summaries establish that the contracts capture every RFC requirement.

## technique: retrieval-guided detection with self-critique

What it is: walk a finite-state audit workflow—localize, detect, retrieve if context is insufficient, then validate a suspected bug (Section III-B, pp. 5–6). The detection agent can invoke `Query(name)` for data-structure and macro definitions, `Query_Callee(call)` for the callee definition at a specified call site, and `Query_Caller(fun)` for all callers of a function (Retrieval, p. 6).

How to apply it:

1. Segment the RFC by section and subsection headings and extract mandatory semantic properties from each subsection (Section III-B, p. 5)
2. Traverse the semantic index top-down to select relevant directories, files, and functions (Localization, p. 5)
3. Ask whether the available code satisfies the property; return yes and stop for that property, no with a bug explanation, or unknown when context is insufficient (Detection, Figure 6b, p. 6)
4. If unknown, retrieve data-structure or macro definitions, a callee definition, or all callers, as needed, and repeat the comparison (Retrieval, Figure 6c, p. 6)
5. Ask the detection agent to review the RFC, retrieved code, and reasoning chain; report violations it confirms and discard rejected candidates. This review may also find previously missed bugs (Validation, Figure 6d, p. 6)

In the motivating Babel case, retrieval reveals that only feasible routes are searched and that fallback code omits a sequence-number request required by RFC 8966 (Example 2, p. 6). The authors state, “When a potential functional bug is found, the detection agent examines the reasoning chain that produces the reported bug via self-criticism (Validation).” (Section III-B, p. 5) The paper reports that self-critique reduces the false-positive rate from 63.9% to 18.1%, a 71.7% relative reduction (Section III-B, p. 6). Removing retrieval drops precision from 81.9% to 47.1% and discovered bugs from 47 to 36 (Section IV-E and Table VI, p. 10). Removing semantic indexing drops precision to 51.4% and bugs to 26 (Section IV-E, pp. 9–10).

Verus form: Inference: use retrieval to propose candidate proof obligations and counterexample contexts, then express the resulting requirement as a Verus contract or lemma. A self-critic can reject an obligation whose precondition is not established by callers, but it cannot replace the verifier. The closest Verus analogue is a proof review loop that retrieves neighboring transition functions until all state changes needed for an invariant are present.

## evidence, trust, and limits

RFCAUDIT's retrieval study samples 30 RFC subsections (five per protocol) covering 131 properties. Localization retrieves 102 of 143 ground-truth functions (71.3% recall); after retrieval, function recall is 136/143 = 95.1%, type recall 7/9 = 77.8%, and macro recall 6/8 = 75.0% (Section IV-B2 and Table III, p. 8). Table V reports averages of 1,123K input and 90K output tokens, $5.03, and 81 minutes per protocol (p. 9). Its input-token totals are internally inconsistent: Babel's phases list 261K and 1,340K, but its total is 1,061K; the phase averages are 287K and 926K, but the total average is 1,123K. Inference: treat the reported input-token total as uncertain.

The authors classify the 15 false positives as incomplete context retrieval (3), RFC misinterpretation (6), code misinterpretation (5), and an intentional implementation choice (1) (Section IV-B3, p. 8). They also acknowledge that manual classification can introduce subjective bias; two authors independently reviewed reports and resolved disagreements through discussion (Section IV-G, p. 10). Inference: using this technique to propose VL proof obligations depends on RFC interpretation, semantic summaries, retrieval tools, and LLM reasoning. A plausible report needs independent checking before it supports a repair.

Inference: VL could reuse staged retrieval and validation to connect RFCs or design documents with candidate contracts. The paper evaluates bug detection, not Verus proofs or completeness of formal specifications.

## techniques for the catalog

- hierarchical semantic indexing — summarize functions, files, directories, and repositories bottom-up for code localization
- demand-driven retrieval — fetch definitions, callees, and callers only when current context is insufficient
- staged conformance detection — localize, compare with the specification, retrieve, and validate in a finite-state workflow
- self-critique validation — review the full reasoning chain to filter false positives
- recall-first context collection — prefer retrieving extra relevant code over missing a function needed to establish a property

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Since this annotation is labor-intensive, we sample 30 RFC subsections (5 per protocol) from our datasets, covering a total of 131 properties across six protocols."): checked the complete paper text, quotations, counts, section and PDF page references, and technique steps; corrected the introduction quote attribution, page references, evaluation scope, retrieval-tool descriptions, and unsupported Verus coverage claim, marked conclusions as inferences, flagged inconsistent input-token totals, and replaced the link using the paper's arXiv identifier; did not independently reproduce experiments, inspect the artifact, or verify developer confirmations.
