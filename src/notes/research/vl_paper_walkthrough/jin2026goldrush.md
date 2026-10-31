# The Gold Rush in AI4Math: Where Are We Now?
(authored by agents unless marked 🧑)
Tag: `jin2026goldrush`, [paper](https://arxiv.org/abs/2608.24961)

## scope and finding

This paper is an empirical audit of disclosed AI use in mathematics papers, not a formal-verification method paper. It studies 32,944 arXiv Mathematics submissions posted from 1 March through 20 August 2026. The authors identify 3,575 papers with explicit author disclosure of AI use, including 1,712 with at least one substantive mathematical contribution (abstract, p. 1). They classify disclosures, named open problems, author and institution information, and named AI systems.

The central distinction is between capability and adoption. The paper asks how often AI is actually reported in mathematical research rather than whether a model can solve a selected theorem. It says: “Our reliance on explicit disclosure (arXiv, 2026) provides a transparent and reproducible criterion for identifying AI-assisted research, but should be interpreted as a conservative measure of adoption because undisclosed uses cannot be observed.” (section 1, p. 3)

## technique: disclosure-based corpus construction

What it is. Construct a complete, bounded corpus and classify only what authors explicitly disclose. The authors downloaded every submission in the interval, stored metadata, converted PDFs to text page by page, and marked page boundaries. For texts over 300,000 characters they retained the first and last 150,000 characters; 1,007 of 32,944 records were flagged as truncated (section 2, p. 3).

How to apply it.

1. Define an exhaustive source interval and inclusion rule (here, primary or secondary arXiv Mathematics category) (section 2, p. 3).
2. Download PDFs and metadata, preserving identifiers, dates, titles, categories, and authors (section 2, p. 3).
3. Extract text with page boundaries; record truncation rather than silently discarding long papers (section 2, p. 3).
4. Have the classifier locate explicit statements about AI use in the extracted text and retain a verbatim quotation as evidence for each answer (section 2, p. 4); the keyword search in the paper is used only to select a manual-validation pool, not to classify.
5. Report prevalence against the complete corpus, and state that undisclosed use is unobservable (section 1, p. 3).

Evidence and limits. The complete-corpus denominator is 32,944 submissions. The conservative measure excludes undisclosed use, and Inference: truncation to the first and last 150,000 characters could hide a disclosure in the middle of some of the 1,007 truncated records (the paper does not discuss this). The authors' claims therefore concern reported adoption, not total adoption.

## technique: structured questionnaire with non-exclusive labels

What it is. The authors encode AI use as two major categories, substantive and non-substantive, each with four subcategories. Each subcategory is a yes/no label; labels are non-exclusive. A paper is substantive if at least one substantive subcategory is yes (section 2, p. 3). Table 1 (p. 5) reports proof construction (1,225 papers), formalization and verification (427), other research assistance (289), and problem formulation (146), with overlaps allowed (section 3.1, p. 4).

How to apply it.

1. Define the scope of AI and the categories in a fixed instruction given with every record (section 2, p. 4).
2. Ask one binary question per subcategory, allowing multiple yes labels for one paper (section 2, p. 3).
3. Record open-problem status separately as open, partially resolved, resolved true, resolved false, or unclear, plus whether AI played a critical role in the reported resolution (section 2, pp. 3-4).
4. Preserve model names, author–institution pairs, and quotations as separate structured fields (section 2, p. 4).
5. Aggregate both de-duplicated major-category counts and non-exclusive subcategory counts, labeling the difference in tables (Table 1, p. 5).

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

## technique: cautious open-problem outcome coding

What it is. For each named open problem, classify the status from the paper's own description. Among 717 records, 103 remain open, 93 are partially resolved, 329 are labeled resolved true, 181 resolved false, and 11 unclear (section 3.3, p. 7). The authors explicitly deny that these labels are independent verification: “These labels are assigned by the LLM-based review from the authors’ own descriptions in the manuscripts and do not constitute independent mathematical verification of the claimed resolutions.” (section 3.3, p. 7)

How to apply it.

1. Extract a named problem and, where the manuscript reports one, its proposed year; the year was not reported for 388 of the 717 records (section 3.3, p. 8).
2. Assign one of the five statuses from the authors' description (section 2, pp. 3-4; section 3.3, p. 7).
3. Use “unclear” as a status of its own; 11 records received it (section 3.3, p. 7). Inference: it is the fallback when the description does not support another status.
4. Report the result as a claim inventory: the authors interpret the results “as evidence about the kinds of open-problem claims appearing in AI-assisted mathematics, rather than as a definitive count of previously open problems solved by AI” (section 3.3, p. 10). Inference: seek peer review or an independent checker before calling a problem solved.

Inference: This is the correct epistemic separation for AI-generated Verus claims too: “proof compiles,” “reviewer accepted,” and “requirement is met” are different labels.

## techniques for the catalog

- disclosure-bounded corpus audit: measure AI adoption only from explicit disclosures in an exhaustive, versioned corpus
- structured non-exclusive coding: classify multiple AI roles per paper while reporting de-duplicated category counts separately
- evidence-grounded LLM extraction: require confidence scores and verbatim source quotations for every machine classification
- keyword screening with manual validation: reduce review cost by screening the full corpus, then estimate classifier error on a human-sampled subset
- denominator-aware reporting: pair every count or percentage with its corpus, field, manuscript, or provider denominator
- claim-versus-verification separation: record author-reported resolutions while withholding independent correctness claims until peer or machine verification
