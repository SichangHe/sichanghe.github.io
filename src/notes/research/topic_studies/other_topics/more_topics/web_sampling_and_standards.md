web sampling and standards
(authored by agents unless marked 🧑)

takeaway
- a search result is evidence about what the service returned
  - it is not automatically a representative sample of everything matching the query
- a standard states intended behavior
  - an implementation and its tests establish narrower evidence about actual behavior
- agent recommendation: start with a reproducible audit of conclusions under changing search results
  - browser media conformance is a separate, bounded alternative
  - both have substantial prior work; novelty remains unconfirmed
- scope: research sampling through YouTube search and HTML standards versus implementation
  - [web trust](../web_trust/) covers content provenance and abuse
  - [browser GPU performance](browser_gpu_performance.md) covers graphics performance
  - no claim that the whole web-measurement or standards literature is surveyed

human starting points 🧑
- [reading notes](../../../../reading_notes/index.md): “On YouTube Search API Use in Research, Alexandros Efstratiou”
  - “people split time period for search to circumvent 500-video result limit”
  - “result delta small ⇒ time period split work poorly”
- [reading notes](../../../../reading_notes/index.md): “HTML5, Web Technology class, Marco Papa”
  - “WebSQL dropped at version 5 bc nobody implemented it”
  - the notes also attribute HTML adoption to built-in media and contain a WebM patent/payment claim
- these are records of talks and classes
  - the source checks below distinguish those records from independently established facts

terms
- API: an interface through which software requests data or actions from a service
- sampling frame: the set of items that a collection method can reach
- coverage: which relevant items are included
- selection bias: included items differ systematically from the intended population
- conformance: following the requirements of a specification
- interoperability: different implementations work together as intended
- a codec encodes and decodes audio or video
  - a container packages encoded streams and associated information
  - support for an HTML element does not guarantee support for every codec and container

YouTube search: splitting time does not establish completeness
- Alexandros Efstratiou, [On YouTube Search API Use in Research, IMC 2025, version 2](https://arxiv.org/html/2506.04422v2), methods, results, and appendices
  - author: “video omission or inclusion is mostly conducted in a ‘rolling window’ fashion”
  - six event-related topics, each with a historical 28-day upload window
  - repeats collections from February 9 through April 30, 2025
    - sixteen snapshots; April 5 collection missed
    - 4,032 hourly queries per snapshot before pagination
  - uses an API token rather than account authorization
  - requests reverse chronological ordering
    - ordering does not guarantee that all eligible videos are retrieved
  - tracks repeated appearances and separately checks video availability
  - predicts observed appearance frequency using video and channel metadata
    - 80/20 training/test split; test R² = 0.19
    - R² describes predictive fit, not corrected bias
    - popularity associations do not establish selection mechanisms
  - views and shorter duration predict more frequent returns here
    - the observed union still excludes videos never returned
  - authors use total-results metadata to discuss topic size
    - current documentation calls that field approximate
    - it cannot establish the matching population or recovered fraction
  - implication: repeated hourly collection can reveal instability
    - agreement across runs cannot prove completeness
    - six topics cannot establish platform-wide bias
- Bernhard Rieder, Adrian Padilla, and Oscar Coromina, [Forgetful by Design?, 2025 journal paper, author version 3](https://arxiv.org/pdf/2506.11727v3), §§3–4
  - authors: “ran searches for eleven queries weekly over the span of six months starting in April 2024”
  - uses one search per upload day, starting from October 15, 2023
  - mainly studies relevance ordering
    - date ordering supplies a later comparison
    - ranking settings are therefore a material difference from Efstratiou's design
  - topics span politics, health, and popular culture
    - chosen using the authors' issue expertise, not randomly sampled from all topics
  - checks query text in titles, descriptions, and tags
    - text matching tests one observable notion of relevance
    - absence of those words does not prove semantic irrelevance
  - studies temporal coverage and changes across weekly searches
    - includes qualitative inspection of the European Parliament election query
  - historical omission and unstable retrieval are already studied directly
    - another audit needs a narrower inference problem, collection change, or validated correction

random video sampling is a different question
- Ryan McGrady, Kevin Zheng, Rebecca Curran, Jason Baumgartner, and Ethan Zuckerman, [Dialing for Videos, 2023](https://journalqd.org/article/view/4066), sampling method and limitations
  - authors: “our random set only includes public videos”
  - generates candidate video identifiers and combines 32 candidates in one search using OR
  - alphabetical identifiers exploit case-insensitive search
    - one query can match many case-sensitive identifier variants
  - collection ran October 5–December 13, 2022 and stopped at 10,016 videos
    - used the internal InnerTube search interface
    - this is not the official Data API method evaluated by the two 2025 audits
  - authors acknowledge dependence on search returning matching identifiers
    - alphabetical candidates exclude identifiers containing digits or symbols in the first ten positions
    - treating this as representative requires assumptions about identifier assignment and retrieval
  - private and unlisted videos are outside its search-based frame
  - random-prefix sampling is discussed as an earlier alternative
    - prefix matching has its own selection assumptions
  - implication: platform-wide public-video sampling and keyword-topic completeness are separate targets
    - a broadly random sample may contain too few videos for a rare topic
    - neither method supplies access to the complete private platform database

current API documentation changes the replication contract
- [official search.list reference](https://developers.google.com/youtube/v3/docs/search/list), inspected October 7, 2026 UTC
  - quota text: “100 calls per day” and “1 unit in the Search Queries quota bucket”
  - these are the current documented terms
    - do not reuse the older papers' 100-unit accounting as today's general quota rule
    - record the actual project's granted quota and response errors in a replication
  - the documented 500-video cap applies to channelId plus type=video without the specified owner/developer/mine filters
    - this statement does not document a universal 500-result cap for every keyword query
    - older papers report or assume limits for their collection conditions
    - measure current pagination behavior instead of converting that historical observation into a universal contract
  - pageInfo.totalResults is an “approximation” with a maximum of one million
    - use pagination tokens to follow pages
    - do not use this number as a verified count of the matching population
  - specify query, upload-time bounds, ordering, requested resource type, safeSearch, language/region settings, pagination, collection time, and API version
    - distinguish an empty result from a failed request or exhausted quota
    - record returned resource kinds even when requesting only videos
    - separately count unexpected channels or playlists

candidate A: which conclusions survive search instability?
- hypothesis: a topic-level conclusion can change substantially even when the collection protocol is unchanged
- first reproduce one published collection on a small, fixed topic set
  - keep queries, ranking, time bounds, and pagination identical across repeats
  - preserve returned IDs, page tokens, errors, and metadata timestamps
    - exclude non-video resources from video-duration and channel-distribution comparisons
  - budget requests using the current quota contract
    - a published hourly snapshot exceeds the documented default daily allowance
    - use an explicitly granted larger quota or narrow the upload window
    - a narrowed window is a pilot rather than an exact replication
- define one conclusion before collecting data
  - example: the distribution of video duration or publishing channels among returned items
  - distinguish this observable claim from the corresponding unknown population claim
- compare single-run results, repeated-run unions, and alternate ranking/time-window designs
  - fix collection effort when comparing strategies
  - report overlap, conclusion variation, requests, and cost
- validation uses consenting uploaders' known public-video inventories where possible
  - controlled inventories can test retrieval for those videos and queries
  - inclusion in an uploader's inventory does not guarantee that YouTube considers a video relevant to a keyword
  - do not label a complete topic population from an observed union or approximate total-results count
- closest work already measures coverage, recency, and repeated-query instability
  - possible contribution: identifying a specific conclusion that reverses, then validating a collection or reporting correction
  - weighting by appearance frequency alone is insufficient
    - never-observed videos have unknown inclusion probabilities
- useful null: conclusion variation is small at equal collection effort
  - stop if the work only reproduces known instability without changing a meaningful inference

HTML is a living standard with a complicated history
- [WHATWG HTML introduction, history and syntax](https://html.spec.whatwg.org/multipage/introduction.html), inspected October 7, 2026 UTC
  - history describes W3C's XHTML work and the later development of HTML
  - exact historical description: “a reformulation of HTML4 in XML, known as XHTML 1.0”
  - XHTML 1.0 and XHTML 2 were different efforts
    - describing all XML work as one failed replacement loses that distinction
  - current HTML has HTML and XML serialization rules
    - a serialization is a concrete text format for representing a document
    - matching-looking markup need not be parsed identically under both formats
  - scope describes a “semantic-level markup language”
    - HTML describes document meaning and structure
    - CSS controls presentation through a separate language
    - default rendering rules and presentation-related compatibility behavior remain in HTML
    - separation is a design direction, not a claim that HTML has no rendering rules
- [2019 W3C–WHATWG agreement](https://www.w3.org/2019/04/WHATWG-W3C-MOU.html), cooperation and review-draft provisions
  - agreement: “Our Design Goal is that the W3C CR, PR, and REC, and the WHATWG Review Draft are the same document”
  - records cooperation around WHATWG HTML and DOM review drafts
    - DOM is the program-accessible document structure
    - CR, PR, and REC are stages in W3C's standards process
  - a dated HTML5 edition should not be treated as the full current browser contract
    - pin the relevant living-standard section or commit in an experiment
- [HTML media specification](https://html.spec.whatwg.org/multipage/media.html), video/audio elements, media loading, and canPlayType
  - media API includes “canPlayType”
  - defines browser-facing playback and loading behavior
    - separates resource selection, loading states, playback, seeking, and errors
  - built-in media removes the need for a plugin for supported resources
    - this feature alone does not establish the cause of HTML adoption or Flash's decline
  - element support, codec support, network delivery, and playback policy remain different conditions
  - the class note's WebM patent/payment claim is not verified by these technical standards
    - no infringement finding, payment recipient, or legal conclusion is asserted here

Web SQL stopped because independent implementations were missing
- [W3C Web SQL Database, November 18, 2010, status](https://www.w3.org/TR/webdatabase/)
  - W3C: “all interested implementors have used the same SQL backend (Sqlite)”
  - document says standardization needed multiple independent implementations
  - this directly contradicts the class note's explanation that nobody implemented it
    - several implementations sharing one database backend differ from independent implementations
  - the document points to Web Storage and Indexed Database work
    - this historical status is not a claim about which browsers currently expose Web SQL
  - implication: implementation count and implementation independence are distinct evidence
    - agreement among browsers can reflect shared code rather than independent confirmation

tests make the standards question experimentally accessible
- [web-platform-tests documentation](https://web-platform-tests.org/)
  - project: “a cross-browser test suite for the Web-platform stack”
  - common tests compare implementations against specified behavior
  - [WPT dashboard](https://wpt.fyi/about) displays results from multiple implementations
    - a pass applies to the tested behavior, version, platform, and configuration
    - it does not prove every real page interoperates
  - existing tests and issue discussions are required baselines
    - writing another test runner is not a research contribution

candidate B: explain media failures at the boundary between standard and deployment
- hypothesis: distinguishing unsupported encoding, playback-policy restrictions, and loading failure reduces incorrect cross-browser diagnoses
- initial subject: a small media-loading and playback-state subset
  - inspect corresponding WPT tests and current specification clauses first
  - use locally hosted, known-valid media with declared codec/container combinations
  - record browser version, operating system, codec availability, and user-activation conditions
  - vary one condition at a time
    - encoding, response headers, interruption of delivery, and user activation
- compare feature detection, existing WPT tests, and a trace recording media states and errors
  - distinguish a standards violation from an allowed implementation choice
  - independently verify the media resource before blaming its decoder
- measure reproducible disagreements, diagnosis accuracy, unsupported cases, and test maintenance effort
  - validate suspected violations with the relevant specification and maintainers' explanations
  - test another browser version after freezing the diagnosis rules
- closest work: WPT already tests conformance and interoperability
  - possible contribution needs a consequential missing interaction and a reusable explanation or test
  - shared engine or decoder code is a competing explanation for agreement
- useful null: existing tests and ordinary error reporting already explain the failures
  - then contribute a missing regression test if appropriate and abandon the broader research claim

reading limits and next steps
- checked October 7, 2026 UTC
- selected full methods and limits read for Efstratiou, Forgetful by Design version 3, and Dialing for Videos
  - no collection scripts executed and no sampling mechanism independently reproduced
- primary standard sections read for HTML history/media, the 2019 agreement, and Web SQL status
  - WPT documentation and dashboard description read
  - no browser test suite executed
- before choosing a project
  - inspect the papers' artifacts and recent follow-up sampling studies
  - verify current API pagination and granted quota with a small documented pilot
  - inspect relevant WPT coverage and open issues before proposing media tests
  - reject generic repeated-query audits or conformance runners as novelty claims
