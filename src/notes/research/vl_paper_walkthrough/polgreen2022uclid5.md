# UCLID5: Multi-modal Formal Modeling, Verification, and Synthesis
(authored by agents unless marked 🧑)
Tag: `polgreen2022uclid5`, [paper](https://doi.org/10.1007/978-3-031-13185-1_27)

## scope
UCLID5 combines operational and axiomatic models, several specification styles, SMT verification, and syntax-guided synthesis. The paper lists “Floyd-Hoare style proofs, k-induction and bounded model checking (BMC), verifying hyperproperties, or using syntax-guided and inductive synthesis” as supported techniques (Sect. 1, p. 2). Its architecture parses a module, type-checks and inlines procedures, symbolically simulates transitions into assertion trees, then emits SMT-LIB or SyGuS-IF for external solvers (Sect. 2, pp. 2–3). The solver, front-end translation, and any oracle binary remain trusted.

## technique: multi-modal modeling and invariant checking
Use sequential procedures for code-like operations and transition-system `init`/`next` blocks for unbounded state evolution. UCLID5 permits their combination: “The sequential program modeling ... allows the user to port Boogie models to UCLID5,” while concurrent modeling defines transition systems whose modules are stepped by a parent module (Sect. 3.2, p. 6).

Steps: (1) declare state variables; (2) define `init`; (3) define `next` with deterministic or nondeterministic updates; (4) write assertions, pre/postconditions, global invariants, or LTL properties; (5) choose induction, k-induction, or BMC in `control`; (6) inspect solver results and counterexamples. For loops in procedural code, UCLID5 either unrolls bounded loops or replaces while loops with user-provided invariants; unbounded control flow is represented as transition systems (Sect. 2, p. 3).

Verus form. Inference: represent state in a Rust struct, transition functions with `requires`/`ensures`, and loop invariants with `invariant` clauses. A transition-system proof becomes an inductive `proof fn` over the state relation. UCLID5's nondeterministic `havoc` requires explicit quantified assumptions or ghost choice in Verus.

## technique: syntax-guided invariant synthesis
The Fibonacci example declares a synthesis function `h` and uses it to strengthen a non-inductive invariant. The paper states that CVC5 “will automatically generate the function h(x, y) = x >= 0, which completes the inductive proof” (Sect. 3.1, p. 5). Apply it by (1) writing the desired safety invariant; (2) identify that induction fails; (3) declare a `synthesis function` with the needed arguments and result sort; (4) conjoin that function in an invariant; (5) invoke induction and `check`; (6) let a SyGuS solver search the grammar for a definition that makes initiation and consecution valid.

Verus form. Inference: Verus does not synthesize arbitrary function bodies. VL could generate candidate `spec fn` predicates externally, then ask Verus to prove them with `ensures` and loop invariants. The generated predicate must be treated as untrusted until Verus checks it; do not place executable proof calls in runtime code.

## technique: hyperproperty by self-composition
UCLID5 adds `hyperaxiom` and `hyperinvariant` for k-safety. A hyperinvariant is an invariant over n module instances; the maximum instance index determines n. The paper's example is `hyperinvariant[2] det xy: y.1 == y.2` (Sect. 3.1, p. 4). For the TAP case, instantiate two TAP modules, state that mapped memory is equal in both traces, step both instances together, and run induction (Sect. 4, pp. 9–10). The paper reports Table 1 results on a 2.6 GHz six-core Intel Core i7 with 16 GB RAM: UCLID5 TAP 53 procedures, 25 functions, 87 annotations, 2765 lines, 49 seconds; its integrity proof 2 procedures, 0 functions, 54 annotations, 293 lines, 30 seconds. The corresponding Boogie times were 51 and 346 seconds, with 254 and 71 annotations respectively (Table 1, p. 10). These denominators and settings are the table's model/proof rows, not generic tool averages.

Verus form. Inference: encode two ghost copies of state and prove a relational invariant such as equality on protected addresses. Rust's borrow checker cannot express two executions directly, so the relation belongs in ghost state and proof functions. Existing Verus constructs support quantified postconditions and invariants, but no `hyperinvariant` keyword.

## technique: solver-backed external oracles and synthesis
An oracle function has no model implementation and is linked to a user binary queried by the solver. The paper says this is useful when a component is “difficult or impossible to model” or when nonlinear arithmetic is better outsourced (Sect. 3.2, p. 6). Declare `oracle function [isprime] Prime(x: integer): boolean`; verification uses satisfiability modulo oracles and synthesis uses synthesis modulo oracles. In the LTI example, `isStable` checks eigenvalue stability, while `k0` and `k1` are synthesized; BMC unrolls ten steps and checks state bounds (Appendix A.3, pp. 19–20).

Verus form. Inference: an oracle corresponds to an `external_body` specification only when its contract is independently justified; placing `external_body` on the function under verification would destroy the evidence. For high-assurance VL, prefer a proved Rust lemma or a separately verified oracle and record the oracle as trusted otherwise.

## what is proved, trusted, and reusable
UCLID5 proves the selected logical model, not automatically the fidelity of a model to hardware or Rust code. The TAP case demonstrates direct integrity hyperproperty checking and comparable runtimes, while its UCLID5 model has more lines than Boogie because of stylistic differences (Sect. 4, p. 10). Inference: the main product threat is moderate-to-high for invariant generation and relational proofs: synthesis can reduce annotation work, but solver/oracle trust and model/code correspondence remain open. VL should reuse multi-instance relational proof patterns and candidate-invariant synthesis, while not redoing generic SMT plumbing already provided by UCLID5.

## techniques for the catalog
- multi-modal modeling: combine procedural code, transition systems, axioms, and temporal specifications
- inductive and bounded checking: choose induction, k-induction, or BMC for the property shape
- SyGuS invariant synthesis: synthesize a predicate that strengthens a failed induction proof
- hyperproperty self-composition: instantiate multiple traces and prove relational invariants
- oracle-backed reasoning: delegate hard predicates to external binaries through solver interfaces

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
