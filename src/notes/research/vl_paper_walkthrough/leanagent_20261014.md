# LeanAgent: Lifelong Learning for Formal Theorem Proving
(authored by agents unless marked 🧑)
Tag: `kumarappan2025leanagent`, [paper](http://arxiv.org/abs/2410.06209v8)

## what the paper does

LeanAgent is a lifelong-learning framework for Lean theorem proving. Its workflow combines a repository curriculum, a dynamic database, progressive retraining of a premise retriever, and best-first proof search. The paper reports 155 newly proved `sorry` theorems across 23 repositories and seven additional exploit-based results on an alternate PFR commit (abstract, p. 1; Section 1, p. 3; Appendix A.5, pp. 29–30). The supplied version is arXiv:2410.06209v8, dated 6 March 2025 and published at ICLR 2025 (p. 1). The claims concern Lean and ReProver-based experiments; any transfer to Verus is an inference.

## technique 1: proof-complexity curriculum

what it is: order repositories by the amount of easy, already-proved material they contain, so the learner encounters simple mathematics before harder mathematics. LeanAgent extracts theorem and proof information with LeanDojo, computes each theorem's complexity as e^S, where S is the number of proof steps, and assigns infinite complexity to `sorry` theorems (Section 3.1, p. 4). It takes the 33rd and 67th percentiles over all theorem complexities, labels non-`sorry` theorems below, between, and above those percentiles easy, medium, and hard, and sorts repositories by decreasing number of easy theorems.

when to use it: Inference: use this when a prover must absorb multiple changing projects and early training should supply reusable basics. The method assumes proof length is a usable proxy for difficulty. The paper's exact statement is: “We then sort repositories by the number of easy theorems they contain.” (Section 3.1, p. 4).

how to apply it:
1. search and clone candidate Lean repositories with the GitHub API (Appendix A.1, p. 15)
2. reject repositories whose configured Lean version is unsupported; otherwise switch to that version (Appendix A.1, p. 15)
3. run LeanDojo extraction and compute e^S for each proved theorem; set `sorry` complexity to infinity (Section 3.1, p. 4)
4. compute global 33rd/67th percentiles, classify non-`sorry` theorem difficulty, and sort repositories by decreasing easy-theorem count (Section 3.1, p. 4)
5. feed repositories in that order to the database and retriever (Sections 3.1–3.3, pp. 4–5)

Verus form: Inference: test a project curriculum based on an explicitly defined measure of proof complexity, then train a lemma retriever in that order. This paper does not evaluate Verus or establish a suitable Verus complexity measure.

evidence and limits: Table 2 reports LeanAgent accuracy as proven theorems divided by total `sorry` theorems. For Mathematics in Lean Source it proves 21 of 29 (72.4%); MiniF2F, 99 of 406 (24.4%); and PFR, 1 of 37 (2.7%). These denominators are the table's `#sorrys` column and the setting is the Lean4 repositories listed in Section 4.1 (Table 2, p. 6). The conclusion identifies lack of topic data as a limitation for an ODE theorem (Section 5, p. 10). Appendix A.7 warns that generated proof length can misrepresent difficulty because hard theorems can receive short proofs (p. 39). Inference: the reported results do not establish that e^S is the best curriculum measure.

## technique 2: dynamic proof-and-premise database

what it is: maintain repository metadata, theorem status, source locations, imports, traced tactics, proof states, and a premise corpus in a database that can merge repositories and generate datasets (Section 3.2, p. 4; Appendix A.1, p. 15). A proof is represented as a sequence of tactic applications annotated with before/after states; the premise corpus stores files and their definitions. Duplicate theorems use the most recently added repository version, while duplicate premise and trace files keep the first encountered copy (Appendix A.1, p. 16).

when to use it: Inference: use it when proofs arrive continuously and later projects must reuse earlier facts while preserving provenance and file accessibility. The paper says: “This dataset includes a collection of theorems and their proofs.” (Section 3.2, p. 4).

how to apply it:
1. record repository metadata, theorem statements, source positions, imports, and proof status (Appendix A.1, p. 15)
2. trace tactic applications and retain each proof state's annotations (Section 3.2, p. 4)
3. topologically sort traced files and serialize a JSONL premise corpus containing file paths, imports, statements, and definitions (Appendix A.1, p. 16)
4. use LeanDojo's random split; validation and test each contain 2% of the theorems and proofs (Appendix A.1, p. 16)
5. when merging repositories, apply the stated duplicate-resolution policy and retain dataset metadata; the default dataset uses only the current curriculum repository (Appendix A.1, p. 16)

Verus form: Inference: build a database of versioned lemmas, contracts, dependencies, and verification results, and restrict retrieval to facts available in the current project. A Verus implementation would need its own extraction and accessibility rules; the paper tests Lean only.

evidence and limits: the 23-repository evaluation and 155 new proofs provide evidence that this data organization supported the reported experiments (abstract and Section 4.1, pp. 1, 6). The authors avoid LeanDojo's novel split because they want LeanAgent to learn as much as possible from each repository to address its hardest theorems (Appendix A.1, p. 16). Inference: this choice does not isolate generalization to unseen premises. Inference: a Verus product should preserve exact dependency and version metadata because a retrieved lemma that is unavailable in the current module would be unusable.

## technique 3: one-epoch progressive retriever training

what it is: start from ReProver's ByT5 retriever, train it for one additional epoch on each newly generated repository dataset, precompute embeddings for the current premise corpus, and repeat as the database grows (Section 3.3, p. 5). The one-epoch limit is the paper's stability/plasticity control. It saves the iteration with highest validation premise recall at ten (R@10) as a plasticity measure and averages test R@10 over previous datasets as stability (Section 3.3, p. 5).

when to use it: Inference: test this for sequential domains where adaptation must preserve previous retrieval performance. The paper states: “We train LeanAgent on the new dataset for an additional epoch.” (Section 3.3, p. 5).

how to apply it:
1. initialize the retriever from ReProver's mathlib4-trained model (Section 3.3, p. 5)
2. train one extra epoch on the current repository dataset; update premise embeddings (Section 3.3, p. 5)
3. run a batched forward pass over all current premises and cache embeddings (Appendix A.1, p. 16)
4. select the checkpoint with highest validation R@10 and measure mean historical test R@10 (Section 3.3, p. 5)
5. add the next repository dataset and repeat (Section 3.3, p. 5)

Verus form: Inference: test a retriever over Verus lemma and contract text, starting with one incremental epoch per project and measuring retrieval recall on old and new proof obligations. The paper does not establish that this training duration is suitable for Verus.

evidence and limits: Table 3 defines Windowed-Forgetting 5 (WF5), Forgetting Measure (FM), Catastrophic Forgetting Resilience (CFR), Expanded Backward Transfer (EBWT), Windowed-Plasticity 5 (WP5), and Incremental Plasticity (IP) (p. 8). Table 4 reports LeanAgent's Single Repository values: WF5 0.18, FM 0.85, CFR 0.88, EBWT 1.21, WP5 2.47, and IP 1.02 (Table 4, p. 9; each is a metric value, not a task fraction). All four Merge All setups have negative IP values, which the authors interpret as declining validation R@10 (Section 4.3, pp. 9–10). These are retrieval metrics; they do not directly measure proof success. Inference: evaluate both retrieval and proof outcomes before adopting this update rule. Four NVIDIA A100 80GB GPUs, bfloat16, AdamW, effective batch size 16, 1,000-step warmup, and cosine decay are the reported training setting (Appendix A.2, p. 16). For Elastic Weight Consolidation (EWC), the authors report grid values {0.01, 0.1, 1, 10, 100} and select 0.1, but conclude EWC can become excessively plastic as theorem complexity changes (Appendix A.2, p. 17; Section 4.3, p. 9).

## technique 4: premise-retrieval and best-first tactic search

what it is: for each `sorry` theorem, embed the current proof state, retrieve relevant premises, filter them through a file dependency graph, generate 64 tactic candidates with ReProver's tactic generator and beam size five, execute candidates in Lean, and perform best-first search by cumulative tactic log probability (Section 3.4, p. 5; Appendix A.2, p. 16). The search backtracks at dead ends and stops at a proof, exhaustion, or ten-minute limit (Section 3.4, p. 5). The paper states: “If the search reaches a dead-end, we backtrack and explore alternative paths.” (Section 3.4, p. 5).

how to apply it:
1. build a directed file-import graph and its transitive closure (Appendix A.1, p. 16)
2. retrieve premises by similarity and filter for file accessibility (Section 3.4, p. 5); Appendix A.1 says to choose the top 25% of accessible and relevant premises, while Appendix A.2 reports 100 retrieved premises per proof state (p. 16). The paper does not specify a combined numerical rule for those two settings
3. generate 64 tactic candidates with beam search size five (Appendix A.2, p. 16)
4. execute each candidate in Lean; add successful transitions as tree edges and choose the maximum cumulative log-probability path (Section 3.4, p. 5)
5. backtrack on dead ends until success, exhaustion, or 10 minutes (Section 3.4, p. 5)
6. insert successful proofs into source files by replacing `sorry` from the bottom upward, commit, push, and open a pull request (Appendix A.1, p. 16)

Verus form: Inference: explore search over candidate proof edits using Verus feedback, with accessible lemmas as context. Define an intermediate search state and a success criterion before choosing how to rank candidates. This is a proposed adaptation; the paper supplies no Verus implementation.

evidence and limits: the procedure executes tactic candidates in Lean (Section 3.4, p. 5). However, the alternate PFR commit permits two proofs by reflexivity involving an unfinished definition and five proofs through a placeholder theorem stating `0 = 1` (Appendix A.5, pp. 29–30). The authors write: “As such, it proves False, allowing it to derive anything, including 0 = 1.” (p. 30). Appendix A.5 also describes a Mathematics in Lean Source proof that references another theorem still unproven at that point (p. 24). Inference: successful Lean execution does not establish that every dependency is free of unfinished proofs or false placeholders; inspect those dependencies when evaluating generated proofs.

## techniques for the catalog

- complexity curriculum — classify theorem difficulty from proof-step complexity and order repositories by easy-theorem counts
- dynamic proof database — retain versioned theorem, premise, import, tactic, and proof-state metadata for reuse
- progressive retriever training — train one epoch per new dataset and track stability and plasticity with R@10
- dependency-filtered best-first proving — retrieve accessible premises, generate and execute tactic candidates, and backtrack under a time limit
