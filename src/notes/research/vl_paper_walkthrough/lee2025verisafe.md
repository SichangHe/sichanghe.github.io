# VeriSafe Agent: Safeguarding Mobile GUI Agent via Logic-based Action Verification
(authored by agents unless marked 🧑)
Tag: `lee2025verisafe`, [paper](http://arxiv.org/abs/2503.18492v2)

## system and scope
VeriSafe Agent (VSA) is a runtime guard for mobile GUI agents. It asks app developers to expose verification-relevant state, uses GPT-4o once to translate a natural-language instruction into Horn-clause rules, and then checks proposed actions against those rules before execution. The paper describes it as “a deterministic, logic-based verification system for Mobile GUI Agents.” (Sec. 1, p.2)

Inference: VSA is runtime specification checking, not a proof of the mobile app or the language model. The app's state definitions, update triggers, generated specification, and action-effect prediction remain trusted inputs. A Verus implementation could verify a state-transition kernel, but the paper itself does not prove that its Python implementation or GPT-4o translation is correct.

## technique: Horn-clause DSL for intent
Use this when a user's instruction contains ordered objectives, conditions, and branches that must be checked as actions occur.

Steps:
1. Define a specification as a set of rules. Each rule has conjunctive predicates and one objective: `Pred ∧ ... ∧ Pred → Objective`; a rule can end in `Done` (Fig. 2, Sec. 4.1.1, pp.4–5).
2. Define predicates as objectives or state predicates. A state predicate is a named application state with typed constraints.
3. Define each constraint as a variable, comparison operator, and constant; supported constants are strings, numbers, booleans, dates, times, and enumerations, with operators `=, ≠, ≃, >, ≥, <, ≤, ⊆, ⊈` (Fig. 2, p.5).
4. Express precedence by using one rule's objective as another rule's predicate. A rule is satisfied only when every predicate holds; a satisfied `Done` rule completes the task (Sec. 4.1.1, p.5).
5. Treat unobserved variables as undefined, making their constraints false (Sec. 4.1.1, p.5).

The running instruction “Reserve restaurant R before 7 PM. If the restaurant is not available at that time, do nothing.” becomes rules for `Reserve`, successful `ReserveResult`, and the unavailable branch (Fig. 3, p.5). The paper states: “Each Horn clause signifies that the preconditions for o to be satisfied are p1, p2, . . . , pn.” (Sec. 4.1.1, p.5)

Verus form (Inference): represent state as a Rust struct, constraints as `spec fn` predicates, and rule validity as `requires`/`ensures` over state transitions. Use ordinary Rust `enum` values for finite enumerations. The Horn rules are a useful specification shape; VSA's parser and runtime evaluator would need a separate Verus model.

## technique: developer state library and update triggers
Use this when the application can expose meaningful checkpoints and predicted state changes.

Steps:
1. Define each candidate state with a name, description, and typed variables, through JSON or `defineState()` (Sec. 4.2.1, p.6).
2. Define pre-action triggers on UI handlers. A wrapper updates the state variables with the expected result before invoking the original handler; the handler runs only if verification succeeds (Sec. 4.2.2, pp.6–7).
3. Define post-action `updateState()` calls for asynchronous or unpredictable outcomes such as network callbacks (Sec. 4.2.3, p.7).
4. Choose predicate granularity at meaningful checkpoints. The paper warns that overly fine states raise false positives while coarse states create loopholes (Sec. 7, p.9).

The example wraps a search click with `VSAOnClickListener` and updates `RestaurantInfo.name` from the search field before the existing callback (Sec. 4.2.2, p.7). The paper explains: “The original ‘onClick’ code which performs the actual operation is executed only if the verification succeeds.” (Sec. 4.2.2, p.7)

Verus form (Inference): model each trigger as a pure state transition with a precondition and postcondition, prove that a rejected transition leaves state unchanged, and prove that accepted transitions satisfy the rule predicate. The paper's actual Android wrappers and JSON are outside Verus.

## technique: self-corrective autoformalization
Use this when natural language must be encoded into the DSL and candidate predicates are supplied by developers.

Steps:
1. Prompt the Intent Encoder with the user instruction and the developer-defined state list; have it draft a specification (Sec. 5.1.1, p.8).
2. Run rule-based syntax checking: enforce DSL syntax and type consistency between constants and state variables.
3. If syntax fails, send a structured error back to the encoding LFM and regenerate.
4. Decode the draft specification into natural language with a separate decoder LFM.
5. Have a checker LFM compare the decoded description with the original instruction; feed discrepancies back to the encoder (Sec. 5.1.1, p.8).

The paper says: “These complementary checking mechanisms significantly improve the robustness and accuracy of the intent encoding process, effectively mitigating risks associated with solely relying on probabilistic LFM outputs.” (Sec. 5.1.1, p.8) Inference: this reduces but does not remove specification errors; a Verus proof can check the generated rule syntax and types, but cannot prove semantic agreement with an informal instruction without a trusted formalization oracle.

## technique: experience-driven encoding
Use this when an app has recurring instructions and a large state-predicate vocabulary. Cache specifications that were successfully translated and verified, retrieve similar predicates, and prioritize them for new encoding (Sec. 5.1.2, p.8). This narrows the LFM search space and supplies the VSA-Warm variant. Inference: a Verus-compatible implementation could use a trusted, versioned predicate catalog and prove that retrieval only selects well-typed predicates; semantic relevance remains an empirical concern.

## technique: pre-action two-tier verification
Use predicate checks continuously and rule checks at irreversible or critical actions.

Steps:
1. On every state update, update affected variables and re-evaluate their predicates.
2. If a predicate is false, roll back the update and send soft feedback. Permit the action if the agent repeats it, because intermediate states can be temporarily false (Sec. 5.2, p.9).
3. Mark an agent action as critical when it directly attempts a rule objective.
4. At a critical action, require every predicate in the corresponding rule; block the action if any is false and return hard feedback. Repeated critical actions remain blocked until all predicates hold (Secs. 5.2 and 6, pp.9–10).

The paper states: “Therefore, upon detecting a failed verification, VSA reverts the predicate update and provides the GUI agent with soft feedback.” (Sec. 5.2, p.9) Verus form (Inference): prove rollback as a state equality lemma and hard-gate safety as `requires` on the transition. This is a runtime guard, so it does not prove that the predicted update matches the real side effect after execution.

## technique: structured feedback and majority voting
Roadmap feedback turns each rule into a natural-language description of prerequisites and current progress. Predicate-level soft feedback names an unmet desired state; rule-level hard feedback lists all unmet predicates and blocks the critical action (Sec. 6, pp.9–10). To reduce stochastic LFM variation, repeat verification N times and return the majority decision (Sec. 8.2, p.12). Inference: majority voting improves empirical stability but cannot establish soundness; a deterministic Verus checker would remove this particular source of randomness.

## evidence and assumptions
The evaluation used GPT-4o with the M3A GUI agent on a Google Pixel 8. The dataset has 300 instructions: 150 Correct and 150 Wrong, spanning 18 mobile applications (Sec. 8.1, p.10). The Challenge subset has 25 instructions across nine apps, averaging 19.16 action steps (maximum 40), compared with 5.67 for the LlamaTouch subset (Sec. 8.1, p.10).

Figure 5 reports percentages for LlamaTouch and Challenge, with VSA-Warm reaching 98.4% accuracy on LlamaTouch and 94.0% on Challenge; the abstract's “up to 98.33%” summarizes the evaluation. Table 1's predicate-error denominators are explicit: VSA-Cold has 76/250 overall missing predicates and VSA-Warm 24/250 on LlamaTouch; Challenge counts are 24/50 and 14/50. Critical missing counts are 10/250 and 3/250 (LlamaTouch), and 3/50 and 2/50 (Challenge). Superfluous counts are 7/250 and 0/250, and 4/50 and 0/50; constraint mismatches are 8/250 and 4/250, and 11/50 and 6/50 (Table 1, p.11). The table counts predicate instances, not instructions, so these fractions must not be read as task error rates.

For feedback, M3A initially completed 10/25 Challenge tasks (40%) without feedback. On the 15 failures, VSA-Cold corrected 9/15 (60%) and VSA-Warm 13/15 (86%); both reflection baselines corrected 0/15 (Sec. 8.3, p.12). Majority voting on 50 Challenge instructions reached 96% for VSA-Cold and 100% for VSA-Warm at the reported high repetition setting (Fig. 6, p.12). Developer-burden estimates were 58.77 predicates and approximately 437 lines of code per app; across 18 apps, 1,058 predicates were defined and 540 (51%) activated (Sec. 8.5, p.14). These are estimates from manual annotation, not measured production integration.

The authors identify a key failure mode: a false-positive predicate can halt a task that would otherwise succeed, while an inaccurate state definition can permit harmful actions (Secs. 8.2 and 10, pp.11, 14). Inference: threat to VeruLaw is indirect but relevant. VSA demonstrates a deployable pattern for gating agent actions with typed logic, pre-action state prediction, rollback, and actionable feedback; it does not provide memory safety, functional correctness, or proof of the LFM-generated specification. VL should reuse the two-tier gate and explicit state-update contracts, while treating natural-language autoformalization as untrusted input requiring review or proof obligations.

## techniques for the catalog
- Horn-clause intent DSL — encode user goals as typed predicates, ordered objectives, and `Done` rules
- developer state library — expose named typed state predicates and application-specific update triggers
- self-corrective encoding — repair LFM specifications with syntax/type checks and decode-then-compare semantics checks
- experience-driven encoding — retrieve previously successful predicates to constrain later formalization
- two-tier runtime verification — use reversible soft predicate checks and blocking hard rule checks for critical actions
- structured feedback — generate roadmap, predicate, and rule feedback from unmet logical conditions
- majority verification — repeat stochastic encoding or decisions and return the majority result
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
