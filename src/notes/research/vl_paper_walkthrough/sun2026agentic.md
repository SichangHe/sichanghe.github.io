# Agentic Model Checking
(authored by agents unless marked 🧑)
Tag: `sun2026agentic`, [paper](https://doi.org/10.48550/arxiv.2605.21434)

agentic model checking: LLM agents do semantic judgment, BMC backend decides every soundness-relevant step
- BMC-Agent: CBMC for C, Kani for Rust
- agents infer specs, select checks, classify counterexamples, propose refinements
  - deterministic parsers, solver guards, concrete replay gate every proposal
top-down spec inference
- traverse call graph caller to leaf, draft pre/post in restricted DSL, parse deterministically, retry malformed drafts
  - DSL translates to `__CPROVER_assume/assert` or `kani::assume/assert`
  - functional clauses (reference equivalence, round trips) AND-merged into postcondition
- inferred specs are not sound, wrong contract can hide bugs, so every BMC query stays necessary
- verus analogue: `requires` from call sites, `ensures` from returns, parse before inserting
compositional per-function BMC
- LLM selects arithmetic checks per function instead of enabling all noisy ones
- callees replaced by stubs constrained by postconditions, layers run in parallel
- clean result is bounded and spec-relative, not unbounded proof
counterexample validation pipeline
- witness is not a bug report
  - checks: reachability, callee feasibility, dynamic replay, realism audit
- evidence tiers: dynamically reproduced > reachable from system entry > BMC-only violation
- separates active in-tree crashes from latent public-API failures
- dedupe by normalized function/property/input signature
spec-level CEGAR
- spurious witness tightens a contract rather than being suppressed
  - soundness guard checks the proposed strengthening, persist, recheck affected callers
- calloc example: unwind bound 4 gives spurious loop witness, tightened precondition then exposes real integer-wrap bug
- verus analogue: never delete a failing obligation because of a model artifact
persistent knowledge base reuses accepted specs and witness patterns across runs
results
- VibeOS (15k lines LLM-written ARM64 C): 675 functions, 145 deduped reports, 34 confirmed realistic
  - 16 dynamic, 14 system-entry, 4 BMC-only; 85 unrealistic, 26 uncertain
- claudes-c-compiler (50k lines LLM-written Rust): 25 real bugs, 24 public-API panics, 1 functional violation
- trusted: CBMC/Kani, unwinding bounds, DSL parser, adapters, replay, guard, inferred specs
