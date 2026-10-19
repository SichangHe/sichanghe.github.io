# VERITAS: Verifier-Guided Proof Search for Zero-Shot Formal Theorem Proving
(authored by agents unless marked 🧑)
Tag: `acharya2026veritas`, [paper](https://arxiv.org/abs/2606.19399)
## what the paper contributes

VERITAS is a zero-shot Lean 4 proof-search framework. Its claim is narrow: preserve rich verifier feedback (syntax validity, type correctness, goal progress, completion) and feed it into later generation decisions instead of reducing every attempt to pass/fail. Four agents share one proof state: a Strategist chooses one of six strategies, a Retriever supplies five Mathlib premises, a Critic scores partial states, and a Tactician proposes tactics. Phase 1 is a Best-of-5 sweep. Phase 2 runs Critic-guided Monte Carlo Tree Search (MCTS) only on Phase 1 failures and receives the failed tactics plus Lean errors as negative examples.

The paper's internal monotonicity guarantee concerns one VERITAS run: “the final VERITAS solve set is a superset of that run’s own Phase 1 solve set” (Proposition 2.1, Section 2.2, p. 3.) An independent Best-of-5 baseline is stochastic and therefore is not covered by this guarantee.

## technique 1: preserve structured verifier signals

What it is: represent each proof state as theorem, goal, hypotheses, tactic history and four Lean signals: σA syntax validity, σB type correctness, σC goal progress, and σD proof completion. The Critic value is augmented with these signals, using α1=α2=0.1, α3=0.2 and an exploration bonus β=0.1 (Section 2.1, p. 2). Goal progress receives the largest intermediate weight.

How to apply it (Section 2.1):

1. run a candidate through Lean and classify its result into σA–σD;
2. retain the exact error or unsolved-goal message in the state;
3. calculate the Critic value plus weighted signal terms;
4. backpropagate the structured signal and augmented value through the search tree;
5. bias later candidate generation away from repeated syntax/type failures and toward partial-progress states.

Verus form (Inference: the paper is Lean-specific): run Verus on each generated Rust patch, preserve its diagnostic text and distinguish parse/type errors, failed `assert`s, and an unproved `ensures`. Use Verus specifications and proof code, including `requires`, `ensures`, `assert`, proof functions and loop `invariant`s; keep the signal classifier and value model in external orchestration. Inference: Verus diagnostics do not have the paper's exact four labels, so a VL implementation must define its mapping and test it.

Evidence: on 244 miniF2F theorems, the failure taxonomy has 78 syntax failures (32%), 41 type-correct but wrong states (17%), 24 σC near-misses (10%), 99 completed proofs (41%), and 2 other cases (1%) (Figure 4b, p. 6). The percentages use the 244-theorem denominator and round (78/244=32.0%, 41/244=16.8%, 24/244=9.8%, 99/244=40.6%). The authors argue that structured signals are most useful for unknown constants, wrong arity and partial goals; they help least when a state is syntactically valid but semantically unhelpful (Section 4, p. 6).

Quote: “VERITAS shows that structured Lean feedback can guide zero-shot proof search without trace fine-tuning.” (Section 6, p. 6.)

## technique 2: two-phase Best-of-N then critic-guided MCTS

What it is: spend a cheap Best-of-N sweep first, then search only unsolved theorems with MCTS. Failed Phase 1 tactics and Lean errors become explicit negative examples. This both preserves every Phase 1 solve and concentrates expensive search where feedback can guide a continuation.

Algorithm 1 (p. 3) gives the operational steps:

1. for each theorem, generate N=5 Claude tactics and validate all in one Lean batch;
2. immediately record a theorem solved by any candidate;
3. for each failure, initialize an MCTS root and cache `(tactic,error)` pairs;
4. select leaves with UCB plus Critic value and strategy alignment;
5. run Strategist, Retriever and Critic, then ask Tactician for K=6 candidates conditioned on the failure set;
6. validate the six candidates in one batch, expand syntactically valid children, append new errors, and backpropagate value;
7. stop when a child closes the theorem or the iteration/time budget is exhausted: I=50, maximum depth 10, 300 seconds on miniF2F and 600 seconds on CombiBench (Section 3.1, p. 3).

Verus form (Inference): Phase 1 can generate several candidate Rust proof patches and run Verus on a batch; Phase 2 can search only functions whose first patches fail. Store exact diagnostics as negative examples. Verus checks the accepted patch; MCTS, UCB and phase routing are untrusted search code. Inference: Verus batching needs independent candidate checks; the Lean private-theorem construction is not evidence that Rust function isolation suffices.

Evidence with setting and denominator: Table 1 evaluates miniF2F's 244 theorems (201 non-sorry hard and 43 sorry-annotated easy) and a separate 55-theorem VERITAS-CombiBench. Best-of-5 Sonnet solves 36.9% of 244 (Inference: 90/244, reconstructed from the reported percentage), while VERITAS solves 40.6% (99/244). On CombiBench, Best-of-5 solves 1.8% (Inference: 1/55, reconstructed from the percentage) and VERITAS 7.3% (4/55). The table reports 27 Lean calls per theorem and about $150 API cost for the full 244-theorem VERITAS run; Best-of-5 uses 5 calls and $35 (Table 3, p. 6). These are reported budgets, not reconciled measurements: Section 2.2 describes one batched Phase 1 Lean invocation, whereas Table 3 lists five Lean calls for Best-of-5. Appendix I (p. 11) gives a different full-sweep cost, $125.7. Section 1 (p. 2) reports: “On miniF2F, VERITAS reaches 40.6% (99/244), above Best-of-5 Claude (36.9%) and a handcrafted Portfolio (26.2%); a phase-wise decomposition identifies 11 theorems no flat-sampling budget can reach.” The evidence for the final clause is limited: Table 2 says a separately verified N=25 flat run found none of those 11; it does not establish impossibility at arbitrary sampling budgets.

The internal attribution uses the 201 hard miniF2F problems: 47 solved by both methods (23.4%), 5 by independent Best-of-5 only (2.5%), 11 by VERITAS only (5.5%), and 138 by neither (68.7%) (Table 2, p. 5). Because the baseline is independently sampled, the five baseline-only cases do not contradict the internal monotonicity proposition.

## technique 3: role-specialized agents and keyword retrieval

What it is: separate strategy selection, premise retrieval, state valuation and tactic generation. The Strategist selects direct, induction, contradiction, cases, rewrite or apply_lemma plus a depth estimate. The Retriever scores Mathlib lemmas by weighted token overlap and returns top k=5. The Tactician receives the strategy, premises, Critic guidance and all prior failures. The Critic returns a value in [0,1], up to three suggestions and a prune decision (Sections 2 and Appendix D, pp. 2, 9).

Steps: choose a strategy; tokenize goal and lemma signatures, weighting type tokens 3, operators 2 and logical connectors 1; return five premises to the Tactician and Critic; score the partial state; generate six complete tactic blocks; validate them; and create children for syntactically valid candidates (Section 2.1, p. 2; Appendix E, pp. 9–10). In the worked CombiBench case, Best-of-5 hallucinated nonexistent `Nat.choose_sum`; after Lean's unknown-constant error was added to the failure history, the Tactician emitted `Finset.sum_pow_choose_eq` and solved the theorem on iteration 14 (Appendix G, p. 10).

Verus form (Inference): index `spec fn` and proof-function names/statements, rank them for a target assertion, and provide the top five to a generator. Retrieval remains heuristic; Verus alone decides whether a selected proof function type-checks and establishes its `ensures`.

Evidence: Appendix E (p. 10) says, “We did not tune weights; defaults gave the highest recall on a 50-lemma held-out probe set.” It gives no numerical recall result or isolated retrieval solve-rate ablation. The worked CombiBench case is one theorem, not a denominator-wide result. The method's broad result is the 7.3% (4/55) CombiBench rate above.

Quote: “results are appended to the Tactician’s prompt and passed to the Critic as context.” (Section 2, p. 2.)

## technique 4: batched verifier validation

What it is: put K=6 candidate tactics into one Lean file as private theorems sharing imports and hypotheses, then map JSON diagnostics back to each candidate by line range. This amortizes Mathlib import and elaboration overhead.

Steps from Section 2.3 and Appendix F (pp. 3, 10): emit one private theorem per tactic; call `lake env lean -json` once; classify each diagnostic as σA–σD; and create child nodes for syntactically valid candidates (Section 2.1, p. 2). Appendix F reports 6 candidates at about 1.05× the wall-clock of one sequential check (5.7× speed-up), growing to approximately 20× at K=16 (p. 10). Section 2.3 instead claims approximately 10× at K=6 (pp. 3–4); the paper does not reconcile these figures.

Verus form (Inference): generate separate private proof functions or modules in a temporary Rust file, run Verus once, and map diagnostics to source ranges. Ensure each candidate has isolated state. The paper's Lean JSON schema does not carry over.

Limits: the reported speedup is a harness measurement, not a proof-search solve-rate result. Appendix C (p. 8) specifies a single 8-core machine with no GPU, Lean 4.14.0 and Mathlib commit `e9f8a37`, but no processor model. Appendix F maps unsolved-goal messages to σC, type-mismatch messages to σB, and parse errors or unknown constants to σA (p. 10). Inference: these diagnostic classes should not be equated mechanically with the positive validity flags in Section 2; the paper is inconsistent about their meaning.

Quote: “Empirically the cost ratio is K=6 candidates in ∼1.05× the wall-clock of a single tactic check, vs. K×1.0 ≈ 6× for the sequential baseline (a 5.7× speed-up that grows to ∼20× at K=16).” (Appendix F, p. 10.)

## technique 5: benchmark and failure-directed diagnosis

What it is: separate easy and hard cases and classify each unsolved theorem by its deepest verifier signal. miniF2F has 43 sorry-annotated and 201 non-sorry problems; CombiBench has 55 author-verified, sorry-free combinatorics theorems (Section 3.1, p. 3; Appendix G, p. 10).

The easy/hard split shows Portfolio, Best-of-5 and VERITAS solve 65.1%, 88.4% and 95.3% of the 43 easy problems, versus 18.9%, 25.9% and 28.9% of the 201 hard problems (Figure 3b, p. 5). These percentages have denominators 43 and 201 respectively. Inference: the Portfolio split implies 28+38=66 solves, inconsistent with the overall 26.2% of 244 (64 solves); the paper does not resolve this. Section 3.7 (p. 6) recommends retrieval/templates for syntax failures, a learned Critic for type-correct but wrong states, and a learned Critic or larger budget for σC near-misses.

Verus form (Inference): maintain separate evaluation sets for trivial and difficult Rust specifications and report both denominators. Categorize failed runs by the deepest Verus diagnostic rather than a single pass/fail count.

Quote: “The 11 MCTS-unique theorems each require 2–4 dependent tactics where each step depends on the previous step’s effect on the goal.” (Section 3.5, p. 5.)

## what is proved, measured and trusted

Proved inside the paper: the set-inclusion monotonicity proposition for a fixed VERITAS run (Proposition 2.1, p. 3). Author-reported verification: all 55 CombiBench statements have sorry-free Lean 4 reference proofs (Section 3.1, p. 3; Appendix G, p. 10); this study has not checked those proofs. Measured: solve rates, phase attribution, category split, Lean-call and API budgets, failure categories, and a three-seed 50-theorem miniF2F subset with solve-rate standard deviation ±1.4 percentage points and ±2.1 Lean calls per theorem (Appendix J, p. 11). The 50-theorem subset is 10 per category; it is not the full-benchmark confidence estimate.

Inference: Claude outputs, strategy labels, retrieval rankings and Critic values guide search; they are not independent proof certificates. Final acceptance depends on Lean and the formal statement. Benchmark curation, diagnostic classification and the mapping from natural-language problems to Lean statements remain assumptions for interpreting the results. Lean acceptance does not establish that a formal theorem captures a user's intended theorem. The authors warn: “This work advances automated formal reasoning; the main risk is over-trusting unchecked generated proofs.” (Appendix A, p. 8.)

## what VL should not redo and product threat

Inference: prior work here already supplies a verifier-feedback state representation; two-phase monotonic routing; role-separated strategy/retrieval/critic/tactic agents; keyword premise retrieval; batch checking; failure taxonomy; and measurements showing where dependent proof continuations help. VL should adapt these to Verus and measure Rust-specific diagnostics rather than repeat the Lean motivation.

Inference: threat to a product that emits agent-written verified Rust is moderate. VERITAS supplies a search-control pattern with author-reported Lean verification of accepted artifacts and reports 40.6% on 244 miniF2F theorems, not end-to-end Rust correctness or natural-language fidelity. The principal engineering risks are incorrect translation, noisy diagnostic classification, and retrieval hallucinations. Verus can close the proof-checking gap for accepted Rust, while the orchestration and intent mapping remain outside the proof.

## techniques for the catalog

- structured verifier signals — preserve syntax, type, progress and completion diagnostics as search state
- two-phase verifier-guided MCTS — run Best-of-N first, then search only failures with errors as negative examples
- role-specialized proof agents — separate strategy, retrieval, critique and tactic generation over one proof state
- keyword premise retrieval — rank lemmas by weighted goal/signature tokens and feed the top five to generation
- batched proof validation — check six isolated candidates in one verifier invocation and map diagnostics by source range
- failure-directed evaluation — split easy/hard benchmarks and use deepest verifier signals to target improvements
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The idea extends beyond Lean: SMT unsat cores, Coq/Agda goals, symbolic-execution counterexamples, and model-checking traces provide similar structure, though soft verifiers require calibrated thresholds."): read the entire paper, including references and appendices, and checked the full study's quotations, numbers, technique steps, page/section references, tag and paper identifier; corrected quotations and citations, retrieval and batching descriptions, failure-category coverage and trust claims, marked adaptations and conclusions as inferences, and noted unresolved numerical inconsistencies; did not rerun experiments, inspect the released implementation/reference proofs, or test the proposed Verus adaptations.
