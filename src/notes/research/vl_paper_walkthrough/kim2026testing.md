# Benchmarking Testing in Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `kim2026testing`, [paper](https://arxiv.org/abs/2604.23698)

## what the paper measures
The paper evaluates whether an LLM-generated Lean theorem preserves the intended meaning, rather than merely compiling in isolation. Its central idea is to replace the repository’s target theorem with the generated theorem and compile every theorem that transitively depends on it. The paper says: “a generated theorem is considered correct only if all dependent successor theorems compile successfully, analogous to integration testing.” (abstract, p. 1)

It defines Testing Accuracy (TA) as the expectation, over benchmark problems, of the product of each successor’s compile indicator. A theorem with a different name is conditioned to the target name so name mismatch cannot trivially fail compilation (footnote 2, p. 3). The product makes every selected successor a required semantic constraint. The authors connect this to the Curry-Howard view and cut elimination: a target theorem is a proof component, and compiling the dependent chain tests whether replacing that component preserves proof composition. They caution that successful successor compilation is evidence, not a logical guarantee (section 3.2, p. 3).

## technique: dependency-aware successor testing
Use this when isolated compilation or lexical similarity can accept a theorem that proves the wrong statement. Build a dependency graph whose nodes are Lean declarations and whose edges represent usage. Select targets with dependency depth greater than one and at least two transitive successors. Extract predecessor declarations needed to state and prove the target, then extract all successor declarations that transitively depend on it. For each target, replace the original theorem with the candidate and run the repository build. Pass only if every successor compiles.

The paper’s formal steps are: “We parse the Lean environment to build a global dependency graph G = (V, E), where V is the set of theorems and lemmas and E represents usage relationships between them, with Lean-Dojo.” (section 4.1, p. 4) It then selects non-trivial targets and requires `|Tsucc| ≥ 2`, extracts predecessor and successor context, and defines each problem as `(tnl, Tpred, Tsucc)` (sections 4.1–4.2, pp. 4–5). In the repository setting it executes `lake build` in the native environment, preserving project dependencies and Lean versions (section 5.3, p. 6). For standalone benchmarks without successors, it uses `kimina-lean-server` with Lean 4.25.0; that is compilation evaluation, not TA.

A Verus adaptation is an inference. Treat a generated Rust proof function or specification as the target, identify all lemmas and executable callers that depend on it, and compile/check the whole transitive caller set after substitution. For a `spec fn`, successor checks should invoke it in `requires`, `ensures`, `invariant`, or proof lemmas. This does not replace semantic review: caller coverage can miss behaviors absent from the dependency graph, and Verus’s Rust ownership and solver assumptions differ from Lean.

## technique: benchmark extraction from real repositories
Use repository mining when a benchmark should reflect non-trivial proof development. The extraction pipeline mined five public Lean 4 repositories. It produced 2,206 problems with an average of 41 successor theorems per target. A hard subset contains 389 problems whose target declarations have body type `Prop`, requiring both proposition and proof generation (section 4.3, p. 5). Existing benchmarks supplied only 12 evaluation problems and 110 training problems meeting the non-triviality and successor-coverage criteria (section 4.3, p. 5).

The authors generate missing natural-language statements with Claude Sonnet 4.5 and manually verify 10 randomly sampled annotations, finding no errors (section 4.2, p. 5). That is a 10-sample annotation audit, not proof that all 2,206 descriptions are correct. Inference: a VL benchmark should preserve source repositories, dependency metadata, and build configurations rather than flattening each proof into an isolated prompt.

## technique: separate compile, lexical, and testing metrics
Run isolated compilation to measure syntactic/logical validity, TA to test successor behavior, and BLEU to measure lexical overlap with the reference theorem. The paper reports the gap directly. On the full T2 set, Claude-Sonnet-4.5 has 80.3% compilation accuracy but 38.9% TA; on T2 Hard it has 46.0% compilation and 4.5% TA (Table 2, p. 7). GPT-5 has 85.7% compilation and 37.7% TA on the full set, but 68.3% compilation and 3.4% TA on T2 Hard (Table 2, p. 7). These percentages use all problems in the corresponding T2 or T2 Hard subset; the table does not state a separate denominator for each model because the denominator is the full subset.

Across all models, compilation precision as a predictor of semantic correctness is reported as 6.89% in the paper’s analysis (section 6.3, p. 8). The authors also find that in the highest BLEU bin (90–100), over 70% of samples are semantically incorrect, while the lowest bin (0–10) contains approximately 30% testing-verified samples (figure 4, p. 8). These are aggregate proportions across evaluated model outputs, not per-model theorem counts. The paper therefore concludes that high lexical similarity and isolated compilation are weak evidence of intended meaning.

In Verus, inference: report at least three separate quantities, such as function verification success, transitive caller verification success, and specification similarity. Do not call caller compilation a proof of semantic equivalence. Use the dependency test as an integration signal that complements Verus’s SMT proof obligations.

## technique: use successor context during generation
Provide both the natural-language proof and successor theorem source as prompt context when generating a target. Table 3 compares whether NL proof and successor theorems are supplied on the full T2 dataset. The paper reports that both are needed for consistent improvements; successor theorems alone can reduce TA. For Claude-Sonnet-4.5, giving both raises TA by 4.9% in the ablation described in section 6.1 (p. 7). Inference: this context exposes downstream semantic constraints to a generator, but it can also increase prompt size and leak repository-specific patterns.

The authors test two-shot prompting on T2 Hard with four models. Table 4 reports no consistent gain: Claude-4-Sonnet changes from 4.5% zero-shot TA to 4.3% two-shot, Claude-3.7-Sonnet from 2.6% to 2.8%, GPT-5 from 3.4% to 2.6%, and GPT-5-mini from 4.1% to 2.8% (Table 4, p. 7). They also test iterative refinement with compiler feedback using Hilbert; it reaches 5.0% TA on T2 Hard versus 3.2% for the cited DeepSeek-Prover-v2-7B zero-shot baseline (section 6.2, p. 8). The compared systems and denominators are the T2 Hard problems, but the paper does not provide per-model counts in the table.

A Verus inference is to pass generated proof obligations together with representative verified callers and callee contracts, then re-run `verus` on the entire caller slice after each repair. The successor set should be selected from actual Rust call and specification dependencies, not from text similarity.

## technique: vary successor coverage to control strictness
Use multiple successors and deeper dependency chains to reduce false positives. The benchmark restricts targets to at least two successors, reaches dependency depth up to seven, and reports an average of 1.6 thousand successor theorems per problem at the deepest level (section 3.2, p. 3; figure 5 caption, p. 8). Figure 5b shows TA falling sharply as the number of successors grows: Claude-4-Sonnet is approximately 70% with two successors and near 0% when five or more must compile (section 6.4, p. 8). These are plotted approximate values, not exact table entries.

The limitation is explicit: “The reliability of TA increases with the number and diversity of successor theorems, as each imposes an additional semantic constraint.” (section 8, p. 9) Inference: too few callers make a Verus integration test weak, while an enormous successor closure can make evaluation expensive and confound solver time with semantic failure. Record the successor count, depth, repository, Lean/Verus version, and timeout for every score.

## what stays trusted and threat to VL
The paper’s claims are about Lean theorem-generation evaluation, not theorem proving soundness. TA depends on Lean’s compiler and environment, dependency extraction, generated natural-language annotations, and the selected successor graph. It does not prove that a candidate theorem is equivalent to the natural-language statement when no successor exercises the difference. It also does not evaluate Rust ownership or Verus solver behavior.

Inference: the main threat to agent-written verified Rust is a false sense of completion from checking one function or one proof obligation. A transitive successor harness can expose wrong contracts that still satisfy local SMT checks, but it can miss uncalled behavior and cannot replace explicit specifications. The paper already addresses isolated compilation, lexical metrics, and shallow benchmark design; VL should reuse dependency-aware integration tests rather than redo those weaker evaluations.

## techniques for the catalog
- successor theorem testing: replace a target theorem and compile every transitive dependent theorem
- dependency-aware extraction: mine repository graphs and retain predecessor, successor, depth, and build context
- metric separation: report isolated compilation, testing accuracy, and lexical overlap as distinct measures
- downstream prompt context: provide successor declarations with natural-language proof context during generation
- coverage-controlled evaluation: increase successor count and dependency depth to make semantic tests stricter
- caller-slice Verus inference: re-run Verus over every dependent specification and executable caller after replacement
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
