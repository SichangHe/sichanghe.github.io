# LeanAgent: Lifelong Learning for Formal Theorem Proving
(authored by agents unless marked 🧑)
Tag: `kumarappan2024leanagent`, [paper](http://arxiv.org/abs/2410.06209v8)

## what the paper does

LeanAgent is a lifelong-learning framework for Lean theorem proving. Its workflow combines a repository curriculum, a dynamic database, progressive retraining of a premise retriever, and best-first proof search. The paper reports 155 newly proved `sorry` theorems across 23 repositories and seven theorems exposed through Lean type-system exploits (abstract, pp. 1–2). The claims concern Lean and ReProver-based experiments; any transfer to Verus is an inference.

## technique 1: proof-complexity curriculum

what it is: order repositories by the amount of easy, already-proved material they contain, so the learner encounters simple mathematics before harder mathematics. LeanAgent extracts theorem and proof information with LeanDojo, computes each theorem's complexity as e^S, where S is the number of proof steps, and assigns infinite complexity to `sorry` theorems (Section 3.1, p. 4). It takes the 33rd and 67th percentiles over all theorem complexities, labels the below-, between-, and above-percentile theorems easy, medium, and hard, and sorts repositories by their number of easy theorems.

when to use it: use this when a prover must absorb multiple changing projects and early training should supply reusable basics. The method assumes proof length is a usable proxy for difficulty. The paper's exact statement is: “We then sort repositories by the number of easy theorems they contain.” (Section 3.1, p. 4).

how to apply it:
1. search and clone candidate Lean repositories with the GitHub API (Appendix A.1, p. 15)
2. reject repositories whose configured Lean version is unsupported; otherwise switch to that version (Appendix A.1, p. 15)
3. run LeanDojo extraction and compute e^S for each proved theorem; set `sorry` complexity to infinity (Section 3.1, p. 4)
4. compute global 33rd/67th percentiles, classify theorem difficulty, and sort repositories by easy-theorem count (Section 3.1, p. 4)
5. feed repositories in that order to the database and retriever (Sections 3.1–3.3, pp. 4–5)

Verus form: Inference: compute a project curriculum from Verus proof artifacts by counting proof steps or another explicitly defined complexity score, then train/retrieve lemmas in that order. Verus has no LeanDojo or `sorry` theorem concept in the cited Verus material, so repository parsing and the complexity proxy would need new tooling; the curriculum idea itself carries over.

evidence and limits: Table 2 reports LeanAgent accuracy as proven theorems divided by total `sorry` theorems. For Mathematics in Lean Source it proves 21 of 29 (72.4%); MiniF2F, 99 of 406 (24.4%); and PFR, 1 of 37 (2.7%). These denominators are the table's `#sorrys` column and the setting is the Lean4 repositories listed in Section 4.1 (Table 2, p. 6). The paper does not establish that e^S is optimal, and it reports one unresolved ODE theorem due to a lack of topic data (Conclusion, p. 10).

## technique 2: dynamic proof-and-premise database

what it is: maintain repository metadata, theorem status, source locations, imports, traced tactics, proof states, and a premise corpus in a database that can merge repositories and generate datasets (Section 3.2, p. 4; Appendix A.1, p. 15). A proof is represented as a sequence of tactic applications annotated with before/after states; the premise corpus stores files and their definitions. Duplicate theorems use the most recently added repository version, while duplicate premise and trace files keep the first encountered copy (Appendix A.1, p. 15).

when to use it: use it when proofs arrive continuously and later projects must reuse earlier facts while preserving provenance and file accessibility. The paper says: “This dataset includes a collection of theorems and their proofs.” (Section 3.2, p. 4).

how to apply it:
1. record repository metadata, commits, Lean versions, theorem statements, source positions, imports, and proof status (Appendix A.1, p. 15)
2. trace tactic applications and retain each proof state's annotations (Section 3.2, p. 4)
3. topologically sort traced files by imports and serialize a JSONL premise corpus (Appendix A.1, p. 15)
4. generate random 96/2/2 percent train/validation/test splits as LeanDojo does; the paper explicitly says validation and test each contain 2% (Appendix A.1, p. 15)
5. merge repositories with the stated duplicate-resolution policy and retain metadata for later curricula (Appendix A.1, p. 15)

Verus form: Inference: a Verus implementation can store modules, `spec fn`/`proof fn` declarations, imported modules, contracts, lemmas, and verifier traces, then retrieve only modules accessible through the Rust module graph. The database is external orchestration; Verus checks the resulting Rust proof. Lean tactic-state schemas and LeanDojo extraction do not carry over unchanged.

evidence and limits: the 23-repository evaluation and 155 new proofs provide evidence that this data organization supported the reported experiments (abstract and Section 4.1, pp. 1, 6). The random split intentionally avoids LeanDojo's novel split so the system can learn difficult theorems from each repository (Appendix A.1, p. 15), which limits claims about cross-project generalization. Inference: a Verus product should preserve exact dependency and version metadata because a retrieved lemma that is unavailable in the current module would be unusable.

## technique 3: one-epoch progressive retriever training

what it is: start from ReProver's ByT5 retriever, train it for one additional epoch on each newly generated repository dataset, precompute embeddings for the current premise corpus, and repeat as the database grows (Section 3.3, p. 5). The one-epoch limit is the paper's stability/plasticity control. It saves the iteration with highest validation premise recall at ten (R@10) as a plasticity measure and averages test R@10 over previous datasets as stability (Section 3.3, p. 5).

when to use it: use this for sequential domains where full retraining risks forgetting and unlimited adaptation risks overfitting. The paper states: “Restricting progressive training to one epoch helps balance stability and plasticity.” (Section 3.3, p. 5).

how to apply it:
1. initialize the retriever from ReProver's mathlib4-trained model (Section 3.3, p. 5)
2. train one extra epoch on the current repository dataset; update premise embeddings (Section 3.3, p. 5)
3. run a batched forward pass over all current premises and cache embeddings (Appendix A.1, p. 16)
4. select the checkpoint with highest validation R@10 and measure mean historical test R@10 (Section 3.3, p. 5)
5. add the next repository dataset and repeat; do not substitute EWC without measuring its tradeoff (Sections 3.3 and 4.3, pp. 5, 8–10)

Verus form: Inference: train a retriever over Verus lemma and contract text, using one incremental epoch per project and measuring retrieval recall on old and new proof obligations. The Rust proof still uses Verus constructs such as `requires`, `ensures`, `invariant`, `assert`, `lemma`, and `proof fn`; the retriever only proposes context. Do not treat model output as proof evidence.

evidence and limits: Table 4 reports LeanAgent's Single Repository metrics: WF5 0.18, FM 0.85, CFR 0.88, EBWT 1.21, WP5 2.47, and IP 1.02 (Table 4, p. 9; each is a metric value, not a task fraction). The authors call LeanAgent's WF5 75.34% lower than the next best setup and EBWT 16.25% higher, but those relative percentages compare table values rather than theorem denominators. In Merge All, the best setup's IP values are all negative, which the paper says indicates declining validation R@10 (Section 4.3, pp. 9–10). Four NVIDIA A100 80GB GPUs, bfloat16, AdamW, batch size 16, 1,000-step warmup, and cosine decay are the reported training setting (Appendix A.2, p. 16). The authors report EWC grid values {0.01, 0.1, 1, 10, 100} and select 0.1, but conclude EWC can become excessively plastic as theorem complexity changes (Appendix A.2, p. 16; Section 4.3, p. 9).

## technique 4: premise-retrieval and best-first tactic search

what it is: for each `sorry` theorem, embed the current proof state, retrieve relevant premises, filter them through a file dependency graph, generate up to 64 tactic candidates with beam size five, execute candidates in Lean, and perform best-first search by cumulative tactic log probability (Section 3.4, p. 5; Appendix A.2, p. 16). The search backtracks at dead ends and stops at a proof, exhaustion, or ten-minute limit (Section 3.4, p. 5). The paper states: “If the search reaches a dead-end, we backtrack and explore alternative paths.” (Section 3.4, p. 5).

how to apply it:
1. build a directed file-import graph and its transitive closure (Appendix A.1, p. 16)
2. for each proof state, retrieve 100 premises and retain the top 25% of accessible relevant premises (Appendix A.1, p. 16)
3. generate 64 tactic candidates with beam search size five (Appendix A.2, p. 16)
4. execute each candidate in Lean; add successful transitions as tree edges and choose the maximum cumulative log-probability path (Section 3.4, p. 5)
5. backtrack on dead ends until success, exhaustion, or 10 minutes (Section 3.4, p. 5)
6. insert successful proofs into source files by replacing `sorry` from the bottom upward, commit, push, and open a pull request (Appendix A.1, p. 16)

Verus form: Inference: substitute Verus verification for Lean execution: retrieve accessible lemmas, ask a model for candidate proof blocks, compile each candidate with `verus`, and rank only candidates that pass the verifier. A candidate can contain Rust proof code and `assert`/`assert forall` steps, but `proof fn` is erased and must never be called as runtime code. Verus does not provide Lean's tactic-state interface, so candidate generation and state extraction require a new adapter.

evidence and trusted boundary: LeanAgent's 155 proofs and the per-repository fractions in Table 2 are machine-checked by Lean, while retrieval, complexity scoring, model generation, and ranking are search components. Inference: for VL, Verus should remain the acceptance boundary; model confidence, blocked examples, or retrieval scores cannot replace compilation. The paper also reports seven Lean type-system exploits and says some proofs used unintended repository constructs that were being fixed (Section 4.2, p. 7). This is a concrete warning that a passing proof can exploit an unsound or unintended specification environment.

## what VL should take from this

Inference: the strongest reusable pattern is a versioned lemma database plus measured incremental training, with verifier checks after every generated candidate. LeanAgent's curriculum and search should not be copied as if Lean and Verus proof states were identical. Inference: VL should record denominator, model, repository commit, and verifier version for every result; otherwise improvements can be artifacts of changing projects or splits. The paper's use of random splits, its seven exploits, and its acknowledged topic-data failure show what remains trusted: the Lean kernel validates accepted proofs, but repository specifications, extracted data, model retrieval, and the training curriculum remain assumptions or untrusted search.

## techniques for the catalog

- complexity curriculum — classify theorem difficulty from proof-step complexity and order repositories by easy-theorem counts
- dynamic proof database — retain versioned theorem, premise, import, tactic, and proof-state metadata for reuse
- progressive retriever training — train one epoch per new dataset and track stability and plasticity with R@10
- dependency-filtered best-first proving — retrieve accessible premises, generate and execute tactic candidates, and backtrack under a time limit

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
