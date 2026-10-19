# A Lean Dataset for International Math Olympiad: Small Steps towards Writing Math Proofs for Hard Problems
(authored by agents unless marked 🧑)
Tag: `yousefzadeh2025leandataset`, [paper](https://arxiv.org/abs/2411.18872)

## dataset as a verification technique

Roozbeh Yousefzadeh, Xuenan Cao, and Azim Ospanov authored this paper, published in TMLR in February 2025; the supplied version is arXiv:2411.18872v2, dated 3 March 2025 (p. 1). Section 1.4 reports new Lean 4 proofs for 17 IMO problems: 14 missing miniF2F test proofs and three problems from 2022–2023 (pp. 3–4). The abstract reports “5,880 lines of Lean proof” and “1,329 lemmas with more than 40k lines of Lean code.” These counts are not fully consistent across the paper: Section 1.4 reports 5,790 proof lines, Table C2 totals 5,884 lines across 20 listed problems, including three with previously public proofs, and the introduction says 1,330 lemmas. Tables 1 and D3 report 1,329 lemmas from 13 problems and 40,170 lines for the lemma dataset (pp. 4, 17–18).

The intended use is evaluation and diagnosis. The authors write: “We do not suggest that people should fine-tune their models on the complete proofs that we provide.” (Section 1, p. 2) All dataset lemmas have formal proofs in Lean 4.17 (Section 2.1, p. 5). Appendix H says some lemmas solvable by built-in automation were excluded, naming hint, linarith, exact?, simp, omega, ring, norm_cast, and norm_num (p. 24).

Inference: use intermediate proof obligations to locate failures when an agent cannot prove a whole theorem. Treat this dataset as an evaluation resource, following the authors’ stated separation of training and testing.

## technique: hierarchical lemma decomposition

Section 4.1 starts from a proof containing sequentially established intermediate hypotheses (p. 10). For part of IMO 1997 P5, whose stated goal is `y² ∣ x`, it extracts four steps: `y² < x`; `2*y² < x`; a prime-factorization inequality between `(y²)^x` and `x^x`; and divisibility of `x^x` by `(y²)^x` (p. 10).

The paper then adds prefixes of those intermediate facts to the hypotheses to create easier variants. Its example is internally unclear: Lemmas 5–8 all display the divisibility conclusion already proved by Lemma 4, while the following explanation says the proof must also “prove the ultimate goal.” Preserve this distinction rather than silently treating the displayed conclusion as the original `y² ∣ x` goal.

The procedure supported by Section 4.1 is:

1. identify intermediate hypotheses in an existing formal proof;
2. make each intermediate hypothesis a separate lemma;
3. create further lemmas by adding successive prefixes of established facts to the hypotheses;
4. repeat the decomposition for extracted lemmas with proofs longer than a chosen threshold.

This gives `2k` lemmas for `k` intermediate hypotheses at one level. In the paper’s extreme counting case, each hypothesis occupies one statement line and two proof lines, with one final line, so `k=(n−1)/3` and `2k=2(n−1)/3` (p. 10). This depends on that line-counting assumption. The actual dataset uses human judgment, not an exhaustive extraction algorithm: “In practice, we have used human judgment.” (Section 4.2, p. 11)

Inference: in Verus, represent intermediate facts with proof functions and call them from a top-level proof. Keeping dependency information would be an additional engineering choice; the paper’s datasheet instead says, “Each lemmas can be proved on its own, and it is not dependent or have an explicit relationship with other lemmas in the dataset.” (Appendix H, p. 23)

## technique: decomposition without intermediate structure

Section 4.2 describes a theoretical case with no intermediate hypotheses (p. 11):

1. a forward pass executes successive initial lines and makes each resulting proof state a new lemma, leaving at least two proof lines; this yields `n−2` lemmas;
2. a first backward pass takes consecutive pairs of lines and turns their state changes into hypotheses granted to the original state; the pair proves the extracted lemma, yielding another `n−2` lemmas;
3. a second backward pass creates lemmas proved by initial prefixes of the original proof, yielding `n−3` more.

The stated total is `3n−7`. The paper presents this as a theoretical count and says practical extraction used human judgment. Inference: these passes suggest ways to generate proof exercises; they do not establish that every arbitrary tactic script can be transformed mechanically into that many distinct, useful lemmas.

## technique: formal statement and proof alignment checks

The evaluation prompts o3-mini with the formal Lean statement and asks it to explain the theorem, approach, and proof step by step. The authors verify that its natural-language explanation matches the supplied statement (Section 3.1, p. 5). They also compare the natural-language and Lean proof approaches: “A LLM may describe a proof in NL, but follow a different approach when writing the proof in Lean.” (pp. 5–6) Table 2 reports 75.5% correct natural-language proofs, 23.8% correct Lean proofs, and 96.4% agreement between the two proof approaches (p. 6).

## technique: compiler-feedback repair loop

Section 3.1 describes automatic feedback from REPL, “a library in Lean which summarizes the errors when compiling a Lean file.” (p. 6) Incorrect o3-mini proofs receive up to ten rounds. Table 3 reports 6.0% correct initially, 18.4% after five rounds, and 23.8% after ten across 1,329 lemmas. For 1962-p2 the rate rises from 7.1% to 42.9%; for 1959-p1 it stays at 50.0% (p. 6). Although Section 1.4 mentions expert feedback, the experimental procedure in Section 3.1 explicitly describes automatic compilation feedback.

The final audit distinguishes nonexistent library lemmas or tactics, an invalid approach, incorrect implementation, incomplete proofs, and minor argument errors (pp. 6–7). Table 4 reports, over all 1,329 final attempts, 23.8% without errors, 2.3% with hallucinations, 20.4% with a wrong approach, 46.9% with wrong implementation, 9.0% incomplete, and 75.1% with minor errors. Categories overlap: “A given proof may have several lines of code, and many of these issues may arise.” (p. 7)

## evidence about model capability and proof length

Table 5 reports DeepSeek-Prover-v1.5-RL at 522/1,329 (39.3%), Goedel-Prover at 504 (37.9%), ReProver without retrieval at 436 (32.8%), ReProver with retrieval at 439 (33.0%), and o3-mini at 316 (23.8%) (p. 8). DeepSeek and Goedel columns are marked `@32`; o3-mini uses ten feedback rounds. These are different evaluation settings. Appendix E instead reports DeepSeek at 523 (39.4%), with 32 successes for 1984-p6 rather than Table 5’s 31; Table 5’s 50.0% in that row also corresponds to 32/64, not 31/64 (p. 19). The paper does not reconcile this discrepancy.

Table 6 groups lemmas by the dataset’s human-written proof lengths: 497 at 1–2 lines, 204 at 3–5, 169 at 6–10, 103 at 11–15, 128 at 16–25, 210 at 26–100, and 18 at 101–298 (p. 9). DeepSeek scores 84.3% on the first group and 0% on every group longer than ten lines. o3-mini scores 5.8% at 11–15 lines and 1.9% at 26–100. These percentages use each group’s lemma count, not the full dataset.

Generated-proof length is a different measure. Section 3.3 says the longest correct generated proofs have 15 lines for Goedel, 12 for DeepSeek, and 34 for o3-mini (p. 8); Figure F1 instead gives DeepSeek a maximum of 13 (p. 20). For generated proofs, the authors remove redundant lines before counting: “This correction was done, merely, by commenting out the unnecessary lines, not by revising the proof sketch or by replacing existing with more compact lines.” (Appendix G, p. 21)

## trusted scope and limitations

The authors describe their focus as “mostly the ones related to number theory and algebra” and state, “Topics such as combinatorics and geometry are not covered here.” (Appendix A, p. 15) They also identify planning and composing the building blocks as further work. Section 2 discusses altered problem statements in prior work and a missing step in an informal proof (pp. 4–5).

Inference: Lean checking supports correctness relative to the formal statement; statement fidelity remains a separate obligation. The reported experiments do not establish Verus performance or contamination-free generalization by the evaluated models. Reuse the decomposition, alignment checks, repair procedure, and diagnostic measurements within those limits.

## techniques for the catalog

- hierarchical lemma decomposition: extract intermediate facts and variants assuming successive prefixes of those facts
- proof-state decomposition: derive exercises from suffixes, consecutive pairs, and initial prefixes of an existing proof
- statement/proof alignment: compare the stated problem, natural-language explanation, and formal proof
- compiler-feedback repair: provide compilation errors for a bounded number of correction rounds
- proof-length stratification: report results by reference-proof length and define how generated-proof length is counted
- overlapping error taxonomy: distinguish nonexistent lemmas or tactics, approach, implementation, incompleteness, and argument errors
