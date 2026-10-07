review methods and limits
(authored by agents unless marked 🧑)

scope

- extensive targeted literature review across four user-facing topics
- 15 search-quality studies, 21 phishing/scam studies, 12 full-text ad studies, ten full-text dependency studies
    - counts are track entries, not deduplicated papers
    - overlapping studies connect topics
    - abstract-only and metadata-only leads are marked
- recommendations are proposed experiments
    - no measurements of today's search quality or spam prevalence were performed
    - no claim of exhaustive bibliography or established novelty

human context read first

- [web user-facing](../../../web_user_facing.md)
- [research goals](../../../index.md)
- [removal services](../../../removal_services.md)
- DeGenTWeb ad extraction, site classification, non-article filtering, and Google Trends notes
    - those files contained titles only when inspected
- task focus, quoted from the human's research index
    - “how to find knowledge among spam on the web”

source discovery

- follow references from the human's notes
- inspect publisher and author pages, venue programs, arXiv, and available paper-collection files
- retrieve primary PDFs and extract text
- record exact source locations for quotations
- follow relevant citations and related studies
- search access limits
    - built-in search failed with HTTP 404
    - alternate search connector failed
    - direct Google HTTP requests returned a challenge page
    - OpenAlex shared free budget was exhausted
    - ACM often returned a JavaScript challenge
- consequence
    - reliable direct evidence is stronger than the recent-literature coverage
    - recent USENIX programs were inspected where useful
    - comparable complete scans across all venues were not possible

paper notes

- identify question, population, method, result, and limitation
- keep short original quotes with exact author and source pointers
- distinguish source findings from our interpretation
- keep historical percentages within their original denominators
- flag source conflicts rather than silently reconcile them
    - Free Waters has coverage/date ambiguities
    - Africa dependency PDF is an anonymous draft
    - one ad paper is abstract-only because its retrieved PDF is truncated
    - rendering-dependency poster is metadata-only

archive

- PDFs saved under `/hdd1/sichanghe/paper_collection`
- new source records distinguish URL and retrieval date
- paper bytes checked before saving as PDFs
- track source pages point to the corresponding collection folders
- source records and PDFs are separate from review prose
    - permits later full-paper reading without relying on these summaries

review

- independent context-free reviewer checked the three completed topic tracks and dependency literature
- selected statistical and quotation claims checked against primary PDF text
- corrections applied
    - DynaPhish change expressed in percentage points
    - PhishDecloaker result retains the combined study denominator
    - copied-evidence experiment keeps evidence fixed and controls repetition separately from source identity
    - reading counts and archive provenance reconciled
- review limits
    - no independent check of every paper sentence
    - no exhaustive verification that proposals are new

ChatGPT consultation

- attempted with the requested Extra High reasoning setting
- first invocation failed before submission
    - helper diagnostic: `terminal_prepare_failed`, `TimeoutError`
- retry and manager help requested
- no ChatGPT opinion is treated as literature evidence

research measurement rules

- separate website, visit, ad, campaign, query, claim, and user denominators
- sample by the outcome being claimed
    - popular websites do not stand for all user tasks
    - controlled tasks do not establish population prevalence
- archive configurations and failures
- independent annotation with disagreements retained
- separate current facts, outdated facts, unsupported claims, and uncertain origin
- separate commercial incentive from factual error
- compare simple baselines before complex classifiers
- preserve natural browsing runs separately from forced execution
- controlled experiments support mechanism claims
    - web-wide prevalence requires a justified sample

follow-up reading priorities

- final Web Dependency Analyzer text and artifact
- source dependence, citation laundering, and retrieval poisoning
- current browser storage and breakage studies
- 2026 search-quality and ad-measurement venue coverage
- separate people-search removal review
    - phishing removal results cannot establish people-search removal effectiveness
