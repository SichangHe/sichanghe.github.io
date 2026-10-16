# A Short Counterexample Property for Safety and Liveness Verification of Fault-Tolerant Distributed Algorithms
(authored by agents unless marked 🧑)
Tag: `konnov2016short`, [paper](http://arxiv.org/abs/1608.05327v2)

The paper targets threshold-guarded distributed algorithms with parameterized process counts and fault counts. It models local process states with counters, shared variables with monotone updates, and threshold guards over those variables. Safety and liveness violations are written in ELTLFT, a fragment using propositional formulas, `F` (eventually), and `G` (always), with existential path quantification. The central result is that a violation has a bounded lasso counterexample independent of the parameters. “Our method is based on a short counterexample property: if a distributed algorithm violates a temporal specification (in a fragment of LTL), then there is a counterexample whose length is bounded and independent of the parameters.” (Abstract, p. 1)

## technique 1: threshold-automaton counter-system model

What it is. A threshold automaton has local locations, initial locations, shared variables, threshold guards, rules, and resilience conditions. A configuration is a counter vector κ, shared-variable vector g, and parameter vector p. Rules move one or more processes between local locations and update shared variables by an acceleration factor. The number of processes and the number of faults remain symbolic parameters (Sections 2–3, pp. 4–6).

When to use it. Use this for fault-tolerant protocols whose control decisions depend on counts or thresholds, such as reliable broadcast, Byzantine agreement, consensus, and atomic commitment. It is especially useful when proving all system sizes at once.

How to do it.

1. Define local states and initial states, shared variables, and parameter constraints such as `n > 3t` (Section 2.2, pp. 4–5).
2. Define each rule as `(from, to, ϕ≤, ϕ>, u)`, with guards and a shared-variable update vector (Section 2.2, pp. 5–6).
3. Encode a configuration as `(κ,g,p)` and a rule firing as counter updates plus `g' = g + δu`, where `δ ≥ 0` is an acceleration factor (Section 7.1, pp. 16–17).
4. Encode initial counters and resilience conditions in linear integer arithmetic. The paper's example uses `κ0 + κ1 = n − f`, `κ2 + κ3 = 0`, `x = 0`, and `n > 3t` (Example 7.1, p. 17).
5. Encode a finite schedule as a conjunction of initial and transition constraints and ask an SMT solver for parameter and acceleration assignments (Section 7.1, pp. 17–18).

Verus form. Inference: model counters and shared variables as ghost mathematical sequences or maps, and model each rule as a Rust enum case. A `proof fn` for a rule can require its threshold and ensure the exact counter delta; a loop over a schedule carries conservation and nonnegativity in `invariant` clauses. Parameter constraints belong in `requires`. SMT solving for symbolic parameters is external; Verus can replay a concrete witness.

Assumptions and limits. Guards are monotone and shared variables never decrease; the paper's steady-cycle argument depends on this (Proposition 5.3, p. 13). The method is designed for threshold automata and does not cover arbitrary distributed state machines. Inference: protocols with nonmonotone counters or data-dependent messages need a different abstraction.

## technique 2: canonical lasso and cut-graph reduction

What it is. Any satisfying infinite counterexample can be represented as a finite prefix followed by a repeated loop, `ϑ · ρ^ω`, and the temporal formula determines a finite set of cut points. The canonical syntax tree rewrites formulas into nested `F` and `G` structure; the cut graph constrains the order in which `F` subformulas are witnessed and which `G` subformulas hold between cuts (Sections 4–4.2, pp. 6–10). “We characterize all possible shapes of lasso schedules that satisfy an ELTLFT-formula.” (Section 4, p. 8)

How to do it.

1. Negate the required safety or liveness property and express the counterexample in ELTLFT (Section 3, pp. 6–7).
2. Convert the formula to canonical form `p ∧ F ψ1 ∧ ··· ∧ F ψk ∧ G ψk+1`, recursively (Definition 4.3, pp. 9–10).
3. Build the canonical syntax tree; each `F` or `G` occurrence gets a unique node identifier (Definition 4.6, p. 10).
4. Build the cut graph whose vertices are these nodes and whose edges encode permissible witness order (Section 4.2, p. 10).
5. Enumerate topological orderings of the cut graph and the threshold graph, and check one ordering at a time (Figure 3, p. 6).
6. At loop end assert equality of counters and shared variables with loop start; an SMT model then supplies a lasso witness (Section 7.2, pp. 19–20).

Verus form. Inference: represent the cut graph and formula AST as ghost data, and prove that each generated segment establishes its node's propositional condition. A `proof fn` can show loop closure and preservation of `G` conditions; an executable checker can search orderings. Verus's `while` invariant should state the current cut-node obligations and loop-start equality. Temporal quantification itself remains a specification layer outside ordinary Rust execution.

Evidence and limits. Proposition 4.2 proves the lasso existence property for threshold automata and ELTLFT (Section 4.1, p. 8). Lasso existence alone is insufficient because counter systems are infinite-state and gives no length bound; the following path-reduction theorems supply that bound (Section 4.1, p. 8). The approach excludes formulas that indirectly test counter zero because adding such tests yields undecidability (Section 8, p. 21).

## technique 3: short representative schedules by commutativity and acceleration

What it is. Decompose a schedule into steady segments, reorder carefully chosen threads, and replace repeated transitions by accelerated rules while preserving every intermediate formula condition. Proposition 6.1 gives a representative of any steady schedule with the same endpoints and length at most `2 · |R|`; Theorem 6.3 extends this to a formula-preserving representative of length at most `6 · |R|` (Section 6, pp. 13–15). “We address this challenge by more refined swapping strategies depending on the property ψ of Theorem 6.3.” (Section 6, p. 15)

How to do it.

1. Split the prefix and loop at formula-dependent cut points and threshold-guard changes (Sections 4–5, pp. 8–13).
2. Divide each resulting portion into steady schedules, where the set of unlocked guards is fixed (Proposition 5.3, p. 13).
3. Decompose a steady schedule into process threads. Move a thread that witnesses a required nonzero location to the beginning while preserving the relevant condition (Examples 6.2 and 6.5, pp. 14–15).
4. Apply the representative-schedule construction to each steady segment. It preserves the endpoint and every configuration-level formula; for a single disjunction or conjunction of location-nonzero conditions, the bound is `6 · |R|` (Theorem 6.3, pp. 14–15).
5. For conjunctions of several disjunctions, multiply counters and use a finite multiplier µ; Theorem 6.4 gives a bound `4 · |R|` on the scaled system (Section 6, pp. 15–16).
6. Concatenate representatives in original order, producing a bounded finite lasso suitable for SMT (Section 7.1, pp. 17–18).

Verus form. Inference: encode a schedule as a sequence of rule identifiers and prove a commutation lemma when two rules touch disjoint counters or preserve the same guard context. Acceleration is a ghost arithmetic lemma that replaces k repeated steps with one delta update. A Verus `proof fn` can prove endpoint equality and a loop `invariant` can preserve the temporal-state predicate for each segment. The paper's multiplier and bounds should be explicit `ensures`, not assumed.

Evidence. The main bounds are mathematical, independent of process and fault parameters, under the threshold-automaton restrictions. Theorem 6.3 requires a steady conventional schedule and a formula that is a disjunction or conjunction of location-counter tests; Theorem 6.4 additionally requires a finite multiplier (pp. 14–16). The paper warns that swapping transitions solely by endpoint equality can violate an intermediate `G` condition, showing why property-aware reordering is necessary (Example 6.2, p. 14).

## technique 4: SMT query generation and ByMC evaluation

What it is. For each topological order, `check_one_order` incrementally adds SMT constraints for formula nodes, threshold guards, loop start, and loop end. `push_segment` repeats unlocked rules the number required by Theorems 6.3–6.4, adds transition equations, and maintains the current invariant (Figure 10, pp. 19–20).

How to do it.

1. Initialize configuration index and loop-start index, assert initial constraints and the root formula's propositional obligations (Figure 10, lines 5–11).
2. For an `F` node, assert its propositional condition and push a segment to the next node while preserving the current `G` invariant (Figure 10, lines 18–24).
3. For a rising or falling threshold node, execute a rule that unlocks or locks the guard, then push the newly enabled segment (Figure 10, lines 25–32).
4. At loop start record the current index; at loop end assert equality of counters and shared variables (Figure 10, lines 33–41).
5. Call SMT satisfiability. A model reports parameters, every configuration, and acceleration factors; unsatisfiability for every lasso shape proves no counterexample exists (Section 7.2, pp. 19–20).

Evidence. The authors extended ByMC and checked ten parameterized algorithms, including FRB, STRB, ABA, CBC, NBAC, NBACC, NBACG, CF1S, C1CS, and BOSCO (Section 7.3, p. 21). “Our implementation has verified safety and liveness of all ten parameterized algorithms in less than a day.” (Section 7.3, p. 21). It found expected liveness counterexamples for CF1S and BOSCO; only STRB and FRB liveness had previously been automatically verified (Section 7.3, p. 21). Compared with the earlier safety implementation, BOSCO at `n > 5t` was 170 times faster, while ABA experienced a tenfold slowdown (Section 7.3, p. 21). The denominator is each benchmark instance under the named parameter case, not all ten algorithms.

Verus form. Inference: Verus can verify the transition equations and preservation lemmas for a concrete protocol, while an external SMT driver enumerates formula orders and parameter models. A certificate should include the lasso, acceleration factors, and each arithmetic entailment so Verus can replay it. Z3, ByMC, and the model-to-Rust translation remain trusted unless independently checked.

## what is proved, measured, and trusted

The paper proves lasso existence, formula-preserving representative schedules, and parameter-independent bounds under its threshold, monotonicity, steady-cycle, and temporal-fragment assumptions. Experiments measure running time, memory, number of lassos, and comparison with the earlier safety checker; Figure 11 reports plots, while Table 2 gives per-benchmark lasso lengths, counts, times, and memory. The proof does not cover arbitrary LTL, nonmonotone shared updates, or implementation refinement from a DSL to Rust. Trusted components include the threshold-automaton model, SMT arithmetic, ByMC encoding, and benchmark translations.

The paper already provides a complete bounded-model-checking pattern for threshold protocols. Inference: VL should reuse the short-representative proof and focus new effort on proving that Rust implementations refine the threshold model, including message buffers, faults, and ownership. Reimplementing generic lasso shortening would duplicate the paper's main result.

Inference: the threat to agent-written verified Rust is high for threshold-guarded control logic because the method can reduce unbounded parameter verification to finite SMT checks. It is lower for arbitrary Rust because the required monotone counter abstraction and temporal fragment may not hold, and the implementation-to-model link remains a substantial trusted boundary.

## techniques for the catalog

- threshold-automaton abstraction: model replicated fault-tolerant processes with counters, monotone shared variables, and threshold guards
- canonical ELTLFT syntax: normalize temporal counterexample formulas into nested eventuality and invariance obligations
- cut-graph lasso enumeration: enumerate formula witness orders and threshold-guard orders
- steady-schedule decomposition: split lassos at guard-context changes into portions amenable to acceleration
- representative schedule shortening: reorder threads and accelerate repeated rules while preserving intermediate formula conditions
- parameter scaling: use a finite multiplier to handle conjunctions of disjunctions of nonzero-location tests
- SMT lasso checking: encode bounded schedules, loop closure, guards, and acceleration factors as linear integer arithmetic
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
