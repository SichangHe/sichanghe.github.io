web dependency research proposals
(authored by agents unless marked 🧑)

recommendation: evidence loss under dependency failure

- question: which providers are necessary to preserve an article's useful evidence?
    - evidence: content that supports a specific answer
    - examples: cited references, tables, source images, author identity, sponsorship disclosure
- hypothesis: some failures silently remove evidence while leaving readable prose
    - proposed explanation: evidence and main prose can arrive through different components
    - not a measured result
- closest work
    - [Web Dependency Analyzer](https://doi.org/10.1145/3646547.3689683) targets rendering impact
        - full text and artifact must be checked before claiming a distinct contribution
    - [storage-policy study](https://www.kapravelos.com/publications/ephemeralstorage-www22.pdf) compares behavior and compatibility
    - [infrastructure study](https://aqsakashaf.github.io/assets/files/Webdep.pdf) maps shared failure risk
- proposed contribution
    - connect a dependency intervention to preserved evidence and answer correctness
    - release paired pages, annotated missing evidence, and reproducible task checks
- pilot
    - choose 30 public pages with explicit evidence-bearing components
        - technical documentation, product comparisons, statistical reports
    - define the question and supporting passage before interventions
    - collect five baseline loads per page
    - locally block each observed third-party provider in separate browser runs
        - then test two-provider combinations only when single-provider findings justify them
        - never disrupt the provider for other users
    - interleave blocked and unblocked runs
        - record timestamps, browser version, network endpoint, cache and consent state
    - compare screenshot, DOM, accessibility tree, extracted article, and answer
        - DOM: browser's structured representation of the page
        - accessibility tree: representation exposed to assistive tools
- primary outcomes
    - proportion of annotated evidence retained
    - question accuracy and unsupported-answer rate
    - recoverability after unblocking
- secondary outcomes
    - visual difference, request counts, performance
    - report alongside task outcomes rather than substitute for them
- failure attribution
    - count failures above repeated-baseline variation
    - confirm they reverse after unblocking
    - record anti-bot pages and inaccessible pages separately
- stop or change direction
    - if effects only reproduce existing rendering metrics, release replication rather than claim novelty
    - if most changes are random ad rotation, improve pairing before increasing sample size
    - useful negative result: evidence survives despite substantial visual changes

replication or component: preserve useful content during blocking

- question: can selective blocking retain task success while reducing measured tracking opportunities?
- existing work already shows benefits from selective method and API intervention
    - [recent comparison](recent.md) covers Amjad et al., ByteDefender, PURL, and FP-Inspector
    - generic component-level blocking is a replication
- remaining hypothesis: policies can retain answer-supporting evidence while reducing observed tracking
- closest work
    - [privacy versus compatibility](https://www.kapravelos.com/publications/ephemeralstorage-www22.pdf)
    - [tracker classification](https://arxiv.org/abs/1603.06289)
    - [AdGraph and perceptual blocking](../ads/literature.md)
- pilot
    - start with 20 pages that reproducibly break under a public blocker
    - manually define reading, navigation, table inspection, and disclosure checks
    - compare unblocked page, domain blocking, public filter list, and component-aware policy
    - keep provider identity, script initiator, content role, and changes separately
- evaluate
    - task success versus observed identifying-data transmission
        - transmissions are an operational privacy measure
        - do not infer full absence of tracking from fewer requests
    - policy maintenance cost and failure on later revisits
    - held-out sites and templates
- novelty condition
    - improvement must exceed existing storage isolation and blocking approaches on the same tasks
    - calling a model to label components is an implementation choice, not a contribution by itself
- stop
    - if manual exceptions deliver the same benefits more reliably, study maintainable exception rules

exploration: shared infrastructure among apparent independent sources

- question: do users or answer engines mistake many provider-backed pages for independent evidence?
- hypothesis: source diversity estimates can overcount copied or commonly operated pages
    - hosting concentration alone is insufficient evidence
- closest work
    - [Hanley et al. narrative tracking](https://www.usenix.org/system/files/usenixsecurity25-hanley.pdf)
    - [search evidence-independence proposal](../seo_search_quality/research_proposals.md)
- pilot
    - sample 50 technical questions with checkable answers
    - preserve retrieved and cited pages with timestamps
    - annotate common text, cited origin, disclosed ownership, affiliate identifiers, and shared scripts
    - label shared infrastructure as an uncertain clue
    - require text-origin or ownership evidence to label dependence
- evaluation
    - compare domain count, provider count, manual independent-evidence count
    - test whether reranking by verified independence improves answers
    - measure false merging of independent sites on large common hosting providers
- contribution condition
    - quantify consequences for evidence selection
    - generic clustering or narrative tracing already has close prior work
- stop
    - if provider identity adds no predictive value beyond copying and citations, omit it from ranking
