# Towards SMT Solver Stability via Input Normalization
(authored by agents unless marked 🧑)
Tag: `amrollahi2024smt`, [paper](https://arxiv.org/abs/2410.22419)
## paper and result

Amrollahi et al. study variation in SMT solving time caused by small input changes. The abstract states, "We introduce an approach for mitigating the stability problem based on normalizing solver inputs." (Abstract, p. 1) The supplied paper identifies itself as `arXiv:2410.22419v2 [cs.LO] 15 May 2025`; the link uses that arXiv identifier. The tag retains the original submission year encoded in the identifier.

The paper considers four semantics-preserving mutations: assertion reordering, commutative-operand reordering, user-symbol declaration reordering and renaming, and replacement of an anti-symmetric operator by its converse (Section I, p. 2). It defines an ideal normalizer for mutated variants and proves that computing such a normalizer is at least as hard as graph isomorphism (Section III-A, p. 4; Appendix VII, p. 10). Its practical approximation handles assertion shuffling and symbol renaming. Operand swapping and anti-symmetric replacement remain future implementation work (Section IV, p. 4; Section VI, p. 8).

The implementation is C++. Its three stages sort assertions using patterns and super-patterns, rename user-defined symbols, and sort each pattern class again. The authors explicitly caution, "It is important to note that our algorithm does not guarantee the normalization property." (Section IV concluding discussion, p. 6) Distinct mutated inputs can retain different outputs.

## technique 1: define a canonical normal form

what it is: represent formulas as prefix symbol sequences and replace user-defined symbols with numbered pattern symbols according to first occurrence. Theory symbols retain their identity. For an assertion sequence `A`, consider all assertion permutations `S(A)` and all commutative-operand variants of those permutations, `C(S(A))`. Definition III.7 defines `N(A)` as the lexicographically least element of `P(C(S(A)))` (Section III, pp. 3–4).

when to use: Inference: use the ideal definition as a specification for an approximate normalizer or as a reference implementation on very small inputs. Enumeration need not be practical on real verification queries.

how to do it:

1. Represent each assertion as a prefix sequence. Separate fixed theory symbols from user-defined symbols (Section II, p. 2).
2. Enumerate assertion permutations. For each permutation, enumerate variants obtained by swapping operands of zero or more binary commutative operators (Definitions III.1–III.2, p. 3).
3. Compute each sequence's pattern by conjoining its assertions, replacing successive new user symbols with `@1`, `@2`, and so on, reusing the same replacement for repeated occurrences, and unconjoining the result. Numbering is shared across the assertion sequence (Definitions III.3–III.4, p. 3).
4. Choose the lexicographically least resulting pattern sequence. This is `N(A)` itself. Definition III.5 separately permits injective renaming of pattern symbols; canonical variable names are not an additional requirement of Definition III.7 (pp. 3–4).
5. Handle anti-symmetric pairs separately by choosing one representative operator and rewriting the converse with swapped operands. For example, choosing `>` maps `A < B` to `B > A` (Section III-B, p. 4).

Theorem III.8 establishes that this `N` is normalizing. Theorem III.9 states, "Let N be a normalizing function. Then, computing N (A) for an arbitrary A is as hard as solving graph isomorphism." (Section III-A, p. 4) Its proof encodes vertices with user symbols and edges with equality formulas, reducing graph isomorphism to equality of normal forms. Even normalization for shuffling and renaming alone has this lower bound (Section III-A, p. 4; Appendix VII, p. 10).

Verus form. Inference: a solver-query preprocessing pass could use the definition as its target behavior. A small reference implementation could test whether an optimized pass preserves normalization under selected mutations. Applying this to Verus would require checking how the pass handles the actual generated SMT syntax; the paper contains no Verus implementation or evaluation.

evidence: the existence and lower-bound results have proofs in Appendix VII, p. 10. The main text notes that whether graph isomorphism has a polynomial-time algorithm is open (Section III-A, p. 4). The lower bound therefore does not prove that polynomial-time normalization is impossible.

where it fails or assumes: the definition covers the stated mutation relation, not every logically equivalent formula. The paper targets changes in inputs, rather than changes in solver versions or random seeds (Section I, pp. 1–2).

## technique 2: pattern sorting, renaming, and super-pattern tie breaking

what it is: approximate canonical normalization without enumerating all assertion orders. A pattern removes dependence on user-symbol names. A super-pattern describes a symbol's roles across the pattern classes of the entire input (Section IV, pp. 4–5).

when to use: Inference: this is suitable for queries whose assertion order and user-symbol names vary while their underlying formulas remain the same. Its usefulness must be measured on the target query generator.

how to do it:

1. Compute each assertion's pattern independently. Sort these patterns lexicographically; equal patterns form ordered equivalence classes `EC1 ... ECn` (Section IV, p. 4).
2. Define a symbol's role in one assertion as zero if absent, otherwise its first position in that assertion's sequence of user symbols. Its role in a class is the multiset of its roles in every assertion in that class (Definition IV.1, p. 4).
3. Form the symbol's super-pattern as the sequence of these role multisets across the ordered classes. Compare multisets by sorting their integer elements and comparing lexicographically. Compare super-patterns lexicographically using that multiset order (Definitions IV.2–IV.4, p. 5).
4. For assertions with the same pattern, scan corresponding user-symbol positions. The worked example continues past pairs with equal super-patterns, eventually comparing symbols `v` and `w` to order the assertions. If all corresponding super-patterns coincide, preserve the original assertion order (Section IV, p. 5).
5. After the first sorting pass, compute the pattern of the entire assertion sequence and rename its pattern symbols from `@k` to `Xk`. This preserves shared symbol identity across assertions (Section IV, p. 5).
6. Lexicographically sort each equivalence class again using the renamed assertions. This makes outputs identical when the first two stages produced the same assertion set in different orders, but does not guarantee a unique output for every mutation (Section IV, pp. 5–6).

Algorithm 1 displays an equality condition on super-patterns before returning their strict comparison. Inference: that condition appears to be a typographical error; with equal super-patterns, the strict comparison cannot distinguish the assertions. The steps above follow the accompanying worked example, which passes over equal super-patterns before finding unequal ones (Algorithm 1 and surrounding prose, p. 5).

Figures 4 and 5 show the running example's assertions after pattern sorting and after sorting plus renaming, respectively; both figures are on p. 5. They do not demonstrate implemented normalization of operand swapping. The experiments show that super-patterns help some categories substantially, but numerous symmetric assertions can still defeat tie breaking (Section V-A, p. 6).

Verus form. Inference: implement the three stages over a representation of generated SMT queries, preserving symbol identity and required syntax. Compare outputs across declaration-order and symbol-renaming mutations. Keep source-to-query mappings if diagnostics need to identify the original proof.

evidence: the paper evaluates this heuristic empirically, without claiming completeness. The current implementation does not support normalization of algebraic datatypes, and its mutations cover only shuffling and renaming (Sections IV–V, pp. 4–6).

where it fails or assumes: identical super-patterns can leave the result dependent on input order. The final sorting pass resolves only some such cases (Section IV, pp. 5–6).

## technique 3: evaluate normalization by uniqueness and similarity

what it is: count distinct outputs across ten mutations and measure their textual similarity. One distinct output is ideal; ten distinct outputs means that all ten remain different. Similarity is the average percentage of identical lines among all output pairs (Section V-A, p. 6).

how to do it:

1. Sample up to 50 benchmarks from each SMT-LIB leaf-directory family. After excluding algebraic-datatype benchmarks, the `smtlib` set contains 41,166 benchmarks from 1,581 families. The separate `mariposa` set contains 16,622 benchmarks from six verification families (Section V, p. 6).
2. Generate ten mutations per benchmark by assertion shuffling and symbol renaming. Renaming uses a fixed enumeration of names but shuffles their occurrence order, which also determines declaration order (Section V, p. 6).
3. Apply separate 60-second and 8-GB limits to mutation, normalization, and solving. The experiments use a cluster of 48 machines with AMD Ryzen 9 7950X CPUs (Section V, p. 6).
4. Exclude inputs timing out during mutation or normalization for any mutation. SMT-LIB loses six benchmarks to mutation timeouts and 85 to normalization timeouts, including 58 during parsing; Mariposa loses two to normalization timeouts. This leaves 41,075 and 16,620 eligible benchmarks, respectively (Section V, p. 6).
5. Compare output counts and similarity before normalization, after normalization without super-patterns, and after normalization with super-patterns. Report normalization times and the excluded/total denominator for each category (Table I, p. 7).

For Equality, all 1,570 benchmarks are eligible. The average unique-output count falls from 10.00 before normalization to 2.79 with super-patterns; similarity rises from 0.05% to 98.48%. For QF LinearIntArith, 10,795 of 10,801 are eligible; the corresponding values are 9.98 to 4.21 and 8.62% to 88.67% (Table I, p. 7). These counts concern textual outputs, not solved formulas.

On a random 4,461-benchmark SMT-LIB subset, Weber's earlier normalizer produces unique outputs for 12% of benchmarks, compared with 87% for this approach. Those rounded percentages describe that subset, not the entire evaluation (Section V-A, p. 7).

The aggregate normalization overhead is less than 0.8%, defined as total normalization time divided by total normalization plus solving time. This is an aggregate ratio, not a bound on individual queries (Section V-A, p. 7). Table I reports category averages and maxima; for example, Dice∗F averages 5.4847 seconds and QF Bitvec has a maximum of 38.7570 seconds (p. 7).

Verus form. Inference: record the number of distinct normalized queries across controlled source or query mutations, together with normalization cost. Check separately that the selected mutations preserve the intended problem; textual similarity alone does not establish that.

evidence and limits: Table I reports the denominators and the output metrics. Some Mariposa families retain ten distinct outputs after normalization, despite greater similarity. The paper therefore also measures solver behavior rather than equating textual convergence with stability (Sections V-A–V-B, pp. 6–8).

## technique 4: measure solver stability with penalized runtime and MAD

what it is: penalized runtime (`PR-2`) sums solved runtimes and adds twice the timeout for each unsolved benchmark, including timeouts, memory exhaustion, and other errors. Median absolute deviation (`MAD`) measures variation across the resulting scores (Section V-B, p. 8).

how to do it:

1. Run cvc5 and Z3 on SMT-LIB mutations before and after normalization. Run only Z3 on Mariposa, because most of those benchmarks are unsolvable by cvc5 (Section V-B, p. 7).
2. For each seed, sum PR-2 over all benchmarks in the category. With the 60-second timeout, an unsolved run contributes 120 seconds (Sections V–V-B, pp. 6, 8).
3. Average the ten cumulative seed scores. Compute MAD over those same ten cumulative scores, rather than over individual query runtimes (Section V-B, p. 8).
4. Report the mean and MAD separately. Inference: interpret lower MAD as lower variation in these category totals; it does not establish lower variability for every individual query.

For SMT-LIB Equality, cvc5's average PR-2 changes from 101,912 with MAD 286.0 to 101,778 with MAD 4.0. Z3 changes from 107,718 with MAD 108.8 to 107,885 with MAD 10.7. For QF NonLinearIntArith, Z3 changes from 23,914 and MAD 194.7 to 22,265 and MAD 6.8. For Mariposa KomodoD, Z3 changes from 12,561 and MAD 264.2 to 13,327 and MAD 59.9 (Table II, p. 8). The averages summarize cumulative category scores for one mutation seed, averaged over ten seeds; they are not per-query times or totals summed across all ten seeds.

The authors state, "More importantly, the MAD score improves significantly in all cases, sometimes by more than an order of magnitude (e.g., in the Equality division)." (Section V-B, p. 8) Table II also contains increased average PR-2 values, including KomodoD, so reduced variation does not imply a universal speedup.

Verus form. Inference: repeat the experiment on a fixed set of Verus queries while controlling solver version, options, timeout, and hardware. Report both cumulative scores and individual-query behavior if the aim is to diagnose unstable proofs.

evidence and limits: Table II covers the two solvers with the stated difference in benchmark coverage. Inference: a small MAD can coexist with uniformly expensive or unsuccessful runs, so the mean and failure count remain relevant. The experiment does not test solver-version changes or claim universal stability.

## technique 5: make the normalizer scale with DAG sharing and indexed roles

what it is: three implementation optimizations support benchmarks up to hundreds of megabytes, with hundreds of thousands of user-defined symbols and assertions (Section V-C, p. 8).

how to do it:

1. Preserve sharing of repeated subterms. Represent a pattern as an index into a dictionary of its subterms, rather than expanding its abstract syntax tree. The paper notes that a directed acyclic graph (`DAG`) can be exponentially more concise than a tree (Section V-C(a), p. 8).
2. In one indexing pass, build each symbol's list of assertions containing it. Compute its super-pattern using these occurrence lists instead of looking up its role in every assertion (Section V-C(b), p. 8).
3. Represent sparse super-patterns as nonzero role values interleaved with counts of zeros (Section V-C(c), p. 8).

The indexing optimization reduces lookups from hundreds of millions to hundreds of thousands on some problematic benchmarks, improving normalization time by more than an order of magnitude. The paper gives no separate per-optimization results table or memory evaluation (Section V-C, p. 8).

Verus form. Inference: retain sharing in a Rust query representation and index symbol occurrences. Differential testing against a simple representation can check that these optimizations preserve the output; the paper does not establish correctness for a Rust implementation.

evidence and limits: these are implementation descriptions, not additional normalization rules or proofs of a unique output. The paper does not report a machine-checked correctness proof of its C++ implementation.

## what is proved, measured, and trusted

The paper proves existence of an ideal normalizing function and the graph-isomorphism lower bound (Section III, p. 4; Appendix VII, p. 10). It measures output uniqueness, similarity, normalization time, and mean/MAD of cumulative PR-2 scores for the practical heuristic (Section V, pp. 6–8). Its conclusion proposes extending the implementation to the other mutations and investigating normalization for formula-cache reuse; those are future work (Section VI, p. 8).

Inference: a Verus integration would add the normalizer to the query-processing code whose behavior must be checked. Stable query presentation does not validate a contract or establish that a query generator captured the intended program behavior.

## contradictions, reuse, and product risk

The results distinguish stability from speed. For example, Z3 KomodoD's mean increases from 12,561 to 13,327 while MAD decreases from 264.2 to 59.9 (Table II, p. 8). This is consistent with the introduction's distinction between consistent performance and faster performance (Section I, p. 1).

Inference: reuse the mutation taxonomy, pattern and super-pattern construction, canonical naming, scalability optimizations, and evaluation method in an experiment on Verus-generated queries. Measure effects before adopting normalization in a proof pipeline. The paper supplies no direct evidence about Verus, Rust refactorings, or specification mistakes.

## techniques for the catalog

- ideal canonical normalization — enumerate assertion and operand permutations, replace user names with patterns, and select the lexicographically least pattern sequence
- pattern/super-pattern normalization — sort assertions using patterns and symbol roles, rename user symbols, and sort each class again
- uniqueness and similarity evaluation — measure distinct outputs and identical-line similarity across ten mutations per benchmark
- penalized-runtime stability — compute mean PR-2 and MAD across ten cumulative mutation-seed scores
- DAG pattern compression — represent shared subterms using dictionary indices
- indexed super-pattern computation — visit a symbol's indexed assertion occurrences when computing its roles
- sparse super-pattern compression — represent nonzero roles interleaved with zero counts
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The reason for this incompleteness is that when assertions cannot be distinguished by super-patterns, there can be different normal forms for benchmarks, even if one is a mutation of the other (via shuffling and renaming)."): checked the full ten-page paper, quotations, numbers, section and page references, mutation scope, algorithm steps, and evaluation definitions; corrected the appendix and other page references, datatype-exclusion order, tie-breaking description, unsupported operand-swapping example, and cumulative-score interpretation; removed unsupported claims and marked proposed Verus uses as Inference; did not inspect implementation code, reproduce experiments, or verify external references.
