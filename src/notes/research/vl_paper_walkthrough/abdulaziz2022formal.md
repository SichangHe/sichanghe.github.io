# Formal Semantics and Formally Verified Validation for Temporal Planning
(authored by agents unless marked 🧑)
Tag: `abdulaziz2022formal`, [paper](https://doi.org/10.1609/aaai.v36i9.21197)

## purpose and result

Abdulaziz and Koller formalize temporal PDDL 2.1 semantics in Isabelle/HOL, derive an executable validator, and prove that the validator implements the semantics. Their abstract states: “We present a simple and concise semantics for temporal planning.” The validator checks well-formedness and whether a candidate plan solves a problem. The paper’s main theorem is an equivalence, not a claim that a planner finds a plan: “check-plan(Π, →π) = \"valid Plan\" iff →π is valid for the planning problem Π according to Def. 6.”

Inference: this is a reusable verified-checker architecture for VL. Define an abstract meaning, refine it to executable code, and prove the refinement. It is an inference because the paper uses Isabelle/HOL and PDDL, not Verus or Rust.

## technique 1: declarative semantics as the reference

Why. Existing temporal-plan definitions were too close to an algorithm and became complicated when used as specifications. The authors instead define validity using states, action preconditions/effects, invariants, and non-interference. They write: “We resolve that by providing a description of the semantics that abstractly describes what a valid plan is, without appealing to algorithmic constructions like the one of induced happening sequences.”

How the paper does it (Sections “Semantics of Temporal Planning,” pp. 163–165):

1. represent temporal actions by start, end, and invariant snap actions
2. collect actions active at each happening time into `B_t` and invariants that must hold into `I_t`
3. require every invariant and precondition to hold in the current state
4. require simultaneous actions to be pairwise non-interfering
5. compute the next state by deleting all delete effects and adding all add effects
6. call a plan valid when a resulting state satisfies the goal

The paper formalizes these definitions and proves them in Isabelle/HOL. Its trust argument is explicit: “All the definitions, theorems and proofs in this paper have been formalised in Isabelle/HOL.”

Verus form. Inference: define Rust ghost state and a `spec fn` for semantic validity, with `requires`/`ensures` contracts for state transitions. Use `proof fn`s to show invariant preservation and non-interference. Keep the reference definition independent of executable data structures. Verus syntax and proof APIs differ from Isabelle; the semantic decomposition transfers, while Isabelle listings do not.

## technique 2: step-wise refinement to an executable validator

The authors refine abstract set and quantifier definitions toward an executable program. They explain: “With step-wise refinement we replace the abstract specifications in the semantics with algorithms.” The refinement has two principal stages: first replace abstract operations with algorithms; then replace mathematical sets with efficient balanced-tree implementations.

Algorithm 1’s executable shape is:

1. `simplify-plan` turns every simple action into a snap action and every durative action into start/end snaps plus invariant snaps between consecutive happening times
2. `valid-hap-seq` starts from the initial state, rejects interfering actions, rejects unsatisfied preconditions, applies effects, and finally checks the goal
3. `check-plan` runs both routines and returns `valid Plan` or `error`

The paper proves the bridge with lemmas: `simplify-plan` constructs an induced sequence; `valid-hap-seq` is equivalent to validity of that sequence; and the two plan-validity definitions are equivalent. Theorem 2 then establishes the top-level equivalence.

Verus form. Inference: implement a simple reference transition function over mathematical sequences in a `spec fn`, then executable Rust over `Vec` or map-like structures. Prove each refinement lemma with `proof fn`s and expose the final `check_plan` contract with `ensures`. The paper’s AVL tree is an implementation choice; in Verus, the concrete map must have specifications and lemmas sufficient to establish equivalence.

## technique 3: induced happening sequence construction

Temporal actions need invariant checks between their start and end. The paper constructs an induced happening sequence by inserting start and end snaps at action times and invariant snaps between every consecutive plan happening time that lies inside the action interval. In the elevator example, invariant actions are placed at intermediate rational times. The paper states that its `simplify_action` “returns a list of all snap actions for a given plan action,” and `simplify_plan` inserts those lists in sorted order.

Step by step (Sections “Refining the Semantics Towards Executability” and Appendix Listings 8, 15–18):

1. sort the plan’s happening time points
2. for each simple action, instantiate its ground action at its time
3. for each durative action, instantiate start at `t`, end at `t+d`, and invariant snaps at the midpoint of every consecutive interval inside `[t,t+d]`
4. insert all `(time, action)` pairs into a sorted sequence, merging equal times
5. prove the resulting sequence is strictly sorted and contains exactly the required instantiated snaps
6. validate the sequence recursively against the current state

Verus form. Inference: represent happenings as a Rust datatype with a time and action set; prove sortedness and snap-placement lemmas. A `while` loop that constructs the sequence needs a loop invariant expressed in Verus syntax. The midpoint policy is one executable witness; the abstract semantics should permit any valid placement allowed by the specification.

## technique 4: executable checks and efficient data structures

The executable validator checks preconditions and pairwise interference before applying effects. The paper’s `en_exE` returns an error when a precondition fails or actions interfere, otherwise it applies effects. It then refines list insertion to an AVL tree and traverses the tree in order. This preserves the proven semantics while improving asymptotic behavior.

Verus form. Inference: give the executable checker an `ensures` clause relating success to the abstract validity predicate and failure to a witnessed violated condition. Prove map/tree ordering and lookup lemmas separately. Parsing remains a trust boundary: the authors explicitly say, “parsing is a trusted part of our validator, i.e. we have no formal proof that the parser actually recognises the desired grammar and produces the correct abstract syntax tree.”

## evidence and limits

The validator supports `:strips`, equality, typing, negative and disjunctive preconditions, durative actions, and duration inequalities. It is compared with VAL on IPC 2014 domains, using plans from ITSAT and Temporal Fast Downward. The paper reports: “In all test cases, the validation outcome between our validator and VAL is the same.” It also reports that the validator is consistently slower than VAL but “never needs more than one second to validate any plan.” The denominator is all test cases in the stated IPC 2014 evaluation; the paper does not give the count in the text. This is agreement and runtime evidence, not an independent proof that VAL is correct.

The authors deliberately omit a fixed minimum separation ε between interfering actions and use arbitrary rational arithmetic. Trusted pieces include parsing, code generation, Isabelle’s kernel and libraries, and the PDDL input model. Inference: for agent-written verified Rust, this pattern reduces risk in a small checker while leaving parser, specification, and environment assumptions as product threats. A formal equivalence theorem cannot repair an incorrect semantic definition.

## techniques for the catalog

- declarative reference semantics — define validity over states, invariants, preconditions, effects, and interference before writing an algorithm
- step-wise refinement — replace abstract operations with executable algorithms and prove each refinement preserves meaning
- induced happening sequences — insert temporal start, end, and intermediate invariant checks into a sorted event sequence
- verified executable checker — prove `check-plan` accepts exactly the plans satisfying the abstract validity definition
- efficient verified representation — replace sets and lists with AVL trees while proving equivalence
- explicit trust boundary — record unverified parser and code-generation components instead of implying the theorem covers them
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
