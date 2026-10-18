# Natural Language Specifications in Proof Assistants
(authored by agents unless marked 🧑)
Tag: `gordon2022naturallanguage`, [paper](https://arxiv.org/abs/2205.07811)

## problem and proposal
The paper addresses the informal-to-formal specification gap. “This is especially problematic when using proof assistants to formally verify the correctness of software with respect to a natural language specification.” (Abstract, p. 1) Its prototype parses a small, extensible fragment of English into Coq propositions using categorial grammar, dependent semantic types, and typeclass search. The user can write `Goal spec "addone is monotone".` and obtain a proof goal.

Inference: for VL, this suggests storing a machine-checked link between a requirement sentence and a Verus contract. The parser cannot establish that a human sentence expresses the intended product requirement; it can only make the translation explicit and checkable.

## technique 1: indexed categorial grammar
Categorial grammar assigns each word a category and combines adjacent categories with slash-elimination/composition rules. The paper adapts categories to Coq’s dependent types: `NP A` denotes an object of type A, `ADJ A` a predicate over A, and `S` a proposition. “Coq’s logic is expressive enough to give the set of grammatical types as a datatype Cat, and to give the interpretation of those types into semantic types as a recursive function interp within Coq, as shown in Figure 2.” (Section 3, p. 6)

Steps (Sections 3 and 3.2, pp. 5–8, with the type-checking point from Section 5, p. 14): (1) define `Cat` with sentence, noun phrase, adjective, common noun, and directional slash constructors; (2) define `interp` mapping categories to Coq types; (3) index noun phrases and adjectives by the referent type; (4) represent slash categories as semantic functions; (5) define combination rules as typeclass instances; (6) ensure each lexical denotation type-checks against its category. Per the paper’s discussion of “is”, the adjective or noun phrase must match the Coq type that the left-side noun phrase refers to (Section 3.2, p. 8).

Inference: in Verus, the semantic target could be a ghost proposition or a generated contract schema, but Verus does not have Coq typeclasses or dependent universe-indexed grammatical categories. A separate parser must emit ordinary Rust/Verus declarations and preserve the parse certificate.

## technique 2: typeclass-driven semantic parsing
The central implementation reuses Coq’s elaborator. “We propose using Coq’s typeclass support [86] to perform semantic parsing from natural language5 to Coq’s specification logic, or alternatively (see Section 4.4) embedded logics.” (Section 3, p. 5) A `Synth words category` class carries a `denote` field; each grammar rule is an instance. A `SynthLex` instance connects lexical entries to one-word parses.

Steps (Sections 3.1–3.3, pp. 7–10): (1) define `Synth` indexed by a word list and category; (2) encode slash-elimination and composition as instances; (3) define a `lexicon word category` class carrying a denotation; (4) add one instance per word sense; (5) define `Semantics string S` to tokenize and request a complete sentence parse; (6) define `spec` to return the denotation; (7) ask Coq to simplify the resulting proposition. The paper’s `is` has two entries—adjective application and equality—whose category determines which meaning is selected (Section 3.2, p. 8).

Inference: a VL tool could keep a lexical entry as a reviewed mapping from a phrase to a Verus predicate and emit a hashable derivation tree. The proof assistant’s type checker should validate the generated predicate’s type, while humans review ambiguous word senses.

## technique 3: quantifiers and polymorphic coordination
Quantifiers are higher-order lexical entries. “and another for the common noun ‘natural’ (number) allows correctly parsing sentences like” (Section 3.2.1, p. 9) The common noun constrains the quantified type; the quantifier’s denotation is `forall` over that type. Coordination is handled by a `Prop-like` class that recognizes sentence/adjective functions returning propositions and lifts conjunction/disjunction through nested slash types.

Steps (Sections 3.2.1–3.2.2, pp. 9–10): (1) define a quantified category `(S/(NP A\S)/CN A)`; (2) give “every” a denotation `forall (x:A), P x`; (3) give a common noun such as “natural” a lexicon entry that constrains A to the intended Coq type; (4) define a class recognizing categories whose semantic result is `Prop`; (5) lift `and` or `or` through each function layer; (6) let ordinary grammar rules combine the lifted predicates.

Inference: Verus specifications can encode universal and conjunctive contracts directly, but preserving natural-language scope requires the parser’s derivation to be stored with the generated `requires`/`ensures` clauses. Ambiguous quantifier scope should be rejected or presented for review.

## technique 4: specifications as executable proof goals
The prototype turns a string into a Coq proposition and uses it as a goal. “When invoked with a string s, Coq will search for an instance of Semantics s S — a parse of the string as a complete sentence.” (Section 3.3, p. 10) The examples produce `∀ x,y:N. x≤y ⇒ addone x≤addone y` and conjunctions of quantified and existential claims. If no `Semantics` instance is found, “the user sees an error” (Section 3.3, p. 10).

Inference: VL could generate a named Verus lemma obligation from a parsed sentence and require a proof of that lemma before accepting an implementation. The paper does not show Rust or Verus code, so the emitted syntax and contract attachment are design inferences.

## technique 5: auditable certificates and trust boundaries
Typeclass search constructs an explicit parse term. “The typeclass machinery explicitly constructs a an instance of the typeclass — an element of the corresponding record type — and passes it to spec.” (Section 5, p. 13) The explicit term “could be identified by an independent proof checker that wished to also validate the natural language interpretation” (Section 5, p. 13), and it encodes tokenization and the parse tree with references to lexicon instances. The authors identify three added trust sources: grammar rules, lexicon well-formedness, and word definitions (Section 5, pp. 13–14). Type consistency is checked by Coq’s `interp` type, and the paper reports type-related bugs in NLTK’s CCG implementation and inconsistent entries in the published lexicon of Dzifcak et al. [23] for temporal logic (Section 5, p. 14).

Inference: for VL, a certificate should contain the original requirement, token sequence, selected lexical entries, generated Verus predicate, and a proof that the predicate was checked. This reduces silent translation drift but does not certify that the chosen English wording was complete.

## performance, extensions, and limits
The prototype sets a typeclass depth limit of 15 and parses “every natural is non-negative and some natural is even” in approximately 26 seconds on a four-core Intel Core i5 with 16 GB RAM (Section 3.5, pp. 10–11). The denominator is one sentence parse under that depth limit, so it is not a throughput benchmark. The authors ported all machinery except string tokenization to Lean 4 and report that, with pre-tokenized inputs, compiling the formalization and parsing multiple examples “consistently takes less than 3.5 seconds” (Section 3.5, p. 11). The core machinery generalizes beyond `Prop` to any Heyting algebra and therefore can target LTL, CTL, or BI-style separation logics embedded in a proof assistant (Section 4.4, p. 13).

The paper rejects neural translation as the primary trust path: “There is no guarantee a learned translation is sensible” (Section 1, p. 2) It allows a narrow role for machine learning, learning search priorities over derivations, which the authors say could give gains “without compromising the categorial grammar properties relevant for formal specifications: a successful parse still yields a full derivation” (Section 6, p. 15). The prototype is a small fragment, and a broad core lexicon, grammatical features such as tense, case, and number, more grammatical constructions, and domain-specific words remain open work (Sections 4.2, 4.3, and 8).

The paper names the added trusted sources as the grammar rules, lexicon well-formedness, and lexicon word definitions (Section 5, p. 14). Inference: what is checked is grammatical composition, denotation typing, and the resulting proof proposition; trusted inputs also include the proof assistant kernel and the human choice of sentence. Inference: threat to agent-written verified Rust is high at the requirements boundary and lower inside the kernel: a correct proof of a mistranslated sentence remains useless, while certificates make the translation inspectable. VL should add traceable requirement-to-contract artifacts and should not rely on an opaque language model to choose predicates.

## techniques for the catalog
- indexed categorial grammar — type-index grammatical categories so phrases refer to correctly typed program objects
- typeclass semantic parsing — encode grammar rules and lexical denotations as proof-assistant instances
- quantified coordination lifting — define polymorphic quantifiers and lift conjunction/disjunction through predicate functions
- executable specification goals — turn a parsed sentence into a proof-assistant proposition and goal
- parse certificates — retain tokenization, rule applications, lexical meanings, and type checks for independent audit

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Instead, most costs come from exploring structural rule applications, particularly the rules for associativity and shifting of left and right slash type nesting, each of which may send search off into a dead end."): I read the whole paper text (arXiv 2205.07811v1, 18 pages plus references) and checked every quotation word for word, section and page references, the step lists of techniques 1-5, and the performance numbers (depth limit 15, about 26 seconds, 4-core Core i5, 16GB, Lean under 3.5 seconds). Changed: replaced the link with the arXiv page from the paper text; completed two truncated quotes (Section 3 p. 5 and Section 3 p. 6); removed "controlled" (the paper contrasts itself with controlled natural language), "unchecked fallback", "ambiguity policy", and "prior published lexicons" (the paper reports NLTK CCG bugs and one published lexicon, Dzifcak et al.); added the Lean 4 result with its caveats; fixed the step citation for type checking; marked my own conclusions "Inference:". Not checked: the reference list entries, the figures beyond their text, and the correctness of the Coq or Lean code, which I did not run.
