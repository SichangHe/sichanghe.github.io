measuring what a user can actually encounter
(authored by agents unless marked 🧑)

scope
- recommendations below are agent proposals
- supporting observations and exact source quotes appear in [literature](literature.md)
- phishing means impersonation used to obtain sensitive information
- scam means deception intended to obtain money or another valuable resource
- spam means unwanted or manipulative distribution
- these labels overlap but are not interchangeable

keep the whole path
- record lure → platform → search → redirect → landing page → form or payment request
- preserve screenshots, HTML, redirects, request destinations, timestamps, and browser state
- one URL can show different pages over time or to different visitors
- an error page, CAPTCHA, or missing response is an observation failure
  - it is not a benign label
- a fake service can steal money without copying a known brand
  - brand-recognition accuracy is not scam-detection accuracy

sample beyond known bad lists
- combine public reports, certificate candidates, builder-specific pages, search results, and social profiles
- record the discovery source for every page
- keep an independently sampled ordinary-page group
  - include uncommon brands and shared-hosting tenants
- estimate precision at the expected deployment prevalence
  - balanced test sets can hide a large false-alarm burden
- separate campaign prevalence from URL prevalence
  - one campaign may generate thousands of URLs
- avoid claiming web-wide rates from feed-selected or language-selected samples

measure visibility before detector quality
- paired visits should vary one factor at a time
  - desktop versus mobile
  - direct navigation versus the real referral path
  - initial visit versus later visits
  - static fetch versus rendered and bounded interactive visit
- quantify extra harmful pages revealed per extra request, browser-minute, and dollar
- record unreachable pages in the denominator
- archive a replayable local version when permitted
  - replay can reproduce captured content, not unknown server decisions
- separate content change from failed collection
  - log response status, network failure, page state, and challenge state

evaluate time honestly
- distinguish first observation, first confirmed malicious content, first report, warning, and removal
- first observation is an upper bound on launch time
- polling means event time lies between two checks
- sites alive at the final check have an unknown later removal time
- show response-time distributions alongside coverage
  - median time among detected pages omits never-detected pages
- separate natural detection from detection after research reports
- count residual exposure after warnings
  - warning distribution, cache updates, browser settings, and alternate URLs can matter

prevent easy test leakage
- group train and test by campaign, kit family, brand, and time
- report each split separately
- freeze identity references and search evidence for reproducibility
- evaluate unfamiliar brands and changed templates
- check ordinary pages containing brand logos
  - news, reviews, resellers, hosted forms, and authorized login services
- manually validate stratified samples of every major result category
- publish disagreement resolution and unresolved cases

measure protection as separate outcomes
- page classifier warning
- browser warning
- platform link suppression
- host page removal
- account or payment protection
- each outcome needs its own timestamp and evidence
- detector recall does not directly establish fewer victims

collect without becoming a victim or an attacker
- use isolated browsers and synthetic identifiers
- prohibit real credentials, purchases, and account takeover in the initial public-data pilot
- do not publish reusable evasion instructions or live victim identifiers
- obtain review and provider coordination before experiments that impersonate services or stress reporting systems
- publish redacted page states and aggregate effects
  - retain restricted originals only where needed for verification
