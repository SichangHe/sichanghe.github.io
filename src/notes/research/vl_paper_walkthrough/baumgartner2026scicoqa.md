# SciCoQA: Quality Assurance for Scientific Paper-Code Alignment
(authored by agents unless marked 🧑)
Tag: `baumgartner2026scicoqa`, [paper](https://arxiv.org/abs/2601.12910)


## scope and result

SciCoQA defines paper-code discrepancy detection as a cross-modal verification task: given a scientific paper and its repository, identify meaningful semantic conflicts between the described method and its implementation. The paper defines a discrepancy as “a semantic conflict between the scientific method described in the publication and its actual implementation in the codebase, such that the code does not faithfully reproduce the reported method.” (Section 3, p. 4) It excludes ordinary bugs, configurable hyperparameter defaults, and trivial engineering details.

The released dataset has 635 discrepancies: 92 real and 543 synthetic. The real set comes from 72 papers (42 discrepancies from GitHub issues, 50 from reproducibility papers); the synthetic set comes from 204 papers. The paper counts 276 papers in total (72 + 204; Section 3.2, p. 6). The three discrepancy types are Difference, Paper Omission, and Code Omission. Six categories identify the affected research component: Algorithm, Model, Loss, Evaluation, Data, and Training (Table 1, p. 6).

The central result is a recall limitation. The abstract reports: “Across 22 evaluated models, even the best-performing LLMs, Gemini 3.1 Pro and GPT-5 Mini, detect only 46.7% of real-world discrepancies.” (Abstract, p. 1) High precision does not compensate for missed mismatches because an undetected discrepancy can create false assurance.

## technique: evidence-grounded discrepancy definition and taxonomy

when to use it

Use this definition when checking whether agent-generated or human-written code implements a paper's method. Count a mismatch only when it changes scientific logic, an experimental protocol, or a mathematical formulation. Label whether the code differs from the paper, the paper omits a critical code component, or the code omits a described step; then label the affected pipeline component.

how to do it

1. Read the method, equations, experimental protocol, and repository implementation together. Treat a mismatch as semantic only when, in the paper's words, “This mismatch must be meaningful, implying a fundamental alteration to the scientific logic, experimental protocol, or mathematical formulation described in the text.” (Section 3, p. 4)
2. Assign one type: Difference (code logic differs), Paper Omission (code has a critical component absent from the paper), or Code Omission (a described step is absent from code) (Section 3, p. 4; Table 1, p. 6).
3. Assign one category: Algorithm, Model, Loss, Evaluation, Data, or Training. For example, changing operation order is Algorithm; changing a metric is Evaluation; changing preprocessing is Data (Table 1, p. 6; the examples are this study's illustration of the table's definitions, e.g. "Changes to step order, operations, or core logic" for Algorithm).
4. Exclude a bug independent of the paper's description, a default hyperparameter mismatch that can be selected through configuration, and routine numerical-stability engineering such as adding noise to a denominator for numerical stability (Section 3, p. 4).
5. Record the paper evidence, code evidence, and exact location of the difference in a short standardized description. The authors prompt Gemini 3.1 Pro and GPT-5 "to output 3-8 sentences and to state what the paper describes, what the code implements, and where the difference is" (Section 3.1, p. 4).

Inference: the same taxonomy can classify a Verus review: a contract/code mismatch is a Difference; a safety assumption present only in Rust code is a Paper Omission; a stated postcondition missing from `ensures` is a Code Omission. The category can identify whether the issue is an algorithmic invariant, a data representation, an evaluation harness, or a training/automation policy. This mapping is an application suggestion, not a SciCoQA claim.

## technique: staged real-discrepancy collection and validation

how to do it

1. For GitHub issues, find repositories that reference a research paper in their homepage or description field, restricted to projects published between 2020 and 2025 and to repositories with at least one issue; crawl their issues, and use Qwen3 4B Thinking to classify issues as candidate paper-code discrepancies. The crawl produced 10,636 issues from 1,890 repositories; 232 candidates remained after automatic filtering, and manual filtering yielded 59 discrepancies (Section 3.1, p. 4).
2. For reproducibility reports, collect reports from the ML Reproducibility Challenge (reproductions of papers from leading ML, CV, and NLP conferences) and from the reproducibility tracks of SIGIR and ECIR, 2020–2025. Retain only reports that reproduce a single open-access paper with an open-source implementation, leaving 171 reproducibility papers. GPT-5 extracts 132 candidate mismatches; manual verification yields 65 discrepancies (Section 3.1, p. 4).
3. Have Gemini 3.1 Pro and GPT-5 validate every manually filtered discrepancy against the original paper, codebase, and issue or extracted report description, and rephrase it into the standardized format. Where the two LLMs disagreed, the authors verified the discrepancy manually (Section 3.1, p. 4).
4. Keep only discrepancies that "can be verified given the explicit evidence." The combined real set is 92 discrepancies from 72 papers, with 42 from GitHub (of 59) and 50 from reproducibility papers (of 65) (Section 3.1, p. 4).

what shows it works and limits

The paper says the verification step acts "as a high-precision filter" (Section 3.1, p. 4). Inference: it is not a formal proof, and it depends on source availability, human judgments, and the quality of model extraction. The real data is mostly CS/AI; the authors found very few non-CS issues or reproducibility tracks reporting paper-code discrepancies, so non-CS coverage is synthetic and its error distribution may differ from real errors (Section 7, p. 9).

## technique: controlled synthetic discrepancy generation

how to do it

1. From the GitHub crawl, sample repositories linked to arXiv papers with permissive licenses (MIT, Apache 2.0, CC-BY, BSD). Randomly select 102 repositories whose paper has arXiv subject CS (balanced over ML, CV, and NLP) and 102 for non-CS papers; some unsuitable repositories were removed manually (Section 3.1, p. 5 and footnote 3).
2. Prompt GPT-5 with each paper and codebase to generate five code diffs according to the discrepancy definition. Sample up to three of them, ensuring that they do not manipulate the same file and that the generated diff can be found by exact match in the original code (Section 3.1, p. 5; prompt in §F.5).
3. Add 13 further discrepancies labeled Paper Omission, "as we later find these to be most critical." The resulting synthetic set has 543 discrepancies across 204 papers: 286 from the CS domain and 257 from other computational domains (Section 3.1, p. 5).
4. Have the generator label the type of each synthetic instance (type definitions are in the prompt) and label real instances manually. In real data, Differences are 55%; in synthetic data, Differences are 78% (Section 3.2, p. 5).

The authors observe a correlation of `r = 0.94` between recall on real and synthetic data across all 22 models (Section 5, p. 6); excluding the GPT-5 family increases it to `r = 0.98` (Section 7, p. 10; Appendix C.4). They also state that GPT-5 generated the synthetic cases and was evaluated on them, and "achieves disproportionately higher recall on synthetic data." Their stated conclusion is that "absolute model performance should be assessed on the real subset, while the synthetic subset reliably supports relative model comparison" (Section 7, p. 10).

## technique: paper-plus-code LLM verification and code-only ablation

how to do it

1. Prompt a model with the paper and its code to generate a list of discrepancies; parse the output into individual predictions (Section 4, p. 6; prompt in §F.6). The paper is OCR-converted to markdown and the code files are inserted into the prompt up to 90% of the context size, truncating whole files from the end of the code if needed (Appendix A.4 and A.6).
2. Evaluate each prediction with an LLM judge (GPT-OSS 20B) against the verified discrepancy description; for real data, where two descriptions exist (Gemini 3.1 Pro and GPT-5), a match against either counts. The judge was checked on predictions for 20 discrepancies (10 from GitHub, 10 from reproducibility papers): the top three most similar predictions per model (by EmbeddingGemma) were annotated by hand, giving 1,039 annotations, of which 143 match the reference. GPT-OSS 20B reaches F1 87.5% ± 1.1 against those annotations (mean and standard deviation over five runs). Qwen3 32B as an alternative judge agrees with GPT-OSS 20B at Cohen's kappa 0.838 and F1 91.9%, but its F1 against the human annotations is only 70.0%, so GPT-OSS 20B was retained (Section 4, p. 6 and footnote 4).
3. Measure recall over annotated discrepancies; the paper calls the binary match score "recall" because predictions "may contain unannotated, but valid, discrepancies" and only the annotated ones are checked (Section 4, p. 6).
4. Remove the paper and rerun with code only. This ablation tests whether a model can infer mismatches from repository evidence, comments, or memorized paper knowledge rather than cross-modal comparison (Section 5.1, p. 8).

The best paper-plus-code models, Gemini 3.1 Pro and GPT-5 Mini, reach 46.7% recall on real data; GPT-5 reaches 70.0% on synthetic data (Section 5, p. 6; Table 10). Removing the paper lowers real-data recall by an average 19.2 percentage points (48.3% relative) and synthetic recall by 16.3 points (30.8% relative), averaged over the top 8 models (Section 5.1, p. 8; Table 11). Median paper, code, and concatenated lengths are 14,200, 39,272, and 56,903 tokens, and 73 of 276 papers exceed 100,000 combined tokens (Section 3.2, p. 6). The paper reports "a consistent pattern where the longer the input, the lower the performance becomes" (Section 5, p. 7).

The discrepancy type matters. GitHub cases are easier because they are mostly Differences (71.4%) and Code Omissions (19.0%). Reproducibility-report cases are harder because Paper Omissions make up 50% (Section 5, p. 7). The authors attribute the difficulty to an asymmetry between modalities: a paper-described component must exist in the code, whereas the code has many implementation details not required in the paper, so detecting Paper Omissions requires distinguishing deviations from permissible engineering artifacts without a reference in the paper.

Precision analysis of 224 predictions that were not matched to a ground truth, from 20 NLP and CV papers, gives Gemini 2.5 Pro 94.1%, GPT-5 85.7%, and GPT-OSS 20B 67.0% precision (Section 5.2, p. 8; Table 4, Appendix C.1). The authors then pool the model-identified verified discrepancies with the existing annotations for those papers into 129 discrepancies. Table 2 (p. 9) reports GPT-5 precision 88.0%, recall 51.2%, F1 64.7%; Gemini 2.5 Pro precision 94.6%, recall 41.1%, F1 57.3%; GPT-OSS 20B precision 69.9%, recall 55.8%, F1 62.1%. The paper's Table 8 (Appendix C.6) reports different figures on the same 129-discrepancy pool (for example GPT-5 P 84.1, R 63.6, F1 72.4); the paper does not reconcile the two tables. Appendix C.6 says that the three pool contributors should be viewed as upper bounds. Inference: these denominators differ from the main 92-real-discrepancy evaluation and should not be combined with it.

verus form

Inference: use a two-input checker: the paper's claimed contract and the Rust/Verus repository. Extract claims as candidate `requires`, `ensures`, loop `invariant` statements, and proof lemmas; compare them with executable code and proof obligations. A Verus proof result is stronger evidence than an LLM judge, but it cannot detect an omitted requirement that is absent from the contract. Keep a human or independently reviewed requirement set for recall.

Inference: implement the code-only ablation by asking an agent to inspect Rust and Verus annotations without seeing the prose specification. Compare its detections with the paper-plus-code run; a large drop indicates that the requirement is not recoverable from code. Use Verus's `assert`, `requires`, `ensures`, loop `invariant`, and `proof fn` constructs only for claims that can be formalized. A checker must not treat a proof that passes as evidence that the specification is complete.

## what is proved, trusted, and relevant to VL

Inference: SciCoQA measures detection against curated discrepancy labels; it does not prove that every real mismatch was found, that synthetic diffs represent natural errors, or that an LLM judge is sound. The dataset construction, source repositories, model prompts, judge, manual filtering, and annotation policy are trusted. The paper itself states that its synthetic set is "a short-term response" and that real-world performance should be read from the real subset (Section 7, pp. 9-10). The authors conclude: “current LLMs show promise as assistants, they cannot yet serve as autonomous verifiers of paper-code faithfulness.” (Section 6, p. 9)

Inference: for VeruLaw, the threat is direct. An agent can produce Rust whose Verus proof passes while omitting a requirement stated only in a design document, or can implement a different algorithm under a compatible but weaker contract. SciCoQA's paper-plus-code alignment task suggests a separate review stage that extracts requirements, checks code and proof annotations against them, and reports omissions as first-class failures. The measured 46.7% real-case recall warns against using an LLM as the sole check; proof success validates the formalized contract, not the completeness of the requirement source.

## techniques for the catalog

- discrepancy taxonomy — classify semantic paper-code conflicts as Difference, Paper Omission, or Code Omission and label Algorithm, Model, Loss, Evaluation, Data, or Training
- staged evidence collection — mine issues and reproducibility reports, manually filter, and validate every case against paper and code with two independent models
- controlled synthetic generation — create exact-match code diffs across CS and non-CS repositories while retaining real cases for absolute evaluation
- cross-modal verification — prompt an LLM with paper plus code, judge predicted discrepancies against verified labels, and measure recall
- code-only ablation — remove the paper to quantify how much detection depends on explicit cross-modal evidence rather than code or model memory
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "We fill the prompt up to 90% of the context size to leave space for the reasoning (if supported by the model) and output."): read the whole paper text (main text and Appendices A-F) and the whole study; checked every quotation, number, section and page reference (PDF page numbers) and technique step; changed the sections and page numbers (definition p. 4, Table 1 p. 6, synthetic data p. 5, Section 5.1 and 5.2 p. 8, Table 2 p. 9, r values p. 10), the paper count (204 synthetic papers, 72 real, 276 total), the wrongly worded quote of the definition ("alteration to"), the judge validation (20 discrepancies, not 20 papers; the 91.9% F1 is Qwen3 32B against the GPT-OSS judge), the reproducibility-report sources, and added the Table 8 versus Table 2 discrepancy; removed the word "independently" and the unsupported "found during analysis"; marked own conclusions "Inference:"; kept the tag and the arXiv link (arXiv:2601.12910 matches the paper header); did not check the cited works, the figures, the example tables (Tables 12-13), or the dataset itself, and the Verus mapping sections are the study author's inference, not checked against the paper.
