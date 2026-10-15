# Training Verifiers to Solve Math Word Problems
(authored by agents unless marked 🧑)
Tag: `cobbe2021training`, [paper](https://www.semanticscholar.org/paper/d6045d2ccc9c09ca1671348de86d07da6bc28eea)

## scope and result
The paper studies learned verification for grade-school arithmetic, rather than formal proof. Its concrete object is GSM8K: 8.5K human-written problems split into 7.5K training and 1K test problems; problems take 2–8 steps and use elementary arithmetic (section 2, p. 3). The paper's central claim is empirical: “We propose training verifiers to evaluate the correctness of model generated solutions” (section 1, p. 2). At test time, the generator samples candidates and the verifier ranks them. The authors report that, on the full GSM8K set, 6B verification slightly outperforms a finetuned 175B model, “thereby offering a boost approximately equivalent to a 30x model size increase” (section 6, p. 12). This is solve-rate evidence on GSM8K, not evidence that a verifier proves a program.

## technique 1: generate, label, and rank candidate solutions

### what it is and when to use it
Use a separate scoring model when one generated answer is unreliable but many candidates can be sampled. The verifier receives the problem and a complete candidate, and predicts the probability that the candidate is correct. The paper labels candidates only by whether their final answer is correct; it explicitly warns that a flawed derivation can therefore be a false positive (section 4.2, p. 7).

### paper procedure
The method section gives this sequence (section 4.2, p. 8):

1. “Finetune a model (the “generator”) for 2 epochs on the training set.”
2. “Sample 100 completions from the generator for each training problem and label each solution as correct or incorrect.”
3. “Train a verifier for a single epoch on this dataset.”

At test time, “we sample 100 completions to each test problem, rank them with the verifier, and then return the one with the highest verifier score” (section 4.2, p. 8). The generator and verifier normally have the same size, but the ablation varies them independently. A larger generator with a smaller verifier performs better than the reverse; the authors interpret this as evidence that the verifier may use coarse heuristics over the generator's output distribution (section 4.3, p. 10).

### Verus form
Inference: apply the pattern to Verus proof synthesis by sampling several candidate Rust/proof bodies for one fixed contract, running `verus` on each candidate, and ranking candidates by a learned score before selecting one that actually verifies. The non-negotiable acceptance check is the Verus run itself; a learned score can prioritize candidates but cannot replace the solver-backed proof. A candidate function would retain executable Rust plus `requires` and `ensures`; proof-only reasoning belongs in a `proof fn`, with intermediate `assert` facts and loop `invariant` clauses where needed. This differs from the paper because Verus supplies a formal pass/fail oracle, while the paper's labels inspect only the final arithmetic answer.

### evidence and limits
The main comparison uses 100 test completions per problem and reports means and standard deviations over three runs for most curves; the 175B verification curve is one run (Figure 5 caption, p. 8). Verification is not beneficial at low data sizes, which the authors attribute to overfitting to correct answers before learning general reasoning (section 4.2, p. 8). Test-time search improves through 400 completions for the 6B verifier, then degrades because adversarial solutions can fool it (section 5.1, p. 10). Inference: for VL, this is a threat if a learned ranker causes wasted verification calls or systematically prefers plausible but invalid proofs; the formal checker must remain the gate.

## technique 2: token-level value verification and joint language training

### what it is
A verifier can emit one score after the whole solution (solution-level) or a score after every generated token (token-level). The paper defaults to token-level, describing it as a token-level value function (section 4.3, p. 9). Token-level prediction is noisier and initially learns more slowly, but ultimately outperforms the solution-level variant and is less prone to overfitting (Figure 6a and section 4.3, pp. 9–10).

The verifier is a language model with a scalar head. Appendix E states that the head uses “a single bias parameter and single gain parameter that operate on the logits outputted by the language model’s final unembedding layer” (Appendix E, p. 20). A special vocabulary token carries the scalar prediction while other logits continue to serve language modeling. Training mixes verifier and language-modeling examples equally; question tokens are masked, so only solution tokens contribute to either loss (Appendix E, p. 20).

### paper procedure and evidence
Train the verifier either only on correctness or on correctness plus language modeling. Figure 6b reports that including the language-modeling objective is a strict improvement. For token-level training, the correctness target is repeated at each solution token; for solution-level training, only the final token receives a prediction (section 4.3, p. 9). The paper's visualized examples show both false negatives and false positives: a correct solution may be rated incorrect, while a wrong variable binding may receive a high score (Appendix F, pp. 21–22).

### Verus form
Inference: use token-level scores to prioritize where a generated proof is likely to need repair, but let `verus` validate the full function and contracts. A Verus analogue could score each emitted Rust/proof token or proof step, then schedule candidate expansions; it cannot assign semantic correctness from text alone. The executable function, `requires`/`ensures`, `proof fn`, `assert`, and loop `invariant` remain unchanged after ranking. The paper's scalar head and language loss have no Verus semantic authority.

## technique 3: calculator annotations as constrained execution

The dataset solutions contain calculator annotations such as `<<20+10=30>>`. During training, annotations are ordinary tokens; during testing, the calculator overrides sampling after `=` inside `<<...>>` and evaluates the expression with Python `eval` (Appendix C, p. 17). Timeouts and errors skip the override. The authors say the annotation generator can miss lines, and the original calculator had bugs; fixing it improved verification by about 1% on the full training set (Appendix C, p. 17).

Inference: a Verus-oriented analogue is to expose trusted arithmetic lemmas or executable specification functions for routine calculations, while keeping the resulting equality inside a proof obligation. Unlike Python `eval`, a Verus proof must establish that the expression has the specified value; an external calculator can suggest an `assert`, but it cannot be trusted as the proof unless its result is checked by Verus.

## technique 4: test-time voting and compute allocation

The verifier can vote over the final answers of its top-ranked samples instead of selecting only the single top candidate. With 100 samples, the paper reports that the best number of voters is about 3–5; with 3,200 samples, about 30 (section 5.1, p. 10). Inference: for proof synthesis, vote only among candidates that independently pass Verus; voting among unverified text can amplify a shared but invalid pattern. The paper's result concerns answer agreement, not proof validity.

## technique 5: residual dropout regularization

The authors apply residual dropout along each layer's residual paths, using 20% in the dropout experiments after a hyperparameter sweep (section 5.2, p. 11). “We find that both finetuning and verification strongly benefit from the use of dropout as a regularizer” (section 5.2, p. 11). Because GPT-3 was pretrained without dropout, they perform additional pretraining with dropout before finetuning to reduce distribution shift. Dropout substantially improves solution-level verifiers and gives a smaller gain for token-level verifiers, which are already less prone to overfitting (section 5.2, p. 11; Figure 8 caption, p. 11).

Inference: dropout is a model-training choice for a learned proof-candidate ranker, not a Verus construct. Any claimed benefit for VL would require a new experiment with candidate proof generation and measured verified-pass rates; GSM8K solve rates cannot establish it.

## what is proved, measured, and trusted

The paper measures exact-answer solve rate on a 1K-problem test split, with 100 sampled completions in its standard verification setting, and reports model-size, data-size, ablation, and dropout curves. It does not prove the natural-language reasoning, and its correctness labels accept a wrong derivation that reaches the right final answer. The GSM8K collection itself has an estimated 1.7% residual disagreement rate after quality checks (Appendix A, p. 15), so the benchmark labels are not perfect. Inference: a VL product must treat the Verus checker, its specifications, solver assumptions, and any trusted library contracts as the evidence boundary; a learned verifier is only a search heuristic. The paper leaves generator sampling, verifier calibration, and resistance to adversarial candidates as empirical assumptions.

## implications for VL

Inference: the reusable idea is a generate-then-check loop with an independently trained ranker, but formal acceptance must remain a successful Verus verification run. The paper already explores candidate ranking, token-level value estimates, joint auxiliary objectives, test-time voting, and dropout; VL should not redo these as if they were formal verification techniques. The product risk is moderate: a ranker can reduce search cost, but a ranker that substitutes for Verus would turn a proof obligation into an unverifiable prediction.

## techniques for the catalog

- generate-label-rank: sample many candidate solutions, label them by an outcome, train a separate verifier, and return the highest-scoring candidate
- token-level verification: predict correctness after each solution token and combine it with a language-modeling objective
- constrained calculator annotations: override arithmetic tokens with an evaluator while generating marked expressions
- verifier-guided voting: vote over final answers among top-ranked candidates when additional samples are available
- residual dropout: add residual-path dropout during additional pretraining and finetuning to reduce verifier overfitting

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
