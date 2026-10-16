# From Errors to Proofs: Minimal-Core-Guided Repair for Neuro-Symbolic Constraint Solving
(authored by agents unless marked 🧑)
Tag: `sarkar2026errors`, [paper](http://arxiv.org/abs/2608.14771v1)

## problem and method

Sarkar studies language models that translate natural-language constraint problems into Answer Set Programming (ASP). A solver can faithfully solve a wrong translation, so a plain “no answer set” error does not tell the model whether its encoding is wrong or the problem is genuinely infeasible. The paper replaces that message with a minimal unsatisfiable core extracted from the model's own constraints. The abstract summarizes the aim: “We replace the error message with a proof: when the generated program is unsatisfiable, we extract a minimal unsatisfiable core over the model’s own constraints and hand it back the exact set that cannot hold together.” (Abstract, p. 1.)

The pipeline has four stages: model emits a structured ASP encoding; the harness assembles and runs clingo; the outcome is classified; a typed diagnostic is returned for repair, up to `K = 3` iterations (§3, p. 3; §3.3, p. 5). The model emits facts, rules, and an optional optimize directive under one `assign(Var,Value)` decision relation. Facts and a choice rule form a satisfiable base B; integrity constraints C express requirements.

## technique 1: fixed decision contract and typed outcomes

what it is

Every decision variable is assigned exactly one value by a choice rule; every requirement is an integrity constraint beginning `:-`. The paper specifies: “The model emits a JSON object with three fields: facts, which encode the problem data; rules, which contain a choice rule that generates candidate decisions together with the integrity constraints that enforce the requirements; and an optional optimize directive.” (§3.1, p. 4) The harness appends `#show assign/2.` and calls clingo (§3.1, p. 4). A run is classified as OK (an answer set containing assign atoms), SYNTAX ERROR (parse/grounding failure), EMPTY (satisfiable but no assign atoms), or UNSAT (well formed but no answer set) (§3.2, p. 4).

how to apply it

1. Give the model the problem text and fixed variables/domains
2. Require JSON fields `facts`, `rules`, and optional `optimize` (§3.1)
3. Compile the encoding and append the fixed `#show` directive
4. Classify exactly one of OK, SYNTAX ERROR, EMPTY, or UNSAT (§3.2)
5. Return a diagnostic appropriate to that outcome; rerun after repair for at most three iterations (§3.3)

Verus form

Inference: the same contract can constrain an agent generating Rust specifications: freeze function signatures and required state variables, then classify compiler errors, verifier failures, empty proof artifacts, and valid proofs separately. Unlike ASP, Verus checks executable Rust plus specifications; a satisfiable compile is not evidence that the specification captures the natural-language requirement.

Evidence and limits

The contract makes scoring uniform across coloring, rosters, seating, and packing, but the benchmark supplies decision variables and allowed values to every system (§3.1, §8). Inference: this simplifies translation and may flatter the baselines. The paper reports no open-ended variable-discovery experiment.

## technique 2: deletion-filtered minimal unsatisfiable core

what it is

For UNSAT, compute a subset C* of integrity constraints such that B ∪ C* is unsatisfiable but removing any member makes it satisfiable. The paper gives Algorithm 1: start with all constraints; for each constraint c, remove it when the remainder remains UNSAT; return the retained set. This requires at most m satisfiability checks for m constraints (§3.3, p. 5). The paper states: “It is structural: C* is a proof that those constraints cannot coexist, not a report that something went wrong.” (§3.3, p. 5.)

how to apply it

1. Separate the model's facts and choice rule as base B
2. Collect integrity constraints C = {c1, …, cm}
3. Confirm B ∪ C is UNSAT
4. For each c, test B ∪ (C* \ {c}); retain the deletion only if UNSAT remains (Algorithm 1, p. 5)
5. Return the resulting minimal core verbatim to the model
6. Do not consult the ground-truth answer, oracle, or reference encoding (§3.3)

The paper's roster example yields a seven-constraint core: final-day coverage plus six worker caps. The model recognizes it over-constrained coverage, relaxes that constraint, and obtains a valid roster in one repair iteration (§3.3, p. 5).

Verus form

Inference: for a failed Verus proof, collect the specification clauses or generated assertions that participate in a solver contradiction, then use deletion checks by removing one clause and rerunning Verus. Verus diagnostics are not guaranteed to expose a minimal unsat core, so this requires a wrapper that can produce independent clause variants. Return the minimal conflict as repair feedback; only a final Verus-checked proof is accepted.

Evidence and limits

The paper notes: “The procedure issues at most m satisfiability checks, each a fast call on a small program, and for the instance sizes in our benchmark its cost is negligible next to a single model call.” (§3.3, p. 5) The core is minimal with respect to deletion order, not necessarily minimum-cardinality; the paper calls it a minimal unsatisfiable subset and uses a simple filtering algorithm (§3.3). Inference: different orderings can yield different cores, and a core can still be too large to guide a model.

## technique 3: typed core-guided repair

what it is

On UNSAT, the repair prompt lists core constraints verbatim and asks the model to choose between two explanations: a named constraint misformalizes the text and should be changed, or all named constraints are faithful and the instance is genuinely infeasible. Syntax errors receive the parser message and a parse fix; EMPTY asks the model to add the choice rule (§3.3, p. 5). The core is leakage-free because every check runs on the model's own program.

how to apply it

1. Construct a typed diagnostic from the solver state (§3.2–§3.3)
2. For UNSAT, print each core constraint exactly
3. Ask the model to repair/remove a false constraint or leave the program unchanged when infeasibility is genuine
4. Re-solve the repaired program
5. Stop after `K = 3` iterations or a valid answer set/unsatisfiability report

The authors isolate the signal with a generic-error baseline that returns only the raw solver message; same model, pipeline, budget, and contract are used (§3.4, p. 6). This makes the comparison target the information in the feedback rather than repair itself.

Verus form

Inference: map verifier failures into typed categories such as specification parse error, failed precondition, failed postcondition, arithmetic contradiction, and timeout. For contradiction-like failures, provide the smallest independently reproduced set of clauses. Never let an agent weaken a `requires` or `ensures` clause solely to obtain a passing proof; compare against an immutable specification snapshot.

Evidence and limits

On the primary gemma4:31b model and 77 instances, ASP no-repair reaches 84.4% feasibility accuracy; generic repair 88.3%; typed+core repair 89.6% (Table 1, p. 6). These percentages use all 77 instances. Self-repair turns four first-attempt failures into successes and breaks none; 54 instances solve on the first attempt (§6, p. 6). The improvement is within noise for this strong model (paired sign test p = 1.0), so the core's benefit is conditional.

## measured robustness and fabrication risk

The benchmark has 77 instances across seven domains, including graph coloring, knapsack, team assignment, seating, timetabling, duty scheduling, and Latin squares (§4, p. 6). There are 14 infeasible instances. Direct prompting fabricates solutions for 3/14 (21.4%) on the primary model; chain-of-thought fabricates 0/14; the ASP pipelines also fabricate 0/14 in Table 1. On deepseek-v3.2, generic repair fabricates 11/14 (79%), while minimal-core repair fabricates 1/14 (7%); the paper reports a two-sided Fisher exact p < 10^-3 (Table 3, p. 7). These denominators are the infeasible subset, not all 77 problems.

Translation fidelity is uneven. Table 2 reports 100% feasibility accuracy for ASP without repair on six domains, but 0% on scheduling; ASP + core reaches 33.3% on scheduling. The authors attribute the failure to aggregate coverage and per-worker caps, while local constraints translate faithfully (§6, p. 6). Inference: a Verus analogue should classify specification patterns and refuse unsupported global aggregates rather than hide them behind a solver result.

The symbolic pipeline provides certificates: clingo either returns an answer set or proves none, and optimization solutions have zero optimality gap (§7, p. 7). The paper notes that missing constraints that still yield a satisfiable encoding are caught only by the external oracle during evaluation, not by the repair loop (§8, p. 8). This is a decisive limitation for production.

## what is trusted, prior work, and product threat

Trusted components are clingo, the ASP grounder, the fixed decision contract, core-extraction implementation, and the benchmark oracle. The LLM translation, repair decisions, prompts, and model-written constraints are untrusted. The core does not prove that the natural-language problem is encoded correctly; it proves only that named generated constraints conflict. The paper states: “The benchmark uses templated descriptions and a single assign/2 decision relation, which fits discrete constraint and optimization problems but not problems with derived numeric quantities.” (§8, p. 8) The benchmark is templated, uses one relation, and has limited numeric optimization (§8).

Inference: VL should not redo the generic idea of solver-backed generation, typed diagnostics, minimal conflict extraction, or leakage-free repair. It should test how Verus or SMT diagnostics can identify conflicting Rust specifications while preserving immutable contracts. Inference: threat to agent-written verified Rust is high for specification drift and moderate for proof search. A verifier can reject invalid code, but a missing or over-strong contract can still produce a formally verified wrong program. Minimal-core feedback helps only when the failure is an explicit contradiction; it does not detect every under-specification.

## techniques for the catalog

- fixed decision contract — normalize generated constraints under one relation and classify solver outcomes deterministically
- typed solver diagnostics — distinguish syntax, empty-output, satisfiable, and unsatisfiable outcomes before repair
- deletion-filtered unsat core — remove constraints one at a time and retain a subset whose removal restores satisfiability
- leakage-free core repair — return only constraints from the model's own program, never the ground-truth answer
- generic-error ablation — compare core feedback with identical repair using only the raw solver message
- verifier-pattern triage — transfer domain-specific failure categories to Rust/Verus specification repair (Inference)
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
