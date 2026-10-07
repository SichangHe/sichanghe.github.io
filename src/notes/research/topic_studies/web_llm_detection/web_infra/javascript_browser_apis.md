# Measuring what JavaScript does and which browser APIs pages use

(authored by agents unless marked 🧑)

Written 2026-10-06. Web search was rate-limited for this session, so I found
papers through arXiv's API, Crossref, venue index pages (PETS, NDSS, USENIX),
and direct PDF downloads. Every quote below comes from the PDF itself. Where I
say "I think" or "my inference", that is me, not the paper. The ChatGPT CLI
failed three times (UI retry / timeout), so there is no ChatGPT opinion here.

## The picture in plain English

A web page ships JavaScript, the browser runs it, and the only way that code
can affect anything is by calling browser APIs: touch the DOM, send a request,
read `navigator.userAgent`, draw on a canvas. So if you log every call from JS
into the browser, you get a behavioral record of what each script actually did.
People use that record for four kinds of questions:

- which browser features are used at all, by whom, and how that changes over
    years (so browser vendors know what they can drop, and attackers know what
    they can abuse)
- which scripts are trackers, fingerprinters, miners, bot detectors, or
    phishing kits (classify by behavior, because URLs and source text are easy
    to disguise)
- how much shipped JS is never executed or does nothing useful (bloat, dead
    code, archival storage waste)
- whether what a crawler sees is what a real user sees (bot detection, consent
    banners, login walls, mobile vs desktop)

Three ways to get the record, with different trade-offs:

- patch the engine (VisibleV8, JSgraph, PageGraph, FV8): complete, hard to
    detect, but you maintain a Chromium fork
- wrap APIs in page JS (OpenWPM's instrumentation): easy, but a page can
    detect or undo it, and it only covers what you wrapped
- read the page's source (HTTP Archive custom metrics, Wappalyzer, static
    classifiers): cheap, archivable, but cannot see minified names, dynamic
    code, or whether code runs

Per-call counters from real users exist too: Chrome use counters, public at
chromestatus.com, give the fraction of page loads touching each feature,
but only per feature, not per script, and only for Chrome users who opted in.

## JSphere, the human's own project

🧑 source: the JSphere final report (Sichang He, mentor Harsha Madhyastha,
CSci 651, Nov 2024), <https://github.com/SichangHe/JSphere>. Status on the
README: "We have decided to pause this project due to its limited value and
various problems".

- goal: "classify JS scripts into common functionalities, which we call
    spheres" using "browser API calls" logged by VisibleV8 on "the top 1000
    subdomains" of Tranco
- spheres: frontend processing, DOM element generation, UX enhancement,
    extensional features (auth, tracking, hardware), silent
- how heuristics were built: "1.75% (318) of all observed APIs account for 80%
    of all API calls and 3.74% (678) of APIs cover 90% of all API calls", then
    hand-picked "anchor" APIs per sphere
- per-file result: "93.0% of script bytes into at least one sphere" but
    "1296.1 MB of scripts (40.60% by size) fall into all sure spheres, although
    the count is only 1473 (3.67%)", i.e. big bundles mix everything
- the eval trick: rewrite scripts into nested eval blocks of ~1 kB so VV8
    attributes calls to sub-script contexts; "Only 10.86% of code is skipped
    and not rewritten (2.9 GB)" but "89.9% of code is in contexts larger than
    10 kB, showing a large room for improvement"
- after the trick: "49% of code (12.9 GB) that does not invoke any API calls
    or mutate global states"; "38% of code is classified into at least one
    sphere and 12.4% of code is classified into all spheres"; frontend
    processing 36%, the other three around 22% each
- not done: "We did not complete the correlation with website performance"
- related-work claim: "There are, however, no research focusing on
    identifying the purposes of general JS, to the best of our knowledge"

My read of why it stalled, and what that implies:

- the eval trick solved an attribution problem that VV8 may already solve:
    the VV8 paper says it logs "fine-grained execution context (security
    origin, executing script, and code offset)" and "The access site is the
    character offset within the script that triggered this usage event".
    with a parser you can map each offset to its enclosing function and get
    function-level attribution without rewriting anything. I have not checked
    whether the JSphere code used the offset field; if it did not, that is the
    cheapest fix
- the spheres were defined top-down and judged by hand; there was no ground
    truth, so a reviewer cannot tell a 36% from a 50%. every classifier paper
    in this area (AdGraph, WebGraph, FP-Inspector, NoT.js) got around this by
    picking a narrow category with external labels (filter lists, manual
    labels)
- "silent" code at 49% matches the dead-code literature (Muzeel: "70% of
    JavaScript functions on the median page are unused"), so that finding is
    real but not new on its own; the new part would be explaining whose code
    it is and why it ships
- no link to any outcome (load time, breakage, privacy) is the reason it felt
    low value. the papers that got in all tie behavior to an outcome

## Literature, grouped by question

### How do you record what JS does?

- [VisibleV8: In-browser Monitoring of JavaScript in the
    Wild](https://kapravelos.com/publications/vv8-imc19.pdf), Jordan
    Jueckstock, Alexandros Kapravelos, IMC, 2019
    - "a dynamic analysis framework hosted inside V8, the JS engine of the
        Chrome browser, that logs native function or property accesses during
        any JS execution. At less than 600 lines (only 67 of which modify V8's
        existing behavior)"
    - "it intercepts accesses impossible to instrument inline"
    - side finding: "29% of the Alexa top 50k sites load content which
        actively probes these artifacts" (bot-detection probes)
    - open (my inference): per-call logs with offsets exist, but nobody has
        published a general-purpose, function-level "what does this code do"
        analysis on top of them; the lab's follow-ups went to obfuscation,
        evasion, and phishing
- [Online Tracking: A 1-million-site Measurement and
    Analysis](https://senglehardt.com/papers/ccs16_online_tracking.pdf),
    Steven Englehardt, Arvind Narayanan, CCS, 2016 (OpenWPM)
    - "we utilize Fourthparty's Javascript instrumentation, which defines
        custom getters and setters on the window.navigator and window.screen
        interfaces"
    - the paper itself admits "a script could disable our instrumentation
        before fingerprinting a user by overriding access to getters and
        setters"
    - open (my inference): in-page wrapping is what most privacy papers still
        use; it is detectable and partial
- [JSgraph: Enabling Reconstruction of Web Attacks via Efficient Tracking of
    Live In-Browser JavaScript
    Executions](https://doi.org/10.14722/ndss.2018.23319), Bo Li, Phani
    Vadrevu, Kyu Hyung Lee, Roberto Perdisci, NDSS, 2018
    - "instrumenting Chromium's code base at the interface between Blink and
        V8"; "a median overhead on popular website page loads between 3.2% and
        3.9%"
- [Jalangi: A Selective Record-Replay and Dynamic Analysis Framework for
    JavaScript](https://dl.acm.org/doi/10.1145/2491411.2491447), Koushik Sen
    et al., FSE, 2013
    - source rewriting; "an average slowdown of 26X during recording and 30X
        slowdown during replay and analysis", so not for crawls
- [FV8: A Forced Execution JavaScript Engine for Detecting Evasive
    Techniques](https://www.usenix.org/system/files/usenixsecurity24-pantelaios.pdf),
    Nikolaos Pantelaios, Alexandros Kapravelos, USENIX Security, 2024
    - "FV8 selectively enforces code execution on APIs that conditionally
        inject dynamic code, thus enhancing code coverage"
    - quotes prior work: "25% of all malicious JavaScript code is obfuscated
        to avoid detection [22], in stark contrast to the Alexa top 20,000
        websites, where only 0.5% of the code is obfuscated"
    - open (my inference): forced execution tells you what code could do, not
        what it does for real users; the two numbers are both interesting
- [Web Execution Bundles: Reproducible, Accurate, and Archivable Web
    Measurements](https://arxiv.org/abs/2501.15911), Florian Hantke, Peter
    Snyder, Hamed Haddadi, Ben Stock, USENIX Security, 2025 (WebREC)
    - built on Brave's PageGraph, which "comprehensively tracks and attributes
        all network requests, DOM changes, and denoted WebAPI and JS-builtin
        calls, building an internal graph of annotated actors, actees, and
        actions"
    - why HAR replays lie: replaying a 2010 page in a 2024 browser "will
        under-count JavaScript sub-resource requests while over-counting the
        number of failed HTTP requests"
    - "70% of papers discussed in a 2024 web crawling SoK paper could be
        conducted using WebREC as is"
    - open (my inference): this is the archival format a longitudinal
        "what JS does" study should produce; nobody has yet built a multi-year
        WebREC corpus
- Chrome use counters, [UseCounter
    wiki](https://chromium.googlesource.com/chromium/src/+/main/docs/use_counter_wiki.md)
    - "Feature usage is recorded per page load and is anonymously aggregated.
        Note, measurements are only recorded for HTTP/HTTPS pages"
    - "UseCounter data can be biased against scenarios where user metrics
        analysis is not enabled (e.g., enterprises)"; public at
        <https://chromestatus.com/metrics/feature/popularity>
    - open (my inference): this is the only real-user, all-Chrome API usage
        signal, and I found no academic paper that compares it against crawler
        measurements feature by feature (Beugin et al. 2026 below uses it for
        Privacy Sandbox APIs only)
- [SoK: State of the Krawlers](https://www.usenix.org/system/files/usenixsecurity24-stafeev.pdf),
    Aleksei Stafeev, Giancarlo Pellegrino, USENIX Security, 2024
    - "reimplement and patch 27 algorithms and variants into our evaluation
        framework called Arachnarium"; metrics are "code, link, and JavaScript
        source coverage"
    - "proposed and commonly used crawling algorithms offer a lower coverage
        than randomized ones"
    - open (my inference): landing-page-only API logs (JSphere, Snyder 2016)
        under-count whatever only runs after interaction

### Which browser features does the web use?

- [Browser Feature Usage on the Modern
    Web](https://www.cs.uic.edu/~ckanich/papers/snyder2016browser.pdf), Peter
    Snyder, Lara Ansari, Cynthia Taylor, Chris Kanich, IMC, 2016
    - Firefox extension, Alexa top 10k, "visiting the home page of site and
        allowing the monkey testing to run for 30 seconds"
    - "50% of the JavaScript provided features in the web browser are never
        used by the ten thousand most popular websites"
    - "a set of browser features (approximately 10%) that are used by
        websites, but which ad and tracking blockers prevent from executing
        more than 90% of the time"
    - open (my inference): 2016, Firefox, landing pages, random clicks; the
        web platform has added hundreds of APIs since. nobody redid this
- [Most Websites Don't Need to Vibrate: A Cost-Benefit Approach to Improving
    Browser Security](https://arxiv.org/abs/1708.08510), Peter Snyder, Cynthia
    Taylor, Chris Kanich, CCS, 2017
    - "blocking 15 of the 74 standards avoids 52.0% of code paths related to
        previous CVEs, and 50.0% of implementation code identified by our
        metric, without affecting the functionality of 94.7% of measured
        websites"
    - open (my inference): "functionality" judged by humans on a sample; a
        behavioral (API-log) breakage metric would scale this
- [Web Almanac 2024, JavaScript
    chapter](https://almanac.httparchive.org/en/2024/javascript), HTTP Archive
    - "the median JavaScript payload rising by 14%, reaching 558 kilobytes on
        mobile and 613 kilobytes on desktop"; requests "On desktop usage
        increased from 19 in 2019 to 23 in 2024, while on mobile it increased
        from 18 to 22"
    - "jQuery still remains the most widely used library on the web, appearing
        on 74% of pages"; "React usage has grown slightly to 10%"
    - method caveat they state: Wappalyzer for libraries; transpiler numbers
        only for "sites with available source maps", which biases toward
        complex apps
- [Web Almanac 2022, JavaScript
    chapter](https://almanac.httparchive.org/en/2022/javascript)
    - "According to Lighthouse, the median mobile page loads 162 KB of unused
        JavaScript"; "jQuery is used by 81% of mobile pages, followed by
        core-js on 41%, jQuery Migrate on 34%"
- [Web Almanac 2025, Capabilities
    chapter](https://almanac.httparchive.org/en/2025/capabilities)
    - "Adoption of the Compression Streams API grew sharply between 2024 and
        2025, becoming the most widely used API in 2025 and overtaking
        Clipboard"
    - method caveat they state: "it may underreport some APIs used as it can't
        detect code that may exist due to minification, for example, when
        navigator was minified to n; or it may overreport occurrences of APIs
        because it doesn't run code to see if an API is actually used"
    - open (my inference): HTTP Archive's API numbers are source greps on
        landing pages; a VV8 crawl of the same pages would give the first
        static-vs-dynamic error bar for these headline numbers
- [UA-Radar: Exploring the Impact of User Agents on the
    Web](https://arxiv.org/abs/2311.10420), Jean Luc Intumwayase, Imane
    Fouad, Pierre Laperdrix, Romain Rouvoy, arXiv, 2023
    - "We crawled 270,048 web pages from 11,252 domains using 3 different
        browsers and 2 different UA strings to observe that 100% of the web
        pages were similar before any JavaScript was executed"; after JS ran,
        a small share changed with the UA
- [Longitudinal Adoption and Deprecation of the Privacy Sandbox Web
    APIs](https://arxiv.org/abs/2606.26390), Yohan Beugin, Paul Barford,
    Patrick McDaniel, arXiv, 2026
    - "Leveraging historical HTTP Archive crawls and public Chrome telemetry
        data, we offer the largest study of its kind into the prevalence of
        each Privacy Sandbox feature ... on popular websites (CrUX top 100k),
        and as experienced by Chrome users"
    - open (my inference): the closest thing to a crawler-vs-use-counter
        comparison, but only for one API family
- [The Rise and Fall of Google's Privacy
    Sandbox](https://arxiv.org/abs/2607.00693), Rachid Youssef Grib, Alberto
    Verna, Nikhil Jha, Martino Trevisan, Marco Mellia, arXiv, 2026
    - "Using a custom call listener and weekly crawls of the top-10,000
        websites, we monitor the usage of all major APIs"; "most APIs were used
        by only a handful of actors"

### How much shipped JS is unused, and can it be dropped?

- [System to Identify and Elide Superfluous JavaScript Code for Faster
    Webpage Loads](https://arxiv.org/abs/2003.07396), Utkarsh Goel, Moritz
    Steiner, arXiv, 2020 (Akamai)
    - "a JS resource on a median page contains 31% superfluous code"; uses
        "real user monitoring systems (RUM)" via a CDN proxy
    - the catch they state: "the data captured by the Coverage API is not
        exposed to JS and therefore, RUM-based systems cannot collect data
        about the usage of JS resources"
- [Muzeel: A Dynamic JavaScript Analyzer for Dead Code Elimination in
    Today's Web](https://arxiv.org/abs/2106.08948), Tofunmi Kupoluyi, Moumena
    Chaqfeh, Matteo Varvello, et al., arXiv, 2021 (also IMC 2022)
    - "an analysis of around 40,000 web pages shows that 70% of JavaScript
        functions on the median page are unused, and the elimination of these
        functions would contribute to the reduction of the page size by 60%"
    - "Muzeel extracts all of the page event listeners upon page load, and
        emulates user interactions using a bot that triggers each of these
        events"
    - open (my inference): "unused" is relative to the interactions tried;
        nobody has measured how much of that 70% a real user eventually hits
- [Lacuna: An Extensible Approach for Taming the Challenges of JavaScript
    Dead Code
    Elimination](https://www.ivanomalavolta.com/files/papers/SANER_2018.pdf),
    Niels Groot Obbink, Ivano Malavolta, et al., SANER, 2018, and
    [JavaScript Dead Code Identification, Elimination, and Empirical
    Assessment](https://arxiv.org/abs/2308.16729), Malavolta et al., IEEE
    TSE, 2023
    - Lacuna "supports both static and dynamic analyses"; evaluated on "29
        publicly-available web apps, composed of 15,946 JavaScript functions"
- [Jawa: Web Archival in the Era of
    JavaScript](https://www.usenix.org/system/files/osdi22-goel.pdf), Ayush
    Goel, Jingyuan Zhu, Ravi Netravali, Harsha V. Madhyastha, OSDI, 2022
    - "JavaScript accounts for 44% of the bytes on the median page in 2020, as
        compared to 20% in 2000"
    - "first to eliminate non-functional code, and second to prune unreachable
        code while preserving post-load interactions"; "reduces overall
        storage needs by 41%"
- [Sprinter: Speeding Up High-Fidelity Crawling of the Modern
    Web](https://www.usenix.org/system/files/nsdi24-goel.pdf), Goel, Zhu,
    Netravali, Madhyastha, NSDI, 2024
    - "a static crawler fails to fetch 32% of bytes on the median page";
        Sprinter is "5x faster than browser-based crawling"
- [Horcrux: Automatic JavaScript Parallelism for Resource-Efficient Web
    Computation](https://www.usenix.org/system/files/osdi21-mardani.pdf),
    Mardani, Goel, Ko, Madhyastha, Netravali, OSDI, 2021
    - "browsers make it easy for web developers to reason about page state by
        serially executing all scripts"; relevant because it needs to know
        which code touches shared state, the same question as "silent" code
- [MAML: Towards a Faster Web in Developing
    Regions](https://arxiv.org/abs/2502.15708), Ayush Pandey, Matteo
    Varvello, et al., arXiv, 2025
    - motivation quotes prior work: "more than 60% of webpages request data
        from at least 5 different nonorigin sources, contributing to more than
        35% of the overall page size"

### Who ships the code: third parties, libraries, bundles, tag managers

- [Thou Shalt Not Depend on Me: Analysing the Use of Outdated JavaScript
    Libraries on the
    Web](https://www.ndss-symposium.org/wp-content/uploads/2017/09/ndss2017_02B-1_Lauinger_paper.pdf),
    Tobias Lauinger et al., NDSS, 2017
    - "Using data from over 133 k websites, we show that 37 % of them include
        at least one library with a known vulnerability"
    - "libraries included transitively, or via ad and tracking code, are more
        likely to be vulnerable"
- [Insecure Ingredients? Exploring Dependency Update Patterns of Bundled
    JavaScript Packages on the Web](https://arxiv.org/abs/2512.15447), Ben
    Swierzy, Marc Ohm, Michael Meier, arXiv, 2025
    - "Prior research focuses on mechanisms for either hand-selected popular
        packages in bundles or for single-file resources utilizing the global
        namespace"; proposes "Aletheia, a package-agnostic method which
        dissects JavaScript bundles to identify package versions"
    - open (my inference): bundle dissection plus API logs would let you say
        which npm package in a bundle made which browser call; nobody has done
        that
- [Unbundle-Rewrite-Rebundle: Runtime Detection and Rewriting of
    Privacy-Harming Code in JavaScript
    Bundles](https://arxiv.org/abs/2405.00596), Mir Masood Ali, Peter Snyder,
    Chris Kanich, Mohammad Ghasemisharif, CCS, 2024
    - splits webpack-style bundles back into modules at runtime to block only
        the harmful module
- [You Can't Trust Your Tag Neither: Privacy Leaks and Potential Legal
    Violations within the Google Tag Manager](https://arxiv.org/abs/2312.08806),
    Gilles Mertens, Nataliia Bielova, et al., arXiv 2023 / PETS 2024
    - GTM "is currently present on 52% of the top 1 million most popular
        websites"; "automated analysis of 718 Tags ... we discover multiple
        hidden data leaks"
- [The Devil is in the Details: Detection, Measurement and Lawfulness of
    Server-Side Tracking on the
    Web](https://petsymposium.org/popets/2024/popets-2024-0125.pdf), PETS,
    2024
    - server-side tagging moves tracker logic off the page: "one of the key
        features of server-side tagging is that it can be run in a subdomain
        of the websites that send data to it"
    - open (my inference): API-call logs will see less tracking over time as
        it moves server-side; a JS-only study under-counts
- [Web Almanac 2024, Third Parties
    chapter](https://almanac.httparchive.org/en/2024/third-parties)
    - "The median number of third-parties is 66 for the top thousand websites
        and 27 for the top million websites"
- [Every Keystroke You Make: A Tech-Law Measurement and Analysis of Event
    Listeners for Wiretapping](https://arxiv.org/abs/2508.19825), Shaoor
    Munir, Nurullah Demir, Konrad Kollnig, Zubair Shafiq, arXiv, 2025
    - "We use an instrumented web browser to crawl a sample of the
        top-million websites to investigate the use of event listeners"; finds
        third-party keystroke listeners on a sizable share of sites (exact
        figures in the paper)
    - note for JSphere: `addEventListener` was JSphere's anchor for "frontend
        processing"; this paper shows the same API is a tracking signal when
        the listener is third-party

### eval, dynamic code, obfuscation, minification

- [The Eval that Men Do](https://janvitek.org/pubs/ecoop11.pdf), Gregor
    Richards, Christian Hammer, Brian Burg, Jan Vitek, ECOOP, 2011
    - "recorded the behavior of 337 MB of strings given as arguments to
        550,358 calls to the eval function exercised in over 10,000 web sites"
    - "Over 82% of the top 100 pages use eval, and 50% of the remaining 10,000
        pages do as well"
    - open (my inference): 2011; no one has redone this since bundlers, CSP,
        and Trusted Types changed the landscape
- [CSP Is Dead, Long Live
    CSP!](https://research.google.com/pubs/archive/45542.pdf), Lukas
    Weichselbaum et al., CCS, 2016
    - "unsafe-eval allows the use of JavaScript APIs that execute string data
        as code, such as eval(), setTimeout(), setInterval(), and the Function
        constructor"; "By default, Angular uses the eval() function"
- [Anything to Hide? Studying Minified and Obfuscated Code in the
    Web](https://software-lab.org/publications/www2019.pdf), Philippe Skolka,
    Cristian-Alexandru Staicu, Michael Pradel, WWW, 2019
    - "967,149 scripts (424,023 unique) from the top 100,000 websites";
        "code transformations are very widespread, affecting 38% of all
        scripts"; "advanced obfuscation techniques ... affect less than 1% of
        all scripts"
- [Statically Detecting JavaScript Obfuscation and Minification Techniques
    in the Wild](https://swag.cispa.saarland/papers/moog2021statically.pdf),
    Marvin Moog, Markus Demmel, Michael Backes, Aurore Fass, DSN, 2021
    - "90% of Alexa Top 10k websites containing a transformed script"; "code
        transformations are no indicator of maliciousness"
- [Hiding in Plain Site: Detecting JavaScript Obfuscation through Concealed
    Browser API Usage](https://dl.acm.org/doi/10.1145/3419394.3423616),
    Shaown Sarker, Jordan Jueckstock, Alexandros Kapravelos, IMC, 2020
    - "90% of the domains we successfully visited contain at least one script
        which invokes APIs that cannot be resolved from static analysis"
    - this is the strongest argument for dynamic (VV8) over static (HTTP
        Archive grep) API measurement
- [JsDeObsBench: Measuring and Benchmarking LLMs for JavaScript
    Deobfuscation](https://arxiv.org/abs/2506.20170), Guoqiang Chen, Xin Jin,
    Zhiqiang Lin, arXiv, 2025; [CASCADE: LLM-powered JavaScript Deobfuscator
    at Google](https://arxiv.org/abs/2507.17691), arXiv, 2025
    - LLMs show "superior performance in code simplification despite
        challenges in maintaining syntax accuracy and execution reliability";
        CASCADE "is already deployed in Google's production environment"
    - open (my inference): LLM deobfuscation has not been used as a
        measurement instrument (e.g. recover purposes of minified bundles at
        scale)
- [Cryptic Bytes: WebAssembly Obfuscation for Evading Cryptojacking
    Detection](https://arxiv.org/abs/2403.15197), Håkon Harnes, Donn
    Morrison, arXiv, 2024, and [To WASM or Not to
    WASM](https://arxiv.org/abs/2508.21219), arXiv, 2025
    - "obfuscation can successfully evade state-of-the-art cryptojacking
        detectors"; for fingerprinting, "defenses such as browser extensions
        and native browser features remained completely effective, as their
        API-level interception is agnostic to the script's underlying
        implementation"
    - takeaway: API-level logging survives JS-to-wasm obfuscation; source
        classifiers do not

### WebAssembly on the web

- [An Empirical Study of Real-World WebAssembly
    Binaries](https://software-lab.org/publications/www2021.pdf), Aaron
    Hilbig, Daniel Lehmann, Michael Pradel, WWW, 2021
    - "8,461 unique WebAssembly binaries"; "two thirds of the binaries are
        compiled from memory unsafe languages"; "cryptomining ... has been
        marginalized (less than 1% of all binaries found on the web)"; "29% of
        all binaries on the web are minified"
- [MineSweeper](https://www.cs.vu.nl/~herbertb/download/papers/minesweeper_ccs18.pdf),
    Konoth et al., CCS, 2018
    - "drive-by mining now largely takes advantage of WebAssembly (Wasm)";
        the use case that drove early wasm measurement
- [Everything Old is New Again: Binary Security of
    WebAssembly](https://www.usenix.org/system/files/sec20-lehmann.pdf),
    Lehmann, Kinder, Pradel, USENIX Security, 2020
    - "WebAssembly is supported by 92% of all global browser installations as
        of June 2020"
- [Web Almanac 2022, WebAssembly
    chapter](https://almanac.httparchive.org/en/2022/webassembly)
    - "We found 3,204 confirmed WebAssembly requests on desktop and 2,777 on
        mobile"; "much of the WebAssembly usage we see comes from a relatively
        small number of third-party libraries"; caveat: "primarily based on
        home pages where WebAssembly may be less prevalent"
- [The Promise and Pitfalls of WebAssembly: Perspectives from the
    Industry](https://arxiv.org/abs/2503.21240), Ningyu He, Shangtong Cao,
    Haoyu Wang, et al., arXiv, 2025
    - "currently, there is no work that conducts a large-scale measurement
        study on in-the-wild adopted Wasm binaries. To fill this gap, we
        collect the largest-ever dataset"
- [SoK: Analysis Techniques for WebAssembly](https://arxiv.org/abs/2401.05943),
    Harnes, Morrison, arXiv, 2024
- open (my inference): nobody has logged what wasm modules do on live pages
    (their JS imports and the browser APIs reached through them); VV8 sees the
    JS side of every wasm import, so this is a cheap extension

### Classifying scripts by behavior

- [AdGraph](https://umariqbal.com/papers/adgraph-sp2020.pdf), Umar Iqbal,
    Peter Snyder, et al., S&P, 2020
    - "a graph representation of the HTML structure, network requests, and
        JavaScript behavior of a webpage"; "replicate the labels of
        human-generated filter lists with 95.33% accuracy"
- [WebGraph](https://www.usenix.org/system/files/sec22-siby.pdf), Sandra
    Siby, Umar Iqbal, Steven Englehardt, Zubair Shafiq, Carmela Troncoso,
    USENIX Security, 2022
    - "detects ads and trackers based on their action rather than their
        content"; adversary success drops "from near-perfect for AdGraph to
        around 8% for WebGraph"
- [Khaleesi](https://www.usenix.org/system/files/sec22-iqbal.pdf), Iqbal,
    Wolfe, Munir, Shafiq, USENIX Security, 2022: request-chain context
- [TrackerSift](https://arxiv.org/abs/2108.13923), Amjad, Saleem, Gulzar,
    Shafiq, Zaffar, IMC, 2021
    - "mixed web resources (that combine tracking and legitimate
        functionality)"; "TrackerSift is able to attribute 98% of the
        script-initiated network requests to either tracking or functional
        resources at the finest method-level granularity"
- [Blocking JavaScript Without Breaking the Web: An Empirical
    Investigation](https://petsymposium.org/popets/2023/popets-2023-0087.pdf),
    Amjad, Shafiq, Gulzar, PETS, 2023
    - "blanket JS blocking indeed eliminates tracking, but it also breaks
        website functionality on approximately two-thirds of the tested
        websites"
- [Blocking Tracking JavaScript at the Function
    Granularity](https://arxiv.org/abs/2405.18385), Amjad, Munir, Shafiq,
    Gulzar, CCS, 2024 (NoT.js)
    - "analyzing the dynamic execution context, including the call stack and
        calling context of each JavaScript function, and then encoding this
        context to build a rich graph representation"; generates "surrogate
        scripts that preserve functionality while removing" tracking
    - this is function-level attribution of behavior, done without an eval
        trick; the closest technical cousin of JSphere, but for one label
- [Improving Web Content Blocking With Event-Loop-Turn Granularity
    JavaScript Signatures](https://arxiv.org/abs/2005.11910), Quan Chen,
    Peter Snyder, Ben Livshits, Alexandros Kapravelos, S&P, 2021
    - "the unit of analysis each script's behavior during each turn on the
        JavaScript event loop"; signatures "robust against code obfuscation,
        code bundling, URL modification"
- [AutoFR](https://www.usenix.org/system/files/usenixsecurity23-le.pdf), Le,
    Elmalaki, Markopoulou, Shafiq, USENIX Security, 2023: "block 86% of the
    ads, as compared to 87% by EasyList"
- [Characterizing Phishing Pages by JavaScript
    Capabilities](https://arxiv.org/abs/2509.13186), Aleksandr Nahapetyan,
    ..., Alexandros Kapravelos, arXiv, 2025
    - "We collected VisibleV8 logs for their home pages"; "clustering based
        on the set of browser APIs executed yields 98% accuracy in grouping
        them by the underlying kit"
    - this is JSphere's exact instrument (VV8 API sets per script) used for a
        narrow, labelable question. I think that is the pattern to copy
- [Byte by Byte: Unmasking Browser Fingerprinting at the Function Level
    Using V8 Bytecode Transformers](https://arxiv.org/abs/2509.09950), Pouneh
    Nikkhah Bahrami, Dylan Cutler, Igor Bilogrevic, arXiv, 2025
    - "the first system leveraging V8 engine bytecode to detect fingerprinting
        operations specifically at the JavaScript function level"; "only adds
        a 4% (average) latency"
    - open (my inference): bytecode-level function classification could be
        trained for any label, not just fingerprinting; needs labels

### Fingerprinting and tracking detected through API usage

- [FPDetective](https://www.esat.kuleuven.be/cosic/publications/article-2334.pdf),
    Acar et al., CCS, 2013: "13 instances of JavaScript-based font-probing
    scripts, on a total of 404 websites" in the top 1M
- [Fingerprinting the Fingerprinters](https://umariqbal.com/papers/fpinspector-sp2021.pdf),
    Iqbal, Englehardt, Shafiq, S&P, 2021
    - "browser fingerprinting is now present on more than 10% of the top-100K
        websites and over a quarter of the top-10K websites"; "previously
        unreported uses of JavaScript APIs by fingerprinting scripts"
- [FP-Radar](https://petsymposium.org/popets/2022/popets-2022-0056.pdf),
    Nikkhah Bahrami, Iqbal, Shafiq, PETS, 2022
    - "leverages longitudinal measurements of web API usage on top-100K
        websites over the last decade"; "uses the Wayback Machine to crawl the
        historical snapshots of scripts"; detects abuse of "Gamepad,
        Clipboard" and "the Visibility API"
    - the only decade-long API-usage study I found, and it is scoped to
        fingerprinting
- [Unveiling Web Fingerprinting in the Wild Via Code Mining and Machine
    Learning](https://petsymposium.org/popets/2021/popets-2021-0004.pdf),
    Rizzo, Traverso, Mellia, PETS, 2021
    - "400,000 JavaScript files accessed by about 1,000 volunteers during a
        one-month long experiment"; "studies based on either static or dynamic
        code analysis provide partial view"
- [Nowhere to Hide: Detecting Obfuscated Fingerprinting
    Scripts](https://arxiv.org/abs/2206.13599), Ngan, Konkialla, Shafiq, 2022
    - "the combination of static and dynamic analysis is robust against
        different types of obfuscation"
- [FP-tracer](https://petsymposium.org/popets/2024/popets-2024-0092.pdf),
    Boussaha et al., PETS, 2024
    - "fingerprinting obfuscates 46% of transmitted attributes, and 38% of
        fingerprinters involve two or more domains"; "existing consent banners
        do not provide an effective defense against browser fingerprinting"
- [FP-Fed](https://www.ndss-symposium.org/wp-content/uploads/2024-360-paper.pdf),
    Annamalai, Bilogrevic, De Cristofaro, NDSS, 2024
    - "typically, less than 1% of all scripts are fingerprinting"; detection
        "by only relying on runtime signals extracted from the execution
        trace"
- [Assessing Web Fingerprinting Risk](https://arxiv.org/abs/2403.15607),
    Bacis et al. (Google), arXiv, 2024
    - "actual visited pages and Web APIs reported by tens of millions of real
        Chrome browsers in-the-wild"; accounts for "correlations among
        different Web APIs"
- [The First Early Evidence of the Use of Browser Fingerprinting for Online
    Tracking](https://arxiv.org/abs/2409.15656), Liu, Dani, Cao, Wu, Saxena,
    arXiv, 2024
    - "Prior studies only measured whether fingerprinting-related scripts are
        being run on the websites but that in itself does not necessarily mean
        that fingerprinting is being used for ... online tracking"
- [My Cookie is a phoenix](https://petsymposium.org/popets/2022/popets-2022-0063.pdf),
    Fouad, Santos, Legout, Bielova, PETS, 2022: "1,150 out of the top 30,000
    Alexa websites deploy" cookie respawning via fingerprinting
- [The CNAME of the Game](https://petsymposium.org/popets/2021/popets-2021-0053.pdf),
    Dimova et al., PETS, 2021: "Using historical HTTP Archive data we find
    that this tracking scheme is rapidly gaining traction"
- [Internet Jones and the Raiders of the Lost
    Trackers](https://www.usenix.org/system/files/conference/usenixsecurity16/sec16_paper_lerner.pdf),
    Lerner et al., USENIX Security, 2016
    - "the Internet Archive's Wayback Machine opens the possibility for a
        retrospective analysis of tracking over time"; "the Wayback Machine's
        view of past third-party requests ... is imperfect"
- [Bridging the Gap: A Longitudinal Analysis of Extended Identifiers in the
    Post-Cookie Era](https://arxiv.org/abs/2609.02069), Smith et al., 2026:
    "reaching 83.76% of studied websites by May 2025"
- [Rethinking Fingerprinting: An Assessment of Behavior-based Methods at
    Scale](https://petsymposium.org/popets/2025/popets-2025-0158.pdf),
    Crichton, Cranor, Christin, PETS, 2025: behavioral (browsing-pattern)
    fingerprints, "an adversary can eliminate 84–95% of a user's anonymity
    having observed just a single session"

### Crawler vs real users, bot detection, sampling

- [Towards Realistic and Reproducible Web Crawl
    Measurements](https://www.ben-livshits.org/papers/pdf/www21a.pdf),
    Jueckstock, Sarker, Snyder, et al., WWW, 2021
    - "browser configuration alone can cause shifts in 19% of known ad and
        tracking domains encountered, and similarly affects the loading
        frequency of up to 10% of distinct families of JavaScript code units
        executed"
    - "researchers should avoid lowest-common-denominator crawlers, such as
        stock Puppeteer driving headless Chromium"
    - they explicitly "did not attempt to quantify the direct effects of bot
        detection/discrimination on results"
- [OmniCrawl](https://petsymposium.org/popets/2022/popets-2022-0012.pdf),
    Cassel et al., PETS, 2022
    - "42 different non-emulated browsers simultaneously"; "the use of
        emulated mobile browsers and Selenium, can lead to website behavior
        that deviates from what actual users experience"
- [Beyond the Crawl: Unmasking Browser Fingerprinting in Real User
    Interactions](https://arxiv.org/abs/2502.01608), Annamalai, Bilogrevic,
    De Cristofaro, arXiv, 2025
    - "a user study involving 30 participants over 10 weeks ... across 3,000
        top-ranked websites"; "automated crawls miss almost half (45%) of the
        fingerprinting websites encountered by real users"; causes:
        "authentication-protected pages, circumvent bot detection, and trigger
        fingerprinting scripts activated by specific user interactions"
    - open (my inference): the same 45%-style gap has not been measured for
        general API usage or unused code
- [Detecting Bot Detection: Prevalence, Techniques, and Implications for Web
    Measurement Research](https://arxiv.org/abs/2606.14525), Gundelach,
    Mühlhauser, Herrmann, arXiv, 2026
    - "83% of papers omit any discussion of bot detection blocking";
        "Chromium headless encounters a 15% soft block rate compared to 7% for
        other configurations"; "75% of Chromium-headless-only blocks are
        caused by header-level signals alone, yet JavaScript-based environment
        probing is more extensive than current blocking rates suggest"
- [Web Runner 2049](https://www.securitee.org/files/webrunner_dimva2020.pdf),
    Amin Azad, Starov, Laperdrix, Nikiforakis, DIMVA, 2020: "by relying on
    browser fingerprinting, more than 75% of protected websites in our dataset,
    successfully defend against attacks by basic bots"
- [On the Internet, Nobody Knows You're an LLM
    Bot](https://arxiv.org/abs/2606.30119), Fayolle et al., 2026, and
    [FP-Agent: Fingerprinting AI Browsing Agents](https://arxiv.org/abs/2605.01247),
    Wang, Shafiq, Vekaria, 2026
    - "bots represent between 30% and 50% of all web traffic"; agent
        detection is the new bot-detection arms race, which means new JS
        probes on pages
- [You Get What You Sample](https://arxiv.org/abs/2609.11218), Zhang, Yang,
    Pellegrino, arXiv, 2026
    - "Top N over-estimates the true impact in 95% of runs"
    - relevant: JSphere and most API studies use Top N
- [On Landing and Internal Web Pages: The Strange Case of Jekyll and Hyde in
    Web Performance Measurement](https://dl.acm.org/doi/10.1145/3419394.3423626),
    Aqeel et al., IMC, 2020 (in the human's `web_crawling.md`): internal
    pages differ from landing pages

### Longitudinal views and archives

- [Way back then: A Data-driven View of 25+ years of Web
    Evolution](https://arxiv.org/abs/2202.08239), Agarwal, Sastry, 2022:
    "top 100 Alexa websites for over 25 years from the Internet Archive";
    tracks "MIME-types (text vs. image vs. video vs. javascript and json)"
- [Right HTML, Wrong JSON: Challenges in Replaying Archived Webpages Built
    with Client-Side Rendering](https://arxiv.org/abs/2305.01071), Weigle,
    Nelson, Alam, Graham, 2023
    - "the JSON responses can become out of sync with the HTML page ...
        resulting in temporal violations on replay"
    - open (my inference): any archive-based "what did JS do in year X" study
        must handle this; WebREC is the proposed fix
- [Longitudinal Sampling of URLs From the Wayback
    Machine](https://arxiv.org/abs/2507.14752), Garg et al., 2025: "27.3
    million URLs with 3.8 billion archived pages spanning 26 years"
- [The Impact of AI-Generated Text on the
    Internet](https://arxiv.org/abs/2604.26965), Dolezal, Alam, Graham,
    Bohacek, 2026: "by mid-2025, roughly 35% of newly published websites were
    classified as AI-generated or AI-assisted"
- 🧑 [DeGenTWeb: A First Look at LLM-dominant
    Websites](https://arxiv.org/abs/2605.00087), Sichang Steven He, Calvin
    Ardi, Ramesh Govindan, Harsha V. Madhyastha, 2026: "LLM-dominant sites are
    highly prevalent both in data from Common Crawl and in Bing's search
    results, and that this share is growing over time"

## Pitfalls and unsolved problems in the methods

- attribution: a call site inside a 2 MB bundle tells you the bundle, not the
    module or function. JSphere rewrote code; NoT.js uses call stacks; ByteDefender
    uses V8 bytecode per function; VV8 gives character offsets. none of these
    is a shared, reusable attribution layer, and bundles with source maps are a
    biased minority (Web Almanac)
- coverage: landing page + 30 s of random clicks (Snyder 2016), or event
    triggering (Muzeel), or forced execution (FV8) each give a different
    "used" set. real users miss 45% less fingerprinting than crawlers (Beyond
    the Crawl). no study reports its coverage of a page's JS
- bot detection: 29% of top sites probe for bots (VV8), headless gets 15%
    soft blocks (2026), and 83% of papers do not mention it. the JS you log
    from a detected bot may not be the JS a user runs
- static vs dynamic: 90% of domains have scripts whose API use cannot be
    resolved statically (Sarker 2020), yet HTTP Archive and Web Almanac
    numbers are static greps
- ground truth: every behavioral classifier that got published used an
    external label (filter lists, phishing kits, manual fingerprinting
    labels). a purpose taxonomy with no labels is unreviewable
- what counts as an outcome: JS-bloat papers tie to load time or storage;
    privacy papers tie to leaks or breakage; "what does the web's JS do" has
    no outcome unless you add one
- archive replay: old JS in a new browser mis-counts requests (WebREC); CSR
    pages replay stale JSON (Weigle 2023); Wayback misses third-party requests
    (Lerner 2016)
- sampling: Top N over-estimates (Zhang 2026); Tranco subdomains include CDN
    hosts (JSphere found only "555 subdomains with at least one execution
    context" out of 1000)
- moving target: tracking moves server-side (PETS 2024), fingerprinting moves
    into wasm (2025), consent banners gate scripts (Jha 2022 in
    `web_crawling.md`)

## Research ideas

I checked each against the papers above. Confidence is my own estimate that
the gap is real.

### 1. Crawler vs real users for API usage, feature by feature (confidence: high)

- question: for each browser API, how far off is a crawler's usage estimate
    from what real users trigger?
- why open: Chrome use counters give real-user, per-feature, per-page-load
    numbers publicly; HTTP Archive gives static grep counts on the same
    CrUX-ranked pages; nobody has lined the two up (Beugin 2026 did it for
    Privacy Sandbox APIs only; Beyond the Crawl did it for fingerprinting
    sites only, with 30 users)
- build: a VV8 crawl of CrUX top-100k landing plus internal pages; join each
    feature's crawl prevalence with its chromestatus time series and with the
    HTTP Archive custom-metric count. report three-way disagreement per API
    and explain it (interaction-gated, login-gated, bot-gated, minified away)
- data: chromestatus.com metrics (public), HTTP Archive BigQuery, VV8
- risk: use counters are per page load and per Chrome population, crawls are
    per page; you need a careful normalization and some features are counted
    differently. mitigation: restrict to features with IDL `[Measure]` and
    clear one-to-one semantics

### 2. Function-level attribution without rewriting: a reusable layer on VV8 (confidence: medium-high)

- question: can we attribute every browser API call to the npm package,
    module, and function that made it, for the whole top-100k, cheaply?
- why open: VV8 already logs "the character offset within the script"; NoT.js
    and ByteDefender do function-level work but for one label and are not
    released as a general attribution layer; Aletheia (2025) dissects bundles
    into packages but does not join with runtime logs. the JSphere eval trick
    was a workaround for exactly this
- build: parse each script to an AST, map VV8 offsets to enclosing function
    and bundle module boundaries, label modules with Aletheia-style package
    detection, then redo JSphere's sphere counts and the "silent" share per
    package. also measure how much of the 49% silent code is library code that
    the page never reaches
- data: VV8, HTTP Archive response bodies (they store JS), npm
- risk: mostly engineering; the paper needs an outcome. candidates: bytes
    per package that are never executed by any real interaction (dead weight
    per vendor), or which packages cause tracking calls
- how this fixes JSphere: a reviewer can check a per-package number against
    the package's documented purpose; that is the missing ground truth

### 3. Longitudinal "what does JS do" over 15 years (confidence: medium)

- question: how did the mix of what JS does (DOM building, tracking,
    fingerprinting, crypto, media, wasm) change from 2010 to 2026?
- why open: FP-Radar did a decade of API usage but only to find
    fingerprinting; Lerner 2016 did tracking to 2016; Agarwal 2022 did MIME
    types only; Jawa reports JS bytes 20% to 44% but not what the bytes do
- build: replay Wayback / HTTP Archive snapshots of the same sites in
    version-matched browsers (WebREC-style) with VV8, classify calls by API
    family (not by hand-made spheres), and track shares over years; validate
    replay fidelity against the Right-HTML-Wrong-JSON failure mode
- data: Wayback CDX, HTTP Archive (since 2010), old Chromium builds
- risk: replay fidelity for client-side-rendered pages, and old VV8 patches
    only exist for Chrome 63 onward. mitigation: restrict to pages whose
    replayed request set matches the archive's recorded set

### 4. Who ships the dead code, and does it ever run for real users (confidence: medium)

- question: of the 60-70% unused JS, which vendors, libraries, and bundler
    choices account for it, and how much does a real user eventually execute
    over a session?
- why open: Muzeel, Lacuna, Goel-Steiner measure how much; Goel-Steiner used
    RUM but could not use the Coverage API ("not exposed to JS"); Aletheia
    identifies packages but not usage; no study crosses the two
- build: a browser extension (or Chrome's precise coverage via DevTools in a
    user study) that records function coverage over real sessions, joined with
    package attribution from idea 2
- risk: user study size; privacy of recorded coverage (store only hashes of
    function ids)

### 5. JS of AI-built websites (confidence: medium, ties to DeGenTWeb)

- question: do LLM-dominant sites (DeGenTWeb) ship different JS: more
    boilerplate frameworks, more or fewer trackers, more dead code, more
    identical bundles across sites?
- why open: DeGenTWeb and Dolezal 2026 classify text; nobody looked at the
    code side. if AI site builders emit near-identical bundles, script hashes
    become a cheap provenance signal for LLM-dominant sites, complementary to
    text detectors that "perform much worse than advertised"
- build: VV8 crawl of DeGenTWeb-labeled sites vs matched human sites; compare
    API-family profiles, bundle hashes, library versions, tracker presence
- risk: confounded by site builder (WordPress vs Next.js) rather than by AI;
    control for builder with Wappalyzer labels

### 6. Script-level web atoms: which scripts change together (confidence: medium, ties to `web_atoms.md`)

- question: can we find groups of scripts (across sites) that change together,
    so a crawler re-fetches one and infers the rest, and so archives dedup?
- why open: the human's web atoms idea is about URLs; Jawa dedups JS for
    storage; nobody measured co-change of scripts across the top-100k over
    time. HTTP Archive has monthly bodies, so the data exists
- build: per-month script hashes from HTTP Archive, build co-change graph
    (same vendor script updated on many sites same month), then measure how
    much recrawl you save and whether behavior (API-family profile) changed
    when bytes changed
- risk: cache-busting query strings and per-site bundling hide shared
    modules; needs idea 2's module splitting

### 7. Behavior churn vs byte churn (confidence: medium)

- question: when a script's bytes change, how often does its behavior (API
    calls, requests) change? how often does behavior change without bytes
    changing (server-driven config, remote tags)?
- why open: tag managers and server-side tagging (GTM 52% of top 1M; PETS
    2024) decouple behavior from the script file; no measurement of this
    decoupling
- build: weekly VV8 crawls of a fixed set; diff bytes and diff API-call
    profiles per script
- risk: nondeterminism (A/B tests, ads) looks like churn; need repeated loads
    per week to estimate noise

### 8. Which browser APIs could be removed, 2026 edition (confidence: medium-high that it is undone, medium that it is publishable)

- question: redo Snyder 2016/2017 with today's web and real-user counters:
    which of the ~hundreds of APIs added since 2016 are used, by whom, and
    what breaks if blocked
- why open: Snyder is Firefox 2016 with random clicks; Chrome use counters
    now exist publicly; Brave ships per-API blocking so breakage can be
    measured behaviorally instead of by hand
- build: VV8 crawl with per-API blocking and an automatic breakage metric
    (DOM diff, console errors, failed user flows), cross-checked with use
    counters
- risk: the reviewer asks "so what"; the answer is a concrete block list
    with measured breakage, which browser vendors can use

### 9. What wasm does on live pages (confidence: medium)

- question: beyond counts, what do wasm modules on the top-100k do, reached
    through which JS imports and browser APIs, and is JS-to-wasm obfuscation
    of fingerprinting appearing in the wild?
- why open: Hilbig 2021 and Web Almanac 2022 count and classify binaries
    statically; To-WASM-or-not 2025 is a lab attack; no live measurement of
    wasm behavior through its imports
- build: VV8 sees every call from wasm glue code into the browser; group
    calls by the wasm module that owns the glue
- risk: small population (a few thousand modules), most from a handful of
    libraries, so findings may be about three vendors

### 10. LLM-labeled script purposes with behavioral validation (confidence: low-medium)

- question: can an LLM, given a script's source plus its VV8 call trace,
    produce purpose labels that agree with external ground truth (filter
    lists, phishing kits, library docs), and then scale to a taxonomy of
    everything else?
- why open: CASCADE and JsDeObsBench use LLMs on JS for deobfuscation only;
    Nahapetyan 2025 clusters by API sets for phishing only; no general
    purpose-labeling with validation
- build: label a few thousand (script, trace) pairs with an LLM, validate on
    the subsets that have labels, then apply to the rest and report agreement
    bands
- risk: this is JSphere's original problem; the only thing that makes it
    reviewable is the validated subset. cost of running an LLM over 100k
    scripts is real but manageable with traces truncated to API-family counts

## Gaps I could not cover

- I could not run general web search this session, so anything not on
    arXiv, PETS, NDSS, USENIX, or an author site with a guessable URL is
    missing: Nikiforakis CCS 2012 "You Are What You Include", Kumar WWW 2017
    "tangled web", Musch DIMVA 2019 wasm prevalence, Demir WWW 2022
    reproducibility, CrawlPhish, SugarCoat, Wobfuscator, IEEE/ACM-only 2024-26
    papers, and IMC 2024-2025 proceedings in general
- Firefox telemetry use counters and MDN compat data as datasets: not checked
- ChatGPT opinion: not obtained (tool failed three times)
