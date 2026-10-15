# TextGrad: Automatic “Differentiation” via Text
(authored by agents unless marked 🧑)
Tag: `yuksekgonul2024textgrad`, [paper](https://arxiv.org/abs/2406.07496)

## what the method is
TextGrad treats natural-language critique as an analogue of a gradient and propagates it through a computation graph of LLM and tool calls. A variable can be text, code, an image, or another unstructured value; a loss is an evaluator's textual feedback. The paper says: “automatic ‘differentiation’ via text. T EXT G RAD backpropagates textual feedback provided by LLMs to improve individual components of a compound AI system.” (Abstract, p. 1) This is optimization, not a formal proof system.

## technique: textual gradient on a simple graph
Use this when a downstream evaluator can describe how an intermediate artifact should improve. For Prompt→Prediction→Evaluation, first ask an LLM to critique Prediction against Evaluation. Then feed Prediction, its critique, and the Prompt→Prediction context to another gradient call that returns critique of Prompt. The paper defines the chain as: “where we collect feedback to the Prediction variable using the evaluation.” (Sec. 2, pp. 3–4)

Implement each gradient as an LLM prompt that includes the variable's context and successor feedback. The returned text describes changes, for example “This prediction can be improved by...” (Sec. 2, p. 4). Then apply Textual Gradient Descent (TGD): send the current variable and its criticisms to an LLM with instructions to incorporate them and emit a new variable (Eq. 9, p. 5).

Verus form (Inference): keep textual gradients outside the proof and treat them as candidate-generation input. Parse the resulting Rust/spec artifact, then invoke Verus; only a verified artifact may proceed. A `proof fn` can summarize a deterministic verifier result for later stages, but an LLM critique cannot be an `ensures` fact. This preserves the paper's optimizer role while keeping soundness in Verus.

## technique: graph-wide backpropagation and update
Use this for compound pipelines with many successors. Define each graph node v as `f_v(PredecessorsOf(v))`. For every successor w, call the operation-specific gradient function with v, w, and feedback for w; aggregate these gradients over all successors (Eq. 10–11, Sec. 2, pp. 5–6). Update any selected node with `TGD.step(v, ∂L/∂v)` (Eq. 12). The paper notes that a graph with n edges needs at most n additional language-model calls per optimization iteration (Sec. 2, p. 6).

## technique: self-supervised code refinement
Use when test cases or a checker can evaluate candidate code but ground-truth repairs are unavailable. Prompt a model with the problem, code, test-time instruction, and local test results; ask it to identify failing cases and suggest corrections, then optimize the code variable through TGD (Sec. 3.1, pp. 7–8). The paper's example starts with a LeetCode Hard solution that fails tests; TextGrad identifies an edge case and produces an implementation passing all tests (Sec. 3.1, p. 7).

Evidence: on LeetCode Hard, results averaged over 5 seeds were zero-shot 0.26, Reflexion 0.31 ± 0.012 (one demonstration, five iterations), and TextGrad 0.36 ± 0.018 (zero demonstrations, five iterations; Table 1, p. 8). The denominator is the dataset's coding problems, with averages over five random seeds.

## technique: test-time solution optimization
Use for a single hard question or specification instance when a self-evaluator can critique the current answer. Initialize a solution with a zero-shot LLM. For each iteration, compute a self-supervised loss from question and solution, call `loss.backward()`, then `optimizer.step()`; the paper's code listing gives this exact sequence (Sec. 3.2, pp. 8–9). It performs three updates and majority votes over the resulting solutions for GPQA and MMLU (Sec. 3.2, p. 9).

Measured accuracies in Table 2 (p. 9) are GPQA 55.0% TextGrad versus 51.0% CoT and 53.6% best reported; MMLU Machine Learning 88.4% versus 85.7%; MMLU College Physics 95.1% versus 91.2%. Each denominator is the corresponding benchmark subset. Inference: majority voting should be replaced or supplemented by proof checking for Rust; a vote cannot establish specification validity.

## technique: minibatch prompt optimization
Use when one prompt should generalize across many inputs. Make the system prompt a trainable `Variable`, wrap the model as `BlackboxLLM`, compute per-example losses over a minibatch, sum them, backpropagate textual feedback, and update the prompt. The paper uses gpt-3.5-turbo-0125 for forward reasoning and gpt-4o as feedback engine, batch size 3, 12 iterations, 36 randomly sampled training examples, and validation after each iteration (Sec. 3.3, p. 10).

Results (Table 3, p. 11): Object Counting CoT 77.8%, DSPy 84.9%, TextGrad 91.9%; Word Sorting 76.7%, 79.8%, 79.8%; GSM8k 72.9%, 81.1%, 81.1%. The paper reports combining DSPy demonstrations with the TextGrad GSM8k prompt reaches 82.1% (Sec. 3.3, p. 11). Denominators are benchmark test examples; the paper describes Object Counting and Word Sorting splits as 50/100/100 train/validation/test and GSM8k's standard splits. Inference: prompts for proof generation can be tuned on a held-out set of Verus tasks, but benchmark leakage and compiler-version drift must be controlled.

## techniques for the catalog
- textual gradient: turn evaluator critiques into natural-language gradients for intermediate artifacts
- graph backpropagation: aggregate feedback through all successor contexts in a computation graph
- self-supervised code refinement: optimize code from local test feedback without ground-truth repairs
- test-time solution optimization: iteratively improve one answer using a self-evaluator and vote
- minibatch prompt optimization: tune one prompt across examples with textual-gradient descent
