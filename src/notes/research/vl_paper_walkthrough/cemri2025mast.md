# Why Do Multi-Agent LLM Systems Fail?
(authored by agents unless marked 🧑)
Tag: `cemri2025mast`, [paper](https://arxiv.org/abs/2503.13657)

## scope and data
The paper builds MAST, a taxonomy of multi-agent-system (MAS) failures, and MAST-Data, a dataset of 1,642 annotated execution traces from seven MAS frameworks. It identifies 14 failure modes in three categories: system design issues (FC1), inter-agent misalignment (FC2), and task verification failures (FC3). The authors define failures as “instances where the MAS does not achieve its intended task objectives” (Section 1, p. 2). They state, “MAST-Data, a comprehensive, high-quality collection of 1642 annotated execution traces.” (Section 1, p. 2.) The abstract says “1600+”.

Inference: the relevance to VeruLaw (VL) is direct: a multi-agent code-and-proof workflow can fail before Verus runs, during coordination, or through an inadequate checker that accepts an incorrect artifact. Inference: MAST is a diagnosis vocabulary, not a formal proof system.

## technique 1: grounded-theory discovery of failure modes
Use this when no accepted failure taxonomy exists. The procedure is:

1. Collect 150 traces from five MAS frameworks (HyperAgent, AppWorld, AG2, ChatDev, and MetaGPT) across programming and mathematics tasks (Section 3.1, p. 5).
2. Have six human experts inspect the traces and seek diverse, cross-system failures (Section 3.1, p. 5).
3. Apply theoretical sampling to cover different objectives and interaction patterns (Section 3.1, p. 5).
4. Open-code observed failure behaviors, compare codes across traces, write memos, and theorize candidate modes (Section 3.1, p. 5).
5. Continue until theoretical saturation, when new traces yield no new modes (Section 3.1, p. 5).

The paper says, “This qualitative research method allows failure modes to emerge organically from empirical data.” (Section 3.1, p. 5.) The initial effort was over 20 hours per expert for the 150 traces (Section 3.1, p. 5).

Inference: for VL, begin with traces containing the user requirement, generated Rust, Verus diagnostics, repairs, and final artifact; code failures such as missing preconditions, state loss, and premature acceptance before deciding labels. This trace schema is an adaptation, not a reported MAST step.

Evidence: the grounded-theory process produced 14 modes. It is qualitative discovery, so no denominator supports a claim that the modes are exhaustive. The authors explicitly say they “do not claim MAST is exhaustive” (Section 4, p. 7).

## technique 2: iteratively validate labels with inter-annotator agreement
Use this when several people must apply the taxonomy consistently. The method is:

1. Give three expert annotators five randomly selected traces from the initial collection (Section 3.2, p. 5).
2. Have them independently label failures using the preliminary MAST definitions (Section 3.2, p. 5).
3. Discuss disagreements, then adjust definitions, add modes, or merge/remove modes (Section 3.2, p. 5).
4. Repeat until high consensus; the paper reports three such rounds, 15 traces in total (Section 3.2, p. 6; Section 1, p. 2).
5. Compute Cohen’s kappa as the agreement statistic (Section 3.2, p. 6).

The final rounds achieved κ = 0.88, after about 10 hours resolving disagreements, excluding annotation time (Section 3.2, p. 6). On two new MAS and two new benchmarks outside taxonomy development, an additional human round achieved κ = 0.79 (Section 3.4, p. 6). The new MAS are OpenManus and Magentic-One; the new benchmarks are MMLU and GAIA. The paper does not state how many traces or labels were behind κ = 0.88 beyond the 15 traces, nor behind κ = 0.79.

Inference: VL should validate whether engineers independently classify `missing invariant`, `wrong model`, `premature proof acceptance`, and `specification drift` the same way before using labels for training or product dashboards. Kappa measures label agreement, not correctness of the specification or proof.

## technique 3: scalable LLM annotation calibrated to human labels
Use this to annotate over a thousand traces after definitions have been fixed. The steps are:

1. Prompt an LLM (the paper uses OpenAI’s o1) with the execution trace, MAST definitions, and few-shot examples from human-annotated traces (Section 3.3, p. 6).
2. Ask it to classify failure modes; the released annotations include a reason for each (Section 3.3, p. 6; Section 3.4, p. 6).
3. Compare predictions with a held-out human set from the IAA studies and report accuracy, recall, precision, F1, and Cohen’s kappa (Section 3.3 and Table 2, p. 6).
4. Use the validated annotator to label new traces and retain reasons with each label (Section 3.4, p. 6).

With OpenAI o1, the zero-shot annotator had accuracy 0.89, recall 0.62, precision 0.68, F1 0.64, and κ 0.58; few-shot o1 had accuracy 0.94, recall 0.77, precision 0.833, F1 0.80, and κ 0.77 (Table 2, p. 6). The paper does not state the size of the held-out set in Section 3.3 or Table 2. The paper also reports κ = 0.79 for the annotator on two unseen MAS and benchmarks (Section 1, p. 2).

The authors write, “The LLM annotator achieves high agreement with human experts (accuracy 94%, Cohen’s Kappa of 0.77; Table 2), confirming its suitability for scaling the annotation process while adhering to MAST definitions.” (Section 3.3, p. 6.) Inference: this conclusion is conditional on the held-out distribution and does not make the LLM a sound verifier. For VL, use such labels to triage traces and require humans or Verus for acceptance decisions.

## technique 4: diagnose system-specific failure profiles
MAST groups modes by execution stage and uses frequency breakdowns to target interventions. FC1 includes disobeying task specification (FM-1.1, 11.8%), disobeying role specification (1.5%), step repetition (15.7%), context loss (2.80%), and unawareness of termination (12.4%) (Section 4, p. 7). FC2 includes conversation reset (2.20%), failure to ask clarification (6.80%), derailment (7.40%), information withholding (0.85%), ignored input (1.90%), and reasoning-action mismatch (13.2%) (Section 4, p. 7). FC3 includes premature termination (6.20%), no or incomplete verification (8.20%), and incorrect verification (9.10%) (Section 4, p. 8). Figure 1 (p. 2) gives the category totals as 44.2% (FC1), 32.3% (FC2), and 23.5% (FC3), and shows information withholding as 0.80%, not the 0.85% in the Section 4 text; the paper is inconsistent here. The Figure 1 caption says the percentages are “prevalence of each failure mode and category as observed in our analysis of 1642 MAS execution traces”. Inference: the mode percentages within each category add up to its total, and the three totals add to 100%, so they appear to be shares of all labeled failure-mode occurrences, not the share of traces that show each mode; the paper does not say this. Other percentages in the paper differ: Figure 2 (p. 5) shows 37.17%, 31.41%, and 31.41% for the categories, and Figure 4 (p. 8, 210 traces) shows 41.8%, 36.9%, and 21.3%.

The paper gives a concrete FC2 trace labeled FM-2.4 (information withholding): the Phone Agent does not tell the Supervisor Agent the username format (a phone number), and the Supervisor does not seek clarification, so it repeatedly logs in with an email address and the task fails (Figure 3, p. 6). It also reports that a ChatDev chess program passed compilation while retaining runtime rule bugs, an FC3 incomplete-verification failure (Section 4, p. 8).

Inference: the method below is assembled from Sections 4, 5.1 to 5.3, and Appendix H; the paper does not list it as numbered steps.

1. Run a MAS and retain full execution traces.
2. Apply MAST labels with reasons.
3. Aggregate mode frequencies per framework, model, and task (Section 5.1, p. 9).
4. Change a role prompt, workflow, communication protocol, or verifier.
5. Re-run the same task and compare the mode distribution and success; the paper says the failure-mode breakdown “shows which failure modes were mitigated and reveals any resulting trade-offs” (Section 5.2, p. 9; Appendix H.3).

Evidence includes a ChatDev role-specification intervention that gave “+9.4% success rate increase” with the same user prompt and GPT-4o (Section 4, p. 7); Table 5 (Appendix H.2) shows ChatDev ProgramDev-v0 success of 25.0 (baseline), 34.4 (improved prompt), and 40.6 (new topology). The paper states “max improvements of 15.6%” with the same underlying model (Section 5.3, p. 9). Section 4 (p. 8) credits +15.6% to a high-level task-objective verification step, while Appendix H.2 describes the topology change as a cyclic graph in which the CTO must confirm the reviews; the paper does not reconcile these. Inference: 9.4 and 15.6 are percentage-point differences in Table 5. The paper says these gains are not enough: “not all failure modes are resolved, and task completion rates still remain low” (Section 5.3, p. 9). The paper also reports MetaGPT having 60–68% less FC1/FC2 failure than ChatDev but 1.56× more FC3 failure on ProgramDev (Section 5.1, p. 9). These are comparative percentages for the named systems and tasks, not universal rates.

Inference: in VL, a dashboard should distinguish a Verus failure from a missing requirement, stale context, agent disagreement, and an unsound or superficial test. A proof that compiles is analogous to the chess program that compiles: it is evidence only for the encoded property.

## what is trusted and threat to VL
Inference: the dataset depends on trace capture, the human taxonomy, annotator interpretation, and the LLM judge; the paper itself notes that the LLM annotator may “conflate distinct root causes” for modes with similar symptoms (Appendix E, p. 22). Verus can make a postcondition proof mechanically checkable, but MAST’s labels and system-level claims remain empirical. The authors emphasize, “Multi-Level Verification is Needed. Current verifier implementations are often insufficient; sole reliance on final-stage, low-level checks is inadequate.” (Section 4, p. 8.)

Inference: threat to agent-written verified Rust is high when the agent verifies only compilation or local lemmas while omitting the user’s intended property; medium for coordination failures that lose context; and lower after a complete, correct Verus specification is independently reviewed and proven. This ranking is an inference from MAST’s FC1–FC3 categories.

The paper reports grounded-theory taxonomy discovery, IAA refinement, LLM-assisted annotation, failure-profile analysis, and intervention measurement. Inference: VL should not redo these as generic MAS research. It should adapt the labels to requirement-to-proof traces and make Verus verification a required FC3 check.

## limitations and contradictions
The paper’s abstract says 1600+ traces, while the constructed dataset is 1642 traces; the latter is the precise count (Abstract, p. 1; Section 3.4, p. 6). The paper reports “41% to 86.7% failure rate on 7 state-of-the-art (SOTA) open-source MAS” in the introduction (p. 2); Figure 5 (Appendix B) shows six systems, each on its own benchmark, with the caption “therefore they are not directly comparable”. Inference: these rates should not be compared directly with individual MAST-mode prevalences. Other internal inconsistencies: Section 3.4 lists Manus [45] among the seven frameworks, while Appendix B.3 says Manus could not be included and Table 1 lists OpenManus; the MAST-mode percentages differ between Figures 1, 2, and 4 and between Section 4 and Figure 1 (see technique 4). The authors state that there is “no one-size-fits-all solution” because distributions differ by architecture (Section 5.1, p. 9). MAST is explicitly a first step and not exhaustive.

## techniques for the catalog
- grounded failure discovery: inspect diverse execution traces with open coding, comparison, memoing, and saturation to derive failure modes
- taxonomy agreement refinement: iteratively revise labels using independent annotators, disagreement resolution, and Cohen’s kappa
- calibrated LLM annotation: classify traces from taxonomy definitions and few-shot examples, then validate against held-out human labels
- failure-profile intervention: aggregate mode frequencies, modify system design, rerun workloads, and measure mode-specific trade-offs
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Our annotations reveal that weak or inadequate verification mechanisms were a significant contributor to system failures."): I read the whole paper text (main text and appendices A to N, skimming the prompt and trace listings in L to N) and checked every quotation, number, page and section reference, and the technique steps against it. I fixed the failure definition, the misplaced abstract quote (it is in Section 1, p. 2), the page for FC2 percentages (p. 7) and Section 5.3 (p. 9), the number of trace-label denominators claim, Figure 3 (FM-2.4), and the 15.6% intervention attribution; I reported the 0.85% versus 0.80% and other figure inconsistencies, labeled the technique 4 procedure and VL statements as inference, and removed an unsupported denominator claim. I did not check the cited references, the GitHub or Hugging Face artifacts, or whether the PDF figures render the same numbers as the text extraction; the two-column figure text was read from the layout extraction only. Link: arXiv from the paper text (arXiv:2503.13657v3).
