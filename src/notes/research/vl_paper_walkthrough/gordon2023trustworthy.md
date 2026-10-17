# Trustworthy Formal Natural Language Specifications
(authored by agents unless marked 🧑)
Tag: `gordon2023trustworthy`, [paper](https://doi.org/10.1145/3622758.3622890)

## scope and core claim
Inference: The paper addresses a specific trust gap: a proof assistant can check a formal theorem while the formal theorem may mistranslate the natural-language requirement. It embeds a categorial grammar in an early version of Lean 4 (with some discussion of a parallel Coq prototype), so parsing and denotation produce a proof-assistant term and an inspectable certificate.

> “However, this only validates truth of a formal claim, which may have been mistranslated from a claim made in natural language.” (Abstract, p. 50)

> “Our approach is extensible (placing no permanent restrictions on grammatical structure), modular (allowing information about new words to be distributed alongside libraries), and produces proof certificates explaining how each word was interpreted and how the sentence’s structure was used to compute the meaning.” (Abstract, p. 50)

## technique: typed categorial grammar as a specification parser
Inference: Use a lexicon whose entries map words to grammatical categories and denotations. Base categories include sentence `S`, noun phrase `NP`, adjective `ADJ`, common noun `CN`, and directional slash categories `A/B` and `A\B`. The interpretation function maps `S` to `Prop`, `NP` to an entity type, and slash categories to functions. Grammar-combination rules simultaneously build a parse tree and compose denotations.

> “The core idea is to build a sort of substructural type theory where base types correspond to grammatical categories (hence categorial), from which more complex grammatical categories can be defined.” (Sec. 2.1, p. 51)

Inference: Steps: (1) declare `Cat` and `interp`; (2) add `lexicon` instances for each word, with a category and denotation; (3) encode elimination/composition rules as typeclass instances; (4) invoke `pspec` on a tree of words; (5) let Lean’s kernel check the resulting proposition. The example `addone is monotone` reduces to a universally quantified inequality claim.

> “When invoked with a tree of strings s, Lean will search for an instance of Synth s S — a parse of the string tree as a complete sentence.” (Sec. 3.3, p. 57)

Inference: For VL, this gives a mechanical way to retain the natural-language requirement beside a Verus predicate: use a typed grammar or restricted DSL whose denotation is a Verus/SMT proposition, and retain the derivation as an audit artifact. Verus does not execute Lean typeclass search.

## technique: polymorphic lexical meanings and quantifiers
Inference: A word can have multiple category-indexed meanings. The paper defines “is” both as adjective application and equality, and gives quantifiers a category that first consumes a common noun and then a sentence fragment. Adjectives are predicates over the noun type; “every natural is even” therefore becomes `∀ n : Nat, even n`.

> “Lean permits declaring multiple instances for the same word (e.g., if a word has multiple meanings of different grammatical types), giving essentially a free variant of intersection types” (Sec. 3.2, p. 56)

Inference: Apply this to specifications by making domain and predicate types explicit in the lexicon, preventing a word such as “resource” from silently changing its mathematical sort. Require a unique parse or surface ambiguity for review; do not accept the first parse as meaning. The paper’s Lean prototype does not do this yet:

> “while we have not implemented ambiguity detection, ambiguities cannot be caught if they are intentionally not modeled.” (Sec. 7.2, p. 63)

## technique: executable proof certificates and trust auditing
Inference: Typeclass resolution constructs a `Synth` instance containing the grammar proof and passes that instance to `pspec`; the compiled term therefore records the word interpretations and rule applications. The paper identifies the trusted components as grammar rules, lexicon well-formedness, and word definitions, and discusses attacks through redefined `Synth` instances, ambiguous lexicon entries, and misdefined words.

> “The typeclass machinery explicitly constructs an instance of the typeclass — an element of the corresponding record type — and passes it to pspec.” (Sec. 5, p. 60)

> “These possible forms of attack highlight the main sources of trust added when considering natural language specifications in the approach we describe: the grammatical rules for combining phrases, well-formedness of the lexicon, and the definitions of words in the lexicon.” (Sec. 5, p. 60)

Inference: Steps for an audit: check each lexicon denotation has the declared `interp` type; check grammar instances preserve the intended rules; detect multiple derivations with different semantics; record the chosen derivation; and prove a bridge lemma if the expert’s manually written predicate differs from the parsed predicate. This maps directly to VL’s need to audit agent-written `requires`/`ensures` against a prose requirement.

## technique: controlling parser search
Inference: Naive binary-tree parsing explores Catalan-many associations. The implementation uses difference-list spans, numeric start/end indices, Lean tabled resolution (memoization), normal-form derivation pruning, a bound on coordinator lifting, and Lean’s heartbeat timeout. These are engineering controls, not changes to the logical meaning.

> “The direct implementation approach described above becomes quite slow for sentences over a few words, so we apply a number of optimizations, all well-established in the computational linguistics literature.” (Sec. 3.4, p. 57)

> “We exploit several classic optimizations from work on parsing natural langauges with Prolog.” (Sec. 3.4, p. 57)

Inference: For a VL specification DSL, impose a bounded grammar and explicit timeout; a timeout must be reported as “unparsed,” never treated as a proof. Difference-list style indexing is useful if requirements are parsed repeatedly in a build.

## evidence and measurements
The case study (Sec. 6, Table 1) takes 10 Verified Functional Algorithms specifications: 5 from Chapter 2 (sorting, list properties) and 5 from Chapter 3 (multisets). All five Chapter 2 specifications are translated to logically equivalent formal statements, four of them α-equivalent; for row 5 the generated statement has an extra existential quantifier because of the article “a”. Lean does not synthesize row 8, although the authors say its explicitly provided entries give α-equivalent semantics. One further Chapter 3 specification (“multisets in a nested union can be swapped”) is not translated.

> “For Chapter 2, we have translated all five specifications from English into formal specifications that are logically equivalent (for 4/5, α-equivalent) to the hand-written specifications from the textbook.” (Sec. 6, p. 61)

> “Lean fails to produce a Synth instance for either of those 1-word spans of the sentence at a grammatical category matching the lexicon entry declaration.” (Sec. 6, p. 62)

Reported times (Table 1, p. 61) are 6 s, 5.32 s, 7.4 s, 1.84 s, 5.72 s for rows 1–5 and 1.27 s, 1.24 s, 1.27 s, 7.18 s for rows 6, 7, 9, 10 (row 8 has no time). They are whole `lake build` times for one file on a 2020 1.4GHz MacBook Pro with 16 GB of RAM, including process start-up (Sec. 6, p. 62). Separately, on “a relatively old 4-core machine from 2015”, most specifications parse within the first author’s reaction time, with Lean “never exceeding 25% of a single core during parsing, with 2.6GB of memory consumed” (Sec. 3.3, p. 57).

Inference: The denominator is 10 specifications, not a corpus-wide accuracy claim; the experiment measures successful translation after adding lexicon entries and rewording some English, not proof completion. The paper reports no independent human-translation error rate. The case study is a feasibility demonstration, not an accuracy benchmark.

## limits and VL threat
The prototype covers a small English fragment; the paper names true ambiguity (e.g., quantifier scope), misdefined words, and universe-size problems for polymorphic specifications in later VFA chapters as open issues. The authors reject machine-learning autoformalization for this purpose partly because:

> “few machine learning approaches produce an auditable trail of evidence for why that translation was produced by the trained model, and no way to precisely fix misunderstandings of specific words.” (Sec. 1, p. 51)

Inference: The lexicon and grammar remain trusted unless independently checked. VL should reuse typed denotation, derivation certificates, ambiguity reporting, and bridge lemmas; it should not redo generic English parsing. Threat to an agent-written verified Rust product is high at the requirements boundary: a sound Verus proof of the wrong predicate is still a product failure. The approach reduces this threat only when the lexicon, grammar, and human-readable bridge are reviewed.

## techniques for the catalog

- categorial grammar denotation — parse natural-language specification fragments into typed logical forms inside the proof assistant
- modular typed lexicon — attach category and denotation to each word, with polymorphic quantifiers and overloaded meanings
- proof-carrying semantic parse — retain the typeclass derivation showing how words and grammar rules produced the proposition
- ambiguity and trust audit — check lexicon types, competing parses, grammar rules, and bridge lemmas before trusting a theorem
- parser search controls — use span representations, memoization, normal forms, bounds, and timeouts to make parsing interactive
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "This explicit term persists into the compiled forms Lean already produces, and could be identified by an independent proof checker that wished to also validate the natural language interpretation."): checked every quotation word for word, every number, section and page reference, and the technique steps against the whole paper text including references; changed Abstract page references from p. 1 to p. 50, completed the truncated Sec. 3.2 quote, fixed `A\\B` to `A\B`, corrected that typeclass resolution passes the instance (not its denotation) to pspec, corrected the evidence section (row 8 is not synthesized by Lean and has no time, one Chapter 3 specification is untranslated, row 5 has an extra existential, timing machine differs from the 25%/2.6GB machine), added quotes on missing ambiguity detection and on the machine-learning objection, and removed an unsupported sentence claiming the paper has no contradictory percentages and a repeated recommendation; did not check the Lean artifact, the cited works, or the PDF figures beyond the text extraction.
