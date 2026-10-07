LLM text detection
(authored by agents unless marked 🧑)

start here

- recommendation: study whether web processing changes detector decisions
    - a controlled comparison can separate detector failure from text-extraction failure
    - this builds on DeGenTWeb rather than repeating a generic detector benchmark
- recommendation: make page and site decisions account for repeated templates
    - ten copies of the same paragraph are not ten independent pieces of evidence
    - measure what site aggregation adds after removing duplicates
- recommendation: define drafting and editing separately
    - final text alone may not identify who supplied ideas, wording, or corrections
    - test useful decisions rather than promise complete authorship recovery
- evidence: methods work well in selected settings and fail in others
    - Binoculars section 6: “we do not consider explicit efforts to bypass detection”
    - [source](https://arxiv.org/abs/2401.12070)
    - RAID figure 4: “few detectors can operate at FPR<1%”
    - [source](https://aclanthology.org/2024.acl-long.674/)
    - these statements concern their tested systems and datasets
- proposal novelty is unconfirmed
    - detailed notes identify nearby work and experiments that would reject each idea

reading order

- [research proposals](research_proposals.md)
    - questions, closest work, experiments, costs, and stopping rules
- [zero-shot detectors](zero_shot_detectors.md)
    - DetectGPT, DetectLLM, Fast-DetectGPT, Binoculars, DNA-GPT, Glimpse, MOSAIC, HALO, NTS
- [trained detectors](trained_detectors.md)
    - learned features, rewriting, attack training, and recent creator/editor models
- [aggregate measurement](aggregate_measurement.md)
    - corpus estimates, stable-error assumptions, and site-level interpretation
- [foundations](foundations.md)
    - what mathematical limits do and do not establish
- [robustness and evaluation](robustness_evaluation.md)
    - paraphrasing, personalization, benchmarks, short and mixed text, code, and false positives
- [humans and browser tools](humans_browser_tools.md)
    - human experiments, extension features, and studies of warnings and extraction
- [recent preprints](recent_preprints.md)
    - trajectories, steering, token filtering, and stability-based scores
- [primary-source catalog](source_catalog.md)
    - exact titles, authors, and links back to the relevant notes
- [paper archive](paper_archive.md)
    - saved papers and collection status

relationship to existing notes

- fact: [Generative AI notes](../../../gen_ai.md) already identify in-the-wild noise and set-level detection
    - “emphasize data in the wild different from benchmark”
    - “noisy nature: non-prose”
    - “set-level detection applications: Reddit users, OpenReview, student cheating, Amazon reviewers”
- this tree expands those questions
    - the existing DeGenTWeb preliminary evaluation, literature, and arguments files contained titles only when read
- sibling reviews cover web infrastructure, web user harms, and provenance/watermarking
    - this tree concentrates on detection from observed text

scope and evidence

- 64 distinct primary paper pages opened and cataloged
- reviewed through 6 October 2026
    - peer-reviewed conference entries and preprints are distinguished in the detailed notes
    - abstracts support only the stated author claims
    - full-paper checks are identified where performed
- no detector experiments were run
- quotes remain short and identify the paper or vendor
- research recommendations are agent judgments
    - search results do not establish that a research gap is unoccupied
- broad search services failed in this session
    - direct arXiv, ACL, vendor, and collection access worked
    - recent papers were discovered through conference-volume indexes and the paper collection
    - Crossref API searches also worked
        - extraction/boilerplate, website detection/Common Crawl, and web-text detection queries
        - these noisy metadata results did not establish novelty
