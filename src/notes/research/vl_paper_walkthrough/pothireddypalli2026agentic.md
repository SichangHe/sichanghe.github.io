# Agentic AI-based Coverage Closure for Formal Verification
(authored by agents unless marked 🧑)
Tag: `pothireddypalli2026agentic`, [paper](http://arxiv.org/abs/2603.03147v2)

## scope and result

This paper adds two coverage agents to the Saarthi multi-agent formal-verification workflow. A formal tool first reports uncovered or unreachable RTL locations; a Coverage Hole Analyzer extracts the location's code and context; an SVA Property Generator emits targeted assertions or covers; the modified SVA file is re-run until the coverage target is met or human review is required. The abstract states that the workflow “to automate coverage analysis for formal verification, identify coverage gaps, and generate the required formal properties.” (Abstract, p. 1.)

The evaluation compares Saarthi with and without coverage agents on five designs (ECC, CIC Decimator, AXI4LITE, Automotive IP, Memory Scheduler), using GPT-4.1, GPT-5, and Llama3.3. The paper defines proven percentage as generated properties successfully proven divided by all generated properties, and coverage as formal coverage after the end-to-end flow (§IV, p. 6). Table I reports per-design property counts and percentages; there is no aggregate denominator. Coverage often increases by about 10–20%, but proven percentage can decrease when many new properties are hard to prove (§IV, p. 7).

## technique: role-based agentic workflow

When to use it: use specialized agents when planning, property writing, proof execution, counterexample analysis, and coverage interpretation require different context and tool access.

How to do it:

1. A formal-verification lead parses RTL and design specifications into a structured Verification Plan (vPlan).
2. A task dispatcher sends vPlan items to verification agents, which write compile-ready SystemVerilog Assertions following project conventions.
3. Critic agents check each SVA for syntax, completeness, and semantic accuracy; they return feedback for revision.
4. An executor agent invokes a formal tool such as Cadence JasperGold, gathers proofs and counterexample (CEX) traces, and sends them back to verification and critic agents.
5. A Human-in-the-Loop (HIL) agent supervises decisions. Saarthi sends unresolved tasks to human experts when an iteration threshold is reached. The paper says, “Before proceeding further, Saarthi refers the task to human experts for disambiguation if predetermined iteration thresholds are not met without resolution.” (§III.A, p. 4.)

The group-chat manager uses AutoGen's Core API to serialize agent turns and enforce interaction rules (§III.A, p. 4). The workflow's feedback loop is therefore auditable: generated artifacts, critiques, tool results, and revisions are retained.

Inference: in Verus, the lead can turn a Rust specification into proof tasks, a generator can draft `requires`, `ensures`, and loop `invariant` clauses, and an executor can run Verus and return diagnostics. This role mapping is an inference; the paper uses SystemVerilog and JasperGold, not Verus.

## technique: coverage-hole classification and context extraction

When to use it: use this after a formal run reports uncovered RTL. The paper distinguishes isolated locations from branch and statement locations, including `case`, `if/else`, and `always` blocks (§III.B, p. 5).

How to do it:

1. Preprocess and normalize the formal tool's coverage report. Extract exact module and source coordinates, together with any preconditions reported for each location.
2. Classify each location as `ISOLATED_STRUCTURE` or `BRANCH_STRUCTURE` so the downstream generator knows whether it must reason about control flow.
3. The Coverage Hole Analyzer extracts the exact RTL slice, module name, enclosing block and timing behavior, input and output signals, preconditions, and reset logic.
4. Derive a compact logic signature containing operation pattern, signal relation, and timing pattern. The paper's prompt requires: “One location -> one behaviour -> one future property.” (Listing 3, p. 5.)
5. Serialize the result as JSON. Listing 4 includes start and end coordinates, type (`BRANCH`), code (`c <= a + b`), behavior, statement type, signals, and `always_ff` timing (p. 5).

This representation avoids asking the property model to rediscover source context from a large RTL file. It also gives a traceability key from a generated property back to the exact coverage location.

Inference: a Verus analogue would extract the smallest Rust statement or branch, its enclosing function, relevant fields, preconditions, reset or initialization assumptions, and the current proof diagnostic. The JSON schema and coverage metric are hardware-specific and would need redesign for Rust proof obligations.

## technique: targeted property generation

When to use it: use the JSON hole description to produce one assertion or cover for each uncovered behavior, rather than regenerating the whole property set.

How to do it:

1. Scan the existing SVA file for available signals, macros, parameters, constants, and existing property names.
2. Enforce the generator's restricted forms: `(antecedent) |-> (single_outcome)`, `|=>`, or `|-> ##N`.
3. Match timing style to the enclosing block. For `always_ff`, prefer `|=>` when an antecedent exists; for `always_comb` or continuous assignments, use `|->` for a same-cycle result (Listing 5, p. 6).
4. Map only available signals to the JSON behavior and preserve clock and reset semantics. Reuse an existing property name when present; otherwise create a name, merge the property into the SVA file, and insert a comment linking it to the source location (§III.B, p. 6).
5. Re-run the formal tool immediately on the updated SVA file.

The paper's small example has an RTL branch assigning `c <= d1` when `a && b`; the generated property is `@(posedge clk) (a && b) |=> (c == $past(d1))` (Listings 1–2, p. 3). The authors note that an over-constrained environment can prevent the antecedent from occurring, leaving the target unexercised; insufficient proof/search depth can have the same effect (§II.B, p. 3). Thus a passing assertion is not by itself evidence that the branch is reachable.

Inference: in Verus, generate a local lemma or contract obligation that mentions only existing variables and the uncovered branch's state transition. A Verus `ensures` clause can express post-state behavior, while a loop `invariant` can expose a missing path condition. The paper's SVA implication operators and `$past` do not carry over.

## technique: iterative coverage closure with escalation

How to do it:

1. Run the initial RTL specification and SVA file through the formal tool.
2. If there are no holes, sign off with the reported formal coverage.
3. If holes exist, invoke the Coverage Hole Analyzer and SVA Property Generator, merge generated properties, and run the tool again.
4. Continue until predefined coverage goals are met. Each iteration preserves the previous SVA set and adds traceable properties for remaining locations.
5. If static analysis cannot establish design intent, invoke an expert agent to check property meaning, avoid over-constraint, and resolve edge cases. The paper states that “When the design intent cannot be verified using purely static analysis, an expert agent gets involved at each iteration to validate property intent, avoid over-constraint of the specification, and resolve complex edge cases.” (§III.B, p. 6.)

The Saarthi workflow limits a feedback loop to five cycles before human intervention (Fig. 1 discussion, p. 4). This bound prevents endless propose–critique–repair loops but is a policy choice, not a correctness guarantee.

## evidence and limits

Table I reports the following examples, each with its own generated-property denominator. ECC with GPT-5 changes from 23 properties and 70.30% coverage without coverage agents to 35 properties and 92.11% with them; proven percentage changes from 95.65% to 80%. AXI4LITE with GPT-5 changes from 38 properties, 45.85% coverage to 80 properties, 53.59%; proven percentage falls from 55.26% to 42.45%. Automotive IP with GPT-4.1 changes from 27 properties, 80.48% coverage to 53 properties, 83.04%, while proven percentage rises from 74.07% to 77.35% (Table I, p. 6). These numbers show the stated tradeoff: adding properties can raise coverage while lowering the fraction individually proven.

The paper's trusted components include the RTL and specification, the formal tool's coverage report and proof engine, static extraction, LLM-generated properties, and human judgments about intent. Coverage is conditioned on environmental assumptions; the paper defines line coverage as RTL statements “mathematically proven reachable and subsequently exercised by a specified property set within the formal verification environment.” (§II.B, p. 3.) Over-constraint can make a property vacuously true or hide a path. Generated properties can also be incorrect or duplicated; the authors say HIL review is needed to retain only valid and verifiable properties (§IV, p. 7).

## techniques for the catalog

- role-based verification agents: divide planning, generation, criticism, execution, and CEX analysis among specialized agents
- coverage-hole classification: normalize tool reports and classify isolated versus control-flow locations
- context JSON extraction: encode exact code, signals, timing, preconditions, reset logic, and a logic signature
- targeted SVA generation: emit one timing-matched assertion or cover per location using only available signals
- iterative closure loop: merge properties, rerun formal analysis, and escalate unresolved intent to human review
