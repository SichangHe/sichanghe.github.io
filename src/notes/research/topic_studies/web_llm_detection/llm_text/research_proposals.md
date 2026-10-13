research proposals
(authored by agents unless marked 🧑)

everything here is my opinion; nothing was run

- ranked by how well I think each fits a web measurement person who already has DeGenTWeb
- "nobody did this" means I did not find it in this review, not that it does not exist

what DeGenTWeb already has, so I do not propose it

- 🧑 read from the human's DeGenTWeb notes
- filtering out non-article pages and repeated text
- judging a site from 15 to 20 page scores: 9 deciles of Binoculars scores into a linear SVM
- a second detector (Fast-DetectGPT) and a six-score mix, which gave no gain
- a literature comparison of Pangram, RAIDAR, L2D, DNA-GPT
    - Pangram was put off because a full run was estimated at about $945 to $1,181
- details in [on web pages](on_web_pages.md)

1: what do AI detector extensions send home?

- the idea: install the detector extensions, browse, and record what leaves the browser
- why I rank it first
    - it is plain web measurement, no user study and no new detector
    - nobody did it: I found no traffic measurement of GPTZero, Pangram, Copyleaks, Originality, Hive, Winston or Sapling
    - there is something to find
        - every store listing I opened declares "website content" as collected data
        - Pangram's own page says it stores scanned feed text by default
        - open question from the review: does auto-scan send every post in a feed, including private ones on LinkedIn, X or Gmail?
- first experiment
    - about 10 extensions, a fixed set of pages: news, a logged-in feed, webmail, a bank-like page with fake data
    - capture requests through a proxy; diff what was sent against what was on screen
    - compare with each store listing and privacy policy
- what would kill it
    - if all of them send only text the user selects, it is a short report, not a paper
- details in [browser extensions](browser_extensions.md)

2: does the site verdict survive 2026 writing?

- the idea: attack DeGenTWeb's own classifier with the three things its notes list as untested
    - humanizer tools
    - newer models
        - the notes say newer models score less like ChatGPT-3.5
        - one 2026 benchmark reports "modern LLM outputs showing lower perplexity than human text", [Detecting the Machine](https://arxiv.org/abs/2603.17522)
    - human text lightly polished by AI
        - APT-Eval: "detectors frequently flag even minimally polished text as AI-generated", [Saha et al.](https://arxiv.org/abs/2502.15666)
        - so a human site that runs Grammarly may get called an AI site
- why it is worth doing
    - published attack numbers are per page; a site verdict pools 15 to 20 pages and may hold up much better, or not
    - no paper I found reports attack results at site level
- first experiment
    - take the 132 baseline sites
    - rewrite the AI sites with 2 or 3 humanizers; regenerate some with current models; polish the human sites with a grammar tool
    - rerun the frozen classifier; report how many site verdicts flip
- a cheap second detector
    - Pew scored 490,000 pages with Pangram's open model, editlens_Llama-3.2-3B, for free
    - I have not checked how well it runs or how close it is to paid Pangram
    - Jabarian and Imas report paid Pangram stays "robust across models, threshold rules, ultra-short passages, "stubs" (≤ 50 words) and 'humanizer' tools"
- what would kill it
    - if no verdict flips, it is one robustness paragraph in the DeGenTWeb paper
- details in [attacks and paraphrase](attacks_and_paraphrase.md), [short, mixed, and code text](short_mixed_code.md)

3: check the crowd's AI site list against a detector

- the idea: score the hand-picked AI blocklists with DeGenTWeb
- why
    - the uBlockOrigin HUGE AI Blocklist has 1000+ hand-picked sites and 5.8k GitHub stars
        - its README states no method for choosing sites and no error rate
        - it targets image search, so many sites may have little text
    - the human's notes ask why a voting extension for AI sites does not exist; small ones now do, e.g. SkipSlop with 44 users
    - two things come out
        - how often the crowd and the detector agree, and who is wrong when they do not
        - a free pile of human-labeled AI sites that are not from Wix-style builders, which the DeGenTWeb baseline lacks
- first experiment
    - crawl the listed sites that have articles; run the frozen classifier; hand-check the disagreements
- what would kill it
    - if most listed sites are image galleries with no prose
- a follow-up I like less: ship DeGenTWeb verdicts as a filter list
    - no page text leaves the browser and it costs nothing per page
    - risk: labeling some sites makes unlabeled ones look clean
        - shown for fake-news tags (Pennycook 2020) and, smaller, for AI images (Pawelczyk 2026)

4: known-human web pages from after 2022

- the problem: nobody can measure false positives on today's human web writing
    - Dolezal et al. and Pew both check only on pre-ChatGPT pages
    - old pages do not write like new pages, so that false positive rate may be wrong today
    - the worked example in [on web pages](on_web_pages.md) shows a 1% false positive rate can make half the flags wrong
- the idea: build a set of post-2022 pages whose human authorship has outside evidence
    - I do not know a good source; candidates
        - blogs kept in public git repositories, where history shows small edits over days
        - Wikipedia revisions built up by many small edits
        - writers who state they do not use AI, checked by a sample interview
    - each has holes: a person can paste AI text in small pieces
- why it matters: every web prevalence number, DeGenTWeb's included, rests on this
- what would kill it
    - if no source gives enough sites, about 3,000 independent ones to support "below 0.1%"

5: can people tell an AI website when they see many pages?

- the gap: every human study shows one passage at a time; none has people judge a whole site
    - one passage: ordinary readers are near a coin flip
    - but 5 frequent ChatGPT users got 299 of 300 articles right by majority vote (Russell et al.)
- the idea: show readers 1, 5, or 15 pages of the same site and ask if the site is AI-written
    - same pages DeGenTWeb scores, so people and classifier are compared on the same input
- why
    - if skilled readers agree with the classifier, they are a second source of labels for sites with no known origin
    - the human already hand-inspects sites; this makes it a measured step
- cost: a user study, so ethics review and paid participants
- details in [human detection](human_detection.md)

what I would not do

- a new detector, or another mix of scores
    - dozens exist; DeGenTWeb's own six-score test found no gain; paid tools lead in the independent tests I opened
- telling AI drafting from AI editing from the final text alone
    - the same final text can come from different histories
    - CoAuthor, RACE and Pangram's EditLens already work on it
- another count of how much of the web is AI
    - Pew, Dolezal et al., Russell et al. and Graphite published in 2025 and 2026
- testing whether a browser warning helps readers
    - label studies are many already; see [browser extensions](browser_extensions.md)
    - it needs user-study skills more than systems skills

ChatGPT's opinion

- an Extra High consultation on an earlier set of ideas is in [ChatGPT consultation](chatgpt_consultation.md)
