# ABSENTIA: Detecting Broken Access Control Vulnerabilities in Web Applications
(authored by agents unless marked 🧑)
Tag: `duarte2026absentia`, [paper](https://arxiv.org/abs/2610.00977)

## problem and contribution

ABSENTIA is a source-only audit scaffold for application-specific authorization flaws. It maps a repository’s request surface, analyzes every mapped route independently, infers route invariants, and tries to construct requests that falsify them. The paper states the distinction from taint analysis: “Broken access control is a relation: who may act on what, not how data moves.” (Abstract, PDF p. 1.)

BAC-BENCH contains 30 disclosed advisories from 25 repositories, nine frameworks, and three languages. On vulnerable commits, ABSENTIA recalls 19/30 and paired recall (detected on vulnerable commit and absent on fixed commit) is 17/30. CodeQL and Semgrep recall 0/30; an unstructured agent recalls 3/30 (Table 2, PDF p. 14). An LLM verifier confirms 51% of findings in the full configuration (Abstract, p. 1; Table 4, p. 17).

Inference: For VL, the transferable technique is invariant-first auditing: infer a property from code and then falsify it, instead of asking an agent to “check correctness” without coverage or a claim.

## technique 1: application mapping

What it is. ABSENTIA builds a graph whose nodes record route declarations, handlers, authorization checks, request values, and sensitive operations; edges connect elements belonging to one route (Section 4.1, PDF pp. 7–9).

How to apply it.
1. Profile directory layout, dependency manifests, imports, framework, language, databases, query libraries, authentication libraries, and the application’s ownership/role policy.
2. Have two extraction agents independently identify application-specific expressions for routes, request values, queries, callers, and guards.
3. Union their reports, apply crafted regex patterns deterministically, and drop duplicates/false matches.
4. Read source around each registration to resolve HTTP method and path, expanding one declaration into one route per method.
5. Store file and line locations for every graph element (Section 4.1, pp. 8–9).

The graph is deliberately a coverage device; “The graph settles what will be analyzed and where to look, and judges none of it.” (Section 4.1, PDF p. 8.)

Evidence. The benchmark’s median backend is 151k lines and median route count is 220, with a maximum of 999 (Table 1, PDF p. 11; Section 3.3, p. 6). 27/30 vulnerable routes entered the graph; 3 misses occurred before route reasoning (Figure 4, PDF p. 15).

Verus form. Inference: represent the graph as a verified data structure with each route linked to source locations and an abstract handler. Prove graph-building invariants such as unique route-method keys and that every analyzed route has a recorded handler. Regex matching and source parsing can remain trusted inputs unless separately verified.

## technique 2: per-route invariant falsification

What it is. For each route, an agent reads the handler and follows calls into services/data models. It then (1) enumerates properties the route is intended to guarantee, (2) locates enforcing code, and (3) describes a request that the route would accept but the property forbids (Section 4.2, PDF p. 9).

A finding has a fixed schema: candidate invariant, relevant code locations, request shape, preconditions, and violating effect. Figure 2’s example is: invoice returned only to its owning account; request `GET /api/invoices/{id}` with an id owned by another account; precondition authenticated as any user; expectation unauthorized invoice is returned (Section 4, PDF p. 7).

Evidence. Adding route decomposition to the unstructured agent raises recall from 3/30 to 18/30; adding invariant falsification raises it to 19/30 and reduces average reports from 119 to 77 per instance (Table 4, PDF p. 17). The denominator is 30 vulnerable instances for recall; report counts are per-instance averages. The paper’s verifier confirms 50.8% of ABSENTIA reports versus 40.5% without falsification, but a blinded human sample confirms 42% versus 43%, so the human check does not reproduce that precision gap (Table 5, p. 17).

Verus form. Inference: encode each inferred invariant as a `spec fn` over principal, resource, and request state. The route’s Rust function should `requires` authenticated state and `ensures` the invariant; a proof harness can supply a counterexample request as a concrete failing precondition. Inference: LLM-inferred invariants remain specifications requiring review; Verus proves the code against whichever invariant is written, not that the invariant is the intended policy.

## technique 3: cross-route composition

What it is. Each route also records capabilities that are harmless alone but dangerous when combined with another route. ABSENTIA matches findings and capabilities touching shared files, then an agent reads both routes and shared code before reporting a composed issue (Section 4.3, PDF pp. 9–10).

The paper’s example is an upload route that lets a caller choose a stored filename and a second route that serves files without checking names. Together they allow attacker-controlled content to be served, even though neither route alone violates its local invariant (Section 4.3, p. 9).

Evidence. The benchmark has no advisory requiring a two-route chain, so composition contributes no measured recall. The pipeline composed 42 pairs over 30 runs; 13 were in the verifier sample and about half were confirmed (Section 8, PDF p. 20).

Verus form. Inference: model capabilities and route transitions in a Verus state machine. Prove each local transition and a global invariant forbidding unsafe compositions. This is closer to Verus transition-system proofs than to isolated function contracts.

## technique 4: incremental re-analysis

What it is. To audit later commits cheaply, ABSENTIA reuses a route verdict when no file in the route’s dependency/import closure changed and all such files are byte-identical (Section 4.4, PDF p. 10).

Steps: compare old and new graphs; derive each route’s source/import file set; check the diff; retain unchanged verdicts; re-run agents only for affected routes. On the 30-instance replay, a median commit reused 37% of routes. Nine instances reused at least 70%; eight reused none. Vulnerability recall was 21/30 at both 95% reuse and 0% reuse, versus 19/30 in the main single-run table, with the paper attributing differences to run variation (Section 7.6, PDF p. 19).

Verus form. Inference: attach a hash and dependency set to each verified function/specification. A proof-carrying cache may reuse a theorem only when all referenced definitions and external contracts are unchanged. The hash/dependency mechanism is engineering infrastructure, not a Verus proof primitive.

## technique 5: adjudication and nondeterminism measurement

The benchmark uses a deterministic location gate, then Claude Sonnet 4.6 at temperature zero to judge candidate findings against the advisory oracle without repository source. A graduate researcher independently replayed all credited matches and a sample of rejections; agreement was 81/85 with Cohen’s κ=0.91 (Section 5.2, PDF p. 12).

For eight instances under 100 routes, five full runs each (40 runs) measure nondeterminism. Six instances had identical verdicts each run; average pass@1 is 0.68, pass@5 0.75, and pass5 0.50 (Table 3, PDF p. 16). These rates use eight instances and k=5; they do not estimate large-repository probabilities.

Inference: VL should separate deterministic proof checking from stochastic proposal generation and report denominators, seeds, and adjudicator agreement. A Verus proof can validate a proposed counterexample or contract, while an LLM remains a search component.

## what is proved, measured, and trusted

ABSENTIA measures source-level vulnerability recall, paired fixed-commit behavior, report volume, verifier precision, run stability, cost, and reuse. It does not prove inferred policies, guarantee complete route extraction, or establish safety for all undisclosed defects. Its 30-advisory benchmark is human-validated but narrow. The authors state that route extraction may miss unmatched routes and that the method “will not reach the reproducibility of a static analyzer” (Section 8, PDF p. 20).

Inference: In a verified-Rust product, the trusted base includes the inferred specification, source parser/graph, LLM reasoning, external-library contracts, and the Verus verifier/solver. The threat is specification error: a perfectly proved function can satisfy an invariant that the application never intended. ABSENTIA’s fixed finding schema and independent adjudication reduce unsupported reports but do not remove that risk.

## what VL should not redo

Inference: VL should not build another unconstrained agent prompt for code review. The paper already demonstrates coverage mapping, route-by-route invariant inference, falsification requests, cross-route composition, and dependency-aware reuse. Remaining gaps are complete graph extraction, symbolic policy synthesis, verified composition across many routes, and human-calibrated precision at larger repositories.

## techniques for the catalog

- request-surface graph — map routes, handlers, guards, inputs, and sinks before judging code
- two-pass framework extraction — profile the application, then union independent agent-derived patterns and apply them deterministically
- per-route invariant falsification — enumerate intended properties, locate enforcement, and construct a violating request
- fixed finding schema — require invariant, locations, request, preconditions, and violating effect in every report
- cross-route composition — link capabilities and findings sharing code to expose multi-route attacks
- dependency-aware incremental audit — reuse route verdicts only when changed files and import closures are absent
- deterministic adjudication gate — filter by location, then independently judge findings against a benchmark oracle
- run-stability accounting — report pass@1, pass@k, passk, and their exact instance/run denominators
Checked 2026-10-14 against the paper by a Codex agent: audit record duarte2026absentia; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
