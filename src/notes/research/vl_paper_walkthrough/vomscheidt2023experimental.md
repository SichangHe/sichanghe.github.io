# Experimental results from applying GPT-4 to an unpublished formal language
(authored by agents unless marked 🧑)
Tag: `vomscheidt2023experimental`, [paper](http://arxiv.org/abs/2305.12196v1)

## what the paper tested

Inference: This paper tests whether a general language model can operate in a new formal language from a compact natural-language specification. The abstract says GPT-4 was “provided with a concise natural language specification for a previously unpublished formal system and asked to complete a number of tasks, from stating function and type definitions to proving simple theorems and verifying user-supplied proofs.” (Abstract, p. 1) The system is Axiotome; the paper says using a new system “guaranteed that no information about it, and in particular no examples of definitions and theorems stated in it, could have previously seen by the large language model as part of its training data.” (Section 1.4, p. 2) Inference: that guarantee is the author's claim about training data, which this paper does not test.

Inference: The experiment used one turn-by-turn ChatGPT web-interface session. The first prompt contained the complete syntax and semantics summary plus the first task; later requests did not repeat the specification (Section 1.5, p. 2). Nine tasks were reported: disjunction, polymorphic conditional, De Morgan's first law, error identification, nested-case theorem checking, conjunction commutativity, triple negation, natural-number types, and polymorphic-list types (Table 1, p. 13). All were marked correct except De Morgan's proof, marked “Mostly Correct” because one justification was omitted in every case (Sections 3.3 and 4, pp. 6–14).

## technique: give a compact formal-language specification and ask for definitions

Inference: Use this when a prover or coding agent must work in a language with no learned library examples. Include lexical rules, type constructors, term syntax, function-definition forms, theorem syntax, and at least one worked example. The supplied Axiotome specification defines product and sum types, terms as nested `opcode(arg0, arg1, ...)`, equational and formulaic functions, and proof-by-case syntax (Section 2, pp. 2–4).

Inference: The application procedure is: (1) state the language grammar and semantics in natural language; (2) show representative definitions, such as `function and(a: Boolean, b: Boolean) : Boolean allowing ...`; (3) request one new definition; (4) inspect syntax and semantics separately; (5) feed later tasks the definitions generated earlier. GPT-4's disjunction answer used four axioms, each equating an `or` term over constants with a result: `or(False, False)` with `False`, and `or(False, True)`, `or(True, False)`, `or(True, True)` each with `True` (Section 3.1, p. 4; the equivalence symbol is lost in the text extraction).

Evidence: The review says, “GPT-4 generated a correct definition for a not-before seen function, using the correct syntax of the formal system.” (Section 3.1, p. 5) It also notes that the model inferred the idiomatic identifier `or`, adapted axiom names, and correctly understood that all four Boolean combinations define the operation (Section 3.1, pp. 4–5). This is one qualitative result, not a rate over many prompts.

Verus form (Inference): Supply a short project-specific Verus primer with valid `spec fn`, `requires`, `ensures`, `invariant`, and proof-function examples, then ask for a small contract or lemma. Unlike Axiotome, Verus has executable Rust plus specifications and proof code; a generated answer must be compiled by Verus. Keep the language summary synchronized with the actual tool version. The paper's success does not show that an uncompiled Verus answer is correct.

## technique: use context to infer idioms and polymorphism

Inference: After showing a monomorphic Boolean function, ask for an analogous generic operation and let the model transfer conventions. For conditional branching, the prompt requested an equational ternary `if`; GPT-4 produced a polymorphic definition with a type parameter: `function if[A](condition: Boolean, trueBranch: A, falseBranch: A) : A`, plus `§if°True` and `§if°False` equations (Section 3.2, p. 5).

Inference: The steps are: provide the existing Boolean and function examples; state the new operation in ordinary words; check the type parameter, argument types, result type, and each equation; then use the definition in later prompts. The paper's review reports that the model inferred Axiotome context, introduced `A` without being asked, selected descriptive argument names, and matched axiom naming conventions (Section 3.2, pp. 5–6).

Verus form (Inference): Ask for a generic Rust function with a contract parameterized by a type whose relevant mathematical properties are explicit. Verus generics require bounds and proof obligations that Axiotome's simple polymorphism does not; generated code must state those bounds and compile. Treat names and comments as suggestions until the verifier checks them.

## technique: prove finite theorems by explicit case analysis

Inference: Use exhaustive cases when the datatype is finite and the specification supplies constructor equations. For De Morgan's law, GPT-4 quantified over two Booleans and generated four cases FF, FT, TF, and TT. In each case it introduced constants, rewrote with `and` and `not` axioms, rewrote toward `or`, and eliminated the constants (Section 3.3, pp. 6–7).

Inference: The paper records three syntax inventions needed for the two-variable proof: “using a pair of variables, enclosed in parentheses, in the proof-by-cases commencement expression”; paired quantifiers in each case opener; and paired quantifiers in justifications (Section 3.3, p. 7). A reusable procedure is therefore: enumerate the Cartesian product of constructors, state the case premise, normalize with available equations, and close by reintroducing the quantified variables.

Evidence and failure: The paper says the transition from step 3 to steps 4 and 5 “consistently omits the use of a disjunction axiom as a justification step”, in every case (Section 3.3, p. 8). Its corrected first case adds `4. or(True, True) via §or°TT` with the comment “// <— missing”, and moves the `(§not°F, §not°F)` justification to a rewritten step 5 (Section 3.3, p. 8). The paper also notes that each case still reaches its conclusion and that the conclusions are correct (Section 3.3, p. 8). Inference: this is direct evidence that fluent-looking proof traces can omit a required kernel step; a checker must reject or expose the omission.

Verus form (Inference): Use a `proof fn` with `requires` for Boolean-domain assumptions and split on finite values with `if` branches or match-style reasoning supported by the project. Establish each rewrite as a lemma and finish with `ensures`; do not call a proof function from runtime code. Verus's syntax and solver behavior differ from Axiotome, so the exact case syntax must be validated against the installed Verus version.

## technique: ask the model to audit an existing proof

Inference: A useful workflow is to present a theorem and proof containing one deliberately wrong justification, then request diagnosis and repair. The paper's prompt used `not(not(False))` equivalent to `False` and incorrectly justified the first rewrite with `§not°T`; GPT-4 identified that `§not°F` was required and returned the corrected proof (Section 3.4, p. 8).

Inference: Apply it as: provide the complete theorem and numbered steps; request the first invalid step and the reason; require a corrected complete proof; independently run the formal checker. The review says GPT-4 “correctly identified that the proof had an error and correctly characterised the nature of the error.” (Section 3.4, p. 8)

Verus form (Inference): Feed a Verus function and failing diagnostic to the model, ask it to identify the first unsatisfied obligation, and require a patch plus a proof explanation. Compile the patch and inspect that it does not weaken the contract or introduce unsupported admissions. A proof assistant's diagnostics, rather than the model's explanation, are the acceptance criterion.

## technique: retain conversational definitions across related tasks

Inference: Keep the formal-language description and generated definitions in context, then ask for progressively related theorems. GPT-4 first checked nested cases for commutativity of `or`, then generated an analogous nested-case proof for `and`, and then a quantified triple-negation theorem (Sections 3.5–3.7, pp. 9–12). The review says the model “had no difficulties switching from the ‘invocation style’ syntax ... to the ‘infix operator style’ prevalent in mathematical notation.” (Section 3.5, p. 10)

Inference: The steps are: establish constructors and equations; ask for one theorem; ask for a structurally analogous theorem; vary quantification or nesting; compare whether names, case structure, and available axioms remain consistent. This probes context retention, but it also risks compounding an earlier hallucinated definition.

Verus form (Inference): Maintain a bounded context containing the current Rust module, contracts, and verified lemmas. Have the agent propose one change at a time and run Verus after each. Context length and stale lemmas remain practical limits; unlike the paper's web session, a product should preserve machine-readable source and compiler diagnostics.

## technique: generate inductive and polymorphic type definitions

Inference: Ask for algebraic datatypes after explaining product and sum syntax. GPT-4 defined naturals as `Zero`, `Successor[n: NaturalNumber]`, and `NaturalNumber ≡ Sum[Zero, Successor]` (Section 3.8, p. 12), then defined lists as `Nil[A]`, `Prepend[A]` with `head: A` and `tail: List[A]`, and `List[A] ≡ Sum[Nil[A], Prepend[A]]` (Section 3.9, pp. 12–13).

Evidence: The reviews mark both tasks correct and say the definitions were “syntactically, idiomatically and semantically correct” (Sections 3.8–3.9, pp. 12–13). Inference: these are examples of transferring type-theory knowledge into an unseen notation, not machine-checked outputs; the report does not describe an Axiotome interpreter run.

Verus form (Inference): Represent recursive data with Rust enums or structs and state recursive invariants in `spec fn`s. Prove constructor and destructor properties with `proof fn`s and `ensures`. Ensure recursive specifications terminate under Verus's rules. Axiotome's sum/product notation maps conceptually to enums/structs, but the generated Rust must satisfy ownership and termination checks.

## techniques for the catalog

- Inference: compact language specification — provide grammar, semantics, and worked examples before requesting formal code
- Inference: contextual idiom transfer — let the model infer names, polymorphism, and notation from nearby examples
- Inference: exhaustive finite case proofs — enumerate constructor combinations and rewrite each case to the target
- Inference: proof auditing and repair — present a faulty derivation, require diagnosis, correction, and independent checking
- Inference: conversational theorem sequencing — retain verified definitions while requesting analogous later theorems
- Inference: inductive type synthesis — generate sum/product and recursive type definitions from a short specification
