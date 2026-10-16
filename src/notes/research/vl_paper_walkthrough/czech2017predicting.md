# Predicting Rankings of Software Verification Competitions
(authored by agents unless marked 🧑)
Tag: `czech2017predicting`, [paper](http://arxiv.org/abs/1703.00757v1)

## purpose and boundaries

The paper predicts the relative ranking of software-verification tools on a verification task before running all tools. An SV-COMP task is a program and a property; an outcome records time and whether the tool concludes TRUE, FALSE, or UNKNOWN (§2, pp. 2–3). Competition scores combine positive and negative points for outcomes, with successful runtimes breaking ties (§2, p. 3). The method learns a ranking of tools, rather than only the winner, from prior SV-COMP results. The paper defines the input directly: “A verification task (P, φ) consists of a program P (for SV-COMP written in C) and a property (also called specification) φ (typically written as assertion into the program).” (Definition 2.1, §2, p. 3)

The authors' central design is to represent each source program as a graph combining control flow, data/control dependence, and syntax, then compare graphs with Weisfeiler–Lehman subtree kernels. They feed those similarities to ranking-by-pairwise-comparison (RPC) classifiers whose base learners are support vector machines (SVMs). The abstract summarizes the claim: “Our kernels employ a graph representation for software source code that mixes elements of control flow and program dependence graphs with abstract syntax trees.” (abstract, p. 1).

Inference: For VeruLaw, this is a portfolio-selection technique. A learned model could predict which verifier or proof strategy is likely to work on a generated Rust task, but the prediction is a heuristic and cannot replace running Verus or checking its result.

## technique 1: construct an abstraction-preserving verification-task graph

What it is. Raw source strings are brittle: renamed variables or equivalent loop syntax can look different, while a structurally hard and structurally easy assertion can look nearly identical. The paper builds a directed multigraph `G=(N,E,s,t,ρ,τ,ν)`. Nodes are AST roots and their expression nodes; `ρ` gives abstract labels such as `Loop`, `Assign`, `Assert`, or size classes for integer literals. Edges carry dependence type: control flow (CF), control dependence (CD), data dependence (DD), or syntactic/AST containment (SD); `ν` records true/false branch valuation for control dependence (§2, pp. 3–4; Definition 2.2).

How to apply it.

1. Parse each verification task's program and property into ASTs (§2, pp. 3–4).
2. Build control-flow edges to retain loops and branches, and dependence edges to retain data and control relationships (§2, p. 3).
3. Add syntactic-containment edges from statement roots to AST children (§2, p. 4).
4. Replace concrete statement and variable names with abstract labels, retaining useful categories and literal-size classes (Table 1, §2, p. 4).
5. Record property syntax in the graph so tasks with different assertions can be distinguished where the abstraction permits (§2, p. 4).

The representation deliberately omits some detail. Two programs differing only in `assert(i == n)` versus `assert(i != n)` can be indistinguishable under the chosen labels and dependencies, even though one may be hard and the other quickly refuted (Fig. 3, §2, p. 4). The authors present this as a limit of structural learning, not a correctness problem.

Inference: A VL implementation could build analogous graphs from Rust/Verus syntax: nodes for executable statements, specification expressions, loop invariants, and proof blocks; edges for control, data, call, and specification dependencies. It should preserve annotations that predict proof difficulty, such as quantifier and trigger structure, while treating the graph as metadata. No Verus graph encoding or proof-difficulty theorem appears in the paper.

## technique 2: Weisfeiler–Lehman subtree kernels over selected relations

What it is. A Weisfeiler–Lehman (WL) kernel compares graphs by iteratively relabeling each node with its own label plus sorted labels of selected neighbors. Each iteration has three steps: augmentation, sorting, and compression to a fresh integer label (Algorithm 1, §3.4, pp. 6–7). A depth parameter limits how far below an AST root a node contributes; an iteration bound limits how many neighborhood expansions occur. The resulting kernel sums Dirac matches of labels at each depth and iteration. The paper proves the resulting verification graph kernel is positive semi-definite (Theorem 3.3, §3.4, p. 7).

How to apply it.

1. Choose a neighbor function: CF, CD, DD, their union (PDG), or CF+CD+DD (§3.4, pp. 6–7).
2. Initialize node labels with abstract syntax/dependence labels (§3.4, p. 7).
3. For each iteration, collect selected outgoing-neighbor labels and edge labels, sort the sequence, concatenate it with the current label, and compress the sequence injectively (Algorithm 1, pp. 6–7).
4. For each subtree depth up to `d`, count equal labels across two graphs with a Dirac kernel (§3.4, p. 7).
5. Sum counts over iterations and depths; optionally average several valid kernels, such as CFG, control dependence, and data dependence kernels (§4, p. 8).
6. Use the resulting Gram matrix as input to a kernelized SVM (§3.3–§3.4, pp. 6–8).

The authors chose WL because it scales better than random-walk or shortest-path graph kernels for graphs from programs with thousands of lines (§3.4, p. 7). Neighbor customization lets one compare only control flow or only dependence edges. Their equal-weight linear combination is again a valid kernel (§4, p. 8).

Inference: For Verus, kernel inputs could include proof-structure edges and contract dependencies, and depth could separate local expression complexity from whole-function structure. The positive-definite theorem applies to the paper's graph and kernel construction; it does not establish that a learned ranking is calibrated or that a selected verifier will succeed.

## technique 3: ranking by pairwise comparison with SVM base learners

What it is. For `K` tools, RPC trains `K(K−1)/2` binary models, one for each ordered tool pair (§3.2, p. 5). A training ranking supplies positive examples when tool `yi` precedes `yj` and negative examples for the opposite preference. At prediction time, every pairwise model outputs a preference degree; the system sums each tool's pairwise scores and sorts tools by the totals (§3.2, pp. 5–6). The paper uses SVMs as base learners and Platt scaling to map distances from the SVM hyperplane to pseudo-probabilities (§3.2–§3.3, p. 6).

How to apply it.

1. Gather historical rankings for each task and choose the tools that are present in the target portfolio (§3.1–§3.2, pp. 5–6).
2. For every tool pair, convert each full or partial ranking into binary preference examples (§3.2, p. 5).
3. Train an SVM on the kernel Gram matrix for that pair, using the soft-margin objective and penalty parameter `C` (§3.3, p. 6).
4. For a new graph, query all pair models, optionally calibrating scores with Platt scaling (§3.2–§3.3, p. 6).
5. Sum pairwise preference degrees and sort tools into a complete ranking (§3.2, p. 6).
6. Compare the predicted permutation with the observed ranking using Spearman correlation (§3.1, p. 5).

RPC is a selector, not a verifier: it predicts relative performance from previous outcomes. Its ranking can be wrong when a task contains behavior absent from training data or when a tool version changes. Inference: a VL system could use the ranker to order Verus tactics, SMT settings, or external tools, then execute the selected candidates and retain proof artifacts. It should treat UNKNOWN and tool failures as explicit outcomes instead of converting them into proof success.

## technique 4: cross-validation and denominator-aware evaluation

What it is. The authors evaluate on SV-COMP 2015 and 2017 data, with separate SAFETY, TERMINATION, and MEMSAFETY sets. The 2015 sets contain 483, 393, and 205 tasks respectively; 2017 contains 637, 507, and 181 tasks. Tool denominators differ by category: SAFETY uses six tools in 2015 and 11 in 2017, TERMINATION uses five in both years, and MEMSAFETY uses nine in 2015 and 11 in 2017 (§4, pp. 8–9).

They perform 10-fold cross-validation: each fold is the test set while the other nine folds train, and average Spearman rank correlations over the 10 test folds (§4, p. 9). They compare six kernel variants, an equally weighted combination, Demyanova et al.'s feature vectors, and a default predictor that always emits the training-set ranking closest under Spearman distance (§4, pp. 8–9). Training and testing time are reported as means and standard deviations over the cross-validation runs (Tables 4–5, pp. 10–11).

Evidence must retain the table's dataset and denominator. For SV-COMP 2015, the best listed kernel values are .616 ± .002 for SAFETY, .709 ± .008 for TERMINATION, and .784 ± .003 for MEMSAFETY (Table 2, p. 9). For 2017, the best listed values are .635 ± .003 for SAFETY, .664 ± .010 for TERMINATION, and .757 ± .004 for MEMSAFETY (Table 3, p. 9). These are mean Spearman correlations across 10 folds, not percentages of correctly selected tools. The paper states that zero corresponds to random ranking and +1 to perfect agreement (§4, p. 9). It reports that the proposed approach significantly outperforms the compared feature-vector method and default predictor on all listed tasks, while differences among its kernel variants are statistically non-significant (§4, p. 9).

Training/testing cost is setting-dependent. On 2015 SAFETY, the weighted combination trains in 349 ± 9.13 seconds and tests in .019 ± .0 seconds per fold run; on 2017 SAFETY it trains in 3,809 ± 99.4 seconds and tests in .294 ± .022 seconds (Tables 4–5, pp. 10–11). These values use precomputed Gram matrices and the paper's CPAChecker/JGraphT/scikit-learn implementation (§4, pp. 9–10).

Inference: A VL portfolio evaluator should report task counts, tool counts, fold protocol, and whether predictions are made on unseen repositories or only held-out benchmark tasks. It should measure proof success, time, and repair effort after selection; Spearman correlation alone does not establish a useful end-to-end proof workflow.

## what is proved, trusted, and useful for VL

The formal result proved in the paper is positive semi-definiteness of the graph kernel (Theorem 3.3, §3.4, p. 7). The theorem is stated as: “The kernel kη1,η2,z is positive semi-definite.” (§3.4, p. 7) The learning claims are empirical: cross-validation on SV-COMP datasets, with code and 2015 data released at the repository cited in §1 and §4. The method trusts source parsing, CPAChecker's control/data analyses, abstract labels, ranking scores, SVM implementation, and the assumption that past tool rankings predict future rankings. Pointer-induced complex dependencies were ignored in the feature-graph construction (§4, p. 9). Figure 3 demonstrates that structural abstraction can miss semantically important assertion differences (§2, p. 4).

Inference: The threat to agent-written verified Rust is low to moderate and operational. A wrong prediction can waste solver time or choose a weak backend, but it does not invalidate a proof that Verus independently checks. The greater risk is policy misuse: treating a predicted top-ranked tool as evidence of correctness, or training on benchmark families that do not represent generated code. The useful catalog lesson is to make backend choice data-driven while keeping proof acceptance entirely checker-based.

## techniques for the catalog

- verification-task graph abstraction — combine CFG, control/data dependence, and AST edges while replacing concrete names with structural labels
- Weisfeiler–Lehman kernel — iteratively augment, sort, compress, and count labels over selected graph relations with bounded depth
- pairwise ranking with SVMs — train one binary preference model per verifier pair and aggregate calibrated pair scores into a ranking
- denominator-aware cross-validation — use 10 folds, report task/tool counts, and compare Spearman means with standard deviations and baselines
- verifier portfolio selection — inference: rank Verus tactics or backends before execution, then rely on independent proof checking for acceptance

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
