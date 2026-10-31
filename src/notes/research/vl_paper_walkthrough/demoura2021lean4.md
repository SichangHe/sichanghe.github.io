# The Lean 4 Theorem Prover and Programming Language
(authored by agents unless marked 🧑)
Tag: `demoura2021lean4`, [paper](https://doi.org/10.1007/978-3-030-79876-5_37)

## scope and result

De Moura and Ullrich describe Lean 4 as both an interactive theorem prover and a compiled functional language. The abstract states: “Lean 4 is a reimplementation of the Lean interactive theorem prover (ITP) in Lean itself.” The paper teaches extensibility mechanisms and small proof and programming patterns; it does not report a benchmark denominator for theorem-proving success or autonomous proof generation. The examples are executable Lean snippets and implementation descriptions in §§1–4 (printed pp. 625–633; the Conclusion is on pp. 633–634).

## technique: definitional reduction and induction

Use this when a proposition follows by computation or by structural recursion over an inductive value. Define a function with `def`; test its type with `#check` and its result with `#eval`; state a proposition with `theorem`; close reflexive reductions with `rfl`. For `or`, the paper proves `or_true (b : Bool) : or true b = true := rfl`. For `or_self`, pattern-match on `b` and return `rfl` in both `true` and `false` cases (§2, pp. 626–627). Define recursive data with `inductive`, then recurse over constructors. The `BoolExpr` example defines `var`, `val`, `or`, and `not`, and `simplify`, which the paper calls "a simple bottom-up simplifier", recursively simplifies children before applying local `mkOr` and `mkNot` rules (pp. 627–628).

For a semantic proof, define `denote` by recursion over `BoolExpr`, then prove that simplification preserves meaning with `denote_simplify`. The paper uses `by induction p with`, names induction hypotheses `ih1` and `ih2`, and calls `simp [ih1, ih2]` for the `or` case and `simp [ih]` for the `not` case; the remaining cases (`| _`) close with `rfl` (§2, pp. 628–629). The paper elides the proof of the helper lemma `denote_mkOr` (shown as `...`) and writes `denote_simplify` with `def`. This gives an implementable recipe: make the recursive function structurally obvious, prove each constructor case, and register reusable equalities with `@[simp]`.

Inference: in Verus, the same shape is an executable Rust function plus a `spec fn` model and a `proof fn` that performs induction or invokes lemmas. Verus does not carry over Lean's definitional equality or tactic syntax unchanged; use `ensures`, `requires`, loop invariants, and explicit lemmas supported by the Verus toolchain. The mathematical recursion and constructor cases do carry over as a proof plan.

Evidence: the paper gives these examples, some with elided proofs, but no count of attempted proofs. It says (p. 628): “The simp tactic implements an extensible simplifier, and is one of the most popular tactics in mathlib.” This is an ecosystem claim, not an accuracy measurement. Inference: trusted components include the Lean kernel, compiler, and any axioms or metaprograms used by an extension; the paper only says that "Lean has a relatively small trusted kernel" (Conclusion, p. 633) and does not establish that user specifications express intended behavior.

## technique: typeclass synthesis and decision procedures

Use typeclasses for ad-hoc polymorphism and automatically supplied instances. Declare `class Inhabited (α) where default : α`; define `arbitrary [Inhabited α] := Inhabited.default`; then provide an instance for `BoolExpr`. A product instance composes two `Inhabited` instances. `deriving instance DecidableEq for BoolExpr` creates decidable equality, and `#eval decide (BoolExpr.val true = BoolExpr.val false)` evaluates to `false` (§2, pp. 629–630). The paper explains the mechanism: “These provide hints to the elaborator: any time the elaborator is looking for an element of a typeclass, it can consult a table of declared instances to find a suitable element.” (p. 629)

Lean 4 replaces Lean 3's resolver with tabled typeclass resolution using discrimination trees for indexing and tabling (p. 630). Inference: Verus has Rust traits and solver reasoning, but does not inherit Lean's instance table or `deriving` commands. An agent can nevertheless use trait bounds to expose algebraic structure and then prove the needed lemmas explicitly. Inference: `decide` evaluates a proposition only when a `Decidable` instance exists (the paper: “The function `decide` evaluates decidable propositions.”, p. 630), so executable checks of this kind are limited to decidable propositions; the paper does not claim every proposition is decidable.

## technique: hygienic macros and domain-specific syntax

Use a macro when a domain notation should expand to ordinary verified constructors without accidental variable capture. First define parser syntax, then a `macro_rules` transformer. The paper defines infix notation ``Γ ` p`` for `denote`, and an embedded `[BExpr| ...]` syntax that maps literals, identifiers, disjunction, and negation to `BoolExpr` constructors (§2, pp. 630–632). It explicitly separates parsing from expansion so tooling can inspect a concrete syntax tree before expansion. The paper states: “Lean 4 takes ideas from the Scheme family of programming languages and solves these two problems simultaneously by use of a hygienic, i.e. capture-avoiding, macro system custom-built for ITPs.”

## technique: compiled metaprogramming and functional but in-place code

Lean users can implement tactics, elaborators, decision procedures, pretty printers, and code generators in Lean. The abstract says: “Lean 4 is fully extensible: users can modify and extend the parser, elaborator, tactics, decision procedures, pretty printer, and code generator.” The compiler emits C, allowing proof automation to be compiled and loaded as a plugin (§1 and §3, pp. 625–626, 632). Functional-but-in-place (FBIP) programming relies on reference counting: the paper states that for `map f as`, “If the list referenced by as is not shared, the code generated by our compiler does not allocate any memory” (§3, p. 633), and that arrays and hashtables can be used in pure code “without any performance penalty when they are not shared”. The paper presents FBIP as a programming paradigm and implementation technique, not a verification theorem (§3, pp. 632–633).

## what was measured, trusted, and left open

The paper reports no randomized evaluation, proof success denominator, or timing table. Its evidence is a language implementation and code snippets, plus one performance claim that cites other work: “Our preliminary experimental results demonstrate our new compiler produces competitive code that often outperforms the code generated by high-performance compilers such as ocamlopt and GHC [14]” (§3, p. 633; [14] is Ullrich and de Moura, “Counting immutable beans”, IFL 2019). It says Lean 3 metaprograms suffered “virtual machine interpretation overhead” and that Lean 4's compiler produces C; those are engineering claims without a controlled comparison in this article. Trust remains in the Lean kernel, compiler, generated C, imported libraries, metaprograms, and user theorem statements. Inference: for agent-written verified Rust, Lean 4 is a high threat to any product whose novelty is only extensible syntax or tactic plugins. It is a lower direct threat to a system that discovers specifications and complete Verus proofs for systems code, because this paper does not evaluate that workflow.

## techniques for the catalog

- definitional and inductive proving — define recursive functions, close reductions with `rfl`, and use constructor induction with `simp` hypotheses
- typeclass and decision synthesis — declare instances and use tabled resolution or `decide` when a proposition has a decidable instance
- hygienic domain syntax — separate parsing and macro expansion so custom notation produces capture-safe constructors
- compiled proof automation — implement tactics and elaborators in the prover language, compile them, and retain kernel checking as the final evidence
