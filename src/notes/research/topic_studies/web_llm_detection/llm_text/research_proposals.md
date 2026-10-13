research proposals
(authored by agents unless marked 🧑)

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

1: when does judging 15 to 20 pages together actually protect the verdict?

- the humanizer test is already the human's plan; the question above makes it a paper of its own
- why first
    - the 99% result holds only if it survives text unlike the baseline, which is mostly from AI site builders
    - pooling pages helps only when page errors are independent
        - a new model or a humanizer shifts every page of a site the same way, so pooling may not help at all
    - ChatGPT's point, which I accept: either answer is a result
- what to measure, with the classifier unchanged
    - how many of a site's pages must be rewritten to flip its verdict
    - sites that are 0%, 10%, 25%, 50%, 75%, 100% AI-written
    - sites made by a builder or model the classifier never saw
    - how alike the page scores inside one site are
- no paper I found reports attack results at site level; published numbers are per page
- add newer models as a second arm
    - the notes say NLP researchers "hinted worse Binocular results from new models are due to model being less similar to ChatGPT-3.5"
    - one 2026 benchmark agrees: "modern LLM outputs showing lower perplexity than human text"
        - [Detecting the Machine](https://arxiv.org/abs/2603.17522), arXiv, 2026
- AI-polished human text looks like a small risk here
    - APT-Eval says detectors "frequently flag even minimally polished text as AI-generated"
    - but the human's notes on that paper record Binoculars under 10% false positives on text polished by GPT-4o or DeepSeek-V3
    - untested: whether 10% flagged pages can flip a site verdict
    - the other direction is the bigger hole: Binoculars caught 93.5% of direct LLM text but only 15.1% of human text that an LLM rewrote, at 1% false positives
        - [ARB](https://arxiv.org/abs/2607.29539), Perrone and Romano, arXiv, 2026
    - so first decide what counts: is a human article rewritten by an LLM an AI page?
- closest work, found by ChatGPT and checked by me on arXiv
    - [Hitting a Moving Target](https://arxiv.org/abs/2606.25152), Ren et al., arXiv, 2026
        - names the same three shifts: "adversarial humanization, new LLMs being released, and temporal drift in human writing"
        - "the commercial model Pangram detects just 24.1% of our adversarial AI-generated text"
        - it works on single texts, not sites
- a cheap second detector
    - Pew scored 490,000 pages with Pangram's open model, named editlens_Llama-3.2-3B
    - Pew says it and paid Pangram 3.3 "agree in 96% of cases, with a Cohen's kappa value of 0.61", so it is no stand-in for the paid one
    - spend Pangram money on a small hard subset, not the whole corpus
    - paid Pangram held up against humanizers in the one independent test I opened, Jabarian and Imas
        - quoted in [attacks and paraphrase](attacks_and_paraphrase.md)
- details in [attacks and paraphrase](attacks_and_paraphrase.md), [short, mixed, and code text](short_mixed_code.md)

2: what do AI detector extensions send home?

- the idea: install the detector extensions, browse, and record what leaves the browser
- why
    - it is plain web measurement: no user study, no new detector
    - nobody did it for detector extensions
        - I found no traffic measurement of the GPTZero, Pangram, Copyleaks, Originality, Hive, Winston or Sapling extensions
    - there is likely something to find
        - every store listing I opened declares "website content" as collected data
        - Pangram's own page says it stores scanned feed text by default
        - unknown: does auto-scan send every post in a feed, including private ones on LinkedIn, X or Gmail?
    - the method exists, so the new part is only this group of extensions and what turns up
        - Arcanum (USENIX Security 2024) found "hundreds of extensions automatically extracting user content from within web pages"
        - Vekaria et al. (USENIX Security 2025) audited nine AI assistant extensions by their traffic
        - both are in [browser extensions](browser_extensions.md)
- first experiment
    - all detector extensions in the stores, not a sample of 10
    - plant unique marker strings in visible text, hidden text, form fields, an email body, a private feed
    - record which markers leave the browser, and whether the user asked for a scan or it happened by itself
    - sending text the user chose to scan is the product working; sending the rest is the finding
- what would kill it
    - if all of them send only text the user selects, it is a short report, not a paper
- details in [browser extensions](browser_extensions.md)

3: where to get known-human web pages from after 2022

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
    - ChatGPT's objection, which I accept: none of these proves human authorship, and each covers one kind of site
        - stronger but slower: recruit writers, agree on allowed tools, and record the writing as it happens
        - probably better as the human test set inside proposal 1 than as its own project
- size needed
    - zero errors in N independent samples only shows the rate is below about 3/N
    - pages of one site are not independent, so "below 0.1%" needs about 3,000 sites, not pages
- what would kill it
    - if no source gives that many sites

4: can people tell an AI website when they see many pages?

- the gap: every human study shows one passage at a time; none has people judge a whole site
    - one passage: ordinary readers are near a coin flip
    - but 5 frequent ChatGPT users got 299 of 300 articles right by majority vote (Russell et al.)
- the idea: show readers 1, 5, or 15 pages of the same site and ask if the site is AI-written
    - the same pages DeGenTWeb scores, so people and classifier see the same input
- why
    - if skilled readers agree with the classifier, they are a second source of labels for sites of unknown origin
    - the human already hand-inspects sites; this makes it a measured step
- two traps ChatGPT pointed out
    - 15 pages hold 15 times the words of 1 page, so add a condition with equal total text
    - show extracted text, not the rendered site, or readers judge the theme and ads
- cost: a user study, so ethics review and paid participants
- details in [human detection](human_detection.md)

5: use the crowd's AI site list as a source of test sites

- the idea: run DeGenTWeb on the sites that people hand-picked as AI
- ChatGPT said to drop this as a paper, and I agree
    - the list is for image search, so being listed does not mean the site's text is AI-written
    - agreement between list and detector would not measure accuracy of either
    - still useful as a pile of candidate sites to hand-check
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

three more ideas from ChatGPT, with my check against the DeGenTWeb notes

- watch single sites switch from human to AI writing, and compare each site with its own past
    - the human already works on this: the DeGenTWeb notes have a "Temporal Transition v2" plan
    - ChatGPT adds what to compare before and after: publishing rate, topic spread, article length, links, authors
- let the crawler decide when it has seen enough pages of a site
    - easy sites may need 3 to 5 pages; unclear ones 30, or no verdict
    - the notes already say 15 pages are enough and note "idea: sample unsure, crawl more"
    - new part: a stopping rule, and the cost saved in pages fetched and GPU time
- check whether the detectors themselves change over time
    - send the same fixed texts to commercial detectors every month for a year and count verdicts that flip
    - a count of AI on the web over years means little if the ruler changed halfway; Pangram 4 replaced Pangram 3.3 in 2026
    - neither ChatGPT nor I found a paper doing this; I like it as a cheap side project

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
