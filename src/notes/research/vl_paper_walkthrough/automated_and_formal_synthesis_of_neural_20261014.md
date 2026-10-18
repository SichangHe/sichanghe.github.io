# Automated and Formal Synthesis of Neural Barrier Certificates for Dynamical Models
(authored by agents unless marked 🧑)
Tag: `peruffo2021barrier`, [paper](https://doi.org/10.1007/978-3-030-72016-2_20)

## problem and result
The paper gives a counterexample-guided inductive synthesis (CEGIS) procedure for safety barrier certificates (BCs) of continuous and hybrid dynamical systems. A BC is a differentiable scalar B whose signs separate initial and unsafe states and whose Lie derivative is negative on B=0. The paper states: “This synthesis method for neural BC is formally sound and fully automated”. The learner is numerically unsound during training; the SMT verifier is the source of the final guarantee. Inference: this decomposition is useful for VL when a generated candidate can be cheaply proposed but every accepted candidate must satisfy a solver-checkable contract.

## technique: neural BC CEGIS

what it is and when to use it

The system models x-dot=f(x), initial set X0, unsafe set Xu, and domain X. The required conditions are B(x)<=0 on X0, B(x)>0 on Xu, and B-dot(x)<0 wherever B(x)=0. The paper's safety proposition says: “then the safety of the model is guaranteed. That is, there is no trajectory of the model contained in X, starting from the initial set X0, that ever enters set Xu.” Use it when safety can be expressed by these differentiable inequalities and a candidate can be represented in an SMT theory.

how to do it

1. initialize a finite sample set S randomly and a feed-forward network with n input neurons, k hidden layers, and one scalar output (Section 3)
2. train the network on S to reduce the three BC losses for X0, Xu, and the derivative belt around B=0 (Sections 3 and 3.1)
3. translate the trained network to a symbolic formula, evaluating with symbolic inputs rather than floating-point inputs (Section 3)
4. ask an SMT solver for a counterexample to the disjunction `(x in X0 and B(x)>0) or (x in Xu and B(x)<=0) or (B(x)=0 and B-dot(x)>=0)` (Section 3.2)
5. if a counterexample is returned, add it to S, retain the old network weights, retrain, and repeat; stop with a proof only when the solver returns `unsat`, or stop without a result at timeout (Section 3)

The paper's Algorithm 1 names these operations `Learner`, `Translate`, `Verifier`, and `SMTcheck`. It explicitly says: “CEGIS offers a scalable and flexible alternative for BC synthesis” and also says completeness is not claimed because the continuous problem may not terminate.

training details that matter

The basic loss is the average of hinge penalties for B on X0 and Xu and B-dot in a belt `|B(x)|<=beta`; offsets tau0, tauu, taud improve numerical stability (Section 3.1). The paper says exact B=0 samples are “highly unlikely”, so it relaxes the condition to a belt `|B(x)|<=beta`. The enhanced loss uses `LeakyReLU`/saturated ReLU to reward margin, and uses `Ld = - average satReLU(-B-dot(s)+taud)` in the belt so training does not evade the derivative term by making the belt empty. The authors choose an asymmetric belt `-beta1 <= B <= beta2`, beta2>beta1>0. They alternate linear and polynomial layers to keep a low polynomial degree while retaining depth; ReLU is disallowed because the Lie derivative requires continuous differentiability. They split samples into X0, Xu, and X batches and add each counterexample to its relevant batch.

verification refinements

The verifier first checks initial and unsafe clauses. It checks the derivative clause only if both are unsatisfiable, avoiding the expensive thin B=0 region. If derivative checking times out, it checks the relaxed condition `|B|<tauv and B-dot>=0`; the resulting spurious points are safe for soundness because they are only extra training samples. It can request multiple points by adding `x != x-bar`, sample a cloud around a counterexample, and follow the gradient of B or B-dot toward larger violation (Section 3.2). dReal is delta-complete: `unsat` is correct but found solutions have delta error; Z3 is sound and complete for its supported polynomial formulas, but cannot handle non-polynomial formulas.

## Verus form (inference)

Inference: represent executable state and the dynamical-step function in Rust, and state set-membership and one-step safety contracts with `requires` and `ensures`. Encode a proposed BC as a `spec fn` over mathematical state values; prove algebraic sign conditions with `proof fn` lemmas and solver-triggering assertions. Encode a loop or bounded simulation with an `invariant` statement inside the loop, and use `old(...)` in postconditions when relating pre-state values. A generated NN is not directly executable proof evidence: inference: use its symbolic expression as a candidate specification, then discharge the sign obligations in Verus. The paper has no Verus counterpart for its SMT counterexample interface; inference: an external learner can add counterexamples to a Rust-side sample set, while Verus checks each resulting candidate. Do not mark the candidate function `external_body`, because that would remove the implementation from verification.

## evidence and limits

The fixed-seed experiments ran on an Ubuntu 18.04 laptop with 8 GB RAM, dReal for the first four benchmarks and Z3 for the last four, 60-second verification timeout, dReal delta 10^-6, and tauv=0.05 (Section 4). Table 1 reports eight benchmarks. CEGIS learned in 31.6 seconds and verified in 0.01 seconds on Darboux using 0.5k samples and two iterations; the obstacle case used 55.5 seconds, 1.83 seconds, 2.0k samples, and nine iterations; the 8-d ODE used 104.5 and 82.51 seconds, 1k samples, and three iterations. The table caption defines times as cumulative seconds, samples as learner input in thousands, and OOT as timeout. Against [34], the obstacle case used 2.0k versus 2097k samples (about 0.1%); this denominator is the table's sample count, not a success rate. SOS produced candidates for five of eight benchmarks, but only Hybrid was verified by Z3; Polynomial was refuted and the others timed out.

Table 2 uses 50 randomized-seed runs, with a ten-minute or twelve-loop timeout. Success was 84% (42/50, inference from the reported percentage and denominator) for Darboux and Hybrid, 76% for Exponential, 28% for Obstacle, 8% for Polynomial, 32% for 4-d ODE, 40% for 6-d ODE, and 12% for 8-d ODE. The paper reports percentages but does not print integer counts; the fractions are therefore inference. The paper notes “a high degree of variance”, and says Table 1 fixes the initialisation seed for repeatability. Inference: fixed-seed success in Table 1 is therefore not a reliability guarantee. The paper's soundness claim rests on the model and sets being correct, B being differentiable, and the SMT verifier returning `unsat`; the paper gives no termination guarantee, and the learner itself is explicitly unsound.

Inference: threat to agent-written verified Rust is medium when the target property is a differentiable numeric invariant and low-level Rust contracts can encode it; it is high when the safety argument depends on continuous dynamics, solver support for transcendental functions, or finding a candidate at all. Inference: what remains trusted includes the model and specification, the Verus and solver implementations, the translation of the network to a formula, and external code; this list is my own and the paper does not discuss Verus. Inference: VL should not redo the paper's basic CEGIS architecture; a useful product experiment would measure whether generated candidate invariants reduce proof repair effort while retaining explicit Verus contracts.

## techniques for the catalog
- neural barrier CEGIS: train a differentiable candidate on samples, translate it symbolically, and add SMT counterexamples until `unsat`
- margin and belt loss: replace exact B=0 sampling with an asymmetric belt and saturated or leaky penalties that reward safety margin
- prioritized relaxed verification: check cheap sign clauses first and use a relaxed derivative region only after timeout
- informative counterexamples: add neighborhoods and gradient-directed violations to make each learner iteration more useful
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Notably, B(x) = 0 can be a set with small volume, thus it is highly unlikely that a single sample s will satisfy B(s) = 0."): read the whole paper text; checked the three quotations, the proposition and conditions, the five CEGIS steps, the loss and belt description, the verifier refinements (the x != x-bar statement against the PDF page), Table 1 and Table 2 numbers, the setup parameters, the SOS comparison, and the DOI against the paper text; changed the "belt is necessary" claim to what the paper says, reworded the assumptions sentence, relabelled the trust-boundary and Verus-API sentences as inference; did not check any Verus language or trust-boundary claim (outside the paper), nor the cited related work.
