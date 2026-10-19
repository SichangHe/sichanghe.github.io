# From Helpful to Trustworthy: LLM Agents for Pair Programming
(authored by agents unless marked 🧑)
Tag: `ayon2026trustworthy`, [paper](https://doi.org/10.1145/3803437.3804875)

## scope and evidence
This two-page doctoral research paper proposes a driver–navigator pair-programming workflow. It reports preliminary specification-generation results and plans further studies, rather than evaluating the proposed end-to-end workflow. Ayon states: “Trust thus shifts away from one model’s assessment of another and toward externally verifiable evidence, leaving the developer with one concrete responsibility: confirming that the specification captures their intent.” (§1, p.1) The preliminary results concern AutoReSpec on 72 programs and AutoJML on 120 programs (§3, p.2). The paper reports no Verus implementation or benchmark of the proposed pair workflow. Its DOI appears in the ACM reference on p.1.

## technique: role-separated driver and navigator
The driver proposes artifacts and the navigator critiques them. They use role-specific prompts and separate interaction histories while sharing persistent project context. The roles can use the same base model with different prompts or models specialized for generation and review; two distinct models are not required. The navigator produces machine-checkable contracts and formal specifications rather than free-form judgments. Deterministic verifiers validate these and return proofs or counterexamples. The developer must confirm that the specification captures intent (§1, p.1).

Ayon describes the motivation as “a minimal and interpretable separation between proposal and critique” (§1, p.1). Inference: VL could use this division to separate proposed Rust changes from contract review, with Verus providing verification feedback. This paper does not establish that separate histories reduce errors or make the roles statistically independent.

## technique: verifier-guided specification refinement
Ayon describes AutoReSpec as a framework for JML synthesis that “classifies programs by structural complexity, selects a pair of primary and fallback LLM pair, and iteratively refines specifications using verifier feedback” (§3, p.2). When the primary model fails, “a collaborative fallback model receives the last failed candidate and verifier errors for focused recovery” (§3, p.2). The reported sequence is complexity classification, model selection, iterative specification refinement with verifier feedback, and fallback recovery after primary-model failure. The paper gives no iteration budget or detailed stopping policy.

The reported result is 67 verified programs on a 72-program benchmark, a 58.2% success probability, 69.2% completeness, and a 26.89% reduction in average evaluation time over prior methods (§3, p.2). The paper does not define the success-probability calculation or completeness measure here. Inference: 58.2% must not be presented as the fraction of the 72 programs verified; it differs from 67/72. The paper gives no confidence intervals, per-class counts, or detailed baseline results.

Inference: VL could pass a failed Rust candidate and Verus diagnostics to a fallback model. Whether the JML results transfer to Verus requires evaluation; the paper provides no Rust-specific recovery procedure.

## technique: mutation-driven completeness feedback
Ayon writes: “AutoJML automates JML specification synthesis via iterative verification and mutation-driven completeness feedback, and additionally leverages web-based context retrieval [2].” (§3, p.2) AutoJML studies ReAct-based LLM agents. This paper does not specify the mutation operators, completeness formula, retrieval schedule, or order of tool calls. A detailed mutation algorithm cannot be reconstructed from this description alone.

AutoJML verified 109 programs on a 120-program benchmark, with average completeness of 79.3%. The paper reports improvements over baselines on multi-path loops (81.48%) and nested loops (85.71%), but does not explicitly identify the measure for those two percentages or provide subset sizes (§3, p.2). They should not be labeled completeness rates.

Inference: VL could investigate whether mutation feedback exposes missing Rust contract properties. Mutation results would depend on the chosen mutations; this paper does not validate that transfer or show that mutation feedback proves completeness.

## planned maintenance technique
The proposed maintenance study would anchor refactoring, dependency upgrades, and documentation updates to pre-existing specifications and test suites (§2, pp.1–2). The future plan includes solver-backed counterexamples during refinement and asks whether test and specification constraints prevent regressions during maintenance and migration. It also asks whether generated documentation is accurate and useful or introduces misleading or biased statements (§3, p.2). These are research questions, not demonstrated outcomes.

Inference: VL could rerun tests and Verus verification after maintenance changes and retain commands, tool versions, and assumptions to support reproducibility. These recording details are a proposed application, not a procedure reported in this paper.

## what remains trusted and threat to VL
The proposed workflow relies on verifier results and the developer’s confirmation of intent (§1, p.1). The conclusion plans comparison with single-agent baselines (§4, p.2); it does not report that comparison. Inference: the relevance to VL is the combination of role separation, explicit contracts, and external verification feedback. These mechanisms alone do not establish that a specification includes every required property. A numerical or categorical threat rating for VL cannot be established from the reported results. Existing verifier-guided synthesis is prior work; whether VL contributes a distinct improvement requires its own evidence.

## techniques for the catalog
- role-separated pair programming: a proposing driver and a contract-producing navigator use separate histories and shared project context
- verifier-guided refinement: classify program complexity, select primary and fallback models, and give the fallback the last failed specification and verifier errors after primary failure
- mutation completeness feedback: AutoJML combines iterative verification, mutation-driven feedback, and web-based context retrieval; this paper leaves mutation details unspecified
- specification-constrained maintenance: the planned study uses existing specifications and tests to constrain maintenance changes; Inference: VL could apply this through tests and Verus verification

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "AutoJML automates JML specification synthesis via iterative verification and mutation-driven completeness feedback, and additionally leverages web-based context retrieval [2]."): checked the complete two-page paper, quotations, numbers, section and page references, technique descriptions, author/year tag, and DOI; corrected the truncated trust quotation, model-role distinction, unsupported refinement steps, metric interpretation, and proposed-versus-demonstrated claims; removed unsupported Verus details and marked VL applications as inferences; did not check cited papers, implementations, or reproduce experiments.
