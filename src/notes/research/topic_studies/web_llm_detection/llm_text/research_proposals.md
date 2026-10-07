research proposals for DeGenTWeb
(authored by agents unless marked 🧑)

what is worth doing first

- recommendation: begin with a small paired experiment on web extraction
    - question: are we measuring authorship or the text our extractor happens to return?
    - expand only if extraction changes useful decisions at a fixed false-positive target
- recommendation: follow with site aggregation under repeated templates
    - question: does combining pages add information after removing repeated content?
- recommendation: keep authoring history and warning design as separate studies
    - these need collaborators or data collection beyond a crawl
- uncertainty: no proposal below has established novelty
    - nearest prior work defines what must be checked before committing to a paper

1: isolate web extraction errors

- question: which parts of a web measurement pipeline cause false flags or missed generations?
- human requirement motivating the question
    - existing [notes](../../../gen_ai.md): “noisy nature: non-prose”
- evidence for the question
    - [Binoculars](https://arxiv.org/abs/2401.12070) section 6: “such as source code, which we do not investigate”
    - [SenDetEX](https://aclanthology.org/2025.emnlp-main.268/) studies text where human and generated spans “alternate irregularly”
    - [MultiSocial](https://aclanthology.org/2025.acl-long.36/) states “the platform selection for training matters”
- inference: these papers address adjacent inputs
    - the opened sources do not establish robustness to alternative HTML extraction of the same article
    - this is narrower than claiming that web detection has never been studied
- first experiment
    - choose 200 source articles with documented human origin and 200 controlled generated counterparts
        - treat old dates as supporting evidence, not proof of human origin
        - preserve source, prompt, model version, and generation parameters
    - embed each article in several HTML templates
        - vary navigation, related links, quotes, comments, tables, and code separately
        - keep the article text identical across variants
    - compare article-only, rendered-visible-text, extractor output, and paragraph blocks
    - score Binoculars, Fast-DetectGPT, NTS, and PAWN
        - add likelihood/rank controls from already-computed probabilities
    - calibrate on separate websites or template families
        - freeze thresholds before testing new sites
- convincing result
    - reproducible differences attributable to extraction alone
    - an extraction or abstention rule reduces held-out human flags while preserving useful recall
    - report score changes, confusion counts, abstention coverage, throughput, and extraction failures
- low false-positive extension
    - 200 human sources are insufficient to validate 0.1% false positives
    - if the pilot shows an effect, expand to thousands of independent sources
    - with no errors, the approximate 95% upper bound is 3/n under independent sampling
        - 3,000 sources support approximately 0.1%, not 0.01%
        - clustered pages need uncertainty calculated by source/site, not by paragraph
        - observing a numerical rate is separate from establishing a confidence bound
- planning estimate, not measured cost
    - one GPU with enough memory for the selected baselines
    - approximately one week to implement and inspect the pilot
    - full calibration and provenance checks will cost more than scoring a few hundred texts
- nearest work and novelty threats
    - DetectRL-X: multilingual web/SEO domains, lengths, attacks, and assisted writing
        - generic web-domain or polishing evaluation alone is already covered
    - RAID: varied domains, decoding, attacks
    - MultiSocial: short texts and platform transfer
    - SenDetEX and HACo-Det: mixed spans
    - HALO: context changes detection
    - MCP: length-specific false-positive calibration
    - check whether any artifact already varies HTML extraction before claiming novelty
- stopping rule
    - if extraction barely changes results and simple article extraction solves the problem, use the finding in DeGenTWeb rather than build a standalone project

2: site decisions without counting copies as new evidence

- question: can many pages support a more reliable site-level conclusion than one page?
- human motivation from [existing notes](../../../gen_ai.md)
    - “set-level detection applications: Reddit users, OpenReview, student cheating, Amazon reviewers”
- starting observation, deduction
    - if every page repeats one generated paragraph, averaging pages can appear confident without observing more independent writing
    - confidence must depend on distinct content and the process that produced it
- target quantity must be chosen explicitly
    - fraction of distinct article text generated
    - fraction of pages containing generated drafting
    - presence of any generated passage
    - these have different denominators and cannot share one interpretation
- first experiment
    - create site-sized groups with known article histories
    - vary generated fraction, duplicated templates, copied articles, and heterogeneous writing domains independently
    - compare page mean, maximum score, proportion of flagged blocks, and duplicate-aware aggregation
    - split entire sites between calibration and evaluation
    - use site resampling for uncertainty
- convincing result
    - aggregation improves detection at the same site false-positive rate
    - improvement survives duplicate removal and held-out templates
    - the pilot tests site classification rather than interpreting scores as generated share
    - a later prevalence study needs an explicit estimator
        - compare with adjustment using held-out recall and specificity
        - test sensitivity to changing domains and generator mixtures
        - do not interpret the fraction flagged or an average score as the true generated fraction
- closest work
    - [Monitoring AI-Modified Content at Scale](https://arxiv.org/abs/2403.07183)
        - aggregate estimation of AI-modified reviews already exists
    - [The Rise of AI-Generated Content in Wikipedia](https://arxiv.org/abs/2410.08044)
        - use of document detectors to estimate web prevalence already exists
    - these are novelty leads from the human's notes
        - current arXiv full texts were inspected in this review
        - see [aggregate measurement](aggregate_measurement.md) for assumptions
        - inspect later follow-ups before adopting an estimator
- inference: the possible contribution is sensitivity to dependence and website change
    - simply averaging detector scores is insufficient
    - disagreement between detectors does not create an independent ground-truth label
- planning estimate
    - reuse proposal 1's scoring pipeline
    - one to two additional weeks for grouping, mixtures, uncertainty calculations, and audits
- stopping rule
    - if simple duplicate removal plus a page detector matches the new estimator, prefer the simpler method

3: decisions that remain useful for assisted writing

- question: what can a text detector reliably infer about a sequence of human and model edits?
- closest work
    - [MixSet](https://arxiv.org/abs/2401.05952): human/model revision
    - [APT-Eval](https://aclanthology.org/2025.findings-acl.1303/): “even minimally polished text” is frequently flagged
    - [RACE](https://aclanthology.org/2026.acl-long.235/): “the distinct signatures of creator and editor”
        - four authoring-history classes are already studied
- inference: another four-class classifier is weak novelty
    - repeated editing, observed histories, and abstention need a sharper claim
- first experiment
    - preserve human drafts, model suggestions, accepted edits, and final text
    - vary grammar correction, sentence rewriting, expansion, and full drafting
    - include model drafts revised by humans
    - hold out writers, prompts, and model families
    - evaluate any-model-use, model-drafting, and span-localization questions separately
- convincing result
    - identify which histories remain distinguishable after matching final length, topic, and quality
    - provide an abstention rule for histories with overlapping final-text evidence
    - describe a useful action, such as requesting writing history, instead of making an unsupported accusation
- identifiability limit, deduction
    - the same final string can result from independent human writing, copying, or model generation
    - a detector given only that string cannot distinguish those identical observations
    - empirical success is conditional on how the histories are sampled
- planning estimate
    - needs consenting writers and recorded editing sessions
    - generation and scoring are routine compared with obtaining reliable authoring histories
- stopping rule
    - if known-history classes cannot be separated across held-out writers at acceptable false-positive rates, report that boundary rather than relabel the problem

4: browser warnings judged by reader outcomes

- question: does a detection warning help readers check claims?
- motivation
    - official GPTZero [Chrome page](https://gptzero.me/chrome): “Results should not be used to punish or as the final verdict”
    - inference: a warning still changes what people trust
- first experiment
    - vary factual correctness and human/model origin independently
    - randomize no warning, binary warning, uncertainty warning, and a source-check suggestion
    - separately test actual detector errors and controlled warnings
- convincing result
    - improved error identification and source checking
    - fewer false accusations than binary warnings
    - benefit across varied language backgrounds
- costs and limits
    - requires a user study and appropriate review of recruitment and consent
    - synthetic warnings identify interface effects
        - an end-to-end extension trial must additionally measure actual detector accuracy
- nearest work
    - human-detection and browser-tool notes in this tree
    - dedicated literature on automation reliance and warning design needs further review
- stopping rule
    - if an AI label harms decisions, test source-evidence prompts instead

ideas to deprioritize

- agent judgment: generic score ensembles
    - Ghostbuster and MOSAIC already combine scoring information
- agent judgment: another paraphrase-resistant binary detector
    - RADAR, GREATER, and numerous attack benchmarks already occupy this space
    - a new systems claim needs measured deployment behavior or a distinct threat model
- agent judgment: a browser badge asserting definite AI authorship
    - official tools already deliver badges and highlights
    - the research question is whether the badge improves decisions under errors

ChatGPT consultation

- requested with Extra High reasoning through the shared browser CLI
- consultation result and critical assessment will be added when the call returns
- agent recommendations above remain provisional
    - ChatGPT's opinion will not establish novelty or replace primary evidence
