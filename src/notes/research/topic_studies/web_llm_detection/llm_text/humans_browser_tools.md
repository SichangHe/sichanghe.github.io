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
    - no independently verified 2026 human-detection study found in this pass
        - this is a search limitation, not evidence that none exists

human studies

- Ippolito, Duckworth, Callison-Burch, and Eck, ACL 2020
    - [Automatic Detection of Generated Text is Easiest when Humans are Fooled](https://aclanthology.org/2020.acl-main.164/)
    - authors' abstract: “even multi-sentence excerpts can fool expert human raters over 30% of the time”
    - study compares top-k, nucleus, and unrestricted random sampling
        - these are different rules for choosing the next generated word
    - authors report different cues used by humans and automatic detectors
    - limitation: predates instruction-following chat models
    - inference: human plausibility and automatic detectability need separate evaluation

- Jakesch, Hancock, and Naaman, PNAS 2023
    - [Human heuristics for AI-generated language are flawed](https://arxiv.org/abs/2206.07271)
    - authors' abstract: “participants (N = 4,600) were unable to detect self-presentations”
    - six experiments use professional, hospitality, and dating self-presentations
    - authors associate errors with first-person pronouns, contractions, and family topics
        - these familiar signs of human writing can be imitated
    - limitation: self-presentations are a narrow genre
    - inference: instructions to imitate a casual human style can defeat readers' usual cues

- Jannai, Meron, Lenz, Levine, and Shoham, 2023 white paper
    - [Human or Not? A Gamified Approach to the Turing Test](https://arxiv.org/abs/2305.20010)
    - authors' abstract: “users had even lower correct guess rates of 60%”
        - refers specifically to games against AI bots
    - more than 1.5 million users played anonymous two-minute conversations
    - 68% correct guesses across human and bot partners
    - limitation: voluntary game players are not a representative sample of web readers
    - limitation: bots were prompted to behave like humans
    - inference: scale provides many observations but does not remove task or recruitment bias

- Jones and Bergen, 2024 preprint
    - [People cannot distinguish GPT-4 from a human in a Turing test](https://arxiv.org/abs/2405.08007)
    - authors' abstract: “GPT-4 was judged to be a human 54% of the time”
    - randomized, controlled, preregistered five-minute conversations
    - actual human partners were judged human 67% of the time
    - limitation: the 54% is a bot's acceptance rate, not overall human detection accuracy
    - inference: errors also include rejecting real humans

- Jones and Bergen, 2025 preprint
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

- existing-note lead requiring full verification
    - [A Representative Study on Human Detection of Artificially Generated Media Across Countries](https://ieeexplore.ieee.org/abstract/document/10646666)
    - Frank, Herbert, Ricker, Schönherr, Eisenhofer, and Fischer, IEEE S&P 2024
    - human's [existing notes](../../../gen_ai.md) identify USA, Germany, and China samples across audio, images, and text
    - not used here for numerical conclusions
        - primary study not successfully opened in this pass

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
