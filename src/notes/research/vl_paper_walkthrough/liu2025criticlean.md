# CriticLean: Critic-Guided Reinforcement Learning for Mathematical Formalization
(authored by agents unless marked 🧑)
Tag: `liu2025criticlean`, [paper](https://doi.org/10.1007/978-3-030-79876-5_37)

## scope and result

CriticLean addresses a gap between compiling Lean code and checking whether it means what the natural-language problem asked. The paper says, “little attention has been paid to the critic phase—the evaluation of whether generated formalizations truly capture the semantic intent of the original problem” (abstract, p. 1). It trains CriticLeanGPT with supervised fine-tuning (SFT) and reinforcement learning (RL), creates a 500-pair CriticLeanBench, and uses the critic inside an iterative autoformalization loop (Sections 3–4, pp. 2–8). Its dataset contribution is FineLeanCorpus with 285,957 entries and a Diamond subset of more than 36,000 high-difficulty problems (abstract, p. 1).

The benchmark has 250 correct and 250 incorrect pairs (Table 1, p. 5). The paper's strongest critic rows report accuracy on this 500-example benchmark: Qwen3-32B-RL is 87.0%, with 88.4% true-positive rate (TPR), 11.6% false-positive rate (FPR), 85.6% true-negative rate (TNR), and 14.4% false-negative rate (FNR) (Table 2, p. 9). These denominators are the 250 correct and 250 incorrect examples for each class metric; the table does not give confidence intervals.

Inference: VL needs a semantic-specification critic in addition to Verus compilation. A compiling Verus function can still implement the wrong requirement. The paper's Lean-specific model and data cannot be assumed to transfer to Rust or Verus.

## technique 1: build a paired semantic-critique benchmark

What it is. CriticLeanBench pairs a natural-language mathematical statement with a Lean declaration and a binary label indicating whether the declaration captures the statement. It deliberately includes both compiler failures and code that compiles but is semantically wrong. The construction principles are coverage of error types, diverse sources, and “a combination of expert review and automated verification” (Section 3.1.1, p. 3).

How to do it. (1) Collect natural-language problems from Omni-MATH, AIME, U-MATH, DEMI-MathAnalysis, HARDMath, OlympiadBench, and BlueMO, together with Lean statements from a public dataset (Section 3.1.2, p. 3). (2) Submit each Lean statement to the Lean compiler. (3) Keep compiler failures as negative examples with their messages; the authors sampled 50 such entries (Section 3.1.2, p. 3). (4) For compiling entries, ask DeepSeek R1 to classify semantic consistency and produce a reason, then parse its structured output with regular expressions (Section 3.1.2, p. 3). (5) Have human reviewers validate the results. (6) Stratify the final selection by problem complexity, mathematical branch, statement well-formedness, and error coverage (Section 3.1.3, p. 4).

The negative taxonomy includes premise translation, mathematical representation, goal translation, variable usage, misuse of concepts, incorrect assumptions, syntax, type, operator/parenthesis, library-use, unformalizable, incomplete formalization, and code-style errors (Section 3.1.3, p. 4; Appendix D, pp. 24–25). The authors distinguish “Human Check right” (compiles and captures the intended meaning) from “Human Check false” (compiles but fails semantic consistency) (Section 3.1.3, p. 4).

Evidence and limits. CriticLeanBench has 500 examples; the question length ranges from 495 to 1,583 tokens and averages 700.94 tokens under the Qwen2.5 tokenizer (Table 1, p. 5). The benchmark is small because manual annotation is expensive, which limits statistical precision. Inference: a Verus benchmark should pair requirements with Rust/Verus specifications, include compilable-but-wrong contracts, and label each failure category with human review. A useful pair could be an English API requirement and a Verus `requires`/`ensures` contract. This is an adaptation; the paper does not define Verus labels.

## technique 2: separate compiler validation from semantic validation

The pipeline has two checks. Lean compilation detects syntax, name resolution, type, and elaboration errors; CriticLeanGPT then checks semantic meaning, variable use, common mistake patterns, and logical consistency (Figure 1, p. 2). The paper's introduction states that each iteration uses both compiler and critic feedback “further improving the quality of the final Lean code” (Section 1, p. 2).

How to apply it. (1) Generate a formal statement. (2) Compile it. (3) If compilation fails, feed the error back for repair. (4) If it compiles, ask the critic whether its meaning matches the natural-language requirement. (5) If the critic rejects it, regenerate using the critique. (6) Stop only after both checks pass or a retry bound is reached (Figure 1; Section 6.1, p. 13).

Evidence. On 50 Omni-MATH problems, Kimina-Autoformalizer-7B obtains 38.0% human-evaluated accuracy in one pass, 54.0% when regenerated until compilation succeeds, and 84.0% with the CriticLean loop (Table 7, p. 13). Thus the denominators are 50 problems in all three rows. The authors explicitly explain that compiler feedback fixes syntax but “fails to detect logical flaws” (Section 6.1, p. 13).

Inference: in VL, run Verus and then a requirement critic. Verus acceptance proves the encoded contract, not that the contract matches the requirement. A critic should inspect function behavior, preconditions, postconditions, and omitted cases. The Verus-side details are inference.

## technique 3: create hard negative data by controlled mutation

The authors augment positive examples with two negative-generation procedures. First, they retain 2,000 Kimina-Autoformalizer outputs that fail to compile and add detailed explanations of the errors (Section 4.2.2, p. 7). Second, they ask Gemini 2.5 Pro to choose an error type from a human-refined checklist and modify correct FormalMATH code, then generate a critical explanation (Section 4.2.2, p. 7). For positives, they select 5,560 correct FormalMATH pairs and keep those judged correct by Gemini 2.5 Pro (Section 4.2.1, p. 6).

When to use it. Use controlled mutation when naturally occurring wrong specifications are scarce but a taxonomy of realistic errors exists. The resulting negatives are targeted rather than random syntax corruption.

Inference: for Verus, mutate contracts to remove a boundary condition, strengthen an assumption, weaken an `ensures`, change ownership or aliasing conditions, or alter a state-machine transition. Human review is needed because a mutation can accidentally remain equivalent. The paper's exact mutation checklist is Lean-specific.

## technique 4: train with mixed SFT and rule-based RL

CriticLeanInstruct contains 48,000 samples: 4,000 seed critic examples plus three times as much code and mathematics data (Section 4, p. 6). The seed set is 2,000 correct and 2,000 incorrect instances with expert feedback; incorrect instances also contain Lean compiler messages. Gemini 2.5 Pro expands feedback into chain-of-thought explanations (Section 4.1, p. 6). SFT uses LLaMA-Factory and Qwen2.5 checkpoints (Section 4.3, p. 7).

RL uses GRPO in VeRL. The reward is rule-based: `r_accuracy = 1` when the judgment equals the label and zero otherwise; `r_format = 1` for correct output format and zero otherwise; `r_final = min(r_accuracy, r_format)` (Equations 2–4, p. 7). The paper says the RL data consists of the 4,000 seed examples and that it uses format validation plus agreement with expert labels (Section 4.3, p. 7).

Evidence. In Table 3, adding mixed critic, code, and math data improves Qwen2.5-7B from 60.8% to 69.8% accuracy, Qwen2.5-14B from 66.6% to 70.6%, and Qwen2.5-32B from 73.0% to 76.2%; each uses the same 500-example CriticLeanBench (Table 3, p. 9). The paper reports that larger model scales generally improve accuracy (Section 5.4.1, p. 10), but Figure 6 shows dataset-size effects vary by model size (Section 5.3.2, p. 8).

Inference: VL could SFT a critic on accepted and human-labeled wrong Verus contracts, then use a binary reward for label agreement and output format. The reward would not establish semantic truth; it would reproduce the labels. Verus proof checking remains the independent executable check.

## technique 5: use retry budgets and measure retained formalizations

The pipeline retries formalization until compilation and critic approval or a maximum attempt count. On 500 problems, one attempt retains 63 (12.6%), five retain 137 (27.4%), ten 170 (34.0%), 50 229 (45.8%), 100 245 (49.0%), and 200 264 (52.8%) (Table 8, p. 14). The denominator is 500 in every ratio. The authors note that 47.2% still fail within 200 attempts, identifying the base formalizer as a bottleneck (Section 6.1, p. 14).

Inference: a VL evaluation should report cumulative success by retry budget, rather than only final pass rate. Retries can increase cost and may amplify a systematic critic error. The paper does not optimize a cost-quality stopping rule.

## what is proved, trusted, and measured

Lean compilation and the critic labels are the operational checks. Human reviewers define the semantic ground truth for benchmark subsets; the critic model is trained against those labels. The paper measures accuracy, TPR, FPR, TNR, FNR, and retained formalizations. Its benchmark does not prove that every natural-language statement has a unique intended formalization. The 84.0% Table 7 result is human accuracy on 50 problems, not compiler success. FineLeanCorpus's 285,957 entries are described as “fully verified” by compiler and critic, but the critic remains a learned component (abstract, p. 1).

Inference: the threat to agent-written verified Rust is specification drift: a model can produce a valid Verus proof for an under-specified or over-permissive contract. CriticLean reduces this risk only where its labels and domain coverage are reliable. Its strongest reported benchmark accuracy, 87.0% for Qwen3-32B-RL on 500 pairs, leaves 13% misclassification and does not measure executable Rust behavior.

## what VL should not redo

The paper already establishes compiler-plus-critic iteration, a paired semantic benchmark, a detailed error taxonomy, controlled negative mutations, mixed SFT data, rule-based RL rewards, and retry-budget reporting. Inference: VL should reuse those evaluation patterns and focus new work on Rust/Verus contract semantics, ownership and concurrency requirements, and whether a critic's accepted specification matches an external product requirement.

## techniques for the catalog

- semantic paired benchmark — label whether formal code captures a natural-language requirement, including compilable wrong cases
- compiler-plus-critic loop — require both executable checking and semantic review before accepting a formalization
- taxonomy-guided negatives — mutate correct formalizations using a reviewed list of realistic error types
- mixed SFT and rule-based RL — combine critic, code, and math data with format and label rewards
- retry-budget evaluation — report cumulative accepted formalizations at explicit attempt limits
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
