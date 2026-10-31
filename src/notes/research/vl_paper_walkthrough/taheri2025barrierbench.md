# BarrierBench: Evaluating Large Language Models for Safety Verification in Dynamical Systems
(authored by agents unless marked 🧑)
Tag: `taheri2025barrierbench`, [paper](https://arxiv.org/abs/2511.09363v2)

## problem and contribution
The paper studies synthesis of barrier certificates for dynamical-system safety. It defines a system as state space, vector field, initial set, and unsafe set, and states safety as trajectories from the initial set never entering the unsafe set. Its motivation is that “safety verification is computationally undecidable even for CPS with simple piecewise-constant dynamics” (section 1, p. 2), so practical methods search for sufficient certificates. A barrier is a scalar function with nonpositive values on the initial set, positive values on the unsafe set, and a strictly negative Lie derivative on its zero boundary for continuous time or a nonincreasing value across transitions for discrete time (section 2, p. 3). The theorem quoted by the paper is: “If there exists a barrier certificate B(x) for S, then the system S is safe.” (Theorem 1, p. 3)

The proposed framework has retrieval, synthesis, and verifier agents. BarrierBench contains 100 systems, dimensions 1D–8D, linear and nonlinear dynamics, continuous and discrete time, and 68 controlled systems requiring simultaneous barrier and controller synthesis (section 4.2, p. 5; Table 1). The authors report a 90/100 success rate for the full framework with Claude Sonnet 4 and 46/100 with ChatGPT-4o, against 41/100 and 17/100 single-prompt baselines (Table 2, p. 6). Inference: these benchmark results do not establish correctness of unchecked LLM outputs.

## technique 1: define and check a barrier certificate
Inference: use this when a safety claim can be reduced to an inductive scalar invariant over a known dynamical model. For a continuous-time model, choose B and establish B≤0 on all initial states, B>0 on all unsafe states, and ∇B·f<0 wherever B=0. For a discrete-time model, establish B(f(x))−B(x)≤0 for every state. The paper gives these conditions as equations (3)–(5) (section 2, p. 3) and uses an SMT solver to prove the negation is unsatisfiable (section 3, p. 5).

Step by step from the paper:
1. Represent the system as (X,f,XI,XU), with initial and unsafe sets disjoint (section 2, p. 3).
2. Select a scalar template B and instantiate coefficients (section 2, p. 3; section 3, p. 4).
3. Encode the three barrier conditions, choosing the continuous- or discrete-time condition (section 2, p. 3).
4. Test the negated conditions with an SMT solver; validity means the negation is unsatisfiable (section 3, p. 5).
5. For controlled systems, synthesize both B and a feedback controller, substitute the controller into f, and check the closed-loop dynamics (Algorithm 1, p. 4; section 3, pp. 4–5).

Inference: In Verus, the same proof shape would be represented by Rust data types for states and sets, executable or spec functions for dynamics and B, and `requires`/`ensures` clauses for pointwise conditions. The universal barrier proof would normally be a proof function over symbolic states, with loop invariants if trajectories are iterated. Any such translation would need a faithful representation of the real-valued model and a proof of the barrier theorem in that representation. The paper does not evaluate Verus.

The paper’s concrete examples show the form. For a 4D continuous system it generates the quadratic barrier B(x) = (x₁ − 4.5)² + (x₂ − 1.5)² + x₃² + x₄² − 25. For a 2D discrete system it generates B(x) = x₁² + x₂² − 0.5 (section 4.3, p. 6). The reported pipeline uses formal solver checking after the sample filter; the paper does not provide per-instance proof times or solver proof artifacts.

## technique 2: retrieval-guided template discovery
Inference: use this when a database contains previously verified systems and structural similarity can narrow the template search. The Retrieval Agent first filters by automatically extracted attributes: dimension, time domain, linearity, and topology. It then asks an LLM to rank the candidates by structural similarity (section 3, p. 4). The selected example is supplied as a few-shot structural pattern; the paper states, “Our retrieval does not transfer certificates directly.” It says the synthesis agent generates new coefficients and controllers for the target (section 4.4, p. 7).

Step by step:
1. Store verified barriers and their system descriptions in a persistent database (section 3, p. 4).
2. Extract target features and shortlist candidates matching all features (section 3, p. 4).
3. Rank shortlisted candidates with the similarity prompt in Appendix A.1 (p. 11).
4. Give the top example to the synthesis prompt, warning the model not to copy it (Appendix A.2, pp. 11–12).
5. If no match exists, tell synthesis to analyze the problem fresh (Appendix A.2.1, p. 12).

Table 3 reports the distribution of 90 successful cases: 49 solve on the first attempt without refinement (49/90 = 54.4%); the table labels this I1-R0 and reports 63/90 (70.0%) solved during the first main iteration including refinements (section 4.4, p. 6). The denominator is successful cases, while Table 2’s 90% denominator is all 100 benchmark systems; these percentages therefore answer different questions. Inference: the first-attempt comparison with the single-prompt baseline does not by itself isolate retrieval from all other framework differences.

## technique 3: two-stage verification and feedback refinement
Inference: use this when candidate generation is cheap but formal solving is expensive. The Verifier Agent first samples 5,000 points: 30% from the initial set, 30% from the unsafe set, and 40% from the state space (section 4.1, p. 5). Any sampled violation rejects the candidate before SMT. The second stage invokes Z3 4.15.1, cvc5 1.3.1, or Yices 2.6.4 and checks unsatisfiability of negated conditions (sections 3 and 4.1, p. 5). Solver choice is prompted from expression and dynamics; timeouts can trigger a retry with a larger timeout or solver switching (Appendix A.6, pp. 16–17).

When formal checking fails, feedback contains violated conditions and counterexamples. Refinements 1–2 redistribute coefficients without changing structure; refinements 3–4 may add or remove coupling terms while preserving polynomial degree (section 3, p. 5; Appendix A.4–A.5, pp. 14–16). The experiments use K=5 main iterations and R=4 refinements per iteration (section 4.1, p. 5). Algorithm 1 returns the best partial solution on exhaustion; section 3 describes this as the candidate maximizing the proportion of satisfied conditions (p. 4). Inference: a partial solution is not a safety certificate.

Inference: In Verus, the sample stage can be a debugging heuristic but cannot establish universal safety; only a verified proof obligation should count as acceptance. Counterexamples can be fed back to an agent to choose a new invariant, while each candidate must compile and verify in Verus before deployment.

Table 3 reports 14/90 (15.6%) successes from R1–2 and 13/90 (14.4%) from R3–4, with 90/90 successful cases partitioned as 63+14+13. The framework’s overall Claude result is 90/100, leaving 10 unsolved systems (section 4.4, p. 7). The paper says these involve highly complex nonlinear combinations, and SMT solvers often time out or fail to decide satisfiability (Limitations, p. 7). The paper also reports failure to synthesize a barrier satisfying all conditions. Inference: the formal guarantee depends on faithfully encoding the supplied dynamics and sets, including any transformations used for verification. Section 3 (p. 5) mentions symbolic conversions and Taylor approximations but does not specify approximation-error bounds or how they preserve the original safety claim.

## techniques for the catalog
- barrier certificate conditions: separate initial, unsafe, and invariant-boundary obligations and discharge their negations with SMT
- retrieval-guided synthesis: retrieve structurally similar verified examples to seed fresh candidate templates
- staged verification: reject sampled counterexamples before invoking formal SMT checks
- feedback refinement: adjust coefficients first, then alter structure using solver counterexamples within bounded iterations
- barrier-controller co-synthesis: generate a feedback law and substitute it into the dynamics before checking safety
