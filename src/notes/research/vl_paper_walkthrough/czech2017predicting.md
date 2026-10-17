# Predicting Rankings of Software Verification Competitions
(authored by agents unless marked 🧑)
Tag: `czech2017predicting`, [paper](http://arxiv.org/abs/1703.00757v1)

## purpose and boundaries

The paper predicts the relative ranking of software-verification tools on a verification task before running all tools. An SV-COMP task is a program and a property; an outcome records time and whether the tool concludes TRUE, FALSE, or UNKNOWN (§2, p. 2). Competition scores combine positive and negative points for outcomes, with the runtimes of successful runs breaking ties between equal scores (§2, p. 2). The method learns a ranking of tools, rather than only the winner, from prior SV-COMP results. The paper defines the input directly: “A verification task (P, φ) consists of a program P (for SV-COMP written in C) and a property (also called specification) φ (typically written as assertion into the program).” (Definition 2.1, §2, p. 2)

The authors' central design is to represent each source program as a graph combining control flow, data/control dependence, and syntax, then compare graphs with Weisfeiler–Lehman subtree kernels. They feed those similarities to ranking-by-pairwise-comparison (RPC), whose base learners are support vector machines (SVMs). The abstract summarizes the claim: “Our kernels employ a graph representation for software source code that mixes elements of control flow and program dependence graphs with abstract syntax trees.” (abstract, p. 1).

## technique 1: construct an abstraction-preserving verification-task graph

What it is. Raw source strings are brittle: renamed variables or equivalent loop syntax can look different, while a structurally hard and structurally easy assertion can look nearly identical. The paper builds a directed multigraph `G=(N,E,s,t,ρ,τ,ν)`. Nodes are AST roots and their expression nodes; `ρ` gives abstract labels such as `Loop`, `Assign`, `Assert`, or size classes for integer literals. Edges carry dependence type: control flow (CF), control dependence (CD), data dependence (DD), or syntactic/AST containment (SD); `ν` records true/false branch valuation for control dependence (§2, pp. 3–4; Definition 2.2, p. 4). The paper's Definition 2.2 prints the last tuple component as η in the heading and ν in the bullets; the bullets and Algorithm 1 use ν.

How to apply it.

1. Build an AST for every statement of the verification task's program (Definition 2.2, §2, p. 4).
2. Build control-flow edges to retain loops and branches, and dependence edges to retain data and control relationships (§2, p. 3).
3. Add syntactic-dependence (SD, “consists-of”) edges from statement roots to AST children (Definition 2.2, §2, p. 4).
4. Replace concrete statement and variable names with abstract labels, retaining categories and literal-size classes (Table 1, §2, p. 3).
5. The property is typically an assertion written into the program (Definition 2.1, p. 2), so it enters the graph as an Assert node and its expression nodes, up to the abstraction (Fig. 2, §2, p. 3).

The representation deliberately omits some detail. Two programs differing only in `assert(i == n)` versus `assert(i != n)` can be indistinguishable under the chosen labels and dependencies, even though one may be hard and the other quickly refuted (Fig. 3, §2, p. 3; discussion p. 4). The authors conclude: “Here, we clearly see the limits of any learning approach based on structural properties of programs.” (§2, p. 4)

## technique 2: Weisfeiler–Lehman subtree kernels over selected relations

What it is. A Weisfeiler–Lehman (WL) kernel compares graphs by iteratively relabeling each node with its own label plus sorted labels of selected neighbors. Each iteration has three steps: augmentation, sorting, and compression to a fresh integer label (Algorithm 1, §3.4, pp. 6–7). A depth parameter `d` decides whether a node is considered at all (its distance to its top-level AST node must be at most `d`); an iteration bound `m` limits how many relabelling rounds occur. The kernel counts pairs of equally labelled nodes (Dirac kernel) over the iterations (Definition 3.2, §3.4, p. 6). The paper states that this verification graph kernel is positive semi-definite (Theorem 3.3, §3.4, p. 6) and refers to the first author's master's thesis [5] for the proof.

How to apply it.

1. Choose a neighbor function by edge type: CF, CD, DD, CD+DD (PDG), or CF+CD+DD (§4, p. 7).
2. Map all node identifiers and edge labels to natural numbers as initial labels (§3.4, p. 6).
3. For each iteration and node, build a sequence from the edges in the neighbour set (label, edge type and valuation ν per edge), sort it ascending, prepend the node's current label, and compress the result injectively to a new number (Algorithm 1, §3.4, p. 6).
4. Count equally labelled node pairs across the two relabelled graphs with a Dirac kernel, counting only nodes of depth at most `d` (Definition 3.2, §3.4, p. 6).
5. Sum the counts over iterations; optionally take the equally weighted (1/3 each) linear combination of the CF, CD and DD kernels (§4, p. 7).
6. Use the resulting Gram matrix as input to a kernelized SVM (§3.3, pp. 5–6; Theorem 3.3, p. 6).

The authors chose WL because it scales better than random-walk or shortest-path graph kernels for graphs of programs with “several thousands lines of code” (§3.4, p. 6). Neighbor customization lets one compare only control flow or only dependence edges (§3.4, p. 6). The paper says the equal-weight linear combination is again a valid kernel, citing [5] (§4, p. 7).

Inference: For Verus, kernel inputs could include proof-structure edges and contract dependencies, and depth could separate local expression complexity from whole-function structure. The positive semi-definiteness theorem applies to the paper's graph and kernel construction; it does not establish that a learned ranking is calibrated or that a selected verifier will succeed.

## technique 3: ranking by pairwise comparison with SVM base learners

What it is. For `K` tools, RPC trains `K(K−1)/2` binary models, one for each pair of tools `i < j` (§3.2, p. 4). A training ranking (full or partial) supplies a positive example for model `M_ij` when tool `yi` precedes `yj` and a negative example for the opposite preference (§3.2, p. 4). At prediction time, every pairwise model outputs a preference degree (with `M_ij = 1 − M_ji` for `i > j`); the system sums each tool's pairwise scores and sorts tools by the totals (§3.2, p. 5). The paper uses SVMs as base learners (§3.2, p. 5); Platt scaling maps distances from the SVM hyperplane to (pseudo-)probabilities (§3.3, p. 5), and the implementation uses scikit-learn's SVMs with Platt scaling (§4, p. 8).

How to apply it.

1. Gather historical rankings for each task and choose the tools that are present in the target portfolio (§3.1–§3.2, pp. 4–5).
2. For every tool pair, convert each full or partial ranking into binary preference examples (§3.2, p. 4).
3. Train an SVM on the kernel Gram matrix for that pair, using the soft-margin objective and penalty parameter `C` (§3.3, pp. 5–6).
4. For a new graph, query all pair models; the SVM distances can be calibrated with Platt scaling (§3.2–§3.3, p. 5).
5. Sum pairwise preference degrees and sort tools into a complete ranking (§3.2, p. 5).
6. Compare the predicted permutation with the observed ranking using Spearman correlation (§3.1, p. 4).

RPC predicts relative performance from previous outcomes; it does not verify anything.

## technique 4: cross-validation and denominator-aware evaluation

What it is. The authors evaluate on SV-COMP 2015 and 2017 data, with separate SAFETY, TERMINATION, and MEMSAFETY sets. The 2015 sets contain 483, 393, and 205 tasks respectively; 2017 contains 637, 507, and 181 tasks. Tool denominators differ by category: SAFETY uses six tools in 2015 and 11 in 2017, TERMINATION uses five in both years, and MEMSAFETY uses nine in 2015 and 11 in 2017 (§4, p. 7).

They perform 10-fold cross-validation: each fold is the test set while the other nine folds train, and average the Spearman rank correlations over the test folds (§4, p. 8). The paper says it compared “six variants of our kernel”; the tables list five single-edge-type kernels plus the equally weighted combination. Baselines are Demyanova et al.'s feature vectors and a default predictor that always emits the ranking minimizing the Spearman distance to the training rankings (§4, pp. 7–8). Training and testing time are reported as means and standard deviations (Tables 4–5, p. 9).

Evidence must retain the table's dataset and denominator. For SV-COMP 2015, the best listed values of the authors' kernels are .616 ± .002 for SAFETY (CF kernel), .711 ± .007 for TERMINATION (weighted combination), and .784 ± .003 for MEMSAFETY (CF+CD+DD kernel) (Table 2, p. 7). For 2017, the best listed values are .635 ± .003 for SAFETY (CF), .664 ± .010 for TERMINATION (weighted combination), and .757 ± .007 for MEMSAFETY (CD+DD) (Table 3, p. 7). For comparison, the default predictor scores .560, .332 and .604 (2015) and .452, .339 and .668 (2017), and the features of Demyanova et al. score .576, .609 and .692 (2015) and .560, .560 and .717 (2017) on SAFETY, TERMINATION and MEMSAFETY. These are mean Spearman correlations over the folds, not percentages of correctly selected tools. The paper states that an average of 0 “would be obtained by guessing rankings at random, while +1 stands for predictions that perfectly coincide with the true ranking” (§4, p. 8). It states that “our approach significantly outperforms the one of [6] as well as the default predictor on all tasks”, while differences among kernels are “statistically non-significant” (§4, p. 8); the paper does not name the test used.

Training/testing cost is setting-dependent. On 2015 SAFETY, the weighted combination trains in 349 ± 9.13 seconds and tests in .019 ± .0 seconds per fold run; on 2017 SAFETY it trains in 3,809 ± 99.4 seconds and tests in .294 ± .022 seconds (Tables 4–5, p. 9). The times use precomputed Gram matrices (§4, p. 8); the implementation uses CPAChecker, JGraphT and scikit-learn (§4, pp. 7–8).

## techniques for the catalog

- verification-task graph abstraction — combine CFG, control/data dependence, and AST edges while replacing concrete names with structural labels
- Weisfeiler–Lehman kernel — iteratively augment, sort, compress, and count labels over selected graph relations with bounded depth
- pairwise ranking with SVMs — train one binary preference model per verifier pair and aggregate calibrated pair scores into a ranking
- denominator-aware cross-validation — use 10 folds, report task/tool counts, and compare Spearman means with standard deviations and baselines
- verifier portfolio selection — inference: rank Verus tactics or backends before execution, then rely on independent proof checking for acceptance
