# Quantitative Verification with Neural Networks
(authored by agents unless marked 🧑)
Tag: `abate2023quantitative`, [paper](https://doi.org/10.46298/LMCS-22(2:4)2026)

## problem and contribution

Abate, Edwards, Giacobbe, Punchihewa and Roy synthesize neural supermartingale certificates for upper bounds on the probability that a probabilistic program or discrete-time stochastic dynamical model reaches a target set in finite time. A model repeatedly updates real-valued state `s` with a probabilistic command; the question is the probability that the process hits a target set `A` after some finite number of steps (no fixed horizon). Page numbers below are the journal's (LMCS 22(2), 4:1 to 4:26); the paper notes that the conference version appeared at CONCUR 2023. The abstract states the central separation clearly: “we train the neural certificate while tightening the probability bound over samples of the state space using stochastic optimisation, and then we formally check the certificate’s validity over every possible state using satisfiability modulo theories”. (Abstract, p. 4:1)

The method is counterexample-guided inductive synthesis (CEGIS). A learner proposes a neural certificate from finitely many states; an SMT verifier checks the global conditions. A counterexample is added to the training set and the loop repeats. If no counterexample exists, the certificate supplies a sound bound. The authors describe the soundness boundary: “If the verifier shows that no such counterexample exists, then the desired specification is met by the supermartingale and the procedure provides a sound probability bound for the reachability probability of interest”. (Section 6, p. 4:14)

## technique 1: supermartingale certificate theorem

definition and trigger

For target set `A`, choose a non-negative function `V : R^n -> R>=0 ∪ {∞}` satisfying (i) `V(s) >= 1` for every `s` in `A` (indicating condition, Eq. 5.1a), and (ii) the post-expectation `X[V](s) <= V(s)` for every state outside `A` (non-increasing condition, Eq. 5.1b). Theorem 5.1 proves `V(s) >= P[Reach^fin_s(A)]` for every state. The paper states: “As a consequence of Theorem 5.1, the maximum of V over S0 is a sound upper bound for the reachability probability.” (Section 5, p. 4:12). Use this when the desired property can be expressed as reaching a target set: the paper maps termination, assertion violation, safety and invariance to target sets (Section 3, p. 4:8), with safety and invariance obtained as `1 - P[Reach]`, a lower bound.

application steps

1. Define state variables, probabilistic update function, initial set `S0`, and target `A`.
2. Choose a non-negative certificate template. The paper uses a feed-forward network with ReLU hidden layers whose output is the sum of the last hidden layer's neurons, guaranteeing non-negativity (Eq. 5.2, Section 5, pp. 4:12–4:13).
3. Enforce the indicating and non-increasing conditions above.
4. Train `V` to be small on `S0` (the loss term `Lmin` is the average of `V` over sampled initial states); the maximum of `V` over `S0` is the probability bound.
5. Prove the conditions globally with an SMT query, rather than trusting finite training samples.

Verus form (Inference: the paper is not about Verus)

Inference: encode deterministic certificate obligations as `spec fn` predicates over a mathematical state type, use `requires` to constrain `S0` and `A`, and use `ensures` for the two certificate inequalities. A `proof fn` can establish a discrete transition's expectation inequality when the distribution is finite and represented explicitly. Verus does not natively discharge real-valued neural-network or probability reasoning merely from a Rust implementation; the SMT encoding, real arithmetic model, and network weights remain trusted external artifacts unless separately connected to the Rust specification.

## technique 2: sample-based learner with two loss modes

training recipe

Initially sample states uniformly within a bounded hyper-rectangle. Optimize network weights with gradient descent on `L = beta1 Lind + beta2 Lnon-inc + beta3 Lmin` (Eq. 6.1): `Lind` penalizes `V(d)<1` for sampled target states, `Lnon-inc` penalizes `X[V](d)>V(d)` for sampled states outside the target, and `Lmin` averages `V` over sampled initial states (Section 6.1, pp. 4:14–4:15). The experiments use `β1 = 10, β2 = 10^5, β3 = 1` (Section 7, p. 4:16). The program-aware mode derives a symbolic post-expectation from source code using the PSI inference tool and differentiates it with respect to network parameters. The program-agnostic mode assumes a generative model, samples `m'` successor states per training state, and uses the average certificate value as a Monte Carlo estimate of `X[V]`. The paper says: “This procedure consists of two components, a learner and a verifier, that work in opposition to each other.” (Section 6, p. 4:13)

To make gradient optimization smoother, the learner replaces ReLU inside `V` by Softplus `log(1 + exp(s))` and rescales the indicating condition to `V(x) >= α` for some large `α > 1`; verification switches back to ReLU. The paper states: “We remark that this has no effect on the soundness of our approach, which is ultimately guaranteed by the verifier.” (Section 6.1, p. 4:16). If a counterexample is returned, it is added to the dataset and training resumes. Inference: in a Rust implementation, persist the counterexample dataset and certificate parameters between iterations; the paper describes the dataflow but does not prescribe a storage format.

Verus form (Inference)

Inference: use a Rust executable for gradient descent and sampling, and a Verus proof boundary for the final certificate predicate. Do not represent a stochastic optimizer as a `proof fn`; it is runtime search. For a finite-state model, state a loop `invariant` that every appended counterexample is in the model domain and that the dataset contains no malformed state. The SMT solver's global check must be treated as an external certificate producer unless its result is imported into a Verus proof with a checked correspondence.

## technique 3: SMT counterexample loop and budget search

The verifier encodes one universally quantified formula (Eq. 6.5) containing all three obligations: target indication `φind`, non-increasing post-expectation `φnon-inc`, and `V(s)<p` on `S0` (`φbound`). It gives Z3 the negation (Eq. 6.6), which asks for a state violating any obligation. A satisfying assignment is `dcex`; it is added to the dataset. The paper says: “If no counterexample is found, this certifies the validity of the neural supermartingale.” The bound `p` is determined by a binary search over `[0,1]` (Section 6.2, p. 4:16). Inference: this is the reusable CEGIS pattern: learn cheaply on examples, then let a global symbolic query reject candidate gaps.

evidence, scope, and limitations

Each benchmark is run ten times; a test succeeds if a valid supermartingale is synthesised, and the proportion of successes is recorded together with the average bound and average learning and verification times (Section 7, p. 4:16; Tables 1 and 2). All benchmarks are assertion-violation analyses of programs in two families, unreliable hardware and robot motion (Section 7, pp. 4:17–4:18). The baseline is template-based synthesis of linear supermartingales using Farkas' Lemma, for which the authors supplied loop-guard-based invariants manually, “in some cases strengthening them with additional constraints by an educated guess” (Section 7, p. 4:17).

Results (Table 1, 17 benchmarks): on the 4 benchmarks where Farkas' Lemma gives no result, both neural modes produce bounds. On the 6 benchmarks cliff crossing, repulse100, repulse100 uniform, repulse100 2d, faulty varying and faulty concave (Farkas' bound at least 0.0991), the neural bounds are tighter (program-agnostic only on repulse100 uniform), e.g. cliff crossing 0.4546 (Farkas) against 0.0553 (program-agnostic) and 0.0591 (program-aware). On the 7 simplest benchmarks (single-neuron networks) the neural bounds are marginally looser than Farkas' (e.g. faulty easy1 0.0801 against 0.1007 and 0.0865); the paper says “our method produces results that are marginally less tight in comparison to Farkas’ Lemma” (Section 7, p. 4:19). Program-aware synthesis failed on repulse100 uniform, which the paper attributes to indicator functions in the post-expectation that “are not smooth and posed a problem for the optimiser”. Success ratios are mostly 1.0 but 0.8 to 0.9 on several benchmarks. Farkas' Lemma is much faster (Table 2: 0.11 to 0.39 s, against about 6 to 254 s of learning plus verification for neural). The paper's own abstract claim is “smaller or comparable probability bounds than existing symbolic methods in all cases”; Table 1 shows slightly larger bounds on the simple benchmarks, so Inference: read “comparable” as within a small margin, not as never worse. The denominator for every success ratio is ten repeats, not ten different models.

Inference: the approach relies on the neural template being expressible in the SMT theory (the paper uses non-linear real arithmetic with Z3), on the transition expectation being encoded correctly, and on Z3's answer being right. Monte Carlo estimates guide learning but, per the paper, do not affect final soundness because the verifier checks the global formula. Inference: this technique can propose Verus invariants or quantitative bounds, but a Verus proof must independently check the resulting obligations. It does not establish that the learned objective is tight, that the state sampler covers rare states, or that a neural certificate is suitable for discrete integer Rust without a faithful abstraction.

## techniques for the catalog

- neural supermartingale certificate: represent a non-negative reachability bound with a ReLU network satisfying target and post-expectation inequalities
- dual-mode certificate learning: train with sampled-state losses using either symbolic program-aware expectations or Monte Carlo successor samples
- SMT-backed CEGIS: ask the negated global certificate formula for a counterexample, add it to the dataset, and retrain until unsatisfiable
- binary-search bound tightening: search the probability interval while checking the initial-state bound in the same SMT formula
