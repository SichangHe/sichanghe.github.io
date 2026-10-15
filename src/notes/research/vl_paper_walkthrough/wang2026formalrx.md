# FormalRx: Rectify and eXamine Semantic Failures in Autoformalization
(authored by agents unless marked 🧑)
Tag: `wang2026formalrx`, [paper](http://arxiv.org/abs/2607.04655v1)

## diagnostic task

FormalRx changes autoformalization evaluation from a binary verdict into four outputs: alignment verdict, error category, error location, and corrected formal statement. The paper defines the target as mapping an informal statement S and candidate formalization F to a structured diagnostic sequence (§4.1, p. 6). It says: “In this paper, we introduce FormalRx to transform autoformalization assessment from opaque binary judgments into actionable diagnostic feedback.” (§1, p. 2).

Use this when a compiler check says only that code is legal. First classify `Aligned` or `Misaligned`. If misaligned, assign one of 28 Sci Error Taxonomy categories, identify the smallest problematic code segment, and generate a rectified statement F′ (§4.1, p. 6). The taxonomy has three dimensions: Semantic, Constraint, and Implementation. Specific categories have priority over location-based fallbacks such as incorrect premise, conclusion, or auxiliary construction (§3.1, pp. 4–5). This prevents one defect from receiving competing labels.

## technique: build a partitioned error taxonomy

The authors manually review approximately 2,000 misaligned pairs, abstract recurring patterns, and refine categories by synthesis and spot checks (§3.2, p. 5). Semantic categories include quantifier/connective, object/function/operator, exponent/coefficient/index, infinity/extremum/cardinality, integration/differentiation, and geometry errors. Constraint categories cover positivity, bounds, domains, variables, range shifts/range errors, missing or redundant premises, incorrect premises, conclusions, and auxiliary constructions. Implementation categories capture Lean-specific truncation and operator-precedence behavior (§3.3, pp. 5–6; Appendix F, pp. 29–31).

The priority rule matters operationally: a logical connective misuse in a conclusion receives the specific connective label before the generic conclusion label (§3.1, p. 4). The paper states: “Specific error types take precedence over location-based classifications.” (§3.1, p. 4). Empirical validation reports 56,673 compiled error instances, 52,521 with stable labels after re-tagging, 86.2% expert validation accuracy and 94.7% agreement, and a 200-sample spot check with 98% correct labeling (§3.2, p. 5). These denominators refer to taxonomy validation, not product correctness.

Inference: adapt the semantic and constraint categories to Verus contracts, adding Verus-specific implementation categories only after collecting actual failures. Candidate examples include vacuous `ensures`, missing `requires`, wrong quantified domains, and incorrect loop `invariant`. Use Verus syntax and semantics from the established Verus notes; do not import Lean-specific truncation labels unchanged.

## technique: synthesize and filter diagnostic training data

Start with 17,825 aligned NL–formal pairs: 7,479 from curated datasets and 10,346 from Mathlib documentation (§4.2, p. 7). Exclude MiniF2F and ProofNet as seed sources because documented alignment problems would contaminate synthetic generation (§4.2, p. 7). An LLM then performs taxonomy-guided error injection: for each seed, create a misaligned variant for applicable categories and attach category, location, explanation, and correction (§4.3.1, p. 7). The paper's pipeline produces about 70,000 raw candidates. Discard candidates that fail Lean compilation, then have a second LLM independently validate and re-tag the survivors; 52,521 samples pass into the dataset (Figure 3, p. 7; §3.2, p. 5).

This ordering isolates semantic errors from syntax errors. The paper says: “For code validity, all synthesized formal statements are verified through the Lean REPL ..., with compilation failures immediately discarded to isolate semantic misalignment from syntactic errors.” (§4.3.2, p. 8). Inference: for Verus, run the actual verifier on each injected Rust candidate, discard parse/type/proof failures when the training target is semantic diagnosis, and have a second checker validate category, location, and repair against the original contract.

## technique: unified supervised diagnostic generation

FormalRx fine-tunes one model with cross-entropy to emit all four fields in one forward pass (§5.1, p. 8). The authors argue this avoids error propagation between cascaded stages and shares representations of global semantic and local syntactic information (§5.1, p. 8). Evaluate verdict and categorization with accuracy, precision, recall, and macro F1. Evaluate location and correction in two stages: exact string match first; for nonmatches, an LLM judges semantic equivalence against the shared problem and formal statement (§5.2, p. 8).

On FormalRx-Test, the 8B model reaches verdict F1 0.881, categorization F1 0.709, localization accuracy 0.750, and correction accuracy 0.729 (Table 3, p. 9). The table reports 4,563 exact localization matches plus 707 LLM-recovered cases, and 4,551 exact correction matches plus 571 recovered cases. The test set contains 7,030 held-out samples (§1, p. 2). These are in-distribution results; the paper explicitly notes the asymmetry that baselines are zero-shot while FormalRx is fine-tuned (§5.2, p. 8).

Out of domain, only binary verdict is available. On ConsistencyCheck, FormalRx-8B F1 is 0.596 versus Qwen3-8B's 0.565; on EPLA, FormalRx-1.7B reaches 0.541 (§6.2, pp. 10–11). The authors caution that verdict F1 depends on class priors and is a noisy indicator when labels contain different ratios (§6.2, p. 10).

## Verus form, trust, and limits

Inference: represent a Verus diagnostic record as a Rust-side or external schema containing verdict, category, source span, corrected code, and verifier status. A repair candidate should be checked with `cargo verus`; only the verifier establishes the stated contract. Use `spec fn` for semantic predicates and `requires`/`ensures` for contracts, with loop `invariant` clauses where relevant. A generated correction is still a proposal until Verus accepts it and a human confirms the intended property.

FormalRx's 28 categories are learned from bounded human review and synthetic Lean errors. The authors state that taxonomy coverage is not provably complete and that implementation categories are Lean-specific (§8, p. 12). Trusted components include the LLM that injects errors, the LLM that re-tags them, Lean's compiler, the LLM judge for non-exact matches, and the quality of seed alignments. Inference: threat to agent-written verified Rust is high for semantic omissions that still verify, especially missing assumptions and over-strong or vacuous postconditions. FormalRx provides a useful failure vocabulary and repair loop, but it cannot prove that the taxonomy covers every product-level mismatch.

## techniques for the catalog

- partitioned semantic taxonomy: classify each mismatch into prioritized semantic, constraint, or implementation categories
- taxonomy-guided error injection: synthesize one labeled misalignment per applicable category from aligned seed pairs
- compile then re-tag filtering: discard invalid code, then independently validate labels, locations, and repairs
- unified diagnostic generation: emit verdict, category, location, and correction in one supervised forward pass
- two-stage equivalence scoring: exact-match outputs first, then judge semantically equivalent alternatives
Checked 2026-10-15 against paper wang2026formalrx: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
