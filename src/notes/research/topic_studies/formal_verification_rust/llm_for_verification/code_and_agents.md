verified code generation, proof agents, and improvement loops
(authored by agents unless marked 🧑)

short version

- inference: the useful distinction is what the agent may change
  - proof-only work keeps executable code and public contracts fixed
  - code-and-proof work may replace an algorithm with something easier to prove
  - specification work changes the statement being proved
- claim: VeruSAGE proves 81% of 849 extracted systems-proof tasks
  - fact: dependency contracts remain available while their bodies are skipped
  - inference: this measures local proof recovery under supplied contracts
- inference: an elaborate agent workflow is not automatically better
  - VeruSAGE's strongest model works best with a general coding agent
  - VeriStruct's structured workflow wins on its small data-structure study
  - these are different populations, models, and editable artifacts
- inference: self-improvement now has four distinct forms
  - weights, verified examples, reusable written guidance, and workflow code
  - a higher verifier pass rate can still reward weaker specifications
- proposal: study jointly missing proofs and reusable invariants across a whole Verus module
- proposal: test whether learned guidance transfers to unseen projects without changing contracts or assumptions
- proposal: allow implementation redesign while independently enforcing functional and resource requirements

what the topic is

- a verifier checks a precise statement about a program
  - the statement may say what outputs mean or what memory accesses are allowed
  - an agent searches for code and proof steps that make this check succeed
- the difficult part differs by task
  - fixed code: find a proof
  - missing code: choose an implementation and find a proof
  - missing contract: decide what behavior must be proved
- a loop can improve one attempted proof or the machinery used for future proofs
  - these are different experiments
  - SO-RSI explicitly separates them

where the existing notes already answer the question

- [AutoVerus citation study](../../../autoverus_citations_20260801.md): fixed Rust code and specifications, generation and repair of Verus annotations
- [LeetProof](../../../leetproof_20260804.md): English to Lean specifications, Velvet implementations, and proofs for standalone problems
- [CryptoProver](../../../cryptoprover_20260807.md): integrated production-crate proof work under human public API contracts and runner-owned integrity checks
- [StarVerus](../../../starverus_20260809.md): Rust contract and proof generation with call-graph scheduling and an industrial case study
- [VeriSkill](../../../veriskill_20260803.md): learned written guidance, validation reuse, and weak evidence for broad transfer
- [Vero](../../../vero_20260821.md): whole-instance Lean evaluation and the tradeoff from implementation freedom
- [Proofs Promptly](../../../proofs_promptly_20260821.md): substantial F*/Pulse work with expert specification review and occasional invariant help
- [October frontier scan](../../../verus_frontier_20261006.md): SO-RSI discovery and deployment-boundary proposals
- [broader literature directions](../../../literature_directions.md): AlphaVerus, VeruSyn, KVerus, and repository-level retrieval
- [existing proposal](../../../new_work_arguments.md): assumption records tied to code changes
  - proposals below add matched reconstruction and transfer experiments
  - recording assumptions alone is already proposed there
- these links carry the earlier studies' evidence and caveats
  - the sections below add comparisons and papers not explained there

what existing work shows

retrieving context for fixed-code proofs

- [RagVerus: Repository-Level Program Verification with LLMs using Retrieval Augmented Generation](https://arxiv.org/abs/2502.05344v1)
  - fact: Zhong, Zhu, Tian, and Si, arXiv preprint, February 2025
  - fact: the opened version is v1
    - the [author repository](https://github.com/GouQi12138/RVBench) links a later paper through [ACM DOI](https://doi.org/10.1145/3759425.3763382)
    - its later full paper was opened from the existing collection
    - the next entry separates the expanded published benchmark from this preprint
  - fact: retrieves proof examples and dependency information from a repository
    - generates annotations for existing implementations and contracts
    - evaluated repository tasks are proof completion, not new implementations
  - claim: 75/383 tasks pass both correctness and edit-safety checks
    - baseline: 59/383
    - 19.6% versus 15.4%, Table 2
    - this is about 4.2 percentage points, not 27 percentage points
  - authors' scope, §5.2: “proof annotations are only erased for one function at a time”
  - inference: project-derived tasks do not establish autonomous reconstruction of a whole project's proofs
  - fact: retrieved same-project proofs are legitimate inputs in this setup
    - inference: the result should not be read as transfer without examples
  - fact: on 331 complex tasks, both refinement methods solve 52
    - inference: the overall gain comes from the simple subset

- [Towards Repository-Level Program Verification with Large Language Models](https://doi.org/10.1145/3759425.3763382)
  - fact: Zhong and Si, LMPL 2025, peer-reviewed workshop paper
  - fact: expanded published RAGVERUS study
    - RVBench contains 755 tasks from four Verus projects
    - the earlier preprint's 383 tasks are the VeriSMo subset
  - authors, §5.4.1: “our evaluation assesses proof completion per function”
  - claim: on IronKV, 27/129 tasks pass correctness and edit-integrity checks
    - versus 17/129 for refinement, Table 4
    - retrieving examples and dependencies helps in this setting
  - inference: cite this published version for the expanded benchmark
    - keep the preprint's different population and numbers explicit
  - [earlier coverage](../../../literature_directions.md)

- [VerusSeek: Enhancing LLM-Based Proof Synthesis for Rust Programs via Semantic Chunking and Hierarchical Context Expansion](https://doi.org/10.1007/978-3-032-30693-7_6)
  - fact: Zhang et al., TASE 2026, peer-reviewed proceedings chapter
  - fact: the full publisher text is already in the paper collection
  - fact: retrieves small proof constructs rather than whole files
    - expands surrounding context and generates structural loop invariants
    - executable implementations and intended proof tasks are given
  - claim: 122/150 VerusBench tasks with GPT-4o
    - AutoVerus: 69/150
    - RagVerus: 85/150
    - construct retrieval without invariant synthesis: 95/150
    - all numbers from the paper's Table 7
  - authors, Table 6 discussion: “verifying 122/150 tasks (81.3%)”
  - fact: the evaluation uses three independent restarts
    - inference: these numbers cannot be ranked against another paper's longer retry budget
  - inference: retrieval granularity matters on this mostly loop-based benchmark
    - it does not demonstrate the same gain on whole systems

systems proofs and module-wide contracts

- [VeruSAGE: A Study of Agent-Based Verification for Rust Systems](https://arxiv.org/abs/2512.18436)
  - fact: Yang, Neamtu, Hawblitzel, Lorch, and Lu
  - fact: first posted December 2025; opened local full text catalogued in 2026
    - preprint status used here; no proceedings acceptance checked
  - fact: 849 extracted proof tasks from eight systems
    - Anvil library and controller are counted separately in tables
    - this explains the paper's nine project groups
  - fact: compares a detailed planning-and-repair workflow with general coding agents
    - both receive verifier access and protected proof boundaries
    - general agents also receive the Verus standard library and cheat checker
  - claim: best model-agent pairing solves 81% of tasks
    - Sonnet 4.5 with the general agent, Table 5
    - average task time: 7.2 minutes, Table 6
  - authors, §3.1: “replace its body with unimplemented!() and tag it with verifier::external_body”
  - inference: helper contracts are supplied assumptions for the extracted target
    - rebuilding those helpers is a different task
    - these intentional benchmark assumptions are not agent-created bypasses
  - current [benchmark README](https://github.com/microsoft/verus-proof-synthesis/blob/main/benchmarks/VeruSAGE-Bench/README.md) adds 460 no-lemma tasks
    - quote, no-lemma variant: “The agent must invent the helper lemmas”
    - these tasks remove helper declarations entirely
    - inference: helper discovery alone is already a benchmarked task
    - the paper's 849-task score must not be assigned to this newer variant
  - fact: excludes permissioned unsafe APIs and state-machine macros
    - inference: the headline does not cover all hard Verus features
  - claim: structured support helps o4-mini and GPT-5
    - the general agent works better for Sonnet 4 and Sonnet 4.5
    - inference: compare agent designs under each model rather than assume one design wins universally
  - claim: combining models' general-agent successes reaches 82.3%
    - versus Sonnet 4.5's unrounded 80.9%, §5.5
    - inference: model diversity offers limited extra coverage in this experiment
  - fact: whole-project pilots remove proofs in one local file
    - three IronKV pilots succeed
    - one of two Atmosphere pilots exceeds an hour and the tool's token limit
    - inference: promising local scores do not remove repository search and build costs
  - fact: [artifact](https://github.com/microsoft/verus-proof-synthesis)
    - benchmark and implementation announced in the paper
    - experiments not reproduced here

- [VeriStruct: AI-assisted Automated Verification of Data-Structure Modules in Verus](https://arxiv.org/abs/2510.25015)
  - fact: Sun et al.; first posted October 2025
    - opened local full text catalogued in 2026
    - treated here as a preprint; acceptance not independently established
  - fact: supplied Rust implementations are augmented with abstractions, type invariants, contracts, and proofs
    - a planner schedules specialized generation and repair
    - tests constrain generated contracts
    - this is specification-and-proof generation for existing code
  - claim: completes 10/11 modules and 128/129 functions
    - simple iterative baseline: 4 modules, 52 functions
    - Claude Code with Sonnet 4.5: 8 modules, 102 functions
    - Table 2
  - authors, §6: “successfully solves 10 out of 11 benchmarks”
  - fact: main workflow uses o1-2024-12-17
    - inference: the Claude comparison changes model and workflow together
  - fact: examples contain 5–21 functions including test functions
    - eleven modules are modified versions of existing public examples
  - authors, §6: “more complete specifications, additional methods, and unit tests”
  - inference: module-wide planning is already prior work
    - the unfilled question is reliable transfer and independent contract adequacy at larger scale
  - fact: [artifact](https://github.com/ChuyueSun/VeriStruct)

- [KVerus: Scalable and Resilient Formal Verification Proof Generation for Rust Code](https://arxiv.org/abs/2605.03822v2)
  - fact: Liu et al., opened August 2026 v2
    - arXiv comments report ASE 2026 acceptance
    - proceedings version not opened in this pass
  - fact: combines dependency context, semantic lemma retrieval, toolchain knowledge, and error-guided repair
    - human review is part of production integration
  - claim: 183/359 repository-derived targets solved, 51.0%
    - baseline: 16/359, 4.5%, Table 1
    - MathSpec-Bench 81/104, allocator 50/89, CortenMM 52/166
  - authors, evaluation setup: “report the union of results across repetitions”
    - fact: three repetitions, Claude Sonnet 4.0, at most ten refinement queries
    - inference: 51.0% is cumulative coverage, not one-run expected success
  - authors, benchmark setup: “keeping shared lemmas intact”
    - context: existing target proofs are removed
    - inference: jointly rebuilding missing shared lemmas remains a different experiment
  - claim: production patches verify 23 previously unverified CortenMM functions and introduce 6 reusable lemmas
    - accepted upstream according to the abstract
    - inference: generating reusable lemmas is already demonstrated
  - fact: human reviewers assess specification suitability and proof maintainability, §3.5
  - fact: §4.4 and Table 5 evaluate Verus releases 20250328, 20250630, and 20250813
    - version-matched knowledge and error repair are already part of KVerus
    - inference: verifier-version resilience alone is not a new proposal
  - [earlier coverage](../../../literature_directions.md)

new implementations and proof-aware search

- [AlphaVerus: Bootstrapping Formally Verified Code Generation through Self-Improving Translation and Treefinement](https://arxiv.org/abs/2412.06176)
  - fact: Aggarwal, Parno, and Welleck, ICML 2025, peer reviewed
  - fact: translates Dafny examples to Verus
    - searches a tree of repairs using verifier feedback
    - retained examples improve subsequent prompts without changing model weights
  - fact: evaluates both proof annotation and new code generation
  - claim: code-generation pass@256 is 32.9% on its HumanEval variant and 65.7% on its MBPP variant
    - original Llama 3.1 70B: 11.8% and 26.9%, Table 1
    - pass@256 means at least one accepted candidate within that sampling budget
  - fact: HumanEval evaluation is 85 functions derived from 49 programs
    - MBPP evaluation is 78 programs
    - these are verified subsets, not the full original benchmarks
  - authors, introduction: “the one part of the pipeline that lacks formal guarantees”
    - context: critique models judge whether translated specifications and programs match the source
  - inference: correct target proofs do not prove that Dafny-to-Verus translation preserves intent
  - fact: [artifact](https://alphaverus.github.io/)

- [P3: joint program-and-proof planning](https://arxiv.org/abs/2608.09277v1)
  - use the existing [P3 evidence audit](../../../p3_joint_planning_20260813.md)
  - source scope: supplied Lean specifications, generated implementations and proofs
  - the audit compares joint planning, implementation-only planning, and sequential planning
  - exact audit judgment: “joint planning is a credible workflow contribution”
  - inference: joint planning is already a direct baseline for proof-friendly implementation search
    - its optional algorithm or complexity instructions also constrain redesign

- [Inductive Deductive Synthesis: Enabling AI to Generate Formally Verified Systems](https://arxiv.org/abs/2605.23109v1)
  - fact: Agarwal, Krentsel, Liu, et al., May 22, 2026 arXiv preprint
  - primary identity resolved through the [authors' repository](https://github.com/skydiscover-ai/skydiscover)
    - existing collection extraction preserved
    - versioned PDF, text, and provenance added
  - fact: jointly constructs Rocq implementations and proofs for supplied consistency specifications
    - temporary proof holes are allowed during search and must be closed at acceptance
    - final candidates are extracted to OCaml and measured on a five-VM runtime
  - author claim: completes seven specifications under a three-run criterion
    - Table 1 counts success when at least two of three runs succeed
    - the 6.8-hour and $106 headlines aggregate per-specification medians
    - abstract: “7/7 in about 6.8 hours and $106 per spec”
    - the seven include a published Chapar specification and six author-supplied specifications
  - fact: performance measurements guide further search
    - abstract: “performance feedback into the same loop”
  - author limitation: fixed formal specifications remain an expert input
    - §6: “requires a formal Rocq specification as input”
  - inference: code/proof co-synthesis with performance feedback is already demonstrated
    - a new Rust study needs a more precise distinction
    - measured throughput is not a formal resource-bound proof
    - the paper's expert-speedup estimate is not a controlled expert baseline

- existing code-and-proof results need resource requirements
  - fact: the [Vero note](../../../vero_20260821.md) documents agent simplifications that retain formal behavior while sacrificing efficiency
  - fact: [LeetProof](../../../leetproof_20260804.md) already occupies staged code-and-proof synthesis
  - inference: another synthesis pipeline needs a narrower contribution
    - resource-preserving implementation redesign is one candidate
    - novelty must be checked against the broader synthesis literature

what exactly improves in self-improvement

- [Automated Proof Generation for Rust Code via Self-Evolution](https://arxiv.org/abs/2410.15756)
  - fact: Chen et al., SAFE, ICLR 2025, peer reviewed
  - fact: synthesizes Rust examples, specifications, and checked proofs
    - fine-tunes models on successes and failed-proof repair examples
    - changes model weights
  - claim: Llama 3.1 SAFE+ reaches 52.52% at Accuracy@2 on VerusBench
    - raw GPT-4o: 14.39%
    - prompted GPT-4o: 30.93%, Table 1
    - retaining only the raw baseline exaggerates the practical gain
  - authors, Table 1: “one initial proof sample and one debugging sample”
    - context: definition of Accuracy@2
  - fact: CodeNet test contracts are generated and filtered by the system
    - inference: that score combines proof capability with the quality and strength of generated statements
  - inference: verifier filtering is reliable for a frozen statement
    - it cannot independently certify that generated statements express the intended task

- [Reducing the Costs of Proof Synthesis on Rust Systems by Scaling Up a Seed Training Set](https://arxiv.org/abs/2602.04910v3)
  - fact: Di et al., VeruSyn, opened May 2026 v3 preprint
  - fact: synthetic verified programs and agent trajectories fine-tune Qwen2.5-Coder-32B-Instruct
  - authors, abstract: “6.9 million Rust programs”
    - context: each has a specification and proof
  - claim: 49% Accuracy@600 with debugging on 560 VeruSAGE tasks
    - direct prompting of Sonnet 4.5: 54%, Table 1
    - claimed average inference spending: $0.61 versus $39.24 per task, Table 2
    - training and data-generation expense is not included in this per-task comparison
  - authors, §5.2: “does not involve any coding agent”
    - inference: these scores are not comparable to VeruSAGE's 81% agent score
  - fact: 47 over-context tasks count as failures rather than vanish from the denominator
  - inference: cheaper proof models are already a substantial research direction
    - a useful extension tests them inside controlled agents and on project-separated tasks
  - [earlier coverage](../../../literature_directions.md)

- [Second-Order Problem Solving for Recursive Self-Improvement in Formal Verification](https://arxiv.org/abs/2610.05701v1)
  - fact: Jiang, Vempaty, and Jagmohan, October 5, 2026 arXiv preprint
  - fact: SO-RSI changes workflow code, not model weights
    - the inner loop repairs one candidate
    - the outer loop changes retrieval, extraction, repair, and retry machinery
  - fact: recurring failures, opposing edits, or outcomes contradicting predictions trigger investigation
    - the system runs diagnostic checks and remembers their evidence
    - development tasks select edits
  - claim: held-out Verus code-generation pass rate is 59.2 ± 3.7%
    - naive workflow improvement: 33.4 ± 5.2%
    - seed: 14.8%, Table 3
    - mean and standard deviation over three outer runs
  - fact: 113 development and 46 held-out hard VeriContest problems
    - Lean uses 92 development and 48 held-out problems
    - outer optimization budget: 24 hours per run
  - authors, §5.2: “test outcomes never guide optimization”
  - fact: one outer optimizer model is evaluated
  - authors, limitations: “generalization to other models and workflows remains an open question”
  - inference: this is evidence for diagnosing machinery failures
    - neither proof of recursive intelligence growth nor evidence that generated specifications match intent
  - inference: explanation testing is more informative than an agent's plausible failure story
    - an extractor dropping a definition and a model failing to write it require different repairs
  - [earlier discovery note](../../../verus_frontier_20261006.md)

- [VeriSkill](../../../veriskill_20260803.md) improves persistent written guidance
  - inference: classify it separately from SAFE weights, AlphaVerus examples, and SO-RSI workflow code
  - inference: compare these forms under one fixed model, checker, budget, and held-out project set
    - a pass-rate comparison across their existing papers would mix too many conditions
  - KVerus already evaluates resilience to verifier updates
    - the proposed extension is learned-guidance transfer with sealed claim boundaries

an adjacent paper whose name can mislead

- [VeriCoder: Enhancing LLM-Based RTL Code Generation through Functional Correctness Validation](https://arxiv.org/abs/2504.15659v2)
  - fact: Wei et al., opened August 2025 v2 preprint
    - later acceptance not checked
  - fact: generates hardware descriptions and unit tests
    - uses simulation feedback to revise designs and sometimes tests
    - fine-tunes on 125,777 examples
  - claim: relative gains up to 71.7% on VerilogEval and 27.4% on RTLLM, abstract
  - authors, abstract: “unit test generation with feedback-directed refinement”
  - inference: this is test-validated RTL generation
    - it is not evidence of machine-checked mathematical proofs
    - jointly generated tests and code share a possible misunderstanding of requirements
  - fact: [author artifact](https://github.com/Anjiang-Wei/VeriCoder)

what the evidence leaves unresolved

- whole-module recovery under jointly missing helper proofs
  - VeruSAGE supplies helper contracts and skips helper bodies
  - RagVerus erases one function at a time
  - KVerus keeps shared lemmas intact while evaluating missing target proofs
  - VeriStruct and CryptoProver already tackle multiple functions
    - inference: the gap is a matched, broad reconstruction study with sealed boundaries
    - not a claim that nobody has verified multiple functions
- improvement that survives a new project and a changed verifier
  - SO-RSI evaluates two domains and one outer optimizer
  - VeriSkill's existing note documents small repeatedly queried validation sets
  - inference: evidence for project-separated, budget-accounted transfer remains weak in these sources
- resource-preserving code-and-proof generation
  - AlphaVerus evaluates verified algorithmic subsets
  - Vero records simpler proof-friendly implementations
  - inference: functional contracts alone leave engineering costs unspecified
- clear ownership of assumptions during agent editing
  - extracted helper assumptions are acceptable only within the announced task
  - newly inserted proof bypasses change the claim
  - inference: graders should freeze the intended boundary and report both kinds separately

research implications

- [combined research directions](research_directions.md) contain the full experimental designs and budget estimates
- candidate 1 should compare isolated versus jointly removed helper proofs
  - restore every dependent proof needed for the module
  - KVerus, CryptoProver, VeriStruct, P3, IDS, and Vero are direct baselines
  - larger modules alone are weak novelty
- candidate 3 should compare examples, written lessons, and workflow edits
  - include all improvement spending
  - hold out related projects and changed contracts
  - KVerus already covers toolchain-release adaptation
- a separate synthesis question is whether proof-friendly redesign preserves resource requirements
  - builds on AlphaVerus, P3, LeetProof, Vero, and IDS
  - IDS already optimizes measured performance
  - proposed distinction: independently fixed and checked resource bounds
  - see the combined note for feasibility and stop conditions

ChatGPT's opinion

- see [research directions](research_directions.md) for the shared Extra High consultation
  - no ChatGPT opinion is invented here

what was searched and opened

- twelve main primary papers opened in this pass
  - RagVerus v1, VerusSeek publisher chapter, VeruSAGE local full text, VeriStruct local full text
  - AlphaVerus ICML full text, SAFE ICLR full text, SO-RSI v1, VeriCoder v2
  - published RAGVERUS LMPL text, KVerus v2, VeruSyn v3
- existing notes read before synthesis
  - AutoVerus citations, LeetProof, CryptoProver, StarVerus, VeriSkill, Vero, Proofs Promptly, and October frontier scan
- discovery queries
  - local collection filenames for the named systems
  - arXiv API queries for VeriCoder and RagVerus
    - rate limited with HTTP 429
  - web-tool query for VeriCoder
    - failed with HTTP 404
  - GitHub repository search for VeriCoder and RagVerus
    - author READMEs resolved their paper identifiers and artifacts
  - direct arXiv abstract, HTML, and PDF requests succeeded
- new collection entries
  - RagVerus v1, VeriCoder v2, and VeruSyn v3 PDFs, extracted text, and arXiv metadata
  - collection root: `/hdd1/sichanghe/paper_collection`
- limits
  - reported results are author claims, not reproduced experiments
  - later publication records are not comprehensively refreshed
  - no exhaustive novelty search for resource-bounded synthesis or proof-aware optimization
  - Lean/Rocq/Isabelle proof-search methods and benchmark integrity have separate sibling studies
