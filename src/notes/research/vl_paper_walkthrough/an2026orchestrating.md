# Orchestrating LLM Agents for Scientific Research: A Pilot Study of Multiple Choice Question (MCQ) Generation and Evaluation
(authored by agents unless marked 🧑)
Tag: `an2026orchestrating`, [paper](https://arxiv.org/abs/2602.18891)

## problem and contribution
The paper evaluates an end-to-end workflow in which one researcher coordinates multiple language-model agents to extract data, construct a corpus, generate artifacts, and evaluate them. Its testbed is SAT Math multiple-choice questions (MCQs). The abstract reports: “We report a mixed-methods pilot evaluation of an AI-orchestrated research workflow in which a human researcher coordinated multiple LLM-based agents to perform data extraction, corpus construction, artifact generation, and artifact evaluation.” (Abstract, p. 1.)

The workflow produced 1,071 SAT Math MCQs, converted textbook PDFs into structured chunks, mapped questions to relevant content, generated new MCQs under metadata constraints, and evaluated them with a 24-criterion rubric and two LLM judges (Abstract and Sections 3.1–3.5, pp. 1, 5–7). The paper finds high means but incomplete equivalence: strict 24/24 equivalence never occurred, and the matched/whole-set tracks found 9–12 equivalent criteria depending on judge (Abstract and Section 4.3, pp. 1, 9–11; Tables 4 and 7).

## technique 1: staged, human-orchestrated pipeline

What it is. The paper divides work into six phases: data identification and acquisition; extraction and corpus construction; content alignment and structuring; artifact generation; artifact evaluation; and human interpretation and insight development (Section 1, pp. 2–3). It says: “Throughout Phases 1-5, the human researcher orchestrates and supervises the AI-driven workflow, defining objectives, setting constraints, and monitoring outputs.” (Section 1, p. 3.)

How to apply it.

1. Define the research question, baseline, comparison, and success condition before delegating tasks. The paper classifies framing as non-routine analytic work (Section 5.1, p. 12).
2. Acquire source artifacts and identify the authoritative dataset. For this study, an AI system found the College Board question bank; the researcher downloaded PDFs (Section 3.1, p. 5).
3. Convert sources into structured records, then filter incomplete records. the downloaded PDFs contain 1,682 SAT Math items, Gemini 3 Pro Preview converted them to JSON, and 1,071 were identified as MCQs; an incomplete-item filter (some items depend on figures or tables not fully captured in extraction) produced final sets of 1,013 (filtered by Gemini) and 1,027 (filtered by GPT) (Section 3.1, p. 5).
4. Build a provenance-preserving corpus, align each artifact to source material, generate constrained outputs, and evaluate them with an explicit rubric (Sections 3.2–3.5, pp. 5–7).
5. Reserve interpretation and final conclusions for human review. The paper’s task classification (Table 8, Section 5.1, p. 12) lists “validating scripts/results, spot-checking outputs, agreeing/disagreeing with model ratings, interpreting final findings” under Human Quality Control and Interpretation, which it labels non-routine.

Verus form. Inference: represent each phase as a typed Rust function with an explicit contract. Use `requires` for input invariants (for example, every source chunk has a unique ID), `ensures` for output properties (every generated item carries provenance and declared metadata), and `proof fn` lemmas to connect phase postconditions. Use `spec fn` predicates for “complete record” and “valid provenance”; use `assert` at phase boundaries. Inference: Verus can prove data-structure invariants and deterministic transformations, but it cannot prove that an LLM’s semantic answer is pedagogically or functionally correct without a formal specification of that property. External model calls should be treated as untrusted inputs and checked after return.

Evidence and limits. The project took 10 days and approximately 80 hours; Table 9 reports 42 hours (52.5%) on pipeline engineering and operations, 12 hours (15%) on evaluation design/statistics, and 8 hours each (10%) on framing and human quality control (Section 5.2, p. 12). The paper’s six-month comparison says: “The timeline is a retrospective estimate; it is not based on empirical measurement.” (Section 5.3, p. 13.) The workflow is one researcher in SAT Math; generalization to other domains or teams is untested (Section 7, p. 14).

## technique 2: provenance-aware retrieval and constrained generation

What it is. The workflow converts OpenStax textbook PDFs to Markdown, splits them into 2,980 section-based chunks, and preserves pedagogical coherence by keeping definitions with immediately following examples and surrounding context (Section 3.2, p. 5). Each chunk is a provenance unit with an ID. For each baseline MCQ, two embedding queries are used: a metadata query from domain and skill, and a content query from stem and rationale. The relevance score is `0.3 × simmetadata + 0.7 × simcontent` (Section 3.3, p. 6).

How to apply it.

1. Convert source documents while retaining identifiers and enough neighboring context to avoid orphan references.
2. Embed both metadata and content representations for each target artifact and each source chunk.
3. Compute the weighted cosine-similarity score and retrieve the most relevant chunk(s).
4. Supply the retrieved chunk, domain, skill, difficulty, and cognitive-level metadata to the generator. The study used GPT-5-nano and Gemini-2.5-Flash (Section 3.4, p. 6).
5. Carry chunk IDs and source references into generated artifacts so evaluation can inspect grounding.

Verus form. Inference: define a `ChunkId` newtype and a record containing text, source hash, and section metadata. Prove that every generated artifact includes a `ChunkId` present in the corpus and that retrieval output is drawn from the corpus. A deterministic specification can state that the chosen score is the maximum over candidate chunks; the executable floating-point similarity calculation would require a trusted numeric model or a bounded integer approximation. Inference: Verus can check provenance and selection invariants, but it cannot establish that a retrieved chunk semantically supports a generated claim unless support is formalized.

Evidence and limits. The paper says “We ensure that chunking preserves pedagogical coherence” (Section 3.2, p. 5) and reports 2,980 section-based chunks (Figure 3 caption, p. 6). It does not report a retrieval-accuracy measurement. Some SAT items refer to figures or tables that plain-text extraction did not recover (Sections 3.1 and 4.2); the Gemini judge scored the SAT baseline lower on `no_hallucinations` (4.18) and `content_alignment` (4.32), while the OpenAI judge scored those baseline criteria 5.00 and 4.95 (Table 2, Section 4.2, pp. 8–9). The paper says this asymmetry “is best explained as an artifact of the PDF text extraction process”; it offers this as an explanation and does not test it. Inference: this shows why provenance and completeness checks are prerequisites for reliable downstream evaluation.

## technique 3: rubric-based multi-judge evaluation and equivalence testing

What it is. The paper constructs a 24-criterion rubric with six groups: Accuracy & Grounding, Clarity & Presentation, Distractor & Answer Quality, Difficulty & Engagement, Domain & Skill Alignment, and Difficulty & Cognitive Calibration (Section 3.5.1, p. 6). Two independent LLM judges score baseline, Gemini-generated, and GPT-generated sets. The paper explains: “This dual-judge design enables methodological triangulation, allowing us to examine potential judge-specific effects and to identify evaluation patterns that remain stable across independent model assessors.” (Section 3.5.2, p. 7.)

How to apply it.

1. Define criteria and five-point descriptors before scoring; 5 is excellent and 1 fundamentally broken (Appendix D, pp. 18–19).
2. Evaluate every artifact with two independent judge configurations and retain judge provenance.
3. Use two analysis tracks: matched comparisons on overlapping `question_id`s and whole-set comparisons without matching (Section 3.5.3, p. 7).
4. Apply two one-sided tests (TOST) with equivalence bound `δ = 0.2 SD`; declare a criterion equivalent only when its entire 90% confidence interval for the mean difference lies within `[-δ,+δ]` and all three pairwise comparisons (Gemini-generated vs. SAT, OpenAI-generated vs. SAT, Gemini-generated vs. OpenAI-generated) are individually significant at α = 0.05 (Section 4.3, pp. 9–10).
5. Report criterion-level and category-level results, not only grand means. In the study, 12/24 criteria were equivalent in the Gemini matched track, 11/24 in its whole-set track, 11/24 for OpenAI matched, and 9/24 for OpenAI whole-set (Tables 4 and 7, pp. 10–11).

Verus form. Inference: represent a rubric score as a bounded integer type with a proof that it lies in 1..=5; represent an evaluation record with artifact ID, criterion ID, score, judge ID, and prompt/version hashes. Verus can prove aggregation denominators, that no criterion is silently omitted, and that a reported fraction such as 12/24 matches the stored records. Statistical confidence intervals and TOST require a trusted arithmetic/statistics library or separately verified numeric algorithms; they are not implied by ordinary `ensures` clauses. Inference: this is a verification-of-measurement pipeline, not a proof that the model’s scores are valid judgments.

Evidence and limits. Mean scores ranged 4.64–4.89/5, but skill depth, plausible distractors, cognitive engagement, and difficulty balance were persistent weak criteria (Section 4.2, pp. 8–9). Judge choice shifted means by roughly 0.16–0.21 points (Section 4.4, p. 11). Both judges are LLMs, the rubric was AI-assisted, and no human expert raters or real-student administration were included (Section 7, p. 14). Therefore “high average quality” does not establish equivalence or educational validity.

## technique 4: governance, failure recovery, and auditable operations

What it is. The paper treats orchestration as system operations: specify constraints, build checks for failure cases, recover from tool failures, log provenance, and audit judge and prompt versions. Its discussion states: “Responsible adoption, therefore, requires explicit governance. It consists of documenting how items are evaluated, testing sensitivity to different judges, defining failure thresholds, and logging model and prompt versions.” (Section 6, p. 14.) The abstract lists “building validation loops, recovering from tool failures, and auditing provenance” among the researcher’s primary activities (p. 1).

How to apply it.

1. Version models, prompts, rubric definitions, source files, and pipeline code.
2. Record provenance for every extracted, retrieved, generated, and evaluated artifact.
3. Build validation loops and spot-check outputs (Abstract; Table 8). Inference: route failures back to extraction, retrieval, or generation rather than silently continuing; the paper does not describe such routing.
4. Compare independent judges and document sensitivity; do not report a judge-free “quality” number.
5. Keep a human responsible for specification, interpretation, and acceptance.

Verus form. Inference: encode artifact lineage as a hash-linked record and prove that each accepted output has a complete chain from source to evaluation. Use `invariant` clauses for append-only logs and `ensures` that an accepted item has passed required checks. Inference: model/API availability, source authenticity, and the meaning of a rubric remain trusted unless separately specified.

## what is proved, measured, and trusted

Measured: corpus and artifact counts, rubric scores, criterion/category equivalence, judge effects, labor allocation, elapsed time, and API costs. The direct variable API cost was $62 ($11 Mistral OCR, $9 OpenAI, $42 Gemini), excluding fixed subscriptions (Appendix B, pp. 17–18). The study’s central evidence is comparative and pilot-scale.

Not proved: semantic correctness of every MCQ, psychometric validity, human agreement, absence of extraction omissions, or generalization beyond SAT Math and one researcher.

## techniques for the catalog

- staged human-orchestrated workflow — split acquisition, extraction, alignment, generation, evaluation, and interpretation with human control at phase boundaries
- provenance-aware retrieval — preserve coherent source chunks, map artifacts with weighted metadata/content similarity, and carry source IDs forward
- constrained artifact generation — condition generation on retrieved context and explicit metadata such as skill, difficulty, and cognitive level
- rubric-based multi-judge evaluation — use explicit criteria, independent judges, and judge/version provenance
- equivalence testing — use matched and whole-set TOST tracks with a declared smallest effect size and criterion-level denominators
- governance and audit — version inputs and models, log provenance, validate failures, and retain human responsibility for acceptance
