# A Short Counterexample Property for Safety and Liveness Verification of Fault-Tolerant Distributed Algorithms
(authored by agents unless marked 🧑)
Tag: `konnov2016short`, [paper](http://arxiv.org/abs/1608.05327v2)

The paper targets threshold-guarded distributed algorithms with parameterized process counts and fault counts. It models local process states with counters, shared variables that are never decreased, and threshold guards over those variables. Safety and liveness violations are written in ELTLFT, a fragment using propositional formulas, `F` (eventually), and `G` (always), with the existential path quantifier `E`. The central result is that if a specification is violated, a counterexample exists whose length is bounded independently of the parameters; the bound depends on the process code (Section 1, p. 2). “Our method is based on a short counterexample property: if a distributed algorithm violates a temporal specification (in a fragment of LTL), then there is a counterexample whose length is bounded and independent of the parameters.” (Abstract, p. 1)

## technique 1: threshold-automaton counter-system model

What it is. A threshold automaton has local locations, initial locations, shared variables, threshold guards, rules, and resilience conditions. A configuration is a counter vector κ, shared-variable vector g, and parameter vector p. A transition is a rule paired with an acceleration factor; it moves that many processes from the rule's `from` location to its `to` location and adds factor times the update vector `u` to the shared variables (Definition 2.8, p. 4). The number of processes and the number of faults remain symbolic parameters, constrained by the resilience condition (Sections 2.1–2.2, pp. 3–4).

When to use it. Use this for fault-tolerant protocols whose control decisions depend on counts or thresholds, such as reliable broadcast, Byzantine agreement, consensus, and atomic commitment. It is especially useful when proving all system sizes at once.

How to do it.

1. Define local states and initial states, shared variables, and parameter constraints such as `n > 3t ∧ t ≥ f ≥ 0` (Section 2.1 and Example 2.2, p. 3).
2. Define each rule as `(from, to, ϕ≤, ϕ>, u)`, with guards and a shared-variable update vector (Section 2.1, p. 3). A rule in a loop must have `u = 0`, and all cycles must be simple (Section 2.1, p. 3).
3. Encode a configuration as `(κ,g,p)` and a rule firing as counter updates plus `g' = g + δu`, where `δ ≥ 0` is an acceleration factor (Section 7.1, p. 11).
4. Encode initial counters and resilience conditions in linear integer arithmetic. The paper's example uses `κ0 + κ1 = n − f`, `κ2 + κ3 = 0`, `x = 0`, and `n > 3t ∧ t ≥ f ∧ f ≥ 0` (Example 7.1, p. 11).
5. Encode a finite schedule as a conjunction of initial and transition constraints and ask an SMT solver for parameter and acceleration assignments (Section 7.1, p. 12).

Verus form. Inference: model counters and shared variables as ghost mathematical sequences or maps, and model each rule as a Rust enum case. A `proof fn` for a rule can require its threshold and ensure the exact counter delta; a loop over a schedule carries conservation and nonnegativity in `invariant` clauses. Parameter constraints belong in `requires`. SMT solving for symbolic parameters is external; Verus can replay a concrete witness.

Assumptions and limits. Shared variables are never decreased, so guard evaluations are monotone, and the loop of a lasso must be steady (Proposition 5.3, p. 9). The paper also assumes that rules in loops do not update shared variables and that all cycles are simple, and says the benchmarks fit this (Section 2.1, p. 3; Section 7.3, p. 14). Inference: protocols with nonmonotone counters, shared variables that are decreased, or data-dependent messages would need a different abstraction, because the paper's argument relies on these assumptions.

## technique 2: canonical lasso and cut-graph reduction

What it is. Any satisfying infinite counterexample can be represented as a finite prefix followed by a repeated loop, `ϑ · ρ^ω`, and the temporal formula determines a fixed number of cut points, one per subformula that starts with `F`, plus loop start and loop end. The canonical form rewrites a formula into nested `F` and `G` structure, and the canonical syntax tree gives each part an identifier. The cut graph constrains the order in which `F` subformulas are witnessed; the propositional formulas taken from `G` subformulas must hold between cut points (Sections 4–4.2, pp. 6–8). “We characterize all possible shapes of lasso schedules that satisfy an ELTLFT-formula ϕ.” (Section 4, p. 6)

How to do it.

1. Negate the required safety or liveness property and express the counterexample in ELTLFT (Section 3, Example 3.3 and Table 1, p. 5).
2. Convert the formula to canonical form `p ∧ F ψ1 ∧ ··· ∧ F ψk ∧ G ψk+1`, recursively (Definition 4.3, Proposition 4.5, p. 7).
3. Build the canonical syntax tree; each `F` or `G` occurrence gets a unique node identifier (Definition 4.6 and Observation 2, p. 7).
4. Build the cut graph. Its vertices are the identifiers of `F` nodes plus loop start and loop end, and its edges encode the required witness order (Definitions 4.8–4.9, pp. 7–8).
5. Enumerate topological orderings of the cut graph and the threshold graph, and check one ordering at a time (Section 4.3, p. 8; Section 5, p. 9; Figure 3, p. 6).
6. At loop end assert equality of counters and shared variables with loop start; an SMT model then supplies a lasso witness (Figure 10, lines 38–41, p. 12; Section 7.2, p. 13).

Verus form. Inference: represent the cut graph and formula AST as ghost data, and prove that each generated segment establishes its node's propositional condition. A `proof fn` can show loop closure and preservation of `G` conditions; an executable checker can search orderings. Verus's `while` invariant should state the current cut-node obligations and loop-start equality. Temporal quantification itself remains a specification layer outside ordinary Rust execution.

Evidence and limits. Proposition 4.2 proves the lasso existence property for threshold automata and ELTLFT; the proof in Appendix B uses Büchi automata and Proposition 2.10 (Section 4.1, p. 6; Appendix B, p. 17). Lasso existence alone is insufficient because counter systems are infinite-state and the proposition gives no length bound; the paper says Section 6 and the following path reductions address this (Section 4.1, p. 6). A cut function is a witness; Theorem 4.12 shows a witness implies the lasso satisfies the formula, and Theorem 4.13 shows a satisfying lasso has a witness after unrolling the loop some `K` times (p. 8). For the formula of Example 4.1, 20 lasso shapes exist, but only two must be analyzed (Example 4.14, p. 8). The temporal fragment excludes disjunctions of zero tests; the paper says enriching the logic with them allows tests for zero in the counter system, which leads to undecidability (Section 7.3, p. 14).

## technique 3: short representative schedules by commutativity and acceleration

What it is. Decompose a schedule into steady segments, reorder carefully chosen threads, and replace repeated transitions by accelerated rules while preserving every intermediate formula condition. Proposition 6.1 gives a representative of any steady schedule with the same endpoints and length at most `2 · |R|`; Theorem 6.3 gives a representative of length at most `6 · |R|` that also keeps the formula true in every configuration (Section 6, p. 10). “We address this challenge by more refined swapping strategies depending on the property ψ of Theorem 6.3.” (Section 6, p. 10)

How to do it.

1. Split the prefix and loop at formula-dependent cut points and threshold-guard changes (Sections 4–5, pp. 6–9; Section 6, step 1, p. 10).
2. Divide each resulting portion into steady schedules, where the set of unlocked guards is fixed (Section 5, Equation (3), p. 9; steady is defined in Section 2.2, p. 4).
3. Decompose a steady schedule into process threads. Move a thread that witnesses a required nonzero location to the beginning while preserving the relevant condition (Example 6.2, p. 10; Example 6.5, p. 11).
4. Apply the representative-schedule construction to each steady segment. Theorem 6.3 covers a formula `ψ` that is a disjunction of `κ[ℓ] ≠ 0` tests or a conjunction of `κ[ℓ] = 0` tests: the representative is applicable, ends in the same final state, keeps `ψ` true in every visited configuration, and has length at most `6 · |R|`. It is a concatenation of three `srep` schedules (Theorem 6.3, p. 10).
5. For conjunctions of several disjunctions, multiply counters and use a finite multiplier µ; Theorem 6.4 gives a bound `4 · |R|` on the scaled system, as a concatenation of two `srep` schedules (Section 6, p. 10).
6. Concatenate representatives in original order (Section 6, step 3, p. 10), then encode the fixed-length execution and the loop-closing constraint for SMT (Section 7.1, p. 12).

Verus form. Inference: encode a schedule as a sequence of rule identifiers and prove a commutation lemma when two rules touch disjoint counters or preserve the same guard context. Acceleration is a ghost arithmetic lemma that replaces k repeated steps with one delta update. A Verus `proof fn` can prove endpoint equality and a loop `invariant` can preserve the temporal-state predicate for each segment. The paper's multiplier and bounds should be explicit `ensures`, not assumed.

Evidence. The main bounds are mathematical, independent of the parameters, under the threshold-automaton restrictions; the proofs are in Appendix C (pp. 20–27). Theorem 6.3 requires a steady conventional schedule and a formula of the two forms above; Theorem 6.4 covers conjunctions of disjunctions of `κ[ℓ] ≠ 0` tests and requires the automaton to have a finite multiplier (p. 10). The paper says existence of multipliers "can easily be checked using simple queries to SMT solvers in preprocessing" and that all its benchmarks have multipliers (p. 10). The paper shows that swapping transitions, as in the earlier work, can violate an intermediate `G` condition, which is why property-aware reordering is needed (Example 6.2, p. 10).

## technique 4: SMT query generation and ByMC evaluation

What it is. For each topological order, `check_one_order` incrementally adds SMT constraints for formula nodes, threshold guards, loop start, and loop end. `push_segment` repeats the currently unlocked rules the number of times required by Theorems 6.3–6.4, adds transition equations, and requires each new configuration to satisfy the current invariant (Figure 10, p. 12; Section 7.2, p. 13).

How to do it.

1. Initialize configuration index and loop-start index, assert initial constraints and the root formula's propositional obligations (Figure 10, lines 5–11).
2. For an `F` node, assert its propositional condition and push a segment to the next node while preserving the current `G` invariant (Figure 10, lines 18–24).
3. For a rising or falling threshold node, execute a rule that unlocks or locks the guard, then assert the guard and push a segment of all unlocked rules (Figure 10, lines 25–32; falling guards are treated similarly with the negated guard).
4. At loop start record the current index; at loop end assert equality of counters and shared variables (Figure 10, lines 33–41).
5. Call SMT satisfiability. A model reports parameters, every configuration, and acceleration factors; unsatisfiability for every lasso shape means no counterexample exists (Section 7.1, p. 12; Section 7.2, p. 13).

Evidence. The authors extended ByMC and used the benchmarks of the earlier work: FRB, STRB, ABA, CBC, NBAC, NBACC, NBACG, CF1S, C1CS, and BOSCO (Section 7.3, p. 13). “Our implementation has verified safety and liveness of all ten parameterized algorithms in less than a day.” (Section 7.3, p. 13). The tool reports liveness counterexamples for CF1S and BOSCO “exactly for the cases predicted by the distributed algorithms literature”; “liveness of only the two simplest benchmarks (STRB and FRB) had been automatically verified before [40]” (Section 7.3, pp. 13–14). For safety, the comparison with the earlier implementation of [42] “shows that there is no clear winner”: the new one is 170 times faster on BOSCO for the case `n > 5t`, but ABA was a tenfold slowdown (Section 7.3, p. 13).

Verus form. Inference: Verus can verify the transition equations and preservation lemmas for a concrete protocol, while an external SMT driver enumerates formula orders and parameter models. A certificate should include the lasso, acceleration factors, and each arithmetic entailment so Verus can replay it. Z3, ByMC, and the model-to-Rust translation remain trusted unless independently checked.

## what is proved, measured, and trusted

The paper proves lasso existence, formula-preserving representative schedules, and parameter-independent bounds under its threshold, monotonicity, simple-cycle, and temporal-fragment assumptions (Sections 4–6, Appendices B–C). Experiments measure running time, memory, number of lassos, and comparison with the earlier safety checker; Figure 11 (p. 13) reports plots, while Table 2 (p. 18) gives per-benchmark lasso lengths (average and maximum), numbers of lassos, times, and memory. Inference: the paper does not cover arbitrary LTL, shared variables that are decreased, or refinement from a DSL or Rust implementation to the threshold automaton; it only states that the threshold automaton is abstracted from the code (Section 2.1, p. 3). Inference: trusted components are the threshold-automaton model, the SMT solver (Z3), the ByMC encoding, and the benchmark translations; the paper does not list a trusted base.

Inference: the threat to agent-written verified Rust is high for threshold-guarded control logic because the method can reduce unbounded parameter verification to finite SMT checks. It is lower for arbitrary Rust because the required monotone counter abstraction and temporal fragment may not hold, and the implementation-to-model link remains a substantial trusted boundary.

## techniques for the catalog

- threshold-automaton abstraction: model replicated fault-tolerant processes with counters, monotone shared variables, and threshold guards
- canonical ELTLFT syntax: normalize temporal counterexample formulas into nested eventuality and invariance obligations
- cut-graph lasso enumeration: enumerate formula witness orders and threshold-guard orders
- steady-schedule decomposition: split lassos at guard-context changes into portions amenable to acceleration
- representative schedule shortening: reorder threads and accelerate repeated rules while preserving intermediate formula conditions
- parameter scaling: use a finite multiplier to handle conjunctions of disjunctions of nonzero-location tests
- SMT lasso checking: encode bounded schedules, loop closure, guards, and acceleration factors as linear integer arithmetic
