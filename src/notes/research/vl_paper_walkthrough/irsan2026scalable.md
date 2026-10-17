# Towards Scalable and Cost-Efficient Vulnerability Detection: A Study on Automatic Query Generation
(authored by agents unless marked 🧑)
Tag: `irsan2026scalable`, [paper](https://arxiv.org/abs/2609.10412)

## problem and result

This study generates executable CodeQL queries from vulnerability-fix commits (VFCs) and evaluates them on Java CVEs. Its pipeline separates semantic analysis, API retrieval, predicate synthesis, query composition, compilation, and syntax repair. The authors report that “CodeQL enables security practitioners to write declarative queries to detect vulnerability patterns” (Introduction, p. 2), but manual query authoring limits coverage.

The data uses 10 CWE categories. Table 1 has 80 CVEs (up to 20 code-segment seeds per category) for mining and 112 held-out CVEs for evaluation. A CVE can yield multiple CVE-code segment pairs. The default CodeQL suite detects 19/112 (16.96%) with average F1 13.20 (Table 4). Kimi K2.5-generated queries detect 50/112 (44.64%), average F1 24.04, and average false discovery rate (FDR) 89.92%. Thus the claimed 82% F1 improvement is 24.04 versus 13.20, although the paper does not state a confidence interval. Raw detection count and F1 have different meanings and must not be conflated.

## technique 1: decompose synthesis into semantic agents

The pipeline's phases are described in §3.2: “Our pipeline bridges this gap by automatically generating vulnerability-specific CodeQL queries from VFCs (Figure 1), decomposing the task into three phases: semantic analysis, guided synthesis, and iterative refinement.” The six components are:

1. Vulnerability Assessor and Reasoner reasons over the commit changes, decides whether the VFC is relevant and generalizable into a detection pattern, summarizes the fixed vulnerability's core characteristics, and discards the instance (ending synthesis for it) if not.
2. Relevant Documentation Retriever uses the CWE ID as the query to an LLM-based search engine (a RAG component) that extracts the standard CodeQL APIs and predicates for that vulnerability class.
3. Predicate Generator identifies vulnerability patterns from pairs of VFCs and their vulnerable versions and, using the retrieved documentation, translates them into CodeQL predicates.
4. Query Generator composes predicates into a complete `select-from-where` query.
5. Compilability Checker invokes the CodeQL compiler.
6. Syntax Refiner is triggered when compilation fails and iteratively corrects the errors, with up to three attempts.

The paper gives the separation rationale: “the separation of concerns allows the Predicate Generator to focus on low-level semantic logic, while the Query Generator manages the high-level orchestration and syntactic integration” (§3.2, item 4). Inference: for Verus, use one agent to extract a behavioral obligation from a bug or issue, a second to retrieve applicable Verus idioms and library contracts, a third to draft `requires`/`ensures` and loop `invariant` clauses, and a verifier-driven repair agent to fix diagnostics. The final Rust must be checked by Verus; a generated predicate or specification is not evidence of correctness.

## technique 2: compiler-in-the-loop syntax refinement

Single-shot generation is syntactically weak. Without refinement, Table 2 reports compilable-query counts of 17 for Gemini 3 Flash Preview, 5 for DeepSeek R1 and Grok Code Fast, 4 for Kimi K2.5, 2 for GPT-5.2 Codex, and zero for several models. Adding the refiner (Table 3) raises Kimi K2.5 to 96 compilable queries at USD 12.99 and Sonnet 4.5 paired with Gemini to 120 at USD 37.10. The authors conclude: “By providing iterative feedback, it effectively directs the LLM to produce compilable code” (§5, RQ1, discussion after Table 3). They also pair GPT-5.2 Codex and Sonnet 4.5 with Gemini 3 Flash Preview as the refiner (105 and 120 compilable queries).

Inference: to apply the method, compile every generated artifact, capture exact diagnostics, ask the refiner to edit only the failing syntax or API use, and repeat at most three attempts (the paper specifies the three-attempt limit, not the other details). Substitute `verus` for CodeQL compilation, feed verifier diagnostics and failing assertions back to the repair model, and preserve a hash of the source and toolchain for reproducibility. Use only constructs documented for Verus: executable functions with `requires`/`ensures`, loop `invariant` declarations, `assert`, and separate `proof fn`; do not mark the function under verification `external_body`.

## technique 3: API retrieval and constrained context

The retriever narrows CodeQL's large library before generation: “the agent enhances generation efficiency by constraining the search space to only the most relevant candidates” (§3.2, item 2). It queries by CWE ID and supplies standard APIs and predicates to the predicate generator. Inference: a VL implementation can retrieve Verus library lemmas, existing verified data-structure contracts, and project-specific proof patterns using the obligation's type and failure category. Retrieval is an aid to generation; imported lemmas and dependency contracts remain trusted assumptions unless proved in the current build.

## technique 4: evaluate detection, precision, and cost together

The study reports detection count, detection rate, average FDR, average F1, compilation count, duration, and API cost. On the all-CVE test set (112 CVEs), Claude Sonnet plus Gemini detects 51/112 (45.54%) but has F1 11.94 and FDR 93.13%; Kimi detects 50/112 with F1 24.04. On short-fix test cases (25 CVEs), GPT-5.2 Codex plus Gemini, with patterns mined from all data, detects 10/25 (40%), F1 30.53, while CodeQL detects 5/25 (20%), F1 10.43 (Table 7). Short fixes are defined as changes of at most 10 lines in one file (§5, RQ3), a proxy for intra-procedural bugs.

The cost result is specific: “the model generated 96 CodeQL queries for less than 13 USD, successfully detecting 50 CVEs within the benchmark” (§5, RQ4). The paper also says this is “a 263% increase in the detection rate over the CodeQL baseline, rising from 19 to 50 detected vulnerabilities”; the arithmetic is (50−19)/19=163% relative increase (50/19=263% of baseline), so the stated 263% is inconsistent if it means relative increase. Inference: VL should report verifier-pass rate, specification coverage, false-proof rate from deliberately weakened contracts, tokens, and repair cost with explicit denominators, rather than one success percentage.

## failure mode and assumptions

High recall can hide unusable alerts. A query derived from CVE-2022-40152 flagged over 500 files; manual review found representative “dead code.” The authors state: “Although the CodeQL alert was technically accurate, as logic poses a legitimate risk if executed, the specific code segment is never called within the application” (§6.1). They recommend reachability analysis to reduce false positives. Inference: analogous VL failures include proofs that satisfy an over-weak contract or prove unreachable code; review must compare the specification to the intended behavior and exercise reachable callers.

The study excludes direct LLM repository scanning because one Kimi scan costs USD 17 and projected 100-repository scans exceed USD 1,500; these are author estimates, not measurements of every deployment. It uses CodeQL v2.17.3 in `--build-mode none`, Java repositories, OpenRouter models, and a time-separated test split. Inference: results therefore do not establish effectiveness for C/C++, multi-file interprocedural bugs, or Verus specifications.

## what is proved, trusted, and threatening to VL

Inference: the only formal acceptance artifact is a compiling CodeQL query; compilation does not prove that the query captures the intended vulnerability. Vulnerability labels (MoreFixes ground-truth files), repository reachability, CodeQL libraries, LLM outputs, and FDR calculations are trusted. Threat to VL is medium. The staged synthesis and compiler-repair pattern is directly reusable for agent-written Verus, but high FDR and dead-code alerts show that syntactic acceptance is far below semantic correctness. VL should reuse decomposition, retrieval, and bounded repair while requiring Verus proofs plus specification review. The paper already establishes this CodeQL pipeline and its benchmark results; VL should not claim them as new Rust evidence.

## techniques for the catalog

- staged vulnerability-to-query synthesis — separate semantic assessment, API retrieval, predicate generation, query composition, compilation, and repair
- compiler-in-the-loop refinement — iterate from exact compiler diagnostics with a bounded number of syntax repair attempts
- CWE/API retrieval grounding — constrain generation with documentation and predicates selected for the vulnerability class
- joint quality and cost evaluation — report detection, FDR, F1, compilation, token/cost, and denominators together
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Based on the intuition that LLMs may distill information more effectively from concise contexts, we investigated whether restricting the input to CVEs"): read the whole paper text and checked every quotation word for word, the Tables 1-7 numbers (counts, rates, FDR, F1, costs, 82% and 263% claims, 65%/25% cost ratios), section references, the six pipeline components, the three-attempt limit, the short-fix definition, the 500-file false-positive case and the USD 17/1,500 scan-cost estimates. Changed: the link (the paper text gives arXiv:2609.10412, its DOI is a placeholder), the first quote (capital O, restored "(Figure 1),"), section pointers (§3.2, §5 RQ1 discussion), component descriptions to the paper wording, the 263% wording (paper says detection rate), and marked author-added advice and trust claims as Inference. Not checked: the cited external works, figures (Fig. 2, Fig. 3 per-CWE bars), the replication package, and Verus applicability.
