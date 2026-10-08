healthcare: clinical records, hospital infrastructure, federated learning, telemedicine
(authored by agents unless marked 🧑)

one-paragraph takeaway

- hospital record systems fail in ways systems people know how to study, and the medical literature mostly does not
  - two FHIR servers given the same records answer the same query differently, and a FHIR conformance pass does not prevent this
  - models trained from the hospital data warehouse lose accuracy when fed by the live record feed, and the main published cause is the plumbing, not the patients
  - unplanned record-system outages are common, mostly caused by attacks, and almost never measured
  - federated learning papers in healthcare are nearly all simulations that ignore slow or failing hospitals
- these are the gaps I would research, in order
  1. a checker that finds silent answer changes when records move between FHIR servers or into analysis databases
  2. a harness that replays a clinical model through the live data path and localizes where its inputs drift from the warehouse copy
  3. federated training measured under realistic hospital compute and network differences, scored per hospital
  4. remote image viewers that provably show the same thing after a disconnect (lower priority)

scope and evidence

- follows the human's [healthcare interests](../../../healthcare.md): EHR systems, telemedicine, federated learning, infrastructure
  - genomics and workflow engines are in healthcare_bio_workflows.md
- literature inspected 7 Oct 2026
  - 43 sources cited; 23 read in full text, the rest from abstracts or search-indexed text
  - each source bullet says which
- these are proposals, not finished experiments
  - novelty is checked against what I found, not against everything that exists

part 1: moving records between systems (FHIR)

- FHIR is the standard web API for health records
  - resources like Patient, Condition, Observation are JSON documents
  - servers from different vendors implement the same spec
- Walonoski, Scanlon, Dowling, Hyland, Ettema, Posnack, FHIR standards compliance data analysis, JMIR Medical Informatics 2018
  - full text read
  - [paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC6231749/)
  - data: two public test tools, Crucible (Dec 2015 to May 2017) and Touchstone (Sep 2015 to Sep 2017)
  - result: servers tested more often passed more tests
    - Crucible: n=115 servers, P<.005, R-squared .262
    - Touchstone: n=70, P<.005, R-squared .883
  - exact limitation: “Neither Crucible nor Touchstone test for clinical correctness; they focus purely on technical correctness.”
  - inference: passing these tools says nothing about whether two servers agree on an answer
- Kramer and Moesel, interoperability with multiple FHIR profiles and versions, JAMIA Open 2023
  - full text read
  - [paper](https://academic.oup.com/jamiaopen/article/6/1/ooad001/7030744)
  - exact statement: “confirming that 2 systems conform to their respective specifications does not imply that those 2 systems can interoperate.”
  - method: a hand-built table comparing sender profile (US Core 5.0.1) with receiver profile (International Patient Summary 1.0.0) for Patient, Condition, MedicationRequest
  - found: missing required fields (birthDate), and incompatible base resources (MedicationRequest vs MedicationStatement)
  - stated limitation: profile applicability “requires human interpretation of narrative descriptions”
  - inference: nobody has automated this; it is done by reading
- mock.health, HAPI vs GCP Healthcare API: why they disagree, blog, 12 Apr 2026
  - full text read; practitioner blog, not peer reviewed
  - [post](https://mock.health/blog/hapi-vs-gcp-healthcare-api)
  - method: “loaded the same 1,000 Synthea patient bundles into two FHIR R4 stores”, ran identical queries
  - found
    - GCP rejected five resource types HAPI accepted (Claim, ExplanationOfBenefit, Questionnaire, QuestionnaireResponse, Provenance)
    - GCP caps a transaction bundle at 4,500 entries; 3.3% of patients hit it
    - GCP silently ignores unknown search parameters and returns everything; HAPI returns 400
    - `Bundle.total`, `_revinclude` caps (100 on GCP), `_summary=count` all differ
  - novelty collision: the basic “same data, different answers” observation is already public
  - what it does not do: no automatic query generation, no ground-truth oracle, no measurement of effect on a downstream app, two servers only
- Heryawan, Mori, Yamamoto, Kume, Lazuardi, Fuad, Kuroda, FHIR interoperability in Indonesia developer forum analysis, JMIR Formative Research 2025
  - abstract read
  - [paper](https://formative.jmir.org/2025/1/e51270)
  - data: developer posts on the national Satusehat platform
  - counts: server issues 61, mapping issues 37, profile selection 9
  - inference: in a real national rollout, server behavior was the top complaint, not the data model
- Knight, Playing with FHIR: hacking and securing FHIR APIs, Knight Ink report sponsored by Approov, Oct 2021
  - sponsor's 12-page summary read; the full report was not retrieved
  - [summary](https://kantara.atlassian.net/wiki/download/attachments/4850023/AlissaKnightSummaryReport.pdf?api=v2)
  - exact: “of the 5 FHIR APIs I tested (two of which were EHR vendors with no vulnerabilities) ... allowed me to access over 4 million patient and clinician records with my own patient login.”
  - exact: “100% of FHIR APIs tested allowed API access to other patient's health data using one patient's credentials.”
  - exact: “53% of mobile apps tested had hardcoded API keys and tokens”
  - caveat: vendor-sponsored, single tester, n=5 APIs; treat the pattern as plausible, the numbers as unverified
  - inference: the weak layer is third-party aggregators, not the hospital's own server
- Mohammed and Hossain, FHIR resource access graph for race conditions, arXiv April 2026
  - abstract read
  - [preprint](https://arxiv.org/abs/2604.03043)
  - exact claim: “the FHIR specification lacks a protocol for concurrency control”
  - method: a graph of concurrent processes and resource accesses; evaluated on 1,500 synthetic transaction logs
  - caveat: synthetic logs only; no evidence these races occur on real servers
- Mandl, Gottlieb, Mandel, Ignatov, Sayeed, Grieve, Jones, Ellis, Culbertson, push button population health (bulk FHIR), npj Digital Medicine 2020
  - full text read
  - [paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC7678833/)
  - what: an asynchronous export API; client kicks off, polls status, downloads NDJSON files, one file per resource type
  - exact: “By 2022, certified health information technology will require a bulk FHIR server”
  - open issues the authors list: scope limited to USCDI, binary content, incremental updates, error guidance
  - no performance numbers
- Jones, Gottlieb, McMurry, ... Mandl, real-world performance of the Cures Act population-level API, JAMIA 2024
  - abstract read; full text requests failed
  - [paper](https://doi.org/10.1093/jamia/ocae040)
  - five sites, April to September 2023
  - Oracle Cerner: 5 to 16 million resources, over 8,000 resources/minute
  - three Epic sites: 1 to 12 million resources at 1,555 to 2,500 resources/minute, and “exported limited FHIR data subsets”
  - custom HIE API: 141 million resources at 12,000 resources/minute
  - authors ask for performance metrics in certification
  - inference: speed differs 5x across certified vendors and completeness differs too; nobody checks what was left out
- Barker and Johnson, EHR app gallery study, JAMIA 2021
  - search-indexed abstract
  - [paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC8510286)
  - 600 to 734 apps across Allscripts, athenahealth, Cerner, Epic, SMART galleries during 2020; 22% described FHIR support
- Mandel et al., SMART on FHIR, JAMIA 2016
  - full text read
  - [paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC4997036/)
  - exact goal: apps “written once and run unmodified across different healthcare IT systems”
  - reported: prototypes exposed the need to constrain the FHIR spec (that became US Core)
- Bloomfield et al., opening the Duke EHR to apps, IJMI 2017
  - abstract read
  - [paper](https://doi.org/10.1016/j.ijmedinf.2016.12.005)
  - implemented “rate-limiting, authorization, auditing, logging, and analytics”; one hospital
- HAPI FHIR issue 1833, performance tuning JPA server, opened May 2020, still open
  - full thread read
  - [issue](https://github.com/hapifhir/hapi-fhir/issues/1833)
  - the maintainer found threads blocked on Hibernate sequence generation during Synthea ingestion
  - inference: the most common open-source server has known, unresolved scaling hotspots

part 2: turning records into analysis tables (OMOP, data quality)

- OMOP is the common table layout research networks use; hospitals convert FHIR or raw EHR data into it
- HL7 FHIR-to-OMOP implementation guide, common challenges page, 2.0.0 ballot
  - full page read
  - [page](https://build.fhir.org/ig/HL7/fhir-omop-ig/en/F2OGeneralIssues.html)
  - exact: “Transformed without filtering, those records inflate apparent exposure and event rates ... The error is systematic rather than random, and it is invisible in the target.”
    - cause: cancelled orders and draft prescriptions in FHIR become real events in OMOP
  - time: “FHIR supports millisecond precision; OMOP requires day-level dates”; time zone has no OMOP field; partial dates need imputation rules nobody records
  - inference: a converter can be correct by the spec and still change what a cohort query returns
- Kahn et al., harmonized data quality framework, eGEMs 2016
  - full text read
  - [paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC5051581)
  - three categories: conformance, completeness, plausibility; two modes: verification (against internal rules) and validation (against external truth)
  - this vocabulary is what the field uses; proposals should name their checks with it
- Blacketer, Schuemie, Ryan, Rijnbeek, data quality dashboard, JAMIA 2021
  - full text read
  - [paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC8449628/)
  - “over 3300 individual quality checks: 396 evaluating completeness, 779 evaluating conformance, and 2126 evaluating plausibility”, generated from 20 SQL templates
  - on one 700 GB claims database: 7 hours, 13 conformance, 5 completeness, 12 plausibility failures
  - what it does not do: check one database on its own; it cannot say whether the conversion changed an answer relative to the source
- Ozonze et al., schema mapping for health data models with language models, July 2026
  - full text read
  - [paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC13395378/)
  - task: “automating schema mapping for health data models using data element names”; five data models
  - limitation stated: operational EHRs and ambiguous metadata untested
- Gulden et al., FHIR analytics benchmark, July 2026
  - abstract read
  - [paper](https://pubmed.ncbi.nlm.nih.gov/42470189/)
  - compares “REST API queries against SQL- and Spark-based big data frameworks” on Synthea data with FHIR-PYrate, Pathling, Trino
  - measures speed, not correctness
- Bukhari, Hayder, Wajahat, FHIRTrustBench, medRxiv July 2026
  - search-indexed text; full text returned 403
  - [preprint](https://www.medrxiv.org/content/10.64898/2026.07.08.26357574v1)
  - scores “a corpus of 10 representative sources” against a readiness rubric; not executable tests

part 3: synthetic patients

- Walonoski et al., Synthea, JAMIA 2018
  - full text read
  - [paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC7651916/)
  - “simulates the lifespans of synthetic patients” from disease and care models; outputs FHIR
  - every FHIR benchmark above uses it; a pinned version and seed give reproducible records
- Chen, Chun, Patel, Chiang, James, validity of Synthea against clinical quality measures, BMC MIDM 2019
  - full text read
  - [paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC6416981/)
  - Synthea vs Massachusetts real rates: colorectal screening 68.7% vs 77.3%; COPD 30-day mortality 0.7% (strict) vs 7.0%; hip/knee complications 0% vs 2.9%; controlled blood pressure 0% vs 74.5%
  - exact: Synthea does “not currently model for deviations in care and the potential outcomes that may result”
  - inference: fine for testing software behavior, useless for estimating clinical rates

part 4: hospital record infrastructure and outages

- Sittig, Gonzalez, Singh, contingency planning for EHR downtime survey, IJMI 2014
  - search-indexed summary
  - [paper](https://psnet.ahrq.gov/issue/contingency-planning-electronic-health-record-based-care-continuity-survey-recommended)
  - about 50 to 60 institutions; 96% had an unplanned downtime in 3 years; 70% had one over 8 hours
- Larsen, Hoffman, Rivera, Kleiner, Wernz, Ratwani, continuing patient care during EHR downtime, Applied Clinical Informatics 2019
  - abstract read; full text blocked by captcha
  - [paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC6620179/)
  - two hospitals, 17 interviews; exact: “laboratory testing results were delayed by an average of 62% compared with normal operation.”
  - authors say data from downtime periods is hard to collect
- Larsen, Rao, Sasangohar, scoping review of downtime literature and news, Health Informatics Journal 2020
  - full text read
  - [paper](https://journals.sagepub.com/doi/10.1177/1460458220918539)
  - news: 43 events, 166 hospitals, 701 hospital-days of downtime, 2012 to 2018; cyber-attack 48.8% (n=21), facility 18.6%, internal IT 7, EHR provider 2
  - research: 1,764 records searched, 10 studies included; only two studied outcomes
  - exact limitation: “limited to publicly acknowledged downtime events. It is likely that there are other events outside the public record.”
  - inference: nobody has telemetry; the field counts news articles
- Lupkin, how daylight saving time stumps hospital record keeping, KFF Health News, 3 Nov 2018
  - full article read; journalism
  - [article](https://kffhealthnews.org/news/like-clockwork-how-daylight-saving-time-stumps-hospital-record-keeping/)
  - a nurse: vitals entered “from 1 a.m. to 2 a.m. will be deleted when the clock falls back to 1 a.m.”
  - Johns Hopkins workaround: enter the second reading at “1:01 a.m.” with a note
  - Epic's response quoted: “Daylight savings time is inherently nuanced for healthcare organizations”
  - inference: time semantics are a live correctness bug in the biggest vendor's product; combine with the OMOP time-zone gap above
- American Hospital Association, survey on the Change Healthcare cyberattack, 15 Mar 2024
  - search-indexed summary of the press release
  - [release](https://www.aha.org/2024-03-15-aha-survey-change-healthcare-cyberattack-significantly-disrupts-patient-care-hospitals-finances)
  - about 1,000 hospitals responded; 74% reported direct patient care impact; 94% financial impact
  - Change Healthcare is a claims clearinghouse; one vendor outage hit most US hospitals at once
  - inference: hospital infrastructure has single points of failure outside the hospital
- Johnson et al., MIMIC-IV, PhysioNet
  - repository page read
  - [dataset](https://physionet.org/content/mimiciv/)
  - “Credentialed Access”; the main public ICU dataset, usable after training and a data agreement

part 5: machine learning running on hospital records

- Wong, Otles, Donnelly, et al., external validation of the Epic Sepsis Model, JAMA Internal Medicine 2021
  - full text read
  - [paper](https://jamanetwork.com/journals/jamainternalmedicine/fullarticle/2781307)
  - 27,697 patients, 38,455 hospitalizations; AUC 0.63 vs vendor's 0.76 to 0.83; sensitivity 33% at threshold 6; alerts on 18% of hospitalizations
  - exact: “The widespread adoption of the ESM despite its poor performance raises fundamental concerns about sepsis management on a national level.”
  - inference: the most deployed clinical model in the US was never externally measured before deployment
- Finlayson et al., the clinician and dataset shift in AI, NEJM 2021
  - search-indexed summary; paywalled
  - [paper](https://doi.org/10.1056/NEJMc2104626)
  - three shift types: technology, population and setting, behavior
  - example: Michigan turned off its Epic sepsis alert during COVID because fever became common
- Ötleş, Oh, Li, Bochinski, Joo, Ortwine, Shenoy, Washer, Young, Rao, Wiens, mind the performance gap, MLHC 2021
  - abstract read
  - [preprint](https://arxiv.org/abs/2107.13964)
  - infection risk model: AUROC 0.778 retrospective to 0.767 prospective; Brier 0.163 to 0.189
  - exact: “The resulting performance gap was primarily due to infrastructure shift and not temporal shift.”
    - infrastructure shift means the live feed delivered features differently from the research warehouse
  - exact: “we must consider differences in how and when data are accessed”
  - this is the single most systems-flavored finding in this review
- Nestor, McDermott, Boag, Berner, Naumann, Hughes, Goldenberg, Ghassemi, feature robustness in non-stationary health records, MLHC 2019
  - search-indexed abstract
  - [paper](https://proceedings.mlr.press/v106/nestor19a.html)
  - MIMIC-III mixes two ICU software systems; year-to-year drift hurts raw-feature models
  - grouping raw codes into clinical concepts limited the AUROC drop to 0.06 (mortality) and 0.03 (length of stay)
- El Arab et al., scoping review of reviews on post-deployment monitoring of healthcare AI, Healthcare (Basel) 2026
  - most of the full text read
  - [paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC13256130/)
  - 25 reviews; exact: “monitoring was widely recommended, but practical implementation remained limited, weakly standardised, and often poorly specified”
  - “calibration deterioration was more commonly reported than discrimination deterioration”
  - exact limitation: “this review cannot estimate the prevalence, frequency, or magnitude of post-deployment failures in clinical AI”
- Wornow et al., EHRSHOT, NeurIPS 2023 datasets and benchmarks
  - abstract read
  - [paper](https://arxiv.org/abs/2307.02028)
  - 6,739 Stanford patients, 15 tasks, a 141M-parameter model pretrained on 2.57M patients; data under a research agreement
  - the benchmark is static; no live-feed or shift evaluation
- Jiang, Black, Geng, Park, Zou, Ng, Chen, MedAgentBench, arXiv Jan 2025
  - full text read
  - [preprint](https://arxiv.org/abs/2501.14654)
  - 300 physician-written tasks over 100 real de-identified Stanford patients on a HAPI FHIR server in Docker
  - best model 69.67% (Claude 3.5 Sonnet v2); GPT-4o 64%; pass@1 only because of “low tolerance for errors”
  - failure modes: wrong action format, free-text instead of structured values
  - inference: an LLM agent talking FHIR inherits every server difference in part 1; the benchmark uses one server

part 6: federated learning across hospitals

- federated learning trains one model across hospitals while each keeps its records; only model updates move
- Rieke et al., the future of digital health with federated learning, npj Digital Medicine 2020
  - full text read
  - [paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC7490367/)
  - exact mechanism: “only model characteristics (e.g., parameters, gradients) are transferred”; a perspective, not a deployment
- Dayan et al., EXAM, Nature Medicine 2021
  - abstract read
  - [paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC9157510/)
  - “data from 20 institutes across the globe”; AUC >0.92; “16% improvement in average AUC measured across all participating sites and an average increase in generalizability of 38%”
  - the largest real deployment I found; no systems measurements reported in the abstract
- Li, Xu, Hu, Tang, Yang, challenges and pitfalls of federated learning in healthcare, Medical Image Analysis (arXiv v2 2024)
  - full text read
  - [preprint](https://arxiv.org/abs/2409.09727)
  - 107 studies to May 2024; exact: “only 10 studies reported real-world deployments in distributed clinical settings, while the rest remained in the realm of prototypes or simulations.”
  - exact: “most studies have focused on addressing statistical or model heterogeneity, but system heterogeneity is equally important.” and that none of the reviewed studies considered it
  - “Only 14% of the included studies have validated their methods on such external data”
  - 78 of 107 built a custom framework; only 13 used an open one (Flower, NVIDIA FLARE, etc.)
  - “only 12 provided details on the processes of data standardization and harmonization”
  - recommendation: “Extend existing FL frameworks rather than developing new ones”
  - inference: system heterogeneity in hospital federated learning is an open, named gap
- Li, Miao, Wu, et al., benchmark of engineering vs statistical federated methods on structured data, Health Data Science 2024
  - full text read
  - [paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC11615161/)
  - 7 methods (GLORE, DAC, SHIR; FedAvg, FedAvgM, q-FedAvg, FedProx) on MIMIC-IV-ED (9,071 patients) and Singapore General Hospital (81,110)
  - “statistical FL algorithms produce much less biased estimates of model coefficients”; engineering methods predict slightly better
  - communication rounds counted (SHIR 1, DAC 3, GLORE under 6, FedAvg family 10 or more); no wall-clock, no failures
- Tertulino, benchmark of federated strategies for mortality prediction, arXiv Sep 2025 (revised Jul 2026)
  - abstract read
  - [preprint](https://arxiv.org/abs/2509.10517)
  - MIMIC-IV, 466,351 admissions split by five care units; FedProx best AUC-ROC 0.897 vs centralized 0.929
  - exact: “The global model does not serve all care units equally (AUC-ROC 0.809-0.902)” and “The smallest, most clinically distinct clients fare worst”
  - no systems costs measured
- Zhu, Liu, Han, deep leakage from gradients, NeurIPS 2019
  - abstract read
  - [preprint](https://arxiv.org/abs/1906.08935)
  - “it is possible to obtain the private training data from the publicly shared gradients”; “pixel-wise accurate for images”
  - inference: moving only updates is not a privacy guarantee; any federated proposal needs a stated threat model

part 7: telemedicine

- Crotty et al., clinician and patient factors in completing video visits, JAMA Network Open 2021
  - full text read
  - [paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC8569484/)
  - 75,947 patients, 137,846 scheduled video visits, one Midwest system, 2020; 90% completed as video, 10% fell back to phone
  - age 66 to 80 OR 0.28; low broadband area OR 0.85; clinician discomfort with technology OR 0.15
  - stated limitation: EHR-based outcomes “may underestimate actual technical problems”
  - inference: the measured failures are social and skill, and the technical ones are not even logged
- Patel et al., synchronized medical image presentation, Journal of Digital Imaging 2021
  - full text read
  - [paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC8691158/)
  - “full resolution images are loaded on each peer locally”; peers exchange viewer instructions over WebRTC instead of pixels
  - less delay, no compression error; one commercial comparison, small groups
  - novelty collision for any instruction-sync viewer; recovery after disconnect is not evaluated
- Friedman et al., randomized migraine telemedicine trial, Cephalalgia 2019
  - abstract read
  - [paper](https://doi.org/10.1177/0333102419868250)
  - “45 entered the study”; video follow-up feasible
- Yogendrakumar et al., mobile stroke unit telemedicine trial, NEJM Evidence 2026
  - abstract read
  - [paper](https://doi.org/10.1056/EVIDoa2500217)
  - “275 participants”; telemedicine won the combined endpoint while treatment decisions took longer
- inference across the four: telemedicine papers measure clinical outcomes; none measures the network or the software

proposal 1: find silent answer changes when records move

- question: which spec-valid differences between FHIR servers, exporters, and FHIR-to-OMOP converters change the answer a clinical query gives?
- why it fits the human's wants
  - easy sell: part 1 and part 2 show the problem is real, named by HL7 itself, and unmeasured
  - easy to implement: Synthea, HAPI, Microsoft FHIR server, GCP Healthcare API, and the OMOP tools are all free
- what exists and what is missing
  - exists: conformance tools (Walonoski 2018), a two-server manual comparison (mock.health 2026), single-database quality checks (Blacketer 2021), a speed benchmark (Gulden 2026)
  - missing: automatic query generation, a ground-truth oracle, more than two servers, export and conversion paths, and the effect on a downstream app
- method
  - generate patients with a pinned Synthea version and seed; the generator's own event log is the oracle
  - load the same bundles into 3 or more servers (HAPI, Microsoft, GCP, Firely, Blaze) and through bulk export and a FHIR-to-OMOP converter
  - generate queries automatically from the FHIR search grammar and from a small set of clinical questions (counts and dates of diagnoses, medicines, observations)
  - inject spec-valid variations: unit choice, time zone, daylight-saving instants, cancelled or draft status, duplicate identifiers, reordered events, partial dates, page boundaries, bundles over 4,500 entries
  - classify each divergence: rejected loudly, silently dropped, silently changed answer
- baselines
  - official validators; same-server round trip; a hand-written assertion list
- deliverable
  - a checker that reports the first query whose answer differs from the oracle, with a minimized record
  - a public table of server behaviors on each variation
- success: reproducible silent answer changes that validators miss, on more than one server
- failure: all divergences are schema errors the validators already catch, or are harness bugs
- known risk: FHIRTrustBench and HL7 test kits may cover some cases; read their actual tests first

proposal 2: localize infrastructure shift for deployed clinical models

- question: when a model built on the research warehouse runs on the live record feed, which pipeline step changes its inputs, and by how much?
- why it fits
  - Ötleş 2021 showed the gap is mostly plumbing, but measured it as one number
  - El Arab 2026 says monitoring is recommended everywhere and implemented almost nowhere
  - Wong 2021 shows the stakes
- method
  - build two data paths from the same synthetic or MIMIC-style source: a warehouse-style batch extract and a FHIR-feed-style incremental extract with realistic delays, late-arriving labs, and corrections
  - run a fixed model (e.g. an EHRSHOT task head or a sepsis-style score) on both
  - diff features per patient per time step; attribute each prediction change to a step: arrival delay, deduplication, unit normalization, code mapping, time zone
  - inject known shifts (code system change, new lab analyzer, DST) and check the attribution finds them
- baselines
  - overall drift detectors that report one number; manual review
- deliverable: a replay harness plus an attribution report that names the step
- success: attribution correct on injected shifts, and it finds unplanned ones on the real-style feed
- failure: the two paths are too similar on synthetic data, or shifts are all one trivial step
- note: this needs no patient data to start; a hospital partner would be the second phase

proposal 3: federated training under unequal hospital systems

- question: when hospitals differ in compute, link speed, and uptime, how do participation policies trade training time against accuracy at the hospitals they skip?
- why it fits
  - the 107-study review found no healthcare FL study considered system heterogeneity
  - the two benchmarks (Li 2024, Tertulino 2025) measure only statistics; Tertulino already shows small distinct sites lose
- method
  - synthetic or MIMIC-style records split into sites with chosen distributions
  - vary compute, bandwidth, and failure rate per site independently
  - compare synchronous FedAvg and FedProx, fastest-site selection, asynchronous updates, and equal participation
  - score per site, not on average; count rounds, bytes, wall-clock, and recovery after site failure
- success: a repeatable trade-off where faster policies hurt the slow or small sites, plus a policy that bounds it
- failure: effects vanish after equalizing update counts; a standard policy already does it
- caution: generic client selection is a crowded field; the contribution must be the hospital-shaped failure model and per-site scoring, measured with an existing framework (Flower or NVIDIA FLARE) as the review recommends

proposal 4: remote image viewers that recover to the same state (lower priority)

- question: after packet loss or reconnection, how long do two collaborators unknowingly see different slices or annotations?
- Patel 2021 already demonstrates instruction-only sync; the open part is recovery and conflict
- method: scripted edits, injected loss and duplication, measure disagreement time, lost edits, bandwidth; compare screen share, plain instruction sync, and sync with sequence numbers plus periodic full state
- lower priority because clinical value needs clinicians, and the systems part is close to ordinary collaborative-editing work

smaller leads not pursued

- time handling as a test target on its own: DST deletion (KFF 2018) plus OMOP's missing time zone suggests a focused time-semantics fuzz across FHIR servers and converters; folded into proposal 1
- bulk export completeness: Jones 2024 found Epic sites exported subsets; a completeness audit against the oracle is a cheap extension of proposal 1
- downtime telemetry: Larsen 2020 counts news stories because hospitals have no shared outage data; a hospital partner could make an outage study possible, but we cannot start it alone
- unresolved: a clinical serialization preprint at https://www.medrxiv.org/content/10.64898/2026.07.14.26358020v1 returned 403; nothing is claimed about it

gaps in this review

- not read in full: Jones 2024, Larsen 2019, Finlayson 2021, Sittig 2014, Knight's full report, EXAM, Nestor 2019, Ötleş 2021
- not searched: HL7 Inferno and Touchstone test contents, which decide proposal 1's novelty; vendor documentation on Epic's FHIR search behavior
- no ChatGPT opinion is in this file; the coordinating agent does that consultation last
