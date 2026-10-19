# AgentSpec: Customizable Runtime Enforcement for Safe and Reliable LLM Agents
(authored by agents unless marked 🧑)
Tag: `wang2025agentspec`, [paper](https://arxiv.org/abs/2503.18666v3)

## what is enforced
AgentSpec is a domain-specific language and runtime interceptor. A rule has a trigger event, predicates, and one or more enforcement actions. The abstract syntax is `rule <Id> trigger <Event> check <Pred>* enforce <Enforce>+ end` (Section 3.1 and Figure 3, p. 4). The paper’s central claim is operational: “AgentSpec enables the specification of rules composed of a triggering event (e.g., an LLM agent executing a financial transaction), predicate conditions (e.g., whether the transaction amount exceeds a predefined threshold) and enforcement (e.g., requiring user confirmation before execution or conducting retrospective self-examination).” (Section 1, p. 2.) A rule violation occurs when its event fires and every predicate is true (Definition 3.2, Section 3.3, p. 5).

The event model covers state changes, actions before execution, and agent completion. Predicates receive user input and the current trajectory; action events can inspect both current state and planned action. Enforcements include `user_inspection`, `llm_self_examine`, `invoke_action(params)`, and `stop`. Formal semantics apply each violated rule’s enforcement sequence, then continue only if the resulting trajectory has not finished (Definition 3.3, p. 5). The LangChain implementation intercepts `iter_next_step` at AgentAction, AgentStep, and AgentFinish; rules are parsed with ANTLR4 (Section 4, p. 5).

## techniques and how to apply them

### declarative runtime rule

1. Define the event that must be observed: `before_action` for a dangerous tool call, `state_change` for environmental changes, or `agent_finish` for completion (Sections 3.1–3.2, p. 4).
2. Implement Boolean predicates over the current state, action, user input, or trajectory. Examples include `is_destructive_cmd`, `is_fragile_object`, and `obstacle_distance_leq(n)` (Table 2, p. 5).
3. Select an enforcement. Stop terminates the trajectory; user inspection pauses for approval; a predefined action changes the state; self-examination asks an LLM for a corrective action (Section 3.3, p. 5).
4. Insert the interceptor before the agent executes the action and re-evaluate after observations; do not rely only on pre-execution dialogue (Section 4, p. 5).

The paper’s transfer example is a transaction rule: trigger before `Transfer`, check `!is_to_family_member`, enforce `user_inspection` (Figure 2, p. 3; Section 3.1, p. 4). Inference: The grammar and semantics make the intervention explicit, allowing a reader to inspect the rule independently of the agent’s prompt.

Inference: In Verus, represent a rule predicate as a pure `spec fn` over an action/state datatype, and prove that an executor’s `requires` excludes forbidden actions or that its `ensures` preserves a safety predicate. Runtime interception still needs ordinary Rust code at the tool boundary; Verus proves the boundary contract only if the boundary and event representation are in the trusted verification scope. AgentSpec itself is not a proof system.

### source-level risk predicates for code

For code agents, the paper uses RedCode-Exec’s 25 vulnerability categories with 30 cases per category. The method is to inspect the planned Python program and define predicates such as whether a command is destructive or whether an untrusted URL’s contents are written to I/O (Section 5.2, p. 7). The rule in Figure 5 triggers on `PythonREPL`, checks `request_untrusted_source` and `write_to_io`, and enforces `user_inspection`. The authors state, “Before an action is executed, AgentSpec evaluates predefined constraints to ensure compliance, modifying the agent’s behavior when necessary.” (Section 4, p. 5.) Table 3 reports counts over 30 test cases per category: #inv counts planned Python-interpreter invocations, #vio counts programs violating a rule, and #pass counts programs allowed after user inspection. Unsafe deserialization, for example, has 24 invocations, 24 violations, and 24 allowed after inspection; the paper notes that this particular script was judged harmless.

Inference: Separate detection from the response: write a predicate that recognizes the risky operation, then choose stop, inspection, or a predefined corrective action. A planned tool invocation alone does not establish that the code is unsafe.

Inference: For VL, predicates can inspect command arguments before file mutation, and Verus can prove that a verified wrapper never emits a command outside an allowlist. The wrapper’s environment, filesystem, and external process remain assumptions unless modeled and verified.

### embodied and autonomous-system enforcement

For the embodied agent, define action predicates such as `is_into_wettable_object`; the paper’s sequence `find mug → fillLiquid mug water → pick mug → find laptop → pour` is stopped before pouring because a laptop is not in the wettable-object list (Figure 7 and Section 5.2, p. 8). For autonomous driving, trigger `state_change`, check `front_vehicle_closer_than(10)`, and invoke `follow_dist(10)`, `yield_dist(15)`, `overtake_dist(20)`, `obstacle_stop_dist(10)`, and `obstacle_decrease_ratio(1)` (Figure 8, p. 9). The AV rule checks a distance threshold and adjusts control parameters; the embodied rule checks the target object and stops the agent.

### LLM-generated rules

The authors prompt OpenAI o1 with the agent/tool description, three illustrative rules and predicate functions, and optionally in-context examples. For code and embodied agents, 10% of risky cases are examples and 90% are held out; AV generation uses no scenario examples (Section 5.3, p. 9). They report 87.26% risky-code enforcement, 95.56% precision and 70.96% recall for embodied rules, and five of eight AV law-breaking scenarios prevented in zero-shot generation (Table 6, Section 5.3, p. 9). The paper also reports that the embodied split has 250 scenarios, 25 examples, and 10 rules; code has 750 scenarios, 75 examples, and 25 rules; AV has 8 scenarios, no examples, and 6 rules. The authors identify overfitting in code rules that recognize only explicitly named sensitive files, causing false negatives. They also identify overly rigid embodied rules that ban all pouring, causing false positives even for watering a houseplant.

Inference: Generated predicates should be reviewed and then verified where possible; never treat an LLM-generated guardrail as a proved invariant. A Verus proof can establish the predicate implementation’s stated property, but not that the natural-language risk description is complete.

## evidence, trust, and limits
Table 4 reports 0% successful fulfillment of unsafe instructions in all ten embodied categories with manually implemented rules; Liquid and Spill Damage already has 0% without rules. Safe-task success falls from 58.62% without rules to 54.26% with rules (the denominator is the safe-task set). Manual AV rules achieve 100% compliance in each of the eight listed scenarios (Table 5, p. 8). Runtime overhead averages 1.42 ms parsing, 2.83 ms predicate evaluation for code, and 1.11 ms for embodied agents, against average agent runtimes of 25.4 s and 9.82 s respectively (Section 5.5, p. 10). These parsing and predicate timings exclude variable enforcement delays: user inspection depends on the user’s response time, invoked actions on their execution time, and self-examination on LLM latency (Section 5.5, p. 10). The paper’s limitation is explicit: “AgentSpec currently performs deterministic enforcement at discrete execution checkpoints” and lacks long-term trajectory analysis (Section 6.3, p. 11). Inference: Its guarantees depend on event instrumentation, predicate implementations, user decisions, and what the environment can do between checkpoints.

Inference: For VL, runtime checks could complement Verus proofs: a missed event or incomplete predicate can leave an unsafe action unchecked. Reusing the separation between detection and enforcement would let VL focus proofs on action/state contracts. The paper does not evaluate Verus or VL.

## techniques for the catalog
- event-predicate-enforcement DSL: bind a trigger, Boolean checks, and explicit intervention in a readable rule
- execution-checkpoint interception: enforce before actions, after observations, and at agent completion
- source-level risk predicates: inspect code or tool arguments for destructive commands, untrusted flows, and sensitive data
- generated-guardrail evaluation: prompt an LLM with examples, test on held-out risks, and report precision, recall, and enforcement rate
- runtime-overhead accounting: measure parsing, predicate, and enforcement latency separately from agent runtime
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The rule-based enforcement mechanism ensures that the agent resists executing all risky tasks while maintaining high fulfillment ability on safe tasks."): checked the whole paper, quotations, numbers, section and PDF-page references, rule syntax, implementation, examples, and evaluation limits; corrected page references and the Table 3 count interpretation, replaced the placeholder DOI with the paper’s arXiv identifier, removed the unsupported audit step, qualified the embodied results, and marked study conclusions as inferences; did not reproduce experiments, inspect implementation code, or independently validate Verus/VL applications.
