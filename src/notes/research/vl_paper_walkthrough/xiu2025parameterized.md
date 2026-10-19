# Formal Verification of Parameterized Systems based on Induction
(authored by agents unless marked 🧑)
Tag: `xiu2025parameterized`, [paper](http://arxiv.org/abs/2503.18030v1)

## scope and result

Jiaqi Xiu and Yongjian Li present wiseParaverifier for inductive verification of parameterized cache-coherence and distributed protocols. They state: “The verification process consists of two stages: analyzing and constructing specific auxiliary invariants (invFinder), and generalizing and proving parameterized inductive invariants (Verifier).” (Section III, PDF p.2.) The first stage searches small concrete instances; the second generalizes the resulting invariants and uses Ivy for automatic inductive verification (Section III-C, PDF pp.4–5). The link identifies the arXiv version named on PDF p.1: `arXiv:2503.18030v1 [cs.LO] 23 Mar 2025`.

The first stage chooses a minimum concretization using three conditions: start with the invariant's parameters; cover the same or symmetric transition behaviors under arbitrary parameters; select the smallest size satisfying those conditions (Section III-A.1, PDF p.2). With invariant parameter count m=2 and rule parameter count k=1, the invariant uses [1,2], the rule uses [1], [2], or [3], and n=3. With m=2 and k=2, the listed rule instances are [1,2], [1,3], [2,1], [2,3], [3,1], [3,2], and [3,4], giving n=4; symmetric or redundant combinations are omitted (PDF p.3).

## technique: counterexample formulas and candidate invariants

For a rule R and invariant F, Equation (1) defines `indOblg(R,F) ≡ guard(R) ∧ asgn2Form(act(R′)) ∧ assumptions(R,F) ∧ ¬F′` (Section III-A.2, PDF p.3). The terms describe the rule guard, its assignments in the next state, equality of unchanged invariant variables across states, and violation of F in the next state. The method filters obligations for rules that do not modify variables in F, then creates a Z3 solver for each remaining formula.

The procedure is: enumerate the minimum concretizations; construct the formula; solve it; discard an unsatisfiable rule/invariant pair; otherwise use the first returned solution, consisting of variable-value equations, to construct a candidate invariant by negating their conjunction in the pre-state. The authors state: “If solvable, indOblg(R, F ) has solutions consisting of variable value equations eq. In this case, (R, F ) forms a CTI.” (Section III-A.2, PDF p.3.) CTI means counterexample to induction.

Equation (2) writes `Ω_N = ¬ ⋀_k f_k` and prints `f_k = eq_i ∨ ¬eq_i` (PDF p.3). Inference: the latter expression is a tautology if read literally; it should not be treated as an unambiguous executable definition of candidate literals. The procedure above follows the accompanying prose about negating a conjunction of solution equations.

The server encapsulates Murphi, NuSMV, and NuSMV-BMC services (Section III-A, PDF p.2). Inference: checking a concrete candidate does not by itself prove the parameterized theorem; generalization and the later inductive proof remain necessary.

Inference: a possible Verus adaptation would represent protocol states and candidate invariants with specification predicates, then prove initialization and preservation over every modeled transition. An external solver could supply candidate clauses. The paper does not implement or evaluate a Verus backend, and a successful concrete model check would not substitute for those proofs.

## technique: heuristic Generalize

The authors motivate the heuristic with: “Empirical analysis indicates that new auxiliary invariants often relate to the ¬F ′ terms in indOblg.” (Section III-A.3, PDF p.4.) They form `eq1` from a known or previously derived invariant and `eq2` from the counterexample solution. Their common equation terms form `join`; terms unique to the solution form `diff`.

The search tests `join ∪ subset` for subsets of `diff` in increasing size. After the external model checker accepts a candidate, `simplifyAuxInv` removes remaining irrelevant terms. Algorithm 1 describes decreasing search from the largest candidate and increasing search from the smallest candidate, with conversion to SMV and calls to NuSMV (PDF p.4). Algorithm 2 adds the accepted invariant's constraints to Z3 after an `isLegal` check; when the heuristic has no usable `join` or finds no auxiliary invariant, it invokes regular Generalize (PDF p.5). The paper's four stages are heuristic search, final simplification, adding solver constraints, and a non-heuristic fallback (PDF p.4).

Inference: these are the intended search steps described in the prose. Algorithm 1 is not complete implementation guidance: its decreasing branch tests `simplifyAuxInvdecreasingly[0]` without displaying recursive arguments, while its increasing branch converts `solution` rather than the enumerated `subS`. The study therefore does not claim that the printed pseudocode can be executed literally.

Table II compares four algorithm/strategy combinations on 17 protocols (Section IV-B, PDF p.8). Heuristic Generalize with decreasing simplification is the only configuration completing all 17 within the reported limit. The simple configurations do not finish FlashNodata or Flash; heuristic increasing does not finish Flash. The table defines `/` as: “The verification runtime has exceeded 24 hours, and the search for new counterexamples has not ceased.” The surrounding text equates this with 86,400 seconds. The authors report shortest times and fewest NuSMV calls for heuristic decreasing on 15 of 17 protocols; ties occur. For the two exceptions, Lock server and Ricart-Agrawala, its times are 0.25 and 0.54 seconds, versus minima of 0.24 and 0.43 seconds. These are Table II measurements, not a universal performance guarantee.

Inference: for Verus, an external search could emit candidate specification predicates and ask Verus to prove initialization and preservation. The paper's NuSMV checks and solver assertions would need a defined correspondence to those proof obligations; merely retaining a short candidate would not establish correctness.

## technique: type saturation for mixed quantifiers

Define `C(t)=n_t` as the concrete size of parameter type t and `#(Ω,t)` as the number of constant concretizations of t appearing in clause Ω. Type saturation is `γ(t)=#(Ω,t)/C(t)` (Equation (3), Section III-C, PDF p.5). The paper gives two levels of tests whose outcomes must be distinguished:

1. If γ(t)≠1, use Forall. If γ(t)=1, recheck the original clause Ω on P(N+1). If it still holds, use Forall. If it fails, analyze smaller groups of the type's concretizations, since some groups may require Forall and others Exists (PDF p.5).
2. For each group g, construct an extension by supplementing its possible concretizations at N+1 (Equations (4)–(5)). Equation (6) places the entire conjunction under negation: `Ω′ = ¬((⋀_k f_k) ∧ (⋀_i g_i))`. Equation (7) presents an existentially quantified form `∃i : t_1,...,t_(N_t+1). ¬((⋀_k f_k) ∧ g_i)` (PDF p.5).
3. For this extended Ω′, the paper assigns Forall when `P(N+1) ⊭ Ω′`, and Exists when `P(N+1) ⊨ Ω′`. Multiple groups satisfying the latter condition are connected by disjunction after parameterization (PDF pp.5–6).

These are the paper's stated classifications. Inference: reversing the last test to say that a valid extended Ω′ implies Forall would change the method. The original-clause test and extended-group test have different stated outcomes; finite-instance tests alone are not a substitute for the final parameterized inductive proof.

Inference: a possible Verus representation uses `forall` and `exists` in a specification predicate, with index bounds matching the protocol model. The classifier remains an external synthesis step. Verus would need to prove the resulting quantified invariant's initialization and preservation; the paper supplies no evidence about trigger selection or Verus solver performance.

## technique: merging, symmetry reduction, and solver acceleration

Merging first requires matching universally quantified variable types and equation terms, and matching existentially quantified variable types (Section III-C, PDF p.6). The three cases are: retain one representative of equivalent parameterized invariants; retain φ_k when it implies the conjunction of the others (Equation (8)); or replace the conjunction by a strictly stronger ϕ with `ϕ ⇒ ⋀_i φ_i` and `⋀_i φ_i ⇏ ϕ` (Equation (9)). Inference: the implication condition for strengthening alone does not prove that the stronger formula is an invariant; that still requires verification.

Algorithm 3 distinguishes pure Forall types, pure Exists types, and hybrid types when generating symmetric invariants. The prose allows free permutations for pure Forall types and restricts permutations for existential types. The algorithm separates existential and universal portions and conjoins transformed formulas with the preceding formulas. Algorithm 4 adds the original invariant and its symmetric counterparts as Z3 assertions to block repeated generation of equivalent or symmetric invariants (PDF p.6). The authors explicitly connect this to lines 6 and 25 of Algorithm 2.

Inference: a Verus adaptation could prove implication and symmetry lemmas over the modeled transition system. Generated permutations would need proofs that they preserve the relevant formulas and transitions. The paper's solver acceleration procedure is not itself a Rust or Verus verification technique.

## what is proved, measured, and trusted

Table I reports completion for all 17 protocols: 7 cache-coherence and 10 distributed protocols, including 4 distributed protocols requiring hybrid quantifiers. Experiments used an 18-core Intel Gold 6254 CPU at 3.10GHz (Section IV, PDF p.7). For Flash, wiseParaverifier reports 585.68 seconds and 135 final parameterized invariants; Paraverifier reports 589.23 seconds and 162 invariants; DuoAI and IC3PO are marked `fail`. Table I distinguishes compilation `error` from inability to complete verification, `fail`. Its Two phase commit row reports Paraverifier success, despite the nearby prose saying Paraverifier failed on all distributed protocols. The table should be used when describing that row.

The paper does not report repeated-run statistics or confidence intervals. Inference: the results support empirical capability on these models, not a correctness or performance guarantee for arbitrary protocols. Using the results requires trust in the protocol models and verification tools; the concrete search and parameterization must ultimately support the claimed inductive proof.

## techniques for the catalog

- counterexample obligation construction — encode guards, assignments, unchanged variables, and a negated post-invariant; negate solution equations into candidate clauses
- heuristic Generalize — intersect prior and solution equation terms, enumerate differences, simplify, check legality, and fall back to regular search when needed
- type-saturation quantifier inference — distinguish the original-clause N+1 test from the extended-group test, then combine existential groups by disjunction
- invariant merging and symmetry reduction — merge equivalent, implied, or strengthened clauses and add symmetric assertions to prevent repeated search
