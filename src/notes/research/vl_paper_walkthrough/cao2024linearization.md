# Towards Automatic Linearization via SMT Solving
(authored by agents unless marked 🧑)
Tag: `cao2024linearization`, [paper](https://arxiv.org/abs/2408.13487)

## scope and claims

Jian Cao, Liyong Lin, and Lele Li study verification and synthesis of linearizations of nonlinear optimization models (arXiv:2408.13487v1, 2024, PDF p. 1). The abstract states, “We show that the synthesis of reductions can be formulated as an ∃∗ ∀∗ synthesis problem, which can be solved by an SMT solver via the counter-example guided inductive synthesis approach (CEGIS).” (PDF p. 1). Section 1 narrows the work to verification and exact synthesis with bounded source variables and restricted numbers of auxiliary variables and linear inequalities (PDF p. 2).

The paper distinguishes model fidelity to user intent, equivalence after transformation, and solver correctness. It focuses on equivalence: “This work’s main focus is to address b).” (section 1, PDF p. 1). Its conclusion states, “As a work-in-progress, there is an obvious weakness of our approach, that is, the scalability to large instances (including unbounded synthesis) is limited.” (section 3, PDF p. 3). Approximate synthesis is future work. The paper provides a max example and symbolic formulas, with no implementation evaluation, benchmark counts, timings, or success rates.

Inference: the reusable idea for VL is separating candidate generation from a search for counterexamples. However, the printed formulas have correctness problems described below. The paper does not establish a Rust or Verus implementation.

## technique: encode a reduction as a linear template

What it is. Section 2.2 introduces a predicate Φ(y), where y has m real components in domains D1,…,Dm, k auxiliary Boolean variables u, and l linear inequalities. A real coefficient matrix X has l rows and m+k+1 columns; the last column supplies constants. Write L_X(y,u) for the conjunction X[y,u,1]ᵀ ≤ 0 (PDF p. 3).

Definition 1 prints the following structure, transcribed into inline notation: ∃X ∀y ⋁u∈{0,1}ᵏ (Φ(y) ⇔ L_X(y,u)). Definition 2 calls the predicate linearizable if it is (l,k)-linearizable for some l≥1 and k≥0 (section 2.2, PDF p. 3). These are transcriptions, not verbatim quotations of the displayed mathematics.

Inference: Definition 1 puts the Boolean choice inside the equivalence. For an equivalent projection of linear inequalities, the required structure is instead ∃X ∀y (Φ(y) ⇔ ⋁u∈{0,1}ᵏ L_X(y,u)). These differ when Φ(y) is false. The printed definition requires some u to make L_X false; equivalence of the projection requires every u to make L_X false. For example, with Φ always false, k=l=1, and L_X(y,u) meaning u≤0, the printed definition holds by choosing u=1, although the projected linear relation is true by choosing u=0. Thus the printed definition does not ensure equivalence of feasible sets.

When to use it. Inference: use a corrected projection template when the desired target is a conjunction of linear inequalities with a small number of Boolean auxiliaries. Bound the source domain and choose l and k before synthesis. Bounded real domains can still contain infinitely many valuations; a finite sample alone does not prove equivalence.

How to do it. Section 2.2 selects the source domains, introduces Boolean auxiliaries, and searches for the coefficients of X. Inference: encode the corrected equivalence above before using this as a verification procedure; retain the domain assumptions in the final proof obligation.

The motivating example is c=max{a,b}. Equation (1) uses c≥a, c≥b, c≤a+(1−u1)M, c≤b+(1−u2)M, and u1+u2≥1, where u1,u2∈{0,1}. Proposition 1 assumes M>|a|+|b|+|c|+1 and proves that c=max{a,b} is equivalent to existence of Boolean auxiliaries satisfying those inequalities (section 2.1, PDF p. 2). Inference: a fixed M used over an entire domain must satisfy this sufficient bound throughout that domain. The proposition's existential quantifier is outside the conjunction of inequalities, as required for projection; it does not justify the quantifier placement in Definition 1.

For nonlinear objectives, the paper rewrites min max{a,b}, subject to (a,b)∈D, as min z subject to (a,b)∈D and z=max{a,b}, where D is assumed linear (equations (3)–(7), section 2.1, PDF pp. 2–3). It then states, “Thus, without loss of generality, in the rest of this work we shall only consider nonlinear constraints.” (PDF p. 3).

Verus form. Inference: express the source relation, candidate relation, and their domain assumptions in specifications, then prove both implications for a chosen candidate. Candidate generation can remain an external SMT search. This is an adaptation; the paper supplies no Verus code or proof certificate format.

## technique: CEGIS candidate and refutation loop

What it is. The paper initializes a finite set S of source valuations and solves Formula 1 for a coefficient matrix X. Transcribed, Formula 1 is ∃X ⋀y∈S ⋁u∈{0,1}ᵏ (Φ(y) ⇔ L_X(y,u)). Formula 2 then searches for a counterexample over D1×…×Dm (section 2.2, PDF p. 3).

The PDF prints Formula 2 with this structure: ∃y ⋀u∈{0,1}ᵏ ((Φ(y) ∧ ⋀i=1…l X[i:][y,u,1]ᵀ>0) ∨ (¬Φ(y) ∧ L_X(y,u))). The inner connective over i is a conjunction in the PDF; the supplied layout text renders it as a disjunction. The PDF is the source for this transcription (Formula 2 and the preceding counterexample display, section 2.2, PDF p. 3).

Inference: Formula 1 inherits Definition 1's quantifier problem. Formula 2 has two problems for projected equivalence. When Φ is true, rejection requires every u to violate at least one inequality, rather than every inequality. When Φ is false, rejection requires some u satisfying all inequalities, rather than every u. For the first problem, take Φ always true and two constant inequality expressions −1 and 1. The candidate is infeasible, but the printed conjunction of positive violations is false. For the second, the earlier u≤0 example has a spurious feasible valuation, but Formula 2 finds none because not every u satisfies u≤0. In both examples the printed formulas can accept an inequivalent candidate.

How the paper describes the loop (section 2.2, PDF p. 3):

1. Initialize S and solve Formula 1 for X.
2. If no X exists, increase both sizes. The paper says, “If no such an X exists, then we can set l := l + 1, k := k + 1 and repeat solving Formula 1 for the updated l and k”.
3. If X exists, solve Formula 2 over the full source domain.
4. If no counterexample exists, the paper declares X verified. Otherwise add the returned valuation to S and solve Formula 1 again.

Inference: to implement a sound loop for projected equivalence, first correct both queries. Synthesis must require Φ(y) ⇔ ∃u L_X(y,u) for each sample. Refutation must find either a true Φ with no feasible u, or a false Φ with some feasible u. Only an unsatisfiable corrected refutation query establishes equivalence under the modeled assumptions. A solver's unknown result provides no such conclusion.

The paper claims optimal synthesis only in principle. Remark 4 says, “With a minor modification, the above incremental approach is able to find an optimal reduction in principle, if such a reduction indeed exists.” (section 2.2, PDF p. 3). Section 1 identifies the measure as the numbers of auxiliary variables and inequalities (PDF p. 2). Inference: the paper does not specify the modification, an ordering of the two sizes, or a termination proof. Increasing both sizes together does not by itself establish minimality among all pairs (l,k). An unsatisfiable finite-sample query rules out a candidate for that template and sample; it does not rule out larger templates.

Verus form. Inference: keep counterexamples as concrete arithmetic obligations, and prove a selected candidate's equivalence over the specified domain. A finite collection of successful obligations is insufficient for a proof over real domains. The paper offers no evaluated route from SMT counterexamples to Rust proof repairs.

## what is proved, trusted, and relevant to VL

Proposition 1 gives a direct proof of the max encoding under its M assumption (PDF p. 2). Section 2.2 describes the synthesis loop and claims that absence of a refutation verifies a reduction (PDF p. 3). Inference: that general claim is not justified for projected equivalence by the displayed formulas, as the examples above show. It should not be treated as a demonstrated sound synthesis procedure without correcting the formulas and proving the resulting procedure.

The raw model's fidelity and solver correctness are explicitly outside the work's focus (section 1, PDF p. 1). Inference: a VL adaptation would also depend on faithful arithmetic encodings and explicit domain assumptions. A proof restricted to bounded real variables does not automatically establish correctness for a Rust API with different domains or machine arithmetic. Candidate generation and proof checking remain useful separate tasks, but the paper gives no empirical evidence about automating Rust proofs.

## techniques for the catalog

- bounded linear-template encoding — parameterize a candidate by real coefficients, a number of inequalities, and Boolean auxiliaries; Inference: correct Definition 1's quantifier placement before using it for projected equivalence
- SMT refutation CEGIS — synthesize on accumulated samples and search the domain for counterexamples; Inference: correct both displayed queries before treating absence of a counterexample as proof
- auxiliary-size search — the paper increases both l and k after failed candidate finding and claims an unspecified modification can yield an optimum in principle

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Thus, without loss of generality, in the rest of this work we shall only consider nonlinear constraints."): checked the whole paper, all study quotations, mathematical claims, numbers, section and PDF page references, technique steps, and the arXiv identifier; corrected page references, unsupported claims, and descriptions of the printed formulas, with counterexamples marked Inference; did not run an SMT implementation or validate a Verus adaptation.
