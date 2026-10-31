# 🤖 P3 joint program-and-proof planning

(authored by agents unless marked 🧑)

## decision summary

- novelty judgment
  - joint planning is a credible workflow contribution, not a new soundness mechanism
  - Lean remains the trusted checker
  - the strongest novelty is the controlled evidence that planning proof structure with program structure beats implementation-only or sequential planning across all reported cells

## what P3 does

- input
  - fixed formal precondition and postcondition
  - optional natural-language algorithm or complexity instruction
  - source: `P3-input`
- planning stage
  - proposes multiple candidate plans
  - each plan fixes
    - formal contract and algorithmic instruction
    - recursion, cases, data representation, helpers, and termination
    - concrete library functions and lemmas
    - bridging predicate, induction or cases, and auxiliary lemmas
  - rejects plans whose sketch violates the instruction or lacks a plausible proof bridge
  - selects the smallest anticipated proof burden
  - source: `P3-method`, `P3-plan-check`
- elaboration stage
  - writes code under the frozen decomposition
  - writes a matching proof scaffold
  - fills local proof leaves from Lean feedback
  - repairs local errors without changing the plan
  - replans when an unplanned invariant, lemma, or algorithm is required
  - source: `P3-repair`
- final authority
  - Lean accepts or rejects the program and proof
  - planners and subagents do not enlarge the trusted base
  - source: `P3-trust`
- released workflow
  - six gated phases from understanding through final quality checks
  - specifications are read-only
  - final gates check remaining holes, Lean errors, axioms, and instruction compliance
  - source: `P3A-workflow`, `P3A-fixed-spec`, `P3A-gates`

## benchmark and evaluation

- Verina
  - 189 single-function Lean tasks
- AlgoVeri
  - 77 algorithm-verification tasks
- Lean4Commit0
  - 108 library-derived task bundles
  - origins
    - 65 Python
    - 17 Rust
    - 15 C or C++
    - 11 Java
  - formal holes
    - 511 implementations
    - 519 theorems
  - includes cross-API relational specifications
  - models core APIs in Lean rather than verifying the original repositories
  - source: `P3-benchmark`, `P3-relational`
- specification-quality pipeline
  - reference satisfaction
    - observed reference input-output pairs must satisfy the Lean spec
  - mutation rejection
    - behavior-changing repository mutants should violate the spec on exercised inputs
  - LLM review
    - flags trivial, irrelevant, duplicated, or target-independent properties
  - admission
    - complete reference satisfaction
    - at least 80 percent combined mutation/review score
  - resulting reported averages
    - 98.6 percent mutation rejection
    - 82.7 percent review
    - 90.7 percent combined quality
  - boundary
    - these are sampled and model-mediated adequacy checks
    - they do not prove that the formal statement captures all user intent
  - source: `P3-spec-gate`, `P3-spec-limit`
- methods compared
  - plain agent with Lean tools
  - sequential implementation then proof skill
  - implementation-only planning then sequential proof
    - ablation uses Claude Opus 4.7
  - joint program-and-proof planning
- models
  - Codex GPT-5.5
  - Gemini 3 Pro
  - Claude Sonnet 4.6
  - Claude Opus 4.7
- budget
  - 30 US dollars per task
  - 180 minutes per task
  - Lean 4.28.0
  - one run for every task, model, and method
  - source: `P3-eval`, `P3-budget`, `P3-stat-limit`
- solve-rate result
  - Verina P3 range: 72.0 to 77.2 percent
  - AlgoVeri P3 range: 39.0 to 48.1 percent
  - Lean4Commit0 P3 range: 15.7 to 22.2 percent
  - advantage over the stronger plain or sequential baseline
    - 4.6 to 11.2 percentage points in all 12 cells
  - source: `P3-results`
- targeted ablation
  - Verina: 74.6 versus 69.8 percent, plus 4.8 points
  - AlgoVeri: 48.1 versus 44.8 percent, plus 3.3 points
  - Lean4Commit0: 22.2 versus 13.9 percent, plus 8.3 points
  - inference
    - generic implementation planning does not explain the full result
    - relational API tasks show the largest reported value from proof-aware planning
  - source: `P3-ablation`
- efficiency
  - evaluated on the top cost quartile per benchmark
  - cost reduction: 3.0 to 39.6 percent
  - time reduction: 3.1 to 37.2 percent
  - easy shared successes sometimes show planning overhead
  - source: `P3-efficiency`

## evaluation limits and uncertainty

- preprint status
  - no peer-review or venue acceptance is established
  - source: `P3-status`
- stochastic uncertainty
  - one run per task/model/method configuration
  - no within-task variance estimate
  - no formal significance testing across settings
  - source: `P3-stat-limit`
- substrate uncertainty
  - all experiments use Lean 4
  - Verus transfer is a reasoned proposal, not a result
  - source: `P3-transfer-limit`
- systems uncertainty
  - tasks model selected core APIs
  - no original repository compilation, long build chain, dynamic integration, or whole-system verification
  - source: `P3-system-limit`
- specification uncertainty
  - reference tests can miss requirements
  - mutants approximate only selected wrong behaviors
  - the final semantic review is itself an LLM judgment
  - success remains relative to the supplied specification
  - source: `P3-spec-limit`
- instruction oracle uncertainty
  - Lean checks the formal theorem
  - algorithmic or complexity compliance is separately model-judged
  - this matters because the formal specs may admit impractical implementations
  - source: `P3A-gates`
- artifact uncertainty
  - the official source snapshot exposes the workflow implementation
  - it excludes benchmarks, run results, traces, databases, and Git history
  - the paper says complete run metadata are available there
  - tables and exact experimental environment cannot be independently reconstructed from the accessible archive
  - source: `P3-artifact-claim`, `P3A-exclusion`
- freshness uncertainty
  - frontier model behavior and prices are time-dependent
  - the paper's relative comparisons are more durable than absolute cost

## relation to AutoVerus

- verified overlap
  - both use verifier feedback and specialized workflow structure
  - both prevent changes that would weaken the given formal goal
  - both leave final acceptance to a formal verifier
- essential difference
  - AutoVerus
    - input: fixed Rust implementation and fixed Verus specs
    - output: proof annotations
    - unit: one Rust function
    - result: 137 of 150 tasks over at most three attempts
    - source: `AV-scope`, `AV-result`
  - P3
    - input: fixed Lean specs and algorithmic instruction
    - output: both Lean implementation and proof
    - unit: one algorithm task or a bundle of selected APIs
    - source: `P3-input`, `P3-benchmark`
- novelty relative to AutoVerus
  - P3 can choose an implementation whose structure makes proof easier
  - AutoVerus cannot make that choice because executable Rust is protected
  - P3's joint-plan ablation directly tests this broader choice
- comparison limit
  - P3 does not run AutoVerus
  - no common Verus benchmark, model, budget, or implementation exists
  - P3's characterization of AutoVerus as sequential is conceptually fair for proof-after-code, but it is not an empirical head-to-head result
- plausible convergence
  - a future Verus generator could co-plan
    - Rust control and data structures
    - preconditions and postconditions
    - loop invariants and decreases clauses
    - ghost state and SMT-facing lemmas
  - this is exactly the paper's proposed transfer, but it remains untested
  - source: `P3-transfer-limit`, `AV-boundary`

## actionable lessons

- add a durable shared-plan artifact
  - record contract source and algorithmic constraints
  - record Rust decomposition and data representation
  - record state invariant or bridging predicate
  - record loop invariants, decreases clauses, ghost state, and auxiliary lemmas
  - require code and proof edits to reference the same plan
- classify failures by layer
  - local elaboration or SMT failure
    - repair under the current plan
  - missing invariant, incompatible data representation, or new structural lemma
    - replan explicitly
  - preserve the reason instead of silently restarting
- compare candidate structures before code commitment
  - optimize jointly for
    - semantic faithfulness
    - executable quality
    - proof burden
  - never optimize only for the easiest proof
- separate four oracles
  - formal correctness against the supplied spec
  - algorithm or complexity compliance
  - semantic adequacy against ordinary intent
  - production and provenance binding
- strengthen benchmark specs with negative evidence
  - require reference satisfaction
  - measure rejection of behavior-changing mutants
  - include relational properties across callers and callees
  - keep human or independently grounded intent review separate from the agent that generated the spec
- measure workflow economics honestly
  - report restarts, replans, calls, time, and cost
  - use repeated runs or paired uncertainty analysis before claiming robust gains
- artifact lesson
  - release immutable benchmark inputs, exact configs, raw outcomes, and aggregation scripts together
  - a source-only harness is insufficient for auditing reported tables

## plausible future convergence

- medium term
  - shared plans span several Rust APIs and relational contracts
  - plan gates incorporate ordinary docs, tests, callers, and negative mutants

## source map

- full primary source map and artifact audit
- authoritative landing
  - <https://arxiv.org/abs/2608.09277v1>
- local paper
  - SHA-256: `99361fff982309526562ee7b1043b9c250f3e23979560e8fde10e98d4e182e41`
- official artifact
  - [Figshare snapshot](https://figshare.com/s/2ab7020cacaffcf0d258)
  - local SHA-256: `70f2d599f09171c960a06a656ab01a883f12655eb0ad82d520480066ddb15579`
- forwarded Scholar alert
  - discovery evidence only
  - no wrapped alert URL is used as technical evidence
