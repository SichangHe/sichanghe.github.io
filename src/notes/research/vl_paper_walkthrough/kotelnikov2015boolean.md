# A First Class Boolean Sort in First-Order Theorem Proving and TPTP
(authored by agents unless marked 🧑)
Tag: `kotelnikov2015boolean`, [paper](http://arxiv.org/abs/1505.01682v1)

## what is proved and measured

FOOL (First-Order logic with the boolean sort) extends many-sorted first-order logic so that Boolean values are ordinary terms, can be passed to functions, can be quantified, and can be selected with if-then-else and local let-in definitions. The paper’s aim is to make program-analysis formulas translate directly into a first-order theorem prover. The abstract says: “Boolean terms are indistinguishable from formulas and can appear as arguments to functions.” (Abstract, p. 1). It defines FOOL syntax and semantics, gives a model-preserving translation to ordinary first-order logic, and proposes a superposition rule specialized for the two-element Boolean domain. There is no benchmark corpus or success percentage; the evidence is theorems (stated without proofs: “These properties are not hard to prove, we do not include proofs in this paper.”, Section 3, p. 10), a partial-correctness example, and an informal proof-search argument. The conclusion lists implementation of FOOL support as future work (Section 7, p. 15), so nothing is implemented or measured for the new rule.

## technique 1: represent program state with first-class Boolean terms

what it is: FOOL has a distinguished `bool` sort with values `{0,1}`, constants `true` and `false`, Boolean connectives as function symbols (`∨ ∧ ⇒ ⇔` of type `bool×bool→bool`, `¬` of type `bool→bool`), and terms of sort `bool` usable both in formula contexts and as function arguments. It adds `if φ then s else t` and `let f(args)=s in t` (Definitions 1–5, pp. 5–8).

when to use it: use FOOL when an encoding of imperative or functional code needs Boolean flags, conditional expressions, local assignments, or quantified Boolean variables. The authors motivate it because ordinary first-order logic has no local binding and TPTP treats Boolean sort as second-class (Introduction, pp. 2–5).

how to do it:
1. declare program predicates/functions and their sorts, including functions returning `bool`
2. express a branch update as an if-then-else term and local assignments as let-in terms
3. place the resulting next-state equation in the hypotheses and the desired postcondition as the conjecture
4. quantify over Booleans directly when a property ranges over flags

Their partial-correctness example encodes `if (r(a)) { a:=a+1 } else { a:=a+q(a) }` as `a1 = if r(a) then let a = a+1 in a else let a = a+q(a) in a`, with preconditions as hypotheses and `a1>0` as the conjecture (Introduction, p. 3). The paper notes: “Using the if-then-else and let-in expressions recently introduced in TPTP and already implemented in Vampire [7], one can have a linear-size translation instead.” (Introduction, pp. 3–4). Without these constructs, the paper says that “computing the next state function of a program variable results in a formula of size exponential in the number of conditional expressions” (Introduction, p. 3).

Verus form: Inference: use a Rust `bool` field or an enum-like state in executable code, and a `spec fn` returning `bool` for a pure condition. A branch’s value can be written with Rust `if`; local mathematical bindings can use `let` in a `spec fn` or proof body. Verus’s `requires` and `ensures` are formulas rather than first-class Boolean terms in the exact FOOL sense, so a direct FOOL syntax import is not established by the paper.

## technique 2: model-preserving FOOL-to-FOL translation

what it is: translate a closed FOOL formula `φ` into a syntactically first-order formula `φ'` plus definitions `D` for fresh symbols, then replace formula-context `true`/`false` by logical constants and add the two-element Boolean-domain axiom. Theorem 3 proves extension and reflection of models; Theorem 4 handles the final Boolean-sort interpretation (Section 3, pp. 9–12).

when to use it: use this translation when the backend theorem prover accepts ordinary many-sorted FOL but not FOOL constructs (the paper: “This translation can be used for proving theorems of FOOL using a first-order theorem prover.”, Section 3, p. 9). It preserves models, although the authors explicitly do not claim an efficient translation (Section 3, p. 9). The translation is defined for closed formulas.

how to do it:
1. initialize a definition set `D` and repeatedly choose a non-first-order subterm
2. replace a Boolean variable in formula context by `x=true`
3. replace a nontrivial formula in term context by a fresh Boolean-returning function `g`, adding `∀vars.(ψ ⇔ g(vars)=true)` to `D`
4. replace `if ψ then s else t` by a fresh function `g(vars)`, adding guarded equations `ψ⇒g(vars)=s` and `¬ψ⇒g(vars)=t`
5. replace `let f(x)=s in t` by a fresh function `g` whose extra arguments are the free variables of the let term, with a universally quantified defining equation `g(z,y)=s'` in `D`, and rewrite applications of `f` in `t` to applications of `g`
6. after no rules apply, replace `true`/`false` in formula context by `⊤`/`⊥` and add `∀x:bool.(x=true∨x=false) ∧ true≠false` (Section 3, pp. 9–12)
7. Inference: run a first-order prover on the conjunction of `D` and the translated formula (the paper’s Section 3 says the translation “can be used” this way; it lists no such step)

The translation terminates (Lemma 3, p. 11), and the model-preservation theorem states that each original model extends to a model of the definitions and translated formula, while every model of the latter satisfies the original (Theorem 3, p. 11). The paper summarizes: “Theorems 3 and 4 show that our translation preserves models.” (Section 3, p. 12).

Verus form: Inference: this is analogous to introducing ghost helper functions and `ensures` equations, then proving equivalence lemmas. A Verus `spec fn` can encode a pure conditional, and `lemma` functions can establish the guarded equations. The Boolean-domain axiom is unnecessary for Rust `bool`, whose type is fixed by the language; arbitrary first-order function symbols returning Boolean values still need their intended contracts.

limits: the paper says efficiency needs more research (quote above). The model-preservation statement is relative to the added definitions `D` and the Boolean-domain axiom (3) (Theorems 3 and 4). Inference: fresh definitions may enlarge formulas, and an untrusted implementation could still generate malformed formulas; the paper discusses neither.

## technique 3: specialized superposition for the Boolean domain

what it is: ordinary superposition applied to `x=true ∨ x=false` can self-paramodulate and generate clauses such as `x=y ∨ x=false ∨ y=false`, causing a large search space. The paper restricts the term ordering (`true ≻ false`, both smallest ground terms) and replaces the Boolean-domain clause with a dedicated inference rule for non-variable Boolean terms (Section 4, pp. 12–13).

when to use it: the paper presents the rule for superposition provers reasoning about the FOL formulas produced by its translation, where the clause `x=true ∨ x=false` is present (Section 4, p. 12). Inference: it matters most when many Boolean terms occur, since that clause would otherwise trigger paramodulation from variables.

how to do it:
1. choose an ordering where `true ≻ false` and `true` and `false` are the smallest ground terms (Section 4, p. 13)
2. remove the generic clause `x=true ∨ x=false`
3. add the inference rule `C[s] / C[true] ∨ s=false` for a non-variable term `s` of sort bool (Section 4, p. 13)
4. Inference: keep ordinary ordered paramodulation and simplification for the other inferences (the paper does not spell this out)

The rule is justified because ground instances have the form `s=true ∨ s=false`; when `s` is `true` or `false` the instance is a tautology, hence redundant, so only instances with `s ≻ true` need be considered, which prevents self-paramodulation of the clause (Section 4, p. 13). The paper gives this as an argument, with no soundness or completeness theorem and no implementation or experiment. The paper warns: “Very soon the search space will contain many clauses obtained as logical consequences of clause (4) and results of paramodulation from variables applied to them.” (Section 4, p. 13).

Verus form: Inference: Verus delegates formula search to its SMT backend rather than exposing superposition rules. The transferable idea is to avoid exposing an unrestricted Boolean case axiom; use typed Boolean facts and targeted `assert`/`lemma` facts so the solver sees only needed cases. This is a proof-context heuristic, not a Verus semantic guarantee established by the paper.

## technique 4: simplify and standardize TPTP Boolean syntax

what it is: TPTP’s TFF0 has a predefined `$o` result sort but cannot use Boolean variables, Boolean arguments, or Boolean equality, forcing four variants of let-in and two variants of if-then-else. The paper proposes making TFF0 coincide with FOOL, eliminating these redundant forms and allowing the SMT-LIB core theory to be represented directly (Section 5, pp. 13–14). The paper writes: “We propose to modify the TFF0 language of TPTP to coincide with FOOL.” (Section 5, p. 14).

how to do it (Inference: these steps are my reading of the proposal; the paper gives it in prose without a step list):
1. treat `$o` as a normal first-class sort
2. permit declarations of functions with Boolean arguments and results, Boolean variables and Boolean equality
3. use one if-then-else and one let-in construct instead of the two and four variants
4. feed FOOL formulas directly to a prover supporting full TFF0; the paper says “To the best of our knowledge, Vampire is currently the only theorem prover supporting full TFF0.” (Section 5, p. 14)

The paper adds that the change could also apply to TFF1 and that extending to TFF1 “should not be hard but has to be done in detail” (Section 5, p. 14). Evidence is a language-design proposal, not a measured implementation study. The motivating examples are one program fragment and two Isabelle-generated formulas, (1) and (2) (Introduction, pp. 3–4), chosen “among 490 properties”; no denominator or aggregate benchmark is reported. Inference: a Verus tool could adopt a similarly uniform intermediate representation for Rust `bool`, reducing special cases in generated specs, but it must preserve Rust/Verus typing and ownership semantics.

## trusted boundary, contradictions, and product threat

The formal claims are model preservation of the translation (Theorems 3 and 4, with lemma proofs omitted) and a redundancy argument for the specialized rule; no soundness proof for the rule is given. Inference: the first-order prover, its superposition implementation, the translation implementation, and the correctness of the program-to-FOOL encoding remain trusted. The paper explicitly says: “We do not claim that this translation is efficient – more research is required on designing translations friendly for first-order theorem provers.” (Section 3, p. 9). Inference: for agent-written verified Rust, this paper poses a low direct threat to memory and ownership verification but a medium threat to Boolean-heavy specification pipelines: awkward encodings can create exponential formulas or hide a branch’s semantics. VL should reuse first-class typed Boolean intermediate expressions and model-preserving lowering, and should not redo ad-hoc Boolean encodings for each verifier backend.

The paper’s claims are qualitative and theorem-based; there are no conflicting percentages or benchmark denominators to reconcile.

## techniques for the catalog

- first-class Boolean terms — treat `bool` values as formulas and function arguments, with typed if-then-else and let-in
- model-preserving FOOL lowering — eliminate Boolean term contexts and local definitions using fresh symbols, guarded equations, and a two-element-domain axiom
- finite-domain superposition rule — replace generic Boolean case-clause inference with a targeted rule for non-variable Boolean terms
- uniform TPTP Boolean syntax — make Boolean sort first-class in TFF0 so program formulas translate without ad-hoc variants
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The purpose of D is to collect a set of formulas (definitions of new symbols), which guarantee that the transformation preserves models."): read the whole paper text and checked every quotation, section/page reference (paper page numbers), theorem and lemma citation, and technique step against it; changed the Lemma 3/Theorem 3 pages, the Section 4 and 5 page references, the connective typing, the quote in technique 1 (added the omitted citation marker [7]), the ordering condition on true and false, the let-in translation step, and the TPTP steps and Boolean-rule steps now marked Inference; added that the paper omits proofs, implements nothing, and gives no soundness proof for the new rule; removed the unsupported "satisfiability" and "soundness motivation" wording. Not checked: the cited external works, the PDF layout beyond the text, and the Verus and product-threat inferences, which are my reading and not from the paper. Link kept as the arXiv page named in the paper header (arXiv:1505.01682v1).
