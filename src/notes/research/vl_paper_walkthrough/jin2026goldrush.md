# The Gold Rush in AI4Math: Where Are We Now?
(authored by agents unless marked 🧑)
Tag: `jin2026goldrush`, [paper](https://arxiv.org/abs/2608.24961)

## scope and finding

This paper is an empirical audit of disclosed AI use in mathematics papers, not a formal-verification method paper. It studies 32,944 arXiv Mathematics submissions posted from 1 March through 20 August 2026. The authors identify 3,575 papers with explicit author disclosure of AI use, including 1,712 with at least one substantive mathematical contribution (abstract, p. 1). They classify disclosures, named open problems, author and institution information, and named AI systems.

The central distinction is between capability and adoption. The paper asks how often AI is actually reported in mathematical research rather than whether a model can solve a selected theorem. It says: “Our reliance on explicit disclosure (arXiv, 2026) provides a transparent and reproducible criterion for identifying AI-assisted research, but should be interpreted as a conservative measure of adoption because undisclosed uses cannot be observed.” (section 1, p. 3)

Inference: For VeruLaw, the paper contributes an evidence-audit workflow rather than a proof calculus. It shows how to measure whether AI-assisted verification is being used, while keeping claims tied to verbatim source disclosures and explicit denominators. It does not prove that any reported mathematical result or generated Rust program is correct.

## technique: disclosure-based corpus construction

What it is. Construct a complete, bounded corpus and classify only what authors explicitly disclose. The authors downloaded every submission in the interval, stored metadata, converted PDFs to text page by page, and marked page boundaries. For texts over 300,000 characters they retained the first and last 150,000 characters; 1,007 of 32,944 records were flagged as truncated (section 2, p. 3).

How to apply it.

1. Define an exhaustive source interval and inclusion rule (here, primary or secondary arXiv Mathematics category) (section 2, p. 3).
2. Download PDFs and metadata, preserving identifiers, dates, titles, categories, and authors (section 2, p. 3).
3. Extract text with page boundaries; record truncation rather than silently discarding long papers (section 2, p. 3).
4. Have the classifier locate explicit statements about AI use in the extracted text and retain a verbatim quotation as evidence for each answer (section 2, p. 4); the keyword search in the paper is used only to select a manual-validation pool, not to classify.
5. Report prevalence against the complete corpus, and state that undisclosed use is unobservable (section 1, p. 3).

Inference: A VeruLaw audit could apply this to repositories, issue trackers, or generated-code logs: define the population, retain source snapshots, and distinguish “no disclosure found” from “no AI used.” The workflow is useful for product monitoring but cannot establish semantic correctness.

Evidence and limits. The complete-corpus denominator is 32,944 submissions. The conservative measure excludes undisclosed use, and Inference: truncation to the first and last 150,000 characters could hide a disclosure in the middle of some of the 1,007 truncated records (the paper does not discuss this). The authors' claims therefore concern reported adoption, not total adoption.

## technique: structured questionnaire with non-exclusive labels

What it is. The authors encode AI use as two major categories, substantive and non-substantive, each with four subcategories. Each subcategory is a yes/no label; labels are non-exclusive. A paper is substantive if at least one substantive subcategory is yes (section 2, p. 3). Table 1 (p. 5) reports proof construction (1,225 papers), formalization and verification (427), other research assistance (289), and problem formulation (146), with overlaps allowed (section 3.1, p. 4).

How to apply it.

1. Define the scope of AI and the categories in a fixed instruction given with every record (section 2, p. 4).
2. Ask one binary question per subcategory, allowing multiple yes labels for one paper (section 2, p. 3).
3. Record open-problem status separately as open, partially resolved, resolved true, resolved false, or unclear, plus whether AI played a critical role in the reported resolution (section 2, pp. 3-4).
4. Preserve model names, author–institution pairs, and quotations as separate structured fields (section 2, p. 4).
5. Aggregate both de-duplicated major-category counts and non-exclusive subcategory counts, labeling the difference in tables (Table 1, p. 5).

Inference: For VeruLaw, the same schema can separate specification generation, lemma synthesis, compiler checking, counterexample search, and human review. A generated proof that compiles should be a separate label from a proof that has passed an independent review. This is an inference from the paper's labeling design, not a procedure the paper applies to Rust.

The paper's own warning is: “Because these subcategories are non-exclusive, a single paper may report multiple forms of AI assistance.” (section 3.1, p. 4) Percentages must therefore state whether the denominator is all submissions, confirmed-use manuscripts, or provider mentions.

## technique: evidence-grounded LLM extraction

What it is. Use an LLM to answer a fixed questionnaire from article text, require confidence scores, and require a direct quotation for every answer. The authors used GPT-5.6 Terra at low reasoning effort with 100 worker threads. The fixed system instruction defined AI scope, a three-level confidence scale, the questionnaire, and the requirement that supporting evidence be quoted verbatim (section 2, p. 4).

How to apply it.

1. Give the model the arXiv metadata and the extracted article text in the user message (section 2, p. 4). The model was not the only source for affiliations: institution and country were taken from the parsed text or, when necessary, through web searches (section 2, p. 4).
2. Require a single structured object with four components: AI-use judgments, named AI models, qualifying open problems, and author–institution pairs (section 2, p. 4).
3. Require a confidence score from 1 to 3 for each subcategory (section 2, p. 4).
4. Require a direct quotation ("evidence") from the article with every answer (section 2, p. 4).
5. Store the quotation with the source page or extracted-text location so a reviewer can replay the decision (Inference: the paper requires verbatim evidence but does not describe an automated quote-location checker).

The authors clarify that their model is extracting disclosures, not proving mathematics: “the responses are based on the authors’ disclosures rather than on assessment of the mathematical content.” (section 2, p. 4)

Inference: This evidence-first design maps naturally to VL's prerequisite check: model output can propose a classification, while a script verifies that each quoted sentence occurs in the source. It should not be used as a substitute for Verus or a proof assistant. Inference: the model's confidence score is best used as a review-prioritization signal; the paper does not calibrate it against any ground truth.

## technique: keyword screening plus manual validation

What it is. Since all 32,944 papers cannot be manually reviewed, the authors first search the parsed full texts for a comprehensive list of keywords covering nearly all major AI model names, yielding approximately 5,000 candidate articles. They then sample candidates and complete the questionnaire manually. The authors say they have assembled a team of more than 10 volunteers for the manual validation, which is still ongoing (section 2, p. 4).

How to apply it.

1. Build a broad keyword list covering AI model names (section 2, p. 4).
2. Screen the full parsed corpus to create a candidate subset (section 2, p. 4).
3. Sample articles from the candidate set and have humans complete the questionnaire manually for each sampled article (section 2, p. 4); the paper does not say whether the annotators were blind to the LLM labels.
4. Compare human and LLM labels to quantify classification error once the sample is complete (Inference: the authors say the ongoing manual validation “is designed to quantify this error” (section 4, p. 14), but no comparison is reported).

Inference: For a verified-Rust product, the equivalent sample should include generated proofs, failed proofs, and accepted proofs stratified by model and project. Human review can estimate false acceptance and false rejection, but it does not replace compiler checking.

Evidence and limits. The validation subset is not fully reported: no sample size, agreement table, or error rate appears in the supplied paper. “The manual validation is still ongoing” (section 2, p. 4), so the classification quality remains uncertain.

## technique: denominator-aware trend and field analysis

What it is. Report both counts and rates, with the denominator stated. The share of Mathematics submissions with confirmed AI use rose from 4.75% in March to 24.14% “through August 20”; substantive use rose from 1.39% to 14.09% (section 3.1, p. 4). Inference: these end values equal the August column of Table 1 (1,083 and 632 of 4,487 August submissions), so they are the share within August, not a cumulative share over March through August. Table 3 distinguishes field totals from substantive-use counts: Metric Geometry has 40 of 305 papers (13.11%), while Combinatorics has 397 substantive papers among 3,382 (11.74%) (section 3.2, pp. 5–6).

Inference: Counts answer where most verified-code activity occurs; rates answer which communities adopt it most intensely. VL should report both, and should not compare a provider percentage based on manuscript associations with a paper-level prevalence percentage.

## technique: cautious open-problem outcome coding

What it is. For each named open problem, classify the status from the paper's own description. Among 717 records, 103 remain open, 93 are partially resolved, 329 are labeled resolved true, 181 resolved false, and 11 unclear (section 3.3, p. 7). The authors explicitly deny that these labels are independent verification: “These labels are assigned by the LLM-based review from the authors’ own descriptions in the manuscripts and do not constitute independent mathematical verification of the claimed resolutions.” (section 3.3, p. 7)

How to apply it.

1. Extract a named problem and, where the manuscript reports one, its proposed year; the year was not reported for 388 of the 717 records (section 3.3, p. 8).
2. Assign one of the five statuses from the authors' description (section 2, pp. 3-4; section 3.3, p. 7).
3. Use “unclear” as a status of its own; 11 records received it (section 3.3, p. 7). Inference: it is the fallback when the description does not support another status.
4. Report the result as a claim inventory: the authors interpret the results “as evidence about the kinds of open-problem claims appearing in AI-assisted mathematics, rather than as a definitive count of previously open problems solved by AI” (section 3.3, p. 10). Inference: seek peer review or an independent checker before calling a problem solved.

Inference: This is the correct epistemic separation for AI-generated Verus claims too: “proof compiles,” “reviewer accepted,” and “requirement is met” are different labels.

## formal-verification relevance, trust, and product threat

The paper reports 427 manuscripts labeled “formalization and verification” and cites formal proof assistants such as Lean in its background (section 1, p. 2; Table 1, p. 5), but it does not teach a formal proof algorithm, provide proof scripts, or verify any generated artifact. Its techniques are evidence collection, structured classification, quote grounding, sampling, and denominator-aware reporting.

What is measured. The study measures disclosed AI use in 32,944 submissions, category frequencies, field and geographic concentration, named open-problem records, and provider mentions. OpenAI appears in 2,148 of 3,575 confirmed-use manuscripts (60.08%), Anthropic in 776 (21.71%), Google in 334 (9.34%), and DeepSeek in 80 (2.24%) (section 3.5, pp. 12-13). Provider counts are non-exclusive because one manuscript can name multiple providers (section 3.5, p. 13).

What remains trusted. The corpus extraction, disclosure interpretation, LLM classifier, author claims, inferred affiliations, and incomplete manual validation remain trusted or uncertain. The authors state that open-problem classifications are not substitutes for peer review, priority research, or independent correctness checks (section 4, p. 14).

Inference: The direct threat to VeruLaw is low because this paper is not a competing verifier. The strategic warning is high: reported AI-assisted formalization is already measurable, but disclosure-based surveys can overstate successful verification if they count author claims without checking artifacts. VL should keep compiler-checked proof status and human requirement coverage as separate fields. Existing literature surveys should not redo broad claims about AI adoption; they should use this paper's reproducible, quote-grounded audit design when measuring verified Rust use.

## techniques for the catalog

- disclosure-bounded corpus audit: measure AI adoption only from explicit disclosures in an exhaustive, versioned corpus
- structured non-exclusive coding: classify multiple AI roles per paper while reporting de-duplicated category counts separately
- evidence-grounded LLM extraction: require confidence scores and verbatim source quotations for every machine classification
- keyword screening with manual validation: reduce review cost by screening the full corpus, then estimate classifier error on a human-sampled subset
- denominator-aware reporting: pair every count or percentage with its corpus, field, manuscript, or provider denominator
- claim-versus-verification separation: record author-reported resolutions while withholding independent correctness claims until peer or machine verification
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "A paper classified as resolving an open problem may later be found to contain an error, overlap with prior work, or require further expert validation."): read the whole paper text and checked every quotation, number, section and page reference against it, and the technique steps against section 2. Changed: link (it pointed to the Leiden Declaration DOI cited by the paper, not the paper; now the arXiv page 2608.24961 from the paper text); one quotation that had dropped "in the manuscripts"; page numbers (the questionnaire, GPT-5.6 Terra and manual-validation text is on p. 4, Table 1 on p. 5, provider counts on pp. 12-13); the corpus-construction step that wrongly credited keyword search with finding disclosures; the claim of no web search (the paper used web searches for affiliations); "independently" for manual annotation (not stated); added an Inference note that the 24.14% and 14.09% end values match the August column of Table 1, not a cumulative share. Not checked: the figures' plotted values beyond their printed labels, Tables 3 and 4 row by row, Gini values, Figure 6 metrics, and the cited external works.
