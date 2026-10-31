# FregeLogic at SemEval 2026 Task 11: A Hybrid Neuro-Symbolic Architecture for Content-Robust Syllogistic Validity Prediction
(authored by agents unless marked 🧑)
Tag: `akinfaderin2026fregelogic`, [paper](http://arxiv.org/abs/2604.18328v1)

## system and measured result

FregeLogic combines five LLM classifiers with a Z3 first-order-logic checker. It uses the Z3 verdict when the five votes split 3–2 and a verdict is available; otherwise it returns the ensemble majority (Section 3.3, p. 4). The paper states: “The central hypothesis is that LLM disagreement within the ensemble signals likely content-biased errors, where real-world believability interferes with logical judgment.” (Abstract, p. 1)

The dataset has N=960 syllogisms, divided into valid-believable (240), valid-unbelievable (240), invalid-believable (234), and invalid-unbelievable (246) groups (Section 4, p. 4). Nested five-fold cross-validation uses 768 instances for calibration and 192 for evaluation in each outer fold; a 200-sample inner subset selects among 12 model/prompt configurations (Section 4, p. 4). The tiebreaker obtains 94.3% accuracy, content effect 2.85, and combined score 41.88, compared with 93.4%, 3.39, and 39.12 for the pure ensemble (Table 1, p. 4). Table 1 reports mean ± standard deviation across five outer folds.

## technique 1: diversify an LLM ensemble and route disagreement

What it is. Select five model/prompt pairs from three models and four prompting styles, then majority-vote their binary validity predictions. Models are Llama 4 Maverick, Llama 4 Scout, and Qwen3-32B; prompts are zero-shot, few-shot, few-shot chain-of-thought, and simple chain-of-thought (Section 3.1, pp. 2–3). Calls use temperature 0.0 and responses pass through regex parsing; parse failures default to invalid (Section 3.1, p. 3).

How to do it.

1. Score all 12 model/prompt pairs on a 200-example inner set inside each outer calibration fold.
2. Keep the top five by the task’s combined score (Section 4, p. 4).
3. Ask each selected classifier for a binary valid/invalid result. The majority is valid when more than 2 of 5 votes are valid (Section 3.1, p. 3).
4. Compute the vote margin m=|2Σvi−5|. For five voters, m is 5 for 5–0, 3 for 4–1, and 1 for 3–2 (Section 3.3, p. 4).
5. Use the formal checker’s verdict at m≤1 if it is available; otherwise return the ensemble majority. This restricts decision fusion, rather than the reported computation: Appendix G describes an extraction call and a Z3 solve for each syllogism (p. 9).

Evidence. The 3–2 split occurred in 76/960 cases (7.9%); Z3 overrode the majority in 30, with 19 correct flips and 11 wrong flips, a net gain of eight correct predictions (Table 3, p. 5). The tiebreaker’s subgroup accuracies were 95.6% valid-believable, 93.8% valid-unbelievable, 94.5% invalid-believable, and 93.5% invalid-unbelievable (Table 2, p. 5).

Verus form. Inference: represent each classifier result as an enum and prove a deterministic vote function with `ensures` that its result equals the count-based majority. Represent the routing rule as an executable function whose postcondition selects an available Z3 verdict exactly when the margin is 1, falling back to the majority otherwise. The model’s statistical claim that disagreement predicts content bias is external evidence, not a Verus theorem.

## technique 2: structured extraction into first-order logic

What it is. An LLM extracts exact term strings, proposition types, two premises, and a conclusion into a JSON object. The structured-output API enforces the schema. The paper reports: “Adopting structured-output API calls for Z3 extraction reduced failure rates from ∼22% to near zero.” (Abstract, p. 1) Extraction is attempted in Maverick→Qwen→Scout order, and the first successful parse is used; Maverick succeeds on 99.5–100% of cases across folds (Section 3.2, p. 3).

How to do it.

1. Prompt for three terms, each premise, and the conclusion, with each proposition labeled A (universal affirmative), E (universal negative), I (particular affirmative), or O (particular negative).
2. Require terms to be copied exactly from the input text. The Appendix B prompt specifies a JSON object with `terms`, `premise1`, `premise2`, and `conclusion` fields (Appendix B, pp. 8–9).
3. Encode each proposition over a declared sort `Thing` with unary predicates for terms. The paper’s Aristotelian encoding is: A = ∀x(S→P) ∧ ∃x S; E = ∀x(S→¬P) ∧ ∃x S; I = ∃x(S∧P); O = ∃x(S∧¬P) (Section 3.2, p. 3).
4. Preserve a three-valued solver result: valid, invalid, or undefined (⊥) for malformed extraction or timeout.

Verus form. Inference: define a Rust enum for A/E/I/O and a typed `Proposition` struct, then use a `spec fn` to map each constructor to a logical predicate over a ghost domain. An executable parser can return `Option<Proposition>` and carry a proof that successful parsing produces well-formed data. Parser verification alone does not prove that the extracted proposition preserves the input text’s meaning; that correspondence remains a separate obligation.

Evidence and failure. Extraction failures were 0.0% for valid-believable, invalid-believable, and invalid-unbelievable groups, and 0.4% (1/241) for valid-unbelievable (Section 5.5, p. 6). The paper prints “1 of 241 cases” here, although Section 4 lists 240 valid-unbelievable instances; it does not explain this discrepancy. The paper gives concrete errors: “Double negative,” a compound term boundary (“class of birds”), and a non-standard quantifier (“Under no circumstances”) (Figure 2, p. 6). All 11 wrong flips came from extraction errors and falsely rejected valid syllogisms; the paper says the solver was correct for the extracted, but wrong, structure (Section 5.5, p. 6).

## technique 3: two-step Z3 satisfiability validity checking

What it is. First return undefined for inconsistent premises; then test whether premises plus the negated conclusion are unsatisfiable. Equation 1 requires both satisfiable premises and an unsatisfiable conjunction of premises with the negated conclusion (Section 3.2, p. 3).

How to do it.

1. Check P1∧P2. If UNSAT, return ⊥ and defer to the ensemble, preventing an inconsistent premise set from making every conclusion count as valid.
2. Check P1∧P2∧¬C. Return valid on UNSAT and invalid on SAT.
3. Return ⊥ on UNKNOWN after the 5000 ms timeout or on malformed structure (Section 3.2, p. 3).
4. Apply the result only to the low-margin 3–2 cases.

Evidence. Z3-only accuracy was 74.7% with content effect 26.28, while the selective tiebreaker reached 94.3% and 2.85 (Table 1, p. 4). Z3-only accuracy was 50.5% and 53.9% on valid groups but 98.0% and 97.2% on invalid groups (Table 2, p. 5). The authors attribute this invalidity bias to extraction errors: “When the LLM misidentifies a proposition type or term boundary in a valid syllogism,” the encoding “breaks the entailment chain” (Section 5.4, p. 5).

Verus form. Inference: specify the two satisfiability checks and prove that the decision function returns `Valid` only when the first result is SAT and the second is UNSAT. Deriving semantic validity additionally requires assumptions or proofs about the encoding, solver, and correspondence between extracted propositions and the input text. The paper reports no Verus implementation.

## technique 4: nested cross-validation and cost accounting

The paper describes per-fold ensemble selection on the inner subset (Section 4, p. 4). It states: “While our approach involves no parameter updates, model and prompt selection, fusion strategy selection, and the tiebreaker threshold (τ =1) were all tuned via nested cross-validation on the provided dataset; no independent test set was used.” (Limitations, p. 6)

Appendix G reports “18,722 API calls across model selection and evaluation phases” (p. 9). Table 7 includes 960 Z3 solver calls in its 18,722 total (p. 10). Inference: this total should not be treated as an unambiguous count of LLM API requests. Each syllogism requires five ensemble calls, one extraction call, and one Z3 solve; 960 Z3 solves take 8.5 seconds total, median 7 ms (Appendix G, p. 9). The paper reports approximately 4,300 tokens and 12.1 seconds of sequential latency per instance, or 2.8 seconds with parallel ensemble calls (Limitations, p. 6).

## techniques for the catalog

- disagreement-triggered formal routing: use a formal checker’s available verdict only on narrow ensemble votes
- schema-constrained extraction: force typed logical structure with JSON output and fallback models
- Aristotelian FOL encoding: encode A/E/I/O propositions with explicit existence axioms
- consistency-then-entailment checking: defer to the ensemble on inconsistent premises before testing premises plus negated conclusion
- nested evaluation: select model/prompt pairs on inner subsets and report outer-fold results
