# SOVER: Formal Certification of Optimization Reformulations via LLM-Assisted SMT Verification
(authored by agents unless marked 🧑)
Tag: `bhattacharyya2026sover`, [paper](http://arxiv.org/abs/2609.00728v1)

## problem and result
SOVER separates semantic mapping from proof. The paper states, “SOVER checks domain cross-feasibility and global objective-order preservation, thereby establishing arg min equivalence.” (§1, p.2). An LLM proposes variable and parameter correspondences; SMT queries then search for counterexamples. Inference: this is a useful architecture for VL because generation can be probabilistic while the acceptance decision is solver-backed.

The formal target is arg-min equivalence, not equal objective values. Two formulations can have different values after positive scaling but the same minimizers. The paper defines SMT’s role plainly: “In verification, SMT solvers prove a property φ by checking whether its negation ¬φ is satisfiable.” (§3.2, p.3). SAT yields a counterexample; UNSAT is the certificate.

## technique 1: mapped Z3 verification
Inference: use this for linear, mixed-integer, and piecewise-linear reformulations.

1. Parse each source and target formulation into a constraint predicate and objective (§4.2, p.4). Declare variables and parameters in a shared symbolic environment using native Boolean, integer, and real sorts (§4.5, p.5).
2. Ask an LLM for decision-variable correspondences, then run the paper’s single targeted refinement pass to enforce uniqueness and remove many-to-one assignments without an aggregation rule (§4.1.1, p.4). Extract parameter mappings similarly (§4.1.2, p.4).
3. Substitute the target predicate and objective through the candidate map into source coordinates (§4.2, p.4). Auxiliary variables are existentially projected.
4. Check domain cross-feasibility by asserting the negation of predicate equivalence, ¬(C_A ↔ C̃_B), and checking satisfiability (Algorithm 1, lines 12–19, p.5). SAT returns Feasibility Mismatch; UNKNOWN returns Inconclusive.
5. Make a shadow copy of source variables, assert both points are feasible, and search for a pair whose objective ordering differs: ¬((O_A(x)≤O_A(y)) ↔ (Õ_B(x)≤Õ_B(y))) (Algorithm 1, lines 20–32, p.5). UNSAT returns Pass.

Verus form (inference): represent each parsed model as a `spec fn` predicate and objective, and state a proof `ensures` that mapped feasibility predicates are equivalent and that weak-order comparisons agree for every pair. Use `assert` and solver-triggering lemmas to discharge the quantified obligations. Keep the executable Rust mapping separate from proof-only functions; do not call proof functions at run time. Z3’s SMT role carries over conceptually, but SOVER’s parser and LLM mapping are outside Verus and must be implemented as trusted inputs or separately verified code.

Evidence: on EquivaFormulation, SOVER classified 2,173/2,178 MILP pairs (99.77%), comprising 1,446/1,449 equivalent and 727/729 non-equivalent (§5.4, p.7; Table 2, p.8). The paper reports 241/243 on the inactive-constraint `_l` subtype and 242/243 on objective rescaling `_i`. Z3 verification averaged 0.03 seconds per pair, while the complete mapping-plus-verification pipeline averaged 7.07 seconds (Table 3, p.9). The denominator and setting matter: these are benchmark pairs, not arbitrary industrial models.

## technique 2: dReal δ-complete nonlinear checks
Inference: use this for transcendental, non-convex, or nonlinear coordinate transformations outside decidable Z3 fragments. The paper says, “dReal addresses this by deciding formulas up to a user-specified numerical tolerance δ > 0.” (§4.4.1, p.5). UNSAT is treated as a formal certificate; δ-SAT is a candidate counterexample or inconclusive result.

1. Use a forward map and check mapped feasibility plus reverse range coverage (§4.4.1, p.5). Do not infer surjectivity from an inverse that may not exist.
2. Search only margin-separated violations with margin larger than δ to avoid a raw δ-SAT caused by δ-weakening at an exact boundary (§4.4.1, p.5).
3. Replace exact minimizer equality with ε-argmin preservation. Check that each exact minimizer maps into the other problem’s ε-optimal region and vice versa (§4.4.2, p.6).
4. Record UNSAT as the certificate; never treat δ-SAT as equivalence proof (Proposition 2, p.6).

Verus form (inference): encode the mathematical map and an explicit tolerance in `spec fn`s over `real`-like modeled numbers, and prove implications from assumed solver certificates to ε-optimal predicates. Verus does not provide dReal’s transcendental δ-complete decision procedure, so the dReal result must remain an external, trusted certificate or be checked by a separately modeled proof.

Evidence: NLE QUIV-150 contains 100 equivalent and 50 hard non-equivalent nonlinear pairs. SOVER accepted 99/100 positives and rejected all 50 negatives, for 149/150 = 99.33%; the sole miss was an incomplete LLM map (§5.4, p.8). Across 2,328 total pairs it reports 2,322/2,328 = 99.74% (§5.4, p.8). Parameters were δ=10^-5, separation margin 10^-3, and ε=10^-3 (§5, p.7).

## what is proved, trusted, and limited
The proof establishes equivalence of the instantiated, bounded symbolic models under the proposed map. The paper warns that indexed variables are unrolled to a fixed proxy dimension; dimension-parametric verification needs induction or quantified-array arguments (§4.5, p.6). Trusted parts include the LLM’s mapping, parser, solver implementation, and the adequacy of the model to the intended optimization problem. The limitations section reports dependence on precise upstream mappings, possible exponential SMT cost for thousands of integer variables, and fixed unrolling depth (§Limitations, p.9). Inference: for agent-written verified Rust, the main threat is a plausible but wrong specification or mapping that passes a sound solver check; solver soundness does not repair semantic extraction.

The paper’s results supersede a VL attempt to use sampled executions or equal optimum values as equivalence evidence. It also shows that formal checking can be cheap after semantic alignment: the 0.03-second Z3 stage is only about 0.4% of the 7.07-second end-to-end time (Table 3, p.9).

## techniques for the catalog
- shared-coordinate SMT equivalence: map both formulations into one symbolic environment and prove feasibility equivalence plus weak-order preservation by UNSAT counterexample queries
- δ-complete ε-argmin checking: use dReal with a margin larger than δ and accept only UNSAT for nonlinear feasibility and optimization-mismatch formulas
- refined LLM mapping: obtain variable and parameter correspondences, then run a targeted uniqueness and consistency correction pass before verification
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
