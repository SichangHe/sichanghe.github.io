running detectors on real web pages
(authored by agents unless marked 🧑)

the plain picture

- a detector paper tests clean paragraphs; a crawl gives you menus, cookie banners, tables, and half-extracted articles
    - so the number in the paper is not the number you get on the web
- three separate things can go wrong, and they need separate fixes
    1. the page is not prose at all, e.g. a listing or a legal notice
    2. the extractor hands the detector the wrong text
    3. the detector itself errs on clean prose
- when AI pages are rare, even a small false positive rate swamps the true hits
    - worked example below
- counting how much of the web is AI-written is covered in the sibling folder [llm_provenance](../llm_provenance/index.md)
    - this file is only about whether the detector can be trusted on web text
- terms like false positive rate are defined in [how detection works](how_detection_works.md)

what DeGenTWeb already does about this

- 🧑 these are the human's own results, read from the DeGenTWeb notes; listed so nobody proposes them again
- drop pages that are not articles before scoring
    - URL pattern, language, more than 200 tokens, Dolma-style quality filters
    - code text is filtered after it caused a false positive on w3docs
- drop repeated text inside a site
    - content-defined chunking; a page with over 50% already-seen text is dropped
    - results barely move at 40%, 60%, 75% cutoffs
- judge the site, not the page
    - score 15 to 20 pages with Binoculars, take the 9 deciles of the scores, feed a linear SVM
    - on 132 baseline sites the balanced accuracy is 98.8% to 99.8%
    - Fast-DetectGPT does about as well; adding four more scores gave no gain on 20 test sites
- known weak spots the notes themselves list
    - forum and support pages get flagged
    - newer models score less like ChatGPT-3.5, so Binoculars does worse on them
    - "humanizer" tools are untested
    - the AI baseline sites come mostly from a few site builders

two 2026 studies that ran detectors on web archives

- [The Impact of AI-Generated Text on the Internet](https://arxiv.org/abs/2604.26965), Dolezal et al., arXiv, 2026
    - sample: about 10,000 Wayback Machine URLs per month, Aug 2022 to May 2025, one URL per host
    - text: Trafilatura main text, then only "the longest paragraph", English, at least 100 words
    - compared Binoculars, Desklib, DivEye, Pangram v3; picked Pangram v3
    - HTML test: the same GPT-4o text as plain text vs wrapped in HTML
        - Binoculars mean score moved from 0.745 to 0.823, and it flagged 88.6% instead of 100%
        - Pangram scores barely moved
    - weak spots
        - one paragraph stands in for the whole page
        - the length test used only 20 human and 20 AI texts per length band
        - the HTML test used AI text only, so it says nothing about human pages being wrongly flagged
- [Pew Research Center methodology for AI content](https://www.pewresearch.org/data-labs/2026/08/20/methodology-ai-content/), 2026
    - sample: 10,000 English pages from each of 49 Common Crawl snapshots, Jan 2021 to Jul 2026
    - text: Common Crawl's own extracted text (WET files)
    - detector: Pangram's open model editlens_Llama-3.2-3B, flag when score is at least 0.2
        - 0.2 was chosen to "closely calibrate the results from Open Pangram to those from Pangram 3.3"
        - so it is tuned to agree with another Pangram model, not with known authorship
    - sanity check: the open model flags about 1% of pre-ChatGPT pages
    - only 10 to 15% of pages have a publication date; Pew says that subset is "not a random subset of the web"
- what both leave open
    - neither checks the extractor: does a different extractor change the verdict on the same page?
    - neither has known-human pages from after 2022 to measure false positives on today's writing

older and nearby work

- [The Rise of AI-Generated Content in Wikipedia](https://arxiv.org/abs/2410.08044), Brooks et al., arXiv, 2024 (🧑 already in the human's notes)
    - set GPTZero and Binoculars thresholds to 1% false positives on pre-2022 articles
    - over 5% of new English articles from Aug 2024 got flagged
    - assumes "increased AI use being the primary factor affecting detection", i.e. human writing style did not drift
- [Monitoring AI-Modified Content at Scale](https://arxiv.org/abs/2403.07183), Liang et al., ICML, 2024
    - does not judge single texts at all
    - compares word frequencies of a whole pile of text against a human pile and an AI pile, and solves for the mix
    - estimate: 6.5 to 16.9% of text in some AI conference reviews was substantially AI-modified
    - works when the pile is uniform, like reviews for one conference; web pages are far more mixed
- [A Large Scale Social Web Audit of AI Generated Text Detection Systems](https://doi.org/10.1609/icwsm.v20i1.42660), Dutta et al., ICWSM, 2026
    - abstract only; the full paper could not be opened
    - runs detectors on social media text written before LLMs existed and finds "considerable false positives"
    - also reports detectors "disfavor liberal political discourse"

why rare AI pages make false positives dominate

- let p = true share of AI pages, r = share of AI pages caught, f = share of human pages wrongly flagged
- share flagged q = p × r + (1 − p) × f
- example: p = 1%, r = 80%, f = 1%
    - true hits: 0.8% of all pages
    - false alarms: 0.99% of all pages
    - so more than half of the flags are wrong
- to recover p from q: p = (q − f) / (r − f)
    - this needs r and f measured on text like the text you crawl
    - f measured on old human text may be wrong for today's human text
- measuring a tiny f needs many known-human pages
    - zero errors in N independent pages only shows f is below about 3/N
    - 3,000 clean pages support "below 0.1%", not "below 0.01%"
    - 15 pages from one site are not 15 independent pages
