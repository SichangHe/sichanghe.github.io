# Functionally Equivalent or Not? Graph-Grounded Differential Surrogate Execution for Code Equivalence
(authored by agents unless marked 🧑)
Tag: `kachroo2026functionally`, [paper](http://arxiv.org/abs/2610.04371v1)

## scope and claim

FEAGENT audits whether two programs preserve observable behavior when direct execution or complete symbolic models are unavailable. The paper explicitly distinguishes this from proof: “FEAGENT cannot prove universal equivalence from finitely many queries and model predictions.” (section 1, PDF p.2). It instead fixes an assessment specification Σ containing an input domain D, observable fields O, environment assumptions Γ, and resource policy τ (section 3, PDF p.4). Verdicts are `EQUIVALENT`, `INEQUIVALENT`, or `UNCLEAR`; uncertainty is retained when evidence or coverage is incomplete.

## technique 1: typed program-pair graphs and anchor obligations

What it is. Each program becomes a typed attributed graph with repository, file, namespace, type, function, parameter, statement, variable, literal, and external-symbol nodes (section 4.1, PDF p.5). The system aligns entry points by qualified names, signatures, types, documentation, and call context, then expands to public inputs/outputs, exceptions, mutations, effectful calls, branch and loop predicates, transitive callees, data dependencies, and environment assumptions (section 4.2, PDF p.5).

How to apply it. (1) Build one graph per program. (2) Align declared entry points, retaining ambiguous many-to-many matches explicitly. (3) Expand behaviorally relevant anchors and score candidates by symbol, type, role, and local context. (4) Convert aligned anchors into obligations in interface, control, data, effects, and environment categories. (5) Mark each obligation `SUPPORTED`, `CONTRADICTED`, `UNRESOLVED`, or `OUT-OF-SCOPE`. The paper says, “An obligation is not a proof theorem; it is a checkable question” (section 4.2, PDF p.5), such as whether both versions reject a zero denominator with the same exception.

Verus form. Inference: extract an analogous graph from Rust/Verus syntax and call metadata; represent obligations as predicates over an abstract state machine. Verus can prove local contracts and transition invariants, while unresolved external symbols remain explicit assumptions. This graph does not itself prove equivalence.

Evidence and limits. Figure 5 shows graph reachability exposing a cache-state divergence despite identical return values: only guard-satisfying inputs reach `clear_cache`, and the candidate clears one alias instead of all aliases (section 5.5, PDF p.8). The paper's graph front end excludes C/DCE, CUDA, and x86-64 EquiBench subsets (section 5.1, PDF p.7), so coverage is conditional on supported languages and parsers.

## technique 2: bounded, citable structural evidence

What it is. A structural analyst receives Σ, aligned anchors, and a graph-query API rather than a flattened repository. It can perform bounded neighborhood expansion, typed path search, callers/callees, control dependence, backward data slices, symbol lookup, and source retrieval. Accepted evidence is a tuple of claim, polarity, node IDs, relation path, source spans, and assumptions; unsupported prose is discarded (section 4.3, PDF p.6).

How to apply it. (1) Give the analyst only the manifest and graph API. (2) Query a bounded slice around each obligation. (3) Require every claim to cite nodes and source spans. (4) Record query depth, result count, token budget, and graph version. (5) Mark an obligation unresolved when a bound is reached. Compare behavioral roles rather than graph isomorphism: different loop decompositions can be equivalent, while one changed predicate can contradict an obligation (section 4.3, PDF p.6).

Verus form. Inference: use source spans and symbol IDs as audit metadata around Verus proof obligations. A verified Rust checker can ensure citations refer to the checked revision, but it cannot prove that an LLM's natural-language claim is complete.

Evidence. The paper makes replay possible by recording graph version, seed nodes, edge types, depth/budget, returned nodes, and source spans (section 4.3, PDF p.6). This is evidence about auditability, not a guarantee of complete graph coverage.

## technique 3: branch-aware differential surrogate execution

What it is. An input generator turns uncovered control/data obligations into typed proposals: ordinary cases, boundary values around thresholds, aliasing and mutation, empty/singleton structures, permitted exceptions, and combinations that distinguish predicates (section 4.4, PDF p.6). Separate source and target surrogates are blinded to the other program. Each predicts a structured trace `(return, exception, side effects, mutations, termination, step trace)` for the same input; a self-verification pass checks type consistency, branch feasibility, graph citations, and path/observable agreement (section 4.4, PDF p.6).

How to apply it. (1) Select unresolved obligations. (2) Generate typed, de-duplicated witness inputs and record each rationale. (3) Run source and target surrogates independently on one-program slices. (4) Self-check each prediction; repeat only when low-confidence or inconsistent. (5) Compare observable fields with a non-generative comparator returning `MATCH`, `MISMATCH`, or `UNKNOWN`. A mismatch record stores the concrete input, first divergent field, predicted values, trace nodes, and assumptions (section 4.4, PDF p.6).

Verus form. Inference: use this to propose differential tests for Rust, then execute both binaries or verified models. The generated witness is useful only after an executable oracle confirms it; Verus proof code should establish the comparator's interpretation of observable fields where feasible.

Evidence. On EquiBench, every disagreement counted as genuine was confirmed by executing at least one generated input (section 5.5, PDF p.8). FEAGENT's surrogate remains a proposal mechanism; the paper does not claim its predictions alone are sound.

## technique 4: deterministic selective reconciliation

What it is. Reconciliation applies fixed gates in order: missing graphs/alignments/comparators yield `UNCLEAR`; a supported structural contradiction or stable mismatch inside D yields `INEQUIVALENT`; channel conflict or unstable simulations yields `UNCLEAR`; `EQUIVALENT` requires every mandatory obligation supported or exercised, no contradiction, and confidence above a frozen threshold (section 4.5, PDF p.6). No LLM may override the gates.

How to apply it. (1) Freeze Σ and the confidence calibration partition before test evaluation. (2) Run validity, contradiction, conflict, and coverage gates in that order. (3) Sweep the threshold for risk–coverage, then select an operating point from a preregistered false-equivalence bound. (4) Return the verdict with ledger evidence and unresolved obligations.

Verus form. Inference: implement the gates as executable Rust over a ledger, and prove simple invariants such as rejecting a contradiction inside D. The confidence threshold and model calibration remain statistical assumptions outside Verus. The paper states, “When alignment, dependency behavior, path coverage, or surrogate predictions remain unresolved, the correct output is UNCLEAR rather than a forced judgment.” (section 3, PDF p.4)

Evidence. On 1,200 EquiBench pairs, 230 disagreements were challenged and 216 were verified genuine (93.9% of disagreements), giving 18.0% execution-confirmed divergence (216/1,200) (Table 1, PDF p.8). On SWE-bench Verified, 331 test-passing patches produced 109 flags; 94 were confirmed, so 28.4% (94/331) diverged from the reference patch (section 5.4, PDF p.8). These denominators and settings are essential: the latter is only patches that already passed all tests.

## techniques for the catalog

- typed graph obligations — align program anchors and turn interface, control, data, effect, and environment differences into checkable questions
- bounded citable analysis — constrain graph queries and require node, path, and source-span evidence for every claim
- blinded surrogate execution — generate branch-targeting typed inputs and independently predict source and target observables
- selective reconciliation — gate evidence into equivalent, inequivalent, or unclear without forcing uncertain judgments
