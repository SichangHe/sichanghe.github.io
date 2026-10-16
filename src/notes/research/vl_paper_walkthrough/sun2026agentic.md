# Agentic Model Checking
(authored by agents unless marked 🧑)
Tag: `sun2026agentic`, [paper](https://doi.org/10.48550/arxiv.2605.21434)
## scope

This paper proposes “agentic model checking, a verification paradigm in which LLM agents handle tasks requiring semantic judgment, while a BMC backend discharges every soundness-relevant decision” (Abstract, PDF p. 1). BMC-Agent targets generated systems code in C and Rust, using CBMC for C and Kani for Rust. Agents infer specifications, select checks, classify counterexamples, and propose refinements; deterministic parsers, bounded model-checking queries, solver guards, and concrete execution decide whether those proposals affect a verdict.

The paper states: “Agents handle every task that requires semantic judgment, including inferring per-function pre/postconditions, selecting which arithmetic checks are warranted, classifying counterexamples, and proposing refinements, while a BMC backend discharges every soundness-relevant decision.” It also states: “Counterexamples are not bug reports: they pass through a multi-stage validation pipeline (reachability, callee feasibility, dynamic replay, realism audit) that distinguishes active in-tree crashes from latent failures at the public-API boundary.” (Abstract, PDF p. 1)

The evaluation covers VibeOS (15,000 lines of LLM-generated ARM64 kernel C), five OSS-Fuzz-hardened libraries, an out-of-tree Realtek driver, and claudes-c-compiler (50,000 lines of LLM-generated Rust). The headline VibeOS run analyzed 675 functions in 37 modules and confirmed 34 realistic findings from 145 deduplicated reports: 16 dynamically reproduced, 14 reachable from system entries, and 4 formal model violations without entry tracing (Section 4, PDF pp. 14–15). The Rust compiler run confirmed 25 real bugs, including 24 panic-class public-API defects and one functional-correctness violation, and established bounded functional equivalence for selected helpers (Abstract and Contribution 6, PDF pp. 1–2).

## technique 1: top-down specification inference

The specification agent traverses the call graph from caller context toward leaves. For each function it retrieves the body, callers, and a domain summary; drafts a pre/post pair in a restricted DSL; parses it deterministically; and retries malformed drafts up to a configured limit (Section 3.1, PDF p. 6). Top-down generation makes an implicit API contract explicit instead of merely restating implementation details. The DSL translates deterministically to `__CPROVER_assume`/`__CPROVER_assert` for C and `kani::assume`/`kani::assert` for Rust. The paper also supports dual-source generation: one prompt emphasizes caller intent and one implementation behavior; disagreements are flagged for human review.

The DSL can add functional-correctness clauses: reference-equivalence expressions, algebraic identities, folds, and round trips. These are AND-merged into the postcondition, so one BMC query checks both panic-freeness and behavior. Mutually recursive functions are condensed into strongly connected components with Kosaraju’s algorithm before specification.

Verus form. Inference: infer `requires` from call-site assumptions and `ensures` from returned values and state updates, then parse the generated text before inserting it into Rust. Use `assert` or proof lemmas to discharge functional properties. Inference: a Verus adapter must reject or explicitly encode predicates that do not map to Rust’s type and ownership model; the paper’s Rust adapter treats some raw-pointer predicates as structural type constraints. These are inferences because the paper does not define a Verus DSL.

Evidence and limits. The paper’s case study for `net_get_mac` infers a six-byte valid-range precondition and finds `mac = NULL`; dynamic replay produces SIGSEGV (Appendix A.1, PDF p. 16). Specification inference is not itself sound: an over-strong or wrong contract can hide behavior, which is why every BMC query and later realism audit remains necessary.

## technique 2: per-function check selection and compositional BMC

An LLM flag selector chooses arithmetic checks warranted by each function instead of enabling every noisy check globally (Section 3.2, PDF p. 7). Available C checks include unsigned and signed overflow, conversion, pointer overflow, bounds, pointer, division-by-zero, NaN, and infinities; the Rust adapter selects corresponding Kani checks. The BMC engine then creates one harness per function, replacing callees by stubs constrained by their postconditions. Each function is checked in isolation under assume-guarantee contracts, and call-graph layers can run in parallel (Sections 3.2–3.4, PDF pp. 7–8).

Counterexamples are deduplicated before validation, using normalized function/property/input signatures (Section 3.4, PDF p. 8). This avoids repeatedly investigating the same witness produced by related harnesses.

Verus form. Inference: generate one verification harness per Rust function, use `assume` only for caller-provided preconditions that have been approved by the specification layer, and model verified callees by their `ensures`. Run independent functions in parallel where crate dependencies permit. Inference: Verus’s ownership and executable semantics mean the adapter cannot blindly mimic pointer flags; each selected check must correspond to an actual Verus obligation.

Evidence and limits. The paper reports bounded, spec-relative clean results when no violation appears within the configured unwinding bound. Such a result is not unbounded proof. It assumes the callee contract is sound and that the chosen checks cover the threat model.

## technique 3: counterexample validation pipeline

A BMC witness is not immediately a bug report. The pipeline checks input reachability, callee feasibility, optional dynamic replay, and a realism audit (Section 3.5, PDF p. 8). It distinguishes active in-tree crashes from latent failures at public API ingress. Confirmed findings receive evidence tiers: dynamically reproduced, reachable from a system entry, or only a formal BMC violation.

The VibeOS `kapi_file_size` example illustrates the sequence. The spec exposes that a non-null opaque pointer can still be invalid; BMC produces a witness; call-site analysis finds the function is a system entry; a GCC harness dereferences an invalid pointer and produces SIGSEGV; the realism agent rates the public-API issue realistic (Appendix A.2, PDF pp. 17–18). The `net_get_mac` path similarly compiles a harness calling the function with `NULL` and confirms SIGSEGV (Appendix A.1, PDF p. 16).

Verus form. Inference: for each Verus counterexample or failed proof obligation, check whether the input is reachable from a public Rust API, whether modeled callees can produce the state, and whether a concrete Rust test reproduces it. Keep the bounded-model witness distinct from the runtime fault reproduced. The paper’s evidence tiers are a useful reporting format, but the exact Kani-to-Verus replay adapter is not in the paper.

## technique 4: specification-level CEGAR refinement

Spurious witnesses drive refinement rather than silent suppression. A soundness guard checks an agent-proposed verifier rule, caller strengthening, or callee/function-spec strengthening; accepted changes are stored and all affected functions are rechecked (Section 3.6, PDF p. 9). Refinement is lifted from predicate abstraction to specifications and propagates through compositional stubs.

The `calloc` case shows the loop-bound path. At unwinding bound `k = 4`, CBMC first reports `calloc.unwind.0` for an unconstrained zeroing loop. The classifier marks this spurious, tightens the precondition, persists it, and queues `calloc` for self-recheck. The second run then finds an integer-wrap witness, exposing the missing overflow guard (Appendix A.3, PDF pp. 18–19).

Verus form. Inference: when a Verus harness exposes an infeasible state, propose a tighter `requires` or caller contract, pass it through an independent guard that checks it does not remove a reachable bad state, persist it, and re-run affected callers. Do not treat a model artifact as a reason to delete a failing obligation. The paper’s exact guard implementation is backend-specific.

## technique 5: persistent knowledge and parallel scale

The system stores accepted specifications, refinements, and witness patterns in a verification knowledge base, reusing them across runs (Sections 3.6–3.8, PDF pp. 9–10). Function harnesses and call-graph layers run in parallel; refined callee contracts become updated stubs in every caller. This gives compositional scaling while preserving a feedback loop.

## measured results and trust boundary

The VibeOS run’s denominator is 675 analyzed functions and 145 deduplicated reports; 34 were confirmed realistic, comprising 16 dynamic, 14 system-entry, and 4 BMC-only findings. The paper says 85 reports were unrealistic and 26 uncertain, excluded from the headline count (Section 4.1, PDF p. 15). The Rust compiler corpus produced 25 real bugs, including one functional violation found only when behavioral specs were enabled (Contribution 6, PDF p. 2). These are bounded, configuration-specific results, not claims of complete program correctness.

Trusted components include CBMC/Kani, their encodings and unwinding bounds, the DSL parser and backend adapters, concrete replay compiler/runtime, the soundness guard, and the inferred specifications themselves. Inference: a product using this pipeline must treat an incorrect contract, unsound adapter, or missing public entry point as a product risk even when every query passes.

## techniques for the catalog

- top-down contract inference — derive per-function pre/postconditions from callers in a restricted DSL with deterministic backend translation
- per-function bounded checking — replace callees with postcondition-constrained stubs and run selected arithmetic checks compositionally
- witness validation tiers — classify counterexamples by reachability, callee feasibility, dynamic replay, and realism before reporting
- specification-level CEGAR — tighten contracts for spurious witnesses, guard the refinement, persist it, and recheck callers
- persistent compositional knowledge — reuse approved contracts and witness patterns across parallel call-graph sweeps
