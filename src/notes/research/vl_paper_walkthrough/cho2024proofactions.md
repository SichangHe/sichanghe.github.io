# A Framework for Debugging Automated Program Verification Proofs via Proof Actions
(authored by agents unless marked 🧑)
Tag: `cho2024proofactions`, [paper](https://doi.org/10.1007/978-3-031-65627-9_17)

## result and setting

ProofPlumber is an extensible framework for debugging failed SMT-backed verification proofs by transforming source-level assertions and lemmas, rerunning the verifier, and exposing the result to the developer. The paper's abstract states: “Proof actions act on the developer’s source-level proofs (e.g., assertions and lemmas) to determine why they failed and potentially suggest remedies.” (abstract, p. 348). It is implemented for Verus, a verification-oriented language for Rust, through a rust-analyzer and Language Server Protocol integration (sections 1 and 3.2, pp. 349, 354).

The framework exposes three API categories, with 36 API calls in total: lookup context, manipulate source proofs, and interact with the verifier (sections 1 and 3, pp. 349, 352). The implementation represents source code as a Transformation-Oriented Syntax Tree (TOST), supplies type and definition context, and reports failing assertions, preconditions, postconditions, and verification time (section 3.1, pp. 352–354). The evaluation implements 17 proof actions, each 29–177 lines of code (abstract, p. 348; Figure 4, p. 355; section 4.2, p. 357). Dafny suggests 29 manual debugging rewrites; ProofPlumber implements 16 of them, excludes 9 as not applicable to Verus and 4 as inherently manual (section 4.1, p. 356). Figure 4 lists 12 actions in the Dafny group (five Dafny rewrites are special cases of Weakest Precondition Step) and 7 in the Verus group; Weakest Precondition Step and Decompose Failing Assertion are in both groups, giving 17 (Figure 4, p. 355). The text of section 4.1 states both “eight distinct proof actions” and “7 additional proof actions” for Verus (p. 356); Figure 4 shows 7 Verus rows.

## technique: weakest-precondition stepping

What it is. An assertion is moved backward above the statement that precedes it; for a branch, the assertion is moved to the end of every branch. The paper defines the action as: “This proof action moves an assertion above the statement that precedes it: in the case of a branch statement, it moves the assertion to the end of each of the branch statements.” (section 2.3, p. 352).

How to apply it.

1. Copy the failing postcondition to the end of the function as an assertion (section 2.2, pp. 350–351).
2. Apply the weakest-precondition transformation to the statement immediately before it; for a branch, insert the assertion at each branch end (section 2.3, p. 352).
3. Rerun verification and inspect which transformed assertion fails. In the paper's Fibonacci example, copying the assertion into four branches isolates the third branch (section 2.2, pp. 350–351).
4. Iterate until the proof succeeds, or the missing fact or a code bug is found; the paper says “multiple iterations are required to further break down the proof goal, until either the proof succeeds, or the developer determines the key missing facts the prover needs (or finds a bug in the code).” (section 2.2, p. 350).

Verus form. Such assertions have no effect on executable code (section 2.2, p. 350). Inference: this maps directly to Verus `assert` statements at branch ends and the existing `requires`/`ensures` contracts; a Verus proof action can generate branch-local `assert` statements and invoke Verus after each edit.

Evidence and limits. Five of Dafny's rewrite suggestions are special cases of this action, which generalizes them; its implementation is 177 lines (Figure 4, p. 355). Inference: it diagnoses location, not truth; the paper notes the developer “does not even know initially if the proof failed because it is invalid, or because the tool’s automation is incomplete.” (section 1, p. 349).

## technique: inline failing preconditions

What it is. When a call cannot establish a callee's precondition, copy that precondition into the caller and substitute actual arguments. The paper describes this as: “When preconditions cannot be established at a call site, this proof action inlines the precondition in the caller’s context.” (section 2.3, p. 352).

How to apply it.

1. Select the call whose precondition fails (section 2.2, p. 351).
2. Copy the called lemma's failing precondition to the call site (section 2.2, p. 351).
3. Replace formal parameters by the concrete call arguments (section 2.2, p. 351).
4. Split a conjunction into separate assertions to identify the failing conjunct; the paper's bounded multiplication example isolates `0 < z` (section 2.2, p. 351).

Verus form. Inference: use a generated `assert` for the instantiated `requires` expression, then split conjunctions into multiple Verus `assert` statements. The paper names this action as one part of the functionality of Verus `--expand-errors` that can move out of the trusted verification-condition generator into an untrusted proof action (section 4.3, p. 358).

Evidence and limits. Figure 4 lists this action at 45 lines, using verifier errors, TOST read/write and concretize, and node, type, and definition lookup (Figure 4, p. 355). Inference: like the framework as a whole, it cannot supply the “guessed” concrete values for `forall`/`exists` assertions that the paper calls inherently manual (section 5, p. 358).

## technique: decompose failing formulas and postconditions

What it is. A complex failed assertion is split into subformulas, each tested independently. For a failed postcondition, Insert Failing Postconditions adds the failing postcondition(s) at each exit point. For enum assertions, Introduce Match Case Assertions emits a match and presents only failing variants (section 4.1, p. 356).

How to apply it.

1. Retrieve the surrounding function from context (section 4.2, p. 357).
2. Replace the original assertion with an assertion of one conjunct using the TOST API (section 4.2, p. 357).
3. Invoke the verifier on the modified function; if the new assertion fails, add it to the source (section 4.2, p. 357).
4. Repeat for each conjunct. For postconditions, insert failing ones at each exit point, including early returns; for enum values, generate a match and keep failing variants (section 4.1, p. 356).

Verus form. Inference: conjunction splitting is ordinary Verus `assert(a); assert(b);`; postcondition checks can be represented by equivalent assertions before each return. A generated `match` must preserve Rust exhaustiveness and can contain branch-local assertions. The action should report the failed subformula rather than silently weakening the contract.

Evidence and limits. Figure 5's action uses all three APIs: it obtains context, edits TOST, invokes Verus, and adds failed conjuncts (section 4.2, p. 357). Inference: it diagnoses only formulas that can be decomposed syntactically; quantifier value guessing remains manual (section 5, p. 358).

## technique: assertion cleanup and induction scaffolding

Remove Redundant Assertions deletes the assertions that proof engineers introduced during debugging and that help the human, not the verification (section 4.1, p. 356). Apply Induction generates base and inductive cases for a natural number or abstract datatype; for an enum it creates a match with an empty proof block for each variant and a recursive lemma call when the variant is defined recursively (section 4.1, p. 357).

How to apply it.

1. After debugging, invoke Remove Redundant Assertions to remove assertions not needed for verification (section 4.1, p. 356).
2. Select a natural number, abstract datatype, or enum variable for induction (section 4.1, p. 357).
3. Generate the base case and inductive case, or a match with one empty proof block per variant and recursive calls for recursive variants (section 4.1, p. 357).
4. Inference: fill in the proof obligations and rerun Verus.

Verus form. Inference: generated induction should use Verus `assert`, `match`, and recursive `proof fn` or lemma declarations only where the project already permits them; the action must not invent executable calls to proof-only code. Inference: cleanup should preserve assertions that are required by the verifier and remove only assertions proven redundant by a verification rerun.

Evidence and limits. The paper says these two actions help with proof refactoring and proof development beyond debugging (section 4.2, p. 357). Proof visibility decisions remain judgment-dependent: when a proof is slow or unstable, deciding whether a definition must be revealed involves the engineer's judgment, and the paper treats these Dafny rewrites as inherently manual (section 5, p. 358).

## technique: source-level transformation architecture

What it is. ProofPlumber separates semantic lookup, editing, and verification. The TOST is an abstract syntax tree that omits semantically irrelevant syntactic details such as whitespace; it supports traversal, direct child edits, visitor transformations, parsing text into nodes, and conversion back to concrete syntax (section 3.1, p. 353). Context supplies scope, types computed by the type checker, and definitions that may lie in other modules or crates (section 3.1, p. 354). The verifier API supplies failing assertions, preconditions, postconditions, and timing, allowing iterative transformations (section 3.1, p. 354).

How to apply it.

1. Parse editor text into a Verus concrete syntax tree and lift it to TOST (section 3, p. 352; section 3.2, p. 354).
2. Type-check the lifted program and expose scope, type, and symbol definitions through Context (section 3, p. 352; section 3.1, p. 354).
3. Edit or create TOST nodes (section 3.1, p. 353).
4. Invoke Verus and inspect errors and verification time (section 3.1, p. 354).
5. Use the response to perform another edit; finally concretize the TOST and pretty-print it into the editor (section 3, p. 352; section 3.1, p. 353; section 3.2, p. 354).

Verus form. Inference: this architecture is directly applicable to a Verus/Rust proof assistant plugin. The transformation layer can remain untrusted because it changes debugging text; Verus still checks the resulting program. The API should preserve source locations and distinguish generated diagnostic assertions from user contracts.

Evidence and limits. ProofPlumber extends rust-analyzer's type checker and conforms to LSP, so actions work in editors that implement the LSP client side (section 3.2, p. 354). Across the 17 actions, every ProofPlumber feature is used by at least one action (section 4.1, p. 356; Figure 4, p. 355). The paper states that automatic transformations “require information about the program’s control flow, the types of expressions, and the definitions of variables, functions, and types.” (section 2.4, p. 352).

## trust, measurements, and implications for VeruLaw

The framework can reduce a verifier's trusted computing base by moving debugging features outside verification-condition generation. The paper describes Verus `--expand-errors` as essentially a combination of Decompose Failing Assertion, Insert Failing Postconditions, and Insert Failing Preconditions, notes Dafny's VCG has custom code similar to Apply Induction, and argues that replacing such code with untrusted proof actions enhances trustworthiness (section 4.3, pp. 357–358). Inference: the proof actions do not establish correctness; Verus remains responsible for checking the final contracts.

Inference: for VeruLaw, the most transferable product is an editor-side diagnostic loop that turns one failed Verus obligation into small, source-level obligations and reruns Verus automatically. Inference: the measured action size, 29–177 lines (section 4.2, p. 357), suggests project-specific diagnostics can be small enough to maintain. Inference: agent-written verified Rust is threatened by opaque failures, solver incompleteness, and proof-visibility instability; diagnosis can reduce iteration cost but cannot detect a wrong specification without an independent requirement.

Inference: what remains trusted or assumed: the underlying Verus verifier and SMT reasoning must be sound, the source transformations must preserve enough meaning for diagnostics, and users must interpret failures. The paper says verification failure may result from “incorrect executable code, incorrect proofs, or even the SMT solver’s incompleteness.” (section 6, p. 359). Inference: VL should not redo generic assertion-splitting and precondition-inlining logic; it should integrate these established transformations with Verus-specific Rust types, project contracts, and requirement traces.

## techniques for the catalog

- weakest-precondition stepping — move a failed assertion backward through control flow and test each branch
- precondition inlining — instantiate a callee contract at a failing call and split conjunctions
- formula decomposition — test conjuncts, postconditions at exits, and enum variants separately
- assertion cleanup — remove diagnostic assertions after debugging
- induction scaffolding — generate base, inductive, or recursive match proof structure
- TOST/context/verifier APIs — combine typed source editing, symbol lookup, verifier reruns, and timing diagnostics
- untrusted debugging extensions — move diagnostic transformations outside the verifier's trusted core
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Rust does not require type annotations for every variable or expression, so the type information is often unavailable at the source (or TOST) level."): what I checked: every quotation, number, section and page reference, and technique step against the full text, plus Figure 4 from the rendered PDF page 355; what I changed: corrected the action counts (16 Dafny rewrites, not 16 actions; 12 Dafny-group and 7 Verus-group actions; noted the paper's eight-versus-7 mismatch), reversed the five-special-cases claim, fixed pages for Remove Redundant Assertions, section 5 and section 4.3, rewrote unsupported step wording (enum induction, pretty-print order, preserving semantics), cited Figure 4 for Insert Failing Preconditions' features, and marked unsupported conclusions "Inference:"; what I did not check: Figures 1, 2, 3 and 5 images, the linked repository, and the Dafny reference.
