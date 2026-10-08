web crawling in the age of language models
(authored by agents unless marked 🧑)

- written 2026-10-07
    - quotes are verbatim from the abstract, the body, or the web page I link
    - source claims and my inferences are distinguished
    - blog posts and vendor reports are marked as such
        - they are the only source for most traffic numbers, and their underlying logs are not independently available
    - novelty checks are incomplete
        - search coverage limits appear at the end
    - this file starts where the robots.txt section of [crawling.md](crawling.md) stops
        - papers already quoted there get one line here

the picture in plain words

- three kinds of machine now fetch web pages for language models, and sites treat them very differently
    - training crawlers (GPTBot, ClaudeBot, Meta-ExternalAgent, Bytespider, CCBot): bulk download, no visitor comes back
    - search crawlers (OAI-SearchBot, PerplexityBot): build an index that an assistant answers from
    - user fetchers and agents (ChatGPT-User, Perplexity-User, Operator, browser agents): fetch one page because one person asked, sometimes through a real browser
- what people try to find out
    - how much load these machines put on a site, and who pays
    - whether they do what robots.txt says
    - what site owners do about it, and whether it works
    - what the machine gets back: the same page a person gets, a block page, a paywall price, a maze of junk, or text written to mislead a model
    - what assistants fetch and cite at answer time, and how old it is
- how they do it
    - read robots.txt files of many sites over time (Common Crawl, the Wayback Machine, own crawls)
    - read server logs of sites they run, or set up bait sites and change robots.txt on purpose
    - plant secret strings in pages and ask the chatbots about them
    - fetch the same URL under different user agents and compare
    - ask assistants thousands of questions and collect the links they cite
- my take
    - at least seven reviewed studies measure robots.txt blocking
        - those rules express intent rather than actual access
    - the effect side is thin: one university's logs for 40 days is the best public compliance data, and the large traffic estimates reviewed come from vendors selling bot control
    - the defenses that spread fastest in 2025 and 2026 (proof of work, junk mazes, HTTP 402 pricing) have no measurement paper that I could find, only blog posts arguing both ways
    - the reviewed literature does not measure these page differences across many sites
        - the attack papers show it can be done, the measurement papers only count blocks

the rules: robots.txt and what is being added to it

- [A Standard for Robot Exclusion](https://www.robotstxt.org/orig.html), Koster, 1994 (web page)
    - "It is not an official standard backed by a standards body, or owned by any commercial organisation. It is not enforced by anybody, and there no guarantee that all current and future robots will use it."
- [RFC 9309: Robots Exclusion Protocol](https://www.rfc-editor.org/rfc/rfc9309), Koster, Illyes, Zeller, Sassman, IETF, 2022
    - "These rules are not a form of access authorization."
    - fact, the parts a crawler can get wrong: "If the robots.txt file is unreachable due to server or network errors, this means the robots.txt file is undefined and the crawler MUST assume complete disallow"
        - crawlers "SHOULD NOT use the cached version for more than 24 hours, unless the robots.txt file is unreachable"
    - open: the file can say which paths, per crawler name
        - it cannot say what the content may be used for, and it cannot check that the crawler is who it says
- [Determining Bias to Search Engines from Robots.txt](https://clgiles.ist.psu.edu/papers/WI2007-robots.txt.pdf), Sun, Zhuang, Councill, Giles, WI 2007 (short version at WWW 2007)
    - "investigated 7,593 websites covering education, government, news, and business domains, and collected 2,925 distinct robots.txt files"
        - "the robots of popular search engines and information portals, such as Google, Yahoo, and MSN, are generally favored by most of the websites"
    - why it matters now: the same "rich get richer" worry, with Googlebot allowed and GPTBot blocked
- [A Larger Scale Study of Robots.txt](https://archives.iw3c2.org/www2008/papers/pdf/p1171-kolay.pdf), Kolay, D'Alberto, Dasdan, Bhattacharjee, WWW 2008 (poster)
    - "about 2.2M non-empty robots.txt files from 6M sites"
        - "some sites may have bias towards specific crawlers but overall the top two crawlers seem to have access to the same amount of content. This is contrary to the point made by the previous study."
    - lesson: counting rules per crawler name and counting content actually reachable give different answers
        - most 2024 to 2026 studies only do the first
- [A Survey of Web Content Control for Generative AI](https://arxiv.org/abs/2404.02309), Dinzinger, Heß, Granitzer, arXiv 2024
    - site owners "are overwhelmed by the multitude of recent ad hoc standards to consider"
    - a catalog of the opt-out formats (robots.txt extensions, meta tags, TDM reservation, ai.txt and others) with the legal background
- IETF AI Preferences working group (aipref), drafts, not yet RFCs when I looked
    - [A Vocabulary For Expressing AI Usage Preferences](https://datatracker.ietf.org/doc/draft-ietf-aipref-vocab/): "defines a vocabulary for expressing preferences regarding how digital assets are used by automated processing systems"
    - [Associating AI Usage Preferences with Content in HTTP](https://datatracker.ietf.org/doc/draft-ietf-aipref-attach/): "defines attachment methods using the Robots Exclusion Protocol and HTTP header fields"
        - "This document updates RFC 9309"
        - example in the draft: "Content-Usage: train-ai=n"
    - I did not verify the current revision numbers or milestone dates
    - inference: this adds "used for what" to robots.txt
        - the group's charter leaves enforcement and crawler identity out, so the honor system stays
- [Web Bot Authentication working group (webbotauth)](https://datatracker.ietf.org/wg/webbotauth/about/), IETF charter
    - "will standardize methods for cryptographically authenticating automated clients and providing additional information about their operators to Web sites"
    - the starting draft is [HTTP Message Signatures for automated traffic Architecture](https://datatracker.ietf.org/doc/draft-meunier-web-bot-auth-architecture/): a bot signs its requests, and the site checks the key
    - inference: this fixes "is this really GPTBot"
        - it does nothing about a crawler that prefers to look like Chrome
- [Content Signals Policy](https://blog.cloudflare.com/content-signals-policy/), Cloudflare, 2025 (vendor blog)
    - "defines three content signals - search, ai-input, and ai-train"
        - written as comments plus a line in robots.txt
    - competes with the IETF vocabulary
        - I found no count of how many sites use either
- [The /llms.txt file](https://llmstxt.org/), Howard, 2024 (proposal page)
    - "A proposal to standardise on using an /llms.txt file to provide information to help agents use a website."
    - this one invites machines in (a short markdown guide to the site) instead of keeping them out
    - adoption numbers exist only in marketing reports that I read second hand ([ppc.land summary](https://ppc.land/llms-txt-adoption-rises-8-8x-but-97-of-files-get-zero-ai-requests/) of Originality.ai and Ahrefs: files grew several fold in a year, and almost none get requested by AI crawlers)
        - not verified
- proposals from researchers, none deployed as far as I know
    - [ai.txt: A Domain-Specific Language for Guiding AI Interactions with the Internet](https://arxiv.org/abs/2505.07834), Li et al., arXiv 2025: "enabling precise element-level regulations and incorporating natural language instructions interpretable by AI systems"
    - [Permission Manifests for Web Agents](https://arxiv.org/abs/2601.02371), Marro et al., arXiv 2025: "agent-permissions.json, a robots.txt-style lightweight manifest where websites specify allowed interactions"
        - motive: "website owners increasingly rely on blanket blocking and CAPTCHAs"
    - [terms.txt: A Consent and Compensation Protocol for Agentic Web Access](https://arxiv.org/abs/2609.11152), Chowdhury, arXiv 2026: robots.txt "cannot express identity, purpose, terms, or price"
        - a reference implementation "adds 0.20 to 0.65 ms per request on one vCPU"
    - [Tag Your Fish in the Broken Net](https://arxiv.org/abs/2310.07915), Zhang et al., arXiv 2023: per-item consent tags in HTTP and HTML plus a ledger for withdrawal
    - [Will the Agent Recuse, and Will It Stop?](https://arxiv.org/abs/2606.06460), Munirathinam, arXiv 2026: the same honor-system idea for SSH and databases
        - "recusal to deny ranges from 100% to 55-75% among agents that received it"
        - "reliably stopping a running agent needs enforcement, not a request"
- law, briefly: [The Liabilities of Robots.txt](https://arxiv.org/abs/2503.06035), Chang, He, 2025 argues the file "can give rise to a unilateral contract or serve as a form of notice sufficient to establish tortious liability"
    - [In the Mood to Exclude](https://arxiv.org/abs/2510.16049), Atkinson, 2025 argues for trespass to chattels

who blocks AI crawlers in robots.txt

- already in [crawling.md](crawling.md): Longpre 2024 ("28%+ of the most actively maintained, critical sources in C4, fully restricted"), Bouchaud 2025 (a quarter of the top thousand, "9.5% disallow CCBot"), Steinacker-Olsztyn 2025 (60.0% of reputable news versus 9.1% of misinformation sites)
- [How many news websites block AI crawlers?](https://reutersinstitute.politics.ox.ac.uk/how-many-news-websites-block-ai-crawlers), Fletcher, Reuters Institute, 2024 (factsheet)
    - "By the end of 2023, 48% of the most widely used news websites across ten countries were blocking OpenAI's crawlers. A smaller number, 24%, were blocking Google's AI crawler."
    - blocking of OpenAI ranged "from 79% in the USA to just 20% in Mexico and Poland"
- [Somesite I Used To Crawl](https://arxiv.org/abs/2411.15091), Liu, Luo, Shan, Voelker, Zhao, Savage, IMC 2025
    - beyond what crawling.md quotes: the people who want to block often cannot
    - of 203 artists, "59% have never heard about robots.txt"
        - hosted site builders often do not let them edit it
    - "A small but growing number of websites also explicitly invite AI crawlers to crawl their content."
- [How Do Data Owners Say No?](https://arxiv.org/abs/2511.08637), Lee et al., arXiv 2025
    - fact, for an image and text training set: "60% of the samples in the top 50 domains come from websites with ToS that prohibit scraping"
    - lesson: owners say no in terms of service, copyright notices and watermarks too, and crawlers read none of those
- [Cloudflare Radar 2025 Year in Review](https://blog.cloudflare.com/radar-2025-year-in-review/), Cloudflare, 2025 (vendor report)
    - "The user agents with the highest number of fully disallowed directives are those associated with AI crawlers, including GPTBot, ClaudeBot, and CCBot."
- does blocking cost the site anything
    - [Strategic Response of News Publishers to Generative AI](https://arxiv.org/abs/2512.24968), Zhao, Berman, arXiv 2025: "large publishers who block GenAI bots experience reduced website traffic compared to not blocking"
        - body: "a 7% post-blocking decline in weekly visits measured by SimilarWeb or Semrush within the 6 weeks after blocking"
    - [How Generative AI Disrupts Search](https://arxiv.org/abs/2604.27790), Grossman et al., SIGIR 2026: "websites that block Google's AI crawler are significantly less likely to be retrieved by AIOs, despite having access to the content"
    - open: both are correlations around a choice the site made
        - neither study randomizes blocking
- what this line of work leaves open
    - robots.txt rules are a wish
        - the papers below show the wish and the outcome differ
    - sites that block at the firewall and leave robots.txt alone are invisible to all of these counts (Liu: "many sites indeed use active blocking as their sole" mechanism)

do crawlers obey

- [Scrapers selectively respect robots.txt directives](https://arxiv.org/abs/2505.21733), Kim, Bock, Luo, Liswood, Poroslay, Wenger, IMC 2025
    - what they did: logs of 36 sites at one university, three robots.txt versions of rising strictness, "130 self-declared bots (and many anonymous ones) over 40 days"
    - "Bots are less likely to respect robots.txt that employ strict directives"
        - "SEO bots are most respectful of robots.txt, while search engine crawlers are among the least. AI-specific bots like AI assistants and AI data scrapers, fall in between."
    - some non-compliance "can sometimes be attributed to spoofing, in which malicious bots present a false user agent"
    - open: one institution, 40 days
        - nothing on bots that hide their name
        - nothing on the newer signals (402, Content-Signal, signed requests)
- Liu et al. (above), on their own test sites: "most large AI companies currently do respect robots.txt. However, a number of AI-powered apps and crawlers do not respect it (including crawlers from ByteDance)"
- [Do Generative AI Assistants Respect robots.txt?](https://arxiv.org/abs/2607.14447), Lopez-Fonseca, Rodriguez, Bechtold, Del Alamo, arXiv 2026
    - what they did: ten assistants, four robots.txt conditions, "server-side logs and secret codes embedded in target pages" over 200 trials
    - some "accessed restricted resources without requesting robots.txt or used generic user-agents that complicated attribution"
        - "assistants may access pages without surfacing the retrieved content, or fail to access even allowed resources"
    - fact from the body, a trap for anyone repeating this: an assistant "may instead answer from an intermediate layer such as a search index, cached copy, or other preprocessed" version, so no request reaches the test server at all
- [Identifying AI Web Scrapers Using Canary Tokens](https://arxiv.org/abs/2605.13706), Seiden, Ren, Zhang, Kim, Liu, Wenger, arXiv 2026
    - what they did: "host dynamic websites that serve unique canary tokens to each visiting scraper, then prompt LLMs for information about our sites"
    - across "22 production LLM systems" the method "can reliably identify which scrapers feed which LLM, including several that are not publicly known or disclosed by the companies"
    - why I like it: it links a log line to a model's answer without any help from the company
        - it is the one new measurement trick in this area
    - open: tokens were plain page text
        - nothing about content that needs JavaScript, a click, or a login
- [AI Search Has A Citation Problem](https://www.cjr.org/tow_center/we-compared-eight-ai-search-engines-theyre-all-bad-at-citing-news.php), Jaźwińska, Chandrasekar, Tow Center, 2025 (journalism study)
    - 1,600 queries over eight chatbots
        - "Platforms retrieved information from publishers that had intentionally blocked their crawlers"
        - Perplexity's free version "correctly identified all ten excerpts from paywalled articles we shared from National Geographic, even though the publisher has disallowed Perplexity's crawlers"
    - their own caveat: there are "other means through which the chatbots could obtain information about restricted content"
- [Perplexity is using stealth, undeclared crawlers to evade website no-crawl directives](https://blog.cloudflare.com/perplexity-is-using-stealth-undeclared-crawlers-to-evade-website-no-crawl-directives/), Cloudflare, 2025 (vendor blog, one-sided)
    - claim: "when they are presented with a network block, they appear to obscure their crawling identity"
        - "observed across tens of thousands of domains and millions of requests per day"
- older baseline: [Good Bot, Bad Bot: Characterizing Automated Browsing Activity](https://www.securitee.org/files/goodbotbadbot_oakland2021.pdf), Li, Azad, Rahmati, Nikiforakis, S&P 2021
    - "100 dedicated honeysites" for seven months, "26.4 million requests sent by more than 287K unique IP addresses"
        - comparing claimed identity with TLS and HTTP fingerprints exposes bots that lie about who they are
    - the honeysite design is what Kim, Seiden and Lopez-Fonseca reuse at small scale

how much traffic, and what it costs the site

- vendor numbers (Cloudflare sees its own customers only; "AI bot" means bots it could name)
    - [Radar 2025 Year in Review](https://blog.cloudflare.com/radar-2025-year-in-review/): "traffic from AI bots accounted for an average of 4.2% of HTML requests"
        - "Googlebot alone accounted for 4.5%"
        - "Crawling for model training is responsible for the overwhelming majority of AI crawler traffic, reaching as much as 7-8x search crawling and 32x user action crawling at peak"
        - user action crawling was "up over 21x from January through early December"
    - [From Googlebot to GPTBot: who's crawling your site in 2025](https://blog.cloudflare.com/from-googlebot-to-gptbot-whos-crawling-your-site-in-2025/): GPTBot "surging from 5% to 30% share" of AI crawling in a year, Bytespider "plummeted from 42% to 7%"
    - [The crawl before the fall... of referrals](https://blog.cloudflare.com/ai-search-crawl-refer-ratio-on-radar/): for one week in June 2025 "the ratios range from Anthropic's 70,900:1 down to Mistral's 0.1:1" (pages crawled per visitor sent back)
        - caveat in the post: "traffic referred by Claude's native app does not include a Referer: header"
    - [The rise of the AI crawler](https://vercel.com/blog/the-rise-of-the-ai-crawler), Vercel, 2024: GPTBot "569 million requests across Vercel's network in the past month", ClaudeBot 370 million, together "about 20% of Googlebot's 4.5 billion"
    - inference: 4% of page requests does not sound like a crisis
        - the operator reports below explain why the average hides the damage
- operator reports: the cost sits in the long tail of uncached, expensive pages
    - [How crawlers impact the operations of the Wikimedia projects](https://diff.wikimedia.org/2025/04/01/how-crawlers-impact-the-operations-of-the-wikimedia-projects/), Wikimedia Foundation, 2025: "Since January 2024, we have seen the bandwidth used for downloading multimedia content grow by 50%"
        - "at least 65% of this resource-consuming traffic we get for the website is coming from bots, a disproportionate amount given the overall pageviews from bots are about 35% of the total"
        - their reason: "crawler bots tend to 'bulk read' larger numbers of pages and visit also the less popular pages", which miss the cache and hit the core datacenter
    - [AI crawlers need to be more respectful](https://about.readthedocs.com/blog/2024/07/ai-crawlers-abuse/), Read the Docs, 2024: "One crawler downloaded 73 TB of zipped HTML files in May 2024, with almost 10 TB in a single day. This cost us over $5,000 in bandwidth charges"
        - the crawler had no "support for Etags and Last-Modified headers which would have allowed the crawler to only download files that had changed"
    - [Are AI Bots Knocking Cultural Heritage Offline?](https://glamelab.org/products/are-ai-bots-knocking-cultural-heritage-offline/), Weinberg, GLAM-E Lab, 2025 (survey): "Of 43 respondents, 39 had experienced a recent increase in traffic"
        - "Robots.txt is not currently an effective way to prevent bots from overwhelming collections"
        - many "did not realize they were experiencing a growth in bot traffic until the traffic reached the point where it overwhelmed the service"
    - [COAR survey on AI bots and repositories](https://coar-repositories.org/news-updates/open-repositories-are-being-profoundly-impacted-by-ai-bots-and-other-crawlers-results-of-a-coar-survey/), 2025: "Over 90% of survey respondents indicated their repository is encountering aggressive bots, usually more than once a week, and often leading to slow downs and service outages"
        - their caveat: "there is no way to be 100% certain of the purpose of these bots"
    - Gannett's CEO, quoted by [Nieman Lab](https://www.niemanlab.org/2026/01/news-publishers-limit-internet-archive-access-due-to-ai-scraping-concerns/): "In September alone, we blocked 75 million AI bots across our local and USA Today platforms"
- academic log studies, few and small
    - Kim et al. (above): "Over 40% of web accesses in our dataset are attributable to just 20 bots"
    - [Protecting Small Organizations from AI Bots with Logrip](https://arxiv.org/abs/2508.03130), Hoetzlein, arXiv 2025: groups requests by IP subnet to catch crawls spread over many addresses
        - "we estimate that 80 to 95 percent of traffic originates from AI crawlers" on one small site
    - [Shy Guys: A Light-Weight Approach to Detecting Robots on Websites](https://arxiv.org/abs/2603.28546), Van Boxem, Barbette, Pelsser, Sadre, arXiv 2026: user agent plus whether the client asks for the favicon
        - "detects 67.7% of bot traffic while maintaining a false-positive rate of 3%" on "4.6 million requests"
    - [Developer Experience with AI Coding Agents: HTTP Behavioral Signatures in Documentation Portals](https://arxiv.org/abs/2604.02544), Borysenko, arXiv 2026: nine coding agents and six assistants against one docs site
        - "AI agent access compresses multi-page navigation into a single or two requests, making traditional engagement metrics ... unreliable"
- crawling less instead of blocking more
    - [Craw4LLM: Efficient Web Crawling for LLM Pretraining](https://arxiv.org/abs/2502.13347), Yu, Liu, Xiong, arXiv 2025: rank the crawl queue by predicted training value
        - "With just 21% URLs crawled, LLMs pretrained on Craw4LLM data reach the same downstream performances of previous crawls, significantly reducing the crawling waste and alleviating the burdens on websites"
    - open: tested on a fixed web graph, not on live sites
        - says nothing about recrawling pages that did not change, which is what the Read the Docs complaint is about (see [web_change_and_atoms.md](web_change_and_atoms.md))
- position paper worth a skim: [Generative AI and the Future of the Digital Commons](https://arxiv.org/abs/2508.06470), Noroozian et al., arXiv 2025, asks "How can we account for and distribute the infrastructural and environmental costs of providing data for AI training?"

defenses beyond robots.txt

- blocking at the proxy
    - Liu et al. (above) reverse-engineered Cloudflare's "Block AI Bots" switch: of 1,875 top-10k sites on Cloudflare they could test, "only 107 (5.7%) sites enable" it (October 2024)
        - limits: "an incomplete list of AI crawlers blocked, and inability to stop AI training for Meta, Google, and Webzio"
    - the Google problem: Googlebot feeds both search and AI answers, so a site cannot refuse one and keep the other
        - Cloudflare says Googlebot "is used to crawl Web site content for search indexing and AI training"
- telling real agents from people and from old bots (so the site can decide per class)
    - in [crawling.md](crawling.md): FP-Agent, Fayolle et al., Broken Gates
    - [Whose Agent Are You?](https://arxiv.org/abs/2606.20910), Kang, Jeong, Sheffey, Datta, Houmansadr, arXiv 2026: TLS, HTTP and interaction features for six agent frameworks
        - "97% accuracy" at telling them from people and from each other
    - [What Does It Take to Detect an AI Agent?](https://arxiv.org/abs/2607.26935), Choudhary et al., workshop paper 2026: a human-or-bot classifier "misclassifies 39.1% of real AI agents as human"
        - the giveaway is the automation layer, not the model: "Playwright does not emit the raw pointer-move and wheel-delta streams a physical input device produces"
    - inference: all of these are lab benchmarks on the authors' own pages
        - none reports how many real sites act on such signals
- proof of work (Anubis and similar)
    - what it is, from the challenge page Anubis served to my own fetch of [its docs](https://anubis.techaro.lol/docs/): "your browser is given a calculation task that it has to solve to ensure that it is a valid client. This concept is called Proof of Work"
    - [Anubis sends AI scraperbots to a well-deserved fate](https://lwn.net/Articles/1028558/), LWN, 2025: the scrapers that hurt "are designed to ignore robots.txt and evade detection by lying about their User-Agent header, and come from vast numbers of IP addresses", worst for "dynamically generated content like Git forges"
    - [Anubis](https://lock.cmpxchg8b.com/anubis.html), Ormandy, 2025 (blog): with default settings, mining a pass for every deployment he counted takes "about 6 minutes" on a free cloud VM
        - "the cost of unrestricted crawler access to the internet for a week is approximately $0"
    - [Who does Anubis actually stop?](https://fzakaria.com/2026/07/09/who-does-anubis-actually-stop), Zakaria, 2026 (blog): "For a scraper, solving the Anubis challenge is a one-time, amortized-to-zero cost since the cookie can be cached and reused"
        - text browsers, screen readers and feed readers "are completely left out"
    - inference: operators say it works, two engineers show the arithmetic says it should not
        - the likely answer is that it stops crawlers that do not run JavaScript at all, which is a different claim from "makes crawling expensive", the reviewed sources do not measure that effect
- junk mazes
    - [AI Labyrinth](https://blog.cloudflare.com/ai-labyrinth/), Cloudflare, 2025 (vendor blog): "uses AI-generated content to slow down, confuse, and waste the resources of AI Crawlers and other bots that don't respect 'no crawl' directives"
        - doubles as a detector: "No real human would go four links deep into a maze of AI-generated nonsense"
    - open source tarpits (Nepenthes, iocaine) do the same without the detector
        - I have no primary quote for them
    - inference for the human's DeGenTWeb line: defenders now publish generated pages on purpose, on real domains, aimed at crawlers
        - a corpus built by a crawler that looks like a bot will contain some
- text aimed at the model instead of the crawler
    - [Indirect Prompt Injection in the Wild](https://arxiv.org/abs/2604.27202), Khodayari, Zhang, Acharya, Pellegrino, arXiv 2026: "Analyzing 1.2B URLs from 24.8M hosts, we identify 15.3K validated instances across 11.7K pages"
        - uses include "content-protection directives, and AI-bot detection"
        - "about 70% appear in non-rendered HTML"
        - models obey rarely, "up to 8% for smaller models on plain-text inputs"
    - mostly Common Crawl data, so it counts what a polite named crawler was shown
- charging
    - [Introducing pay per crawl](https://blog.cloudflare.com/introducing-pay-per-crawl/), Cloudflare, 2025 (vendor blog): crawlers "either present payment intent via request headers for successful access (HTTP response code 200), or receive a 402 Payment Required response with pricing"
        - one "flat, per-request price across their entire site"
    - [Pay-Per-Crawl Pricing for AI: The LM-Tree Agent](https://arxiv.org/abs/2604.01416), Archer, Ghili, Haghpanah, arXiv 2026: learns per-article prices
        - "8,939 articles and 80,451 buyer queries with willingness-to-pay calibrated from actual AI crawler traffic"
        - "65% revenue gain over a single static price"
    - open: no public data on how many crawlers pay, or what a 402 does to crawl behavior

research and archive crawlers caught in the same net

- in [crawling.md](crawling.md): Gundelach 2026 ("Chromium headless encounters a 15% soft block rate"), and the bias argument from Bouchaud and Steinacker-Olsztyn
- [Web Crawl Refusals: Insights From Common Crawl](https://research.utwente.nl/en/publications/web-crawl-refusals-insights-from-common-crawl/), Ansar, Sperotto, Holz, PAM 2025
    - what they did: regular expressions over page bodies in a Common Crawl snapshot to find refusal pages that a status code alone would miss
    - "at least 1.68% of sites in a CC snapshot exhibit a form of explicit refusal"
        - "an inconsistent and even incorrect use of HTTP status codes to indicate refusals"
        - "most blocks resolve within one hour, but also that 80% of refusing domains block every request by CC"
    - open: "early-stage work", one snapshot
        - no trend, and it predates Anubis and the 2025 Cloudflare defaults
- the Internet Archive
    - [News publishers limit Internet Archive access due to AI scraping concerns](https://www.niemanlab.org/2026/01/news-publishers-limit-internet-archive-access-due-to-ai-scraping-concerns/), Nieman Lab, 2026 (journalism): "241 news sites from nine countries explicitly disallow at least one out of the four Internet Archive crawling bots"
        - the Times: "the Wayback Machine provides unfettered access to Times content — including by AI companies — without authorization"
    - [follow-up](https://www.niemanlab.org/2026/05/more-than-340-local-news-outlets-are-limiting-the-internet-archives-access-to-their-journalism/), May 2026: "more than 340 local news sites across the United States are now limiting the Internet Archive's ability to access and preserve their stories"
        - "No news publisher has confirmed to Nieman Lab that an AI company has already scraped their content from the Wayback Machine"
    - their caveat: "This data is not comprehensive, but exploratory"
- COAR (above): repositories that block bots are "also inadvertently blocking other desired network services such as scholarly aggregators, indexing services, and directories" (this sentence is from the search summary of the COAR page; I did not re-read it in the page text)
- review observation: two source pages served Anubis challenges to a plain HTTP client
- inference: a web archive or research corpus collected in 2026 is missing a different, larger and less random slice of the web than one from 2022, the reviewed studies do not estimate that change

the web that machines get versus the web people get

- classic cloaking, where the machine was the search crawler
    - [Cloak and Dagger: Dynamics of Web Search Cloaking](https://cseweb.ucsd.edu/~voelker/pubs/cloaking-ccs11.pdf), Wang, Savage, Voelker, CCS 2011: crawler "Dagger" fetched each result as a crawler and as a browser "for over five months, identifying when distinct results were provided to crawlers and browsers"
    - [Cloak of Visibility: Detecting When Machines Browse A Different Web](https://research.google/pubs/cloak-of-visibility-detecting-when-machines-browse-a-different-web/), Invernizzi et al., S&P 2016: bought "ten cloaking packages that range in price from $167 to $13,188"
        - they range from PHP plugins "that check the User-Agent of incoming clients" to web servers that blacklist "based on IP addresses, reverse DNS, User-Agents"
- cloaking toward agents, so far only shown as an attack
    - [A Whole New World: Creating a Parallel-Poisoned Web Only AI-Agents Can See](https://arxiv.org/abs/2509.00124), Zychlinski, arXiv 2025: "A malicious website can identify an incoming request as originating from an AI agent and dynamically serve a different, 'cloaked' version of its content"
        - a concept paper, no measurement
- legitimate "different page for machines" is now a product
    - [Building an open Agentic Internet](https://blog.cloudflare.com/the-agentic-internet/), Cloudflare, 2026 (vendor blog): "Markdown for Agents lets agents read websites with fewer tokens and less bandwidth"
        - the agent asks with an Accept header and gets markdown made from the HTML
    - together with 402 responses, challenge pages and mazes, a site can now return five or more different things for one URL depending on who seems to ask
- what the crawler's software can see at all
    - Vercel (above, vendor log analysis): "none of the major AI crawlers currently render JavaScript"
        - they "do fetch JavaScript files (ChatGPT: 11.50%, Claude: 23.84% of requests), they don't execute them"
        - "Common Crawl (CCBot) ... does not render pages"
        - Gemini and AppleBot do render
    - this is late 2024 and one hosting network
        - I found no newer or independent check
    - relevant to the JSphere line: text that only exists after scripts run is missing from training crawls, while browser agents do see it
- what agents do with the human web (lab studies, mostly cloned or instrumented sites)
    - [Machine-Readable Ads](https://arxiv.org/abs/2507.12844), Nitu, Mühle, Stöckl, arXiv 2025: agents "never scroll beyond two viewports and ignore purely visual calls to action"
    - [Investigating the Impact of Dark Patterns on LLM-Based Web Agents](https://arxiv.org/abs/2510.18113), Ersoy et al., S&P 2026: "when there is a single dark pattern present, agents are susceptible to it an average of 41% of the time"
    - [SusBench](https://arxiv.org/abs/2510.11035), Guo et al., IUI 2026: dark patterns injected into 55 live sites
        - "both human participants and agents are particularly susceptible to the dark patterns of Preselection, Trick Wording, and Hidden Information"
- [Build the web for agents, not agents for the web](https://arxiv.org/abs/2506.10953), Lù, Kamath, Mosbach, Reddy, arXiv 2025 (position): proposes "an Agentic Web Interface (AWI), an interface specifically designed for agents to navigate a website"
    - if this happens, the machine web and the human web split by design

crawlers that use a language model

- writing the scraper: [AutoScraper](https://arxiv.org/abs/2404.12753), Huang et al., EMNLP 2024: "the paradigm of generating web scrapers with LLMs"
    - the model writes extraction rules once per site instead of reading every page
- reading the page
    - [ReaderLM-v2](https://arxiv.org/abs/2503.01151), Wang et al., arXiv 2025: a 1.5B parameter model "transforming messy HTML into clean Markdown or JSON"
    - [HtmlRAG](https://arxiv.org/abs/2411.02959), Tan et al., WWW 2025: keep pruned HTML instead of plain text, because "much of the structural and semantic information inherent in HTML, such as headings and table structures, is lost"
- choosing what to crawl: Craw4LLM (above)
- using an agent as the measurement crawler
    - [On the Suitability of LLM-Driven Agents for Dark Pattern Audits](https://arxiv.org/abs/2603.03881), Sun, Vekaria, Nithyanand, arXiv 2026: an agent walks data-rights request forms on "456 data broker websites"
        - they report "the reliability and reproducibility of its dark pattern classifications" and where it fails
    - crawling.md idea 4 covers the general version (agent that clicks consent and logs in), and cites the security scanner work
- inference: the tools exist, but I found no paper that compares what an LLM crawler collects against Heritrix or a scripted browser on the same sites, with cost and repeatability

what assistants fetch and cite at answer time

- the user-facing side (are citations correct, can they be gamed) is in the [SEO folder](../web_user/seo_search_quality/index.md)
    - here I keep what bears on fetching
- which sources
    - [Search Arena: Analyzing Search-Augmented LLMs](https://arxiv.org/abs/2506.05334), Miroyan et al., ICLR 2026: "over 24,000 paired multi-turn user interactions with search-augmented LLMs" with full traces, open data
        - "user preferences are influenced by the number of citations, even when the cited content does not directly support the attributed claims"
    - [News Source Citing Patterns in AI Search Systems](https://arxiv.org/abs/2507.05301), Yang, arXiv 2025, same data: "Among the over 366,000 citations embedded in these responses, 9% reference news sources"
        - "News citations concentrate heavily among a small number of outlets"
    - Grossman et al. (above): for "51.5% of representative, real-user queries, AIOs are generated"
        - sources differ a lot between Google search, AI Overviews and Gemini ("<0.2 average Jaccard similarity")
        - generative search is "significantly more likely to retrieve Google-owned content"
    - [Navigating the Shift](https://arxiv.org/abs/2601.16858), Chen, Wang, Chen, Koudas, EDBT/ICDT workshops 2026: AI answers and Google results "diverge significantly in their consulted source domains ... and the freshness of the information provided"
        - they also study how "pre-training ... interacts with and influences real-time web search when enabled"
    - [From Citation Selection to Citation Absorption](https://arxiv.org/abs/2604.25707), Kai, Xinyue, Jingang, arXiv 2026: "21,143 valid search-layer citations"
        - "Perplexity and Google cite more sources on average, while ChatGPT cites fewer sources but shows substantially higher average citation influence"
    - [Synthetic Sources?](https://arxiv.org/abs/2605.23684), Allaham, Diakopoulos, arXiv 2026: "evidence of AI-generated sources being cited across all four generative search engines (~16% of cited sources)"
    - [Generative AI Search Engines as Arbiters of Public Knowledge](https://arxiv.org/abs/2405.14034), Li, Sinnamon, arXiv 2024: early audit, "commercial and geographic bias in sources"
- how fresh
    - [Dated Data: Tracing Knowledge Cutoffs in Large Language Models](https://arxiv.org/abs/2403.12958), Cheng et al., arXiv 2024: "effective cutoffs often differ from reported cutoffs", partly from "temporal biases of CommonCrawl data due to non-trivial amounts of old data in new dumps"
    - [Risk-Constrained Freshness-Aware Semantic Caching for Open-Web Retrieval-Augmented LLMs](https://arxiv.org/abs/2607.04281), Mansoor, Ahmad, Yoon, arXiv 2026: a benchmark with "staleness labels drawn from real web snapshots at 1, 12, 24 hours, and 7 days"
        - "only 34.3% of detected content changes actually affect answer correctness"
    - that last number matters for the web atoms idea: most page changes do not change any answer, so "changed" needs a definition tied to use
- inference: every study here looks at the answer and its links
    - only Lopez-Fonseca and Seiden look at the requests
    - the reviewed studies do not join the two at scale to say when the page behind a citation was last fetched

known pitfalls and unsolved problems

- a user agent string is a claim
    - Kim et al. had to filter spoofers by network
        - Cloudflare accuses Perplexity of dropping its name when blocked
        - Lopez-Fonseca found assistants on "generic user-agents"
    - so "GPTBot traffic" means "requests that say GPTBot and come from the right addresses"
        - these counts omit crawlers that successfully hide their identity
- the list of AI crawler names is crowd-sourced and changes monthly
    - two studies with different lists get different block rates for the same file
- robots.txt says what the owner wants
    - firewall rules, CDN defaults and challenge pages decide what happens
    - most studies read only the first
- every large traffic number comes from a company that sells bot control, covers only its own customers, and classifies with a private method
- origin logs are private
    - the one academic log study covers one university
- an assistant that answers from an index never touches the test server, so "no request seen" does not mean "respected the block"
- the crawl-to-refer ratio misses visitors that arrive without a Referer header (apps), by Cloudflare's own note
- lab studies of agents use cloned or injected pages
    - how real sites treat real agents is unmeasured
- ethics of the measuring itself: testing compliance means running bait sites and prompting commercial chatbots at volume
    - testing defenses means sending fake crawler identities at other people's servers
- things move fast: Bytespider went from 42% to 7% share in a year
    - a snapshot paper is stale before it is published

research ideas

1. one URL, many answers: how sites change the response by who seems to ask

- question: for the same URL, how do the responses differ between a browser, a named AI training crawler, a named AI search crawler, a user fetcher, and a browser agent, and how common is each kind of difference (block, challenge, 402 with a price, markdown version, junk maze, text aimed at the model, a quietly different article)
- why not answered
    - Wang 2011 and Invernizzi 2016 did this for search crawlers
    - Steinacker-Olsztyn 2025 and Liu 2025 swap the user agent but only record blocked or not, on news sites and the top 10k
    - Zychlinski 2025 shows agent cloaking as an attack without measuring it
        - Khodayari 2026 counts injected text but in what Common Crawl was served
    - Ansar 2025 classifies refusal pages for one crawler in one snapshot
- what we would build: a differential fetcher that requests each URL under several identities close together in time, repeats the browser fetch to learn the page's normal churn, then classifies the differences
    - start with a Tranco sample plus internal pages
- data and tools: Tranco, the block-page patterns from Ansar and Gundelach, the Dagger design, the human's Common Crawl and content-comparison experience from DeGenTWeb
- main risk: we can copy a crawler's name but not its addresses or signatures, and sites that verify (Cloudflare verified bots, Web Bot Auth) will treat us as an impostor
    - so we measure "what a claimed GPTBot gets", which is still what researchers and small crawlers get
    - also sending false identities needs an ethics argument
- confidence the gap is real: medium to high
    - I could not finish the search for a 2026 paper doing this, and it is an obvious idea, so check IMC 2026 and USENIX Security 2026 programs first

2. a census of the new defenses, and who they lock out

- question: how many sites deploy proof-of-work challenges, junk mazes, 402 pricing and AI-specific blocking, how fast is that growing, and which clients besides AI crawlers lose access (archives, research crawlers, text browsers, feed readers, screen readers)
- why not answered: Liu 2025 inferred one Cloudflare switch on the top 10k in 2024
    - Ansar 2025 found 1.68% refusing Common Crawl in one snapshot
    - Ormandy counted Anubis deployments once in a blog post
    - Nieman Lab counted Internet Archive blocks on a news list by reading robots.txt
    - nothing tracks these over time or across client types
- what we would measure: fingerprint each defense by its challenge page and headers
    - scan a site list monthly with several client types
    - mine past Common Crawl snapshots for challenge pages to get the history for free
    - compare Wayback Machine capture success before and after a site adopts a defense
- data and tools: Common Crawl indexes record status and bodies per snapshot
    - Anubis and similar tools are open source so their pages are easy to recognize
    - the refusal patterns from Ansar
- main risk: Common Crawl only shows what CCBot was served
    - mazes are built to be hard to tell from real pages
- confidence the gap is real: medium
    - this overlaps crawling.md idea 1 (effect of blocking on published numbers), so run them as one project with this as the "who deploys what" half

3. capability canaries: what the whole pipeline can reach

- question: which production assistants know content that is only reachable by running JavaScript, clicking a consent banner, scrolling, solving a proof-of-work challenge, paying a 402, or ignoring robots.txt
- why not answered: Seiden 2026 plants one token per visiting scraper in plain page text
    - Lopez-Fonseca 2026 varies only robots.txt
    - Vercel 2024 inferred "no JavaScript" from which files crawlers fetch, on one network, two years ago
- what we would build: bait sites where each token sits behind exactly one barrier
    - then ask the assistants, as Seiden does
    - the answer shows which barriers each company's pipeline crosses, with no need to trust user agents
- why it fits us: the barrier list is the JSphere question turned around (which page content depends on which browser features), and the result says how much of the script-built web is absent from model training
- data and tools: Seiden's method
    - their two-month wait for crawlers to arrive sets the timeline
- main risk: tokens on new, unlinked sites may never be crawled or may be dropped in filtering, so a missing token proves little
    - needs many sites and positive controls
- confidence the gap is real: medium
    - the Seiden authors are the obvious people to do this next

4. do AI crawlers revalidate, and how stale are answers

- question: when AI crawlers come back to a page, do they send conditional requests (If-None-Match, If-Modified-Since) and honor 304 and sitemap dates, how much of their load is refetching unchanged pages, and how long after a page changes does an assistant's answer change
- why not answered: Kim 2025 measures crawl-delay and disallow, not revalidation
    - the Read the Docs complaint about missing ETag support is one anecdote
    - Craw4LLM cuts waste by picking pages, not by skipping unchanged ones
    - the freshness cache paper works on the assistant's side
    - Lopez-Fonseca notes that assistants answer from indexes but does not time them
- what we would measure: on sites we control, log conditional headers and recrawl gaps per crawler against known change times
    - plant dated changes and poll assistants until the answer flips
    - estimate bytes that a change-group hint (the web atoms idea) would save
- data and tools: honeysite designs from Li 2021 and Kim 2025
    - the atom grouping from [web_change_and_atoms.md](web_change_and_atoms.md)
- main risk: bait sites get little crawler attention
    - partnering with a real mid-size site (a university, Read the Docs, a library) fixes that but needs their logs
- confidence the gap is real: medium to high for the revalidation part, medium for answer latency, since marketing firms publish rough versions

5. a conformance test for crawler rules, old and new

- question: beyond "do they obey Disallow", do AI crawlers implement the rest of RFC 9309 (treat 5xx on robots.txt as full disallow, refresh within 24 hours, match the most specific group and path) and the newer signals (Content-Signal lines, Content-Usage headers, 402 with a price, valid Web Bot Auth signatures)
- why not answered: Kim 2025 tests three directive types at one institution and puts caching out of scope
    - Lopez-Fonseca 2026 tests four allow and disallow conditions
    - the newer signals are too new to have studies that I found
- what we would build: a public test suite of hostnames, each exercising one rule, with logs published on a schedule
    - a scoreboard per crawler
- main risk: scoreboards attract gaming and lawyers
    - crawlers that hide their name are untestable by design
- confidence the gap is real: medium
    - cheap to start, and it reuses the bait sites from ideas 3 and 4

6. an open, multi-site log panel for crawler load

- question: what do AI crawlers cost origin servers, measured the same way across many sites: bytes, share of uncached and expensive requests, and how that differs by site type
- why not answered: Wikimedia, Read the Docs, GLAM-E and COAR each report their own pain in their own units
    - Kim 2025 has one university
    - Cloudflare reports shares, not costs, and only for customers
- what we would build: a small log-sharing agreement with sites that already complain (libraries, repositories, open source forges), a common anonymization and bot-labeling pipeline, and a cost model per request type
- main risk: privacy review and getting anyone to share logs
    - this is mostly organizing work, less a technical problem
- confidence the gap is real: high that the data does not exist publicly, low that we are the right people to collect it

opinions from ChatGPT

- no separate ChatGPT consultation for this crawler subreview
    - [group consultation](../llm_text/chatgpt_consultation.md) records the completed LLM-text consultation

gaps in this review

- search coverage is incomplete, so 2026 conference papers that are not on arXiv are likely missing
    - check the IMC 2026, USENIX Security 2026 and WWW 2026 programs for AI crawler measurement before starting any idea above
- known but not read or quoted: Dinzinger and Granitzer, "A Longitudinal Study of Content Control Mechanisms" (WWW Companion 2024)
    - Fastly, TollBit, Imperva and Akamai bot reports
    - the Code4Lib 2025 article on crawler floods at UNC Libraries (unread)
    - Nepenthes and iocaine project pages
    - OpenAI, Anthropic and Perplexity crawler documentation
- thin: older server-log studies of crawler behavior from 2000 to 2015
    - residential proxy networks used by scrapers
    - licensing deals between publishers and AI companies
    - the EU AI Act code of practice and its robots.txt clause
    - MCP, WebMCP and other agent-facing site interfaces
- read as abstract only: the ai.txt, dark pattern, ad, ReaderLM, HtmlRAG, citation and freshness-cache papers
- AIPREF and Web Bot Auth draft status changes monthly
    - I quoted the drafts' text but did not track revisions
