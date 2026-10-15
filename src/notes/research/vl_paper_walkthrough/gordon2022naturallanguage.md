# Natural Language Specifications in Proof Assistants
(authored by agents unless marked 🧑)
Tag: `gordon2022naturallanguage`, [paper](https://www.semanticscholar.org/paper/ea6193e77b1a7d94582c53d6529255d6efa4ac53)

## problem and proposal
The paper addresses the informal-to-formal specification gap. “This is especially problematic when using proof assistants to formally verify the correctness of software with respect to a natural language specification.” (Abstract, p. 1) Its prototype parses a controlled but extensible fragment of English into Coq propositions using categorial grammar, dependent semantic types, and typeclass search. The user can write `Goal spec "addone is monotone".` and obtain a proof goal.

Inference: for VL, this suggests storing a machine-checked link between a requirement sentence and a Verus contract. The parser cannot establish that a human sentence expresses the intended product requirement; it can only make the translation explicit and checkable.

## technique 1: indexed categorial grammar
Categorial grammar assigns each word a category and combines adjacent categories with slash-elimination/composition rules. The paper adapts categories to Coq’s dependent types: `NP A` denotes an object of type A, `ADJ A` a predicate over A, and `S` a proposition. “Coq’s logic is expressive enough to give the set of grammatical types as a datatype Cat, and to give the interpretation of those types into semantic types as a recursive function interp within Coq.” (Section 3, p. 6)

Steps (Section 3, pp. 5–7): (1) define `Cat` with sentence, noun phrase, adjective, common noun, and directional slash constructors; (2) define `interp` mapping categories to Coq types; (3) index noun phrases and adjectives by the referent type; (4) represent slash categories as semantic functions; (5) define combination rules as typeclass instances; (6) ensure each lexical denotation type-checks against its category. This indexing prevents a noun phrase about natural numbers from being applied to a predicate for an unrelated type.

Inference: in Verus, the semantic target could be a ghost proposition or a generated contract schema, but Verus does not have Coq typeclasses or dependent universe-indexed grammatical categories. A separate parser must emit ordinary Rust/Verus declarations and preserve the parse certificate.

## technique 2: typeclass-driven semantic parsing
The central implementation reuses Coq’s elaborator. “We propose using Coq’s typeclass support [86] to perform semantic parsing from natural language5 to Coq’s specification logic.” (Section 3, p. 5) A `Synth words category` class carries a `denote` field; each grammar rule is an instance. A `SynthLex` instance connects lexical entries to one-word parses.

Steps (Sections 3.1–3.3, pp. 7–10): (1) define `Synth` indexed by a word list and category; (2) encode slash-elimination and composition as instances; (3) define a `lexicon word category` class carrying a denotation; (4) add one instance per word sense; (5) define `Semantics string S` to tokenize and request a complete sentence parse; (6) define `spec` to return the denotation; (7) ask Coq to simplify the resulting proposition. The paper’s `is` has two entries—adjective application and equality—whose category determines which meaning is selected (Section 3.2, p. 8).

Inference: a VL tool could keep a lexical entry as a reviewed mapping from a phrase to a Verus predicate and emit a hashable derivation tree. The proof assistant’s type checker should validate the generated predicate’s type, while humans review ambiguous word senses.

## technique 3: quantifiers and polymorphic coordination
Quantifiers are higher-order lexical entries. “and another for the common noun ‘natural’ (number) allows correctly parsing sentences like” (Section 3.2.1, p. 9) The common noun constrains the quantified type; the quantifier’s denotation is `forall` over that type. Coordination is handled by a `Prop-like` class that recognizes sentence/adjective functions returning propositions and lifts conjunction/disjunction through nested slash types.

Steps (Sections 3.2.1–3.2.2, pp. 9–10): (1) define a quantified category `(S/(NP A\S)/CN A)`; (2) give “every” a denotation `forall (x:A), P x`; (3) define common-noun entries that unify A with the intended Coq type; (4) define a class recognizing categories whose semantic result is `Prop`; (5) lift `and` or `or` through each function layer; (6) let ordinary grammar rules combine the lifted predicates.

Inference: Verus specifications can encode universal and conjunctive contracts directly, but preserving natural-language scope requires the parser’s derivation to be stored with the generated `requires`/`ensures` clauses. Ambiguous quantifier scope should be rejected or presented for review.

## technique 4: specifications as executable proof goals
The prototype turns a string into a Coq proposition and uses it as a goal. “When invoked with a string s, Coq will search for an instance of Semantics s S — a parse of the string as a complete sentence.” (Section 3.3, p. 10) The examples produce `∀ x,y:N. x≤y ⇒ addone x≤addone y` and conjunctions of quantified and existential claims. Missing parses produce an error rather than an unchecked fallback.

Inference: VL could generate a named Verus lemma obligation from a parsed sentence and require a proof of that lemma before accepting an implementation. The paper does not show Rust or Verus code, so the emitted syntax and contract attachment are design inferences.

## technique 5: auditable certificates and trust boundaries
Typeclass search constructs an explicit parse term. “The typeclass machinery explicitly constructs a an instance of the typeclass — an element of the corresponding record type — and passes it to spec.” (Section 5, p. 13) An independent checker can inspect tokenization, grammar-rule instances, lexical meanings, and semantic types. The authors identify three added trust sources: grammar rules, lexicon well-formedness, and word definitions (Section 5, pp. 13–14). Type consistency is checked by Coq’s `interp` type, and the paper reports finding type errors in prior published lexicons (Section 5, p. 14).

Inference: for VL, a certificate should contain the original requirement, token sequence, selected lexical entries, generated Verus predicate, and a proof that the predicate was checked. This reduces silent translation drift but does not certify that the chosen English wording was complete.

## performance, extensions, and limits
The prototype sets a typeclass depth limit of 15 and parses “every natural is non-negative and some natural is even” in approximately 26 seconds on a four-core Intel Core i5 with 16 GB RAM (Section 3.5, pp. 10–11). The denominator is one sentence parse under that depth limit, so it is not a throughput benchmark. A partial Lean adaptation is expected to benefit from Lean’s typeclass algorithm (Section 1, p. 2). The core machinery generalizes beyond `Prop` to any Heyting algebra and therefore can target LTL, CTL, or BI-style separation logics embedded in a proof assistant (Section 4.4, p. 13).

The paper rejects neural translation as the primary trust path: “There is no guarantee a learned translation is sensible.” (Section 1, p. 2) It allows machine learning to rank proof-search derivations only if the successful parse still yields a complete auditable derivation (Section 6, p. 15). The prototype is a small fragment, and a broad lexicon, morphology, ambiguity policy, and domain-specific words remain open work (Sections 4 and 8).

What is checked is grammatical composition, denotation typing, and the resulting proof proposition. Trusted inputs remain lexical definitions, grammar-rule implementations, Coq/Lean kernels, and the human choice of sentence. Inference: threat to agent-written verified Rust is high at the requirements boundary and lower inside the kernel: a correct proof of a mistranslated sentence remains useless, while certificates make the translation inspectable. VL should add traceable requirement-to-contract artifacts and should not rely on an opaque language model to choose predicates.

## techniques for the catalog
- indexed categorial grammar — type-index grammatical categories so phrases refer to correctly typed program objects
- typeclass semantic parsing — encode grammar rules and lexical denotations as proof-assistant instances
- quantified coordination lifting — define polymorphic quantifiers and lift conjunction/disjunction through predicate functions
- executable specification goals — turn a parsed sentence into a proof-assistant proposition and goal
- parse certificates — retain tokenization, rule applications, lexical meanings, and type checks for independent audit

Checked 2026-10-15 against the paper by a Codex agent for natural_language_specifications_in_proof_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
