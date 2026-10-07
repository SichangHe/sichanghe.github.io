ad measurement research proposals
(authored by agents unless marked 🧑)

recommended first project: does extracting knowledge erase advertising labels?

- proposed question: when a tool turns a page into usable information, does it preserve which claims were paid promotion?
  - recommendation motivated by [affiliate disclosures, accessibility, and native-ad measurements](literature.md)
  - closest recent work: [Ad Insertion and Evaluating and Pricing Advertisements](recent.md)
    - they study insertion, fit, and commercial scoring
    - proposed distinction: trace loss of pre-existing sponsorship evidence through extraction and later answers
    - [children's-site measurement](recent.md) supplies a disclosure extraction baseline
  - novelty is a hypothesis
    - this review did not establish the absence of a prior equivalent benchmark
- distinguish two failures
  - an extractor retains an ad's claim but drops its disclosure
  - an answer cites or repeats the commercial claim without identifying the sponsorship
- initial sample: 100 pages with 200 independently labeled commercial passages
  - include product reviews with affiliate links, sponsored articles, and native recommendations
  - include 100 matched ordinary passages
  - keep publisher, advertiser, disclosure, claim, destination, timestamp, and screenshot together
  - use two annotators and preserve disagreements
    - say unknown when payment cannot be established
    - do not label every favorable review as an ad
- compare representations of the same observation
  - rendered page
  - HTML
  - accessibility tree
  - Mozilla Readability output
  - plain text conversion
  - browser-based agent observation
  - an answer to a fixed question about the page
- primary measurements
  - fraction of known commercial claims retained
  - fraction of retained commercial claims still linked to their disclosure
  - fraction of ordinary content incorrectly labeled commercial
  - fraction of answers treating a commercial claim as independent evidence
  - extraction latency and storage cost
- controls
  - hold page content fixed with saved pages
  - place the disclosure before, after, and outside the extracted article
  - vary wording and visual placement independently
  - compare genuine disclosure removal with unrelated text removal
  - separate article-extraction failure from model-answer failure
- proposed system contribution: attach the disclosure to the claim before extraction
  - produce a small record with text, visible location, sponsor, and evidence for the label
  - preserve unknown status
  - allow an answer to cite the original labeled passage
  - evaluate information loss and incorrect labels against existing extraction
- conditions for continuing
  - a pilot finds repeated failures across multiple tools and publishers
  - manual ground truth can distinguish paid content from ordinary recommendations
  - the proposed attachment reduces lost labels without deleting useful evidence
- conditions for abandoning or narrowing
  - almost all observed errors are one extractor bug
  - payment cannot be established for most cases
  - ordinary extraction improvements solve the problem equally well
- estimated first milestone
  - one week for collection and labeling
  - one week for paired extraction tests and a failure taxonomy
  - estimate assumes ordinary pages can be archived and replayed

second project: how much advertising do filter-based measurements miss?

- proposed question: how much do measurements change when independently annotated visible ads replace filter labels?
- rationale
  - [AdGraph and PERCIVAL](literature.md) report agreement with filter-derived labels
  - [Bad News](literature.md) shows detected slots can be empty or occluded
- pilot: 200 page visits across 50 publishers
  - manually label the entire rendered page after scrolling
  - preserve ad slots, actual ads, and embedded sponsorships as separate categories
  - compare EasyList selectors, request filters, image detection, and combined detection
- measure
  - precision and recall by ad format
  - unseen ads per page visit
  - duplicate counting in nested frames and recommendation collections
  - fraction of blank slots incorrectly counted as ads
  - change in the estimated prevalence of deceptive claims
- evaluate generalization
  - split training and evaluation by publisher and time
  - repeat on a second language and mobile layout if the pilot succeeds
- contribution required
  - demonstrate a material change in a published type of conclusion
  - a modest classifier accuracy gain alone is weak motivation
- limitation
  - manual labeling still cannot reveal undisclosed payment
  - agreement between annotators is useful evidence, not complete truth

third project: compare ad claims seen by crawlers, people, and answering systems

- proposed question: do these three observers encounter different commercial explanations of security?
- start with VPN claims
  - [two existing VPN studies](literature.md) supply claim categories and exposure methods
  - distinguish brand promotion, real capability, exaggerated threat, and overstated protection
- initial experiment
  - fixed questions about common VPN use cases
  - neutral crawler, browser with a controlled history, and answering system with web retrieval
  - log visited sources and answers where the product permits this
  - compare exposure and repetition of the same claim
- outcome
  - identify which claim types survive retrieval into answers
  - quantify attribution to sponsors and primary technical evidence
- causal test
  - use owned pages with factual baseline text
  - add a clearly labeled sponsorship without changing the underlying fact
  - randomly vary placement and disclosure
  - evaluate whether the promotion changes the answer
- limitation
  - controlled pages demonstrate a mechanism
    - they cannot establish population prevalence
  - hosted answer systems may expose incomplete source traces
  - beliefs require a separate consenting user study
    - answer errors do not establish changed human beliefs
- abandonment condition
  - source tracing is too incomplete to attribute the observed difference
  - restrict the experiment to an instrumented retrieval system

fourth project: measure the whole route from native ad to questionable claim

- proposed question: where does a legitimate-looking recommendation become misleading?
- build on [Bad News and social-engineering download measurement](literature.md)
- pilot collection
  - publisher page, ad image/text, redirect sequence, final page, requested action
  - record when a site changes its story between the ad and destination
  - cluster repeated campaigns without assuming shared domains imply shared ownership
- proposed contribution
  - identify failure points omitted by ad-image classifiers
  - distinguish a bad product claim from a destination that requests credentials or software installation
- measurement safeguards built into the method
  - use limited repeated observations
  - avoid purchases, account creation, and execution of downloaded files
  - retain the difference between unavailable destinations and benign destinations
- limitation
  - the same ad can deliver different destinations by location or browsing history
  - automated clicks can affect billing
  - a research protocol must justify any click collection
- continuation condition
  - destination context changes enough labels to alter conclusions about harmful content

cross-project evaluation rules

- recommendations, not claims established by the literature
  - publish the sampling frame and failed visits
  - report visits, visible ads, unique creatives, campaigns, and people separately
  - freeze filter versions and record browser settings
  - record consent dialogs, location, viewport, and time
  - preserve evidence needed to recheck each label
  - separate known sponsorship from suspected commercial intent
  - separate misinformation from dislike and malware
  - state which comparison is causal and which is observational
