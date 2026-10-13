# Verifying Verus: a partial Lean model of expression translation
(authored by agents unless marked 🧑)

## Paper and reading boundary

Shuge Rong, *Verifying Verus: A Lean 4 Formalization of the SST-to-AIR Expression Translation*, Carnegie Mellon University master's thesis, May 2026. [Primary PDF](https://www.andrew.cmu.edu/user/avigad/Students/rong_ms_thesis.pdf), [formalization](https://github.com/SSSPigeon/SST2AIR-in-Lean), [SSD1 PDF](/ssd1/sichangheagent/vlpw/verifying_verus.pdf), [text](/ssd1/sichangheagent/vlpw/verifying_verus.txt). References below use printed pages; the PDF page is one higher after the title page.

This adds implementation and completion detail to the [existing Verus overview](../topic_studies/formal_verification_rust/rust_verifiers/verus.md). The artifact has not been independently built or audited.

## Central lesson for VL

This is useful infrastructure for checking Verus's translation, with unfinished correctness proofs. It should not be cited as a completed verified compiler pass. The author states (§4.4.4, printed p. 54): “The mechanized proof of the theorem is left to future work.” The conclusion (§5, p. 55) also says: “we stated, but have not proved, on the SST side, preservation and soundness of the interpreter relative to the denotational semantics” Those statements qualify the more optimistic abstract and intermediate prose.

Agent inference: a proof-producing backend proves the translated formula. To make that evidence cover original Rust, VL must also account for translation correctness and the exact supported fragment. This thesis begins that work; it does not close it.

## What it models

SST is Verus's Statement-oriented Syntax Tree. AIR is its Assertion Intermediate Representation, the last language-specific representation before SMT-LIB queries. §2.1, p. 11: “In this thesis we restrict attention to the expression fragment. Furthermore, we consider only expressions that arise in ghost mode (spec and proof mode).” Assignments, assertions, assumptions, loops, and side-effecting calls are outside this fragment.

The development defines source syntax, typing and mathematical meaning; an interpreter-like reduction relation; AIR as many-sorted first-order logic; and a Lean translation function that returns a term or formula plus accumulated axioms. §4.1.2, p. 39, identifies the implemented Verus function exp_to_expr and the model function trans_exp.

The declared syntax is broader than the implemented meanings and translations. §5.1, p. 56, says: “Struct and enum constructors and field projections are present in the syntax but their denotational semantics and translation are stubbed out” It also says that semantics and translation of functions and applications “are not discussed at the current stage.” Arrays have explanatory translation examples, but AIR's ARRAY_INDEX and ARRAY_NEW symbols are absent in the formal signature (same page). Do not count a constructor appearing in syntax as a fully verified feature.

## Formal techniques to retain

1. **Separate source syntax, typing, and meaning.** §2.4, pp. 16–19, gives types semantic domains, environments for type parameters and variables, and an expression interpretation indexed by a typing derivation. Mathematical integers map to Lean Int, naturals to Nat, and characters to Char. Floating-point types use UInt32/UInt64 bit patterns (§2.4, p. 17); this is representation modeling, not a proved account of all floating-point operations. More complex domains go through dom_aux.

2. **Make variable substitution explicit.** §2.5.3, p. 24: “We use de Bruijn indices for variables to make it easier to implement capture-avoiding substitution.” The development adapts Autosubst's parallel substitution discipline from Rocq to Lean. Binder substitution shifts indices rather than relying on informal renaming. Agent inference: this matters for any agent-assisted formalization that introduces lambdas, lets, and quantifiers; superficially plausible variable names can conceal capture bugs.

3. **Give computation-based proofs an independent semantic obligation.** §2.5, pp. 20–27, models the symbolic interpreter, closures, function unfolding, and unreduced expressions. §2.5.4, p. 26, presents preservation and reduction soundness. Soundness needs the interpreter's symbol table and mathematical variable valuation to agree. The conclusion confirms those theorems are unproved. Agent recommendation: distinguish evaluating a closed expression from proving that the evaluator preserves the intended meaning; record the evaluator as trusted until the proof is complete.

4. **Use a typed first-order target language.** §3, pp. 28–37, instantiates the Many-Sorted-Model-Theory library with AIR sorts, symbols, models, and satisfaction. A model assigns meanings to symbols and satisfies the declared axioms. This avoids reducing translation correctness to textual resemblance between formulas.

5. **Represent booleans as either terms or propositions, and handle the crossing explicitly.** §4.4.1, pp. 47–48, defines translated-result equivalence: term equality, proposition equivalence, or equivalence between a Boolean term equaling true and a proposition. Mismatched unsupported forms yield false. The printed Lean definition has `have hty : s1 = s2 := by sorry` (p. 48). Agent inference: even a helper definition contains a visible unfinished proof obligation; a displayed Lean declaration is not evidence of kernel-checked completion.

6. **Accumulate auxiliary axioms along with the translated expression.** §4.1, p. 38: “We model this by threading an axiom set through the translation” The result depends on both fixed prelude axioms and expression-generated axioms. For a polymorphic variable, a has_type axiom constrains its representation. Agent recommendation: preserve the axiom set in provenance records; a target formula without its assumptions is incomplete evidence.

7. **Encode richer source types into fewer target sorts with guards.** §4.1.1, p. 39, maps numeric types to Int and type parameters to Poly; arrays and spec functions are intended to use Fun. §4.1.2, p. 42, describes quantifier guards because AIR's target sort may contain values outside the source domain, such as negative integers outside Nat. Agent inference: dropping such a guard can silently change the statement even if a solver finds a proof.

8. **Handle polymorphism through explicit type arguments and boxing.** §4.3, pp. 44–46, describes type-argument encoding into a monomorphic logic. Poly holds boxed values; TYPE carries type identifiers; concrete wrappers box inputs and unbox outputs. §4.2, pp. 43–44, supplies round-trip axioms and type membership conditions. The inverse direction requires the relevant has_type premise. This is not unconditional identification of every Poly value with every source type.

9. **Relate source and target valuations through an encoding function.** §4.4.2, p. 48, defines Poly as a dependent pair of a type-parameter name and a value of that type. §4.4.3, pp. 49–50, requires each translated variable to equal the encoding of its source value. This coherence condition makes the same inputs precise across different semantic domains.

10. **Prove axiom consistency by constructing a model.** The prelude gives arithmetic wrappers their arithmetic meanings and supplies boxing laws. §5.2, p. 57, calls for concrete interpretations of Fun and TYPE and the remaining axioms. Agent inference: proving equivalence under an inconsistent axiom set is vacuous. A translation proof should establish a suitable model exists and preserves source meaning, not merely assume arbitrary axioms.

## The proposed theorem and its unfinished scope

§4.4.4, printed p. 51, states that if translations are “semantically equivalent in all AIR models that satisfy the relevant axioms, then the original SST expressions are denotationally equal.” Its conditions include typing, coherent valuations, and satisfaction of accumulated axioms. The Lean statement on pp. 53–54 universally quantifies target models and coherent assignments; it is stronger and more precise than saying one solver run returned success.

Representative argument cases cover Boolean expressions, integer constants and addition, and polymorphic variables (§5.1, p. 56). The general mechanized theorem is incomplete. The printed proof sketch contains informal steps and omitted cases; the study does not independently validate that sketch.

Remaining boundaries in §5.1–§5.2, pp. 55–57:

- source statements; mutable-borrow forms; old-state snapshots; fuel constants; interpreter values; and type decorations
- concrete semantics and translations for structs, enums, functions, and applications
- concrete Fun and TYPE domains; array operations; bitvector axioms; and decoration predicates
- interpreter preservation and semantic soundness
- a complete translation soundness proof
- correspondence to the actual Rust implementation of the pass and the other pipeline stages

The thesis reports no comparative benchmark or full-program success rate. Its evidence is formalization structure and selected proof cases, not empirical agent automation.

## What VL can learn; what was already done

Agent recommendations: record which translation stages remain trusted; retain source/target valuation coherence and domain guards in any translation audit; report axiom provenance and unfinished proof obligations explicitly. Use the thesis's syntax, semantic domains, and first-order model infrastructure as starting material if VL later investigates checked translations. Checking the current artifact would be a separate task.

The work follows established compiler-verification practice, citing CompCert and CakeML (§5.2, p. 57). It does not invent the need for semantic preservation. Its concrete contribution is a Lean formulation of a real Verus expression-translation fragment. It is complementary to VerusBelt's API semantics: neither paper establishes the complete implemented Rust-to-SMT-to-executable chain.

## Product threat

Agent inference: little direct substitution for VL's proposed autonomous Verus generation. The thesis supplies no agent pipeline, inferred user intent, or repository proof-generation results. Its significance is assurance competition: a product may eventually promise a smaller trusted translation boundary using this line of work. Today, citing this thesis as evidence that Verus itself is fully verified would overstate the source. VL's existing requirement that verifier success be accompanied by semantic adequacy and provenance remains necessary.

## First reading

Read §5.1, printed pp. 55–56, before the theorem statement. Ask: which declarations are syntax, which have a concrete meaning, and which correctness proofs are complete?

## Study status

Checked the material claims and quotations against the saved primary paper text. An independent reviewer checked the drafts against the primary texts. No artifact execution or empirical reproduction was performed.

ChatGPT cross-check completed on 2026-10-12; the checked additions are recorded above. No artifact execution or independent Lean build was performed.

## ChatGPT cross-check (2026-10-12)

The complete ChatGPT answer was checked against `verifying_verus.txt`. These additions hold:

- the thesis abstract claims “we are able to prove in this framework the interpreter sound and type-preserving” (abstract, p. 1), while §2.5.4 says “The mechanization of the two theorems are left to future work” (p. 27); this is an internal completion-status contradiction
- the central result is unfinished: “The mechanized proof of the theorem is left to future work” (§4.4.4, p. 54)
- the written interpreter says equality is “decided syntactically on fully reduced expressions” (§2.5.2, p. 22), and its residual-array rule says “Otherwise, the simplified array indexing expression is returned” (same page); the answer correctly flags possible overlap and a symbolic-variable counterexample, but these are semantic analysis of the displayed rules, not an artifact audit
- the scope remains restricted: `dom_aux` is abstract (§2.4, p. 17), and the conclusion says “the denotational semantics and translation of functions and function applications are not discussed at the current stage” (§5.1, p. 55)
- the thesis conclusion says “we stated, but have not proved, on the SST side, preservation and soundness of the interpreter relative to the denotational semantics” (§5.2, p. 57)

The answer's potential counterexamples and threat ratings are its analysis; I did not independently build the Lean artifact. No existing study claim was contradicted beyond the already documented unfinished-proof status.
