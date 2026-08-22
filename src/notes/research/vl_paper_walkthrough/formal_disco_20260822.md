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
