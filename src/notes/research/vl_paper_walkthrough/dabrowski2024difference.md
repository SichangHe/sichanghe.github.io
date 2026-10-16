# Algorithms and Complexity of Difference Logic
(authored by agents unless marked 🧑)
Tag: `dabrowski2024difference`, [paper](http://arxiv.org/abs/2402.03273v1)

## scope
Difference Logic (DL) uses atoms `x + k ≤ y` over rational or integer variables. The paper studies existential satisfiability, focusing on CNF relations bounded by arity `a` and coefficient magnitude `k`, then adds arbitrary formulas and integer domains. Its abstract says: “We study the complexity of deciding the truth of existential DL sentences.” (abstract, p. 1). For a verifier, the contribution is a method for selecting algorithms from structural parameters and for recognizing when an SMT difference-constraint fragment is inherently expensive.

A conjunction of difference atoms is polynomial-time solvable (for example by Floyd–Warshall), but disjunctions cause hardness (Section 1.1, p. 3). The paper models restricted CNF DL as a CSP over a language `D_{a,k}`: arity bounds distinct variables per relation and `k` bounds absolute numeric constants (Section 1.1, pp. 4–5).

## technique 1: normalize verification conditions to bounded DL/CSP

what it is

Translate each arithmetic condition into a relation over variable differences, record the largest arity and coefficient bound, and solve the resulting CSP with the matching algorithmic regime. This exposes whether a VC is a tractable conjunction, a bounded-arity disjunction, or a hard unrestricted instance.

how to apply it

1. Rewrite each linear atom as `x − y ∈ I` or `x + c ≤ y`; collect variables and integer bounds (Section 1.1, p. 4).
2. Convert a CNF formula into a CSP whose constraint language contains the allowed disjunctions of interval differences.
3. Compute `a`, the maximum number of distinct variables in one relation, and `k = max |constant|`.
4. If every relation is a conjunction (`k=0` point-algebra cases), use graph closure/Floyd–Warshall. Otherwise classify using Table 1 and the time/parameterized tables (pp. 5, 8).
5. Preserve strict/open interval endpoints; the paper allows open, closed, half-closed, and singleton intervals (Section 1.1, p. 4).

Verus form

Inference: In Verus, keep arithmetic contracts in linear difference form where possible. Use `requires`/`ensures` and loop `invariant` clauses for the source obligations; let Verus's SMT backend solve the resulting linear arithmetic. A VC containing disjunctions should be split into branch lemmas or represented by an explicit enum, because Verus does not expose the paper's CSP language as a user API. This normalization does not prove memory ownership or termination; it only classifies arithmetic obligations.

evidence

The paper states that “The satisfiability problem for conjunctions of difference atoms is solvable in polynomial time (by, for instance, the Floyd-Warshall algorithm)” (Section 1.1, p. 3). It reports `CSP(D_{2,0}) ∈ P`, while `CSP(D_{2,k})` is NP-complete for finite positive `k` and unbounded `k` (Table 1, p. 5). These classifications are complexity theorems, not benchmark timings.

## technique 2: bounded-span divide and conquer for binary relations

what it is

For `D_{2,k}`, the upper bound uses short certificates for variable differences, a bounded-span subproblem, and recursive splitting. Section 3.2 names the components “Certificates”, “Instances with Bounded Span”, and “Divide-and-Conquer Strategy” (contents, p. 2).

how to apply it

1. Guess/list a certificate assigning each variable a representative difference value from the finite set of bounds (Section 3.2.1, pp. 15–16).
2. For an instance whose values lie in a span of at most `k`, call the bounded-span solver; it checks all allowed binary intervals against that compressed range (Section 3.2.2, pp. 15–16).
3. If the span is larger, choose a middle variable/value and partition variables into left, middle, and right sets according to their constrained differences.
4. Add bridge constraints fixing each side's relation to the chosen middle value, recursively solve both sides, and accept when both are satisfiable (Section 3.2.3, pp. 16–19; Algorithms `ThreeSplit` and `FiveSplit`).
5. Enumerate all admissible certificates and splits; reject only after all fail.

The resulting bound is `2^{O(n log log n)}` for `CSP(D_{2,k})` (Theorem 13, p. 5), while unrestricted `D` is `2^{O(n(log n + log k))}` (Corollary 7, p. 5).

Inference: A Verus tool could use this as an offline VC preprocessor: generate finite certificates, prove each branch's arithmetic lemma, and combine them by exhaustive ghost recursion. The recursive solver itself is not a Verus proof of the program; its output must be reflected by a lemma that the chosen certificate entails the contract.

limits and evidence

The upper bound is close to lower bounds but not tight for all `D_{2,k}`. The paper notes that the bounded-span algorithm is the dominant term and that improving it would lower the overall bound (Conclusion, p. 41). Under ETH, `CSP(D_{2,k})` has no uniform single-exponential algorithm (Section 1.2, p. 6). Numeric bounds and the number of variables are the denominator for these asymptotic claims; no experimental denominator is supplied.

## technique 3: structural parameterization by treewidth

what it is

Build the incidence graph (variables and constraints as bipartite vertices) or primal graph (variables adjacent when co-occurring), compute a tree decomposition, and run dynamic programming. The paper's parameterized algorithm exploits the small-solution property.

how to apply it

1. Construct the incidence graph and obtain a nice tree decomposition of width `w` (Section 1.3, pp. 7–8).
2. At each bag, maintain partial assignments for variables and constraints whose values come from the bounded solution domain.
3. Introduce, forget, and join nodes update the table while checking local difference relations.
4. At the root, accept if a complete consistent assignment remains.

The paper gives runtime `(n k)^{O(w)}` for `CSP(D)` with bounded numeric values and incidence treewidth (Section 1.3, p. 8). It also proves `CSP(D_{2,k})` W[1]-hard by primal treewidth for `1 ≤ k < ∞`, and `CSP(D_{2,∞})` pNP-hard (Table 3, p. 8).

Inference: For VL, treewidth can guide splitting of large verification conditions: low-width arithmetic dependency graphs are candidates for specialized ghost dynamic programming; high-width or unbounded-constant obligations should be escalated to stronger automation or redesigned invariants. Verus has no tree-decomposition primitive, so this is a preprocessing and lemma-generation layer.

## trust, contradictions, and product implications

The proved objects are satisfiability algorithms, reductions, and conditional lower bounds under ETH/W[1] assumptions. The trusted mathematical basis includes the CSP encoding, small-solution lemma, reductions, and the complexity hypotheses. The paper explicitly warns that a finite candidate value set does not handle universal quantifiers: “the formula ∀x∃y. y − x ≥ 1 is false when interpreted over any finite D ⊆ Q while it is true when interpreted over Q.” (Conclusion, p. 41).

Inference: Product threat from agent-written verified Rust is indirect but material: an arithmetic VC can be solver-valid while ownership, aliasing, termination, or an abstraction boundary remains unproved. VL should record `(a,k)`, domain (Q or Z), graph width, and branch count with every generated VC. Existing work already maps these complexity regimes; VL should not claim that all difference constraints are polynomial merely because conjunctions are.

## techniques for the catalog

- difference-logic normalization — encode arithmetic VCs as interval differences and classify by arity and coefficient bound
- bounded-span recursion — solve binary disjunctive constraints by certificates, bounded-span cases, and recursive splits
- treewidth dynamic programming — exploit incidence-tree decompositions with `(n k)^{O(w)}` tables when numeric values are bounded
- hardness triage — use ETH and W[1]/pNP results to detect VC fragments that cannot have the desired fast automation
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
