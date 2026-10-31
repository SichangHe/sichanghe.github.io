# LTLDiff: Finite Linear Temporal Logic-Guided Data Generation and Diffusion Policies for Multi-agent Robotic Manipulation
(authored by agents unless marked 🧑)
Tag: `meng2026ltldiff`, [paper](https://arxiv.org/abs/2609.11043)

## purpose and result
LTLDiff trains multi-agent diffusion policies conditioned on finite linear temporal logic (LTLf). The paper's task is offline robotic manipulation: demonstrations are generated with LTLf constraints, then a policy learns trajectories conditioned on an embedding of the formula. The authors state: “LTLDiff lies between the rule-based and the learning-based methods.” (Section 1, p. 2). The paper says LTLf is “not enforced as hard rules but rather can be applied generally at runtime with soft gradient guidance” (Section 1, p. 2). Inference: its logic is guidance and conditioning, not a runtime proof or hard safety monitor. The paper reports 11 RoboFactory tasks; for each task, policies are trained independently with 50, 100, and 150 expert demonstrations, and three methods (the RoboFactory baseline diffusion policy, LTLDOG-R, and LTLDiff) are trained under identical training settings (Section 4.1, p. 9).

## technique 1: generate and select an LTLf specification
Inference: Use this when a natural-language task states ordering, safety, or coordination requirements that should become machine-readable constraints. The paper's procedure is:

1. Give the task description and target condition to Qwen (Section 3.2, p. 5).
2. Generate the formula ten times (Section 3.2, p. 5).
3. Ask Qwen to re-examine the description and select the most appropriate candidate (Section 3.2, p. 5).
4. Store JSON containing the task description, atomic statements, and the formula (Section 3.2, p. 5).
5. Restrict operators to F, G, U, X and &, |, ->, !, which express temporal and logical structure (Section 3.2, p. 5).

The paper says: “Each LTLf formula is generated ten times using Qwen.” (Section 3.2, p. 5). The appendix formula table (Table 3, Appendix A, pp. 13-14) gives per-task atomic propositions such as “meat grasped”, “meat lifted” and “meat reaches target height” for Pick Meat. Inference: a Verus implementation should not trust an LLM-produced formula as a proof. Parse and validate the formula in a trusted specification layer, then connect each atomic proposition to Rust predicates; use `requires` and `ensures` for the resulting contract and `assert`/`assert forall` for checked implications. The LTLf generator itself remains an assumption unless independently checked.

## technique 2: AST embedding of formulas
Inference: Use this when formulas have variable size but the policy needs a fixed-dimensional input. The paper's steps are:

1. Explicitly separate operators, propositions, and parentheses to tokenize φ (Section 3.3, p. 5).
2. Parse tokens into an abstract syntax tree (AST), preserving logical and temporal hierarchy (Section 3.3, p. 5).
3. Encode every proposition leaf as a one-hot vector (Equation 4, p. 6).
4. For each internal node, concatenate its one-hot operator encoding with the average of child embeddings (Equation 5, p. 6).
5. Take the root embedding and zero-pad it to dimension 128 (Equation 6, p. 6).

The paper specifies: “After an LTLf specification is generated, it is converted to a structured 128-dimensional vector representation by using the LTLf Encoder.” (Section 3.3, p. 5). Inference: Verus can verify a recursive AST evaluator or encoder with a datatype, recursive `spec fn`, and lemmas about node depth and vector dimensions; floating-point neural inference is outside ordinary Verus integer/spec proofs and would need an external model assumption. The AST shape and tokenization can still be contract-checked.

## technique 3: logic-guided offline demonstration generation
Inference: Use this when demonstrations must contain task-level ordering and coordination rather than only physically feasible motions. The paper divides generation into phases determined by atomic propositions and temporal structure, couples each task to a fixed solution structure of motion primitives, and uses the formula embedding to bias velocity, acceleration smoothness, and object position (Section 3.4, pp. 6–7). The paper says: “The motion planner utilizes this conditioning bias for generating motion trajectories, which are more correlated with the temporal structure of the LTLf formula.” (Section 3.4, p. 7).

Steps from the method are:

1. Build semantically valid sub-task phases from the formula (Section 3.4, p. 6).
2. Use atomic propositions as the interface between task semantics and low-level execution (Section 3.4, p. 6).
3. Modulate eligible motion-planning parameters using the structured embedding; the embedding controls adjustment magnitude and direction (Section 3.4, p. 7).
4. Save each trajectory together with its formula as a pair in the offline dataset D (Equation 2, p. 4).

Inference: a Verus version can specify each phase transition and trajectory invariant as predicates and prove that a generated trace satisfies a bounded formula, while the learned planner remains untrusted. The paper does not provide Verus code or a proof that its generated trajectories satisfy every formula.

## technique 4: LTLMAG multi-agent regressor guidance
Inference: Use this when independently denoised agent trajectories need joint temporal and coordination guidance. Algorithm 1 initializes joint trajectories with Gaussian noise, denoises each agent locally, concatenates them, and applies a learned regressor correction to the joint trajectory (Algorithm 1, p. 7). The paper states: “A single LTLf specification defines the temporal and coordination constraints of the task and is shared across all agents.” (Section 3.5, p. 7).

The paper's training and sampling steps are:

1. Train regressor gφ against a target satisfaction-gradient direction, with a squared L2 gradient-matching loss, a norm penalty weighted 0.01, and an auxiliary binary cross-entropy satisfaction loss weighted 0.1 that applies when satisfaction labels are available (Equation 7, p. 8).
2. Start reverse diffusion from Gaussian noise (Algorithm 1, p. 7).
3. For each diffusion step, sample noise and update each agent with the conditioned diffusion policy (Algorithm 1, p. 7).
4. Concatenate the per-agent trajectories (Algorithm 1, p. 7).
5. Add ξᵢgφ to the joint trajectory; ξᵢ is a time-varying guidance weight with default value 0.1; the paper says the linear schedule has “stronger guidance at early timesteps (2ξᵢ) and weaker guidance at later timesteps (0.1ξᵢ)”, fixed across agents and tasks (Section 3.5, p. 8).
6. Return the final joint trajectory (Algorithm 1, p. 7).

Inference: Verus can verify array-shape, indexing, and a discrete joint-trace invariant around a separately supplied guidance result; it cannot establish correctness of a neural gradient without a trusted bound or a proof-producing model. `invariant` is a loop annotation, not a call, and a runtime `proof fn` cannot implement this sampler.

## techniques for the catalog
- LLM-to-LTLf synthesis: sample ten formulas from a task description, select one, and serialize atomic propositions plus restricted temporal/logical operators
- AST formula embedding: tokenize and parse LTLf, recursively combine one-hot node/operator vectors, and pad the root representation to 128 dimensions
- logic-guided demonstrations: partition motion into formula-derived phases and bias planner parameters before storing trajectory–formula pairs
- multi-agent regressor guidance: locally denoise each agent, concatenate trajectories, and apply a learned satisfaction-gradient correction to the joint path
