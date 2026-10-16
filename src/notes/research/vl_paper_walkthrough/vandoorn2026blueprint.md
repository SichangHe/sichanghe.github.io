# A blueprint for the formalization of norm-variation of multiple ergodic averages for commuting transformations
(authored by agents unless marked 🧑)
Tag: `vandoorn2026blueprint`, [paper](http://arxiv.org/abs/2608.27321v1)

## scope and result

The blueprint formalizes quantitative norm-variation estimates for multiple ergodic averages. The abstract says, “This blueprint serves as a companion to a forthcoming, shorter traditional mathematical paper.” Its main estimate covers (n\ge2) commuting measure-preserving transformations and (r>2^{n-1}) (or (r\ge2) for (n=2)); Theorem 1.2 gives an explicit variation bound with inputs in (L^{2n}). The real-variable core is Theorem 1.4, a bound for twisted multilinear averages. The introduction states, “At the core of the analysis lies an explicit real-variable estimate for twisted multilinear averages that is closely related to certain singular Brascamp–Lieb inequalities.”

Inference: for VeruLaw, the paper is primarily a method for organizing a large proof so an automated prover can elaborate it, rather than a method for discovering the theorem. The authors say the mathematical decisions, theorem organization, and dependencies were human decisions; the machine fills routine proof obligations after those decisions are fixed.

## technique: design a forward-chaining formalization blueprint

What it is: arrange definitions and lemmas in an acyclic order in which every theorem uses only earlier results or explicitly admitted standard results. Section 1.3 calls this “Strict forward reasoning” and requires the proof to follow the statement.

When to use it: use it for a long verification project whose dependencies would otherwise drift into wrappers, circular references, or opaque helper files. The target theorem and its intermediate API should be fixed before automated proof generation.

How to do it:

1. State the target definitions and main theorems in the introduction (Sections 1 and 1.2). The paper defines multiple ergodic averages (1.1), states the main variation theorem (1.2), then states the twisted real-variable theorem (1.5).
2. Put notation and reusable analytic spaces first (Section 2: Wiener space, kernels, monotone sequences, Gaussians, bumps).
3. Prove the real-variable core before reduction (Section 3), then place the reduction and external principles in Section 5.
4. Make every proof immediately follow the statement and refer to named prior results explicitly.

Evidence: Section 1.3 says, “After the introduction, all theorems and definitions must exclusively use theorems that were either previously stated and proved, or are standard theorems.” It also says, “The proof of a theorem must directly follow the corresponding statement.”

Verus form: Inference: encode the target API as Rust `spec fn` definitions and `proof fn` lemmas in dependency order. Keep each proof lemma after the specification it proves, and call proof lemmas only from other proof code. Verus does not carry over Lean's theorem namespace or mathlib types automatically; the mathematical ordering and explicit preconditions do.

Evidence limits: the paper gives a Lean organization rule, not a Verus implementation or measured effect of this rule on Rust proof time. The assumption is that a DAG of lemmas remains easier for an LLM to maintain than an unstructured proof.

## technique: explicit theorem dependencies and named constants

What it is: every named theorem used in a proof is cited with explicit parameters, and every inequality has a named constant recursively defined from previous constants. Section 1.3 calls this “Explicit dependencies” and “Treatment of constants.”

How to do it:

1. Name each proposition's constant after its statement (for example (C_{3.29})).
2. Define parameter dependence explicitly rather than hiding it in an existential constant.
3. Add a separate automatically generated lemma that unfolds the recursive constant into an explicit estimate.
4. In each proof, instantiate the cited theorem and its hypotheses visibly.

Evidence: the paper states, “Whenever a named theorem is used in a proof it must be referred to explicitly.” It also states, “Every claimed inequality must come with an explicitly defined constant, rather than a constant introduced by an existential quantifier.”

Verus form: Inference: represent constants as `spec fn` expressions and expose assumptions in `requires`; state the numeric bound in `ensures`. Use `assert` and proof lemmas to unfold recursive constants. Verus has no Lean-style theorem links, so dependency metadata must be maintained by source order and explicit lemma calls. Do not put `ensures` on a `spec fn`; use it on `fn` or `proof fn` as supported by the Verus reference.

Evidence limits: the constants are mathematical proof artifacts; they do not measure runtime performance. The authors report that formalization found “minor discrepancies in the values of explicit constants” which were then fixed, showing that this discipline can expose arithmetic inconsistencies.

## technique: staged LLM automation with human-fixed structure

What it is: generate routine informal proofs and Lean code in repeated model passes, while humans fix statements, definitions, organization, and feedback. Section 1.1 says the draft was human-written, then GPT-5.6-Sol-Pro was used for final editing and proof completion; Section 1.2 reports Codex with model 5.6-terra-ultra and cleanup with Claude Code opus-5-high.

How to do it:

1. Write the mathematical blueprint and all key statements by hand.
2. Give the model detailed instructions and run several passes with human feedback.
3. Use automation to fill routine or analogous local arguments and calculate constants.
4. Run separate automation passes for local correctness.
5. Compile the generated Lean formalization; repair discrepancies exposed by compilation.
6. Tag generated prose so readers can distinguish it from human decisions.

Evidence: “At the final editing stage when all the statements and definitions, and most of the proofs were in place, parts of the blueprint, and eventually the entire blueprint, were given to GPT-5.6-Sol-Pro with detailed instructions.” The authors also write, “For transparency, every machine-generated piece of content is tagged with () throughout the manuscript.”

Verus form: Inference: use an edit-compile-repair loop in which an LLM proposes Rust/Verus proof bodies, `cargo verus` (or the project verifier) is the hard acceptance check, and a human controls specification and module boundaries. Verus can check compiled proof obligations, but Lean's mathlib automation and source tags do not transfer; preserve provenance with comments or generated-file boundaries.

Evidence and limits: the formalization was “completed largely automatically,” but the paper says generated informal proofs “have not been thoroughly hand-checked” and may contain harmless inaccuracies. The trusted result is the successful Lean kernel checking, plus the imported library and two external theorems; the prose is not itself trusted.

## technique: reduce a hard ergodic theorem to a real-variable estimate

What it is: prove the twisted-average estimate first, interpolate endpoint estimates, then apply Calderón transference to obtain the ergodic jump estimate, and finally convert jumps to variation.

How to do it:

1. Prove Theorem 1.4 for normalized Schwartz inputs and a sequence of scales (Section 1; detailed decomposition in Sections 3–4).
2. Permute coordinates to obtain endpoint estimates (Proposition 5.1).
3. Interpolate the endpoint exponent vectors. Proposition 5.3 characterizes the convex hull by equations (5.6)–(5.7), and Proposition 5.4 obtains the real-variable estimate.
4. Apply the external Calderón transference principle (Theorem 5.5) to commuting transformations, yielding Theorem 5.6.
5. Specialize to (L^{2n}) inputs (Theorem 5.7).
6. Apply Lemma 5.8: a (J^{1-2/r_0}) jump bound implies an (r)-variation bound for (r>r_0), with the endpoint (r_0=2) handled directly.

Evidence: “Theorem 1.2 is reduced to Theorem 1.4 below by the Calderón transference principle.” Theorem 5.5 explicitly assumes a real-variable estimate and concludes the corresponding ergodic estimate. Lemma 5.8 states, “If (r>r_0), then” the variation estimate follows from the jump hypothesis.

Verus form: Inference: model each transformation and average as abstract traits/specifications, prove the real-variable lemma over a suitable mathematical model, then prove separate lemmas for interpolation, transference, and jump-to-variation. Verus can express algebraic bounds and sequence invariants, but analytic (L^p), measure spaces, and the imported transference theorem would require substantial libraries or trusted external axioms. The proof architecture transfers; the exact Lean/mathlib formalization does not.

Evidence limits: the paper proves the analytic theorem in Lean, but it does not provide a Verus port, Rust timings, or a threat model for agent-written Rust. The two external theorems in Section 5 remain trusted inputs to this blueprint's Lean development.

## what is proved, measured, and trusted

The paper claims successful Lean 4/mathlib formalization of the stated theorems and definitions. It reports no benchmark denominator for “largely automatically,” no token or human-hour count, and no independent comparison with manual formalization beyond the qualitative contrast to the Carleson project. Lean's kernel, mathlib, and the two external theorems are trusted. The authors report that formalization corrected intermediate constant discrepancies. Inference: the threat to a product producing agent-written verified Rust is high at the specification and library boundary: a verifier can certify a wrong or incomplete specification, and imported axioms remain outside the checked core. The staged workflow and explicit dependencies are useful mitigations, but their effectiveness for Verus is not measured here.

## techniques for the catalog

- forward-chaining blueprint — order definitions and proofs so every theorem uses only prior results or named standard results
- explicit dependencies and constants — expose theorem parameters and recursively named inequality constants so automation can audit them
- staged LLM formalization — keep human control of statements and structure while models generate routine proof text checked by the prover
- real-to-ergodic reduction — combine endpoint permutation, multilinear interpolation, Calderón transference, and jump-to-variation conversion
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
