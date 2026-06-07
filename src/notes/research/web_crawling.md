# Web Crawling

- [The Prevalence of Single Sign-On on the Web:
    Towards the Next Generation of
    Web Content Measurement](https://dl.acm.org/doi/10.1145/3618257.3624841),
    Calvin Ardi, Matt Calder, IMC, 2023
    - automate SSO login w/ Google/Facebook, etc. to access gated content
    - 58% of top 10K website can SSO
- [On Landing and Internal Web Pages: The Strange Case of Jekyll and Hyde in
    Web Performance
    Measurement](https://dl.acm.org/doi/abs/10.1145/3419394.3423626),
    Waqar Aqeel, Balakrishnan Chandrasekaran, Anja Feldmann, Bruce M. Maggs,
    IMC, 2020
    - landing page different from internal page
    - method to find representative internal page
- [System to Identify and Elide Superfluous JavaScript Code for
    Faster Webpage Loads](https://arxiv.org/pdf/2003.07396), Utkarsh Goel,
    Moritz Steiner, arXiv, 2020
    - passive real user monitoring system (RUM) in CDN proxy
    - on median page, 31% JS code superfluous, can rm for 5% speedup
- *Browser-based Crawling of News Websites Behind Paywalls*,
    IFLA News Media Section & IIPC Workshop on Archiving News Media, 2025
    - Danish & Luxembourgish & Finnish using
        [legal deposit
        law](https://netpreserve.org/web-archiving/legal-deposit/)
    - ask site owner to get login credential;
        legal deposit law enforce company to abide
        - ask for IP-based paywall bypass; better than login
        - cookie to bypass cache for IP-based paywall bypass
    - [Heritrix](https://github.com/internetarchive/heritrix3) job queue for
        non-browser crawling
    - [Browsertrix](https://github.com/webrecorder/browsertrix)
        browser automation
        - show preview; designed for non-technical user
        - pre-crawl validation of browser "profile" to ensure logged in
        - Selenium + Sikuli + weekly manual profile check
        - [fork](https://github.com/natliblux/browsertrix-crawler-deduplication)
            to crawl news frequently and dedup
            - hash page after removing dynamic element w/ regex 🤣
    - maintain shared document of paywall info
    - "student helper" to check periodically & submit ticket
    - <https://github.com/iipc/awesome-web-archiving>
- [The Internet with Privacy Policies:
    Measuring The Web](https://dl.acm.org/doi/pdf/10.1145/3555352), Nikhil Jha,
    Martino Trevisan, Luca Vassio, Marco Mellia, ToW, 2022
    - lose content if not clicked consent banner

## 🤖 Agent-added crawling direction (2026-06-07): archive-backed agent evidence

- 🤖 Insight: crawler/browser systems can make web-agent claims reproducible
  under live-web drift by pairing live observations with WACZ/Memento-style
  archived evidence and explicit freshness/source fields.
- 🤖 Why not merely engineering: the paper question is how much source
  correctness, temporal precision, and synthetic-content exposure change when
  agents reason over live-only vs archive-backed evidence.
- 🤖 Transfer: web-archiving formats, temporal IR, browser-based crawling behind
  consent/login/paywall state, and provenance graphs.
- 🤖 Sketch: crawl 20-50 volatile pages daily with Browsertrix/source-specific
  extractors; compare live-only, archive-only, and live+archive agents on
  claim support, time-of-claim accuracy, capture completeness, replay fidelity,
  and human review time.
- 🤖 Anchors: Browsertrix, WACZ, Memento/RFC 7089, Heritrix, Retrieval Collapse,
  PB stale/dedupe/news-quality work logs.

## 🤖 Agent-added crawling direction (2026-06-07): web atoms for invalidation

- 🤖 Insight: recrawl/retest decisions should follow dependency atoms: groups
  of URLs, scripts, APIs, archives, generated artifacts, and receipts that tend
  to become stale together.
- 🤖 Why not merely engineering: the research question is whether a causal
  dependency model predicts stale evidence and broken automation better than
  fixed crawl intervals or URL-level freshness checks.
- 🤖 Transfer: incremental computation, dynamic web dependency analysis,
  active automata learning, model-based testing, and crawl repair.
- 🤖 Sketch: learn atom graphs from CDP traces, crawl diffs, resource
  dependencies, and site maps; invalidate linked receipts/scripts/tests when an
  atom changes; measure stale-claim prevention, recrawl cost, and repair time.
- 🤖 Anchors: `web_atoms.md`, Web Dependency Analyzer, WebREC, Browsertrix,
  Fable, dynamic web exploration state-flow graphs.
