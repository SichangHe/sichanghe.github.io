# Towards SMT Solver Stability via Input Normalization
(authored by agents unless marked 🧑)
Tag: `amrollahi2024smt`, [paper](https://arxiv.org/abs/2410.22419)
## paper and result

Amrollahi et al. study solver instability: semantically equivalent or nearly equivalent SMT formulas can take very different times, or one can solve while another times out. The abstract states, "We introduce an approach for mitigating the stability problem based on normalizing solver inputs." (Abstract, p. 1) The target is input variation, not a faster solver. The paper considers four semantics-preserving mutations: assertion reordering, commutative-operand reordering, user-symbol declaration reordering and renaming, and replacement of an anti-symmetric operator by its converse (Section I, pp. 1–2).

The ideal normalizer maps every mutated version of one formula set to one canonical form. The paper proves that this ideal exists, but that computing it for arbitrary formulas is at least as hard as graph isomorphism (Section III-A, p. 4). It then implements an approximation for assertion shuffling and symbol renaming. The approximation has three stages: sort assertions by a name-independent pattern, rename all symbols canonically, and sort again lexicographically within each pattern class (Section IV, pp. 5–6).

The evaluation uses two benchmark sets. `smtlib` starts with 41,166 benchmarks from 1,581 families; after excluding algebraic-datatype inputs and stage timeouts, 41,075 are eligible. `mariposa` contains 16,622 verification benchmarks; 16,620 are eligible after two normalization timeouts. Each eligible benchmark receives ten randomly seeded mutations. Experiments use 48 AMD Ryzen 9 7950X machines, an independent 60-second and 8-GB limit for mutation, normalization, and solving, and cvc5 and Z3 for the SMT-LIB set; Mariposa is evaluated with Z3 because most inputs are unsolvable by cvc5 (Section V, pp. 6–7).

## technique 1: define a canonical normal form

what it is: represent a formula as a prefix sequence, separate theory symbols from user-defined symbols, and erase user-symbol names into pattern symbols based on first occurrence. For a formula sequence `A`, form every assertion shuffle `S(A)`, every commutative-operand variant `C(A)`, and the pattern sequence `P(A)`. Order these pattern sequences lexicographically and choose the least element. Rename the chosen pattern symbols to canonical names. Definition III.7 calls this least element `N(A)` (Section III, p. 4).

when to use: use this ideal definition when correctness of normalization matters more than cost, for example to state what an implementation should approximate or to check a small formula set. It is also the reference against which the paper's heuristic is measured.

how to do it:

1. Parse the SMT-LIB formula into assertion sequences and prefix symbol sequences. Theory symbols keep their identity; user-defined symbols are placeholders whose identity is determined by occurrence order (Section II, pp. 2–3).
2. Generate `S(A)`, all permutations of the assertions. Generate `C(A)`, all variants formed by swapping zero or more operands of binary commutative operators such as `+` and `*` (Definitions III.1–III.2, p. 3).
3. Conjoin each sequence and unconjoin it again to compute `P`, replacing the first user symbol by `@1`, the next new symbol by `@2`, and later occurrences by the corresponding earlier pattern symbol (Definition III.3, p. 3).
4. Choose the lexicographically minimal pattern sequence, then apply an injective renaming from `@k` to canonical variables. The result is the normal form (Definitions III.5–III.7, p. 4).
5. For anti-symmetric pairs, choose one representative operator and rewrite the other direction by swapping operands. For example, normalize `A < B` and `B > A` to the same chosen orientation (Section III-B, p. 4).

The paper proves invariance under the considered mutations. Its formal complexity result says, "Then, computing N (A) for an arbitrary A is as hard as solving graph isomorphism." (Theorem III.9, Section III-A, p. 4) The proof encodes graph vertices as user symbols and edges as equality assertions, so equal normal forms imply isomorphic encoded graphs (Appendix VII, pp. 8–9).

Verus form. Inference: this is a preprocessing function around Verus rather than a Verus proof annotation. A VL build could serialize the solver query or a selected assertion context into a canonical AST, sort declarations and assertions, and invoke Verus on the normalized source or SMT input. Inference: if normalization changes only logically equivalent order, the Verus contract stays unchanged; the product must nevertheless verify that the serializer preserves sorts, triggers, names, and source locations. A `spec fn` can describe a small canonicalization model for tests, while the executable normalizer should remain ordinary Rust and be tested against equivalence-preserving mutations.

evidence: the existence theorem and graph-isomorphism lower bound are formal results in the paper, while the implementation evaluates the approximation empirically. The paper omits the detailed proof from the main body and places it in Appendix VII. The ideal method is therefore a specification and proof baseline, not the practical algorithm used in the experiments.

where it fails or assumes: full enumeration is computationally expensive, and the lower bound makes a general efficient implementation unlikely. The definition assumes the selected mutation class preserves semantics. It does not normalize arbitrary rewrites, quantifier-trigger changes, solver options, or changes in the underlying solver.

## technique 2: pattern sorting, renaming, and super-pattern tie breaking

what it is: approximate the ideal normalizer with a deterministic three-step algorithm. Pattern sorting groups assertions whose name-erased structures match. Within a group, super-patterns summarize where each symbol appears across all groups. A multiset lexicographic order then resolves many ties without enumerating every permutation.

when to use: use it for large verification queries where assertion order and user-symbol names vary across generated code, but the formulas are too large for ideal enumeration. The paper's implementation handles shuffling and renaming; commutative operand reordering and anti-symmetric rewrites are discussed but not all implemented (Section IV, p. 5).

how to do it:

1. Compute each assertion's pattern `P(α)` and sort assertions by the lexicographic order of that pattern. Equal patterns form equivalence classes `EC1 ... ECn` (Section IV, pp. 5–6).
2. For each user symbol in each equivalence class, compute its role: zero when absent, otherwise the first position at which the symbol occurs in the assertion's user-symbol sequence. The super-pattern is the sequence of these role multisets across equivalence classes (Definitions IV.1–IV.2, p. 5).
3. Compare two assertions in the same pattern class by scanning their user-symbol positions. At the first differing pair, compare the symbols' super-patterns under the integer-multiset lexicographic order. If all pairs tie, return `inconclusive` and preserve their current order (Algorithm 1, p. 5).
4. Rename every pattern symbol to a canonical `Xk` after the first sorting pass. This removes original user names while preserving the pattern structure (Section IV, p. 6).
5. Sort each equivalence class again after renaming. This resolves ties that become distinguishable only after symbols have canonical names (Section IV, p. 6).
6. Record that the result is heuristic. The authors explicitly say that when super-patterns cannot distinguish assertions, the algorithm can leave different normal forms for mutated inputs (Section IV, p. 6).

The running example changes six assertions with reordered operands, symbols, and assertion order into a stable arrangement shown in Figures 4 and 5 (pp. 5–6). The paper reports that super-patterns are especially useful for symmetric benchmarks, although they cannot solve every tie.

Verus form. Inference: implement the three passes over a typed Rust AST or a solver-query intermediate representation, and keep the canonical form as a ghost/spec value only where a proof needs to compare queries. Inference: a `proof fn` can establish that two small test ASTs have equal canonical forms after a permitted mutation; it cannot prove the general graph-isomorphism-hard algorithm efficient. A VL pipeline should compare normalized solver logs or query hashes while retaining the original source for diagnostics.

evidence: Table I reports the normalized-output count over ten mutations, and the text explains exactly how patterns and super-patterns produce that count. The implementation is C++, not Verus, and the paper gives no formal proof that the heuristic always reaches the ideal form.

where it fails or assumes: symmetric assertions can have identical super-patterns, so the final order can depend on the input order. The current implementation excludes algebraic datatypes and does not implement all four mutation classes. Normalization also cannot repair a semantically bad query; it only makes equivalent input presentations more alike.

## technique 3: evaluate normalization by uniqueness and similarity

what it is: measure how many distinct outputs ten mutations produce and how textually similar those outputs are. One unique output is ideal; ten unique outputs means no convergence. Similarity is the average percentage of identical lines over all output pairs.

how to do it:

1. For each eligible benchmark, generate ten mutated inputs with fixed random seeds by shuffling assertions and renaming user symbols (Section V, p. 6).
2. Run the normalizer on all ten inputs. Count distinct outputs before normalization, after pattern sorting without super-patterns, and after super-patterns (Table I, p. 7).
3. Compute pairwise identical-line percentages and average the pairs. Report average and maximum normalization time under the 60-second limit (Table I, p. 7).
4. Report denominators explicitly. Each Table I row gives excluded/total and `#Bench = total − excluded`; for example, Arith is 0/883 and therefore 883 considered benchmarks, while BitVec is 5/793 and therefore 788 considered benchmarks (Table I, p. 7).

For the complete eligible sets, the paper reports 41,075 SMT-LIB and 16,620 Mariposa benchmarks, each with ten mutations. In the SMT-LIB subset of 4,461 benchmarks used to compare against Weber's earlier normalizer, the earlier tool produces unique outputs for 12% of benchmarks and the paper's approach for 87% (Section V-A, p. 8). Inference: these percentages use the 4,461-benchmark subset as denominator, so they mean approximately 535 and 3,883 benchmarks respectively; the paper gives rounded percentages rather than exact counts.

Table I's per-category denominators matter. In Equality, 1,570/1,570 are eligible; the average number of unique outputs falls from 10.00 pre-normalization to 2.79 with super-patterns, and similarity rises from 0.05% to 98.48%. In QF LinearIntArith, 10,795 of 10,801 are eligible; unique outputs fall from 9.98 to 4.21 and similarity rises from 8.62% to 88.67%. These are averages over ten mutations for each benchmark, not percentages of solved formulas (Table I, p. 7).

Verus form. Inference: expose these metrics in VL's proof CI: record the normalized-query hash, the number of hashes across semantically equivalent source mutations, and line or AST similarity. A Rust harness can generate declaration/order/name mutations, while Verus rechecks each candidate. Inference: a stable hash does not prove the query is equivalent; a separate Verus proof or differential test must establish the mutation relation.

evidence: Table I covers the eligible benchmark denominators and runtime. The aggregate normalization overhead is less than 0.8% of normalization plus solving time (Section V-A, p. 8). The paper reports this as a sum over all eligible benchmarks, so it is not a per-query percentile.

where it fails or assumes: text similarity can improve even when no unique normal form is found. The authors note Mariposa families where normalization leaves ten distinct outputs but still improves similarity and stability. The metric measures presentation convergence, not semantic equivalence or proof correctness.

## technique 4: measure solver stability with penalized runtime and MAD

what it is: run each mutated query on a solver and summarize both solving cost and failures with penalized runtime (`PR-2`) and variation with median absolute deviation (`MAD`). `PR-2` adds twice the timeout to every unsolved benchmark, so a solver that fails more often cannot look fast merely because failed runs stop early. Lower MAD means less variation across the ten mutation seeds.

how to do it:

1. For each benchmark and each of ten mutations, run the solver with the same 60-second and 8-GB limits before normalization and after normalization (Section V, p. 7).
2. For one seed, sum solved runtimes and add two times the timeout for each timeout, memory-out, or other error. This is the seed's cumulative PR-2 score (Section V-B, p. 8).
3. Average the ten seed scores. Compute MAD over those same ten cumulative scores. Report separate averages and MADs for cvc5 and Z3 on SMT-LIB and Z3 on Mariposa (Table II, p. 8).
4. Compare normalized and unnormalized scores. A lower MAD with a similar average indicates more predictable runtime; a lower average also indicates a performance gain.

Table II gives concrete denominators through the ten-seed construction, not through a new task count. For SMT-LIB Equality, cvc5's average PR-2 changes from 101,912 with MAD 286.0 to 101,778 with MAD 4.0; Z3 changes from 107,718 with MAD 108.8 to 107,885 with MAD 10.7. For QF NonLinearIntArith, Z3 changes from average 23,914 and MAD 194.7 to 22,265 and MAD 6.8. For Mariposa KomodoD, Z3 changes from 12,561 and MAD 264.2 to 13,327 and MAD 59.9. These are cumulative scores over ten mutations per benchmark; they are not per-instance seconds (Table II, p. 8).

The authors conclude, "More importantly, the MAD score improves significantly in all cases, sometimes by more than an order of magnitude (e.g., in the Equality division)." (Section V-B, p. 8) The table also shows exceptions in average PR-2, such as the KomodoD increase, so lower variance does not guarantee lower total runtime.

Verus form. Inference: apply normalization before each Z3-backed Verus check, then log per-proof PR-2 and MAD over controlled source mutations or repeated CI runs. Keep solver version, options, timeout, hardware, and query set fixed. Inference: the Verus proof result remains the acceptance criterion; PR-2 and MAD diagnose brittle or expensive automation. A normalized query that changes triggers or quantifier instantiations must be rejected unless Verus re-verifies the same contract.

evidence: the two solvers and exact metric definitions are reported in Section V-B, and Table II supplies per-division/family values. The experiment does not establish universal solver stability: it covers two solvers, selected theories, one mutation generator, and fixed limits.

where it fails or assumes: PR-2 depends on the chosen timeout penalty, while MAD can fall because all runs become uniformly slow. Results are solver- and benchmark-specific. cvc5 is omitted for Mariposa because most of those inputs are unsolvable by cvc5, so the two benchmark sets do not have identical solver coverage.

## technique 5: make the normalizer scale with DAG sharing and indexed roles

what it is: optimize representation and super-pattern computation for very large formulas. The implementation stores repeated subterms as dictionary indices, indexes only assertions in which each symbol appears, and compresses long super-patterns by storing nonzero roles plus runs of zeros.

how to do it:

1. Represent a pattern as an index into a dictionary of its subterms rather than as a fully expanded tree. This preserves DAG sharing and avoids exponential duplication (Section V-C, p. 8).
2. During one indexing pass, build for each symbol a list of assertions in which it occurs. Compute its super-pattern only over that list instead of traversing every assertion (Section V-C, p. 8).
3. Compress sparse super-patterns as nonzero role values interleaved with counts of zero roles. Large benchmarks generally contain many absent-symbol positions, so this reduces memory and lookup work (Section V-C, p. 8).
4. Keep the same semantic ordering and output as the unoptimized algorithm. These are data-structure optimizations, not new normalization rules.

The paper says the symbol index can reduce lookups from hundreds of millions to hundreds of thousands on some problematic benchmarks and improve normalization time by more than an order of magnitude (Section V-C, p. 8). It does not give a single denominator for that statement; it describes worst-case examples among the evaluated inputs.

Verus form. Inference: use hash-consed or indexed AST nodes in a Rust normalization pass, and cache symbol occurrence lists across repeated proofs. Inference: these optimizations belong outside the Verus proof and should be covered by executable differential tests against a simple reference normalizer. A small `proof fn` can check equality of outputs for bounded ASTs, but it cannot replace testing the hash-consing implementation at production scale.

evidence: the three optimizations are described as implementation details and tied to the paper's large-input setting. The benchmark collection contains inputs up to hundreds of megabytes and hundreds of thousands of symbols/assertions (Section V-C, p. 8).

where it fails or assumes: hash-consing and compressed role arrays add implementation complexity and can create bugs in the normalizer itself. The paper does not provide a machine-checked proof of the C++ implementation, nor does it measure memory separately for every optimization.

## what is proved, measured, and trusted

The paper proves the mathematical existence of a normalizing function, its invariance under the mutation class, and a graph-isomorphism lower bound. It measures output uniqueness, line similarity, normalization time, PR-2, and MAD over the stated benchmark sets and ten random mutations per benchmark. It does not prove the C++ heuristic complete, prove that every normalized query is semantically equivalent in the presence of unsupported syntax, or show that solver versions with different heuristics behave identically.

Inference: the trusted boundary for a Verus product includes the query generator, serializer, normalizer implementation, Verus's translation to SMT, the selected solver, and the contract itself. Normalization reduces one source of variation but does not validate a wrong `requires` or `ensures`, and it cannot detect a model that silently omits a memory or arithmetic fact. Inference: VL should report normalization as a stability aid, not as an additional correctness proof.

## contradictions, reuse, and product risk

The paper's headline says normalization improves stability with minimal overhead. Table II shows that the claim is mainly about variation: some average PR-2 values increase after normalization, such as Z3 KomodoD (12,561 to 13,327), even while MAD drops (264.2 to 59.9). The paper's conclusion is therefore consistent if “improves stability” means lower variation, but it should not be read as a universal speedup.

Inference: VL should reuse the mutation taxonomy, canonical symbol naming, super-pattern tie breaking, PR-2/MAD reporting, and the three scalability optimizations. VL should not redo the paper's exact C++ benchmark collection as a novelty claim; the paper already evaluates 41,075 eligible SMT-LIB and 16,620 eligible Mariposa inputs under ten mutations each. A new study should instead test Verus-specific mutations such as harmless Rust refactoring, module reordering, trigger-preserving edits, and dependency upgrades.

Inference: the threat to agent-written verified Rust is medium. Solver instability can make an actually valid proof fail after declaration order, generated-name, or harmless refactoring changes, which increases repair cost and can tempt an agent to weaken a contract. Input normalization directly addresses that brittleness. It does not address specification mistakes, invalid unsafe assumptions, or a proof that passes for the wrong reason.

## techniques for the catalog

- ideal canonical normalization — enumerate permitted equivalent forms, erase names into patterns, and choose the lexicographically minimal form
- pattern/super-pattern normalization — sort assertions by name-independent patterns, tie-break with super-pattern roles, rename symbols, and sort again
- uniqueness and similarity evaluation — compare distinct normalized outputs and identical-line similarity across ten mutated versions per benchmark
- penalized-runtime stability — combine solved time and twice-timeout penalties into PR-2 and use MAD over ten seeds to measure variability
- DAG pattern compression — hash-cons repeated subterms so formula patterns retain sharing instead of expanding trees
- indexed super-pattern computation — index each symbol's assertion occurrences and compute roles only where the symbol appears
- sparse super-pattern compression — store nonzero roles and zero-run counts to reduce memory and lookup cost on large formulas
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
