# PolyQEnt: A Polynomial Quantified Entailment Solver
(authored by agents unless marked 🧑)
Tag: `chatterjee2024polyqent`, [paper](http://arxiv.org/abs/2408.03796v3)

## problem and contract

PolyQEnt solves systems of polynomial quantified entailments (PQEs) used to synthesize ranking functions, invariants, reachability certificates, cost bounds, nontermination certificates, and program-synthesis expressions. A system has existential template coefficients `t` followed by universally quantified program variables `x`: `∃t. ∧ᵢ ∀x. Φᵢ(x,t) ⇒ Ψᵢ(x,t)`. A satisfying valuation of `t` instantiates a certificate template. The paper states: “Our tool provides a unified framework for polynomial quantified entailment problems that arise in several papers in the literature.” (Abstract, p. 1)

The implementation supports real arithmetic and unbounded mathematical integers. It accepts SMT-LIB PQEs and an optional JSON configuration, translates each formula to canonical form, applies a positivity theorem to eliminate universal quantifiers, and sends the resulting existential polynomial constraints to an SMT solver. The output is SAT with a valuation, UNSAT, or Unknown (Section 2.2, pp. 4–5). Inference: because the translations can be incomplete, UNSAT of the generated constraints alone need not establish unsatisfiability of the input PQEs.

## technique 1: canonicalize arbitrary Boolean PQEs

Inference: use this preprocessing whenever antecedents or consequents contain arbitrary Boolean combinations. Convert each entailment to an equisatisfiable form whose antecedent is a conjunction of polynomial inequalities and whose consequent is one polynomial inequality. Preserve the same free template variables and universally quantified variables. Proposition 1 guarantees this transformation; the paper says: “Each PQE can be translated into an equisatisfiable PQE in the canonical form, defined over the same sets of quantified variables.” (Section 2.1, p. 4)

PolyQEnt parses the input before canonicalization, then selects a backend theorem per PQE. The default ordering is Farkas' lemma, then Handelman's theorem, then Putinar's theorem, subject to soundness and relative-completeness conditions. A JSON file can override theorem choice, degree limits, solver, and heuristics (Sections 2.2–2.3, pp. 4–7).

Inference: a possible Verus integration would represent template polynomials as specification functions, verify canonicalization, and check externally generated coefficients against the original obligations. The paper does not implement or evaluate this integration.

## technique 2: positivity-theorem quantifier elimination

Inference: for a canonical implication `∀x. f₁(x) ▷◁ 0 ∧ … ∧ fₘ(x) ▷◁ 0 ⇒ g(x) ▷◁ 0`, choose a theorem according to polynomial degree and domain assumptions. Farkas' lemma gives sound and complete translation when all expressions are linear. Handelman gives sound translation when antecedent expressions are linear and the consequent is polynomial; completeness additionally needs non-strict antecedents, a strict consequent, and a bounded feasible polytope. Putinar handles polynomial antecedents and consequents. Appendix D states its relative-completeness conditions more strongly than the overview: at least one antecedent inequality must have a compact satisfiability set, all antecedent inequalities must be non-strict, and the consequent must be strict (Section 2.3, pp. 5–6; Appendix D, pp. 18–19). Each translation introduces auxiliary coefficients and yields a purely existential polynomial system. Handelman and Putinar use configurable degree bounds; their relative-completeness statements do not guarantee completeness at any fixed bound (Appendix D, pp. 18–20).

Inference: for unbounded integer variables, strict inequalities are converted to non-strict inequalities by incrementing a side by one. The resulting translations remain sound but can be incomplete (Section 2.3, p. 6). Use Farkas for linear ranking templates, Putinar for polynomial templates, and Handelman for the paper's quadratic ranking-supermartingale benchmark. The paper's termination extraction does exactly this: it runs Farkas on linear templates and Putinar on quadratic templates (Section 3.1, p. 8).

Inference: a Verus integration could check polynomial identities and coefficient conditions, then use a proved soundness theorem to establish the original obligations. Completeness assumptions concern whether a certificate can be found; they are separate from the conditions needed to validate a particular certificate.

## technique 3: Assume-SAT heuristic

Inference: positivity translations normally cover two reasons an implication is valid: the antecedent is satisfiable and implies the consequent, or the antecedent is unsatisfiable. Assume-SAT retains only the first case. It produces a smaller existential system, so it is sound for returned SAT solutions but incomplete because an unsatisfiable antecedent also makes the original PQE valid (Section 2.3, p. 7). Appendix C states that Assume-SAT is enabled by default (p. 16); Appendix D specifies that it omits Farkas cases F2/F3 or polynomial unsatisfiability cases U1/U2 (p. 20). Inference: retry without the heuristic before interpreting failure as evidence against the input PQEs.

## technique 4: UNSAT-core heuristic

Inference: positivity translations add many existential coefficients. Initially constrain selected fresh coefficients to zero and solve. If SAT, the original system is SAT. If UNSAT, inspect the solver's unsat core. If the core contains no added zero constraints, the generated system without those constraints is UNSAT; otherwise remove the zero constraints appearing in the core and repeat (Section 2.3, p. 7). Inference: this progressively relaxes the search, but may eventually require solving the full generated system. UNSAT transfers back to the input PQEs only when the underlying translation is complete.

## evidence from three benchmark families

Experiments ran on Debian 11 with AMD EPYC 9654 at 2.40 GHz, 6 GB RAM, and a 180-second timeout, comparing MathSAT 5 and Z3 inside PolyQEnt with direct Z3 4.13.4 and CVC5 1.2.0 (Section 3, p. 7). The TermComp'23 C-Integer set contains 335 non-recursive C programs, with initial variables in [-1024, 1023] (Section 3.1, p. 8). Table 1 reports solved-instance counts, not percentages: for termination, PolyQEnt Base solves 44 with MathSAT, 154 with Z3, and their union 154; Base+H1+H2 solves 125, 132, and 145 respectively. Direct Z3 solves 103 and direct CVC5 9. For nontermination, Base solves 72, 76, and 78; Base+H1+H2 solves 81, 82, and 89; direct Z3 solves 39 and CVC5 9 (Table 1, p. 9). The paper reports H1 and H2 speed-ups on 220 and 32 benchmarks respectively, relative to no heuristic (Section 3.1, p. 8).

The almost-sure termination set has 10 benchmarks from one source and 7 from another (17 total). Direct Z3 and CVC5 solve 0/17; PolyQEnt solves 13/17 in its reported best union, using quadratic ranking-supermartingale templates and Handelman (Section 3.2, pp. 9–10; Table 2). The synthesis set has 32 PolySynth benchmarks. Direct Z3 solves 24/32 and CVC5 0/32; PolyQEnt's Table 3 Base and Base+H2 unions solve 30/32, while Base+H1 and Base+H1+H2 solve 29/32 (Section 3.3, p. 10). The table also combines theorem choices, taking the faster successful run. For two benchmarks, direct Z3 succeeds and PolyQEnt succeeds with Putinar degree 2 but fails with Farkas and Handelman.

## trusted parts, limits, and VL threat

Inference: accepting a generated solution without independent checking trusts the canonicalization, positivity-theorem implementation, and SMT solver. Completeness assumptions instead limit which valid entailments the search can discover. The paper reports that “our experimental results show significant improvements in runtime when positivity theorems are used to eliminate quantifier alternation.” (Section 1, p. 3) This is an empirical claim for the reported machine, solver versions, timeout, and benchmark sets. Integer translations are explicitly incomplete; Assume-SAT is incomplete; solver Unknown remains possible; and relative completeness has the theorem-specific assumptions and degree-bound limitations described above. Inference: for VL, PolyQEnt suggests a way to generate arithmetic invariants and ranking functions for subsequent proof checking. A SAT result alone is not a checked Verus proof; the proposed integration would need to validate the original obligations or a sufficient certificate. The paper provides no Verus or VL evaluation.

## techniques for the catalog

- PQE canonicalization: translate arbitrary Boolean polynomial entailments into equisatisfiable conjunction-to-single-inequality form
- positivity elimination: use Farkas, Handelman, or Putinar translations to remove universal quantifiers under stated assumptions
- Assume-SAT: keep only satisfiable-antecedent obligations for smaller but incomplete systems
- UNSAT-core search: constrain fresh coefficients to zero and relax only constraints implicated by unsat cores
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "For each benchmark, we ran PolyQEnt using Farkas lemma as well as Handelman’s and Putinar’s theorem with polynomial degree 2 templates."): checked all paper text, quotations, numerical results, references, and technique steps; corrected page references, parsing order, Putinar assumptions, degree-bound and UNSAT limitations, heuristic claims, and synthesis counts; marked proposed Verus/VL applications as inferences; did not run PolyQEnt, reproduce experiments, verify cited papers, or validate a Verus integration.
