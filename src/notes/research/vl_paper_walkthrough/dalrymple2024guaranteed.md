# Towards Guaranteed Safe AI: A Framework for Ensuring Robust and Reliable AI Systems
(authored by agents unless marked 🧑)
Tag: `dalrymple2024guaranteed`, [paper](https://arxiv.org/abs/2405.06624)

## core architecture

This position paper defines a family of guaranteed safe (GS) AI approaches with three components: a world model, a safety specification, and a verifier. The introduction says: "These approaches aim to provide high-assurance quantitative guarantees about the safety of an AI system’s behaviour through the use of three core components — a formal safety specification, a world model, and a verifier." (p. 1). Definition 3.1 allows proof certificates, probabilistic bounds, asymptotic guarantees, or comparable assurances relative to the world model; the specification encodes societal risk criteria (pp. 4–5).

Inference: a workflow for applying the architecture is:

1. Define societal risk criteria as a probabilistic or logical safety specification (Definition 3.1)
2. Build a world model that includes all future effects relevant to that specification, conservatively overapproximating where feasible (Definition 3.1)
3. Include relevant effects of the AI policy and surrounding hardware/software in that model
4. Have a verifier produce a proof certificate, sound probability bound, asymptotic guarantee, or comparable assurance (Definition 3.1)
5. Check that the guarantee covers bounded computational resources and the deployment context

The paper explicitly requires: "All potential future effects of the AI system and its environment relevant to the safety specification should be modelled (and – if feasible – conservatively over-approximated) by the world model." (Definition 3.1, p. 5). This is a framework and proposal, not an implemented verifier; no end-to-end safety numbers are reported.

## world-model techniques

Section 3.2 proposes world-model levels 0–5, from implicit assumptions to specifications quantified over all possible worlds (p. 6). Manually constructed models can make assumptions understandable but may not scale to complex systems. The authors discuss AI-written probabilistic programs, approximate Bayesian inference using generative flow networks, sequential Monte Carlo, and incremental 3-D models (pp. 7–8). They also propose formally verified sound abstractions of physical laws, composed hierarchically to reduce cost. Model uncertainty must be explicit: if the model is wrong with probability at most epsilon per step over a finite horizon of n steps, the authors state that a policy proven to satisfy the specification relative to that model should satisfy it with probability at least `(1-epsilon)^n` in reality (footnote 9, p. 8).

Inference: steps for use are:

1. State the modeled domain and deployment assumptions
2. Choose manual, learned, probabilistic, or compositional models
3. Include Bayesian and Knightian uncertainty; consider nondeterminism for human behavior
4. Prove or estimate model soundness, or conservatively widen transitions
5. Restrict the specification to domains where the model is valid

Inference: in Verus, encode the world model as ghost state and transition relations; conservatively represent uncertainty by nondeterministic choices and prove that every concrete transition is included in the modeled relation. This is not a construction supplied by the paper.

## safety-specification techniques

Specifications can include probabilistic temporal logic, causal counterfactual queries, hyperproperties, conjunctions of reachability inequalities, or bounded reward functions. The paper excludes unbounded world-state evaluations because complete satisfaction must remain possible (Section 3.3 and footnote 10, p. 9). It gives eight levels, numbered 0–7: no specification, human judgment, natural language interpreted by a black box, hand-written limited properties, neural concept bindings inside logic, AI-synthesized audited parts, comprehensive hand-written properties, and complete encoding of human preferences (p. 9).

Inference: for a concrete system:

1. Identify the context and harms to constrain
2. Select a formalism (temporal logic, probability bound, automaton, or inequalities)
3. Exclude unbounded evaluations and check whether complete satisfaction is possible
4. Include fallback or backup specifications outside the modeled scenario
5. Audit learned concept predicates and document residual ambiguity

Inference: in Verus, encode suitable safety properties as `requires`/`ensures` and state invariants; temporal properties can use ghost traces and lemmas over transitions. Learned predicates remain assumptions unless separately verified.

## verifier and assurance levels

The verifier spectrum has levels 0–10, from no quantitative guarantee through empirical tests, fuzzing, asymptotic coverage, finite-time convergence bounds, sound failure-probability bounds, and concise human-checkable proofs (Section 3.4, pp. 11–12). The paper states: "To obtain strong guarantees, we need a verifier at Level 8, 9, or 10." (p. 12). Compositional reasoning decomposes the top-level proof into component obligations; automatically inferred decompositions and interface contracts can help when component specifications are unavailable (p. 13). The authors also describe an autoformalization loop: index literature, translate informal statements into formal specifications, attempt proofs, and train on successful proof traces and transcriptions. A proven statement is considered a correct transcription only when it is also useful for proving other statements like its informal counterpart (p. 12).

Inference: in Verus, use module-level specs and proof lemmas for contracts, then compose them at the top-level function. Keep generated Rust executable code separate from ghost proofs. The paper does not discuss Verus.

## worked product patterns

For code translation, the specification is source-target functional equivalence plus absence of specified classes of vulnerabilities; the world model is input preconditions and attacker capabilities; the AI system is an LLM for code generation. C-to-Rust translation is an example, and the general translation problem remains unsolved (Example 4.1, pp. 13–14). For autonomous vehicles, a rulebook consists of rules with an associated pre-order; each rule maps behaviors or sets of behaviors to values. A backup system maintains a smaller core specification outside specified scenarios, with runtime monitoring of world-model assumptions (Example 4.2, p. 14).

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

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "A GS AI system should therefore have a trustworthy backup system, appropriate for its domain of use, that can safely transition the system to a safe state if the main AI controller is disabled."): checked all quotations, numbers, section and page references, technique descriptions, and paper identity; corrected the paper link, quotation, definition page, specification-level count, verifier details, autoformalization criterion, and example descriptions, and marked suggested workflows and Verus applications as Inference; did not independently validate cited works or implement the proposed techniques.
