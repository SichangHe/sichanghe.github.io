# Iterator and closure contracts
(authored by agents unless marked 🧑)

## short version

- an iterator contract says which values were produced and when iteration is complete
  - write it once per iterator, then reuse it in every client loop
- a closure passed to map or filter needs its own call description
  - it links the closure's argument, result, and captured state before and after
- a ghost history makes chains of adapters compose without reverification
- a higher-order call can be reduced to a plain loop over a cursor
- two studies cover this, both on non-Verus tools
  - one is OCaml with Gospel, Cameleer and Why3
  - one is Rust with Prusti
  - every Verus form below is my inference, not a result of either paper

## the problem

A client loop over an iterator needs a loop invariant.
The invariant must talk about the values already seen.
The iterator hides its internals, so the client has no names for them.

Closures make it worse.
A closure in map can mutate captured variables.
A proof that ignores those effects misses what the loop accumulated.
The [Rust study](../vl_paper_walkthrough/compositional_reasoning_for_side_effectf_20261012.md) says:
"without explicit history and closure contracts, local proofs can miss accumulated side effects" (study's words, not the paper's).
Its claim of novelty is the paper's:
"We present the first methodology for the modular specification and verification of advanced iteration idioms with side-effectful computations."

Higher-order functions are also hard for first-order provers.
The OCaml study reduces them to loops for that reason.

## how to do it in Verus

Neither study gives Verus code.
Both studies mark their Verus forms as inference, and so do I.
Steps 1 to 4 come from the two papers.
The Verus shape in each step is my guess.

1. Give the iterator a ghost sequence of produced values.
   - Rust study: a ghost sequence "recording values returned so far"
   - OCaml study: a `visited` sequence kept in the cursor
   - in Verus I would use a `Seq<T>` in a view or ghost field
2. Define `completed` from the real stopping condition.
   - for a finite source, the OCaml study uses `|v| = |s|`
   - the Rust study ties `completed` to `next` returning `None`
3. Define a one-step relation `step` and a many-step relation `leadsto`.
   - `step(Ik, Ik+1, v)` describes one call of `next`
   - `leadsto` is the "reflexive, transitive closure of the two-state postcondition step" (paper's words, per the study)
   - in Verus these would be `spec fn`s over old and new states
4. Put the contract on `next`.
   - Rust study, Q1 to Q5:
     - Q1: `next` establishes `step`
     - Q2: `completed` holds exactly when the result is `None`
     - Q3: `produced` is unchanged after completion
     - Q4: before completion, the new value is appended
     - Q5: completion is monotone
   - in Verus these become `ensures` clauses using `old(...)`
5. In the client loop, keep `leadsto(initial, current)` as the invariant.
   - add the client's own claim, such as `sum == produced.sum()`
   - the OCaml study adds a decreasing measure, for example `|c| - |v|`
6. At exit, `completed` plus the invariant gives the postcondition.
7. For a closure, write a call description.
   - bind the closure's old state to the adapter's old field
   - bind its argument to the predecessor's newly produced value
   - bind its new state to the adapter's new field
   - bind the adapter's result to the closure's result
   - then plug in the client's closure contract
   - Verus has no matching syntax, so the relation must be an explicit `spec fn`
8. For an adapter chain, keep a ghost history.
   - `leadsto` requires the old history to be a prefix of the new one
   - the history has one more entry than `produced`
   - for each produced index, consecutive entries are tied to the predecessor call and the closure call
   - the study fixed the Verus method name as `is_prefix_of`
9. For a nested loop, pass the outer history into the inner invariant.
   - OCaml paper: "nested loops require the inner one to preserve the invariant of the outer."
   - I would keep ghost snapshots of the outer state and restore the outer invariant after the inner loop

If the iterator can be changed by methods other than `next`, the Rust study says:
"If the iterator state may be modified by methods other than next, one can interpret leadsto as a standard two-state invariant on the iterator type."

## variants by paper

Rust, Prusti: [study](../vl_paper_walkthrough/compositional_reasoning_for_side_effectf_20261012.md)

- four-component contract: `produced`, `completed`, `step`, `leadsto`, with Q1 to Q5 proved on each `next`
- closure call descriptions for `FnMut`
  - the running-total example maps `[6,2,9]` to `[6,8,17]`
  - the proof must show both the sequence and the final `sum`
- compositional ghost histories
  - the paper says "neither the input iterator nor the adapter need to be re-verified when forming an iterator chain."
- out-of-band contracts
  - an `IteratorSpec` extension trait plus `#[extern_spec]` with `type_dependent`
  - existing `Iterator` code need not change
  - contracts must refine the base contract: weaker preconditions, stronger postconditions
- this paper verifies the implementation of `next` against the contract

OCaml, Gospel and Cameleer: [study](../vl_paper_walkthrough/unfolding_iterators_20261012.md)

- two predicates: `permitted` for a valid visited prefix, `complete` for done
  - they handle finite or infinite, deterministic or nondeterministic iterators
- cursor reduction
  - `fold f acc0 col` becomes `acc := acc0`, `cursor := create col`, then `while has_next cursor`
  - the loop takes the supplied variant and invariant
  - the study quotes the paper:
    "This concludes our translation schema, which makes higher-order specifications amenable to automated verification by translating them into a first-order form."
- effectful iterators
  - `iter` has no accumulator, so the invariant is over the mutable object and the visited prefix
  - the stack example uses `reverse stack = s[..|v|]`
- nested history
  - inner invariants take the outer accumulator and visited history as extra parameters
- graph iteration
  - vertices: visited is a distinct subset of the domain, complete when it equals the domain
  - successors: complete when the cardinality equals that of the successor set
  - the paper says successors need only be equal in cardinality, "not in the enumeration of their elements"
- fold basis
  - `iter`, `map`, and `filter` are degenerate folds, so one translation covers all
- this paper verifies clients only, not the iterator implementations

A third study sidesteps iterators instead.
[Graph algorithm study](../vl_paper_walkthrough/auto_active_verification_of_graph_algori_20261012.md)
lists the step "Change higher-order iterators into list-returning operations when the verifier cannot reason about the original iterators."
That is a workaround, not a contract.
The OCaml study adds that the paper's related work says Creusot and Prusti already apply permitted/complete to Rust iterators.

## evidence

Rust study
- seven implementation tests and seven client tests
  - Table 1 times, averaged over seven runs: counter 9.53 s, double 9.95 s, map 42.12 s, zip 84.46 s
- about 340 lines of common specifications
- filter examples marked `*` were encoded by hand in Viper because of Prusti issues
- the study says "no aggregate success denominator is reported"

OCaml study
- 18 VCs for sequence clients, 275 for graphs, 14 for trees
  - graph suite: 124 lines of code, 286 lines of specification
  - `union`: 11 VCs, 4.40 s
  - `check_path`: 71 VCs, 47.79 s, against 161 VCs and 105.07 s for the old manual version
- `sum_cursor` makes six VCs, all discharged by Alt-Ergo
- the stack example takes 3.01 s, the queue 1.13 s
  - the paper's text says "under 3 seconds"; its Table 1 says 3.01 s, so they differ slightly
- `counter_filter_seq` and `counter_map_seq` need one VC each
- machine: Intel i5-2520M, two cores; replay times are five runs after three warmups

Neither paper measures an agent or LLM writing these contracts.
Both are hand-written.

## where it fails

- the client proof is only as good as the assumed contract
  - OCaml study: "a passing client proof assumes the iterator contract"
  - the OCaml paper leaves verifying iterator implementations for future work
- the translation itself is argued informally in the OCaml study
  - a relational equivalence proof is future work
- the Rust method assumes fused iterators, exclusive mutation, stable snapshots, and hand-written closure contracts
  - these four are the Rust study's list of assumptions to surface
  - inferring contracts for simple closures is "orthogonal to our presented technique" (paper's words, per the study)
- the Rust study suspects the slow outliers need work to control quantifier instantiation
- among the OCaml graph operations, complement is slowest because it tracks unexplored vertices (study's reading)
- Rust standard library iterators are not yet verified
  - the [standard library study](../vl_paper_walkthrough/verifying_the_rust_standard_library_20261012.md) says iterators are among the APIs only partially covered or not yet addressed
- times come from old hardware and small suites; they do not show scaling

## where the studies differ

- both define a history, but under different names
  - `permitted` constrains a visited sequence
  - `produced` is a sequence plus an explicit `step` relation
- the OCaml study treats the consumer uniformly and abstracts effects
  - the Rust study makes the closure state transition part of the contract
- the OCaml study proves clients against assumed contracts
  - the Rust study proves each `next` against Q1 to Q5
- I found no disagreement on facts, only on scope

## open questions

- what does a Verus encoding of an `FnMut` call description look like, and does Z3 handle quantified histories?
  - both studies' Verus forms are guesses
  - Verus closures carry `requires` and `ensures` already; I have not checked how they compose with this
- can an agent write the contract and history, or only the client invariant?
- which standard library iterators can be given a Q1 to Q5 contract once and reused?
- how does a cursor reduction deal with `Fn`, `FnMut`, and `FnOnce` permissions?
  - the OCaml study (inference) says Rust closure traits change the permissions needed

Related pages
- [Loop invariant synthesis](loop_invariant_synthesis.md)
- [Proof decomposition](proof_decomposition.md)
- [techniques by paper](index.md)
