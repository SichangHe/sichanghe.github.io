# PDE-Controller: LLMs for Autoformalization and Reasoning of PDEs
(authored by agents unless marked 🧑)
Tag: `soroco2025pdecontroller`, [paper](https://arxiv.org/abs/2502.00963)

## what the paper proves or measures
Inference: Soroco et al. build a pipeline that translates informal partial-differential-equation control requests into signal temporal logic (STL), proposes intermediate STL subgoals, synthesizes Python/Gurobi programs, and evaluates the resulting control utility after numerical simulation.  The paper measures language-model accuracy and utility on one-dimensional heat and wave systems; it does not prove the LLM-generated specification or program correct in a proof assistant.

Quote (§2.2, p. 3): “Representing PDE constraints using STL can clearly and precisely express complex specifications into logical formulas and thus remove possible ambiguity in informal natural language.”

## technique 1: express physical constraints in signal temporal logic
Inference: Use STL when a natural-language safety or performance request refers to a target variable over spatial and temporal intervals.  Encode a constraint as ϕ = T[t1,t2](∀x∈[x1,x2], u(x) ≶ (ax+b)), where T is globally (G) or eventually (F), and the comparison is `<`, `>`, or `=`.  Combine up to three constraints with conjunction, disjunction, and explicit parentheses for precedence (§2.2 and §3.1, pp. 2–4).

Inference: The procedure is: identify the controlled variable u; extract spatial bounds, time bounds, linear coefficients, and comparison; choose G or F; then compose constraints.  The paper's utility gives STL continuous semantics: simulate and optimize the system, and call r(ϕ)>0 a successful satisfaction.  This allows graded evaluation instead of a binary string match.

Quote (§2.2, p. 2): “G (“globally”) means the constraint holds during a specified interval. F (“eventually”) means the constraint is satisfied at least once during the temporal interval.”

Inference: In Verus, STL can guide a specification but cannot be copied as a runtime proof.  Encode a discretized temporal property as a `spec fn` over sequences or arrays, use quantifiers and `ensures` for the control routine, and prove each sampled step and invariant; this is an inference because the paper uses continuous PDE semantics and Python/MILP, not Verus.  Discretization error, solver tolerances, and the relationship between a sampled property and the continuous rod remain trusted assumptions.

## technique 2: synthesize paired NL/STL/program data
Inference: Use the paper's data synthesis method to train translators and code generators when real PDE descriptions are scarce.  First enumerate six one-constraint formats, 72 two-constraint formats, and 1,296 three-constraint formats (1,374 total).  Sample initial conditions, simulation domains (spatial range xmax and temporal range tmax), physical properties (density, specific heat capacity, thermal conductivity), and the linear coefficients and spatiotemporal ranges of each constraint (parameter ranges in Appendix C.1, Tables 12 and 13); instantiate each abstract STL; generate a matching natural-language description and ground-truth Python optimization code.  Ask GPT-4o-mini for five semantic paraphrases of each description, then merge heat and wave data (§3.2, pp. 4–5).

Quote (§3.2, p. 5): “As shown in Table 2, in total we have n = 2.13 million triplets of (natural language, STL, Python) samples.”

Inference: Table 2 gives 867,408 heat training and 217,176 heat test triplets, plus 845,088 wave training and 209,256 wave test triplets, with the counts split by one, two, and three constraints (these four totals sum to about 2.14 million; the paper states 2.13 million).  The paper also collects 17 manually written heat problems and 17 manually written wave problems from students through four one-hour questionnaire sessions (§3.2, p. 5), used only for evaluation, to test noise and vocabulary variation.

Inference: For Verus, replace Python code with Rust implementations plus `requires`/`ensures` contracts and proof traces, while retaining the one-to-one natural-language/specification pairing.  This is an inference.  Synthetic paraphrases must be checked against the same formal contract; otherwise augmentation can create mislabeled specifications.

## technique 3: train a translator and coder as separate stages
Inference: Train the Translator by supervised fine-tuning on NL→STL pairs, and train the Coder by supervised fine-tuning on NL+STL→Python pairs.  At inference, prompt the Translator with the informal problem, give its STL together with the problem text to the Coder, execute the generated program with Gurobi, and measure STL intersection-over-union (IoU), code executability, and utility RMSE.  The separation lets an ablation distinguish a bad specification from bad code (§3.3, §3.5, pp. 5–7).

Quote (§3.3, p. 5): “Our LLM needs to (1) separate constraints from system descriptions, (2) align informal definitions and concepts to formal STL syntax, and (3) connect multiple constraints with correct logic operators.”

Inference: In Verus, the Translator should emit a candidate `spec fn` or contract, and the Coder should emit executable Rust and proof functions against that contract.  Run Verus after code generation and reject non-verifying output; report specification agreement separately from proof success.  This is an inference, and the paper's IoU is a syntactic/constraint overlap metric rather than formal semantic equivalence.

## technique 4: sequential subgoal reasoning for non-convex control
Inference: Use subgoals when direct optimization of the anchor PDE is blocked by poor initialization, local minima, or intractability.  (1) Take an anchor STL ϕ. (2) Sample a subgoal STL ϕ′ with different spatial or temporal constraints. (3) Solve ϕ directly from u(0) to get r(ϕ).  (4) Solve ϕ′ from u(0), take the resulting state as the new initial condition, solve ϕ, and obtain r(ϕ|ϕ′); call ϕ′ a successful reasoning step if r(ϕ|ϕ′) > r(ϕ).  (5) Repeat to estimate the expected gain.  The subgoal's time constraints must fall before the anchor's, and the paper does not require the subgoal itself to be satisfiable (r(ϕ′) > 0 is not its concern).  The Controller starts from the Translator checkpoint and is trained with direct preference optimization (DPO, which the paper calls RLHF) on win/lose pairs of subgoal STLs; the paper states the preference as r(ϕ|ϕ′(w)) > r(ϕ) > ϕ′(l), with the right-hand term printed without its r(ϕ|·) wrapper, and adds an SFT loss term with weight λ (β = 0.1, λ = 1 in Appendix E.3) (§3.4, pp. 5–6).

Quote (§3.4.1, p. 5): “The solution to a PDE control problem can be improved by decomposing it into subgoals to be optimized sequentially.”

Inference: The paper collects 10,772 preference pairs (Table 8: 5,994 heat and 4,778 wave), evaluates Success Rate P as the fraction of sampled subgoals that improve an anchor, and evaluates utility gain Δr as the expected improvement.  In Verus, the analogue is a sequence of verified state transitions: prove the subgoal controller establishes an invariant or intermediate postcondition, then prove the anchor controller from that postcondition.  This is an inference; Verus does not verify continuous PDE control or DPO preferences directly.

## technique 5: discretize PDE control to FEM plus MILP
Inference: The external numerical backend first converts the PDE to a finite-element discretization, then combines the difference equations and STL constraints into a mixed-integer linear program, and finally optimizes utility with Gurobi (§2.3, p. 3; Appendix A.3, pp. 13–14).  A positive optimized utility means the discretized system meets the encoded constraint.  The appendix's four FEM steps are: write the weak form; divide the spatial domain into elements with local basis functions; assemble the global linear system M ũ̇ + K ũ = F from mass and stiffness matrices (an ODE in time); discretize time with finite differences.  The paper notes that the resulting MILP is non-convex because of the min and max operations in the utility.

Quote (§2.3, p. 3): “After the optimization, if r > 0, that means the system successfully satisfies ϕ using the control input (i.e. constraints are successfully met).”

Inference: For Verus, one could verify matrix-update invariants and bounds of a fixed discretization, but the numerical solver, floating-point behavior, and continuous-to-discrete approximation require explicit trusted models or certificates.  This is an inference and a material boundary of transferring the technique to verified Rust.

## evidence and limits
Inference: On manually written problems, Table 5 reports Translator STL IoU of 0.7108 for heat and 0.6493 for wave, and Coder executability of 0.8235 for heat and 1.0 for wave; the accompanying three-seed deviations are printed in the table.  On heat the Coder's utility RMSE is 2.4687, far worse than MathCoder2 (0.0004) and GPT o1-mini (0.1738); the paper's claim that the models “generally outperform other baselines” does not hold for that column.  The text summarizes autoformalization as over 64% and code executability as over 82%.  The denominator is the manually written test set for each PDE, not the 2.13 million synthetic triplets, and the paper does not state one pooled denominator in the prose.

Inference: On synthetic Table 4 data, the Translator/Coder pipeline reports heat IoU 0.992 (deviation 0.07), executability 0.9978 (0.0015), utility RMSE 0.0173 (0.0065), and wave IoU 0.992 (0.07), executability 0.9620 (0.0098), utility RMSE 0.0076 (0.0011); these are model-specific test metrics, not proof rates.  Table 6's unseen four-constraint test uses five heat and five wave problems: the proposed Translator obtains heat IoU 0.934 and Coder executability 0.8 with RMSE 0.0, while wave IoU is 1.0, executability 0.8, and RMSE 0.1515; MathCoder2 gets heat IoU 0.8154 and wave IoU 0.9690.  With five problems per PDE, these numbers are anecdotal.

Inference: Table 9's all-problem reasoning rows give the Controller heat Success Rate 0.812 and utility gain 1.453, versus GPT-4o utility gain 0.897; the authors call this a 62% improvement (1.453/0.897−1 ≈ 62%).  The Controller's valid-subgoal ratio is 82.70% (five-seed deviation 1.97), versus 42.45% (10.54) for MathCoder2, 2.55% (0.65) for GPT-4o, and 0.04% (0.10) for GPT o1-mini (bottom row of Table 9).  Inference: GPT-4o's utility gain is therefore computed over very few valid proposals.  On wave problems the Controller is second to GPT-4o in success rate (0.699 vs 0.773), and on hard wave problems no model improves utility, so the method is not uniformly effective.  In the end-to-end Table 17, where the Coder converts the proposed subgoals, the heat utility gain is negative for every model (Controller −0.731, MathCoder2 −0.321, GPT-4o −1.921) and GPT-4o's wave utility gain (0.778) exceeds the Controller's (0.698).

Inference: Manual data expose concrete failure modes: inconsistent units, unfamiliar `:=` notation, unbalanced brackets, hallucinated numbers or quantifiers, and subgoals with invalid time ranges.  On manually written wave data, GPT o1-mini has a low utility RMSE (0.0098) while only 39.22% of its generated programs execute, so RMSE over executable programs alone can be misleading.  The paper's external Gurobi solver, finite-element model, generated Python, and manually supplied PDE semantics remain trusted; no theorem proves the continuous physical system safe.

Inference: The threat to agent-written verified Rust is high for specification translation and numerical control: an LLM can produce a syntactically valid but semantically wrong STL or code, and a discretized proof may not imply continuous safety.  Verus can reduce implementation risk only after the discretization, contract, solver assumptions, and environment are modeled explicitly.

## techniques for the catalog
- STL specification — encode spatiotemporal PDE requirements with globally/eventually operators and composable constraints
- paired formal-data synthesis — enumerate syntax templates, sample physical parameters, and generate matched natural language, logic, and solver code
- staged translation and coding — train an NL-to-formal translator separately from a formal-to-executable coder and evaluate each stage
- subgoal control reasoning — solve an improving intermediate constraint before the anchor problem and train on utility-ranked pairs
- FEM/MILP control backend — discretize the PDE, encode STL constraints, and optimize a utility certificate with an external solver
