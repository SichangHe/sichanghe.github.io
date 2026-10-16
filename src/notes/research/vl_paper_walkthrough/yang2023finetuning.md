# Fine-Tuning Language Models Using Formal Methods Feedback
(authored by agents unless marked 🧑)
Tag: `yang2023finetuning`, [paper](https://doi.org/10.48550/arxiv.2310.18239)

## scope and contribution

The paper introduces direct preference optimization via automated feedback (DPO-AF). A language model emits textual task instructions; the instructions are converted to finite-state controllers, checked against temporal-logic specifications, and ranked by how many specifications they satisfy. The ranked pairs train the model with DPO. The authors state: “We develop a method to fine-tune pre-trained models based on automated feedback using artifacts from formal methods.” (Section 1, PDF p. 1.) The reported autonomous-driving study uses Llama2-7B, 3,000 preference points, 15 specifications, and a Carla simulator (Sections 5.1–5.2, PDF pp. 5–7).

## technique 1: encode a system as an automaton model

What it is. The model is a transition system (M=\langle\Gamma_M,Q_M,\delta_M,\lambda_M\rangle). Atomic propositions (P) describe observable system or environment facts; labels are subsets of (P). The authors say, “A model is an abstract representation that encodes the static and dynamic information of a system or an environment.” (Section 3, PDF p. 2.) A controller later consumes the same propositions and emits action propositions (P_A).

When to use it. Use this when the environment can be described by finite propositions and allowed transitions, and when a safety or task requirement can be written in temporal logic. The paper obtains the information from “human experts or system operation manuals” (Section 4.1, PDF p. 3).

How to do it.

1. Choose (P) and let the model alphabet be (\Gamma_M=2^P) (Section 3, PDF p. 2).
2. Create one state for every proposition valuation and label it with that valuation (Algorithm 1, Section 4.1, PDF p. 3).
3. For every pair of states, add a transition when the system allows the source-to-target valuation (Algorithm 1).
4. Remove states with no incoming or outgoing transition; the paper also gives a conservative option that keeps all states at higher verification cost (Section 4.1, PDF p. 3).
5. Build one model per driving scenario and integrate them into a universal model (Section 5.1, PDF p. 5).

The traffic-light example uses (P=\{green,yellow,red\}), with green→red, red→yellow, and yellow→green; impossible labels such as green∧yellow are removed (Section 4.1, PDF p. 3).

Verus form. Inference: represent the finite environment state as a Rust enum or integer type, define a `spec fn` for proposition labels and an allowed-transition predicate, and prove that each implementation transition satisfies that predicate with `requires`/`ensures`. Verus does not directly execute NuSMV’s nondeterministic transition system, so the finite-state model-checking artifact remains an external model unless translated into Verus lemmas.

Evidence and limits. The model is sound for formal checking only under the paper’s completeness assumption: “If M captures complete information from S, then M ⊗ C |= Φ =⇒ G(C, S) |= Φ.” (Appendix B, PDF p. 10.) If transitions are missing, the guarantee no longer holds; the paper explicitly recommends empirical evaluation in that case (Appendix B). The model also assumes every action can be successfully operated and reaches the corresponding model state (Section 4.2, PDF p. 4).

## technique 2: normalize language-model instructions and build a controller

What it is. The model is prompted to list task steps, then prompted again to align those steps to the fixed proposition and action vocabulary. The paper’s alignment prompt is: “Rephrase the following steps to align the defined Boolean Propositions {green traffic light, car from left, ......} and Actions {stop, turn left, turn right, go straight}.” (Section 5.1, PDF p. 5.) Semantic parsing breaks aligned text into verb phrases and keywords, and GLM2FSA constructs an FSA controller.

How to do it.

1. Prompt with the numbered format “Define the steps for task description” followed by numbered descriptions (Section 4.1, PDF p. 3).
2. Ask the model to rewrite each description using the proposition/action vocabulary (Section 4.1).
3. Parse each step into short verb phrases, for example `<observe traffic light>` and `<if> <green traffic light>, <go straight>` (Section 5.1, PDF p. 5).
4. Use phrases to define input/output symbols under the GLM2FSA grammar (Section 4.1).
5. Create one controller state per step; the first is (q_0), and construct transition rules with GLM2FSA (Section 4.1).

The right-turn demonstration turns five natural-language steps into a controller. The pre-fine-tuning controller fails Φ5 on a counterexample in which the light turns red and a left car appears after the controller checked pedestrians; the post-fine-tuning controller satisfies all specifications (Section 5.1, PDF p. 6). The paper says, “This counter-example captures an edge case: The traffic light turns back to red and a car is coming from the left immediately after the agent is checking or waiting for pedestrians.” (Section 5.1, PDF p. 6.)

Verus form. Inference: define a Rust enum for parsed observations and actions, a ghost/spec representation of controller states, and a `spec fn` transition relation. A verified execution function can require that each emitted action follows the relation and ensure the safety predicate. Natural-language parsing and GLM2FSA remain trusted or separately verified; Verus cannot establish that free text was parsed correctly without a trusted parser specification.

Evidence and limits. Alignment can itself introduce mistakes; the paper says reducing this probability is a DPO-AF goal (Section 5.1). The controller’s guarantee depends on the parser, vocabulary, model completeness, and successful action execution. The construction is finite-state and therefore unsuitable without abstraction for unbounded data or continuous dynamics (Inference: this limitation follows from the finite automata defined in Sections 3–4).

## technique 3: verify controller/model products with temporal logic

What it is. Specifications are LTL formulas over (P\cup P_A), supplied by designers or extracted from rule books. The controller and model form a product automaton (M\otimes C), and a model checker tests (M\otimes C\models\Phi). The paper states: “In the verification procedure, we first implement the controller in the model.” (Section 4.2, PDF p. 4.) NuSMV returns a violating trace when a property fails.

How to do it.

1. Write safety/task formulas such as □(pedestrian → ◇ stop), □(¬green traffic light → ¬go straight), and □(car from left ∨ pedestrian at right → ¬turn right) (Section 5.1 and Appendix C, PDF pp. 5, 10).
2. Form product states (Q_P=Q_M×Q), with initial states pairing every model state with controller state (q_0) (Appendix A, PDF p. 9).
3. Permit a product transition when both the model transition and controller transition are enabled (Appendix A).
4. Check all possible labeled trajectories against every LTL formula with NuSMV (Section 4.2).
5. If a check fails, inspect the returned state trace and revise the controller or training data (Section 4.2).

The supplied NuSMV appendix shows concrete `LTLSPEC` checks, for example `G( pedestrian_at_right -> ! action=turn_right )` and `G( car_from_left -> ! action=turn_right )` (Appendix D, PDF p. 11).

Verus form. Inference: encode each safety property as a `proof fn` over a loop invariant and use `invariant` clauses on the verified Rust controller loop; use `old(...)` only where a post-state relation needs the pre-state. A Verus proof checks a specified implementation trace, whereas NuSMV explores nondeterministic finite-state traces, so equivalence requires a proved abstraction relation (Inference).

Evidence and limits. The paper’s formal evidence is the model-checker result for every initial state and the returned counterexample when a result is false (Section 4.2). The 15-property evaluation reports the number of satisfied specifications per checkpoint, but the paper does not give a denominator for the plotted task count in Figure 9 beyond the 15-property set (Section 5.2, PDF p. 7); this is a reporting limitation.

## technique 4: empirical feedback when no complete model exists

What it is. A grounding method (G:C×S→(2^P×2^{P_A})^{N}) runs a controller in an autonomous system and returns proposition/action sequences. Each sequence is checked against the specifications, and the feedback for Φ is (P_\Phi=\text{number of satisfying sequences}/\text{total sequences}) (Section 4.2, PDF p. 4).

How to do it.

1. Operate each controller in a simulator or system through (G) (Section 4.2).
2. Collect the returned state/action sequence for every run.
3. Evaluate each sequence against each specification and compute (P_\Phi) (Section 4.2).
4. Rank controllers or responses using the number or percentage of satisfied specifications (Sections 4.2–4.3).

In Carla, the authors run controllers multiple times and compare per-specification percentages before and after fine-tuning; Figure 11 shows higher percentages after fine-tuning for all five displayed specifications (Section 5.2, PDF p. 8). The paper states, “Therefore, if we are unable to obtain automaton-based models for the system, empirical evaluation is a substitute for formal verification and is able to provide feedback consistent with formal verification.” (Section 5.2, PDF p. 8.)

Verus form. Inference: treat simulator traces as test evidence, while proving the controller’s safety invariant over all modeled inputs in Verus. A Verus proof cannot turn a finite sample into a universal guarantee; traces can validate an abstraction or discover counterexamples but remain non-proof evidence.

Evidence and limits. The empirical denominator is the number of collected sequences, but the paper does not state that number in the Figure 11 text. Results therefore support observed execution probabilities only. The formal guarantee is stronger only when the model captures complete information (Appendix B).

## technique 5: use verified rankings as DPO feedback

What it is. For each prompt, sample multiple responses, construct and verify a controller for each, and prefer the response satisfying more specifications. With (N) tasks and (m) responses per task, the maximum number of pairwise data points is (N\times {m\choose2}) (Section 4.3, PDF p. 4). Feed ((x,y_w,y_l)) pairs to DPO; the implementation uses LoRA low-rank updates.

How to do it.

1. Query the model for (m) responses per task (Section 4.3).
2. Align, parse, construct, and verify each controller (Sections 4.1–4.2).
3. Rank each pair by satisfied-specification count and form preferred/unpreferred responses (Section 4.3).
4. Fine-tune with DPO and low-rank adaptation; the paper defines (\widetilde W=W+AB), with (k\ll d), to reduce memory (Appendix E, PDF p. 12).
5. Re-query checkpoints and repeat verification to measure progress (Section 5.2).

Evidence. The experiment uses approximately 3,000 preference data points on Llama2-7B (Section 5.2, PDF p. 7), five random seeds for DPO metrics (Figure 8 caption, PDF p. 7), 15 LTL specifications for checkpoint evaluation (Section 5.2), and epoch-0 versus epoch-200 comparisons in Figure 9. The abstract reports an increase from 60% to 90% of specifications satisfied, but the paper does not identify a denominator for those percentages in the abstract; interpret them as the authors’ aggregate result, not a newly reconstructed fraction.

Verus form. Inference: use this method to generate candidate Rust/Verus proofs or controllers, score them by compiling and proving selected lemmas, and train on preference pairs. The score is a search heuristic; a candidate enters production only after an independent Verus verification run.

## what is proved, measured, and trusted

The proved claim is conditional: complete model plus model-checking satisfaction implies satisfaction for executions represented by the system model (Appendix B). Measured outcomes are DPO loss, pairwise accuracy, marginal preference (Figure 8), satisfied-specification counts (Figure 9), simulator sequence percentages (Figure 11), and vision-model simulation/reality calibration (Figure 12). Trusted inputs include externally supplied propositions, transitions, specifications, the text-to-controller alignment/parser, NuSMV, simulator fidelity, and the vision model. The real-world transfer argument assumes matched detector accuracy in simulation and reality; the authors write, “If Statement 2 holds and if the controllers satisfy the critical specifications in simulation, then the controllers also satisfy the specifications in reality.” (Section 5.3, PDF p. 9.) Inference: this assumption leaves perception errors, unmodeled dynamics, and actuator failures as material threats to agent-written verified Rust.

## relevance to VL

Inference: DPO-AF suggests a verifier-as-reward loop for VeruLaw: generate Rust/Verus candidates, compile and verify them, rank by proved obligations, and fine-tune on the resulting pairs. The paper’s finite-state assumptions and trusted parser mean VL must preserve independent proof checking and must not treat a high score or simulator pass as a proof. The paper already demonstrates automated specification-based ranking, so VL should not redo the basic idea; its unresolved product risk is translating natural-language plans into complete, executable Verus specifications.

## techniques for the catalog

- automaton system modeling — encode finite environment valuations and allowed transitions as a transition system
- vocabulary alignment and GLM2FSA — normalize model text into proposition/action phrases and finite-state controller steps
- product-automaton model checking — compose controller and model and check LTL properties, retaining counterexample traces
- empirical specification feedback — run controllers, check traces, and compute satisfying-sequence percentages when no complete model exists
- verifier-ranked DPO — rank sampled responses by satisfied specifications and fine-tune on preferred/unpreferred pairs
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
