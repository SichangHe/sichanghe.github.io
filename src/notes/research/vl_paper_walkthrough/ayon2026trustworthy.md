# From Helpful to Trustworthy: LLM Agents for Pair Programming
(authored by agents unless marked 🧑)
Tag: `ayon2026trustworthy`, [paper](https://doi.org/10.1145/3803437.3804875)

## scope and evidence
This two-page doctoral research paper proposes a driver–navigator pair-programming workflow. It reports preliminary specification-generation results and plans further studies, rather than evaluating the proposed end-to-end workflow. Ayon states: “Trust thus shifts away from one model’s assessment of another and toward externally verifiable evidence, leaving the developer with one concrete responsibility: confirming that the specification captures their intent.” (§1, p.1) The preliminary results concern AutoReSpec on 72 programs and AutoJML on 120 programs (§3, p.2). The paper reports no Verus implementation or benchmark of the proposed pair workflow. Its DOI appears in the ACM reference on p.1.

## technique: role-separated driver and navigator
The driver proposes artifacts and the navigator critiques them. They use role-specific prompts and separate interaction histories while sharing persistent project context. The roles can use the same base model with different prompts or models specialized for generation and review; two distinct models are not required. The navigator produces machine-checkable contracts and formal specifications rather than free-form judgments. Deterministic verifiers validate these and return proofs or counterexamples. The developer must confirm that the specification captures intent (§1, p.1).

Ayon describes the motivation as “a minimal and interpretable separation between proposal and critique” (§1, p.1).

## technique: verifier-guided specification refinement
Ayon describes AutoReSpec as a framework for JML synthesis that “classifies programs by structural complexity, selects a pair of primary and fallback LLM pair, and iteratively refines specifications using verifier feedback” (§3, p.2). When the primary model fails, “a collaborative fallback model receives the last failed candidate and verifier errors for focused recovery” (§3, p.2). The reported sequence is complexity classification, model selection, iterative specification refinement with verifier feedback, and fallback recovery after primary-model failure. The paper gives no iteration budget or detailed stopping policy.

The reported result is 67 verified programs on a 72-program benchmark, a 58.2% success probability, 69.2% completeness, and a 26.89% reduction in average evaluation time over prior methods (§3, p.2). The paper does not define the success-probability calculation or completeness measure here. Inference: 58.2% must not be presented as the fraction of the 72 programs verified; it differs from 67/72. The paper gives no confidence intervals, per-class counts, or detailed baseline results.

## technique: mutation-driven completeness feedback
Ayon writes: “AutoJML automates JML specification synthesis via iterative verification and mutation-driven completeness feedback, and additionally leverages web-based context retrieval [2].” (§3, p.2) AutoJML studies ReAct-based LLM agents. This paper does not specify the mutation operators, completeness formula, retrieval schedule, or order of tool calls. A detailed mutation algorithm cannot be reconstructed from this description alone.

AutoJML verified 109 programs on a 120-program benchmark, with average completeness of 79.3%. The paper reports improvements over baselines on multi-path loops (81.48%) and nested loops (85.71%), but does not explicitly identify the measure for those two percentages or provide subset sizes (§3, p.2). They should not be labeled completeness rates.

## planned maintenance technique
The proposed maintenance study would anchor refactoring, dependency upgrades, and documentation updates to pre-existing specifications and test suites (§2, pp.1–2). The future plan includes solver-backed counterexamples during refinement and asks whether test and specification constraints prevent regressions during maintenance and migration. It also asks whether generated documentation is accurate and useful or introduces misleading or biased statements (§3, p.2). These are research questions, not demonstrated outcomes.

## techniques for the catalog
- role-separated pair programming: a proposing driver and a contract-producing navigator use separate histories and shared project context
- verifier-guided refinement: classify program complexity, select primary and fallback models, and give the fallback the last failed specification and verifier errors after primary failure
- mutation completeness feedback: AutoJML combines iterative verification, mutation-driven feedback, and web-based context retrieval; this paper leaves mutation details unspecified
- specification-constrained maintenance: the planned study uses existing specifications and tests to constrain maintenance changes;
