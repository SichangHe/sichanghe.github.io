# Automatic Assertion Mining in Assertion-Based Verification: Techniques, Challenges, and Future Directions
(authored by agents unless marked 🧑)
Tag: `iman2026automatic`, [paper](http://arxiv.org/abs/2601.02248v1)

## paper contribution

This survey reviews automatic assertion miners for hardware assertion-based verification (ABV). Assertions are Boolean rules expected to remain true during execution; mining proposes them from traces, static relationships, templates, or data mining, after which simulation or formal tools check them. The paper motivates the area with the claim that “Today, approximately 51% of the total cost and time in the design process is allocated to verification” (section I, p. 1). It warns that miners can overgenerate, duplicate, conflict, run slowly, and miss corner cases.

The survey covers five concrete miners: GoldMine, Dynamic Dependency Graphs (DDG), A-TEAM, HARM, and ARTmine. It is a comparative review, not a common experiment. Many strengths and limitations are the authors' synthesis and hands-on assessment; no shared benchmark denominator or reproducible aggregate score is supplied. The paper's general limitation is explicit: “One major issue is their inability to produce assertion sets that comprehensively cover all aspects of design behavior, including corner cases” (section I, p. 1).

## technique 1: GoldMine

GoldMine mines RTL assertions from simulation data and static analysis. Apply it as follows (section II-A, p. 2):

1. Generate simulation data for the RTL design under selected sampling strategies and reset frequencies.
2. Run cone-of-influence analysis to restrict attention to causal variables.
3. Mine assertions from the traces with a decision-tree algorithm.
4. Formally verify the generated assertions.
5. Inspect for trivial, over-constrained, or irrelevant properties and adjust simulation/configuration.

The paper says GoldMine “employs formal verification and static code analysis to derive assertions for Register-Transfer Level (RTL) designs” (section I, p. 2). It reports a Rigel RTL evaluation that captured simple and complex behavior, including temporal relationships across logic levels, but gives no case count or coverage denominator in this survey. Its evidence is therefore a qualitative capability report.

Failure assumptions are substantial: assertion quality depends on diverse simulation data; heuristics can produce trivial properties; temporal behavior needs tuning; and the tool supports Verilog RTL, not SystemVerilog or gate-level designs. Inference: the Verus analogue is trace-guided candidate generation for Rust branches, state transitions, and contracts, followed by Verus checking. Use `requires`, `ensures`, and loop `invariant` candidates, then require the Verus verifier to accept them; simulation traces alone cannot establish soundness. A Rust/Verus miner would need a static dependency analysis over supported code and an explicit warning that unexecuted paths are uncovered.

## technique 2: Dynamic Dependency Graph (DDG) mining

DDG mining extracts signal relationships from use cases, generalizes them, and model-checks the result (section II-B, p. 2). The steps are:

1. Generate a dynamic dependency graph from one or more use cases.
2. Extract initial properties describing signal dependencies.
3. Refine and abstract those properties into generalized, word-level rules.
4. Submit the resulting properties to a model checker.
5. Review scalability, internal-state coverage, redundancy, and inconsistency.

The survey reports that as few as one use case can produce useful properties, and that refinement makes rules less tied to a particular trace. These are stated capabilities, not a controlled one-use-case success rate. The method focuses on observable outputs; internal states may be missed, and graph extraction and model checking can bottleneck on large designs.

Inference: for Verus, construct a dependency graph from reads/writes and state-machine transitions, propose relational contracts, and generalize over inputs before checking each candidate with Verus. The graph is an inference aid; only checked `ensures`/`invariant` obligations count as evidence. Do not use `external_body` on the function under verification to bypass generated obligations. The paper's abstraction idea transfers, but hardware signals, Verus ownership, and Rust aliasing require a new graph definition.

## technique 3: A-TEAM template mining and ILP minimization

A-TEAM mines assertions from execution traces at transaction-level, RTL, and gate-level abstraction. Its user supplies templates and domain metrics. The survey gives a three-step method (section II-C, p. 2): “(1) generate candidate assertions using execution traces and templates, (2) evaluate assertions by injecting testable faults and measuring their fault coverage, and (3) minimize the assertion set using an Integer Linear Programming (ILP)-based approach to retain only assertions that maximize coverage.”

To apply it, select templates appropriate to the design abstraction; generate candidates from traces; inject faults that the assertions should detect; measure each assertion's fault coverage; solve an ILP selecting a compact subset maximizing coverage; then formally or dynamically check the retained set. A-TEAM's strengths are customizable templates, compact high-coverage sets, and broad abstraction-level support. Its costs are ILP and antecedent-justification overhead, template dependence, limited complex-temporal exploration, and heuristic scalability.

Inference: a Verus workflow can treat candidate postconditions, invariants, and transition lemmas as assertions; generate them from tests and state traces; mutate Rust inputs or implementation states as fault surrogates; and select a minimal set by coverage before running Verus. Mutation coverage is evidence about test sensitivity, not proof of correctness. Retained properties must be expressed with valid Verus constructs and checked; an ILP objective must disclose its candidate and mutant denominators.

## technique 4: HARM hint-based mining

HARM and its clustering extension are template-driven miners for LTL assertions (section II-D, pp. 2–3). Apply the method by (1) providing execution traces and user-defined temporal templates, (2) expanding template permutations in parallel across evaluation units, templates, and permutations, (3) scoring candidates with context-aware user metrics, (4) filtering and ranking the candidates, and (5) optionally clustering the set to reduce redundancy. The survey describes three-level parallelization, configurable ranking, and filtering as the core method.

The paper reports that HARM scales with input size and outperforms state-of-the-art miners in speed and assertion quality in its cited experiments, but this survey gives neither the benchmark denominator nor the exact speed/quality values. It also reports that HARM generates substantially more assertions than other miners without necessarily improving design-behavior coverage. Limitations are template dependency, metric-calibration complexity, unknown behaviors outside templates, ranking bias, incomplete traces, and assertion explosion.

Inference: use the same pattern for Verus by supplying temporal/state-transition templates, generating candidate `invariant`s and transition contracts, ranking by proof progress and mutation coverage, and pruning redundant candidates before solver runs. Verus does not accept LTL directly; encode only the supported state-machine properties and mark any temporal encoding as an inference. Solver success is not a reason to retain a redundant or over-constraining contract.

## technique 5: ARTmine association-rule mining

ARTmine mines temporal assertions from simulation traces using association rules and configurable thresholds (section II-E, pp. 3–4). The steps are:

1. Collect traces from the design under verification.
2. Mine temporal association rules, tuning thresholds toward rare or corner behavior.
3. Convert selected rules into temporal assertions.
4. Retain a minimal, relevant set and check it against the design.
5. Evaluate mutation detection, scale, and unsupported temporal patterns.

The survey reports strong mutant detection, fewer assertions than HARM and GoldMine, support for several temporal patterns, and handling of medium-to-large designs. It does not provide a common table of numerator/denominator results. The stated limits are predefined temporal patterns, thresholds that can discard rare behavior, and potentially exponential overhead with extremely many I/O or state variables.

Inference: a Verus version can mine transition relations and quantified invariants from traces, prioritize rare state combinations, and turn accepted candidates into `invariant` clauses or proof lemmas. A trace-derived candidate remains a hypothesis until Verus checks it over the model's full quantified domain. Thresholds and mutant counts must be reported; rare traces cannot justify claims about all inputs.

## cross-cutting lessons and product threat

The survey's common pattern is candidate generation followed by a formal or simulation check, with quality controlled by data diversity, templates, minimization, and coverage. It also names “manual assertion generation” as costly, time-intensive, and error-prone (section I, p. 1). The miners differ in where they get hypotheses: static cones and decision trees (GoldMine), dependency graphs (DDG), templates plus ILP (A-TEAM), template/ranking/parallel search (HARM), or association rules (ARTmine).

What is proved or measured varies. Formal model checking of a generated property can prove that property under the model; mutation or fault coverage measures detection of injected faults; trace mining measures observed behavior. None proves that the mined assertion set captures the complete intended specification. Trusted elements include simulation traces, fault models, templates, thresholds, abstraction, model-checker semantics, and the human's interpretation of the design requirement.

Inference: threat to agent-written verified Rust is high when a miner turns observed executions into apparently authoritative contracts. The product could become unsound by accepting an over-constraining precondition, missing an untraced branch, or treating mutation coverage as completeness. The safe use is candidate generation plus mandatory Verus checking and explicit coverage/assumption reports. VL should not redo this survey's catalogue of hardware miners; it should test which Rust/Verus hypothesis sources reduce proof-authoring effort without increasing false confidence.

## techniques for the catalog

- trace and static mining: generate candidates from simulations and causal static analysis, then formally check them
- dependency-graph mining: extract signal/state relations, refine and abstract them, and model-check generalized properties
- template plus ILP selection: generate template candidates, measure injected-fault coverage, and retain a compact maximizing subset
- parallel hint mining: search template permutations in parallel, rank with context-aware metrics, filter, and cluster
- association-rule mining: discover temporal rules in traces, tune corner-case thresholds, and convert rules to assertions
- coverage hygiene: treat traces, fault coverage, thresholds, and model checking as separate evidence with explicit blind spots
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
