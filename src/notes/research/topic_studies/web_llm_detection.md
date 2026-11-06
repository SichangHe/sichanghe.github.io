# 🤖 Web measurement and LLM detection

(authored by agents unless marked 🧑)

- scope: LLM text detection, AI-content provenance, web infrastructure, user-facing web measurement
- no experiment was run; all items are literature reads, mostly of abstracts, as of Oct 2026
- recommendations are agent opinions, novelty unchecked

## How text detectors work

- every detector makes one score and applies a cutoff; the cutoff and its false positive rate (FPR) matter more than accuracy or AUROC
- basis: models write expected words more often than people do (low perplexity)
- polarity inversion: modern LLM output can have lower perplexity than human text, fixable by correction ([Detecting the Machine](https://arxiv.org/abs/2603.17522), 2026)
- four families: zero-shot scores (perplexity, DetectGPT, Fast-DetectGPT, Binoculars), trained classifiers (RoBERTa detector, Ghostbuster, Pangram), rewrite-and-compare (RAIDAR, DNA-GPT), watermarks
- when AI pages are rare, a 1% FPR makes about half the flags wrong
- old detectors were biased against non-native writers: 61.22% average FPR on TOEFL essays (Liang et al., [arXiv 2304.02819](https://arxiv.org/abs/2304.02819)); GPTZero now claims 1.1%, Pangram 0%, both vendor claims

## Zero-shot and trained detectors

- DetectGPT ([arXiv 2301.11305](https://arxiv.org/abs/2301.11305)): 0.81 to 0.95 AUROC on GPT-NeoX fake news, but 100 T5 rewrites per passage; Fast-DetectGPT paper times the full benchmark at about 22 hours
- GLTR ([arXiv 1906.04043](https://arxiv.org/abs/1906.04043)): coloring words by rank lifted human accuracy from 54% to 72%, on GPT-2 text only
- Ghostbuster ([arXiv 2305.15047](https://arxiv.org/abs/2305.15047)): 99.0 F1 across domains; unreliable at 100 tokens or fewer
- supervised detectors "do not generalize to other text domains, generation models, and even sampling strategies" (Tulchinskii et al., [arXiv 2306.04723](https://arxiv.org/abs/2306.04723))
- Pangram ([arXiv 2402.14873](https://arxiv.org/abs/2402.14873)): hard negative mining with synthetic mirrors; claims 38 times lower error, on the company's own benchmark
- newer zero-shot variants (DivEye, late-stage stability, Lastde) report gains only in AUROC or "up to" numbers; none gives FPR on real pages

## Commercial detectors

- all are trained neural classifiers with secret data; vendor numbers are not comparable
- Jabarian and Imas (NBER, [w34223](https://www.nber.org/papers/w34223)), the main independent test: Pangram had about zero errors on normal-length text; Originality and GPTZero were worse on short text and humanizers; open-source RoBERTa flagged most human text
- GPTZero missed about half of humanized text; in GPTZero's own paper the ranking flips (GPTZero 93.5%, Pangram 49.7%)
- short text is weak for everyone: Pangram needs 50 words, Copyleaks 350 characters
- Pangram 4 (Jul 2026): 512-token windows, stride 256; "does not handle people who write like an LLM"
- Pangram API costs $0.05 per 100 words; Turnitin says its FPR "is not zero"

## Attacks

- paraphrasing is the main attack; DIPPER drops DetectGPT from 70.3% to 4.6% detection at 1% FPR; retrieval over the provider's outputs is the defense that works ([arXiv 2303.13408](https://arxiv.org/abs/2303.13408))
- recursive paraphrasing also beats watermarks, and watermarks can be spoofed ([arXiv 2303.11156](https://arxiv.org/abs/2303.11156)); theory: better LLMs make detection harder
- RL against a detector: RoBERTa-Large AUROC 0.84 to 0.63 with perplexity nearly unchanged ([ICLR 2024](https://proceedings.iclr.cc/paper_files/paper/2024/hash/1f9f07df0992ce21698d800eaa891bd8-Abstract-Conference.html))
- adversarial paraphrasing ([arXiv 2506.07001](https://arxiv.org/abs/2506.07001)): average 87.88% drop in true positive rate at 1% FPR over many detectors, 98.96% on Fast-DetectGPT
- CoPA needs only an open model and no detector access; TempParaphraser shows higher sampling temperature hurts detectors
- Hitting a Moving Target ([arXiv 2606.25152](https://arxiv.org/abs/2606.25152)): Pangram detects 24.1% of adversarial AI text; names three shifts: humanization, new LLMs, drift in human writing
- ARB ([arXiv 2607.29539](https://arxiv.org/abs/2607.29539)): Binoculars caught 93.5% of direct LLM text but 15.1% of human text rewritten by an LLM, at 1% FPR
- most web pages are not attacked, so these are worst cases, but humanizers are sold publicly

## Benchmarks

- scores say little about your pages: pick the threshold on human pages from your own sites
- three checks: FPR and threshold, threshold tuned on the test set or not, test text like yours
- MAGE ([arXiv 2305.13242](https://arxiv.org/abs/2305.13242)): best detector finds 86.54% of out-of-domain text from a new LLM
- M4 ([arXiv 2305.14902](https://arxiv.org/abs/2305.14902)): shifted detectors tend to call machine text human, the error that undercounts AI pages
- RAID ([arXiv 2405.07940](https://arxiv.org/abs/2405.07940)): vendors claim 99% but few were tested on shared data; few detectors work at FPR below 1%; Binoculars is best at low FPR; attacks and repetition penalties still hurt it
- MULTITuDE: check non-English training data; SemEval-2024 Task 8: best systems were fine-tuned LLMs, strong in-domain only

## Short, mixed text and code

- short text carries less signal; detectors trained on the same platform do fine (MultiSocial, [arXiv 2406.12549](https://arxiv.org/abs/2406.12549)), general ones do not
- uncensored models write less detectable tweets (Tuck et al.)
- pooling many posts per source helps, same idea as pooling pages per site
- review detectors generalize poorly across products and LLMs; single peer-review detection is hard, group counts are easier ([arXiv 2502.19614](https://arxiv.org/abs/2502.19614))
- light AI polish is flagged by many detectors (APT-Eval); decide beforehand whether it counts as AI
- code is full of forced tokens; use code-trained detectors

## People as detectors

- ordinary readers are near a coin flip (47% to 60%); they overrate typos, first-person stories and plain words
- AI text is often rated more human than human text; with a persona prompt GPT-4.5 fooled readers 73% of the time vs 36% without (Jones)
- exceptions: five frequent ChatGPT users, majority vote wrong on 1 of 300 articles (Russell); expert pairwise judging 87.6% (Wang)
- helps: heavy LLM use, feedback after each guess (55.4% to 65.1% on GPT-4o text), side-by-side text
- does not help: money, short instructions, subject expertise
- label bias: raters preferred text labeled "Human Generated" even when swapped (Zhu)
- no study of ordinary readers against 2026 models

## Detectors on web pages

- 🧑 DeGenTWeb, the human's pipeline: filter non-articles and repeated text; score 15 to 20 pages with Binoculars; deciles into a linear SVM; 98.8% to 99.8% balanced accuracy on 132 sites
- 🧑 known weak spots: forum pages, newer models, untested humanizers, AI baselines mostly from a few site builders
- Dolezal et al. ([arXiv 2604.26965](https://arxiv.org/abs/2604.26965)): wrapping the same GPT-4o text in HTML moved Binoculars from 100% to 88.6% flagged; Pangram barely changed
- Pew methodology ([link](https://www.pewresearch.org/data-labs/2026/08/20/methodology-ai-content/)): threshold 0.2 was tuned to agree with another Pangram model, not with known authorship
- neither checks whether the extractor changes the verdict
- Wikipedia, Brooks et al. ([arXiv 2410.08044](https://arxiv.org/abs/2410.08044)): over 5% of new English articles flagged at a 1% FPR threshold, assuming human style did not drift
- Liang et al. ([arXiv 2403.07183](https://arxiv.org/abs/2403.07183)): estimating the AI share of a pile from word frequencies, not single texts; 6.5% to 16.9% of some conference reviews; works on uniform piles only

## Browser extensions

- extensions are thin skins over server-side detectors; listings declare "website content" as collected data; no network audit of them exists
- GPTZero: 500,000 Chrome users, claims 99% accuracy; Pangram auto-scans X, LinkedIn, Substack, Medium
- only local model with a number: Deckard, about 2% false positives, author says "way, way worse than Pangram"
- price: about 7 to 9 cents per 1000 words
- labels lower trust in text whether true or false (Altay and Gilardi) but barely change actions
- implied truth effect: unlabeled content gets a free pass (Pennycook 2020)
- uBlockOrigin HUGE AI list: 1000+ hand-picked sites, no accuracy check

## Research proposals for detection

- ranking after the ChatGPT consultation: site robustness, extension audit, known-human pages, people judging sites, crowd list (candidate source only)
- site robustness: how many of a site's pages must be rewritten to flip its verdict; pooling helps only if page errors are independent, and a new model or humanizer shifts all pages together
- extension audit: plant canary strings, record what leaves the browser; prior art Arcanum and Vekaria et al. covers other extensions
- DeGenTWeb's 99% rests on 67 positives and 65 negatives: one error moves balanced accuracy about 0.75 points
- other ideas: sites switching to AI, a crawler that stops when sure, detector drift

## Text watermarking

- mechanism: a secret key biases or fixes each token choice; the detector recomputes and tests; needs a few hundred tokens
- KGW green lists ([arXiv 2301.10226](https://arxiv.org/abs/2301.10226)): changes word odds slightly; keyed-dice and distortion-free schemes keep the model's odds
- Kuditipudi et al.: detects from 35 tokens after 40-50% edits, but only about 25% of instruction answers (median 100 tokens)
- shipped because of EU AI Act Article 50 (from 2 Aug 2026): Gemini since 2024, Claude since Aug 2026, ChatGPT in the EU announced 5 Oct 2026
- OpenAI numbers: swapping 10% of words drops detection from about 92% to 66%, 25% to 17%
- forging is possible for under $50 against older schemes
- detectors are private preview; no one has counted watermarked text on the web

## Image watermarking

- Google says SynthID-Image marked over ten billion images and frames ([arXiv 2510.09263](https://arxiv.org/abs/2510.09263)); best post-hoc schemes keep about 99% detection at 0.1% FPR under crops, JPEG, filters
- every public scheme falls to diffusion re-generation, stacking a second watermark, or a few hundred detector queries; semantic marks can be copied onto real photos
- Google: "training a perfectly robust and secure watermarking scheme may be infeasible"
- schemes: post-hoc encoders (TrustMark, InvisMark 256 bits at PSNR 51, Watermark Anything, Pixel Seal), decoder fine-tuning (Stable Signature), initial-noise marks (Tree-Ring)
- closed detectors; no in-the-wild study of invisible marks exists

## C2PA and camera provenance

- C2PA ships on Pixel 10 (Sep 2025), OpenAI and Google generators, Cloudflare; 238 conformant products, 212 signers, 11 at hardware level 2
- first independent analysis (Golaszewski, Krawetz, Sherman et al., 2026): spec fails its own two security claims; spec 2.4 "does not address any of our concerns"
- Nikon Z6 III signed an AI image; certificates revoked, validators still said "valid" six months later
- rooted Pixel 10 Pro signed a ChatGPT image as level 2 capture; Google closed it "Won't Fix"
- spec 2.0 dropped identity and training assertions; 2.4 added an AI Disclosure assertion; version history in the [2.4 spec](https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html)
- no one measured how much of the web carries C2PA; platforms strip it (Rijsbosch et al. 2026)
- user studies: labels raise stated trust but are misread; 44% read it as how trustworthy the article is (Forstner 2025, N=202)
- signature test, capture test and context test are distinct; a signed photo can be a photographed screen
- Sony camera claims depth checks of 3D subjects: vendor claim ([link](https://authenticity.sony.net/camera/en-us/))
- zero-knowledge edit proofs all assume trusted capture:
  - PhotoProof ([IEEE S&P 2016](https://doi.org/10.1109/SP.2016.23)): conceptual baseline, too slow
  - Trust Nobody ([eprint 2024/1074](https://eprint.iacr.org/2024/1074)): about 18 s per 2,666-pixel tile, 4.2 GB proving memory
  - VerITAS ([eprint 2024/1066](https://eprint.iacr.org/2024/1066)): 90 MB image under an hour, about 2 s browser verification; needs a new signing method
  - VIMz ([eprint 2024/1063](https://eprint.iacr.org/2024/1063)): resize proof 187 s, crop 914.5 s
  - runtimes are not comparable

## Labeling rules

- in force: China 1 Sep 2025, South Korea 22 Jan 2026, India 20 Feb 2026, EU and California 2 Aug 2026 (EU marking grace until 2 Dec 2026, California platform duties 1 Jan 2027)
- EU Art. 50(2) requires machine-readable marking; text disclosure applies only to public-interest text with no human editorial control, an exception likely to swallow the rule
- audit (Sep 2026): platforms labeled 61% of uploads carrying standard marks and 33% of expert-picked deepfakes
- labels lower belief in true labeled content and make unlabeled content look real; honest disclosers are trusted less
- text is the weak spot; one study found 5 of 100 newspapers disclosed AI text

## Generated web: how much, and effects

- Pew ([report](https://www.pewresearch.org/data-labs/2026/08/20/how-much-of-the-internet-is-written-with-ai/)): 10% of 490,000 Common Crawl pages show significant AI authorship; 35% of post-ChatGPT dated pages in July 2026; open and paid Pangram agree 96%, kappa 0.61
- Dolezal et al.: up to 35% of new sites per month in H1 2025 were AI or AI-assisted; one URL per host
- Russell et al. ([arXiv 2609.40295](https://arxiv.org/abs/2609.40295)): 27.5% of June 2026 tokens labeled AI, 31.1% in August, after FineWeb filtering; Pangram's founders coauthor
- Graphite ([report](https://graphite.io/five-percent/more-articles-are-now-created-by-ai-than-humans)): more articles AI than human, via Surfer detector with 4.2% FPR
- units (pages, sites, tokens) differ, so the numbers are not comparable
- model collapse: every harm result comes from lab loops
  - [Go MAD](https://arxiv.org/abs/2307.01850): without fresh real data, quality or diversity decreases
  - [Strong Model Collapse](https://arxiv.org/abs/2410.04840): 1% synthetic data can stop scale from helping
  - [Is Model Collapse Inevitable?](https://arxiv.org/abs/2404.01413): accumulating real and synthetic data avoids collapse
  - [Demystifying Synthetic Data](https://arxiv.org/abs/2510.01631): rephrased data shows no degradation; pure generated textbook-style data collapses
  - [Position paper](https://arxiv.org/abs/2503.03150): eight conflicting definitions of collapse
- no deployed-model study isolates harm from generated web text

## Crawling and AI-era crawlers

- every crawl choice shifts results by tens of percent: site list, home vs internal pages, client, address, consent and login state, chance
- IRLbot: 6.3 billion pages on one server, no JavaScript ([paper](http://irl.cs.tamu.edu/people/hsin-tsang/papers/www2008.pdf))
- OpenWPM is Firefox plus Selenium and detectable; Browsertrix and Brozzler use real browsers
- robots.txt is not access authorization (RFC 9309); it cannot say what content may be used for or verify crawler identity
- counting rules per crawler name and content actually reachable give different answers (Kolay et al. contradicted Sun et al.)
- crawler traffic numbers come mostly from bot-control vendors; best public compliance data is one university's logs for 40 days
- proof of work, junk mazes and HTTP 402 pricing have no measurement paper
- proposed first experiment: fetch the same URLs with browser, plain HTTP and claimed crawler identities; repeat to separate normal change from client-specific responses

## JavaScript and browser APIs

- three ways to record API calls: patch the engine (VisibleV8, JSgraph, PageGraph, FV8), wrap APIs in page JS (detectable), read source (cheap, blind to minified or dynamic code)
- Muzeel: 70% of JavaScript functions on the median page are unused
- 🧑 JSphere ([repo](https://github.com/SichangHe/JSphere)): classified scripts into "spheres" using VisibleV8 logs on Tranco top 1000; 49% of code invokes no API calls; paused for "limited value"
- agent read of the stall: no ground truth and no link to an outcome; VisibleV8 access-site offsets may give function-level attribution without the eval rewrite, unchecked

## Web archives

- archives are assumed complete, faithful, unbiased and unaltered; each assumption fails measurably
- 2024 to 2026: publishers block archive crawlers; Instagram, X, Reddit nearly unarchivable; Wikipedia dropped archive.today after it altered captures
- Memento (RFC 7089) gives datetime negotiation and TimeMaps
- Heritrix is 12.15 times faster than PhantomJS but finds 1.75 times fewer URIs (Brunelle et al.); a two-tier crawl sends only JavaScript-dependent pages to a browser
- reformatting WARC to Parquet or Avro gives one to two orders of magnitude speedup (Wang and Xie)

## Web change and web atoms

- stable for 25 years: few pages churn daily, most sit still; 50 days for half the web to change, 11 days for .com, almost 4 months for .gov (Cho and Garcia-Molina 2000)
- Fetterly et al. 2003: 56% of pages never changed over 11 weeks, 4% changed every time
- uniform revisiting beats proportional revisiting under binary freshness
- 🧑 web atom idea: URLs that change together, probed as a group
- closest work uses related pages only as a hint for one page's rate (Cho and Ntoulas 2002, Tan and Mitra 2010, Radinsky and Bennett 2013)
- CDN surrogate keys do the group invalidation but only when the origin declares groups
- BGP atoms carry a protocol reason; web groups must be learned and will leak

## Search quality and SEO

- Is Google Getting Worse? ([ECIR 2024](https://downloads.webis.de/publications/papers/bevendorff_2024a.pdf)): product-review search only; affiliate content is far more frequent than in the baseline; updates reduce spam temporarily; "Google results seem to have improved to some extent"
- TrustRank: seed set of 178 sites; trust is host-level, not claim-level
- content-analysis spam detection: 86.2% of 2,037 spam pages in a 17,168-page set; historical tactics
- Google's spam policy: scaled content abuse counts "no matter how it's created"
- 2026 papers overlap earlier proposals:
  - CrediBench ([arXiv 2509.23340](https://arxiv.org/abs/2509.23340)): domain accuracy 56% to 85%
  - CiteShade ([arXiv 2609.15660](https://arxiv.org/abs/2609.15660)): wrong-answer rate 0.01 to 0.68 with citation laundering
  - Relevant Is Not Warranted ([arXiv 2605.28044](https://arxiv.org/abs/2605.28044)): judges fail strict ordering in 47.2% of cases, 24.5% with a claim-strength prompt
  - SIREN ([arXiv 2607.21951](https://arxiv.org/abs/2607.21951)): controlled preference manipulation
- generic duplicate-evidence and citation-manipulation work is withdrawn as novel
- remaining proposal: 50 versioned technical questions in live search, labeling wrong versions and overstated guarantees

## Phishing and scams

- Oest et al.: average campaign takes 21 hours; ecosystem detection came 9 hours after the first victim ([USENIX Sec 2020](https://www.usenix.org/conference/usenixsecurity20/presentation/oest-sunrise))
- PhishTime: behavior-dependent JavaScript prevented detection in tested deployments
- PhishPrint: 18 of 20 evasive pages stayed unblocked; crawlers can be profiled
- Dutch kits: median domain uptime 24 hours; 70 kits in 10 families
- Phishpedia: 1,704 phishing sites, 1,133 not in VirusTotal at check time
- methods: keep the whole path, sample beyond blacklists, split by campaign and kit, report at deployment prevalence
- proposals: paired ordinary-vs-scanner visits, tenant-level identity on shared hosts, independent evidence in search-backed scam verification

## Ads

- AdGraph: 95.33% accuracy against filter labels; PERCIVAL: 96.76%; both measure agreement with filters, not ad recall
- AdVersarial: attacks beat seven perceptual detectors
- Bad News ([ConPro 2020](https://www.franziroesner.com/pdf/zeng-ads-conpro20.pdf)): 81,870 detected slots, 55,045 visible; many were empty or occluded
- children's sites ([arXiv 2308.04887](https://arxiv.org/abs/2308.04887)): about 90% of 2,004 sites have trackers; 73% of ads with readable disclosure indicate targeting
- ad insertion and pricing in LLM answers already has work ([2601.19435](https://arxiv.org/abs/2601.19435), [2607.27686](https://arxiv.org/abs/2607.27686)); the evaluator score is "an ordinal surrogate for engagement"
- proposals:
  - lost disclosures: 100 pages, 200 labeled commercial passages; measure claims retained and still linked to their disclosure
  - filter-based measurement miss rate: 200 visits across 50 publishers, fully hand-labeled

## Third-party dependencies

- Kashaf et al. ([IMC 2020](https://aqsakashaf.github.io/assets/files/Webdep.pdf)): indirect dependencies amplify CDN and DNS impact "by up to 25X"; modeled, not browser-tested
- Kumar et al. ([arXiv 2111.12253](https://arxiv.org/pdf/2111.12253)): dependencies vary by country across 50 vantage points
- JS inclusions (CCS 2012): remote inclusions outlast safe provider ownership
- Sarker et al.: 95.90% of visited domains have a script with concealed runtime API use; not a maliciousness rate
- selective blocking already exists:
  - Amjad et al. ([arXiv 2302.01182](https://arxiv.org/abs/2302.01182)): 14.6% of scripts mix tracking and function; method blocking cuts major breakage 3.8 times
  - ByteDefender ([arXiv 2509.09950](https://arxiv.org/abs/2509.09950)): 98.9% accuracy, 158.74 ms added latency
  - PURL ([arXiv 2308.03417](https://arxiv.org/abs/2308.03417)): 98.74% accuracy, only 18.76% of decorations labeled
- proposal: 30 pages with annotated evidence; block each provider in turn; measure evidence retained and answer accuracy

## Cross-cutting rules

- measurement: separate site, visit, ad, claim and user denominators; sample by the claimed outcome
- keep first observation, confirmed content, report and removal times separate
- try simple baselines before complex classifiers
- consultation advice from ChatGPT is opinion, not evidence

## Garbage

- TURINGBENCH
- GPT-2 output detector README
- log-likelihood, rank and log-rank baselines
- Lastde
- TDT (temporal tomography)
- DWT-Fusion
- SV-Detect
- PAWN
- Amplifying, Not Learning
- Where is the Watermark
- Stable Signature follow-ups
- TweepFake
- Mitrovic review detector
- ProtoFewRoBERTa
- CodeX
- ScholaWrite
- NewsGuard and Pangram content-farm list
- SkipSlop
- Gemma-270M extension
- Naive Bayes extension
- Fakespot Deepfake Detector
- Heritrix
- ArchiveBox
- Tracker Radar Collector
- Sun et al. 2007 robots.txt bias
- Africa dependency study
- Web Dependency Analyzer
- Ikram 2016 dependency study
- FEVEROUS
- TruthfulQA
- FreshLLMs
- Joachims clickthrough study
- Zobel batch assessment
- Kurland and Tennenholtz competitive search
