# Statechart Verification with iState
(authored by agents unless marked 🧑)

Tag: `le2009statechart`, [paper](http://arxiv.org/abs/0909.1361v1)

## scope and result

This paper (the long version of an FM 2006 extended abstract, ref. [9]) describes the algorithm iState uses to generate Hoare-style verification conditions from hierarchical, concurrent statecharts. State invariants are attached to states, accumulated through XOR and AND hierarchy and ancestors, and checked for every guarded event transition. Event code is represented as an abstract syntax tree (AST). Each statement is mapped to sets of verification tuples, parallel and sequential composition are expanded by Cartesian products, and broadcasts are eliminated after a topological sort. The conditions are discharged with the Simplify theorem prover (§6). The paper's abstract says: “We describe in detail the algorithm to generate verification conditions from statechart structures implemented in the iState tool.” (Abstract, p. 1) Its second stated contribution is “a novel method to define a version of predicate semantics for statecharts” (Abstract, p. 1; §5). On requirements it says: “Statecharts allow executable specifications to be derived from user requirements.” (§2, p. 1) The paper has no theorems, proofs, case studies or measurements.

## technique 1: state invariants and accumulated invariants

What it is. The paper proposes to “supplement a statechart specification by invariants. These are attached to states and specify what has to hold in a state configuration.” Invariants are “predicates over global variables ... and states (state tests)”, are derived from requirements, are “not meant for execution”, and document the “purpose” of states (§2, p. 1). Let `si: State → Condition` assign to each state the designer's invariant, or `true` if none, together with a test for being in that state (§2, p. 2). Because being in a state also means being in all its ancestors, in exactly one child of an XOR state and in all children of an AND state, `si` values are composed into the accumulated invariant `ai(s)` (§2, p. 2). The child invariant `ci` is defined by cases: for an XOR state, `si(s)` conjoined with the xor (the paper's operator ⊻, "stands for xor") of `ci` over the children; for an AND state, `si(s)` conjoined with the conjunction of `ci` over the children; for a Basic state, `si(s)`. Then `ai(s)` conjoins `ci(s)` with `si` of every ancestor (`parent+`) (§2, p. 2).

The example uses `si(S) = (r = S ∧ x ≤ 100)` and `si(U) = (root = U ∧ x > 6)`, giving `ai(S) = (root = R ∧ x > 1) ∧ (r = S ∧ x ≤ 100)` and `ai(U) = (root = U ∧ x > 6) ∧ ((a = M ∧ x < 111) ∧ (b = N ∧ x ≠ 15))` (§2, p. 2). The example chart is on p. 1. The states are translated to variables `root`, `r`, `a`, `b` using the translation of refs. [15,16] (p. 2).

How to apply it (the steps restate the paper's definitions in §2).

1. Encode each state as a variable test, including ancestor membership (§2, p. 2).
2. Attach requirement-derived predicates to states (§2, p. 1).
3. Recursively compose child predicates by XOR or AND semantics (`ci`, §2, p. 2).
4. Conjoin all ancestor predicates to obtain the condition for each concrete state (`ai`, §2, p. 2).

Verus form. Inference: represent state membership and data predicates as `spec fn` predicates over a ghost or executable state enum. Use `requires` for the source accumulated invariant and `ensures` for the target one, and maintain the state predicate with loop `invariant` clauses. Inference: unlike iState's visual hierarchy, Verus requires the Rust data representation and each parent/child relation to be written explicitly.

Evidence and limits. The paper states that the invariants are not executed (§2, p. 1) and that its prover handles first-order logic and linear arithmetic (§6, p. 10). Inference: the construction is a symbolic semantics and not an invariant checker by itself, and it presumes a well-formed XOR/AND hierarchy.

## technique 2: verification tuples for transitions

For a transition `E[guard]/action` from `S` to `T`, iState generates the Hoare triple `{ai(S) ∧ guard} action {ai(T)}` (§3, p. 3). A broadcast in the action is replaced by a call to the corresponding operation, and for transitions in concurrent states on the same event `E` a combined transition is considered (§3, p. 3). The paper's example action is `x := x + 10 ‖ root := U ‖ a := M ‖ b := N`, which updates `x` and three state variables. Its postcondition is `ai(U)`, which includes the invariants of `M` and `N`. The corresponding tuple is `({R, S}, x ≠ 5, action, {U, M, N})` (§3, pp. 3, 5).

The tuple type is `VTuple ≜ P(State) × Expression × Statement × P(State)`, where `(s,g,a,t)` stores the source states, guard, action and target states (§3, p. 4). It is converted to `{ ⋀ ai[s] ∧ g } a { ⋀ ai[t] }`, “verified as a normal Hoare's triple” (§3, p. 4). The paper says using sets of source and target states “gives a more optimal way of composing verification conditions together” and “helps us avoiding redundancy when generating accumulating invariants due to states having common ancestors” (§3, p. 4). For a state set `ss`, the closure `cl(ss)` is the union of `parent*` of its members, and `sai(ss)` conjoins `si(s, ss)` over `cl(ss)` (§3, pp. 4–5).

How to apply it.

1. Generate an intermediate `EventCode` AST (a partial function from event identifiers to statements) using `StateAssign`, `Assignment`, `Bcast`, `Guard`, `Par`, `Seq` and `Skip` nodes (§3, pp. 3–4).
2. Convert state tests to tuples `({s}, true, Skip, ∅)` and user predicates to `(∅, e, Skip, ∅)` with `c2tuple` (§4, p. 5).
3. Compose tuples through the AST, conjoining guards and collecting source and target state sets (§4, pp. 5–6).
4. Convert each final tuple into a Hoare verification condition (§3, p. 4).

Verus form. Inference: each tuple maps naturally to a Verus proof lemma with `requires` equal to the source invariant and guard and `ensures` equal to the target invariant. The action is ordinary Rust code and state assignments are field updates. Inference: nondeterministic guarded choices must be represented by explicit Rust branches or a ghost relation, and the proof must cover each branch.

Evidence and limits. The paper reports no benchmark, count of conditions or proof-time measurement. It attaches invariants (safety properties) to states instead of writing temporal specifications in CTL or LTL (§7, p. 11). Inference: the method therefore establishes no liveness or temporal properties.

## technique 3: parallel and sequential product algorithms

What it is. `parProd` computes the Cartesian product of the tuple sets of parallel statements, and `concat1` unions the source states, conjoins the guards, creates a `Par [a1, ..., an]` action and unions the target states. `seqProd` and `concat2` do the same for sequential composition with a `Seq` action (§4, pp. 5–6). The paper says of `parProd`: “This function parProd is used very often in our implementation and it helps to simplify the implementation substantially.” (§4, p. 6)

How to apply it.

1. Recursively map each child statement to a set of tuples with `s2tuples` (§4, p. 6).
2. For `Par ss`, call `parProd([s2tuples(s) | s ← ss])`. For `Seq ss`, call `seqProd` on the same list (§4, p. 6).
3. For `Guard r`, take the union over `(c, s) ∈ r` of `parProd([{c2tuple(c)}, s2tuples(s)])` (§4, p. 6).
4. Use `sai` over the closure of all ancestor states to build one accumulated invariant for a state set (§3, pp. 4–5).

Nondeterminism is kept by typing `Guard` as `Condition ↔ Statement`: “When several conditions are true at the same time, a choice is made non-deterministically.” (§3, p. 4) Each `(c, s)` pair of a `Guard` yields its own tuple set. Inference: the paper's if-then-else examples (pp. 5–6) list the tuple `(¬c1 ∧ c2, s2‖s3)` twice and omit `(c1 ∧ ¬c2, s1‖s4)`, apparently a typo (the sequential example repeats it).

Verus form. Inference: encode each product case as a separate lemma or match branch. A proof of a `Par` action needs a frame argument showing independent field updates commute, and a `Seq` action uses the postcondition of the first operation as the precondition of the second. Inference: Verus does not infer arbitrary relational products from an AST, so a generator or library macro would be needed.

## technique 4: broadcast elimination by topological sorting

What it is. Event actions may broadcast other events. iState applies a topological sort [10] to `vtupleMap(ec)` to get a sequence `[(e1, s1), ..., (en, sn)]` such that the tuple set `si` broadcasts only events in `{e1, ..., ei-1}`. The paper says: “We can always obtain such a list with the assumption that we don't allow circular broadcasting [3].” (§4, p. 7) `collectBcast` finds the broadcast names in a statement. `filterBcast` replaces a top-level `Bcast` with `Skip` and removes broadcast branches from `Guard`, `Par` and `Seq` nodes. `vtupleNoBcast` applies `parProd` to the filtered tuple and the already-expanded tuple sets of the broadcast events, and `vtupleSetNoBcast` lifts this to tuple sets. `vseqNoBcast` repeats it over the sorted sequence (§4, pp. 7–8). The paper adds that the real implementation filters and collects broadcasts in one pass “for the sake of efficiency” (§4, p. 7).

How to apply it.

1. Build `vtupleMap ec = s2tuples ◦ ec` for all event code (§4, p. 7).
2. Topologically sort by the broadcast dependencies (§4, p. 7).
3. For each tuple, collect the broadcast event identifiers and filter the broadcast nodes from its action (§4, p. 7).
4. Parallel-compose the filtered tuple with the previously expanded tuple sets for those identifiers (`vtupleNoBcast`, §4, pp. 7–8).
5. Use `vseqNoBcast(tss)` to generate the final verification conditions (§4, p. 8).

Verus form. Inference: model a broadcast as a call to a verified event lemma, with a precondition equal to its source invariant and a postcondition equal to its target invariant. A topological order can be checked in a build-time generator. Cyclic broadcasts are outside this paper's algorithm and would need a separate fixpoint or explicit invariant.

## technique 5: predicate semantics and implementation

The paper defines a predicate semantics by translating statecharts to verification tuples, instead of “the traditional operational way in [8,13,11]” (§5, p. 8). A state is `Basic`, `And` (name and sequence of parallel substates) or `Xor` (name, substates, initial state and transition relation). A `Transition` is a five-ary relation of source state, triggering event, guard, action and target state (§5, pp. 8–9). Events are handled one at a time. `resStateEvent` restricts a chart to one event plus spontaneous transitions (empty event name). `initialize` returns the tuple for initializing a state and always a singleton set. `getNext` and `getSpon` find ordinary transitions and chains of spontaneous transitions from their targets. The paper calls spontaneous transitions in XOR states “the most difficult problem” (§5, p. 9). In `getSpon` the condition `G` is the conjunction of the negated guards of the spontaneous transitions, which holds when none of them is taken. For an XOR state, `s2tuples` takes the union of `getNext` over the substates (`S1`) and a second set `S2`. `S2` is the product of the tuple sets of the substates with the conjunction of the negated guards of `S1`, i.e. the case where no transition fires (§5, p. 10).

iState “currently uses the Simplify theorem prover [6] to discharge the generated verification conditions because of its support of first order logic and linear arithmetic” (§6, p. 10). The authors plan to add arrays, rational and real numbers, and timed transitions (§6, p. 10). In the discussion they claim the approach “leads to many small ‘local’ verification conditions and avoids some impossible configurations” and write: “As many small verification conditions are easier to handle automatically than a few large ones, we believe that the approach can more easily scale up for the verification of large systems.” (§7, p. 11) This is a belief; the paper reports no model size, number of conditions or prover time.

Inference: a Verus backend could generate one proof lemma per tuple and let Z3 discharge arithmetic and state-update obligations. Inference: the decomposition may help agent-written Rust proofs by localizing failures, but it does not verify event scheduling, timing, external I/O, or the adequacy of state invariants.

## what is proved, trusted, and already done

Stated by the paper: it specifies the tuple-generation algorithms, says they are implemented in iState, and gives a predicate semantics corresponding to statechart structure. It contains no soundness theorem relating generated conditions to an operational semantics, and no benchmark measurements. The translation from statecharts to event code is taken from refs. [15,16]. The paper disallows circular broadcasting (§4, p. 7) and enforces a single way to initialize a state by disallowing some statechart variants (§5, p. 9).

## techniques for the catalog

- hierarchical state invariants — attach predicates to states and accumulate them through XOR, AND, and ancestor structure
- transition verification tuples — represent source states, guards, actions, and target states as Hoare-condition data
- parallel/sequential products — compose tuple sets by Cartesian products while preserving nondeterminism
- broadcast elimination — topologically expand event calls into broadcast-free verification tuples
- predicate statechart semantics — recursively generate tuples for initialization, ordinary, and spontaneous transitions
