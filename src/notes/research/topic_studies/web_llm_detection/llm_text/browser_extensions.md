browser extensions for detecting AI-generated content
(authored by agents unless marked 🧑)

the plain picture and main takeaways

- an extension is a thin skin over a detector
    - it picks some text from the page, sends it to a model, and paints a label next to it
    - 3 choices decide what the reader sees: which text, where the model runs, how the label looks
- takeaway 1: the big commercial ones run on the vendor's servers
    - every store listing I opened declares "website content" as collected data
    - none of the vendor pages says exactly what leaves the browser
    - nobody has watched the network traffic of a detector extension (see the last section)
- takeaway 2: models that run inside the browser exist but are weak or untested
    - Deckard, the local one I found with a number: about 2% false positives, author says "way, way worse than Pangram"
    - the Gemma-270M and Naive Bayes ones publish no real accuracy test
    - the free Mozilla one (Fakespot Deepfake Detector, open models) was shut down on 2025-06-26
- takeaway 3: label studies agree on one thing, that "AI-generated" labels make people trust text less, true or false
    - Altay and Gilardi: labels lowered perceived accuracy "regardless of whether the headlines were true or false"
    - but labels barely change what people do (like, share) in two other studies
    - one study found a label can raise belief in false science text (Lin and Zhang)
- takeaway 4: a detector that labels only some pages hands the unlabeled ones a free pass
    - this is the "implied truth effect" for fake-news tags (Pennycook 2020)
    - a 2026 test on AI images found the same, about one-fifth the size (Pawelczyk)
    - inference: for a text detector that misses a lot, this applies directly; nobody has tested it with real detector errors
- takeaway 5: price per page is about 7-9 cents per 1000 words at list price
    - my own arithmetic from the pricing pages, in the price section
- takeaway 6: crowd labeling for AI content is tiny
    - SkipSlop has 44 users
    - the uBlockOrigin HUGE AI list has 1000+ hand-picked sites and 5.8k GitHub stars, with no published accuracy check I could find
- scope and honesty
    - all store numbers were read on 2026-10-07 and will move
    - the fetch tool summarizes pages; text in quotation marks is what it returned as a quote
    - things I could not open are listed at the end of each section

how to read the user counts

- Chrome Web Store shows round numbers like 30,000; Firefox shows exact counts
    - the two stores count differently, so do not add them up
- ratings are tiny samples for most
    - Pangram Firefox: 6 reviews
    - Hive Chrome: 415 ratings

real extensions, one by one

- what each section gives: text picked, where the model runs, what the user sees, users, price, stated limits
- where the model runs is mostly inferred, because the listings do not say
    - marked "inference" when I am guessing from the business model

GPTZero

- text picked
    - works on "any webpage with readable text — news articles, blog posts, essays, reviews"
        - gptzero.me/chrome
    - scans only when you ask, or on auto-scan in Google Docs
    - whole-page scan: user clicks the icon on the right side of the browser
        - gptzero.me/news/check-ai-on-webpage
- where the model runs
    - not stated on the pages I opened
    - inference: server, because the product is a paid web service with an API
- what the user sees
    - "The extension will tell you which sentences are human, which have been written by AI, and which are mixed"
        - gptzero.me/news/check-ai-on-webpage
    - in Docs, sentences coloured by confidence, "green for human, yellow to orange as confidence climbs"
    - also a writing replay: edit history replayed, then "scores how natural the typing looks"
- users
    - 500,000 on Chrome, 4.7 of 5 from 734 ratings
    - version 2026.10.1, updated 2026-10-02
- price
    - free with "a monthly allowance of scans", paid plans raise limits
    - pricing page did not show amounts to my fetch
- stated limits
    - "While any AI detection score is simply one data signal in a broader context, GPTZero's Chrome Extension makes it easier to review what is, and isn't, likely to be AI-generated"
    - claims "99% accuracy" and "under 2% false negatives"; vendor claim, not independent
- privacy declaration in the store listing
    - handles personally identifiable information, financial and payment data, authentication information
    - "not sold to third parties outside approved use cases"

Pangram

- text picked
    - 2 ways: highlight text, right click, "Check for AI Content"
    - or auto-scan "sections on X, LinkedIn, Substack, and Medium" (the Chrome page also lists Reddit)
        - pangram.com/solutions/browser-extension
- where the model runs
    - the pages say the text is run "through the Pangram AI Detector"
    - they do not say what exactly is sent
    - inference: server
- what the user sees
    - the result in the bottom-right corner for a selection
    - badges "Human", "AI-Assisted", or "AI" on each post as you scroll
    - a "feed health" panel with the percent of human versus AI posts in your feed
- storage
    - "By default, we store the data to be used for your Feed Health Screenshot"
    - opt-out is in Pangram's preferences
    - "We never share this data with third-parties or train our models on it"
        - pangram.com/solutions/browser-extension
    - so by default your feed posts are kept on their side, which matters for the privacy section below
- users
    - Chrome 30,000, 4.7 of 5 from 25 ratings, version 2.17.0, updated 2026-09-15
    - Firefox 1,028 users, 2 of 5 from 6 reviews, version 2.17.0, updated 2026-09-21
- price
    - Individual $20 per month, "up to 300,000 words per month", 7-day trial (pangram.com/pricing)
    - Professional $65 per month, Team $20 per seat per month
    - the extension trial page offers "free 14-day access", the pricing page says 7 days; the two pages disagree
- stated limits
    - claims "over 99% accuracy" and "one of the lowest false positive rates in the industry"
    - another page I did not open directly was quoted by the search tool as "1-in-10,000"; I do not rely on it
- permissions on Firefox
    - clipboard data, browser activity during navigation, data on all websites
    - data collected per developer: browsing activity, personal communications, website content

Originality.ai

- text picked
    - full-page and selected text; also Google Docs
- where the model runs
    - not stated; inference: server
- what the user sees
    - AI score, plagiarism check
    - Writer Replay: "character-by-character video replay of the writing process"
    - auto-typing detection for "non‑human typing behaviors"
    - shareable read-only reports
- users
    - 50,000 on Chrome, 3.8 of 5 from 159 ratings
    - version 1.0.7, updated 2026-09-22
- price
    - free: 3 scans per day, 2,000 words per scan
    - Pro $14.95 per month, 2,000 credits, "1 credit = 100 words"
        - originality.ai/pricing
- stated limits
    - extension page claims "99% AI Detection Accuracy in Google Docs" and "data [is] not used in training"
    - the store declares authentication information, personally identifiable information and website content
    - the earlier note had a vendor quote "No AI detector is 100% accurate"; I did not re-open that listing text, so I do not repeat it as verified

Copyleaks

- text picked
    - highlight text, click the extension icon (the install steps, as quoted by a search result of the store page)
    - requires login with Google or Facebook, per the same search result
- where the model runs
    - not stated; inference: server
- what the user sees
    - a human/AI verdict; supports 30 languages and AI-generated source code
- users
    - 200,000 on Chrome, 4.1 of 5 from 708 ratings
    - version 5.0.1, updated 2026-09-28
    - a search snippet showed an older store copy with 643 reviews and version 4.3.1 from 2024-08, so the listing changes fast
- price
    - free scans are limited per day, then a subscription; premium adds plagiarism and team tools
    - I could not open copyleaks.com/pricing details; the vendor extension page returned HTTP 403
- stated limits
    - claims "Over 99% accuracy and a 0.2% false positive rate"
    - store: "Not being sold to third parties", handles website content

Hive

- text picked
    - the store description: "Check if text, images, audio or videos are AI generated"
    - the right-click workflow is in an earlier note but I did not re-verify that wording
- where the model runs
    - not stated; inference: server, since Hive sells detection through an API
- what the user sees
    - likelihood scores, and for images and video the name of the likely generator
- users
    - 60,000 on Chrome, 4.6 of 5 from 415 ratings
    - version 0.0.10, last updated 2025-01-11, almost 2 years before the check
- price
    - free, no login
- privacy declaration
    - handles website content, not sold to third parties
- stated limits
    - none beyond the likelihood-score wording

Winston AI

- text picked
    - selected text, at least 500 characters
- where the model runs
    - not stated; the Firefox listing has the claim "scans using the Firefox add-on are not saved anywhere" in the earlier note, which I did not re-open
- what the user sees
    - a score; image scans also supported
- users
    - Firefox only: 1,189 users, 4.3 of 5 from 38 reviews
    - version 0.0.2.6, updated 2026-07-22
- price
    - free: 2,000 credits for a 14-day trial (the extension listing said 7 days; the pricing page says 14 days)
    - 1 credit per word, image scan 300 credits
    - Essential $9 per month for 100,000 credits
        - gowinston.ai/pricing
- permissions
    - "Get data from the clipboard", "Access browser tabs", "Access your data for all websites"
    - collects "Authentication information" and "Website content"

Sapling

- text picked
    - highlight text on the page; built for social posts on Reddit, LinkedIn, Facebook (search-result description)
    - listing: "Quickly check if any content was AI generated, and make sure your writing isn't!"
- what the user sees
    - sentence-level analysis, inline highlighting, and "shareable detection certificates as proof of human authorship"
- users
    - 9,000 on Chrome, 4.8 of 5 from 5 ratings
    - version 1.0.1.4, updated 2026-08-19
- price
    - first month free, then AI detection is premium
    - Free plan: 2,000 characters per check; Pro $25 per month, 100,000 characters per check
        - sapling.ai/pricing
- privacy declaration
    - the widest list of the set: personally identifiable information, personal communications, location data, user activity, website content
- where the model runs
    - not stated; inference: server

ZeroGPT

- the official site zerogpt.com showed no extension on its homepage to my fetch
    - this is not proof that none exists
- the only extension I opened is "ChatGPT and AI Detector by ZeroGPT.cc", from another developer
    - developer "Sleepytime", site zerogpt.cc, not clearly the same company as zerogpt.com
    - 4,000 users, 3.0 of 5 from 4 ratings, version 2023.0.1, last updated 2023-07-06
    - listing says data "will not be collected or used"
- zerogpt.com claims "98.4% Detection accuracy" and "<1% False positive rate"; input limit 15,000 characters
    - vendor claim
- surprise: a look-alike with a near-identical name sits in search results and the official brand may have none

how to compare the price: cost per 1000 words, my arithmetic

- Originality Pro: $14.95 for 2,000 credits at 100 words each = 200,000 words, about $0.075 per 1000 words
- Pangram Individual: $20 for 300,000 words, about $0.067 per 1000 words
- Winston Essential: $9 for 100,000 credits at 1 per word, about $0.09 per 1000 words
- inference: scoring 1,000 article pages of 1,000 words each costs about $70-$90 at list price
    - extensions are built for a person reading, not for crawling a corpus
    - the API plans (Pangram Professional includes "$200 of API credits monthly") are the route for bulk work

open-source and hobby extensions

- Deckard, a blog post by Sean Goedecke (seangoedecke.com/deckard)
    - "A Chrome extension that talks to a locally-running model on your Mac"
    - model: Gradient MLX 4-bit; talks to the extension over native messaging, no web server
    - "uses about 400MB-1.2GB of memory while active", shuts down after 5 minutes idle
    - shows highlighted suspected text on web pages; worked on AI summaries on YouTube
    - limits, author's words: local models are "way, way worse than Pangram", about 2% false positives
    - surprise: it needs a Mac and a helper program installed outside the browser
- AI Slop Detector extension (github.com/Priyansurout/ai-slop-detector-extension, 0 stars at search time)
    - picks text you select on a page, or pasted text
    - model: "Google Gemma 270M" fine-tuned, about 150MB, runs "100% locally after initial model download" on WebGPU
    - result: AI-Generated, Human-Written, or Uncertain
    - needs Chrome 113+ and a WebGPU GPU; first model load "2-5 minutes"
    - README gives no accuracy numbers
- TruthLens (github.com/mrtomdev/truthlens, 3 stars)
    - text rules: sentence-length variance, common-word ratio, phrase fingerprints like "delve into" and "tapestry"
    - also images (pixel statistics, known AI image CDNs) and audio
    - "All detection runs in your browser. Audio, images, and text are never uploaded"
    - author's limit: "These are heuristics, not forensic proof. They produce false positives and false negatives"
- AI Slop Blocker (Chrome store, 364 users, version 3.7.5, updated 2026-09-27)
    - "Hides AI-generated posts in your feed. Scoring runs on your device"
    - short posts caught by pattern; longer posts "scored by an on-device model"
    - "Community sync is optional and shares only text hashes, not the text itself"
        - a real use of the hash idea from the human's earlier note
- AI Text Detector (Chrome store, 5 users, v1.0.0)
    - 8 hand-made signals: perplexity, burstiness, repetition, stylometry, probability skew, semantic drift, watermarking, buzzword density
    - "All analysis happens locally"; the page itself had no permissions list
- BladeRunner for web (SourceForge listing)
    - "analyzes page content on the fly, flagging suspicious snippets" with a confidence number each
    - says it can be wrong both ways; no accuracy numbers
- GPTrue-or-False (github.com/thesofakillers/GPTrue-or-False, 112 stars)
    - "displays the likelihood that selected portions of text were generated by GPT-2"
    - the extension runs in the browser but calls OpenAI's old detector on Hugging Face servers
    - author note: "this is a pretty old extension! Doesn't work very well anymore"
    - shows the first generation of these tools: a text-selection extension calling a hosted model
- Mozilla Fakespot Deepfake Detector (OMG! Ubuntu, 2025-02 and 2025-06)
    - highlighted text of 32 words or more
    - used open models ApolloDFT, Binoculars, UAR, ZipPy; "Mozilla's proprietary ApolloDFT engine and a set of open-source detection models"
    - the launch article: "will almost certainly flag AI text as human, and human effort as AI"
    - shut down 2025-06-26; the article gives no official reason, only that after Fakespot closed "the writing was on the wall"
    - I could not open Mozilla's own announcement
    - the human can still use the idea: it is the closest thing to a free, multi-detector extension, and it is gone
- filters that hide, not label
    - SlopScout, Slop Block: only seen as search-result descriptions, not opened
- could not open
    - the GitHub topic page showed only two extension repos among 22 tagged ai-text-detector (truthlens and allentsangdev/ai-text-detector); I did not open the second
    - waxy.org 2019 post about a Chrome and Firefox GPT-2 detector extension: the page gave almost no detail

images and provenance in the browser

- Digimarc C2PA Content Credentials extension, open source
    - "Once installed, it automatically checks for manifests attached to images on the browsed pages"
    - shows a "CR" pin on images that have a manifest; works on JPEG with C2PA manifests
    - not a detector: it reads signed labels the maker attached, so it only helps if the generator signed the image
        - digimarc.com blog, 2023
- DejAIvu (academic, below) is the research version for images
- Adobe Content Authenticity Chrome extension exists; I did not open its page

academic work

papers that build an extension, in-browser tool, or study one

- Aletheia
    - [Verify as You Go: An LLM-Powered Browser Extension for Fake News Detection](https://arxiv.org/abs/2603.05519), Sallami et al., arXiv, 2026
    - Dorsaf Sallami and Esma Aïmeur, abstract: "Existing browser extensions often fall short due to opaque model behavior, limited explanatory support, and a lack of meaningful user engagement"
    - fake-news, not AI-text, detection; uses retrieval plus an LLM and gives evidence-based explanations
    - "a complementary user study with 250 participants confirms the system's usability and perceived effectiveness"
    - a usability study, not a test of whether readers get more accurate
- DejAIvu
    - [DejAIvu: Identifying and Explaining AI Art on the Web in Real-Time with Saliency Maps](https://arxiv.org/abs/2502.08821), Dzuong, IJCAI 2025 demo track
    - Chrome extension for AI-generated images; "ONNX-optimized deep learning model" runs inside the extension, no server
    - highlights the image regions that look artificial
    - abstract claims "high accuracy and low latency"; the abstract page gave no numbers
- Trustnet
    - [A Browser Extension for in-place Signaling and Assessment of Misinformation](https://arxiv.org/abs/2403.11485), Jahanbakhsh and Karger, CHI 2024
    - lets users judge content accuracy on any website and see trusted people's judgments in the page
    - "A two-week user study examined user perceptions, content preferences, and assessment reasoning"
    - closest academic match to the human's "specific tagging" idea; see crowd section
- Deep Breath, NudgeCred, TrustyTweet
    - these came up in a search as misinformation extensions; I opened only the Deep Breath arXiv PDF and the fetch failed, so I report none of them
- LLM-DetectAIve, "Detecting LLM-Generated Tokens in Human-LLM Coauthored Text"
    - web demos, not extensions; seen only in search snippets, not opened
- finding: I found no paper that builds and tests a browser extension that detects AI-generated text on ordinary web pages
    - I searched arXiv, Google, ACM, USENIX, CHI, CSCW wording variants (about 20 queries)
    - search coverage limits: ACM DL and Google Scholar were not directly searchable with my tools

papers that run models inside the browser (the enabling tech)

- WebLLM
    - [WebLLM: A High-Performance In-Browser LLM Inference Engine](https://arxiv.org/abs/2412.15803), Ruan et al., arXiv, 2024
    - "WebLLM can retain up to 80% native performance on the same device"
    - the paper reports 41.1 tokens per second for Llama 3.1 8B on an M3 Max MacBook Pro (from a search result summary, not verified in the paper)
    - why it matters: Binoculars needs two 7B models running together, so a strong zero-shot detector in a browser is not obviously possible
        - inference; nobody I found tested it
- the hobby extensions above (Gemma 270M, Deckard) are the only in-browser text detectors I found, none with a published test

how labels and warnings change what people believe or do

- the old base result
    - [The Implied Truth Effect: Attaching Warnings to a Subset of Fake News Headlines Increases Perceived Accuracy of Headlines Without Warnings](https://dspace.mit.edu/handle/1721.1/130380), Pennycook et al., Management Science, 2020
    - abstract: "false headlines that fail to get tagged are considered validated and thus are seen as more accurate"
    - the fix they found: tag some true stories too, "this effect disappeared"
    - applies when readers cannot tell "unchecked" from "checked and fine"
- AI labels lower trust, even for true text
    - [People are skeptical of headlines labeled as AI-generated, even if true or human-made, because they assume full AI automation](https://academic.oup.com/pnasnexus/article/3/10/pgae403/7795946), Altay and Gilardi, PNAS Nexus, 2024
    - 4,976 US and UK people; "labeling headlines as AI-generated lowered their perceived accuracy and participants' willingness to share them, regardless of whether the headlines were true or false, and created by humans or AI"
    - effect about 2.66 points versus 9.33 points for a "false" label, three times smaller (as reported by the fetch tool)
    - reason found: readers assume no human was involved
- a label can backfire on false text
    - [Visible sources and invisible risks: exploring the impact of AI disclosure on perceived credibility of AI-generated content](https://jcom.sissa.it/article/3580/galley/6937/download), Lin and Zhang, JCOM, 2026
    - 433 people; "AI disclosure significantly reduced the perceived credibility of correct information while unexpectedly increasing the perceived credibility of misinformation"
    - they call it the "truth-falsity crossover effect"
    - small, one genre (science posts), within-subjects; treat as a warning flag, not a settled result
- an AI label also lifts the unlabeled
    - [Implied Authenticity Effect? The Impact of Explicit Labels on AI-Generated Content](https://ojs.aaai.org/index.php/ICWSM/article/download/42721/50281/46822), Pawelczyk et al., ICWSM 2026
    - 877 Germans, Instagram-style posts; labels cut perceived authenticity of AI images by about 0.27 standard deviations
    - "exposure to labeled content slightly increased perceived authenticity in unlabeled images (about one-fifth the size of the direct labeling effect)"
    - images, not text; this is the implied truth effect applied to AI labels
- labels cut belief but not sharing
    - [Labeling AI-generated media online](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12166545/), Wittenberg et al., PNAS Nexus, 2025 (read from the authors' MIT PDF)
    - 7,579 Americans, AI images; "all of the labels we tested significantly decreased participants' belief in the presented claims"
    - "labels that simply informed participants that content was generated using AI tended to have little impact on respondents' stated likelihood of engaging with their assigned post"
    - harm-style labels ("misleading") worked differently from process-style labels ("AI-generated")
- label design
    - [Labeling Synthetic Content: User Perceptions of Warning Label Designs for AI-generated Content on Social Media](https://arxiv.org/abs/2503.05711), Gamage et al., CHI 2025 (arXiv preprint opened)
    - 10 label designs, 911 people; labels changed belief that content was AI, trust in the label varied by design
    - "labels did not substantially affect engagement metrics (likes, comments, shares)", per the fetch summary
    - [Examining the Impact of Label Detail and Content Stakes on User Perceptions of AI-Generated Images on Social Media](https://arxiv.org/abs/2510.19024), Chen et al., CSCW Companion, 2025
    - 105 people; detail in the label raised felt transparency without cutting interaction; stakes mattered more than label detail
- a label that says how much AI was used
    - [AI labeling reduces the perceived accuracy of online content but has limited broader effects](https://arxiv.org/abs/2506.16202), Wang et al., arXiv, 2025
    - 3,861 nationally representative people; "Explicit AI labeling of a news article about a proposed public policy reduces its perceived accuracy"
    - "Increasing the salience of AI use reduces the negative impact of AI labeling on perceived accuracy"
    - [Full Disclosure, Less Trust? How the Level of Detail about AI Use in News Writing Affects Readers' Trust](https://arxiv.org/abs/2601.09620), Prajod et al., arXiv, 2026
    - 40 people; trust "declined only with detailed disclosures" in questionnaires, while fact-checking behaviour rose with both minimal and detailed disclosures
    - small study; shows the trade-off: more detail, less trust, more checking
- AI explanations next to a warning
    - [Reliability Matters: Exploring the Effect of AI Explanations on Misinformation Detection with a Warning](https://ojs.aaai.org/index.php/ICWSM/article/view/31397), Seo et al., ICWSM 2024
    - 2,692 people over 3 experiments; "the AI system's reliability is critical for humans' misinformation detection"
    - adding explanations "may heighten concerns about the system missing false claims", and warnings without explanations drew more confidence (fetch summary)
- readers and detectors together
    - [Collaborative Evaluation of Deepfake Text with Deliberation-Enhancing Dialogue Systems](https://arxiv.org/abs/2503.04945), Lee et al., ICWSM 2026
    - "group-based problem-solving significantly improves the accuracy of identifying machine-generated paragraphs compared to individual efforts"
    - [People who frequently use ChatGPT for writing tasks are accurate and robust detectors of AI-generated text](https://arxiv.org/abs/2501.15654), Russell et al., ACL 2025
    - "annotators who frequently use LLMs for writing tasks excel at detecting AI-generated text, even without any specialized training"
- the labelling studies that the earlier note could not open
    - Gamage (CHI 2025) is now opened via arXiv above
    - Jung et al., CHI EA 2025, "AI-Generated or AI-Modified?" I still have not opened

crowd labeling: Community Notes, SponsorBlock, blocklists

- Community Notes does something, but mostly late
    - [Community notes reduce engagement with and diffusion of false information online](https://arxiv.org/abs/2502.13322), Slaughter et al., PNAS, 2025
    - 40,078 posts; "reductions of 46.1% in reposts, 44.1% in likes, 21.9% in replies, and 13.5% in views after being attached"
    - over the whole life of a post the drops are smaller: "11.6% fewer reposts, 13.3% fewer likes"
    - [Did the Roll-Out of Community Notes Reduce Engagement With Misinformation on X/Twitter?](https://arxiv.org/abs/2307.07960), Chuai et al., CSCW, 2024
    - "Community Notes might be too slow to effectively reduce engagement with misinformation in the early (and most viral) stage of diffusion"
    - the two disagree on the effect; speed is the shared worry
    - so a crowd label for AI text, which would need to exist before the reader sees the page, faces the same lag
- LLMs writing the notes
    - [Scaling Human Judgment in Community Notes with LLMs](https://arxiv.org/abs/2506.24118), Li et al., arXiv, 2025
    - "both humans and language models generate Community Notes, with humans retaining evaluation authority"
- a browser overlay for any page
    - [Reading In-Between the Lines: An Analysis of Dissenter](https://arxiv.org/abs/2009.01772), Rye et al., IMC 2020
    - the human's notes list Dissenter as an abandoned similar project; this is its measurement paper
    - 1.68 million comments from 101,000 users on 588,000 URLs, Feb 2019 to Apr 2020
    - it studied toxicity and bias, not label accuracy or whether comments changed how readers judged pages
- SponsorBlock
    - I found no peer-reviewed paper about it
    - its wiki "Dataset Uses" page names one student project, DeepSponsorBlock (Stanford CS 230, 2020), which guesses sponsor segments from video frames
    - so the data is public and reused, yet its quality has not been published as a study (as far as I found)
- blocklists
    - [uBlockOrigin-HUGE-AI-Blocklist](https://github.com/laylavish/uBlockOrigin-HUGE-AI-Blocklist), laylavish, GitHub
    - "A huge blocklist of manually curated sites (1000+) that contain AI generated content, for the purposes of cleaning image search engines"
    - 5.8k stars, 972 commits; contributions by pull request or issue, then the maintainer reviews
    - a separate "nuclear" list holds sites with "a mix of authentic and AI generated imagery" (DeviantArt, Artstation, stock photo sites)
    - the README states no method for choosing sites and no error rate
    - scope is image search results, not text
- the human's earlier ideas, and what the literature adds
    - hash lookups for privacy: AI Slop Blocker shares "only text hashes, not the text itself"; SkipSlop checks "content IDs" against its database
        - neither has been tested for whether hashes of text survive small edits
    - specific tags instead of votes: Trustnet uses accurate, inaccurate, and question; its study is 2 weeks long
    - spam and click farms: no paper I opened measures it for these tools
    - SkipSlop has 44 users and one rating, so the community-powered idea has not yet been tried at scale

security and privacy: what extensions send away

- GenAI browser assistants send whole pages to their servers
    - [Big Help or Big Brother? Auditing Tracking, Profiling, and Personalization in Generative AI Assistants](https://arxiv.org/abs/2503.16586), Vekaria et al., USENIX Security 2025
    - "instead of relying on local in-browser models, these assistants largely depend on server-side APIs, which can be auto-invoked without explicit user interaction"
    - they "collect and share webpage content, often the full HTML DOM and sometimes even the user's form inputs, with their first-party servers"
    - arXiv abstract says ten extensions; the USENIX page says nine; I did not resolve which
    - these are chat and summary assistants, not detectors
        - inference: a detector in auto-scan mode has the same shape, a content script plus a server call
- a store-wide taint-tracking study of what extensions copy off pages
    - [Arcanum: Detecting and Evaluating the Privacy Risks of Browser Extensions on Web Pages and Web Content](https://www.usenix.org/conference/usenixsecurity24/presentation/xie-qinge), Xie et al., USENIX Security 2024
    - tested Chrome Web Store extensions on 7 sites (Amazon, Facebook, Gmail, Instagram, LinkedIn, Outlook, PayPal)
    - "significant privacy risks across thousands of extensions, including hundreds of extensions automatically extracting user content from within web pages, impacting millions of users"
    - the same 7 sites are where Pangram auto-scans feeds (LinkedIn) or where GPTZero works (Gmail); the paper does not name any detector extension
- extensions leak browsing data through third-party content
    - [Extended tracking powers: Measuring the privacy diffusion enabled by browser extensions](https://researchconnect.stonybrook.edu/en/publications/extended-tracking-powers-measuring-the-privacy-diffusion-enabled-/), Starov and Nikiforakis, WWW 2017
    - 10,000 popular Chrome extensions; "many leak sensitive browsing information"
- a vendor study, not peer reviewed
    - Incogni, 2025-02-06, reported by ITBrief: 238 AI Chrome extensions; "two-thirds of those analysed collect user data"; "41% collect personally identifiable information"
    - another outlet I did not open reports a 442-extension version from 2026; the numbers differ, treat both as press-level
- what is missing for detectors
    - the listed declarations (website content, personal communications) are what the store form says, not what the code does
    - Pangram's own page says it stores scanned feed text by default

what nobody seems to have studied yet

- what text leaves the browser
    - nobody has recorded the network traffic of GPTZero, Pangram, Copyleaks, Originality, Hive, Winston or Sapling
    - open question: does auto-scan send every post in a feed, including private ones on LinkedIn, X or Gmail?
    - Arcanum's taint tracker could run on exactly these
- what text gets picked
    - no study of how a page-level scan chooses text (menus, ads, comments, quotes) and how the score changes with it
    - minimum lengths differ: Mozilla's detector 32 words, Winston 500 characters, Sapling free 2,000 characters per check
- label effects with real detector mistakes
    - every label experiment I opened used a label placed by the experimenters on content whose truth the experimenters knew
    - none shows readers a detector's real, wrong labels on real pages
    - open: does a confident wrong "AI" label on a human page, or a missed AI page, change what people decide
- the implied truth effect for text detectors
    - Pennycook and Pawelczyk show spillover to unlabeled items
    - nobody tested it where the labeler misses much AI text, which is the usual case
- the effect on the author whose page gets flagged
    - all label studies measure readers, none measure the writer accused
- in-browser detection quality
    - nobody has put the Gemma-270M, Deckard and hand-rule detectors on a shared benchmark such as the human's usual sets, next to the server detectors
    - also open: can a Binoculars-style two-model scorer run in a browser at all
- a census of the extension ecosystem
    - counts of AI-detector extensions, permissions, update dates, ownership; look-alikes such as the ZeroGPT.cc one; abandoned ones such as Hive's (last update 2025-01) and the shut-down Mozilla one
- crowd labels for AI content
    - SkipSlop, AI Slop Blocker sync, and the HUGE list exist, but no accuracy check, no abuse study, no study of whether the labels help readers
    - an idea for the human, as inference: the HUGE list's 1000+ hand-picked sites could be scored with DeGenTWeb's site-level method to measure its precision
- speed of labels
    - Community Notes studies suggest late labels do little; nobody asked how fast a crowd or a detector label arrives relative to when the page is read
