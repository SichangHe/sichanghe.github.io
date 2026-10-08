# search spam: finding knowledge among spam on the web
(authored by agents unless marked 🧑)

short version

- the human's questions: "how to find knowledge among spam on the web", idea "search engine exclude spam"
- what the literature settles
  - search spam is a 20-year contest; the measured pattern is containment, not victory
    - inference from Leontiadis 2014 and Bevendorff 2024: spam enters, an update pushes it out, it returns
  - LLMs made mass production cheap; the share of generated text on the open web is now large
    - how much reaches search results is disputed and depends on the detector
  - this selected reading did not establish whether exclusion helps people find answers on live engines
    - Cormack 2011 did it once on a frozen 2009 collection with TREC judges
    - the recorded searches found no matched academic evaluation of uBlacklist, Kagi, Brave Goggles, and Marginalia
      - a missed evaluation could change the proposed contribution
- strongest research ideas, agent ranking
  1. does blocking spam fix search? run existing blocklists and quality classifiers as filters over real results and measure what users gain and lose (idea 1 below)
  2. do answer engines cite generated sites more than organic search does? a field version of the lab finding that rankers prefer LLM text, reusing the human's DeGenTWeb detector (idea 2)
  3. who runs the slop and who pays them? cluster generated search-result sites by ad and affiliate identifiers (idea 3)
- these are agent opinions; no prototype or novelty check beyond the searches recorded below

human's words and scope

- from the [research notes index](../../../index.md)
  - meta question: "how to find knowledge among spam on the web"
  - idea: "search engine exclude spam"
  - wants: "significant & popular, easy sell", "easy to implement"
- from [web user-facing notes](../../../web_user_facing.md), human's own ideas
  - "ranking based on user feedback"
  - "measuring retrieval of Perplexity, ChatGPT, etc. in search mode"
- this file covers web search spam and finding useful pages
  - misinformation moved to [misinformation.md](misinformation.md)
  - bot campaigns moved to [social_media_bots.md](social_media_bots.md)
  - deeper notes on search quality, evidence checking, and 2026 RAG poisoning papers: [sibling search quality study](../../../topic_studies/web_llm_detection/web_user/seo_search_quality/index.md)
    - that study recommends a pilot on version-specific technical claims; I do not repeat it here
  - how much of the web is AI text: [sibling measurement review](../../../topic_studies/web_llm_detection/llm_provenance/generated_web_measurement.md)
- the human's own ongoing work: DeGenTWeb draft for IMC 2026
  - decides per website whether most of its prose pages look LLM-written
    - scores pages with Binoculars, a zero-shot LLM-text detector, then combines 20 pages per site
    - false-positive rate measured on sites crawled entirely before ChatGPT
  - draft abstract reports Common Crawl sites 6.0% LLM-dominant, Bing how-to result sites 16.4%, "a measurable subset of LLM-dominant search-result sites are mass-produced from shared templates"
  - ideas 1, 2, 3, and 5 below reuse this pipeline

what "spam" means here

- Gyöngyi and Garcia-Molina, [Web Spam Taxonomy](https://airweb.cse.lehigh.edu/2005/gyongyi.pdf), AIRWeb 2005
  - "Web spamming refers to actions intended to mislead search engines into ranking some pages higher than they deserve"
  - term spam, link spam, hiding (cloaking, redirection)
- Google's current categories, [spam policies](https://developers.google.com/search/docs/essentials/spam-policies)
  - scaled content abuse: "producing content at scale to boost search ranking — whether automation, humans or a combination are involved"
  - site reputation abuse: "third-party content is published on a host site mainly because of that host's already-established ranking signals"
  - expired domain abuse
- "slop" has no agreed definition
  - Shaib, Chakrabarty, Garcia-Olano, Wallace, [Measuring AI "Slop" in Text](https://arxiv.org/abs/2509.19163), arXiv Sept 2025
  - "there is currently no agreed upon definition of this term nor a means to measure its occurrence"
  - their dimensions: information utility, information quality, style quality
- inference: for research, label observable things separately
  - affiliate links, ads, generated text, copied text, cloaking, usefulness to the query
  - "spam" as one label hides which failure is being measured

literature 1: the classic arms race, 2004 to 2013

- Fetterly, Manasse, Najork, [Spam, Damn Spam, and Statistics](https://www.microsoft.com/en-us/research/?p=144998), WebDB 2004
  - "outliers in the statistical distribution of these properties are highly likely to be caused by web spam"
  - finds machine-generated spam, not hand-built spam
- Gyöngyi, Garcia-Molina, Pedersen, [Combating Web Spam with TrustRank](https://www.vldb.org/conf/2004/RS15P3.PDF), VLDB 2004
  - "We first select a small set of seed pages to be evaluated by an expert", then spread trust along links
  - 178 seed sites after inspecting over 2,000; assumption: good sites rarely link to bad sites
  - still the basis of Marginalia's ranking today (see tools below)
- Wu and Davison, [Identifying Link Farm Spam Pages](https://archives.iw3c2.org/www2005/proceedings/docs/p820.pdf), WWW 2005
  - "A link farm is a network of web sites which are densely connected with each other"
- Ntoulas, Najork, Manasse, Fetterly, [Detecting Spam Web Pages through Content Analysis](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/www2006.pdf), WWW 2006
  - "correctly identify 2,037 (86.2%) of the 2,364 spam pages (13.8%) in our judged collection of 17,168 pages, while misidentifying 526 spam and non-spam pages (3.1%)"
  - features: word counts, compressibility, visible-text fraction, n-gram likelihood
  - inference: 2004-era spam was statistically odd; LLM text is fluent, so these signals weaken
- Castillo, Donato, Gionis, Murdock, Silvestri, [Know your Neighbors](https://doi.org/10.1145/1277741.1277814), SIGIR 2007
  - "linked hosts tend to belong to the same class: either both are spam or both are non-spam"
  - datasets WEBSPAM-UK2006/UK2007, about 6,479 labeled hosts of 114,529 (snippet only)
- Cormack, Smucker, Clarke, [Efficient and Effective Spam Filtering and Re-ranking for Large Web Datasets](https://arxiv.org/pdf/1004.5168), Information Retrieval 2011
  - "a simple content-based classifier with minimal training is efficient enough to rank the 'spamminess' of every page in the dataset using a standard personal computer in 48 hours"
  - "The results of classical information retrieval methods are particularly enhanced by filtering — from among the worst to among the best"
  - this is the closest existing "search engine exclude spam" experiment: filter ClueWeb09, then rerun TREC
  - limitation: one static collection, 2009 spam, the authors' own labels
- Spirin and Han, [Survey on web spam detection](https://dl.acm.org/doi/10.1145/2207243.2207252), SIGKDD Explorations 2012
  - groups methods into content, link, and user-behavior signals (snippet only)
- takeaway: content, link, and trust-seed methods all exist and all are static
  - only Cormack measures retrieval quality after filtering, and only on a frozen collection with TREC judges
  - none measures what a person finds on a live engine

literature 2: search poisoning measured at security venues

- Leontiadis, Moore, Christin, [Measuring and Analyzing Search-Redirection Attacks](https://www.usenix.org/legacy/event/sec11/tech/full_papers/Leontiadis.pdf), USENIX Security 2011
  - "about one third of all search results are one of over 7 000 infected hosts triggered to redirect to a few hundred pharmacy websites"
  - "Legitimate pharmacies and health resources have been largely crowded out by search-redirection attacks and blog spam"
  - method: 218 drug queries scraped daily for nine months
- Leontiadis, Moore, Christin, [A Nearly Four-Year Longitudinal Study of Search-Engine Poisoning](https://www.andrew.cmu.edu/user/nicolasc/publications/LMC-CCS14.pdf), CCS 2014
  - "rising from around 30% in late 2010 to a peak of nearly 60% in late 2012, despite efforts by search engines and browsers"
  - median clean-up time fell from about 30 days to about 15 days
- Wang, Savage, Voelker, [Cloak and Dagger](https://cseweb.ucsd.edu/~dywang/pubs/ccs298-wang.pdf), CCS 2011
  - "cloakers can expect to maintain their pages in search results for several days on popular search engines"
  - cloaked results about 9.4% on Google, 7.7% on Yahoo for the studied terms
- Wang, Savage, Voelker, [Juice: A Longitudinal Study of an SEO Botnet](https://www.ndss-symposium.org/wp-content/uploads/2017/09/07_4_0.pdf), NDSS 2013
  - "this botnet is both modest in size and has low churn—suggesting little adversarial pressure from defenders"
  - one botnet produced 69% of poisoned trending-search results at its peak
- John, Yu, Xie, Krishnamurthy, Abadi, [deSEO](https://www.usenix.org/legacy/event/sec11/tech/full_papers/John.pdf), USENIX Security 2011
  - "This attack employs over 5,000 compromised Web sites and poisons more than 20,000 popular search terms"
  - detects from URL patterns in search logs, no page content
- Lu, Perdisci, Lee, [SURF](https://doi.org/10.1145/2046707.2046762), CCS 2011
  - browser-side detector of search-then-redirect sessions, "detection rate of 99.1% at a false positive rate of 0.9%"
- Chinese black-hat SEO line
  - Yang et al., [How to Learn Klingon without a Dictionary](https://www.ieee-security.org/TC/SP2017/papers/142.pdf), S&P 2017: 478,879 "black keywords" on Baidu
  - Du et al., [The Ever-changing Labyrinth](https://www.usenix.org/system/files/conference/usenixsecurity16/sec16_paper_du.pdf), USENIX Security 2016: wildcard-DNS SEO
  - Yang et al., [Scalable Detection of Promotional Website Defacements](https://www.usenix.org/system/files/sec21fall-yang-ronghai.pdf), USENIX Security 2021: "found defacements in 11% of these websites" across 7000+ commercial Chinese sites
  - Zhang et al., Into the Dark: internal site search abused for SEO, USENIX Security 2024 (snippet only)
  - Wu, Xue, Zhou, Mi, [Reflected Search Poisoning for Illicit Promotion](https://arxiv.org/pdf/2404.05320), arXiv 2024: "over 11 million distinct" illicit promotion texts in "14 different illicit categories"
- takeaway: the security community measures spam in verticals with clear harm (pharma, malware, gambling)
  - the method is always the same: fixed query panel, daily scrape, classify, track over time
  - we found no such study of the ordinary "low quality but legal" spam that now dominates complaints
  - inference: that gap is where "how to find knowledge" lives, and it fits IMC

literature 3: content farms and SEO in mainstream results

- McCreadie, Macdonald, Ounis, Giles, Jabr, [An Examination of Content Farms in Web Search using Crowdsourcing](https://eprints.gla.ac.uk/78528), CIKM 2012
  - "between the period of March and August 2011, the number of content farm articles observed on a number of indicative queries was reduced by up to 55% in the top ranks"
  - the Panda era; 4-page paper, few queries
- Lewandowski, Sünkler, Yagci, [The influence of search engine optimization on Google's results](https://doi.org/10.1145/3447535.3462479), WebSci 2021
  - "a large fraction of pages found in Google is at least probably optimized"
  - detects optimization, not harm; the human's notes already call its heuristics questionable
- Bevendorff, Wiegmann, Potthast, Stein, [Is Google Getting Worse?](https://downloads.webis.de/publications/papers/bevendorff_2024a.pdf), ECIR 2024, full text read
  - "We monitored Google, Bing and DuckDuckGo for a year on 7,392 product review queries"
  - "only a small portion of product reviews on the web uses affiliate marketing, but the majority of all search results do"
  - "higher-ranked pages are on average more optimized, more monetized with affiliate marketing, and they show signs of lower text quality"
  - "Google's updates in particular are having a noticeable, yet mostly short-lived, effect"
  - three scenarios they test: engines losing, engines winning, or "repeated breathing patterns"; "it seems like (3) is the most likely scenario"
  - "the line between benign content and spam in the form of content and link farms becomes increasingly blurry—a situation that will surely worsen in the wake of generative AI"
  - future work: "evaluate how we can better build and evaluate truly robust web IR systems in competitive environments"
  - [code and data](https://github.com/webis-de/ECIR-24); the human's DeGenTWeb draft already uses a "retrospective multi-engine SERP archive" (SERP: a search result page)
  - limits: product reviews only, English only, no AI-text measurement, Bing and DuckDuckGo share an index
- Kollnig, [The enshittification of online search?](https://arxiv.org/abs/2512.03793), arXiv Dec 2025
  - 1,467 coding queries, Oct 2023; "the quality of coding advice -- as measured by the average rank of Stack Overflow -- was highest on Bing"
  - crude proxy, but shows programming queries are an easy stratum with a natural ground truth
- Geraci, [Identification of Web Spam through Clustering of Website Structures](https://dl.acm.org/doi/10.1145/2740908.2742127), WWW 2015 companion, full text read
  - parked domains "hosted by the same service provider tend to have similar look-and-feel"; clusters by page structure
  - inference: template similarity is a cheap operator signal, matching the DeGenTWeb template finding

literature 4: the LLM era

4a. how much generated text is out there

- details and all studies: [sibling review](../../../topic_studies/web_llm_detection/llm_provenance/generated_web_measurement.md)
- numbers disagree because detectors, thresholds, and populations differ
  - Pew, [How Much of the Internet Is Written With AI?](https://www.pewresearch.org/data-labs/2026/08/20/how-much-of-the-internet-is-written-with-ai/), Aug 2026: "35% of pages in the July 2026 crawl with post-ChatGPT publication dates show signs of AI authorship", about 1 in 10 of all pages
  - Graphite, [More Articles Are Now Created by AI Than Humans](https://graphite.io/five-percent/more-articles-are-now-created-by-ai-than-humans), Oct 2025: "In November 2024, the quantity of AI-generated articles being published on the web surpassed the quantity of human-written articles"; 65,000 Common Crawl article URLs, Surfer detector
  - Ahrefs, [900k new pages](https://ahrefs.com/blog/what-percentage-of-new-content-is-ai-generated/), May 2025: 74.2% contain some AI text, 2.5% pure AI
  - DeGenTWeb draft: 6.0% of Common Crawl sites LLM-dominant, 28.6% of sites first seen in 2025H1
- content farms specifically
  - NewsGuard [AI Tracking Center](https://www.newsguardtech.com/special-reports/ai-tracking-center/): 3,749 "AI Content Farm" news sites in 16 languages as of 23 June 2026; was 49 in May 2023, 840 in June 2024 (Puccetti et al. cite those)
    - "the revenue model for these websites is programmatic advertising"
    - 2023: "Ninety percent of the ads from major brands found on these AI-generated news sites were served by Google" ([MIT Technology Review](https://www.technologyreview.com/2023/06/26/1075504/))
  - Puccetti, Rogers, Alzetta, Dell'Orletta, Esuli, [AI 'News' Content Farms Are Easy to Make and Hard to Detect](https://aclanthology.org/2024.acl-long.817/), ACL 2024, full text read
    - fine-tune Llama on 40k Italian news articles; natives spot synthetic text "with only 64% accuracy, vs 50% random guess"
    - "there are currently no practical methods for detecting synthetic news-like texts 'in the wild', while generating them is too easy"
  - Hanley and Durumeric, [Machine-Made Media](https://arxiv.org/abs/2305.09820), ICWSM 2024
    - 3,074 news sites, Jan 2022 to May 2023; synthetic articles rose 57.3% on mainstream and 474% on misinformation sites after ChatGPT

4b. how much reaches search results

- Originality.ai, [AI Content in Google Search Results](https://originality.ai/ai-content-in-google-search-results), ongoing
  - "500 Google Search keywords were chosen", top 20 results every two months from Internet Archive snapshots, own detector at 0.5
  - "As of September 2025, 17.31% of the top 20 search results are AI-generated"; peak 19.56% July 2025; 7.43% on 5 March 2024 right after Google's update
  - vendor sells the detector; no false-positive figure on this population
- Graphite, [AI content in search and answer engines](https://graphite.io/five-percent/ai-content-in-search-and-llms), 2025
  - "86% of articles ranking in Google Search are written by humans, and only 14% are generated using AI"; "only 7% of the articles ranking number one"
  - ChatGPT and Perplexity citations: "82% of cited articles are written by humans, and only 18% ... generated using AI"
  - inference: if half of new articles are AI but 14% of ranking pages are, ranking already filters hard
    - weak: the two samples differ in page age and detector, so this is a hint, not a measurement
- Ahrefs, [AI Overviews cite AI content](https://ahrefs.com/blog/ai-overviews-cite-ai-generated-content-more-than-human-writing/), July 2025: top-3 citations 3.6% pure AI, 8.6% pure human, 87.8% mixed
- DeGenTWeb draft: Bing how-to result sites 16.4% LLM-dominant, "a 10.4-percentage-point gap above the open-web baseline on the same classifier"
- takeaway: result-side numbers come from detector vendors, except the human's draft and Allaham's single snapshot (below)
  - we found no peer-reviewed longitudinal measurement of generated text in results
  - the human's draft is the closest; it is one engine, one query genre, and looks backward

4c. ranking systems prefer generated text in the lab

- Dai et al., [Neural Retrievers are Biased Towards LLM-Generated Content](https://arxiv.org/abs/2310.20501), KDD 2024
  - "neural retrieval models tend to rank LLM-generated documents higher. We refer to this category of biases ... as the source bias"
  - explanation: "LLM-generated texts exhibit more focused semantics with less noise"
  - companion benchmark [Cocktail](https://arxiv.org/abs/2405.16546), Findings of ACL 2024
- Chen et al., [Spiral of Silence](https://arxiv.org/abs/2404.10496), ACL 2024
  - simulated feedback loop; "LLM-generated text consistently outperforming human-authored content in search rankings"
- Yu, Kim, Kim (NAVER), [Retrieval Collapses When AI Pollutes the Web](https://arxiv.org/abs/2602.16136), WWW 2026 short
  - injected SEO-style AI pages into retrieval pools; 67% pool contamination gave over 80% exposure contamination
  - BM25 exposed about 19% harmful content under adversarial injection; LLM rankers suppressed it better
- limits shared by all three: synthetic corpora, lab retrievers, no real engine
  - inference: whether Google, Bing, or answer engines show source bias in the field is unmeasured; idea 2 below

4d. answer engines and what they cite

- Liu, Zhang, Liang, [Evaluating Verifiability in Generative Search Engines](https://arxiv.org/abs/2304.09848), 2023
  - "only 74.5% of citations support their associated sentence"
- Allaham and Diakopoulos, [Synthetic Sources?](https://arxiv.org/abs/2605.23684), AIES 2026
  - 712 queries, ChatGPT, Copilot, Gemini, Perplexity; "evidence of AI-generated sources being cited across all four generative search engines (~16% of cited sources)"
  - single snapshot, three topics, detector error not checked in what we read
- Xu, Iqbal, Montgomery, [Measuring Google AI Overviews](https://arxiv.org/abs/2605.14021), IMC 2026
  - 55,393 trending queries, 19 categories, 40 days, March to April 2026
  - activation 13.7% overall, 64.7% for question-form queries
  - cited domains more credible than first page: mean 0.732 vs 0.645
  - "29.8% of AIO-cited domains do not appear anywhere on the corresponding first page"
  - 11.0% of 98,020 atomic claims unsupported by the cited pages
  - "we scope our findings to the U.S.-localized AIO experience"; measures credibility ratings, not generated text
- Grossman et al., [How Generative AI Disrupts Search](https://arxiv.org/abs/2604.27790), SIGIR 2026
  - 11,500 queries; "the retrieved sources are substantially different for each search engine (<0.2 average Jaccard similarity)"; "significantly more likely to retrieve Google-owned content"
  - AIO rate 51.5% vs Xu's 13.7%: query sampling matters a lot
- Aral, Li, Zuo, [The Rise of AI Search](https://arxiv.org/abs/2602.13415), arXiv Feb 2026
  - 24,000 queries, 243 countries, 2024 and 2025; "AI search surfaces significantly fewer long tail information sources, lower response variety, and significantly more low credibility ... information sources, compared to traditional search"
- Pew, [AI summary click study](https://www.pewresearch.org/short-reads/2025/07/22/google-users-are-less-likely-to-click-on-links-when-an-ai-summary-appears-in-the-results/), July 2025
  - 900 US adults, March 2025; clicked a result in 8% of visits with a summary vs 15% without
- takeaway: 2026 has a wave of answer-engine audits, all measuring credibility, overlap, or support
  - only Allaham measured generated sources in peer review, once; Graphite and Ahrefs did it as vendors; Xu's and Aral's credibility results point opposite ways
  - gap: generated-text share of citations vs organic results for the same queries, over time, with a detector whose error is known

4e. manipulation of answer engines

- covered in depth by the sibling [recent work note](../../../topic_studies/web_llm_detection/web_user/seo_search_quality/recent_work.md)
- Aggarwal et al., [GEO](https://arxiv.org/abs/2311.09735), KDD 2024: "boost visibility by up to 40%"
- Nestaas, Debenedetti, Tramèr, [Adversarial SEO for LLMs](https://arxiv.org/abs/2406.18382), 2024: already in the human's notes
- Pfrommer et al., [Ranking Manipulation for Conversational Search Engines](https://arxiv.org/abs/2406.03589), EMNLP 2024
- Zou et al., [PoisonedRAG](https://arxiv.org/abs/2402.07867), USENIX Security 2025: "90% attack success rate when injecting five malicious texts"
- Martinez, [critical survey of GEO 2023 to 2026](https://arxiv.org/abs/2607.14035), arXiv July 2026, 45 studies
  - no method shows "a stable, longitudinal, cross-platform causal effect on organic discoverability or downstream behavior"
  - inference: the GEO literature is attack demos without field prevalence; measurement, not another attack, is the open slot

literature 5: what the engines say they do

- Google, [March 2024 update post](https://blog.google/products/search/google-search-update-march-2024/)
  - "we expect that the combination of this update and our previous efforts will collectively reduce low-quality, unoriginal content in search results by 40%"
  - April update: "You'll now see 45% less low-quality, unoriginal content in search results"
  - self-reported, no method; Originality.ai's drop to 7.43% in March 2024 is the only outside number, and it rebounded within a year
  - later spam updates on the status dashboard: August 2025, September 2026
  - site reputation abuse manual actions limited outside the EEA from 30 Aug 2026 ([SERoundtable](https://seroundtable.com/google-site-reputation-policy-eea-41968.html))
- 2024 Content Warehouse API leak, [Fishkin, SparkToro](https://sparktoro.com/blog/an-anonymous-source-shared-thousands-of-leaked-google-search-api-documents-with-me-everyone-in-seo-should-see-them/)
  - 14,014 attributes; click attributes such as "goodClicks", "badClicks", "lastLongestClicks" (paraphrase by the fetch tool)
  - Google did not confirm usage
  - inference: user clicks are probably already a ranking signal, but this is a leak, not a confirmation
- Google Personal Blocklist extension, [Chrome blog 2011](https://chrome.googleblog.com/2011/02/new-chrome-extension-block-sites-from.html)
  - Google said it would "study the resulting feedback and explore using it as a potential ranking signal" (snippet only)
  - precedent for the human's "ranking based on user feedback"; no published evaluation

literature 6: deployed exclusion tools and their evidence limits

- [uBlacklist](https://github.com/iorate/ublacklist), 6.7k stars
  - "Blocks specific sites from appearing in Google search results"; subscribes to public rule lists
  - [machine-translated Stack Exchange clone list](https://github.com/arosh/ublacklist-stackoverflow-translation), 958 stars
  - [HUGE AI image blocklist](https://github.com/laylavish/uBlockOrigin-HUGE-AI-Blocklist), 5.8k stars, images only
  - no text content farm or "AI slop" list found
- Kagi
  - [per-site block, lower, raise, pin](https://help.kagi.com/kagi/features/website-info-personalized-results.html)
  - [public leaderboard of most blocked domains](https://blog.kagi.com/tips/domain-ranking): Pinterest variants top, then Quora, Amazon, Stack Exchange mirrors
  - [Small Web](https://blog.kagi.com/small-web): "a curated list of nearly 6,000 genuine websites"
  - own indexes Teclis and TinyGem for non-commercial content; Marginalia among sources
- Brave Search [Goggles](https://github.com/brave/goggles-quickstart)
  - "enable anyone, be it individuals or a community, to alter the ranking of Brave search by using a set of instructions (rules and filters)"
  - rules `$boost`, `$downrank`, `$discard`; Brave's 2022 [Goggles paper](https://brave.com/goggles) argues ranking secrecy is needed because openness "would immediately result in a boost of those sites that rely on SEO"
- [Marginalia Search](https://about.marginalia-search.com), one person, open source
  - [Trust in Ranking, Jan 2026](https://www.marginalia.nu/log/a_130_trust_in_ranking/): "A large set of trusted domains known to be high quality was selected" and trust flows through links
    - my reading: this is the TrustRank idea; the post does not name it
  - claims it "drastically reduces the number of content farm results, as long as there are human results it usually finds them across all the usual test queries"
  - admits "it becomes harder for new websites to establish a foothold", "works poorly across language barriers", and "I will not share exactly which websites these are, as it paints a target on them for black-hat SEO"
  - no independent test
- [Stract](https://github.com/StractOrg/stract): Goggles-like "optics", archived April 2026
- [OpenWebSearch.eu](https://openwebsearch.eu/) Open Web Index: federated crawl, about 28M hosts, research-only access; funded Bevendorff's paper
- LLM pretraining quality filters supply web classifiers worth comparing with search-specific filters
  - this reading did not establish whether that comparison is already published
  - [FineWeb-Edu classifier](https://huggingface.co/HuggingFaceFW/fineweb-edu-classifier), Penedo et al. 2024: Llama-3-70B labeled 450k pages; card warns of "potential bias toward academically-formatted material"
  - DCLM, Li et al. 2024: "fastText OH-2.5 + ELI5 classifier score to keep the top 10% of documents"
  - Klimaszewski and Andruszkiewicz, [Is a Document Educational or Just Wikipedia-Style?](https://aclanthology.org/2026.acl-short.10/), ACL 2026 short: "a straightforward Wikipedia-style reformatting operation can substantially alter a model's quality assessment"; FineWeb-Edu flips about 7% of documents
- takeaway: the "search engine that excludes spam" exists in at least five forms
  - the examples use lists, trusted seeds, and user preferences among their mechanisms
  - this reading did not establish a matched comparison of coverage, agreement, discovery delay, and user outcomes

candidate questions and closest-work checks

- these are unresolved questions in this selected reading
  - no field-wide absence or novelty claim follows
  - check the nearest prior evaluations before building an experiment
- does exclusion improve correct answers as well as classifier accuracy or measured prevalence?
- do real search and answer engines reproduce the source preferences observed in laboratory retrievers?
- how do deployed blocklists and alternative engines compare under matched queries and human judgments?
- who operates the generated sites, and which revenue observations support attribution?
- can a prospective multi-engine study retain measured detector false positives as content changes?
- Bevendorff names "robust web IR systems in competitive environments" as future work
  - a later paper may already have addressed it

idea 1: does blocking spam fix search?

- question: when you exclude what today's tools call spam, do results answer the query more often, and what do you lose?
- why this is the direct answer to "search engine exclude spam"
  - the tools exist, so the research is the measurement, not the engine
  - popular: uBlacklist, Kagi, Brave users already do this; a quotable number sells itself
  - easy to implement for the list and classifier arms: a [SearXNG](https://github.com/searxng/searxng) metasearch plug-in that drops or reranks results after the engine returns them
    - not reproducible as a post-filter: Brave's own Goggles ranking, Kagi's per-user ranking, Marginalia's secret seeds
    - treat those as whole-engine arms instead: query Brave with a Goggle, query Kagi, query Marginalia, compare their top 10 directly
- filters to compare
  - crowd lists: uBlacklist subscription lists; Kagi's most-blocked leaderboard as a list
  - classifiers: FineWeb-Edu score, DCLM fastText score, Ntoulas-style content statistics as the 2006 baseline
  - the human's DeGenTWeb verdict, applied to the result page's site
    - DeGenTWeb judges sites, results are pages; a page inherits its site's verdict, and this must be said in the paper
  - affiliate-link density from Bevendorff's code
  - Cormack 2011 style content classifier trained on a small labeled set, the closest prior art
- query panel, stratified
  - how-to (reuse DeGenTWeb's Bing how-to panel), programming, product review (Bevendorff's `best <category>` form), health
  - size: 100 queries per stratum, 400 total
  - freeze the panel; scrape Google, Bing, Brave weekly for 12 weeks, top 30 per query so filtered lists can be refilled to 10
  - archive every result page as WARC (the web archive file format), with fetch time
  - scraping risk: Google blocks scrapers and personalizes; use one fixed vantage, no account, and scrape each query twice per week to measure the noise floor
- measurements
  - share of top 10 removed per filter and per stratum
  - agreement between filters (pairwise overlap); hypothesis: low, which itself is a finding
  - lag: days between a domain's first top-10 appearance and its entry into a crowd list
    - uBlacklist lists live in git, so the entry date is the commit date; Kagi's leaderboard has no history, so lag is measured on uBlacklist only
    - hypothesis: Bevendorff's campaign domains appear and vanish within months, so lists may arrive too late
  - usefulness: do the top 5 answer the query
    - 2 annotators judge 40 queries per stratum, blind to filter condition, report agreement
    - programming stratum has checkable answers, the objective anchor
    - an LLM judge is used only after it matches the humans on those labels, and its own bias toward fluent text is reported
  - collateral: good sites removed
    - ground truth is the annotator's "answers the query" label on removed pages
    - also count removed pages from domains outside the top 10,000 by Tranco, as a proxy for small sites
    - hypothesis: FineWeb-Edu's format bias removes personal blogs
  - cost: latency of each filter at query time
- baselines
  - unfiltered results
  - random removal of the same share, to separate "removing anything" from "removing spam"
  - one page per domain; exact and near-duplicate removal
  - whole alternative engines (Kagi, Marginalia, Brave with a Goggle) on the same panel
- expected quotable results, either way
  - "crowd blocklists remove X% of Google's top 10 for how-to queries but list a new spam domain only after Y days"
  - "the LLM-text filter and the affiliate filter disagree on Z% of removed pages"
- most dangerous objection: usefulness judgments are subjective
  - pre-empt: human labels first, report agreement, objective programming stratum, random-removal baseline
- second objection: Google already filters hard, so there is no headroom
  - pre-empt: that is a result, not a failure; report the removal share per stratum and the usefulness delta with confidence intervals
- third objection: using DeGenTWeb both as a filter and as the measure of harm is circular
  - pre-empt: harm is the annotator's usefulness label only; DeGenTWeb is one filter among many
- stop rule: if after 4 weeks every filter removes under 5% of the top 10 in every stratum and usefulness does not move beyond the noise floor, write it up as a short null result and lead with idea 2
  - the 5% is a guess at where the effect stops being worth a paper

idea 2: do answer engines cite generated sites more than organic search does?

- question: for the same query, is the LLM-dominant share among AI Overview, Perplexity, and ChatGPT search citations higher than among Google's and Bing's organic top 10, and does the gap grow over months?
- why new
  - the preference of rankers for LLM text is shown only on lab retrievers (Dai 2024, Chen 2024, Yu 2026)
  - 2026 audits (Xu IMC, Grossman SIGIR, Aral) measure credibility and overlap, not generated text
  - Allaham AIES 2026 measured generated citations once, no organic comparison, detector error not reported
  - the human already has the detector and the Bing how-to result, so the new work is the answer-engine side plus time
- design
  - the question-form subset of idea 1's panel, because AI Overviews trigger on 64.7% of question-form queries and 13.7% overall (Xu)
  - weekly, from a US vantage; answer engines are nondeterministic, so run each query 3 times and keep the union and the intersection of citations
  - collect organic top 10 from Google and Bing, AI Overview citations, Perplexity citations, ChatGPT search citations
  - run DeGenTWeb on every cited and ranked site; archive everything as WARC
  - record whether each cited page is in the organic top 10 (Xu: 29.8% of cited domains are not)
- measurements
  - LLM-dominant share: organic vs cited, per engine, per stratum, per week, computed at the page level with the site verdict, and again at the domain level so Wikipedia-size domains do not dominate
  - the control is the organic top 10 for the same query, not the Common Crawl base rate, which is not conditioned on the query
  - persistence: does a generated site that gets cited stay cited longer than a human one
  - claim check on a small subset: are the generated citations the ones carrying unsupported claims (Xu's claim-by-claim method, costly, 50 queries)
- quotable either way
  - "answer engines cite generated sites twice as often as organic search" is a headline
  - "answer engines cite generated sites less than organic search" contradicts the retrieval-collapse story and is equally a headline
- confounds to state
  - engines have different indexes; a citation gap is a difference in exposure, not a proof of a ranker preference
  - citations are few per query against 10 organic slots, so compare shares, not counts, and report per-query paired differences
- most dangerous objection: detector drift
  - DeGenTWeb's false-positive rate is measured on pre-ChatGPT sites; its recall falls to 0.58 on sites generated by 2025 frontier models
  - so misses, not false alarms, are the problem, and misses may differ between the organic and cited arms
  - pre-empt: re-calibrate monthly on a fresh synthetic set, report the gap under the measured recall as a range, add template and monetization signals that do not depend on text statistics
- feasibility: Perplexity and ChatGPT search access terms may forbid automated querying; use their APIs where offered and record the terms
- stop rule: if cited and organic shares match within the noise floor after 8 weeks, fold the result into idea 1's paper as one section

idea 3: follow the money

- question: who operates the generated sites in search results, how concentrated is it, and how much search exposure do they get?
  - dollars are out of reach without ad-network data; exposure (how often they appear in top 10) is measurable
- why new
  - Papadogiannakis et al. ([WWW 2023](https://arxiv.org/abs/2202.05079), [WWW 2022](https://arxiv.org/abs/2202.05074)) cluster sites by AdSense and analytics IDs, but for fake news, not search spam
  - Bevendorff found Amazon Associates dominates affiliate spam but did not cluster operators
  - the human's draft already finds "a narrow entry-level monetization signature" and shared templates; this makes it an operator study
  - NewsGuard and ANA numbers are vendor or industry; we found no academic estimate
- design
  - start from the LLM-dominant sites found in ideas 1 and 2 plus the Common Crawl sample
  - extract AdSense publisher IDs (the `ca-pub-` strings in page source), analytics IDs, Amazon Associates tags, shared page templates (Geraci-style structure hashes), shared hosting and DNS
  - cluster into operators
    - agencies, ad networks, and CMS themes can share IDs across operators
      - one operator can also use several IDs
      - clusters can therefore merge distinct operators or split one operator
      - require independent corroborating signals and report uncertain attribution
    - control: run the same clustering on a matched set of human-written sites from the same result panels, so concentration can be compared
  - estimate each cluster's exposure from the weekly panels; public traffic estimates are unreliable for small sites, so use them only as a secondary check
  - check whether Google's ad network serves ads on the pages Google ranks: NewsGuard found 90% of brand ads on AI news farms were served by Google
- quotable either way
  - "N operators run M% of the generated sites in top-10 results" with a concentration curve
  - "Google's ad network serves ads on X% of the generated pages Google ranks"; inference: this is the number a policy argument would use
- most dangerous objection: IDs are visible for only part of the sites, so clusters undercount
  - pre-empt: report the covered fraction; validate clusters on the template clusters DeGenTWeb already found and on the affiliate campaigns in the ECIR-24 data, which are a partial check, not ground truth
- ethics: name operators only in aggregate; publish cluster statistics, not a list of people
- feasibility: parsing IDs is cheap; the clustering validation and the human-site control are the real work; it depends on idea 1 or 2 having produced the site set

idea 4: crowd feedback as a ranking signal

- the human's idea: "ranking based on user feedback"
- what exists: Google's 2011 blocklist experiment, Kagi's votes, and the leaked click attributes
  - this selected reading did not recover a matched public outcome evaluation
- candidate question: how many colluding voters flip a domain, and does weighting by voter history preserve useful results?
  - effectiveness needs outcome evidence as well as resistance to collusion
  - needs users or a simulation with planted colluders, so it is not easy to implement
  - SybilGuard is already in the human's notes
- recommendation: use the Kagi leaderboard as one list in idea 1 now, and leave collusion resistance for later

idea 5: is Google getting slopier?

- forward-looking, multi-engine, multi-genre version of Bevendorff with the human's detector
- partly done: the human's draft covers Bing how-to plus the retrospective search-result archive; Originality.ai publishes a vendor version every two months
- inference: alone it is an incremental measurement; it is the backbone that ideas 1 and 2 share, so build it once and report it inside them

what I would do first

- build the weekly panel scraper and archive once; ideas 1, 2, 3, and 5 all read from it
- run DeGenTWeb and the cheap filters over the first four weeks
- decide after week 4 which of ideas 1 and 2 has the larger effect and lead with it

review limits

- sources read in full: Bevendorff ECIR 2024, Puccetti ACL 2024, McCreadie CIKM 2012, Geraci WWW 2015, the DeGenTWeb draft abstract
- other quotes come from abstracts and pages fetched on 7 Oct 2026 by three search subagents; items marked "snippet only" were not verified against the source
- not found despite searching: an academic study of users appending "reddit" to queries; an academic measurement of made-for-advertising sites; a peer-reviewed study of expired-domain SEO abuse; any evaluation of blocklists or pretraining filters on search usefulness
- ideas 1 to 3 remain candidate experiments
  - unsuccessful searches do not establish novelty
  - check the closest prior methods and evaluations before claiming a contribution
- numbers from Originality.ai, Graphite, Ahrefs, NewsGuard, and Google are vendor or self-reported and are not comparable with each other
- the 7 October topic-specific ChatGPT attempt failed with "account_ui_login_required"
  - a context-free Claude reviewer checked this file instead; its objections are folded into the ideas above
- the [8 October cross-topic consultation](../more_topics/chatgpt_review.md) completed with Extra High selected
  - its selected scope does not certify every search-spam proposal
