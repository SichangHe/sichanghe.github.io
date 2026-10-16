# A First Class Boolean Sort in First-Order Theorem Proving and TPTP
(authored by agents unless marked 🧑)
Tag: `kotelnikov2015boolean`, [paper](http://arxiv.org/abs/1505.01682v1)

## what is proved and measured

FOOL (First-Order logic with the boolean sort) extends many-sorted first-order logic so that Boolean values are ordinary terms, can be passed to functions, can be quantified, and can be selected with if-then-else and local let-in definitions. The paper’s aim is to make program-analysis formulas translate directly into a first-order theorem prover. The abstract says: “Boolean terms are indistinguishable from formulas and can appear as arguments to functions.” (Abstract, p. 1). It defines FOOL syntax and semantics, gives a model-preserving translation to ordinary first-order logic, and proposes a superposition rule specialized for the two-element Boolean domain. There is no benchmark corpus or success percentage; the evidence is theorems, a partial-correctness example, and a proof-search analysis.

## technique 1: represent program state with first-class Boolean terms

what it is: FOOL has a distinguished `bool` sort with values `{0,1}`, constants `true` and `false`, Boolean connectives as functions `bool×bool→bool`, and terms of sort `bool` usable both in formula contexts and as function arguments. It adds `if φ then s else t` and `let f(args)=s in t` (Definitions 1–5, pp. 5–8).

when to use it: use FOOL when an encoding of imperative or functional code needs Boolean flags, conditional expressions, local assignments, or quantified Boolean variables. The authors motivate it because ordinary first-order logic has no local binding and TPTP treats Boolean sort as second-class (Introduction, pp. 2–5).

how to do it:
1. declare program predicates/functions and their sorts, including functions returning `bool`
2. express a branch update as an if-then-else term and local assignments as let-in terms
3. place the resulting next-state equation in the hypotheses and the desired postcondition as the conjecture
4. quantify over Booleans directly when a property ranges over flags

Their partial-correctness example encodes `if (r(a)) { a:=a+1 } else { a:=a+q(a) }` as `a1 = if r(a) then let a = a+1 in a else let a = a+q(a) in a`, with preconditions as hypotheses and `a1>0` as the conjecture (Introduction, pp. 2–3). The paper notes: “Using the if-then-else and let-in expressions recently introduced in TPTP and already implemented in Vampire, one can have a linear-size translation instead.” (Introduction, p. 3). Without these constructs, nested conditionals can cause an exponential next-state formula.

Verus form: Inference: use a Rust `bool` field or an enum-like state in executable code, and a `spec fn` returning `bool` for a pure condition. A branch’s value can be written with Rust `if`; local mathematical bindings can use `let` in a `spec fn` or proof body. Verus’s `requires` and `ensures` are formulas rather than first-class Boolean terms in the exact FOOL sense, so a direct FOOL syntax import is not established by the paper.

## technique 2: model-preserving FOOL-to-FOL translation

what it is: translate a closed FOOL formula `φ` into a syntactically first-order formula `φ'` plus definitions `D` for fresh symbols, then replace formula-context `true`/`false` by logical constants and add the two-element Boolean-domain axiom. Theorem 3 proves extension and reflection of models; Theorem 4 handles the final Boolean-sort interpretation (Section 3, pp. 9–12).

when to use it: use this translation when the backend theorem prover accepts ordinary many-sorted FOL but not FOOL constructs. It preserves satisfiability/model truth, although the authors explicitly do not claim an efficient translation (Section 3, p. 9).

how to do it:
1. initialize a definition set `D` and repeatedly choose a non-first-order subterm
2. replace a Boolean variable in formula context by `x=true`
3. replace a nontrivial formula in term context by a fresh Boolean-returning function `g`, adding `∀vars.(ψ ⇔ g(vars)=true)` to `D`
4. replace `if ψ then s else t` by a fresh function `g(vars)`, adding guarded equations `ψ⇒g(vars)=s` and `¬ψ⇒g(vars)=t`
5. replace `let f(x)=s in t` by a fresh function with universally quantified defining equation and substitute applications
6. after no rules apply, replace `true`/`false` in formula context by `⊤`/`⊥` and add `∀x:bool.(x=true∨x=false) ∧ true≠false` (Section 3, pp. 9–12)
7. run a first-order prover on the conjunction of `D` and the translated formula

The translation terminates (Lemma 3, p. 10), and the model-preservation theorem states that each original model extends to a model of the definitions and translated formula, while every model of the latter satisfies the original (Theorem 3, pp. 10–11). The paper summarizes: “Theorems 3 and 4 show that our translation preserves models.” (Section 3, p. 12).

Verus form: Inference: this is analogous to introducing ghost helper functions and `ensures` equations, then proving equivalence lemmas. A Verus `spec fn` can encode a pure conditional, and `lemma` functions can establish the guarded equations. The Boolean-domain axiom is unnecessary for Rust `bool`, whose type is fixed by the language; arbitrary first-order function symbols returning Boolean values still need their intended contracts.

limits: fresh definitions may enlarge formulas and the paper says efficiency needs more research. The translation is model-preserving only under the added definitions and Boolean axioms; an untrusted implementation could still generate malformed formulas.

## technique 3: specialized superposition for the Boolean domain

what it is: ordinary superposition applied to `x=true ∨ x=false` can self-paramodulate and generate clauses such as `x=y ∨ x=false ∨ y=false`, causing a large search space. The paper restricts the term ordering (`true ≻ false`, both smallest ground terms) and replaces the Boolean-domain clause with a dedicated inference rule for non-variable Boolean terms (Section 4, pp. 12–14).

when to use it: use the rule in a superposition prover after FOOL-to-FOL translation, especially when many Boolean terms occur as function arguments and the finite-domain axiom would otherwise trigger variable paramodulation.

how to do it:
1. choose an ordering where `true` is greater than `false`, and both are smaller than every other ground Boolean term (Section 4, p. 13)
2. omit the generic clause `x=true ∨ x=false` from ordinary inference
3. whenever a clause contains a non-variable Boolean term `s`, apply the specialized inference `C[s] / C[true] ∨ s=false` (Section 4, p. 14)
4. continue ordinary ordered paramodulation and simplification on the resulting clauses

The rule is justified because the only useful ground instances are `s=true∨s=false` for `s ≻ true`; instances for `true` and `false` are tautologies (Section 4, pp. 13–14). The paper warns: “Very soon the search space will contain many clauses obtained as logical consequences of clause (4) and results of paramodulation from variables applied to them.” (Section 4, p. 13).

Verus form: Inference: Verus delegates formula search to its SMT backend rather than exposing superposition rules. The transferable idea is to avoid exposing an unrestricted Boolean case axiom; use typed Boolean facts and targeted `assert`/`lemma` facts so the solver sees only needed cases. This is a proof-context heuristic, not a Verus semantic guarantee established by the paper.

## technique 4: simplify and standardize TPTP Boolean syntax

what it is: TPTP’s TFF0 has a predefined `$o` result sort but cannot use Boolean variables, Boolean arguments, or Boolean equality, forcing four variants of let-in and two variants of if-then-else. The paper proposes making TFF0 coincide with FOOL, eliminating these redundant forms and allowing direct SMT-LIB-style Boolean terms (Section 5, pp. 14–15).

how to do it:
1. treat `$o` as a normal first-class sort
2. permit declarations of functions with Boolean arguments and results
3. use one if-then-else and one let-in construct whose branches/terms are typed
4. feed FOOL formulas directly to a prover supporting full TFF0; the paper reports Vampire as the only such prover known to the authors at that time (Section 5, p. 15)

Evidence is a language-design proposal, not a measured implementation study. The motivating program example is one formula; no denominator or aggregate benchmark is reported. Inference: a Verus tool could adopt a similarly uniform intermediate representation for Rust `bool`, reducing special cases in generated specs, but it must preserve Rust/Verus typing and ownership semantics.

## trusted boundary, contradictions, and product threat

The formal claims are model preservation of the translation and soundness motivation for the specialized rule. Inference: the first-order prover, its superposition implementation, the translation implementation, and the correctness of the program-to-FOOL encoding remain trusted. The paper explicitly says: “We do not claim that this translation is efficient – more research is required on designing translations friendly for first-order theorem provers.” (Section 3, p. 9). Inference: for agent-written verified Rust, this paper poses a low direct threat to memory and ownership verification but a medium threat to Boolean-heavy specification pipelines: awkward encodings can create exponential formulas or hide a branch’s semantics. VL should reuse first-class typed Boolean intermediate expressions and model-preserving lowering, and should not redo ad-hoc Boolean encodings for each verifier backend.

The paper’s claims are qualitative and theorem-based; there are no conflicting percentages or benchmark denominators to reconcile.

## techniques for the catalog

- first-class Boolean terms — treat `bool` values as formulas and function arguments, with typed if-then-else and let-in
- model-preserving FOOL lowering — eliminate Boolean term contexts and local definitions using fresh symbols, guarded equations, and a two-element-domain axiom
- finite-domain superposition rule — replace generic Boolean case-clause inference with a targeted rule for non-variable Boolean terms
- uniform TPTP Boolean syntax — make Boolean sort first-class in TFF0 so program formulas translate without ad-hoc variants
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
