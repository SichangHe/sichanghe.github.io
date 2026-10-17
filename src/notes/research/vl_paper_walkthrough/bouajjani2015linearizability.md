# On Reducing Linearizability to State Reachability
(authored by agents unless marked 🧑)
Tag: `bouajjani2015linearizability`, [paper](http://arxiv.org/abs/1502.06882v2)

## purpose and result

Bouajjani, Emmi, Enea, and Hamza reduce automatic linearizability checking for fixed atomic-object specifications to control-state reachability. The introduction states: “In this work we demonstrate that verifying linearizability for certain fixed ADTs is reducible to control-state reachability, despite being harder for arbitrary ADTs.” (Section 1, p. 1; the abstract says “certain fixed ADT specifications”.) The conclusion calls it a “linear-time reduction” (Section 7, p. 12). The paper instantiates the method for queues, stacks, registers, and mutexes.

The reduction applies when implementations are data independent and closed under intersection with regular languages, and when the ADT's violations form a finite union of regular languages. The paper summarizes the final reduction: “linearizability is equivalent to the emptiness of the language intersection between the implementation and finite union of regular violations.” (Section 1, p. 2.)

## technique 1: inductive ADT rules and matching sets

Use this to describe a sequential specification in a form that can be incrementally checked. A data structure is an ordered list of rules. A rule decomposes an existing execution into subsequences, checks method and matching guards, and inserts a new operation pattern.

Steps from Sections 2–3 (pp. 3–7):

1. Choose methods and data values, and treat return values as method arguments so every event has a uniform `m(x)` form.
2. Define base rule `R0` for the empty execution and one or more inductive rules. For a queue, `REnq` appends an enqueue, `REnqDeq` has the form `u · v ∈ Queue` with `u ∈ Enq*`, `v ∈ {Enq, Deq}*` giving `Enq · u · Deq · v` (a new matching pair whose enqueue goes first and whose dequeue precedes `v`), and `RDeqEmpty` inserts `DeqEmpty` after a prefix `u` in which every `Enq` has a same-valued event (`matched(Enq, u)`). The paper's rule guards use only `ui ∈ M*` and `matched(m, ui)`.
3. Require rules to be applied in nondecreasing rule order. A derivation starts at the empty word and repeatedly applies rules.
4. Define `last(u)`, the unique rule that could have produced the final step of a sequential execution. Queue uses the presence of `DeqEmpty`, then `Deq`, then only `Enq` to select this rule (Example 6, p. 7). The paper requires rules to be non-ambiguous in this sense, and `last` must also be consistent under permutations of projections.
5. For a differentiated execution (one with at most one `m(x)` per input method `m` and value `x`), compute projections to subsets of data values and test whether each projection matches some rule's matching set `M_R`, the set of executions of the shape the rule produces for a witness value `x` (Section 4.1, p. 8).

The queue derivation in Example 5 inserts `Enq(1),Deq(1)`, then `Enq(2),Deq(2)`, then `Enq(3),Deq(3)`, and finally `DeqEmpty`; this is the paper's concrete construction (Section 3, pp. 5–6). Lemma 3 states that a differentiated sequential execution is in the ADT exactly when all its projections belong to some rule matching set.

Inference: In Verus, encode the ADT state as a ghost sequence or state machine and use transition invariants for each inductive rule. `last` can be a `spec fn` over a ghost history. The method/event alphabet and projection machinery are ghost-only; executable Rust methods remain the implementation under verification.

## technique 2: step-by-step linearizability and finite violation classes

Use this to turn an existential linearization search into a finite set of local checks. A specification is step-by-step linearizable (Definition 7, p. 8) when, for a differentiated execution `e` linearizable with respect to `M_Ri` with witness `x`, `e ∖ x ⊑ [R1,…,Ri]` implies `e ⊑ [R1,…,Ri]`: a linearization of the projection with `x` removed extends to one including `x`.

Steps (Section 4.1, pp. 8–9; Lemma 5 gives the underlying equivalence):

1. Restrict to differentiated executions using data independence (Lemma 1, from Abdulla et al., Section 2, p. 5): a data-independent implementation is linearizable iff its differentiated executions are.
2. For each history `e`, consider every projection `e′` onto a subset of values.
3. Determine `last(e′)`, the rule corresponding to that projection.
4. Check whether `e′` linearizes to the matching set `M_last(e′)`. Lemma 6 states, for step-by-step linearizable `S` and differentiated `e`, that `e` is linearizable iff every projection passes this check.
5. Negate the condition to classify every violation as a projection that fails its one corresponding matching set. There are finitely many classes because the rule list is finite.

The paper's central statement is: “This means that whenever an execution is not linearizable w.r.t. S, there can be only finitely reasons, namely there must exist a projection which is not linearizable w.r.t. the matching set of its corresponding rule.” (Section 4.1, p. 9.) Lemma 4 (queue, stack, register, mutex are step-by-step linearizable) is proved in Appendix 8.3 (pp. 15–18) by building a graph from a linearization and showing it can be chosen acyclic.

Inference: A Verus proof can use a ghost history and a finite enum of rule classes, then prove that each concurrent operation either extends a valid abstract history or enters one of the explicitly modeled bad classes. This is a proof architecture; Verus will not infer the needed projection argument automatically.

## technique 3: co-regular violation automata

Use this when each violation class can be recognized by a finite automaton over call and return actions. A rule `R` is co-regular (Definition 8, p. 9) if one can build an automaton `A` such that, for every data-independent implementation `I`, `A ∩ I ≠ ∅` iff some differentiated `e ∈ I` has a projection `e′` with `last(e′) = R` and `e′` not linearizable to `M_R`.

Steps (Section 4.2, pp. 9–10):

1. Build one automaton `A_R` for each rule `R`. The automaton ignores operation identifiers and uses a finite representative data alphabet.
2. For queues, recognize a `DeqEmpty` operation covered by enqueue/dequeue pairs (Corollary 1, Appendix 8.6, p. 22, and Fig. 1). The automaton in Figure 2 (p. 10) uses three data values: `1` for the repeated pairs, `2` for the empty dequeue, and `3` for all irrelevant values; all `call Enq(1)` actions are assumed initial by the closure properties.
3. Prove both directions: an accepted implementation execution has a projection violating `M_R`; and every violating execution can be renamed to one accepted by the automaton. The main text sketches this only for `RDeqEmpty` (Lemma 7, p. 9); the complete proof is deferred to the extended version, and the appendix gives `REnqDeq` (Lemma 16, Fig. 3, with a small-model result in Lemma 12) and stack rules (Lemmas 20–24, Fig. 4, mostly briefly). For register and mutex it only says the `REnqDeq` argument can be redone.
4. Take the union `A` of all rule automata. Theorem 1 (p. 10) gives, for step-by-step linearizable and co-regular `S` and data-independent `I`, `I ⊑ S` iff `I ∩ A = ∅`.

## technique 4: reduce automaton intersection to Petri-net coverability

Use this for finite-shared-memory implementations with a finite-state thread abstraction and an unbounded number of threads. The paper's class `C` permits Boolean/data-valued locals and shared variables, but data values cannot be used in predicates.

Steps (Section 5, pp. 10–11):

1. Use data independence to restrict automata and implementation traces to representative data values `{1,2,3}`.
2. Represent the three-valued implementation `I3` as a Petri net: places count the threads in each control location (which includes a local-variable valuation), and each token represents another thread, so the thread count can be unbounded.
3. Give each shared variable one place per value to store its current valuation.
4. Emptiness of the intersection with a regular automaton reduces to Petri-net coverability, which is EXPSPACE-complete; bounding the number of threads lowers it to PSPACE. The hardness part of Theorem 2 comes from hardness of state reachability in finite-state concurrent programs. The paper does not spell out the product construction between net and automaton.

The reported complexity is PSPACE-complete for a fixed number of threads and EXPSPACE-complete otherwise (Theorem 2, p. 11). These are complexity classes for the paper's class `C`, not measurements of a particular implementation.

Inference: Verus can prove the finite-thread case directly with a state-machine invariant, but an unbounded thread count requires a parameterized invariant or an external Petri-net argument. Rust ownership and atomics do not automatically satisfy the paper's data-independence assumptions; they need explicit abstraction contracts.

## techniques for the catalog

- inductive ADT rules: specify queue, stack, register, or mutex histories by ordered insertion rules and a unique last-rule function
- step-by-step linearizability: reduce global linearization to projection checks against one finite matching set per rule
- co-regular violation automata: recognize renamed call/return patterns for each non-linearizability class and union them
- Petri-net reachability reduction: encode unbounded finite-state threads as tokens and check emptiness against the violation automata
