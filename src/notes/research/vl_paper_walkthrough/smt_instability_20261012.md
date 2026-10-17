# Quantifying SMT Solver Instability for Formal Verification
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.
Tag: `evans2026quantifying`, [paper](https://arxiv.org/abs/2610.12649)

## identity and scope

Daniel Evans, Rylie Hansen, and John Shorter, “Quantifying SMT Solver Instability for Formal Verification,” arXiv:2610.12649v1 (8 October 2026). The paper studies proof instability: semantically equivalent SMT queries can receive very different runtimes after harmless source permutations. It proposes coefficient of variation (CV) as a normalized measure and evaluates mutants from three software domains (bounded model checking, symbolic execution, and SMT-Comp queries) under two solvers, cvc5 and Z3.

## problem and threat model

SMT automation is useful but heuristic. A solver can return quickly for one logically equivalent encoding and time out for another. This threatens reproducibility, developer time, and confidence in proof workflows. The authors distinguish instability from ordinary difficulty: a query can be hard for every permutation without being especially unstable. The abstract reports that “SMT instability, a phenomenon where semantically equivalent permutations of source code take much longer to solve or timeout, has been found to interrupt workflows.” The paper names Verus only as an example of a tool that generates SMT queries; its mutations are shuffled assertions, not Verus declarations or triggers. Inference: for Verus, the corresponding threat is proof brittleness, where a harmless source change can make an existing proof fail or exceed a budget.

## measurement method

For each base query Q, generate a mutant set of semantically equivalent queries; here the modified SMT-Comp scrambler only shuffles assertions, with variable names normalized (n=100 mutants per set per Figure 1). Run solver S on each mutant and collect runtimes. Compute CV as standard deviation divided by mean runtime, and bootstrap the runtimes to get a 95% confidence interval; a query is called unstable if the lower bound of that interval is at least one. Regress log average runtime on log CV for sets with success rate one. Using CV rather than standard deviation avoids making queries with longer runtimes look more unstable.

The authors note that runtime distributions are abnormal and that timeouts leave runtime data missing, so CV cannot be estimated for those sets (for the SymEx hard category under cvc5 every original query had a success rate below one). For such sets they use success rate with two z-tests of proportions (unsolvable if timeouts exceed 5%, stable if success rate exceeds .95; Figure 1). The data spans three software areas and 60,000 query forms. Table 1 reports unstable proportions from 0.00 to 0.29; the highest is Z3 on hard BMC queries (0.29, CV 0.61).

## technique: normalize solver variance by difficulty

Step 1 define semantically equivalent mutants. Step 2 execute every mutant under a fixed solver and timeout. Step 3 calculate mean and standard deviation of runtime. Step 4 use CV to compare instability across query sets with different baseline difficulty. Step 5 report a bootstrap confidence interval, and fall back to the success-rate tests when timeouts occur. These steps are the study's summary of the paper's method, not numbered in the paper.

For Verus, store a proof's mutation family and CV alongside wall time. This reveals whether a proof is robust or merely lucky under one source ordering.

## technique: optimize query structure for runtime

The paper proposes, but does not implement, optimizing query structure for runtime rather than success rate or variance. Its evidence is that the fastest mutant of a set can be far faster than the original (Figure 2) and that, with 0.95 confidence, restructuring a hard BMC query could decrease Z3 runtimes by as much as 38% on average (§4.3). It conjectures machine learning could do the restructuring; no search procedure is given. Inference: a Verus tactic could be to benchmark several equivalent declaration, trigger and lemma forms before committing to a brittle proof; the paper tests none of these, and such a tactic must preserve semantics.

## evidence, limits, and failure modes

The authors find significant instability in all three domains, though in most categories the proportion of unstable queries is small, and they report that it increases with average query runtime (t = 10.5, df = 263, p < .001). They write that “future work should consider mitigating instability by optimizing query structure for runtime, rather than just success rate or variance”. The regression supports that more difficult queries tend to be more unstable; whether difficulty causes instability is not tested. Limits stated by the paper: only assertion shuffling is used, and variable names are normalized. Inference, not from the paper: other mutations, other solvers, and Verus workloads may behave differently; the experiments measure solver runtime, not developer productivity or theorem truth; a low CV does not prove a proof correct, and CV does not identify which axiom or trigger causes a problem.

## relevance to VL

VL should treat solver stability as a first-class proof-quality property. For important proofs, run a mutation stability check, record timeout policy, and preserve the solver version and query shape. When a proof is fragile, first search semantically equivalent formulations and inspect axioms, triggers, and declarations. Report stability separately from pass rate and correctness. This helps distinguish a missing invariant from a solver search accident.

## techniques for the catalog

- mutant-family stability testing: generate semantics-preserving query variants and measure runtime spread
- coefficient-of-variation reporting: normalize spread by baseline difficulty and expose timeout censoring
- runtime-guided query normalization: search equivalent lemma and trigger structures for faster, more stable solving
- proof-quality separation: report truth, acceptance, cost, and stability as distinct measurements

## study status

Written from the full PDF and not ChatGPT-checked. Quotes were checked against extracted text.

Audited 2026-10-12 against the paper: checked authors, date, 60,000 queries, CV definition, bootstrap interval, unstable threshold, success-rate tests, regression statistics, 38% figure, solver and domain names, and Table 1 extremes. Changed: named the solvers and domains and added per-domain figures (answering the earlier finding that none were given); replaced the invented timeout-censoring and repeated-sampling language with the paper's bootstrap and z-test method; removed the claim that the paper searches or generates permutations to reduce mean runtime, since it only proposes this; marked Verus declaration and trigger remarks as inference because the paper shuffles only assertions; marked the numbered steps as the study's summary; dropped the 10 s versus 0.1 s illustration, which was not in the paper. Not checked: the cited prior work (Mariposa and others).
