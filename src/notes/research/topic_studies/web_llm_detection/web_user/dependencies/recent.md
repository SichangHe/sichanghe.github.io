selective blocking and fingerprinting: recent related work
(authored by agents unless marked 🧑)

selective blocking already has direct prior work

- inference: proposal 2 needs a narrower contribution than preserving functionality through fine-grained blocking
    - method blocking, API restrictions, URL sanitization, and learned function classification already exist
    - existing evaluations include navigation, login, missing content, and manual interaction
    - task success alone therefore does not establish novelty
- candidate distinction: preservation of evidence needed for a specified answer
    - examples: a table cell, source citation, disclosure, or reference image
    - compare against existing fine-grained policies on the same pages and tasks
    - measure identifying-data transmission, evidence retention, and answer correctness together
    - novelty remains unverified pending broader review and artifact replication
- related work still requiring direct examination
    - TrackerSift, IMC 2021
    - SugarCoat, CCS 2021
    - WebGraph, USENIX Security 2022
    - JSAnalyzer and other JavaScript removal systems

Blocking JavaScript Without Breaking the Web: An Empirical Investigation

- [Amjad, Shafiq, and Gulzar, arXiv version 3, March 2023](https://arxiv.org/abs/2302.01182)
    - reviewed PDF retains placeholder proceedings metadata
    - cite the version explicitly until publisher metadata is checked
- verified quote, abstract, PDF p 1
    - “reduces major breakage by 3.8× while providing the same level of tracking prevention”
- method, §§3–4
    - automated crawl of 100K websites
    - label requests using existing filter lists
    - associate request initiators with scripts and methods through stack traces
    - classify code by relative participation in tracking and functional requests
    - compare six configurations, including script and method blocking
    - two testers inspect 383 websites
        - navigation, single sign-on, appearance, additional functionality
- authors' findings, abstract and §4
    - 14.6% of observed scripts mix functional and tracking behavior
    - method blocking reduces major breakage relative to blocking tracking and mixed scripts
- limits, §§5–6
    - labels depend on known tracking requests and observed executions
    - request initiators can be shared helpers rather than the original tracking source
    - methods can themselves mix functions
    - changing resources between visits complicates causal attribution
    - browser and environment limit generalization
- implication for proposal 2
    - directly anticipates selective blocking of mixed components
    - reproducing its granularity comparison is a replication
    - missing evidence and answer errors need explicit additional outcomes

Byte by Byte: Unmasking Browser Fingerprinting at the Function Level Using V8 Bytecode Transformers

- [Bahrami, Cutler, and Bilogrevic, CCS 2025](https://doi.org/10.1145/3719027.3765158)
    - [reviewed arXiv version 1, September 2025](https://arxiv.org/abs/2509.09950)
- verified quote, §6.1, PDF p 12
    - “its generalization to such cases remains unverified”
    - context: anonymous or eval-loaded functions excluded from labeled evaluation
- method, §§3–5
    - ByteDefender trains a Transformer on V8 function bytecode from a 100K-site crawl
    - labels derive from observed API patterns for known fingerprinting techniques
    - signature matching runs during compilation before execution
    - compare learned classification with random forests and an AST baseline
        - AST: abstract syntax tree representing source-code structure
- authors' results, Table 2 and §5.4
    - function classification: 98.9% accuracy, 84.0% precision, 85.1% recall
    - signature matching on 1K websites adds 158.74 ms average latency
        - authors compare this with 4% of median page load time
- limits, §6
    - named-function dataset excludes substantial anonymous and eval-loaded code
    - heuristic labels may miss new techniques
    - V8 dependence requires adaptation for other browser engines
- inference from evaluation scope
    - classifier and latency results do not establish preserved reading or question-answering success
    - functions labeled non-fingerprinting are not automatically useful or safe
    - a mixed script label alone does not prove that blocking it breaks a user task
- implication for proposal 2
    - learned function classification plus selective execution blocking is already studied
    - test actual task preservation and signature maintenance on later code versions
    - introducing another model does not establish novelty

PURL: Safe and Effective Sanitization of Link Decoration

- [Munir, Lee, Iqbal, Shafiq, and Siby, arXiv version 2, March 2024](https://arxiv.org/abs/2308.03417)
    - use this version date rather than treating the original 2023 submission as the reviewed version
- verified quote, §7, PDF p 13
    - “both functional and tracking purposes, even within a single URL”
- method, §§3–4
    - instrumented Firefox crawl of 20K sites
        - landing page and one sampled internal page
    - graph captures HTML, scripts, requests, browser storage, and information flows
    - random forest classifies URL decorations
        - query parameters, path components, fragments
    - sanitize identifying information while preserving the request
- authors' results, §4
    - 98.74% accuracy on labeled data with stratified 10-fold cross-validation
    - manual breakage assessment on 50 sites
        - PURL: two sites with minor breakage, one with major breakage
        - request filter lists: seven with minor breakage, four with major breakage
- limits, §§4.1 and 6
    - only 18.76% of collected decoration instances receive ground-truth labels
    - limited interaction may miss tracking flows
    - short split values can evade preprocessing
- inference for evaluation
    - abstract's “more than 8×” breakage claim requires specifying category and severity
        - raw affected-site counts above do not imply an eightfold reduction
    - cross-validation does not by itself demonstrate generalization to unseen site families
- implication for proposal 2
    - sanitize data as a baseline before removing useful components
    - inspect evidence loss even when navigation and appearance survive

Fingerprinting the Fingerprinters: Learning to Detect Browser Fingerprinting Behaviors

- [Iqbal, Englehardt, and Shafiq, arXiv version 1, August 2020](https://arxiv.org/abs/2008.04480)
- verified quote, §IV-B, PDF p 10
    - “particularly prone to breakage”
    - context: the selected websites used to assess countermeasures
- method, §§III–IV
    - FP-Inspector combines static syntax features and dynamic API behavior
    - compare blanket API restriction, targeted API restriction, request blocking, and a hybrid
    - 61-site manual evaluation
        - 50 sites loading fingerprinting scripts
        - 11 reported broken by Firefox fingerprinting countermeasures
    - reviewers compare visible interactions and missing functionality
- authors' results, Table III
    - any breakage: 68.03% with blanket API restriction
    - 30.32% with targeted API restriction
    - 50% with request blocking
    - percentages average two reviewers' assessments
- limits, §VII
    - splitting behavior across scripts can evade script-level analysis
    - merging functional and fingerprinting code complicates enforcement
- inference for proposal 2
    - these rates describe selected fingerprinting sites rather than the general web
    - task-aware enforcement has predecessors beyond domain blocking
    - measure meaningful failures such as loss of an answer-supporting chart

source preservation

- PDFs and extracted text saved in /hdd1/sichanghe/paper_collection
- local source folders use the full paper titles above
    - each contains `source.md` with URL, version, retrieval date, and SHA256
    - each contains `full_text.txt` for later reading
- direct arXiv PDF downloads succeeded
    - web search tool returned a backend HTTP 404 during this review
- section and page pointers refer to the preserved PDF versions
