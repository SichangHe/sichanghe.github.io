# Reliable Proof Generation with LLMs via Analogical Retrieval and Symbolic Verification: A Case Study in Euclidean Geometry
(authored by agents unless marked 🧑)
Tag: `sultan2025reliable`, [paper](https://arxiv.org/abs/2505.14479)

## scope and result

Sultan, Stern, and Shahaf combine retrieval of structurally analogous solved problems with a symbolic verifier that returns the first proof error to an LLM. FormalGeo-7k contains 6,981 SAT-level Euclidean geometry problems; the main proof-generation evaluation uses 50 problems, ten per difficulty level (§3, p. 3; §4, p. 5). Their definition of reliable is narrow: “Throughout this paper, we use reliable to refer to the generation of proofs formally verified by a symbolic verifier.” (footnote 1, p. 2) Inference: acceptance depends on the encoded theorem dictionary, formalization, and target specification; these results do not establish their completeness.

Inference: for VL, the direct pattern is retrieval-augmented proof repair: retrieve similar verified Verus proofs, construct a small relevant context, ask the model for a proof, verify with Verus, and feed the first diagnostic back. The geometry representation, theorem names, and Z3 workarounds do not carry over unchanged.

## technique 1: abstract problems and retrieve analogous proofs

What it is. The authors replace entity names by `<word>` and numbers by `<num>` in construction, conditions, and goal. They compute Jaccard similarities over abstract construction and condition multisets plus exact goal similarity. A three-layer regressor predicts proof similarity from these three features. The training set starts from approximately 24.4 million pairs, bins proof similarity into five width-0.2 intervals, downsamples each bin to 131K, and trains on 655K pairs with a 90/10 split, MSE, Adam, learning rate 0.001, batch size 32, and 10 epochs (§3.1–3.2, pp. 3–4; Appendix A, p. 12).

How to apply it.

1. Choose an abstraction that removes incidental names and values while retaining structural relations (§3.1, p. 3).
2. Compute pair features from abstract constructions, conditions, and goals.
3. Train a predictor for proof similarity using known proof overlap as the label (§3.2, p. 4).
4. At inference, rank all candidate problems by predicted similarity and keep the top `k` analogies.
5. Retrieve each analogy's complete proof and use those proofs as few-shot examples and as a source of relevant theorem names (§3.3, p. 4).

The authors evaluate theorem coverage by checking whether the union of theorem names in the top-k analogies contains every theorem in a target proof. For 100 randomly sampled targets (20 at each difficulty level), top-100 analogies cover 96% of entire proofs while supplying 26.66 theorems on average; random problems cover 88% while supplying 66.98 theorems (Table 1, p. 4). This is a conservative coverage estimate because a proof may be possible without every theorem used by the reference proof (p. 4).

Verus form (Inference). Index existing Verus proof files by normalized API calls, predicates, data-structure operations, and contract shapes. Retrieve examples whose abstract `requires`/`ensures` relations and goal expressions overlap with a new obligation. Keep the original code names in the retrieved proof only after checking type compatibility. The regressor and Jaccard score are orchestration code; the LLM uses the retrieved text as context, and Verus independently verifies the generated proof. Accept a generated proof only after Verus successfully verifies it. Inference: normalization should preserve ownership, mutability, and quantified-state structure because replacing those with generic placeholders could retrieve an inapplicable proof.

Limits. The abstraction is intentionally simple. The authors state that “More nuanced abstraction schemas (e.g., preserving shared symbols between words) are left for future work.” (§3.1, p. 3) Inference: the same failure matters for VL: two obligations can have the same names of operations but different aliasing or arithmetic assumptions.

## technique 2: narrow the theorem or lemma context from retrieved proofs

What it is. The full geometry dictionary has 196 theorems (234 including variations); the analogy-based variant supplies an abridged dictionary drawn from analogous proofs (§3.3, p. 4; §4, p. 5). In the separate theorem-coverage experiment, `k=100` supplies 26.66 theorems on average, 13.6% of the full dictionary, with 96% complete-proof coverage (Table 1, p. 4). The main generation experiments use five few-shot examples (§4, p. 6). These counts refer to different experiments. The paper motivates narrowing as reducing tokens and the search space (§3.3, p. 4).

How to apply it.

1. Retrieve analogous problems; the main generation experiment uses five examples (§4, p. 6).
2. Extract theorem identifiers used in analogous proofs.
3. Build an abridged dictionary containing each selected theorem's premises and conclusions.
4. Put the target problem, analogies with full proofs, and the abridged dictionary in an in-context prompt (§3.3, p. 4).
5. Require every generated proof step to call only a theorem in the supplied dictionary.

Verus form (Inference). Construct a retrieval context of candidate lemmas and their contracts, but leave the actual module imports and visibility explicit. Use `requires`/`ensures` signatures and proof bodies from compatible examples; do not copy an `external_body` function as the proof target. The narrowed context can reduce LLM search and prompt cost, but Verus still sees whatever facts are in scope. Inference: an analogous-lemma index should be paired with a dependency check so that omitted facts produce a compiler error rather than an invented theorem.

Evidence and cost. For the 50-problem evaluation, the paper reports an approximately 2.5K-token analogy-derived dictionary versus an approximately 18K-token full dictionary and a baseline cost approximately three times higher (§4, p. 6). The introductory example identifies these token counts as o1 averages (p. 2). The cost estimate uses logged API calls, token usage, and current pricing (§4, p. 6). Inference: these measurements do not predict Verus verification time.

## technique 3: symbolic verifier with first-error feedback

What it is. The verifier encodes each theorem call and geometric constraint as logical formulas and algebraic expressions, then checks satisfiability and whether the numeric answer is entailed. It returns natural-language feedback identifying the first error. The paper says: “After each attempt to produce a proof, the verifier provides natural-language feedback, specifying the first error found in the proof.” (§3.4, pp. 4–5) Three error tiers make feedback actionable: undefined theorem or bad signature; a theorem call using an undeduced premise; and a proof that is locally valid but does not reach the goal (§3.4, p. 5).

How to apply it.

1. Give the LLM the target, retrieved examples, and dictionary, then request a theorem sequence (§3.3, p. 4).
2. Parse the sequence and check theorem syntax and argument signatures (tier 1).
3. Reconstruct derived premises and use Z3 to check each step's geometric/algebraic constraints (tier 2).
4. Check that the final answer is entailed; if not, report underconstraint or a mismatch with the verifier's unique solution (tier 3).
5. Retain failed attempts and feedback within each run; restart with a fresh context for each independent run. The reported full budget is three runs of five verifier-guided attempts, 15 total (§4, p. 6; §5.3, p. 7).
6. Accept only a proof and answer that the verifier validates.

The implementation uses Z3 for tier-2 and tier-3 checks and adds symbolic workarounds for trigonometric functions unavailable natively (§3.4, p. 5; Appendix C, pp. 12–13). It introduces symbolic variables such as `cos_ABC`, adds referenced angles to the constraint graph, and either matches known values or reasons symbolically when exact evaluation is impossible (Appendix C, p. 13).

Verus form (Inference). Verify each generated Rust proof with Verus and classify diagnostics similarly: syntax/type errors; failed `requires` or missing derived facts; and an unmet final `ensures`. Feed the first diagnostic and the relevant obligation back. Inference: the tier taxonomy is useful, but Verus diagnostics are compiler/prover obligations rather than a custom geometry solver, so no Z3 trigonometric workaround should be copied into Rust.

## technique 4: bounded retries and independent runs

What it is. The evaluation distinguishes verifier-guided attempts from independent restarts. The paper calls the second index of `base_i,j`/`ours_i,j` the number of retries, yet labels `i,1` as no retries and defines the full budget as “B=15 (3 runs × 5 verifier-guided retries per run)” (§4, p. 6; Table 2 and §5.3, p. 7). Inference: interpret the reported budget as five total attempts per run, rather than an initial attempt plus five retries. Their 50-problem evaluation samples ten problems at each of five proof-depth levels; difficulty is the number of ground-truth proof steps (§4, p. 5).

Evidence. Table 2 reports fractions over these 50 problems. With one run and no retries, analogy guidance raises o1 from 10% to 48%, GPT-5 from 44% to 64%, Gemini-Flash-2.5 from 22% to 48%, and Claude Sonnet 4.6 from 28% to 60%. With one run and the five-attempt budget, the corresponding values are 38% to 68%, 80% to 96%, 58% to 74%, and 58% to 78%. With three runs and the five-attempt budget per run, they are 52% to 80%, 88% to 96%, 72% to 86%, and 78% to 86% (Table 2, p. 7; each percentage denominator is 50 problems). For o1 with analogy retrieval and the full 15-attempt budget, numerical pass@15 is 50/50 = 100%, but correct formal proofs are 40/50 = 80%; the baseline has numerical pass@15 of 45/50 = 90% and 26 correct proofs, reported as 57.7% in §5.3, p. 7. Inference: 26/45 rounds to 57.8%, so the reported 57.7% appears to truncate the conditional fraction; the overall fraction is 26/50 = 52%.

Verifier feedback alone raises the analogy method from 48% to 68% for o1, 48% to 74% for Gemini, 60% to 78% for Claude, and 64% to 96% for GPT-5; the same comparison for the baseline is 10% to 38%, 22% to 58%, 28% to 58%, and 44% to 80% (Table 2, p. 7). Inference: report attempt and restart budgets separately when comparing VL proof repair methods.

The principal baseline changes both example selection (random versus analogous) and dictionary construction (full versus analogy-derived). Controlled ablations on Gemini-2.5-Flash and Claude Sonnet 4.6 separate these choices (Table 3, p. 8; Appendix E, pp. 13–14). With three runs and verifier feedback, retrieved examples plus the full dictionary score 78% on each model; random examples plus a random-derived narrowed dictionary score 72% each; retrieved examples plus a random size-matched dictionary score 78% and 74%, respectively. The full method scores 86% on both. Inference: the main baseline comparison alone cannot attribute all gains to example retrieval; Table 3 supports contributions from both retrieval and analogy-derived theorem selection.

## evidence boundary and VL implications

The verifier checks encoded constraints and whether the answer follows from them (§3.4, p. 5). Inference: this does not establish that the encoding and specification capture the intended problem. The paper states: “the system cannot verify cases requiring inverse operations” (Limitations, p. 10). The experiments use no diagrams; the authors report errors from missing visual information and notation ambiguity (Limitations, p. 10). Generalization beyond geometry remains unevaluated (Limitations, p. 9).

Inference: the paper suggests useful proof-completion methods for VL, but does not measure their effectiveness on Verus. Retrieval and first-error feedback can materially improve agent-written proof completion, but a wrong retrieved lemma, weak contract, or omitted state assumption can produce a verifier-accepted result that does not establish the product property. VL should reuse the compact-context idea, proof-state diagnostics, bounded retries, and conditional-denominator reporting. It should not redo generic evidence that retrieval plus verifier feedback helps LLM proofs; instead it should measure Verus verification success, proof repair cost, regressions under API changes, and whether retrieved contracts preserve ownership and concurrency assumptions. These are proposed VL evaluations, not findings of this paper.

## techniques for the catalog

- structural proof abstraction: replace incidental names and values, score construction/condition/goal overlap, and retrieve high-similarity solved proofs
- analogy-derived context reduction: extract lemmas or theorem names from retrieved proofs to shrink the generation dictionary
- first-error symbolic verification: classify syntax, premise, and goal failures, then feed the first verifier diagnostic back to the generator
- bounded verifier retries: allow fixed retries per run and independent restarts, reporting proof accuracy with the exact problem denominator
- conditional proof evaluation: separate numerical-answer pass rates from formally verified-proof rates to expose answer/proof gaps

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Although our dataset includes rich symbolic annotations, covering geometric entities, relationships, constructions, and extended conditions, some errors arise due to the system’s lack of access to visual diagrams."): checked all paper text, quotations, numerical results, technique steps, section and PDF-page references, and the paper link; corrected page references, separated the coverage experiment from five-example prompting, clarified the attempt budget and baseline comparison, removed unsupported Verus syntax claims, and labeled conclusions as inferences; did not rerun experiments, inspect implementation code, or validate the proposed Verus adaptations.
