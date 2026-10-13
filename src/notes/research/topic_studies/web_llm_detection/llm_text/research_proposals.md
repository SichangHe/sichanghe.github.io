research proposals
(authored by agents unless marked 🧑)

everything here is my opinion; nothing was run

- ranked by how well I think each fits a web measurement person who already has DeGenTWeb
- "nobody did this" means I did not find it in this review, not that it does not exist

what DeGenTWeb already has or plans, so I do not propose it as new

- summarized from the human's DeGenTWeb notes
- done
    - filtering out non-article pages and repeated text
    - judging a site from 15 to 20 pages
        - the 10%, 20%, … 90% marks of the pages' Binoculars scores go into a simple linear classifier
    - a second detector, Fast-DetectGPT, does about as well
    - a mix of six scores tied with Binoculars alone on 20 test sites; the notes mark that test closed
    - a literature comparison of Pangram, RAIDAR, L2D, DNA-GPT
        - Pangram was put off: a full run was estimated at about $945 to $1,181
- planned in the notes
    - "measure impact of "humanizer" tools on Binoculars scores"
    - "broaden beyond Wix-style generators", with a written protocol for a larger baseline
    - "A third builder and a newer human cohort also remain deferred"
        - because "Current hosting alone does not establish human authorship"
- details in [on web pages](on_web_pages.md)

1: what do AI detector extensions send home?

- the idea: install the detector extensions, browse, and record what leaves the browser
- why I rank it first
    - it is plain web measurement: no user study, no new detector
    - nobody did it
        - I found no traffic measurement of the GPTZero, Pangram, Copyleaks, Originality, Hive, Winston or Sapling extensions
    - there is likely something to find
        - every store listing I opened declares "website content" as collected data
        - Pangram's own page says it stores scanned feed text by default
        - unknown: does auto-scan send every post in a feed, including private ones on LinkedIn, X or Gmail?
- first experiment
    - about 10 extensions and a fixed set of pages: news, a logged-in feed, webmail, a bank-like page with fake data
    - capture requests through a proxy
    - compare what was sent with what was on screen, and with each store listing and privacy policy
- what would kill it
    - if all of them send only text the user selects, it is a short report, not a paper
- details in [browser extensions](browser_extensions.md)

2: check the crowd's AI site list against the detector

- the idea: run DeGenTWeb on the sites that people hand-picked as AI
- why
    - the uBlockOrigin HUGE AI Blocklist has 1000+ hand-picked sites and 5.8k GitHub stars
        - its README states no method for choosing sites and no error rate
        - it targets image search, so many sites may have little text
    - the human's notes list why a voting extension for AI sites does not exist: privacy, cost, abuse, subjectivity
        - small ones now do exist, e.g. SkipSlop with 44 users
    - it shows how often the crowd and the detector agree, and who is wrong when they do not
    - it may add human-labeled AI sites to the baseline that no site builder made
- first experiment
    - crawl the listed sites that have articles
    - run the existing classifier unchanged
    - hand-check the disagreements
- what would kill it
    - if most listed sites are image galleries with no prose
- a follow-up I like less: ship DeGenTWeb verdicts as a filter list
    - no page text leaves the browser, and it costs nothing per page
    - risk: labeling some sites makes unlabeled ones look clean
        - shown for fake-news tags (Pennycook 2020) and, smaller, for AI images (Pawelczyk 2026)

3: what the literature adds to the planned humanizer test

- the humanizer test is already the human's plan; three things from this review would sharpen it
- report site verdicts, not page scores
    - published attack numbers are per page
    - a site verdict pools 15 to 20 pages, so it may survive attacks that fool single pages
    - no paper I found reports attack results at site level
- add newer models as a second arm
    - the notes say NLP researchers "hinted worse Binocular results from new models are due to model being less similar to ChatGPT-3.5"
    - one 2026 benchmark agrees: "modern LLM outputs showing lower perplexity than human text"
        - [Detecting the Machine](https://arxiv.org/abs/2603.17522), arXiv, 2026
- AI-polished human text looks like a small risk here
    - APT-Eval says detectors "frequently flag even minimally polished text as AI-generated"
    - but the human's notes on that paper record Binoculars under 10% false positives on text polished by GPT-4o or DeepSeek-V3
    - untested: whether 10% flagged pages can flip a site verdict
- a cheap second detector
    - Pew scored 490,000 pages with Pangram's open model, named editlens_Llama-3.2-3B
    - I have not checked what it costs to run or how close it is to paid Pangram
    - paid Pangram held up against humanizers in the one independent test I opened, Jabarian and Imas
        - quoted in [attacks and paraphrase](attacks_and_paraphrase.md)
- details in [attacks and paraphrase](attacks_and_paraphrase.md), [short, mixed, and code text](short_mixed_code.md)

4: where to get known-human web pages from after 2022

- the human already named this gap; I only add that the published web studies have it too
    - Pew checks its detector on pre-ChatGPT pages only
    - neither Pew nor Dolezal et al. has known-human pages from after 2022
    - old pages do not write like new pages, so the false positive rate may be wrong today
    - a 1% false positive rate can make half the flags wrong; worked example in [on web pages](on_web_pages.md)
- the open part is the source of proof; candidates, each with holes
    - blogs kept in public git repositories, where history shows small edits over days
    - Wikipedia articles built up by many small edits
    - writers who state they do not use AI, checked by interviewing a sample
    - hole in all three: a person can paste AI text in small pieces
- size needed
    - zero errors in N independent samples only shows the rate is below about 3/N
    - pages of one site are not independent, so "below 0.1%" needs about 3,000 sites, not pages
- what would kill it
    - if no source gives that many sites

5: can people tell an AI website when they see many pages?

- the gap: every human study shows one passage at a time; none has people judge a whole site
    - one passage: ordinary readers are near a coin flip
    - but 5 frequent ChatGPT users got 299 of 300 articles right by majority vote (Russell et al.)
- the idea: show readers 1, 5, or 15 pages of the same site and ask if the site is AI-written
    - the same pages DeGenTWeb scores, so people and classifier see the same input
- why
    - if skilled readers agree with the classifier, they are a second source of labels for sites of unknown origin
    - the human already hand-inspects sites; this makes it a measured step
- cost: a user study, so ethics review and paid participants
- details in [human detection](human_detection.md)

what I would not do

- a new detector, or another mix of scores
    - this review alone lists over 50 detectors
    - paid tools lead in the independent tests I opened
- telling AI drafting from AI editing from the final text alone
    - the same final text can come from different histories
    - Pangram's EditLens already predicts "the amount of AI editing present within a text"
- another count of how much of the web is AI
    - Pew and Dolezal et al. published in 2026; more in [llm_provenance](../llm_provenance/index.md)
- testing whether a browser warning helps readers
    - many label studies exist; see [browser extensions](browser_extensions.md)
    - it needs user-study skills more than systems skills
