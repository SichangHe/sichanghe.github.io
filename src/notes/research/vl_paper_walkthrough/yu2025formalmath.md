# FormalMATH: Benchmarking Formal Mathematical Reasoning of Large Language Models
(authored by agents unless marked 🧑)
Tag: `yu2025formalmath`, [paper](https://arxiv.org/abs/2505.02735)

FormalMATH contains 5,560 Lean4 mathematical statements spanning high-school Olympiad and undergraduate problems. Its construction combines autoformalization, automated filtering, and expert review. The abstract states: “To mitigate the inefficiency of manual formalization, we introduce a novel human-in-the-loop autoformalization pipeline that integrates: (1) specialized large language models (LLMs) for statement autoformalization, (2) multi-LLM semantic verification, and (3) negation-based disproof filtering strategies using off-the-shelf LLM-based provers.” (p. 1) These are verified statement formalizations, not a collection of completed Lean proofs: Section 2 places FormalMATH among benchmarks “requiring new proof completion” (p. 4).

## compile-and-filter training data

The authors generate natural-language/Lean4 training pairs using a general-purpose LLM, such as GPT-4, to iteratively translate statements. Each candidate goes through the Lean compiler; only type-checked statements survive. The resulting 9,260 pairs train autoformalizers based on coding-specialized and pretrained theorem-proving LLMs (Section 3.2, pp. 4–5).

The steps are: (1) translate a natural-language statement into Lean4, (2) compile the candidate, (3) retain type-checked pairs, and (4) fine-tune the autoformalizers on those pairs. The paper calls this a “compile-and-filter” strategy (p. 5). It does not report a held-out semantic quality score for this training corpus.

Inference: Compilation checks whether a statement is well formed; it does not establish equivalence to the source problem. For Verus, a corresponding data loop could generate Rust contracts and check them with Verus, while separately comparing their meaning with the requirement. Requiring complete proofs would be an additional filter beyond the statement type checking described here.

## ensemble autoformalization with best-of-N

For each of K autoformalizer LLMs, the pipeline samples N candidate statements per problem. It then checks every candidate with Lean4 and passes syntactically valid statements to semantic verification (Section 3.2, p. 5). The paper states: “Only syntactically valid statements are preserved for subsequent semantic verification.” (p. 5)

The steps are: (1) sample N candidates from each of K models, (2) compile the candidates, and (3) send the survivors to the next filter. Figure 1 illustrates formalizing convexity, boundedness above, and continuity using explicit Lean hypotheses (p. 2). The paper does not specify numerical K and N values for this autoformalization procedure, so its aggregate results do not give an exact sampling configuration.

## multi-LLM semantic verification by back-translation

Multiple general-purpose LLMs, with o1-mini and Claude 3.5 Sonnet given as examples, check alignment between a source problem and its formalization. Appendix G says the semantic prompt is provided to five LLMs (p. 29). Each checker is instructed to (1) back-translate Lean into English, (2) compare the translation with the original problem, and (3) return True or False. The prompt requests only the binary answer, rather than a visible explanation.

Acceptance requires unanimity: “Importantly, only Lean4 statements that passed semantic verification performed by all the LLMs would be collected.” (Section 3.2, p. 5) The authors motivate back-translation by claiming Lean-to-natural-language translation is easier than the reverse. They report around 30% unanimous agreement for high-school competition problems and 4.63% on HardMath (p. 5).

The preservation figures are internally inconsistent. Section 3.2 says: “Overall, this procedure filters out 60.7% of syntactically correct but semantically misaligned statements (i.e., from 92.4% to 32.7%).” (p. 5) Figure 2b instead shows 31.7% after semantic verification (p. 3). Inference: The study cannot resolve this discrepancy from the paper alone; these figures should not be presented as a consistent conditional rejection rate.

Inference: For Verus, checkers could back-translate a generated contract and compare it with the requirement. Unanimous acceptance remains a process judgment, not a theorem proving that the contract captures the requirement. The paper does not establish how many useful candidates unanimity rejects.

## negation-based disproof filtering

The pipeline constructs the logical negation of a formal statement, using transformations such as De Morgan dualization, and asks an off-the-shelf LLM prover, such as DeepSeek-Prover-V1.5, to prove it in Lean4 (Section 3.2, p. 6). If the negation is proved, the original statement is rejected.

Example 3.2 negates a set equality in a number-theory problem (pp. 5–6). Its proof (1) simplifies the defining predicate and set equality, (2) specializes the asserted equality at 7, (3) extracts bounded witnesses k and l, and (4) uses `interval_cases` and `simp_all` to obtain a contradiction. The paper reports: “This strategy has filtered out a few unprovable statements, accounting for 1.6% of the total statements.” (p. 6)

Inference: Failure to prove a negation does not establish the original statement. For a Rust contract, a separate counterexample attempt could expose a false claim, provided the input assumptions are preserved. The paper does not supply a Verus implementation of this Lean procedure.

## expert verification and preservation accounting

The authors recruited 12 International Mathematical Olympiad medalist-level experts to check semantic alignment manually (Section 3.2, p. 6). Figure 2b reports preservation relative to the source collection: 100% initially, 92.4% after compilation, 31.7% after semantic verification, 30.1% after negation filtering, and 21.7% after manual verification (p. 3). The 31.7% value differs from the prose figure noted above.

Table 2 reports 72.09% preservation during expert verification, $6.89 per statement, and 22 days (p. 6). Thus 72.09% is the fraction surviving manual review of the last automated stage, not the fraction of all collected problems accepted before manual review. The final 21.7% uses the original source collection as its denominator. The paper describes experts checking alignment; it does not give a detailed revision protocol for rejected statements.

## benchmark proving methods and verification scaling

Section 4.1 evaluates best-first tree search and single-pass generation (pp. 6–8). Search prioritizes intermediate proof states and proposes tactics at each expansion. Its budget is N × S × T: search attempts, tactics per expansion, and expansion iterations. Single-pass generation samples complete proof trajectories. Pass@K measures the fraction of problems with at least one valid proof among K attempts (pp. 6–7).

The verifier centralizes the expensive Mathlib4 import in a parent thread and processes individual proofs through child threads in parallel (Figure 4 and Section 4.1, p. 8). This is an implementation for reducing repeated import overhead; the paper gives no numerical speedup for it.

On the full benchmark, Kimina-Prover achieves 16.46% at Pass@32, while BFS-Prover achieves 11.13% with a `1×32×100` budget (Section 4.1, p. 8). FormalMATH-Lite is a selected 425-problem subset, comprising 359 high-school and 66 undergraduate problems. Selection balances solvable and unsolvable problems using DeepSeek-V1.5-RL and stratifies by domain (Section 4.2, p. 9). Its scores should be identified separately from the full-benchmark scores.

On Lite, STP rises from 48.59% at Pass@32 to 53.17% at Pass@3200, a 4.58 percentage-point increase (Table 3, p. 7; Section 4.2, p. 10). The paper also reports domain bias and compares naive chain-of-thought, natural-language-augmented chain-of-thought, and vanilla generation. At K = 3200, Section 4.3 reports DeepSeek-V1.5-SFT scores of 50.6%, 49.2%, and 47.0%, respectively, and RL scores of 51.7%, 51.2%, and 49.8% (p. 11). Adding a natural-language solution hurts relative to naive chain-of-thought in this comparison, while still outperforming vanilla generation. These prose vanilla values differ from Table 3's 46.82% and 50.35% at the same budget; the paper does not reconcile them.

Inference: Verus experiments should state the problem subset, sampling budget, and contract being checked. The paper supports testing whether comments help proof generation; it does not establish that natural-language guidance always hurts.

## techniques for the catalog

- compile-and-filter autoformalization: generate statement pairs and retain candidates accepted by the formal compiler
- best-of-N ensemble translation: sample candidates from multiple autoformalizers before semantic filtering
- back-translation semantic checking: translate formal statements to natural language and require unanimous alignment judgments
- negation-based disproof: prove a transformed negation to reject the original formalization
- expert funnel review: check statement alignment manually and record preservation with explicit denominators
- parallel proof verification: centralize expensive library imports and check proofs concurrently
