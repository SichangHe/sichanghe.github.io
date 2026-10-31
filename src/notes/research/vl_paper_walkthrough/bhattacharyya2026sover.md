# SOVER: Formal Certification of Optimization Reformulations via LLM-Assisted SMT Verification
(authored by agents unless marked 🧑)
Tag: `bhattacharyya2026sover`, [paper](http://arxiv.org/abs/2609.00728v1)

## problem and result
SOVER separates semantic mapping from proof. The paper states, “SOVER checks domain cross-feasibility and global objective-order preservation, thereby establishing arg min equivalence.” (§1, p.2). An LLM proposes variable and parameter correspondences; SMT queries then search for counterexamples.

The formal target is arg-min equivalence, not equal objective values. Two formulations can have different values after positive scaling but the same minimizers (§3.1, p.3). The paper defines SMT’s role plainly: “In verification, SMT solvers prove a property φ by checking whether its negation ¬φ is satisfiable.” (§3.2, p.3). SAT yields a counterexample to the queried property; UNSAT certifies that no such counterexample exists within the specified theory. Proposition 1 gives a sufficient condition: equal mapped feasible sets and identical weak objective order imply identical global minimizers in common coordinates (§4.3.1, p.4). Its conclusion for the original variable spaces additionally assumes a bijective coordinate transformation.

## technique 1: mapped Z3 verification
Inference: use this for linear, mixed-integer, and piecewise-linear reformulations.

1. Declare variables and parameters in a shared symbolic environment using native Boolean, integer, and real sorts, then parse each formulation into a constraint predicate and objective (Algorithm 1, lines 1–5, p.6). Inputs are programmatic gurobipy strings; indexed variables and matrix expressions are unrolled to a fixed proxy dimension (§4.5, p.6).
2. Ask an LLM for decision-variable correspondences, then run the paper’s single targeted refinement pass to enforce uniqueness and remove many-to-one assignments without an aggregation rule (§4.1.1, p.4). Extract parameter mappings similarly (§4.1.2, p.4).
3. Substitute the target predicate and objective through the candidate map into source coordinates (§4.2, p.4). Target auxiliary/slack variables that do not enter its objective are existentially projected.
4. Check domain cross-feasibility by asserting the negation of predicate equivalence, ¬(C_A ↔ C̃_B), and checking satisfiability (Algorithm 1, lines 12–19, p.6). SAT returns Feasibility Mismatch; UNKNOWN returns Inconclusive.
5. Make a shadow copy of source variables, assert both points are feasible in both mapped formulations, and search for a pair whose objective ordering differs: ¬((O_A(x)≤O_A(y)) ↔ (Õ_B(x)≤Õ_B(y))) (Algorithm 1, lines 20–32, p.6). SAT returns Ordering Mismatch; UNKNOWN returns Inconclusive; UNSAT returns Pass after feasibility has passed.

Inference: a possible Verus adaptation would represent the parsed models, mappings, and objectives in specifications, then prove mapped feasibility equivalence and weak-order agreement for every feasible pair. This proposal is not evaluated in the paper. It would require its own justification that the specifications represent the intended models.

Evidence: on EquivaFormulation, SOVER classified 2,173/2,178 MILP pairs (99.77%), comprising 1,446/1,449 equivalent and 727/729 non-equivalent (§5.4, p.7; Table 2, p.8). The paper reports 241/243 on the inactive-constraint `_l` subtype and 242/243 on objective rescaling `_i`. Z3 verification averaged 0.03 seconds per pair, while the complete mapping-plus-verification pipeline averaged 7.07 seconds (Table 3, p.9). The denominator and setting matter: these are benchmark pairs, not arbitrary industrial models.

## technique 2: dReal δ-complete nonlinear checks
Inference: use this for transcendental, non-convex, or nonlinear coordinate transformations outside decidable Z3 fragments. The paper says, “dReal addresses this by deciding formulas up to a user-specified numerical tolerance δ > 0.” (§4.4.1, p.5). UNSAT is treated as a formal certificate; δ-SAT is a candidate counterexample or inconclusive result.

1. Use a forward map and check mapped feasibility plus reverse range coverage (§4.4.1, p.5). An A-feasible point is a counterexample only if no B-feasible point maps sufficiently close to it. This check does not require a globally single-valued inverse to reject a bad map. Use quantified feasibility checks for auxiliary variables.
2. Search only margin-separated violations with margin larger than δ to avoid a raw δ-SAT caused by δ-weakening at an exact boundary (§4.4.1, p.5).
3. Replace exact minimizer equality with ε-argmin preservation. Check that each exact minimizer maps into the other problem’s ε-optimal region and vice versa (§4.4.2, p.6). Proposition 2 assumes attained global minima and a bijection between feasible sets; it requires UNSAT for both feasibility-mismatch queries and both margin-separated optimization-mismatch queries. The latter search for an exact minimizer whose mapped point can be improved by more than ε.
4. Record UNSAT as the certificate; never treat δ-SAT as equivalence proof (Proposition 2, p.6).

Inference: a possible Verus adaptation would specify the mathematical map, feasibility, and ε-optimality, then prove the containment argument under explicit assumptions about the mismatch queries. Trusting external dReal results would add an assumption; an independent certificate checker would need a separate correctness argument. The paper does not implement or evaluate either adaptation.

Evidence: NLE QUIV-150 contains 100 equivalent and 50 hard non-equivalent nonlinear pairs. SOVER accepted 99/100 positives and rejected all 50 negatives, for 149/150 = 99.33%; the sole miss was an incomplete LLM map (§5.4, p.8). Across 2,328 total pairs it reports 2,322/2,328 = 99.74% (§5.4, p.8). Parameters were δ=10^-5, separation margin 10^-3, and ε=10^-3 (§5, p.7).

## what is proved, trusted, and limited
The implementation certifies instantiated models. The paper states, “This certifies the resulting instantiated model; dimension-parametric verification would require an additional induction or quantified-array argument.” (§4.5, p.6). The limitations section reports dependence on precise upstream mappings, possible exponential SMT cost for thousands of integer variables and constraints, and fixed unrolling depth (Limitations, p.10). Appendix A.1 (p.12) specifies GPT-5.4-mini, temperature 0.0, top_p 1.0, both presence and frequency penalties 0.0, and a 10,000 ms timeout per Z3 instance.

Inference: the guarantee depends on faithful parsing, the encoded model’s correspondence to the intended optimization problem, and solver soundness. The LLM proposes the map; its proposal alone is not a certificate. Even a sound check of the instantiated symbolic models does not establish that an extracted specification captures the intended application.

The paper explicitly limits its speed claim: “We do not claim end-to-end speed superiority: SOVER averages 7.07 s per EquivaFormulation pair versus 2.60 s for EquivaMap.” (§5.4, p.8). Z3 accounts for about 0.4% of SOVER’s time; most remaining time is mapping/refinement. The additional FormulationBench evaluation reports 111/116 correct classifications (95.69%) across all 20 base problems, using the version dated 12 July 2026 (§5.4, p.8; Table 4, p.9).

## techniques for the catalog
- shared-coordinate SMT equivalence: map both formulations into one symbolic environment and prove feasibility equivalence plus weak-order preservation by UNSAT counterexample queries
- δ-complete ε-argmin checking: use dReal with a margin larger than δ and accept only UNSAT for nonlinear feasibility and optimization-mismatch formulas
- refined LLM mapping: obtain variable and parameter correspondences, then run a targeted uniqueness and consistency correction pass before verification
