# removal services and content theft
(authored by agents unless marked 🧑)

research choice

- recommendation: study whether removal lasts
  - compare independent observations with removal providers' reported success
  - follow people across replacement profiles and sites
  - measure time exposed again after removal
- second choice: help creators find unattributed copies without accusing legitimate quotation
  - build evidence for a person to inspect
  - distinguish copying, attribution, permission, and visibility in search
- novelty remains unconfirmed
  - these are experiment proposals
  - existing work already detects copied text and studies takedown errors
  - the possible contribution is reliable evidence about what remains accessible after a claimed removal

scope and evidence

- reviewed 7 Oct 2026 UTC
- starting points
  - [human's removal-services notes](../../../removal_services.md)
  - [human's research questions](../../../index.md)
- read the complete Consumer Reports study and selected relevant sections of the other full papers and report below
- checked USENIX Security 2024–2026 program pages for adjacent work
- search coverage is incomplete
  - both available web search services failed
  - direct retrieval worked for several primary sources
  - several publishers blocked access
  - a failed retrieval supplies no evidence about a paper's claims
- legal sources below describe historical systems and research datasets
  - this study does not establish current legal obligations

what prior work establishes

- Consumer Reports, Grauer, Kauffman, and Honeywell, [Data Defense: Evaluating People-Search Site Removal Services](https://s3.documentcloud.org/documents/25034333/evaluating-people-search-site-removal-services_8824-1.pdf), 2024
  - method, pp 7–9: 32 volunteers from California and New York
    - seven paid services and a manual-removal group
    - four people per treatment
    - 13 people-search sites
    - observations after one week, one month, and four months
    - data collection occurred May–September 2023
  - result, p 10: 117 of 332 initially observed profiles assigned to paid services disappeared within four months
    - roughly 35%
    - this counts profiles, not people completely protected
  - key limitation, p 9: “We also did not test for the reappearance of profiles”
    - once a profile disappeared, it was no longer checked
    - checks stayed on the original profile URL
    - replacement pages could escape observation
  - statistical limitation, p 9: “not statistically significant or nationally representative”
    - volunteers excluded common surnames and recent movers
    - limited supplied identity data and no follow-up interaction with dashboards
  - unresolved reporting inconsistency, p 11
    - prose reports 33/47 manual removals after a week and three additional removals after a month
    - table 2 reports 70% at every interval
    - 36/47 is about 77%
    - use the raw counts and flag the discrepancy
  - inference: a new study can directly close the stated reappearance gap
    - this does not establish that nobody else has already done so

- Hausladen et al., [Websites' Global Privacy Control Compliance at Scale and over Time](https://www.usenix.org/system/files/usenixsecurity25-hausladen.pdf), USENIX Security 2025
  - Global Privacy Control is a browser signal requesting that websites stop selling or sharing a user's personal data
  - method, §§3–4: longitudinal crawl of 11,708 sites
    - inspect four machine-readable representations of opt-out status
    - identify relevant third parties using policies and browser classifications
  - result, abstract: “44% (1,411/3,226)”
    - December 2023 fraction of eligible sites opting users out through all privacy strings they implemented
    - the study's eligible group is narrower than all crawled sites
  - limit, §3.6: “may not reflect their actual practice”
    - the authors apply this warning to third-party privacy policies
    - applicability estimates, blocked script injection, and location detection also limit interpretation
  - inference: reuse its independent checking approach
    - a privacy string records a declared state
    - it does not reveal whether downstream copies were actually erased
    - keep this distinction in any removal audit

- Broder, [On the resemblance and containment of documents](https://www.cs.princeton.edu/courses/archive/spring13/cos598C/broder97resemblance.pdf), 1997
  - author defines resemblance and containment through overlap between sets of short text sequences
  - abstract: “roughly the same” and “roughly contained”
  - method: retain compact random samples of these sequences
    - compare samples instead of all pairs of complete documents
  - demonstration, §1: over 30 million crawled web documents
    - clustering used a 50% resemblance threshold
  - relevance: distinguish a whole copied article from an article embedded inside a longer page
  - limit: shared words establish text overlap
    - they do not establish who wrote first, permission, or wrongdoing

- Schleimer, Wilkerson, and Aiken, [Winnowing: Local Algorithms for Document Fingerprinting](https://theory.stanford.edu/~aiken/publications/papers/sigmod03.pdf), SIGMOD 2003
  - a fingerprint is a selected hash of a short text sequence
  - method: choose hashes from sliding windows
    - guarantees detection of an exact shared span longer than a chosen threshold
    - after the specified preprocessing and under the paper's hash assumptions
  - abstract: “including small partial copies”
  - evaluation includes web data and experience with the Moss code-similarity service
  - relevance: a cheap baseline for partial copying
  - limit: translation and substantial rewriting can remove matching spans
    - normalization choices can also create misleading matches

- Alex Aiken, [Moss documentation](https://theory.stanford.edu/~aiken/moss/), retrieved 7 Oct 2026
  - Moss finds code similarity for human inspection
  - author: “the scores are certainly not a proof of plagiarism”
  - relevance: apply the same separation to copied articles
    - return matched passages and context
    - avoid turning a similarity score into an accusation
  - limit: this is operational guidance for code comparison
    - it does not evaluate web-article attribution

- Google, [copyright-removal transparency FAQ](https://support.google.com/transparencyreport/answer/7347743?hl=en), retrieved 7 Oct 2026
  - Google describes requests to remove links from Search
    - successful delisting does not itself show deletion at the source website
  - reporting limit: “we're not always able to verify the accuracy of the request”
  - dataset scope: “more than 95%”
    - Google's stated coverage of Search copyright-removal request volume since July 2011
    - excludes other products and some submission channels
  - relevance: notices provide candidate targets and dates
    - they are allegations rather than labels proving infringement
    - requester names can be duplicated or inconsistent
  - limit: company documentation describes its own reporting
    - independent measurements must verify current access and search visibility

- U.S. Copyright Office, [Section 512 Report](https://www.copyright.gov/policy/section512/section-512-full-report.pdf), 2020
  - pp 54–55: distinguishes removal from prevention of renewed uploads
  - p 187: distinguishes rotating URLs from repeated uploads by different users
    - these require different measurements
  - p 147: Lumen “does not represent even all of the requests received by Google”
  - p 147, note 788: warns that sender concentration can distort interpretations of defective-notice rates
    - one prolific sender can produce many problematic requests
  - relevance: sample by requester and content item as well as URL
    - distinguish replacement URLs, new uploads, and existing copies missed initially
  - limit: policy synthesis and submitted testimony
    - not a randomized estimate of current removal effectiveness
    - the report discusses competing stakeholder claims

follow-up reading

- Urban, Karaganis, and Schofield, [Notice and Takedown in Everyday Practice](https://www.law.berkeley.edu/wp-content/uploads/2016/03/Notice-and-Takedown-in-Everyday-Practice.pdf), 2016, updated 2017
  - direct PDF retrieval failed
  - the Copyright Office discusses its sampling and coding on p 147
  - retrieve the study before adopting its error categories or numerical estimates
  - avoid treating every problematic request as malicious censorship
- Wu, Collis, and Sen, [Demand for Privacy from Data Brokers](https://doi.org/10.1257/rct.13108-1.1)
  - registry entry discovered through publisher registration metadata
  - direct registry fetch returned HTTP 403
  - inspect trial design and results status before designing participant incentives or claiming no prior trial
- inspect later removal-service audits and research on privacy-request identity verification
  - a request may disclose additional identity data to the service or broker
  - quantify requested data and account access as costs
  - novelty search must cover this before starting participant recruitment

experiment 1: does personal-data removal last?

- question: how often does information become publicly reachable again after an independently confirmed removal?
- pilot proposal: 20 consenting adults and 10–15 brokers over 12 weeks
  - this sizes engineering work
  - choose the final sample after measuring variation in the pilot
  - no claim of adequate statistical power yet
- compare manual requests with two removal providers
  - randomly assign people to treatments
  - stratify by initial exposure and residence
  - same disclosed identity fields across treatments
  - record additional verification requests instead of silently supplying more data to one provider
- observe before requesting removal, then weekly
  - original URLs
  - broker name search with documented spelling variations
  - consenting participant's known previous addresses
  - ordinary search results
  - provider dashboard claims
- record separate states
  - publicly accessible
  - independently observed absent
  - accessible again
  - provider claims removed
  - uncertain because access is blocked or identity cannot be matched
- primary outcomes
  - interval containing first verified absence
    - between the last accessible visit and first absent visit
  - interval containing first verified reappearance
    - between the last absent visit and first accessible visit
  - fraction of observed visits with at least one accessible profile
    - weekly visits cannot establish exposure on unobserved days
  - fraction of provider success claims contradicted by observations
- key controls
  - manually check every apparent reappearance
  - keep observer accounts and locations consistent
  - repeat blocked observations without classifying them as removals
  - distinguish a surviving duplicate from a profile absent and later restored
  - analyze uncertainty by person
    - many profiles from one person are related observations
- feasible artifact: evidence collector and reproducible profile-state history
  - publish aggregate results and redacted examples
  - retain identity-bearing evidence privately
- contribution test
  - worthwhile if dashboard claims and durable exposure differ systematically
  - weak if the study only repeats the existing four-month removal comparison

experiment 2: follow copied content after removal requests

- question: how often does a removed copy return through another URL or host?
- pilot proposal: 20 cooperating creators and 100 confirmed copied items
  - creators establish authorship and permission status
  - only observe requests they already chose to submit
  - request assignment is observational
    - people choose what to report
    - response differences cannot automatically be attributed to the removal channel
- separate three outcomes
  - origin page accessible
  - discoverable through search
  - matching copies accessible elsewhere
- follow weekly for three months
  - hashes for exact copies
  - Broder-style text overlap and winnowing for partial copies
  - manual inspection for changed URLs, attribution, and source context
- compare original URLs with newly discovered copies
  - record first observation rather than trusting self-declared publication dates
  - link copies using matched content and creator confirmation
  - uncertainty remains for inaccessible pages
- possible contribution: measure the gap between a successful URL takedown and lasting reduction in accessible copies
  - URL rotation is known from earlier work
  - merely finding another URL is insufficient novelty

experiment 3: useful copy evidence with few false accusations

- question: can a small local tool identify copied passages while preserving legitimate attribution?
- pilot proposal: 100 source articles and 500 manually labeled candidate pages
  - include quotations, syndicated articles, mirrors, translations, partial copies, and unrelated pages sharing templates
  - include original authors' authorized republications
- compare exact matching, winnowing, and sampled text overlap
  - remove navigation and shared boilerplate before matching
  - measure accuracy separately by type of reuse
  - show passages, links, attribution text, and observed dates
- primary outcomes
  - confirmed copied passages retrieved
  - false accusations against authorized or attributed reuse
  - minutes needed for a creator to verify a candidate
- attribution and permission remain separate labels
  - a link does not establish permission
  - absent attribution does not establish ownership
- stop criterion
  - if cheap methods already retrieve most relevant copies, invest in better evidence and review
  - add semantic matching only when measured missed cases justify its cost

first implementation recommendation

- start with experiment 1's observer on five consenting people and five brokers
  - independently check already claimed removals
  - test whether matching and blocked-page handling are reliable
  - do not buy multiple subscriptions until the observer works
- preserve experiments 2–3 as alternatives
  - access to cooperating creators determines feasibility
- remaining uncertainty
  - later literature may already cover durable removal comprehensively
  - broker restrictions may prevent reliable repeated observation
  - creator permission labels may be incomplete
  - these determine the final study choice
