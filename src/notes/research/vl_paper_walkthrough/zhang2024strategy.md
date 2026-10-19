# Automated Strategy Invention for Confluence of Term Rewrite Systems
(authored by agents unless marked 🧑)
Tag: `zhang2024strategy`, [paper](https://arxiv.org/abs/2411.06409v2)

## scope and result

This paper invents complementary strategies for CSI, an automatic confluence prover for term rewrite systems (TRSs). The abstract says: “In this paper, we focus on confluence of term rewrite systems, and apply AI techniques to invent strategies for automatic confluence proving.” (p. 1). CSI has many processors, flags, transformations, schedules, and parallel branches. The authors explain why arbitrary strategies can be unsound and design a restricted search space (Section 3.1, pp. 3–4).

A TRS consists of rewrite rules `l → r`; confluence means every pair of reductions from one term can be joined (Section 2.1, p. 2). CSI returns YES, NO, or MAYBE. It can emit certificates for the external CeTA certifier, but “Not all processors implemented in CSI are verifiable because CSI cannot produce certificates for all processors, and CeTA does not implement the verification procedures for all processors.” (Section 2.2, p. 2).

## technique 1: sound strategy-space design

what it is

Constrain strategy invention using the structure of CSI's expert competition strategy. The paper identifies three possible causes of unsoundness: processors intended for other properties, flags that change the property proved, and transformations that change the goal, for example to relative termination (Section 3.1, p. 3).

how to apply it

1. Start with CSI's competition strategy and its decomposition into 23 sub-strategies, nine mainly for confluence and 14 for non-confluence. These 24 strategies initialize Grackle (Section 3.1, p. 3).
2. Define discrete choices for processor flags, iteration parameters such as time limits and repetition counts, and boolean parameters controlling whether sub-strategies execute (Section 3.1, pp. 3–4).
3. Construct a CSI configuration by substituting the chosen parameters and disabling selected sub-strategies. Generally preserve processor order and strategy structure; Appendix D.2 also describes deliberate simplifications, including replacing NOTCR's multiple branches with one parameterized non-confluence processor (pp. 12–24).
4. Keep flags required by surrounding transformations. For example, after the usable-rule transformation in MAINTRS, the termination processors must retain the `-ur` flag (Appendix D.2, pp. 15–16).
5. Forbid specified parameter combinations for soundness or to reduce the search space, such as negative polynomial coefficients combined with the default linear interpretation (Appendix D.2–D.3, pp. 17, 23–24).

Inference: For Verus, a comparable design would restrict proof-plan transformations to constructs accepted by Verus and use successful verification as the search score. Restricting search and checking its outputs serve different purposes; soundness does not imply that a particular external certifier supports every operation.

evidence and limits

The authors give parameter-specific explanations and references in Appendix D, rather than a single formal proof of the entire strategy generator. They also check results against competition answers, attempt CeTA certification, and manually investigate unsupported proofs (Section 5.2, pp. 6–7; Appendix H, pp. 27–30). On problems mastered by the final ARI-COPS strategies, they report only 234 certifiable proofs for the one-CPU run and 226 for the four-CPU run; that sentence does not provide a denominator (Section 5.2, p. 7).

## technique 2: Grackle portfolio invention and combination

what it is

Grackle uses a genetic algorithm and randomized parameter tuning to search for complementary strategies. Definition 1 describes a bounded set in which each strategy masters problems that no other strategy in the set solves faster. Algorithm 1 gives the search loop (Section 2.3, pp. 2–3).

how to apply it

1. Supply initial strategies `S`, benchmark problems `P`, and hyperparameters `β`; initialize the strategy portfolio with `S` (Algorithm 1, p. 3).
2. Evaluate the portfolio on `P`, caching results to avoid duplicate execution. Score strategies and retain a configurable number of the highest-scoring strategies as the current generation (Section 2.3, p. 3).
3. Select a strategy from that generation. Stop if none can be selected; otherwise specialize it on the problems it performs best on. The experiments use ParamILS for this randomized parameter tuning (Sections 2.3 and 5.1, pp. 3, 6).
4. Add the new strategy to the portfolio and repeat until termination (Algorithm 1, p. 3).
5. After invention, divide a one-minute budget into time slices. Greedily assign each slice a strategy that solves the most problems still unsolved by previous selections. Shuffle the slice sequence 100 times and repeat selection; try multiple divisions and choose the schedule with greatest problem coverage (Section 3.2, p. 4).
6. Execute the chosen strategies sequentially under their assigned time limits. A Python program invokes CSI with separate configuration documents to avoid naming conflicts (Appendix G, pp. 26–27).

Inference: For VL, candidate proof plans could vary invariant candidates, lemma order, and solver settings. Retaining several plans can cover different obligations; the portfolio search would organize attempts while Verus checks each result.

## technique 3: balanced random dataset generation

what it is

The authors generate random TRSs and sample them using CSI outcomes and the strategy that solves each fastest. The aim is relative balance across confluence techniques, rather than a distribution dominated by a few strategies (Section 4, pp. 4–5).

how to apply it

1. Generate 100,000 TRSs with maximum counts of 12 function symbols, five constants, eight variables, and 15 rules; maximum function arity is eight. Set the left-linear generation probability to 0.6 and the complex-term parameter to 1.6. Generated terms have at most 15 symbols (Sections 4.1–4.2, p. 4).
2. Choose a root and fill undefined function arguments with random symbols. Prevent variable reuse on the left when generating a left-linear rule, and allow only variables occurring on the left to occur on the right (Algorithm 2 and Section 4.1, pp. 4–5).
3. Run CSI's competition strategy for one minute per TRS on one CPU. It returns 69,317 NO, 25,012 YES, and 5,671 MAYBE answers. Randomly select 5,000 from each group (Section 4.2, p. 5).
4. Remove duplicates within the selected random systems and against the 566 ARI-COPS TRSs, using equivalence of syntactic structures modulo variable renaming and a special function-symbol renaming. When an equivalence class occurs in both datasets, remove only the random examples (Section 4.2, p. 5).
5. Run 26 labeling strategies: the 24 initial strategies and two additional decompositions isolating development closedness and decreasing diagrams. Allow one minute for the competition strategy and 30 seconds for the others (Section 4.2, p. 5).
6. Randomly retain at most 300 problems mastered by each labeling strategy, and add 1,200 problems unsolved by every labeling strategy. The resulting random dataset contains 5,267 TRSs: 1,647 confluent, 1,910 non-confluent, and 1,710 indeterminate under the one-CPU, one-minute competition-strategy run (Section 4.2, p. 5).

The paper says the final distribution is “not perfectly balanced” (Section 4.2, p. 5). Before capping, four strategies master over 1,000 problems each and 16 master fewer than 250 each. Inference: A VL dataset should record the solver, budget, label source, and train/test membership, since an indeterminate answer reflects a particular search attempt rather than the underlying mathematical truth.

## technique 4: evaluation and incomplete certification

what it is and how to apply it

Keep evaluation settings separate. Section 5.1 describes splitting the 566 ARI-COPS TRSs into 283 training and 283 testing examples and selecting 800 disjoint random examples for each augmented split (p. 6). Each augmented split therefore has 1,083 examples. However, Section 5.2 explicitly says: “Notice that here the training examples are disjoint from the testing examples, whereas in the evaluation for ARI-COPS, they are the same.” (p. 7). Inference: The ARI-COPS results should not be presented as held-out performance; the paper's descriptions of that evaluation are inconsistent.

Grackle allows 30 seconds per strategy evaluation, 45 minutes per specialization, and two days per run. Each CSI execution receives one or four CPU cores; Grackle receives 52 or 66 cores in total, respectively, on AMD EPYC 7513 processors. It stores at most 200 best strategies (Section 5.1, p. 6).

On all 566 ARI-COPS TRSs, Table 2 reports 469 solved by the competition strategy versus 478 by the combined invented strategy with one CPU, and 477 versus 483 with four CPUs. The union of all final portfolio strategies solves 479 and 484, respectively (p. 6). On the 1,083 augmented test examples, Table 4 reports 802 versus 862 with one CPU and 854 versus 867 with four CPUs (p. 7).

Across the one- and four-CPU final portfolios, nine ARI-COPS problems had not been solved by any CSI version; five had not been solved by any participant in CoCo. Of those five, three have CeTA-certifiable proofs (Table 3, p. 6). The checks also include consistency with competition results and manual examination of certification errors. Unsupported cases include unavailable CSI certificate output and techniques absent from CeTA (Appendix H, pp. 27–30).

## interpretation for VL

Inference: The transferable idea is to search over an existing prover's strategies, retain complementary configurations, schedule them under a fixed budget, and measure checked success on held-out obligations. The paper's certification limits mean its solved counts should not be equated with independently certified proof counts.

The paper provides a concrete example of useful parameter search: replacing `redundant -narrowfwd -narrowbwd -size 7` with `redundant -development 6 -size 7` enables a non-confluence proof for 846.ari (Introduction, pp. 1–2). Appendix H.2 reports certifiable proofs for both 846.ari and 852.ari using this change (p. 28). Inference: For VL, parameter choices that initially appear unhelpful can merit reconsideration as the benchmark changes. Verus acceptance would still establish only the supplied specification; a search score should not reward weakening that specification.

## techniques for the catalog

- sound strategy-space restriction — preserve required strategy structure and flags, and forbid unsound parameter combinations
- complementary portfolio invention — specialize strategies on their strongest problems and combine them under a time schedule
- balanced synthetic benchmarks — generate systems, label under fixed budgets, remove duplicates, and cap dominant strategy groups
- separate result and certificate evaluation — distinguish held-out coverage, competition consistency, external certification, and manual analysis

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The structures are also kept unchanged, meaning that we first execute dp and then edg, etc."): read all 33 PDF pages, including appendices and references; checked quotations, numbers, section and PDF-page references, strategy steps, dataset construction, evaluation scope, and certification limits; corrected quotations and page references, distinguished CSI's strategy language from Grackle's parameter encoding, removed a certifiability restriction absent from the method, and identified the inconsistent ARI-COPS split descriptions; retained the tag and linked the arXiv identifier printed on page 1; did not rerun experiments, inspect implementation code, or independently verify mathematical proofs.
