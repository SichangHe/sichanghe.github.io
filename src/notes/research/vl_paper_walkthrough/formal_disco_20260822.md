# Formal Disco: open-ended verified-program generation

(authored by agents unless marked 🧑)

- paper
  - Gabriel Poesia, Simon Henniger, Tzu-Han Hsu, Yilun Du, and Nada Amin
  - *Formal Disco: Scalable Open-Ended Generation of Formally Verified Programs*
  - arXiv `2607.04631v1`, submitted 2026-07-06
  - archival record: <https://arxiv.org/abs/2607.04631v1>
  - full text: <https://arxiv.org/pdf/2607.04631v1>
  - code: <https://github.com/metareflection/formal-disco>
  - datasets: <https://huggingface.co/collections/metareflection/formal-disco>

## decision

- walkthrough rank: first of the 23 accepted canonical papers
  - it directly targets VL's central scaling constraint
    - scarce verifier-checked Verus training data
    - expensive frontier-model proof generation
    - narrow diversity in self-generated proof corpora
  - it reports both a scalable production loop and a trained Verus capability
  - most other candidates address one adjacent layer
    - benchmarks
    - language foundations
    - one verification domain
    - repository retrieval or migration
  - prior completed studies already cover CryptoProver and repository-level RAG-Verus
  - no active study owner was recorded for canonical discovery
    `vpsd_c678c7ff1a09998c79f7ed70caba49f88fdd38efd93d9db9bdd44b248b420b31`
- confidence: high on identity and reported results, medium on generality
  - identity and bytes match the arXiv v1 archival record
  - the record is a preprint with no venue or peer-review claim
  - results are author-reported and were not independently reproduced here

## evidence boundary

- abstract-level screening established only that the work generates verified
  programs in Dafny, Verus, and Frama-C
- this walkthrough is based on the complete 46-page v1 paper
  - main method and objective in sections 3.1 through 3.3
  - system and empirical evidence in sections 4.1 through 4.4
  - limitations in section 5
  - hyperparameters, qualitative examples, implementation details, features,
    and prompts in appendices A through E
- no VL experiment or reproduction was run
- claims below are paper claims unless labeled inference or recommendation

## direct answer

- what it does
  - coordinates three asynchronous LLM workers around a shared agenda
    - an initiator sketches a small verified program from a random repository
      README and up to two language-documentation snippets
    - a fixer patches compilation or verification failures for at most three
      attempts
    - an extender grows a passing program and sends failures back for repair
  - records prompts, outputs, outcomes, program ancestry, and verifier feedback
  - bootstraps an open Qwen 2.5-Coder 32B model from Claude-generated traces
  - iteratively fine-tunes only successful traces whose programs contribute most
    to chosen diversity measures
  - uses compiler and verifier acceptance as the scalable correctness filter
- central idea
  - raw corpus size is insufficient because duplicated or trivial programs can
    be arbitrarily numerous
  - the paper instead maximizes Shannon entropy over selected program features
    - annotation counts
    - lemma-body sizes
    - method-body sizes
    - loop skeletons
  - each training round retains the paper's quoted `top 1/3 successful examples`
    ranked by minimum surprisal rank
- why the architecture matters
  - incremental initiate-repair-extend work reaches larger verified programs
    than one-shot generation
  - external README themes reduce topic collapse
  - documentation snippets expose rare language features
  - verifier feedback supplies a deterministic signal at much larger scale than
    human review

## full-paper results

- worker scaling, section 4.1
  - Claude initiation succeeds 11 percent of the time for Verus
  - Claude extension succeeds above 40 percent in both evaluated languages
  - after five self-improvement iterations, Qwen matches or exceeds the seed
    Claude workers across the reported worker tasks and languages
- diversity, section 4.2
  - entropy rises across iterations for all four optimized features and all
    three languages, with one reported exception
    - Verus lemma-body-size entropy remains below the Claude seed corpus at
      iteration five
  - the final Qwen Verus corpus contains a 105-line verified lemma versus an
    86-line maximum in the Claude seed corpus
  - Formal Disco leads compared Verus corpora on three of four sampled feature
    views only up to their respective sample lengths
  - VeruSAGE remains most diverse for Verus loop skeletons
- downstream Verus annotation, section 4.3
  - evaluation set: 149 filtered VerusBench programs
  - Qwen 2.5-Coder 32B base pass@1: 8.7 percent
  - the Formal-Disco-trained model pass@1: 43.0 percent
  - reported Claude 4.5 Opus pass@1: 43.0 percent
  - the SAFE-trained comparison pass@1: 40.9 percent
  - at pass@32, Formal Disco reaches 59.1 percent while SAFE plateaus at 51
    percent from pass@16 onward
- ablations, section 4.4
  - three workers yield verified programs on 29.8 percent of LLM calls versus
    23.0 percent for the monolithic agent in the Dafny ablation
  - the iterative system averages 268 lines per program versus 85 for the
    monolithic agent
  - removing README seeds lowers subject-word entropy from 8.1 to 5.9 bits at
    the matched sample size and lowers yield from 23.0 to 12.8 percent
  - removing documentation snippets leaves four of 30 tracked Dafny features
    unseen

## what was already done

- SAFE identified multi-level Verus data scarcity and synthesized about 20,000
  programs from Python and Rust seed tasks
- VeruSyn expanded SAFE with tutorial-driven Verus feature coverage and reports
  a much larger corpus
- Dafny work includes ATLAS, DafnySynth, and DafnyBench
- theorem-proving systems already use proof checking to filter large synthetic
  corpora
  - AlphaGeometry
  - DeepSeek-Prover
  - Goedel-Prover
- Formal Disco's incremental contribution
  - one language-agnostic agenda and worker loop across three auto-active tools
  - joint open-ended generation of specifications, implementations, and proofs
  - explicit measurement and optimization of corpus diversity
  - downstream Verus evidence on human-written benchmark programs
- scope boundary
  - this paper does not claim the first synthetic Verus data
  - it does not establish repository-level autonomous verification
  - it does not establish that generated specifications express human intent

## what VL should learn

- treat verified traces as compounding product data
  - retain task input, model output, patches, verifier diagnostics, attempt
    outcome, program ancestry, cost, and toolchain identity
  - distinguish passing attempts from training-worthy attempts
- make diversity a first-class selection objective
  - track coverage of Verus language features, proof patterns, dependency shapes,
    failure classes, specification structures, and repository domains
  - compare corpora at matched sample sizes instead of citing only raw counts
  - preserve rare successes during training and retrieval
- separate roles around a mechanically owned state machine
  - sketch a bounded seed
  - repair against fresh verifier output
  - extend only a known passing checkpoint
  - reverify after every accepted transition
- inject grounded external entropy
  - use real repository requirements, APIs, issue histories, and Verus reference
    fragments
  - do not let the model invent all tasks from its own prior outputs
- preserve VL's repository-level differentiator
  - add dependency-aware and change-aware features beyond single-program syntax
  - measure specification adequacy, executable fidelity, whole-repository build,
    proof maintenance under change, and integration regressions
  - keep the runner, not the model, responsible for acceptance

## recommended integration

- immediate, no experiment authorized by this note
  - add a corpus-quality specification for future VL data work
    - verifier pass is necessary but not sufficient
    - define explicit coverage and diversity features before generation
    - record distributions and rarefaction curves per iteration
  - add a durable trace schema to the VL design
    - immutable input and toolchain identity
    - patch lineage and verifier response
    - specification origin and trust boundary
    - repository and dependency context
    - deterministic acceptance reason
  - define training eligibility as a conjunction
    - verifies under the intended toolchain
    - satisfies anti-cheat and trust-boundary gates
    - preserves executable and repository behavior
    - contributes new task, language, proof, or repository coverage
- later evaluation proposal requiring separate authorization
  - compare ordinary success filtering with diversity-aware filtering
  - use held-out real repositories and chronological repository changes
  - report specification review, whole-repository success, maintenance success,
    and cost in addition to local proof pass rate

## product threat

- overall: high strategic threat, medium current substitution threat
- high capability threat
  - verifier-filtered synthetic data can rapidly erase a scarce-data advantage
  - open 32B models can acquire useful Verus annotation behavior from generated
    data
  - the public code and datasets reduce replication cost for competitors
- high data-moat threat
  - a competitor can bootstrap from frontier-model traces, replace expensive
    generation with an open model, and improve repeatedly
  - diversity-aware filtering makes a large corpus less dependent on human seed
    examples
- medium architecture threat
  - the shared agenda, specialized workers, checkpoint lineage, and verifier loop
    overlap with core mechanics needed by VL
  - these mechanics are now prior art and should not anchor a novelty claim
- low-to-medium current product substitution threat
  - evaluation is program-level, not repository-level
  - the Verus result measures annotation recovery on 149 filtered benchmarks
  - no evidence covers requirement discovery, specification adequacy,
    cross-module integration, build and test preservation, or proof maintenance
  - the method assumes a usable verifier and hand-selected diversity features
- inference
  - Formal Disco narrows VL's defensible product to trustworthy repository
    transformation, specification governance, durable integration, and evidence
    quality rather than generic multi-agent proof generation

## limitations and cautions

- verification proves conformance to the supplied specification, not that the
  specification matches human intent
- entropy is measured only over chosen syntactic and structural features
  - optimizing a proxy can increase its diversity without increasing downstream
    utility
  - human-written data remains more diverse on unoptimized annotation structure
- open-endedness still depends on external README and documentation seeds
- the strongest Verus number is a benchmark annotation task
  - it is not end-to-end program synthesis
  - it is not repository verification
- the model comparison is budget-sensitive
  - the headline Verus equality is pass@1
  - open models are sampled to 32 attempts, while Claude is capped at four
- the system uses 48 worker processes
  - Qwen runs take about eight to 12 hours on four 80 GB H100 GPUs
  - the paper does not provide a complete end-to-end dollar-cost comparison
- the paper's own conclusion calls richer reasoning traces and verifier-based
  reinforcement learning future work

## source-linked claims

- method and worker definitions: full paper sections 3.2 and appendix C
  - source phrase: `distributed agenda`
- training selection: full paper section 3.3
  - source phrase: `top 1/3 successful examples`
- Verus benchmark result: full paper section 4.3 and figure 5
  - source phrase: `exactly 43%`
- diversity boundary: full paper sections 4.2 and 5
  - source phrase: `small, hand-chosen set`
- source authenticity and exact bytes
  - arXiv API record for `2607.04631v1`
  - local PDF SHA-256 equals a fresh download from the archival PDF endpoint
  - evidence directory contains the checksum and provenance audit

## next discussion question

- should VL first adopt Formal Disco's diversity-aware trace selection for
  training data, or prioritize the repository-level evaluation gate that this
  paper leaves open

## canonical walkthrough manifest

- scope
  - 23 accepted, unique discovery IDs from the reviewed intake handoff
  - ordering is by expected value to VL
    - direct product-capability overlap
    - reusable data or evaluation leverage
    - product-threat magnitude
    - need for foundations before narrower applications
  - this is not a paper-quality or publication-prestige ranking
  - one paper may have only one active study owner
  - rank one is complete after independent-evaluator PASS and the human memo
  - rank two may start only when the manager records one distinct study owner
  - all others remain queued without a new study owner
  - prior completed studies will be reused, not duplicated
  - ordering may change only when full-text evidence supplies a documented reason
- ranked queue
  - 1 — Formal Disco: Scalable Open-Ended Generation of Formally Verified Programs
    - canonical ID: `vpsd_c678c7ff1a09998c79f7ed70caba49f88fdd38efd93d9db9bdd44b248b420b31`
    - status: full-paper walkthrough complete after evaluator PASS and human memo
    - first because it directly attacks VL's scarce-data and model-scaling moat
  - 2 — KVerus: Scalable and Resilient Formal Verification Proof Generation for Rust Code
    - canonical ID: `vpsd_bbec77f6358b67e0cdadfe57627f4141fc72b29d01f9fc24710e077e258706a9`
    - next because scalable resilient Verus proof generation most directly
      overlaps VL's core automation capability
  - 3 — Towards Repository-Level Program Verification with Large Language Models
    - canonical ID: `vpsd_e13b0628a0e1f43a3d3e669ddf8b278282fb40fc20d3212f328caaad67dccc69`
    - directly tests the repository-scale boundary that differentiates VL
    - reuse the completed RAG-Verus sources and literature notes
  - 4 — An AI Approach to Verified Production Cryptographic Libraries
    - canonical ID: `vpsd_1d115669f942f903c6180a82e4edfce92f7505c6e0a4ed1b44b5569b8577b37d`
    - production-library proof and specification synthesis is strong prior work
    - reuse the completed CryptoProver source-mapped note and collection
  - 5 — Propose, Solve, Verify: Self-Play Through Formal Verification
    - canonical ID: `vpsd_d665b5a597a81fc278a6b0e2e40a129f59d83885b04844c2ea7d7db9ca701776`
    - verifier-grounded self-play could compound VL's data and model capability
  - 6 — Verus-SpecGym: An Agentic Environment for Evaluating Specification Autoformalization
    - canonical ID: `vpsd_70efd668cd7a5dee4a7eab0365f3c67c43ae18c36b138221014c3a9f16a1f7c3`
    - specification formation is a central unresolved trust and evaluation layer
  - 7 — The Rewrite Before The Proof: Agentic Translation of Rust to Verus
    - canonical ID: `vpsd_bd11a18544f233b93ac26facb2fae5b2274d533a5f18374e3fed400abce0771b`
    - translation strategy may change VL's front-end architecture and scope
  - 8 — From C to Verifiable Rust: Towards Practical Migration of Code and Specifications
    - canonical ID: `vpsd_1be656b793966f3c49603537efa9e6cc73f88581a0c9376b3975d5e6b4e2f82e`
    - migration of both code and contracts broadens VL's practical input market
  - 9 — VeriContest: A Competitive-Programming Benchmark for Verifiable Code Generation
    - canonical ID: `vpsd_423d8f9fd60e9adbb7afcdfc23ddac1c8f04dc62973e02702a04bbfa80090bca`
    - end-to-end specification, implementation, and proof scoring can sharpen
      VL's evaluation decomposition
  - 10 — A Benchmark for Vericoding: Formally Verified Program Synthesis
    - canonical ID: `vpsd_6205243810c9b2dec10fc5c71df4ddc2620c5eee2df4ec281f9f91094db07622`
    - a second synthesis benchmark helps separate benchmark-specific progress
      from general capability
  - 11 — Enhancing LLM-Based Proof Synthesis for Rust Programs via Semantic Chunking and Hierarchical Context Expansion
    - canonical ID: `vpsd_156d8f98665d9b846c904aab6b8f242be81ebedab5d946c459e40420af98004d`
    - context selection is directly reusable for repository-scale proof search
  - 12 — Stop Means Stop: Measuring and Repairing the Enforcement Gap in Agent-Framework Control Primitives
    - canonical ID: `vpsd_a826c5df48dfde560a7d99e08650d267401af3c42f302cce6d3b94e2689ec60c`
    - agent-control enforcement affects trustworthy orchestration around VL
  - 13 — Verified Detection and Prevention of Concurrency Anomalies in Multi-Agent Large Language Model Systems
    - canonical ID: `vpsd_05b0a9d8876cb935314651b1a016f754007c9878c621e22dd1eb5dd4901ad534`
    - multi-agent correctness is relevant infrastructure but not the verifier core
  - 14 — VerusBelt: A Semantic Foundation for Verus's Proof-Oriented Extensions to the Rust Type System
    - canonical ID: `vpsd_f21ced5228321216b6b28181047398ea9652a85a642fab2dc9094b25e51c7749`
    - the semantic trust base controls what Verus proofs mean
  - 15 — Verifying Verus: A Lean 4 Formalization of the SST-to-AIR Expression Translation
    - canonical ID: `vpsd_23c5712463d2c5dcb5f02934d3315b550f22911b49e97bac40f59bcf9dc96286`
    - verifier validation matters to VL's assurance story but is narrower than
      proof-generation capability
  - 16 — Verus: A Practical Foundation for Systems Verification
    - canonical ID: `vpsd_07b26a64f757d16b745ce3c50b23da1fa8da2c8a46a6c6ce6a10333672c4851d`
    - practical system design is foundational context for all later Verus work
  - 17 — Verus: Verifying Rust Programs Using Linear Ghost Types
    - canonical ID: `vpsd_473ded00b17823cb5fc202dac599036f69fcd2956b6ba1ce30174cd6a60c4cfb`
    - core language ideas explain the proof model VL automates
  - 18 — Verifying Probabilistic Programs in Rust
    - canonical ID: `vpsd_aefbb47d312adeca6ddcc4973269f0a783b3bedc912f124eb138dd8795a6d204`
    - a Verus extension tests whether VL can handle richer semantics
  - 19 — Formal Verification of a Rust-Based Buddy Physical Memory Allocator
    - canonical ID: `vpsd_6ceea692c63c18bf5757ff9cd030144614c7762635b18780a1b293f5e992a227`
    - a concrete systems case can expose proof-engineering requirements
  - 20 — Detecting Inconsistencies in Arm CCA's Formally Verified Specification
    - canonical ID: `vpsd_162b3a2fc064d6f60c7e0c6ddfe070da90f8e18de8d9ef6d8f5824679f3c8121`
    - specification inconsistency detection informs adequacy checks but targets a
      different formal stack
  - 21 — Towards System-Oriented Formal Verification of Local-First Access Control
    - canonical ID: `vpsd_bea7802dfdee744b78e4c7473bf8f38bcd1df6092b71bfc9423e0f55067b59f2`
    - system-level access-control modeling is useful domain evidence
  - 22 — Shard: Securing GPU Kernels with Lightweight Formal Methods
    - canonical ID: `vpsd_d8cc9a845a78dc18de8ebadb5393a4e3b904fd7b0692b717aa41023f2e26315f`
    - GPU kernels are a valuable but specialized adjacent verification market
  - 23 — End-to-End Formal Methods Integrated Development with SysMLv2 Using HAMR
    - canonical ID: `vpsd_62b1474373e16f70461b888edb6fde5756edf365e154dd56891b00fb8666caa7`
    - toolchain integration is relevant, but direct overlap with Verus-oriented
      VL is the weakest in the accepted set

## later discoveries excluded from this manifest

- status: separately unclassified and still under `vlprograms:0` routing custody
- rule: do not rank, assign a walkthrough owner, or count these among the 23
  until each receives canonical relevance review
- trust boundary
  - the discovery IDs and titles below are untrusted discovery metadata
  - establish identity and relevance from primary publisher, author, DOI, or
    archival sources before reuse
- queued IDs
  - `vpsd_d24f9b8e928143a20f531f8a2b985394309088e022a9202122727e213b79811a`
    - Applying Modern Verification Techniques to a Root-of-Trust Bootloader
  - `vpsd_589856f031270b09c3c6fa0a38e5a0ebc2faae6d636d5adec1b5d316bac6b1e1`
    - VeruSAGE: A Study of Agent-Based Verification for Rust Systems
  - `vpsd_21d189b9e9a8b6234f9fc1622c4e3f86f3d1318fd3d7f72fc430987a7ab45d3a`
    - Atmosphere: Practical Verified Kernels with Rust and Verus
  - `vpsd_abf2f808800266b3f876d87d291a42a191a1b7d582c55c977634a25db56d5d57`
    - Reducing the Costs of Proof Synthesis on Rust Systems by Scaling Up a Seed Training Set
  - `vpsd_c7573b41f42065ff3a006da770738527ef1c94dc4c671f2a537044bbc2957a59`
    - Leveraging Large Language Models for Automated Proof Synthesis in Rust
  - `vpsd_a21d6ced3594eeee6fab9b5635afa5c9b3639aab0f7849c9a75962501ede053b`
    - Atmosphere: Towards Practical Verified Kernels in Rust
  - `vpsd_7dcc5210e368c02431c50c6cbeffe9771e53827b16f8e9b9711957fb72ba1517`
    - AutoVerus: Automated Proof Generation for Rust Code
  - `vpsd_c7cd32f1cc95e061c711aa9e35182ce20627036a888680c15a1657bcd4adb5bf`
    - Surveying the Rust Verification Landscape
  - `vpsd_3f8adf0c1bd46a7e3954ae1676cac6e3ffbf6378eb83a945da8507cb06d67ace`
    - RefinedRust: A Type System for High-Assurance Verification of Rust Programs
  - `vpsd_20e930f8c3672ec7cab1965966fadf35ccc24c1f71c51ca2fbb4587533831b54`
    - Verifying the Rust Standard Library
    - confirm identity against the completed arXiv `2606.17374` study before reuse
  - `vpsd_0afb0f867a034bfa9a427997d33ac0df1ca615a1beaf3facd21452410c1799f4`
    - A Hybrid Approach to Semi-Automated Rust Verification
