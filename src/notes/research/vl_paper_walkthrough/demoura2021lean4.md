# The Lean 4 Theorem Prover and Programming Language
(authored by agents unless marked 🧑)
Tag: `demoura2021lean4`, [paper](https://www.semanticscholar.org/paper/c4c0d6ffd70081d143b32be53b06fec1259b3ad8)

## scope and result

De Moura and Ullrich describe Lean 4 as both an interactive theorem prover and a compiled functional language. The abstract states: “Lean 4 is a reimplementation of the Lean interactive theorem prover (ITP) in Lean itself.” The paper teaches extensibility mechanisms and small proof and programming patterns; it does not report a benchmark denominator for theorem-proving success or autonomous proof generation. The examples are executable Lean snippets and implementation descriptions in §§1–4 (PDF pp. 625–635).

## technique: definitional reduction and induction

Use this when a proposition follows by computation or by structural recursion over an inductive value. Define a function with `def`; test its type with `#check` and its result with `#eval`; state a proposition with `theorem`; close reflexive reductions with `rfl`. For `or`, the paper proves `or_true (b : Bool) : or true b = true := rfl`. For `or_self`, pattern-match on `b` and return `rfl` in both `true` and `false` cases (§2, pp. 626–627). Define recursive data with `inductive`, then recurse over constructors. The `BoolExpr` example defines `var`, `val`, `or`, and `not`, and `simplify` recursively simplifies children before applying local `mkOr` and `mkNot` rules (p. 627).

For a semantic proof, define `denote` by recursion over `BoolExpr`, then prove that simplification preserves meaning with `denote_simplify`. The paper uses `by induction p with`, names induction hypotheses `ih1` and `ih2`, and calls `simp [ih1, ih2]` for the recursive `or` case; base cases close with `rfl` (§2, pp. 628–629). This gives an implementable recipe: make the recursive function structurally obvious, prove each constructor case, and register reusable equalities with `@[simp]`.

Inference: in Verus, the same shape is an executable Rust function plus a `spec fn` model and a `proof fn` that performs induction or invokes lemmas. Verus does not carry over Lean's definitional equality or tactic syntax unchanged; use `ensures`, `requires`, loop invariants, and explicit lemmas supported by the Verus toolchain. The mathematical recursion and constructor cases do carry over as a proof plan.

Evidence: the paper gives the complete examples but no count of all attempted proofs. It says: “The simp tactic implements an extensible simplifier, and is one of the most popular tactics in mathlib.” This is an ecosystem claim, not an accuracy measurement. Trusted components include the Lean kernel, compiler, and any axioms or metaprograms used by an extension; the paper does not establish that user specifications express intended behavior.

## technique: typeclass synthesis and decision procedures

Use typeclasses for ad-hoc polymorphism and automatically supplied instances. Declare `class Inhabited (α) where default : α`; define `arbitrary [Inhabited α] := Inhabited.default`; then provide an instance for `BoolExpr`. A product instance composes two `Inhabited` instances. `deriving instance DecidableEq for BoolExpr` creates decidable equality, and `#eval decide (BoolExpr.val true = BoolExpr.val false)` evaluates to `false` (§2, pp. 629–630). The paper explains the mechanism: “These provide hints to the elaborator: any time the elaborator is looking for an element of a typeclass, it can consult a table of declared instances to find a suitable element.”

Lean 4 replaces Lean 3's resolver with tabled typeclass resolution using discrimination trees for indexing and tabling (p. 630). Inference: Verus has Rust traits and solver reasoning, but does not inherit Lean's instance table or `deriving` commands. An agent can nevertheless use trait bounds to expose algebraic structure and then prove the needed lemmas explicitly. The paper's decision-procedure pattern suggests generating executable checks only when a proposition has a decidable instance; it does not prove that every proposition is decidable.

## technique: hygienic macros and domain-specific syntax

Use a macro when a domain notation should expand to ordinary verified constructors without accidental variable capture. First define parser syntax, then a `macro_rules` transformer. The paper defines infix notation ``Γ ` p`` for `denote`, and an embedded `[BExpr| ...]` syntax that maps literals, identifiers, disjunction, and negation to `BoolExpr` constructors (§2, pp. 630–631). It explicitly separates parsing from expansion so tooling can inspect a concrete syntax tree before expansion. The paper states: “Lean 4 takes ideas from the Scheme family of programming languages and solves these two problems simultaneously by use of a hygienic, i.e. capture-avoiding, macro system custom-built for ITPs.”

Inference: Verus macros can generate repetitive Rust proof scaffolding, but macro expansion itself is outside the logical theorem and must preserve the contracts it emits. A VL agent should expand and inspect generated `requires`, `ensures`, invariants, and lemma calls before treating a macro as evidence.

## technique: compiled metaprogramming and functional but in-place code

Lean users can implement tactics, elaborators, decision procedures, pretty printers, and code generators in Lean. The abstract says: “Lean 4 is fully extensible: users can modify and extend the parser, elaborator, tactics, decision procedures, pretty printer, and code generator.” The compiler emits C, allowing proof automation to be compiled and loaded as a plugin (§1 and §3, pp. 625–626, 632–633). Functional-but-in-place programming uses uniqueness information to update data without observable mutation, reducing allocation; the paper presents it as an implementation paradigm rather than a verification theorem (§3, pp. 632–634).

Inference: this is a design lesson for VL tooling. Put domain-specific proof search in ordinary source code, compile it, and keep the trusted proof checker as the final authority. Verus proof functions are erased and cannot be used as runtime plugins; executable Rust tooling must remain separate from proof-only code.

## what was measured, trusted, and left open

The paper reports no randomized evaluation, proof success denominator, or timing table for its examples. Its evidence is a language implementation, code snippets, and compatibility claims. It says Lean 3 metaprograms suffered “virtual machine interpretation overhead” and that Lean 4's compiler produces C; those are engineering claims without a controlled comparison in this article. Trust remains in the Lean kernel, compiler, generated C, imported libraries, metaprograms, and user theorem statements. Inference: for agent-written verified Rust, Lean 4 is a high threat to any product whose novelty is only extensible syntax or tactic plugins. It is a lower direct threat to a system that discovers specifications and complete Verus proofs for systems code, because this paper does not evaluate that workflow.

## techniques for the catalog

- definitional and inductive proving — define recursive functions, close reductions with `rfl`, and use constructor induction with `simp` hypotheses
- typeclass and decision synthesis — declare instances and use tabled resolution or `decide` when a proposition has a decidable instance
- hygienic domain syntax — separate parsing and macro expansion so custom notation produces capture-safe constructors
- compiled proof automation — implement tactics and elaborators in the prover language, compile them, and retain kernel checking as the final evidence

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
