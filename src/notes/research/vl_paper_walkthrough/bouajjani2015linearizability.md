# On Reducing Linearizability to State Reachability
(authored by agents unless marked 🧑)
Tag: `bouajjani2015linearizability`, [paper](http://arxiv.org/abs/1502.06882v2)

## purpose and result

Bouajjani, Emmi, Enea, and Hamza reduce automatic linearizability checking for fixed atomic-object specifications to control-state reachability. The abstract states: “In this work we demonstrate that verifying linearizability for certain fixed ADTs is reducible to control-state reachability, despite being harder for arbitrary ADTs.” (Abstract, p. 1.) The paper instantiates the method for queues, stacks, registers, and mutexes.

The reduction applies when implementations are data independent and closed under intersection with regular languages, and when the ADT's violations form a finite union of regular languages. The paper summarizes the final reduction: “linearizability is equivalent to the emptiness of the language intersection between the implementation and finite union of regular violations.” (Section 1, p. 2.)

## technique 1: inductive ADT rules and matching sets

Use this to describe a sequential specification in a form that can be incrementally checked. A data structure is an ordered list of rules. A rule decomposes an existing execution into subsequences, checks method and matching guards, and inserts a new operation pattern.

Steps from Sections 2–3 (pp. 3–8):

1. Choose methods and data values, and treat return values as method arguments so every event has a uniform `m(x)` form.
2. Define base rule `R0` for the empty execution and one or more inductive rules. For a queue, `REnq` appends an enqueue, `REnqDeq` inserts a matching enqueue/dequeue pair, and `RDeqEmpty` inserts an empty dequeue only when all preceding enqueues are matched.
3. Require rules to be applied in nondecreasing rule order. A derivation starts at the empty word and repeatedly applies rules.
4. Define `last(u)`, the unique rule that could have produced the final step of a sequential execution. Queue uses the presence of `DeqEmpty`, then `Deq`, then only `Enq` to select this rule.
5. For a differentiated execution, compute projections to subsets of data values and test whether each projection matches a rule's matching set `M_R`.

The queue derivation in Example 5 inserts `Enq(1),Deq(1)`, then `Enq(2),Deq(2)`, then `Enq(3),Deq(3)`, and finally `DeqEmpty`; this is the paper's concrete construction (Section 3, pp. 5–6). Lemma 3 states that a differentiated sequential execution is in the ADT exactly when all its projections belong to some rule matching set.

Inference: In Verus, encode the ADT state as a ghost sequence or state machine and use transition invariants for each inductive rule. `last` can be a `spec fn` over a ghost history. The method/event alphabet and projection machinery are ghost-only; executable Rust methods remain the implementation under verification.

## technique 2: step-by-step linearizability and finite violation classes

Use this to turn an existential linearization search into a finite set of local checks. A specification is step-by-step linearizable when, for a witness data value `x`, a linearization of the projection with `x` removed can be extended to a linearization including `x`.

Steps (Section 4.1, pp. 7–9):

1. Restrict to differentiated executions using data independence. This removes duplicate input-method/data pairs without losing a counterexample.
2. For each history `e`, consider every projection `e′` onto a subset of values.
3. Determine `last(e′)`, the rule corresponding to that projection.
4. Check whether `e′` linearizes to the matching set `M_last(e′)`. Lemma 6 proves `e` is linearizable iff every projection passes this check.
5. Negate the condition to classify every violation as a projection that fails its one corresponding matching set. There are finitely many classes because the rule list is finite.

The paper's central statement is: “This means that whenever an execution is not linearizable w.r.t. S, there can be only finitely reasons, namely there must exist a projection which is not linearizable with respect to the matching set of its corresponding rule.” (Section 4.1, p. 9.)

Inference: A Verus proof can use a ghost history and a finite enum of rule classes, then prove that each concurrent operation either extends a valid abstract history or enters one of the explicitly modeled bad classes. This is a proof architecture; Verus will not infer the needed projection argument automatically.

## technique 3: co-regular violation automata

Use this when each violation class can be recognized by a finite automaton over call and return actions. A rule is co-regular if an automaton recognizes exactly enough executions whose projection is not in that rule's matching set, for every data-independent implementation.

Steps (Section 4.2, pp. 9–10):

1. Build one automaton `A_R` for each rule `R`. The automaton ignores operation identifiers and uses a finite representative data alphabet.
2. For queues, recognize a `DeqEmpty` operation covered by enqueue/dequeue pairs. The automaton in Figure 2 uses three data values: `1` for the repeated pairs, `2` for the empty dequeue, and `3` for all irrelevant values.
3. Prove both directions: an accepted implementation execution has a projection violating `M_R`; and every violating execution can be renamed to one accepted by the automaton.
4. Take the union `A` of all rule automata. Theorem 1 gives `I ⊑ S` iff `I ∩ A = ∅`.

Inference: In Verus, the automata can be represented as a ghost finite state machine whose transitions consume operation events. A safety invariant proves the implementation never reaches an automaton accepting state. The regular-language construction remains an external synthesis step unless VL implements a generator.

## technique 4: reduce automaton intersection to Petri-net coverability

Use this for finite-shared-memory implementations with a finite-state thread abstraction and an unbounded number of threads. The paper's class `C` permits Boolean/data-valued locals and shared variables, but data values cannot be used in predicates.

Steps (Section 5, pp. 10–11):

1. Use data independence to restrict automata and implementation traces to representative data values `{1,2,3}`.
2. Represent each thread's finite control state and local valuation as a Petri-net place; tokens represent arbitrarily many threads.
3. Add places for each shared-variable valuation and synchronize the implementation net with the violation automaton.
4. Ask whether the synchronized net can cover an accepting state. An empty intersection means linearizability.

The reported complexity is PSPACE-complete for a fixed number of threads and EXPSPACE-complete for an unbounded number (Theorem 2, p. 11). These are complexity classes for the paper's class `C`, not measurements of a particular implementation.

Inference: Verus can prove the finite-thread case directly with a state-machine invariant, but an unbounded thread count requires a parameterized invariant or an external Petri-net argument. Rust ownership and atomics do not automatically satisfy the paper's data-independence assumptions; they need explicit abstraction contracts.

## evidence, assumptions, and VL impact

The paper proves step-by-step linearizability for queue, stack, register, and mutex (Lemma 4), co-regularity for all four (Lemma 7), and the generic reduction (Theorem 1). It gives no runtime benchmark; its evidence is theorems and automaton constructions. The method assumes completed executions or an independent progress condition, well-formed call/return histories, data independence, and non-ambiguous inductive rules. The paper notes that priority queues are not data independent and are outside the current method (Section 7, p. 12).

Inference: VL should not redo the generic reduction or the four ADT rule proofs. The reusable engineering target is a Verus ghost-history library plus generators for queue/stack violation monitors, followed by proofs that the Rust implementation's call/return trace refines the monitor model. Threat to agent-written verified Rust is high for concurrent objects: a local method contract can pass while a global history is not linearizable, and the monitor itself becomes a trusted specification artifact unless its rules are proved against the intended ADT.

## techniques for the catalog

- inductive ADT rules: specify queue, stack, register, or mutex histories by ordered insertion rules and a unique last-rule function
- step-by-step linearizability: reduce global linearization to projection checks against one finite matching set per rule
- co-regular violation automata: recognize renamed call/return patterns for each non-linearizability class and union them
- Petri-net reachability reduction: encode unbounded finite-state threads as tokens and check emptiness against the violation automata

Checked 2026-10-15 against the paper by a Codex agent for on_reducing_linearizability_to_state_rea_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
