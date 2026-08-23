# VerusSeek: proof context at the obligation's granularity

(authored by agents unless marked 🧑)

- paper
  - Yuchen Zhang, Cheng Wen, Zhiwu Xu, Dugang Liu, Jialun Cao, Yuwei Liu,
    Shengchao Qin, and Cong Tian
  - *Enhancing LLM-Based Proof Synthesis for Rust Programs via Semantic
    Chunking and Hierarchical Context Expansion*
  - TASE 2026, LNCS chapter, pages 81–100
  - DOI `10.1007/978-3-032-30693-7_6`
- canonical ID:
  `vpsd_156d8f98665d9b846c904aab6b8f242be81ebedab5d946c459e40420af98004d`
- walkthrough rank: eleventh of the 23 accepted canonical papers

## decision

- technical value: high for context construction
  - VerusSeek indexes verified Verus code as typed proof constructs rather than
    files or undifferentiated code blocks
  - retrieval is biased toward the construct required by the current
    obligation, then expanded through parent, child, and sibling relations
  - a separate static pass proposes bounds, frame facts, and termination
    measures for loops
- empirical value: promising but not sufficient for repository claims
  - the authors report 122 of 150 VerusBench tasks verified with `gpt-4o`,
    compared with 69 for AutoVerus and 85 for RagVerus
  - 104 tasks verify in the first reported step, compared with 53 for
    AutoVerus
  - the paper does not identify the retrieval corpus, its separation from the
    benchmark, `k`, or the exact context-expansion budget
- actionable VL conclusion
  - index proof artifacts by semantic role and preserve typed repository
    relations
  - construct an obligation-specific context packet with explicit sources,
    ranking scores, token cost, and verifier outcome
  - treat static proof skeletons as candidates, not trusted invariants
  - add held-out-repository and negative-context controls before treating this
    recipe as a product capability
- product threat
  - high prior-art threat to broad novelty claims about construct-level Verus
    retrieval or hierarchical proof-context assembly
  - medium-high implementation relevance because the released pipeline is
    directly adaptable to VL's proof-search layer
  - medium capability threat because the reported improvement is large and
    appears under two LLM backends
  - low current substitution threat because the experiment completes proofs
    for 150 supplied, mostly small functions and does not govern a live
    repository change
- no VL product change, retrieval run, or reproduction is authorized by this
  note

## evidence boundary

- authenticated publisher chapter:
  [paper](</hdd1/sichanghe/paper_collection/VerusSeek- Enhancing LLM-Based Proof Synthesis for Rust Programs via Semantic Chunking and Hierarchical Context Expansion, Yuchen Zhang, Cheng Wen, Zhiwu Xu, et al., TASE, 2026.pdf>)
- complete 20-page layout-text extraction:
  [text](</hdd1/sichanghe/paper_collection/VerusSeek- Enhancing LLM-Based Proof Synthesis for Rust Programs via Semantic Chunking and Hierarchical Context Expansion, Yuchen Zhang, Cheng Wen, Zhiwu Xu, et al., TASE, 2026/VerusSeek- Enhancing LLM-Based Proof Synthesis for Rust Programs via Semantic Chunking and Hierarchical Context Expansion, Yuchen Zhang, Cheng Wen, Zhiwu Xu, et al., TASE, 2026.txt>)
- collection provenance:
  [record](</hdd1/sichanghe/paper_collection/VerusSeek- Enhancing LLM-Based Proof Synthesis for Rust Programs via Semantic Chunking and Hierarchical Context Expansion, Yuchen Zhang, Cheng Wen, Zhiwu Xu, et al., TASE, 2026/source-provenance.md>)
- PDF SHA-256:
  `d1dd44d5ac4d226b3ab349438a1223ff13c1bad31747cf4214796d856824ce13`
- extraction SHA-256:
  `8bf159bd8441f8f3003b46dd983120d6f671eef77084dc158806adadf6d61d8e`
- provenance SHA-256:
  `3c79dc1c995dc43cb2da8a280d9d9f0ef59570855904416f17ce66d00ec45b38`
- authenticity
  - the provenance records authenticated USC-library retrieval from the
    canonical Springer DOI
  - the PDF metadata gives the same title and DOI and identifies Springer as
    creator
  - this walkthrough uses the full publisher chapter, not its abstract
- evidence class
  - all VerusSeek method and result claims below are author reported
  - the tool, retrieval index, models, and benchmark were not run here
  - paper facts, walkthrough inferences, and proposed VL work are labeled
    separately
  - comparisons with earlier systems use the linked prior VL walkthroughs, not
    claims made by the VerusSeek chapter

## direct answer

- the problem
  - proof agents often generate plausible Verus annotations that miss the
    exact inductive or solver-facing fact needed by an obligation
  - file- or function-level retrieval can bury a short reusable invariant,
    contract, lemma, assertion, or proof block in irrelevant code
- VerusSeek's answer
  - parse verified Verus code into typed proof-bearing chunks
  - infer the kind of proof artifact needed by the target program
  - retrieve semantically similar chunks while favoring the needed type and
    verified sources
  - restore only selected structural context around each result
  - add statically generated loop-skeleton hints when applicable
  - ask an LLM for a patch, run Verus, and use diagnostics to reclassify and
    retrieve again
- central inference for VL
  - repository proof search is not one similarity query
  - it is constrained context compilation: identify the obligation, retrieve
    candidate premises and idioms, follow typed relations, fit a budget, retain
    provenance, and let verification update the next packet

## semantic proof-construct index

- retrieval units in table 1
  - `Function`: signature and complete body
  - `Lemma`: proof lemma or auxiliary proof function
  - `Contract`: `requires`, `ensures`, or `decreases` clauses
  - `LoopInvariant`: the invariant block associated with a loop
  - `ProofBlock`: a proof region with intermediate reasoning
  - `Assertion`: one assertion or check
- additional extraction in algorithm 1
  - imports and type definitions are also extracted before functions
  - the paper does not reconcile these extra units with table 1's type list
- each chunk stores
  - source span
  - file and enclosing function
  - verification status
  - formal attributes
  - up to 200 units of preceding and following context in the pseudocode
- Chunk Hierarchy Graph
  - parent–child edges connect enclosing and enclosed constructs
  - sibling edges connect same-kind chunks under one parent
  - preceding and following snippets preserve local continuity
- important implementation ambiguity
  - algorithm 1 describes parser-style extraction from a Verus file
  - related work says the system uses LLMs for semantic chunking
  - the paper does not explain which extraction decisions are model-based

## type-aware retrieval

- query classification is pattern based
  - loops: `while`, `for`, or `loop`
  - specifications: `requires`, `ensures`, or `invariant`
  - functions: `fn`, `proof fn`, or `spec fn`
  - arrays: `Vec`, brackets, `.len()`, or `.push()`
  - assertions: `assert()`
  - unmatched inputs use all chunk types
- preferred evidence depends on the class
  - loops prefer loop invariants and functions
  - specifications prefer contracts and loop invariants
  - functions prefer functions and lemmas
  - arrays prefer functions and contracts
  - assertions prefer assertions and proof blocks
- ranking
  - cosine similarity supplies the base score
  - preferred type adds `0.1`
  - verified origin adds `0.1`
  - capped lexical overlap and a parent-term match rerank candidates
  - the paper sets overlap weight to `0.05`, capped at `0.5`, and parent-match
    weight to `0.02`
- missing details
  - the embedding model is `text-embedding-3-small`, but the paper does not
    report the retrieval corpus, index size, `k`, score calibration, or recall
  - because the index is described as verified code, the purpose of a separate
    verified-origin bonus is unclear unless unverified material is also indexed
  - binary pattern matching can assign several plausible types, but precedence
    and multi-label behavior are not specified

## hierarchical context expansion

- purpose
  - an isolated invariant may match semantically but omit its enclosing
    contract, companion invariants, or auxiliary assertions
  - returning the complete file restores those relations with too much noise
- expansion rules
  - a loop query that retrieves a loop invariant may add its parent, siblings,
    and children
  - a specification query that retrieves a contract may add its parent and
    siblings
  - a loop query that retrieves a function may add children and siblings
  - an assertion or proof block may add its parent
  - other cases receive no graph expansion
- boundedness
  - the authors state that expansion uses a small maximum number of chunks per
    retrieved item
  - the numeric limit and total prompt allocation are not reported
- inference
  - the useful design is asymmetric expansion by obligation and artifact type,
    not graph traversal for its own sake
  - a production system should additionally stop on token cost, weak evidence,
    duplicated content, trust boundary, or repository revision mismatch

## loop-invariant synthesis

- the static analyzer proposes a structure-first skeleton
  - bounds derived from guards and access sites
  - frame conditions for unmodified quantities
  - a termination measure derived from the progress variable
- the LLM is asked to preserve those hints and add semantic relations learned
  from retrieved examples
- in the rotation example
  - static hints relate the index, split point, and input length
  - retrieval supplies the harder sequence relation for a growing suffix and a
    fixed suffix concatenated with a growing prefix
- correct boundary
  - the analyzer does not infer the complete relational invariant
  - some displayed frame candidates are tautological, such as asserting that
    each element of an immutable input view equals itself
  - generated skeletons therefore need provenance and deletion or mutation
    tests; they should not be treated as independently justified facts

## prompt and verifier loop

- each prompt contains
  - failing code and current verifier feedback
  - expanded retrieved evidence
  - loop-skeleton hints when applicable
- the model may return invariants, stronger contracts, or small proof blocks
- Verus checks each patch
- on failure, the next round may reclassify the query and retrieve new evidence
- reporting ambiguity
  - section 3.5 describes iterative generate–verify–repair rounds
  - section 4 defines `Step 1` through `Step 3` as three consecutive runs and
    later calls each step a fresh restart
  - the exact verifier-call budget inside a step and how restart state differs
    from repair state are not specified

## benchmark and baselines

- VerusBench supplies 150 tasks with specifications but removed proofs
  - CloverBench: 11
  - Diffy: 38
  - MBPP: 78
  - Misc: 23
- aggregate size reported in table 4
  - 2,849 executable lines
  - 1,252 specification lines
- average task characteristics in table 5
  - 32 total lines
  - 8 specification lines
  - 10 proof lines
  - 1.6 loops
  - 0.07 helper lemmas
- compared systems
  - AutoVerus: static few-shot generate, refine, and debug phases
  - RagVerus: repository-oriented retrieval of project code and proof context
  - Basic RAG: whole verified files as context
  - Chunked RAG: semantic chunks, type-aware retrieval, and hierarchy expansion
  - VerusSeek: Chunked RAG plus loop-invariant synthesis
- model settings
  - `gpt-4o` and `deepseek-v3.2`
  - temperature `1.0`
  - maximum output tokens `4096`
  - `text-embedding-3-small` with 1,536 dimensions

## reported results

- `gpt-4o`, union through Step 3
  - AutoVerus: 69/150, 46.0%
  - Basic RAG: 78/150, 52.0%
  - RagVerus: 85/150, 56.7%
  - Chunked RAG: 95/150, 63.3%
  - VerusSeek: 122/150, 81.3%
- relative headline
  - 122 versus 69 is a 76.8% relative increase over AutoVerus
  - 122 versus 85 is a 43.5% relative increase over RagVerus
  - the abstract rounds these to 76.7% and 43.4%
- first reported step
  - VerusSeek: 104/150, 69.3%
  - Chunked RAG: 72/150, 48.0%
  - AutoVerus: 53/150, 35.3%
- generated files per solved task
  - VerusSeek: 1,307 files for 122 solved tasks, reported as 10.71
  - AutoVerus: 1,737 files for 69 solved tasks, reported as 25.17
  - this is not wall time, token cost, or verifier-call cost
- suite totals for VerusSeek
  - CloverBench: 10/11
  - Diffy: 32/38
  - Misc: 17/23
  - MBPP: 63/78
- non-uniform component effect
  - Chunked RAG solves 35 Diffy tasks while full VerusSeek solves 32
  - the loop-synthesis addition therefore does not improve every suite
- second backend
  - with `deepseek-v3.2`, VerusSeek solves 116/150, 77.3%
  - Chunked RAG solves 87, AutoVerus 60, RagVerus 62, and Basic RAG 59
  - coarse file retrieval is one task worse than no retrieval on this backend

## what the ablation does and does not establish

- supported
  - whole-file retrieval is weak and model-sensitive in this experiment
  - the combined chunking, type-aware ranking, and expansion configuration
    beats Basic RAG and RagVerus under both backends
  - adding the loop-skeleton component raises the aggregate result sharply
- not isolated
  - chunk extraction, type-aware scoring, hierarchy expansion, and lexical
    reranking change together
  - no row removes only parent expansion, sibling expansion, type bonus, lexical
    reranking, or verified-source bonus
- internal inconsistency
  - the paper calls Chunked RAG the largest incremental gain
  - its own `gpt-4o` totals show Basic RAG to Chunked RAG adds 11.3 percentage
    points, while Chunked RAG to VerusSeek adds 18.0 points
- correct inference
  - the full context-and-skeleton recipe works well on this benchmark
  - the experiment does not quantify how much each retrieval design choice
    contributes

## qualitative failures

- the paper examines representative Diffy tasks
- both successful and failed generations often recover bounds and length facts
- success depends on also capturing the sequence-level relation required by the
  postcondition
- this supports the architecture's core split
  - static structure can make a candidate admissible
  - retrieved semantic relations must make it strong enough
- evidence limit
  - the paper gives representative cases rather than a counted taxonomy of all
    28 remaining VerusSeek failures

## limitations and validity cautions

- retrieval population is undisclosed
  - no source projects, artifact counts, index size, licenses, or benchmark
    exclusion procedure are reported
  - possible overlap between indexed proofs and benchmark families therefore
    cannot be assessed from the paper
- evaluation scope is small
  - 150 supplied single-function proof-completion tasks average 32 lines
  - no live repository build, dependency change, multi-file transaction,
    specification discovery, human review, or maintenance task is measured
- stochastic accounting is incomplete
  - results union three reported steps at temperature `1.0`
  - no confidence interval, seed sensitivity, statistical test, or equal-cost
    normalization is reported
- context accounting is incomplete
  - `k`, expansion count, prompt-token use, truncation, latency, and monetary
    cost are absent
- verifier acceptance is narrow
  - it establishes that a generated patch satisfies the supplied Verus
    specification
  - it does not establish that the specification captures human intent
- backend generalization is limited to two models
- reproducibility
  - the paper links a Zenodo toolchain
  - this walkthrough did not inspect or execute it, and the missing experimental
    details above remain missing from the paper itself

## what was already done

- comparison sources
  - these boundaries come from earlier reviewed VL walkthroughs, not the
    VerusSeek paper
  - [KVerus](kverus_20260822.md)
  - [repository-level program verification](repository_level_program_verification_20260822.md)
  - [Verus-SpecGym](verus_specgym_20260822.md)
  - [VeriContest](vericontest_20260822.md)
  - [A Benchmark for Vericoding](benchmark_for_vericoding_20260822.md)
- AutoVerus
  - already established the generate–verify–repair workflow for Verus proofs
  - VerusSeek changes the evidence supplied to that workflow and adds static
    loop skeletons
- RagVerus / repository-level program verification
  - already established retrieval of examples, types, project conventions, and
    premises for cross-file Verus proof completion
  - already showed that irrelevant context can hurt and that local context
    without necessary premises is insufficient
- KVerus
  - already adds a typed dependency graph, semantic project-lemma retrieval,
    versioned Verus knowledge, and error-targeted refinement
  - reports a real CortenMM integration and therefore covers more repository
    scope than VerusSeek
- Verus-SpecGym
  - already separates verifier acceptance from specification faithfulness
  - VerusSeek assumes the supplied contract rather than testing its meaning
- VeriContest and A Benchmark for Vericoding
  - already provide wider evaluation, corpus, attempt-budget, and semantic-gate
    lessons
  - neither isolates construct-level context selection as VerusSeek does
- VerusSeek's defensible increment
  - one explicit recipe that aligns retrieval units with proof obligations,
    restores bounded typed context, and complements them with static loop
    skeletons
  - strong author-reported results on VerusBench under two backends
- prior-art boundary
  - VerusSeek does not originate RAG, semantic code chunking, verifier-guided
    repair, static invariant inference, or repository proof retrieval
  - it is direct public prior art for their particular combination in Verus
    proof synthesis

## what VL should learn

- separate evidence roles
  - premises justify why an obligation follows
  - proof idioms show how Verus and SMT expect that reasoning to be expressed
  - structural hints cover bounds, frames, and termination
  - diagnostics identify the missing role for the next search
- compile context by obligation
  - identify the failing goal and target construct
  - retrieve from compatible artifact types first
  - traverse typed repository relations only when they add a named dependency
  - deduplicate and fit an explicit token budget
- preserve provenance
  - exact repository revision and source span
  - verification and toolchain revision
  - retrieval score, type bonus, and expansion path
  - prompt inclusion, verifier outcome, and later deletion result
- measure harmful context
  - compare no context, randomized context, coarse context, construct context,
    and oracle-premise context
  - report recall of required premises and how often retrieval lowers success
- treat failures as index feedback
  - missing premise
  - wrong construct type
  - stale or incompatible proof idiom
  - context-budget truncation
  - inadequate structural skeleton
  - invalid or incomplete specification

## recommended VL integration

- immediate design work, without changing the product
  - define a proof-context record with obligation, candidate artifact, semantic
    type, source identity, relation path, scores, token cost, and outcome
  - define distinct indices for contracts, lemmas, invariants, proof blocks,
    assertions, types, and versioned tool guidance
  - define an expansion policy that follows explicit dependency and containment
    edges before generic similarity neighbors
  - require a reason and budget for every expanded item
  - mark static skeleton facts as candidates until the exact repository verifies
    them and deletion testing shows that they matter
- later implementation proposal requiring separate authorization
  - add construct records alongside VL's existing repository dependency and
    lemma knowledge, not as a replacement for it
  - route verifier diagnostics to a typed missing-evidence classifier
  - assemble a source-linked context packet and preserve it in the proof receipt
  - fall back to broader context only when the bounded packet lacks a necessary
    premise
- later evaluation proposal requiring separate authorization
  - hold out complete repositories and chronological revisions from the index
  - compare exact equal-budget variants, including each expansion edge type
  - report proof success, first attempt, verifier calls, tokens, latency, cost,
    premise recall, harmful-context rate, repository build, and human review
  - test changed code and dependencies, not only removed proofs with intact
    specifications

## threat assessment

- high prior-art threat
  - VL cannot credibly claim to originate semantic proof-construct retrieval,
    query-type-aware Verus context, or hierarchy-based proof-context expansion
  - novelty claims must concern provenance, adaptive repository reasoning,
    governance, evaluation, or maintenance beyond this recipe
- medium-high implementation relevance
  - typed chunk records and asymmetric graph expansion are small enough to
    transfer into an existing repository knowledge layer
  - the paper links a toolchain, which may reduce access friction
  - because it was not inspected or run here, its completeness,
    reproducibility, and transferability remain unknown
- medium capability threat
  - 81.3% on `gpt-4o` and 77.3% on `deepseek-v3.2` are large reported results
  - the ablation suggests that context architecture and static structure can
    raise capability without model training
  - undisclosed retrieval data, possible overlap, missing cost, and bundled
    ablations prevent a high-confidence capability estimate
- low current substitution threat
  - the tasks start with executable code and specifications and remove proofs
  - average scope is one 32-line task, not a governed repository transaction
  - there is no requirement discovery, specification-faithfulness gate,
    dependency update, review workflow, or longitudinal maintenance evidence
- inference
  - VL should integrate the context-selection lesson later, after a reviewed
    design and separate authorization
  - VL should differentiate through held-out repository evidence, explicit
    provenance, adaptive premise closure, specification governance, and durable
    change receipts

## rank-eleven rationale

- ranks two and three already establish the repository knowledge and retrieval
  boundary with stronger repository evidence
- ranks six, nine, and ten already establish specification and evaluation gates
  needed to interpret proof success
- VerusSeek comes next because it gives a more precise context-selection recipe
  that can improve those earlier repository systems
- the paper changes how VL should assemble proof context, not the order of its
  trust boundaries

## source anchors

- problem and contribution: abstract and section 1
  - source phrase: “granularity mismatch”
  - source phrase: “concise yet logically grounded evidence”
- chunk schema and graph: section 3.1, table 1, and algorithm 1
  - source phrase: “proof-bearing constructs as retrieval units”
- scoring: section 3.2 and equations 1–2
  - source phrase: “type-aware scoring function”
- expansion: section 3.3 and equations 3–4
  - source phrase: “small context budget”
- loop skeleton: section 3.4 and table 3
  - source phrase: “bounds/frame/termination”
- verifier loop: section 3.5
  - source phrase: “re-classify the query type and re-retrieve evidence”
- benchmark and settings: sections 4.1, tables 4–5
  - source phrase: “all 150 non-trivial verification tasks”
- main results: sections 4.2–4.4, tables 6–8
  - source phrase: “122/150 tasks”
- qualitative boundary: section 4.5
  - source phrase: “sequence-level relation required by the postcondition”
- prior work: section 5
  - source phrase: “repository-level retrieval-augmented generation”

## bounded discussion question

Should VL first design the provenance-aware construct index and context receipt,
or first design the held-out-repository evaluation that would determine whether
this retrieval recipe generalizes?
