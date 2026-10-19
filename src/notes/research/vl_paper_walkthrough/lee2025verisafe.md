# VeriSafe Agent: Safeguarding Mobile GUI Agent via Logic-based Action Verification
(authored by agents unless marked 🧑)
Tag: `lee2025verisafe`, [paper](https://doi.org/10.1145/3680207.3765248)

## system and scope
VeriSafe Agent (VSA) checks mobile GUI agent actions against specifications derived from user instructions. App developers define verification-relevant states and update triggers; GPT-4o encodes instructions into Horn-clause rules; runtime logic checks actions against those rules. The authors call VSA “a deterministic, logic-based verification system for Mobile GUI Agents.” (Sec. 1, p.2) Encoding includes LFM-based correction and semantic checking, so it can require multiple model calls (Sec. 5.1.1, p.7).

Inference: VSA checks compliance with a generated specification, rather than proving the mobile app or language model correct. Its reliability depends on developer state definitions, update triggers, instruction translation, and the GUI agent's identification of critical actions. A Verus implementation could verify a state-transition model, but would still need justification that these inputs describe user intent and actual app behavior.

## technique: Horn-clause DSL for intent
Inference: use this representation when a user's instruction contains ordered objectives, conditions, and branches that must be checked during execution.

Steps:
1. Define a specification as a set of Horn-clause rules. Each rule has conjunctive predicates and one objective: `Pred ∧ ... ∧ Pred → Objective`; a rule can instead end in `Done` (Fig. 2, Sec. 4.1.1, p.5).
2. Define predicates as objectives of other rules or state predicates. State predicates represent application states with constraints on typed variables.
3. Define each constraint as a variable, comparison operator, and constant. Supported types are string, number, Boolean, enumeration, date, and time; operators are `=, ≠, ≃, >, ≥, <, ≤, ⊆, ⊈` (Fig. 2, p.5).
4. Express precedence by using one rule's objective as another rule's predicate. Every predicate must hold to satisfy a rule; a satisfied `Done` rule completes the task (Sec. 4.1.1, p.5).
5. Treat unobserved variables as undefined, making their constraints false. Re-evaluate constraints when developer-defined triggers update variables (Secs. 4.1.1–4.1.2, pp.5–6).

The running instruction “Reserve restaurant R before 7 PM. If the restaurant is not available at that time, do nothing.” becomes rules for reservation, successful completion, and completion when unavailable. Figure 3 also encodes the reservation date as `Today` (Fig. 3, p.5; Sec. 4.1.2, p.6). The paper states: “A rule is satisfied if all predicates hold.” (Sec. 4.1.1, p.5)

Inference: in Verus, represent state as a Rust struct, constraints as `spec fn` predicates, finite choices as enums, and permitted transitions with `requires`/`ensures`. VSA's parser and evaluator would need their own verified implementation or an explicit connection to that model.

## technique: developer state library and update triggers
Inference: use this approach when an application can expose meaningful verification checkpoints and expected state changes.

Steps:
1. Define each candidate state with a name, description, and typed variables through JSON or `defineState()` (Sec. 4.2.1, p.6).
2. Attach pre-action triggers to UI handlers. Wrappers intercept interactions and update verification variables according to developer-defined logic before the original handler runs (Sec. 4.2.2, pp.6–7).
3. For unpredictable outcomes, call `updateState()` after the result is known, such as within an asynchronous network callback (Sec. 4.2.3, p.7).
4. Choose meaningful checkpoints rather than checking every atomic input. Overly fine predicates can raise false positives; overly coarse predicates can leave loopholes and raise false negatives (Secs. 4.2.2 and 7, pp.7, 9).

The search example wraps a click with `VSAOnClickListener` and updates `RestaurantInfo.name` from the search field (Sec. 4.2.2, p.7). The library description says: “The original ‘onClick’ code which performs the actual operation is executed only if the verification succeeds.” (Sec. 4.2.2, p.6) The verifier distinguishes advisory predicate failures from blocking rule failures, as described below.

Inference: Verus could model trigger updates as state transitions and prove conditions on their acceptance and rejection. Such proofs would still require a connection between the model, the actual handler, and any asynchronous effects.

## technique: self-corrective autoformalization
Inference: use this process when natural language must be encoded into the DSL using developer-supplied predicates.

Steps:
1. Prompt the Intent Encoder with the user instruction and developer-defined state list to draft a specification.
2. Check DSL syntax and consistency between constant types and declared variable types.
3. Return structured syntax errors to the encoding LFM for correction.
4. Decode the specification back into natural language using a separate decoder LFM.
5. Have a checker LFM compare the decoded description with the original instruction and return discrepancies to the encoder (Sec. 5.1.1, p.7).

The authors state: “These complementary checking mechanisms significantly improve the robustness and accuracy of the intent encoding process, effectively mitigating risks associated with solely relying on probabilistic LFM outputs.” (Sec. 5.1.1, p.7)

Inference: syntax and type checks can have formal correctness properties, but an LFM comparison does not prove semantic agreement with an informal instruction. A Verus implementation would need to distinguish well-formedness from fidelity to user intent.

## technique: experience-driven encoding
When an instruction is successfully translated and verified, VSA caches its specification. It retrieves and prioritizes predicates from earlier encodings to narrow subsequent searches. VSA-Cold uses self-correction without cached memory; VSA-Warm additionally assumes a cached candidate-predicate list is available for the instruction (Secs. 5.1.2 and 8, pp.7–9).

Inference: a Verus implementation could prove that retrieval selects declared, well-typed predicates. Their relevance to a new instruction remains a separate requirement. The evaluation's warm-memory assumption should not be treated as evidence that automatic memory construction is solved; the authors discuss it as future work (Sec. 10, p.13).

## technique: pre-action two-tier verification
Steps:
1. At each state update, update affected variables and re-evaluate their predicates.
2. If a predicate is false, revert the predicate update and send soft feedback. If the agent repeats the action, permit it: an intermediate state can temporarily fail a desired predicate (Secs. 5.2 and 6, pp.8–9).
3. Modify the GUI agent's prompt to request a critical flag when an action directly attempts a specification objective (Sec. 5.2, p.8).
4. At a critical action, require all predicates of the corresponding rule. Block the action and return hard feedback if any predicate is unsatisfied. Repetition does not bypass this check (Secs. 5.2 and 6, pp.8–9).

The paper states: “Therefore, upon detecting a failed verification, VSA reverts the predicate update and provides the GUI agent with soft feedback.” (Sec. 5.2, p.8)

Inference: Verus could prove that a failed check restores the verification state and that accepted critical transitions meet the modeled prerequisites. This would not establish that predicted updates match actual side effects, or that the GUI agent always flags critical actions correctly.

## technique: structured feedback and majority voting
Roadmap feedback describes each rule's prerequisites and current progress. Soft feedback describes an unmet desired state; hard feedback lists unmet predicates and blocks critical actions (Sec. 6, pp.8–9). The majority-voting experiment repeats verification N times and returns the majority decision to reduce LFM variation (Sec. 8.2, p.11).

Inference: deterministic evaluation in Verus would not remove variation in LFM-generated specifications. Majority voting improves measured accuracy here, but does not prove specification correctness.

## evidence and assumptions
The evaluation integrates GPT-4o-based M3A with each verification framework on a Google Pixel 8. There are 300 instruction–execution-path pairs: 150 Correct and 150 Wrong. Wrong instructions are constructed by changing details of Correct instructions while retaining the execution paths. The 150 original instructions comprise 125 sampled from LlamaTouch and 25 new Challenge instructions. Challenge spans nine apps and averages 19.16 steps, with a maximum of 40, compared with 5.67 steps for LlamaTouch (Secs. 8–8.1, pp.9–10).

The evaluation uses manual annotations in place of direct library integration with the closed-source apps: “To emulate this in closed-source mobile apps, we manually annotated state predicates and state transitions for each GUI screen and action in the dataset.” (Sec. 8.1, p.10) Inference: these results evaluate verification with supplied state information, not the reliability of production app instrumentation.

Figure 5 reports VSA-Cold and VSA-Warm accuracy of 95.6% and 99.2% on LlamaTouch, and 88.0% and 94.0% on Challenge (p.10). Inference: weighting these rates by the respective 250 and 50 instruction pairs gives 94.33% and 98.33%, matching the abstract's range; 98.4% in Figure 5 is VSA-Warm's LlamaTouch precision, not accuracy.

Table 1 reports overall missing-predicate entries of 76/250 and 24/250 for Cold and Warm on LlamaTouch, and 24/50 and 14/50 on Challenge. Critical missing entries are 10/250 and 3/250, and 3/50 and 2/50. Superfluous entries are 7/250 and 0/250, and 4/50 and 0/50; constraint mismatches are 8/250 and 4/250, and 11/50 and 6/50. The authors distinguish overall missing predicates from critical omissions that affect verification, because the ground-truth set includes semantically overlapping predicates (Sec. 8.2, Table 1, p.10).

Without feedback, M3A completed 10/25 Challenge tasks (40%). On the 15 failed tasks, VSA-Cold corrected 9/15 and VSA-Warm 13/15; both reflection baselines corrected none (Sec. 8.3, Fig. 7, p.11). The paper reports these correction rates as 60% and 86%. Majority voting on 50 Challenge pairs reached 96% for Cold at N=5 and 100% for Warm at N=5, 7, and 9 (Fig. 6, p.11).

Developer effort was estimated by enumerating relevant predicates for 18 commercial apps and multiplying counts by average code per predicate from a reference implementation. The estimate is 58.77 predicates and approximately 437 lines of code per app; 1,058 predicates were enumerated, of which 540 (51%) were activated in experiments (Sec. 8.5, p.12).

The authors discuss false-positive predicates halting otherwise successful tasks (Sec. 8.3, p.12). They also propose interactive confirmation after repeated rule violations and human approval for critical operations regardless of VSA's decision; these are future safeguards, not evaluated features (Sec. 10, p.13).

## techniques for the catalog
- Horn-clause intent DSL — encode user goals as typed predicates, ordered objectives, and `Done` rules
- developer state library — expose named typed state predicates and application-specific update triggers
- self-corrective encoding — repair specifications with syntax/type checks and decode-then-compare semantic checks
- experience-driven encoding — prioritize predicates from previously successful specifications
- two-tier runtime verification — provide advisory predicate checks and blocking rule checks for critical actions
- structured feedback — derive roadmap, predicate, and rule feedback from logical conditions and current progress
- majority verification — repeat stochastic verification and return the majority decision
