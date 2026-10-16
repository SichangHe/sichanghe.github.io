# Reliable Proof Generation with LLMs via Analogical Retrieval and Symbolic Verification: A Case Study in Euclidean Geometry
(authored by agents unless marked 🧑)
Tag: `sultan2025reliable`, [paper](https://doi.org/10.48550/arxiv.2505.14479)

## scope and result

Sultan, Stern, and Shahaf combine retrieval of structurally analogous solved problems with a symbolic verifier that returns the first proof error to an LLM. The testbed is 6,981 SAT-level Euclidean geometry problems in FormalGeo-7k. Their definition of reliable is narrow: “Throughout the paper, we use reliable to refer to the generation of proofs formally verified by a symbolic verifier.” (footnote 1, p. 2) The pipeline is therefore a method for producing verifier-accepted proofs, not evidence that the theorem dictionary, formalization, or target specification is complete.

Inference: for VL, the direct pattern is retrieval-augmented proof repair: retrieve similar verified Verus proofs, construct a small relevant context, ask the model for a proof, compile with Verus, and feed the first diagnostic back. The geometry representation, theorem names, and Z3 workarounds do not carry over unchanged.

## technique 1: abstract problems and retrieve analogous proofs

What it is. The authors replace entity names by `<word>` and numbers by `<num>` in construction, conditions, and goal. They compute Jaccard similarities over abstract construction and condition multisets plus exact goal similarity. A three-layer regressor predicts proof similarity from these three features. The training set starts from approximately 24.4 million pairs, bins proof similarity into five width-0.2 intervals, downsamples each bin to 131K, and trains on 655K pairs with a 90/10 split, MSE, Adam, learning rate 0.001, batch size 32, and 10 epochs (§3.1–3.2, pp. 3–4; Appendix A, p. 11).

How to apply it.

1. Choose an abstraction that removes incidental names and values while retaining structural relations (§3.1, p. 3).
2. Compute pair features from abstract constructions, conditions, and goals.
3. Train a predictor for proof similarity using known proof overlap as the label (§3.2, p. 4).
4. At inference, rank all candidate problems by predicted similarity and keep the top `k` analogies.
5. Retrieve each analogy's complete proof and use those proofs as few-shot examples and as a source of relevant theorem names (§3.3, p. 4).

The authors evaluate theorem coverage by checking whether the union of theorem names in the top-k analogies contains every theorem in a target proof. For 100 randomly sampled targets (20 at each difficulty level), top-100 analogies cover 96% of entire proofs while supplying 26.66 theorems on average; random problems cover 88% while supplying 66.98 theorems (Table 1, p. 4). This is a conservative coverage estimate because a proof may be possible without every theorem used by the reference proof (p. 4).

Verus form (Inference). Index existing Verus proof files by normalized API calls, predicates, data-structure operations, and contract shapes. Retrieve examples whose abstract `requires`/`ensures` relations and goal expressions overlap with a new obligation. Keep the original code names in the retrieved proof only after checking type compatibility. The regressor and Jaccard score are orchestration code; Verus uses the retrieved text as context, then independently verifies the new proof. A `proof fn` or `lemma` is valid only if it compiles; retrieval never proves a goal. Inference: normalization should preserve ownership, mutability, and quantified-state structure because replacing those with generic placeholders could retrieve an unsoundly mismatched proof.

Limits. The abstraction is intentionally simple. The authors state that “More nuanced abstraction schemas (e.g., preserving shared symbols between words) are left for future work.” (§3.1, p. 3) Inference: the same failure matters for VL: two obligations can have the same names of operations but different aliasing or arithmetic assumptions.

## technique 2: narrow the theorem or lemma context from retrieved proofs

What it is. The full geometry dictionary has 196 theorems (234 including variations), but the model receives only theorems appearing in retrieved proofs. With `k=100`, the average dictionary shrinks to 26.66 theorem names, 13.6% of the full dictionary, while retaining 96% complete-proof coverage (Table 1, p. 4). The paper's motivation is both fewer tokens and a smaller search space.

How to apply it.

1. Retrieve top-k analogies.
2. Extract theorem identifiers used in their proofs.
3. Build an abridged dictionary containing each selected theorem's premises and conclusions.
4. Put the target problem, analogies with full proofs, and the abridged dictionary in an in-context prompt (§3.3, p. 4).
5. Require every generated proof step to call only a theorem in the supplied dictionary.

Verus form (Inference). Construct a retrieval context of candidate lemmas and their contracts, but leave the actual module imports and visibility explicit. Use `requires`/`ensures` signatures and proof bodies from compatible examples; do not copy an `external_body` function as the proof target. The narrowed context can reduce LLM search and prompt cost, but Verus still sees whatever facts are in scope. Inference: an analogous-lemma index should be paired with a dependency check so that omitted facts produce a compiler error rather than an invented theorem.

Evidence and cost. On 50 test problems, the paper reports full-method prompts averaging about 2.5K theorem-dictionary tokens versus about 18K for the baseline full dictionary (p. 2 and §5.3, p. 6). The baseline is approximately three times more expensive by their logged API calls and current prices (§5.3, p. 6), but this is a geometry/LLM cost comparison rather than a Verus compile-time result.

## technique 3: symbolic verifier with first-error feedback

What it is. The verifier encodes each theorem call and geometric constraint as logical formulas and algebraic expressions, then checks satisfiability and whether the numeric answer is entailed. It returns natural-language feedback identifying the first error. The paper says: “After each attempt to produce a proof, the verifier provides natural-language feedback, specifying the first error found in the proof.” (§3.4, p. 5) Three error tiers make feedback actionable: undefined theorem or bad signature; a theorem call using an undeduced premise; and a proof that is locally valid but does not reach the goal (§3.4, p. 5).

How to apply it.

1. Give the LLM the target, retrieved examples, and dictionary, then request a theorem sequence (§3.3, p. 4).
2. Parse the sequence and check theorem syntax and argument signatures (tier 1).
3. Reconstruct derived premises and use Z3 to check each step's geometric/algebraic constraints (tier 2).
4. Check that the final answer is entailed; if not, report underconstraint or a mismatch with the verifier's unique solution (tier 3).
5. Append the feedback to the conversation and retry up to five times; restart from scratch up to three independent runs (§4, p. 5).
6. Accept only a proof and answer that the verifier validates.

The implementation uses Z3 for tier-2 and tier-3 checks and adds symbolic workarounds for trigonometric functions unavailable natively (Appendix C, p. 11). It introduces symbolic variables such as `cos_ABC`, adds referenced angles to the constraint graph, and either matches known values or reasons symbolically when exact evaluation is impossible (Appendix C, p. 11).

Verus form (Inference). Compile each generated Rust proof with Verus and classify diagnostics similarly: syntax/type errors; failed `requires` or missing derived facts; and an unmet final `ensures`. Feed the first diagnostic and the relevant obligation back, preserving the compiling prefix. Verus loop invariants use `invariant(...)` on loop syntax; `ensures` belongs on executable functions, and `spec fn` definitions remain pure specifications. Inference: the tier taxonomy is useful, but Verus diagnostics are compiler/prover obligations rather than a custom geometry solver, so no Z3 trigonometric workaround should be copied into Rust.

## technique 4: bounded retries and independent runs

What it is. The evaluation treats verifier retries and independent restarts as distinct resources. A run allows five retries after feedback; a problem may have three fresh runs. The notation `base_i,j`/`ours_i,j` records runs and retries (§4, p. 5). Their 50-problem evaluation samples ten problems at each of five proof-depth levels; difficulty is the number of ground-truth proof steps (§4, p. 5).

Evidence. Table 2 reports fractions over these 50 problems. With one run and no retries, analogy guidance raises o1 from 10% to 48%, GPT-5 from 44% to 64%, Gemini-Flash-2.5 from 22% to 48%, and Claude Sonnet 4.6 from 28% to 60%. With one run and five retries, the corresponding values are 38% to 68%, 80% to 96%, 58% to 74%, and 58% to 78%. With three runs and five retries, they are 52% to 80%, 88% to 96%, 72% to 86%, and 78% to 86% (Table 2, p. 6; each percentage denominator is 50 problems). For o1 with analogy retrieval and the full 15-attempt budget, numerical pass@15 is 50/50 = 100%, but correct formal proofs are 40/50 = 80%; the baseline has numerical pass@15 of 45/50 = 90% and 26 correct proofs, reported as 57.7% in §5.3, p. 6. The 26/45 conditional fraction is consistent with 57.8% after rounding; it is different from the 26/50 overall 52% in Table 2.

Verifier feedback alone raises the analogy method from 48% to 68% for o1, 48% to 74% for Gemini, 60% to 78% for Claude, and 64% to 96% for GPT-5; the same comparison for the baseline is 10% to 38%, 22% to 58%, 28% to 58%, and 44% to 80% (Table 2, p. 6). Inference: retries should be budgeted against the value of a verified proof, not treated as an unbounded safety argument.

## evidence boundary and VL implications

The verifier checks that generated theorem calls satisfy the encoded geometry constraints and that the answer is entailed. It does not establish that the geometry encoding, theorem dictionary, abstraction, or natural-language problem captures the intended world. The paper's verifier limitation is explicit: Z3 lacks inverse trigonometric support, despite workarounds for direct functions (Limitations, p. 7). The experiments use no diagrams; the authors report errors from missing visual information and notation ambiguity (Limitations, p. 7). Generalization beyond geometry is untested.

Inference: product threat is moderate to high. Retrieval and first-error feedback can materially improve agent-written proof completion, but a wrong retrieved lemma, weak contract, or omitted state assumption can produce a verifier-accepted result that does not establish the product property. VL should reuse the compact-context idea, proof-state diagnostics, bounded retries, and conditional-denominator reporting. It should not redo generic evidence that retrieval plus verifier feedback helps LLM proofs; instead it should measure Verus compile success, proof repair cost, regressions under API changes, and whether retrieved contracts preserve ownership and concurrency assumptions.

## techniques for the catalog

- structural proof abstraction: replace incidental names and values, score construction/condition/goal overlap, and retrieve high-similarity solved proofs
- analogy-derived context reduction: extract lemmas or theorem names from retrieved proofs to shrink the generation dictionary
- first-error symbolic verification: classify syntax, premise, and goal failures, then feed the first verifier diagnostic back to the generator
- bounded verifier retries: allow fixed retries per run and independent restarts, reporting proof accuracy with the exact problem denominator
- conditional proof evaluation: separate numerical-answer pass rates from formally verified-proof rates to expose answer/proof gaps

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
