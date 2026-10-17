# Can LLMs Reason Like Automated Theorem Provers for Rust Verification? VCoT-Bench: Evaluating via Verification Chain of Thought
(authored by agents unless marked 🧑)
Tag: `xie2026llms`, [paper](https://arxiv.org/abs/2603.18334v2)

## scope and contribution

This paper introduces VCoT-Lift, a pipeline that converts low-level Z3 proof traces produced while verifying Verus Rust programs into explicit, human-readable Verus proof steps. It then uses those lifted traces as ground truth for VCoT-Bench, a benchmark of 1,988 proof-completion tasks. The paper’s central claim is that binary “verified/not verified” scores hide whether a model reconstructed a deductive chain. The authors state: “Existing evaluations treat Rust verification as a black box, assessing models only by binary pass or fail outcomes for proof hints.” (abstract, p. 1). VCoT-Lift and the benchmark are therefore evaluation and data-construction techniques; they do not replace Verus or Z3 as the soundness authority.

The paper describes Verus as three layers: executable Rust, `requires`/`ensures` specifications, and proof hints such as loop invariants, assertions, and lemma functions. Verus translates these to SMT and asks Z3 to check the result. The study assumes that a successful Z3 proof is a useful source of semantic evidence, and that an LLM can abstract its machine trace into valid Verus constructs. The authors explicitly frame the abstraction objective as three requirements: “Soundness: The transformed verification steps should faithfully preserve the semantics of the original Z3 proof”; completeness (no essential steps omitted); and conciseness (no trivial or redundant steps) (section 2, p. 3, before 2.1).

## technique 1: lift Z3 proofs into Verus verification chains

What it is. VCoT-Lift takes a verified Verus program and its Z3 proof, and synthesizes a sequence of Verus-level assertions, invariants, and lemmas that exposes the proof’s intermediate reasoning. A running example’s raw proof is 10,003 lines; 81.69% are low-level equalities such as `$x775 = $x775` (introduction, p. 2). The lifted chain adds 82 lines of Verus proofs and unfolds into five verification phases (section 2.1, p. 3).

When to use it. Use this when a final Verus proof verifies but its reasoning is opaque, or when creating supervision/evaluation data for proof-generation models. It is especially useful for long proofs where reading Z3’s machine trace directly is impractical.

How it is done.

1. Run the original Verus program through Verus/Z3 and save the solver proof.
2. For the checkers (section 2.3, p. 4), parse the proof into an abstract syntax tree; each node is a proof statement and its subtree is the node’s dependency. The transformer itself reads the whole proof.
3. Classify Z3 rules by importance: eight high-level rules (for example `unit-resolution`), twelve medium-level rules (for example `trans` and `rewrite`), and sixteen low-level rules (for example `refl` and `symm`) (section 2.2, p. 4).
4. Give an LLM the whole program and proof. The transformer must retain global context because “the reasoning is globally interconnected” and end-to-end decomposition can lose semantics (section 2.2, p. 3).
5. Ask the transformer to synthesize semantically equivalent Verus proofs. Typical output is a lemma function such as `proof fn lemma_subrange_all<A>(s: Seq<A>) ensures s.subrange(0, s.len() as int) == s { ... }`, followed by an assertion invoking that lemma (Figure 4, p. 4).
6. Feed the result to the checker, pruner, and repair stages below, then run Verus again.

Verus form (inference). In a direct Verus implementation, preserve executable code and specifications, and add `assert(...)`, loop `invariant` clauses, and `proof fn` lemmas at the program points indicated by the lifted chain. The paper’s transformation is LLM-based and not a mechanically validated translation, so the inference is to treat every generated step as a candidate until Verus accepts it.

Evidence and limits. The pipeline’s evidence is Verus compilation/checking after repair, not a proof that the LLM’s intermediate explanation is unique. The authors note that a raw Z3 trace is machine-oriented and semantically verbose. The paper names long-context comprehension a major bottleneck for current LLMs (section 2.2, p. 3); inference: the transformer’s global view can exceed model context. Z3’s rule classification is motivated by observed usefulness, so a high-level syntactic rule can still be semantically trivial.

## technique 2: specialized completeness checking with aggregation and mapping

What it is. The Proof Checker tests whether essential Z3 reasoning appears in the transformed Verus proof. It checks only eight high-level rules, grouped into five categories: lemma, theory lemma, modus ponens, quantifier, and unit resolution (section 2.3, p. 4). A dedicated checker agent handles each category.

When to use it. Use targeted checking when a full proof trace is too large to inspect and independent per-step checking would repeat context. This is a completeness audit, not a replacement for Verus’s semantic check.

How it is done.

1. Parse the Z3 proof AST and locate every target-rule node.
2. Extract each node’s dependency subtree.
3. Aggregate all segments in the same category into one checker input; the lemma checker receives all lemma rules and dependencies together. This avoids redundant LLM calls and preserves inter-lemma dependencies (section 2.3, p. 5).
4. Apply an abstraction filter that excludes trivial local facts and redundant steps. Trivial examples include `index = index` and commutativity; redundancy is normalization, reassertion, or definition expansion (section 2.3, p. 5).
5. Require explicit mapping from every remaining Z3 step to an equivalent Verus step. The paper gives a missing mapping for `assert(0 <= index <= second@.len())` as an incompleteness signal (Figure 4, p. 4).
6. Return complete/incomplete to the global transformer. If incomplete, regenerate the entire transformed proof with global context rather than patching only the local segment.

Verus form (inference). A Verus-side checker can map each solver obligation to an `assert`, `assert ... by`, `proof fn`, or loop `invariant`, and record source locations. It should still invoke Verus for semantic validity; a textual mapping alone cannot prove equivalence.

Evidence and limits. The checker’s explicit mapping is intended to reduce hallucination. Its partial view deliberately returns coarse binary signals because localized explanations could constrain the global transformer. Completeness therefore depends on the rule hierarchy and abstraction filter: an incorrectly classified “trivial” step may be omitted. The example `index < index + 1` is filtered as trivial, while the range assertion `0 <= index <= second@.len()` is not filtered and is flagged as lacking a mapping (section 2.3, p. 5; Figure 4, p. 4).

## technique 3: transformer–checker iteration

What it is. VCoT-Lift runs a global transformer and partial checkers in a loop. The transformer sees the complete Z3 proof; checkers inspect only essential high-level segments and report whether required steps are present.

Procedure. Start with an initial transformed proof, run all category checkers, and if any reports incompleteness, re-run the transformer over the full proof. Repeat until the checkers report complete. The running example becomes progressively more complete over three loops (Figure 3, p. 5).

Verus form (inference). This is analogous to an iterative Verus workflow: add candidate invariants/lemmas, compile with Verus, inspect failed obligations, then revise globally while preserving all executable code and specifications. The paper does not claim a fixed iteration bound or convergence guarantee.

Failure mode (inference). The architecture trades local diagnostic detail for global regeneration. It can spend many LLM calls, and checker incompleteness may persist if a needed rule is below the high-level set or if the abstraction filter discards it.

## technique 4: proof pruning for concise explanations

What it is. The Proof Pruner removes trivial and redundant transformed steps while requiring a justification for every removal. Examples include `assert(2 != 0)` inserted to guard `% 2`, and an assertion already implied by loop invariants. In the running example, `assert(0 <= index <= second@.len())` is removed because the preceding invariants establish it, and a duplicate proof block is removed (section 2.5, p. 5).

When and steps. Apply after completeness checking, before repair. Classify each candidate as local/trivial, normalization, reassertion, or definition expansion; remove it only with an explanation; retain the rest. Verus runs afterwards, in the repair stage.

Verus form (inference). Remove only proof hints that Verus confirms are unnecessary in the current context. A human may keep a redundant assertion for readability even if the pruner deletes it; concision is a presentation goal, not a soundness condition.

Assumptions (inference). The pruner trusts nearby invariants and proof context. If a supposedly redundant step also affects trigger selection or solver performance, deletion can make Verus fail even though logical implication holds.

## technique 5: verifier-in-the-loop proof repair

What it is. Proof Repair turns an intermediate proof into compilable, semantically checked Verus. The repair agent receives Verus diagnostics, expert grammar rules, and curated examples, then edits the proof until Verus succeeds. The paper says: “At this stage, the Verus verifier compiles and checks the program with the transformed proofs, and the resulting error messages are fed back to the repair agent” (section 2.6, p. 6).

Procedure. Inject grammar and repair examples; run Verus; apply a repair (for example, parenthesize chained type conversions); run Verus again; stop only after successful checking.

Verus form. This is directly applicable: use `verus` as the oracle, preserve the error output, and make small edits to `assert`, lemma calls, conversions, and invariants. Successful checking proves the submitted program/specification combination under Verus’s trusted kernel and solver assumptions, but does not prove that the repair matches the intended human explanation.

Evidence and limits. Repair fixed a syntax error in the Figure 3 example. The authors attribute frequent errors to Verus’s limited public resources and model unfamiliarity with its grammar. Inference: repair can overfit diagnostics or introduce a valid but unintended proof; semantic specifications remain the product’s responsibility.

## technique 6: construct VCoT-Bench by semantic proof holes

What it is. Starting from 150 verified programs in Verus-Bench, the authors extract Z3 proofs, lift them, and remove semantic blocks to create completion tasks. The resulting VCoT-Bench-Org has 6.5× more proof lines (up to 32×), 13.4× more assertions (up to 54×), and 1.94× more lemma functions (up to 9×) than Verus-Bench (section 3.1, p. 6).

Procedure. Define three block types: one independent lemma function; all invariants for one loop; or all assertions between two executable lines. For Ratio, create N variants per program by removing 1..N blocks, yielding 1,159 tasks. For Type, remove all blocks of each type, yielding 439 tasks. For Location, remove blocks from front, middle, or end thirds, yielding 390 tasks. Total is 1,988 tasks (section 3.2–3.3, pp. 6–7).

Verus form (inference). The same benchmark can be generated from Rust/Verus repositories by preserving executable code and specifications, deleting selected proof blocks, and asking a model to fill them. Each completion must be checked in syntax-only mode (`-no-verify`) and full Verus mode.

## technique 7: separate syntax and semantic scoring

The benchmark uses Syntactic Accuracy (Verus `-no-verify`), Semantic Accuracy (an LLM judge), and weighted Overall Accuracy: `(N3 + 0.5 N2 + 0.25 N1) / N × 100%`, where level 3 is both correct, level 2 semantic-only, level 1 syntax-only, and level 0 neither (section 3.3, p. 7). GPT-5 mini was selected after eight judges evaluated 100 stratified tasks; it achieved 92.7% agreement with author consensus. This judge is trusted measurement infrastructure, not a formal proof authority.

## measured findings and product implications

The strongest model, Claude Sonnet 4.5, scored 71.58% with 10% of blocks removed and 17.22% with all blocks removed; Qwen 3 thinking reached 0.66% at 100% removal (section 4.2, p. 7). Across proof types, Claude scored 68.71% on invariants, 39.55% on assertions, and 51.54% on lemmas; assertion reconstruction is consistently hardest (section 4.3, p. 8). For locations, Claude scored 69.04% front, 46.35% middle, and 65.96% end; middle blocks require connective state tracking (section 4.4, p. 9). The authors caution that 100% removal accuracy is inflated by single-block programs appearing only at that ratio.

What is proved: Verus accepts the repaired transformed programs; the benchmark’s syntactic metric invokes Verus. What remains trusted: Verus’s translation/checking implementation, Z3, the LLM transformer/checkers/pruner/repair agent, the semantic judge, and the authors’ rule taxonomy. The paper’s claim that low scores show “first principles” failure is an inference from controlled block removal, not a theorem about model internals.

## techniques for the catalog

- VCoT lifting: transform a complete Z3 trace into mapped Verus assertions, invariants, and lemmas using global context
- rule-specialized completeness checking: aggregate high-level proof segments, filter trivial/redundant facts, and require explicit Z3-to-Verus mappings
- transformer–checker iteration: regenerate the whole lifted proof when targeted checkers find missing essential steps
- proof pruning: remove justified trivial, normalization, reassertion, and definition-expansion steps, then recheck
- verifier-in-the-loop repair: feed Verus syntax/semantic diagnostics to a repair agent until compilation and verification succeed
- semantic-block benchmark construction: remove lemma, invariant, or assertion blocks at ratio, type, and location strata
- dual scoring: separate Verus syntax checks, semantic judging, and weighted overall accuracy

Audited 2026-10-12 against the paper: checked every number (10,003 lines, 81.69%, 82 lines, 8/12/16 rules, 6.5x/13.4x/1.94x, 1,159/439/390/1,988, 92.7%, Table 1 and Figure 7 values for Claude Sonnet 4.5 and Qwen 3), the formula, the pipeline stages and quotations. Changed: two section references (soundness bullets are in section 2; abstraction filter is section 2.3, not 2.4), one page (aggregation is p. 5), the AST step (it serves the checkers), the non-Verus `invariant(...)` call form, a pruning step that put a Verus re-run inside the pruner, an invented error-classification step in repair, one unsupported sentence on denominators, and four unmarked inferences. Not checked: appendices (not in the text read), Best-of-10 results.
