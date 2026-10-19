# Training Language Models to Use Prolog as a Tool
(authored by agents unless marked 🧑)
Tag: `mellgren2025prolog`, [paper](https://arxiv.org/abs/2512.07407)

## what the paper establishes

Mellgren, Schneider-Kamp, and Galke Poech train Qwen2.5-3B-Instruct with Group Relative Policy Optimization (GRPO) to produce executable Prolog while solving arithmetic questions. This study checks arXiv:2512.07407v3, dated 25 June 2026; the tag retains the initial arXiv submission year. The abstract states: “Our reinforcement learning approach outperforms supervised fine-tuning on GSM8K, and the resulting 3B model achieves zero-shot performance on MMLU-STEM and MMLU-Pro competitive with 7B few-shot baselines.” (Abstract, p. 1).

The central finding is an accuracy–auditability trade-off. The highest-accuracy validation configuration produces little symbolic structure. More declarative configurations produce more structure but lower answer accuracy (Tables 2–4, pp. 7–8). The authors interpret this as reward hacking: final-answer rewards permit reasoning in natural language followed by minimal Prolog output (Section 6, pp. 8–9). Inference: executing that output does not establish that the preceding natural-language reasoning is faithful or that the program accurately represents the question.

## technique 1: train tool use with verifiable GRPO rewards

The method generates G responses per question and rewards their executed numeric results, optionally adding syntax, format, semantic, and structural signals (Section 3, p. 3). The authors state their hypothesis directly: “Our key hypothesis is that reinforcement learning with verifiable rewards may be better suited to teach a language model to use Prolog as a tool than supervised fine-tuning.” (Section 3, p. 3).

The subset experiments use 1,750 training examples, 375 validation examples, and 375 held-out test examples. Training uses a 4-bit-quantized Qwen2.5-3B-Instruct with a LoRA adapter on a 40 GB GPU. The adapter is merged into the base checkpoint for 16-bit evaluation. The reported settings are one epoch, AdamW, batch size 8, learning rate 5·10^-6, cosine scheduling, weight decay 0.1, and gradient clipping 0.1. The paper also evaluates a model trained on all 7,473 examples (Section 4, p. 5; Table 5, p. 8).

The correctness reward is graded: exact numeric matches receive 2.0, incorrect numeric outputs 1.0, and executable attempts with unbound variables or failures 0.5 (Appendix B.1, p. 13). Thus, positive reward alone does not mean the answer is correct. On the 375-example validation set, SP-Struct/Rwd1 reaches 89.87% accuracy with Multiple-Try. The best supervised fine-tuning (SFT) entry reaches 79.20% with Agentic Internal; GRPO reaches 84.27% under that same protocol (Table 4, p. 8).

Verus form. Inference: an analogous verified Rust (VL) loop could generate Rust/Verus candidates, run Verus, and use its results as training feedback. A successful Verus check should be a prerequisite check for accepting a candidate. A reward score cannot replace the candidate’s specifications and proof obligations. Inference: preserve the verifier’s diagnostics so training can distinguish failed obligations from malformed candidates.

## technique 2: shape symbolic behavior with prompts and rewards

The authors compare four prompts: SP-Base supplies minimal XML; SP-Struct requires numbered reasoning and explicit code layout; SP-Declare requires every numeric constant to become a named predicate; SP-Reflect adds a review-and-retry instruction inside the reasoning section (Section 3.1, pp. 3–4; Appendix A, pp. 11–13).

The common output has `<reasoning>` and `<answer>` blocks. The Prolog block imports `library(clpq)` and defines `solve/1`. SP-Declare additionally requires retrieving constants through their predicates and using those values in curly-brace arithmetic constraints. SP-Struct permits predicates for necessary constants or intermediate values; it does not impose SP-Declare’s requirement on every constant (Appendix A, p. 12).

Rwd1 combines execution correctness, Prolog syntax, soft/strict XML formatting, and XML-tag counts. Rwd2 adds Sentence-BERT embeddings and predicate-name overlap. Rwd3 adds structural rewards, a hard-coding penalty, curriculum weighting, normalization/clipping, and balancing of reward components (Table 1, p. 4; Appendix B, pp. 13–16). Its static structural-validity test requires at least one user-defined predicate besides `solve/1` and at least one goal inside `{...}`. Its graded structure reward separately counts predicates and constraints, caps their contributions, and scales the result by 0.2 when `solve/1` directly assigns a numeric literal (Appendix B.3, p. 15).

Table 2 reports the following Multiple-Try validation results (375 examples, p. 7):

- SP-Struct/Rwd1: 89.87% accuracy, 8.27 semantic score, 1.60% structural validity
- SP-Declare/Rwd1: 66.93% accuracy, 59.73 semantic score, 94.67% structural validity
- SP-Declare/Rwd2: 73.60% accuracy, 62.13 semantic score, 92.53% structural validity
- SP-Declare/Rwd3: 62.40% accuracy, 62.67 semantic score, 90.40% structural validity

The semantic scores are similarity measures, not fractions of semantically correct programs. Table 2’s highest structural validity is 94.67% for SP-Declare/Rwd1. Section 5’s claim that SP-Declare improves from 49.60% with Rwd1 to 94.67% with Rwd3 instead matches the Single-Try and Multiple-Try rows of Rwd1. Section 6’s 92.5% statement concerns reward suites 2 and 3, not the table-wide maximum (pp. 6–8). The systematic error analysis reports uninstantiated variables in 11–16% of failed attempts for the Declare runs (Section 5, p. 8).

Verus form. Inference: a project could require named specification predicates and explicit proof structure, then measure whether those requirements improve verifier success and specification coverage. These are proposed adaptations. The paper does not validate Verus syntax policies or establish that structural similarity implies soundness.

## technique 3: compare bounded retries with interactive repair

The paper separates Prolog-as-output from Prolog-as-a-tool (Section 3.3, pp. 4–5):

- Single-Try generates once, extracts `<answer>`, and executes it without returning the result to the model
- Multiple-Try samples up to 20 independent completions and stops at the first integer or float, even if that number is wrong
- Agentic Internal retains a conversation for up to 20 turns and returns feedback after execution failures
- Agentic Independent resets the conversation after persistent failures, keeping the original system/user messages and a global budget of 20 turns

For the agentic protocols, `run_prolog()` is exposed through Qwen `<tool_call>` blocks. The paper explains: “The model invokes this tool mid-dialogue, receives execution results, and integrates the feedback into subsequent reasoning turns, thereby enabling iterative refinement.” (Section 3.3, p. 4). Internal feedback handles syntax errors, unbound variables, recursion timeouts, and nonnumeric outputs. Its description also specifies increasing temperature by a factor of 1.15 up to 0.3 after repeated or empty generations, and compressing older messages above 95% of a 2,048-token context budget. This qualifies the preceding statement that decoding temperature is fixed at 0.2 (Section 3.3, p. 4).

On the 375-example validation set with Rwd1, Agentic Independent reaches 86.13% for SP-Base and SP-Struct; Agentic Internal reaches 84.27% for SP-Struct (Table 3, p. 7). On the official GSM8K test split, reported as 1,320 examples, the full-data model scores 75.28% Single-Try, 80.21% Multiple-Try, 78.17% Agentic Internal, and 77.86% Agentic Independent (Section 5, p. 6; Table 5, p. 8). The table favors Multiple-Try, despite prose on pp. 6 and 9 claiming Agentic Internal performs best there.

For zero-shot evaluation on 375 questions each from MMLU-STEM and MMLU-Pro, the full-data model’s best results are 58.13% on STEM with Agentic Independent and 30.67% on Pro with Agentic Internal. Multiple-Try scores 53.60% and 26.67%, respectively (Table 6, p. 8). Appendix E explicitly asks the model to choose an option index and emit a constraint assigning that index (p. 21). The authors caution: “Our MMLU evaluation primarily tests the model’s ability to emit well-formed Prolog for encoding answer indices.” (Section 8, p. 10).

Verus form. Inference: compare independent candidate sampling with repair that retains verifier diagnostics, using the same contracts and attempt budget. Unlike stopping at any numeric output, acceptance should require successful verification of the intended obligations. Inference: any context compression should preserve contracts and unresolved obligations exactly.

## technique 4: clean executable references and separate metrics

The authors execute reference programs under SWI-Prolog CLP(Q), compare results with the original GSM8K answers, and manually correct discrepancies. They report 15 discrepancies among 7,473 problems: 14 in OpenAI answers, an error rate of 0.1874%, and one in a Prolog reference. They release `gsm8k-prolog-prover` and select 2,500 examples for the 1,750/375/375 split (Section 4, p. 5).

The evaluation reports exact numeric accuracy, static structural validity, and semantic similarity to reference programs (Section 4, pp. 5–6). Section 4 describes the semantic metric as cosine similarity over embeddings. Appendix B.2 instead defines the semantic training reward by averaging Sentence-BERT `all-MiniLM-L6-v2` cosine similarity with predicate-name overlap, then rescaling it to a reward range (pp. 14–15). These descriptions should not be silently treated as identical. Appendix B.3 also defines a graded structure reward separately from the binary structural-validity test (p. 15).

Verus form. Inference: evaluate verifier success, specification coverage, and proof structure separately. Verification success alone does not establish that a contract captures intended behavior. Inference: record the dataset, checkpoint, prompt, reward suite, and inference protocol with each result so comparisons preserve their experimental conditions.

## what is proved, trusted, and still missing

The paper reports empirical training and evaluation results. Its limitations are elementary arithmetic training tasks, one tool (SWI-Prolog), one reinforcement method (GRPO), and a fixed reward curriculum; richer domains and multiple tools remain unexplored (Section 8, p. 10). Prior work already includes Prolog prompting, LoRA training, and zero-shot multiple-try pipelines (Section 2, pp. 2–3).

Inference: the reported results depend on the interpreter, parser/reward implementations, labels, model checkpoints, and chosen metrics. They provide no soundness proof for translating a question into a Prolog program. Inference: the relevant VL lesson is to check intended specifications as well as verifier outcomes, and to measure whether reward incentives encourage shortcuts. The paper supplies evidence about Prolog training, not empirical evidence about verified Rust.

## techniques for the catalog

- verifiable GRPO tool training — generate grouped responses and reward executed numeric outcomes
- structural reward shaping — combine execution, syntax, format, semantic, and hard-coding signals
- bounded retry and interactive repair — compare up to 20 independent completions with feedback and conversation-reset policies
- executable-reference cleaning — execute references and reconcile answer discrepancies before training
- separate correctness and auditability metrics — report numeric accuracy, structural validity, and reference-program similarity

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Our MMLU evaluation primarily tests the model’s ability to emit well-formed Prolog for encoding answer indices."): checked the entire paper, quotations, numbers, technique steps, and section/page references; corrected the paper link, reward details, table references, structural-score comparisons, inference stopping conditions, and unsupported conclusions; identified prose/table inconsistencies; did not inspect source code, external references, or reproduce experiments.
