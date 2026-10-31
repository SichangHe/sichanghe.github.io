# GFLean: An Autoformalisation Framework for Lean via GF
(authored by agents unless marked 🧑)
Tag: `pathak2024gflean`, [paper](https://arxiv.org/abs/2404.01234)

## purpose and boundaries

GFLean translates Simplified ForTheL, a restricted controlled natural language, into Lean statements. Shashank Pathak writes, “GFLean uses a high-level grammar writing tool called Grammatical Framework (GF) for parsing and linearisation.” (abstract, PDF p. 1). The implementation uses Haskell for intermediate abstract syntax tree (AST) transformations. Its scope is explicit: “Currently, GFLean only formalises statements but not proofs.” (section 1, PDF p. 1).

The paper identifies two contributions: “Implementing algorithms in Haskell to translate Simplified ForTheL expressions to Lean expressions via manipulating abstract syntax trees (ASTs).” and “Implementing a grammar for Lean expressions in GF, so that the ASTs obtained from the previous step can be linearized as Lean expressions.” (section 1, PDF p. 2).

The evaluation covers chapter 3 of Mathematical Proofs by G. Chartrand, A. D. Polimeni, and P. Zhang. The paper reports, “Out of the 62 statements contained in the chapter, GFLean can parse and formalise 42 statements with a minor rephrasing of the input.” (section 1, PDF p. 2). Appendix A, PDF pp. 12–17, supplies those 42 statements, rephrased inputs, and outputs. The remaining 20 require lexicon expansion and support for phenomena such as postfix quantification and donkey anaphora (section 1, PDF p. 2). This is coverage after rephrasing, rather than a reported proof-success rate.

## technique: grammar-controlled parsing into an AST

What it is. A GF grammar contains one abstract syntax and at least one concrete syntax. The abstract syntax defines linguistic categories and constructors; concrete syntaxes specify how their trees become strings. The paper explains, “For translation, the abstract syntax acts as a bridge between the various concrete syntaxes.” (section 2.2, PDF p. 3).

How to do it.

1. Define categories and typed constructors. The paper's toy `Demo` grammar declares `Prop` and `Var`, with constructors including `Imp : Prop -> Prop -> Prop` and `ForAll, Exists : Var -> Prop -> Prop` (section 2.2.1, PDF p. 3).
2. Define concrete syntaxes for the same abstract syntax. `DemoEng` renders English; `DemoMath` renders symbolic mathematics (section 2.2.2, PDF p. 4).
3. Parse the source string through its concrete syntax to obtain an AST, then linearize that tree through the target concrete syntax. This is the toy example's direct translation method (section 2.2.2, PDF p. 4).
4. For GFLean, embed two separate GF grammars in Haskell instead. Parse Simplified ForTheL with the first, transform its AST in Haskell, and use the second grammar to linearize a Lean AST (section 3, PDF pp. 4–5). Unlike the toy example, this requires transformations between source and target trees.

GFLean's arithmetic precedence comes from records in the input concrete syntax: `2 + 2 * 2` has the same AST as `2 + (2 * 2)`, while parentheses can override precedence (section 3.3.1, PDF p. 7). The lexicon has 8 noun-like items and 11 adjective-like items, and both grammars extract their lexicon from the same GF file (section 3.3.1, PDF p. 7).

When to use it. Inference: this approach suits a known fragment of specification language whose terms and propositions can be represented by explicit constructors. It requires defining and maintaining that fragment.

Verus form. Inference: parse into a typed Rust AST, then translate it into Verus specifications. Specify the meaning of each AST constructor before trusting the translation. The paper does not establish that GF's grammar type checking ensures Lean type correctness or agreement with a user's intended statement.

Evidence and limits. The paper says GF provides “the lexer, parser, and type-checker for free” once grammar rules are written (section 2.2, PDF p. 3). GFLean's input grammar nevertheless permits only one left adjective, one predicate per clause, and one subject term. Conjunctions must be expressed through complete statements, such as `x is odd and x is greater than 4` (section 3.1.1, PDF p. 6). Appendix B's readable context-free grammar is explicitly a close approximation of Simplified ForTheL, rather than its exact grammar (PDF p. 17).

## technique: normalize ASTs before target translation

What it is. GFLean's four stages are parsing, simplification, translation, and linearization. GF performs the first and last; Haskell performs the middle two (section 3, PDF p. 5). The paper states, “Since for GFLean we had to implement some non-compositional translations, we chose this method.” (section 2.2, PDF p. 3).

How to do it.

1. Replace metavariables for unnamed entities with fresh names that differ from existing names (section 3.3.2, PDF p. 8).
2. Unify introduced names with variable names already present when required. The illustrated fragment `Assume x is a rational number (x 6).` becomes `Assume x is a rational number x.` (section 3.3.2, PDF p. 8).
3. Move quantification from inside a sentence to an explicit quantified clause. The paper's example changes `Every integer x greater than 1 is greater than 2.` into `For every integer x greater than 1, x is greater than 2.` (section 3.3.2, PDF p. 8).
4. Turn left adjectives and right adjectival phrases into statements modifying the noun from the right. The fragment `odd integer x greater than 1` becomes `integer x such that x is odd and x is greater than 1` (section 3.3.2, PDF p. 8).
5. Construct the target Lean AST from the simplified source AST, then linearize it with the Lean GF grammar (sections 3.3.3–3.3.4, PDF pp. 8–9).

The paper illustrates the input `Ex. Assume x is an odd integer greater than 3. Then x is greater than 2.` and the final output `example (x : Z) (h40 : odd x) (h27 : x > 3) : x > 2 := sorry` (section 3.3.3, PDF p. 9). Preprocessing includes lowercasing the input; postprocessing includes removing extra whitespace and giving hypothesis variables unique names (section 3.3.4, PDF p. 9).

When to use it. Inference: normalization can reduce the number of surface forms the target translation must handle. Fresh names and explicit quantifiers also make binding decisions available for inspection.

Verus form. Inference: define an interpretation of a typed AST and prove that normalization preserves it. Fresh-name uniqueness, substitution, and quantifier scope would require explicit obligations. The paper describes transformations as meaning-preserving but reports no machine-checked semantic-preservation theorem.

## technique: typed lexical translation and rule/neural cross-checking

What it is. GFLean translates lexical categories before constructing Lean expressions (section 3.3.3, PDF p. 9):

1. A `rawNoun0` becomes a Lean type, for example `INTEGER` becomes `Int`.
2. A `rawNoun2` becomes a binary function, for example `EXP` becomes exponentiation.
3. A `rawAdjective0` becomes a unary relation, for example `POSITIVE`.
4. A `rawAdjective1` becomes a binary relation, for example `LESS_THAN`.

The paper separately proposes a neural/rule-based combination: “Rule-based systems designed for linearizing formal expression to natural language text can be used to help the user filter out the wrong translations without putting a domain expert in the loop.” (section 5, PDF p. 10).

How to apply the proposal. A neural translator produces a formal statement from source text. A rule-based system converts that formal statement back into natural language. The user compares the original and returned statements for agreement in meaning. This proposal assumes the rule-based system correctly verbalizes formal expressions; it is discussion, not an evaluated GFLean feature (section 5, PDF p. 10).

Verus form. Inference: give each lexicon entry an explicit specification meaning and verbalize the generated contract for review. Such a round trip can help a user inspect the contract, but does not itself prove that the contract expresses the requirement.

Evidence and limits. The reported result remains 42 of 62 textbook statements with minor rephrasing, with no repeated-run analysis or confidence interval. Appendix A also reports two parse trees and two outputs for Theorem 3 and says a single parse tree would be preferable (PDF p. 13). Thus, the grammar does not always produce a single parse tree.

## techniques for the catalog

- GF abstract/concrete grammar — define typed constructors and separate their tree structure from string forms
- AST normalization — assign fresh names, unify variables, expose quantifiers, and rewrite adjective modifiers before target translation
- typed lexical translation — map noun and adjective categories to target types, functions, and relations
- proposed rule/neural round trip — verbalize a neural formalization with rules so a user can compare meanings
