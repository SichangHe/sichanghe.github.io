# Improving NLSAT for Nonlinear Real Arithmetic
(authored by agents unless marked 🧑)
Tag: `wang2024nlsat`, [paper](http://arxiv.org/abs/2406.02122v4)

## scope and contribution

Inference: Wang et al. modify NLSAT, an MCSAT solver for quantifier-free nonlinear real arithmetic (QF NRA), by using clause-level feasible sets before literal decisions and by propagating arithmetic information into a dynamic branching heuristic. The implementation is called clauseSMT and extends Z3's NLSAT module. The paper is a solver algorithm and benchmark study; it does not prove Verus programs directly.

The abstract states: “We propose two main algorithmic improvements: a clause-level feasible-set-based look-ahead mechanism and an arithmetic propagation-based branching heuristic.” (Abstract, p. 1). The paper's problem is that CDCL-style literal choices can ignore how clauses constrain real variables and cause avoidable conflicts (Sections I–III, pp. 1–4).

## technique: feasible sets and clause-level look-ahead

What it is: for a literal or a univariate clause with one unassigned arithmetic variable, compute the union of real intervals that satisfy it. Root isolation partitions the real line at polynomial roots; the satisfying intervals form the feasible set (Section II.B, p. 3). Clause-level feasible sets intersect the constraints from all clauses containing the variable.

When to use it: use this when NLSAT has several unevaluated literals and a variable's value can satisfy multiple clauses. The method targets conflicts caused by choosing a literal whose feasible interval is locally valid but incompatible with another clause.

How to do it (paper's algorithms):

1. Convert the QF NRA formula to CNF and maintain a partial Boolean/arithmetic assignment (Section II.A, p. 3)
2. For each univariate literal, compute its feasible interval set by root isolation; complement it for a negated literal (Section II.B, p. 3)
3. Intersect the feasible sets of all relevant clauses to obtain the clause-level set (Definition 2, Section IV, p. 5)
4. Select a pre-appointed value from the current clause-level set (Algorithm 3, Section IV.A, p. 5)
5. Process each clause; choose a literal whose feasible set contains that value, unit-propagate when one literal remains undefined, and record the path literals (Algorithm 3, p. 5)
6. If the intersection is empty, retain the original NLSAT conflict path and invoke CAD conflict analysis; otherwise assign the selected value and continue (Algorithms 3–4, Section IV, pp. 5–6)

The paper says: “The updated algorithm introduces the additional condition that the feasible-set of the current literal must contain the pre-appointed value.” (Section IV.A, p. 5). This condition makes every selected literal compatible with the same arithmetic witness when a path exists.

Inference: in Verus, the direct analogue is a proof-search heuristic for nonlinear arithmetic obligations sent to Z3, not a Rust-language construct. A Verus proof can expose a real-valued predicate and invoke lemmas that narrow a variable's allowed interval; however, Verus does not expose NLSAT's interval trail or root-isolation API as a source-level feature. The technique could guide an external solver or a tactic generator that emits Verus lemmas.

Evidence and limits: the paper reports no soundness bug in look-ahead; its completeness remains inherited from NLSAT/CAD. It notes that intersected-interval sampling can produce more conflicts on some instances because it chooses different arithmetic values than the baseline (Section VII.C, p. 10). Inference: look-ahead is a heuristic with a possible search-path cost, not a monotonic improvement on every formula.

## technique: clause-level arithmetic propagation

What it is: whenever a clause becomes univariate in an arithmetic variable, intersect its feasible set with the variable's current set. Classify the result as blocked (empty), fixed (one real value), or other (narrowed but not fixed) (Section V.A, p. 6).

When to use it: use it after Boolean or arithmetic assignments make clauses univariate. It detects arithmetic conflicts before a full semantic decision and provides information for variable ordering.

How to do it:

1. Maintain a feasible-set for each arithmetic variable (Algorithm 5, Section V.A, p. 6)
2. For every univariate clause, compute its clause feasible set and intersect it with the variable set (Algorithm 5, p. 6)
3. Put empty results in `blocked_vars`, singleton results in `fixed_vars`, and all other narrowed sets in the normal pool (Algorithm 5, p. 6)
4. Recompute incrementally whenever a watched-variable update makes a clause univariate (Section VI.B.1, p. 7)
5. Branch on blocked variables first, fixed variables second, and otherwise use VSIDS (Algorithm 6, Section V.B, p. 6)

The paper defines the method as follows: “clause-level propagation on x is the computation of the feasible-set of the clause c, which serves to narrow the feasible-set of the variable x.” (Definition 4, Section V, p. 6).

Inference: for Verus, this suggests prioritizing proof lemmas whose predicates make a nonlinear obligation singleton or contradictory, then letting Z3 solve the remaining branch. It would be implemented in a tactic or proof-generation layer; no `proof fn` should be called as runtime code, and no unsupported Verus syntax should be invented.

## technique: propagation-based branching and dynamic ordering

What it is: combine the blocked/fixed status from clause propagation with VSIDS-style activity scores. A conflict increments activity for involved Boolean and arithmetic variables; watched variables detect newly univariate clauses; projection order is chosen as the inverse of assignment order for root atoms (Section VI.B, pp. 7–8).

How to do it:

1. Watch two variables per clause or lemma; replace an assigned watcher with an unassigned variable, and eagerly update feasible sets when only one remains (Section VI.B.1, p. 7)
2. Keep the projection order inverse to assignment order when all atoms are in root form (Section VI.B.2, p. 7)
3. Increase activity of variables in each conflict using uniform Boolean/arithmetic scales (Section VI.B.3, p. 7)
4. Select blocked, then fixed, then VSIDS variables (Algorithm 6, p. 6)
5. Run clause-level propagation, branch, resolve empty feasible sets with CAD, process learned lemmas, and stop with SAT when all variables are assigned (Algorithm 7, Section VI, p. 7)

Inference: a Verus integration could rank pending proof obligations by contradiction risk or solver activity, but this requires a custom driver around Verus. The method's solver-state trails and CAD root atoms do not carry over to ordinary Rust verification.

## evidence and measured results

The evaluation uses all 12,134 SMT-LIB QF NRA instances, a 1,200-second limit per instance, and an Intel Xeon Platinum 8153 at 2.00 GHz (Section VII.A, p. 8). The paper compares Z3 4.13.1, CVC5 1.0.2, YICES2 2.6.2, original NLSAT, and clauseSMT. Table II reports totals over the 12,134-instance denominator: clauseSMT solves 11,005, NLSAT 10,732, Z3 10,948, CVC5 11,284, and YICES2 10,984 (Table II, p. 9). Thus clauseSMT is below CVC5 overall but above Z3, YICES2, and NLSAT. For satisfiable instances, the table totals are clauseSMT 5,608 of 5,569? The extracted table's total row lists SAT counts as Z3 5,569, YICES2 5,372, CVC5 5,475, NLSAT 5,541, clauseSMT 5,608; this exceeds the 12,134 total only when combined with the UNSAT row, so the SAT denominator is not separately stated and the apparent ordering should be checked against the released artifact. Inference: the table extraction is internally suspicious; a catalog should preserve the printed counts rather than derive percentages.

For ablation, Table III compares 12,134 instances: lower-degree 10,732, random 10,652, look-ahead 10,778 solved (Section VII.C, p. 10). Look-ahead solves about 50 more Hycomp cases than either alternative; the paper attributes this to many nonlinear equalities and literal-path cases. Table IV compares static, VSIDS, and propagation-VSIDS: totals are 10,778, 10,920, and 11,005 solved respectively (Section VII.D, p. 10). Inference: the gain from propagation-VSIDS over static is 227/12,134 (1.87 percentage points), while the paper itself reports counts rather than percentages.

The paper states: “Our algorithm demonstrates competitive performance compared to state-of-the-art solvers such as Z3 and CVC5.” (Section VII.B, p. 8). It releases source, data, and scripts, which supports reproduction (Section I.D, p. 2). Trusted components include Z3's root isolation, polynomial operations, algebraic-number representation, and CAD conflict explanation; the paper says all satisfiable instances were validated (Section VII.E, p. 11). Inference: the benchmarks establish performance on SMT-LIB QF NRA under this machine and timeout, not correctness of Verus's translation or universal solver superiority.

## what remains trusted and threat to VL

The arithmetic decision procedure, CAD explanation, root isolation, implementation, benchmark labels, and timeout handling remain trusted or externally assumed. The paper's threat section identifies implementation correctness and internal randomness; randomness is preserved across compared solvers (Section VII.E, p. 11). Inference: for agent-written verified Rust, this is a low direct product threat and a moderate tooling opportunity. VL can benefit from solver-aware obligation ordering, but changing Verus's solver internals would require a separate correctness argument. Existing VL work should not redo generic interval propagation; it should measure whether generated Verus proofs become faster or more stable when nonlinear obligations are grouped and prioritized by feasible-set information.

## techniques for the catalog

- feasible-set look-ahead — intersect clause feasible intervals and choose one pre-appointed arithmetic value shared by selected literals
- clause-level propagation — update arithmetic variable domains when clauses become univariate and classify blocked, fixed, or narrowed states
- propagation-based branching — prioritize blocked and fixed variables before VSIDS for normal variables
- watched-variable incremental updates — watch two variables per clause and eagerly recompute feasible sets when a clause becomes univariate
- projection-order discipline — use inverse assignment order for root atoms generated by CAD projection
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
