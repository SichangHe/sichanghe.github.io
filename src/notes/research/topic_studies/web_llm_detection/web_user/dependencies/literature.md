web dependency literature
(authored by agents unless marked 🧑)

what the studies establish

- dependency measurement has several distinct layers
    - infrastructure availability: names, certificates, content delivery
    - executable trust: scripts that run with access to the page
    - privacy: what providers can learn across visits
    - compatibility: what useful behavior a protection removes
- inference: a useful new study must connect one layer to an explicit user outcome
    - a request disappearing does not prove tracking stopped
    - a screenshot changing does not prove a task broke
    - several domains sharing a provider does not prove editorial coordination

infrastructure availability

- Kashaf, Sekar, Agarwal, [Analyzing Third Party Service Dependencies in Modern Web Services: Have We Learned from the Mirai-Dyn Incident?](https://aqsakashaf.github.io/assets/files/Webdep.pdf), IMC 2020
    - question: can failures of a few providers affect many websites?
    - method: map direct and indirect DNS, CDN, and certificate-revocation dependencies
        - Alexa top-100K websites
        - compare 2016 and 2020 snapshots
    - original words, abstract: “indirect dependencies amplify the impact of popular CDN and DNS providers by up to 25X”
    - scoped finding: their dependency model identifies substantial concentration and hidden shared dependencies
    - limit: modeled service disruption is not a browser experiment demonstrating every website becoming unavailable
        - provider capacity and dependencies invisible to end hosts are unmeasured
        - OCSP behavior, cached responses, and browser failure policy affect actual availability
    - version caution: the 2018 preprint has different authors and headline estimates
        - cite the 2020 paper's results as 2020 results
    - use: compare proposed user-visible failure measurement against their infrastructure graph

- Kumar, Asif, Lee, Bustamante, [Third-party Service Dependencies and Centralization Around the World](https://arxiv.org/pdf/2111.12253), arXiv v2, 2021
    - question: do global popular-site measurements describe regional dependencies?
    - method: regional top-500 lists and vantage points in 50 countries
        - 15,774 unique sites
        - classify DNS, CDN, and CA dependencies and concentration
    - original words, abstract: “using vantage points from 50 countries, from all inhabited continents”
    - scoped finding: measured dependency levels vary substantially across countries
    - limit: popular regional sites are not representative of every local task or language
        - correlations with economics and language do not establish causes
        - availability estimates retain infrastructure-model assumptions
    - use: stratify a browser failure experiment by the country and task a user cares about

- Kashaf et al., [Africa dependency study, author-hosted PDF](https://aqsakashaf.github.io/assets/files/Webdep-africa.pdf), listed as PAM 2023 on [Aqsa Kashaf's publications page](https://aqsakashaf.github.io/)
    - version caution: the retrieved PDF is an anonymous manuscript
        - PDF title: “A First Look at Third-Party Service Dependencies of Web Services in Africa”
        - author page lists a differently worded title
        - do not treat this PDF as a verified final proceedings version
    - question: how do website selection rules change regional dependency findings?
    - method: four African vantage points
        - Nigeria, Rwanda, South Africa, Kenya
        - distinguish sites visited, hosted, operated, or primarily used in Africa
    - original words, abstract: “Africa is largely underrepresented in those studies”
    - inference: selection by local relevance is a useful improvement over a single global top-site list
    - limit: four countries cannot establish continent-wide uniformity
        - infrastructure dependence remains distinct from demonstrated task failure

executable trust and concealed behavior

- Nikiforakis et al., [You Are What You Include: Large-scale Evaluation of Remote JavaScript Inclusions](https://www.kapravelos.com/publications/jsinclusions-CCS12.pdf), CCS 2012
    - question: whom do popular sites trust to execute remote code?
    - method: more than three million pages from Alexa top-10K sites
        - render pages to capture dynamically added scripts
        - assess provider maintenance and stale or mistyped inclusions
    - original words, abstract: “combine multiple libraries from local and remote sources into the same page, under the same namespace”
    - scoped finding: remote inclusions create trust relationships that can outlast safe provider ownership
    - limit: historical attack surface and browser policies need fresh measurement
        - remote inclusion alone does not demonstrate malicious execution
    - use: retain initiator and script identity, rather than counting destination domains alone

- Sarker, Jueckstock, Kapravelos, [Hiding in Plain Site: Detecting JavaScript Obfuscation through Concealed Browser API Usage](https://www.kapravelos.com/publications/jsobf-imc20.pdf), IMC 2020
    - question: how much browser behavior is hidden from static script inspection?
    - method: compare runtime browser API accesses against static analysis
        - instrumented Chromium over Alexa top-100K domains
    - original words, abstract: “then that behavior is obfuscated”
        - refers to runtime API usage that their static analysis cannot reconcile with source
    - scoped finding: 95.90% of successfully visited domains have at least one script with unresolved runtime API usage
    - limit: this operational label does not mean 95.90% of sites are malicious
        - benign code can conceal API use
        - failed visits are outside that denominator
        - static-analysis resolution limits affect the label
    - use: study hidden behavior independently of whether the code is harmful

- Pantelaios, Kapravelos, [FV8: A Forced Execution JavaScript Engine for Detecting Evasive Techniques](https://www.usenix.org/system/files/usenixsecurity24-pantelaios.pdf), USENIX Security 2024
    - question: can analysis inspect code hidden behind conditions?
    - method: modify V8 to execute selected branches around dynamic code injection
        - evaluate npm packages and browser extensions
    - original words, abstract: “FV8 selectively enforces code execution on APIs that conditionally inject dynamic code”
    - scoped finding: deeper execution exposes evasions missed by normal runs
    - limit: forced execution can produce behavior a normal user never encounters
        - their ecosystem study is not a prevalence estimate for ordinary websites
    - use: a secondary analysis stage for suspicious dependencies
        - preserve ordinary browser runs as the exposure estimate

measurement realism and user exposure

- Jueckstock et al., [Towards Realistic and Reproducible Web Crawl Measurements](https://www.kapravelos.com/publications/vpc-www21.pdf), WWW 2021
    - question: how do browser configuration and network origin change measurement?
    - method: repeated paired crawls of Tranco top-25K domains
        - cloud, university, residential vantage points
        - default versus more realistic browser configuration
    - original words, abstract: “browser configuration alone causing shifts in 19% of known ad and tracking domains encountered”
    - scoped finding: collection configuration changes measured privacy and security signals
    - limit: one endpoint per network class
        - realistic crawler is a comparison condition, not direct observation of every human
        - paper explicitly cannot generalize across all residential or cloud endpoints
    - use: record configuration and include repeated baselines before assigning a change to blocking

- Zafar et al., [Same Script, Different Behavior: Characterizing Divergent JavaScript Execution Across Different Device Platforms](https://www.kapravelos.com/publications/vv8diverge-ccs25.pdf), CCS 2025
    - question: does identical JavaScript execute differently on desktop and mobile?
    - method: combine script structure with instrumented runtime traces
        - Tranco top-10K sites
    - original words, abstract: “20.6% of scripts on the top 10K Tranco-ranked websites exhibit platform-specific execution”
    - scoped finding: code equality does not imply behavior equality across their tested platforms
    - limit: static flow reconstruction misses dynamic features
        - grouped conditions can overattribute responsible inputs
        - incomplete Canvas support can create spurious differences
        - divergence alone does not prove greater privacy harm
    - use: include a real mobile platform when the task or target audience is mobile

- Dambra et al., [When Sally Met Trackers: Web Tracking From the Users’ Perspective](https://www.usenix.org/system/files/sec22-dambra.pdf), USENIX Security 2022
    - question: what fraction of actual browsing can trackers observe?
    - method: opt-in security-product telemetry from 250K Windows users
        - combine visited domains with a separate crawl of tracker presence
    - original words, introduction: “knowing in how many websites a tracker is detected is difficult to translate into how much the tracker knows about the average user”
    - scoped finding: website prevalence and user exposure are different quantities
    - limit: opt-in product users and Windows devices are a selected population
        - crawl-based tracker maps estimate opportunities for observation
        - they do not capture every actual tracking event in each user's browser
    - use: choose task-weighted or visit-weighted outcomes when making user-facing claims

privacy and useful functionality

- Ikram et al., [Towards Seamless Tracking-Free Web: Improved Detection of Trackers via One-class Learning](https://arxiv.org/pdf/1603.06289), arXiv 2016
    - question: can blocking separate tracking code from useful code?
    - method: manually labeled JavaScript examples and one-class classifiers
        - syntactic and semantic features
        - evaluate against privacy tools and a larger site/script corpus
    - original words, abstract: “Such blocking also affects functionality of webpages and impairs user experience”
    - source status: abstract checked; full PDF is a follow-up reading lead
        - excluded from full-text count
    - limit: reported classifier accuracy does not establish successful user tasks
        - labels and data age need reassessment
    - use: historical comparator for functionality-preserving blocking

- Jueckstock et al., [Measuring the Privacy vs. Compatibility Trade-off in Preventing Third-Party Stateful Tracking](https://www.kapravelos.com/publications/ephemeralstorage-www22.pdf), WWW 2022
    - question: which storage policies preserve useful behavior while reducing tracking opportunities?
    - method: Tranco top-1K and three levels of linked pages
        - compare permissive, blocked, site-partitioned, and short-lived state
        - compare PageGraph event sets and manual breakage labels
    - original words, discussion: “our quantitative metrics were instead measuring behavioral deviations from a known-good baseline”
    - scoped finding: their partitioned and limited-lifetime policies are closer to the permissive behavioral baseline than full blocking
    - limit: manual user-visible breakage results are less decisive
        - small sample, limited interaction, no login
        - first-party and advertising frames excluded from quantitative metrics
        - graph similarity is a proxy for compatibility
    - use: compare both graph changes and explicitly tested user outcomes

closest rendering tool

- Alhamwy, Mertens, Hohlfeld, [Poster: Web Dependency Analyzer to Identify Resource Dependencies and their Impact on Rendering](https://doi.org/10.1145/3646547.3689683), IMC 2024
    - exact title quoted from [Crossref's publisher-deposited metadata](https://api.crossref.org/works/10.1145/3646547.3689683)
    - source status: metadata checked; full text unavailable through ACM during this session
    - human notes describe provider blocking and rendered-content ablation
    - no numerical result or implementation detail inferred from the title
    - novelty check required before implementing a rendering-dependency system
        - obtain poster and artifact
        - compare task success, preserved evidence, and repeated-baseline controls

what is still missing

- full-text inspection of the rendering poster and its artifact
- complete recent search for 2026 browser breakage and dependency work
- an audited measure linking provider outages to retained citations and usable knowledge
    - this is a proposed gap in the inspected set
    - it is not proof that no such paper exists
