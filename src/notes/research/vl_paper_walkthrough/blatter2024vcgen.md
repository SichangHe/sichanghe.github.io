# An Efficient VCGen-based Modular Verification of Relational Properties
(authored by agents unless marked 🧑)
Tag: `blatter2024vcgen`, [paper](https://arxiv.org/abs/2401.08385v1)

## scope and result

The paper defines and mechanizes a verification-condition generator (VCGen) for relational properties involving several commands and procedure calls. Its contribution is modularity: a relational contract for called procedures can be assumed while proving a caller, and the soundness argument is proved in Coq. The language includes aliases and pointer-like dereference, so the method does not require a source-to-source product program.

The authors state: “This paper presents an overview of this approach and proposes important enhancements.” (Abstract, PDF p. 1). They also state: “Our results have been fully formalized and proved sound in the Coq proof assistant.” (Abstract, p. 1). Inference: this is a proved meta-theorem about the paper's small language and definitions, not evidence that a Verus implementation or an arbitrary Rust program is covered.

## technique 1: model a relational property directly

What it is. A normal Hoare triple relates one command's initial and final states. A relational Hoare triple instead relates a sequence of n commands, n initial states, and n final states with one relational precondition and postcondition. This can express monotonicity, non-interference, equivalence, or relations between dissimilar procedures.

When to use it. Use this representation when the desired claim inherently compares multiple executions. The introduction gives monotonicity as “x ≤ y ⇒ f (x) ≤ f (y)” and transitivity as “cmp(x, y) ≥ 0 ∧ cmp(y, z) ≥ 0 ⇒ cmp(x, z) ≥ 0” (p. 2). It identifies non-interference as equality of low-security outputs for executions whose low-security inputs agree (p. 2).

How to do it. First represent each execution with its own state σᵢ. Define a relational precondition P̂(σ₁,…,σₙ) and postcondition Q̂(σ₁,…,σₙ,σ′₁,…,σ′ₙ). Then require, for every terminating execution of every command cᵢ, that P̂ and all command transitions imply Q̂. Definition 3 gives this construction (p. 8). For the running example, R3 relates two runs of `csum`: the second run starts with x₁ < x₂, x₂ starts equal, the first run starts one x₁ step ahead, and its accumulator starts x₁(second) larger; the resulting x₃ values must be equal (Fig. 5, p. 7).

Verus adaptation. Inference: an implementation could represent each run with a separate state value and prove a lemma relating the input and output states. This is a proposed translation of Definition 3, not a Verus encoding supplied or checked by the paper.

Evidence and limits. The paper's formal evidence is the Coq definition and soundness theorem, not a benchmark. The example is a recursive summation command over natural-number memory locations. The correctness definition is conditional on termination; it does not assume every execution terminates (Definition 1, p. 6). Footnote 6 says: “Termination can be either assumed (partial correctness) or proved separately (full correctness) in a classical way [16]; for the purpose of this paper we can assume it.” (p. 1). Inference: an application requiring termination needs an additional argument.

## technique 2: modular relational contracts for calls

What it is. A relational contract environment maps a sequence of procedure names to a relational pre/postcondition. `CVr` states that all procedures in each sequence satisfy that contract. Theorem 2 presents a relational recursion rule with two implication premises: one about the fixed procedure bodies evaluated under arbitrary procedure implementations ψ′, and one about the target triple. It concludes the target triple (Section 4, pp. 8–9). As printed, its first premise uses `CVr(ψ, φ̂)`, although it quantifies over ψ′; Theorem 1 instead uses `CV(ψ′, φ)` in the corresponding premise (p. 7). Inference: this appears to be a notation error; the intended analogy is a body proof under contracts for the arbitrary implementations. The Coq statement was not checked.

When to use it. Use a relational contract when a caller needs a relation between several calls, such as two calls to the same implementation with related initial states. The relational contract states the relation directly; sufficiently detailed single-call contracts could also imply it.

How to do it. Inference: following the recursion pattern of Theorem 1 and its stated relational extension, (1) define ordinary contracts for each procedure where needed. (2) Define the relational contract over the tuple of procedure names. (3) Prove the fixed bodies satisfy the relational contract while their nested calls use arbitrary implementations satisfying the contracts, as required by the recursion rule. (4) During caller verification, track which calls occurred and apply the relational postcondition only when the required tuple of calls is present.

The paper's concrete example uses `R2`, a partial ordinary contract for `csum`, and `R3`, a relational contract for two `ysum` calls. It then proves `R1` (the caller's equivalence property) from those contracts (Example 5, p. 14). The authors write: “The relational property R1 of Fig. 1 can now be proven valid in a modular way, using R2 and R3, by the proposed technique based on Theorem 4 (see file Examples.v of the Coq development).” (Example 5, p. 14).

Verus adaptation. Inference: expose the multi-call relation as a proved lemma over pre/post states and invoke it when verifying a caller. The lemma must establish the relation for the concrete procedure bodies. The paper does not supply this adaptation.

Evidence and limits. The soundness claim is Theorem 2 and its Coq proof in `Rela.v`. The printed body premise quantifies over implementations; the environment mismatch noted above limits a literal reading of its hypothesis. Section 6 separately introduces operational call predicates to restrict applications of relational contracts. Inference: a Verus proof that simply assumes a relational lemma without connecting it to the concrete callee body would leave that lemma as trusted specification, so the callee's own proof and linking discipline are required.

## technique 3: optimized single-run VCGen

What it is. Section 5 splits generation into three functions. `Tc⊲` generates the main condition for the final postcondition; `Ta⊲` generates obligations from assertions, loop invariants, and call preconditions; `Tf⊲` verifies every procedure body against its contract. The optimization performs one call to the continuation at a conditional instead of separately splitting both branches, keeping formulas linear in program size (Section 5, p. 9).

How to do it. For each command, recursively produce a predicate relating pre-state σ and post-state σ′. Assignments constrain σ′ to `set(σ, i, value)`; sequences introduce a fresh intermediate state; conditionals conjoin guarded branch predicates; calls assume the callee pre/postcondition; loops require the invariant in initial and final states and a false final guard (Definition 5, Fig. 6, p. 10). Separately generate `Ta⊲`: assert the assertion, establish and preserve loop invariants, and establish call preconditions (Definition 6, Fig. 7, p. 11). Finally, `Tf⊲` universally checks each procedure body under its precondition (Definition 7, p. 11).

Example 4 uses `if False then {skip} else {x₁ := 2}` and a continuation proving that the final x₁ equals 2 (p. 10). The authors explain: “Note that, contrary to the naive VCGen, we perform a single call to f , ensuring the linearity of the formula.” (p. 10). The soundness theorem requires `Tf⊲`, all `Ta⊲` obligations under P, and the `Tc⊲` postcondition formula; then it concludes the Hoare triple (Theorem 3, p. 12).

Verus adaptation. Inference: the reusable idea is the separation of postcondition reasoning, annotation obligations, and procedure-body obligations. Implementing this VCGen in another language would require a new correctness argument connecting it to that language's semantics; the paper proves the result for L.

Evidence and limits. Lemmas 1–3 prove that the optimized conditions imply the naive conditions, and Theorem 3 proves soundness. The formalization is in Coq files `Vcg Opt.v` and `Correct.v` (pp. 9–12). The paper reports no solver timings or runtime benchmark. The size claim is explicit: “Such optimizations allow the VCGen to return formulas whose size is linear with respect to the size of the program itself, and are now part of any state-of-the-art deductive verification tool.” (Section 5, p. 9). Inference: this does not establish linear verification time.

## technique 4: lift the VCGen to several commands

What it is. `Tcr⊲` recursively applies `Tc⊲` to a sequence of commands and conjoins the resulting transition constraints. `Tar⊲` conjoins each command's auxiliary obligations. This is the direct relational analogue of the single-command generator (Definitions 8–9, pp. 12–13).

How to do it. (1) For an empty sequence, return `f(True)`, applying the supplied continuation to `True`. (2) For a nonempty sequence, generate the last command's condition and recursively generate the prefix, combining both with conjunction. (3) Feed a continuation of the form `λp. p ⇒ Q̂` to obtain the relational postcondition obligation. (4) Conjoin `Ta⊲` for every command at its own initial state. These are the paper's recursive steps (Definition 8, p. 12, and Definition 9, p. 13).

Verus adaptation. Inference: for a fixed number of executions, a lemma could combine each run's transition facts into the desired relational postcondition. A generic sequence implementation would additionally need a specification of its indexing and lengths.

## technique 5: track calls and guard relational contracts

What it is. A relational contract cannot be applied at one syntactic call site because its components may occur at different points. The paper defines `Pcall(y,σ,σ′,ψ)` to mean that a call can execute from σ to σ′, and `Ppred` as the conjunction of these operational call judgments for the required tuple. `Tpr` applies the relational contract only under this guard (Definitions 10–11, p. 13).

How to do it. Record each call's procedure name and pre/post states in the generated formula. Build the conjunction for the required tuple. Add an implication whose antecedent is that conjunction and whose consequent is the relational precondition implying relational postcondition. Then define `L` to turn a one-element relational contract plus a `Pcall` predicate into an ordinary contract, and use it in `Tf⊲r` when checking procedure bodies (Definitions 11–12, pp. 13–14).

The authors explain the purpose directly: “we have to somehow track in the generated formulas all the calls that have been made, and to guard the application of the relational contract by a constraint stating that all the appropriate calls have indeed taken place.” (p. 13).

Verus adaptation. Inference: model each call using its procedure identity and pre/post states, with evidence of the concrete call relation. A tuple of recorded values alone would not establish the operational predicate required by Definition 10. The correspondence between these values and executions would need its own proof.

Evidence and limits. Theorem 4 states soundness from three obligations: relational body contracts (`Tf⊲r`), auxiliary obligations (`Tar⊲`), and the main relational condition (`Tcr⊲`) under `Tpr` (p. 14). Example 5 instantiates these formulas for `R1`; the paper notes, “Long for a manual proof, such formulas are well-treated by solvers.” (p. 14). Inference: this is a qualitative solver observation, not a measured success rate. Theorem 4 also prints `Tpr(φ̂, ψ)` with `L(φ̂, ψ′)` in (4)–(5), whereas Definition 12 uses ψ′ in both. Inference: this environment mismatch needs checking against the Coq development before implementing the formulas literally.

## what is proved, trusted, and still missing

The paper defines the operational semantics of L and proves soundness of its optimized VCGen and modular relational verification method in Coq. The authors report a Coq development of “about 3700 lines” and link its repository in footnote 7 (Section 1, p. 3). The conclusion says: “This method has been fully formalized in Coq, and the soundness of recursive relational verification using a verification condition generator (itself formally proved correct) for a simple language with procedure calls and aliasing has been formally established.” (Section 8, p. 16).

Inference: the result depends on the Coq proof checker and the chosen language, contract, and state definitions; the paper does not provide a separate trusted-component audit. Inference: the paper does not prove soundness of Rust, Verus, Z3, a compiler, or the correctness of a user's relational specification. Its language has natural-number memory and explicit dereference/address operations; Rust lifetimes, ownership, integer overflow behavior, and unsafe code are outside the stated model. The authors also leave coupling invariants, loop properties, and termination extensions for future work: “We expect that user-provided coupling invariants and loop properties can avoid having to rely on code transformation methods. Showing this in our framework is the next step, before the investigation of termination and co-termination [17],[34] for extending the modularity of relational contracts.” (Section 8, p. 16).

## techniques for the catalog

- direct relational Hoare triples — specify pre/postconditions over several executions and their separate states
- modular relational contracts — assume and prove relations among tuples of procedure calls
- optimized continuation VCGen — generate linear-size main, auxiliary, and procedure obligations
- sequence lifting — recursively conjoin VC obligations for multiple commands
- guarded call predicates — apply a relational contract only after proving all required calls occurred
- Coq soundness proof — mechanize the VCGen and recursive relational theorem for a language with aliasing
