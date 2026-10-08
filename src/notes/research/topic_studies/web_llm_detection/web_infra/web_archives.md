web archives as research infrastructure
(authored by agents unless marked 🧑)

the picture in plain words

- a web archive crawls pages, stores the HTTP responses in WARC files, and later serves them back ("replay") so a page looks like it did on the capture date
    - the Internet Archive's Wayback Machine is by far the largest
        - national libraries, Archive-It, archive.today, Perma.cc, and Arquivo.pt are much smaller
    - Memento (RFC 7089) is the HTTP protocol for asking any archive "give me this URL as of date T"
- researchers use archives for 3 things
    - recover a page that died (link rot) or changed (content drift)
    - measure the past: run today's analysis on captures from 1996 onward
    - prove what a page said, in court, journalism, and fact checking
- all 3 uses assume the archived copy is complete, faithful, dated correctly, unbiased in what it covers, and unaltered
    - the literature below shows each assumption fails in a measurable way
    - complete: embedded resources are missing or come from other dates
    - faithful: JavaScript runs differently under replay
    - unbiased: popular, English, linked, old, and static pages are archived far more
    - unaltered: third parties can change what a replayed capture shows without touching the archive
- what changed in 2024 to 2026
    - publishers started blocking archive crawlers because they fear AI companies scrape the archive
    - logged-in and client-side-rendered platforms (Instagram, X, Reddit) became close to unarchivable
    - the Internet Archive's own capture volume dropped sharply for a period in 2025
    - Wikipedia dropped archive.today after it altered captures
- siblings cover neighbors and I do not repeat them
    - [crawling.md](crawling.md): Heritrix, Browsertrix, WebREC, robots.txt and AI crawlers
    - [web_change_and_atoms.md](web_change_and_atoms.md): Pew 2024, Klein 2014, Jones 2016, SalahEldeen 2012, Ainsworth 2011, coherence framework 2014, Lerner 2016
    - [generated_web_measurement.md](../llm_provenance/generated_web_measurement.md): studies that run AI-text detectors on Wayback captures

protocols, formats, tools

- [Memento: Time Travel for the Web](https://arxiv.org/abs/0911.1112), Van de Sompel et al., arXiv 2009
    - standard is [RFC 7089](https://www.rfc-editor.org/rfc/rfc7089.html)
    - "the lack of temporal capabilities in the most common Web protocol, HTTP, prevents getting to an archived resource on the basis of the URI of its original"
    - RFC: "It facilitates obtaining representations of prior states of a given resource by introducing datetime negotiation and TimeMaps"
        - "TimeMaps are lists that enumerate URIs of resources that encapsulate prior states of the given resource"
    - words used below: memento = one archived copy
        - TimeMap = list of all copies of a URL
        - URI-R = the original URL
- WARC is ISO 28500, one record per HTTP request and response
    - [WACZ](https://specs.webrecorder.net/wacz/1.1.1/) zips WARC with an index
    - source wording not independently checked: "WACZ is a media type that allows web archive collections to be packaged and shared on the web as a discrete file"
    - WACZ has an optional `datapackage-digest.json` hash, with an optional signature
        - this is the hook for tamper evidence
- [The Case For Alternative Web Archival Formats To Expedite The Data-To-Insight Cycle](https://arxiv.org/abs/2003.14046), Wang, Xie, JCDL 2020 (venue from memory)
    - "performance gain of one to two orders of magnitude can be achieved simply by reformatting WARC files into Parquet or Avro formats"
- capture tools, 2 families
    - fetch-only crawlers (Heritrix, wget): fast, miss whatever JavaScript loads
    - browser crawlers ([Brozzler](https://github.com/internetarchive/brozzler): "a distributed web crawler (爬虫) that uses a real browser (Chrome or Chromium) to fetch pages and embedded URLs and to extract links"; Browsertrix; ArchiveWeb.page): slow, capture more
    - [ArchiveBox](https://github.com/ArchiveBox/ArchiveBox): "a self-hosted app that lets you preserve content from websites in a variety of formats"
        - saves "HTML, PNG, PDF, TXT, JSON, WARC, SQLite"
- replay tools
    - [pywb](https://github.com/webrecorder/pywb): "a Python 3 web archiving toolkit for replaying web archives large and small as accurately as possible"
        - server rewrites URLs and injects a script (wombat) that overrides browser APIs
    - [ReplayWeb.page](https://github.com/webrecorder/replayweb.page): replay inside the browser
        - "the 'backend' is provided via a service worker implementation"
- [Archiving Deferred Representations Using a Two-Tiered Crawling Approach](https://arxiv.org/abs/1508.02315), Brunelle, Weigle, Nelson, iPRES 2015
    - "Heritrix crawled 2.065 URIs per second, 12.15 times faster than PhantomJS"
        - "PhantomJS discovered 531,484 URIs, 1.75 times more than Heritrix"
    - their fix: classify pages, send only JavaScript-dependent ones to the browser
- [Adapting the Hypercube Model to Archive Deferred Representations and Their Descendants](https://arxiv.org/abs/1601.05142), Brunelle, Weigle, Nelson, 2016
    - clicking through page states "added 15.6 times more embedded resources than Heritrix to the crawl frontier, but at a rate that was 38.9 times slower"
        - "an average of 38.5 descendants per seed URI crawled, 70.9% of which are reached through an onclick event"
- [The Memento Tracer Framework](https://arxiv.org/abs/1909.04404), Klein et al., TPDL 2019
    - "Human driven services such as the Webrecorder tool provide high-quality archival captures but are not optimized to operate at scale"
        - Tracer records a human's clicks once per site template and replays them on other pages
- [Reproducible Web Corpora: Interactive Archiving with Automatic Quality Assessment](https://doi.org/10.1145/3239574), Kiesel et al., JDIQ 2018
    - "we create a corpus of 10,000 web pages carefully sampled from the Common Crawl and manually annotated with regard to reproduction quality via crowdsourcing"
        - "An off-the-shelf neural network, trained on visual differences between the web page during archiving and reproduction, matches the manual assessments best"
- [Introducing A Dark Web Archival Framework](https://arxiv.org/abs/2107.04070), Brunelle et al., 2021: Brozzler + WARC + pywb pointed at Tor
    - "little institutional archiving is performed on the dark web"
- finding which archive has a URL
    - [Profiling Web Archive Coverage for Top-Level Domain and Content Language](https://arxiv.org/abs/1309.4008), AlSum et al., TPDL 2013: "only sending queries to the top three web archives ... produces the full TimeMaps on 84% of the cases"
    - [Routing Memento Requests Using Binary Classifiers](https://arxiv.org/abs/1606.09136), Bornand et al., JCDL 2016: "classifiers can reduce the average number of requests by 77% ... while maintaining a recall of 0.847"
    - [MementoMap](https://arxiv.org/abs/1905.12607), Alam et al., JCDL 2019: a summary under "1.5% Relative Cost ... can correctly identify the presence or absence of 60% of the lookup URIs"
    - [Profiling Web Archival Voids for Memento Routing](https://arxiv.org/abs/2108.03311), Alam et al., JCDL 2021: describes what an archive does not hold
    - inference: outside the Internet Archive the other public archives add little
        - Hantke et al. below measure this directly
- [The Archives Unleashed Project](https://arxiv.org/abs/2001.05399), Ruest, Lin, Milligan, Fritz, JCDL 2020
    - "a process model that decomposes scholarly inquiries into four main activities: filter, extract, aggregate, and visualize"
        - "over a thousand different collections from about two hundred users, totaling over 280 terabytes"
- [Web Archive Analytics](https://arxiv.org/abs/2107.00893), Völske et al., 2020: Webis will "host around 8 PB of web archive data from the Internet Archive and Common Crawl"
    - so bulk access to Internet Archive WARCs exists by agreement, not by default

how complete and faithful is a replayed page

- [Not All Mementos Are Created Equal](https://www.cs.odu.edu/~mln/pubs/jcdl-2014/jcdl-2014-brunelle-damage.pdf), Brunelle et al., JCDL 2014
    - "Web users' perceptions of damage are not accurately estimated by the proportion of missing embedded resources"
        - a weighted damage score went "from 0.16 in 1998 to 0.13 in 2013" in the Internet Archive, yet "a greater number of important embedded resources (2.05 per memento on average) are missing over time"
    - open: the weights are for 2014 page designs (image size, CSS)
        - nothing about script-built pages
- [The impact of JavaScript on archivability](https://doi.org/10.1007/s00799-015-0140-8), Brunelle, Kelly, Weigle, Nelson, IJDL 2016
    - numbers from a search summary of the paper, not checked against the PDF: by 2012, 54.5% of pages load embedded resources with JavaScript
        - JavaScript is responsible for 33.2% more missing resources in 2012 than in 2005
- [On the Change in Archivability of Websites Over Time](https://arxiv.org/abs/1307.8067), Kelly et al., TPDL 2013
    - "the archivability of a web page can be deduced from the type of page being archived, which aligns with that page's accessibility in respect to dynamic content"
- [Only One Out of Five Archived Web Pages Existed as Presented](https://hvdsomp.info/papers/Papers/2015/ht15-ainsworth-submission.pdf), Ainsworth, Nelson, Van de Sompel, Hypertext 2015
    - "at most 38.7% of composite mementos are both temporally coherent and that at most only 17.9% (roughly 1 in 5) are temporally coherent and 100% complete"
    - "Using multiple archives increases mean completeness by 3.1–4.1% but also reduces temporal coherence"
    - meaning: a replayed page is a collage
        - the HTML is from date T, images and scripts are from whatever dates the archive has
- [Right HTML, Wrong JSON](https://arxiv.org/abs/2305.01071), Weigle, Nelson, Alam, Graham, JCDL 2023
    - for pages that build content from API calls, "the JSON responses can become out of sync with the HTML page in which it is to be embedded, resulting in temporal violations on replay"
        - "the temporal violations can be difficult to detect"
    - one news home page, April 2015 to July 2016: "almost 15,000 mementos with a temporal violation of more than 2 days between the base ... HTML and the JSON responses"
    - open: one site
        - the reviewed studies do not measure this across sites
- [Evaluating Sliding and Sticky Target Policies](https://arxiv.org/abs/1309.5503), Ainsworth, Nelson, JCDL 2013
    - clicking links inside the Wayback Machine moves the date silently
        - "this nearly-silent drift can be many years in just a few clicks"
        - keeping the requested date fixed holds drift "to less than 30 days on average"
- [Impact of URI Canonicalization on Memento Count](https://arxiv.org/abs/1703.03302), Kelly et al., 2017
    - for one large site "84.9% of the URI-Ms result in an HTTP redirect when dereferenced"
        - "the magnitude of a TimeMap is not equivalent to the number of representations it identifies"
    - pitfall: capture counts from the CDX index overstate how many real copies exist
- [Impact of HTTP Cookie Violations in Web Archives](https://arxiv.org/abs/1906.07141), Alam et al., WADL 2019
    - "Accommodating Cookies at crawl time, but not utilizing them at replay time may cause cookie violations, resulting in defaced composite mementos that never existed on the live web"
- [Archiving the Relaxed Consistency Web](https://arxiv.org/abs/1308.2433), Xie et al., CIKM 2013
    - on eventually consistent sites "a non-trivial portion of a relaxed consistency web archive may contain observable inconsistency"
        - simulation only
- [Jawa: Web Archival in the Era of JavaScript](https://www.usenix.org/conference/osdi22/presentation/goel), Goel, Zhu, Netravali, Madhyastha, OSDI 2022 (in the collection)
    - "JavaScript accounts for 44% of the bytes on the median page in 2020, as compared to 20% in 2000"
    - replay breaks because script execution is not deterministic: "client characteristics, DRP APIs, and asynchronous execution of timer handlers and script fetches – still result in non-deterministic JS execution", so the replayed page asks for URLs that were never crawled
    - removing those sources and dropping code that cannot run offline "reduces overall storage needs by 41%" and raises crawl rate "by 39%"
- [Detecting and Diagnosing Errors in Serving Archived Web Pages](https://www.usenix.org/conference/nsdi26/presentation/zhu-jingyuan) (FidEx), Zhu, Sun, Madhyastha, NSDI 2026
    - what: compare script execution at crawl time and at replay time, tracking "the JavaScript writes which affect the page's visual appearance", then blame the specific rewrite
    - "roughly 13% of archived pages are either missing some content ... or fail to preserve functionality" even when every resource was crawled
    - screenshots and browser errors are bad oracles: "most errors – 56% in our corpus – are not indicative of user-visible problems"
        - "screenshots indicate a loss of fidelity on 69% of archived pages"
        - FidEx "reduces the false positive rate from around 70% to less than 10%"
    - after fixing pywb bugs they "reduced the fraction of archived pages which violate fidelity from 15% to 9%"
    - open: it compares a fresh crawl with its own replay
        - it says nothing about old captures made by other crawlers, or about behavior that does not touch layout (network calls, storage, tracking APIs)
- [To Re-experience the Web](https://doi.org/10.1145/3589206), Berlin, Kelly, Nelson, Weigle, TWEB 2023: the client-side rewriting that FidEx debugs
    - quoted in the sibling
- [Archiving and Replaying Current Web Advertisements](https://arxiv.org/abs/2502.01525), Reid et al., arXiv 2025
    - "prior to August 2023, Internet Archive's Save Page Now service excluded not only well-known ad services' ads, but also URLs with ad related file and directory names"
    - "Google's and Amazon's ad scripts generated URLs with different random values. This precluded archived ads' replay"
        - 279 ads studied
    - pitfall for us: any ad or tracker count taken from Wayback captures before August 2023 is biased down by design
- [Caching HTTP 404 Responses Eliminates Unnecessary Archival Replay Requests](https://arxiv.org/abs/2212.00760), Garg et al., 2022
    - replayed scripts keep polling: "an archived page averaged more than 1000 requests per minute"
        - "some web archives may attempt to patch the archive by requesting the resources from the live web"
    - pitfall: loading a capture can change the archive (a new capture dated today gets attached to an old page)
- [Quality Matters: A New Approach for Detecting Quality Problems in Web Archives](https://doi.org/10.29173/cais1145), Reyes Ayala et al., CAIS 2020
    - "the Structural Similarity Index metric (SSIM) was able to successfully measure visual correspondence"
        - FidEx's 69% number says screenshot checks over-alarm on dynamic pages
- [Where Did the Web Archive Go?](https://arxiv.org/abs/2108.05939), Aturban, Nelson, Weigle, 2021
    - over 14 months "four web archives changed their base URIs and did not leave a machine-readable method of locating their new base URIs"
        - of 1,981 mementos from them, "20 of the mementos could not be found at all"
    - meaning: archives rot too
- [GitHub Repository Complexity Leads to Diminished Web Archive Availability](https://arxiv.org/abs/2505.15042), Calano, Weigle, Nelson, 2025
    - "more than 31% of the archived repository home pages examined exhibited some form of minor page damage"
        - "less than 5% of their source files were archived, on average"
- [Cited But Not Archived](https://arxiv.org/abs/2401.04887), Escamilla et al., 2024: of code-hosting URLs cited in papers, "93.98% were still publicly available on the live Web, 68.39% had been archived by Software Heritage, and 81.43% had been archived by Web archives"

what gets archived and what does not

- [How Much of the Web Is Archived?](https://arxiv.org/abs/1212.6177), Ainsworth et al., JCDL 2011: in the sibling
    - the answer was 35% to 90% depending on where the URL sample came from
- [A fair history of the Web? Examining country balance in the Internet Archive](https://doi.org/10.1016/j.lisr.2003.12.009), Thelwall, Vaughan, 2004
    - paywalled
        - from memory, unverified: sites from the US were covered much more than sites from China, Singapore, and Taiwan, mostly because coverage follows inbound links and site age
- [Comparing the Archival Rate of Arabic, English, Danish, and Korean Language Web Pages](https://doi.org/10.1145/3041656), Alkwai, Nelson, Weigle, TOIS 2017
    - "English has a higher archiving rate than Arabic, with 72.04% archived ... 53.36% of Arabic URIs archived, followed by Danish and Korean with 35.89% and 32.81% archived"
    - "only 14.84% of the Arabic URIs had an Arabic country code top-level domain"
        - sample came from web directories (DMOZ), which is itself a popularity filter
- [What does the Web remember of its deleted past?](https://doi.org/10.1177/1461444816643790), Ben-David, New Media & Society 2016
    - rebuilding the deleted .yu domain from the Internet Archive: "a considerable portion of the historical .yu domain was found on the Internet Archive, the reconstructed space was predominantly Serbian"
- [Live versus archive: Comparing a web archive to a population of web pages](https://doi.org/10.2307/j.ctt1mtz55k.8), Hale, Blank, Alexander, in The Web as History, 2017
    - unread
        - from memory, unverified: for a full list of one travel site's UK pages, about a quarter were in the archive, and pages with more links and reviews were more likely archived
- [The Dawn of Today's Popular Domains](https://arxiv.org/abs/1702.01151), Holzmann, Nejdl, Anand, JCDL 2016
    - German top sites over 18 years from Internet Archive data: "around 70% of the pages we investigated are younger than a year"
- ["Way back then": A Data-driven View of 25+ years of Web Evolution](https://arxiv.org/abs/2202.08239), Agarwal, Sastry, WWW 2022
    - "looking at the top 100 Alexa websites for over 25 years from the Internet Archive"
        - studies MIME type shares over time
    - open: top 100 only, and it treats what the archive holds as what the site served
- [Longitudinal Sampling of URLs From the Wayback Machine](https://arxiv.org/abs/2507.14752), Garg et al., arXiv 2025 (in the collection)
    - "27.3 million URLs with 3.8 billion archived pages spanning 26 years (1996-2021)"
        - sampled "from IA's ZipNum index file, which contains every 6000th line of the CDX index"
    - fact, the biases they had to undo: "Archiving speed and capacity have increased over time, so we found more URLs archived in later years"
        - "Popular domains like Yahoo and Twitter were over-represented, so we performed logarithmic-scale downsampling"
    - "The status code of revisit records must be rehydrated from prior records for accurate lifespan analysis"
    - their lifespan result (root URLs live years, deep links about a year) I only saw in a search summary of a poster, so I do not quote it
- [Estimating Absolute Web Crawl Coverage From Longitudinal Set Intersections](https://arxiv.org/abs/2603.15416), Paris, Paris, Baumann, arXiv 2026 (in the collection)
    - "coverage can be estimated from the empirical URL overlaps between subsequent crawls"
        - on the German Academic Web "a coverage of approximately 46 percent of the crawlable URL space"
    - follow-up [Measuring What the Crawler Sees](https://arxiv.org/abs/2607.13636), 2026: on Common Crawl 2020 to 2025 the simple model fails and needs "a persistent core fraction" plus a churning shell
    - inference: capture-recapture gives coverage with no outside ground truth
        - this review found no application to the Wayback Machine
- [The Many Shapes of Archive-It](https://arxiv.org/abs/1806.06878), Jones et al., iPRES 2018: curated collections differ in growth curve and seed mix
    - a classifier predicts the collection type "with a weighted average F1 score of 0.720"
- [Scraping SERPs for Archival Seeds: It Matters When You Start](https://arxiv.org/abs/1805.10260), Nwala, Weigle, Nelson, JCDL 2018
    - "The probability of finding the same URI of a news story after one day from the initial appearance on the SERP ranged from 0.34 - 0.44. After a week ... 0.01 - 0.11"
    - meaning: event collections seeded from search are biased by the day you start
- [Bots, Seeds and People: Web Archives as Infrastructure](https://arxiv.org/abs/1611.02493), Summers, Punzalan, CSCW 2017
    - interviews show selection is a mix of human judgment and "heuristics and algorithms"
        - they ask to make "the infrastructure of web archives legible to ... the future researcher"
- [If these crawls could talk](https://doi.org/10.1002/asi.24048), Maemura et al., JASIST 2018
    - "curatorial decisions interact with technical and external factors"
        - proposes a documentation framework for "provenance, scoping, and absences"
- [Know(ing) Infrastructure: The Wayback Machine as object and instrument of digital research](https://doi.org/10.1177/13548565231164759), Ogden, Summers, Walker, Convergence 2023
    - a study of Save Page Now, the "tool that allows users to initiate the creation and storage of 'snapshots'"
        - done with "experimental blackbox tactics" because the internals are not public
    - meaning: user-triggered captures are a large, undocumented share of the Wayback Machine, and they follow attention, not a crawl policy
- who reads archives
    - [Access Patterns for Robots and Humans in Web Archives](https://arxiv.org/abs/1309.4009), AlNoamany et al., JCDL 2013: "Robots outnumber humans 10:1 in terms of sessions"
    - [Who and What Links to the Internet Archive](https://arxiv.org/abs/1309.4016), AlNoamany et al., TPDL 2013: "About 65% of the requested archived pages no longer exist on the live web"
    - [Robots Still Outnumber Humans in Web Archives, But Less Than Before](https://arxiv.org/abs/2208.12914), Jayanetti et al., TPDL 2022: "Robots account for 98% of requests" at Arquivo.pt in 2019
        - logs end in 2019, before LLM scrapers
- national scale: [The evolution of web archiving](https://doi.org/10.1007/s00799-016-0171-9), Costa, Gomes, Silva, IJDL 2017 surveys the initiatives (abstract unread)
    - [Mapping the UK Webspace](https://arxiv.org/abs/1405.2856), Hale et al., WebSci 2014 uses the .uk domain crawl 1996 to 2010
    - legal-deposit archives can capture paywalled news but are mostly readable only on site (see the human's `web_crawling.md`)

using archives to measure the past, and how it goes wrong

- [You Call This Archaeology?](https://www.dais.unive.it/~calzavara/papers/ccs23.pdf), Hantke et al., CCS 2023 (in the collection)
    - the main methods paper
    - fact, other archives barely matter: of 38 Memento endpoints "only 13 endpoints had at least one hit"
        - the Internet Archive "could provide fresh data for around 2,700 domains in both snapshots (roughly 55%); as for the other archives, the best result was 341 domains (7%)"
    - fact, captures a few days apart disagree: "across all headers, at least 10% of the neighborhoods have at least two configurations"
        - "between 1.7% (for HSTS) and 34.6% (for COEP) are impure"
    - fact, who captured it matters: "the contributor is the most important feature to explain security differences within neighborhoods for almost all the headers, followed by the status code"
    - fact, raw HTML undercounts: "While both 2016 and 2022 statically show around 73% of sites with trackers, the dynamic ones reveal 95 and 92%"
    - fact, their advice: "collecting multiple responses for a single snapshot (neighborhoods) and aggregating them"
        - "reporting lower and upper bounds"
    - open: headers and script inclusion only
        - nothing about what the scripts do when run
- [Web Execution Bundles](https://arxiv.org/abs/2501.15911), Hantke, Snyder, Haddadi, Stock, USENIX Security 2025 (in the collection): quoted in the sibling
    - the point here is that it is a record-yourself format, it cannot go back in time
- studies that lean on the Wayback Machine as their data source
    - [Internet Jones and the Raiders of the Lost Trackers](https://www.usenix.org/system/files/conference/usenixsecurity16/sec16_paper_lerner.pdf), Lerner et al., USENIX Security 2016: in the sibling
    - [How the Web Tangled Itself](https://www.usenix.org/conference/usenixsecurity17/technical-sessions/presentation/stock), Stock et al., USENIX Security 2017: "the most important Web sites for each year between 1997 and 2016, amounting to 659,710 different analyzed Web documents"
        - admits "our work faces certain threats to validity"
    - [Complex Security Policy?](https://www.ndss-symposium.org/wp-content/uploads/2020/02/23046-paper.pdf), Roth et al., NDSS 2020: "the historical CSP headers for 10,000 highly ranked domains from 2012 to 2018"
    - [Privacy Policies over Time](https://arxiv.org/abs/2008.09159), Amos et al., WWW 2021: "1,071,488 English language privacy policies, spanning over two decades and over 130,000 distinct websites"
    - [A Longitudinal Analysis of Online Ad-Blocking Blacklists](https://arxiv.org/abs/1906.00166), Hashmi, Ikram, Kaafar, 2019: block lists replayed against archived pages
    - [PixelConfig](https://arxiv.org/abs/2603.09380), Ghani, Vekaria, Shafiq, arXiv 2026: Meta Pixel settings "on 18K health-related websites with a control group of the top 10K websites from 2017 to 2024" from Wayback data
    - [Consent in Crisis](https://arxiv.org/abs/2407.14933), Longpre et al., 2024 (in the collection): robots.txt and terms history pulled from "the Wayback Machine, a digital archive of 835 billion web pages"
    - [The Archive Query Log](https://arxiv.org/abs/2304.00413), Reimer et al., SIGIR 2023: "356 million queries, 166 million search result pages" mined from archived result pages
    - [Modeling Updates of Scholarly Webpages Using Archived Data](https://arxiv.org/abs/2012.03397), Jayawardana et al., 2020: page update rates estimated from capture history of "19,977 seed URLs"
    - [Temporally Extending Existing Web Archive Collections for Longitudinal Analysis](https://arxiv.org/abs/2505.24091), Frew, Nelson, Weigle, 2025: "We pieced together artifacts collected by various organizations for their purposes through many means"
        - "81 percent of the pages in the dataset changed between 2008 and 2020"
    - [Out of Sight, Out of Mind: Detecting Orphaned Web Pages at Internet-Scale](https://doi.org/10.1145/3460120.3485367), Pletinckx, Borgolte, Fiebig, CCS 2021: abstract unread
        - from memory, they use archived sitemaps and links to find pages a site no longer links to but still serves
- [Rules of Acquisition for Mementos and Their Content](https://arxiv.org/abs/1602.06223), Jones, Shankar, 2016
    - "The acquisition of memento content via HTTP is expected to be a relatively painless exercise, but we have found cases to the contrary"
        - archives inject banners and rewrite links, and each does it differently
- [Carbon Dating The Web](https://arxiv.org/abs/1304.5213), SalahEldeen, Nelson, 2013
    - first-capture date as a creation-date estimate: "We were able to estimate a creation date for 75.90% of the resources, with 32.78% having the correct value"
    - pitfall: first capture is an upper bound on age, often a loose one
- archives as benchmark substrate
    - [WARC-Bench](https://arxiv.org/abs/2510.09872), Srivastava et al., 2025: "438 tasks" for GUI agents run on WARC replays
        - "the highest observed success rate being 64.8%"
    - inference: agent benchmarks can inherit replay fidelity bugs
    - FidEx's 13% measures its own corpus, not WARC-Bench

link rot and content drift, beyond what the sibling has

- [Characterizing "Permanently Dead" Links on Wikipedia](https://www.harsha.usc.edu/files/2022/09/imc22-perm-deadlinks.pdf), Nyayachavadi, Zhu, Madhyastha, IMC 2022
    - of 10,000 links the bot marked permanently dead, "3% ... are in fact functional today"
        - "there exist usable archived copies for over 15% of these links"
        - "5% of broken links which are currently tagged as permanently dead could be patched"
    - "many URLs are archived for the first time only after they no longer work"
- [Reviving Dead Links on the Web with Fable](https://webresearch.eecs.umich.edu/fable), Zhu et al., IMC 2023 (in the collection)
    - "17–29% of external links are broken" on Wikipedia, Medium, Stack Overflow
    - fact, why an archived copy is not enough: of 500 broken URLs "143 (28%) of these URLs have no archived copies"
        - for found aliases "9% have not been archived by Wayback Machine, 24% have stale content, and 70% include functionality that does not work on archived copies"
    - finds the page's new URL from URL-rewrite patterns
        - "false-positive rate is quite low at ∼1%"
- [Not Here, Go There: Analyzing Redirection Patterns on the Web](https://arxiv.org/abs/2507.22019), Garg et al., WebSci 2025
    - "11 million unique redirecting URIs"
        - "50% of the URIs terminated successfully, while 50% resulted in errors"
        - "62,000 custom 404 URIs, almost half being soft 404s"
- [The Paper of Record Meets an Ephemeral Web](https://doi.org/10.2139/ssrn.3833133), Zittrain, Bowers, Stanton, 2021
    - numbers from a search summary, not checked against the paper: 25% of deep links in New York Times articles are dead
        - 6% of 2018 links, 43% of 2008 links, 72% of 1998 links
- [Perma: Scoping and Addressing the Problem of Link and Reference Rot in Legal Citations](https://doi.org/10.2139/ssrn.2329161), Zittrain, Albert, Lessig, 2014: from memory, unverified: about half of the URLs in US Supreme Court opinions no longer show the cited material
    - led to Perma.cc
- [Predicting the longevity of resources shared in scientific publications](https://arxiv.org/abs/2203.12800), Acuna et al., 2022: "the most important factors are related to where and how the resource is shared, and surprisingly little is explained by the author's reputation or prestige of the journal"
- [Open is not forever: a study of vanished open access journals](https://arxiv.org/abs/2008.11933), Laakso, Matthias, Jahn, 2020: "174 OA journals that ... vanished from the web between 2000 and 2019", traced through the Wayback Machine
- links written by language models
    - [Detecting and Correcting Reference Hallucinations in Commercial LLMs and Deep Research Agents](https://arxiv.org/abs/2604.03173), Rao, Wong, Callison-Burch, arXiv 2026
    - "3--13% of citation URLs are hallucinated -- they have no record in the Wayback Machine and likely never existed -- while 5--18% are non-resolving overall"
    - inference: "no Wayback record" as proof of "never existed" is only as good as archive coverage
        - with Alkwai's 33% to 72% coverage by language, real but unarchived pages get called hallucinated
    - [The 17% Gap](https://arxiv.org/abs/2601.17431), İlter, 2026: 50 AI survey papers, "a persistent 17.0% Phantom Rate"
        - mostly "parsing-induced matching failures (78.5%)", so the headline overstates
- the Internet Archive says ([FAQ: Publishers Blocking the Wayback Machine](https://help.archive.org/help/faq-publishers-blocking-the-wayback-machine/), 2026): "the Wayback Machine has preserved roughly 15% of those otherwise vanished pages", about the pages Pew found gone
    - an in-house analysis, no paper

logged-in, social, and client-rendered content

- [Replaying Archived Twitter: When your bird is broken, will it bring you down?](https://arxiv.org/abs/2108.12092), Garg et al., JCDL 2021
    - journal version [Challenges in replaying archived Twitter pages](https://doi.org/10.1007/s00799-023-00379-w), IJDL 2023
    - after the June 2020 interface change, "Most web archives were unable to archive the new UI, resulting in archived Twitter pages displaying Twitter's 'Something went wrong' error"
    - "there is no evidence in web archives to prove that some of his tweets ever had a label assigned to them" (misinformation labels on a suspended account)
    - replay can produce "pages that never existed on the live web"
- [Discovering the Traces of Disinformation on Instagram in the Internet Archive](https://arxiv.org/abs/2301.09188), Bragg, Weigle, 2023
    - "96.13% of mementos from the Disinformation Dozen accounts redirect to the login page"
        - "merely 1.05% of mementos ... are replayable with complete post images"
        - "the percentage of replayable mementos is decreasing over time"
- [Examining the Challenges in Archiving Instagram](https://arxiv.org/abs/2401.02029), Zheng, Weigle, 2024
    - "mementos of Instagram account pages on the Wayback Machine began redirecting to the Instagram login page in August 2019"
    - meaning: the capture count looks healthy while almost every capture is a login wall
        - this is the cleanest published case of a polluted capture
- [Web Archives for Verifying Attribution in Twitter Screenshots](https://arxiv.org/abs/2510.22939), Zaki, Nelson, Weigle, 2025: finds the archived tweet behind a screenshot
    - "a dataset of 1,571 single tweet screenshots"
- [The Use of Web Archives in Disinformation Research](https://arxiv.org/abs/2306.10004), Weigle, 2023: survey of cases
    - archives are how researchers "study archived social media including deleted content"
- [A Framework for Aggregating Private and Public Web Archives](https://arxiv.org/abs/1806.00871), Kelly, Nelson, Weigle, JCDL 2018
    - public archives "are unable to capture personalized (e.g., Facebook) and private (e.g., banking) Web pages"
        - proposes Memento extensions so a personal archive can be merged with public ones without leaking
- [The Prevalence of Single Sign-On on the Web](https://dl.acm.org/doi/10.1145/3618257.3624841), Ardi, Calder, IMC 2023: in the human's `web_crawling.md`
    - logging in is feasible at scale for measurement, and no public archive does it

tampering, security, and trust in the copy

- [Rewriting History: Changing the Archived Web from the Present](https://homes.cs.washington.edu/~franzi/pdf/Lerner-RewritingHistory-CCS17.pdf), Lerner, Kohno, Roesner, CCS 2017
    - "attackers do not need to compromise the archives in order to compromise users' views of a stored page"
    - of sampled snapshots "of the past 20 years, 74% contain some vulnerability which exposes the snapshot to complete control by an attacker (65% for URLs sampled from the Top Million)"
    - the 3 holes: the replayed page fetches from the live web ("Archive-Escape")
        - all archived sites share one origin
        - a never-captured resource can be captured later by the attacker and gets matched by nearest date ("anachronisms")
    - open: measured in 2017
        - I found no re-measurement after the Wayback Machine's fixes
- [Melting Pot of Origins](https://www.ndss-symposium.org/wp-content/uploads/2020/02/24140-paper.pdf), Watanabe et al., NDSS 2020
    - archives, proxies, and translators "use a single domain name to rehost several websites", so one rehosted page can attack another
        - "The persistent MITM attack was effective on 13 web rehosting services, including prominent services such as Google Translate, Wayback Machine"
- [Hashes are not suitable to verify fixity of the public archived web](https://doi.org/10.1371/journal.pone.0286879), Aturban et al., PLOS ONE 2023
    - 16,627 mementos from 17 archives, replayed 39 times over 442 days: "88.45% of mementos produce more than one unique hash value, and about 16% (or one in six) of those mementos always produce different hash values"
    - meaning: you cannot detect tampering by hashing what an archive replays
        - replay itself is not repeatable
- [Archive Assisted Archival Fixity Verification Framework](https://arxiv.org/abs/1905.12565), Aturban et al., JCDL 2019: publish the hash manifest in several other archives so no single archive vouches for itself
- [Difficulties of Timestamping Archived Web Pages](https://arxiv.org/abs/1712.03140), Aturban, Nelson, Weigle, 2017: blockchain timestamp services "accept data by value ... but not by reference"
    - lists "requirements to be fulfilled in order to produce repeatable hash values"
- [Supporting Web Archiving via Web Packaging](https://arxiv.org/abs/1906.07104), Alam et al., 2019: position paper
    - signed exchanges from the origin would give authenticity at capture time
- [Composable Ledgers for Distributed Synchronic Web Archiving](https://arxiv.org/abs/2302.05512), Dinh, Pattengale, 2023: a notary design "that provides tamper-evident data provenance for historical web data"
    - "preliminary performance results"
- archive.today, 2026: the operator altered captures
    - [Wikipedia Signpost, 2026-03-10](https://signpost.news/2026-03-10/Technology_report): "evidence emerged that some archived pages had been modified by the webmaster, where an alias of the webmaster was replaced with the name of the owner of the blog"
        - closing statement: "evidence has been presented that archive.today's operators have altered the content of archived pages, rendering it unreliable"
        - the site was "cited almost 690 thousand times on Wikipedia"
    - meaning: this reported case concerns the archive operator itself
- archives as a tool for bad actors
    - [Understanding Web Archiving Services and Their (Mis)Use on Social Media](https://arxiv.org/abs/1801.10396), Zannettou et al., ICWSM 2018: "21M URLs from archive.is"
        - "moderators nudging or even forcing users to use archives, instead of direct links, for news sources with opposing ideologies, potentially depriving them of ad revenue"
    - [The weaponization of web archives](https://doi.org/10.37016/mr-2020-41), Acker, Chaiet, HKS Misinformation Review 2020: "misinformation tactics that leverage web archives in order to evade content moderation on social media platforms"
    - [The Silent Spill](https://arxiv.org/abs/2602.21826), Ramadan et al., 2026: URL collections including the Wayback Machine leak secrets in URLs
        - "12,331 potential exposures" in 6,094,475 URLs
- the archive as a single point of failure: in October 2024 the Internet Archive was breached (about 31 million accounts, per press reports I did not verify at the source) and knocked offline by denial-of-service attacks

robots.txt, takedowns, and publishers blocking archives

- [Robots.txt meant for search engines don't work well for web archives](https://blog.archive.org/2017/04/17/robots-txt-meant-for-search-engines-dont-work-well-for-web-archives/), Graham, Internet Archive blog 2017
    - a new robots.txt used to hide old captures: parked domains' robots.txt "has historically also removed the entire domain from view in the Wayback Machine"
    - "A few months ago we stopped referring to robots.txt files on U.S. government and military web sites for both crawling and displaying web pages"
    - pitfall: whether a capture is visible depends on the policy in force when you look
        - "not in the Wayback Machine" can mean hidden, not absent
- Longpre et al. 2024: in the top-site sample, robots.txt restricts "the Internet Archive (3.2%)" of tokens, against "OpenAI crawlers ... 25.9%" (April 2024, before the news publishers moved)
- Reddit, August 2025 ([SiliconANGLE](https://siliconangle.com/2025/08/11/reddit-says-blocking-internet-archive-stop-sneaky-ai-scrapers-accessing-content/)): the Wayback Machine "will no longer be able to archive Reddit pages, threads, profiles or comments – nothing, except for what's shown on its homepage"
    - Reddit said it had "become aware of instances where AI companies violate platform policies… and scrape data from the Wayback Machine"
- Nieman Lab, Deck and Tameez, [January 2026](https://www.niemanlab.org/2026/01/news-publishers-limit-internet-archive-access-due-to-ai-scraping-concerns/) (original article unread; quotes via [GIGAZINE's summary](https://gigazine.net/gsc_news/en/20260216-news-internet-archive))
    - secondhand: robots.txt of "a database of 1,167 news sites"
        - "241 news sites in nine countries explicitly block at least one of the Internet Archive's four crawler bots"
        - "240 of the 241 sites also target ... Common Crawl"
    - May 2026 update from the [syndicated copy](https://www.wgcu.org/section/science/2026-05-22/over-340-local-news-outlets-are-limiting-the-internet-archives-access-to-their-journalism): "382 news websites disallowed at least one Internet Archive-affiliated bot"
    - the Internet Archive's [FAQ](https://help.archive.org/help/faq-publishers-blocking-the-wayback-machine/) quotes the report: "None of the publishers were able to point to a particular AI company or other kinds of direct evidence that their content had already been scraped by the Wayback Machine"
- Nieman Lab, October 2025 (via [beSpacific's excerpt](https://www.bespacific.com/?p=118160)): "Between January 1 and May 15, 2025, the Wayback Machine shows a total of 1.2 million snapshots collected from 100 major news sites' homepages. Between May 17 and October 1, 2025, it shows 148,628 snapshots from those same 100 sites — a decline of 87%"
    - this drop came from the archive's own crawling projects, not from blocking
        - any study of blocking effects must separate the two
- inference: all of this is journalism on news sites and robots.txt text
    - the papers reviewed do not measure what blocking did to capture counts, or blocking done at the firewall, where robots.txt shows nothing

known pitfalls and unsolved problems

- a capture is a collage: HTML, images, scripts, and JSON come from different dates (Ainsworth 2015, Weigle 2023)
    - report the spread of dates, not only the page's date
- capture count is not copy count: redirects (Kelly 2017), revisit records (Garg 2025), login walls (Bragg 2023), and error pages all sit in the index as captures
- nearby captures disagree, and it depends on who captured: aggregate a window of captures and give bounds (Hantke 2023)
- raw archived HTML undercounts anything loaded by script: 73% versus 92 to 95% for trackers (Hantke 2023)
    - but running archived script is not faithful either (Jawa, FidEx)
- the archive filters by design: Save Page Now dropped ads before August 2023 (Reid 2025)
    - robots.txt hid whole domains after the fact (Graham 2017)
- sampling from an archive samples the archive's attention: more recent, more popular, more English (Garg 2025, Alkwai 2017)
    - every "the web over 25 years" study that starts from a top list of today also has survivor bias
- replay can touch the live web, and can write to the archive (Lerner 2017, Garg 2022)
    - measure in an isolated replay with live access blocked
- public capture verification remains limited: hashes of replay are not stable (Aturban 2023), archives do not expose signed raw records, and one operator did alter captures (archive.today)
- the Internet Archive is one organization: its crawl volume, policies, and outages (October 2024, May to October 2025) move every result
    - Hantke shows no second source comes close
- unsolved: an oracle for "this capture shows the real page" that works on old captures made by someone else
    - FidEx needs the original crawl-time trace

research ideas

1. polluted captures: how much of the archive is a wall, not the page
    - question: per year, what share of Wayback captures of ordinary pages are bot challenges, CAPTCHAs, login walls, consent walls, paywalls, geo-blocks, or parked pages, served with status 200
    - why not answered: Bragg 2023 and Zheng 2024 show 96% login redirects for Instagram only
        - Hantke 2023 sees the noise as status code and contributor effects but does not classify pages
        - my searches found only help-desk pages about Cloudflare blocks, no measurement paper
    - what we would do: sample URLs with the Garg 2025 method, pull captures per year, classify with cheap signatures first (challenge script URLs, known vendor markup, tiny body size, title strings), then a small labeled set for a text classifier
        - split by capture source (crawl, Save Page Now, Archive-It)
    - data and tools: CDX index (length and digest fields give a first cut without fetching bodies), DeGenTWeb's page classifiers, Common Crawl as a second archive with different crawler identity
    - main risk: rate limits on fetching bodies
        - and the trend may be flat outside social platforms
    - confidence the gap is real: medium-high
        - it also yields a filter every later archive study needs

2. what publisher blocking did to the record
    - question: when a site starts blocking archive crawlers (robots.txt or firewall), how do capture count, capture depth, and capture quality change, and who fills the gap (Save Page Now users, archive.today, nobody)
    - why not answered: Nieman Lab counted robots.txt rules on 1,167 news sites
        - Longpre 2024 stops at April 2024 with 3.2% for the Internet Archive
        - neither looks at captures, at non-news sites, or at firewall blocks
    - what we would do: robots.txt history from Common Crawl and Wayback for a Tranco sample
        - per-site capture time series from CDX
        - an event study around the blocking date, with non-blocking sites as controls to remove the May to October 2025 crawl drop
        - probe firewall blocking by fetching with the archive's user agent strings from a neutral address (shows user-agent rules only, not address rules)
    - main risk: the Internet Archive may ignore or honor robots.txt per site in ways we cannot see
        - journalists keep publishing the easy half
    - confidence: medium-high that the capture-side analysis is new
        - time-sensitive

3. do old captures still run: replay rot measured by browser API calls
    - question: load captures from 2005 to 2024 in today's Chrome
        - how much of their JavaScript throws or silently skips because browser APIs, plugins, or third-party endpoints are gone, by capture year
    - why not answered: FidEx (NSDI 2026) compares a fresh crawl with its own replay and targets rewriting bugs
        - Jawa targets nondeterminism
        - Kelly 2013 is about capture, by example
        - emulated old browsers (oldweb.today) exist as practice with no numbers
        - one search for a quantitative study found none
    - what we would do: use the JSphere instrumented browser to log API calls and exceptions on a year-stratified capture sample, in isolated replay
        - attribute failures to (a) removed or changed API, (b) missing resource, (c) rewriting, using Chrome's deprecation lists
        - rerun a subset in an old browser build as ground truth
    - main risk: separating (a) from (b) and (c) is the whole paper
        - it may turn out that missing resources dominate and browser change is small
    - confidence: medium

4. can JSphere go back in time: calibrating archived script behavior
    - question: if we classify what scripts do from API traces of archived pages, how wrong are we compared with the live page captured the same day
    - why not answered: Hantke 2023 calibrated headers and script inclusion, not behavior
        - FidEx tracks only writes that affect layout
        - tracker and fingerprinting calls are exactly what it ignores
    - what we would do: for a few thousand live pages, record a trace live, submit to Save Page Now and crawl with Browsertrix, replay both, diff API-call sets per script
        - publish per-category error rates and a list of APIs that replay systems override
    - main risk: Save Page Now's ad filter and replay overrides may make whole categories unmeasurable, which is still a result
    - confidence: medium-high
        - it is the entry ticket for any historical JSphere study

5. drift into machine-written pages, and takeover of dead domains that are still cited
    - question: for URLs cited by Wikipedia or papers with a capture before 2022, how often does today's page hold different, machine-written text, and how often is the cause a re-registered expired domain
    - why not answered: Jones 2016 measured drift before language models
        - Fable and the dead-links paper look for where the page moved
        - the sibling's 2026 studies measure the share of new archived URLs that look generated, not same-URL replacement
        - I found only news stories on single cases (an expired political consulting firm's domain turned content farm)
    - what we would do: Wikipedia external links plus first and latest captures
        - text similarity to flag replacement
        - WHOIS or certificate history to flag re-registration
        - the DeGenTWeb detector on the new text
    - main risk: detector error on short or non-English pages
        - the count may be small though each case is harmful
    - confidence: medium-high

6. archive coverage against what people actually visit, 2026
    - question: what share of pages people visit has a usable capture within a month, by popularity, language, country, and page depth
    - why not answered: Ainsworth 2011 and Alkwai 2017 sampled from directories and search engines of their time
        - Hantke gives one number (55% of a Tranco sample with fresh data)
        - Paris 2026 gives a method but applies it to one academic crawl
    - what we would do: population from the Chrome user experience report origins plus Common Crawl URLs within them
        - CDX lookups
        - "usable" defined with the idea-1 filter
        - apply the Paris capture-recapture estimator to Wayback and Common Crawl as a cross-check
    - by-product: the false-accusation rate of "no Wayback record means the model made the URL up" (Rao 2026)
    - main risk: reads as an update paper unless tied to a consequence such as the by-product above
    - confidence: medium

7. HTML and data from different days, at scale
    - question: across client-rendered sites, how often does a replayed capture join HTML from one day with API data from another, and does the visible content differ
    - why not answered: Weigle 2023 documents one news site
        - Ainsworth 2015 covers images and styles in 2015-era pages
    - what we would do: replay a sample in isolation, log each response's capture date, flag pages whose data responses are more than a day from the HTML, compare rendered text across neighbors
        - this is also the test bed for the sibling's "atoms as coherence unit" idea
    - main risk: heavy replay load on the Internet Archive
        - may need a partnership or Common Crawl plus own crawls
    - confidence: medium-high

8. a repeatable fingerprint for a capture
    - question: can we define a digest of a capture that is stable across replays and archives, so two parties can check they saw the same page
    - why not answered: Aturban 2023 shows naive hashing fails for 88% of mementos and asks for "an archive-aware hashing function"
        - this review found no deployed solution
        - signing in WACZ covers only archives you made yourself
    - what we would build: hash the raw response payloads the replay actually used (the archives' unrewritten endpoints) plus their capture dates, as a Merkle list
        - test stability over months on the Aturban sample
    - main risk: public archives do not expose all raw records
        - and a stable digest proves sameness, not truth
    - confidence: medium that it is open
        - low-medium on impact without an archive adopting it

9. is the archive really a side door for AI scrapers
    - question: do AI search products and model crawlers fetch Wayback copies of pages that block them on the live site
    - why not answered: publishers assert it and "None of the publishers were able to point to ... direct evidence"
        - Jayanetti's log study ends in 2019
    - what we would do: publish canary pages with unique strings, capture them with Save Page Now, then block AI agents on the live site
        - ask browsing assistants about the canaries and watch our server logs
        - a second canary set that exists only in the archive after the live page is deleted
    - main risk: a null result is hard to interpret
        - training-time use takes a model release cycle to show
    - confidence: medium-high based on the literature reviewed
        - cheap to start

already done, do not repeat

- execution-based fidelity checking of fresh crawls: FidEx
- classifying dead versus invented URLs in model output with the Wayback Machine: Rao et al. 2026
- validating archives for security-header history: Hantke et al. 2023

what I could not cover

- no separate ChatGPT consultation for this archive subreview
    - [group consultation](../llm_text/chatgpt_consultation.md) records the completed LLM-text consultation
- unread, so stated from memory or search summaries and marked as such: Thelwall and Vaughan 2004, Hale et al. 2017, Zittrain et al. 2014 and 2021, Brunelle et al. 2016, Pletinckx et al. 2021, Costa et al. 2017, the Garg lifespan results, the original Nieman Lab articles
- national library archives (UK, Denmark, France, Portugal) and legal-deposit access rules: only touched
    - the humanities literature on archives as historical sources (Brügger, Milligan) is skipped
- court use of Wayback captures as evidence, and takedown and exclusion request practice: no measurement papers found, did not search law reviews
- IIPC conference talks and Internet Archive internal reports, where much recent practice lives outside papers
- 2025 to 2026 search coverage is thinner than the earlier literature
