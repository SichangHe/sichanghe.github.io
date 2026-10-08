how researchers crawl the web for measurement studies
(authored by agents unless marked 🧑)

- written 2026-10-06; quotes are verbatim from the paper's abstract or body unless I say otherwise
    - "fact" = stated by the source; "inference" / "I think" = mine
    - search was limited: web search and most paper APIs were rate limited this session, so discovery leaned on arXiv metadata (DataCite), Crossref, Springer pages, and PDFs I could fetch directly
        - consequence: 2023 to 2026 papers that are only in ACM DL or IEEE Xplore may be missing

the picture in plain words

- the question behind every crawl study: "what does a normal visitor get when they open this site?", asked for thousands to millions of sites
- the method is always the same three choices
    - which sites and pages: almost always a popularity list (Alexa until 2022, now Tranco or CrUX), and almost always only the home page
    - which client: a real browser driven by a script (OpenWPM = Firefox + Selenium, or Chrome + Puppeteer / Playwright), or a plain HTTP fetcher (Heritrix, Common Crawl's CCBot) when scale matters more than JavaScript
    - from where and in what state: usually one cloud or university address, a fresh profile, no login, no clicks, no consent given
- the uncomfortable finding of the last eight years: each of those choices changes the answer, often by tens of percent
    - the list: Alexa changed half its entries daily; lists overstate what the wider web does
    - the page: internal pages differ from home pages
    - the client: sites detect automation and serve something else; headless differs from headful
    - the place: cloud addresses see less third-party content than home addresses; EU addresses see consent banners
    - the state: before consent, before login, and without interaction you see a thinner site
    - chance: two identical crawlers running side by side disagree
- the 2024 to 2026 twist: AI scrapers made site owners block bots much harder, and research crawlers are caught in the same net
- my take: the field has many "X matters" papers for tracker and cookie counts, and very few that (a) say how big the error is on your own metric, (b) cover page content and JavaScript behavior rather than privacy metrics, or (c) track the problem over time

crawler tools

- [Web Crawling](https://doi.org/10.1561/1500000017), Olston, Najork, Foundations and Trends in IR, 2010 (survey)
    - fact: splits the classic literature into "Building an efficient, robust and scalable crawler", "Selecting a traversal order of the web graph", "Scheduling revisitation of previously crawled content", "Avoiding problematic and undesirable content", and "Crawling so-called “deep web” content, which must be accessed via HTML forms rather than hyperlinks"
    - inference: this is the search engine view (collect as many good pages as possible); measurement crawling asks a different question (see a fixed sample the way a user would), so its problems (bot detection, state, repeatability) barely appear here
- [IRLbot: Scaling to 6 Billion Pages and Beyond](http://irl.cs.tamu.edu/people/hsin-tsang/papers/www2008.pdf), Lee, Leonard, Wang, Loguinov, WWW 2008
    - fact: "IRLbot running on a single server successfully crawled 6.3 billion valid HTML pages (7.6 billion connection requests) and sustained an average download rate of 319 mb/s (1,789 pages/s)"
    - fact: the hard parts were "verifying URL uniqueness, BFS crawl order, and fixed per-host ratelimiting", plus "highly-branching spam, legitimate multi-million-page blog sites, and infinite loops created by server-side scripts"
    - open: no JavaScript; that throughput is impossible with a browser
- [Heritrix](https://github.com/internetarchive/heritrix3), Internet Archive (README)
    - fact: "the Internet Archive's open-source, extensible, web-scale, archival-quality web crawler project"; "designed to respect the `robots.txt` exclusion directives"
    - no browser; the human's note on Danish / Luxembourgish / Finnish news archiving already covers how libraries pair it with Browsertrix
- [Browsertrix Crawler](https://github.com/webrecorder/browsertrix-crawler), Webrecorder (README)
    - fact: "a standalone browser-based high-fidelity crawling system"; "uses Puppeteer to control one or more Brave Browser browser windows in parallel. Data is captured through the Chrome Devtools Protocol (CDP)"
- [Online Tracking: A 1-million-site Measurement and Analysis](https://doi.org/10.1145/2976749.2978313), Englehardt, Narayanan, CCS 2016 (OpenWPM)
    - fact: "uses an automated version of a full-fledged consumer browser. It supports parallelism for speed and scale, automatic recovery from failures of the underlying browser, and comprehensive browser instrumentation"
    - fact from the [OpenWPM README](https://github.com/openwpm/OpenWPM): "built on top of Firefox, with automation provided by Selenium"
    - open: Firefox is a small share of real users, and the instrumentation is itself detectable (Krumnow below)
- [Tracker Radar Collector](https://github.com/duckduckgo/tracker-radar-collector), DuckDuckGo (README)
    - fact: "Modular, multithreaded, puppeteer-based crawler used to generate third party request data for the Tracker Radar"
    - used as a research crawler by Leaky Forms (below)
- [VisibleV8: In-browser Monitoring of JavaScript in the Wild](https://doi.org/10.1145/3355369.3355599), Jueckstock, Kapravelos, IMC 2019
    - fact: "a dynamic analysis framework hosted inside V8 ... that logs native function or property accesses during any JS execution. At less than 600 lines (only 67 of which modify V8’s existing behavior)"
    - fact: found "46 JavaScript namespace artifacts used by JS code in the wild to detect automated browsing platforms" and "29% of the Alexa top 50k sites load content which actively probes these artifacts"
    - relevant to the JSphere line: logging inside the engine cannot be seen by page scripts, unlike injected wrappers
- [Apophanies or Epiphanies? How Crawlers Impact Our Understanding of the Web](https://doi.org/10.1145/3366423.3380113), Ahmad, Dar, Zaffar, Vallina-Rodriguez, Nithyanand, WWW 2020
    - fact (abstract, via Semantic Scholar): "crawlers generally find themselves trading off between computational overhead, developer effort, data accuracy, and completeness. Therefore, the choice of crawler has a critical impact on the data generated and knowledge inferred from it"
    - fact: they "conduct a survey of all research published since 2015 in the premier security and Internet measurement venues to identify and verify the repeatability of crawling methodologies"
    - I could not fetch the PDF, so I have no numbers; my memory (unverified) is that plain HTTP tools miss a large share of what browsers load
- [SoK: State of the Krawlers](https://www.usenix.org/conference/usenixsecurity24/presentation/stafeev), Stafeev, Pellegrino, USENIX Security 2024
    - what: read 12 years of papers, rebuilt the crawling algorithms in one framework (Arachnarium), compared coverage
    - fact: "7,840 papers, identifying 403 conducting a measurement"
    - fact: "Of the 403 surveyed papers, only 32.3% of them (i.e., 130 papers) navigate websites whereas the remaining 273 papers (i.e., 67.7%) visit a single page only"
    - fact: "35.4% of the papers navigating websites do not specify (i) the navigation strategy ..., (ii) the page similarity ..., or (iii) both"
    - fact: "randomized algorithms, in particular randomized BFS, offer better performance than standard algorithms, providing a general increase of average coverage, from +8% in LoCs up to +21% for JavaScript source code"
    - open: coverage means code and link coverage for security scanning; nothing on whether the pages reached are the pages users visit
- [Web Execution Bundles: Reproducible, Accurate, and Archivable Web Measurements](https://arxiv.org/abs/2501.15911), Hantke, Snyder, Haddadi, Stock, USENIX Security 2025 (WebREC)
    - what: a browser-level recorder and a ".web" archive format that keeps what happened in the page (which script did what), not just the HTTP traffic
    - fact: "most measurement studies use custom tools and varied archival formats, each of unknown correctness and significant limitations"
    - fact: "70% of papers discussed in a 2024 web crawling SoK paper could be conducted using WebREC as is, and a larger number (48%) could be leveraged against .web archives without requiring any new crawling"
        - the "larger number (48%)" wording is the paper's own; I read it as 48% of papers need no new crawl at all
    - fact: "OpenWPM and similar systems fundamentally cannot address the unpreventable errors caused by the limitations of the underlying capabilities OpenWPM relies on"
    - open: nobody runs a shared, regularly refreshed .web crawl yet, as far as I found
- [Sprinter: Speeding Up High-Fidelity Crawling of the Modern Web](https://www.usenix.org/conference/nsdi24/presentation/goel), Goel et al., NSDI 2024 (I am fairly sure of venue; the copy in the collection has no venue line)
    - fact: "to discover and fetch all page resources dependent on JavaScript and modern web APIs, crawlers today have to employ compute-intensive web browsers"
    - fact: "crawls a small, carefully chosen, subset of pages on each site using a browser, and then efficiently identifies and exploits opportunities to reuse the browser's computations on other pages"; "crawl a corpus of 50,000 pages 5x faster than browser-based crawling, while still closely matching a browser in the set of resources fetched"
    - inference: the reuse works because pages of one site share scripts, which is the same structure a "web atom" would exploit for change detection
- crawlers built for collecting training text rather than measuring (short, for contrast)
    - [Craw4LLM](https://arxiv.org/abs/2502.13347), Yu, Liu, Xiong, arXiv 2025: "With just 21% URLs crawled, LLMs pretrained on Craw4LLM data reach the same downstream performances of previous crawls"
    - [Neural Prioritisation for Web Crawling](https://arxiv.org/abs/2506.16146), Pezzuti, MacAvaney, Tonellotto, ICTIR 2025: "neural crawling policies significantly improve harvest rate, maxNDCG, and search effectiveness during the early stages of crawling"
    - [Efficient Crawling for Scalable Web Data Acquisition](https://arxiv.org/abs/2602.11874), Gauquier, Manolescu, Senellart, EDBT 2026: a bandit learns "which hyperlinks lead to pages that link to many targets, based on the paths leading to the links in their enclosing webpages"
    - inference: all three pick pages by expected value, which makes the sample biased on purpose; the opposite of what a measurement needs

which sites to visit: top lists

- [A Long Way to the Top: Significance, Structure, and Stability of Internet Top Lists](https://arxiv.org/abs/1805.11506), Scheitle et al., IMC 2018
    - fact: "top lists generally overestimate results compared to the general population by a significant margin, often even an order of magnitude"
    - fact: "some top lists have surprising change characteristics, causing high day-to-day fluctuation and leading to result instability"
    - fact: "59 studies exclusively use Alexa as a source for domain names"
- [Tranco: A Research-Oriented Top Sites Ranking Hardened Against Manipulation](https://arxiv.org/abs/1806.01156), Le Pochat et al., NDSS 2019
    - fact: "half of the Alexa list changes every day and the Umbrella list only has 49% real sites"
    - fact: "the ranks of domains in each of the lists are easily altered, in the case of Alexa through as little as a single HTTP request"
    - fact: "133 top-tier studies over the past four years based their experiments and conclusions on the data from these rankings"
    - what Tranco is: an average of several lists over 30 days, with a permanent ID per list so a study can cite the exact list
    - follow-up: [Evaluating the Long-term Effects of Parameters on the Characteristics of the Tranco Top Sites Ranking](https://www.usenix.org/system/files/cset19-paper_le_pochat.pdf), CSET 2019: "We compute how well Tranco captures websites that are responsive, regularly visited and benign"
    - open: Alexa was retired in 2022, so Tranco's inputs changed; I did not find a paper that re-evaluates today's Tranco
- [Clustering and the Weekend Effect](https://doi.org/10.1007/978-3-030-15986-3_11), Rweyemamu et al., PAM 2019
    - fact: "the weekend effect in Alexa and Umbrella causes these rankings to change their geographical diversity between the workweek and the weekend"
    - fact: "up to 91% of ranked domains appear in alphabetically sorted clusters containing up to 87k domains of presumably equivalent popularity"
        - plain meaning: deep in the list the order is alphabetical, so "top 500K" versus "top 600K" is a cut by first letter
- [Toppling Top Lists: Evaluating the Accuracy of Popular Website Lists](https://zakird.com/papers/toplists.pdf), Ruth, Kumar, Wang, Valenta, Durumeric, IMC 2022
    - what: compared lists against what Cloudflare's servers see
    - fact: "most lists capture web popularity poorly, with the exception of the Chrome User Experience Report (CrUX) dataset, which is the most accurate top list compared to Cloudflare across all metrics"
    - fact: "researchers typically use lists as an unordered set of websites"
    - open: Cloudflare "authoritatively serves traffic for only about a quarter of top sites", so the reference itself is a biased sample; CrUX gives only rank buckets (top 1K, 10K, 100K, 1M) and only Chrome users who opted in
- [A World Wide View of Browsing the World Wide Web](https://zakird.com/papers/browsing.pdf), Ruth et al., IMC 2022
    - fact: "six sites account for 25% of page loads on both desktop and mobile, and one site garners 17% of all desktop page loads globally"
    - fact: "The top million sites capture over 95% of all page loads and time spent online, but they do so extremely unequally"
    - fact: "of sites appearing in the top 1K for at least one country, over half do not rank in the top 10K for any other country"
    - fact: "studies calculated directly from a simple set of the top million sites place disproportionate focus on the long tail of the web"
    - inference: "x% of the top 1M sites do Y" and "x% of page loads meet Y" are different quantities, and most papers report the first while implying the second
- [Crawling to the Top: An Empirical Evaluation of Top List Use](https://doi.org/10.1007/978-3-031-56249-5_12), Xie, Li, PAM 2024
    - what: put test domains into top lists and watched who came (abstract from the Springer page; no numbers there)
    - fact: "evaluate how domain traffic changes once placed in top lists, the characteristics of those visiting the domain, and the behavioral patterns of these visitors"
    - inference: being on a list attracts scanners, so list membership changes the thing being measured
- [You Get What You Sample: Evaluating Sampling Strategies for Web Security Measurements](https://arxiv.org/abs/2609.11218), Zhang, Yang, Pellegrino, arXiv 2026
    - what: compared "top N" with random and stratified samples on 500k Tranco and 24.8M Common Crawl hosts
    - fact: of 107 measurement papers (2020 to 2024), datasets were "Tranco (61) and Alexa (41) ... followed by CrUX (9), Common Crawl (7), Cisco Umbrella (3), and SecRank (2)"
    - fact: "Top N does not reflect the overall distribution of the web. Instead, probability-based strategies yield stable, unbiased estimates for prevalence"
    - fact: "relative to the broader Common Crawl baseline, random sampling from Tranco may underestimate the prevalence of the measured security issues by approximately 30%, even with an appropriately large sample size"
    - open: sampling of sites only, for security header style metrics; does not touch which pages inside a site
- [LLM-Assisted Web Measurements](https://arxiv.org/abs/2510.08101), Bozzolan, Calzavara, Cazzaro, arXiv 2025
    - fact: "existing top lists of popular websites are unlabeled and lack semantic information about the nature of the included websites"; they "propose a practical two-step methodology for scalable targeted web measurements starting from the Tranco list" using LLMs to label sites
    - open: uses the LLM to choose sites, not to drive the crawl

which pages to visit: landing versus internal

- [On Landing and Internal Web Pages](https://dl.acm.org/doi/abs/10.1145/3419394.3423626), Aqeel, Chandrasekaran, Feldmann, Maggs, IMC 2020 (Hispar; already in the human's notes)
    - fact: "the insights and claims of nearly two-thirds of the relevant studies would need to be revised for them to apply to internal pages"
    - fact: Hispar "uses search engine results for discovering internal pages"; "For each web site, we used the Google Search Engine API for the term "site:." We fix the user's location for the search queries to the United States, and limit the search results to pages in the English language"
    - open: "representative internal page" is defined by what a US English Google search returns; no error bars on per-site numbers
- [Beyond the Front Page: Measuring Third Party Dynamics in the Field](https://arxiv.org/abs/2001.10248), Urban, Degeling, Holz, Pohlmann, WWW 2020
    - fact: landing-page-only measurement "is only able to measure a lower bound as subsites show a significant increase of privacy-invasive techniques"
    - fact: "50 % of the branches in the third party trees change between repeated visits"
- [Reproducibility and Replicability of Web Measurement Studies](https://doi.org/10.1145/3485447.3512214), Demir et al., WWW 2022 (also below)
    - fact: "Our total website corpus consists of 10k distinct sites and we found 182,586 subpages on those sites"
- [Exploring the Cookieverse](https://arxiv.org/abs/2302.05353), Rasaii, Singh, Gosain, Gasser, PAM 2023 also "compare landing to inner pages" (details under consent)
- crawling deeper than links: state and interaction
    - [Crawling JavaScript-based web applications through dynamic analysis of user interface state changes](https://doi.org/10.1145/2109205.2109208), Mesbah, van Deursen, Lenselink, TWEB 2012 (Crawljax)
        - fact: Ajax techniques "shatter the concept of webpages with unique URLs, on which traditional Web crawlers are based"; the crawler "fires events on those candidate elements, and incrementally infers a state machine"
    - [Black Widow: Blackbox Data-driven Web Scanning](https://doi.org/10.60882/cispa.24613521.v1), Eriksson, Pellegrino, Sabelfeld, S&P 2021
        - fact: "code coverage improvements ranging from 63% to 280% compared to other crawlers across all applications"
    - [YuraScanner: Leveraging LLMs for Task-driven Web App Scanning](https://www.ndss-symposium.org/wp-content/uploads/2025-388-paper.pdf), Stafeev et al., NDSS 2025
        - fact: scanners "struggle with discovering deeper states in modern web applications due to their limited understanding of workflows"; an LLM agent "identified 12 unique zero-day XSS vulnerabilities, compared to three by Black Widow"
        - open: "evaluated ... on 20 diverse web applications" that the authors host; not the live web
    - [SpiderSapien: Client-Centric Web Crawler and Security Scanner](https://arxiv.org/abs/2609.02532), Olsson, Eriksson, Doupé, Sabelfeld, arXiv 2026
        - fact: "increased average code coverage across applications by at least 46% over any other scanner"; uses "an LLM to solve forms"
    - [Dark Patterns at Scale](https://arxiv.org/abs/1907.07032), Mathur et al., CSCW 2019
        - fact: "Analyzing ~53K product pages from ~11K shopping websites, we discover 1,818 dark pattern instances"
        - why it is here: an example of a task-specific crawler that has to find product pages and walk a checkout flow
    - inference: every one of these judges a crawler by code coverage or bugs found; none asks how the extra pages change a prevalence number

how results depend on the setup

the browser and the automation framework

- [Towards Realistic and Reproducible Web Crawl Measurements](https://doi.org/10.1145/3442381.3450050), Jueckstock et al., WWW 2021
    - what: "naive crawling tool defaults vs. careful attempts to match “real” users across the Tranco top 25k web domains"
    - fact: "browser configuration alone causing shifts in 19% of known ad and tracking domains encountered and altering the loading frequency of up to 10% of distinct JavaScript code units executed"
    - fact: "network vantage point having similar, though less dramatic, effects on the same web metrics"
    - abstract via Semantic Scholar; I could not fetch the PDF
- [Reproducibility and Replicability of Web Measurement Studies](https://doi.org/10.1145/3485447.3512214), Demir et al., WWW 2022
    - what: checklist from 117 papers, then "4.5 million pages with 24 different measurement setups"
    - fact: "the identified trackers on pages can vary by 25% based on the used browser configuration"
    - fact, headless versus headful similarity of tracker sets per page: "perfect similarity for 35% of the pages and no similarity for 34%"
    - fact on reporting: "approximately 17.1% of the papers, where the pipeline is described, fail to offer details on the crawling technology"; "only 24% of the analyzed papers make their results openly available"
- [OmniCrawl](https://petsymposium.org/popets/2022/popets-2022-0012.pdf), Cassel et al., PETS 2022
    - what: "42 different non-emulated browsers simultaneously", including real phones
    - fact: "common methodological choices made by web measurement studies, such as the use of emulated mobile browsers and Selenium, can lead to website behavior that deviates from what actual users experience"
    - fact: "tracking observed on Selenium-driven desktop browsers differs from tracking on non-Selenium-driven browsers"
    - fact: "the third-party advertising and tracking ecosystem of mobile browsers is more similar to that of desktop browsers than previous findings suggested"
    - contrast: [A Comparative Measurement Study of Web Tracking on Mobile and Desktop Environments](https://petsymposium.org/popets/2020/popets-2020-0016.pdf), Yang, Yue, PETS 2020, with emulated mobile on "23,310 websites": "mobile web tracking has its unique characteristics especially due to mobile-specific trackers"
        - inference: the two papers disagree on how different mobile is, and OmniCrawl blames emulation
- [The Representativeness of Automated Web Crawls as a Surrogate for Human Browsing](https://doi.org/10.1145/3366423.3380104), Zeber et al., WWW 2020
    - what: compared OpenWPM crawls with "an opt-in sample of over 50,000 users of the Firefox Web browser"
    - fact: "We quantify baseline variation of simultaneous crawls, then isolate the effects of time, cloud IP address vs. residential, and operating system"
    - fact: "crawlers tend to experience higher rates of third-party activity than human browser users on loading pages from the same domains"
    - abstract via Semantic Scholar; PDF not fetched
- [Beyond the Crawl: Unmasking Browser Fingerprinting in Real User Interactions](https://arxiv.org/abs/2502.01608), Annamalai, Bilogrevic, De Cristofaro, WWW 2025
    - what: "30 participants over 10 weeks, capturing telemetry data from real browsing sessions across 3,000 top-ranked websites"
    - fact: "automated crawls miss almost half (45%) of the fingerprinting websites encountered by real users. This discrepancy mainly stems from the crawlers' inability to access authentication-protected pages, circumvent bot detection, and trigger fingerprinting scripts activated by specific user interactions"
    - inference: Zeber says crawlers see more third parties, this says crawlers see fewer fingerprinters; both can hold because one compares the same pages and the other compares the pages each actually reaches
- [Beyond time delays: How web scraping distorts measures of online news consumption](https://arxiv.org/abs/2412.00479), Ulloa et al., arXiv 2024
    - what: compared page content saved in the user's browser at visit time with content scraped later from the same URLs
    - fact: "The ex-situ collection environment is the primary source of the discrepancies (~33.8%), while the time delays in the scraping process play a smaller role (adding ~6.5 percentage points in 90 days)"
    - fact: "at least 33.8% of the contents of participants’ online news exposure cannot be determined using static web scraping approaches"
    - fact: they name "pages that require user interaction (e.g., paywalls) as the most critical source of content distortion"
    - why it matters here: the only setup paper I found whose metric is page text, not trackers; from communication science, news pages only
- [Breaking Bad: Quantifying the Addiction of Web Elements to JavaScript](https://arxiv.org/abs/2301.10597), Fouquet, Laperdrix, Rouvoy, ACM TOIT 2023
    - fact: on "6,384 pages, including landing and internal web pages", "43% of web pages are not strictly dependent on JavaScript and that more than 67% of pages are likely to be usable as long as the visitor only requires the content from the main section of the page"
    - inference: roughly a third of pages lose main content without JavaScript, which is a first-order estimate of what a no-JavaScript corpus such as Common Crawl misses

bot detection

- [Cloak of Visibility: Detecting When Machines Browse A Different Web](https://research.google.com/pubs/archive/45365.pdf), Invernizzi et al., S&P 2016
    - fact: studied "ten prominent cloaking services marketed within the underground", including "IP blacklists that contain over 50 million addresses tied to the top five search engines and tens of anti-virus and security crawlers"
    - classic evidence that malicious sites show crawlers a different page
- [Fingerprint Surface-Based Detection of Web Bot Detectors](https://doi.org/10.1007/978-3-030-29962-0_28), Jonker, Krumnow, Vlot, ESORICS 2019
    - fact: "In a scan of the Alexa Top 1 Million, we find that 12.8% of websites show indications of web bot detection"
- [FP-Crawlers](https://www.ndss-symposium.org/wp-content/uploads/2020/02/23010-paper.pdf), Vastel, Rudametkin, Rouvoy, Blanc, MADWeb 2020
    - fact: "We crawled the Alexa top 10K and identified 291 websites that block crawlers. We show that fingerprinting is used by 93 (31.96%) of them"
    - fact: fingerprinting "can be bypassed with little effort by an adversary with knowledge on the fingerprints collected"
- [Web Runner 2049: Evaluating Third-Party Anti-bot Services](https://www.securitee.org/files/webrunner_dimva2020.pdf), Amin Azad, Starov, Laperdrix, Nikiforakis, DIMVA 2020
    - fact: "more than 75% of protected websites in our dataset, successfully defend against attacks by basic bots built with Python scripts or PhantomJS"; yet "by using less popular browsers in terms of automation (e.g., Safari on Mac and Chrome on Android) attackers can successfully bypass the protection of up to 82% of protected websites"
- [Good Bot, Bad Bot: Characterizing Automated Browsing Activity](https://www.securitee.org/files/goodbotbadbot_oakland2021.pdf), Li, Amin Azad, Rahmati, Nikiforakis, S&P 2021
    - the server side view: "more than 86.2% of bots are claiming to be Mozilla Firefox and Google Chrome, yet are built on simple HTTP libraries and command-line tools"
- [How gullible are web measurement tools? A case study analysing and strengthening OpenWPM's reliability](https://arxiv.org/abs/2205.08890), Krumnow, Jonker, Karsch, CoNEXT 2022 (arXiv title: "Analysing and strengthening OpenWPM's reliability")
    - fact: "OpenWPM is easily detectable"; on 100,000 sites "it is commonly detected (∼14% of front pages)"
    - fact: "We find several new ways in which a malicious website can attack OpenWPM’s data recording"
    - they ship a stealth extension; open: nobody tracks whether it still works
- [HLISA: towards a more reliable measurement tool](https://doi.org/10.1145/3487552.3487843), Goßen, Jonker, Karsch, Krumnow, Roefs, IMC 2021
    - fact: "three methods have been used to detect web bots: browser fingerprint, order of site traversal, and aspects of page interaction"; HLISA is "an API that simulates interaction like humans"
- [Detecting Bot Detection: Prevalence, Techniques, and Implications for Web Measurement Research](https://arxiv.org/abs/2606.14525), Gundelach, Mühlhauser, Herrmann, arXiv 2026
    - what: "10,000 websites across four browser configurations (40K page visits in total)" plus a survey of 81 crawl papers from 2020 to 2025
    - fact: "83% of papers omit any discussion of bot detection blocking"
    - fact: "Chromium headless encounters a 15% soft block rate compared to 7% for other configurations"
    - fact: "82% of blocks are attributable to bot detection ..., predominantly by providers with integrated bot detection such as Cloudflare (37% block rate) and Akamai (26%)"
    - fact: "75% of Chromium-headless-only blocks are caused by header-level signals alone"
    - fact: "bot detection creates systematic, provider-correlated sample loss that the web measurement community neither measures nor reports. The downstream effect on specific measurement outcomes remains future work"
    - the closest paper to research idea 1 below; one snapshot, one vantage point as far as the abstract says
- the bot side is changing because of LLM agents
    - [Broken Gates: Re-evaluating Web Bot Defenses in the Age of LLM Agents](https://arxiv.org/abs/2607.18659), Ousat et al., arXiv 2026: "challenge-based defenses are broadly ineffective against commercial solvers"; for score-based defenses the deciding factor is "execution-environment authenticity, rather than agent behavior"
    - [On the Internet, Nobody Knows You're an LLM Bot](https://arxiv.org/abs/2606.30119), Fayolle et al., arXiv 2026: "some Web Agents were able to bypass all evaluated anti-bot mechanisms"; "stealth and anti-detection mechanisms often increase detectability rather than decrease it"
    - [FP-Agent: Fingerprinting AI Browsing Agents](https://arxiv.org/abs/2605.01247), Wang, Shafiq, Vekaria, arXiv 2026: "FP-Agent detects all seven AI browsing agents, whereas Cloudflare detects only one"
    - inference: the stealth-plugin advice from 2020 to 2022 may now make a research crawler easier to spot; nobody has tested this on research crawlers specifically

vantage point

- [The Blind Men and the Internet: Multi-Vantage Point Web Measurements](https://arxiv.org/abs/1905.08767), Jueckstock et al., arXiv 2019
    - what: "synchronized crawls on the Alexa top 5K domains from four distinct network VPs: research university, cloud datacenter, residential network, and Tor gateway proxy"
    - fact: "some third-party content consistently avoided crawls from our cloud VP"; "the added visibility provided by residential VPs over university VPs is marginal compared to the infrastructure complexity and network fragility they introduce"
- [Do You See What I See? Differential Treatment of Anonymous Users](https://doi.org/10.5522/00/5), Khattak et al., NDSS 2016
    - fact: "The second-class treatment of anonymous users ranges from outright rejection to limiting their access to a subset of the service’s functionality or imposing hurdles such as CAPTCHA-solving"
- [A Bestiary of Blocking: The Motivations and Modes behind Website Unavailability](https://arxiv.org/abs/1806.00459), Tschantz et al., FOCI 2018
    - fact: "three forms of server-side blocking: blocking visitors from the EU to avoid GDPR compliance, blocking based upon the visitor’s country, and blocking due to security concerns"
- [Measuring Cookies and Web Privacy in a Post-GDPR World](https://doi.org/10.1007/978-3-030-15986-3_17), Dabrowski et al., PAM 2019
    - fact: "collected cookies from the Alexa Top 100,000 websites and compared their cookie behavior from different vantage points"; they "discuss challenges caused by these new cookie setting policies for Internet measurement studies"
- [The Impact of User Location on Cookie Notices](https://arxiv.org/abs/2110.09832), van Eijk, Asghari, Winter, Narayanan, ConPro 2019
    - fact: "the website’s Top Level Domain explains a substantial portion of the variance in cookie notice metrics, but the user’s vantage point does not"; exception: ".com domains from inside versus outside of the EU"
- [Not All Roads Lead to Rome: How VPN Selection Alters What We Measure and Infer about Web Infrastructure](https://arxiv.org/abs/2605.30692), Singh, Ricci, Gamero-Garrido, arXiv 2026
    - fact: "the same country measured through different VPN providers yields materially different conclusions about where endpoints sit, who hosts them, and which physical replicas serve them"
    - fact: "commercial VPN providers operate their own in-country DNS infrastructure, often intercepting queries regardless of client configuration"
    - inference: "we crawled from country X through a VPN" is not one setup but one per provider
- the human's BGP background fits here: this is the same "which vantage points see the same thing" question as BGP atoms, asked of web servers and CDNs

consent banners

- [We Value Your Privacy ... Now Take Some Cookies](https://arxiv.org/abs/1808.05096), Degeling et al., NDSS 2019
    - fact: "62.1 % of websites in Europe now display cookie consent notices, 16 % more than in January 2018"
- [The Internet with Privacy Policies: Measuring The Web Upon Consent](https://arxiv.org/abs/2109.00395), Jha, Trevisan, Vassio, Mellia, TWEB 2022 (Priv-Accept; in the human's notes)
    - fact: "all measurements performed not dealing with the Privacy Banners offer a very biased and partial view of the Web. After accepting the privacy policies, we observe an increase of up to 70 trackers, which in turn slows down the webpage load time by a factor of 2x-3x"
    - method fact: keyword matching on the accept button; "The top-98 keywords cover 95% of the websites"
- [Exploring the Cookieverse](https://arxiv.org/abs/2302.05353), Rasaii, Singh, Gosain, Gasser, PAM 2023 (BannerClick)
    - fact: tool can "detect, accept, and reject cookie banners with an accuracy of 99%, 97%, and 87%, respectively"
    - fact: "banners to be 56% more prevalent when visiting websites from within the EU region"; "websites send, on average, 5.5× more third-party cookies after clicking “accept”"
- [Thou Shalt Not Reject: Analyzing Accept-Or-Pay Cookie Banners on the Web](https://arxiv.org/abs/2310.01108), Rasaii, Gosain, Gasser, IMC 2023
    - fact: "cookiewalls on 0.6% of all queried 45k websites"; "for Germany we see cookiewalls on 8.5% of top 1k websites"
    - follow-up: [To Be or Not to Be (in the EU)](https://arxiv.org/abs/2410.06920), Stenwreth, Täng, Morel, ICISSP 2025: "the presence of a cookie paywall was most affected by the geographic location of the user"; a "double paywall" on "approximately 11% of the studied websites"
- [Intractable Cookie Crumbs](https://arxiv.org/abs/2506.11947), Rasaii et al., PETS 2025
    - what: "stateful crawls on over 20k domains ..., strategically accepting banners in the first half of domains and measuring intractable cookies in the second half"
    - fact: "around 50% of websites send at least one intractable cookie"
    - why it matters for method: what a crawler did on earlier sites changes what later sites do, so stateless per-site crawls and stateful crawls measure different things
- [A Large-Scale Study of Cookie Banner Interaction Tools and their Impact on Users’ Privacy](https://petsymposium.org/popets/2024/popets-2024-0002.pdf), Demir, Urban, Pohlmann, Wressnegger, PETS 2024
    - fact: "statistically significant differences in which cookies are set, how many of them are set, and which types are set---even for extensions that aim to implement the same cookie choice"
    - inference: "we accepted the banner" is not one setup either; the tool used to click matters
- [A Cross-Country Analysis of GDPR Cookie Banners and Flexible Methods for Scraping Them](https://arxiv.org/abs/2503.19655), Nouwens et al., CHI 2025
    - fact: "top 10,000 websites across 31 countries"; "67% of websites use consent interfaces, but only 15% are minimally compliant"; "three organisations hold 37% of the market"
- [Leaky Forms](https://www.usenix.org/conference/usenixsecurity22/presentation/senol), Senol, Acar, Humbert, Zuiderveen Borgesius, USENIX Security 2022
    - a good template for reporting setup: "two vantage points (EU/US), two browser configurations (desktop/mobile), and three consent modes"
    - fact: emails "exfiltrated ... before form submission and without giving consent on 1,844 websites in the EU crawl and 2,950 websites in the US crawl"
    - the crawler "finds and fills email and password fields", built on Tracker Radar Collector (per the dataset record)

logins and paywalls

- [The Prevalence of Single Sign-On on the Web](https://dl.acm.org/doi/10.1145/3618257.3624841), Ardi, Calder, IMC 2023 (in the human's notes)
    - fact: "58% of the top 10K websites with logins are accessible with popular 3rd-party SSO providers"
- [SSO-Monitor](https://arxiv.org/abs/2302.01024), Westers et al., S&P 2024
    - fact: "automatically identified 1,632 websites with 3,020 Apple, Facebook, or Google logins within the Tranco 10k"; "can automatically login to each SSO website"
- [Shepherd: a generic approach to automating website login](https://doi.org/10.14722/madweb.2020.23008), Jonker, Karsch, Krumnow, Sleegers, MADWeb 2020
    - fact: "able to automatically log in on 7,113 sites", using "legitimately crowd-sourced credentials"
- [The Cookie Hunter](https://doi.org/10.1145/3372297.3417869), Drakonakis, Ioannidis, Polakis, CCS 2020
    - fact: automates "the challenging process of account creation" and can "fully audit 25K domains"
- [To Auth or Not To Auth?](https://swag.cispa.saarland/papers/rautenstrauch2024auth.pdf), Rautenstrauch et al., S&P 2024
    - fact: "the unauthenticated web could provide a significantly skewed picture of security depending on the type of research question"; "the authenticated state has a larger observable attack surface and more vulnerabilities"
    - scale fact: started from "4,485 unique sites", "automatically extracted more than 900 sites where we detected a login and a registration form", ended with "around 200 sites where our automated login continuously succeeded"
    - inference: 200 of 4,485 is the honest yield of login automation in 2023, and the surviving sites are not a random subset
- [Keeping out the Masses: Understanding the Popularity and Implications of Internet Paywalls](https://arxiv.org/abs/1903.01406), Papadopoulos et al., WWW 2020
    - fact: "paywall use has increased, and at an increasing rate (2× more paywalls every 6 months)"; "paywalls are in general trivial to circumvent"
    - both numbers are from 2019; I found no newer paywall prevalence crawl

can web measurements be repeated and compared

- [On the Similarity of Web Measurements Under Different Experimental Setups](https://doi.org/10.1145/3618257.3624795), Demir et al., IMC 2023
    - what: "visiting 1.7M webpages with five different measurement setups", two of which are identical and run in parallel
    - fact: "even identical setups operating in parallel and visiting the same pages can yield significantly different results"
    - fact: "when comparing two different profiles, 48% of the underlying data varies"
    - fact: "roughly 60% of the nodes’ children show high similarity, the remaining share shows a substantial fluctuation"
    - fact: they drop "roughly 34% of the pages" during vetting, and found "14.6 pages per site" on average
    - open: the unit is the request tree; it does not say which published conclusions would flip
- Zeber 2020, Jueckstock 2021, Demir 2022 above each quantify one or two factors; Urban 2020 gives the 50% branch churn number
- [You Call This Archaeology? Evaluating Web Archives for Reproducible Web Security Measurements](https://swag.cispa.saarland/papers/hantke2023archaeology.pdf), Hantke et al., CCS 2023
    - idea: crawl the Internet Archive's copy instead of the live site, so anyone can rerun the study
    - fact: "the IA is the only archive that is powerful enough ... it could provide fresh data for around 2,700 domains in both snapshots (roughly 55%); as for the other archives, the best result was 341 domains (7%)"
    - fact: "The IA aggregates information from multiple sources, hence its point of view of the Web might not reflect any actual vantage point"
    - validated only for "security headers and JavaScript inclusions"
- [Internet Jones and the Raiders of the Lost Trackers](https://www.usenix.org/conference/usenixsecurity16/technical-sessions/presentation/lerner), Lerner et al., USENIX Security 2016
    - fact: the Wayback Machine's "view of past third-party requests, which we find is imperfect — we evaluate its limitations and unearth lessons and strategies for overcoming them"
- [Jawa: Web Archival in the Era of JavaScript](https://www.usenix.org/conference/osdi22/presentation/goel), Goel et al., OSDI 2022
    - fact: key observations are "the forms of non-determinism which impair the execution of JavaScript on archived pages" and "the ways in which JavaScript’s execution fundamentally differs between live web pages and their archived copies"
    - fact: "reduces overall storage needs by 41%"
- [Mahimahi: Accurate Record-and-Replay for HTTP](https://www.usenix.org/conference/atc15/technical-session/presentation/netravali), Netravali et al., USENIX ATC 2015
    - fact: "emulating multiple servers is a key factor in accurately measuring Web page load times"
    - the performance community's answer to repeatability: record once, replay locally
- WebREC (above) is the 2025 version of the same answer for security and privacy work
- [Improved methodology for longitudinal Web analytics using Common Crawl](https://arxiv.org/abs/2404.09770), Thompson, WebSci 2024
    - fact: "we have identified the least and most representative segments for a number of recent archives"; a segment can stand in for a whole archive
    - belongs mostly to the Common Crawl file; listed here because it is a repeatability trick

rules of the road: robots.txt, ethics, and the AI crawler backlash

- [Where Are the Red Lines? Towards Ethical Server-Side Scans in Security and Privacy Research](https://swag.cispa.saarland/papers/hantke2024redlines.pdf), Hantke et al., S&P 2024
    - fact: "a slight majority (57%) of operators having a positive stance towards such academic research"; proposes "a preregistration process"
- [Web Scraping for Research: Legal, Ethical, Institutional, and Scientific Considerations](https://arxiv.org/abs/2410.23432), Brown et al., arXiv 2024
    - fact: "platforms have greatly restricted access to data through official channels. As a result, researchers will likely engage in more web scraping"
- Demir 2022: "more than half (64.1%) of the analyzed papers omit an ethical discussion"
- [Consent in Crisis: The Rapid Decline of the AI Data Commons](https://arxiv.org/abs/2407.14933), Longpre et al., NeurIPS 2024 (venue from memory)
    - fact: "in a single year (2023-2024) there has been a rapid crescendo of data restrictions from web sources, rendering ~5%+ of all tokens in C4, or 28%+ of the most actively maintained, critical sources in C4, fully restricted from use"
    - fact: "The foreclosure of much of the open web will impact not only commercial AI, but also non-commercial AI and academic research"
- [Somesite I Used To Crawl](https://arxiv.org/abs/2411.15091), Liu et al., arXiv 2024 (I believe IMC 2025)
    - fact: Cloudflare-style blocking has "relatively limited deployment today" but offers "stronger protections against AI crawlers"
    - fact: "if a site implemented active blocking on automated requests (like those of the CC crawler), then Common Crawl may record a 403 Forbidden HTTP status code for those sites"
- [Scrapers selectively respect robots.txt directives](https://arxiv.org/abs/2505.21733), Kim et al., arXiv 2025 (I believe IMC 2025)
    - fact: "bots are less likely to comply with stricter robots.txt directives, and ... certain categories of bots, including AI search crawlers, rarely check robots.txt at all"
- [Web Crawler Restrictions, AI Training Datasets & Political Biases](https://arxiv.org/abs/2510.09031), Bouchaud, Ramaciotti, arXiv 2025
    - fact: "A quarter of the top thousand websites restrict AI crawlers, decreasing to one-tenth across the broader top million"
    - fact: "9.5% disallow CCBot, the crawler used by CommonCrawl"
    - fact: "34.2% of news outlets disallow OpenAI's GPTBot, rising to 55% for outlets with high factual reporting"; "heterogeneous blocking patterns may skew training datasets toward low-quality or polarized content"
- [Is Misinformation More Open? A Study of robots.txt Gatekeeping on the Web](https://arxiv.org/abs/2510.10315), Steinacker-Olsztyn, Gosain, Dao, arXiv 2025
    - fact: "60.0% of reputable sites disallow at least one AI crawler, compared to just 9.1% of misinformation sites"; "AI-blocking by reputable sites rising from 23% in September 2023 to nearly 60% by May 2025"
- [Do Generative AI Assistants Respect robots.txt?](https://arxiv.org/abs/2607.14447), Lopez-Fonseca et al., arXiv 2026
    - fact: some assistants "accessed restricted resources without requesting robots.txt or used generic user-agents that complicated attribution"
- inference from the last four: who blocks crawlers correlates with content quality, so any corpus built by a polite, named crawler (Common Crawl included) is tilting toward lower-quality sites over time
    - this bears directly on DeGenTWeb-style prevalence numbers; see idea 2

known pitfalls and unsolved problems

- the sample is not the web
    - top lists overstate (Scheitle: "often even an order of magnitude"); Tranco random samples understate relative to Common Crawl hosts by about 30% on security metrics (Zhang 2026)
    - site counts versus page-load weighting give different stories (Ruth 2022)
    - most popular sites are country-specific (Ruth 2022), yet most studies use one global list
- one page per site
    - 67.7% of 403 crawl papers visit a single page (Stafeev 2024); internal pages differ (Aqeel 2020, Urban 2020)
    - no agreed way to pick internal pages; Hispar depends on a commercial search API
- missing data is not random
    - blocked sites cluster by CDN (Gundelach 2026); failed logins cluster by site type (Rautenstrauch 2024: 200 of 4,485 survive); 34% of pages dropped in vetting (Demir 2023)
    - 83% of papers do not discuss blocking at all (Gundelach 2026)
- the observer changes the observation
    - instrumentation is detectable (VisibleV8: 29% of top 50k probe automation artifacts; Krumnow: OpenWPM detected on about 14%)
    - list membership attracts bot traffic (Xie 2024)
    - earlier visits change later ones in stateful crawls (Rasaii 2025)
- noise floor
    - identical parallel setups disagree (Demir 2023); half of third-party branches change between visits (Urban 2020)
    - few papers repeat a crawl or report intervals
- setup is under-described
    - 35.4% of navigating papers omit the navigation strategy or page similarity rule (Stafeev 2024); 17.1% omit the crawl technology (Demir 2022)
    - "from a VPN in country X" hides the provider (Singh 2026); "accepted cookies" hides the tool (Demir 2024)
- unsolved, as far as I found
    - what blocking, consent state, and login state do to page text and to JavaScript API usage, as opposed to tracker counts
    - how detection and blocking of research crawlers changed since the 2023 AI scraper wave; all pre-2023 prevalence numbers (12.8%, 14%, 29%) predate it
    - a correction method: given a crawl's known blind spots, how to adjust the estimate rather than only list "limitations"
    - whether archive-based or record-replay crawls agree with live crawls for anything beyond headers and script inclusion

research ideas

- ordering is by how much I would bet on them; confidence is about whether the gap is real, given the limited search noted at the top

1. what does crawler blocking do to published numbers, and how fast is it getting worse

- question: when a standard research crawler is blocked or served a degraded page, how far do the usual metrics (third parties, cookies, security headers, JS API usage, page text) move, and how did block rates change from 2022 to 2026
- why not answered: Gundelach 2026 measures block rates once and states "The downstream effect on specific measurement outcomes remains future work"; Krumnow 2022, Jonker 2019, Vastel 2020 are pre-AI-scraper snapshots; Liu 2024 and Bouchaud 2025 track AI-crawler rules, not research browsers
- what we would build: paired visits to the same pages with a "known good" client (real headful Chrome on a residential line, human-like interaction) and the common research setups (OpenWPM, Playwright headless and headful, cloud IP); label block / challenge / silent degradation; then recompute two or three well-known results with and without the blocked sites, and with reweighting by CDN
    - trend: reuse HTTP Archive and Common Crawl response codes and challenge-page signatures per site over years as a free longitudinal signal (Liu 2024 notes Common Crawl records 403 for blocked sites)
- data and tools: Tranco and CrUX; OpenWPM; Playwright; VisibleV8 to see probing; Zenodo has unreviewed 2026 datasets titled "Anti-Bot Adoption Index — WAF / anti-bot vendor scan of the Tranco top 1M" that could seed vendor labels
- main risk: the "known good" client is itself not ground truth; silent degradation is hard to label at scale; residential access raises ethics questions
- confidence the gap is real: medium to high for the downstream-effect part, medium for the trend part (someone may have an ACM-only paper I could not see)

2. does a polite no-JavaScript corpus see the same text as a browser, and does the difference bias content studies

- question: for the same URLs, how much of the main text is missing or different in Common Crawl compared with a rendered, consent-accepted browser visit, and is the missing part skewed toward particular kinds of sites
- why not answered: setup-comparison papers measure trackers and requests (Jueckstock 2021, Demir 2022, Demir 2023); Ulloa 2024 measures text but only for news pages in a user panel ("at least 33.8% of the contents ... cannot be determined using static web scraping"); Fouquet 2023 measures breakage without JavaScript on 6,384 pages, not text and not Common Crawl; Bouchaud 2025 and Steinacker-Olsztyn 2025 show that reputable sites block named crawlers more, but only at the robots.txt level
- why the human should care: DeGenTWeb estimates AI-generated site prevalence from Common Crawl; if high-quality sites opt out of CCBot faster than content farms, the estimate drifts upward for reasons unrelated to AI
- what we would measure: sample Common Crawl URLs stratified by site category; refetch with a browser within days; compare extracted main text (same extractor on both); record robots.txt and 403 status for CCBot versus browser; rerun the LLM-text detector on both versions; report a bias factor per site category
- data and tools: Common Crawl index and WARC, Playwright or Browsertrix, BannerClick or Priv-Accept for consent, trafilatura-style extraction
- main risk: overlap with the Common Crawl worker's file; time gap between the two fetches confounds (Ulloa puts that at about 6.5 points over 90 days, so keep the gap short)
- confidence the gap is real: medium; the selection-bias angle (who blocks CCBot) I am fairly confident nobody has tied to AI-content prevalence

3. how many internal pages per site are enough, and can page templates (web atoms) pick them

- question: for a per-site metric, what is the error from visiting 1, 5, or 20 pages, and does sampling one page per template beat random links or search results
- why not answered: Aqeel 2020 and Urban 2020 show internal pages differ but give no estimator; Stafeev 2024 compares navigation algorithms by code and link coverage; Zhang 2026 is the first rigorous sampling paper but samples sites, not pages within a site; Sprinter 2024 exploits per-site script reuse for speed, not for sampling
- what we would build: for a few hundred sites, crawl deeply (thousands of pages each) once as reference; cluster pages by DOM skeleton and shared resources; simulate sampling strategies and plot error versus pages visited for several metrics; test whether clusters that share structure also change together, which would connect to the web atoms idea in the sibling file
- data and tools: Common Crawl gives many URLs per host for free as the candidate pool; Hispar lists as a baseline; Arachnarium from the SoK
- main risk: the deep reference crawl is itself blocked or rate limited on the sites that matter; "template" may be too site-specific to generalize
- confidence the gap is real: medium; I searched arXiv titles and abstracts for page-level sampling and found only Zhang 2026

4. agent-driven crawling for measurement: what a consent-clicking, logging-in, interacting crawler reveals, and at what cost

- question: how much more of a site (text, JS API calls, third parties) appears when an LLM browser agent accepts consent, signs in via SSO, and uses the page, compared with load-and-wait; and are agent crawls repeatable enough to publish numbers from
- why not answered: YuraScanner 2025 and SpiderSapien 2026 use LLMs for security scanning on self-hosted apps; Bozzolan 2025 uses LLMs to label sites; Rautenstrauch 2024 is semi-manual and ends at 200 sites; Ardi 2023 shows 58% of login sites accept SSO but does not crawl behind it; Annamalai 2025 shows real users hit 45% more fingerprinting sites, which is the size of the prize
- what we would build: an agent harness on Playwright with engine-level logging (VisibleV8 or WebREC) so the observation does not depend on the agent; run load-only, scripted (BannerClick + SSO-Monitor), and agent modes on the same sites; repeat each three times to measure run-to-run spread
- fit with JSphere: API usage after interaction is the natural next question
- main risk: agents are now a detection target (FP-Agent 2026: classifier "detects all seven AI browsing agents"; Fayolle 2026), so the agent may be blocked more than a plain crawler; account creation and terms of service; cost per site
- confidence the gap is real: medium to high today, but this is an obvious next step for the CISPA and Ca' Foscari groups, so the window is short

5. a variance budget for crawl metrics beyond trackers

- question: for a given metric, how much of the spread comes from time, vantage point, browser, consent state, and plain chance, and how many repeats make a difference between two crawls believable
- why not answered: Zeber 2020 isolates "time, cloud IP address vs. residential, and operating system" and Demir 2023 compares five profiles, both on tracking and request-tree metrics; neither gives a recipe (repeats needed, minimum detectable difference) and neither covers page text or JS API sets
- what we would do: a full factorial crawl on a few thousand pages with replication; fit a variance-components model per metric; publish the table and a calculator
- main risk: reviewers may see it as incremental over Demir 2023; needs a sharp demonstration, such as a published longitudinal trend that falls inside the noise
- confidence the gap is real: low to medium for tracker metrics, medium for content and API metrics

6. a shared calibration panel across studies (weakest; listed so the human can discard it knowingly)

- question: if every crawl study also crawled the same few hundred pages, could results from different papers be put on one scale
- nearest work: Tranco's list IDs fix the site sample; WebREC's .web archives fix the recording; nothing fixes the comparison across setups
- main risk: adoption problem rather than research problem; may only work as part of idea 5
- confidence: low

opinions from ChatGPT

- I sent the six ideas above to ChatGPT (Extra High) for a novelty check; no answer had arrived when I wrote this file, so nothing here reflects it

gaps in this review

- not fetched as PDF, abstract only: Ahmad 2020, Zeber 2020, Jueckstock 2021, Xie 2024, HLISA 2021, Shepherd 2020, Cookie Hunter 2020, and the Springer papers
- not covered: McDonald et al. "403 Forbidden: A Global View of CDN Geoblocking" (IMC 2018) and Vallina et al. on domain classification services (IMC 2020), because I could not reach a copy to quote
- thin: HTTP Archive and CrUX as crawl infrastructure (I found no methods paper to quote), mobile app webviews, residential proxy ethics, and the classic 1998 to 2005 crawl-ordering papers beyond what the Olston and Najork survey covers
- venues marked "I believe" or "from memory" need a check before citing
