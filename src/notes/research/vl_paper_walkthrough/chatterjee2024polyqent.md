# PolyQEnt: A Polynomial Quantified Entailment Solver
(authored by agents unless marked 🧑)
Tag: `chatterjee2024polyqent`, [paper](http://arxiv.org/abs/2408.03796v3)

## problem and contract

PolyQEnt solves systems of polynomial quantified entailments (PQEs) used to synthesize ranking functions, invariants, reachability certificates, cost bounds, nontermination certificates, and program-synthesis expressions. A system has existential template coefficients `t` followed by universally quantified program variables `x`: `∃t. ∧ᵢ ∀x. Φᵢ(x,t) ⇒ Ψᵢ(x,t)`. A satisfying valuation of `t` instantiates a certificate template. The paper states: “Our tool provides a unified framework for polynomial quantified entailment problems that arise in several papers in the literature.” (Abstract, p. 1)

The implementation supports real arithmetic and unbounded mathematical integers. It accepts SMT-LIB PQEs and an optional JSON configuration, translates each formula to canonical form, applies a positivity theorem to eliminate universal quantifiers, and sends the resulting existential polynomial constraints to an SMT solver. The output is SAT with a valuation, UNSAT, or Unknown (Section 2.2, p. 4).

## technique 1: canonicalize arbitrary Boolean PQEs

Inference: use this preprocessing whenever antecedents or consequents contain arbitrary Boolean combinations. Convert each entailment to an equisatisfiable form whose antecedent is a conjunction of polynomial inequalities and whose consequent is one polynomial inequality. Preserve the same free template variables and universally quantified variables. Proposition 1 guarantees this transformation; the paper says: “Each PQE can be translated into an equisatisfiable PQE in the canonical form, defined over the same sets of quantified variables.” (Section 2.1, p. 4)

Inference: then parse the canonical system and select a backend theorem per PQE. The default ordering is Farkas' lemma, then Handelman's theorem, then Putinar's theorem, subject to soundness and relative-completeness conditions. A JSON file can override theorem choice, degree limits, solver, and heuristics (Sections 2.2–2.3, pp. 4–7).

Verus form (Inference): represent a template polynomial as a `spec fn` over coefficient and program-value sequences. Canonicalization can be a separate verified transformation whose postcondition states equivalence of the two formulas. Verus cannot execute quantifier elimination; the generated constraints would be passed to an external solver, so the translation and solver result remain a trusted boundary unless certificates are checked inside Verus.

## technique 2: positivity-theorem quantifier elimination

Inference: for a canonical implication `∀x. f₁(x) ▷◁ 0 ∧ … ∧ fₘ(x) ▷◁ 0 ⇒ g(x) ▷◁ 0`, choose a theorem according to polynomial degree and domain assumptions. Farkas' lemma gives sound and complete translation when all expressions are linear. Handelman gives sound translation when antecedent expressions are linear and the consequent is polynomial; completeness additionally needs non-strict antecedents, a strict consequent, and a bounded feasible polytope. Putinar handles polynomial antecedents and consequents with analogous boundedness and strictness conditions (Section 2.3, pp. 5–6). Each translation introduces auxiliary coefficients and yields a purely existential polynomial system.

Inference: for unbounded integer variables, strict inequalities are converted to non-strict inequalities by incrementing a side by one. The resulting translations remain sound but can be incomplete (Section 2.3, p. 6). Use Farkas for linear ranking templates, Putinar for polynomial templates, and Handelman for the paper's quadratic ranking-supermartingale benchmark. The paper's termination extraction does exactly this: it runs Farkas on linear templates and Putinar on quadratic templates (Section 3.1, p. 8).

Verus form (Inference): encode the generated polynomial constraints as `spec fn` predicates and prove candidate coefficients satisfy them with proof functions and `assert` steps. Verus's `requires`/`ensures` contracts can state that a ranking function decreases, but they do not implement Farkas, Handelman, or Putinar. Their Positivstellensatz assumptions (boundedness, strictness, and domain) must be stated and proved separately.

## technique 3: Assume-SAT heuristic

Inference: positivity translations normally cover two reasons an implication is valid: the antecedent is satisfiable and implies the consequent, or the antecedent is unsatisfiable. Assume-SAT retains only the first case. It produces a smaller existential system, so it is sound for returned SAT solutions but incomplete because an unsatisfiable antecedent also makes the original PQE valid (Section 2.3, p. 7). Use it when reducing generated polynomial variables matters more than completeness; report Unknown or retry without the heuristic when it fails.

## technique 4: UNSAT-core heuristic

Inference: positivity translations add many existential coefficients. Initially constrain selected fresh coefficients to zero and solve. If SAT, the original system is SAT. If UNSAT, inspect the solver's unsat core. If the core contains no added zero constraints, the original system is UNSAT; otherwise remove the zero constraints appearing in the core and repeat. This progressively expands the search while avoiding a full unconstrained solve (Section 2.3, pp. 7–8). The heuristic is sound because every added zero constraint only strengthens the query; the paper evaluates it empirically rather than claiming completeness beyond the underlying solver.

## evidence from three benchmark families

Experiments ran on Debian 11 with AMD EPYC 9654 at 2.40 GHz, 6 GB RAM, and a 180-second timeout, comparing MathSAT 5 and Z3 inside PolyQEnt with direct Z3 4.13.4 and CVC5 1.2.0 (Section 3, p. 7). The TermComp'23 C-Integer set contains 335 non-recursive C programs, with initial variables in [-1024, 1023] (Section 3.1, p. 8). Table 1 reports solved-instance counts, not percentages: for termination, PolyQEnt Base solves 44/335 with MathSAT, 154/335 with Z3, and their union 154/335; Base+H1+H2 solves 125/335, 132/335, and 145/335 respectively. Direct Z3 solves 103/335 and direct CVC5 9/335. For nontermination, Base solves 72/103, 76/103, and 78/103; Base+H1+H2 solves 81/103, 82/103, and 89/103; direct Z3 solves 39/103 and CVC5 9/103 (Table 1, p. 9). The paper reports H1 and H2 speed-ups on 220 and 32 benchmarks respectively, relative to no heuristic (Section 3.1, p. 8).

The almost-sure termination set has 10 benchmarks from one source and 7 from another (17 total). Direct Z3 and CVC5 solve 0/17; PolyQEnt solves 13/17 in its reported best union, using quadratic ranking-supermartingale templates and Handelman (Section 3.2, pp. 9–10; Table 2). The synthesis set has 32 PolySynth benchmarks. Direct Z3 solves 24/32 and CVC5 0/32; PolyQEnt's Table 3 union solves 30/32 (Section 3.3, pp. 10–11). Two benchmarks require Putinar degree 2 even though direct Z3 succeeds; therefore theorem choice is not uniformly dominant.

## trusted parts, limits, and VL threat

The trusted base includes the canonicalization, positivity-theorem translations, polynomial SMT solver, solver soundness, and assumptions needed for relative completeness. The paper reports that “our experimental results show significant improvements in runtime when positivity theorems are used to eliminate quantifier alternation.” (Section 1, p. 3) This is an empirical claim for the listed machines, versions, timeout, and denominators. Integer translations are explicitly incomplete; Assume-SAT is incomplete; solver Unknown remains possible; and theorem completeness requires boundedness/strictness conditions. Inference: for VL, PolyQEnt is a backend pattern for synthesizing arithmetic invariants and ranking functions that Verus can consume as lemmas or contracts. It threatens manual proof effort more than runtime safety: generated coefficients still need a checked Verus proof, and nonlinear arithmetic or quantifier elimination outside Verus remains trusted. VL should reuse positivity-based certificate generation but should not treat a SAT result from PolyQEnt as a Verus proof without replaying the certificate.

## techniques for the catalog

- PQE canonicalization: translate arbitrary Boolean polynomial entailments into equisatisfiable conjunction-to-single-inequality form
- positivity elimination: use Farkas, Handelman, or Putinar translations to remove universal quantifiers under stated assumptions
- Assume-SAT: keep only satisfiable-antecedent obligations for smaller but incomplete systems
- UNSAT-core search: constrain fresh coefficients to zero and relax only constraints implicated by unsat cores
Checked 2026-10-15 against paper chatterjee2024polyqent: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
