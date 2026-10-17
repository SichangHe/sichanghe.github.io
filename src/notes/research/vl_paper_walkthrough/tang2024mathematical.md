# Mathematical Formalized Problem Solving and Theorem Proving in Different Fields in Lean 4
(authored by agents unless marked 🧑)
Tag: `tang2024mathematical`, [paper](http://arxiv.org/abs/2409.05977v3)

## scope and contribution
This tutorial describes Lean 4 formalization, examples from olympiad algebra, geometry, number theory, and a Sylow-theorem outline, plus possible LLM assistance. It does not report a controlled benchmark: its Discussion (section 7, p. 21) says that “AI-driven proof, large amount of process is still led by me, which apparently is far away from automatic”. Its Limitations section (section 8, p. 22) says the number of samples “is considerably limited”. Page numbers in this note are PDF page numbers (the paper prints none). Inference: the abstract’s claim that AI tools have “significant potential to accelerate and enhance the formalization of mathematical proofs” is not backed by an experiment in the paper, since no example shows an LLM producing a proof. The useful formal-verification techniques are the proof-assistant workflow, tactic interaction, decomposition into lemmas, and explicit management of hidden mathematical assumptions.

## technique: incremental theorem construction
What it is. Start with imports and a theorem statement, then solve a small goal by rewriting and composing lemmas. The paper (Figure 2.1.1 caption, section 2.1, p. 3) says the proof of commutativity and associativity of multiplication “can be simplified to basic steps that include the import of the package of the specific field of math in Lean 4 and give out the example(theorem) to prove and the just use the basic tactic and lemmas to rewrite”.

How to do it (Inference: this numbered procedure is my assembly from sections 2.1 and 4, not a list in the paper). (1) import the relevant mathlib package; (2) declare variables and hypotheses; (3) state the theorem; (4) apply a tactic or lemma to reduce the goal; (5) inspect the remaining goal; (6) repeat until Lean accepts the proof. The paper recommends decomposition: “The basic method of proving mathematics in Lean 4 is to do it step by step, if the proof is too complicated, we can separate them into parts individually and combine them at the end” (section 2.1, p. 4).

Verus form. Inference: use a Rust `fn` with `requires` and `ensures`, prove helper `proof fn`s for each subclaim, and let the verifier check each postcondition before composing the caller proof. Verus syntax and libraries differ from Lean tactics, but the decomposition principle carries over.

## technique: compile-and-interactively check every proof state
Lean’s kernel and compiler reject ill-typed or incomplete terms. The paper states: “Lean 4 will attempt to automatically deduce and verify the proof. If one’s code is correct, Lean 4 will confirm the proof is complete without errors or warnings” (section 3.2, p. 8). It names the tactics `rw`, `apply`, and `exact` for decomposing problems and building proofs step by step, and the `check` or `#check` command to display the type of a theorem (section 3.2, pp. 8–9). Section 4.3 (p. 17) describes the info view showing the tactic state.

How to do it (Inference: assembled from sections 3.2 and 4.3, not a list in the paper). (1) write a candidate step; (2) compile; (3) read the info view’s tactic state; (4) correct type mismatches or missing hypotheses; (5) use `#check` to discover declarations; (6) repeat. The paper says “Any type mismatches or proof errors are detected during compilation” (section 3.2, p. 9).

Verus form. Inference: run `verus` after each lemma, use `assert` and `assert forall` to expose intermediate facts, and keep executable code separate from `proof fn`s. The verifier checks contracts and invariants rather than Lean tactic states.

## technique: explicit non-degeneracy hypotheses in geometry
Formal geometry exposes assumptions informal proofs omit. The paper reports that “the majority of the formal proof concerns establishing non-degeneracy conditions essential for the angle-chasing and concyclicity arguments” (section 4.2, p. 14). It lists conventions that make point distinctness (an angle ∠XYZ implies X and Z differ from Y; a line XY implies X ≠ Y) explicit hypotheses, and says oriented angles are modulo 2π (section 4.2, pp. 14–15). It also says a problem is assumed to occur in a plane, “obviating the need to prove coplanarity from other conditions”.

How to do it (Inference: assembled from section 4.2, not a list in the paper). (1) import the geometry library; (2) define points and configuration; (3) add distinctness and non-degeneracy hypotheses (the paper assumes the plane, so coplanarity is not proved); (4) translate unoriented angles into the library’s oriented-angle equalities; (5) prove local lemmas; (6) compose them to the target concyclicity or angle result. The paper notes that aspects of the angle chase valid only modulo π “are expressed as double-angle equalities” (section 4.2, pp. 14–15).

Verus form. Inference: represent points and predicates in spec types, place distinctness in `requires`, and carry geometric relations in loop-free proof lemmas. There is no direct Verus geometry library in the cited material, so the mathematical library remains a trusted dependency.

## technique: library-driven group-theory theorem interfaces
For Sylow theorems, the paper first defines subgroup structures and named generalized lemmas, then proves existence, conjugacy, and counting properties using finite-set and group-theory results (section 5, pp. 18–20). It says: “We first deal with the fundamental properties of finite sets in Lean 4” before turning to the three theorems (section 5, p. 20). The paper shows only “A small part of generalization of Sylow's first theorem” (Figure 5.1) and describes the remaining proofs in prose.

How to do it (Inference: assembled from section 5, not a list in the paper). (1) define `Sylow p G` and subgroup cardinality predicates; (2) establish finite-set cardinality lemmas; (3) state generalized first-, second-, and third-theorem lemmas; (4) specialize them to the group and prime; (5) compile each theorem and inspect edge cases. The paper lists `exists_subgroup_card_pow_prime` (spelled “exists_subgroup_card_pow_pime” in the paper), `IsPGroup.exists_le_sylow`, `Sylow.card_eq_multiplicity`, `sylow_conjugate`, and `card_sylow_modEq_one` as generalizations of the three theorems (section 5, p. 19).

Verus form. Inference: define spec datatypes for finite groups and subgroups, state contracts for cardinality and conjugacy lemmas, and prove each algebraic property as a `proof fn`. Arithmetic facts require explicit lemmas; Lean’s mathlib declarations cannot be imported directly.

## trusted surface, evidence, and limits
Lean’s kernel, imported mathlib declarations, axioms, and any admitted proof are trusted. The paper explicitly describes `sorry`: “The ‘sorry’ theorem introduces a proposition type ... and the proof is concluded with ':= by sorry'” (section 4.3, p. 18). The paper calls using “sorry” “a conventional practice” and then says “And hence finishes the proof”.

## techniques for the catalog
- incremental formalization — import a domain library, state a theorem, apply lemmas step by step, and compose subproofs
- compile-state feedback — compile continuously and use tactic-state/type inspection to correct proof obligations
- explicit non-degeneracy — turn informal geometric assumptions into formal hypotheses and library-compatible relations
- library-driven theorem interfaces — define generalized algebraic lemmas and specialize them to concrete finite structures
