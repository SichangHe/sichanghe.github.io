# Agora: Toward Autonomous Bug Detection in Production-Level Consensus Protocols with LLM Agents
(authored by agents unless marked 🧑)
Tag: `liu2026agora`, [paper](https://arxiv.org/abs/2605.29910)

## scope and contribution

Agora combines domain knowledge, hypothesis-driven testing (HDT), and three specialized LLM agents to find protocol-level logic bugs in consensus implementations. The paper defines a vulnerability hypothesis as `H=(C,A,E,O)`: preconditions, action sequence, expected buggy behavior, and oracle assertions (Section 2.1, p. 2). Its abstract claims: "Agora employs specialized agents that collaboratively explore protocol state spaces, synthesize attack scenarios using domain-specific constraints, and validate findings through iterative refinement." (Abstract, p. 1).

The target distinction is safety/liveness violations in consensus logic, rather than low-level implementation defects. The paper states: "Therefore, the goal of Agora is to construct an automated loop that follows the HDT paradigm and continuously discovers bugs by generating, instantiating, and validating vulnerability hypotheses." (Section 2.1, p. 2) The five bug classes are Recovery & Execution Divergence, Persistence & Monotonicity Violations, Dependency & Topology Flaws, Message Binding & Signature Violations, and Resource & Operational Visibility Violations (Section 2.2, p. 3). The evaluated repositories are etcd Raft, efficientEPaxos, relabHotStuff, and Sui BullShark (Section 4.1, p. 6).

## technique: hypothesis-driven attack generation

When to use it: use HDT when ordinary tests cover expected behavior but miss state-dependent protocol failures spanning crashes, recovery, message order, and conflicting operations.

How to apply it:

1. Summarize repository knowledge: protocol type and settings, language, and testing methods (Section 3.4, p. 6).
2. Maintain bug patterns distilled from confirmed historical issues and protocol constraints for CFT versus BFT (Sections 3.3–3.4, pp. 5–6).
3. Construct `C` by selecting node behavior and protocol state conditions; construct `A` by controlling joins, crashes, recovery, message order, and conflict relationships (Section 3.5, p. 6).
4. Predict `E`, then encode `O` as assertions in a generated unit test (Section 2.1, p. 2).
5. Execute the test and inspect both assertion output and whether the failure is an invalid test or a real protocol violation (Section 3.5, p. 6).

Verus form: Inference: encode `C` as `requires` on a protocol operation, `E` as post-state predicates in `ensures`, and `O` as `assert` or lemma checks over ghost histories. Message reordering and crash/restart become explicit transition inputs. HDT remains a scenario generator; Verus proves the safety property for all allowed transitions once the scenario reveals the right invariant.

Evidence: Agora found 15 unique zero-day protocol logic bugs across four repositories (Abstract, p. 1; Section 4.2, p. 7). The 15 are distributed across all five categories; Recovery & Execution Divergence and Persistence & Monotonicity each account for four, Dependency & Topology three, and Message Binding and Resource Visibility two each (Section 4.2, p. 7).

Limits: scenarios and labels depend on repository knowledge, bug patterns, and LLM judgment. The authors state, "Although our system has demonstrated significant effectiveness and has uncovered many zero-day logic bugs in consensus implementations, it still requires a certain amount of human knowledge." (Section 5, p. 8).

## technique: decoupled orchestrator, strategy, and test-generation agents

What it is: separate workflow control/state memory, protocol-specific scenario reasoning, and executable test synthesis. The workflow has 12 subtasks (Figure 2, p. 3).

How to apply it:

1. Orchestrator performs bug exploitation over prior findings and state analysis to prevent duplicate exploration (Algorithm 1, p. 4).
2. Orchestrator sends that compact context to Strategy (Steps 1–3, Section 3.5, p. 6).
3. Strategy analyzes constraints and context, then creates attack scenarios and returns them (Steps 4–7, p. 6).
4. Orchestrator updates global state and forwards scenarios to TestGen (Step 8, p. 6).
5. TestGen generates a unit test, runs it, and analyzes results; on failure it iterates in a reflection loop up to `num_iter` (Steps 9–11, p. 6).
6. A successful test report returns to Orchestrator as a discovered bug (Step 12, p. 6).

Verus form: Inference: Strategy can propose ghost-state scenarios; TestGen can produce Rust harnesses and candidate proof lemmas; Orchestrator can maintain a finite ledger of already-tested state predicates. Only checked Rust proofs and tests should be trusted, not agent messages.

Evidence: removing any single component reduces ablation discovery from the complete system’s 11 bugs to at most 3; removing state-analyzer, scenario-generator, or reflection-loop finds zero (Table 2, p. 7). Without state analysis, the run consumes 79.6M tokens while repeating contexts; without scenario generation it consumes 233.1M tokens (Section 4.3, p. 8).

Limits: multi-agent coordination does not itself establish correctness. A generated test can fail because the test is invalid; TestGen explicitly distinguishes those cases (Figure 2, p. 3). Human inspection remains necessary.

## technique: protocol-constraint filtering

CFT and BFT permit different fault assumptions. Agora’s constraints analyzer prevents impossible CFT adversary scenarios and directs Strategy toward feasible state spaces (Section 3.3, p. 5). Removing it leaves one HotStuff bug but produces 107 CFT reports, none true logic bugs (Section 4.3, p. 8). This is a direct lesson for verification: state assumptions must be encoded before generating obligations.

Verus form: Inference: define protocol-mode-specific `spec fn` predicates for crash versus Byzantine transitions and require each lemma to state its fault model. A proof that assumes Byzantine behavior for a CFT implementation would prove an irrelevant or impossible system.

## what is measured, trusted, and already done

The complete system using Gemini 3.0 Pro Preview finds 11 protocol-level bugs; across four LLM backends it finds 15 unique bugs (Section 4.2, p. 7). Among 46 generated reports, 34 are real protocol-level bugs, giving a 26.1% false-positive rate (Section 4.2, p. 7). Baseline LLMs find 22 implementation bugs, demonstrating a different target rather than a directly comparable proof result (Section 4.2, p. 7). The system reports an average 5.32M tokens per discovered bug, approximately $40 (Section 4.3, p. 8).

Trusted: repository code and test infrastructure, bug-pattern summaries, protocol constraints, LLM outputs, and manual classification of reports.

## techniques for the catalog

- hypothesis-driven testing — represent vulnerability preconditions, actions, expected behavior, and oracle assertions explicitly
- role-decoupled agents — separate orchestration/state, protocol scenario synthesis, and executable test generation
- reflection-loop test repair — run generated tests, analyze failures, and regenerate up to a bounded retry count
- protocol-constraint filtering — constrain CFT/BFT scenarios to the deployment’s actual fault model
- bug-pattern exploitation — use historical bug instances to derive deeper related scenarios
- global-state deduplication — summarize explored states so agents avoid repeating equivalent attacks
