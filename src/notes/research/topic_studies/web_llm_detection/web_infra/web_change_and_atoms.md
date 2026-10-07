# How web content changes, and web atoms

(authored by agents unless marked 🧑)

## The picture in plain words

- the question people keep asking since 2000: how often does a page change, by how much, and can a crawler guess it without fetching
    - the answer has been stable for 25 years: a small set of pages churns daily, most pages sit still for months, change rate follows the site and the page type
    - crawlers model each URL as its own Poisson clock and spend bandwidth on the clocks worth watching
- the human's idea ("web atom: group of URL that change together with high probability; no need to probe every URL, just probe every member of the group when one change") attacks the per-URL assumption
    - the closest prior work treats related pages as a hint for estimating one page's rate (Cho and Ntoulas 2002, Tan and Mitra 2010, Radinsky and Bennett 2013), not as a unit that is probed and invalidated together
    - CDNs already do the "invalidate the group" half with surrogate keys and cache tags, but only when the origin tells them the group; nobody measures the groups from the outside
- the name comes from BGP policy atoms: prefixes that every vantage point sees with the same AS path; Afek et al. showed BGP updates mostly carry whole atoms
    - what carries over: define the group by "indistinguishable from every observer", check that real change events respect the group, then use the group to cut probing
    - what does not: BGP has a protocol reason for atoms (one policy applies to the whole group); the web reason is weaker (templates, CMS, shared data feeds, deploys), so the grouping must be learned and will leak
- method summary of the field
    - crawl a fixed URL set repeatedly, hash or shingle each copy, fit change models, then simulate schedules
    - pitfalls: dynamic noise (timestamps, ads) makes everything "change", blocking and personalization bias the sample, and almost every number is from pre-2010 crawls

## How often and how much do pages change

- [The Evolution of the Web and Implications for an Incremental Crawler](https://www.vldb.org/conf/2000/P200.pdf), Cho, Garcia-Molina, VLDB 2000
    - fact: "an experiment conducted on 720,000 web pages for multiple months"; daily visits to 270 sites, change = checksum change
    - fact: "More than 20% of pages had changed whenever we visited them!"; "More than 40% of pages in the com domain changed every day, while less than 10% of the pages in other domains changed at that frequency"
    - fact: "More than 50% of pages in those domains [edu, gov] did not change at all for 4 months"
    - fact: "it takes about 50 days for 50% of the web to change or to be replaced by new pages"; "it took only 11 days for 50% of the com domain to change, while the same amount of change took almost 4 months for the gov domain"
    - fact: "a Poisson process predicts the observed data very well", but "our result does not verify the Poisson model for the pages that change very" frequently, since they only sampled daily
    - fact: "one can increase the freshness of the collection by 10%–23% by optimizing the revisit frequencies"
    - open: daily granularity hides sub-daily behaviour; 2000-era sites
- [Synchronizing a database to improve freshness](https://doi.org/10.1145/335191.335391), Cho, Garcia-Molina, SIGMOD 2000
    - fact (abstract): "We define two freshness metrics, change models of the underlying data, and synchronization policies ... based on data collected from 270 web sites for more than 4 months"
    - the famous counterintuitive result, restated in the Olston and Najork survey: under binary freshness, uniform revisiting beats proportional revisiting, and the optimum ignores pages that change too fast to keep fresh
- [A Large-Scale Study of the Evolution of Web Pages](https://doi.org/10.1145/775152.775246), Fetterly, Manasse, Najork, Wiener, WWW 2003
    - fact: "We crawled a set of 150,836,209 HTML pages once every week, over a span of 11 weeks"; change measured with shingles, not just checksums
    - fact: "the average degree of change varies widely across top-level domains, and that larger pages change more often and more severely than smaller ones"
    - fact (their summary of Cho's data): "40% of all web pages in their set changed within a week, and 23% of those pages that fell into the .com domain changed daily"
    - fact: of pages fetched six or more times, "56% did not change" at all, "while 4% changed every single time"
    - fact: only "49.2% of the pages all eleven times" were successfully fetched every week; 17.2% fetched fewer than ten times (sampling pain even for Microsoft Research)
- [What's new on the web? The evolution of the web from a search engine perspective](https://doi.org/10.1145/988672.988674), Ntoulas, Cho, Olston, WWW 2004
    - I could not fetch the PDF (UCLA host timed out; www2004.org link is dead, itself a link-rot example)
    - fact as cited by the Olston and Najork survey: "Much of the 'new' content added to web pages is actually taken from other pages [96]"
    - my memory, unverified: weekly crawl of 154 sites for a year; about 8% new pages and 25% new links per week, while existing pages changed little
- [The web changes everything: understanding the dynamics of web content](https://doi.org/10.1145/1498759.1498837), Adar, Teevan, Dumais, Elsas, WSDM 2009
    - fact as quoted by Jones et al. 2016: "the median survival rate of DOM elements is 98% after one day, 95% after one week, 63% after five weeks, and only 11% after one year"
    - fact as summarized by the Olston and Najork survey: "Change frequency is correlated with visitation frequency, URL depth, domain and topic [2]"; many changes "only affect transient words that do not characterize the core, time-invariant theme of the page [2]"
    - open: this is the last big fine-grained (hourly) change study; I found nothing comparable for the 2020s web
- [Web Crawling](https://doi.org/10.1561/1500000017), Olston, Najork, Foundations and Trends in IR 2010 (survey)
    - fact: "A page's change frequency tends to remain stationary over time, such that past change frequency is a fairly good predictor of future change frequency [60]"
    - fact: "pages with high change frequency tend to exhibit less cumulative change than pages with moderate change frequency"
    - fact: page behaviour splits into "Static (no changes), churn (new content supplants old content, e.g., quote of the day), and scroll (new content is appended to old content, e.g., blog entries)", citing Olston and Pandey WWW 2008
    - fact: "Many changes are confined to a small, contiguous region of a web page"
    - inference: these three facts are why checksum-level change counts overstate what matters; any atom study needs a change definition that discards churn regions
- [Recrawl scheduling based on information longevity](https://doi.org/10.1145/1367497.1367557), Olston, Pandey, WWW 2008
    - no open PDF found; from the survey: "Simple generative models for the three categories collectively explain nearly all observed temporal web page behavior [99]"
    - their point: schedule on how long a fragment of information stays on the page, not on how often the page changes
- [Change Detection and Notification of Webpages: A Survey](https://arxiv.org/abs/1901.02660), Mallawaarachchi et al., ACM Computing Surveys 2020
    - fact: "Majority of the currently available webpages are dynamic in nature and are changing frequently"
    - fact: systems differ by "Frequency of monitoring: hourly, daily, weekly, monthly or on-demand monitoring" and all "require mechanisms for estimating the change frequency to create efficient checking schedules"
    - useful as a map of end-user change monitors (Visualping style), which are per-URL pollers
- [Risk-Constrained Freshness-Aware Semantic Caching for Open-Web Retrieval-Augmented LLMs](https://arxiv.org/abs/2607.04281), Mansoor, Ahmad, Yoon, arXiv 2026
    - fact: builds "FreshCache-Bench, a benchmark of 8,072 base queries across five freshness classes with ground truth staleness labels drawn from real web snapshots at 1, 12, 24 hours, and 7 days after a baseline crawl"
    - fact: staleness modeled with "a fitted exponential decay model enhanced by a learned MLP"
    - inference: the LLM-retrieval world is re-deriving Cho's Poisson decay per URL; a fresh 2020s change dataset would be welcome there too
- [Web Page Classification using LLMs for Crawling Support](https://arxiv.org/abs/2505.06972), Sasazawa, Sogawa, 2025 (in the collection)
    - fact: "the frequency of past page updates can serve as a crucial indicator for determining the appropriate crawling frequency (Fetterly et al., 2003), but this approach encounters a cold-start problem"
    - fact: they classify "Index Pages" vs "Content Pages" with an LLM and start new-page discovery from index pages
    - inference: index pages are exactly the sentinels of an atom (a category page changes when any child post appears), but the paper only uses them for discovery, not for invalidation

## Scheduling: how crawlers decide when to recrawl

- [Keeping a Search Engine Index Fresh: Risk and optimality in estimating refresh rates for web pages](https://research.google.com/pubs/archive/34570.pdf), Ford, Grimes, Tassone, Google 2008
    - fact: "we assume that a binary change detection" (the crawler only learns changed / not changed since last visit)
    - fact: "most previous work shows only small populations (< 5%) of pages that are not consistent with the Poisson model"
    - fact: gives an empirical Bayes estimator and "an optimal linear shrinkage of subsequent crawl intervals" trading crawl cost vs staleness
- [Tractable near-optimal policies for crawling](https://doi.org/10.1073/pnas.1801519115), Azar, Horvitz, Lubetzky, Peres, Shahaf, PNAS 2018
    - fact (significance statement): "Given a large quantity of distributed and dynamic web content, what pages do we choose to update a local cache with the goal of serving up-to-date pages to client requests? ... we show that the optimal randomized strategy can be efficiently determined (in near-linear time)"
    - this is LambdaCrawl; it needs known change rates and request rates
- [Change Rate Estimation and Optimal Freshness in Web Page Crawling](https://arxiv.org/abs/2004.02167), Avrachenkov, Patil, Thoppe, 2020
    - fact: "Azar et al. [2] ... assume the knowledge of the exact page change rates, which is unrealistic in practice ... we provide two novel schemes for online estimation of page change rates. Both schemes only need partial information about the page change process, i.e., they only need to know if the page has changed or not since the last crawled instance"
- Kolobov, Peres, Lubetzky, Horvitz, [Optimal Freshness Crawl Under Politeness Constraints](https://doi.org/10.1145/3331184.3331241), SIGIR 2019, and Kolobov et al., Staying up to date with online content changes using reinforcement learning for scheduling, NeurIPS 2019
    - I could not fetch either PDF this session (publisher blocks); cite with care
    - fact as described by Busa-Fekete et al. 2025: "Kolobov et al. [7] labelled a set of URLs havin CISs with perfect precision and recall (ca. 5% of sampled URLs)"; so Microsoft's crawler had reliable change signals for only about 5% of URLs
- [A Scalable Crawling Algorithm Utilizing Noisy Change-Indicating Signals](https://arxiv.org/abs/2502.02430), Busa-Fekete et al., arXiv 2025 (Google authors)
    - fact: extends Azar et al. with "side information indicating content changes, such as various types of web pings, for example, signals from sitemaps, content delivery networks, etc."
    - fact: "the signals can be noisy with false positive events and with missing change events"
    - fact, the key number: "we measured the quality of the sitemap signals for the web pages in their dataset with declared (perfect) sitemaps and found that the precision of these signals (i.e., the proportion of time there is a change following a signal) is below 0.2, and their recall (i.e., the proportion of time when a change is accompanied with a CIS) is below 0.5"
    - fact: still "sitemap signals are noisy, but they are in general better than" nothing; some URLs have "precision and recall that are higher than 0.8"
    - inference: this is the best public evidence that site-declared change signals are unreliable; an atom learned from observed co-change could be a second, independent signal
- [Clustering-based incremental web crawling](https://doi.org/10.1145/1852102.1852103), Tan, Mitra, TOIS 2010
    - fact (abstract): "we identify features of Web pages that are correlated to their change frequency. We design a crawling algorithm that clusters Web pages based on features that correlate to their change frequencies obtained by examining past history. The crawler downloads a sample of Web pages from each cluster"
    - closest prior work to web atoms: cluster, then sample. difference: their clusters group pages with similar rates, not pages whose changes are correlated in time; a sample tells you the cluster's rate, not that the other members changed now
- [Effective Change Detection Using Sampling](https://doi.org/10.1016/b978-155860869-6/50052-4), Cho, Ntoulas, VLDB 2002
    - fact as summarized by the survey: "Cho and Ntoulas [44] and Tan et al. [113] focused on how to infer the behavior of p from the behavior of related pages — pages on the same web site, or pages with similar content, link structure, or other features"
    - same gap as Tan and Mitra: related pages give a rate estimate, not an invalidation trigger
- [Predicting content change on the web](https://doi.org/10.1145/2433396.2433448), Radinsky, Bennett, WSDM 2013
    - no open PDF found; from memory (unverified): predicts whether a page changes using its own history plus the change history of related pages; related-page features help
    - open: nobody has (to my knowledge) inverted this into "which pages' change implies this page changed"

## Signals a site can give: sitemaps, headers, pings, feeds

- Google, [Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
    - fact: "Google ignores <priority> and <changefreq> values."
    - fact: "Google uses the <lastmod> value if it's consistently and verifiably (for example by comparing to the last modification of the page) accurate."
    - fact: "an update to the main content, the structured data, or links on the page is generally considered significant, however an update to the copyright date is not"
    - inference: Google itself defines "significant change" by region and verifies lastmod by crawling; they already run a hidden version of the change-definition problem
- Google, [Crawl budget management](https://developers.google.com/search/docs/crawling-indexing/large-site-managing-crawl-budget)
    - fact: "If a page hasn't changed since Google last crawled it, returning a 304 code tells Google to reuse the cached version"
    - fact: "If your site includes updated content, we recommend including the <lastmod> tag"
- Google, [Sitemaps ping endpoint is going away](https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping), 2023
    - page fetched but the body text did not extract cleanly; title confirms the sitemap ping was deprecated in 2023
- [IndexNow FAQ](https://www.indexnow.org/faq) (Bing, Yandex, Naver, Seznam; not Google)
    - fact: "Websites should notify IndexNow whenever content is added, updated, or removed"; "your submission will be shared across all IndexNow-enabled search engines"
    - fact: "Submitting a URL does not guarantee immediate indexing"; "Every URL submitted through IndexNow counts toward your site's crawl quota"
    - fact: "IndexNow supports bulk submission of up to 10,000 URLs per POST request"
    - inference: IndexNow batches are literally site-declared atoms (a deploy pushes a list); nobody has measured whether submitted batches co-change
- [WebSub](https://www.w3.org/TR/websub/), W3C Recommendation 2018
    - fact: "Subscription requests are relayed through hubs, which validate and verify the request. Hubs then distribute new and updated content to subscribers when it becomes available. WebSub was previously known as PubSubHubbub."
- [RFC 9111 HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html), 2022
    - fact: "A cache MUST invalidate the target URI ... when it receives a non-error status code in response to an unsafe request method"; "A cache MAY invalidate other URIs ... the URI(s) in the Location and Content-Location response header fields (if present) are candidates for invalidation; other URIs might be discovered through mechanisms not specified in this document"
    - inference: HTTP has no standard way to say "these URLs change together"; the only group-invalidation standard is an escape hatch
- RSS/Atom feeds: the change-detection survey notes "Web syndication technologies (e.g., RSS and Atom) emerged as a popular means of delivering frequently updated web content on time" and that "the utilization of fields specified in the XML specification of RSS is less"
- [Web Sitemap Knowledge Can Enhance Autonomous Browsing](https://doi.org/10.18653/v1/2026.findings-acl.1465), Zhang et al., ACL Findings 2026
    - abstract not available via Crossref; title only; sitemaps as agent knowledge, not change signal

## Groups of pages that change together: templates, shared resources, volumes

- [The Volume and Evolution of Web Page Templates](https://doi.org/10.1145/1062745.1062763), Gibson, Punera, Tomkins, WWW 2005
    - fact: "40–50% of the content on the web is template content. Over the last eight years, the fraction of template content has doubled"
    - fact: "any applications that support trending over web data should not be misled into believing that a site has changed significantly due to a template change"
    - fact: "Pages that share a template can also be grouped together into a cluster that may not be apparent using other mechanisms"
    - inference: a template edit is the simplest real web atom: thousands of URLs change at once and for the same reason; and it is also the atom you may want to ignore
- Bar-Yossef, Rajagopalan, [Template detection via data mining and its applications](https://doi.org/10.1145/511446.511522), WWW 2002: the first template detector (pagelets); no quote fetched
- [Sprinter: Speeding Up High-Fidelity Crawling of the Modern Web](https://github.com/goelayu/Sprinter), Goel et al., 2023/24 (in the collection)
    - fact: "For the median site, 72% of JS files were shared across multiple pages"; "on the median site, 65% of unique file executions - at least with respect to resource fetches - are repeated across multiple pages"
    - fact: "92% of all media queries occur on more than one page"
    - fact: "When we recrawled the same corpus a week later, the rate at which Sprinter crawls pages improved by a further 78%"
    - inference: Sprinter proves intra-site redundancy in the machinery of pages; atoms would be the same redundancy in the timing of changes
- [Improving End-to-End Performance of the Web Using Server Volumes and Proxy Filters](https://doi.org/10.1145/285243.285286), Cohen, Krishnamurthy, Rexford, SIGCOMM 1998
    - fact (abstract): "The server groups related resources into volumes (based on access patterns and the file system's directory structory) and applies a proxy-generated filter"; piggybacked info "improve[s] cache coherency and cache replacement, and enable[s] prefetching"
    - closest 1990s ancestor of atoms, built server-side from access logs and directory structure
- Krishnamurthy, Wills, [Piggyback server invalidation for proxy cache coherency](https://doi.org/10.1016/s0169-7552(98)00033-6), 1998, and Yin, Alvisi, Dahlin, Lin, [Volume leases for consistency in large-scale systems](https://doi.org/10.1109/69.790806), TKDE 1999
    - abstracts not fetched; both group objects into "volumes" so one message invalidates or renews many objects
- [Demystifying Page Load Performance with WProf](https://www.usenix.org/system/files/conference/nsdi13/nsdi13-final177.pdf), Wang et al., NSDI 2013, and [Polaris: Faster Page Loads Using Fine-grained Dependency Tracking](https://www.usenix.org/system/files/conference/nsdi16/nsdi16-paper-netravali.pdf), Netravali et al., NSDI 2016
    - fact (Polaris): "prior approaches miss 30% of edges at the median, and 118% at the 95th percentile"; "for 81% of the 200 real-world pages that we examined, our new graphs have different critical paths"
    - inference: dependency graphs are within one page load; atoms are across URLs and time; but the same tracing (which script fetched which data URL) tells you which URLs share a backend endpoint
- [Understanding Website Complexity](https://doi.org/10.1145/2068816.2068846), Butkiewicz, Madhyastha, Sekar, IMC 2011
    - fact: "More than 60% of websites have content from at least 5 non-origin sources and these contribute more than 35% of the bytes downloaded"
    - inference: third-party resources change on the third party's clock, so an atom crosses site boundaries (every page embedding the same tag manager changes when the vendor pushes)
- [Thou Shalt Not Depend on Me](https://doi.org/10.14722/ndss.2017.23414), Lauinger et al., NDSS 2017
    - fact: "Using data from over 133 k websites, we show that 37 % of them include at least one library with a known vulnerability; the time lag behind the newest release of a library is measured in the order of years"
    - fact: "libraries included transitively" and "different versions of the same library being loaded into the same document"
    - inference: shared-library versions on a site are a sticky site-level state; they change in bulk on redeploy, which is atom-like for JS (relevant to JSphere)

## CDN and application cache invalidation (the engineering version of atoms)

- Fastly, [Working with surrogate keys](https://www.fastly.com/documentation/guides/full-site-delivery/purging/working-with-surrogate-keys/)
    - fact: "Surrogate keys allow you to selectively purge related content. Using the Surrogate-Key header, you can 'tag' content with a key term ... all of the objects associated with that key will be purged"
    - fact: "they allow for a many-to-many relationship between keys and objects"
    - fact: "Fastly automatically removes any Surrogate-Key headers present on a response before delivering it to the end user"
- Cloudflare, [Purge cache by cache-tags](https://developers.cloudflare.com/cache/how-to/purge-cache/purge-by-tags/)
    - fact: "Cache-tag purging makes multi-file purging easier because you can instantly bulk purge by adding cache-tags to your assets"
- Meta, [Cache made consistent](https://engineering.fb.com/2022/06/08/core-infra/cache-made-consistent/), 2022
    - fact: "Cache invalidation describes the process of actively invalidating stale cache entries when data in the source of truth mutates"
    - fact: they measure consistency with Polaris (a different Polaris from the NSDI paper): "Polaris pretends to be a cache server and receives cache invalidation events ... then queries all cache replicas as a client to verify whether any violations of the invariant occur"
    - fact: "99.99999999 percent of cache writes are consistent within five minutes"
    - inference: inside one company, the group that must be invalidated is known from the write path; the web-atom problem is the same problem with no write path visible, so it must be inferred from reads
- inference across this section: the origin knows the atoms (tags) and strips them before the response leaves; a crawler could only recover them by observing co-change, or occasionally from leaked headers (Cache-Tag, Surrogate-Key, X-Cache, Age)

## Link rot and content drift (the slow kind of change)

- [When Online Content Disappears](https://www.pewresearch.org/data-labs/2024/05/17/when-online-content-disappears/), Pew Research Center 2024
    - fact: "A quarter of all webpages that existed at one point between 2013 and 2023 are no longer accessible"; "38% of webpages that existed in 2013 are not available today, compared with 8% of pages that existed in 2023"
    - fact: sample is "just under 1 million webpages from the archives of Common Crawl"; "16% of pages are individually inaccessible but come from an otherwise functional root-level domain; the other 9%" are whole domains gone
    - fact: "54% of Wikipedia pages contain at least one link in their 'References' section that points to a page that no longer exists"; "16% now redirect to a different URL than the one they originally pointed to"
- [Scholarly Context Not Found: One in Five Articles Suffers from Reference Rot](https://doi.org/10.1371/journal.pone.0115253), Klein et al., PLOS ONE 2014
    - fact: "one million references to web resources extracted from over 3.5 million articles ... We find one out of five STM articles suffering from reference rot ... When only considering STM articles that contain references to web resources, this fraction increases to seven out of ten"
- [Scholarly Context Adrift: Three out of Four URI References Lead to Changed Content](https://doi.org/10.1371/journal.pone.0167475), Jones et al., PLOS ONE 2016
    - fact: "We find that representative snapshots exist for about 30% of all URI references ... for over 75% of references the content has drifted away from what it was when referenced"
    - defines the term: "Content drift: The resource identified by a URI changes over time"
- Zittrain, Bowers, Stanton, [The Paper of Record Meets an Ephemeral Web](https://doi.org/10.2139/ssrn.3833133), 2021: NYT links; PDF not fetched this session
- [Link rot in LIS literature: a 20-year study](https://doi.org/10.1108/ajim-05-2025-0286), Sadatmoosavi, Khasseh, Tajedini, Aslib JIM 2026
    - fact: "accessibility dropping from 87% for citations 0–5 years old to 38% for those over 10 years old"; "permanent link rot has tripled from 5% in 2012 to 15% in 2025"; ".edu domains show 93% accessibility versus 42% for .com domains"; "PDFs maintain 92% accessibility compared to 41% for database-driven content"
- [Losing My Revolution](https://arxiv.org/abs/1209.3026), SalahEldeen, Nelson, TPDL 2012
    - fact: "about 11% lost and 20% archived after just a year and an average of 27% lost and 41% archived after two and a half years"; "we will continue to lose 0.02% per day"
- Eve, [Evaluating Document Similarity Detection Approaches for Content Drift Detection](https://doi.org/10.59348/hjxns-96m63), 2024: compares similarity measures for deciding "did this DOI target drift"; abstract only
- a live example from this session: the WWW 2000 paper "How dynamic is the web?" at www9.org now serves a dating-site spam page; that URL rotted and drifted at once

## Web archives: what they capture and how consistent it is

- [How Much of the Web Is Archived?](https://arxiv.org/abs/1212.6177), Ainsworth et al., JCDL 2011
    - fact: "35%-90% of the Web has at least one archived copy, 17%-49% has between 2-5 copies, 1%-8% has 6-10 copies, and 8%-63% has more than 10 copies"; "Each sample set provides its own bias"
- [A Framework for Evaluation of Composite Memento Temporal Coherence](https://arxiv.org/abs/1402.0928), Ainsworth, Nelson, Van de Sompel, 2014
    - fact: "Even if captured within seconds of the root resources, embedded resources are not always temporally coherent"; defines states "prima facie coherent, possibly coherent, probably violative, and prima facie violative" using Last-Modified and capture times
    - inference: an archive replaying a page composes copies of many URLs captured at different times; if those URLs form an atom, coherence means "all from the same side of the atom's last change"; nobody has tried atoms as the coherence unit
- [Internet Jones and the Raiders of the Lost Trackers](https://www.usenix.org/system/files/conference/usenixsecurity16/sec16_paper_lerner.pdf), Lerner et al., USENIX Security 2016
    - fact: "the Wayback Machine's view of the past, as it relates to included" third-party resources is partial because of "robots.txt restrictions ... the Wayback Machine's occasional" failures; they build TrackingExcavator to measure despite this
    - pitfall for any archive-based change study: embedded resources are missing or captured at other times
- [To Re-experience the Web](https://doi.org/10.1145/3589206), Berlin, Kelly, Nelson, Weigle, TWEB 2023
    - fact: "the fundamental expectation is that the page should be viewable and function exactly as it did at the archival time. However, this expectation requires web archives upon replay to modify the page"
- [Pre-Crawl Prioritization and Seed Classification for Large-Scale Web Archiving](https://doi.org/10.1109/jcdl67857.2025.00044), Garapati, Alam (Internet Archive), JCDL 2025; and [End of Term Web Archive Dataset](https://doi.org/10.1109/jcdl57899.2023.00024), JCDL 2023: titles only; the Internet Archive is actively publishing on crawl prioritization, a venue for atom work
- [Improved methodology for longitudinal Web analytics using Common Crawl](https://doi.org/10.1145/3614419.3644018), Thompson, WebSci 2024: title only; relevant because Common Crawl monthly snapshots are the cheapest way to get years of (coarse) change history
- Common Crawl FAQ: "Our CDX API endpoint is frequently abused and therefore heavily rate limited"; retrospective atom mining must use the index files, not the API

## The BGP atoms the name comes from

- [Analysis of RouteViews BGP data: policy atoms](https://catalog.caida.org/paper/2001_atoms), Broido, claffy, NRDM 2001 (in the collection)
    - definition: "Two prefixes are said to be path equivalent if we cannot find a BGP peer who sees them with different AS paths. An equivalence class of this relation is called a BGP atom."
    - construction: "1. Find all prefixes common to a chosen system of peers ... 3. For each system of AS paths, find all prefixes that share this system of paths."
    - fact: "About 50% of atoms contain just one prefix, though there are also atoms with many prefixes, which is where reduction of the BGP table occurs"; atom size distribution "is close to a Weibull curve"
    - fact, the measurement motivation: "A system that covers provably distinct routes could help eliminate redundancy in path probing, thus maximizing coverage and sampling frequency at the same time."
    - fact: atoms depend on the observer set: "diversity measures that depend upon the number of peers (e.g. 'atoms' discussed below) are influenced by the number and choice of peer tables"
- [On the structure and application of BGP policy Atoms](https://doi.org/10.1145/637201.637209), Afek, Ben-Shalom, Bremler-Barr, IMW 2002 (in the collection)
    - fact: "atoms remain stable with only about 2-3% of prefixes changing their atom membership in eight hour periods"; "about 4-5% for a full day period and up to about 12% in a week period"
    - fact, the atomicity test: "BGP update and withdraw notifications carry updates for complete atoms in over 70% of updates, while the complete set of prefixes in an AS is carried in only 21% of updates"; "the vast majority of updates (86% average) contained information for members of a single atom only"
    - fact, where atoms come from: "85% of the atom creation points showed the atoms created between the owning AS and an AS it peers with", so atoms "are indeed the product of the Internet policies"
    - fact, the payoff: "Using atoms in BGP updates gives on average a reduction of about 33% on the announcement size ... the maximum average reduction attainable is about 66%"
    - fact, the robustness trick: "quiet period" atoms computed only from prefixes with "no updates for them has been seen from any source" for about 15 minutes, to avoid an inconsistent distributed snapshot
    - fact, their own open problem: "do destinations in the same prefix and atom pass the same router path as well as the same AS path"
- [BGP Routing Stability of Popular Destinations](https://doi.org/10.1145/637230.637232), Rexford, Wang, Xiao, Zhang, IMW 2002
    - fact: "the small number of popular destinations responsible for the bulk of Internet traffic have remarkably stable BGP routes. The vast majority of BGP instability stems from a small number of unpopular destinations."
    - inference: the web analogue is probably the same skew: popular pages are stable in structure but churn in content; most change events come from a long tail, which is where atoms help most
- what carries over to the web, my reading
    - the definition pattern: equivalence under "no observer can tell them apart"; for the web, replace AS path by "change event in the same window", and vantage points by observation windows or by diff granularities
    - the validation pattern: show that real events (BGP updates; sitemap pushes, IndexNow batches, observed diffs) respect the groups most of the time, and quantify leakage (their 70-75%)
    - the stability pattern: measure membership churn over 8h / 1d / 1w, and compute how much "atom maintenance" traffic the grouping itself costs
    - the payoff pattern: bytes saved on updates for BGP; fetches saved per unit of freshness for the web
    - the caveat pattern: atom count depends on how many observers you have; web atoms will depend on how often you sample and how you define "changed"
- what does not carry over
    - BGP atoms have a mechanism (one policy, one AS path); web co-change has many mechanisms (template, CMS category, shared data feed, deploy, ad rotation, third-party vendor), so an atom should carry a cause label, or it will be a statistical artifact
    - BGP atoms are equivalence classes; web co-change is probabilistic and asymmetric (a post changes implies its category page changes, not the reverse), so the right structure is a directed implication graph, not a partition
    - BGP has one global routing system; web atoms are per site, and the useful ones may cross sites (shared vendor scripts)

## Known pitfalls in the methods

- change definition dominates every result
    - checksums count ad rotation and timestamps; shingles (Fetterly) or DOM-element survival (Adar) count less; Google's own rule is "main content, structured data, or links"; the regex-stripping hack in the Danish news archiving work (see `web_crawling.md`) is the state of practice
- sampling bias and sample loss
    - Fetterly reached only "49.2% of the pages all eleven times"; Pew's Common Crawl sample inherits Common Crawl's seed bias; Ainsworth: "Each sample set provides its own bias"
- Poisson is a convenience, not a law
    - Cho only validated it at daily granularity; Ford et al. note the non-Poisson population is "< 5%" but that is of pages that fit a model at all; news and feeds are bursty and periodic (business hours, cron deploys), which is exactly the structure atoms want to exploit
- caches between you and the origin
    - a CDN may serve a stale copy for minutes to hours (RFC 9111 heuristic freshness), so observed change times are delayed by a random amount that differs per URL; co-change timing is blurred, and surrogate-key purges make unrelated URLs look like they changed together at purge time
- personalization, consent walls, bot blocking
    - the DeGenTWeb and web_crawling notes already record cookie banners and login walls; a change study sees a different page per vantage point
- web archives are not ground truth
    - Ainsworth et al.: "Even if captured within seconds of the root resources, embedded resources are not always temporally coherent"; Lerner et al. document missing third-party resources in the Wayback Machine
- stale literature
    - the large-scale numbers (Cho 2000, Fetterly 2003, Ntoulas 2004, Adar 2009) predate JavaScript-rendered pages, CDNs everywhere, and CMS-driven sites; nobody has re-run them at scale on the 2020s web in public, and search engines will not publish theirs
- signals from sites lie
    - Busa-Fekete: sitemap precision "below 0.2", recall "below 0.5"; Google ignores changefreq entirely

## Research ideas

### 1. do web atoms exist, and what makes them (measurement paper)

- question: on a real site, how much of the probability that URL B changed is explained by "URL A changed in the same window", and do these dependencies form stable groups
- why not answered: Cho and Ntoulas 2002, Tan and Mitra 2010, Radinsky and Bennett 2013 use related pages to estimate a page's rate; none reports co-change probabilities, group size distributions, or group stability over time; Afek et al. did exactly this for BGP and nobody repeated it for URLs
- what we would do
    - pick 500 to 2000 sites across CMS types (WordPress, news, e-commerce, docs, forums, generated sites); crawl 200 to 1000 URLs per site every 1 to 6 hours for 8 to 12 weeks with a browser crawler that shares work across pages (Sprinter style) and strips churn regions (Gibson templates, Adar-style DOM survival)
    - compute P(B changed | A changed) per pair and per window; cluster into atoms; label causes with cheap evidence: shared template, shared sitemap section, URL path prefix, shared JS/API endpoints from CDP traces, same Last-Modified
    - report atom size distribution (compare with Broido's Weibull), membership churn at 8h / 1d / 1w (compare with Afek's 2-3% / 4-5% / 12%), fraction of change events that hit a whole atom (compare with 70-75%)
- data and tools: Browsertrix or Sprinter, CDP, Common Crawl host lists for site selection, Wayback CDX for a retrospective sanity check
- main risk: dynamic noise makes co-change trivially high (everything "changes" every hour) or trivially low (after stripping, nothing changes); the change definition must be fixed before looking at the result and reported at several granularities
- confidence the gap is real: high for the measurement itself; medium that the result is interesting (atoms may be mostly "category page plus its posts", which is obvious; the paper then rests on quantifying how much that obvious structure saves)

### 2. atom-based recrawl: probe sentinels, recrawl the group

- question: with a bandwidth budget, does "probe one sentinel per atom, recrawl members on sentinel change" beat per-URL Poisson schedules (Cho, LambdaCrawl) and beat sitemap/IndexNow-driven crawling (Busa-Fekete) on freshness and on captured updates
- why not answered: all scheduling papers assume independent per-URL change processes; Busa-Fekete adds site-declared signals but still per URL; Tan and Mitra sample a cluster to estimate its rate, not to trigger a group recrawl
- what we would do: replay the trace from idea 1 in a simulator (as Cho and Azar did), compare freshness-per-fetch and update-capture-per-fetch across policies, then add a live deployment on a subset with real budget
- main risk: the obvious sentinel (home page, feed, sitemap) is already what every crawler polls; the gain over "poll the feed" must be shown, which means focusing on sites without good feeds or with lying lastmod (Busa-Fekete's 80% of URLs)
- confidence the gap is real: medium-high; I found no paper that does group-triggered recrawl from inferred groups

### 3. atoms from cheap signals, no content fetch

- question: how well do HEAD-only signals (ETag, Last-Modified, Content-Length, Age), sitemap lastmod co-updates, feed entries, and dependency structure (shared scripts, shared API endpoints) predict content co-change
- why not answered: Busa-Fekete measured sitemap signal quality per URL, not group structure; the CDN docs show that the group tags are stripped before delivery, so nobody knows how much leaks
- what we would do: for the idea-1 corpus, record all headers and sitemaps per fetch; train and evaluate "predict atom from metadata only"; also survey header leakage (Cache-Tag, Surrogate-Key, X-Cache, Age) across the Tranco top 100k with one HEAD each
- main risk: ETag and Last-Modified are missing or fake on dynamic pages; the result may be "metadata is useless on the sites that matter"
- confidence: high that nobody did the leakage survey; medium on the predictor

### 4. retrospective atoms from archives at scale

- question: using Wayback CDX or Common Crawl monthly indexes, can we estimate co-change over years for millions of URLs, and does the atom structure show deploy and CMS events
- why not answered: Thompson WebSci 2024 does longitudinal analytics on Common Crawl but (title only) not co-change; Pew used Common Crawl for rot, not drift; the archive papers study coherence of one page's parts, not groups of pages
- what we would do: use the CDX digest field (content hash per capture) to get change-or-not per capture pair without fetching bodies; compute co-change at monthly (CC) and days (Wayback, for popular sites) granularity
- main risk: capture times are irregular and driven by the archive's own scheduler, so co-capture confounds co-change; must model capture as a sampling process (Cho and Garcia-Molina's irregular-sample estimator applies)
- confidence: high that the specific analysis is new; medium that archive cadence allows it

### 5. atoms as the coherence unit for archived composite pages

- question: does grouping a root page with the embedded resources that co-change with it give a better temporal-coherence test than Ainsworth et al.'s per-resource Last-Modified patterns
- why not answered: Ainsworth, Nelson, Van de Sompel reason per embedded resource; Berlin et al. 2023 study replay rewriting; nobody uses observed co-change across captures
- main risk: the archive rarely captures resources often enough to estimate co-change; may only work for heavily crawled sites
- confidence: medium

### 6. evidence invalidation for LLM agents and RAG caches

- question: when a cited page changes, which other cached pages and derived claims should be re-verified, and does an atom graph predict that better than per-URL decay (FreshCache) or fixed TTLs
- why not answered: FreshCache (2026) and OwlerLite (WWW 2026 companion) model freshness per URL; the human's `web_atoms.md` and `web_crawling.md` notes already sketch this; no paper evaluates group invalidation for agent evidence
- what we would do: log an agent's browsing over weeks, build atoms from the idea-1 crawler on the visited sites, measure stale-claim rate versus re-fetch cost under per-URL and atom policies
- main risk: hard to score "claim became stale" without human labels; FreshCache-Bench's hash-based labels are a start
- confidence: medium-high that it is open; medium that it beats a simple "re-fetch everything cited from that host" rule

### 7. temporal fingerprint of generated sites (link to DeGenTWeb)

- question: do AI-generated content farms change in bulk (many pages regenerated at once, uniform intervals, templates swapped site-wide) in a way that differs from human-run sites, and is that a usable detector feature
- why not answered: generated-site detection work uses text and structure of a snapshot; change-over-time features are not used, and the change literature predates generated sites
- what we would do: for the DeGenTWeb candidate set plus baselines, use Common Crawl and Wayback histories to get per-page change timelines, compute atom size, burstiness, and periodicity; test as features
- main risk: the honest answer may be that legitimate CMS deploys look the same; and archives undersample small sites
- confidence: high that it is unexplored; low-medium that it works

### 8. re-run the classic change study on the 2020s web, with JavaScript

- question: what are today's numbers for Cho's and Fetterly's quantities, with rendered DOM instead of raw HTML, split by CMS, CDN, and page type
- why not answered: the public numbers are from 2000 to 2009; FreshCache's 1h/12h/24h/7d labels are the only recent public data point and were built for a benchmark, not a study
- main risk: a pure re-measurement is a hard sell at IMC unless it changes a belief (e.g., "most hourly change is third-party and ad churn, so the Poisson-per-URL model is wrong for the top sites")
- confidence: high that it is open; it is also the cheapest by-product of idea 1

## What I could not cover this session

- publisher PDFs for Adar 2009, Radinsky and Bennett 2013, Olston and Pandey 2008, Kolobov SIGIR and NeurIPS 2019, Demir et al. WWW 2022 (reproducibility of web measurement); quotes above for these come from the survey or from other papers citing them
- Google's and Bing's recent production crawling papers beyond Busa-Fekete 2025; the search APIs were rate-limited for the second half of this session, so 2023 to 2026 coverage relies on Crossref keyword search, which misses arXiv-only work
- the Danish and Luxembourg news-archiving dedup fork already noted in `web_crawling.md` (hash after regex stripping) is practice, not a paper
