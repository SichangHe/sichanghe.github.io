# Tridirectional Discriminating-Power Formal Verification of Smart Contract Reentrancy Defense Against Production-Deployed Solidity Source
(authored by agents unless marked 🧑)
Tag: `iskander2026tridirectional`, [paper](https://arxiv.org/abs/2606.01794)

## claim, scope, and evidence

The paper formalizes the OpenZeppelin reentrancy-guard pattern against state-machine models of three deployed Solidity protocols plus a constructed mutant. It uses Lean 4 and mathlib4, with thirteen machine-checked theorems: six for a DAO 2016 negative instance, three for Compound v2 cTokens, three for an Aave V3 `flashLoan` boundary pair, and one capstone theorem. The abstract states, “All thirteen theorems are machine-checked in Lean 4 with zero sorry, zero user-introduced axioms” (abstract, p. 1). The reported axiom footprint is kernel-only or `[propext]`-only; four CI blocks re-run theorem and axiom checks on each push.

The result is a three-direction test. The negative direction derives an attacker-controlled DAO re-entry trace that breaks the balance-sum invariant. The positive direction proves the Compound withdrawal path satisfies the guard predicate. The boundary direction proves production Aave `flashLoan` satisfies the predicate and a one-structural-difference `flashLoanVulnerable` mutant fails it. The capstone is direct conjunction of sealed prior theorems. The authors explicitly limit portability: both live protocols are lending-family systems, so the cross-protocol claim is within lending-family diversity plus a DAO historical exemplar; broader domains are future work (Sections 1.3, 9.4, pp. 2, 14).

The formal corpus is approximately 8,538 Lean lines: about 656 for DAO, 517 for Compound, 770 for Aave, 260 for the capstone, and 6,335 supporting infrastructure (Section 6.2, p. 12). Reproduction checks out a tagged commit, runs `lake build` (reported 901 jobs), and runs a Lean file that prints axioms; CI fails on type-check, supporting-lemma, or axiom-record drift (Sections 4.4, 6.3–6.4, pp. 8, 12). These are evidence about this repository and model, not a statistical estimate of all Solidity.

Trust remains in the Solidity-to-state-machine abstraction, Lean compiler/kernel and pinned mathlib, source-faithfulness assumptions, and honest protocol-internal accounting. The paper says the “faithfulness of that model to Solidity semantics is a trust assumption” (Section 1.3, p. 2). Oracle manipulation, MEV/order dependence, governance, bridges, front-running, centralization, and non-reentrancy economic attacks are out of scope (Section 3.4, p. 7). Inference: this is substantially stronger than an LLM review, but a proof of an abstraction can still miss compiler, EVM, upgrade, or economic behavior omitted from the abstraction.

## technique 1: explicit predicates over a source-level state machine

What it is and when to use it. Define the security property and its model before proving protocol cases. The reentrancy predicate requires a call trace in which an external call from function `f` transfers to an attacker-controlled callee that re-enters function `g` before `f` finishes a storage update. The guard-correctness predicate requires `_status == _NOT_ENTERED` at entry, `_status = _ENTERED` before any external call, reset at exit, and one shared storage slot across guarded functions (Section 5.1, p. 10). The discriminating-power predicate is the conjunction of deriving the attack for vulnerable code, deriving guard correctness for protected code, and distinguishing a structurally adjacent vulnerable variant.

How to do it. (1) Choose the source-level state: storage, call stack, external-call boundary, and trace transitions. (2) Define predicates for reentrancy and guard behavior. (3) State the discriminating meta-property over protocol instances. (4) Prove protocol-specific lemmas against these definitions. (5) Keep the model's omitted semantics as explicit assumptions.

Verus form. Inference: represent the state machine as a Rust model with `struct` state and `spec fn` predicates over immutable snapshots. Use `requires` to state valid states and `ensures` to state that a transition preserves the guard invariant or cannot produce a forbidden trace. Use `proof fn` lemmas to show that “the storage slot tracking guard state is consistently set before any external call and reset after” (Section 5.4, p. 10). Verus can check the model and implementation contracts, but Solidity/EVM equivalence remains an external contract unless separately modeled and proved.

Evidence and limits. The paper's predicate is call-stack, mutation, and external-boundary aware, unlike a syntactic pattern checker (Section 5.1, p. 10). Inference: explicit predicates prevent a proof from silently changing the meaning of “reentrancy,” but they do not ensure the predicate covers read-only or cross-chain variants that the paper excludes.

## technique 2: negative-instance attack derivation

What it is and when to use it. Prove that the method can find the vulnerability it is intended to prevent. For DAO 2016, `splitDAO` transfers ETH to a user-controlled recipient before decrementing that user's recorded balance. A callback can re-enter while the balance is still undecremented. The target theorem states that a constructible trace succeeds and breaks the invariant “balance-sum equals total-deposits” (Section 5.3, p. 10).

How to do it. (1) Model the relevant storage layout and balance accounting. (2) Model the external transfer and attacker callback. (3) Prove call-stack interleaving allows re-entry before the decrement. (4) Prove storage observation sees the old balance. (5) Prove balance-update sequencing and the absence of guard protection. (6) Compose the five supporting lemmas into the target attack theorem (Appendix A.1, p. 15).

Verus form. Inference: encode `splitDAO` as a transition function and represent a trace as a sequence/list of states. A `proof fn` can establish that a callback transition is enabled while the balance decrement is pending, then `ensures` that the balance-sum invariant is false in the resulting state. A ghost trace is proof-only; executable code must not depend on it. The Verus study corpus supports sequences and invariants, but this exact Solidity model is an inference.

Evidence and limits. Six Layer 6-A theorems cover the target and supporting lemmas. DAO is a historical guard-absent exemplar, not evidence that an OpenZeppelin guard failed; the paper says its role is to demonstrate recognition of the vulnerability class (Section 5.3, p. 10). Inference: negative tests are necessary to show sensitivity, but one attack trace does not enumerate all reentrancy traces.

## technique 3: positive guard-invariant proof across functions

What it is and when to use it. Prove the defended contract's invariant, including cross-function use of the same mutex slot. Compound v2's `redeem`, `redeemUnderlying`, and transfer paths use a custom realization with the same `_status` semantics as OpenZeppelin. The target theorem says every conforming withdrawal trace satisfies guard correctness, so no reentrancy trace is constructible (Section 5.4, p. 10).

How to do it. (1) Model entry and exit of each guarded function. (2) Prove a guard-invariant lemma: status is set before an external call and reset after. (3) Prove a cross-function safety lemma: functions sharing the slot cannot be entered reentrantly while one is active. (4) Compose these lemmas in a thin target theorem without changing their hypotheses or conclusions (Appendix A.1, p. 15). Check the actual deployed source shape, including a custom in-contract mutex rather than assuming a library import.

Verus form. Inference: define a ghost state-machine invariant over `_status` and a permission/borrow condition tying all guarded methods to one state object. Each method has `requires status == NOT_ENTERED` and `ensures status == NOT_ENTERED` on return; a callback transition is permitted only after the status write. Use `assert` and `proof fn` lemmas to connect method-specific updates to the shared invariant. Rust ownership can help enforce exclusive mutable access, but external callbacks and foreign contracts need modeled interfaces.

Evidence and limits. Three Layer 6-B theorems are checked with kernel-only or `[propext]` records (Table in Section 5.2, p. 10). The model assumes protocol-internal accounting executes as written and does not claim all attacker-controlled protocol code (Section 9.3, p. 14). Inference: cross-function proof is stronger than checking each modifier syntactically, but the guarantee is only as complete as the modeled interface and callback semantics.

## technique 4: minimal-diff mutation boundary testing

What it is and when to use it. Construct a vulnerable near-miss that differs from production code in exactly one security-critical structural choice. Aave V3 production `flashLoan` is paired with `flashLoanVulnerable`, whose callback boundary fails to engage the guard correctly; signature, interface, control flow, and API are held identical (Section 5.5, p. 11). The method is mutation testing for formal proofs: it checks that the specification distinguishes adjacent safe and unsafe implementations.

How to do it. (1) Formalize the production function and prove its guard/CEI property. (2) Copy it into a mutant. (3) Change only the guard engagement at the callback boundary. (4) Prove a CEI-preservation lemma for the production version. (5) Construct a reentrant trace for the mutant under the same predicate. (6) Check that the safe theorem and mutant-failure theorem both hold, rather than weakening the predicate for either case.

Verus form. Inference: keep the safe and mutant Rust functions under identical signatures and shared `requires`; give the safe function an `ensures` guard invariant and the mutant a proof obligation that should fail. The failing mutant is a test artifact, not a function annotated with `external_body`; Verus must verify the real safe implementation. A proof function can construct a counterexample trace for the mutant in a separate module.

Evidence and limits. Layer 6-C has three theorems: safe correctness, mutant failure, and a CEI supporting lemma (Sections 5.2, 5.5, pp. 10–11). The mutant corpus is intentionally N=1; naturally occurring near-misses and read-only reentrancy are future work (Section 9.2, p. 14). Inference: mutation catches vacuous specifications, but one hand-crafted mutation cannot characterize all specification blind spots.

## technique 5: no-retrofit composition and axiom auditing

What it is and when to use it. Seal component proofs before writing the cross-protocol theorem, then compose them as black-box facts. The discipline forbids changing hypotheses, weakening conclusions, or adding unstated assumptions to make composition succeed. The paper states, “The capstone proof either composes the underlying theorems exactly as they were sealed, or it does not compose at all” (Section 4.2, p. 8).

How to do it. (1) Author and prove DAO, Compound, and Aave files. (2) Seal each file and prohibit edits. (3) Write a wrapper importing only the sealed theorem statements. (4) Prove the capstone by direct conjunction. (5) Run `#print axioms` transitively for every theorem. (6) Record expected kernel-only or `[propext]` dependencies. (7) Run four CI blocks on every push and fail on type-check, regression, or axiom drift (Sections 4.2–4.4, pp. 8–9).

Verus form. Inference: place component proofs behind stable `proof fn` contracts and prohibit changing their `requires`/`ensures` while writing an integration lemma. The capstone calls those proof functions and asserts the conjunction of their postconditions. Verus does not have Lean's `#print axioms`; approximate the discipline with pinned toolchains, explicit trusted modules, and CI checks that reject newly introduced `external_body` or changed contracts. Do not treat a proof function as runtime code.

Evidence and limits. The capstone has one theorem and approximately 260 lines, and its proof term is exactly the triple of prior theorem facts (Sections 5.6, 6.2, p. 12). The observed cross-protocol stress test is N=1 and both live protocols are lending-family systems; the authors call broader portability conjectural (Section 4.4, p. 8). Inference: no-retrofit makes composition evidence more credible, but it cannot turn one successful composition into a universal theorem.

## what has already been done and threat to VL

This paper already demonstrates production-source state-machine modeling, three-direction negative/positive/boundary verification, minimal-diff mutation, no-retrofit composition, axiom-record CI, and tagged-commit reproduction. VL should not present these patterns as new. Inference: a Verus/Rust contribution would need measurements and artifacts specific to ownership, unsafe boundaries, concurrency, compiler/library assumptions, and proof repair.

Threat is limited but concrete. The work shows that a carefully scoped formal model can prove a security pattern over real protocol variants and can detect a one-line-style regression. It does not verify arbitrary Rust, EVM bytecode, protocol upgrades, economic attacks, or the correspondence between a deployed artifact and its source-level model. Inference: agent-written verified Rust remains threatened by specification drift and abstraction mismatch; a passing Verus proof is meaningful only when its contracts describe the intended product behavior and trusted dependencies are audited.

## techniques for the catalog

- explicit source-level security predicates — define call-stack, storage-update, callback, and guard semantics before protocol proofs
- negative-instance derivation — prove an attacker trace and invariant break for a known vulnerable deployment
- positive cross-function invariant proof — show a shared mutex is set before external calls and reset after across all guarded paths
- minimal-diff mutation boundary — distinguish a production-safe function from a structurally adjacent mutant under one predicate
- no-retrofit theorem composition — seal component proofs before direct-conjunction capstone composition
- axiom-record CI gating — recheck theorem types, dependencies, and expected axiom footprints on every push
Checked 2026-10-15 against paper iskander2026tridirectional: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
