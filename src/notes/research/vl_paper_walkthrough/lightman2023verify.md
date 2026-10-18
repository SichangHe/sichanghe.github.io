# Let’s Verify Step by Step
(authored by agents unless marked 🧑)
Tag: `lightman2023verify`, [paper](https://arxiv.org/abs/2305.20050)

## result and scope

Lightman et al. compare outcome supervision, which labels only whether a complete solution is correct, with process supervision, which labels each intermediate reasoning step. Their object is a reward model (RM) that ranks sampled solutions, not the generator that writes them. The abstract reports: “Our process-supervised model solves 78% of problems from a representative subset of the MATH test set.” The released PRM800K corpus contains 800,000 step-level human-feedback labels (Abstract; Section 2.4).

The evaluation asks whether an RM can select a correct solution from many uniformly sampled generator outputs. For each test problem, they rank candidate solutions, choose the highest-ranked one, automatically grade its final answer, and report the fraction correct (Section 2.1). The main large-scale comparison uses 500 held-out MATH problems after 4,500 test problems were included in training for data collection (Sections 2.4 and Appendix C). This denominator and split matter: the 78.2% result is best-of-1860 on that held-out subset, not a general theorem-proving rate.

## technique 1: process supervision at the first incorrect step

What it is. A process-supervised reward model (PRM) predicts whether each generated reasoning step is positive, negative, or neutral. Positive means correct and reasonable; negative means incorrect or unreasonable; neutral defers an ambiguous judgment (Section 2.4). The paper deliberately labels only through the first incorrect step. A correct solution therefore supplies positive evidence for every step, while an incorrect one identifies where the first failure occurs (Section 2.6).

When to use it. Use process labels when a final answer is too coarse to identify the cause of failure, or when a model can arrive at a correct answer through invalid reasoning. The paper states: “It provides more precise feedback, since it specifies the exact location of any errors that occur” (Section 1, on process supervision). Inference: The same principle applies to a Verus verification workflow when a generated proof fails at one obligation: recording the first failing verification condition gives more useful training data than a single pass/fail label.

How to apply it:

1. Make the generator emit a newline-delimited sequence of steps (Section 2.3).
2. Show human labelers each solution and have them mark every step positive, negative, or neutral (Section 2.4 and Appendix D).
3. End supervision at the first negative step: “we deliberately choose to supervise only up to the first incorrect step” (Section 2.6); in phase 2 the labeling task ends as soon as the first negative step is encountered (Appendix D). Phase 1 differed: labelers entered alternative steps and labeled multiple completions per step (Appendix B and D).
4. Train the PRM to predict the label token after each step (Section 2.6).
5. At test time, use the PRM to rank complete candidate solutions and choose the top one (Sections 2.1 and 2.6).

The labelers receive the ground-truth final answer but no reference solution, to avoid bias toward one valid path (Appendix D). Appendix D defines a step as neutral if it is appropriate in context, reasonable, correct, and contains only computations that can be verified easily; positive if it is neutral and also progresses towards the solution; all other steps are negative. Section 2.4 describes neutral as indicating ambiguity.

Verus form. Inference: Generate Rust and proof blocks with one logical obligation per delimited step, then run Verus after each step or after each assertion cluster. Store a label for whether the step preserves the current specification, introduces an unsupported assertion, or is ambiguous. Verus itself returns solver diagnostics and proof outcomes; it does not provide the paper’s human semantic labels, so a human or separate checker would still be needed for “reasonable” and “progresses.” Use `requires`, `ensures`, `assert`, loop `invariant`, and proof functions only as actual Verus constructs; the paper does not prescribe any of them.

Evidence and limits. PRM800K contains 800,000 filtered labels over 75,000 solutions to 12,000 problems, while the unfiltered collection was 1,085,590 labels over 101,599 samples (Section 2.4; Appendix B). The authors report 78.2% best-of-1860 for PRM, 72.4% for ORM, and 69.6% for majority voting (Figure 3). These figures use the large-scale setup and are not directly comparable training sets: the ORM uses 100 uniform samples per problem and has an order-of-magnitude larger training set (Section 3). The authors explicitly say the sets “are not directly comparable” (Section 3).

## technique 2: product scoring of step probabilities

What it is. The PRM outputs a probability for each step label. The paper defines a solution score as the product of the probabilities that every step is correct (Section 2.6). At inference, one forward pass over the full solution supplies all step scores. Inference: the product rewards solutions whose entire chain remains plausible, while a single low-probability step lowers the total.

How to apply it:

1. Read the probability assigned to positive, negative, and neutral after each step (Section 2.6 and Appendix F.1).
2. Decide whether neutral counts as positive or negative (Appendix F.2).
3. Reduce the step probabilities to one solution score with either a product or a minimum (Appendix F.2).
4. Rank candidate solutions by that score and select the highest (Section 2.1).

Their four ablations are explicit: neutral-as-positive with product 78.2%, neutral-as-positive with minimum 77.6%, neutral-as-negative with product 77.4%, and neutral-as-negative with minimum 77.8%, all best-of-1860 (Appendix F.2, Table 4). The paper calls the difference between all four strategies “minor.” The authors use neutral-as-positive and product in the main experiments, while warning that a product “does create a slight bias against solutions with a larger number of steps” (Appendix F.2).

Verus form. Inference: A VL checker can aggregate per-obligation confidence for triage, but confidence must never replace Verus acceptance. A generated proof either verifies against the specification or it does not; multiplying model probabilities is only a search heuristic. The product analogue can prioritize shorter or more locally supported proof candidates, with the paper’s length bias retained as a known limitation.

## technique 3: active learning for high-value labels

What it is. Instead of labeling random model outputs, the authors surface convincing wrong-answer solutions: solutions rated highly by the current PRM but ending with an incorrect answer (Section 2.4). Such a sample is known to contain at least one mistake that fooled the current model, so a label is more informative.

How to apply it:

1. Generate N solutions per problem (Section 2.4).
2. Score them with the current PRM (Section 2.4).
3. Keep wrong-answer solutions with the highest PRM scores; at problem level retain K per problem, or globally retain K total (Section 2.4).
4. Label the selected steps, retrain the PRM with all latest data, and repeat (Section 2.4 and Appendix B).
5. In the small-scale ablation, score 1,000 samples per problem with a selector, choose a set with 80% convincing wrong-answer samples and 20% of the most convincing remaining samples, then label with PRMlarge (Section 4.2).

The small-scale experiment estimates a 2.6× data-efficiency improvement over uniform labeling by comparing slopes of fitted performance lines (Section 4.2). The authors note the 200-samples-per-problem point underperforms its trend because it consumes a large fraction of the 1,000-sample pool, reducing diversity (Section 4.2). Iteratively retraining the selector was unstable and gave no improvement, so that variant has no supporting evidence (Section 4.2). The paper says at-scale ablations of the data-collection choices (including problem-level versus global top-K) were not feasible, so the 2.6× figure comes only from the small-scale synthetic setup (Sections 2.4 and 4.2).

Verus form. Inference: Select proof attempts that a current model scores as likely valid but that Verus rejects, then label the earliest failing obligation. This targets counterexamples to the proof-ranking model. The verifier’s rejection is objective, but selecting “convincing” candidates is still a model heuristic; do not treat selected-example frequency as a correctness guarantee.

## technique 4: synthetic supervision from a large PRM

What it is. To avoid the cost of labeling many small-model examples, the authors use the large PRM (PRMlarge) as a teacher. In the direct comparison, identical small-scale datasets receive either process labels from PRMlarge, outcome labels from PRMlarge, or final-answer labels; supervision is the only difference (Section 4.1).

The teacher’s process labels are made by marking a step incorrect when its negative probability exceeds 20%, then returning labels through the first negative step (Appendix H). The paper calls the threshold arbitrary and chose it because PRMlarge is slightly miscalibrated toward positive labels (Appendix H). For outcome supervision, a solution is correct only if every step is considered correct under the same threshold (Appendix H). This allows controlled ablations while acknowledging that the teacher is not human ground truth.

Evidence. In Figure 4a, process supervision outperforms both outcome variants at all collection scales under best-of-500 selection (Section 4.1). Inference: This supports using a trusted verifier or strong checker to create inexpensive training labels after a smaller set of human labels calibrates it. It does not show that a model-generated label is correct in arbitrary domains.

Verus form. Inference: Once a Verus proof checker is trusted for its stated soundness assumptions, its pass/fail result can provide synthetic labels for proof-search models. A human can still label semantic quality, maintainability, and whether the specification captures intent. Keep those labels separate from verifier acceptance.

## technique 5: controlled evaluation and out-of-distribution checks

The paper isolates confounders in two regimes. Large-scale models advance the best PRM and ORM, but their datasets differ. Small-scale models use identical sampled datasets and vary only the supervision source (Section 2). Evaluation is best-of-N: rank N solutions and test whether the selected final answer is correct (Section 2.1).

For an external check, they evaluate the large-scale ORM and PRM on a held-out set of “224 STEM questions” from recent AP Physics, AP Calculus, AP Chemistry, AMC10, and AMC12 exams, using best-of-100 (Section 5, Table 1). The paper reasons that the tests were released after the pretraining dataset was compiled. Aggregate performance is ORM 63.8%, PRM 72.9%, and majority voting 61.3% over 234 problems in the table; the row counts sum to 234 (45+60+45+84), not the 224 in the prose (Section 5, Table 1). Inference: cite both counts rather than silently choosing one. The authors report similar PRM superiority under this modest distribution shift.

Threats remain. MathMix decontamination strips LaTeX and searches matching n-grams, but the authors say they cannot strongly guarantee no rephrased test problems remain (Appendix A; Section 6.3). They expect contamination to affect relative comparisons similarly, but this is an assumption. The evaluation is mathematical or STEM-exam based, and the paper says “It is unknown how broadly these results will generalize beyond the domain of math” (Section 6.2).

## implications for VL

What is established. Process labels improve reward-model selection on MATH under the stated generator, data, and test splits; in the small-scale synthetic setup, active selection reduces estimated labeling cost; and a large PRM can provide synthetic labels for small models. What remains trusted includes human label quality, automatic final-answer grading, the generator, PRM predictions used as teacher labels, and the specification that defines “correct.” The paper’s own process is not a formal proof of mathematical truth for every intermediate step.

Inference: A product that lets an agent write verified Rust should expose proof failures at the smallest useful unit, retain the exact diagnostic, and train search on rejected-but-plausible attempts. It should never accept a proof because a language model’s reward score is high. Existing work has already explored process-vs-outcome reward modeling and active data selection; VL should reuse those ideas rather than repeat a generic claim that step-level feedback is useful. The direct product threat is reduced human review: if users accept fluent proof text without running Verus, the workflow recreates the outcome-supervision failure mode.

## techniques for the catalog

- first-error process labels: label each generated reasoning step and stop at the first incorrect step so feedback identifies the failure location
- step-probability reduction: score a solution by a product or minimum of per-step correctness probabilities, with neutral-label handling explicit
- convincing-wrong active learning: prioritize high-scoring incorrect completions because they expose current reward-model mistakes
- teacher-generated supervision: use a large process reward model to label smaller-model data for controlled process-versus-outcome comparisons
- best-of-n verification evaluation: rank many sampled solutions, automatically check the selected answer, and report the exact test denominator
Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "In our experience inspecting model-generated solutions, we saw no clear signs of our models memorizing MATH problems."): read the whole paper text (Sections 1-8, Appendices A-I) and compared every quotation, number (78.2/72.4/69.6%, Table 1, Table 4, 800K/75K/12K, 1,085,590/101,599, 20% threshold, 80/20 split, 2.6x, 500/4,500 test split, 224 vs 234), section and appendix reference, and technique step against it; the link is the arXiv page, matching the arXiv identifier printed on the paper's first page. Changed: replaced a misquoted Section 1 sentence, fixed the 800K citation to Section 2.4, replaced the unsupported "does not clearly advance" neutral definition with Appendix D's wording, added the paper's "first incorrect step" quote and the phase 1 difference, marked an unlabeled inference, added the Appendix H threshold rationale and the no-at-scale-ablation caveat, reworded the 224 versus 234 discussion, corrected "test set is mathematical" (Section 5 includes AP STEM exams), and scoped the active-learning claim to the small-scale setup. Not checked: figures beyond the numbers printed in text and Figure 3's table, the PRM800K repository, and the cited external works; the Verus-form paragraphs are my own labeled inferences and were not tested.
