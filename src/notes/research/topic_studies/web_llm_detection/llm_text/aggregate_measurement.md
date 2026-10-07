aggregate detection and prevalence assumptions
(authored by agents unless marked 🧑)

main point

- inference: detecting a corpus-level shift and classifying one page are different tasks
    - pooled evidence can reveal small changes that do not identify particular writers
    - the reference populations still determine what the estimate means
- recommendation: distinguish three outputs
    - score resemblance to model output
    - classify whether a site contains generated drafting
    - estimate a proportion of generated or modified content
- deduction: neither average score nor flagged fraction automatically estimates generated share

existing aggregate estimator

- [Monitoring AI-Modified Content at Scale: A Case Study on the Impact of ChatGPT on AI Conference Peer Reviews](https://arxiv.org/abs/2403.07183), Liang et al., ICML 2024, peer reviewed
    - current arXiv PDF is version 4 dated 19 May 2026
    - fact: fit a mixture of human-reference and model-reference text distributions
        - estimate how much each distribution contributes to a target corpus
        - use occurrences of selected adjectives rather than individual binary detector decisions
    - authors' abstract estimate: 6.5–16.9% of text in evaluated AI conference reviews substantially modified by models
        - their operational meaning excludes minor proofreading
        - inferred modification is not proof of model-written ideas or whole reviews
    - fact: likelihood model simplifies dependencies among token occurrences
    - theorem I.1 assumption: “drawn i.i.d. from the mixture distribution”
        - independent observations with one common mixture distribution
        - fitted model and reference-data error need separate consideration
    - author limitation: “temporal distribution shift in token frequencies”
        - examples include changing topics and reviewers
    - inference: an arbitrary collection of websites is less homogeneous than conference reviews
        - site genre, templates, language, and copied text can mimic a change in mixture
    - novelty threat: estimating aggregate model use is already established work
        - new research needs changed assumptions, validation, or a different useful quantity

existing detector-based web estimate

- [The Rise of AI-Generated Content in Wikipedia](https://arxiv.org/abs/2410.08044), Brooks, Eggert, Peskoff, 2024
    - inspected primary arXiv version 1
    - study appears in the EMNLP 2024 NLP for Wikipedia workshop
    - fact: calibrate GPTZero and Binoculars on pre-March-2022 Wikipedia articles
        - target 1% false positives
        - compare with articles newly created in August 2024
    - authors' abstract: detectors flag more than 5% of new English articles
        - 2,909 English articles after length filtering
        - flags are observations, not direct ground-truth authorship
    - fact: subtract baseline flagged rate to describe a lower bound
    - author assumption: “increased AI use being the primary factor affecting detection”
        - the surrounding discussion assumes earlier and later text populations are comparable
    - inference: if human writing or extraction changes, baseline subtraction can misattribute the difference
        - two detectors agreeing does not establish independence of their errors
    - fact: authors inspect histories of 45 English pages flagged by both tools
    - inference: targeted inspection helps understand flagged cases
        - it does not estimate error among all unflagged pages

simple accounting before choosing an estimator

- define p as true generated fraction
- define r as recall on generated text
- define f as false-positive rate on human text
- define q as fraction flagged
- deduction under stable class-specific error rates
    - q = p × r + (1 − p) × f
    - p = (q − f) / (r − f) when r differs from f
    - estimates outside [0, 1] reveal sampling variation or incompatible assumptions
        - clipping them does not repair calibration drift
- deduction: rare generated content makes false-positive calibration especially important
    - assumed p = 1%, r = 80%, f = 1%
    - expected true generated flags: 0.8% of all texts
    - expected human flags: 0.99%
    - only about 45% of flags are genuinely generated
- deduction: uncertainty grows when recall and false-positive rate are similar
    - denominator r − f becomes small
- inference: class-specific rates must be measured on a plausible target population
    - known generated samples from one prompt/model may not represent real users' generation
    - old human text may not represent new human writing

site-level experiment requirements

- recommendation: first test a site classifier with a fixed generated-presence definition
    - choose how much generated text counts as a positive site
    - report site false positives and recall
- recommendation: pursue prevalence only after selecting its denominator
    - distinct articles, pages, sentences, or bytes answer different questions
    - repeated navigation should not silently count as independent composition
- recommendation: report sensitivity analyses
    - vary plausible human false-positive rates
    - vary generator/prompt mixtures and recall
    - compare raw pages with deduplicated article content
    - test temporal changes known to contain no new model generation
- recommendation: cluster uncertainty by site and underlying article
    - do not resample copied paragraphs as independent evidence
- limitation: bounded estimates depend on bounded drift assumptions
    - no reviewed method makes text-only web prevalence assumption-free
