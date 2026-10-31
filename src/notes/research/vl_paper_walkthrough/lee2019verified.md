# Towards verified stochastic variational inference for probabilistic programs
(authored by agents unless marked 🧑)
Tag: `lee2019verified`, [paper](https://arxiv.org/abs/1907.08827)

Page numbers below follow the paper text's own numbering (arXiv v4, pages "0:1" to "0:35" for the main text, appendix after).

## verified target
The paper identifies the assumptions that stochastic variational inference (SVI) makes about a model-guide pair, and partly discharges them by static analysis, rather than only checking a machine-learning model's final prediction. It analyzes the score-estimator (REINFORCE) algorithm using denotational semantics and program analysis. The authors state: “The violation of these assumptions can lead to undefined optimisation objective or the loss of convergence guarantee of the optimisation process” (Section 1, p. 2). The work's concrete artifact is a prototype static analysis, written in OCaml, that checks one of the assumptions (model-guide support correspondence, R1 below) for Pyro programs (Section 8.4, p. 29).

A model command `C` is one whose normalising constant is finite and nonzero; its posterior is the target (Section 5, p. 15). A parameterized guide `Dθ` must have normalising constant 1 and keep the score weight at 1 (Section 5, p. 15). Figure 7 (p. 16) gives a Bayesian-linear-regression pair: the guide is obtained from the model by deleting the score statements and replacing the arguments 0.0 and 5.0 of the normal distributions by parameters θ. The SVI objective is the KL divergence from the guide density to the normalised model density (Equation (5), p. 16). The score-estimator loop (Section 5, p. 16) is:
1. initialize θ, usually at random
2. sample `r1,...,rN` independently from the guide density `dens(Dθ, sI)`
3. update θ ← θ − η × (average over i of: the gradient of log guide density at `ri`, times log of guide density over model density at `ri`)
4. repeat.

The paper gives the algorithm's rationale: “The average over the N terms in the θ -update step is the core of the algorithm. It approximates the gradient of the optimisation objective” (Section 5, p. 17). N and η are hyperparameters: the number of samples and the learning rate.

## six proof obligations
Theorem 5.1 (p. 17) is the formal contract for the score estimator. It requires R1 absolute continuity (zero model density implies zero guide density, for all θ), R2 differentiability of the guide density in each guide parameter, R3 finite KL integral, R4 continuous differentiability of the KL integral in each single parameter θj, R5 interchange of gradient and integral for the KL objective, and R6 interchange of gradient and integral for guide normalization. The theorem concludes that KL is well-defined and continuously differentiable and that the sample-average gradient has expectation equal to the true gradient (Equation (6), unbiasedness). The paper emphasizes: “The correctness of the algorithm crucially relies on the unbiasedness property in Theorem 5.1” (Section 5, p. 17).

Recipe from Sections 6–7, in my ordering (Inference: the paper does not list these as numbered steps):
1. Express the probabilistic program with the paper's measure and density semantics (Section 4).
2. Treat R1 and R2 as direct analysis targets; the paper says that "except R1 and R2", the requirements are not ready as static-analysis targets (Section 6, p. 18). R1 is checked by the analysis of Section 7.2 (p. 23), R2 by the analysis of Section 7.3 (pp. 23–24).
3. Replace the integral obligations R3–R6 with sufficient conditions (Section 6, pp. 18–21), under the assumption of Section 6.1 (p. 18): a bounded number of random variables, and guide normal parameters depending only on θ. Condition (9): means, standard deviations and their inverses of the model's normal factors are bounded by affine-exponential functions; it implies R3 (Theorem 6.3, p. 19). Condition (10): the guide's means and standard deviations are continuously differentiable in each θj; together with (9) it implies R4–R6 (Theorem 6.7, p. 21), using a dominated-convergence result for exchanging differentiation and integration (Theorem 6.8).
4. Run the four instance analyses of Sections 7.2–7.5 (pp. 23–25), all built from one abstract-interpretation recipe (Section 7.1): names of sampled variables, differentiability, condition (10), condition (9). Run the first on model and guide, the second and third on the guide, the fourth on the model.
5. Accept the pair only if the checks succeed. For the Pyro analysis, a pair is verified "if and only if their analyses return equivalent abstract random databases, without any name mapped into ⊤" (Section 8.3, p. 28).

Only the Section 7.2 analysis was extended and implemented for Pyro; the analyses of Sections 7.3–7.5 are unimplemented and assume Section 6.1 (Section 9, "Limitation", p. 32).

Verus form (Inference): represent a probabilistic program's abstract state and density facts with `spec fn` definitions and ghost state. State support correspondence, differentiability assumptions, and normalization as `requires`; prove loop invariants for repeated sampling/update code. Verus can check algebraic obligations over a chosen discrete model, but the paper's Lebesgue-measure and continuous-calculus theorems would remain trusted lemmas or external mathematical axioms unless separately formalized. The paper's soundness proof (Appendix D, structural induction over commands with widened fixed points for loops) is a design pattern, not a direct Verus encoding.

## Pyro static analysis
The analyzer is an abstract interpreter for Pyro, Python, and PyTorch features. Per Section 8.4 (p. 29), it abstracts tensor shapes, shape transformations of neural-network objects, broadcasting of Pyro `plate` objects, and the shape of indices allocated for sample names, using a zone abstraction (Section 8.2, pp. 26–27); distributions are tracked by a separate abstract domain. It computes loop invariants with a widening operator (Section 8.3, pp. 27–28). Section 7 states the generic soundness theorem for the density semantics of the core language: “For all commands C, we have ⟦C⟧d ∈ γ (⟦C⟧♯ )” (Theorem 7.1, p. 23). This means the concrete density semantics of a command belongs to the concretization of its abstract result. The main text states this theorem for the generic recipe, not separately for the Pyro prototype (Inference: I found no soundness statement for the Pyro extension beyond the remark about Lebesgue versus counting measure in Section 8.4).

Inference: to apply it, parse a model-guide pair, abstractly execute both programs, compare the abstract random databases, then report whether the correspondence property holds. The analysis rejected two of the eight webpage examples (Section 8.4, p. 29). In Bayesian regression `br`, `sigma` is sampled from `Uniform(0.,10.)` in the model but from `Normal(..)` in the guide; the guide support is not a subset of the model support (R ⊈ [0, 10]), so R1 fails and the KL objective is undefined. In `lda`, `doc_topics` is sampled from `Dirichlet(..)` in the model but from `Delta(..)` in the guide; the reference measures differ (Lebesgue versus counting), so KL cannot be computed by Equation (4). The paper notes that `lda`, though incorrect when viewed as SVI, is a valid implementation of variational expectation-maximisation (p. 30): it uses an SVI engine only to solve an optimisation problem in variational EM.

Verus form (Inference): write a sound abstract-domain relation as a ghost predicate and prove each abstract transfer rule over a restricted probabilistic DSL. For production Rust, keep the sampler executable and prove that its trace satisfies the abstract facts consumed by the optimizer. A verifier must distinguish a program that is invalid for SVI from a program that is invalid for every purpose; the `lda` case demonstrates this distinction.

## techniques for the catalog
- denotational probabilistic semantics — define model and guide measures and densities before proving optimization properties
- score-estimator contract — state R1–R6 obligations that make the gradient estimator unbiased and KL well-defined
- sufficient-condition replacement — replace integral obligations with easier boundedness and differentiability conditions
- abstract model-guide analysis — track sampled names with index zones, distributions, and tensor shapes; accept a pair only if model and guide give equivalent abstract random databases
- abstract-interpretation soundness — prove every concrete command lies in the concretization of its abstract result
