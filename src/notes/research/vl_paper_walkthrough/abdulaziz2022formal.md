# Formal Semantics and Formally Verified Validation for Temporal Planning
(authored by agents unless marked 🧑)
Tag: `abdulaziz2022formal`, [paper](https://arxiv.org/abs/2203.13604)

## purpose and result

Abdulaziz and Koller formalize temporal PDDL 2.1 semantics in Isabelle/HOL, derive an executable validator, and prove that the validator implements the semantics. Their abstract states: “We present a simple and concise semantics for temporal planning.” The validator checks well-formedness and whether a candidate plan solves a problem. The paper’s main theorem is an equivalence, not a claim that a planner finds a plan: “check-plan(Π, →π) = \"valid Plan\" iff →π is valid for the planning problem Π according to Def. 6.”

## technique 1: declarative semantics as the reference

Why. The paper says Fox and Long's definition of plan validity "is too close to an operational specification of a validation algorithm for temporal plans," which made the definitions complicated when formalised and used as specifications. The authors instead define validity using states, action preconditions/effects, invariants, and non-interference. They write: “We resolve that by providing a description of the semantics that abstractly describes what a valid plan is, without appealing to algorithmic constructions like the one of induced happening sequences.”

How the paper does it (section “Semantics of Temporal Planning,” Definitions 1–6; the paper text has no AAAI page numbers):

1. represent each temporal action as a tuple of a start snap action, an end snap action, and an invariant formula (Def. 2); a snap action has a precondition formula, add effects, and delete effects
2. define the happening time points of a plan as the sorted start times and end times (Def. 3), and collect, per time `t`, the start/end snap actions `B_t` and the invariants `I_t` of actions running strictly between their start and end (Def. 5)
3. require every invariant in `I_t` and every precondition of `B_t` to hold in the current state `M_i`
4. require the snap actions in `B_t` to be pairwise non-interfering (Def. 4: no snap action's precondition atoms meet the other's add or delete effects, and neither's add effects meet the other's delete effects)
5. compute the next state `M_{i+1}` by removing all delete effects and adding all add effects of `B_t`
6. call a plan valid when some state sequence starting at the initial state `I` is valid and its last state satisfies the goal `G` (Def. 6)

The paper formalizes these definitions in Isabelle/HOL. Its trust argument is explicit: “All the definitions, theorems and proofs in this paper have been formalised in Isabelle/HOL.”

Verus form. Inference: define Rust ghost state and a `spec fn` for semantic validity, with `requires`/`ensures` contracts for state transitions. Use `proof fn`s to show invariant preservation and non-interference. Keep the reference definition independent of executable data structures. Verus syntax and proof APIs differ from Isabelle; the semantic decomposition transfers, while Isabelle listings do not.

## technique 2: step-wise refinement to an executable validator

The authors refine abstract set and quantifier definitions toward an executable program. They explain: “We use step-wise refinement to replace the abstract specifications in the semantics with algorithms.” The paper says “We do two main refinement steps”: first replace the abstract specifications with algorithms defined on abstract mathematical types like sets (Algorithm 1); then replace those abstract types, such as the set operations in `valid-hap-seq`, with “efficient implementation using balanced trees.” The second step is “completely automated with the Containers Framework in Isabelle/HOL,” so the paper does not describe its pseudo-code or proofs.

Algorithm 1’s executable shape is:

1. `simplify-plan` turns every durative action into start/end snaps plus invariant snaps between consecutive happening times (the pseudo-code shows only durative actions; the Isabelle listing 15 also maps simple actions to one ground action)
2. `valid-hap-seq` starts from the initial state, rejects interfering actions, rejects unsatisfied preconditions, applies effects, and finally checks the goal
3. `check-plan` runs both routines and returns `valid Plan` or `error`

The paper proves the bridge with lemmas: Lemma 1 says that any two induced happening sequences of a plan yield the same last state; Lemma 2 says `simplify-plan` constructs an induced happening sequence; Lemma 3 says `valid-hap-seq` is true iff the sequence is valid. Theorem 1 says Def. 9 (existence of a valid induced happening sequence) and Def. 6 are equivalent. Theorem 2 follows from Lemmas 1–3 and Theorem 1. The proofs of Lemmas 2 and 3 are each one line (“This follows from Def. 8” and “This follows from Def. 7”).

Verus form. Inference: implement a simple reference transition function over mathematical sequences in a `spec fn`, then executable Rust over `Vec` or map-like structures. Prove each refinement lemma with `proof fn`s and expose the final `check_plan` contract with `ensures`. The paper’s AVL tree is an implementation choice; in Verus, the concrete map must have specifications and lemmas sufficient to establish equivalence.

## technique 3: induced happening sequence construction

Temporal actions need invariant checks between their start and end. The paper constructs an induced happening sequence by inserting start and end snaps at action times and invariant snaps between every consecutive plan happening time that lies inside the action interval. In the elevator example, invariant actions are placed at intermediate rational times. The appendix states: “The function simplify_action return a list of all snap actions for a given plan action (according to Definition 8).” Also,  `simplify_plan` inserts these snap actions into the existing happening sequence with `insort_mult_happs`, which keeps time order and merges equal times.

Step by step (section “Refining the Semantics Towards Executability,” Definitions 7–9, Figure 2, and Appendix Listings 8, 15–18):

1. sort the plan’s happening time points
2. for each simple action, instantiate its ground action at its time
3. for each durative action, instantiate start at `t`, end at `t+d`, and invariant snaps at the midpoint of every consecutive interval inside `[t,t+d]`
4. insert all `(time, action)` pairs into a sorted sequence, merging equal times
5. prove the resulting sequence is strictly sorted and contains exactly the required instantiated snaps
6. validate the sequence recursively against the current state

Verus form. Inference: represent happenings as a Rust datatype with a time and action set; prove sortedness and snap-placement lemmas. A `while` loop that constructs the sequence needs a loop invariant expressed in Verus syntax. The midpoint policy is one executable witness. The paper notes that Def. 8 “allows invariant snap actions to be placed arbitrarily in between consecutive happening time points,” which is more general than Fox and Long's exactly-in-the-middle placement.

## technique 4: executable checks and efficient data structures

The executable validator checks preconditions and pairwise interference before applying effects. The paper’s `en_exE` returns an error when a precondition fails or actions interfere, otherwise it applies effects. It then refines list insertion to an AVL tree and traverses the tree in order. Inference: this keeps the proven semantics while making insertion cheaper than list insertion; the paper says only that the refinement is “efficient” and does not state asymptotic bounds.

Verus form. Inference: give the executable checker an `ensures` clause relating success to the abstract validity predicate and failure to a witnessed violated condition. Prove map/tree ordering and lookup lemmas separately. Parsing remains a trust boundary: the authors explicitly say, “parsing is a trusted part of our validator, i.e. we have no formal proof that the parser actually recognises the desired grammar and produces the correct abstract syntax tree.”

## evidence and limits

The validator supports `:strips`, equality, typing, negative and disjunctive preconditions, durative actions, and duration inequalities. It is compared with VAL on IPC 2014 domains, using plans from ITSAT and Temporal Fast Downward. The paper reports: “In all test cases, the validation outcome between our validator and VAL is the same.” It also reports that the validator is consistently slower than VAL but “never needs more than one second to validate any plan.” The denominator is all test cases in the stated IPC 2014 evaluation; the paper does not give the number of plans in the text (Figure 3 plots runtimes for 11 domains, with an axis up to 1 s). Inference: this is agreement and runtime evidence, not an independent proof that VAL is correct. The paper also says verified code “is usually orders of magnitude slower than unverified code,” and notes that its own validator uses arbitrary precision arithmetic, which it gives as a reason the speed is acceptable.

The authors deliberately omit a fixed minimum separation ε between interfering actions and use arbitrary rational arithmetic. The paper states that parsing is trusted. Inference: the trusted base also includes Isabelle’s kernel and code generator, the Standard ML parser library, and the grounding of PDDL (the paper treats ground problems and says it assumes they were obtained from well-formed PDDL). For agent-written verified Rust, this pattern reduces risk in a small checker while leaving parser, specification, and environment assumptions as product threats. A formal equivalence theorem cannot repair an incorrect semantic definition.

## techniques for the catalog

- declarative reference semantics — define validity over states, invariants, preconditions, effects, and interference before writing an algorithm
- step-wise refinement — replace abstract operations with executable algorithms and prove each refinement preserves meaning
- induced happening sequences — insert temporal start, end, and intermediate invariant checks into a sorted event sequence
- verified executable checker — prove `check-plan` accepts exactly the plans satisfying the abstract validity definition
- efficient verified representation — replace sets and lists with AVL trees while proving equivalence
- explicit trust boundary — record unverified parser and code-generation components instead of implying the theorem covers them
