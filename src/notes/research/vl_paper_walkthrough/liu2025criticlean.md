# CriticLean: Critic-Guided Reinforcement Learning for Mathematical Formalization
(authored by agents unless marked 🧑)
Tag: `liu2025criticlean`, [paper](https://arxiv.org/abs/2507.06181)

## scope and result

CriticLean addresses a gap between compiling Lean code and checking whether it means what the natural-language problem asked. The paper says, “little attention has been paid to the critic phase—the evaluation of whether generated formalizations truly capture the semantic intent of the original problem” (abstract, p. 1). It trains CriticLeanGPT with supervised fine-tuning (SFT) and reinforcement learning (RL), creates a 500-pair CriticLeanBench, and uses the critic inside an iterative autoformalization loop (Figure 1, p. 2; Sections 3–4, pp. 3–7). Its dataset contribution is FineLeanCorpus with 285,957 entries (Section 1, p. 2; Table 5, p. 11) and a Diamond subset of 36,033 problems with difficulty ratings exceeding 5 (Section 6, p. 13).

The benchmark has 250 correct and 250 incorrect pairs (Table 1, p. 5). The authors' best critic, Qwen3-32B-RL, has 87.0% accuracy on this 500-example benchmark; the Gemini-2.5-Pro baseline scores 89.2% (Table 2, p. 9). The Qwen3-32B-RL row reports 88.4% true-positive rate (TPR), 11.6% under the false-positive rate (FPR) heading, 85.6% true-negative rate (TNR), and 14.4% under the false-negative rate (FNR) heading. Inference: the table's FPR and FNR headings are reversed relative to standard definitions: the complement of TPR is FNR, and the complement of TNR is FPR. Each class contains 250 examples; the table gives no confidence intervals.

## technique 1: build a paired semantic-critique benchmark

What it is. CriticLeanBench pairs a natural-language mathematical statement with a Lean declaration and a binary label indicating whether the declaration captures the statement. It deliberately includes both compiler failures and code that compiles but is semantically wrong. The construction principles are coverage of error types, diverse sources, and “a combination of expert review and automated verification” (Section 3.1.1, p. 3).

How to do it. (1) Collect natural-language problems from Omni-MATH, AIME, U-MATH, DEMI-MathAnalysis, HARDMath, OlympiadBench, and BlueMO, together with Lean statements from a public dataset (Section 3.1.2, p. 3). (2) Submit each Lean statement to the Lean compiler. (3) Keep compiler failures as negative examples with their messages; the authors sampled 50 such entries (Section 3.1.2, p. 3). (4) For compiling entries, ask DeepSeek R1 to classify semantic consistency and produce a reason, then parse its structured output with regular expressions (Section 3.1.2, p. 3). (5) Have human reviewers validate the results. (6) Stratify the final selection by problem complexity, mathematical branch, statement well-formedness, and error coverage (Section 3.1.3, pp. 4–5).

The negative taxonomy includes premise translation, mathematical representation, goal translation, variable usage, misuse of concepts, incorrect assumptions, syntax, type, operator/parenthesis, library-use, unformalizable, incomplete formalization, and code-style errors (Section 3.1.3, pp. 4–5; Appendix D, pp. 26–28). The authors distinguish “Human Check right” (compiles and captures the intended meaning) from “Human Check false” (compiles but fails semantic consistency) (Section 3.1.3, p. 4).

Evidence and limits. CriticLeanBench has 500 examples; the question length ranges from 495 to 1,583 tokens and averages 700.94 tokens under the Qwen2.5 tokenizer (Table 1, p. 5). The authors cite “expensive manual annotation costs” when explaining the 500-sample size (Section 3.1.5, p. 5). Inference: the small benchmark limits statistical precision. A Verus benchmark should pair requirements with Rust/Verus specifications, include compilable-but-wrong contracts, and label each failure category with human review. A useful pair could be an English API requirement and a Verus `requires`/`ensures` contract. This is an adaptation; the paper does not define Verus labels.

## technique 2: separate compiler validation from semantic validation

The pipeline has two checks. Lean compilation detects syntax, name resolution, type, and elaboration errors; CriticLeanGPT then checks semantic meaning, variable use, common mistake patterns, and logical consistency (Figure 1, p. 2). The paper's introduction states that each iteration uses both compiler and critic feedback “further improving the quality of the final Lean code” (Section 1, p. 2).

How to apply it. (1) Generate a formal statement. (2) Compile it. (3) If compilation fails, feed the error back for repair. (4) If it compiles, ask the critic whether its meaning matches the natural-language requirement. (5) If the critic rejects it, regenerate using the critique. (6) Stop only after both checks pass or a retry bound is reached (Figure 1; Section 6.1, p. 13).

Evidence. On 50 Omni-MATH problems, Kimina-Autoformalizer-7B obtains 38.0% human-evaluated accuracy in one pass, 54.0% when regenerated until compilation succeeds, and 84.0% with the CriticLean loop (Table 7, p. 13). Thus the denominators are 50 problems in all three rows. The authors explicitly explain that compiler feedback fixes syntax but “fails to detect logical flaws” (Section 6.1, p. 13).

## technique 3: create hard negative data by controlled mutation

The authors augment positive examples with two negative-generation procedures. First, they retain 2,000 Kimina-Autoformalizer outputs that fail to compile and add detailed explanations of the errors (Section 4.2.2, p. 7). Second, they ask Gemini 2.5 Pro to select errors from a human-refined checklist and modify correct FormalMATH code, then generate a critical explanation (Section 4.2.2, p. 7). The injection prompt says “select exactly 2 error types or modification strategies”; it permits a primary subset if combining both makes the error contrived, with an explanation of that choice (Appendix H, pp. 34–35). For positives, they select 5,560 correct FormalMATH pairs and keep those judged correct by Gemini 2.5 Pro (Section 4.2.1, p. 6).

Inference: use controlled mutation when naturally occurring wrong specifications are scarce but a taxonomy of realistic errors exists. The checklist can target specific error categories.

Inference: for Verus, mutate contracts to remove a boundary condition, strengthen an assumption, weaken an `ensures`, change ownership or aliasing conditions, or alter a state-machine transition. Human review is needed because a mutation can accidentally remain equivalent. The paper's exact mutation checklist is Lean-specific.

## technique 4: train with mixed SFT and rule-based RL

The full CriticLeanInstruct contains 48,000 samples (Section 4, p. 5). The paper distinguishes a seed mixture from the augmented mixture: “the Seed Data, with a 1:3 mix of math and code, is termed CriticLeanInstruct(16K). When combined with data augmentation while retaining the same ratio, it forms the full CriticLeanInstruct dataset” (Section 4, pp. 5–6). Section 5.3.1 clarifies the ratio as Critic to non-Critic data, 1:3 (p. 8). Inference: the full 48,000-sample mixture at that ratio contains 12,000 critic samples and 36,000 code/math samples. The seed set is 2,000 correct and 2,000 incorrect instances with expert feedback; incorrect instances also contain Lean compiler messages. Gemini 2.5 Pro expands feedback into chain-of-thought explanations (Section 4.1, p. 6). SFT uses LLaMA-Factory and Qwen2.5 checkpoints (Section 4.3, p. 7).

RL uses GRPO in VeRL. The reward is rule-based: `r_accuracy = 1` when the judgment equals the label and zero otherwise; `r_format = 1` for correct output format and zero otherwise; `r_final = min(r_accuracy, r_format)` (Equations 2–4, p. 7). The paper says the RL data consists of the 4,000 seed examples and that it uses format validation plus agreement with expert labels (Section 4.3, p. 7).

Evidence. In Table 3, adding mixed critic, code, and math data improves Qwen2.5-7B from 60.8% to 69.8% accuracy, Qwen2.5-14B from 66.6% to 70.6%, and Qwen2.5-32B from 73.0% to 76.2%; each uses the same 500-example CriticLeanBench (Table 3, p. 10). Compared directly with critic-only SFT, the mixed-data scores are 69.8% versus 64.0% (7B), 70.6% versus 67.4% (14B), and 76.2% versus 71.0% (32B). Inference: these comparisons support mixed SFT; they do not isolate RL. The paper reports that larger model scales generally improve accuracy (Section 5.4.1, p. 10), but Figure 6 shows dataset-size effects vary by model size (Section 5.3.2, p. 8).

## technique 5: use retry budgets and measure retained formalizations

The pipeline retries formalization until compilation and critic approval or a maximum attempt count. On 500 problems, one attempt retains 63 (12.6%), five retain 137 (27.4%), ten 170 (34.0%), 50 229 (45.8%), 100 245 (49.0%), and 200 264 (52.8%) (Table 8, p. 14). The denominator is 500 in every ratio. The authors note that 47.2% still fail within 200 attempts, identifying the base formalizer as a bottleneck (Section 6.1, p. 14).

## what is proved, trusted, and measured

Lean compilation and the critic labels are the operational checks. Human reviewers define the semantic ground truth for benchmark subsets; the critic model is trained against those labels. The paper measures accuracy, TPR, FPR, TNR, FNR, and retained formalizations. Its benchmark does not prove that every natural-language statement has a unique intended formalization. The 84.0% Table 7 result is human accuracy on 50 problems, not compiler success. Section 1 calls FineLeanCorpus's 285,957 entries “fully verified entries” (p. 2). Section 6 describes compiler and critic checks, followed by filtering with a higher-performance critic; manual validation suggests the final filter eliminates 74.7% of remaining incorrect formalizations (pp. 11–12). Table 9 reports human-evaluated accuracy varying from 69% to 100% by source (p. 14). Inference: “fully verified” describes the pipeline checks, not a guarantee of semantic correctness. Appendix G explicitly says “Proof is intentionally omitted” (p. 33); statement checking does not establish a Lean proof.

Inference: the threat to agent-written verified Rust is specification drift: a model can produce a valid Verus proof for an under-specified or over-permissive contract. CriticLean reduces this risk only where its labels and domain coverage are reliable. Its best trained critic's reported benchmark accuracy, 87.0% for Qwen3-32B-RL on 500 pairs, leaves 13% misclassification and does not measure executable Rust behavior.

## techniques for the catalog

- semantic paired benchmark — label whether formal code captures a natural-language requirement, including compilable wrong cases
- compiler-plus-critic loop — require both executable checking and semantic review before accepting a formalization
- taxonomy-guided negatives — mutate correct formalizations using a reviewed list of realistic error types
- mixed SFT and rule-based RL — combine critic, code, and math data with format and label rewards
- retry-budget evaluation — report cumulative accepted formalizations at explicit attempt limits
