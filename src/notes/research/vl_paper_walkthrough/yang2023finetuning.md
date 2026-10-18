# Fine-Tuning Language Models Using Formal Methods Feedback
(authored by agents unless marked 🧑)
Tag: `yang2023finetuning`, [paper](https://arxiv.org/abs/2310.18239)

## scope and contribution

The paper introduces direct preference optimization via automated feedback (DPO-AF). A language model emits textual task instructions; the instructions are converted to finite-state controllers, checked against temporal-logic specifications, and ranked by how many specifications they satisfy. The ranked pairs train the model with DPO. The authors state: “We develop a method to fine-tune pre-trained models based on automated feedback using artifacts from formal methods.” (Section 1, PDF p. 1.) The reported autonomous-driving study uses Llama2-7B, approximately 3000 preference data points, 15 specifications, and the Carla simulator (Sections 5–5.2, PDF pp. 5–9).

## technique 1: encode a system as an automaton model

What it is. The model is a transition system (M=\langle\Gamma_M,Q_M,\delta_M,\lambda_M\rangle). Atomic propositions (P) describe observable system or environment facts; labels are subsets of (P). The authors say, “A model is an abstract representation that encodes the static and dynamic information of a system or an environment.” (Section 3, PDF p. 2.) A controller later consumes the same propositions and emits action propositions (P_A).

When to use it. Inference: use this when the environment can be described by finite propositions and allowed transitions, and when a safety or task requirement can be written in temporal logic. The paper obtains the information from “human experts or system operation manuals” (Section 4.1, PDF p. 3).

How to do it.

1. Choose (P) and let the model alphabet be (\Gamma_M=2^P) (Section 3, PDF p. 3).
2. Create one state for every proposition valuation and label it with that valuation (Algorithm 1, Section 4.1, PDF p. 4).
3. For every pair of states, add a transition when the system allows the source-to-target valuation (Algorithm 1).
4. Remove states with no incoming or outgoing transition; the paper also gives a conservative option that keeps all states at higher verification cost (Section 4.1, PDF p. 4).
5. Build one model per driving scenario and integrate them into a universal model (Section 5.1, PDF p. 6).

The traffic-light example uses (P=\{green,yellow,red\}), with green→red, red→yellow, and yellow→green; impossible labels such as green∧yellow are removed (Section 4.1, PDF p. 4). The paper describes the light as operating “in the order of red-green-yellow-red” but lists the transitions in the opposite direction; Inference: this is an inconsistency in the paper's example, not a property of the method.

Verus form. Inference: represent the finite environment state as a Rust enum or integer type, define a `spec fn` for proposition labels and an allowed-transition predicate, and prove that each implementation transition satisfies that predicate with `requires`/`ensures`. Verus does not directly execute NuSMV’s nondeterministic transition system, so the finite-state model-checking artifact remains an external model unless translated into Verus lemmas.

Evidence and limits. The model is sound for formal checking only under the paper’s completeness assumption: “If M captures complete information from S, then M ⊗ C |= Φ =⇒ G(C, S) |= Φ.” (Appendix B, PDF p. 13.) If transitions are missing, the guarantee no longer holds; the paper explicitly recommends empirical evaluation in that case (Appendix B). The model also assumes every action can be successfully operated and reaches the corresponding model state (Section 4.2, PDF p. 5). The proof of Theorem 1 given in Appendix B is a short contrapositive argument.

## technique 2: normalize language-model instructions and build a controller

What it is. The model is prompted to list task steps, then prompted again to align those steps to the fixed proposition and action vocabulary. The paper’s alignment prompt is: “Rephrase the following steps to align the defined Boolean Propositions {green traffic light, car from left, ......} and Actions {stop, turn left, turn right, go straight}:” (Section 5.1, PDF p. 7.) Semantic parsing breaks aligned text into verb phrases and keywords, and GLM2FSA constructs an FSA controller.

How to do it.

1. Prompt with the numbered format “Define the steps for task description” followed by numbered descriptions (Section 4.1, PDF p. 4).
2. Ask the model to rewrite each description using the proposition/action vocabulary (Section 4.1).
3. Parse each step into short verb phrases, for example `<observe traffic light>` and `<if> <green traffic light>, <go straight>` (Section 5.1, PDF p. 7).
4. Use phrases to define input/output symbols under the GLM2FSA grammar (Section 4.1).
5. Create one controller state per step; the first is (q_0), and construct transition rules with GLM2FSA (Section 4.1).

The right-turn demonstration turns five natural-language steps into a controller. The pre-fine-tuning controller fails Φ5 on a counterexample in which the light turns red and a left car appears after the controller checked pedestrians; the post-fine-tuning controller satisfies all specifications (Section 5.1, PDF p. 7). The paper says, “This counter-example captures an edge case: The traffic light turns back to red and a car is coming from the left immediately after the agent is checking or waiting for pedestrians.” (Section 5.1, PDF p. 7.)

Verus form. Inference: define a Rust enum for parsed observations and actions, a ghost/spec representation of controller states, and a `spec fn` transition relation. A verified execution function can require that each emitted action follows the relation and ensure the safety predicate. Natural-language parsing and GLM2FSA remain trusted or separately verified; Verus cannot establish that free text was parsed correctly without a trusted parser specification.

Evidence and limits. Alignment can itself introduce mistakes; the paper says reducing this probability is a DPO-AF goal (Section 5.1). The controller’s guarantee depends on the parser, vocabulary, model completeness, and successful action execution. The construction is finite-state and therefore unsuitable without abstraction for unbounded data or continuous dynamics (Inference: this limitation follows from the finite automata defined in Sections 3–4).

## technique 3: verify controller/model products with temporal logic

What it is. Specifications are LTL formulas over (P\cup P_A), supplied by designers or extracted from rule books. The controller and model form a product automaton (M\otimes C), and a model checker tests (M\otimes C\models\Phi). The paper states: “In the verification procedure, we first implement the controller in the model.” (Section 4.2, PDF p. 5.) NuSMV returns a violating trace when a property fails.

How to do it.

1. Write safety/task formulas such as □(pedestrian → ◇ stop), □(¬green traffic light → ¬go straight), and □(car from left ∨ pedestrian at right → ¬turn right) (Section 5.1, PDF p. 6; Appendix C, PDF p. 14).
2. Form product states (Q_P=Q_M×Q), with initial states pairing every model state with controller state (q_0) (Appendix A, PDF p. 13).
3. Permit a product transition when both the model transition and controller transition are enabled (Appendix A).
4. Verify the product against each specification for all possible initial states with a model checker such as NuSMV (Section 4.2, PDF p. 5); in the model-checking problem, all labeled trajectories of the product must belong to the language of the LTL specification (Appendix A, PDF p. 13).
5. If verification fails, the model checker returns a counter-example trace (Section 4.2, PDF p. 5). Inference: that trace is the thing to inspect when deciding how to change the controller; the paper does not describe a repair step.

The supplied NuSMV appendix shows concrete `LTLSPEC` checks, for example `G( pedestrian_at_right -> ! action=turn_right )` and `G( car_from_left -> ! action=turn_right )` (Appendix D, PDF pp. 16–17).

Verus form. Inference: encode each safety property as a `proof fn` over a loop invariant and use `invariant` clauses on the verified Rust controller loop; use `old(...)` only where a post-state relation needs the pre-state. A Verus proof checks a specified implementation trace, whereas NuSMV explores nondeterministic finite-state traces, so equivalence requires a proved abstraction relation (Inference).

Evidence and limits. The paper’s formal evidence is the model-checker result for every initial state and the returned counterexample when a result is false (Section 4.2). The paper saves a checkpoint every 20 epochs and verifies the checkpoint's controllers against the 15 specifications (Section 5.2, PDF p. 8); Figure 9 (PDF p. 9) shows the resulting spread of satisfied-specification counts for training and validation tasks. The text does not state how many tasks or controllers are evaluated per checkpoint; this is a reporting limitation.

## technique 4: empirical feedback when no complete model exists

What it is. A grounding method (G:C×S→(2^P×2^{P_A})^{N}) runs a controller in an autonomous system and returns proposition/action sequences. Each sequence is checked against the specifications, and the feedback for Φ is (P_\Phi=\text{number of satisfying sequences}/\text{total sequences}) (Section 4.2, PDF p. 5).

How to do it.

1. Operate each controller in a simulator or system through (G) (Section 4.2).
2. Collect the returned state/action sequence for every run.
3. Evaluate each sequence against each specification and compute (P_\Phi) (Section 4.2).
4. Rank controllers or responses using the number or percentage of satisfied specifications (Sections 4.2–4.3).

In Carla, the authors run controllers multiple times and compare per-specification percentages before and after fine-tuning; Figure 11 shows higher percentages after fine-tuning for all five displayed specifications (Section 5.2, PDF pp. 8–9). The paper states, “Therefore, if we are unable to obtain automaton-based models for the system, empirical evaluation is a substitute for formal verification and is able to provide feedback consistent with formal verification.” (Section 5.2, PDF p. 9.)

Verus form. Inference: treat simulator traces as test evidence, while proving the controller’s safety invariant over all modeled inputs in Verus. A Verus proof cannot turn a finite sample into a universal guarantee; traces can validate an abstraction or discover counterexamples but remain non-proof evidence.

Evidence and limits. The empirical denominator is the number of collected sequences, but the paper does not state that number in the Figure 11 text. Results therefore support observed execution probabilities only. The formal guarantee is stronger only when the model captures complete information (Appendix B).

## technique 5: use verified rankings as DPO feedback

What it is. For each prompt, sample multiple responses, construct and verify a controller for each, and prefer the response satisfying more specifications. With (N) tasks and (m) responses per task, the maximum number of pairwise data points is (N\times {m\choose2}) (Section 4.3, PDF p. 5). Feed ((x,y_w,y_l)) pairs to DPO; the implementation uses LoRA low-rank updates.

How to do it.

1. Query the model for (m) responses per task (Section 4.3).
2. Align, parse, construct, and verify each controller (Sections 4.1–4.2).
3. Rank each pair by satisfied-specification count and form preferred/unpreferred responses (Section 4.3).
4. Fine-tune with DPO and low-rank adaptation; the paper defines (\widetilde W=W+AB), with (k\ll d), to reduce memory (Appendix E, PDF p. 17).
5. Re-query checkpoints and repeat verification to measure progress (Section 5.2).

Evidence. The experiment uses approximately 3,000 preference data points on Llama2-7B (Section 5.2, PDF p. 7), five random seeds for DPO metrics (Figure 8 caption, PDF p. 8), 15 LTL specifications for checkpoint evaluation (Section 5.2, PDF p. 8), and epoch-0 versus epoch-200 comparisons (Section 5.2, PDF p. 9; Figure 9). The abstract says, “The results indicate an improvement in percentage of specifications satisfied by the controller from 60% to 90%.” (Abstract, PDF p. 1.) The introduction says “from 60% to above 90%” (Section 1, PDF p. 2). The text does not state how these percentages are computed from Figure 9; treat them as the authors’ aggregate claim, not a reconstructed fraction.

Verus form. Inference: use this method to generate candidate Rust/Verus proofs or controllers, score them by compiling and proving selected lemmas, and train on preference pairs. The score is a search heuristic; a candidate enters production only after an independent Verus verification run.

## what is proved, measured, and trusted

The proved claim is conditional: complete model plus model-checking satisfaction implies satisfaction for executions represented by the system model (Appendix B). Measured outcomes are DPO loss, pairwise accuracy, marginal preference (Figure 8), satisfied-specification counts (Figure 9), simulator sequence percentages (Figure 11), and vision-model simulation/reality calibration (Figure 12). Inference: trusted inputs include externally supplied propositions, transitions, specifications, the text-to-controller alignment/parser, NuSMV, simulator fidelity, and the vision model. The real-world transfer argument assumes matched detector accuracy in simulation and reality; the authors write, “If Statement 2 holds and if the controllers satisfy the critical specifications in simulation, then the controllers also satisfy the specifications in reality.” (Section 5.3, PDF p. 9.) Inference: this assumption leaves perception errors, unmodeled dynamics, and actuator failures as material threats to agent-written verified Rust.

## relevance to VL

Inference: DPO-AF suggests a verifier-as-reward loop for VeruLaw: generate Rust/Verus candidates, compile and verify them, rank by proved obligations, and fine-tune on the resulting pairs. The paper’s finite-state assumptions and trusted parser mean VL must preserve independent proof checking and must not treat a high score or simulator pass as a proof. The paper already demonstrates automated specification-based ranking, so VL should not redo the basic idea; its unresolved product risk is translating natural-language plans into complete, executable Verus specifications.

## techniques for the catalog

- automaton system modeling — encode finite environment valuations and allowed transitions as a transition system
- vocabulary alignment and GLM2FSA — normalize model text into proposition/action phrases and finite-state controller steps
- product-automaton model checking — compose controller and model and check LTL properties, retaining counterexample traces
- empirical specification feedback — run controllers, check traces, and compute satisfying-sequence percentages when no complete model exists
- verifier-ranked DPO — rank sampled responses by satisfied specifications and fine-tune on preferred/unpreferred pairs
Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "Marginal preference measures how strongly the model prefers the correct output compared to the original reference model."): read the whole paper text (main text, appendices A to E, NuSMV listings) and checked every quotation, number, technique step and PDF page reference against it; changed the paper link to the arXiv page (2310.18239, from the paper text), corrected about 25 PDF page references (for example the Theorem 1 quote is on p. 13, not p. 10, and the NuSMV listings are on pp. 16-17), fixed the alignment-prompt quote ending, replaced an unsupported repair step (revise controller or training data) with the paper's counter-example statement plus an Inference label, added the paper's abstract and introduction wording for the 60% to 90% claim, noted the traffic-light example's inconsistent transition order, and labeled own conclusions "Inference:"; did not check the cited external papers (GLM2FSA, DPO, LoRA, NuSMV), the Verus-form paragraphs beyond marking them Inference, or the figure images beyond Figures 9 and 11.
