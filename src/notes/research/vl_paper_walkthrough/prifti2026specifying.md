# Specifying AI-SDLC Processes: A Protocol Language for Human-Agent Boundaries
(authored by agents unless marked 🧑)
Tag: `prifti2026specifying`, [paper](https://www.semanticscholar.org/paper/4dee1a398c3d9716c091df6ee8c173be431d16ad)

## language and enforcement model

The paper defines a domain-specific language in which a protocol is a tuple of modes, validators, disagreement policy, and constraints: `P = ⟨M*, V*, D, C*⟩` (section 4.1, pages 6–7). Modes contain roles and tool sets; validators run at declared phases and return severities `pass < warn < blocker`; policies are quorum thresholds; constraints are positive or negative predicates. The key distinction is policy versus mechanism: “protocols specify what should happen; implementations use enforcement primitives to bound process non-determinism.” (section 4, page 6)

Use the language by (1) declaring modes and disjoint tool sets; (2) declaring unique roles and responsibilities; (3) attaching validators to pre-execute, post-execute, or transition phases; (4) choosing `any`, `majority`, `unanimous`, or configured `quorum(k)`; (5) declaring constraints and registered predicates; (6) compiling and rejecting malformed protocols; (7) executing only through the engine’s validate, token, dispatch, recovery, and escalation rules. The abstract language leaves implementation details such as exact validator phases extensible (section 4.3, page 7).

## technique: compile-time well-formedness gates

The five checks are mode separation (WF1: tool sets of distinct modes are disjoint), role uniqueness within each mode (WF2), validator coverage for every task dispatch (WF3), total policy behavior over all validator outcomes (WF4), and unique, nonempty, registered constraints (WF5) (section 4.4, pages 8–9). A protocol failing a check is rejected at load. WF4 is only partially enforced for quorum policies with fewer than three validators, and WF5 checks declaration consistency rather than logical non-contradiction; these limitations are explicit in the paper.

Verus form (Inference): represent a protocol as Rust structs and define a `spec fn well_formed` predicate. Prove separate `proof fn`s for disjoint tool sets, unique role IDs, validator coverage, total severity-policy cases, and constraint registration. Use `requires well_formed(p)` on the executable engine entry point. Logical satisfiability of arbitrary predicates remains outside a simple Verus structural check, matching the paper’s WF5 boundary.

## technique: token-gated operational semantics

Validation collects results from validators at the current phase. If `apply_policy(D, results) = proceed`, the engine issues a fresh token containing task reference, validator signatures, and timestamp; otherwise it returns bottom and dispatch cannot execute. The paper states, “In particular, a blocker forces apply_policy = hard_stop ≠ proceed, so no token can be issued over blocker-carrying results (INV3).” (section 4.7, page 10)

Apply it as follows: (1) select validators for the phase; (2) evaluate each on the current context; (3) combine severities under the selected quorum policy; (4) issue a signed token only on proceed; (5) dispatch only with a valid token and an allowed current-mode tool; (6) append an audit record for each operation. Tokens are scoped to one dispatch and are excluded from persisted session state; on resume, validators rerun against current state (sections 4.5–4.6, pages 9–10).

Verus form (Inference): use a token struct with ghost validator evidence and a `spec fn valid_token`; give `dispatch` a `requires valid_token(t)` and an `ensures` that execution implies prior validation. Keep signing and key secrecy in the trusted base. Do not use a runtime `proof fn` as a signer; the paper’s implementation uses HMAC-signed single-use tokens (section 4.11, page 14).

## technique: bounded recovery or explicit escalation

A blocked task has exactly two paths. A repairable warning with recovery depth below `R` spawns a sub-instance under the same protocol tuple and mode, then revalidates the parent. A blocker or exhausted recovery budget halts with a structured human-decision payload. The parent cannot proceed without revalidation (section 4.7, pages 10–11). This is the operational form of recursive orchestration: “The orchestration loop forms a Kleene closure” (section 4.3, page 7), so invariants for one loop compose by induction over nested instances.

Verus form (Inference): model recovery depth as a ghost natural bounded by `R`; prove a `proof fn` that each recovery transition decreases remaining budget and that every dispatch follows a new validation token. Use a loop `invariant` for the bound. Escalation is an explicit terminal state with no dispatch transition.

## technique: state and session invariants

The implementation maintains five invariants: token integrity (INV1), capability boundary (INV2), non-overridable blockers (INV3), audit completeness (INV4), and session resumability (INV5) (section 4.10, pages 13–14). Theorem 4.4 claims that a well-formed protocol satisfies INV1–INV4 under three assumptions: unforgeable signing, infrastructure-enforced tool boundaries, and engine mediation of every operation. The proof sketch is induction over the operational rules; Corollary 4.5 states that every execute is preceded by validation.

The theorem’s limits are part of the result. It does not ensure that policy predicates are sensible, constraints are logically consistent, or validator judgments are accurate. A compromised signing key or out-of-band tool access voids the corresponding invariant (section 4.11, pages 14–15). The paper also reports 17 property tests targeting selected invariants and well-formedness, with 10,000 randomized examples per test and zero violations, plus a Lean 4 mechanization (section 4.11, page 15). These tests corroborate implementation behavior; they are not a replacement for the conditional theorem.

## technique: make disagreement policies explicit

The paper compares four policies through Monte Carlo simulation: 25,000 trials per point, three validators, and validator accuracy swept from 0.5 to 1.0 (section 6.1, page 20). At accuracy 0.5, Unanimous admitted 1.6% of bad tasks and refused 87.6% of good tasks; Any admitted 10.5% of bad tasks and refused 52.5% of good tasks; Majority admitted 6.1% of bad tasks and refused 64.9% of good tasks. These percentages use the paper’s “bad tasks” and “good tasks” denominators; the study says Quorum equals Unanimous at `N=3` because `ceil(0.67·3)=3`. The simulation caught an implementation defect in which warnings counted as approvals and erased policy differences (section 6.1, page 20).

Verus form (Inference): encode policy as a total `spec fn` over a finite result set, prove blocker precedence and quorum threshold lemmas, and test policy decisions against generated result combinations. The Monte Carlo percentages are empirical policy trade-offs, not proof obligations.

## technique: quantify detection, overhead, and capability boundaries

The failure model assumes `N` sequential stages, independent per-stage defect probabilities `p_i`, validator miss rate `p_v`, common correlation `ρ`, and recovery rate `p_recovery` (section 4.9, pages 11–13). The quorum miss formula is `Pmiss = p_v^K + ρ(p_v − p_v^K)`. With `p_v=0.2`, simulation gave `Pmiss=0.008` for `K=3, ρ=0` and `0.2` for `ρ=1` (section 6.3, page 21). Across pipeline lengths, behavioral failure was 0.10 at `N=1`, 0.45 at `N=5`, and 0.91 at `N=20`; structural failure was 0.016, 0.080, and 0.318 respectively, under the paper’s modeled parameters (section 6.3, page 21). The model is illustrative and conditional, not a deployment forecast.

Governance overhead was measured with inference components stubbed: CPU operations were under 50 microseconds, audit append 127 microseconds, checkpoint write 672 microseconds, and the end-to-end governed path added 33.3 milliseconds over baseline, or 1.1% against a representative 3-second inference call (section 6.2, page 20). SWE-bench Verified used a paired bug-fixing design. Across four runs, executed protocol resolve rates were 69.1% (n=94), 66.7% (n=96), 72.4% (n=98), and 67.0% (n=191), compared with bare/prose baselines in Table 3 (section 6.5.2, pages 24–25). In the highest-power ablation, the plain executed loop B′ resolved 59.7% and engine arm C 60.7% on the same `n=191` pass; B′ versus C had `p=0.90`, so the benchmark measured the loop gain, not engine-only governance (section 6.5.3, page 25).

The capability boundary is material: with gpt-oss:20b, rates were A 9.1%, B 19.2%, C 14.1% (`n=99`), and C did not significantly beat prose (`p=0.33`) (section 6.5.5, page 26). Inference: verified Rust agents face the same floor—enforcement guarantees that checks run, but cannot manufacture a correct proof or patch from an incapable generator. VL should reuse executable gating, recovery budgets, and explicit trust assumptions, while avoiding claims that these benchmarks establish human-in-the-loop safety or unrestricted semantic correctness.

## techniques for the catalog

- protocol DSL — encode modes, roles, validators, policies, and constraints as an executable process artifact
- well-formedness gates — reject tool overlap, duplicate roles, uncovered dispatches, incomplete policies, and malformed constraints
- token-gated dispatch — issue signed single-use tokens after validation and require them for execution
- bounded recovery — spawn same-protocol subtasks for warnings and revalidate before parent progress
- invariant enforcement — maintain token, capability, blocker, audit, and session invariants under explicit assumptions
- policy trade-off analysis — quantify false-pass and false-block behavior with denominator-labeled simulations
- capability-aware evaluation — measure process gains and identify the base-agent capability floor

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
