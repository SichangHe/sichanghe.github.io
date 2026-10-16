# Statechart Verification with iState
(authored by agents unless marked 🧑)

Tag: `le2009statechart`, [paper](http://arxiv.org/abs/0909.1361v1)

## scope and result

This paper gives the full algorithm used by iState to generate Hoare-style verification conditions from hierarchical, concurrent statecharts. State invariants are attached to states, accumulated through XOR and AND hierarchy, and checked for every guarded event transition. The implementation represents event code as an abstract syntax tree, maps each statement to sets of verification tuples, expands parallel and sequential composition, eliminates broadcasts by topological sorting, and discharges the resulting conditions with Simplify. The paper's abstract says: “We describe in detail the algorithm to generate verification conditions from statechart structures implemented in the iState tool.” (Abstract, p. 1) It also states: “Statecharts allow executable specifications to be derived from user requirements.” (§2, p. 2)

## technique 1: state invariants and accumulated invariants

What it is. An invariant is a predicate over global variables and a state test, attached to a state to document what must hold whenever the system is in that state (§2, p. 2). For each state `s`, `si(s)` is the user predicate conjoined with the test that the state is active, or `true` if none is supplied. Hierarchy then creates a child invariant `ci`: XOR states conjoin the parent predicate with a disjunction over children; AND states conjoin it with a conjunction over all children; basic states keep `si`. The accumulated invariant `ai(s)` conjoins `ci(s)` with every ancestor's `si`.

The example uses `si(S) = (r = S ∧ x ≤ 100)` and `si(U) = (root = U ∧ x > 6)`, yielding `ai(S) = (root = R ∧ x > 1) ∧ (r = S ∧ x ≤ 100)` (§2, pp. 1–2).

How to apply it.

1. Encode each state as a variable or state test, including ancestor membership (§2).
2. Attach requirement-derived predicates to states.
3. Recursively compose child predicates according to XOR or AND semantics.
4. Conjoin all ancestor predicates to obtain the condition for each concrete state.

Verus form. Inference: Represent state membership and data predicates as `spec fn` predicates over a ghost or executable state enum. Use `requires` for the source accumulated invariant and `ensures` for the target one; maintain the state predicate with loop `invariant` clauses. Inference: unlike iState's visual hierarchy, Verus requires the Rust data representation and each parent/child relation to be written explicitly.

Evidence and limits. The construction is a symbolic semantics, not an executable invariant checker by itself. It assumes the statechart's XOR/AND hierarchy is well-formed and that predicates can be expressed in the theorem prover's first-order logic and linear arithmetic.

## technique 2: verification tuples for transitions

For a transition `E[guard]/action` from `S` to `T`, iState generates the Hoare triple `{ai(S) ∧ guard} action {ai(T)}` (§3, p. 3). Broadcasts are replaced by calls, and transitions in concurrent states on one event are combined. The paper's example action updates `x` and four state variables; its postcondition is the accumulated invariant for `U`, `M`, and `N`.

The tuple representation is `VTuple = P(State) × Expression × Statement × P(State)`, where `(s,g,a,t)` stores source states, guard, action, and target states (§3, p. 4). It is converted to `{ ∧ ai[s] ∧ g } a { ∧ ai[t] }`. Keeping sets of source and target states avoids recomputing common ancestors and reduces duplicate invariant conjunctions.

How to apply it.

1. Generate an intermediate `EventCode` AST for each event using `StateAssign`, `Assignment`, `Bcast`, `Guard`, `Par`, `Seq`, and `Skip` nodes (§3, pp. 3–4).
2. Convert state tests to tuples `( {s}, true, Skip, ∅ )` and user predicates to `(∅, predicate, Skip, ∅)` with `c2tuple` (§4, p. 5).
3. Compose tuples through the AST, conjoining guards and collecting source/target state sets.
4. Convert each final tuple into a Hoare verification condition.

Verus form. Inference: Each tuple maps naturally to a Verus proof lemma with `requires` equal to the source invariant and guard and `ensures` equal to the target invariant. The action is ordinary Rust code; state assignments are field updates. Inference: nondeterministic guarded choices must be represented by explicit Rust branches or a ghost relation, and the proof must cover each branch.

Evidence and limits. The paper does not report a benchmark count or proof-time measurements. The method inherits Simplify's supported logic and does not automatically establish liveness or temporal properties.

## technique 3: parallel and sequential product algorithms

What it is. `parProd` computes the Cartesian product of tuple sets from parallel statements; `concat1` unions source and target states, conjoins guards, and creates a `Par` action. `seqProd` does the analogous product for sequential statements; `concat2` creates a `Seq` action (§4, pp. 5–6).

How to apply it.

1. Recursively map each child statement to a set of tuples with `s2tuples`.
2. For `Par ss`, call `parProd([s2tuples(s) | s ← ss])`; for `Seq ss`, call `seqProd` (§4, p. 7).
3. For a guarded statement, call `c2tuple` on each guard and combine it with the child's tuples.
4. Use `sai` over the closure of all ancestor states to build one accumulated invariant for a state set.

The resulting representation preserves nondeterminism: when several guard conditions are true, each guarded alternative contributes a possible tuple. The paper explicitly notes that `Condition ↔ Statement` is used to represent this nondeterministic choice (§3, p. 4).

Verus form. Inference: Encode each product case as a separate lemma or match branch. A proof of a `Par` action needs a frame argument showing independent field updates commute; a `Seq` action uses the postcondition of the first operation as the precondition of the second. Inference: Verus does not infer arbitrary relational products from an AST, so a generator or library macro would be needed.

## technique 4: broadcast elimination by topological sorting

What it is. Event actions may broadcast other events. iState first topologically sorts the event-to-tuple map so every event's broadcasts refer only to earlier events. This requires the assumption that circular broadcasting is disallowed (§4, p. 7). `collectBcast` finds broadcast names, `filterBcast` replaces them with `Skip`, and `vtupleNoBcast` combines the filtered tuple with the already-expanded tuples of each broadcast event. `vseqNoBcast` repeats this over the sorted sequence.

How to apply it.

1. Build `vtupleMap = s2tuples ∘ ec` for all event code (§4, p. 7).
2. Topologically sort the dependency graph of broadcasts.
3. For each tuple, collect broadcasted event identifiers and filter broadcast nodes from its action.
4. Parallel-compose the filtered action with the previously expanded tuple sets for those identifiers.
5. Use the resulting broadcast-free tuples to generate final verification conditions.

Verus form. Inference: Model a broadcast as a call to a verified event lemma, with a precondition equal to its source invariant and a postcondition equal to its target invariant. A topological order can be checked in a build-time generator; cyclic broadcasts require a separate fixpoint or explicit invariant and are outside this paper's algorithm.

## technique 5: predicate semantics and implementation

The paper defines a predicate semantics directly from the tuple functions. A state is `Basic`, `And`, or `Xor`; a transition is a five-ary relation of source, event, guard, action, and target (§5, pp. 8–10). `resStateEvent` restricts a chart to one event, `initialize` creates initial-state tuples, and `getNext`/`getSpon` handle ordinary and spontaneous transitions. For each event, `s2tuples` recursively combines basic, AND, and XOR states; spontaneous transitions are represented by a guard and the conjunction of negated spontaneous guards when none fires.

iState currently uses the Simplify theorem prover because it supports first-order logic and linear arithmetic (§6, p. 10). The authors say the approach yields many small local conditions: “As many small verification conditions are easier to handle automatically than a few large ones” (§7, p. 11). No performance denominator, model size, or number of discharged conditions is reported.

Inference: A Verus backend could generate one proof lemma per tuple and let Z3 discharge arithmetic and state-update obligations. Inference: the decomposition may help agent-written Rust proofs by localizing failures, but it does not verify event scheduling, timing, external I/O, or the adequacy of state invariants.

## what is proved, trusted, and already done

The paper specifies and implements the tuple-generation algorithms and gives a predicate semantics corresponding to statechart structure. It reports no independent soundness theorem comparing generated conditions with an external operational semantics, and no benchmark measurements. Trusted components are the statechart-to-AST translation, Simplify, the logical encoding, and the designer's invariants. Inference: for Verus, the largest threat is specification error: a false or incomplete state invariant can make every generated proof succeed while missing the real requirement. VL should not redo generic guarded-command VC generation or statechart invariant accumulation as a new technique; it should reuse the decomposition if a product workflow has hierarchical event models. Inference: threat to agent-written verified Rust is medium for reactive controllers and low for ordinary data-structure proofs.

## techniques for the catalog

- hierarchical state invariants — attach predicates to states and accumulate them through XOR, AND, and ancestor structure
- transition verification tuples — represent source states, guards, actions, and target states as Hoare-condition data
- parallel/sequential products — compose tuple sets by Cartesian products while preserving nondeterminism
- broadcast elimination — topologically expand event calls into broadcast-free verification tuples
- predicate statechart semantics — recursively generate tuples for initialization, ordinary, and spontaneous transitions

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
