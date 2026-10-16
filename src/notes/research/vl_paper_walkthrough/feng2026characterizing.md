# Characterizing Paraphrase-Induced Failures in Lean 4 Autoformalization
(authored by agents unless marked 🧑)
Tag: `feng2026characterizing`, [paper](https://arxiv.org/abs/2604.23135)

## scope and result

The paper asks whether a formalizer that succeeds on one theorem wording remains reliable when the wording changes without changing the mathematics. Its controlled experiment applies 60 deterministic, named rewrite rules to ProofNet# (185 undergraduate theorems) and miniF2F (244 Olympiad problems), then compares baseline and perturbed Lean outputs from four frontier models and three open-weight 7B models. The abstract states: “We study this gap in Lean 4 by using a controlled suite of 60 deterministic paraphrase rules applied to ProofNet# (a dataset of 185 formalized undergraduate-level theorems) and miniF2F (a dataset of 244 formalized Olympiad-level problems).”

The principal finding is that the instability is mostly code generation, not different mathematical meanings among outputs that compile. The paper reports: “Our main finding is that paraphrase sensitivity in Lean 4 autoformalization is dominated by code-generation failures, rather than by semantic disagreement among compiling outputs.” Frontier surface-consistency rates are 19.1–49.5% on ProofNet# and 44.5–55.5% on miniF2F. Compile rates per direction are only 11–24%, so at least one side usually fails to elaborate. Among pairs in which both outputs compile, structural similarity is high: the paper reports a pooled median GTED of 1.000 over 401 pairs and mean 0.934.

## technique 1: deterministic, semantics-preserving paraphrase probing

What it is. Build a perturbation suite in which each rewrite isolates one linguistic axis instead of letting a free-form language model change several things at once. The methods section says: “We apply 60 named rules to theorem-statement natural language prose across 11 categories (concept rename, conditional, discourse, quantifier, verbosity, and others).” Each rule has a pattern, guards, and a reference establishing meaning preservation. Math spans are masked, rewritten text is substituted, and the spans are restored. Rules whose guards fail are skipped. Appendix B.1 gives the exact construction: “Each perturbation rule specifies an input pattern, transformation, context guards, and a reference establishing meaning preservation.”

When to use it. Use this when a verification or formalization system appears accurate on canonical prompts but may depend on surface wording. The paper’s guards and textbook references make each test attributable to a single edit, while the paired baseline/perturbed design controls for theorem content.

How to apply it.

1. Define a named rule and its input pattern (paper §3; Appendix B.1)
2. Add context guards so the rewrite is applied only in intended contexts (Appendix B.1)
3. Mask `$...$` math spans before matching and restore them after substitution (Appendix B.1)
4. Attach a textbook or logical reference for meaning preservation (paper §3; Appendix B.1)
5. Apply only rules whose guards pass; retain the original as baseline and the rewrite as perturbed input (paper §3)
6. Run the same formalizer on both inputs and retain the pair (paper §3)

The paper gives concrete rules: “if P then Q” to “whenever P, Q”; “Prove that” to “We show that”; and “commutative group” to “abelian group”. It says “Rules do not modify content inside math spans ($...$).”

Verus form. Inference: create a Rust test generator that stores a theorem statement and a `Vec` of rewrite cases, applies regex-like transformations only outside protected specification tokens, and calls the same LLM-to-Verus pipeline for baseline and perturbed text. Verus can verify deterministic helper functions with `requires`/`ensures`, but the semantic-preservation claim for English rewrites is external to Verus; it would need separately proved mathematical lemmas or trusted test metadata. The paired outputs can be checked by compiling each generated Verus module and comparing the proved postconditions, rather than by Lean’s BEq+.

Evidence and limits. The experiment covers 60 rules, but only 14 match ProofNet# and 37 match miniF2F; these are coverage counts, not a partition. The paper’s English paraphrases underrepresent notation and multilingual edits, and its three open-weight models are all 7B. Meaning preservation is supported by references and guards, yet the benchmark does not prove every natural-language rewrite in a theorem prover.

## technique 2: separate compilation failure from semantic disagreement

What it is. Score each baseline/perturbed pair at multiple layers: compilation, bidirectional equivalence, and syntax-tree similarity. The paper defines BEq+ as the primary metric: “BEq+ (Poiroux et al., 2025) as the primary equivalence metric, which declares two formal statements equivalent when bidirectional proof search succeeds in both directions.” It uses GTED as an independent structural cross-check and counts noncompiling predictions as non-equivalent.

When to use it. Use this decomposition when a low agreement score could mean either a wrong theorem, a valid but differently written theorem, or code that never type-checks. Treat a BEq+ failure on compiling outputs as a conservative signal because the paper notes that BEq+ is sound but incomplete.

How to apply it.

1. Compile each output and record baseline, perturbed, and compile-both counts (paper §3; Appendix A.1)
2. Mark noncompiling outputs non-equivalent for the surface-consistency statistic (paper §3)
3. Run BEq+ bidirectional proof search on pairs that can be compared (paper §3)
4. Compute GTED on compile-both pairs to measure AST similarity (paper §3; Appendix A.7)
5. Classify compiler errors by dataset and model (paper §4.2; Appendix A.3)
6. Report confidence intervals; the paper uses 95% bootstrap intervals and 5,000 iterations for Figure 2 (paper §3; Figure 2 caption)

The resulting diagnosis is specific. On ProofNet#, unknown identifiers account for 34–50% of compile failures; the paper’s example is “SimpleGroup where the correct identifier is IsSimpleGroup.” On miniF2F, syntax errors account for 22–48% and elaboration failures for 25–39%. The paper concludes: “Compile-both pairs are largely equivalent.”

Verus form. Inference: for generated Rust, use `cargo verus` (or the project’s verifier command) as the compilation/proof gate, then compare the two verified functions’ `ensures` clauses and observable behavior on a fixed harness. A Verus proof of the same postcondition is stronger evidence than textual similarity, while a failed verification should be classified by the verifier error (unresolved name, typing, trigger/SMT failure, or violated contract). GTED has no direct Verus counterpart; AST distance can be an auxiliary diagnostic only.

Evidence and limits. Frontier surface consistency spans 19–56% across models and datasets, but the denominator varies by table: Table 1 gives N values per model and dataset; Figure 1 pools paired predictions by category. The paper’s pooled GTED result is 401 compile-both pairs, with median 1.000 and mean 0.934. BEq+ incompleteness can label mathematically equivalent statements as different, so non-equivalence is a floor rather than proof of semantic disagreement.

## technique 3: type failures by dataset and target interface

What it is. Do not assume one generic robustness intervention. Map error types to the formalization path used by each dataset. ProofNet# relies on navigating Mathlib’s typeclass/API hierarchy, whereas miniF2F formalizations are closer to the statement vocabulary. The paper says: “The error distribution differs significantly across datasets (Table 2).”

How to apply it. First, collect compiler diagnostics for every non-equivalent pair. Second, count unknown identifiers, syntax errors, elaboration failures, and an Other bucket containing type, import, and miscellaneous errors (Appendix A.3, Table 2). Third, select repairs matched to the dominant class: the discussion proposes retrieval-augmented identifier resolution for ProofNet# and compiler-feedback fine-tuning for miniF2F. Fourth, re-run the same paraphrase suite and compare per-category consistency, not just an aggregate score.

Verus form. Inference: keep separate repair loops for unresolved Rust/Verus names and proof-obligation failures. Retrieval can propose existing crate APIs or Verus lemmas, but every candidate must compile and verify. Compiler-feedback fine-tuning can use verifier diagnostics as labels; it should not be treated as proof. For a Verus product, the dataset-specific split corresponds to API discovery versus specification/SMT elaboration and should be measured separately.

Concrete failures establish why this matters. In Appendix A.5, an `o1` baseline proves `¬ IsSimpleGroup G`, while the conditional paraphrase emits `¬ SimpleGroup G`; “SimpleGroup is not a Mathlib identifier.” An `o3` discourse rewrite changes a non-group claim into an existential statement that is “strictly weaker: one element lacks a right-inverse vs. no group structure exists.” These are meaning-preserving input edits that produce a wrong or noncompiling formalization.

## what is proved, measured, and trusted

The paper measures generated Lean compilation, BEq+ equivalence, GTED similarity, error categories, and bootstrap intervals. The implementation reports byte-identical outputs for 50 repeated paired API requests per GPT model and uses temperature 0 for open-weight models. The study therefore supports a causal association between controlled surface edits and typed generation failures in these models and datasets. It does not prove that every paraphrase is semantically equivalent, that larger models behave identically, or that a repair intervention will improve performance.

Inference: for VL, the direct threat is substantial whenever user wording or agent-generated specification prose changes. A proof checker catches a wrong or unproved Verus result, but an agent can still emit code that fails to compile, invoke a nonexistent API, or prove a weaker contract. The paper’s failure taxonomy suggests that VL should log verifier diagnostics and test behavior-preserving rephrasings before treating a generated proof as robust. The product should not redo this paper’s basic paraphrase benchmark; it should adapt the paired, compiler-diagnostic design to Rust and Verus and measure real project APIs.

## techniques for the catalog

- deterministic paraphrase suite — apply guarded, reference-backed single-axis rewrites outside protected math/specification spans and compare paired formalizations
- layered robustness measurement — separate compilation, equivalence checking, and structural similarity, then classify compiler failures
- dataset-specific repair targeting — map dominant diagnostics to retrieval for unknown identifiers or compiler-feedback training for syntax/elaboration failures
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
