# Improving NLSAT for Nonlinear Real Arithmetic
(authored by agents unless marked 🧑)
Tag: `wang2024nlsat`, [paper](http://arxiv.org/abs/2406.02122v4)

## scope and contribution

Zhonghan Wang modifies NLSAT, an implementation of Model-Constructing Satisfiability Calculus (MCSAT) for quantifier-free nonlinear real arithmetic (QF NRA), using clause-level feasible sets before literal decisions and arithmetic propagation to guide dynamic variable ordering. The implementation, clauseSMT, extends Z3's NLSAT module (Sections I.B and VI, pp. 1–2, 7–9). The supplied paper is arXiv:2406.02122v4, dated 26 September 2025 (p. 1).

The abstract states: “We propose two main algorithmic improvements: a clause-level feasible-set-based look-ahead mechanism and an arithmetic propagation-based branching heuristic.” (Abstract, p. 1). The problem is that literal decisions in Conflict-Driven Clause Learning (CDCL) can ignore how clauses constrain arithmetic variables and cause avoidable conflicts (Sections I–III, pp. 1–5).

## technique: feasible sets and clause-level look-ahead

For a literal with exactly one unassigned arithmetic variable, root isolation partitions the real line at polynomial roots; the satisfying intervals form its feasible set. A negated literal has the complementary set. A univariate clause's feasible set is the union of its literals' feasible sets; a set of clauses univariate in the same variable has the intersection of those clause sets (Definition 1, Section II.B, p. 3; Definition 2, Section IV.A, p. 5).

Use this information when several literals remain unevaluated. The method targets conflicts caused by literal choices that unnecessarily exclude values satisfying other clauses. A nonempty clause-set intersection is a path case; an empty intersection is a block case (Definition 3, p. 5). These classifications concern the current partial assignment, not global satisfiability.

The procedure is:

1. Convert the QF NRA formula to conjunctive normal form and maintain a partial Boolean/arithmetic assignment (Section II.A, p. 2)
2. Compute feasible sets of literals and take their union within each univariate clause (Section II.B, p. 3)
3. Intersect feasible sets of clauses univariate in the same arithmetic variable (Section IV.A, p. 5)
4. If the intersection is nonempty, select a pre-appointed arithmetic value from it (Section IV.A, p. 5; Algorithm 3, p. 6)
5. Process each clause using real-variable propagation; skip satisfied clauses and false literals, unit-propagate a sole undefined literal, and otherwise select a literal whose feasible set contains that value (Algorithm 3, p. 6)
6. Assign the arithmetic variable that value. If the intersection is empty, use original NLSAT clause processing to obtain a conflict and CAD conflict analysis to revise earlier assignments (Sections IV.A–B, pp. 5–6; Algorithm 7, p. 8)
7. After learning a lemma, intersect its feasible set with the cached variable set. If nonempty, select a value and reprocess clauses for a compatible literal path; otherwise use original clause processing (Algorithm 4, p. 6)

The paper says: “The updated algorithm introduces the additional condition that the feasible-set of the current literal must contain the pre-appointed value.” (Section IV.A, p. 5). Thus decided literals share an arithmetic witness in a path case. Learned lemmas can contain CAD root atoms and invalidate the previous path, requiring literal decisions to be reset (Sections IV.B and VI.A, pp. 6, 8).

Inference: this could inform an external proof-search heuristic for nonlinear obligations sent to Z3 by Verus. The paper provides no Verus integration or evidence that source-level interval lemmas reproduce the benefit of changing NLSAT internals.

The evaluation notes that look-ahead sometimes increases conflicts: selecting values from intersected intervals rather than individual literal intervals can change subsequent search, even with identical random seeds (Section VII.C, p. 10). Inference: avoiding a local literal-choice conflict does not guarantee a better overall search path. This study does not establish a separate soundness or completeness proof for clauseSMT.

## technique: clause-level arithmetic propagation

Whenever a clause becomes univariate in an arithmetic variable, intersect its feasible set with the variable's current set. Classify the result as blocked (empty), fixed (one real value), or other (neither empty nor a singleton) (Section V.A and Algorithm 5, p. 7).

Use it after Boolean or arithmetic assignments make clauses univariate. The paper explicitly notes that either kind of assignment can trigger an update (footnote 5, p. 7).

The procedure is:

1. Maintain a feasible set for each arithmetic variable
2. Compute each newly univariate clause's feasible set and intersect it with the corresponding variable set
3. Record empty sets in `blocked_vars` and singleton sets in `fixed_vars` (Algorithm 5, p. 7)
4. Use watched-variable updates to detect newly univariate clauses and update their feasible sets eagerly (Section VI.B.1, pp. 8–9)
5. Branch on blocked variables first, fixed variables second, and otherwise use the Variable State Independent Decaying Sum (VSIDS) heuristic (Algorithm 6, p. 8)

The definition states: “clause-level propagation on x is the computation of the feasible-set of the clause c, which serves to narrow the feasible-set of the variable x.” (Definition 4, Section V, p. 6). An empty arithmetic set does not directly supply a conflict clause: NLSAT clause processing still has to produce one (Section V.B, p. 7).

Inference: a Verus proof-generation layer could experiment with prioritizing lemmas that force a value or expose a contradiction. Whether this improves verification requires measurements on Verus obligations; the paper evaluates solver internals on SMT-LIB formulas.

## technique: propagation-based branching and dynamic ordering

The implementation combines blocked/fixed status with VSIDS activity scores and two watched variables per clause or lemma. Its procedure is:

1. Watch two Boolean or arithmetic variables appearing in each clause or lemma. When a watcher is assigned, replace it with another unassigned variable if one exists; if only the other watcher remains unassigned, update the clause's feasible set. If both watchers are assigned, take no action (Section VI.B.1, pp. 8–9)
2. Use projection order exactly inverse to assignment order when all atoms are in root format (Section VI.B.2, p. 9)
3. Increase activities of Boolean and arithmetic variables involved in a conflict. Use the uniform heuristic to compare their activities on the same scale (Section VI.B.3, p. 9)
4. Select blocked variables, then fixed variables, then VSIDS variables (Algorithm 6, p. 8)
5. Run clause-level propagation, select a variable, resolve blocked cases, and process any learned lemma. In a path case, select a witness, choose compatible literals, assign the variable, and return SAT when all variables are assigned; an empty learned lemma yields UNSAT (Algorithm 7, p. 8)

The implementation records trails for finding paths, finding blocked stages, and updating clause feasible sets, so backtracking can restore state (Section VI.A, p. 8). It also returns UNSAT directly when blocked clauses involve only a single variable: there is no earlier variable assignment to revise (Section VI.C, p. 9).

## evidence and measured results

The evaluation uses all 12,134 SMT-LIB QF NRA instances, a 1,200-second limit per instance, and an Intel Xeon Platinum 8153 at 2.00 GHz (Section VII.A, p. 9). It compares Z3 4.13.1, CVC5 1.0.2, YICES2 2.6.2, original NLSAT, and clauseSMT (Section VII, pp. 9–10). Mainstream solvers retain their portfolios; the NLSAT baseline disables other tactics (Section VII.B, p. 9).

Table II (p. 10) reports solved totals: clauseSMT 11,005; NLSAT 10,732; Z3 10,948; CVC5 11,284; YICES2 10,984. Its SAT row reports respectively 5,608, 5,541, 5,569, 5,475, and 5,372. These are each solver's solved SAT counts, not denominators. clauseSMT has the highest SAT count. Its UNSAT count, 5,397, is below CVC5's 5,809 and YICES2's 5,612, but above Z3's 5,379 and NLSAT's 5,191. Inference: clauseSMT solves 273 more instances than NLSAT and 279 fewer than CVC5 overall; the evidence supports strongest SAT coverage among these configurations, not the best overall coverage.

For look-ahead alone, Table III (p. 10) compares static-order NLSAT variants: lower-degree literal selection solves 10,732, random selection 10,652, and look-ahead 10,778. Hycomp counts are 2,332, 2,272, and 2,388 respectively. Inference: look-ahead adds 56 Hycomp solutions over lower-degree selection and 116 over random selection. It does not win every category; LassoRanker counts are 394, 393, and 389.

Table IV (p. 11) compares static ordering, dynamic VSIDS, and propagation-based VSIDS, with totals of 10,778, 10,920, and 11,005. Inference: propagation adds 85 solved instances over VSIDS. Results vary by category: Hycomp improves from 2,426 to 2,472 and LassoRanker from 571 to 613, while meti-tarski falls from 6,974 to 6,960. Figure 7 compares semantic decision stages, and the authors report an overall reduction (Section VII.D, p. 11).

The paper states: “Our algorithm demonstrates competitive performance compared to state-of-the-art solvers such as Z3 and CVC5.” (Section VII.B, p. 9). It releases implementation, experimental data, and scripts at https://github.com/yogurt-shadow/ClauseSMT_ASE2025 (Section I.D and footnote 2, p. 2).

## techniques for the catalog

- feasible-set look-ahead — intersect feasible sets of clauses univariate in the same variable and choose one arithmetic witness shared by selected literals
- clause-level propagation — update arithmetic variable domains when clauses become univariate and classify empty, singleton, or other sets
- propagation-based branching — prioritize blocked and fixed variables before VSIDS
- watched-variable incremental updates — watch two variables per clause and eagerly update feasible sets when the clause becomes univariate
- projection-order discipline — use inverse assignment order when all atoms are in root format
