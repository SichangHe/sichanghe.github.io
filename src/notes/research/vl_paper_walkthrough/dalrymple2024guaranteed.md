# Towards Guaranteed Safe AI: A Framework for Ensuring Robust and Reliable AI Systems
(authored by agents unless marked 🧑)
Tag: `dalrymple2024guaranteed`, [paper](https://www.semanticscholar.org/paper/d81e8d1d3c8acbcf9755ef470098b9c02adf5963)

## core architecture

This position paper defines guaranteed-safe (GS) AI as an engineering architecture with three components: a world model, a safety specification, and a verifier. The abstract says: "This is achieved by the interplay of three core components: a world model ... a safety specification ... and a verifier" (p. 1). The verifier must issue an auditable quantitative guarantee relative to the model, while the model represents relevant uncertainty and the specification states acceptable effects.

Apply the architecture in this order:

1. Define societal risk criteria as a probabilistic or logical safety specification (Definition 3.1)
2. Build a world model that includes all future effects relevant to that specification, conservatively overapproximating where feasible (Definition 3.1)
3. Represent the AI policy and surrounding hardware/software in that model
4. Have a verifier produce a proof certificate, sound probability bound, asymptotic guarantee, or comparable assurance (Definition 3.1)
5. Check that the guarantee covers bounded computational resources and the deployment context

The paper explicitly requires: "All potential future effects of the AI system and its environment relevant to the safety specification should be modelled (and – if feasible – conservatively over-approximated) by the world model." (Definition 3.1, p. 4). This is a framework and proposal, not an implemented verifier; no end-to-end safety numbers are reported.

## world-model techniques

The paper proposes a spectrum. A manually formalized model can be highly interpretable but may not scale to social or physical complexity. Learned probabilistic programs, Bayesian inference, sequential Monte Carlo, and incremental 3-D models can infer theories from data. The authors also propose formally verified sound abstractions of physical laws, composed hierarchically to reduce cost. Model uncertainty must be explicit: if the model can be wrong with probability at most epsilon per step for n steps, a proof relative to that model supports probability at least `(1-epsilon)^n` in reality (paper footnote 9, p. 8).

Steps for use:

1. State the modeled domain and deployment assumptions
2. Choose manual, learned, probabilistic, or compositional models
3. Include Bayesian and Knightian uncertainty and nondeterministic human behavior
4. Prove or estimate model soundness, or conservatively widen transitions
5. Restrict the specification to domains where the model is valid

Verus form (Inference): encode the world model as ghost state and transition relations; represent uncertainty by nondeterministic choices and prove that every concrete transition is included in the modeled relation. This inference is not a construction supplied by the paper.

## safety-specification techniques

Specifications can be probabilistic temporal logic, causal counterfactual queries, hyperproperties, conjunctions of reachability inequalities, or bounded reward functions. The paper warns that unbounded world-state evaluation is unsuitable because complete satisfaction must remain possible. It gives a seven-level spectrum from no specification through human judgment, natural language interpreted by a black box, hand-written limited properties, neural concept bindings inside logic, AI-synthesized audited parts, comprehensive hand-written properties, and complete encoding of human preferences.

For a concrete system:

1. Identify the context and harms to constrain
2. Select a formalism (temporal logic, probability bound, automaton, or inequalities)
3. Bound the property so it can be completely satisfied
4. Include fallback or backup specifications outside the modeled scenario
5. Audit learned concept predicates and document residual ambiguity

Verus form (Inference): encode bounded safety as `requires`/`ensures` and state invariants; temporal properties need ghost traces and lemmas over transitions. Learned predicates remain assumptions unless separately verified.

## verifier and assurance levels

The verifier spectrum ranges from no testing to manual red teaming, automated evaluations, adversarial testing, asymptotic coverage, sound failure-probability bounds, and concise human-checkable proofs. The paper states: "To obtain strong guarantees, we need a verifier at Level 8, 9, or 10." (Section 3.4, p. 12). Compositional reasoning is recommended: decompose the AI system into components, infer interface contracts, and prove sub-obligations. Modular, interpretable abstractions are easier to analyze. The authors also describe an autoformalization loop: retrieve literature, translate informal statements into formal specifications, attempt proofs, and train on successful verified transcriptions.

Verus form (Inference): use module-level specs and proof lemmas for contracts, then compose them at the top-level function. Keep generated Rust executable code separate from ghost proofs; the paper does not claim that Verus proves world-model correctness.

## worked product patterns

For code translation, the specification is source-target functional equivalence plus absence of specified vulnerabilities; the world model is input preconditions and attacker capabilities; an LLM proposes Rust and a verifier checks the contract. For autonomous vehicles, a rulebook maps behaviors to ordered values and a backup controller maintains a smaller core specification outside modeled scenarios. These examples directly match VL's source-to-verified-Rust setting.

Inference: VL can adopt the three-artifact interface—explicit world assumptions, explicit Rust/Verus safety specs, and a machine-checkable certificate. The main threat is specification or model incompleteness: a valid Verus proof only establishes properties relative to stated assumptions. Existing formal methods, compositional verification, and autoformalization already cover parts of this architecture; VL should integrate those techniques rather than claim the architecture as new.

## what is trusted and measured

The paper proves no theorem about a concrete AI and reports no benchmark denominator or success percentage. Trust remains in the world model, specification semantics, verifier implementation, probability assumptions, and deployment correspondence. Empirical tests are treated as insufficient alone because red teams can miss failures and adversaries can seek unseen inputs. Inference: a product should expose these assumptions and certificate scope to users instead of presenting a proof as an unconditional safety guarantee.

## techniques for the catalog

- three-component GS architecture: combine world model, safety specification, and verifier
- conservative world modeling: overapproximate relevant effects and quantify residual model error
- bounded formal specifications: use temporal, probabilistic, causal, or hyperproperty constraints that are satisfiable
- assurance-level ladder: move from testing toward sound probability bounds or concise proofs
- compositional verification: infer contracts and prove component obligations before composing the system
- autoformalization loop: retrieve, formalize, prove, and train on verified statements
- verified code translation: specify source-target equivalence and security properties under explicit input and threat assumptions

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
