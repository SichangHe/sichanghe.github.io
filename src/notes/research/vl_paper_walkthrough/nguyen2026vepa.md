# VEPA: Verified Evolving Formal Policy for Lifelong LLM Agent Guardrails
(authored by agents unless marked 🧑)
Tag: `nguyen2026vepa`, [paper](https://www.semanticscholar.org/paper/e9a02750fcb955b1f710d5a3dc0cc237a84d7266)

## what VEPA guarantees

VEPA evolves executable guardrail rules from deployment feedback while separating proposal, verification, and authority. An event is parsed into a typed record; symbolic rules return allow, refuse, or abstain. An LLM proposes patches, a deterministic verifier rejects malformed or conflicting policies, and an evidence layer activates only rules whose observed error risk is below a configured bound. The abstract states: “a deterministic verifier only accepts policies that are structurally valid and conflict-free.” (Abstract, p. 1)

The guarantee is conditional. The parser is an LLM, so claims begin after a fixed typed event exists. The paper says, “our guarantees apply after parsing: given a fixed typed event, verification and execution are deterministic and reproducible.” (Section 3.1, p. 4)

## technique 1: typed event and rule representation

What it is. Represent each event as a typed record with actor, action, data, recipient, purpose, authorization, context, and tool fields. Rules are conjunctions of typed predicates over a fixed schema paired with allow or refuse. A rule fires when the event satisfies its condition.

When to use it. Use this boundary when raw agent traces contain heterogeneous context but enforcement must be deterministic and auditable. Keep unknown fields explicit rather than guessing values.

How to do it.

1. Define a finite schema and vocabularies, such as `data.sensitivity ∈ {public, confidential}` (Section 3.1, p. 4).
2. Parse raw traces into the typed record; the lightweight LLM parser extracts only supported information and assigns `unknown` when unavailable (Section 3.1, p. 4).
3. Define each rule as `(condition, decision)` and its scope as all typed events satisfying the condition (Section 3.1, p. 4).
4. Evaluate matching rules deterministically; return the rule's decision or abstain if none applies (Section 3.2.2, p. 8).

Verus form. Inference: define Rust enums/structs for event fields and rules, and `spec fn matches` and `spec fn decision` over them. Use `requires` to ensure parsed values belong to the schema and `ensures` to state deterministic decision behavior. Inference: parser correctness is outside Verus unless the parser itself is modeled and verified; the conditional guarantee must be documented.

Evidence and limits. A three-predicate rule evaluates in approximately 0.25 ms in the authors' implementation (Section 3.2.2, p. 8), but this is a single implementation measurement. Free-form content and parser errors remain outside symbolic guarantees.

## technique 2: conflict and regression verification

What it is. Define a conflict when opposite-decision rules overlap on any event. Define regression when an updated policy changes a previously correct decision. A deterministic verifier checks both using the typed event space and recorded examples.

When to use it. Run these checks on every candidate policy update. Conflicts prevent ambiguous inference; regression checks preserve behavior already known to be correct.

How to do it.

1. Maintain failure set `F_t` of events the previous policy mishandled and correct set `C_t` of correctly handled labeled events (Section 3.2.1, p. 6).
2. For every opposite-decision rule pair, test whether their typed predicate scopes intersect; reject if a witness event exists (Definition 1, Section 3.1, p. 5).
3. Execute the candidate on every `(event,label)` in `C_t`; collect those whose decision changes as `Reg(π)` (Definition 2, Section 3.1, p. 5).
4. Accept only a well-formed, conflict-free candidate; use regression as an optimization objective rather than silently overriding it (Eq. 1, Section 3.2.1, p. 6).

Verus form. Inference: encode `spec fn conflict` and `spec fn regresses`, then write proof functions whose `ensures` state that accepted policies have no conflicting rule pair and preserve all supplied correct examples. Quantified overlap requires a finite event model or explicit witnesses; Verus cannot infer the paper's policy-space decision procedure automatically.

Evidence and limits. Structural verification proves only absence of overlap and preservation on `C_t`; it cannot show generalization to unseen events. VEPA therefore adds evidence-aware authority.

## technique 3: archive-based Pareto policy evolution

What it is. Search over an archive of feasible policies instead of repeatedly mutating one candidate. The two objectives are failure repair and regression avoidance. Keep the non-dominated Pareto frontier, sample a parent inversely to behavioral density, ask the LLM for typed edits, verify the child, and select the final policy by a deterministic max-min rule.

When to use it. Use this when updates trade off fixing new failures against preserving old decisions and a single greedy search may commit to a local optimum.

How to do it.

1. Initialize archive `K_t` and frontier with the previous policy (Section 3.2.1, p. 7).
2. Allow typed edits `Add`, `Delete`, `Rewrite`, `Split`, and `Merge` (Section 3.2.1, p. 6).
3. Sample a frontier parent with probability proportional to inverse behavioral density, where similarity is agreement over `F_t ∪ C_t` (Section 3.2.1, p. 7).
4. Give the LLM the parent, unresolved failures, regression witnesses, and rejected-candidate conflict witnesses; obtain a child patch (Section 3.2.1, p. 7).
5. Verify well-formedness and conflict-freedom. Evaluate failure-repair score `M_F` and regression score `M_R`; add accepted children and remove dominated policies (Eq. 1, Section 3.2.1, pp. 6–7).
6. After `K` iterations, choose `arg max min(M_F, 1 − M_R)` on the frontier (Eq. 2, Section 3.2.1, p. 8).

Verus form. Inference: represent policies and finite evidence as ghost sequences or sets; specify `M_F`, `M_R`, and dominance as `spec fn`s. Use proof functions to show that each accepted edit preserves schema well-formedness and conflict-freedom. The LLM search and Pareto archive are untrusted candidate generation; Verus checks the selected policy's executable semantics.

Evidence and limits. The paper gives an algorithm and deployment experiments, not a theorem that Pareto search finds an optimum. Inverse-density sampling is a heuristic for behavioral diversity. The finite evidence objectives can miss future event classes.

## technique 4: evidence-aware rule authority

What it is. Keep all verified rules for audit, but activate only rules with enough empirical support. For rule `r`, count supporting labels `s_t(r)` and contradictions `c_t(r)`, use a Beta prior for error probability, and activate when an upper posterior quantile is below deployment tolerance.

When to use it. Use this after structural verification when a rule may be conflict-free yet overfit a few observations. New or modified rules restart from the fixed prior and are evaluated over all accumulated evidence in their current scope.

How to do it.

1. For each verified rule, collect labeled observations whose events satisfy its predicate (Section 3.2.2, p. 8).
2. Count matching labels (`s_t`) and contradictory labels (`c_t`) (Section 3.2.2, p. 8).
3. Model rule error `q_r` with `Beta(α_0, β_0)`; update to `Beta(α_0+c_t, β_0+s_t)` (Section 3.2.2, p. 8).
4. Compute upper posterior quantile `U_t(r)` at level `1−δ_dr`; activate iff `U_t(r) ≤ τ_dr` (Section 3.2.2, p. 8).
5. On inference, allow only active rules to decide; abstain otherwise and route to a deployment-specific fallback (Section 3.2.2, p. 9).

Verus form. Inference: implement exact rational or bounded numeric support counts in Rust, define a `spec fn authority` for the threshold, and prove with `ensures` that an active rule satisfies the configured count/threshold predicate. A statistical posterior is a policy assumption, not a proof of real-world risk. Inference: if floating-point quantiles are used, the numeric implementation and rounding need separate verification.

Evidence. Active-policy coverage reaches approximately 80% on ASSEBench Safety, 89% on ASSEBench Security, and 88% on ATBench by the final round (Figure 4 and Section 4.2, p. 11). These are approximate plotted percentages over each benchmark's unseen events. A three-predicate rule's 0.25 ms evaluation cost is negligible relative to LLM inference (Section 3.2.2, p. 8).

## evaluation and trust boundary

VEPA evaluates ASSEBench-Safety, ASSEBench-Security, and ATBench in online streams, with five shuffled-stream seeds and cumulative prequential macro-F1 over allow/refuse classes (Section 4.1, p. 10). At the final round, it reaches F1 0.81 on Safety and 0.76 on ATBench, beating the strongest baselines by 0.02 and 0.09 (Section 4.2, p. 11). On a mixed stream it reaches approximately 0.86 versus 0.78 for AGrail and 0.80 for LiSA; with 10% independently flipped feedback labels, it reaches approximately 0.81 versus 0.77 and 0.76 (Section 4.3, p. 11). The denominators for these plotted F1 values are benchmark event streams and five seeds; the paper does not give raw event counts in the cited text.

Trusted or assumed components include the LLM event parser, LLM patch generator, benchmark labels, Beta-Bernoulli model and thresholds, fallback LLM, and deterministic verifier implementation. The guarantee covers only fixed parsed events and active rules. The paper's own conclusion is narrower than end-to-end safety: “Formal guarantees remain restricted to events covered by the active policy.” (Section 4.3, p. 11)

Inference: threat to agent-written verified Rust is moderate. VEPA's separation of proposal, deterministic checking, and authority is directly useful for a product that lets agents evolve Verus specifications. Its statistical authority layer does not replace proof of Rust functional correctness, parser correctness, or contract adequacy. VL should reuse typed event boundaries, witness-producing conflict/regression checks, archive search, and explicit authority state; it should not claim that sampled evidence establishes universal safety. Existing VEPA experiments already cover mixed streams, noisy feedback, longer horizons, and fallback, so a new product evaluation should target Rust/Verus proof artifacts and parser soundness.

## techniques for the catalog

- typed event boundary — parse raw traces into schema-checked records before deterministic rule execution
- conflict and regression checks — reject overlapping opposite rules and candidates that change known-correct decisions
- Pareto policy evolution — archive feasible patches and search non-dominated repair/non-regression trade-offs
- evidence-aware authority — activate verified rules only when an upper posterior error bound meets a deployment threshold

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
