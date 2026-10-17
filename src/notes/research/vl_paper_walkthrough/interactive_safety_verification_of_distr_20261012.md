# Interactive Safety Verification of Distributed Protocols by Inductive Proof Decomposition
(authored by agents unless marked 🧑)
Tag: `schultz2026interactive`, [paper](https://doi.org/10.1007/978-3-032-28079-4_1)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## scope and prior notes

This paper presents inductive proof decomposition, a human-guided method for building inductive invariants of distributed protocols. It represents dependencies between invariant lemmas and protocol actions as an inductive proof graph, uses induction counterexamples (CTIs) local to graph nodes, and computes a variable slice for each action/lemma obligation. The implementation is Scimitar over TLA+, TLC, Apalache, and TLAPS. I found no earlier full study of this title in the research notes. Every Verus mapping below is my inference because the paper's executable specifications are TLA+ rather than Rust.

The target problem is safety of a transition system `M=(I,T)`: find `Ind` with `I => Ind`, `Ind ∧ T => Ind'`, and `Ind => S` for safety property `S`. The paper's core complaint is that automated invariant inference can fail opaquely and a monolithic conjunction is hard for a human to debug. Its method is explicitly interactive: the human chooses which failed local obligation to analyze and supplies a new lemma that removes its counterexample.

## technique: represent a proof as a lemma/action graph

what it is and when to use it

Replace one monolithic invariant with a directed graph. Lemma nodes are predicates; each lemma has one action node for every disjunctive protocol action. An edge from support lemma `K` to action node `(L,A)` means `K` is assumed when proving `L` after action `A`. Use this when an invariant has many conjuncts and a global counterexample does not show which dependency is missing.

how to do it

1. Start with the target safety predicate `S` as the only lemma node.
2. For each action `A1 ... Ak` in `T = A1 ∨ ... ∨ Ak`, create `(S,Ai)` action nodes and no support edges.
3. Ask the backend whether each local obligation `Supp(L,A) ∧ L ∧ A => L'` is valid, where `Supp` is the conjunction of incoming support lemmas.
4. For a failed node, inspect its CTI and invent a predicate `Lnew` that excludes that state.
5. Add `Lnew` as a lemma node, create one action node per protocol action, and add an edge from `Lnew` to the failed action node.
6. Repeat until every action node is locally valid and every lemma holds initially.
7. Treat the resulting graph as a proof artifact: the conjunction of all lemma nodes is the inductive invariant.

The paper's abstract procedure says: “Choose some (L, A) ∈ VA such that (L, A) is not locally valid. Analyze CTI X at node (L, A), develop lemma Lnew eliminating X.” (Procedure 1, page 13) Its formal validity theorem states that if all nodes are locally valid and `I => L` for every lemma, their conjunction is an inductive invariant.

Verus form (inference)

Make each lemma a `spec fn` over ghost protocol state and each transition action a `proof fn` or executable transition with `requires`/`ensures`. A support edge becomes a lemma call in a proof block or an assumption in the local lemma's `requires`. Organize the Rust proof modules around action/lemma pairs, and record dependencies in comments or generated metadata. Verus's `ensures` is checked per function, so the graph is a planning and decomposition layer over those functions, not a native Verus object.

evidence and limits

The graph theorem is logical, but the method still requires a human to invent `Lnew`; the tool does not synthesize arbitrary invariants. Cycles are allowed in the graph and represent mutually dependent facts, but the final local obligations must all be discharged. The approach assumes the transition relation can be decomposed into distinct actions and that initial-state obligations are checked separately.

## technique: work backwards from a failed local obligation

what it is and when to use it

Use a CTI attached to one action node to guide the next invariant lemma. This turns “the invariant is not inductive” into a small question: which predicate would rule out this pre-state/action pair? It is useful when a protocol has dozens of lemmas and many simultaneous failures.

how to do it

1. Initialize the graph with `S` and run induction checks.
2. Select one orange, undischarged action node.
3. Generate a CTI showing a state satisfying current supports and the action but violating the target lemma after the transition.
4. Examine only that CTI and its local slice.
5. Form a lemma that excludes the CTI while remaining true initially and preservable by actions.
6. Add the lemma as a support edge and recheck affected nodes.
7. Stop reasoning about discharged nodes unless a later edge changes their obligation.

In the SimpleConsensus example, the authors first analyze a Decide CTI, add `LeadersDecide`, then analyze a BecomeLeader CTI, add `LeaderHasQuorum`, and finally add `NodesVoteOnce`. They report that once `NoConflictingValues` and `LeadersDecide` are discharged, “we no longer need to consider these lemmas in our reasoning.” (section 4.2, page 12)

Verus form (inference)

When `cargo verus` reports an unproved postcondition, isolate the transition branch and capture a concrete failing model if available from SMT. Add a ghost lemma that excludes the model, then prove its preservation under every transition. Rust proofs do not expose TLA+ CTIs in the same UI, so VL would need to retain SMT countermodels or generate bounded executable traces. The backward order is a workflow discipline, not a Verus language feature.

evidence and limits

The authors present a complete SimpleConsensus graph but do not report a count of CTIs or time per iteration. CTIs depend on finite parameter bounds when TLC or Apalache is used, so a bounded counterexample is evidence for a missing lemma rather than a proof of unbounded behavior. The final unbounded proof is checked by TLAPS.

## technique: decompose relative induction dependencies

what it is and when to use it

For each lemma, find a small support set rather than assuming the entire invariant conjunction. A lemma `L` is inductive relative to `U` when `conjunction(U) ∧ L ∧ T => L'`. Use this to reduce solver formulas and make dependency structure explicit.

how to do it

1. Write the candidate invariant as `S ∧ L1 ∧ ... ∧ Lk`.
2. Split consecution into one obligation for `S'` and one for each `Li'`.
3. For each target, remove lemmas that are not needed and test a smaller support set.
4. Record the minimal or useful support set as incoming graph edges.
5. Repeat per transition action, because a lemma can require different support facts for different actions.
6. Check initiality for every lemma and local validity for every action node.

Steps 3 and 4 are my inference: the paper builds support sets by adding edges (Procedure 1), not by pruning, and gives no minimization procedure.

The paper defines a support set as a subset `U` such that “L is inductive relative to the conjunction of lemmas in U.” (section 3.1, page 6) Its graph therefore captures logical dependencies rather than merely listing all invariant conjuncts.

Verus form (inference)

Give each `proof fn` only the ghost facts it needs in `requires`, and call those support lemmas explicitly. Avoid passing a giant conjunction as one opaque fact. If one action branch needs a stronger fact, specialize the proof function for that branch. Verus's modular contracts naturally enforce this dependency discipline, although it will not automatically minimize supports.

evidence and limits

A smaller support set improves interpretability, but the paper does not quantify solver speedups attributable solely to support minimization. Finding a small set is still a human or search-engineering task. Removing a truly needed lemma makes the local obligation fail, while retaining every lemma recovers the monolithic proof and loses the decomposition benefit.

## technique: slice protocol state at each action node

what it is and when to use it

Project a CTI to only variables that can affect the target lemma under the chosen action. For guarded action `A = Pre ∧ Post`, define `Slice(L,A) = Vars(Pre) ∪ Vars(L) ∪ COI(Vars(L'))`, where `COI(x')` is the set of current variables read by the update expression for `x'`. Use this to hide irrelevant distributed state from the human and reduce candidate lemma scope.

how to do it

1. List variables in the action precondition `Pre`.
2. List variables in the current-state expression of target lemma `L`.
3. List primed variables appearing in `L'`.
4. For each such primed variable, inspect its update expression and collect its current-state dependencies.
5. Take the union; omit all other state variables from the displayed CTI.
6. Develop a support lemma over the slice, then check it against the full transition relation.

The paper says its slicing technique “projects out protocol variables that are irrelevant to a local node of the proof graph” (Introduction, page 3). Theorem 2 claims that if a valid support set exists, one exists whose expressions refer only to variables in the slice.

Verus form (inference)

Represent the slice as metadata generated from `requires` and `ensures` expressions or from the Rust transition function's dependency graph. Present only those ghost fields in an agent prompt or countermodel. Keep the full Verus proof unchanged; the slice is a sound restriction on candidate support predicates only when updates are pure guarded assignments as assumed by the paper. Heap aliasing, trait calls, and data-dependent indexing in Rust may require a conservative over-approximation.

evidence and limits

The theorem relies on deterministic update expressions and the paper's guarded-action syntax. It is not a general concurrency slicing theorem. In SimpleConsensus, the Decide node's slice has 2 of 6 variables (`leader`, `decided`), and the BecomeLeader node's slice has `{leader,votes}`. Table 1 reports median slice sizes: SimpleConsensus 2/6 (0.33), TwoPhase 3/6 (0.50), AbstractRaft 3/4 (0.75), Bakery 4/6 (0.67), and AsyncRaft 5/12 (0.42). These are medians over graph nodes, not proof-time reductions.

## technique: localize counterexample management and proof status

what it is and when to use it

Maintain CTIs per action node instead of one global set, and display discharged versus undischarged nodes. This answers which failure to analyze next and shows proof progress as graph structure.

how to do it

1. Associate each failed local obligation with its action node.
2. Let the human choose one node and inspect only its CTIs and slice.
3. Add a support lemma; recompute only affected local obligations.
4. Mark a lemma node discharged when every associated action node is valid.
5. Continue backward from remaining undischarged nodes.
6. Use graph cycles and branches to understand mutually dependent facts.

The paper identifies three practical problems—“CTI Management,” “Localization,” and “Proof Status and Structure” (section 4.1, page 10)—and uses node-local status to address each. The AsyncRaft graph exposed cycles involving local log properties and message properties, which would be difficult to see in a flat conjunction.

Verus form (inference)

A VL proof orchestrator can index verification failures by Rust function and transition branch, retain model values, and render a dependency graph from lemma calls. This would make agent iteration local and auditable. The underlying Verus checker still validates the complete contracts; a graph UI cannot establish soundness.

evidence and limits

The evidence is qualitative plus the completed graph figures. The method does not specify an optimal node-selection heuristic, and a poor choice can still waste human effort. A graph can grow large; the paper reports 39 lemmas for AsyncRaft and 27 for Bakery.

## technique: use finite model checkers for CTIs and a proof checker for final validity

what it is and when to use it

Combine fast bounded counterexample search with a separate deductive proof checker. TLC finds finite-instance CTIs; Apalache provides symbolic checking; TLAPS validates the final inductive proof graph. Use this when bounded exploration gives useful feedback but cannot establish an unbounded invariant.

how to do it

1. Encode the protocol and candidate graph in TLA+.
2. Run TLC or Apalache on finite parameter bounds to check each local obligation and obtain CTIs.
3. Add or connect a support lemma guided by a CTI.
4. Repeat until the graph has no local failures under the checked model.
5. Run TLAPS to prove each obligation for the parameterized, unbounded specification.
6. Treat finite checks as debugging evidence, not the final theorem.

The implementation description says TLC “cannot produce full proofs of inductive invariants for protocols of arbitrary size, but can generate CTIs for finite protocol instances,” while TLAPS is used “to fully validate the final inductive proof graphs.” (section 5, page 14)

Verus form (inference)

Use bounded Rust simulations or model extraction to produce candidate traces, then run Verus for the unbounded contracts. A bounded harness must share the same transition semantics, or its CTIs can be irrelevant. The trusted result remains the Verus proof; the model checker is a search aid.

evidence and limits

Experiments used Apalache 0.44.0 and TLC 2.15 on a 2023 M3 MacBook Pro. The paper does not report false-negative rates of bounded CTI generation. A graph that passes finite checks but fails TLAPS is incomplete; conversely, finite bounds cannot prove all parameterized states.

## technique: engineer proof-oriented protocol representations

what it is and when to use it

Choose a protocol model whose transition relation is a disjunction of guarded actions and whose state updates expose dependencies. This representation enables action nodes, slices, and local proof obligations.

how to do it

1. Define a finite set of state variables and explicit initial predicate `I`.
2. Split `T` into named logical actions `A1 ... Ak`.
3. Express each action as `Pre ∧ Post` with update expressions for all variables.
4. State the safety property and candidate lemma predicates separately.
5. Preserve action names in countermodels and proof graph nodes.

The paper assumes “the transition relation T for a system M is composed of distinct logical actions, T = A1 ∨ · · · ∨ Ak.” (section 2, page 4) This is a modeling assumption that makes decomposition possible.

Verus form (inference)

Represent each transition as a Rust enum variant or separate function with explicit ghost pre/post relations. Avoid hiding all actions behind one unconstrained state mutation if the product needs action-local proof failures. Rust's executable state may be richer than the ghost model; prove a refinement relation between them.

evidence and limits

The five benchmarks use TLA+ and range from 4 to 12 variables and 5 to 14 actions. The technique may be less direct for systems with dynamic heaps, continuous time, or transitions whose effects are opaque library calls.

## technique: read graph cycles as proof obligations

what it is and when to use it

Use dependency cycles to identify mutually reinforcing invariants, especially for distributed messages and local state. A cycle is not a circular acceptance of an unproved fact: every involved action node still needs a valid formula, but the graph reveals where the proof must be established together.

how to do it

1. Inspect incoming support edges after adding lemmas.
2. Find strongly connected components such as `L1 -> L2 -> L1`.
3. Enumerate every action node in the component.
4. Prove each action node's local obligation with its support lemmas, including the other component lemmas, assumed in the pre-state; by Theorem 1 the conjunction is inductive once every node is locally valid and every lemma holds initially, so no member of the cycle has to be proved first.
5. Use the component as an explanatory unit for maintenance and future changes.

Steps 1 to 5 are my inference: the paper only observes and displays induction cycles.

In AsyncRaft, the authors highlight a cycle where `LogMatching` supports `LogMatchingInAppendEntriesMsgs` through AppendEntries, and the latter supports `LogMatching` through AppendEntriesResponse. They say such cycles “would be difficult to observe in a standard inductive invariant, but are apparent in our proof graph structure.” (section 5.1, page 17)

Verus form (inference)

Mutually dependent `proof fn`s can be declared separately and called after their contracts are established; recursive proof calls need termination or a nonrecursive induction argument. If Verus rejects cyclic proof calls, encode the shared facts in one stronger lemma or prove a transition-indexed invariant. The graph remains useful even when implementation constraints force a different code organization.

evidence and limits

The paper reports cycles qualitatively for AbstractRaft and AsyncRaft and does not give a special cycle-solving algorithm. Cycles can clarify structure but can also signal that a lemma is too weak or that proof obligations are mutually under-specified.

## empirical evidence and denominators

Scimitar's five TLA+ benchmarks are SimpleConsensus (6 variables, 5 actions, 111 specification LOC, 18 proof LOC, 8 lemmas), TwoPhase (6, 7, 192/140, 16), AbstractRaft (4, 6, 220/138, 10), Bakery (6, 14, 283/116, 27), and AsyncRaft (12, 11, 638/920, 39). The authors developed the AsyncRaft invariant in approximately 3 human weeks; they compare this qualitatively with prior reports of 1–2 human months for a smaller invariant. The cited benchmark is human effort, not an automated speedup experiment.

All final proof graphs were checked by TLAPS, but the paper gives no number of local obligations, prover runtimes, failed candidate lemmas, or independent reviewers. The model-checking runs use finite bounds and are therefore exploratory. The graph theorem proves safety only under the stated transition model and initiality conditions. Trusted elements include TLA+ semantics, TLC/Apalache CTI generation, TLAPS, the specification itself, and the assumption that bug-finding occurred before proof; the paper explicitly says systems are “assumed to be correct” because bug-finding methods were applied upfront (section 2, page 4).

I found no arithmetic contradiction in Table 1: each reported median is at most its total variable count, and the LOC/lemma columns are internally plausible. The paper's claim that AsyncRaft is beyond recent automated invariant tools is comparative and tied to the cited tools and specification complexity; it is not evidence that no future automated tool can solve it.

## implications for VL

The direct opportunity, my inference, is a Verus proof workbench that stores a graph of ghost lemmas and transition branches, captures SMT countermodels, computes conservative field slices, and asks an agent to propose one support lemma at a time. This could keep agents from repeatedly rewriting a monolithic invariant and make proof progress inspectable. The main threat to a product of agent-written verified Rust is incomplete invariant development: an agent may prove a few local postconditions while missing a support edge, an action branch, or an initial-state obligation. The paper's workflow makes those omissions mechanically visible, but does not automate the invention of the missing lemma.

VL should not redo a generic invariant-workbench pitch. The reusable contribution is the exact graph semantics, the slice formula, node-local CTIs, and the bounded-search/final-proof split. New work should measure Verus-specific costs: ownership and aliasing in slices, trait/action decomposition, useful CTI formats, and whether explicit graph guidance reduces agent iterations on real Rust protocols.

## techniques for the catalog

- inductive proof graph — represent lemma dependencies and one action node per transition branch
- relative induction supports — prove each lemma from a small support subset instead of the full conjunction
- CTI-guided backward development — choose a failed node and add a lemma that excludes its localized counterexample
- local variable slicing — restrict candidate support predicates to precondition, lemma, and update cone variables
- node-local proof status — track discharged action nodes and graph structure as an interpretable progress measure
- bounded CTI plus final proof — use TLC/Apalache for finite counterexamples and TLAPS for unbounded validation
- guarded-action modeling — expose named transition branches and deterministic update expressions for decomposition
- induction-cycle analysis — inspect strongly connected lemma dependencies to understand distributed proof structure
Audited 2026-10-12 against the paper: checked Definitions 1 to 5, Theorems 1 and 2, Procedure 1, the SimpleConsensus walkthrough (Figs. 3 and 4), Table 1 and its medians and ratios, the implementation paragraph (TLC, Apalache, TLAPS, versions, hardware), the AsyncRaft figures (3 human weeks, 1 to 2 human months, 39 lemmas, cycle), the section 2 assumptions, every quotation and page reference, and the Verus forms (sound, all marked inference). Changed: the slicing quotation was attributed to the abstract and was not verbatim, now the Introduction sentence; benchmark variables range is 4 to 12 (AbstractRaft has 4), not 6 to 12; the cycle step claimed cycle members need independently discharged obligations, which Theorem 1 does not require, now corrected; the pruning steps for support sets and the cycle steps marked as my inference. None of the items in the shared findings file concern this study. Could not check the Verus claims beyond the Verus notes.
