# An Efficient VCGen-based Modular Verification of Relational Properties
(authored by agents unless marked 🧑)
Tag: `blatter2024vcgen`, [paper](http://arxiv.org/abs/2401.08385v1)

## scope and result

The paper defines and mechanizes a verification-condition generator (VCGen) for relational properties involving several commands and procedure calls. Its contribution is modularity: a relational contract for called procedures can be assumed while proving a caller, and the soundness argument is proved in Coq. The language includes aliases and pointer-like dereference, so the method does not require a source-to-source product program.

The authors state: “This paper presents an overview of this approach and proposes important enhancements.” (Abstract, PDF p. 1). They also state: “Our results have been fully formalized and proved sound in the Coq proof assistant.” (Abstract, p. 1). Inference: this is a proved meta-theorem about the paper's small language and definitions, not evidence that a Verus implementation or an arbitrary Rust program is covered.

## technique 1: model a relational property directly

What it is. A normal Hoare triple relates one command's initial and final states. A relational Hoare triple instead relates a sequence of n commands, n initial states, and n final states with one relational precondition and postcondition. This can express monotonicity, non-interference, equivalence, or relations between dissimilar procedures.

When to use it. Use this representation when the desired claim inherently compares multiple executions. The introduction gives monotonicity as “x ≤ y ⇒ f (x) ≤ f (y)” and transitivity as “cmp(x, y) ≥ 0 ∧ cmp(y, z) ≥ 0 ⇒ cmp(x, z) ≥ 0” (p. 2). It identifies non-interference as equality of low-security outputs for executions whose low-security inputs agree (p. 2).

How to do it. First represent each execution with its own state σᵢ. Define a relational precondition P̂(σ₁,…,σₙ) and postcondition Q̂(σ₁,…,σₙ,σ′₁,…,σ′ₙ). Then require, for every terminating execution of every command cᵢ, that P̂ and all command transitions imply Q̂. Definition 3 gives this construction (p. 8). For the running example, R3 relates two runs of `csum`: x₂ starts equal, the first run starts one x₁ step ahead, and its accumulator starts x₁(second) larger; the resulting x₃ values must be equal (Fig. 5, p. 7).

Verus form. Inference: represent the two or more states as separate values in a `spec fn` or as arguments to a proof function. State the relational property with `requires` and `ensures`; use a `proof fn` to establish coupling facts and call verified single-run functions for each state. Verus's `spec fn`, `proof fn`, `requires`, and `ensures` are the constructs documented in the Verus notes. Verus does not automatically create a second execution: executable code must be called separately or modeled as a pure specification function. Rust ownership and aliasing rules also differ from the paper's abstract memory model.

Evidence and limits. The paper's formal evidence is the Coq definition and soundness theorem, not a benchmark. The example is a recursive summation command over natural-number memory locations. The language's operational semantics assumes termination when stating functional correctness; the introduction says termination “can be either assumed (partial correctness) or proved separately (full correctness)” (p. 2). Inference: termination and co-termination of related runs remain obligations for a production Verus development.

## technique 2: modular relational contracts for calls

What it is. A relational contract environment maps a sequence of procedure names to a relational pre/postcondition. `CVr` states that all procedures in each sequence satisfy that contract. Theorem 2 generalizes the ordinary recursion theorem: if arbitrary implementations satisfying the relational contracts also satisfy the bodies' relational triples, and the contracts are valid for the actual environment, then the target relational triple follows (Section 4, pp. 8–9).

When to use it. Use a relational contract when a caller needs a relation between several calls, such as two calls to the same implementation with related initial states. A single-call contract is insufficient to state that relation.

How to do it. (1) Define ordinary contracts for each procedure where needed. (2) Define the relational contract over the tuple of procedure names. (3) Prove the relational contract for arbitrary implementations that satisfy the contracts, as required by Theorem 2. (4) During caller verification, track which calls occurred and apply the relational postcondition only when the required tuple of calls is present.

The paper's concrete example uses `R2`, a partial ordinary contract for `csum`, and `R3`, a relational contract for two `ysum` calls. It then proves `R1` (the caller's equivalence property) from those contracts (Example 5, p. 14). The authors write: “The relational property R1 of Fig. 1 can now be proven valid in a modular way, using R2 and R3” (p. 14).

Verus form. Inference: encode each callable's ordinary contract with `requires`/`ensures`; encode the multi-call relation as a `proof fn` whose arguments are the pre/post states and whose `requires` expresses the call relation. A caller proof can invoke that lemma after proving the call states satisfy its precondition. Verus has no paper-specific `CVr` environment or automatic call-history predicate, so the call sequence and states must be represented explicitly in ghost/spec values or lemma arguments.

Evidence and limits. The soundness claim is Theorem 2 and its Coq proof in `Rela.v`. The method assumes contracts are valid for arbitrary implementations, and the call relation is guarded by actual operational call predicates. Inference: a Verus proof that simply assumes a relational lemma without connecting it to the concrete callee body would leave that lemma as trusted specification, so the callee's own proof and linking discipline are required.

## technique 3: optimized single-run VCGen

What it is. Section 5 splits generation into three functions. `Tc⊲` generates the main condition for the final postcondition; `Ta⊲` generates obligations from assertions, loop invariants, and call preconditions; `Tf⊲` verifies every procedure body against its contract. The optimization performs one call to the continuation at a conditional instead of separately splitting both branches, keeping formulas linear in program size (Section 5, p. 9).

How to do it. For each command, recursively produce a predicate relating pre-state σ and post-state σ′. Assignments constrain σ′ to `set(σ, i, value)`; sequences introduce a fresh intermediate state; conditionals conjoin guarded branch predicates; calls assume the callee pre/postcondition; loops require the invariant in initial and final states and a false final guard (Definition 5, Fig. 6, pp. 10–11). Separately generate `Ta⊲`: assert the assertion, establish and preserve loop invariants, and establish call preconditions (Definition 6, Fig. 7, p. 11). Finally, `Tf⊲` universally checks each procedure body under its precondition (Definition 7, p. 12).

The paper's exact optimization example is: “For c , if False then {skip} else {x1 := 2} we have:” followed by a single continuation formula (Example 4, p. 11). The soundness theorem requires `Tf⊲`, all `Ta⊲` obligations under P, and the `Tc⊲` postcondition formula; then it concludes the Hoare triple (Theorem 3, p. 12).

Verus form. Inference: `requires` supplies the procedure precondition, `ensures` the postcondition, and `invariant!` supplies loop invariants in executable loops. Verus itself generates verification conditions, so a user normally writes the contracts and invariants rather than implementing `Tc⊲`/`Ta⊲`. A proof-oriented reimplementation could mirror the continuation style with `spec fn`s, but this would be a new verified VCGen, not ordinary Verus source. Do not write `ensures` on a `spec fn`; use `ensures` on executable/proof functions as documented in the Verus notes.

Evidence and limits. Lemmas 1–3 prove that the optimized conditions imply the naive conditions, and Theorem 3 proves soundness. The formalization is in Coq files `Vcg Opt.v` and `Correct.v` (pp. 9–12). Inference: no runtime performance denominator or solver timing is reported in this paper; “linear” describes formula size, not end-to-end verification time.

## technique 4: lift the VCGen to several commands

What it is. `Tcr⊲` recursively applies `Tc⊲` to a sequence of commands and conjoins the resulting path predicates. `Tar⊲` conjoins each command's auxiliary obligations. This is the direct relational analogue of the single-command generator (Definitions 8–9, pp. 12–13).

How to do it. (1) For an empty sequence, return `True`. (2) For a nonempty sequence, generate the last command's condition and recursively generate the prefix, combining both with conjunction. (3) Feed a continuation of the form `λp. p ⇒ Q̂` to obtain the relational postcondition obligation. (4) Conjoin `Ta⊲` for every command at its own initial state. These are the paper's recursive steps (Definition 8 and the paragraph immediately after it, p. 13).

Verus form. Inference: use a separate state value per run and a lemma that combines each run's postcondition facts; for a fixed number of runs, explicit arguments are clearer than a runtime vector. A generic vector proof would require specifications about indexing and lengths and is not supplied by this paper.

## technique 5: track calls and guard relational contracts

What it is. A relational contract cannot be applied at one syntactic call site because its components may occur at different points. The paper defines `Pcall(y,σ,σ′,ψ)` to mean that a call can execute from σ to σ′, and `Ppred` as the conjunction that every call in the required tuple occurred. `Tpr` applies the relational contract only under this guard (Definitions 10–11, p. 13).

How to do it. Record each call's procedure name and pre/post states in the generated formula. Build the conjunction for the required tuple. Add an implication whose antecedent is that conjunction and whose consequent is the relational precondition implying relational postcondition. Then define `L` to turn a one-element relational contract plus a `Pcall` predicate into an ordinary contract, and use it in `Tf⊲r` when checking procedure bodies (Definitions 11–12, pp. 13–14).

The authors explain the purpose directly: “we have to somehow track in the generated formulas all the calls that have been made, and to guard the application of the relational contract by a constraint stating that all the appropriate calls have indeed taken place.” (p. 13).

Verus form. Inference: model a call record as a ghost/spec tuple containing the procedure identity and input/output states; prove a predicate that all required records exist before invoking the relational lemma. Verus has no dynamic predicate over arbitrary call traces built into the language, so this bookkeeping must be designed in the verified API. If calls are in separate branches or loops, the proof must establish that the records correspond to the intended executions.

Evidence and limits. Theorem 4 states soundness from three obligations: relational body contracts (`Tf⊲r`), auxiliary obligations (`Tar⊲`), and the main relational condition (`Tcr⊲`) under `Tpr` (p. 14). Example 5 instantiates these formulas for `R1`; the paper notes, “Long for a manual proof, such formulas are well-treated by solvers.” (p. 14). Inference: this is a qualitative solver observation, not a measured success rate.

## what is proved, trusted, and still missing

The paper proves soundness of its operational semantics, optimized VCGen, relational lifting, and recursive modular rule in Coq for language L. The conclusion says: “This method has been fully formalized in Coq, and the soundness of recursive relational verification using a verification condition generator (itself formally proved correct) for a simple language with procedure calls and aliasing has been formally established.” (Section 8, p. 16).

Trusted elements include Coq's kernel and the definitions of the language, contracts, and state model. Inference: the paper does not prove soundness of Rust, Verus, Z3, a compiler, or the correctness of a user's relational specification. Its language has natural-number memory and explicit dereference/address operations; Rust lifetimes, ownership, integer overflow behavior, and unsafe code are outside the stated model. The paper also leaves termination and co-termination extensions for future work: “Showing this in our framework is the next step, before the investigation of termination and co-termination” (Section 8, p. 16).

Threat to VL. Inference: medium threat to a product that generates Verus proofs. The core idea—explicit multi-run contracts, call-history guards, and modular relational lemmas—could expose specification gaps in generated proofs, especially for equivalence or information-flow claims. It does not itself automate Rust or Verus encoding, and its proof obligations still require user-supplied contracts and invariants. VL should reuse the modeling pattern and insist that generated relational lemmas are connected to independently verified callee contracts.

What VL should not redo. Inference: VL should not reproduce the paper's Coq soundness proof or invent a second VCGen for ordinary Verus programs unless it needs a certified relational front end. The paper already supplies the abstract decomposition and a mechanically checked theorem. A useful integration target is translating a VL relational requirement into explicit Verus state arguments and proof lemmas, then checking the resulting code with Verus.

## techniques for the catalog

- direct relational Hoare triples — specify pre/postconditions over several executions and their separate states
- modular relational contracts — assume and prove relations among tuples of procedure calls
- optimized continuation VCGen — generate linear-size main, auxiliary, and procedure obligations
- sequence lifting — recursively conjoin VC obligations for multiple commands
- guarded call predicates — apply a relational contract only after proving all required calls occurred
- Coq soundness proof — mechanize the VCGen and recursive relational theorem for a language with aliasing
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
