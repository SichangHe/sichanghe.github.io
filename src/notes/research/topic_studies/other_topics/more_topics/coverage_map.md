research-topic coverage map
(authored by agents unless marked 🧑)

scope and evidence

- snapshot: 7 October 2026 UTC
- local human wording is evidence of mention
  - talk notes are the human's notes about speakers
  - they do not independently verify speakers' claims
- destinations below identify ownership or a review gap
  - a folder assignment is not proof that a finished study exists
  - this map does not claim exhaustive coverage of every file in the repository
- sweep examined reading notes, research topic notes, about page, class-note topic matches, and inherited worker handoff
- a later omission audit inspected 52 additional original inputs
  - selected research-root and cs-root notes plus twelve direct-interest pointers
  - excluded marked agent additions when attributing human interests
  - no confirmed new residual topic found in those inputs
  - unknown-authorship deletion-after-breach question and incomplete RAG traceback methods initially routed to existing owners
  - later manager instruction assigns their uncovered follow-ups to this folder
    - [breach-triggered deletion](breach_triggered_deletion.md)
    - [retrieval-poisoning traceback](retrieval_poisoning_traceback.md)
  - this bounded audit does not establish whole-repository completeness
- another bounded audit screened 23 previously unchecked files
  - selected soft, government, financial, storage, documentation, and class notes
  - no verified human-topic omission in that input set
  - undeclared authorship prevents treating driver-containment and museum-funding notes as verified human interests
  - museum funding is being investigated as an agent extension of the confirmed museum interest
  - [driver fault containment and recovery](driver_fault_containment.md) is an agent extension from an attribution-limited class-note lead
- practical-note audit screened 55 top-level files across eight folders
  - source files lack authorship declarations; new leads remain unattributed
  - [Trail staging design](language_infrastructure.md) and [package environments](package_environment_reproducibility.md) studied as agent extensions
  - PostgreSQL query-rewriting and TimescaleDB storage-accounting leads submitted for other-group ownership coordination
  - excludes nested files and does not establish whole-repository completeness
  - follow-up search found no eligible nested files in those eight folders after excluding agent instructions
- six further folders screened: bug notes, macOS, mathematics, exams, USC, and referrals
  - 26 files, including one stylesheet; authorship undeclared
  - mathematics received heading/problem screening rather than complete equation review
    - follow-up maps all eighteen file titles and selected topic passages
    - complex evaluation, validated approximation, computational algebra/topology, and robust geometry were partial gaps in that audit
    - 8 October continuation adds [validated complex computation](validated_complex_computation.md) and [algebra/geometry](computational_algebra_and_geometry.md)
      - focused methods do not cover every mathematical application or routine course topic
    - [computational topology](computational_topology.md) now reviews static and incremental persistence as an agent extension
  - [numerical reliability](numerical_reliability.md) studied as an agent extension
  - [desktop indexing/recovery](desktop_indexing_and_recovery.md) studied as an agent extension
  - automated lesson completion maps to [learning outcomes](attention_learning_and_tools.md)
    - scripts establish completion actions, not retained understanding

explicit interests and questions

- 🧑 “Efficient and high-performance computing with CPU cache optimization.”
  - source: [src/about.md](../../../../../about.md)
  - destination: [CPU cache optimization](cpu_cache_optimization.md)
- 🧑 “Programming language infrastructure to enable robust static analysis.”
  - source: [src/about.md](../../../../../about.md)
  - destination: ../systems_ml/ for analysis; residual non-Rust language infrastructure
- 🧑 “Previous: Federated learning, Internet routing, content provenance (C2PA).”
  - source: [src/about.md](../../../../../about.md)
  - destination: federated learning: ../systems_ml/healthcare owner; routing: residual Internet study; C2PA: ../web_trust/provenance.md
- 🧑 “Intersections with sciences.”
  - source: [src/about.md](../../../../../about.md)
  - destination: [anatomical simulation](anatomical_simulation.md), [light and biology](light_biology_evidence.md), healthcare with its owner, [aviation and spaceflight](science_organizations_and_incentives.md)
- 🧑 “what are the huge security holes”
  - source: [src/notes/research/index.md](../../../../research/index.md)
  - destination: huge_security_holes.md
- 🧑 “how to avoid the monotonic growth of software complexity”
  - source: [src/notes/research/index.md](../../../../research/index.md)
  - destination: ../systems_ml/
- 🧑 “Federated learning”
  - source: [src/notes/research/healthcare.md](../../../../research/healthcare.md)
  - destination: ../systems_ml/; manager states this owner covers it
- 🧑 “# Speech Recognition”
  - source: [src/notes/class_notes/cs304.md](../../../../class_notes/cs304.md)
  - destination: [speech transcription and speaker labels](speech_transcription_and_speakers.md)

reading-note mentions grouped by research family

web content, crawling, and standards

- destination: [web infrastructure studies](../../web_llm_detection/web_infra/index.md)
  - [YouTube sampling and HTML standards](web_sampling_and_standards.md) reviewed separately here
- source: [human reading notes](../../../../reading_notes/index.md)
  - 🧑 “JavaScript Dead-Code Elimination via HTTP Range Requests (ThorJS), Ayush Pandey, NSL meeting”
  - 🧑 “HTML5, Web Technology class, Marco Papa”
  - 🧑 “Scrapers selectively respect robots.txt directives: evidence from a large-scale empirical study”
  - 🧑 “On YouTube Search API Use in Research, Alexandros Efstratiou”

multilingual accessibility

- destination: [browser privacy and multilingual accessibility](browser_privacy_and_accessibility.md)
- source: [human reading notes](../../../../reading_notes/index.md)
  - 🧑 “Not All Visitors are Bilingual: A Measurement Study of the Multilingual Web from an Accessibility Perspective, Masudul Hasan Masud Bhuiyan”

ML communication and inference

- destination: [LLM inference systems](../systems_ml/llm_inference_systems.md)
  - [collective scheduling and training-gradient compression](network_optimization_and_rdma.md) reviewed separately here
- source: [human reading notes](../../../../reading_notes/index.md)
  - 🧑 “Collective Communication Algorithms, Arvin Ghavidel, NSL meeting”
  - 🧑 “StreamEP: Straggler-Tolerant MoE Decoding without Communication Barriers, Shaoyu Wang, NSL meeting”
  - 🧑 “I/O Optimizations for Deep Learning on Distributed/Resource-Constrained Environments (Optimus-CC), Yaeyong Song, NSL meeting”
  - 🧑 “Async MoE, Coulson Liang, on behalf of Shaoyu Wang, NSL meeing”

model reasoning and behavior

- destination: [AI agent studies](../ai_agents/index.md)
  - [emergent algorithms and hybrid models](emergent_algorithms_and_hybrid_models.md) reviews the otherwise uncovered talks here
- source: [human reading notes](../../../../reading_notes/index.md)
  - 🧑 “Emergent Algorithms in Foundation Models, Deqing Fu, Theory Lunch”
  - 🧑 “*Intelligent, Robust and Trustworthy AI: Managing GenAI Challenges, Next Phase of Hybrid AI Models and Enterprise AI for Mission-Critical Applications*, Amit Sheth”
  - 🧑 “[Dario Amodei: Anthropic CEO on Claude, AGI & the Future of AI & Humanity | Lex Fridman Podcast \#452](https://www.youtube.com/watch?v=ugvHCXCOmm4)”
  - 🧑 “[ChatGPT from Scratch: How to Train an Enterprise AI Assistant • Phil Winder • GOTO 2023](https://www.youtube.com/watch?v=N53Gsz0Gm4c)”

distributed debugging and mobile testing

- destination: [distributed bug studies](../../distributed_systems/finding_bugs/llm_agents_for_distributed_bugs.md)
  - [mobile UI bug reproduction](mobile_bug_reproduction.md)
  - [interactive distributed debugging](interactive_distributed_debugging.md) reviews DDB's actual user study separately from DDBench
- source: [human reading notes](../../../../reading_notes/index.md)
  - 🧑 “DDB: Source-Level Interactive Debugging for Distributed Applications, Yibo Yan, NSL meeting”
  - 🧑 “Discussion: User-study Design in DDB, Yibo Yan, NSL meeing”
  - 🧑 “Defense: *Automated Reproduction of Bug Reports for Mobile Applications*, Zhaoxu Zhang”

hardware observation, WASM, and runtime performance

- destination: [hardware side channels](hardware_side_channels.md) and [CPU cache optimization](cpu_cache_optimization.md)
- source: [human reading notes](../../../../reading_notes/index.md)
  - 🧑 “Wave: Leveraging Architecture Observation for Privacy-Preserving Model Oversight, Haoxuan Xu, NSL meeting”
  - 🧑 “Junzhou He, NSL meeting”
  - 🧑 “[Measuring context switching and memory overheads for Linux threads](https://eli.thegreenplace.net/2018/measuring-context-switching-and-memory-overheads-for-linux-threads/)”

cloud resource demand and placement

- destination: [cloud scheduling](cloud_serverless_scheduling.md)
- source: [human reading notes](../../../../reading_notes/index.md)
  - 🧑 “Granula Resource Demand Heterogeneity, Coulson Liang”
  - 🧑 “The SAP Cloud Infrastructure Dataset: A Reality Check of Scheduling and Placement of VMs in Cloud Computing, Arno Uhlig”
  - 🧑 “Towards Microsecond-Scale vm Core Provisioning Agility on Serverless Platforms, Yibo Yan, NSL meeting”

mobile, wireless, and immersive media

- destination: [wireless models and measurement](wireless_models_and_measurement.md)
  - selected full methods reviewed separately for RTC message parsing, LiVo streaming, and ReVo loss recovery
- source: [human reading notes](../../../../reading_notes/index.md)
  - 🧑 “LiVo: Toward Bandwidth-adaptive Fully-Immersive Volumetric Video Conferencing, Rajrup Ghosh, NSL meeting”
  - 🧑 “Protocol Compliance in Popular RTC Applications, Peiqing Chen”
  - 🧑 “SplatPose: On-Device Outdoor AR Pose Estimation Using Gaussian Splatting, Rajrup Ghosh, NSL meeting”
  - 🧑 “Hybrid Data-Driven and Simulation-Driven Prediction of mmWave Network Performance, Zihao Feng, NSL meeting”

theory, selection, and design

- destination: [theory talks review](theory_and_other_talks.md)
  - gaps: exact vote-delegation paper and proof-carrying-state construction unidentified
- source: [human reading notes](../../../../reading_notes/index.md)
  - 🧑 “Defense: Incentivizing Efficient Delegation without Payments, Curtis Bechtel”
  - 🧑 “Lunch in Theory: Near-Optimal Sparsifiers for Stochastic Knapsack and Assignment Problems, Xinyu Liu”
  - 🧑 “Lunch in Theory: How to Measure Differences in Rankings, Yeganeh Alimohammadi”
  - 🧑 “Theory Lunch: *Towards Publicly Verifiable Cryptography: Obfuscation, Fully Homomorphic Encryption, and Proof Carrying State*, Miryam Huang”
  - 🧑 “Theory Lunch: *Proper Learnability and the Role of Unlabeled Data*, Julian Asilis”
  - 🧑 “Theory Lunch: *An Equivalence Between Fair Division and Wagering Mechanisms*, Jens Witkowski”
  - 🧑 “Theory Lunch: *Vote Delegation through the Lens of Metric Distortion*, Alan Grayson York”
  - 🧑 “Guest Talk: *Computational Homogenization for Inverse Design of Surface-based Inflatables*, Yingying (Samara) Ren, ISTA”
  - 🧑 “Thesis proposal: *Incentivizing Efficient Delegation without Payments*, Curtis Bechtel”
  - 🧑 “*Scalable $k$-Means Clustering for Large $k$ via Seeded Approximate Nearest-Neighbor Search*, Jack Spalding-Jamieson”
  - 🧑 “*Full Proportional Justified Representation*, Jiasen Liu”
  - 🧑 “*What uniform symmetric distro can a shallow circuit produce*, Kewen Wu”

private computation

- destination: [private-computation methods](theory_and_other_talks.md)
  - FedML-HE and blind-annotation full methods reviewed
  - P3V's complete proof, rerouting, and benchmark configuration remain unchecked because its full PDF was inaccessible
- source: [human reading notes](../../../../reading_notes/index.md)
  - 🧑 “Defense: *Efficiency in Privacy-Preserving Computation via Domain Knowledge*, Weizhao Jin (advisor: Srivatsan Ravi)”

network optimization and congestion

- destination: [networking and edge systems](../../distributed_systems/other_areas/networking_edge_p2p.md)
  - [traffic engineering, adversarial testing, and RDMA congestion](network_optimization_and_rdma.md) reviewed separately here
    - exact MetaRL and collective-talk manuscripts remain unidentified
    - RDMA full methods recovered from the coauthor's manuscript upload
      - raw traces and host-to-port causal links remain unverified
- source: [human reading notes](../../../../reading_notes/index.md)
  - 🧑 “Near-Optimal Online Traffic Engineering, Arvin Ghavidel, NSL meeting”
  - 🧑 “MetaRL, Mahdi Alizadeh, NSL meeting”
  - 🧑 “Patchwork: A Traffic Capture and Analysis Platform for Network Experiments on a Federated Testbed, Nishanth Shyamkumar”
  - 🧑 “Congestion Patterns in a Large-scale RDMA Datacenter, Soudeh Ghorbani”

Internet routing and prefix relationships

- destination: [Internet routing and security](internet_routing_and_measurement.md)
- source: [human reading notes](../../../../reading_notes/index.md)
  - 🧑 “A first look into long-lived BGP zombies, Iliana Maria Xygkou”
  - 🧑 “A Framework to Evaluate MPIC Security using Real-World BGP Announcements, Cyrill Krähenbühl”
  - 🧑 “ru-RPKI-ready: the Road Left to Full ROA Adoption, Deepak Gouda”
  - 🧑 “Replication: A Two Decade Review of Policy Atoms - Tracing the Evolution of AS Path Sharing Prefixes, Weili Wu”
  - 🧑 “Learning AS-to-Organization Mappings with Borges, Fabián E. Bustamante”
  - 🧑 “Sibling Prefixes: Identifying Similarities in IPv4 and IPv6 Prefixes, Oliver Gasser”
  - 🧑 “ASINT: Learning AS-to-Organization Mapping from Internet Metadata, Yongzhe Xu”

Internet availability, protocol behavior, and scanners

- destination: [below-web Internet measurement](internet_routing_and_measurement.md)
  - open lead: broadband inequity and scanner attribution need deeper coverage
  - context: [networking systems](../../distributed_systems/other_areas/networking_edge_p2p.md)
- source: [human reading notes](../../../../reading_notes/index.md)
  - 🧑 “The Developer, the RFC, and the Middlebox: An HTTP/2 Compliance Story, Mahmoud Attia, Ilies Benhabbour”
  - 🧑 “How I learned to stop worrying and love IPv6: Measuring the Internet Readiness for DNS over IPv6, Anja Feldmann”
  - 🧑 “Tracking Internet Disruptions in Ukraine: Insights from Three Years of Active Full Block Scans, Florian Holzbauer”
  - 🧑 “Have you SYN what I see? Analyzing TCP SYN Payloads in the Wild, Dario Ferrero”
  - 🧑 “Fingerprinting QUIC clients, Seungju Lee”
  - 🧑 “Chunk-fu: Fingerprinting QUIC implementations using fragmented frames, Karthik Nishanth Sengottuvelavan”
  - 🧑 “Passively Inferring Network Availability and Configuration from NTP Pool Clients, Paul Chung”
  - 🧑 “How Do You Know My Name? Investigating The Role of Domain Names for Target Reconnaissance among Web and IPv6 Scanners, Sebastian Kappes”
  - 🧑 “Towards a systematic benchmark framework for evaluating darknet-analysis methodologies, Max Gao”
  - 🧑 “The Potential of Erroneous Outbound Traffic Analysis to Unveil Silent Internal Anomalies, Andrea Sordello”
  - 🧑 “Identifying Disruptive Patterns in Internet Background Radiation, Xie Qiu”
  - 🧑 “IMC 2025 Student Workshop Keynote, Arpit Gupta”
  - 🧑 “*Job talk: Expectation vs Reality: How Network Abstractions Impact Internet Security*, Paul Pearce”

browser permissions, tracking, and app privacy

- destination: [browser permissions, tracking, and app data collection](browser_privacy_and_accessibility.md)
  - context: [large security gaps](huge_security_holes.md)
- source: [human reading notes](../../../../reading_notes/index.md)
  - 🧑 “A Permissions Odyssey: A Systematic Study of Browser Permissions on Modern Websites, Alberto Fernandez-de-Retana”
  - 🧑 “An In-Depth Investigation of Data Collection in LLM App Ecosystems, Yuhao Wu”
  - 🧑 “FP-Inconsistent: Measurement and Analysis of Fingerprint Inconsistencies in Evasive Bot Traffic, Hari Venugopalan”
  - 🧑 “CookieGuard: Characterizing and Isolating the First-Party Cookie Jar, Zubair Shafiq”
  - 🧑 “Canvassing the Fingerprinters: Characterizing Canvas Fingerprinting Use Across the Web, Elisa Luo”
  - 🧑 “Where in the World Are My Trackers? Mapping Web Tracking Flow Across Diverse Geographic Regions, Robert Ricci”

browser GPU performance

- destination: [browser GPU performance](browser_gpu_performance.md)
  - [GPU correctness](gpu_correctness.md) reviews proof and testing boundaries here
- source: [human reading notes](../../../../reading_notes/index.md)
  - 🧑 “From WebGL to WebGPU: A Reality Check of Browser-Based GPU Acceleration, Sthitadhi Sengupta”

peer-to-peer storage and blockchain infrastructure

- destination: [networking and peer-to-peer systems](../../distributed_systems/other_areas/networking_edge_p2p.md) and [blockchain validators](../../distributed_systems/consensus_replication/blockchain_validators.md)
  - [hosted RPC freshness and privacy](blockchain_rpc_measurement.md) reviews the named poster and related interfaces
- source: [human reading notes](../../../../reading_notes/index.md)
  - 🧑 “The Decentralization Dilemma: Performance Trade-Offs in IPFS and Breakpoints, Ruizhe Shi”
  - 🧑 “When Blocks Go Missing: The Timeliness and Trustworthiness of Blockchain RPC Providers, Ye Shu”

spam and creator consent

- destination: [spam campaigns](../web_trust/spam_campaigns.md) and [content removal and theft](../web_trust/removal_content_theft.md)
- source: [human reading notes](../../../../reading_notes/index.md)
  - 🧑 “Do Spammers Dream of Electric Sheep? Characterizing the Prevalence of LLM-Generated Malicious Emails, Wei Hao”
  - 🧑 “Somesite I Used To Crawl: Awareness, Agency and Efficacy in Protecting Content Creators From AI Crawlers, Elisa Luo”

health and anatomical simulation

- destination: [clinical systems](../systems_ml/healthcare_clinical_systems.md) and [biology workflows](../systems_ml/healthcare_bio_workflows.md)
  - [light-biology evidence](light_biology_evidence.md) separates mechanisms from human outcomes
  - [anatomical simulation](anatomical_simulation.md) separates shape, contact-force validity, and timing
- source: [human reading notes](../../../../reading_notes/index.md)
  - 🧑 “[How to Enhance Your Immune System | Dr. Roger Seheult](https://www.youtube.com/watch?v=N5DAW8mkJ6Y), Andrew Huberman”
  - 🧑 “Defense: *Real-time Multi-Resolution Neural Networks for Hand Simulation*, Mianlun Zheng (Advisor: Jernej Barbič)”

non-Rust language infrastructure

- destination: [Elixir and language infrastructure](language_infrastructure.md)
  - context: [software complexity](../systems_ml/software_complexity_causes_cures.md)
- source: [human reading notes](../../../../reading_notes/index.md)
  - 🧑 “[The Creator Of Elixir - Top Shelf 7](https://www.youtube.com/watch?v=-mFJ5rPbY_w)”

scientific writing, proposals, and organizational decisions

- destination: [scientific communication, proposals, and organizational decisions](science_organizations_and_incentives.md)
- source: [human reading notes](../../../../reading_notes/index.md)
  - 🧑 “[Steve Jobs President & CEO, NeXT Computer Corp and Apple. MIT Sloan Distinguished Speaker Series](https://www.youtube.com/watch?v=Gk-9Fd2mEnI), 1992”
  - 🧑 “WinCC: *A step by step guide for a successful proposal*, Tamim Ahmed”
  - 🧑 “[The Science of Scientific Writing](https://www.usenix.org/sites/default/files/gopen_and_swan_science_of_scientific_writing.pdf), George D. Gopen, Judith A. Swan, American Scientist, 1990”

economics, politics, and personal media notes

- destination: [payment incentives and institutional delegation](science_organizations_and_incentives.md)
- source: [human reading notes](../../../../reading_notes/index.md)
  - 🧑 “[I Slept With 100 Men in One Day | Documentary](https://www.youtube.com/watch?v=mFySAh0g-MI)”
  - 🧑 “[Credit card interest and interchange fees](https://www.youtube.com/watch?v=OceYCEexDqQ)”
  - 🧑 “[Saagar Enjeti: Trump, MAGA, DOGE, Obama, FDR, JFK, History & Politics | Lex Fridman Podcast \#454](https://www.youtube.com/watch?v=9xz8i90Hp2A)”

attention and studying

- destination: [learning, tool dependence, and attention](attention_learning_and_tools.md)
- source: [human reading notes](../../../../reading_notes/index.md)
  - 🧑 “[Optimal Protocols for Studying & Learning, Andrew Huberman](https://www.youtube.com/watch?v=ddq8JIMhz7c)”
  - 🧑 “[How Smartphones Shrink Our Brains](https://www.youtube.com/watch?v=GLD6chdFjA0)”

recovery of the earlier 18-topic sweep

- inherited worker note: “Three topics were never started because of the limits: CPU cache optimization, federated learning, LLMs for watching stocks and news”
  - source: earlier Claude worker scratchpad `m3.txt`, session `86a2e76a-fff9-41ab-8cd5-87800ae07035`
  - this is agent-originated evidence
  - CPU cache interest verified in the about page
  - federated learning verified in healthcare and about notes
  - stocks/news request not located in human notes during this sweep
    - [news-monitoring study](../ai_agents/news_monitoring.md) now covers evidence checking, source dependence, and temporal claims
      - original human-email attribution remains unresolved
    - manager supplied this human email excerpt: “Move Stock&news watch back to server ... pipe news items to ChatGPT ... pre-filtering ... summaries and inference”
      - original email pointer pending
      - ellipses are in the manager excerpt
    - `financial/stocks/index.md` contains only the title
- confirmed existing residual studies at this snapshot
  - `cloud_serverless_scheduling.md`
  - `hardware_side_channels.md`
  - `huge_security_holes.md`
  - `theory_and_other_talks.md`
  - `cpu_cache_optimization.md`
  - `wireless_models_and_measurement.md`
  - `cloud_isolation_and_energy.md`
- recovered topics and separately assigned interests
  - [Internet routing security and below-web measurement](internet_routing_and_measurement.md)
  - [datacenter and wide-area networking](network_optimization_and_rdma.md)
  - [supply chain security](huge_security_holes.md) and [browser security/privacy](browser_privacy_and_accessibility.md)
  - GPU correctness
    - [GPU proof and testing boundaries](gpu_correctness.md)
    - [browser GPU performance](browser_gpu_performance.md) is a separate measurement question
  - CPU cache optimization: [existing study](cpu_cache_optimization.md)
  - blockchain systems
    - distributed group already has `consensus_replication/blockchain_validators.md`
    - [privacy, proofs, and contracts](blockchain_privacy_and_contracts.md)
  - [non-Rust programming-language infrastructure](language_infrastructure.md)
  - mobile/wireless/immersive media: [existing study](wireless_models_and_measurement.md)
  - [speech transcription and speaker labels](speech_transcription_and_speakers.md)
  - cholesterol/diet/heart disease and federated learning
    - [cholesterol/diet evidence](../systems_ml/cholesterol_diet_evidence.md), an attribution-limited extension
    - federated learning remains in [clinical systems](../systems_ml/healthcare_clinical_systems.md)
  - stocks/news watching
    - [news monitoring](../ai_agents/news_monitoring.md), pending direct human-source pointer

remaining broad interests that the 18-topic list did not explicitly handle

- retrieval practice, sleep, attention, and smartphone distraction
  - 🧑 “testing help remember; test ASAP after exposure”
    - source: [reading notes, Andrew Huberman study talk](../../../../reading_notes/index.md)
  - potential systems connection: scheduling active recall and measuring tool-induced distraction
  - [retrieval, spacing, and distraction review](attention_learning_and_tools.md)
- payment fees and unequal rewards
  - 🧑 “ordinary people pay for the benefit high-end card user get”
    - source: [reading notes, credit-card fees video](../../../../reading_notes/index.md)
  - [payment incidence review](science_organizations_and_incentives.md) separates merchant-price and borrower-interest mechanisms
- organizational delegation and bureaucracy
  - 🧑 “lower down can brick president order by delaying”
    - source: [reading notes, Saagar Enjeti podcast](../../../../reading_notes/index.md)
  - a systems analogy is not evidence of a valid political-science model
- biology, aviation, and spaceflight
  - 🧑 “human health, general Biology, aviation, spaceflight”
    - source: [about page](../../../../../about.md)
  - healthcare covers part of biology
  - [aviation and spaceflight software review](science_organizations_and_incentives.md)
- scientific writing and proposal preparation
  - 🧑 “writer responsible to make reader understand”
    - source: [reading notes, Gopen and Swan](../../../../reading_notes/index.md)
  - explicit methodological interest
  - [scientific writing and proposal review](science_organizations_and_incentives.md)
- cultural, museum, art, food, and exercise interests
  - source: [about page, leisure interests](../../../../../about.md)
  - [museum, music, and food-system studies](cultural_heritage_music_and_food.md)
  - broad interests do not establish a preferred research direction

coverage test

- before claiming completion, match each destination to a real study file
- for unresolved topics, preserve the exact source paragraph and open question
- [multilingual accessibility](browser_privacy_and_accessibility.md) and [mobile bug reproduction](mobile_bug_reproduction.md) now have reviewed studies here
- private-computation methods now distinguish selective encryption, annotation assumptions, and the inaccessible P3V proof
- [HTML evolution and YouTube sampling](web_sampling_and_standards.md), [light-biology claims](light_biology_evidence.md), and [hand simulation](anatomical_simulation.md) now have reviewed studies here
- remaining domain-owner checks are the specific gaps listed above

8 October completion and publication audit

- local paused-worker audit found research gaps separately from publication absence
  - [misinformation interventions](../web_trust/misinformation.md) replaces the earlier unfinished sketch
  - [social-media campaigns](../web_trust/social_media_bots.md) now has a dedicated review
  - StreamEP and Async MoE were routed to serving without an actual exact-topic treatment
    - [asynchronous MoE review](../systems_ml/asynchronous_moe_serving.md) now treats the notes and closest primary methods
      - StreamEP manuscript access remains incomplete; its authenticated artifact is separately reviewed
  - cholesterol/diet/heart-disease attribution comes only from the earlier agent's topic list
    - [evidence-reconciliation review](../systems_ml/cholesterol_diet_evidence.md) is an agent extension, not a verified human preference
- the existing AI-agent, systems-ML, and web-trust studies now have transferred completion/publication ownership
  - the Claude tasks remain paused
  - local existence alone did not establish publication
- source review corrected material inherited proposal errors
  - TBIK already demonstrates matching outputs/probabilities across tested tensor-parallel sizes
  - one GPU cannot run a four-device tensor-parallel experiment
  - a passing test cannot establish unreachability
  - unused-code maintenance cost has direct prior studies
- [cross-topic consultation](chatgpt_review.md) completed at verified Extra High
  - advice and paper leads were assessed separately from scientific evidence
- completeness limit
  - source discovery and reading remain bounded and stated per page
  - no claim of exhaustive coverage of every repository file or every field
  - no proposed experiment was run and no proposal novelty is certified
