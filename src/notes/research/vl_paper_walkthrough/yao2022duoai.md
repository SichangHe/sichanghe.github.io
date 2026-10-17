# DuoAI: Fast, Automated Inference of Inductive Invariants for Verifying Distributed Protocols
(authored by agents unless marked 🧑)
Tag: `yao2022duoai`, [paper](https://www.usenix.org/conference/osdi22/presentation/yao)

## scope and core result
DuoAI searches formula space for inductive invariants of nondeterministic distributed protocols, including invariants with existential quantifiers. It combines top-down weakening of a candidate set with bottom-up strengthening of a universal core. Section 1, p. 486, states: “DuoAI runs these two methods for refining candidate invariants in parallel, a top-down refinement that weakens the candidates and a bottom-up refinement that strengthens the candidates, returning the result from the method that succeeds first.”

## technique 1: minimum implication graph

what it is and when to use it

The graph is a directed acyclic graph (DAG) over a finite formula search space. A node is a formula with quantifiers at the front (prenex normal form) and a quantifier-free matrix in disjunctive normal form (DNF), an OR of ANDed literals. In the exact graph, an edge connects a formula to an immediate strictly weaker formula. DuoAI constructs an approximate graph that can also connect equivalent formulas. Both graphs order enumeration and weakening; Lemmas 3–5 establish the approximate graph’s acyclicity, implication preservation, and reachability from roots. The paper's simplified-consensus graph has over 35K nodes and 170K edges.

how to apply it

1. Choose per-domain variable counts and four formula-size bounds: `max_exists`, `max_literal`, `max_and`, and `max_or`. Restrict formulas to a decidable first-order fragment.
2. Put formulas in prenex form and DNF. Define `P` stronger than `Q` when `P ⇒ Q` and `Q` does not imply `P`.
3. Exclude tautologies and contradictions. Add roots with no existential variables and no OR, or with unique existentially quantified variables and no OR (Section 3, p. 488).
4. Add edges by the five cases in Section 3, p. 488: change the universal variables of one type to existential variables while keeping the matrix; remove one ANDed literal while keeping the prefix; add one maximal ORed conjunction while keeping the prefix; identify two universal variables of the same type; or split an existential variable into two of the same type. In the fifth case, identifying the two variables in the weaker formula recovers the stronger formula.
5. Infer a fixed order for alternating quantified types. If inference cannot determine it, try orders in parallel or obtain a user constraint. This keeps all generated formulas in a decidable fragment.
6. Traverse from roots. The edge relation ensures a candidate's stronger ancestors and weaker successors are known.

The paper's examples are `∀N.vote(N,N) ⇒ ∃N.vote(N,N) ⇒ ∃N1,N2.vote(N1,N2)`. These are equations (5)–(7), Section 3, pp. 487–488.

Verus form (inference)

Inference: generate a graph over Verus `spec fn` predicates and proof obligations externally, then emit candidate predicates and `proof fn` lemmas. Verus has no built-in implication graph. Each edge can guide which weaker postcondition to try, but the implication itself must be proved with `assert` or a lemma. Quantified type orders in DuoAI are a search restriction; they are not a Rust type-system feature.

evidence and limits

Section 3, p. 489, states: “DuoAI requires that formulas in S must be in a decidable fragment of first-order logic.” Lemma 5 covers every non-tautological, non-contradictory formula in the bounded search space. The fixed type order restricts that space when quantifiers alternate.

## technique 2: sample-filtered candidate enumeration

what it is and when to use it

DuoAI repeatedly simulates the protocol at different instance sizes and records original variable-length reachable-state samples. It traverses the graph and checks each candidate directly on every sample before asking an SMT solver about inductiveness. Unlike DistAI, it considers all assignments derivable from each original sample, avoiding the incomplete subsampling problem for existential formulas described in Section 4, p. 489.

how to apply it

1. Simulate valid initial states and nondeterministic actions at several domain sizes in parallel.
2. Initialize a queue with graph roots; maintain `candidates` and `invalidated` sets.
3. Pop a formula. If any ancestor is already in `candidates`, skip it: the stronger candidate makes this formula redundant. An invalidated ancestor does not justify skipping a weaker formula.
4. Otherwise evaluate the quantified formula on every original sample, respecting universal and existential semantics. Add it to `candidates` if it holds on all samples. Otherwise add it to `invalidated` and enqueue successors that are absent from `candidates`, `invalidated`, and the queue.
5. Continue until the queue is empty. The theorem states that every correct invariant in the bounded space is either itself a candidate or has a stronger ancestor in the candidate set.

The simplified consensus example yields 19 candidate invariants, including equivalent forms of the four invariants needed by the protocol. A sample-valid formula is still only a candidate: inductiveness is checked later by Ivy/Z3.

Verus form (inference)

Inference: execute a Rust model to produce traces, then evaluate executable counterparts of candidate `spec fn`s on those states. Keep this data tool outside the proof. Prove that the initial state satisfies the selected conjunction and every transition preserves it; individual candidates may require the other invariants as hypotheses. Verus quantifiers and triggers must be written in syntax supported by the local Verus version; Ivy's prenex/DNF syntax does not transfer directly.

evidence and limits

Section 4, p. 489, explains: “A correct invariant must hold on every reachable protocol state and thus on every sample.” DuoAI retains the original variable-length samples, whereas DistAI projects them to fixed-length subsamples. Inference: passing a finite sample set is insufficient to establish an invariant; the later inductiveness check supplies the proof.

## technique 3: top-down monotonic refinement

what it is and when to use it

Theorem 1 guarantees that the enumerated candidate set is at least as strong as any correct invariant in the chosen search space. Top-down refinement sends candidates and the safety property to Ivy. On failure, it weakens the failed formula along graph successors rather than discarding it, preserving a path toward a correct invariant.

steps

1. Submit the full candidate conjunction and safety property to Ivy.
2. If Ivy proves inductiveness, return the invariant set.
3. If the safety property fails, return `NotProvable`; weakening the candidates cannot repair that failure. Otherwise remove the failed candidate, mark it invalidated, and consider its immediate successors. Add a successor only if it is not invalidated and has no reachable ancestor already in `candidates`. Here an ancestor is reachable if a path from it to the successor contains no invalidated node.
4. Repeat. Algorithm 2 also returns `NotProvable` if the candidate set becomes empty.

Theorem 2 (Section 5, p. 491) guarantees finite-time discovery if an inductive invariant proving safety exists within the finite search space. Each formula can be added only once, and the refinement preserves a candidate or a reachable stronger ancestor for every member of a correct invariant set.

Verus form (inference)

Inference: generate successive source versions with weaker `ensures` predicates, but re-run Verus proofs for initialization, each transition, and the safety implication. Treat a failed verification attempt as a diagnostic, and use a counterexample only when the tool provides one. Never weaken a contract by adding an unchecked assumption.

## technique 4: bottom-up universal core and counterexample-guided existential strengthening

what it is and when to use it

Bottom-up refinement first proves a universal core without existential quantifiers. It then tries small subsets of the remaining candidates, guided by Ivy counterexamples, and runs top-down weakening on each selected conjunction with the safety property. This avoids feeding hundreds of alternating-quantifier formulas to Z3 at once.

steps

1. Run Algorithm 2 on all universal candidates and the universal portion of the graph, omitting the safety property. The resulting inductive conjunction is the universal core.
2. Set `noncore` to the original candidates minus the core. It includes existential formulas and universal formulas whose inductiveness may depend on existential formulas. Enumerate subsets in increasing size, starting with the empty set.
3. Before checking a subset, skip it if all its formulas hold on any previously recorded counterexample source state. Such a subset cannot exclude that counterexample, and weakening cannot help.
4. Run Algorithm 2 on the core plus the subset, checking the safety property. If it returns `NotProvable`, record the source state of Ivy’s safety counterexample and try the next subset.
5. Return a successful inductive invariant, or `NotProvable` after exhausting the subsets. Theorem 3 gives the same finite-search-space guarantee as top-down refinement.

For simplified consensus, the universal core has five candidates equivalent to equations (1), (2), and (4); equation (3) supplies quorum evidence. There are 14 noncore candidates, 13 with quantifier alternation (Section 6, p. 493). For multi-Paxos, only two of 581 alternating candidates were needed after enumeration. Bottom-up is slower when the needed subset is found late, but was the only successful refinement for several Paxos-family protocols.

Verus form (inference)

Inference: encode witness existence as a ghost relation or witness object with a `spec fn` predicate and prove the relation from transitions. Search combinations of witness lemmas externally, then include only the selected lemmas in the Verus proof. The witness must be maintained across updates; an `assume` of existence would be a trusted hole.

evidence and limits

Table 1 reports 27 protocols, each with up to one week per tool. DuoAI solves 26/27 (“all but 1 of the 27 protocols”): all 15 universal-only protocols and 11/12 requiring existential quantifiers; vertical Paxos is the failure. It solves Paxos in 60.4 seconds and flexible Paxos in 78.7 seconds, while SWISS takes 16,665 and 28,337 seconds respectively in the same table. Multi-Paxos, stoppable Paxos, and fast Paxos are solved only by DuoAI among the compared tools, at 1,549, 4,051, and 26,979 seconds. Section 8, pp. 495–497, reports running times for Ivy protocol specifications on an Ubuntu 18.04 workstation. Inference: these measurements do not establish Rust implementation verification times.

Section 9, p. 498, attributes failures in three of five stoppable-Paxos trials and two of five fast-Paxos trials to the concurrent work P-FOL-IC3, not DuoAI. DuoAI restricts quantifier alternation to a fixed type order; “If a protocol cannot be verified in decidable logic, DuoAI will fail to prove it.” The paper also notes that human invariants outside the decidable fragment may still be checked efficiently by Z3, while DuoAI searches only its decidable restriction.

## technique 5: remove formulas implied by other candidates

Section 7, pp. 494–495, distinguishes conjunction-implied formulas from equivalently decomposable formulas. For `P1 ∧ ... ∧ Pk ⇒ Q`, omit `Q` while all the premises are candidates; reconsider it if a premise is invalidated. DuoAI recognizes replacement of a literal by a weaker literal, adding an implied weaker literal to a conjunction, and merging a universal formula with an existential formula.

For `P1 ∧ ... ∧ Pk ⇔ Q`, never retain `Q` as an additional candidate. Lemma 6 builds a graph for each conjunction, connecting literals that share an existential variable. Multiple connected components allow equivalent decomposition. For universal formulas, this eliminates conjunctions. A second decomposition separates equal and unequal assignments of leading universal variables.

## search expansion and parallel execution

Section 6, pp. 493–494, expands the search after `NotProvable` by increasing total literals, ORed conjunctions, ANDed literals, existential variables, or per-domain variable counts, in round-robin order. Defaults are `max_literal = 4`, `max_or = max_and = 3`, and `max_exists = 1`, raised to the safety property’s existential-variable count if that count is at least two. Initial per-domain counts come from the largest occurrence count for that type in a relation. A separate universal-only instance runs top-down refinement in parallel.

## techniques for the catalog

- minimum implication graph — organize bounded formulas by immediate implication so enumeration and weakening avoid redundant SMT work
- original-sample filtering — evaluate quantified candidates on original variable-length simulation samples before solver checks
- top-down refinement — weaken failed candidate invariants along graph successors until inductiveness is found
- universal core — prove an inductive conjunction without existential quantifiers before searching noncore additions
- bottom-up subset search — try small noncore subsets, pruning those that cannot exclude recorded counterexample source states
- mutual implication pruning — omit conjunction-implied formulas temporarily and equivalently decomposable formulas permanently
- decidable quantifier ordering — constrain alternating quantified types to preserve an SMT-decidable formula fragment
