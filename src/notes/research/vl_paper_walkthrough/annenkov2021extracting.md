# Extracting smart contracts tested and verified in Coq
(authored by agents unless marked 🧑)
Tag: `annenkov2021extracting`, [paper](https://arxiv.org/abs/2012.09138)

## result and scope
The paper builds a Coq-to-functional-smart-contract pipeline in ConCert. Its abstract states: “We implement extraction of Coq programs to functional languages based on MetaCoq’s certified erasure.” (Abstract, p. 1.) The pipeline adds type erasure, an optimisation that removes unused arguments, and pretty-printers for Liquidity, Midlang, and Elm. It also integrates QuickChick testing over complete execution traces and presents Escrow and Boardroom Voting case studies.

Inference: for VeruLaw, the transferable pattern is to keep a verified source model, execute a testable model before proving expensive properties, and make every compilation or extraction pass carry a semantic-preservation theorem. The paper is about Coq and functional smart-contract languages, so the Rust/Verus mapping below is an inference.

## technique: certified erasure and extraction pipeline

What it is. Coq terms are translated to an untyped calculus in which computationally irrelevant types and proofs become a box. The authors separate this semantic erasure from later optimisation and printing. “Our implementation strategy of extraction is the following: (i) take a term and erase it and its dependencies recursively to get an environment; (ii) analyse the environment to find optimisable types and terms; (iii) optimise the environment in a consistent way; (iv) pretty-print the result in the target language syntax.” (Section 3, p. 6.)

When to use it. Use the pipeline when verified source code must become executable code in a restricted target language. The target restrictions matter: “Most of the smart contract languages do not offer a possibility to insert type coercions forcing the type checking to succeed.” (Section 3.1, p. 4.) Eager evaluation can also encounter an application of a box, and target languages may restrict recursive data types and recursion (Section 3.1, pp. 4–5).

How to do it.
1. Quote the Coq definitions and recursively erase the selected constant and only dependencies appearing in its erased definition (Section 3, pp. 6, 9).
2. Erase types separately. The type procedure classifies context entries as translated type variables, inductive information, or other; it returns prenex type variables and a boxed target type (Section 3, pp. 6–8).
3. Analyse the resulting environment for target-compatible types, constructors, and constants (Section 3, pp. 6–9).
4. Apply the verified optimisation below, adjust signatures, and pretty-print to a target syntax. For Liquidity, map Coq list and map functions to native primitives and add explicit numeric annotations; wrap option results so `None` invokes `failwith` (Section 3.2, pp. 12–13).
5. Reject programs that do not fit the target's type or recursion restrictions. The paper explicitly leaves target-language type formalisation out of scope and says the pipeline should "do our best to extract as many programs that pass type checking as possible or fail at the extraction stage" (Section 3.1, p. 4).

Verus form. Inference: define executable Rust functions and separate `spec fn` contracts, then prove a semantic relation between a source model and the executable implementation with `ensures`. Proof-only lemmas should be `proof fn`; they are erased before execution. A Rust-to-Rust lowering pass would need a model relation and proof obligations for every transformation; Verus cannot by itself verify an external pretty-printer or compiler unless that code is represented and specified in Verus.

Evidence and trust. MetaCoq certified erasure supplies the semantic basis; Theorem 2 says that for a well-typed axiom-free environment, an extracted constant evaluates to the same unerasable constructor. The exact statement is: “Let Σ be a well-typed axiom-free environment and let C be a constant in Σ. Let Σ0 be the environment produced by successful extraction (including optimisations) of C from Σ.” and concludes that equal evaluation holds (Theorem 2, p. 10). No benchmark denominator is given for all programs; the evidence is the theorem plus successful examples. The trusted computing base includes “Coq itself, the quote functionality of MetaCoq and the pretty-printing to target languages.” (Section 1, p. 2.) The paper states that “the pretty-printing step of the extracted environment is not verified” (Section 3, p. 10) and that the blockchain execution model “is part of the TCB” (Section 4, p. 14).

Failure and assumptions. Theorem 2 requires no axioms. Extracted types are not verified, and target type checkers may reject output. Pretty-printing correctness and semantic mismatches between λ□+ and targets remain trusted. Higher-kinded types and monadic type classes in Boardroom Voting are not prenex-polymorphic; the authors plan a verified pass that unfolds and reduces certain constants before extraction (Section 5, p. 16).

## technique: dearging (dead-argument optimisation)

What it is. Dearging removes parameters that do not occur in function bodies or constructor uses after erasure. The paper describes it as the equivalence “(λx. t) v ∼ t when x does not occur free in t” and says deboxing is the special case “(λA x. t) □ ∼ λx. t.” (Section 3, p. 8.)

When to use it. Use it after erasure when boxed type/proof parameters prevent direct remapping to target primitives or add execution cost. The paper notes that removing redundant computation decreases smart-contract gas consumption (Section 3, p. 5).

How to do it.
1. Analyse every function body in a linear pass, marking syntactic uses of constant parameters and constructor arguments; produce constant and inductive masks (Section 3, p. 8).
2. Apply `dearg` to terms, constants, and inductive definitions using those masks; remove matching top-level lambdas and adjust erased type signatures (Section 3, pp. 8–9).
3. Ensure occurrences are sufficiently η-expanded for the masks. The implementation certifies η-expansion and generates equality proofs (Section 3, p. 9).
4. Recheck mask validity: removed arguments must be closed and syntactically unused. The paper says the analysis currently does not prove mask validity; it rechecks the generated masks (Section 3, p. 9).

Verus form. Inference: an analogous Rust optimisation can remove proof-only ghost parameters or wrapper fields only after a proof that the executable result is unchanged. Encode the relation as a `spec fn` over input/output values and prove an `ensures` equality for old and optimised functions; use `assert` and `lemma`-style `proof fn` facts, not runtime calls. Verus has no direct Coq environment or η-expansion pass, so the transformation itself would need a separately verified representation.

Evidence and trust. Theorem 1 states: “Then Σ ` t . v implies dearg env (Σ) ` dearg(t) . dearg(v)” (Section 3, p. 9), preserving call-by-value results under closedness, validity, and expansion assumptions. The theorem is semantic evidence, not a performance measurement; the paper reports no gas numbers or percentage reduction. The analysis is trusted to find masks, while validity is rechecked rather than proven by the analysis.

Failure and assumptions. Syntactic analysis misses transitive dead arguments; the paper says iterations can improve this but are unnecessary for erased arguments (Section 3, p. 8). Cumulativity can leave boxes even when all logical arguments appear removable (Section 3, p. 10). Target type errors remain possible after optimisation.

## technique: refinement types for executable contracts

What it is. The counter example represents a positive integer as `{z : Z | 0 <? z}` and returns a state satisfying an ordering property through dependent pairs (Section 3, pp. 10–11). The `counter` function validates the input, constructs a proof of positivity using decidable equality, then calls functions whose dependent input guarantees the precondition.

How to do it. Define `storage`, a message datatype, and functions whose dependent result states the postcondition; validate each message; construct the proof-bearing pair; call the verified function; erase the proof component during extraction (Figure 3, p. 11). The extracted `sig` wrapper becomes a plain value in Liquidity or a one-constructor `Sig` in Midlang (Section 3.2–3.3, pp. 12–13).

Verus form. Inference: use a Rust integer with a `requires` positivity condition and an `ensures` ordering condition. A `spec fn` can express the mathematical relation; a `proof fn` can establish positivity after a branch on the runtime check. The executable function still receives an ordinary integer, so the validation branch remains runtime code; proof values are ghost facts rather than runtime dependent pairs.

Evidence and limits. The counter is extracted successfully to both targets (Figure 4, p. 12). The authors report successful extraction of counter variants, crowdfunding, and an interpreter to Liquidity (Section 3.2, p. 13), and successful extraction and Midlang compilation of the counter and escrow contracts (Section 3.3, p. 13); the paper adds that the escrow contract "requires more infrastructure for mapping the ConCert blockchain formalisation definitions to the corresponding Midlang primitives". These are qualitative case results; no denominator of attempted programs is supplied.

## technique: trace-level property-based testing

What it is. QuickChick generates inputs and tests executable properties, while ConCert supplies a chain state plus a proof-relevant execution trace. “Our development is the first to support testing on entire execution traces. This allows for testing properties of interacting smart contracts.” (Section 6, p. 17.)

How to do it.
1. State a decidable executable property, such as a theorem over `ChainBuilder` or a pre/postcondition on `receive` (Section 6, p. 17).
2. Supply specialised generators for contract messages rather than random payloads. The framework derives provably valid traces from these generators (Section 6, pp. 17–18).
3. Run QuickChick over 10,000 generated cases and inspect counterexamples. The simple square example reports “Passed 10000 tests (0 discards)” (Figure 5, p. 17).
4. For Escrow, generate commits, confirmations, and withdrawals with balance checks (Figure 6, p. 18), then test `escrow_correct_P`.

Verus form. Inference: Verus proves contracts, but it is not a property-based test generator. Keep a Rust model and use an external generator or fuzz harness to produce trace sequences; expose each generated trace to a Verus proof function only when the trace is represented in the verified model. Use the tests to find false specifications or implementation bugs before attempting the full proof.

Evidence. Escrow testing reports “Passed 10000 tests (23743 discards)” (Section 6.1, p. 18); the denominator is 10,000 executed tests, with 23,743 generated cases discarded. The authors report that after they manually insert a bug where the withdrawable amount is calculated differently, QuickChick immediately reports a counterexample and that they used the testing framework to discover DAO re-entrancy, Lendf.me token-exchange re-entrancy, and an iToken self-transfer minting bug (Section 6.1, p. 18). These tests do not prove universal correctness.

## verified contract properties and trusted remainder

Escrow correctness is a trace theorem: if the buyer confirms, buyer and seller net effects are respectively −x and x; otherwise both are zero (Theorem 3, p. 14). The theorem assumes both parties follow the protocol and relies on the blockchain execution model, which the paper says is part of the TCB; the authors have “no formal proof that Theorem 3 translates to the version produced by extraction” (Section 4, p. 14). Boardroom Voting proves that an accepted tally equals the sum of private votes, assuming all messages came from the specified message constructors (Theorem 4, pp. 15–16). Incorrect zero-knowledge proofs are not formally shown impossible because that is probabilistic and better suited to EasyCrypt (Section 5, p. 15).

Inference: threat to a product that generates agent-written verified Rust is medium. The useful pattern is explicit executable models, trace properties, and verified optimisation boundaries. The main risk is trust leakage at code generation, external libraries, target semantics, cryptographic assumptions, and environment models. An agent can produce a plausible proof while leaving these boundaries unmodelled; requiring a checked source-to-binary relation would reduce this risk.

The paper already covers certified erasure, dead-argument removal, refinement-style specifications, trace-level generators, and two contract case studies. Inference: VL should not redo a generic extraction pipeline as if these ideas were new; it should adapt the boundary-accounting and trace-generation ideas to Rust/Verus and measure maintenance or failure modes that this paper does not measure.

## techniques for the catalog

- certified erasure pipeline — recursively erase verified source terms, analyse dependencies, optimise, and pretty-print while proving semantic preservation up to the trusted printer
- dearging — analyse unused parameters and constructor fields, remove them with masks, and prove call-by-value results are unchanged
- refinement-style contract specifications — encode preconditions and postconditions in dependent data and erase proof components for execution
- trace-level QuickChick testing — generate valid interacting-contract traces and test decidable global properties before or alongside proofs
- explicit trust accounting — separate verified erasure and optimisation from unverified type extraction, pretty-printing, execution models, and probabilistic cryptographic claims
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Instead, we focus on proving the logic of the smart contract correct under the assumption that both parties follow the protocol to completion."): read the whole paper text (pp. 1-25, including appendices and references) and checked every quotation, theorem statement, section and page reference, the figure numbers, the 10000 tests / 23743 discards figures, and each technique step against it; changed the link to the arXiv page (arXiv:2012.09138v2 is printed on the paper's first page; the previous DOI is not in the paper text), corrected two page references (type-formalisation scope is p. 4; the higher-kinded-types discussion is p. 16), reworded the trusted-base sentence, the validation, escrow-compilation and bug-insertion statements, and the vulnerability-discovery claim to follow the paper's wording; did not check the Verus and VeruLaw inferences against any Verus documentation, the cited artifact code, or the extracted code in the appendices line by line.
