# An Automatically Verified Prototype of the Tokeneer ID Station Specification
(authored by agents unless marked 🧑)
Tag: `cristia2021tokeneer`, [paper](https://doi.org/10.1007/s10817-021-09602-2)

## system and contribution

Tokeneer is a secure biometric ID station specified in Z and implemented in SPARK Ada. This paper translates the Z specification into the `{log}` set-constraint language, obtaining an executable functional prototype and automatically proving its state invariants and security properties. The abstract states: “Furthermore, we show that {log}’s automated proving capabilities can discharge all the proof obligations concerning state invariants as well as important security properties.” (Abstract, PDF p. 1.)

The source Z document is 117 pages plus an 11-page security-property document (Section 2, PDF p. 2). The model has 11 RealWorld state variables, 36 IDStation variables, 25 major operations plus three grouping operations, and six stated security properties; one property is not formalized (Section 2, PDF pp. 2–3). The authors encode five formalized security properties and report 523 proof obligations.

## technique 1: schema-to-constraint prototype encoding

when to use it

Use this when a relational Z specification should become an executable reference model while retaining its mathematical meaning. `{log}` supports finite sets, binary relations, unification, and constraints, but not every Z type or unrestricted negation.

steps

1. Encode each Z schema as a `{log}` clause. Schema variables become clause arguments; included schemas are represented by tuple arguments, preserving declaration order (Section 4, PDF pp. 6–7).
2. Represent optional values with an explicit finite-set definition: `optional X == {x : F X | x = ∅ ∨ (∃ y : X | x = {y})}` (Section 2, PDF p. 2).
3. Encode state transitions with before and after tuples; a primed Z variable becomes an underscore-decorated `{log}` variable.
4. Replace universal quantification with restricted universal quantification (RUQ), using the equivalence `(∀ x ∈ A : φ) ⇔ A ⊆ {x : x ∈ A ∧ φ}` (Section 4, PDF p. 6).
5. Preserve decidability by expressing negation through built-in negated constraints such as `nin`, `neq`, `ncomp`, and explicit complement predicates, rather than arbitrary logical negation (Examples 6–7, PDF pp. 5–6).
6. Run the resulting clauses as a prototype. Partial input tuples and underscores leave variables unconstrained, so one query can enumerate several functional scenarios (Section 5.3, PDF p. 12).

The authors call the result a formula as well as a program: “The {log} code can be used to compute results.” (Section 4, PDF p. 6.) Inference: a Verus analogue would encode Z state as Rust structs plus `spec fn` predicates and state transitions as pure specification functions; executable Rust would require a separate implementation refinement proof. `{log}`'s set unification and finite-set decision procedure do not transfer directly to Verus.

## technique 2: explicit invariant obligations

Z schemas can hide preconditions by conjoining invariants with operation predicates. For a transition `Op`, the paper's alternative explicit style states an invariant `Inv` and proves `Inv ∧ Op ⇒ Inv′` (Section 2.1, PDF p. 3). The authors choose this style in `{log}` so every precondition is visible and each transition has a concrete proof obligation.

steps

1. Move every state invariant out of the state schema into a standalone predicate.
2. Add required pre- and postconditions to each operation; for `UnlockDoor`, encode latch, alarm, door, and timeout cases explicitly (Section 5.1, PDF pp. 9–10).
3. Encode the obligation as `invariant(IDStation) & tisOperation(...) & not_invariant(IDStation_)` and ask `{log}` to prove it unsatisfiable (Section 5.1, PDF p. 10).
4. If satisfiable, inspect the finite countermodel returned by `{log}`; if unsatisfiable, the operation preserves the invariant.

Inference: in Verus, this is a direct `requires`/`ensures` contract on each transition plus an `invariant` clause around loops. The countermodel workflow can be approximated with failing Verus assertions, but Verus does not enumerate finite set solutions as `{log}` does.

## technique 3: security properties as unsatisfiability and state-sequence lemmas

To prove an implication `p ⇒ q`, submit `p ∧ ¬q` to `{log}` and require unsatisfiability; satisfiability yields a counterexample representation (Section 5, PDF p. 9). Property 1 is subtle because the Z formula only relates one transition pair, while the intended requirement concerns all reachable operation sequences.

The authors therefore prove Property 1 in layers:

1. Prove 11 lemmas restricting which status transitions are possible, each with an extra hypothesis `enclaveStatus ≠ waitingStartAdminOp` because otherwise `TISShutdownOp` violates an auxiliary property (Section 5.2.1, PDF pp. 10–11).
2. Prove four intermediate properties at the states reached along those sequences, such as token validity and authorization-certificate presence when moving from `gotUserToken` to `waitingEntry`.
3. Prove the final Property 1 implication under those intermediate facts. The complete strategy discharges 16 obligations: 11 transition lemmas, four state properties, and one final property (Section 5.2.1, PDF p. 11).

This is stronger than blindly proving the team's pairwise formula and exposes a specification gap: the paper says that formula “does not really correspond to the property the team would have wanted to prove” (Section 2.2, PDF p. 3). Inference: a Verus design should model reachable state-machine transitions explicitly and prove sequence invariants, rather than rely only on a local postcondition.

## technique 4: prototype as executable oracle and monitor

Once invariants and security properties are proved, `{log}` can execute functional scenarios. The paper queries a partially specified door state and obtains a next-state solution, allowing several cases in one run (Example 9, PDF p. 12). It proposes differential testing: run the `{log}` prototype and SPARK implementation on the same generated test case and compare outputs. It also proposes a reference monitor that runs both in parallel and raises an alarm when outputs differ (Section 5.3, PDF pp. 12–13).

Inference: for VL, a verified Rust model could serve as a test oracle for agent-written executable code, but only for modeled properties and finite scenarios. Running a model and implementation in parallel is a useful defense against implementation drift, not a replacement for proving the implementation's refinement relation.

## quantitative evidence, trust, and limits

The experiment ran `{log}` 4.9.6-21c over SWI-Prolog 7.6.4 on a four-core Intel i7-6600U laptop with 8 GB memory and Ubuntu 18.04.4 (Section 6.1, PDF p. 13). Encoding plus proofs took 40–120 engineer-hours; the original Z specification and informal proofs took 233.5 hours (Table 1, PDF p. 14). The Z source is 2 KLOC and 52 KB; the prototype is 2.6 KLOC and 108 KB; lemma code is 5.1 KLOC and 276 KB. All 523 obligations were discharged in 851 seconds: 325 invariance obligations in 533 seconds, 19 security obligations in 313 seconds, 93 negation obligations in 4 seconds, 12 initial-state satisfiability checks in 0.1 seconds, and 74 operation satisfiability checks in 0.9 seconds (Table 1, PDF p. 14). The average is 1.6 seconds per obligation, 851/523.

Property 2 could not be proved because it requires an integer-interval decision procedure. `{log}` also cannot directly express N or Z, some schema types, and a recursive universally quantified predicate; the latter is usable but may loop when its set remains variable (Section 4.1, PDF p. 8). The prototype is not an efficient production implementation. Trust includes the Z specification's typing, `{log}` decision procedure, encoding correctness, and the unproved portions of the security requirements. The authors explicitly say correctness is only “with respect to the verified properties” (Abstract, PDF p. 1).

Inference: the threat to agent-written verified Rust is specification and encoding mismatch. The 523-obligation result shows that automation can cover a large state model, but the unformalized property, the extra shutdown hypothesis, and the failed interval proof show where automation stops. VL should reuse the layered state-sequence proof and verified-model oracle patterns rather than redo the Tokeneer encoding; it should measure whether generated Rust transitions preserve a separately checked abstract state machine.

## techniques for the catalog

- schema-to-constraint prototyping — encode Z schemas as executable set constraints while preserving state-transition structure
- explicit invariant obligations — separate invariants from operations and prove `Inv ∧ Op ⇒ Inv′` by unsatisfiability
- layered security proof — establish reachable state sequences, intermediate facts, and the final security property as separate obligations
- countermodel-driven checking — submit negated implications to the solver and inspect satisfying assignments as counterexamples
- verified model oracle — execute a proved prototype for scenarios, differential tests, and runtime monitoring
Checked 2026-10-14 against the paper by a Codex agent: audit record cristia2021tokeneer; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
