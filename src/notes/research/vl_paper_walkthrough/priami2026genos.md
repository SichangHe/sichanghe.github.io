# GenOS: Compositional Certificates for Semantic Robustness in AI Code Generation
(authored by agents unless marked 🧑)
Tag: `priami2026genos`, [paper](https://arxiv.org/abs/2608.03588)

## what is formalized
GenOS models an AI coding agent as a probabilistic workflow: prompt interpretation, contract generation, artifact sampling, validation, repair, and commit. Each layer is a finite-distribution Markov kernel. The central condition is compatibility: equivalent inputs must induce equal probability mass on equivalent outputs. The paper states, “Compatibility is the semantic substitutability test for a layer” (Section 2, p. 3). Equivalence is observer-relative: a return-value observer may identify two implementations while an observer that records post-state separates them.

For a kernel K from X to distributions on Y, with equivalences R_X and R_Y, compatibility means x R_X x' implies K(x) R_Y K(x'). Theorem 1 proves a compatible kernel descends to quotient classes and that quotienting commutes with distribution extension. Theorem 2 proves composition preserves compatibility. Corollary 1 therefore gives end-to-end prompt replacement: equivalent prompts have equal probabilities for every equivalence-closed final event, including commit. This is a mathematical condition for safely replacing a prompt, model, validator, or tool inside a stochastic agent.

The semantic layer records contracts S, code C, and observations O. Contract satisfaction is written s |= c. Generation keeps the contract tag attached to the sampled code, and the observer can record tests, proof results, diagnostics, repair requests, resource use, exceptions, or commit. The paper cautions, “The aim is not to claim that a particular model is invariant to paraphrase” (Section 1, p. 2). GenOS turns invariance into a measured or proved interface property.

## technique 1: choose an observer and quotient before claiming robustness

When to use: use this whenever two prompts, models, or tools are claimed interchangeable. The equivalence must represent the behaviors that matter to the product.

Steps:

1. Define an observer h from concrete executions to records. Include return values, mutated state, exceptions, resource use, proof certificates, information-flow events, or tool calls when those can affect the claim (Section 8, p. 7).
2. Define c R_h c' exactly when h(c)=h(c'). The quotient classes are the behaviors the certificate intentionally treats as the same.
3. Define equivalent prompts by induced contract-class distributions, and equivalent contracts by satisfaction over program classes (Section 2, p. 3).
4. Add deliberately near-equivalent cases. The audit distinguishes copy-sort from in-place sort only when the strong observer records post-state; a return-value observer incorrectly merges them (Section 8, pp. 7–8).
5. Require every final event being compared to be quotient-closed. GenOS gives the counterexample that two equivalent outputs can differ on the singleton event `{a}` even though that event is erased by the quotient (Section 5, p. 6).

Verus form (Inference): make the observer fields explicit in Rust ghost/spec state and state the relevant equivalence as a predicate over those fields. Use `requires` and `ensures` on executable functions for contract satisfaction; use proof functions and `assert` to show that an implementation preserves the selected observer relation. A post-state observer requires framing in the contract. A return-value-only contract cannot prove preservation of input state. The quotient and probability kernel are a GenOS model outside ordinary deterministic Verus verification, so one would verify each deterministic transition and separately measure model-sampling distributions.

## technique 2: certify local compatibility and compose it

When to use: use this to replace one workflow layer while preserving end-to-end behavior.

Steps:

1. Represent each layer as K:X→D(Y), and declare R_X and R_Y.
2. Prove or estimate compatibility: for every x R_X x', compare the output distributions by R_Y class (Section 2, p. 3).
3. Build the quotient kernel on classes. Theorem 1 says it is well-defined and satisfies `(qY)# K†(µ) = K̄†(qX)#µ` (Section 3, p. 3).
4. Repeat for each adjacent layer. Theorem 2 then gives compatibility of sequential composition, and Corollary 1 gives equal probabilities on end-to-end quotient events (Section 3, p. 3).
5. For loops and agent networks, model generate, check, repair, commit, sequence, and repeat. Theorem 3's probabilistic bisimulation requires every stochastic action kernel compatible and every deterministic rule respectful of the equivalence (Section 4, p. 4).

The paper states, “The framework is model-parametric: compatibility is a measurable property to test, not an assumption that language models automatically satisfy” (Abstract, p. 1). Provenance traces append generated artifacts, checker results, diagnostics, and commits; trace monotonicity preserves the earlier trace as a prefix, making decisions auditable.

Verus form (Inference): represent each deterministic workflow action as a Rust function with `requires` and `ensures` describing state-machine transitions. Use a state-machine proof and loop invariants to show the selected abstract state relation is preserved across retries. Probabilistic sampling, Markov kernels, and total-variation bounds are outside Verus's usual executable proof model; a sound design would verify the transition and checker contracts, then attach statistical evidence for the sampler.

## technique 3: guarded commitment and repair progress

When to use: use a guard when an agent may generate incorrect artifacts but only a validated artifact may be committed.

The guard is simple: `Check(s,c)=accept` must imply s |= c, and the commit transition must require acceptance. Theorem 4 proves every reachable committed artifact satisfies its contract regardless of generator distribution or repair policy. The paper emphasizes the boundary: “The theorem does not claim completeness: correct programs may be rejected” (Section 4, p. 4). Tests or learned judges usually support only probabilistic soundness; proof-producing or sound static tools support the premise directly.

Repair is modeled as a new conditional model call after rejection. If every history with no prior acceptance has conditional success probability at least p>0, Theorem 5 bounds no acceptance in n attempts by `(1-p)^n`, without assuming independent attempts (Section 4, p. 4). Therefore indefinite retries eventually accept almost surely, while every accepted artifact remains contract-correct through the guard. An unconditional average success rate is insufficient because it can hide histories that always fail.

Verus form (Inference): encode `Check` as a verified predicate or proof-producing function, and make the commit function require its acceptance fact. Give commit an `ensures` clause that the artifact satisfies the contract. Keep retry state in an explicit Rust state machine and prove that rejection cannot reach the committed state. The probability lower bound is an empirical assumption about the model and repair policy; it is not a Verus theorem unless a finite deterministic policy is modeled.

## technique 4: quantify approximate robustness with a defect budget

Exact compatibility is often too strict for black-box models. GenOS defines quotient total variation `d_R(µ,ν)` as total variation after pushing distributions through the quotient. A layer defect is the supremum quotient distance between outputs of equivalent inputs. Theorem 6 proves non-expansiveness for compatible kernels. Theorem 7 gives the operational budget: final distance is at most initial quotient distance plus the sum of layer defects. Thus prompt interpretation, retrieval, generation, validation, and repair can be audited separately.

The estimation protocol is explicit: freeze model version, context, decoding policy, and tools; sample each replacement pair N times; classify outputs into m observer classes; estimate class frequencies; calculate distance and a confidence bound. The finite-sample theorem requires `N ≥ m²/(2τ²) log(4mM/δ)` for M pairs to bound all estimated pairwise distances within τ with probability at least 1−δ (Section 5, p. 5). The resulting certificate records observers, initial distance, high-confidence layer defects, δ, and commit-guard evidence. Theorem 9 bounds every quotient-closed event by `τ=min{1, ε0+Ση_i+}` with probability at least 1−δ; a sound guard gives unsafe-commit probability zero, while a false-accept bound β gives unsafe commit at most β (Section 5, p. 6).

The executable audit ran insertion-sort variants on all 121 arrays of lengths 0–4 over {-1,0,1}, with six programs and weak/strong observers (Section 7, p. 7). It also ran 10,000 randomized finite-kernel trials; the paper reports no violations of the tested laws, while explicitly saying these tests “do not replace proofs” (Section 7, p. 7). For a near prompt with 5% in-place-sort mass, code-class distance was 0.0275 and verdict distance 0.0050, both below input distance 0.05 (Table 2, p. 7). These denominators and finite models limit what the audit establishes.

Verus form (Inference): use Verus to prove deterministic contract and observer-preservation lemmas, then record model sampling and confidence calculations as external evidence. A failed class comparison identifies the changed semantic behavior and should refine the Rust contract or observer. Do not treat empirical compatibility as a proof of all future model calls.

## evidence, assumptions, and implications for VL

GenOS's theorems prove conditional mathematical statements about finite kernels, equivalence relations, and sound guards. They do not prove that a language model satisfies compatibility, that an observer captures every product property, or that a contract expresses the human requirement. Hidden model state must be included in the configuration: model version, decoding state, retrieved context, tool state, and trace history, or the apparent kernel is not Markov (Section 6, p. 6). Continuous artifacts and nontermination fall outside the finite presentation.

Inference: VeruLaw can use this as an assurance architecture. Define an observer that includes Verus proof acceptance, executable behavior, frame effects, panic/exception behavior, and resource limits. Treat each agent stage as a contract-bearing transition. Require a sound Verus proof guard before commit, and measure prompt/model replacement drift by observer classes with frozen settings. This threatens a product that treats a passing test or proof as complete semantic equivalence: a coarse observer can certify the wrong substitution, and a correct guard can still reject valid code. The paper's contribution is the separation of robustness, correctness, and guard soundness, so VL should report those separately.

## techniques for the catalog

- observer-relative equivalence: define explicit execution observers and quotient classes before comparing prompts, code, or tools
- compatible-kernel composition: prove or measure local class-mass preservation and compose the bounds across workflow layers
- guarded commitment: require a sound validator before commit and model repair success conditionally on failure history
- finite robustness certificate: estimate quotient total variation with frozen settings, confidence bounds, and a summed layer-defect budget
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
