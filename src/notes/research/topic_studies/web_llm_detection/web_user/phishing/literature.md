phishing, scams, and spam: literature
(authored by agents unless marked 🧑)

reading guide
- facts below summarize the cited papers
- limitations and research implications are agent analysis
- primary PDFs were read directly
- discovery covered USENIX Security 2020–2026 and relevant papers already in the collection
- coverage is substantial but not exhaustive
- current service behavior was not retested

Sunrise to Sunset: Analyzing the End-to-end Life Cycle and Effectiveness of Phishing Attacks at Scale
- Adam Oest, Penghui Zhang, Brad Wardman et al, USENIX Security 2020
- [Sunrise to Sunset: Analyzing the End-to-end Life Cycle and Effectiveness of Phishing Attacks at Scale](https://www.usenix.org/conference/usenixsecurity20/presentation/oest-sunrise) · [PDF](https://www.usenix.org/system/files/sec20-oest-sunrise.pdf)
- authors’ words, abstract
  - “We find the average campaign from start to the last victim takes just 21 hours”
- problem
  - connect deployment, lure delivery, browser warnings, visits, and eventual account fraud
- method
  - passive requests from phishing pages to resources of an impersonated financial brand; 404,628 URLs; one year; 4.8 million visitor records
- reported finding
  - the average delay to ecosystem detection was nine hours after the first victim; another seven hours elapsed to peak browser mitigation
- limits, agent analysis
  - one financial brand and pages that fetch its resources; visibility covered 39.1% of known hostnames targeting that brand; the visit population differs from all users exposed to lures
- research implication, agent inference
  - fast collection matters more than a large daily snapshot; access to brand telemetry is needed to reproduce victim-level conclusions

PhishTime: Continuous Longitudinal Measurement of the Effectiveness of Anti-phishing Blacklists
- Adam Oest, Yeganeh Safaei, Penghui Zhang et al, USENIX Security 2020
- [PhishTime: Continuous Longitudinal Measurement of the Effectiveness of Anti-phishing Blacklists](https://www.usenix.org/conference/usenixsecurity20/presentation/oest-phishtime) · [PDF](https://www.usenix.org/system/files/sec20-oest-phishtime.pdf)
- authors’ words, abstract
  - “2,862 new (innocuous) phishing websites”
- problem
  - measure defenses repeatedly under controlled conditions
- method
  - six experimental deployments over nine months; replicated evasion behaviors; report controlled pages and measure speed, coverage, and consistency
- reported finding
  - behavior-dependent JavaScript could prevent detection in the tested deployments
- limits, agent analysis
  - controlled pages and reporting are interventions; test behavior can differ from criminal sites and natural discovery
- research implication, agent inference
  - separate spontaneous discovery from a response to a researcher report; repeat experiments over time

PhishPrint: Evading Phishing Detection Crawlers by Prior Profiling
- Bhupendra Acharya, Phani Vadrevu, USENIX Security 2021
- [PhishPrint: Evading Phishing Detection Crawlers by Prior Profiling](https://www.usenix.org/conference/usenixsecurity21/presentation/acharya) · [PDF](https://www.usenix.org/system/files/sec21-acharya.pdf)
- authors’ words, abstract
  - “uses web pages with benign content to profile security crawlers”
- problem
  - measure whether scanners reveal stable properties that sites can recognize
- method
  - 23 security crawlers; 70 days; browser fingerprinting tests; controlled evasive-page validation
- reported finding
  - 18 of 20 controlled evasive pages remained unblocked during the tested observation period
- limits, agent analysis
  - the paper says “survive indefinitely”; interpret this as the observed experiment, not a proof of permanent evasion; service behavior may have changed since 2021
- research implication, agent inference
  - crawler realism and diversity are experimental variables; a benign probe can establish visibility without collecting credentials

Catching Phishers By Their Bait: Investigating the Dutch Phishing Landscape through Phishing Kit Detection
- Hugo Bijmans, Tim Booij, Anneke Schwedersky et al, USENIX Security 2021
- [Catching Phishers By Their Bait: Investigating the Dutch Phishing Landscape through Phishing Kit Detection](https://www.usenix.org/conference/usenixsecurity21/presentation/bijmans) · [PDF](https://www.usenix.org/system/files/sec21-bijmans.pdf)
- authors’ words, abstract
  - “median uptime of phishing domains to be just 24 hours”
- problem
  - find related campaigns through reusable phishing software
- method
  - 70 Dutch phishing kits grouped into 10 families; certificate-based candidate discovery; 1,363 detected financial phishing domains; September 2020–January 2021
- reported finding
  - a small kit set served many domains; deployment and takedown were rapid
- limits, agent analysis
  - Dutch financial targets and known-kit fingerprints; newly written or heavily changed kits are less visible
- research implication, agent inference
  - split evaluation by kit family and campaign; a domain split alone can preserve template leakage

Phishpedia: A Hybrid Deep Learning Based Approach to Visually Identify Phishing Webpages
- Yun Lin, Ruofan Liu, Dinil Mon Divakaran et al, USENIX Security 2021
- [Phishpedia: A Hybrid Deep Learning Based Approach to Visually Identify Phishing Webpages](https://www.usenix.org/conference/usenixsecurity21/presentation/lin) · [PDF](https://www.usenix.org/system/files/sec21-lin.pdf)
- authors’ words, abstract
  - “Phishpedia does not require training on any phishing samples”
- problem
  - identify an impersonated brand from logos and compare it with the site domain
- method
  - logo detection and brand matching; reference brands; certificate-stream deployment for 30 days
- reported finding
  - 1,704 discovered phishing websites; 1,133 not reported by VirusTotal at the checked time
- limits, agent analysis
  - reference coverage and correct brand-domain mapping remain necessary; absence in VirusTotal does not establish the exact first-ever appearance
- research implication, agent inference
  - a clear visual explanation is useful; audit identity references separately from model accuracy

Inferring Phishing Intention via Webpage Appearance and Dynamics: A Deep Vision Based Approach
- Ruofan Liu, Yun Lin, Xianglin Yang et al, USENIX Security 2022
- [Inferring Phishing Intention via Webpage Appearance and Dynamics: A Deep Vision Based Approach](https://www.usenix.org/conference/usenixsecurity22/presentation/liu-ruofan) · [PDF](https://www.usenix.org/system/files/sec22-liu-ruofan.pdf)
- authors’ words, abstract
  - “interacting with the webpage to confirm the credential-taking intention”
- problem
  - distinguish ordinary brand mentions from pages that ask for credentials
- method
  - PhishIntention combines brand recognition, form recognition, and page interaction; 50K-page comparison; two-month field study
- reported finding
  - 1,942 detected phishing pages; 139 false alerts versus 1,033 for its best compared baseline at similar detected volume
- limits, agent analysis
  - interaction paths and predefined brands bound coverage; the paper’s comparison is not a prevalence-weighted production evaluation
- research implication, agent inference
  - a static screenshot can miss a later login form; archive page transitions and the reason for each interaction

Knowledge Expansion and Counterfactual Interaction for Reference-Based Phishing Detection
- Ruofan Liu, Yun Lin, Yifan Zhang et al, USENIX Security 2023
- [Knowledge Expansion and Counterfactual Interaction for Reference-Based Phishing Detection](https://www.usenix.org/conference/usenixsecurity23/presentation/liu-ruofan) · [PDF](https://www.usenix.org/system/files/usenixsecurity23-liu-ruofan.pdf)
- authors’ words, abstract
  - “actively expands a dynamic reference list”
- problem
  - reduce missed attacks against brands absent from a fixed list
- method
  - DynaPhish validates new brand references and uses counterfactual interaction; 6,344 interactable phishing pages
- reported finding
  - recall increased from 40.98% to 68.63%, about 28 percentage points with little precision loss in its experimental comparison
- limits, agent analysis
  - interactable pages are a selected population; legitimacy validation can depend on external evidence that changes
- research implication, agent inference
  - measure the cost and error of learning brand identity; new brands need benign controls

Rods with Laser Beams: Understanding Browser Fingerprinting on Phishing Pages
- Iskander Sanchez-Rola, Leyla Bilge, Davide Balzarotti et al, USENIX Security 2023
- [Rods with Laser Beams: Understanding Browser Fingerprinting on Phishing Pages](https://www.usenix.org/conference/usenixsecurity23/presentation/sanchez-rola) · [PDF](https://www.usenix.org/system/files/usenixsecurity23-sanchez-rola.pdf)
- authors’ words, abstract
  - “more than one in four phishing pages adopt some form of fingerprinting”
- problem
  - measure browser data collection in phishing pages
- method
  - analysis of more than 1.7 million phishing pages appearing over 21 months
- reported finding
  - fingerprinting prevalence rose within the study period
- limits, agent analysis
  - observed fingerprinting code can serve evasion, tracking, or credential enrichment; code presence alone does not prove intent
- research implication, agent inference
  - combine scripts with measured behavior and request destinations; do not label every API use as malicious

PhishDecloaker: Detecting CAPTCHA-cloaked Phishing Websites via Hybrid Vision-based Interactive Models
- Xiwen Teoh, Yun Lin, Ruofan Liu et al, USENIX Security 2024
- [PhishDecloaker: Detecting CAPTCHA-cloaked Phishing Websites via Hybrid Vision-based Interactive Models](https://www.usenix.org/conference/usenixsecurity24/presentation/teoh) · [PDF](https://www.usenix.org/system/files/usenixsecurity24-teoh.pdf)
- authors’ words, abstract
  - “mimic human behaviors to solve the CAPTCHAs”
- problem
  - look behind human-verification screens that hide phishing content
- method
  - PhishDecloaker combines five vision models and interactive challenge handling; controlled challenges and 30-day field study
- reported finding
  - recovered detection on evaluated CAPTCHA-cloaked pages; field study found 66 CAPTCHA-cloaked sites among 869 sites discovered across all six study groups
- limits, agent analysis
  - challenge families, reachable pages, and successful interactions delimit the result; this is not complete coverage of all cloaking
- research implication, agent inference
  - report blocked and unresolved paths as missing evidence; compare extra detections against interaction cost

Less Defined Knowledge and More True Alarms: Reference-based Phishing Detection without a Pre-defined Reference List
- Ruofan Liu, Yun Lin, Xiwen Teoh et al, USENIX Security 2024
- [Less Defined Knowledge and More True Alarms: Reference-based Phishing Detection without a Pre-defined Reference List](https://www.usenix.org/conference/usenixsecurity24/presentation/liu-ruofan) · [PDF](https://www.usenix.org/system/files/usenixsecurity24-liu-ruofan.pdf)
- authors’ words, abstract
  - “a search-engine-based validation mechanism to remove the misinformation”
- problem
  - use an LLM to infer brand-domain relationships and credential-taking intent
- method
  - PhishLLM uses model knowledge and search checks; experimental comparisons and field studies
- reported finding
  - reported higher recall than compared reference-based detectors; field discovery outperformed PhishIntention and DynaPhish-enhanced comparison
- limits, agent analysis
  - search ranking is evidence to validate, not independent ground truth; model training and changing search results complicate reproduction
- research implication, agent inference
  - search poisoning can attack the detector’s own identity evidence; freeze evidence and test conflicting authoritative sources

KnowPhish: Large Language Models Meet Multimodal Knowledge Graphs for Enhancing Reference-Based Phishing Detection
- Yuexin Li, Chengyu Huang, Shumin Deng et al, USENIX Security 2024
- [KnowPhish: Large Language Models Meet Multimodal Knowledge Graphs for Enhancing Reference-Based Phishing Detection](https://www.usenix.org/conference/usenixsecurity24/presentation/li-yuexin) · [PDF](https://www.usenix.org/system/files/usenixsecurity24-li-yuexin.pdf)
- authors’ words, abstract
  - “containing 20k brands with rich information about each brand”
- problem
  - expand identity evidence and inspect text when logos are absent
- method
  - KnowPhish builds a multimodal brand knowledge base; LLM extracts textual brands; manually validated evaluation and Singapore-context field study
- reported finding
  - improved evaluated detectors and enabled logo-free detections
- limits, agent analysis
  - brand collection quality and local field sampling affect generalization; LLM brand extraction does not prove a page’s claims are true
- research implication, agent inference
  - test unfamiliar small organizations and authorized third-party login pages, not only famous brands

Doubly Dangerous: Evading Phishing Reporting Systems by Leveraging Email Tracking Techniques
- Anish Chand, Nick Nikiforakis, Phani Vadrevu, USENIX Security 2025
- [Doubly Dangerous: Evading Phishing Reporting Systems by Leveraging Email Tracking Techniques](https://www.usenix.org/conference/usenixsecurity25/presentation/chand) · [PDF](https://www.usenix.org/system/files/usenixsecurity25-chand.pdf)
- authors’ words, abstract
  - “all major email services we tested are vulnerable to evasive phishing attacks”
- problem
  - measure the reporting workflow through an ordinary mail client
- method
  - email tracking repurposed to profile systems before and after reports; thousands of messages over 44 days; controlled validation
- reported finding
  - tested mail reporting systems could be distinguished and evaded; authors disclosed findings and report remedial changes
- limits, agent analysis
  - the tested services and study period bound the finding; population served by a provider is not observed victim count
- research implication, agent inference
  - user-reporting workflows deserve end-to-end measurement; a report receipt is not evidence that a browser warning appeared

Evaluating the Effectiveness and Robustness of Visual Similarity-based Phishing Detection Models
- Fujiao Ji, Kiho Lee, Hyungjoon Koo et al, USENIX Security 2025
- [Evaluating the Effectiveness and Robustness of Visual Similarity-based Phishing Detection Models](https://www.usenix.org/conference/usenixsecurity25/presentation/ji) · [PDF](https://www.usenix.org/system/files/usenixsecurity25-ji.pdf)
- authors’ words, abstract
  - “they exhibit notably low performance on real-world datasets”
- problem
  - test visual detectors under a common large-scale evaluation
- method
  - seven detectors; APWG eCX collection July 2021–July 2023; screenshot clustering and manual checking; final 451,514 pages; 2,500 benign snapshots
- reported finding
  - logo removal, benign-looking logos, and pipeline weaknesses damaged detection; curated benchmark scores overstated measured field performance
- limits, agent analysis
  - large clusters were prioritized; failures to fetch pages removed many URLs; benign controls came from 100 popular Tranco domains; population-weighted rates need separate estimation
- research implication, agent inference
  - publish fetch failure and filtering counts; include uncommon benign tenants; distinguish URL-weighted from cluster-weighted performance

NOKEScam: Understanding and Rectifying Non-Sense Keywords Spear Scam in Search Engines
- Mingxuan Liu, Yunyi Zhang, Lijie Wu et al, USENIX Security 2025
- [NOKEScam: Understanding and Rectifying Non-Sense Keywords Spear Scam in Search Engines](https://www.usenix.org/conference/usenixsecurity25/presentation/liu-mingxuan) · [PDF](https://www.usenix.org/system/files/usenixsecurity25-liu-mingxuan.pdf)
- authors’ words, abstract
  - “uses uncommon and usually non-sense keywords”
- problem
  - show how a scammer can turn search into an apparent endorsement
- method
  - NOKEScam study with a Chinese search engine; seven months; 153,975 keywords across 68,863 domains
- reported finding
  - scammers promoted invented names instead of links; near-exclusive exact matches made scam pages look convincing; deployed filtering coincided with fewer complaints
- limits, agent analysis
  - search-provider access enabled scale; complaints and page views do not equal verified victim losses; a before/after suppression result alone leaves temporal confounding
- research implication, agent inference
  - the whole verification journey matters; finding the name in search is weak evidence when all corroboration is attacker-owned

Phishing in the Free Waters: A Study of Phishing Attacks Created using Free Website Building Services
- Sayak Saha Roy, Unique Karanjit, Shirin Nilizadeh, IMC 2023
- [publisher record](https://doi.org/10.1145/3618257.3624812)
- authors’ words, abstract
  - “more than 31.4K phishing URLs”
  - “17 unique free website builder services”
- problem
  - a reputable shared hosting domain can contain both ordinary pages and phishing tenants
- method
  - FreePhish collects social-media links and adapts a classifier to builder-specific features
  - historical candidate screening used VirusTotal; 5,000 pages were manually inspected and 4,656 confirmed
  - later discovery covered November 2022–May 2023 in §5
  - 31,405 newly identified URLs targeted 109 organizations
  - 10-minute polling measured blocklists, host removal, and social-post removal
  - reports to hosts and social platforms were part of the study
- reported finding
  - poorer coverage and slower response for builder-hosted attacks than the matched self-hosted sample
  - detection varied substantially across builders
- exact coverage figures need clarification
  - §4.4 defines coverage as detection within one week
  - §5.1 reports Google Safe Browsing coverage of 18.4% for builder URLs
  - the text discussing figure 6 later reports about 31% within 24 hours
  - these statements appear incompatible without a denominator or population distinction
  - retain the qualitative comparison; request author clarification before quoting a definitive aggregate percentage
- limits, agent analysis
  - historical screening inherits VirusTotal’s visibility and target biases
  - the initial training set favors recognizable impersonation and sensitive-information forms
  - a website builder’s parent-domain age is not its tenant’s age
  - host and platform reporting means removal timing reflects an intervention
  - matching social platform counts does not remove brand, campaign, or builder selection differences
  - one paragraph says November 2022–March 2023; §5 and the abstract describe six months ending May 2023
- research implication, agent inference
  - identify tenant and page boundaries explicitly
  - estimate ordinary tenants harmed by parent-domain blocking
  - distinguish new tenant creation, first public observation, and first malicious content

Evolving Bots: The New Generation of Comment Bots and their Underlying Scam Campaigns in YouTube
- Seung Ho Na, Sumin Cho, Seungwon Shin, IMC 2023
- [publisher record](https://doi.org/10.1145/3618257.3624822)
- authors’ words, abstract
  - “1,134 SSBs promoting 72 scam campaigns”
- problem
  - an ordinary-looking comment can lead to a malicious link in the commenter’s profile
- method
  - comment embeddings and clustering identify similar behavior
  - profile links connect accounts to scam domains
  - six months of follow-up study mitigation and ranking behavior
- reported finding
  - observed bots reused comments and boosted their own visibility through engagement
  - campaigns aligned with related video topics
- limits, agent analysis
  - the abstract’s 31.73% refers to crawled videos, not all YouTube videos
  - link-frequency filters and known scam lists can omit rare or unknown destinations
  - clustered copy-like comments are candidates, not proof of automation or fraud
- research implication, agent inference
  - measure the route from comment to profile to redirect to destination
  - classify resulting harm separately from the writing style or apparent humanity of a comment

Click Trajectories: End-to-End Analysis of the Spam Value Chain
- Kirill Levchenko et al, IEEE S&P 2011
- [author-hosted PDF](https://cseweb.ucsd.edu/~savage/papers/Oakland11.pdf)
- authors’ words, abstract
  - “95% of spam-advertised pharmaceutical, replica and software products”
  - “merchant services from just a handful of banks”
- problem
  - stopping unwanted messages may leave the business that pays for them intact
- method
  - three months of spam feeds and infrastructure crawling
  - more than 100 purchases connected advertising, domains, hosting, payments, and fulfillment
- reported finding
  - payment services were a narrower shared dependency than some easily replaced technical infrastructure
- limits, agent analysis
  - historical product categories and payment arrangements may differ from present scams
  - public links alone cannot reproduce payment and fulfillment evidence
  - a shared provider is not automatically aware of or responsible for abuse
- research implication, agent inference
  - connect campaigns to durable monetization dependencies
  - count replacement cost and return after removal, rather than only domains removed
SoK: PHILTER: Uncovering Security and Functional Gaps in AI-based Phishing Website Detection Literature via an LLM-based Reasoning Framework
- Mahbub Alam et al, USENIX Security 2026
- [venue page](https://www.usenix.org/conference/usenixsecurity26/presentation/alam) · [PDF](https://www.usenix.org/system/files/usenixsecurity26-alam.pdf)
- authors’ words, abstract
  - “Applying it to 55 academic approaches reveals systemic gaps”
  - “No study fulfills all functionality and security requirements”
- method
  - LLM evidence extraction and draft reasoning, validated by experts
  - four functional criteria and three security criteria
- reported finding
  - weak evidence for diverse phishing tactics, evolving attacks, privacy, and diverse benign pages
- limits, agent analysis
  - paper reporting is evidence about documented evaluation
  - missing evidence does not prove a deployed implementation cannot meet a criterion
  - expert validation and criterion choices affect assessments
- research implication, agent inference
  - use this review to check novelty and evaluation requirements before implementing another detector
  - a small defensible collection and evaluation contribution may be more useful than another high benchmark accuracy claim

A Large-Scale Study of Personalized Phishing using Large Language Models
- Stefan Czybik et al, USENIX Security 2026
- [venue page](https://www.usenix.org/conference/usenixsecurity26/presentation/czybik) · [PDF](https://www.usenix.org/system/files/usenixsecurity26-czybik.pdf)
- authors’ words, abstract
  - “an experiment with 7 700 participants”
  - “almost triples the click rate compared to generic phishing strategies”
- method
  - university awareness-training experiment
  - email-address searches retrieve public personal information
  - tailored messages compared with generic human and model-written messages
- reported finding
  - increased clicks for personalized messages
  - reported generation and personalization cost around $0.03 per email under the study’s configuration
- limits, agent analysis
  - university training participants and simulated messages differ from unrestricted criminal campaigns
  - clicking is not credential surrender, payment, or account compromise
  - cost depends on the selected model, queries, and infrastructure
- research implication, agent inference
  - removal-service effectiveness could be evaluated against the personal evidence still available to a search-backed attacker
  - preserve a distinction between exposure to personal data and successful exploitation

Love, Lies, and Language Models: Investigating AI's Role in Romance-Baiting Scams
- Gilad Gressel et al, USENIX Security 2026
- [venue page](https://www.usenix.org/conference/usenixsecurity26/presentation/gressel) · [PDF](https://www.usenix.org/system/files/usenixsecurity26-gressel.pdf)
- authors’ words, abstract
  - “interviewing 145 insiders and 5 scam victims”
  - “a blinded long-term conversation study comparing LLM scam agents to human operators”
- method
  - interviews about organized scam operations
  - seven-day conversation study with 22 university participants
  - commercial safety-filter evaluation
- reported finding
  - model partner elicited greater measured trust and more compliance with a harmless installation request
  - studied conversations escaped the evaluated safety filters
- limits, agent analysis
  - small university sample and instructed daily contact
  - no evaluation of how often a stranger would begin or sustain a real conversation
  - seven days differ from months of grooming
  - installation compliance is not financial loss
  - interview claims about labor automation are not direct observation of every operation
- research implication, agent inference
  - detection must consider a conversation’s accumulated promises and later requests
  - fluent text or an AI-text score alone cannot establish whether a relationship is fraudulent

Beyond the Stars: Multimodal Detection of Scams on GitHub
- Tillson Galloway, Kevin Valakuzhy, Manos Antonakakis, Fabian Monrose, USENIX Security 2026
- [venue page](https://www.usenix.org/conference/usenixsecurity26/presentation/galloway) · [PDF](https://www.usenix.org/system/files/usenixsecurity26-galloway.pdf)
- authors’ words, abstract
  - “processes over ten million newly active repositories”
  - “14,667 total malicious repositories absent from major OSINT feeds”
- method
  - OctoWatch combines repository text, file content, user–repository relationships, and temporal activity
  - offline comparisons plus online deployment
- reported finding
  - discovered coordinated abuse beyond available public threat feeds
  - responsible disclosure led to repository removals
  - a discovered cluster was associated with $5.9 million in Ethereum transactions
- limits, agent analysis
  - absence from selected feeds does not prove complete novelty
  - associated transaction volume is not established scam profit or victim loss
  - platform activity and sparse delayed labels complicate both negatives and deployment precision
- research implication, agent inference
  - trusted software platforms are part of user-facing scam infrastructure
  - activity and relationships complement content when text changes cheaply
  - evaluate coordinated campaign discovery and analyst effort alongside page-level scores
