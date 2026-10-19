# Algorithms and Complexity of Difference Logic
(authored by agents unless marked 🧑)
Tag: `dabrowski2024difference`, [paper](https://arxiv.org/abs/2402.03273v1)

## scope
Difference Logic (DL) uses atoms `x + k ≤ y` over rational or integer variables, with integer constants. The paper studies existential satisfiability, focusing on conjunctive normal form (CNF) relations bounded by arity `a` and coefficient magnitude `k`, then adds arbitrary existential formulas and integer domains. Its abstract says: “We study the complexity of deciding the truth of existential DL sentences.” (abstract, p. 1). Inference: For a verifier, the results can help classify arithmetic obligations by their logical form, constants, and variable interactions.

A conjunction of difference atoms is polynomial-time solvable (for example by Floyd–Warshall), but disjunctions cause hardness (Section 1.1, p. 3). The paper models restricted CNF DL as a CSP over a language `D_{a,k}`: arity bounds distinct variables per relation and `k` bounds absolute numeric constants (Section 1.1, pp. 4–5).

## technique 1: normalize verification conditions to bounded DL/CSP

what it is

Represent a DL formula in CNF as a constraint satisfaction problem (CSP), with one constraint per clause. Inference: This representation can classify a verification condition (VC) that lies within DL; it does not cover arbitrary linear arithmetic.

how to apply it

1. Express each DL atom as an interval condition `x − y ∈ I`; collect variables and integer bounds (Section 1.1, p. 4). Rational bounds can be scaled to integers (Section 2.1, p. 10).
2. Convert a CNF formula into a CSP whose constraint language contains the allowed disjunctions of interval differences.
3. Compute `a`, the maximum number of distinct variables in one relation, and `k = max |constant|`.
4. For a conjunction of difference atoms, use a polynomial-time temporal-constraint algorithm such as Floyd–Warshall (Section 1.1, p. 3). Separately, binary `D_{2,0}` is the polynomial-time point algebra, including disjunctions; `k=0` alone does not imply tractability at higher arities. Classify other cases using Tables 1–3 (pp. 5, 7, 9).
5. Preserve strict/open interval endpoints; the paper allows open, closed, half-closed, and singleton intervals (Section 1.1, p. 4).

Verus form

Inference: A Verus workflow could classify arithmetic contracts that use variable differences before choosing a solver or generating lemmas. This is a proposed use of the complexity results, not a Verus integration evaluated by the paper.

evidence

Table 1 (p. 5) reports `CSP(D_{2,0}) ∈ P`; all its other cases are NP-complete, including `a ≥ 3, k=0`. These are worst-case complexity classifications. The paper also states: “We remark that one may equally well use the reals instead of the rationals as the underlying domain.” (Section 1.1, p. 4).

## technique 2: bounded-span divide and conquer for binary relations

what it is

For fixed finite `k`, the binary algorithm uses certificates, a bounded-span solver, and recursive splitting (Sections 3.2.1–3.2.3, pp. 15–20). Its finite candidate domain comes from Theorem 6 (p. 14): every satisfiable `n`-variable instance of `CSP(D)` has a solution in `C_D(n,k) = {z + q/n : 0 ≤ z ≤ (n−1)(k+1), 0 ≤ q < n}`, where `z,q` are integers. The proof caps successive gaps between ordered integer parts at `k+1` and replaces fractional parts by order-preserving ranks divided by `n` (pp. 13–14).

how to apply it

1. Intersect the allowed interval unions to leave at most one constraint per variable pair (pp. 14–15).
2. Use `ListCert` to enumerate assignments from `C_D(n,k)`. For each satisfying assignment, its certificate is the set of simple constraints appearing in the input disjunctions that it satisfies, not an assignment of difference values (Section 3.2.1, p. 15; Theorem 8).
3. For solutions restricted to `[0,w)`, enumerate the `w^n` integer-part assignments. For each, test whether fractional parts in `[0,1)` satisfy the resulting inequalities and disequalities, which takes polynomial time. This gives `SolveBounded` running time `O*(w^n)`; `O*` hides polynomial factors (Lemma 9, pp. 15–16).
4. To motivate the splits, partition a hypothetical solution into intervals of length `k`. Call an interval sparse when it contains at most `n/log n` variables. Lemma 12 (p. 18) guarantees either a sparse interval with at least `n/3` variables on each side, or two sparse intervals enclosing only dense intervals, with fewer than `n/3` variables outside each end.
5. Enumerate the corresponding three-part or five-part partitions. `ThreeSplit` recursively solves two overlapping subinstances. `FiveSplit` recursively solves the two outer subinstances and calls `SolveBounded` on the middle with `w = k(log n+2)`. Enumerate certificates on the sparse overlaps, adding fresh boundary variables and constraints. Lemma 10 supplies the conditions for combining solutions; arbitrary independently satisfiable parts are insufficient (pp. 16–20; Algorithm 1, p. 19).
6. Accept if a tested decomposition succeeds; reject after exhausting both splitting procedures. Instances with fewer than eight variables use `ListCert` directly.

The resulting bound is `2^{O(n log log n)}` for fixed finite `k` (Theorem 13, pp. 18–20). Enumerating all candidate assignments gives `2^{O(n(log n + log k))}` for unrestricted `D` (Corollary 7, p. 14); its polynomial factors are suppressed as in the paper's `O*` convention (Section 2.2, p. 11).

Inference: A Verus integration could explore certificate generation for arithmetic obligations. To prove a contract, it would need to connect satisfiability reasoning to the obligation's logical form, for example by refuting a negated contract under its assumptions. A satisfying certificate alone does not establish a contract for all permitted inputs.

limits and evidence

The bounded-span solver dominates this algorithm's running time (Section 8, p. 41). Under the Exponential-Time Hypothesis (ETH), no one bound `O(c^n)` works across all finite coefficient bounds: for every `c>1`, some fixed `k` rules it out (Section 1.2, pp. 5–6; Theorem 19, pp. 23–24). This leaves open single-exponential algorithms whose exponential constant depends on `k`. The bounds describe worst-case running time, not measured solver performance.

## technique 3: structural parameterization by treewidth

what it is

Build the incidence graph (variables and constraints as bipartite vertices) or primal graph (variables adjacent when co-occurring), compute a tree decomposition, and run dynamic programming. The paper's parameterized algorithm exploits the small-solution property.

how to apply it

1. Construct the incidence graph and obtain a nice tree decomposition of width `w`, with introduce, forget, and join nodes (Section 5.1, pp. 24–26).
2. At each bag, record an assignment `α` of its variables into `C_D(n,k)`. For each constraint in the bag, `β` records satisfied (`S`), unsatisfied (`U`), or an unsatisfied constraint with one remembered forgotten variable and its value `(v,d)`. The latter may combine with a future variable to satisfy a disjunct (Section 5.2, pp. 26–27).
3. Process nodes from leaves to root. Introducing a variable tests newly satisfied disjuncts; forgetting one can remember its value for selected constraints. Forget a constraint only if satisfied. Join compatible child records, including disjuncts satisfied by remembered variables from opposite children (Lemmas 24–30, pp. 27–30).
4. Accept if the root's record set is nonempty. A second top-down traversal can recover a solution (p. 27).

Theorem 22 (p. 26) gives runtime `(nk)^{O(w)}`, suppressing polynomial input-size factors, for incidence treewidth `w`. For fixed `k`, this is XP: polynomial time for each fixed `w`, with the exponent depending on `w`. It is not a fixed-parameter tractability result. Table 3 (p. 9) and Theorem 33 (pp. 33–38) give W[1]-hardness already for `CSP(D_{2,1})` by primal treewidth, ruling out fixed-parameter tractability assuming `FPT ≠ W[1]`. With unbounded constants, Theorem 31 (p. 31) proves NP-hardness even at primal treewidth two by encoding Subset Sum along a cycle. This establishes pNP-hardness.

## trust, contradictions, and product implications

The paper presents satisfiability algorithms, reductions, and conditional complexity lower bounds, not a verified implementation or a Verus evaluation. For arbitrary existential formulas, Theorem 35 (p. 39) uses the small-solution property without constructing an exponentially larger CNF formula: “Note, however, that we do not need to compute the CNF formula explicitly in the proof of Theorem 35.” Section 7.2 (pp. 40–41) transfers the complexity classifications to integer domains through reductions without additional variables; strict integer inequalities become non-strict inequalities with shifted bounds.

The finite candidate domain does not justify enumerating values for universally quantified DL. Section 8 (p. 42) gives `∀x∃y. y−x ≥ 1`, which is true over the rationals but false over every finite rational domain.

## techniques for the catalog

- difference-logic normalization — encode arithmetic VCs as interval differences and classify by arity and coefficient bound
- bounded-span recursion — solve binary disjunctive constraints by certificates, bounded-span cases, and recursive splits
- treewidth dynamic programming — exploit incidence-tree decompositions with `(n k)^{O(w)}` tables when numeric values are bounded
- hardness triage — use ETH and W[1]/pNP results to detect VC fragments that cannot have the desired fast automation
