# Premise Order Matters in Reasoning with Large Language Models
(authored by agents unless marked 🧑)
Tag: `chen2024premiseorder`, [paper](http://arxiv.org/abs/2402.08939v3)

## question and evidence

The paper tests whether changing only the order of logically equivalent premises changes language-model reasoning. Its logical benchmark contains definite-clause problems: true facts, rules of the forms “If X, then Y” or conjunction variants, and a true conclusion. A prediction counts as correct only when the generated step-by-step proof is completely valid; hallucinated facts or rules are errors. The authors generate 200 problems for each required-rule count (4 through 12), five premise orders, and three distractor counts (0, 5, 10), for 27,000 variants.

The key finding is not a change in the mathematical task. It is a change in model success. The paper states, “In contrast to humans, we observe that for LLMs, the premise order has a significant impact on reasoning performance.” It reports GPT-4-turbo and PaLM 2-L drops of up to 20–30%, and drops from above 65% to below 25% for Gemini 1.0 Pro and GPT-3.5-turbo when order is changed from forward; these percentages describe the logical benchmark across the plotted rule counts, not a single denominator stated in the prose.

## technique: proof-aligned order and Kendall-tau sweep

What it is. Define forward order (`τ = 1`) by listing each rule in the order used by the ground-truth proof. Define backward order (`τ = -1`) as its reverse, corresponding to backward chaining. Intermediate orders use normalized Kendall tau (`τ = 0.5, 0, -0.5`). This is a controlled way to expose a model’s dependence on the presentation sequence while preserving the facts and conclusion.

How to apply it. (1) Generate a proof with a known sequence of rule applications. (2) Keep facts, rules and conclusion fixed. (3) Permute premises to the five tau conditions. (4) Prompt the model to name the premise used at each derivation step. (5) Decode greedily at temperature 0. (6) Accept only a completely valid proof. (7) Report accuracy separately by model, required-rule count and tau. The authors write, “Specifically, we denote the order that conforms to the ground truth proof with forward order, where the rule applied in each derivation step is sequentially presented in the problem description.”

Evidence and denominators. Table 1 is the error breakdown for 12 relevant rules, no distractors. For GPT-4-turbo at `τ=1`, 96.5% are correct, 0.5% wrong refutations, 1.5% rule hallucinations and 1.5% fact hallucinations (the four percentages sum to 100% of that model/order condition). At `τ=-1`, its corresponding figures are 84.0%, 0.0%, 3.5% and 12.5%. For GPT-3.5-turbo at `τ=1`, the denominator is the same 12-rule/no-distractor condition: 30.0% correct, 24.5% wrong refutation, 9.5% rule hallucination and 35.5% fact hallucination. Gemini 1.0 Pro at `τ=0.5` has 0.0% correct, 59.0% wrong refutation, 3.5% rule hallucination and 37.5% fact hallucination. The paper’s prose says performance can drop “more than 30%”; Table 1 shows that the magnitude depends strongly on model and order.

Verus form. Inference: make each premise a typed fact or relation and define a proof-carrying function whose `requires` clause states the input facts and rules. Its `ensures` clause states the conclusion and, if desired, a trace of rule applications. A Rust loop that consumes a forward-ordered trace can use `invariant` to preserve that every accumulated fact follows from the original facts and rules. To test order sensitivity of an agent, generate equivalent input traces in a harness and compare whether the agent emits a Verus-checking proof; the Verus checker, rather than text similarity, is the correctness oracle. Kendall tau is test metadata and does not belong in the trusted theorem.

## technique: distractor stress test and error taxonomy

What it is. Add rules that are not needed for the proof, then measure whether irrelevant context interacts with ordering. The benchmark uses exactly 0, 5 or 10 distracting rules. The paper reports that distractors further decrease performance and magnify the ordering effect while leaving each model’s broad preferences unchanged: forward remains best, GPT-4-turbo often prefers backward among alternatives, and PaLM 2-L degrades as tau moves toward zero.

How to apply it. (1) Mark the minimal relevant rule set for each proof. (2) Sample distractors that cannot derive the conclusion. (3) Create the same tau permutations for each distractor count. (4) Require a cited premise for every generated step. (5) Classify each failure as wrong refutation, rule hallucination, or fact hallucination. This identifies whether the model rejected a valid goal, invented an edge, or invented an unsupported fact.

The authors explain the mechanism: “The main reason is that LLMs are inclined to use the rules in the sequential order as they present in the problem, so when the next rule in the problem is not yet applicable, LLMs might still hallucinate facts to complete the proof step.” This is a paper claim supported by its error analysis, not a formal causal proof.

Verus form. Inference: model distractors as additional immutable data and require every proof step to reference a rule whose antecedent is established. A Verus `assert` or lemma can establish that an unused rule cannot affect the conclusion when its predicate is unreachable. The executable Rust should retain the full input if product behavior requires it; proof code can separately establish that selection ignores unreachable distractors. This does not prove an LLM will select correctly; it detects the resulting invalid proof.

## technique: R-GSM order-preserving rewrite

What it is. R-GSM tests mathematical word problems rather than explicit logic rules. The authors select GSM8K test problems with at least five sentences, retain the final sentence, and manually reorder the others only when the ground-truth answer remains unchanged. They enumerate alternative orders to find a model failure and manually rewrite the selected ordering. The resulting dataset has 220 original/reordered pairs; over 60% have five sentences and all have at most eight.

How to apply it. (1) Filter for sufficiently long descriptions. (2) Exclude problems where reordering changes the answer. (3) Enumerate sentence permutations. (4) Verify the answer is invariant, then manually edit for grammaticality. (5) Run the same model and decoding settings on original and reordered versions. (6) Also report a conditional subset whose original answer was correct, preventing an apparent drop from baseline failures.

Results. Table 2(a) reports full-dataset accuracies: GPT-4-turbo 94.1% original versus 85.0% reordered; PaLM 2-L 86.4% versus 79.5%; Gemini 1.0 Pro 80.5% versus 69.1%; GPT-3.5-turbo 67.3% versus 51.8%. Table 2(b) conditions on each model’s originally solved problems, so the original denominator is 100%: reordered accuracy is 89.9%, 87.9%, 74.6% and 64.9%, respectively. Thus every model loses at least 10% of initially solved cases, and GPT-3.5-turbo loses 35.1 percentage points. Table 3 classifies conditional failures; for GPT-4-turbo, 45.0% are temporal-order errors, 15.0% unknown-variable errors and 40.0% other, summing to the conditional failure cases.

Verus form. Inference: translate each word problem into a pure specification and write two parsers or input encodings with the same semantic value. Prove semantic equivalence with a `proof fn`; then run the executable algorithm on both encodings and check the same `ensures` result. This separates a real algorithmic order bug from an agent’s prompt-order brittleness.

## implication for verified Rust

The study measures model-generated proof text, not Verus proof success, and it does not evaluate Rust. Inference: an agent writing verified Rust should receive premises in a dependency or proof order, but VL must still randomize order in evaluation to detect hidden sequencing dependence. The relevant threat is high for proof-generation productivity and medium for final soundness: invalid text is caught if Verus checks it, while a wrong specification or omitted premise can still produce a valid proof of the wrong property. The paper leaves generic mitigation methods as future work. Existing order-preprocessing ideas such as graph construction, pruning and reordering are described as task-specific and non-general.

## techniques for the catalog

- proof-aligned premise ordering — compare forward, backward and Kendall-tau intermediate orders while preserving the logical task
- distractor robustness testing — add 0, 5 or 10 irrelevant rules and classify invalid proofs by refutation, rule or fact hallucination
- order-preserving R-GSM rewrite — construct original/reordered word-problem pairs whose verified answer is unchanged
- conditional accuracy analysis — report reordered accuracy only on instances solved in the original condition to isolate order failures
Checked 2026-10-15 against paper chen2024premiseorder: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
