specialized agents: make the domain executable 🤖

bottom line

- inference: JARVIS is best read as evidence for a specialized system, not evidence that adding agent personas is generally sufficient
  - the useful stack is domain data, a structured domain model, narrow tools, actionable checks, bounded repair, and abstention
  - the paper does not isolate a causal benefit from multiple agents versus one controller running the same pipeline
- inference: specialize around known failure modes
  - use training or retrieval for missing domain facts
  - use deterministic rules for explicit constraints
  - use parsers, compilers, tests, or simulators for machine-checkable behavior
  - let an LLM decide only where judgment is still necessary
- recommendation: the next experiment should compare one controller, a fixed workflow, and role-separated agents under the same model, tools, token budget, and wall-clock budget

primary paper

- fact: [JARVIS: A Multi-Agent Code Assistant for High-Quality EDA Script Generation](https://arxiv.org/abs/2505.14978) is an NVIDIA arXiv preprint
  - current primary version: v2, revised 2025-08-15
  - first submission: 2025-05-20
  - authors: Ghasem Pasandi, Kishor Kunal, Varun Tej, Kunjal Shah, Hanfei Sun, Sumit Jain, Chunhui Li, Chenhui Deng, Teodor-Dumitru Ene, Haoxing Ren, and Sreedhar Pratty
  - the arXiv record lists no peer-reviewed venue, journal reference, or external publication DOI as of 2026-08-03
- author claim: the system generates scripts for a private, high-use Electronic Design Automation tool more accurately and reliably than the tested domain and general models
  - scope: one internal object-oriented Python interface for chip-design workflows
  - broader claims about other specialized engineering domains are proposed implications, not tested results

what JARVIS built

- fact: the starting generator is ChipNeMo, a model continued-pretrained and supervised-fine-tuned on chip-design data
  - the earlier manual supervised set had 150 question-and-answer pairs
  - JARVIS adds 35,000 synthetic examples
  - a symbolic generator walks an API graph, builds valid abstract syntax trees, and emits code
  - Nemotron 340B adds comments and questions after the structure exists
  - inference: use a trusted generator for domain validity and an LLM for language variation instead of asking an LLM to invent both
- fact: the online flow separates error classes
  - a top ReAct agent coordinates the loop
  - RuleEnforce retrieves ten relevant constraints from manual and automatically extracted rules
  - a custom compiler checks whether APIs exist and whether object-attribute relationships are valid
  - hybrid BM25 and FAISS retrieval supplies documentation and short code snippets
  - a small fixing agent repairs lines using local intent and retrieved examples
  - a guardrail checks structural validity and compares a reconstructed question with the original request before either returning or withholding code
- fact: the loop has time and iteration bounds, then carries a progress summary into another episode
  - the authors motivate this with ReAct's [“tendency to trap into infinite or repeated loops”](https://arxiv.org/pdf/2505.14978v2)
  - the paper does not report the actual limits, episode counts, latency, or inference cost

reported evidence

- fact: the authors created three private test sets
  - easy: 150 API questions, evaluated by desired-API string matching
  - medium: 30 questions with two or three reasoning stages, evaluated by humans
  - hard: 20 questions with multiple reasoning stages, evaluated by humans
  - all reported results use temperature zero and are labeled pass at one
- fact: adding structured synthetic data to domain-adaptive pretraining and supervised fine-tuning changed easy, medium, and hard scores from 46, 56, and 36 percent to 67, 62, and 43 percent
- fact: the full flow reports 92, 93, and 81 percent on easy, medium, and hard
  - replacing the domain-trained start with LLaMA 3.1 reports 53, 43, and 30 percent
  - the paper's own phrase is [“a good starting point is essential”](https://arxiv.org/pdf/2505.14978v2)
- fact: component ablations suggest different tools solve different problems
  - without RuleEnforce: 89, 84, and 56 percent
  - without retrieval: 73, 79, and 80 percent
  - without the fixing agent: 90, 93, and 75 percent
  - inference: retrieval mainly supplies easy and medium API knowledge, while explicit cross-object rules matter most on hard tasks

evidence limits

- fact: the paper has no limitations section and releases no benchmark, training data, code, complete run prompts, model checkpoints, or evaluation rubric
- uncertainty: training, rule-extraction, retrieval, and evaluation splits are not documented
  - automatically extracted rules use questions and golden code, but the paper does not say whether those examples are disjoint from the test sets
  - Table I labels its 68-percent row as supervised fine-tuning only, while the adjacent prose calls it domain-adaptive pretraining only
- uncertainty: the medium and hard human evaluation omits rater count, scoring scale, blinding, agreement, and adjudication
  - some reported percentages cannot be reconstructed as binary pass rates over 30 or 20 items without an unstated averaging or scoring rule
- uncertainty: one easy-task API string match does not establish functional correctness
  - the guardrail's functional check is another model comparison, not execution against an independent semantic oracle
- uncertainty: model sizes and exact snapshots are incomplete, and full-flow baselines use unequal inference and tools
  - no repeated trials, confidence intervals, matched cost, latency, or error bars are reported
- inference: the ablations establish that the complete package helped on these internal tasks
  - they do not establish that role separation helped, that the system generalizes to a new tool, or that the reported gain is reproducible

related evidence and scope

- closest accepted predecessor: [ChatEDA, IEEE TCAD 2024](https://doi.org/10.1109/TCAD.2024.3383347)
  - a fine-tuned Llama 2 controller decomposes tasks, generates scripts, and calls a simplified OpenROAD interface
  - on 50 released tasks, executable scripts and blinded expert judgment gave AutoMage2 grade A on 82 percent versus 62 percent for GPT-4
  - explicit limits include bespoke documentation per tool, slow decoding, and no automated scoring package for the benchmark
  - source phrase: [“lacks universal applicability to diverse API documents”](https://arxiv.org/pdf/2308.10204v4)
  - inference: this is stronger external evidence that domain tuning can help EDA scripting, but it still does not test multi-agent role separation
- direct predecessor: [ChipNeMo](https://arxiv.org/abs/2311.00176) is an arXiv preprint on the same private chip-design setting
  - eight of JARVIS's eleven authors also appear on ChipNeMo
  - its Python-script benchmark sizes are close to JARVIS's, so it is predecessor evidence rather than an independent replication
  - it reports that domain-adaptive pretraining drove the largest gains and that retrieval helped simple API tasks but degraded its hard script result
  - source phrase: [“retrieval still struggles significantly on some real situations”](https://arxiv.org/pdf/2311.00176v5)
- accepted foundation: [Don't Stop Pretraining, ACL 2020](https://aclanthology.org/2020.acl-main.740/)
  - domain-adaptive continued pretraining improved eight classification tasks across four text domains
  - scope limit: this supports domain adaptation, not code agents, multi-agent organization, or JARVIS's synthetic-data method
  - source phrase: [“a second phase of pretraining in-domain ... leads to performance gains”](https://aclanthology.org/2020.acl-main.740.pdf)
- accepted foundation: [ReAct, ICLR 2023](https://openreview.net/forum?id=WE_vluYUL-X)
  - interleaves reasoning traces and environment actions
  - JARVIS adds explicit termination and episode summaries, but provides no controlled test of that modification
  - source phrase: [“reasoning traces help the model induce, track, and update action plans”](https://arxiv.org/pdf/2210.03629v3)
- accepted comparison: [LEVER, ICML 2023](https://proceedings.mlr.press/v202/ni23b.html)
  - execution results plus a separately trained verifier improved selection on four language-to-code tasks
  - its stated limits include unsafe generated code and the need for adequate execution context
  - inference: specialized agents should prefer independent behavioral evidence over another LLM's confidence
  - source phrase: [“program execution results are crucial for verification”](https://proceedings.mlr.press/v202/ni23b/ni23b.pdf)
- accepted comparison: [CodeAgent, ACL 2024](https://aclanthology.org/2024.acl-long.737/)
  - five programming tools improved pass at one by 2.0 to 15.8 points on its 101-task repository benchmark
  - its fixed rule-based tool order beat ReAct for every reported model where both were tested
  - scope limit: its benchmark is small, and the paper flags contamination and manual commercial-product comparisons
  - source phrase: [“comparison with commercial products is not rigorous”](https://aclanthology.org/2024.acl-long.737.pdf)
- accepted comparison: [SWE-agent, NeurIPS 2024](https://proceedings.neurips.cc/paper_files/paper/2024/hash/5a7c947568c1b1328ccc5230172e1e7c-Abstract-Conference.html)
  - a purpose-built agent-computer interface improved GPT-4 over a shell-only baseline by 64 percent relative
  - inference: tool representation can change results independently of model intelligence or team size
  - source phrase: [“interface design affects the performance of language model agents”](https://proceedings.neurips.cc/paper_files/paper/2024/file/5a7c947568c1b1328ccc5230172e1e7c-Paper-Conference.pdf)
- accepted caution: [MultiAgentBench, ACL 2025](https://aclanthology.org/2025.acl-long.421/)
  - more agents or communication iterations eventually reduced several task metrics
  - unmatched compute and synthetic scenarios prevent a general claim that teams help or hurt
  - source phrase: [“further increases may introduce additional coordination challenges”](https://aclanthology.org/2025.acl-long.421.pdf)

general design lessons

- inference: build the domain substrate before defining agent roles
  - encode legal objects, actions, relationships, invariants, and evidence as machine-readable structures
  - expose small tools with typed inputs, bounded outputs, and explicit failure states
- inference: make every check return a repair hint
  - a compiler path from an invalid object to a valid attribute is more useful than a generic low score
  - keep the checker independent of the generator where practical
- inference: prefer a fixed workflow when the correct sequence is known
  - use an agent for routing, diagnosis, or ambiguity, not for deterministic formatting and validation
- inference: start quality and scaffold quality are complements
  - JARVIS's general model plus tools remained far below its domain model plus tools
  - specialization should combine model knowledge with external, updateable knowledge and checks
- inference: abstention is part of correctness
  - a delivery gate should withhold outputs when independent checks fail
  - measure coverage, false acceptance, false rejection, and repair success separately
- recommendation: evaluate on fresh task families from a different tool version or API subtree
  - publish an auditable subset, rubric, prompts, model snapshots, budgets, seeds, and per-item outcomes
  - compare fixed workflow, one-agent repair, role-separated agents, and best-of-n under equal total compute
  - report repeated-run reliability, cost, latency, human intervention, and irreversible errors

Google Scholar discovery record

- fact: the dedicated PB browser reached Google Scholar on 2026-08-03, but Scholar returned its “Please show you're not a robot” challenge
  - `2505.14978` exposed a 9-results header before the challenge
  - `JARVIS multi-agent EDA specialized code generation` exposed an about-43-results header before the same challenge
  - an exact-title attempt returned the search form without retaining the query
  - no challenge was bypassed and no Scholar result was treated as evidence
  - related work was resolved from JARVIS's references, Crossref metadata, and official arXiv, ACL, ICML, ICLR, NeurIPS, and paper pages

local artifacts

- [paper-collection source map](</hdd1/sichanghe/paper_collection/Specialized agent systems - source map, 2026-08-03.md>)
  - added PDFs and same-stem Marker extractions: JARVIS, ChatEDA, ChipNeMo, Don't Stop Pretraining, ReAct, LEVER, and ToolLLM
  - reused existing collection artifacts: SWE-agent and ScribeAgent
  - the source map records official sources, status, scope, local paths, byte counts, page counts, and SHA-256 checksums
