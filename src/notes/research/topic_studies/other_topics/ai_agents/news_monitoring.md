reliable news monitoring for stocks and changing events
(authored by agents unless marked 🧑)

recommendation

- study whether an agent repairs its earlier alerts when their sources change
  - measure supported claims, missed events, repeated alerts, correction delay, and cost
  - existing papers already study timelines, fresh answers, and copied evidence
  - the research candidate is their combination under arriving and changing sources
- this is a research proposal about information quality
  - no experiment, deployed service, or financial recommendation is reported
  - the company-news workload can later extend to software releases or public-policy announcements

scope and attribution

- inherited interest: stocks and news watching
  - [the coverage map](../more_topics/coverage_map.md) assigns it to this group
  - the manager supplied this excerpt: “Move Stock&news watch back to server ... pipe news items to ChatGPT ... pre-filtering ... summaries and inference”
  - attribution remains unverified against the original human message
    - the ellipses were already present in the supplied excerpt
    - do not interpret the omitted text as authorization for trading or automated publication
- agent extension: evaluate source verification, corrections, and repeated alerts
  - this implements the general request for research ideas based on extensive reading
  - its specific design and priority are agent recommendations
- related studies
  - [memory and RAG](memory_rag.md): withdrawing sources and removing derived claims
  - [agent security](agent_security.md): hostile instructions in retrieved material
  - [misinformation](../web_trust/misinformation.md): broader verification and interventions

what must be kept separate

- event time: when something reportedly happened
- publication time: when the publisher says it published the item
- observation time: when this system actually obtained that version
  - a backdated page cannot become evidence available before observation
  - a replay must also time-filter summaries, indexes, examples, and cached answers
- claim: something the source says
  - distinguish an announcement, a rumor, a denial, and a completed event
  - an official filing establishes what the issuer disclosed
    - it does not independently establish every disclosed claim as true
- provenance: the record of where a claim came from
  - preserve fetched address, document identifier, version, supporting span, and observation time
  - five articles repeating one announcement are five documents with one known origin
  - independent origins can still share an error or informant

what the papers actually do

- [Agent Newsroom](https://aclanthology.org/2026.acl-long.1149/), Wang et al., ACL 2026
  - selected reading: task, collaboration, scheduling, experiments, limitations, appendix D.5
  - task: build a dated report from a query and a fixed corpus
  - method: share retrieved candidates, allocate overlapping evidence, select dates, exchange supportive and critical reviews, rank and deduplicate events
  - scheduling rewards accepted events to vary the number of active workers
  - evidence audit: three blinded annotators judge content and date support on sampled events
    - fully supported events range from 63% to 80% across the three benchmarks
    - the 5%–8% category supports neither content nor date
      - this is not the total fraction lacking complete support
  - authors' limitation: “not evaluated settings such as real-time streams”
  - inference: a strong report-generation baseline, with no demonstrated incremental correction behavior

- [CHRONOS: Unfolding the Headline](https://aclanthology.org/2025.findings-naacl.248/), Wu et al., Findings NAACL 2025
  - selected reading: retrieval, self-questioning, timeline construction, datasets, experiments, limitations
  - method: ask follow-up questions from earlier evidence, retrieve more news, build partial timelines, merge events by date
  - authors call this a “divide-and-conquer strategy”
  - OpenTLS supplies 50 professionally curated timelines from AP, PBS, and The Guardian
  - evaluation includes date overlap and text overlap with reference timelines
  - inference: these scores cannot establish whether every cited claim was supported at the moment an alert appeared
  - nearest prior: iterative retrieval and news timelines already exist
    - more retrieval rounds are not a research contribution by themselves

- [SENTiVENT](https://link.springer.com/article/10.1007/s10579-021-09562-4), Jacobs et al., Language Resources and Evaluation
  - selected reading: collection, event schema, annotation, agreement, factuality limitations
  - collection: Yahoo Finance articles about selected S&P 500 companies from 2016–2017
  - labels: event triggers, argument spans, 18 main event types, 42 subtypes, negation, and uncertainty
  - corpus construction removes articles repeating already represented events and excludes templated articles
  - uncertainty annotation is difficult even for trained annotators
    - authors “recommend refining the modality labels in a secondary revision pass” before factuality processing
  - inference: useful event schema, but a cleaned corpus removes much of a monitor's duplicate workload
    - uncertain versus completed events need independent human checks in a new workload

- [FinTMMBench and TMMHybridRAG](https://arxiv.org/abs/2503.05185), Zhu et al., “Towards Temporal-Aware Multi-Modal Retrieval Augmented Generation in Finance,” Aug 2025 v2 preprint
  - selected reading: dataset generation, preprocessing, retrieval, implementation, error analysis
  - benchmark: 5,676 questions across tables, news, daily prices, and charts for NASDAQ-100 companies
  - template-based question generation uses task guidance, automatic revision, and human review
  - method: combine dense retrieval with a graph carrying entities, relationships, and dates
  - authors include “a Source ID attribute that facilitates raw data mapping”
  - retrieve raw records as well as generated descriptions for answering
  - inference: encoded dates and source identifiers do not establish that late evidence was excluded
    - point-in-time availability needs a separate test
    - model-generated descriptions and model judgments need independent auditing

- [LiveFact](https://aclanthology.org/2026.acl-long.546/), Xu et al., ACL 2026
  - selected reading: construction, temporal slices, labels, human verification, evaluation, appendices
  - monthly pipeline gathers news and generates claims, then reviewers verify labels
  - distinguishes ultimate factual status from what evidence supports at T−3, T, and T+3
  - example: a claim that is factually “Real” might be labeled “Ambiguous” at T−3
    - exact label words from the paper's temporal-label explanation
  - nearly 85% of early-slice labels are ambiguous
    - always choosing ambiguous can look good under accuracy
    - score each class and useful coverage separately
  - inference: temporal uncertainty is already a benchmark task
    - monitoring must additionally test missed arrivals, corrections, and repeated alerts
    - background text created from all evidence also needs availability checks

- [FreshLLMs](https://aclanthology.org/2024.findings-acl.813/), Vu et al., Findings ACL 2024
  - selected reading: FreshQA collection, evaluation, search prompting, limits of current-answer tests
  - 600 questions include changing answers and false premises
  - strict grading “examines whether all of the facts in the answer are accurate”
  - FreshPrompt supplies search results with source, date, title, and snippets
  - inference: freshness and rejecting a false question are established evaluation requirements
    - a weekly updated answer is not an archive of what a monitor could know at every earlier moment

- [ALCE](https://aclanthology.org/2023.emnlp-main.398/), Gao et al., EMNLP 2023
  - selected reading: citation metrics, retrieval and synthesis, human evaluation, stated limitations
  - citation recall checks whether cited passages support output statements
  - citation precision checks whether citations are relevant
  - authors state that precision “does not require citing a minimal set”
  - inference: use these as starting metrics for claim support
    - support from a cited passage does not establish the passage's truth or independence
    - an automatic entailment judge needs human checks on dates, negation, and numbers

- [FActScore](https://aclanthology.org/2023.emnlp-main.741/), Min et al., EMNLP 2023
  - selected reading: definition, assumptions, automatic estimator, estimator evaluation, limitations
  - split generated text into small factual claims and score support against a reference collection
  - authors state “considers precision but not recall”
  - initial task uses biographies and Wikipedia
  - assumptions include no conflict or overlap in the reference information
  - inference: changing, contradictory news violates those simplifying assumptions
    - a silent monitor can obtain perfect precision while missing every event
    - measure useful event coverage alongside claim precision

- [FinBen](https://proceedings.neurips.cc/paper_files/paper/2024/hash/adb1d9fa8be4576d28703b396b82ba1b-Abstract-Datasets_and_Benchmarks_Track.html), Xie et al., NeurIPS 2024
  - selected reading: taxonomy, dataset and metric inventory, evaluation setup
  - final proceedings version includes “42 datasets spanning 24 financial tasks”
  - information extraction, question answering, and summarization supply component baselines
  - inference: component performance does not measure a long-running monitor's corrections or duplicate alerts
  - stock-return and trading tasks are outside this study's proposed evaluation

- [The Corroboration Illusion](https://arxiv.org/abs/2609.22246), Lu and Zhang, Sep 2026 preprint
  - selected reading: corpus timing, attack construction, controls, evaluation, scope limits
  - forecasts 500 resolved binary questions using three small open-model configurations
  - adversary inserts fabricated news and varies article count, retrieval rank, and context share
  - corpus timing uses crawl dates to reduce backdating leakage
  - authors' title: “When More News Makes LLM Forecasts Less True”
  - inference: counting articles as corroboration is already an attacked failure mode
    - forecasting results do not directly estimate factual-alert errors
    - a publisher name inside text is weaker evidence than a verified fetched source

- [Copies or Sources?](https://arxiv.org/abs/2610.06192), Gao et al., 5 Oct 2026 preprint
  - selected reading: measurement assumptions, three testbeds, merging methods, genuine corroboration checks, conclusion limits
  - converts stated probabilities into the equivalent number of independent readings
  - compares controlled sensor logs, copied web documents, and agent-written communication
  - defenses include an explicit declaration about copies, extracting distinct readings, and referring to earlier messages without repeating them
  - authors' limit: “Our controlled logs make provenance honest and explicit”
  - inference: counting copies once and asking agents to cite earlier observations are already tested interventions
    - forged identifiers, altered relays, shared source errors, and changing versions remain outside the honest-provenance setup
    - they are research leads, not proof that the following proposal is novel

an official source and an adjacent benchmark

- [SEC EDGAR APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)
  - documentation read: submissions history, company identifiers, update timing, bulk access
  - SEC states “These APIs do not require any authentication or API keys to access”
  - submission metadata and filing identifiers can anchor a reproducible company-news workload
  - preserve reporting period and units when linking financial facts
  - access policies and actual retained versions must be checked before collection
- [TREC RAGTIME 2026](https://trec-ragtime.github.io/)
  - official overview read; full task guidelines remain unread
  - task includes “report generation from news in multiple languages”
  - inference: check its full evaluation protocol before claiming a new news-report benchmark
- [TempFinRAG](https://www.mdpi.com/2073-8994/18/9/1498), Tao et al., Symmetry, 7 Sep 2026
  - publisher abstract read through search results
  - authors retrieve “time-valid evidence” and check claims and calculations
  - full article retrieval failed during this pass
  - [official repository](https://github.com/xixiaouab/TempFinRAG) overview and data contract read
    - filters records by availability before ranking
    - retains excluded evidence and citation identities
    - includes deterministic calculation and verification interfaces
    - authors: “It does not, by itself, reproduce the manuscript's reported numbers”
    - the supplied support check uses lexical overlap, not semantic entailment
  - inference: availability filtering and explicit provenance are already implemented prior work
    - full paper and code inspection remain necessary to compare correction behavior

pilot 1: repair alerts when sources change

- hypothesis: recording each claim's source version lowers stale-alert duration under equal processing cost
- workload: replay 50–100 public company-event sequences with known source versions
  - include announcements, denials, corrections, delayed arrivals, exact copies, and rewrites
  - genuine historical first-availability records are required for historical claims
    - otherwise label the replay as a controlled arrival experiment
  - annotate event identity, source ancestry, supported claims, and required repairs at each step
- method: record supporting spans and version identifiers for every emitted claim
  - when a source changes, revisit dependent claims and issue a linked correction
  - earlier assertions remain visible as earlier assertions
- baselines
  - extractive event rules with latest-version replacement
  - flat retrieval followed by a fresh complete report
  - CHRONOS or Agent Newsroom adapted to the same arriving corpus
  - TempFinRAG reference contracts with the same model and retrieval adapters
  - an oracle with known source versions
- measures
  - supported claim precision and useful event coverage at every replay step
  - delay between observing a correction and repairing affected claims
  - repeated alerts per event, citations to superseded versions, and token and runtime cost
  - count unresolved uncertainty separately from factual errors
- falsifier: latest-version replacement plus complete regeneration matches the proposed method's quality and cost
  - then a special incremental mechanism has little demonstrated value
- novelty limit
  - [memory and RAG](memory_rag.md) already proposes invalidating derived claims
  - possible contribution is the changing-news workload and measured tradeoff
    - no general source-invalidation novelty is claimed

pilot 2: verify origins before treating articles as corroboration

- hypothesis: observed source ancestry prevents false support better than declarations about copies when attribution is deceptive
- workload: mix independent records with copies, paraphrases, fabricated source labels, and edited descendants
  - retain genuine independent confirmations as a control
  - separate a document's fetched identity from identities asserted inside its text
  - shared underlying informants need explicit labels rather than presumed independence
- baselines
  - exact and approximate text deduplication
  - semantic deduplication plus copy declarations from Copies or Sources?
  - extraction of distinct observations before answering
  - oracle ancestry and the proposed record of fetched versions and derivations
- measures: supported claims, retained independent confirmations, mistaken merges, abstention, and cost
  - human judges audit claim support and ancestry without seeing the treatment
  - compare the same models, context limits, corpus, and retrieval budget
- falsifier: strong deduplication plus declarations performs as well under deceptive attribution and source updates
- novelty limit: Copies or Sources? already identifies forged provenance as future work
  - contribution would require a concrete verification method and reproducible workload
  - popularity or agreement among agents is not independent evidence

reading and execution limits, 8 Oct 2026

- selected full-paper sections listed above were retrieved and read
  - this does not claim every appendix or every cited prior was read
  - downloaded sources are in the local `rt_other_monitor_sources` cache
- all numerical results are authors' measurements
  - none was reproduced here
- no benchmark, collector, trading system, or messaging workflow was implemented
- citation-based support, true events, and source independence require separate judgments
- recent preprints require source and implementation checks before experiment spending
- independent Extra High ChatGPT consultation failed before prompt submission
  - local diagnostic: `rt_other_news_security_review.json`
  - no ChatGPT answer was obtained for this note
  - the parent recorded a separate cross-topic consultation
