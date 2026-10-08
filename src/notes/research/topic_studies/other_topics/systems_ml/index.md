ML systems, healthcare, static analysis, and software complexity
(authored by agents unless marked 🧑)

start here

- purpose: find research a systems researcher can test with available tools and data
- original review 2026-10-07 UTC; completion and source checks 2026-10-08 UTC
- proposals are agent recommendations
    - novelty and publication potential remain uncertain
    - no proposed experiment has been run as part of this study
- source records distinguish full-paper reading from abstract or documentation reading

recommended first experiments

- [resumed genomic workflows versus clean runs](healthcare_bio_workflows.md)
    - use public inputs and compare scientific answers against declared expectations
    - continue only if strongest existing cache controls miss reproducible failures
- [checked removal of obsolete code or dependencies](software_complexity_causes_cures.md)
    - measure the cost of a later correct change
    - fewer lines or warnings alone do not establish improvement
    - timed dead-code trials and CodeThread already evaluate later work
- [checked bug evidence across repository changes](static_analysis_with_llms.md)
    - compare full regeneration with dependency-aware reuse
    - preserve clean conclusions and detect newly reachable bugs as well as old warnings
    - classical incremental analysis already establishes sound reuse and fresh-run consistency under its models
- [checked numerical reproducibility across inference changes](llm_inference_systems.md)
    - identify a precise gap beyond TBIK and Vosti before proof engineering
    - cross-TP measurement needs several GPUs; access is unconfirmed
    - generic agent-serving routing remains lower priority after the earlier consultation identified Continuum
- these priorities are agent opinions based on access and falsifiability
    - significance, novelty, and publication prospects are unconfirmed
    - hardware access and clinical partners were not assumed

machine learning systems

- human starting point: [WaferLLM notes](../../../mlsys.md)
- [LLM inference, serving, and hardware](llm_inference_systems.md)
- [agent systems, training, and ML for systems](agent_and_ml_for_systems.md)
- [asynchronous MoE serving, StreamEP, and buffer lifetime](asynchronous_moe_serving.md)

healthcare

- human starting point: [healthcare topics](../../../healthcare.md)
- [clinical data, care delivery, and federated learning](healthcare_clinical_systems.md)
- [biology, genomics, and workflow systems](healthcare_bio_workflows.md)
- [cholesterol, diet, and evidence reconciliation](cholesterol_diet_evidence.md)
    - attribution-limited extension from the earlier worker
    - compares study populations, interventions, endpoints, and missing data

static analysis

- human starting point: [static-analysis notes](../../../static_analysis.md)
- [LLMs combined with static analysis](static_analysis_with_llms.md)
- [classical and incremental static analysis](static_analysis_classical.md)
- practical formal verification and Rust belong to the sibling study

software complexity

- 🧑 human question: “how to avoid the monotonic growth of software complexity”
    - from [research topics](../../../index.md)
- [causes and interventions](software_complexity_causes_cures.md)
- [measurement and empirical evidence](software_complexity_measurement.md)

reading and review limits

- each review records source versions, access levels, author claims, and proposed experiments
- source discovery used publisher and conference pages, author PDFs, and an alternate search connector
    - the default web-search endpoint failed
    - search results sometimes exposed outdated paper versions
- an independent reviewer assessed all eight reviews and this index
    - source verification was selective, not exhaustive
    - fixes included transformation-specific expected answers and tracking no-warning analysis conclusions
- full reproduction of paper results and proposed pilots remains future work

external consultation

- [ChatGPT opinion and checked follow-ups](consultation.md)
    - browser helper verified Extra High before the successful submission
    - earlier consultation favored workflow testing and found Continuum as a close scheduling baseline
    - [successful cross-topic follow-up](../more_topics/chatgpt_review.md) identifies additional primary-work constraints
- continuation and independent reviews used Codex agents
    - the prior Claude worker had stopped at its usage limit
    - the requested Opus/Fable combination was unavailable through this session's delegation tools
