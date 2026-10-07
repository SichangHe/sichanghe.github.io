human detection and browser tools
(authored by agents unless marked 🧑)

main findings

- inference: human detection depends on the task, model, prompt, and available context
    - evidence below ranges from older generated excerpts to prompted five-minute conversations
    - an interactive conversation lets readers request evidence
        - a published webpage usually does not
    - no single reported accuracy describes all these settings
- inference: an extension is a delivery mechanism for a detector
    - it also chooses which text gets scored and how readers see uncertainty
    - these choices deserve measurement separately from the detector model
- recommendation: study whether browser warnings improve readers' decisions
    - first measure mistaken warnings on known human writing
    - include abstention: the tool explicitly says it cannot decide
- source coverage checked 2026-10-06
    - primary abstract pages opened unless a full-text section is specified
    - browser listings and vendor pages opened directly
    - deliberate 2025/2026 searches attempted
        - built-in search failed with HTTP 404
        - arXiv search returned HTTP 429
        - OpenAlex reported exhausted shared daily budget
    - ACL 2026 expert-annotator study subsequently found by browsing the official proceedings volume
        - detailed below alongside the representative 2024 study

human studies

- Ippolito, Duckworth, Callison-Burch, and Eck, ACL 2020
    - publication status: peer-reviewed conference paper
    - [Automatic Detection of Generated Text is Easiest when Humans are Fooled](https://aclanthology.org/2020.acl-main.164/)
    - authors' abstract: “even multi-sentence excerpts can fool expert human raters over 30% of the time”
    - study compares top-k, nucleus, and unrestricted random sampling
        - these are different rules for choosing the next generated word
    - authors report different cues used by humans and automatic detectors
    - limitation: predates instruction-following chat models
    - inference: human plausibility and automatic detectability need separate evaluation

- Jakesch, Hancock, and Naaman, PNAS 2023
    - publication status: peer-reviewed journal paper
    - [Human heuristics for AI-generated language are flawed](https://arxiv.org/abs/2206.07271)
    - authors' abstract: “participants (N = 4,600) were unable to detect self-presentations”
    - six experiments use professional, hospitality, and dating self-presentations
    - authors associate errors with first-person pronouns, contractions, and family topics
        - these familiar signs of human writing can be imitated
    - limitation: self-presentations are a narrow genre
    - inference: instructions to imitate a casual human style can defeat readers' usual cues

- Jannai, Meron, Lenz, Levine, and Shoham, 2023 white paper
    - publication status: arXiv white paper
        - peer-reviewed publication not verified here
    - [Human or Not? A Gamified Approach to the Turing Test](https://arxiv.org/abs/2305.20010)
    - authors' abstract: “users had even lower correct guess rates of 60%”
        - refers specifically to games against AI bots
    - more than 1.5 million users played anonymous two-minute conversations
    - 68% correct guesses across human and bot partners
    - limitation: voluntary game players are not a representative sample of web readers
    - limitation: bots were prompted to behave like humans
    - inference: scale provides many observations but does not remove task or recruitment bias

- Jones and Bergen, 2024 preprint
    - publication status: arXiv version inspected
        - peer-reviewed publication not verified here
    - [People cannot distinguish GPT-4 from a human in a Turing test](https://arxiv.org/abs/2405.08007)
    - authors' abstract: “GPT-4 was judged to be a human 54% of the time”
    - randomized, controlled, preregistered five-minute conversations
    - actual human partners were judged human 67% of the time
    - limitation: the 54% is a bot's acceptance rate, not overall human detection accuracy
    - inference: errors also include rejecting real humans

- Jones and Bergen, 2025 preprint
    - publication status: arXiv version inspected
        - peer-reviewed publication not verified here
    - [Large Language Models Pass the Turing Test](https://arxiv.org/abs/2503.23674)
    - authors' abstract: “GPT-4.5 was judged to be the human 73% of the time”
    - two randomized, controlled, preregistered tests on independent populations
    - readers simultaneously converse with a human and a system for five minutes
    - prompted Llama-3.1-405B selected as human 56% of the time
    - ELIZA and GPT-4o baseline win rates were 23% and 21%
    - limitation: the persona prompt differs from baseline settings
    - inference: prompt and model effects must be reported together
    - limitation: choosing one of two partners does not estimate false accusations during ordinary browsing

- Rahimov, Zamler, and Azaria, 2025 preprint
    - publication status: arXiv version inspected
        - peer-reviewed publication not verified here
    - [The Turing Test Is More Relevant Than Ever](https://arxiv.org/html/2505.02558v1)
    - full text inspected, sections 3–4 and 8
    - authors, model description: “All experiments used the Llama 3.2 1B model via OpenRouter’s API”
    - reported prompted-model detection improves from 18/41 to 22/31 correct decisions
        - simple versus enhanced setting
        - 43.9% versus 70.97%
    - enhanced setting bundles dual conversation, longer engagement, instructions, qualification, and incentives
    - inference: this comparison cannot isolate which change improves detection
    - limitation: a 1B model does not establish performance against stronger contemporary models
    - inference: this result and Jones–Bergen 2025 do not directly contradict each other
        - models and test conditions differ

- Frank, Herbert, Ricker, Schönherr, Eisenhofer, Fischer, Dürmuth, and Holz, IEEE S&P 2024
    - [A Representative Study on Human Detection of Artificially Generated Media Across Countries](https://arxiv.org/abs/2312.05976)
    - publication status: peer-reviewed IEEE S&P 2024 paper
        - arXiv metadata identifies the venue
        - [IEEE publication record](https://ieeexplore.ieee.org/abstract/document/10646666)
    - [primary PDF](https://arxiv.org/pdf/2312.05976) inspected, sections 3.1.3, 3.3, and 4.1
    - authors, section 3.3: “Kantar handled participant recruitment, country representative quotas, and participant compensation”
    - preregistered survey with 3,002 participants across USA, Germany, and China
    - text-condition mean accuracy: USA 51.50%, Germany 54.48%, China 52.45%
        - these are text results, separate from image and audio results
    - surveys ran June–September 2022
        - 2024 publication does not mean 2024 models were tested
    - text generated with OpenAI Davinci GPT-3 from article titles and summaries
        - human articles from NPR, Tagesschau, and CCTV
        - target 90–100 words in English/German and 130–140 Chinese characters
        - presence and frequency penalties both 2, temperature 1
    - limitation: short news excerpts and one generator do not represent all web prose
    - inference: representative recruitment strengthens population relevance within these countries
        - does not make the selected articles or generation settings representative of the whole web

- Wang and colleagues, ACL 2026
    - [Is Human-Like Text Liked by Humans? Multilingual Human Detection and Preference Against AI](https://aclanthology.org/2026.acl-long.639/)
    - publication status: peer-reviewed ACL 2026 long paper
        - [official proceedings volume](https://aclanthology.org/2026.acl-long/)
    - [primary PDF](https://aclanthology.org/2026.acl-long.639.pdf) inspected, sections 2–3, table 3, and limitations
    - authors, table 3: “The simple average accuracy of the human expert guesses is 87.6%”
    - 19 native expert annotators across 16 datasets, nine languages, nine domains, and 11 models
    - table 3 totals 8,778 examples across 30 annotation settings
    - most tasks show a human and generated text together
        - reader selects which one is human
        - other tasks show one text, three texts, or unrestricted pairs
    - experts received examples before annotation in some settings
    - table 3 range includes 50.1% for Arabic dialect tweets and 50.7% for Vietnamese Wikipedia
        - some news and question-answering settings approach 100%
    - limitation: 87.6% is a simple average across different settings
        - not one common-protocol estimate for random web readers
    - limitation: many settings use one annotator
        - text count does not equal independent-reader count
    - authors aim to establish expert performance ceilings
        - inference: their observed results do not prove a universal mathematical upper bound
    - inference: this study challenges blanket claims that humans cannot detect generated text
        - it does not contradict near-chance representative-reader results under other tasks
    - [released dataset](https://github.com/xnlp-lab/HumanEval-MGT)
        - useful starting material for matched expert-versus-lay-reader experiments

browser tools observed

- GPTZero
    - [official Chrome page](https://gptzero.me/chrome)
    - vendor's warning: “Results should not be used to punish or as the final verdict”
    - advertised functions include webpage scans, sentence highlights, Google Docs replay, and Gmail labels
    - inference: the webpage mockup is an interface example
        - its BBC-like article is not evidence about measured web prevalence
    - [official extension listing](https://gptzero.me/extension)
    - listing observed version 2026.10.1, updated 2026-10-02
    - listed Google Docs features combine content detection and writing-process analysis
    - limitation: listing claims do not provide independent accuracy estimates

- Originality.ai
    - [official Chrome listing](https://chromewebstore.google.com/detail/ai-detector-and-human-wri/kdngfaamkbbkdbemejnlkmjfpmndjdmb)
    - vendor's limitation: “No AI detector is 100% accurate”
    - listing observed version 1.0.7, updated 2026-09-22
    - supports full-page and selected-text scanning
    - Google Docs replay shows revisions, pastes, contributors, and typing scores
    - limitation: claims that replay proves human authorship require separate evaluation
        - typing shows input behavior
        - a human can type copied model output
    - [vendor extension page](https://originality.ai/chrome-extension)
        - describes Chrome, Google Docs, and Firefox support
    - extension listing declares website-content collection
        - privacy declaration does not measure network behavior

- Hive AI Detector
    - [official Chrome listing](https://chromewebstore.google.com/detail/hive-ai-detector/cmeikcgfecnhojcbfapbmpbjgllklcbi)
    - vendor's workflow: “right-clicking it right on the webpage, pasting it into our text box, or uploading a file”
    - listing offers text, image, audio, and video detection without login
    - observed version 0.0.10, updated 2025-01-11
    - declares website-content collection
    - limitation: extension update date does not identify the server detector's update date

- Winston AI
    - [official Firefox listing](https://addons.mozilla.org/en-US/firefox/addon/ai-detector-winston-ai/)
    - vendor's privacy claim: “scans using the Firefox add-on are not saved anywhere”
    - listing requires at least 500 selected characters for text scans
    - observed version 0.0.2.6, updated 2026-07-22
    - advertised account trial provides 2,000 credits for seven days
        - one credit per scanned word
    - listed permissions include clipboard, browser tabs, and data on all websites
    - inference: broad permissions and no-retention claims concern different properties
        - verify transmission and retention separately
    - limitation: vendor accuracy claims are not measurements from this review

- Copyleaks
    - observed as a related extension in the opened Chrome listings
    - direct vendor detector page returned HTTP 403
    - current features and accuracy remain unverified here

research opportunities

- recommendation: measure the browser input problem before training another detector
    - question: does one article receive different scores under different extraction methods?
    - first experiment: construct 100 known-human and 100 known-generated article pages
        - same article with navigation, advertisements, comments, quotations, and related articles
        - compare full page, selected article, visible text, and individual paragraphs
    - report score change, mistaken warnings, detected generated articles, and scan failures
    - manually verify the text submitted to each detector
    - expected contribution: separate extraction errors from model errors
        - hypothesis, not an established gap in all prior work

- recommendation: test whether warnings help readers detect actual problems
    - question: does an AI label improve decisions about factual accuracy or source checking?
    - first experiment: known-human and known-generated articles with independently verified factual errors
        - randomize no warning, binary warning, uncertainty warning, and source-check suggestion
        - balance authorship and correctness independently
    - measure correct error identification, source checking, trust, and false accusations
    - recruit varied reading and language backgrounds
    - compare actual detector outputs with controlled warning conditions
        - controlled conditions identify interface effects
        - actual outputs measure end-to-end performance
    - hypothesis: a confident wrong label can reduce reader accuracy

- recommendation: evaluate human–detector disagreement as a useful signal
    - question: can readers correct detector mistakes using external context?
    - first experiment: collect cases where human judgment and detector output disagree
        - ask readers to inspect author history, cited sources, and linked originals
        - compare with readers shown text alone
    - measure correction rates separately for false accusations and missed generated text
    - retain uncertainty rather than voting every item into a forced label
    - inference: context may help judge reliability without resolving authorship

- recommendation: test replay claims against realistic alternative workflows
    - question: does writing history distinguish composition from transcription?
    - first experiment: compare original drafting, dictation, human transcription of AI output, pasted human drafts, and automated typing
    - measure mistakes separately for each workflow
    - record accessible input methods
        - legitimate assistive tools may resemble automated input
    - avoid treating a typing score as direct proof of who composed the words

- recommendation: measure extension behavior on synthetic test documents
    - first experiment: instrument network requests during selection, page scan, Docs replay, and idle browsing
    - identify transmitted text, destination, timing, and failure behavior
    - compare observed behavior with published privacy declarations
    - use constructed content and test accounts
    - limitation: client observation alone cannot verify server retention

- recommendation: isolate expertise from paired-text assistance
    - question: does expert performance remain high when only one unfamiliar webpage is shown?
    - first experiment: reuse HumanEval-MGT examples with native expert and lay readers
        - randomize single text versus matched pair and example training versus no training
        - keep models, text lengths, and domains fixed across conditions
    - measure false accusations, missed generated texts, confidence, and time per judgment
    - report reader-level variation separately from text-level variation
    - expected contribution: explain which protocol differences produce the representative-versus-expert performance gap
        - hypothesis, not a claim that current studies isolate these causes
