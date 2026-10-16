# VERITAS: Verifier-Guided Proof Search for Zero-Shot Formal Theorem Proving
(authored by agents unless marked 🧑)
Tag: `acharya2026veritas`, [paper](https://doi.org/10.48550/arxiv.2606.19399)
## what the paper contributes

VERITAS is a zero-shot Lean 4 proof-search framework. Its claim is narrow: preserve rich verifier feedback (syntax validity, type correctness, goal progress, completion) and feed it into later generation decisions instead of reducing every attempt to pass/fail. Four agents share one proof state: a Strategist chooses one of six strategies, a Retriever supplies five Mathlib premises, a Critic scores partial states, and a Tactician proposes tactics. Phase 1 is a Best-of-5 sweep. Phase 2 runs Critic-guided Monte Carlo Tree Search (MCTS) only on Phase 1 failures and receives the failed tactics plus Lean errors as negative examples.

The paper's internal monotonicity guarantee concerns one VERITAS run: “For any fixed VERITAS run on problem set T and Phase 1 budget N, the final VERITAS solve set is a superset of that run’s own Phase 1 solve set.” (Proposition 2.1, Section 2.2, p. 3.) An independent Best-of-5 baseline is stochastic and therefore is not covered by this guarantee.

## technique 1: preserve structured verifier signals

What it is: represent each proof state as theorem, goal, hypotheses, tactic history and four Lean signals: σA syntax validity, σB type correctness, σC goal progress, and σD proof completion. The Critic value is augmented with these signals, using α1=α2=0.1, α3=0.2 and an exploration bonus β=0.1 (Section 2.1, p. 2). Goal progress receives the largest intermediate weight.

How to apply it (Section 2.1):

1. run a candidate through Lean and classify its result into σA–σD;
2. retain the exact error or unsolved-goal message in the state;
3. calculate the Critic value plus weighted signal terms;
4. backpropagate the vector-derived value through the search tree;
5. bias later candidate generation away from repeated syntax/type failures and toward partial-progress states.

Verus form (Inference: the paper is Lean-specific): run Verus on each generated Rust patch, preserve its diagnostic text and distinguish parse/type errors, failed `assert`s, and an unproved `ensures`. Verus constructs remain ordinary Rust `requires`, `ensures`, `assert`, proof functions and loop `invariant`s; the signal classifier and value model are external orchestration. Inference: Verus diagnostics do not have the paper's exact four labels, so a VL implementation must define its mapping and test it.

Evidence: on 244 miniF2F theorems, the failure taxonomy has 78 syntax failures (32%), 41 type-correct but wrong states (17%), 24 σC near-misses (10%), and 99 completed proofs (41%) (Figure 4b, p. 6). The percentages use the 244-theorem denominator and round (78/244=32.0%, 41/244=16.8%, 24/244=9.8%, 99/244=40.6%). The paper says structured signals are most useful for unknown constants, wrong arity and partial goals; they help least when a state is syntactically valid but semantically unhelpful (Section 4, p. 6).

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
7. stop when a child closes the theorem or after I=50 iterations.

Verus form (Inference): Phase 1 can generate several candidate Rust proof patches and run Verus on a batch; Phase 2 can search only functions whose first patches fail. Store exact diagnostics as negative examples. Verus checks the accepted patch; MCTS, UCB and phase routing are untrusted search code. Inference: batch validation must preserve independent private theorem/function names so one candidate cannot mask another.

Evidence with setting and denominator: Table 1 evaluates miniF2F's 244 theorems (201 non-sorry hard and 43 sorry-annotated easy) and a separate 55-theorem VERITAS-CombiBench. Best-of-5 Sonnet solves 36.9% of 244 (the table's counts are 90/244 when reconstructed from the percentage), while VERITAS solves 40.6% (99/244). On CombiBench, Best-of-5 solves 1.8% (1/55) and VERITAS 7.3% (4/55). The table reports 27 Lean calls per theorem and about $150 API cost for the full 244-theorem VERITAS run; Best-of-5 uses 5 calls and $35 (Table 3, p. 5). The paper's text states the exact miniF2F count: “VERITAS reaches 40.6% (99/244), above Best-of-5 Claude (36.9%) and a handcrafted Portfolio (26.2%).” (Section 1, p. 1.)

The internal attribution uses the 201 hard miniF2F problems: 47 solved by both methods (23.4%), 5 by independent Best-of-5 only (2.5%), 11 by VERITAS only (5.5%), and 138 by neither (68.7%) (Table 2, p. 5). Because the baseline is independently sampled, the five baseline-only cases do not contradict the internal monotonicity proposition.

## technique 3: role-specialized agents and semantic retrieval

What it is: separate strategy selection, premise retrieval, state valuation and tactic generation. The Strategist selects direct, induction, contradiction, cases, rewrite or apply_lemma plus a depth estimate. The Retriever scores Mathlib lemmas by weighted token overlap and returns top k=5. The Tactician receives the strategy, premises, Critic guidance and all prior failures. The Critic returns a value in [0,1], up to three suggestions and a prune decision (Sections 2 and Appendix D, pp. 2, 9).

Steps: tokenize goal and lemma signatures; weight type tokens 3, operators 2 and logical connectors 1; return five premises; choose a strategy; score each partial state; generate six complete tactic blocks; reject candidates that fail syntax; and continue from the surviving children. In the worked CombiBench case, Best-of-5 hallucinated nonexistent `Nat.choose_sum`; after Lean's unknown-constant error was added to the failure history, the Tactician emitted `Finset.sum_pow_choose_eq` and solved the theorem on iteration 14 (Appendix H, p. 10).

Verus form (Inference): index `spec fn` and proof-function names/statements, rank them for a target assertion, and provide the top five to a generator. Retrieval remains heuristic; Verus alone decides whether a selected proof function type-checks and establishes its `ensures`.

Evidence: the paper reports no isolated retrieval recall experiment. Its CombiBench case is one theorem, not a denominator-wide result. The method's broad result is the 7.3% (4/55) CombiBench rate above.

Quote: “The Retriever surfaces the top k=5 Mathlib premises by weighted keyword overlap over goal tokens, lemma names, and statement signatures.” (Section 2, p. 2.)

## technique 4: batched verifier validation

What it is: put K=6 candidate tactics into one Lean file as private theorems sharing imports and hypotheses, then map JSON diagnostics back to each candidate by line range. This amortizes Mathlib import and elaboration overhead.

Steps from Section 2.3 and Appendix F (pp. 3, 10): emit one private theorem per tactic; call `lake env lean -json` once; classify each diagnostic as σA–σD; and retain only successful or progress-making candidates. The paper reports 6 candidates at about 1.05× the wall-clock of one sequential check (5.7× speed-up), approaching 20× at K=16 when per-file overhead dominates (p. 3 and Appendix F, p. 10).

Verus form (Inference): generate separate private proof functions or modules in a temporary Rust file, run Verus once, and map diagnostics to source ranges. Ensure each candidate has isolated state. The paper's Lean JSON schema does not carry over.

Limits: the reported speedup is a harness measurement, not a proof-search solve-rate result; the exact machine details are not given in the excerpt.

Quote: “Empirically the cost ratio is K=6 candidates in ∼1.05× the wall-clock of a single tactic check, vs. K×1.0 ≈ 6× for the sequential baseline.” (Appendix F, p. 10.)

## technique 5: benchmark and failure-directed diagnosis

What it is: separate easy and hard cases and classify each unsolved theorem by its deepest verifier signal. miniF2F has 43 sorry-annotated and 201 non-sorry problems; CombiBench has 55 author-verified, sorry-free combinatorics theorems (Section 3.1, p. 3; Appendix G, p. 10).

The easy/hard split shows Portfolio, Best-of-5 and VERITAS solve 65.1%, 88.4% and 95.3% of the 43 easy problems, versus 18.9%, 25.9% and 28.9% of the 201 hard problems (Figure 3b, p. 5). These percentages have denominators 43 and 201 respectively. The failure categories then identify whether to improve retrieval (syntax), Critic/value (type-correct but wrong), or search budget (σC near-miss).

Verus form (Inference): maintain separate evaluation sets for trivial and difficult Rust specifications and report both denominators. Categorize failed runs by the deepest Verus diagnostic rather than a single pass/fail count.

Quote: “The 11 MCTS-unique theorems each require 2–4 dependent tactics where each step depends on the previous step’s effect on the goal.” (Section 3.5, p. 5.)

## what is proved, measured and trusted

Proved inside the paper: the set-inclusion monotonicity proposition for a fixed VERITAS run, plus the correctness of author-supplied Lean reference proofs for all 55 CombiBench statements. Measured: solve rates, phase attribution, category split, Lean-call and API budgets, failure categories, and a three-seed 50-theorem miniF2F subset with solve-rate standard deviation ±1.4 percentage points and ±2.1 Lean calls per theorem (Appendix J, p. 11). The 50-theorem subset is 10 per category; it is not the full-benchmark confidence estimate.

Trusted or assumed: Claude outputs, strategy labels, retrieval ranking, Critic values, failure classification, prompt templates, the benchmark curation, and the mapping from natural-language theorem statements to Lean statements. Lean checks the generated proof terms but cannot certify that the formal theorem matches the user's intended theorem. The authors explicitly warn: “The main risk is over-trusting unchecked generated proofs.” (Section 6, p. 6.)

## what VL should not redo and product threat

Already done here: a verifier-feedback state representation; two-phase monotonic routing; role-separated strategy/retrieval/critic/tactic agents; semantic premise retrieval; batch checking; failure taxonomy; and measurements showing where dependent proof continuations help. VL should adapt these to Verus and measure Rust-specific diagnostics rather than repeat the Lean motivation.

Inference: threat to a product that emits agent-written verified Rust is moderate. VERITAS demonstrates a strong search-control pattern, but it proves only the final Lean artifact and reports 40.6% on 244 miniF2F theorems, not end-to-end Rust correctness or natural-language fidelity. The principal engineering risks are incorrect translation, noisy diagnostic classification, and retrieval hallucinations. Verus can close the proof-checking gap for accepted Rust, while the orchestration and intent mapping remain outside the proof.

## techniques for the catalog

- structured verifier signals — preserve syntax, type, progress and completion diagnostics as search state
- two-phase verifier-guided MCTS — run Best-of-N first, then search only failures with errors as negative examples
- role-specialized proof agents — separate strategy, retrieval, critique and tactic generation over one proof state
- semantic premise retrieval — rank lemmas by weighted goal/signature tokens and feed the top five to generation
- batched proof validation — check six isolated candidates in one verifier invocation and map diagnostics by source range
- failure-directed evaluation — split easy/hard benchmarks and use deepest verifier signals to target improvements
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
