# Verification Reward Model for Reinforcement Learning in Chip Design Verification
(authored by agents unless marked 🧑)
Tag: `chaurasia2026verification`, [paper](https://arxiv.org/abs/2609.22347v1)

## paper status and central object
This September 2026 preprint is a position paper. It proposes a Verification Reward Model (VRM) for training language models to create and repair hardware-verification artifacts. The abstract states: “This is a position paper: we specify the framework and the experiments that would test it, and we report no training, EDA, or silicon results.” (Abstract, p. 1). The named mechanisms are therefore designs and experimental targets, not demonstrated results. The central object is a versioned verification contract binding requirements, stimulus, observation, reference behavior, budgets, and acceptance criteria. The paper says: “A frozen verification contract and a protected evaluator produce versioned evidence.” (Section I, p. 1).

## technique: freeze a contract and separate authority

The architecture separates five services: trusted evaluator `T`, learned outcome model `Oθ`, semantic critic `Jφ`, deterministic reward composer `U`, and evaluation scheduler `Aψ` (Section III-B, pp. 2–3). The evaluator executes versioned tools and returns `e = T(C,y)`; the composer applies fixed validity rules and scalarization; learned predictions can select or critique but cannot overwrite measured acceptance (Section III-B, p. 3). The paper warns: “Learned components inform selection and diagnosis. They never override a measured result or an acceptance check.” (Section I, p. 1).

Inference: for Verus, make the contract fields ghost state and expose executable functions whose `requires` and `ensures` refer to an abstract DUT model. Keep the evaluator outside the proof boundary unless its implementation is verified. Use `proof fn` lemmas for the link between an artifact action and the abstract transition; use `external_body` only for genuinely trusted external code, never for the function whose behavior the study claims to verify. A deterministic reward composer can be a pure `spec fn` plus a separately executable implementation checked against it.

## technique: evidence records and explicit statuses
Use append-only evidence records so every reward decision has provenance. Store contract and candidate digests, toolchain digest, stage, timestamps, seed or workload identifier, units, status, uncertainty, and raw artifact references (Section IV, p. 3). Keep statuses `pass`, `fail`, `unknown`, `not_run`, and `infrastructure_error`; a formal timeout normally means `unknown` (Section IV, p. 3). Record compilation, simulation, coverage, assertion, mutation, and runtime channels separately. The paper gives a concrete warning: “An assertion with zero failures can be inactive.” (Section IV-A, p. 3).

## technique: qualified faults and sound kill attribution
Use mutation testing only after validating the mutation population. A mutation is eligible only if it builds, is relevant under the contract, and changes an observable requirement; formal comparison or a witness trace can validate relevance. Keep equivalent, unreachable, invalid, and unresolved mutations as separate categories (Section V-A, p. 3). The paper says: “A timeout is not proof that a mutation is equivalent.” (Section V-A, p. 3).

Count a fault as detected only when the artifact produces a reproducible, contract-relevant failure on a validated faulty DUT and behaves acceptably on paired clean controls (Section V-B, p. 3). Store stimulus, observation, expected behavior, checker identity, and a minimized evidence slice. An unconditional error fails the clean control and loses eligibility (Section V-B, p. 3). Define `K(t,m)=1` only after detection attribution, and count duplicate manifestations of one root fault once (Section V-B, p. 3).

For a fixed episode set, the paper defines precision `TP/(TP+FP)` and recall `TP/(TP+FN)` and requires the same episode definition for all four counts (Section V-C, p. 4). It reports mutation recall by fault family and clean false-alarm rate separately. Zero failures in 100 independent clean trials still gives a one-sided 95% upper false-alarm bound of about 2.95% under the independent Bernoulli model (Section V-C, p. 4). Correlated seeds provide less information.

Inference: for Verus, represent a validated fault and clean-control result as ghost predicates. Prove the reward function requires `K` evidence and clean eligibility before granting detection credit. The proof can establish arithmetic consistency of recall denominators, but it cannot establish that a hardware simulator or mutation is semantically faithful without a trusted model.

## technique: eligibility prerequisite checks and potential shaping
The measured quality vector is `q=(q_fault,q_req,q_robust,q_eff)`, each component in `[0,1]`; the initial scalarization weights are `(0.55,0.25,0.15,0.05)` for complete environments (Section VI-A, p. 4). These weights are hypotheses, not measured optima. The terminal reward is `-1` for tampering or confirmed unsoundness, `-0.5` for attributable build/task failure, `NA` for unresolved required evidence, and the weighted sum only for complete eligible evidence (Section VI-B, p. 4). `NA` is masked or held for later evaluation, not converted to zero.

For a suite `S`, the paper defines weighted marginal fault utility `F(S)` over the fixed validated population and gives a new test credit of `F(S∪{t})−F(S)` (Section VI-C, p. 4). Repeated tests that detect already-covered faults receive no discovery credit. Runtime cost can be a separately bounded penalty or a budget constraint; the proposal reports both unconstrained and cost-normalized detection. Intermediate feedback may use potential-based shaping `r'_t = r_t + γΦ(s_{t+1}) − Φ(s_t)`; the potential is frozen during a collection/update cycle and terminal potential is normally zero (Section VI-D, p. 4).

Inference: a Verus implementation can prove that a scalarizer with fixed nonnegative weights is monotone in each quality component and that marginal credit does not double-count a fault. It cannot prove the paper's MDP assumptions for an LLM policy unless the policy and environment are modeled.

## technique: partial-evidence prediction and critic
Train stage-conditioned outcome heads for E0-to-E4, E1-to-E4, and E2-to-E4, where E0 is contract plus artifact, E1 adds lint and compilation, E2 a fixed smoke suite, E3 clean regression and requirements coverage, E4 validated fault campaigns, and E5 an independent audit (Section IV-B, p. 3). Mask whatever has not been observed, and prevent target measurements from leaking through filenames, logs, summaries, or metadata (Section III-B, p. 2). Use a compact code/specification encoder, structured EDA features, evidence masks, and task/fidelity embeddings; begin with a fixed-rule composer, tabular predictor, and generic judge as baselines (Section VII-A/B, pp. 4–5).

The training objective is `L = λ_b L_BCE + λ_r L_reg + λ_p L_pair + λ_c L_critic`; binary heads estimate events, continuous heads predict metrics, pairwise heads rank candidates, and the critic learns evidence-linked feedback (Section VII-C, p. 5). Pairwise examples must share contract, fidelity, budget, and scalarization. The critic emits issue category, requirement identifier, code span, evidence identifier, confidence, and a proposed discriminating test; an unsupported explanation cannot count as a verified defect (Section VII-D, p. 5).

Inference: for verified Rust generation, the critic should point to a failed postcondition, invariant, or missing lemma and propose a test that can be checked by Verus or an independent harness. A fluent repair explanation should not change reward until the proof or external test passes.

## technique: paired interventions, scheduling, and audits
Use matched clean/fault runs with the same legal stimulus, seed, tool version, and environment, changing only the DUT fault (Section VIII-A, p. 5). A second four-cell intervention changes only checker or stimulus, revealing whether a test became useful after its observer was repaired. The paper explicitly limits the causal claim to the model and contract.

The scheduler chooses an evaluation action by estimated reduction in selection regret divided by expected cost (Section IX-B, p. 5). It may combine expected quality improvement, uncertainty, and fault-family diversity, but this is a heuristic. The design reserves an initial 20% of evaluation budget for stratified random audits and requires full evaluation for release candidates (Section IX-B, p. 5).

The proposed flywheel freezes contract/evaluator/split/policy checkpoint, generates bounded candidates, runs integrity/build/activity checks, allocates clean/stress/fault evaluation, adjudicates failures, trains outcome and critic models on training families, trains a challenger, evaluates it on development families with frozen metrics, promotes it only after a separate release audit, and versions genuinely new, authorized failures for the next training cycle. The hidden final test suite is not fed back into the same development cycle (Section X-A, p. 6). The worked FIFO scenario contrasts a high-activity candidate that counts transfers but misses a duplicated wraparound value with a candidate that compares every returned item against an independent queue model (Section XI, p. 6).

## techniques for the catalog
- versioned verification contract — freeze requirements, legal inputs, observability, assumptions, trusted oracles, budgets, and provenance before generation
- append-only evidence ledger — record stage, units, denominators, status, uncertainty, and raw artifacts with explicit timeout and infrastructure states
- qualified mutation reward — count only reproducible fault failures that pass relevance and paired clean-control checks
- marginal fault discovery — reward a new test only for validated faults not already covered by the suite
- potential-based shaping — provide intermediate feedback with a frozen potential and consistent terminal value
- masked partial-evidence model — predict later measurements from only evidence available at the current stage
- evidence-linked critic — tie each diagnosis to a requirement, code span, evidence record, and discriminating test
- uncertainty-aware scheduler — select costly evaluations by estimated information value per cost while reserving random audits
