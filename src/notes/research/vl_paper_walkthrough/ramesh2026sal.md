# Sal: Multi-modal Verification of Replicated Data Types
(authored by agents unless marked 🧑)
Tag: `ramesh2026sal`, [paper](https://www.semanticscholar.org/paper/0c8a9c049fcbcb7cc9fc2ded0f9e82f5fb6f0556)

## purpose and result

Ramesh, Soundarapandian, and Sivaramakrishnan present Sal, a Lean workflow for verifying replication-aware (RA) linearizability of state-based CRDTs and mergeable replicated data types (MRDTs). Sal combines kernel-checked automation, an SMT fallback, AI-assisted proof search, property-based counterexamples, and trace visualization. The paper's abstract reports: “We report on our experience verifying a suite of 13 CRDTs and MRDTs with Sal: 69% of verification conditions are discharged by kernel-verified automation without SMT.” (Abstract, p. 1). It evaluates 13 RDTs with 24 verification conditions each, hence 311 VCs total (Section 4, p. 5; Table 2).

## technique 1: model RDTs with RA-linearizability VCs

What it is. An RDT is modeled as `Dτ = ⟨Σ, σ0, do, merge, rc⟩`: state space, initial state, update operation, three-way merge, and conflict-resolution relation. RA linearizability reduces correctness to a finite set of VCs over these functions. MRDT merge receives a lowest common ancestor (LCA), so concurrent updates can be interpreted against a shared history. The paper says, “Neem [20] reduces RA linearizability for MRDTs and state-based CRDTs to a finite set of verification conditions (VCs) over do, merge, and rc.” (Section 2, p. 2).

How to apply it. (1) Define the state type and initial state. (2) Define operations with timestamp and replica parameters. (3) Define two-way CRDT merge or three-way MRDT merge with an LCA. (4) Define the partial-order conflict policy `rc`. (5) Instantiate the RA-linearizability VC suite over those definitions. (6) Submit all VCs to Sal. The paper's OR-set and increment-only counter definitions in Section 2 provide concrete shapes.

Verus form. Inference: encode the state machine with Verus datatypes or structs, executable `do` and `merge` functions, and `spec fn`s for the abstract transition relation and conflict order. Prove each VC with `ensures` clauses and lemmas. Verus does not automatically provide Neem's RA-linearizability reduction; the reduction and linearization relation would need to be formalized as a library.

Evidence and limits. Sal verifies 24 VCs per RDT, but the paper's results cover these selected CRDT/MRDT models and do not prove all replicated data types. The merge and operation specifications are trusted inputs; a proof establishes the encoded model, not that the model matches a deployed protocol.

## technique 2: automation-friendly functional sets and maps

What it is. Lean's mathematical `Set` uses propositions, while computational maps complicate extensional reasoning. Sal defines sets as decidable Boolean membership, `abbrev set (a) [DecidableEq a] := a → Bool`, and maps as a structure containing a mapping and an explicit domain. Definitions and lemmas receive `[simp, grind]` attributes and `grind_pattern` hints. The paper states: “Critically, we annotate all definitions and lemmas with @[simp, grind] attributes and provide grind_pattern hints.” (Section 3.1, p. 3).

How to apply it. (1) Require decidable equality for element and key types. (2) Represent set membership as a Boolean function. (3) Represent a map with its domain and mapping. (4) Prove extensional equality over the explicit domain. (5) Annotate algebraic operations and lemmas for `grind`. (6) Add patterns that expose set union, membership, and map selection to automation. These are Section 3.1's design steps.

Verus form. Inference: use finite map/set models with explicit domains and `spec fn` membership predicates where solver-friendly extensional reasoning is needed. Verus's `set` and `map` libraries should be checked against current local references before use; the general principle is to expose decidable operations and reusable rewrite lemmas. Inference: Boolean membership changes proof statements, so existing proposition-valued set lemmas do not transfer unchanged.

Evidence. The authors attribute much of the no-SMT automation to these representations and annotations. The tradeoff is reduced generality: the custom structures are designed for automation, not necessarily for the fastest executable implementation.

## technique 3: staged Sal tactic

What it is. Sal tries proof-producing automation first, then an SMT backend, then AI-assisted interactive proving. The stages are: (1) `dsimp + grind` (DG), which reconstructs kernel-checkable proofs; (2) `lean-blaster` (LB), which encodes goals to Z3 without proof reconstruction; and (3) Aristotle interactive theorem proving (ITP), whose generated proofs are checked by Lean. Heartbeat limits bound the first two stages. The paper says: “The tactic proceeds in the following stages” (Section 3.4, p. 5).

How to apply it. (1) Simplify and run `grind`; accept only a kernel-checked proof. (2) If DG fails, run lean-blaster with a heartbeat limit and record that Z3 is now in the trusted base. (3) If LB fails, invoke Aristotle or manual tactics. (4) Stop on timeout and return control to the user. (5) Record which stage discharged each VC and its wall-clock time. Section 3.4 gives this exact ordering.

Verus form. Inference: stage Verus automation similarly, beginning with `assert`, `assert forall`, `reveal`, and local lemmas under the normal verifier, then use explicitly trusted external reasoning only if the project permits it. Verus's proof functions and lemmas are checked by Verus; do not mark the function under verification `external_body`. Inference: because Verus's solver integration differs from Lean's, stage names and success rates require a separate benchmark.

Evidence. Across 311 VCs, DG discharges 215 (69.1%), LB 87 (28.0%), and ITP 9 (2.9%) (Table 2, p. 5). These fractions sum to 311 and are denominated by all VCs. Runtime ranges from under one second for simple RDTs to about 100 seconds for PN-counter CRDT; the latter's six ITP goals dominate time (Section 4, p. 5). LB enlarges the trusted computing base because it lacks proof reconstruction.

## technique 4: property-based counterexamples for failed VCs

What it is. When a VC is false, Plausible generates concrete inputs for the decidable proposition. The enable-wins flag example has a known bug: after concurrent enables and disables, merge returns enabled although all enables were disabled. Plausible reports a sequence such as `postcondition violated for input (disable, (enable, (enable, (disable, (0, false)))))` (Section 3.2, p. 3).

How to apply it. (1) Ensure the VC is a decidable proposition. (2) Run Plausible to generate random operations and states. (3) Stop on a violating input. (4) Preserve the exact operation sequence and LCA. (5) Classify the failure as an implementation/specification bug or as a proof obligation requiring manual reasoning. The paper's Section 3.2 flow uses this procedure.

Verus form. Inference: expose a finite, executable test model of a Verus transition system and use a property-based generator to search VC predicates. Verus itself proves universal specifications but may not provide this paper's random counterexample workflow; an external generator must be treated as a debugging aid, not a proof.

Evidence and limits. Plausible finds the enable-wins counterexample automatically, but random generation can miss rare traces. A failed VC with no counterexample is not proof of correctness; Sal sends such cases to interactive proving.

## technique 5: visualize abstract sets with a finite universe

What it is. Functional sets are abstract and non-enumerable, so Sal tracks a finite `HashSet` of all elements added or removed during execution. Visualization checks membership only in this universe and displays concrete element lists. The paper says: “of all elements that have been added or removed.” (Section 3.3, p. 4).

How to apply it. (1) Wrap the abstract set with a structure containing the set and a finite universe. (2) Instrument `do` and `merge` to add touched elements to the universe. (3) At trace time, evaluate membership for every universe element. (4) Render states and operations with labels. (5) Compare the two sides of a failed VC step by step. The paper's `set_with_universe` structure and OR-set example implement these steps.

Verus form. Inference: maintain a ghost or executable finite collection of touched keys for diagnostics, while proving the abstract set property separately. Ghost data must not alter executable semantics. Inference: a finite universe visualizes observed behavior only; it cannot establish equality over all possible elements.

Evidence. The OR-set visualization shows concurrent remove and add converging to the add-wins state `[(1, 3)]` (Section 3.3, p. 4). This is a debugging representation, not an additional proof of the universal set law.

## what is proved, measured, and trusted

Lean's kernel checks DG and Aristotle proof terms. Lean-blaster/Z3 results are trusted without reconstructed proof terms. Plausible and visualization find examples but do not prove universal properties. The 311-VC evaluation measures stage counts and wall-clock time for 13 selected RDTs. Trusted assumptions include RA-linearizability's VC reduction, each RDT's model, Lean's kernel and erasure/runtime, Z3 for LB, and any `admit` or uncertified external code. The paper explicitly notes that SMT-aided proofs can be brittle and enlarge the trusted base.

## techniques for the catalog

- RA-linearizability VC reduction — model `do`, merge, conflict order, and LCA semantics, then discharge a finite VC suite
- automation-friendly data structures — use decidable functional sets/maps and rewrite annotations to aid proof reconstruction
- staged multi-modal tactic — try kernel-checked automation, then SMT, then interactive proof under bounded heartbeats
- property-based VC counterexamples — generate concrete violating executions for decidable failed conditions
- finite-universe visualization — track touched elements to render abstract set traces for debugging
