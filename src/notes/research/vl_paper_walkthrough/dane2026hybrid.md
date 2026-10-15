# Towards Formal Verification of Hybrid Synchronous Programs with Refinement Types
(authored by agents unless marked 🧑)
Tag: `dane2026hybrid`, [paper](http://arxiv.org/abs/2605.04377v1)

## purpose and scope

The paper develops a formal semantics and refinement type system for hybrid synchronous programs. The programs combine discrete synchronous controller steps with continuous ordinary differential equations and event-triggered resets. The authors state their goal directly: “We formalize the operational semantics of initial value problems and zero-crossing detection expressed in a synchronous programming language, extend its type system for verification thereof, and prove its soundness.” (Abstract, p. 1).

The target language follows Zélus and extends the discrete MARVeLus core. Its safety properties are trace invariants over continuous and discrete phases. The paper's contribution is a language-level proof method, not a verified numerical ODE solver. The semantics assumes solutions of the dynamical systems. Inference: a Verus implementation would need an explicit numerical model and a separate argument about floating-point or solver error before its proofs could support physical hardware.

## technique 1: define zero-crossings from observable behavior

What it is. A zero-crossing is the event that triggers a reset. The paper rejects a bare sign-change test because a guard can stay at zero over an interval. It separates the interval on which a continuous function is zero from behavior immediately before and after it.

When to use it. Use this definition whenever a continuous guard triggers discrete code. Without it, the event time and reset branch are ambiguous, so a preservation proof can reason about the wrong execution.

How to do it.

1. Restrict the guard function `f` to a continuous interval and choose a candidate point `z` with `f(z) = 0` (Section 3, pp. 5–6).
2. Compute the maximal zero interval around `z`, written `⟦a;b⟧`, by taking the infimum of points that remain zero to the left and the supremum of points that remain zero to the right (Section 3, p. 5).
3. Distinguish passing (`a = b`) from staying (`a < b`) behavior (Section 3.1, p. 6).
4. For a negative-to-positive crossing, choose `z = b` and require zero throughout `[a,b]`, a negative value arbitrarily close to the left of `a`, and a positive value arbitrarily close to the right of `b`. The paper's definition states: “Definition 1. z ∈ R is a zero-crossing for a continuous function f if and only if there exist a ∈ R and b ∈ R with a ≤ b and z = b such that” (Section 3.2, p. 6).
5. Use the symmetric construction for positive-to-negative crossings if the language needs both directions (Section 3, p. 5).

Verus form. Inference: represent a guard as a ghost `spec fn` over a real-valued state and represent an event candidate with a ghost record containing `a`, `b`, and `z`. Use proof functions with `requires` clauses for continuity and zero-interval facts and `ensures` clauses for the three boundary conditions. Inference: Verus's integer and sequence reasoning does not provide real analysis or ODE continuity automatically; the continuous-function facts must be axioms, imported lemmas, or a discretized model whose assumptions are documented.

Evidence and limits. The paper lists three desirable properties: a sign change must have a crossing, a crossing must have negative behavior on the left and positive behavior on the right, and passing and corresponding staying cases must agree (Section 3.2, p. 6). It analyzes 85 combinations of behavior (Section 3.1, p. 6). The definition is for negative-to-positive crossings; the opposite direction is described as symmetric. Inference: a product using only the stated definition must not claim coverage of exogenous events or other temporal operators.

## technique 2: invariant-only refinement types

What it is. A refinement type strengthens a base type with a predicate. In this hybrid setting, the predicate is a trace invariant rather than a point-wise property. The paper says: “A key difference is the omission of ‘point-wise’ temporal predicates such as ⃝ and hd(), which apply instantaneously to a specific point in time and are less useful for continuous programs.” (Section 4.1, p. 8).

When to use it. Use an invariant refinement when the safety requirement must hold throughout every continuous trajectory and immediately after every reset.

How to do it.

1. Choose a base type `b` for a continuous state or tuple.
2. Write a state predicate `p` over continuous expressions, using conjunction and negation as needed (Section 4.1, p. 8).
3. Form the refinement `{v : b | □p}`. The grammar in Figure 3 restricts trace predicates to `□p` (Section 4.1, p. 9).
4. Require the initial continuous state and every reset result to have the refinement type.
5. Prove that the predicate holds for all times in each continuous segment, then apply the same type to the next segment (Sections 6.1 and 7.1, pp. 13, 16–17).

Verus form. Inference: encode `p` as a `spec fn` over a ghost state and use a function contract whose `ensures` states the invariant at the returned state. For an executable loop, put the segment invariant in a loop `invariant` declaration and prove reset preservation with a `proof fn`. Inference: Verus has no built-in temporal `□`; the trace quantification must be represented by an inductive invariant over sampled steps or by a ghost trace with a separate preservation lemma.

Evidence and limits. The paper defines satisfaction of `□q` by requiring `q` for every point of every continuous execution and for every post-reset state (Definition 4, Section 6.1, p. 13). It explicitly says it makes no liveness claim for Zeno behavior, where infinitely many events can occur in finite time (Section 6.1, p. 13). Inference: a Verus proof of a sampled invariant cannot silently extend to continuous time or Zeno limits.

## technique 3: abstract flow semantics and deterministic event selection

What it is. The semantics models a continuous segment by an abstract solution `ρ(t)` of the ODE until the first monitored zero-crossing. It alternates a discrete synchronous iteration with continuous integration; when an event occurs, the selected reset runs and starts the next segment.

When to use it. Use this operational decomposition when executable controller code and physical evolution must share one source-level semantics.

How to do it.

1. Evaluate the initial continuous definition with discrete semantics (Section 6, pp. 10–11).
2. Invoke the abstract `flow` rule with ODE expressions, initial state, and guard expressions. The paper assumes a solution exists and defines the trace until `tr`, the first zero-crossing (Section 6, p. 11).
3. If several guards cross at the same time, choose the minimum syntactic index. The paper states: “The semantics of Zélus deterministically chooses the first zero-crossing by syntactic order.” (Section 6, p. 12).
4. Evaluate the selected reset using the continuous variables immediately before reset, and produce the next expression and state (Section 6, p. 12).
5. For an infinite segment, return the inert `[∞]` residual; no reset is triggered (Section 6, p. 12).

Verus form. Inference: represent a segment as a ghost state transition with a trace sequence, event index, and elapsed time abstraction. Use `requires` for a well-formed initial state and guard set and `ensures` for the selected index and post-reset state. Inference: a `while` loop over sampled segments can use `invariant` for the safety predicate and `decreases` for a finite simulation bound, but it cannot prove arbitrary real-time flow without an imported flow theorem.

Evidence and limits. The paper defines the first zero-crossing as one event at `tr` with no earlier event among the monitored functions (Definition 3, Section 6, p. 11). It assumes solutions exist and says syntactic determination of the solution is out of scope (Section 6, p. 11). The semantics covers zero-crossing-induced transitions, not inherently discrete or exogenous events (Section 10, p. 19). Inference: this is a major product boundary for controllers whose interrupts do not arise from the modeled guards.

## technique 4: differential invariants plus active guards

What it is. The type system adapts differential dynamic logic's differential-invariant rule to zero-crossing events. A guard can protect an invariant only when it is active: it starts negative, or starts at zero with a negative derivative, so it must spend nonzero time evolving toward zero before the crossing.

When to use it. Use active guards when a safety condition may be violated during a continuous segment but a monitored event is guaranteed to interrupt the segment first.

How to do it.

1. Compute `Active(v,{u1,…,un})` from the current state and each guard's instantaneous value and symbolic derivative (Definition 5, Section 7, p. 14).
2. Split the target invariant into a part established by differential reasoning and a part protected by active guards. The paper requires a predicate `ϕ` such that `(ϕ ∧ Active(v,{u1,…,un})) ⇒ I` (Section 7, p. 14).
3. For the finite case, prove the initial state, the continuous segment, and every reset branch under the typing rule `(T-DER-FIN)` (Figure 5, p. 15).
4. Use a differential invariant to show the remaining part of the invariant throughout the flow. The paper's dL rule checks preservation of the symbolic derivative under the evolution-domain facts (Section 2.3, p. 3).
5. Prove every reset restores the refinement type, then apply the argument inductively to the next segment (Section 7, pp. 14–15).
6. For an infinite segment, use the monitored-domain lemma for all time and type the `[∞]` residual directly (Section 7, p. 15).

Verus form. Inference: encode `Active` as a `spec fn` over a ghost state and a sequence of guards. Prove a lemma that an active guard remains nonpositive until its first crossing, and a second lemma that the differential invariant implies the target predicate under `Active`. Use `requires`/`ensures` on reset proof functions and a loop `invariant` for segment induction. Inference: Verus's supported arithmetic can express the algebraic side conditions, but a derivative and continuous-flow theorem are outside ordinary Rust execution and must be modeled explicitly.

Evidence and limits. The paper proves three preservation lemmas. Continuous Type Preservation states that a well-typed hybrid program preserves `□ϕ` over the segment, gives a well-typed reset value in the finite case, and leaves a well-typed next expression (Lemma 3, Section 7.1, pp. 16–17). The proof combines the operational trace, Lemma 1's active-domain preservation, and the differential invariant rule (Section 7.1, p. 17). The authors note that the existential annotations in the typing rule could be supplied by users or simple heuristics (Section 7, p. 15). Inference: automation of these witnesses is an engineering problem, not supplied by the metatheory.

## worked examples and measured evidence

The water-tank example uses two upward guards to maintain `1 ≤ level ≤ 9`; the paper says each guard becomes critical before a bound is violated, and each reset drives the dynamics inward (Section 8.1, p. 17). The automatic-braking example proves an invariant that the stopping position remains below the obstacle, then applies a reset that sets acceleration to the required braking value (Section 8.2, p. 17). These are proof sketches, not a benchmark with a denominator of verified programs. Detailed proofs are in the extended version (Section 8, p. 17).

## what is proved, trusted, and left unresolved

The paper proves soundness of its hybrid type system relative to its operational semantics, zero-crossing definition, differential reasoning premises, and assumed ODE solutions. It does not prove numerical solver correctness, floating-point behavior, liveness under Zeno execution, or safety for exogenous events. The authors explicitly assume that floating-point representations are precise enough to treat them as reals and defer floating-point error treatment to prior work (Section 4.1, p. 8). Inference: a Verus product must mark the real-number abstraction, flow oracle, and external-event model as trusted assumptions.

## what VL should reuse and threat to agent-written verified Rust

Inference: VL can reuse the paper's phase structure: model a segment, identify the first event, prove continuous preservation, prove reset preservation, and repeat. Its active-guard idea is useful for APIs where a precondition is guaranteed until a monitored transition. Verus can encode the state predicates and reset contracts with `spec fn`, `requires`, `ensures`, `assert`, `proof fn`, and loop `invariant`.

Inference: the threat to agent-written verified Rust is specification drift at the event boundary. An agent may prove a discrete postcondition while omitting continuous evolution, choose an event priority inconsistent with runtime code, or assume a guard is active when its derivative condition is false. A VL checker should therefore require an explicit event model and a proof that the executable reset corresponds to the modeled transition.

## techniques for the catalog

- zero-crossing definition — define event time from a maximal zero interval and one-sided sign behavior
- invariant refinement types — encode safety as `□p` over every continuous and discrete phase
- flow-and-reset semantics — model ODE evolution to the first event and deterministic reset selection
- active-guard reasoning — combine guard-protected domains with differential invariants
- segment induction — prove initial state, flow, reset, and next-segment preservation in sequence

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
