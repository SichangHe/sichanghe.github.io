research choices across user-facing web measurement
(authored by agents unless marked 🧑)

recommendation

- start with whether tools preserve the difference between a claim and its evidence
    - strongest bounded pilot: lost sponsorship disclosures
    - second candidate: live technical search with version-specific ground truth
    - both can use saved pages and controlled local experiments
    - both produce checkable failures rather than another vague quality score
- these priorities are agent opinions
    - no venue suitability or novelty guarantee
    - full-text review of the closest work is required before scaling

1. version errors and apparent corroboration in technical search

- question: how often do live technical answers cite the wrong software version or overstate a guarantee?
- recent evidence changes the initial recommendation
    - [five 2026 papers](seo_search_quality/recent_work.md) already test coordinated false evidence, citation laundering, claim strength, and controlled preference manipulation
    - generic copied-evidence and citation-manipulation experiments are replications
    - the remaining proposal must establish live exposure and a systems-specific outcome
- user benefit: fewer answers that mistake repetition for confirmation
- [revised design and closest recent work](seo_search_quality/recent_work.md)
- decisive pilot
    - 50 versioned technical questions with primary documentation
    - archive organic search results and cited answers
    - label wrong versions and overstated guarantees separately
    - compare version filtering, primary-source preference, claim-strength checking, and existing citation defenses
- compare
    - ordinary retrieval, one page per domain, text deduplication, primary-source preference, origin grouping
- primary outcome: answer correctness
    - supporting citations and correct abstention are separate outcomes
- closest work
    - [Hanley et al.](https://www.usenix.org/system/files/usenixsecurity25-hanley.pdf), introduction
        - “our approach does not make factual assessments of individual stories”
        - narrative tracking alone is already studied
    - [ALCE and FEVER](seo_search_quality/literature.md)
        - evidence support already has evaluation methods
- potential contribution
    - measure naturally occurring errors under named software versions
    - show an inexpensive mitigation improves operational answers
- negative result worth keeping
    - errors are rare or simple version filtering solves them

2. sponsorship disclosure lost during extraction

- question: does a tool retain promotional claims but discard the label that explains who paid for them?
- user benefit: distinguish paid promotion from independent evidence
- [complete design](ads/proposals.md)
- decisive pilot
    - known sponsored or affiliate passages with explicit disclosures
    - compare rendered page, HTML, accessibility tree, article extraction, and answer
    - move disclosures while leaving underlying claims fixed
- compare
    - ordinary extraction, label-preserving extraction, and original page
- primary outcome: retained commercial claims still linked to their disclosure
    - false commercial labels on ordinary content are a separate cost
- closest work
    - [affiliate disclosure, accessibility, native ads, AdGraph, PERCIVAL](ads/literature.md)
        - prior studies already detect ads and measure disclosure problems
- potential contribution
    - measure and prevent information loss between tools
    - payment ground truth is necessary
- negative result worth keeping
    - one small extractor fix prevents nearly all failures

3. evidence disappears before the whole page fails

- question: can third-party blocking or outages remove citations, tables, or disclosures while prose remains readable?
- user benefit: recognize incomplete evidence before relying on it
- [complete design](dependencies/proposals.md)
- decisive pilot
    - 30 pages with preannotated evidence
    - paired baseline, blocked-provider, and restored-provider visits
    - measure evidence retention and question accuracy
- closest work
    - [Web Dependency Analyzer](https://doi.org/10.1145/3646547.3689683)
        - poster and artifact not yet inspected
        - major unresolved novelty check
    - [storage-policy compatibility study](https://www.kapravelos.com/publications/ephemeralstorage-www22.pdf), discussion
        - “user-visible phenomenon”
- potential contribution
    - user-task and evidence outcomes beyond rendering or request graphs
- negative result worth keeping
    - evidence survives visual change and request loss

4. defenders and users see different scam paths

- question: what harmful steps appear only after interaction, referral, or a shared-host tenant route?
- user benefit: protection that covers the actual route to credential theft or scam payment requests
- [complete designs](phishing/proposals.md)
- decisive pilot
    - passively sourced suspicious URLs and matched benign pages
    - paired ordinary and scanner browser observations
    - explicit interaction traces and timestamps
    - local replicas for causal experiments
- closest work
    - [PhishPrint, PhishTime, PhishDecloaker, Free Waters, PHILTER](phishing/literature.md)
        - cloaking and browser-based phishing detection are well-studied
- potential contribution
    - quantify the remaining visibility gap and tenant-level protection failures
    - generic browser crawling or brand similarity alone is insufficient
- negative result worth keeping
    - apparent improvement disappears when train/test campaigns and time periods are separated

shared system worth implementing only after a pilot works

- one observation record
    - query or entry URL
    - page and timestamp
    - rendered view and extracted representation
    - claim, disclosure, supporting passage, cited origin
    - dependencies, redirect path, collection configuration
    - known labels, uncertain labels, and failure reasons
- one replay harness
    - keep original observations immutable
    - vary one mechanism at a time
    - compare repeated baselines
- one outcome layer
    - task success, supported answer, retained disclosure, protection at the risky step
- recommendation: build these together only when multiple successful pilots need them
    - a large general crawler is not required to decide whether the research mechanism exists

what would change these priorities

- a close existing paper already tests the same mechanism and outcome
- annotations cannot identify genuine evidence or payment
- observed failures are limited to one tool version
- a simple baseline solves the failure
- access restrictions prevent reproducible collection
- effect appears only in unrealistic controlled inputs
    - preserve that limited result rather than infer web-wide prevalence
