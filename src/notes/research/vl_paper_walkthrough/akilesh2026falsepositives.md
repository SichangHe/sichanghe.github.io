# Mitigating False Positives in Static Memory Safety Analysis of Rust Programs via Reinforcement Learning
(authored by agents unless marked 🧑)
Tag: `akilesh2026falsepositives`, [paper](http://arxiv.org/abs/2605.04000v2)

Page numbers below are physical PDF pages of the arXiv v2 copy (the ACM DOI printed in the paper is a placeholder, "nnnnnnn").

## scope and central result

This paper learns a warning-classification policy on top of Rudra, a Rust Mid-level Intermediate Representation (MIR) static analyzer. The policy decides whether a warning is a true positive, a false positive, or uncertain enough to justify targeted `cargo-fuzz` execution. It is false-positive triage, not a proof of memory safety or functional correctness. The abstract states: “To improve decision quality, we integrate dynamic validation via cargo-fuzz as an auxiliary feedback mechanism, allowing the agent to selectively validate suspicious warnings through targeted fuzz testing.” (Abstract, p. 1).

The authors modernize Rudra for Rust nightly-2025-06-26, analyze approximately 20,000 crates, and manually label 4,879 warnings: 1,247 true positives (25.6%) and 3,632 false positives (74.4%). The held-out test set is 732 warnings after a 70/15/15 stratified split (Section 3.1, p. 4). RL+Fuzz obtains accuracy 0.652, precision 0.590, recall 0.746, and F1 0.659 (Table 1, p. 6).

The paper's headline comparison is internally inconsistent. The abstract says "an improvement of 17.1% over the best LLM baseline" (p. 1), but Section 4.1 and the RQ1 findings (pp. 6–7) and Section 8 (p. 10) call it a "17.1 percentage point improvement" in F1 over Claude Opus 4.1 at 0.563. Table 1 gives 0.659 − 0.563 = 0.096 in absolute F1. Inference: 17.1% is the relative gain (0.659 / 0.563 ≈ 1.17), so "percentage point" is a wording error.

## technique 1: modernized analyzer and labeled warning corpus

What it is. The authors adapt Rudra's compiler and MIR APIs from nightly-2021-10-21 to nightly-2025-06-26, validate the port on Rudra's regression suite, then run it on crates.io packages containing at least one unsafe block. The 4,879 unique warnings come from Rudra's Unsafe Dataflow and Send/Sync Variance checkers. One reviewer with Rust memory-safety experience labels every warning by examining the surrounding code and the data-flow paths Rudra reports, deciding whether it is a genuine soundness violation or a false alarm. A second reviewer labels a random subsample of 150 warnings to estimate agreement (Section 3.1, p. 4).

When to use it. Inference: use this when a static analyzer's warning population has shifted with compiler versions and a learned suppressor needs current, labeled examples.

How to apply it.

1. Port compiler-driver and MIR API calls to the target Rust nightly (Section 3.1, p. 4).
2. Run the analyzer's positive and negative regression tests; here all 23/23 standard, 1/1 false-negative, and 3/3 false-positive cases passed (Section 3.1, p. 4).
3. Select crates with at least one unsafe block, run the analyzer, and keep each warning's source location, bug pattern, Rudra precision level, and surrounding-code context (Section 3.1, p. 4).
4. Have a reviewer classify every warning as genuine or spurious from the surrounding code and data-flow paths (Section 3.1, p. 4). The labeling targets the underlying bug pattern, not exploitability (Section 3.1, p. 4).
5. Partition into training (70%), validation (15%), and test (15%) sets by stratified sampling to preserve class distribution (Section 3.1, p. 4).

Verus form. Inference: represent a warning and its evidence as Rust structs with a `spec fn` defining the label relation, and use `requires` to require a stable source snapshot and analyzer version. A Verus proof can check dataset bookkeeping and split disjointness, but it cannot prove a human label's semantic truth unless the warning semantics and program behavior are formalized.

Evidence and limits. Cohen's κ is 0.63 with 82.7% raw agreement on the 150-warning subsample (Section 3.1, p. 4; Section 6, p. 10). The authors name single-expert labeling as an internal-validity threat and say they mitigated it "by excluding ambiguous cases" (Section 6, p. 9); the number of excluded cases is not given in the text I read. The corpus covers "only approximately 20–25% of the crates.io ecosystem" (Section 5.3, p. 9), and the dataset reflects Rust code and tooling from 2024–2025 (Section 6, p. 9). Inference: these facts limit claims about other analyzers, domains, or future Rust versions.

## technique 2: MIR feature extraction

What it is. The classifier uses about 87 features from three categories: MIR semantic features, package/module structural features, and Rudra-specific metadata. MIR features cover type-system properties (generic parameter count, trait bounds, generic nesting depth), ownership and borrowing patterns (borrow ratios, nesting depth, smart pointers), control-flow characteristics from the MIR control-flow graph (cyclomatic complexity, loop nesting depth, number of panic paths), and unsafe-operation context (lifetime bypass category and the distance between the bypass and the potentially dangerous operation). Structural features include crates.io download counts, unsafe-code prevalence in the package, public-API status, lines of code, parameter counts, and comment density. Rudra metadata includes the checker, the precision level, and clustering of nearby warnings (Section 3.2, p. 5).

When to use it. Inference: use intermediate-representation features when source text hides ownership transfers, lifetime bypasses, macro expansion, generic constraints, or explicit control flow. The paper motivates MIR this way in its introduction (p. 2) and in Section 4.3 (p. 8).

How to apply it.

1. Extract MIR-level features around each warning: type-system, ownership/borrowing, control-flow, and unsafe-operation context (Section 3.2, p. 5).
2. Add package and module structural features and the analyzer's own checker, precision level, and clustering features (Section 3.2, p. 5).
3. Remove highly correlated features and apply domain knowledge to avoid spurious correlations; the final set is about 87 features (Section 3.2, p. 5).
4. Normalize the feature vectors before they are used as the state for neural-network training (Section 3.3, p. 5).

Verus form. Inference: expose MIR facts as ghost records or mathematical maps, and state extraction postconditions with `ensures` (for example, that each warning's feature vector references the same source span and checker). Use proof functions for deterministic feature calculations. The features guide triage; they are not Verus proof obligations and cannot certify the underlying code.

Evidence and limits. SHAP analysis names MIR-level semantic features as the strongest contributors, in particular generic parameters and trait bounds, cyclomatic complexity and panic-path count, and lifetime-bypass categories and distance; Rudra's precision level and warning clustering also contribute (Section 4.3, p. 8). The paper says feature-extraction errors "could introduce noise or bias" and that it reduced this risk "through targeted testing and consistency checks, though residual errors may remain" (Section 6, p. 9). The paper reports regression-suite results for the Rudra port but no separate validation of the features themselves; Inference: the MIR extraction is therefore a trusted component.

## technique 3: RL warning-classification policy with cost-aware actions

What it is. The warning is modeled as a Markov Decision Process. The state is the normalized feature vector for one warning. The action set is classify as true positive, classify as false positive, or invoke dynamic fuzzing to gather evidence before the final classification. Correct classifications receive +15 and incorrect ones −15. Executing fuzzing costs −5. When fuzzing yields definitive evidence that enables a correct classification, a bonus applies: +10 for a found bug (confirming a true positive), +8 for a clean run (confirming a false positive), and +3 when helpful but not definitive (Section 3.3, p. 5). The policy is a neural network with two hidden layers of 256 and 128 units, ReLU activations, and dropout, trained offline on the labeled dataset with Proximal Policy Optimization (PPO) over multiple epochs until validation performance converges (Section 3.3, p. 5).

When to use it. Inference: use this sequential formulation when a costly validation tool should be invoked only for uncertain warnings and the system must trade classification quality against analysis cost.

How to apply it.

1. Build one normalized state per warning from MIR, structural, and Rudra features (Section 3.3, p. 5).
2. Define the three discrete actions and the reward values above, including the fuzzing cost and bonuses (Section 3.3, p. 5).
3. Train the policy network with PPO offline on the labeled warnings until validation performance converges (Section 3.3, p. 5).
4. At inference, estimate confidence from the Q-value gap and policy entropy; classify directly when confident, and invoke fuzzing when confidence falls below a threshold. The paper says this threshold "emerges implicitly from the learned policy" rather than being a fixed hyperparameter (Section 3.4, p. 5).
5. Evaluate on the held-out 732-warning test set with accuracy, precision, recall, F1, MCC, AUC-ROC, and AUC-PR (Section 3.6, p. 6; Section 4.1, p. 6).

Verus form. Inference: Verus can verify a deterministic policy implementation's reward accounting with `requires`/`ensures` and loop `invariant`, but it cannot prove that PPO training converges or that a learned policy's label is correct. Treat the policy as a prioritizer around a final proof or analysis oracle.

Evidence and limits. RL-only achieves 0.545 accuracy, 0.496 precision, 0.679 recall, and 0.573 F1 on 732 test warnings; RL+Fuzz achieves 0.652, 0.590, 0.746, and 0.659 (Table 1, p. 6). The LLM baselines are CodeLlama 34B, Llama3 8B and 70B, Mixtral 8×7B, GPT-4o mini, and Claude Opus 4.1; Claude's F1 of 0.563 is the strongest (Section 4.1, p. 6). The paper says it tried zero-shot and few-shot prompts and reports the best setup per model (Section 3.5, p. 5), and that the baselines use zero-shot prompting without fine-tuning (Section 6, p. 10); it also says fine-tuning "would likely improve performance" (Section 5.2, p. 9). The paper states that it tuned hyperparameters via validation (Section 6, p. 9); I found no sensitivity analysis for the reward values in the text. Inference: the reward values are design choices of unknown sensitivity. The paper also notes that RL "introduces stochasticity" and that results "may vary across runs" despite fixed seeds (Section 6, p. 10).

## technique 4: selective cargo-fuzz as dynamic evidence

What it is. The RL agent can invoke `cargo-fuzz` as an action, but only for low-confidence warnings. Confidence uses two signals: the gap between the top two action Q-values (smaller gap means more uncertainty) and the entropy of the policy network's action distribution (higher entropy means lower confidence). On selecting the fuzzing action, the system generates a targeted harness from templates for the detected bug pattern (panic safety, higher-order invariants, or Send/Sync variance), instantiated with function signatures and type information from the warning context. Crashes, sanitizer violations, or clean executions are encoded into the agent's state and inform the final classification (Section 3.4, p. 5; Figure 1, p. 4).

When to use it. Inference: use targeted fuzzing when static MIR evidence is ambiguous and a concrete execution witness can distinguish a real bug from a conservative warning. Do not treat a clean run as proof of absence.

How to apply it.

1. Compute the Q-value gap and policy entropy for the warning (Section 3.4, p. 5).
2. Invoke fuzzing only when confidence falls below the learned threshold, rather than for every warning (Section 3.4, p. 5).
3. Select the harness template matching the bug pattern and instantiate it with the warning's function signature and type information (Section 3.4, p. 5).
4. Run cargo-fuzz and record crashes, sanitizer violations, or clean executions (Section 3.4, p. 5).
5. Encode the outcome in the state and make the final true/false classification (Section 3.4, p. 5).

Verus form. Inference: represent a fuzz result as an evidence enum and prove only the controller's transition and cost accounting. A crash can motivate a Verus counterexample or proof obligation; a clean bounded run cannot establish `ensures` for all inputs. For concurrency warnings, model the relevant schedules or retain the warning as unresolved.

Evidence and limits. The agent invokes fuzzing for approximately 23% of warnings (RQ2 findings, p. 8; Section 5.1, p. 8). Relative to RL-only, fuzzing improves accuracy by 10.7 percentage points and F1 by 8.6 points (RQ2 findings, p. 8); precision rises by 9.4 points and recall by 6.7 points, and the MCC rises by 0.206 (Section 4.2, p. 7). Relative gains are 19.6% in accuracy and 15.0% in F1 (Section 4.2, p. 7). The fuzzing time budget is 30–60 seconds per warning, harnesses are template-based, and Send/Sync issues are "difficult to trigger reliably due to their dependence on specific thread interleavings" (Section 5.3, p. 9). The paper also says clean runs serve only as negative evidence (Section 5.3, p. 9) and that fuzzing timeouts were chosen from preliminary experiments (Section 6, p. 9). Inference: dynamic feedback improves triage but is not a formal absence proof. The paper's evidence that fuzzing use becomes selective during training comes from "observations during training" (Section 4.2, p. 7), with no numbers given beyond the 23% figure.

## technique 5: interpret policy decisions with SHAP

What it is. The authors use SHAP (SHapley Additive exPlanations) values to quantify how individual features contribute to the model's predictions, to see what drives the RL agent's decisions (Section 4.3, p. 8).

When to use it. Inference: use feature attribution to audit whether a suppressor relies on meaningful MIR facts or accidental correlations, especially before deploying it to safety analysis.

How to apply it.

1. Compute SHAP values for the trained agent's decisions (Section 4.3, p. 8; the paper does not say which output SHAP was applied to).
2. Rank features by contribution and inspect the main groups the paper reports: type complexity, control-flow characteristics, unsafe-operation context, Rudra's precision level, and warning clustering (Section 4.3, p. 8).
3. Interpret fuzzing-derived features locally: they exist only for warnings where fuzzing was invoked, so they have moderate global SHAP values despite the 8.6-point F1 gain (Section 4.3, p. 8).
4. Inference: investigate high-impact features for leakage or spurious correlation before changing the policy. The paper itself only reports that it applied domain knowledge to avoid spurious correlations during feature selection (Section 3.2, p. 5).

Verus form. Inference: attribution is an audit artifact, not a proof construct. VL can log which proof obligations or MIR features triggered a repair suggestion, but acceptance must still come from Verus checks and explicit specifications.

Evidence and limits. SHAP finds MIR-level semantic features strongest, while package popularity and code complexity metrics provide "an additional but secondary signal" (Section 4.3, p. 8). The paper also reports that warnings in widely used, actively maintained packages are more likely to be false positives and that warnings in highly complex, poorly documented code are more often true positives (Section 4.3, p. 8). Inference: SHAP shows model attribution and correlation, not causal importance, and the single-tool, single-language corpus limits transfer.

## what is measured, trusted, and already done

The paper reports: “Our RL-based approach with fuzzing integration achieves the highest performance across all seven evaluation metrics.” (Section 4.1, p. 6). Table 1 (p. 6) lists raw Rudra output with recall 1.000, higher than RL+Fuzz's 0.746, and no accuracy value, so the sentence holds only among the learned and LLM methods. Inference: the sentence should be read that way.

The principal test denominator is 732 held-out warnings. RL+Fuzz has 0.652 accuracy, 0.590 precision, 0.746 recall, 0.659 F1, MCC 0.323, ROC-AUC 0.661, and PR-AUC 0.554 (Table 1, p. 6). Raw Rudra has precision 0.256, recall 1.000, and F1 0.407 (Table 1, p. 6); Inference: this follows from retaining every warning. The full corpus denominator is 4,879 warnings from approximately 20,000 crates, with 1,247 true and 3,632 false labels (Section 3.1, p. 4). The test metrics are therefore warning-classification metrics, not percentages of crates or verified functions.

Per the paper, the static analyzer reports warning candidates; one expert's labels define the ground truth; PPO learns the suppression policy; cargo-fuzz supplies bounded dynamic evidence; SHAP explains the model's attributions. Inference: the trusted components are the Rust compiler/MIR semantics, the modernized Rudra implementation, the manually assigned labels, the harness templates, the fuzzing configuration, the policy training randomness, and the chosen reward. The authors write: “Fuzzing provides strong evidence for the presence of bugs but cannot prove their absence; therefore, clean runs serve only as negative evidence against a warning.” (Section 5.3, p. 9).

Inference: for VeruLaw, this work is most useful as a triage layer that ranks warnings and allocates expensive counterexample generation. It should never suppress an unproved Verus obligation merely because a learned policy or clean fuzz run predicts a false positive. Inference: map MIR-derived context to proof-state features, preserve all diagnostics and model decisions, and use Verus as the final soundness oracle.

Inference: the threat to agent-written verified Rust is moderate for engineering efficiency and high if warning suppression is mistaken for proof. Selective dynamic testing can reduce noise around generated proofs, but the 25.6% raw precision and 74.4% false-positive base rate show why a learned classifier needs an explicit abstain/escalate path. This paper already covers RL-based warning triage and selective fuzzing; VL should not redo that generic classifier as a formal-verification result.

## techniques for the catalog

- modernized MIR warning corpus: port Rudra to the current toolchain, collect ecosystem warnings, and label true versus false positives with stratified splits
- MIR semantic feature extraction: represent ownership, generics, control flow, panic paths, unsafe context, and analyzer metadata as a normalized warning state
- cost-aware PPO classifier: choose true positive, false positive, or dynamic validation actions with rewards balancing accuracy and fuzzing cost
- selective targeted fuzzing: invoke cargo-fuzz for low-confidence warnings using bug-pattern harness templates and feed outcomes back to classification
- SHAP policy audit: attribute decisions to MIR and structural features to inspect whether the suppressor uses meaningful evidence
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "As training progresses, fuzzing usage becomes increasingly selective, concentrating on warnings for which static features indicate higher uncertainty."): I read the whole paper text (abstract to references) and the whole study, and checked every quotation, number, section and page reference, and technique step against it. Changed: all page references (they were off by one to two pages and some sections were wrong: the 20–25% coverage and the 30–60 s budget are in Section 5.3, not Section 6; the 23% figure is on p. 8; Section 3.1 is on p. 4); the labeling description (reviewer examined code and Rudra's data-flow paths, not "the reported bug pattern"); the fuzzing-threshold step (threshold is learned, not an explicit information-value rule); the reward-bonus wording; the "reward sensitivity" and trusted-component statements are now marked as inference; added the paper's inconsistency about "17.1 percentage points" versus Table 1 and the raw-Rudra recall exception to the the claim claim; the fuzz quote now ends where the sentence ends. Not checked: the paper's cited references, the linked GitHub appendix and datasets, the figures' bar heights, and the DOI (the paper prints a placeholder); the link is the arXiv page from the paper text.
