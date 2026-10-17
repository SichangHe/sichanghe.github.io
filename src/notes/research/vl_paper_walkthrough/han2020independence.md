# A Formal Proof of the Independence of the Continuum Hypothesis
(authored by agents unless marked 🧑)
Tag: `han2020independence`, [paper](https://doi.org/10.1145/3372885.3373826)

## scope and result
Han and van Doorn formalize the independence of the continuum hypothesis (CH) in Lean 3 (the paper is a CPP '20 paper; page numbers below are PDF pages 1-14 of the arXiv version). The paper's proof builds Boolean-valued models of ZFC with opposite truth values for CH: Cohen forcing gives a model where CH is false, while a sigma-closed forcing (collapse forcing) gives a model where CH is true. The paper says, “We describe a formal proof of the independence of the continuum hypothesis (CH) in the Lean theorem prover.” (abstract, p. 1) It also says, “Our formalization uses the Lean 3 theorem prover, building on top of mathlib [29].” (section 1, p. 1)

The paper splits the work into separately formalized parts: a deep embedding of first-order logic with a proof system, a general theory of Boolean-valued semantics, a library for complete Boolean algebras, a construction of Boolean-valued models of set theory, and the forcing-specific combinatorics (Cohen and collapse). The authors state, “The theory of forcing with Boolean-valued models also cleanly splits into several parts, allowing us to formalize different components in parallel” (section 1, p. 2), and “our library for Boolean-valued semantics for first-order logic is completely general and can be reused for other formalization projects” (section 1, p. 2).

## technique: typed deep embedding of first-order logic
what it is
The language is a pair of N-indexed families of function and relation symbols, stratified by arity. Terms and formulas are parameterized inductive types (`preterm`, `preformula`) whose N parameter is the difference between the arity and the number of applications, so type-correctness is equivalent to well-formedness and no separate well-formedness proofs are needed. De Bruijn indices represent variables. The proof system is a natural deduction calculus (`prf`), and ZFC and CH are written as formulas of an embedded language. The paper notes the current formalization "does not use the data of proof trees in an essential way"; they were defined for future manipulations such as detour elimination.

when to use it
Inference: use this pattern when a verifier must reason about a logic object inside another type theory, especially when the syntax needs a soundness theorem that is reused across many models.

how to do it
1. Define a language as families of function and relation symbols indexed by arity (section 2, p. 3).
2. Define preterms and preformulas as parameterized inductive types; represent variables with de Bruijn indices, with lifting and substitution operations (section 2.1, p. 3).
3. Define a natural deduction proof system `prf` (section 2.1, p. 3) and Boolean-valued structures with a realization of terms and formulas by structural recursion (section 3, p. 4).
4. Encode the ZFC axioms (Figure 1, p. 5) and CH (`CH_formula`, section 2.2, p. 4) as formulas in the embedded language; the language is conservatively extended with function symbols for the empty set, ordered pairing, omega, power set and union (section 2.2, p. 4).
5. Prove Boolean-valued soundness once, `boolean_soundness : Γ ⊢ φ → Γ |=[B] φ`, whose proof the paper calls “a straightforward structural induction” (section 3, p. 4), then reuse it for every Boolean-valued model.

Verus form
Inference: In Verus, executable Rust could hold a typed syntax enum and specifications could define an interpretation relation. Use `spec fn` for pure interpretation functions, `requires`/`ensures` on proof-facing functions, and `proof fn` lemmas for type preservation and soundness. Verus likely lacks Lean's dependent inductive families, so the arity/type-index discipline would have to be encoded with Rust enums and ghost values, leaving more well-formedness obligations explicit. This is an inference because the paper uses Lean, not Verus.

evidence and limits
The paper reports a complete formalization of the independence theorem. It does not state a benchmark or a line count for the logic library. It lists as future work, “We also want to formalize the conservativity of ZFC over the usual presentation in the language {∈}” (section 7, p. 13), so the extension of ZFC by definable function symbols is not itself proved conservative in the formalization. The authors note that formulas with de Bruijn indices are “difficult to write and debug by hand” (section 7, p. 13), so syntax ergonomics remain a limitation.

## technique: Boolean-valued set models by inductive Aczel encoding
what it is
For a complete Boolean algebra B, define an inductive type `bSet B` whose nodes contain an index type, a function to child sets, and a Boolean truth value for each child. Boolean-valued equality and membership are defined by recursion over this type. The construction generalizes the Aczel encoding `pSet` and is motivated by forcing names: a P-name is a set of P-names paired with elements of P, and bSet B is “the type of B-names”. Because the type is inductive, the automatically generated induction principle is ∈-induction (section 1, p. 2).

when to use it
Inference: use an inductive cumulative-set encoding when the target mathematics is set-theoretic and the prover's native induction is easier than transfinite recursion.

how to do it
1. Define `pSet` as an inductive type with constructor `mk (α : Type u) (A : α → pSet)` (section 4.1, p. 4).
2. Quotient by extensional equivalence to obtain a model of extensionality (section 4.1, p. 4).
3. Add a function `B : α → B` to each node, attaching a Boolean truth value to every element, and define `bSet B` (section 4.2, p. 5).
4. Define Boolean-valued equality `bv_eq` by recursion as an infimum over children of implications into suprema of (truth value ⊓ recursive equality), in both directions, and membership as a supremum of (child truth value ⊓ equality with the child) (section 4.2, p. 5). The paper chooses this non-mutual definition because its induction principle “is easier to work with”.
5. Prove the fundamental theorem of forcing, `⊤ ⊩[V B] ZFC`: for any complete Boolean algebra B, bSet B models ZFC (section 4.3, pp. 5-6). Powerset is built from B-valued indicator functions (Definition 4.2); Zorn's lemma needs mixtures and the maximum principle, which the paper calls the hardest part of this verification (section 4.3, p. 6).

Verus form
Inference: Represent sets with an inductive Rust datatype in ghost/spec code. A `spec fn` computes Boolean-valued equality; recursive lemmas are `proof fn`s with `ensures` stating extensionality and membership laws. The executable subset likely cannot use this noncomputable model, so it would stay ghost state.

evidence and limits
The paper's conclusion says, “Interestingly, we never used transfinite recursion for developing elementary set theory in pSet and bSet B.” (section 7, p. 12) The scope is limited to elementary set theory: the paper uses transfinite recursion elsewhere, for example `ordinal.mk` (section 4.4, p. 6) and the Δ-system lemma (section 5.2, p. 8). This is evidence for the induction design, not a performance result. The construction uses Lean's quotient types, and the verification of Zorn's lemma uses a choice principle from the metatheory (section 4.3, p. 6). Inference: porting to Verus would need a new ghost encoding and many lemmas.

## technique: forcing through complete Boolean algebras
what it is
Forcing is reduced to choosing a complete Boolean algebra B and proving combinatorial properties of B. The paper states, “an easy consequence of Boolean-valued soundness is that a formula is unprovable if its negation has a model” (section 5.6, p. 11). The Lean lemma `unprovable_of_model_neg` takes a Boolean-valued structure S with `⊤ ⊩[S] C`, a nonzero Γ, and `Γ ⊩[S] ∼f`, and concludes `¬ (C ⊢′ f)`.

when to use it
Inference: use this when a relative-consistency or independence argument can be stated as a model construction plus a generic soundness theorem.

how to do it
1. Choose a complete Boolean algebra B that encodes the construction of a needed function; for ¬CH an injection from aleph-2 into the power set of omega, for CH a surjection from aleph-1 onto it (section 5, p. 7).
2. Instantiate `bSet B` and prove it models ZFC (section 4.3, pp. 5-6).
3. Use check-names, the canonical map `check : pSet → bSet B` (section 4.4, pp. 6-7), to embed ground sets into the Boolean-valued universe. Δ0 properties are preserved by check-names, but other properties may not be.
4. For ¬CH, take the Cohen poset of finite partial functions from aleph-2 × N to 2 (represented as `ins`/`out` finsets), embed it as a dense suborder of B_cohen = RO(2^(aleph-2 × N)), prove B_cohen has the countable chain condition (CCC) using the Δ-system lemma and Theorem 5.1, and use CCC to show omega ≺ aleph-1 ≺ aleph-2 in bSet B_cohen (section 5.2, pp. 7-9).
5. For CH, take B_collapse = RO of the function space P(omega)^(aleph-1) with the topology generated by countable partial functions, prove it sigma-closed (Lemma 5.4), construct the internal aleph-1 as a Hartogs number of omega (section 5.4, p. 10), and prove reflection of countable functions (Lemma 5.6) so that the check of P(omega) equals P(omega) and the check of aleph-1 equals aleph-1 in bSet (Lemma 5.5), giving CH truth value top (sections 5.3-5.5, pp. 9-11).
6. Apply `unprovable_of_model_neg` to `V_B_cohen_models_neg_CH` and `V_B_collapse_models_CH` to obtain `CH_unprv` and `neg_CH_unprv`, then combine them into `independence_of_CH : independent ZFC CH_f` (section 5.6, p. 11).

Verus form
Inference: Encode each algebra and model property as ghost structs and `spec fn`s. Use `proof fn` lemmas for closure, chain-condition, and soundness. `requires` would state algebra laws and `ensures` would state preservation or truth-value bounds. Verus could check such contracts but would not supply Lean's quotient and choice libraries.

evidence and limits
The paper's final results are the theorems `CH_unprv`, `neg_CH_unprv` and `independence_of_CH` (section 5.6, p. 11). It gives one size figure: “our library on set theory in bSet B totalled 2723 LOC when we forced ¬CH, and grew to 7020 LOC after forcing CH” (section 5.3, p. 9), and it says the CH direction “is harder to formalize” than the ¬CH direction (section 1, p. 2). It reports no timings. The paper says the Δ-system lemma proofs are omitted from the paper for being too technical (section 5.2, p. 8).

## technique: metaprogrammed proof automation
what it is
Custom Lean tactics replay natural-deduction reasoning in complete Boolean algebras and automate equality reasoning. `tidy_context` applies `poset_yoneda` and the simplifier, splitting hypotheses `Γ ≤ a1 ⊓ ... ⊓ an` into separate hypotheses; `bv_tauto` is a Boolean-valued tableaux prover; `bv_cc` calls congruence closure after quotienting by the setoid induced by Boolean-valued equality.

when to use it
Inference: use tactic automation when repeated proof obligations differ only by Boolean algebra bookkeeping or congruence reasoning.

how to do it
1. Treat an inequality as a proof state, reading `≤` as a turnstile (section 6.1, p. 11).
2. Use `poset_yoneda` to reduce `a ≤ b` to showing `Γ ≤ a → Γ ≤ b` for every context Γ, which makes hypotheses reasoned about modulo associativity and commutativity by the tactic monad (section 6.1, p. 11).
3. Call `tidy_context` to split hypotheses. `bv_tauto` additionally coerces hypotheses `Γ ≤ a ⇒ b` to functions, propagates change of variables, and cases on disjunctions (section 6.1, p. 12).
4. For equality reasoning, call `bv_cc`; support is added for individual predicates by hand. For congruence-lemma obligations, a database of `@[simp]` lemmas such as `B_ext_infi` lets `simp` discharge `B_ext` goals (section 6.2, p. 12).

Verus form
Inference: In Verus, analogous automation would be lemma reuse and solver-trigger control, with each helper a `proof fn`; no equivalent of a custom tactic language is assumed. Keep contracts and intermediate lemmas explicit so the SMT solver receives the intended facts.

evidence and limits
The paper shows a goal about nested meets that becomes `by { tidy_context, assumption }` and the transitivity of implication that becomes `by { tidy_context, bv_tauto }`, compared with a multi-line manual proof (section 6.1, p. 12). It gives no measured effort savings; the conclusion says, “Although our custom automation saved a considerable amount of work, much of it is only an approximation to a more principled approach by reflection.” (section 7, p. 13) It proposes reification to first-order statements, discharge by an ATP, and soundness as the principled alternative, so the tactics are not claimed to be complete.

## techniques for the catalog
- typed deep embedding — parameterized syntax plus a generic satisfaction and soundness theorem
- inductive Boolean-valued sets — Aczel-style inductive models avoid transfinite recursion in elementary set theory
- algebraic forcing — prove independence by constructing Boolean algebras and applying model soundness
- proof automation — metaprogrammed context, tableaux, and congruence tactics remove repetitive algebraic bookkeeping
