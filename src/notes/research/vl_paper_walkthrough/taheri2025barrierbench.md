# BarrierBench: Evaluating Large Language Models for Safety Verification in Dynamical Systems
(authored by agents unless marked 🧑)
Tag: `taheri2025barrierbench`, [paper](https://doi.org/10.48550/arxiv.2511.09363)

## problem and contribution
The paper studies synthesis of barrier certificates for dynamical-system safety. It defines a system as state space, vector field, initial set, and unsafe set, and states safety as trajectories from the initial set never entering the unsafe set. Its motivation is that “Safety verification of dynamical systems is computationally undecidable even for CPS with simple piecewise-constant dynamics” (section 1, p. 2), so practical methods search for sufficient certificates. A barrier is a scalar function with nonpositive values on the initial set, positive values on the unsafe set, and a nonincreasing condition on the boundary for continuous time or across transitions for discrete time (section 2, pp. 3–4). The theorem quoted by the paper is: “If there exists a barrier certificate B(x) for S, then the system S is safe.” (Theorem 1, p. 3)

The proposed framework has retrieval, synthesis, and verifier agents. BarrierBench contains 100 systems, dimensions 1D–8D, linear and nonlinear dynamics, continuous and discrete time, and 68 controlled systems requiring simultaneous barrier and controller synthesis (section 4.2, p. 5; Table 1). The authors report a 90/100 success rate for the full framework with Claude Sonnet 4 and 46/100 with ChatGPT-4o, against 41/100 and 17/100 single-prompt baselines (Table 2, p. 6). These are benchmark results, not guarantees that an LLM is correct without a solver.

## technique 1: define and check a barrier certificate
Use this when a safety claim can be reduced to an inductive scalar invariant over a known dynamical model. For a continuous-time model, choose B and establish B≤0 on all initial states, B>0 on all unsafe states, and ∇B·f<0 wherever B=0. For a discrete-time model, establish B(f(x))−B(x)≤0 for every state. The paper gives these conditions as equations (3)–(5) (section 2, p. 3) and uses an SMT solver to prove the negation is unsatisfiable (section 3, p. 5).

Step by step from the paper:
1. Represent the system as (X,f,XI,XU), with initial and unsafe sets disjoint (section 2, p. 3).
2. Select a scalar template B and instantiate coefficients (section 2, p. 3; section 3, p. 4).
3. Encode the three barrier conditions, choosing the continuous- or discrete-time condition (section 2, p. 3).
4. Test the negated conditions with an SMT solver; validity means the negation is unsatisfiable (section 3, p. 5).
5. For controlled systems, substitute the candidate feedback controller into f before checking (Algorithm 1, p. 4).

Inference: In Verus, the same proof shape would be represented by Rust data types for states and sets, executable or spec functions for dynamics and B, and `requires`/`ensures` clauses for pointwise conditions. The universal barrier proof would normally be a proof function over symbolic states, with loop invariants if trajectories are iterated. Verus cannot directly discharge arbitrary real nonlinear SMT formulas in the same way as Z3, so an implementation would need lemmas exposing the needed algebraic facts or trusted external modeling; this is an inference because the paper is about dynamical-system SMT, not Verus.

The paper’s concrete examples show the form. For a 4D continuous system it generates “the quadratic barrier B(x) = (x1 − 4.5)2 + (x2 − 1.5)2 + x23 + x24 − 25 of degree 2.” (section 4.3, p. 6). For a 2D discrete system it generates “the quadratic barrier B(x) = x21 + x22 − 0.5 of degree 2.” (section 4.3, p. 6). Evidence is formal solver checking after the sample filter, but the paper does not report per-instance proof times or solver-certificates.

## technique 2: retrieval-guided template discovery
Use this when a database contains previously verified systems and structural similarity can narrow the template search. The Retrieval Agent first filters by automatically extracted attributes: dimension, time domain, linearity, and topology. It then asks an LLM to rank the candidates by structural similarity (section 3, p. 4). The selected example is supplied as a few-shot structural pattern; the paper explicitly says retrieval “does not transfer certificates directly” and that the synthesis agent generates new coefficients and controllers for the target (section 4.4, p. 6).

Step by step:
1. Store verified barriers and their system descriptions in a persistent database (section 3, p. 4).
2. Extract target features and shortlist candidates matching all features (section 3, p. 4).
3. Rank shortlisted candidates with the similarity prompt in Appendix A.1 (p. 11).
4. Give the top example to the synthesis prompt, warning the model not to copy it (Appendix A.2, pp. 11–12).
5. If no match exists, tell synthesis to analyze the problem fresh (Appendix A.2.1, p. 12).

Inference: A VL implementation could index verified Verus lemmas by state shape, transition relation, and invariant form, then retrieve proof skeletons while requiring fresh specifications and rechecking every generated proof. Retrieval should be treated as suggestion because a copied invariant may be unsound for changed preconditions.

The measured effect is in Table 3: among 90 successful Claude runs, 49 solve on the first attempt without refinement (49/90 = 54.4%); the table labels this I1-R0 and reports 63/90 (70.0%) solved during the first main iteration including refinements (section 4.4, p. 6). The denominator is successful cases, while Table 2’s 90% denominator is all 100 benchmark systems; these percentages therefore answer different questions.

## technique 3: two-stage verification and feedback refinement
Use this when candidate generation is cheap but formal solving is expensive. The Verifier Agent first samples 5,000 points: 30% from the initial set, 30% from the unsafe set, and 40% from the state space (section 4.1, p. 5). Any sampled violation rejects the candidate before SMT. The second stage invokes Z3 4.15.1, cvc5 1.3.1, or Yices 2.6.4 and checks unsatisfiability of negated conditions (sections 3 and 4.1, pp. 5–6). Solver choice is prompted from expression and dynamics; timeouts can trigger a retry with a larger timeout or solver switching (Appendix A.6, pp. 16–17).

When formal checking fails, feedback contains violated conditions and counterexamples. Refinements 1–2 redistribute coefficients without changing structure; refinements 3–4 may add or remove coupling terms while preserving polynomial degree (section 3, p. 5; Appendix A.4–A.5, pp. 14–16). Algorithm 1 bounds the search by K=5 main iterations and R=4 refinements, returning the best partial solution on exhaustion (Algorithm 1, p. 4).

Inference: In Verus, the sample stage can be a debugging heuristic but cannot establish universal safety; only a verified proof obligation should count as acceptance. Counterexamples can be fed back to an agent to choose a new invariant, while each candidate must compile and verify in Verus before deployment.

Table 3 reports 14/90 (15.6%) successes from R1–2 and 13/90 (14.4%) from R3–4, with 90/90 successful cases partitioned as 63+14+13. The framework’s overall Claude result is 90/100, leaving 10 unsolved systems (section 4.4, p. 7). The paper says these involve highly complex nonlinear combinations, and SMT solvers often time out or fail to decide satisfiability (Limitations, p. 7). This is the principal failure mode and an explicit assumption: exact dynamics and set descriptions are available in a solver-compatible encoding.

## proved, trusted, and product threat
The paper proves safety only conditionally: a valid barrier implies safety, and the solver checks the encoded inequalities. The LLM’s text, retrieval ranking, sample filter, prompts, and timeout policy remain outside the mathematical proof. Inference: for agent-written verified Rust, the product threat is medium: the architecture demonstrates useful search and feedback patterns, but nonlinear solver incompleteness, model-encoding mistakes, and the 10% unsolved rate prevent treating generation success as assurance. Existing work already covers SOS, CEGIS, neural certificates, and data-driven barriers (section 5, pp. 7–8); VL should reuse those ideas rather than redo a generic retrieval/refinement loop without a Rust-specific evaluation.

## techniques for the catalog
- barrier certificate conditions: separate initial, unsafe, and invariant-boundary obligations and discharge their negations with SMT
- retrieval-guided synthesis: retrieve structurally similar verified examples to seed fresh candidate templates
- staged verification: reject sampled counterexamples before invoking formal SMT checks
- feedback refinement: adjust coefficients first, then alter structure using solver counterexamples within bounded iterations
- barrier-controller co-synthesis: generate a feedback law and substitute it into the dynamics before checking safety
Checked 2026-10-15 against paper taheri2025barrierbench: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
