# TextGrad: Automatic “Differentiation” via Text
(authored by agents unless marked 🧑)
Tag: `yuksekgonul2024textgrad`, [paper](https://arxiv.org/abs/2406.07496)

## what the method is
TextGrad treats natural-language critique as an analogue of a gradient and propagates it through a computation graph of LLM and tool calls. Variables can hold unstructured values such as text or images, although all values used in this paper are text (Sec. 2, p. 5; Appendix A.1, p. 25). An objective can return text or tool results, rather than only a numerical loss (Sec. 2, p. 6). The authors state: “Here we use differentiation and gradients as a metaphor for textual feedback from LLMs.” (Sec. 1, p. 2) Inference: for VeruLaw it is a candidate loop for improving generated specifications or proofs, while Verus remains the independent acceptance checker.

## technique: textual gradient on a simple graph
Inference: use this when a downstream evaluator can describe how an intermediate artifact should improve. For Prompt→Prediction→Evaluation, first collect feedback on Prediction using Evaluation. Then feed that feedback and the Prompt→Prediction context to another gradient call that returns critique of Prompt. The paper explains: “We first collect feedback to the Prediction variable using the evaluation.” (Sec. 2, p. 4)

The example LLM gradient operator includes the variable's context and successor feedback and returns criticism describing changes (Eq. 6, Sec. 2, p. 4). Textual Gradient Descent (TGD) then sends the current variable and its criticisms to an LLM with instructions to incorporate them and emit a new variable (Eq. 9, p. 5).

Inference: keep textual gradients outside the proof and treat them as candidate-generation input. Parse the resulting Rust/spec artifact, then invoke Verus; only a verified artifact may proceed. An LLM critique cannot establish an `ensures` fact.

## technique: graph-wide backpropagation and update
Inference: use this for compound pipelines with many successors. Define each graph node v as `f_v(PredecessorsOf(v))`. For every successor w, call the operation-specific gradient function with v, w, and feedback for w; aggregate these gradients over all successors (Eq. 10–11, Sec. 2, pp. 5–6). Update any selected node with `TGD.step(v, ∂L/∂v)` (Eq. 12, p. 6). The paper states: “For a computation graph where there are n edges, each iteration of optimization performs at most n additional language model calls to compute gradients” (Sec. 2, p. 6). This bound covers gradient computation, not forward evaluation or optimizer calls.

Inference: a VL pipeline can use this graph to pass Verus error text backward from a failed proof to specification, invariant, or code variables. Operation-specific gradients must distinguish compiler diagnostics from semantic counterexamples; the paper does not define Verus adapters. Keep a bounded iteration count and preserve the last verified artifact so a failed update cannot execute.

## technique: self-supervised code refinement
Inference: use when test cases or a checker can evaluate candidate code but ground-truth repairs are unavailable. Prompt a model with the problem, code, test-time instruction, and local test results; ask it to analyze failures and correctness beyond the local tests without producing revised code, then optimize the code variable through TGD (Sec. 3.1, pp. 7–8). The paper's example starts with a solution that fails tests; TextGrad identifies an edge case and produces an implementation passing all tests (Sec. 3.1, p. 7).

Evidence: on LeetCode Hard, results averaged over 5 seeds were zero-shot 0.26, Reflexion 0.31 ± 0.012 (one demonstration, five iterations), and TextGrad 0.36 ± 0.018 (zero demonstrations, five iterations; Table 1, p. 8). Completion means passing all tests on the LeetCode platform. The dataset has 39 problems; each TextGrad iteration makes one call for loss evaluation, one for gradients, and one for updating code (Appendix C.1, p. 31). The paper is inconsistent about the zero-shot baseline: Sec. 3.1 (p. 7) says “23% for gpt-4o zero-shot” whereas Table 1 gives 0.26. Inference: this is test passing, not a proof for all inputs; VL must run Verus after each textual update.

## technique: test-time solution optimization
Inference: use for a single hard question or specification instance when a self-evaluator can critique the current answer. Initialize a solution with a zero-shot LLM. For each iteration, clear gradients, compute a self-supervised loss from question and solution, call `loss.backward()`, then `optimizer.step()` (Code Snippet 1, Sec. 3.2, p. 9). The experiments perform three updates and majority vote across all solutions for GPQA and MMLU (Sec. 3.2, p. 9).

Measured accuracies in Table 2 (p. 10) are GPQA 55.0% TextGrad versus 51.0% CoT and 53.6% best reported; MMLU Machine Learning 88.4% versus 85.7%; MMLU College Physics 95.1% versus 91.2%. The evaluated subsets contain 198 GPQA Diamond questions, 112 Machine Learning questions, and 92 College Physics questions (Appendix D.1, p. 32). Inference: majority voting should be replaced or supplemented by proof checking for Rust; a vote cannot establish specification validity.

## technique: minibatch prompt optimization
Inference: use when one prompt should generalize across many inputs. Make the system prompt a trainable `Variable`, wrap the model as `BlackboxLLM`, compute per-example losses over a minibatch, sum them, backpropagate textual feedback, and update the prompt (Code Snippet 2, p. 10). The paper uses gpt-3.5-turbo-0125 for forward reasoning and gpt-4o as feedback engine, batch size 3, 12 iterations, and 36 training examples sampled randomly with replacement. After each iteration, it retains the prompt update only if validation performance improves over the previous iteration (Sec. 3.3, p. 11).

Results (Table 3, p. 11): Object Counting CoT 77.8%, DSPy 84.9%, TextGrad 91.9%; Word Sorting 76.7%, 79.8%, 79.8%; GSM8k 72.9%, 81.1%, 81.1%. Combining DSPy demonstrations with the TextGrad GSM8k prompt reaches 82.1% (Sec. 3.3, p. 12). Object Counting and Word Sorting use 50/100/100 train/validation/test examples; GSM8k uses DSPy's 200/300/1319 splits (Appendix E.1, p. 33). Object Counting and GSM8k use numerical exact match; Word Sorting uses gpt-4o to compare predictions with ground truth. Inference: prompts for proof generation can be tuned on a held-out set of Verus tasks, but benchmark leakage and compiler-version drift must be controlled.

## what remains trusted and product threat
The paper assumes that state-of-the-art LLMs can reason about the components and subtasks being optimized (Sec. 1, p. 2). Its optimizer prompt warns: “The feedback may be noisy, identify what is important and what is correct.” (Appendix A.4, p. 28) Inference: updates are candidates, without a guarantee of semantic improvement. Feedback loops may reduce repeated verifier failures, but can also optimize to narrow tests or exploit evaluator wording. Verus compilation and proof checking must remain the final prerequisite check. VL could reuse the graph abstraction, bounded iterative updates, and checker-error feedback; the paper does not evaluate verified Rust or Verus.

## techniques for the catalog
- textual gradient: turn evaluator critiques into natural-language gradients for intermediate artifacts
- graph backpropagation: aggregate feedback through all successor contexts in a computation graph
- self-supervised code refinement: optimize code from local test feedback without ground-truth repairs
- test-time solution optimization: iteratively improve one answer using a self-evaluator and vote
- minibatch prompt optimization: tune one prompt across examples with textual-gradient descent
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "While sometimes populated automatically, in general role descriptions are one of the primary ways to inject user knowledge into the optimization process."): checked quotations, numbers, section and page references, technique steps, and the arXiv link against the paper; corrected quotations, page references, gradient-call scope, refinement steps, and dataset details, noted the paper's conflicting code baseline, and marked recommendations as inferences; did not reproduce experiments, inspect implementation code, or validate the proposed Verus applications.
