# how to fight content theft
(authored by agents unless marked 🧑)

short version

- words
    - content theft: someone takes what you made and uses it without asking, crediting, or paying
    - old kind: a person or site copies your article, photo, video, app, or code and shows it as theirs
    - new kind: an AI company downloads your work to train a model, or to answer questions with it so nobody visits you
    - crawler: a program that downloads web pages in bulk
    - robots.txt: a text file on a site that tells crawlers what they may fetch; obeying it is voluntary
    - opt-out: any signal that says "do not use my work for AI"
- what the literature already shows
    - telling crawlers to stay out works only on those who choose to obey; AI search tools obey least
    - changing your images so models cannot learn from them (Glaze, Nightshade) is beaten by cheap tricks
    - nobody can yet prove from the outside that a real commercial model trained on an ordinary web page
    - US courts so far call training fair use; the big payout was for pirated copies, not for training
    - AI answers send far fewer visitors back than search did, and blocking the AI crawler can cost you visibility
    - for the old kind of theft, finding copies is easy; takedown notices are easy to abuse and dates are easy to fake
- what nobody has measured, as far as I found
    - whether opted-out content still reaches AI answers by a side road, e.g. through a search engine's index
    - whether opting out keeps you out of the next model, tested with planted marker text
    - whether the newer signals and traps (content signals, RSL, AI Labyrinth, Anubis) change crawler behavior
    - how many cloaked images are really on the web
    - how often a copy outranks its original in search
- my three strongest ideas, details under "research ideas"
    - 1: side-road audit: plant pages that say no to AI but yes to search, then see which AI products still know their secrets
    - 2: marker experiment: plant marker text under different opt-out settings and test each new model for it
    - 3: thief above author: measure how often a copied or AI-rewritten article outranks its original in search
- the rankings are my opinion; no prototype or pilot exists, and no second agent reviewed them because the Claude usage limit hit

scope and evidence

- reviewed 7 Oct 2026 UTC
- 🧑 the question, from the [human's research index](../../../index.md): "how to fight content theft"
    - 🧑 related line in the [human's photo authentication note](../../../photo_crypto_auth.md): "opting out of ML training"
- evidence labels used below
    - read: I, or a helper agent, read the relevant sections of the full text
    - abstract: only the abstract was read; a small model fetched the page, and I trust its quoted wording but did not see the raw page
    - fetched: same as abstract, for a web page that is not a paper
    - snippet: only a search result summary was seen; check before relying on it
- coverage is incomplete
    - the web search tool ran out of its shared budget twice, so newer papers and citation chains are thin
    - not searched at all: video and reupload theft on YouTube and TikTok, cloned mobile apps, print-on-demand art theft, paywall bypass services, residential proxy scraping
    - novelty of the ideas below is therefore unconfirmed
- ChatGPT consultation was not possible: the tool failed with "account_ui_login_required"
- related studies in this tree, not repeated here
    - [crawling, including robots.txt and the AI crawler backlash](../../web_llm_detection/web_infra/crawling.md)
    - [image watermarking](../../web_llm_detection/llm_provenance/image_watermarking.md) and [text watermarking](../../web_llm_detection/llm_provenance/text_watermarking.md)
    - [C2PA](../../web_llm_detection/llm_provenance/c2pa.md) and [photo provenance](provenance.md)
    - [search spam](spam_campaigns.md), which covers content farms

the fight has five places

- 1: at the door: tell or force crawlers to stay out
- 2: in the content: change it so a copy is useless
- 3: after the fact: prove a model used it, or find the copy and prove you were first
- 4: in court and in law
- 5: in the market: get paid instead

## 1: at the door

who says no

- Longpre et al., [Consent in Crisis](https://arxiv.org/abs/2407.14933), NeurIPS 2024, abstract
    - robots.txt and terms of service of 14,000 web domains used in AI training sets, over time
    - "in a single year (2023-2024) there has been a rapid crescendo of data restrictions from web sources, rendering ~5%+ of all tokens in C4, or 28%+ of the most actively maintained, critical sources in C4, fully restricted from use"
    - "general inconsistencies between websites' expressed intentions in their Terms of Service and their robots.txt"
- Fletcher, Reuters Institute, [How many news websites block AI crawlers?](https://reutersinstitute.politics.ox.ac.uk/how-many-news-websites-block-ai-crawlers), 2024, fetched
    - 15 most-used news sites in each of 10 countries, robots.txt from the Wayback Machine for every day of 2023
    - "48% of the most widely used news websites across ten countries were blocking OpenAI's crawlers"; 24% blocked Google's AI crawler
    - from 79% in the US down to 20% in Mexico and Poland
- Steinacker-Olsztyn, Gosain, Dao, [Is Misinformation More Open?](https://arxiv.org/abs/2510.10315), WWW 2026, abstract
    - "60.0% of reputable sites disallow at least one AI crawler, compared to just 9.1% of misinformation sites"
    - "AI-blocking by reputable sites rising from 23% in September 2023 to nearly 60% by May 2025"
    - my reading: good sources leave the training data faster than bad ones
- individual creators mostly cannot say no
    - Liu et al., [Somesite I Used To Crawl](https://arxiv.org/abs/2411.15091), IMC 2025, read
        - survey of 203 professional artists, 1,182 artist sites, crawler tests on their own sites
        - "59% of artists have never heard about the term "robots.txt""
        - most artists use hosting services that do not let them edit robots.txt
        - Squarespace has a one-click switch, yet "only 49 (17%) of the 293 artists who use Squarespace had enabled this option"
        - "there are no existing standard mechanisms for explicitly controlling whether publicly accessible Web content is used in training AI models"

who obeys

- Kim et al., [Scrapers Selectively Respect robots.txt Directives](https://arxiv.org/abs/2505.21733), IMC 2025, read
    - changed robots.txt on their university's sites and watched who obeyed
        - "approximately 3.9 million external web requests made to a set of 36 websites from February 12 - March 29, 2025"
        - "130 self-declared bots (and many anonymous ones) over 40 days"
    - "bots are less likely to comply with stricter robots.txt directives, and that certain categories of bots, including AI search crawlers, rarely check robots.txt at all"
    - some never fetched the file: "9/34 for the crawl delay experiment, and 15/47 for both the endpoint access and the disallowall experiments"
    - limits: "only considered traffic from 36 websites owned by our institution"; could not settle whether a bot lies about its name
- Liu et al., same paper, read
    - "most large AI companies currently do respect robots.txt. However, a number of AI-powered apps and crawlers do not respect it (including crawlers from ByteDance)"
- Lopez-Fonseca et al., [Do Generative AI Assistants Respect robots.txt?](https://arxiv.org/abs/2607.14447), arXiv July 2026, abstract
    - ten AI assistants with web search, own test pages with "secret codes embedded in target pages", 200 trials
    - "Some systems followed the expected allowed/disallowed access pattern, whereas others accessed restricted resources without requesting robots.txt or used generic user-agents that complicated attribution"
    - this is the closest prior work to idea 1; it tests direct fetches only
- Cloudflare, [Perplexity is using stealth, undeclared crawlers](https://blog.cloudflare.com/perplexity-is-using-stealth-undeclared-crawlers-to-evade-website-no-crawl-directives/), Aug 2025, fetched
    - "We created multiple brand-new domains", with robots.txt that banned all bots; Perplexity still answered questions about them
    - Perplexity's named crawler made 20–25 million requests a day; the unnamed one, 3–6 million
    - OpenAI's fetcher "fetched the robots file and stopped crawling when it was disallowed"
    - limits: one vendor's blog; Perplexity disputed it, I did not check how
- Jaźwińska and Chandrasekar, Tow Center, [AI Search Has A Citation Problem](https://www.cjr.org/tow_center/we-compared-eight-ai-search-engines-theyre-all-bad-at-citing-news.php), Columbia Journalism Review, March 2025, fetched
    - "Perplexity's free version correctly identified all ten excerpts from paywalled articles we shared from National Geographic, even though the publisher has disallowed Perplexity's crawlers"
    - the route is unknown; a side road is one explanation
- industry numbers, not peer reviewed
    - TollBit, first half of 2026, as reported by [Relevant Audience](https://www.relevantaudience.com/seo/tollbit-ai-fetchers-reached-disallowed-urls-europe/), fetched: "roughly 15 percent of identified AI page fetching agents reached URLs that robots.txt disallowed" on European sites
        - the same article says OpenAI's documentation states that "robots.txt rules may not apply" when a ChatGPT user starts the request
    - BuzzStream, March 2026, as reported by [PPC Land](https://ppc.land/blocking-ai-crawlers-doesnt-stop-citations-new-data-shows-why/), fetched: top 50 news sites that block AI crawlers, "4 million citations across 3,600 prompts"
        - "Roughly 70% of all ChatGPT citations in the dataset came from sites that block ChatGPT's retrieval bots"
        - it lists four possible roads and settles none: indexed before the block, Common Crawl archives, bots ignoring the block, and AI products that "pull data directly from search engine results pages"
        - limit: a marketing company's study; being cited is not the same as the page text being read
- side roads alleged in court, snippet
    - Reddit v. SerpApi and Perplexity, S.D.N.Y.: Reddit says Perplexity got Reddit text out of Google results through a scraping company; motion to dismiss "largely denied" 31 July 2026

what crawlers cost

- Wikimedia Foundation, [How crawlers impact the operations of the Wikimedia projects](https://diff.wikimedia.org/2025/04/01/how-crawlers-impact-the-operations-of-the-wikimedia-projects/), April 2025, fetched
    - "Since January 2024, we have seen the bandwidth used for downloading multimedia content grow by 50%"
    - "At least 65% of this resource-consuming traffic we get for the website is coming from bots"; "The overall pageviews from bots are about 35% of the total"
- Cloudflare, [AI Labyrinth](https://blog.cloudflare.com/ai-labyrinth/), March 2025, fetched: "AI Crawlers generate more than 50 billion requests to the Cloudflare network every day, or just under 1% of all web requests"

stronger doors

- blocking by a reverse proxy, a service that sits in front of the site
    - Liu et al., read: of top 10k sites on Cloudflare, "only 107 (5.7%) sites enable Cloudflare's Block AI Bots option"; "Cloudflare's feature blocks 17 AI user agents"
    - it cannot "stop AI training for Meta, Google, and Webzio": they use one crawler for search and AI, so blocking it also removes you from search
    - Cloudflare, [Content Independence Day](https://blog.cloudflare.com/content-independence-day-no-ai-crawl-without-compensation/), 1 July 2025, fetched: "changing the default to block AI crawlers unless they pay creators for their content"
- proof of work: make every visitor's browser solve a small puzzle first
    - [Anubis](https://github.com/TecharoHQ/anubis), open source, 23.1k GitHub stars, fetched
        - "Anubis is a bit of a nuclear response. This will result in your website being blocked from smaller scrapers and may inhibit 'good bots' like the Internet Archive"
    - no measurement paper found on whether it stops AI crawlers or what it costs real visitors
- traps: feed a misbehaving crawler endless made-up pages
    - Cloudflare AI Labyrinth, fetched: "AI-generated set of linked pages when we detect inappropriate bot activity"
    - the page gives no numbers on whether it works; open source tarpits Nepenthes and iocaine not searched
- new signals, all still requests that nothing enforces
    - Dinzinger, Heß, Granitzer, [A Survey of Web Content Control for Generative AI](https://arxiv.org/abs/2404.02309), arXiv 2024, abstract: site owners "are overwhelmed by the multitude of recent ad hoc standards"
    - Cloudflare [content signals](https://blog.cloudflare.com/content-signals-policy/), fetched: lines in robots.txt such as `Content-Signal: search=yes, ai-train=no`; Cloudflare says over 3.8 million domains use its managed robots.txt
    - IETF AIPREF: a draft standard vocabulary for such preferences; [version 07](https://datatracker.ietf.org/doc/draft-ietf-aipref-vocab/), Aug 2026, not final
    - [RSL](https://rslstandard.org/), Really Simple Licensing 1.0, Dec 2025, fetched: a site states license and price terms in robots.txt; backed by Cloudflare, Akamai, Fastly, Reddit and others; the page names no AI company that honors it
    - Web Bot Auth, an [IETF working group](https://datatracker.ietf.org/wg/webbotauth/about/): bots sign their requests so a site knows who is really asking
    - Liu et al., read: the `noai` page tag is nearly unused; among the top 10k sites, "only 17 sites having noai"
    - 🧑 from the [human's C2PA paper notes](../../../c2pa/papers.md), on Keller and Warso 2023: "C2PA has entry to opt out of ML training"
- EU rule that gives opt-outs teeth, fetched as a summary only, check the wording
    - [General-Purpose AI Code of Practice, copyright chapter](https://code-of-practice.ai/?section=copyright), measure 1.3: signers' crawlers must follow robots.txt as in RFC 9309 and other widely adopted opt-out signals
    - measure 1.2: no getting around paywalls; leave out known piracy sites
    - the code is voluntary; I found no audit of whether signers keep it

## 2: in the content

image cloaks

- Shan et al., [Glaze](https://arxiv.org/abs/2302.04222), USENIX Security 2023, abstract
    - adds a small change to an artwork so that a model trained on it copies the style badly
    - "even at low perturbation levels (p=0.05), Glaze is highly successful at disrupting mimicry under normal conditions (>92%) and against adaptive countermeasures (>85%)"
- Shan et al., [Nightshade](https://arxiv.org/abs/2310.13828), IEEE S&P 2024, abstract
    - images that look normal but teach the model the wrong thing about a word
    - "can corrupt an Stable Diffusion SDXL prompt in <100 poison samples"
    - "a last defense for content creators against web scrapers that ignore opt-out/do-not-crawl directives"
    - limit: tested on models the authors trained; I found no public sign that a commercial model was hurt
- how many people use them, snippet: MIT Technology Review, Sept 2024, "Glaze has been downloaded nearly 3.5 million times (and Nightshade over 700,000)"
    - downloads are not users, and users are not cloaked images on the web
- same idea for web text: Liu et al., [ExpShield](https://arxiv.org/abs/2412.21123), NDSS 2026, abstract
    - invisible changes to a page's text so a model trained on it memorizes less
    - "the Membership Inference Attack (MIA) AUC drops from 0.95 to 0.55 under the defense"
    - tested on models the authors trained; I did not find an attack paper on it yet
- same idea elsewhere, all snippet: faces (PhotoGuard 2023, Anti-DreamBooth ICCV 2023, MetaCloak CVPR 2024), music (HarmonyCloak, IEEE S&P 2025), code (CoProtector, WWW 2022)

the cloaks get broken

- Hönig, Rando, Carlini, Tramèr, [Adversarial Perturbations Cannot Reliably Protect Artists From Generative AI](https://arxiv.org/abs/2406.12027), 2024 (I believe ICLR 2025), abstract
    - "low-effort and "off-the-shelf" techniques, such as image upscaling, are sufficient to create robust mimicry methods that significantly degrade existing protections"
    - "they only provide a false sense of security"
- Foerster et al., [LightShed](https://www.usenix.org/conference/usenixsecurity25/presentation/foerster), USENIX Security 2025, abstract
    - learns the cloak pattern from public cloaked examples, detects it, removes it
    - "a TPR of 99.98% and TNR of 100% on detecting NightShade": it catches nearly every poisoned image and flags no clean one
    - useful for us: a detector for cloaked images exists
- Cao et al., [IMPRESS](https://arxiv.org/abs/2310.19248), NeurIPS 2023, abstract: cleans an image by making it agree with its own rebuilt version
- Radiya-Dixit et al., [Data Poisoning Won't Save You From Facial Recognition](https://arxiv.org/abs/2106.14851), ICLR 2022, abstract
    - the root problem: you cloak a picture once, then every later model gets a try
- the Glaze team's view, [Glaze FAQ](https://glaze.cs.uchicago.edu/faq.html), fetched
    - asked whether Glaze has been broken: "No, it has not"
    - "At this time, we do not believe Glaze provides consistent protection against img2img attacks, including style transfer and inpainting"
- my take: cloaking is a losing race for the artist, so I would not build a new cloak; measuring cloaks in the wild is still open

## 3: after the fact

can you prove a model trained on your work

- guessing from the model's confidence does not work
    - membership inference: ask whether the model is oddly sure about your text
    - Duan et al., [Do Membership Inference Attacks Work on Large Language Models?](https://arxiv.org/abs/2402.07841), COLM 2024, abstract
        - "MIAs barely outperform random guessing for most settings across varying LLM sizes and domains"
        - earlier wins came from test sets where trained-on and not-trained-on texts differed in date
    - Zhang, Das, Kamath, Tramèr, [Membership Inference Attacks Cannot Prove that a Model Was Trained On Your Data](https://arxiv.org/abs/2409.19798), SaTML 2025, abstract
        - "fundamentally unsound": you cannot measure how often the test cries wolf, because you cannot retrain the model without your data
        - what is sound: "data extraction attacks and membership inference on special canary data"
        - canary: made-up marker text that exists nowhere else
    - Maini et al., [LLM Dataset Inference](https://arxiv.org/abs/2406.06443), NeurIPS 2024, abstract: tests a whole collection instead of one text; works on open models with known training data, at weak confidence, "p-values < 0.1"
- planting markers before you publish does work, in the lab
    - Wei, Wang, Jia, [Proving membership in LLM pretraining data via data watermarks](https://arxiv.org/abs/2402.10892), Findings of ACL 2024, abstract
        - insert random strings or look-alike Unicode letters; because you picked them at random, the false alarm rate is known
        - works "provided that the rightholder contributed multiple training documents and watermarked them before public release"
        - on a real large model: "we can robustly detect hashes from BLOOM-176B's training data, as long as they occurred at least 90 times"
    - Meeus et al., [Copyright Traps for Large Language Models](https://arxiv.org/abs/2402.09363), ICML 2024, abstract
        - "even medium-length trap sentences repeated a significant number of times (100) are not detectable using existing methods. However, we show that longer sequences repeated a large number of times can be reliably detected (AUC=0.75)"
        - tested on a 1.3B model they trained themselves
    - Sander et al., [Watermarking Makes Language Models Radioactive](https://arxiv.org/abs/2402.14904), NeurIPS 2024, abstract: training on watermarked model output leaves a trace, found "even when as little as 5% of training text is watermarked"
    - for images: Bouaziz, Usunier, El-Mhamdi, [Data Taggants](https://arxiv.org/abs/2410.09101), ICLR 2025, abstract: slightly altered images make a trained model answer secret key images in a known way, giving "statistical certificates with black-box access only"
    - Cui, Wei, Swayamdipta, Jia, [Robust Data Watermarking in Language Models by Injecting Fictitious Knowledge](https://arxiv.org/abs/2503.04036), Findings of ACL 2025, abstract
        - the marker is a made-up fact about a made-up thing, written as normal prose, so data cleaning does not throw it out
        - "our data watermarks can be evaluated even under API-only access via question answering": you just ask the model about the made-up thing
    - Weinberg, [SIGIL](https://arxiv.org/abs/2606.06502), arXiv 2026, abstract: five kinds of marker; results come from a simulator, not from trained models
    - also seen by title only: SPECTRA (arXiv 2512.17075), markers for retrieval systems (arXiv 2502.10673)
    - the gap: I found no test of an owner's planted marker against a commercial model
- pulling your text back out works for famous works
    - Nasr et al., [Scalable Extraction of Training Data from (Production) Language Models](https://arxiv.org/abs/2311.17035), arXiv 2023, abstract: an attack makes ChatGPT "emit training data at a rate 150x higher than when behaving properly"
    - Ahmed, Cooper, Koyejo, Liang, [Extracting books from production language models](https://arxiv.org/abs/2601.02671), arXiv Jan 2026, abstract
        - "it was unnecessary to jailbreak Gemini 2.5 Pro and Grok 3 to extract text (e.g, nv-recall of 76.8% and 70.3%, respectively, for Harry Potter and the Sorcerer's Stone)"
        - nv-recall: the share of the book that came back nearly word for word
        - GPT-4.1 "eventually refuses to continue (e.g., nv-recall=4.0%)"
    - Chen et al., [CopyBench](https://arxiv.org/abs/2407.07087), arXiv 2024, abstract: bigger models copy more, "literal copying rates increasing from 0.2% to 10.5%" from Llama3-8B to 70B
    - Carlini et al., [Extracting Training Data from Diffusion Models](https://arxiv.org/abs/2301.13188), 2023, abstract: "we extract over a thousand training examples from state-of-the-art models"
    - Xu et al., [LiCoEval](https://arxiv.org/abs/2408.02487), ICSE 2025, abstract: 14 code models produce "a non-negligible proportion (0.88% to 2.01%) of code strikingly similar to existing open-source implementations", mostly without the right license
    - limit: famous books appear thousands of times in training data; an ordinary web page appears once

do AI answers credit you

- Liu, Zhang, Liang, [Evaluating Verifiability in Generative Search Engines](https://arxiv.org/abs/2304.09848), Findings of EMNLP 2023, abstract: "a mere 51.5% of generated sentences are fully supported by citations and only 74.5% of citations support their associated sentence"
- Tow Center, March 2025, fetched: eight AI search tools, 1,600 queries asking where a news quote came from
    - "provided incorrect answers to more than 60 percent of queries"
    - "More than half of responses from Gemini and Grok 3 cited fabricated or broken URLs"

finding copies made by people and sites

- matching text is old and cheap
    - Broder, [On the resemblance and containment of documents](https://www.cs.princeton.edu/courses/archive/spring13/cos598C/broder97resemblance.pdf), 1997, read by the earlier Codex agent
        - compares small random samples of word runs instead of whole pages; tells "roughly the same" from "roughly contained"
    - Schleimer, Wilkerson, Aiken, [Winnowing](https://theory.stanford.edu/~aiken/publications/papers/sigmod03.pdf), SIGMOD 2003, read by the earlier Codex agent
        - catches any shared run longer than a set length, "including small partial copies"
        - breaks under translation or heavy rewriting, which is what an AI rewrite does
    - a match is not a verdict; [Moss](https://theory.stanford.edu/~aiken/moss/): "the scores are certainly not a proof of plagiarism"
- matching images is easy to dodge
    - Jain, Cretu, de Montjoye, [Adversarial Detection Avoidance Attacks](https://arxiv.org/abs/2106.09820), USENIX Security 2022, abstract
        - perceptual hash: a short fingerprint that stays the same when a picture changes a little
        - "more than 99.9% of images successfully attacked while preserving the content of the image"
- AI rewrites at scale
    - NewsGuard, [AI Tracking Center](https://www.newsguardtech.com/special-reports/ai-tracking-center/), fetched, updated 23 June 2026: "identified 3,749 AI Content Farm news and information websites"
    - Puccetti et al., [AI 'News' Content Farms Are Easy to Make and Hard to Detect](https://arxiv.org/abs/2406.12128), ACL 2024, abstract: "there are currently no practical methods for detecting synthetic news-like texts 'in the wild'"
- search engines say they punish copies; nobody outside checks
    - Google, [spam policies](https://developers.google.com/search/docs/essentials/spam-policies), fetched: "When we receive a significant volume of valid copyright removal requests involving a given site, we are able to use that to demote other content from the site in our results"
    - Google, [How Google Fights Piracy](https://storage.googleapis.com/gweb-uniblog-publish-prod/documents/How_Google_Fights_Piracy_2018.pdf), 2018, read: "demoted sites lost an average of 89% of their traffic from Google Search"
    - I found no independent count of how often a copy outranks its original

takedown

- how it works in the US: you send a notice, the host or search engine removes the link, the other side may object
- notices are often wrong or abused
    - Google 2018, read: "Content owners have notified us about 882 Million URLs in 2017 alone. Google removed more than 95% of these webpages, meaning we pushed back on around 54 million removal requests that were incomplete, mistaken, or abusive"
    - Urban, Karaganis, Schofield, [Notice and Takedown in Everyday Practice](https://papers.ssrn.com/abstract=2755628), 2016, snippet; the paper could not be opened
        - about 30% of sampled notices to Google web search raised questions about validity; 70% in a Google image search sample
    - Harvard Law Today on Eugene Volokh's work with the Lumen notice archive, [Shedding light on fraudulent takedown notices](https://hls.harvard.edu/today/shedding-light-on-fraudulent-takedown-notices/), fetched
        - "close to 200 out of 700 court orders submitted to Google were ... 'either obviously forged or fraudulent or at least highly suspicious cases,' including at least 80 outright forgeries"
    - back-dating trick, snippet, from a Lumen blog post I could not open: copy a real article, give the copy an earlier date, then report the real one as the copy; about 34,000 such notices from June 2019 to January 2022
- YouTube Content ID, Google 2018, read: "Fewer than 1% of Content ID claims are disputed, and of that number, over 60% resolve in favor of the uploader"
- takedown removes a link, the copy lives on
    - U.S. Copyright Office, [Section 512 Report](https://www.copyright.gov/policy/section512/section-512-full-report.pdf), 2020, read by the earlier Codex agent: pp 54–55 separate removal from stopping the next upload
- EU: platforms must log every removal in a public database
    - Kaushal et al., [Automated Transparency](https://arxiv.org/abs/2404.02894), FAccT 2024, abstract: "131m" records from November 2023; "compliance remains problematic"; not split out for copyright
- proving who was first
    - [OpenTimestamps](https://opentimestamps.org/), fetched: "A timestamp proves that some data existed prior to some point in time"
    - it helps only if you stamped at publish time, and it shows the file existed, not who wrote it
    - I found no study of timestamps used in takedown disputes

piracy

- Rafique et al., [It's Free for a Reason](https://lirias.kuleuven.be/retrieve/356111), NDSS 2016, read: free sports streaming sites
    - "more than 850,000 visits by identifying 5,685 free live streaming domains"
    - "on average, 50% of the time, a click on an overlay ad leads the user to a malware-hosting webpage"
    - "more than 30% have been reported at least once by copyright owners"
- Himmelstein et al., [Sci-Hub provides access to nearly all scholarly literature](https://elifesciences.org/articles/32822), eLife 2018, read: "Sci-Hub's database contains 68.9% of the 81.6 million scholarly articles registered with Crossref"
- Ahn et al., [Watch Out Your TV Box](https://www.usenix.org/conference/usenixsecurity25/presentation/ahn), USENIX Security 2025, abstract: took apart a pirate TV box and its peer-to-peer network; "131,175 unique users and 78 servers" in two months
- Roudot and Sabt, [Narrowbeer](https://www.usenix.org/conference/usenixsecurity25/presentation/roudot), USENIX Security 2025, abstract: breaks Widevine, the lock on most streaming video, so that licenses never expire
- piracy now feeds AI: see Bartz v. Anthropic below

## 4: in court and in law

- US: training looks legal so far; how you got the copies matters
    - Bartz v. Anthropic, N.D. Cal.
        - June 2025 ruling, snippet: training on books is fair use, "transformative—spectacularly so"; keeping a library of pirated books is not
        - settlement, [Authors Guild](https://authorsguild.org/news/court-grants-final-approval-anthropic-copyright-settlement/), fetched: "the landmark $1.5 billion class action settlement", final approval "On July 20, 2026"
        - about $3,000 per book, "four times the statutory minimum for ordinary infringement"
        - covers only "Anthropic's past acquisition and copying of their works—the 'inputs' side—through August 25, 2025"; claims about what the model outputs stay open
    - Kadrey v. Meta, June 2025, snippet: fair use for training; the claim about sharing pirated books by torrent continues
    - Thomson Reuters v. ROSS, 3rd Circuit, 29 Sept 2026, [Ballard Spahr summary](https://www.ballardspahr.com/insights/alerts-and-articles/2026/10/third-circuit-addresses-fair-use-in-ai-training-but-leaves-generative-ai-questions-unresolved), fetched: not fair use, but for a search tool that competed directly; "ROSS's AI platform cannot generate original expression"
    - New York Times v. OpenAI and Disney v. Midjourney: pending, snippet
    - U.S. Copyright Office, [Copyright and Artificial Intelligence, Part 3: Generative AI Training](https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-3-Generative-AI-Training-Report-Pre-Publication-Version.pdf), pre-publication May 2025, read
        - p 106: "the Office recommends allowing the licensing market to continue to develop without government intervention. If market failures are shown as to specific types of works in specific contexts, targeted intervention such as ECL should be considered"
        - ECL, extended collective licensing: one body licenses a whole class of works for everyone, including owners who never signed up
- Europe: courts disagree on whether a model contains a copy, snippet
    - GEMA v. OpenAI, Munich, Nov 2025: song lyrics a model can recite count as a copy inside the model
    - Getty v. Stability AI, UK High Court, Nov 2025: the model is not an "infringing copy"
    - EU law lets owners reserve their rights in machine-readable form, which is why robots.txt and its successors matter legally there
- my take: courts reward evidence of how content was obtained and of word-for-word output; both are things a measurement person can produce

## 5: in the market

- deals exist for the big, snippet, press reports: News Corp–OpenAI "more than $250 million" over five years; Reddit–Google about $60 million a year
- small sites get tools that are not open to them yet
    - Cloudflare [pay per crawl](https://developers.cloudflare.com/ai-crawl-control/features/pay-per-crawl/what-is-pay-per-crawl/), fetched: the site answers a crawler with "402 Payment Required" and a price; "Pay per crawl is currently in closed beta"
    - no public numbers on money paid
- visitors are falling
    - Pew Research Center, [Google users are less likely to click on links when an AI summary appears](https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/), July 2025, fetched
        - 900 US adults, 68,879 Google searches in March 2025
        - "Users who encountered an AI summary clicked on a traditional search result link in 8% of all visits. Those who did not encounter an AI summary clicked on a search result nearly twice as often (15% of visits)"
        - a link inside the summary got a click "in just 1% of all visits"
    - Khosravi and Yoganarasimhan, [Impact of AI Search Summaries on Website Traffic](https://arxiv.org/abs/2602.18455), arXiv 2026, abstract
        - compares English Wikipedia articles with the same articles in German and French while Google's AI summaries reached countries at different times
        - "default AIO availability reduced English search traffic by 5.45% and 4.82%, respectively"
    - del Rio-Chanona, Laurentsyeva, Wachs, [Large language models reduce public knowledge sharing on online Q&A platforms](https://pmc.ncbi.nlm.nih.gov/articles/PMC11421660/), PNAS Nexus 2024, fetched: "Within 6 months of ChatGPT's release, activity on Stack Overflow decreased by 25% relative to its Russian and Chinese counterparts"
    - Cloudflare, [crawl-to-refer ratio](https://blog.cloudflare.com/ai-search-crawl-refer-ratio-on-radar/), July 2025, fetched: pages crawled per visitor sent back; 70,900 to 1 for Anthropic in one June 2025 week
        - Cloudflare's own caveat: visits from apps carry no referrer, so the numbers "may overstate the respective ratios, but it is unclear by how much"
- saying no has a price
    - Grossman et al., [How Generative AI Disrupts Search](https://arxiv.org/abs/2604.27790), SIGIR 2026, abstract: 11,500 queries
        - "for 51.5% of representative, real-user queries, AIOs are generated, and are displayed above the organic search results"
        - "websites that block Google's AI crawler are significantly less likely to be retrieved by AIOs, despite having access to the content"
        - it is a correlation; sites that block may differ in other ways
    - Zhao and Berman, [The Impact of LLMs on Online News Consumption and Production](https://arxiv.org/abs/2512.24968), arXiv Dec 2025, snippet; the page fetch failed, so check the wording
        - compares large news publishers that blocked AI bots in robots.txt with ones that did not, before and after
        - blocking reduced "total website traffic by 23% and real consumer traffic by 14% compared to not blocking"
        - about 30 large newspaper sites; small sites not covered

## research ideas

what I would not do

- a new cloak or poison: attackers get the last move
- a new membership inference test: the best paper on it says the approach cannot give proof
- law or pricing: no systems contribution

idea 1: side-road audit of AI opt-outs

- question: when a site says no to AI but yes to search, which AI products still know what is on it, and by which road
- why open
    - Lopez-Fonseca 2026 and Cloudflare 2025 test only whether the AI product fetches the page itself
    - BuzzStream 2026 sees blocked news sites cited anyway and cannot tell which road the content took
    - Reddit's lawsuit and the Tow Center paywall finding point at side roads: search engine indexes, scraping companies, shared caches
    - no audit found of content signals, RSL, or the EU code's measure 1.3 promise
- build
    - a few hundred fresh domains, each page holding a unique secret code, as Lopez-Fonseca did
    - vary one setting per group: robots.txt for AI bots, content signals, RSL terms, a login wall, a proxy block
    - let search engines index all of them
    - ask each AI assistant and AI search product about each page every month
    - record all site requests and acquired markers
        - distinguish observed direct requests, possible indirect access, and unresolved paths
        - an absent recognized crawler cannot exclude another client identity or intermediary
- first step: 20 domains, 5 products, one month
- possible output: product-specific observations under each signal and known access condition
    - marker acquisition alone does not establish ignored terms or a particular collection path
- risks
    - fresh domains may never get indexed or asked about; seed them with links
    - products change weekly, so results are a snapshot; turn that into a monthly tracker
- cheap add-on: put a tarpit and Anubis on some groups and report who falls in and what it costs real browsers; nobody has published that

idea 2: marker experiment, does opting out keep you out of the next model

- question: if I plant marker text today, does it show up in models released next year, and does an opt-out prevent that
- why open
    - Zhang 2025: planted markers are one of the few sound proofs
    - the cited Wei 2024 and Meeus 2024 experiments used controlled models or BLOOM
    - this reading did not establish whether commercial opt-out marker comparisons already exist
        - perform a fresh closest-work check before claiming a gap
- build
    - reuse idea 1's domains; each group gets its own random marker strings, repeated on many pages
    - Wei 2024 needed about 90 copies in a 176B-parameter model, so plan for hundreds of copies per group
    - use Cui 2025's made-up facts as markers: they survive data cleaning and can be tested by plain questions
    - at each new model release, ask about each group's made-up facts and about control facts never published; controls give the false alarm rate
    - disable exposed web-search features and record the settings
        - hidden retrieval, caches, and copied pages can still explain marker acquisition
        - claim training membership only when alternative access paths are independently excluded
- possible contribution: measured opt-out differences under known collection and model-access conditions
    - commercial marker experiments require a fresh closest-work check
- risks
    - a year or more of waiting
    - a few hundred small new sites may be too little text for any model to remember
    - a miss proves nothing: the marker may just be too weak
- I would start it early because it only costs waiting

idea 3: the price of saying no

- question: what does a site lose in search and AI visibility when it blocks AI crawlers
- why open: Grossman 2026 shows a correlation for Google AI summaries only; owners decide today without numbers
- build
    - find sites whose robots.txt started or stopped blocking AI crawlers, from Common Crawl and Wayback Machine history
    - compare their visibility before and after against similar sites that did not change: rank lists such as Tranco, how often AI summaries and assistants cite them for a fixed query set
    - on own test sites from idea 1, flip the setting on purpose and watch
- why it sells: every publisher asks this question
- risks: public traffic data is coarse; sites that change robots.txt often change other things at once

other ideas, weaker or less checked

- count cloaked images in the wild
    - run a LightShed-style detector over images from artist sites and public image crawls; join with the site's robots.txt
    - answers "do artists who cloak also opt out" and "how much poison is out there"; no prior count found
    - needs GPU time and LightShed's code or a rebuild
- how often does the copy outrank the original
    - take new articles from feeds, find copies with Broder-style matching plus a meaning-based match for AI rewrites, check search ranks over weeks
    - overlaps with the [search spam study](spam_campaigns.md)
- proof of first publication
    - stamp pages at publish time, then replay known back-dating cases from the Lumen notice archive to see how many it would have settled
    - needs researcher access to Lumen
- carried over from the earlier Codex agent
    - follow copies after takedown: with 20 cooperating creators, check weekly for three months whether removed copies return under new addresses
    - a copy-evidence tool that shows matched passages and dates, and counts false accusations against quotes and licensed reprints
- check Cloudflare's crawl-to-refer numbers against sites that log both crawls and real visits, to learn how much app traffic the referrer misses

8 October marker-test constraint

- a returned marker establishes that the product acquired it through some path
    - turning off visible search does not prove that hidden retrieval, cached answers, or copied pages are absent
    - training membership needs controlled training data or independently established access restrictions
- compare publication with blocking from the start against blocking after indexing
    - retain server logs and query histories, but missing fetches do not rule out indirect access
    - keep never-published markers and record unintended copies
    - a missing marker remains weak negative evidence
- closest controlled-training work already appears above
    - [Meeus et al., Copyright Traps](https://proceedings.mlr.press/v235/meeus24a.html), ICML 2024
    - [Wei et al., data watermarks](https://arxiv.org/abs/2402.10892), Findings of ACL 2024
    - reproduce those controlled conditions before claiming training detection from a live commercial assistant
