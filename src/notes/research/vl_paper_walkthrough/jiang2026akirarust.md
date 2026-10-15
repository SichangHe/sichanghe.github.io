# AkiraRust: Re-thinking LLM-aided Rust Repair Using a Feedback-guided Thinking Switch
(authored by agents unless marked 🧑)
Tag: `jiang2026akirarust`, [paper](http://arxiv.org/abs/2602.21681v1)

## scope and contribution

The paper presents AkiraRust, an LLM-driven framework for repairing undefined behavior (UB) in Rust. Its central mechanism is a finite-state machine (FSM) that chooses repair agents and reasoning modes from runtime semantic feedback. The abstract states: “AkiraRust introduces a dual-mode reasoning strategy that coordinates fast and slow thinking across multiple agents.” (Abstract, p. 1) The abstract also says: “Each agent is mapped to an FSM state, and a waveform-driven transition controller manages state switching, rollback decisions, and semantic check pointing, enabling context-aware and runtime-adaptive repair.” (Abstract, p. 1)

Inference: For VL, the transferable idea is a verification-driven controller around an LLM repair loop: generate a candidate, observe executable or verifier feedback, select a specialized next action, and roll back when the candidate drifts. This is an architectural transfer; the paper repairs unsafe Rust with Miri and generated tests, rather than proving Rust contracts in Verus.

The paper evaluates on a Miri dataset covering “47 common UB types, including allocation errors, concurrency, data races, and borrow violations” (Sec. 5, p. 5). It uses GPT-4, GPT-5, and Claude-3.5 at default temperature 0.5 (Sec. 5, p. 5). The reported metrics are pass rate, code passing Miri, and exec rate, code passing TestGenAgent semantic checks (Sec. 5, p. 5).

## technique 1: defect-feature agent selection

What it is. AkiraRust first matches a defect’s semantic feature to agents specialized for assertion insertion, code modification, Safe Rust replacement, knowledge retrieval, or test generation. The motivation is empirical: Table 1 records, for six unsafe-Rust case features, the number of repair rounds and each agent’s effectiveness. The paper explains: “Cases 1, 2, 4, and 5 show that a properly selected single agent nearly matches qtotal, indicating that an appropriately selected single-agent already captures the core structure, and additional agents contribute little beyond redundant hypotheses.” (Sec. 2.1, p. 2)

When to use it. Use this selection when the defect type is recognizable—for example, an access violation, size mismatch, dangling pointer, retag write, or atomic access. The paper’s corresponding insight is: “Aligning agent with defect features is crucial, as appropriate coordination markedly enhances repair and semantic accuracy.” (Sec. 2.1, p. 2)

How to do it.

1. Detect the UB with a static or dynamic tool such as Miri and classify its feature. (Sec. 4.1, p. 3)
2. Maintain specialized actions: assertion for safety preconditions, modification for value or semantic correction, replacement for a Safe Rust equivalent, and knowledge retrieval for relevant repair experience. (Secs. 2.1 and 4.1.1, pp. 2–4)
3. Prefer the agent whose historical q_agt is high for the detected feature; add agents only when the feature needs coordination. Table 1 defines q_total as overall semantic accuracy and q_agt as an individual agent’s effectiveness (Sec. 2.1, p. 2).
4. Pass the selected candidate to semantic evaluation and continue with the transition mechanism below. (Sec. 4.1.1, p. 4)

Inference: In Verus, the classifier can select a proof-repair action based on the verifier diagnostic: add a precondition (`requires`), strengthen a postcondition (`ensures`), add a loop invariant, rewrite a ghost lemma, or replace an implementation. These are Verus constructs documented in the local Verus notes; the paper itself does not define this mapping.

Evidence. In Table 1, the six rows have N values 14, 14, 13, 12, 11, and 10, with q_total values 0.50, 0.50, 0.692, 0.75, 0.909, and 1.00, respectively (Sec. 2.1, p. 2). These denominators are repair rounds per case, not percentages over the complete 47-type dataset. The paper gives no confidence intervals or aggregate sample count for Table 1.

Failure and assumptions. The paper says unsafe Rust errors arise from a finite, structured set and that inappropriate actions can cause semantic inconsistency (Sec. 2.1, p. 2). Inference: this technique assumes a useful defect taxonomy and enough historical data to estimate q_agt; an unseen defect or a misclassified verifier failure can route the repair to the wrong action.

## technique 2: dual-mode fast/slow reasoning

What it is. Fast thinking produces a quick heuristic candidate; slow thinking performs detailed, step-by-step semantic reasoning about ownership, lifetimes, and code structure. The paper reports that fast thinking performs better on simple defects, while slow thinking becomes more accurate and interpretable as complexity increases (Sec. 2.2, p. 2). Its explicit insight is: “Effective repair requires switching between fast and slow thinking based on Rust code features to balance efficiency and accuracy.” (Sec. 2.2, p. 2)

When to use it. Use fast mode for simple, local defects where minimal iterations are expected. Switch to slow mode for complex, context-dependent ownership, lifetime, aliasing, or cross-module repairs. The paper’s 100-sample comparison uses Rust library and open-source-project samples classified at complexity levels 1–5 by lines of code and experienced engineers (Sec. 2.2, p. 2).

How to do it.

1. Assign a complexity level from 1 (simple) to 5 (complex). (Sec. 2.2, p. 2)
2. Invoke a fast-thinking agent for low complexity, producing a candidate with minimal computation. (Sec. 2.2, p. 2)
3. For high complexity, invoke a slow-thinking agent that reasons through structure and ownership/lifetime rules. (Sec. 2.2, p. 2)
4. Measure repair time and semantic accuracy; switch mode when the current mode requires repeated iterations or produces semantic drift. (Secs. 2.2 and 4.1.2, pp. 2–4)

Inference: A Verus implementation can use a fast pass to make local annotation or trigger changes, then a slow pass to inspect quantifiers, invariants, and proof dependencies. Verus does not expose the paper’s “thinking modes” as language constructs; they are orchestration policy outside the verified Rust.

Evidence and limits. Figure 2 reports 92% success for fast thinking on simple defects and says slow thinking surpasses fast thinking for complex repairs; fast thinking incurs more than 3× overhead in those complex cases (Sec. 2.2, p. 2). The paper does not state the denominator for the 92% figure in the text surrounding Figure 2, so that percentage cannot be independently converted to a count from the paper.

## technique 3: FSM repair orchestration

What it is. The FSM makes each agent or reasoning mode a state and uses runtime signals to choose transitions. The formal definition is the six-tuple FSM = (Σ, S, s0, F, δ, λ), where Σ contains Rust programs or candidates, S contains initial, agent, rollback, error, and final states, δ maps a state and input to the next state, and λ outputs repair code (Sec. 4.1, p. 3). The paper states: “For a Rust program detected with UBs by static or dynamic tools (e.g., Miri), AkiraRust initializes it as the FSM’s initial state q0, with input symbols Σ determined by the error type and semantic context.” (Sec. 4.1, p. 3)

How to do it.

1. Set q0 as the initial state for a detected UB. (Sec. 4.1, p. 3)
2. Encode the error type and semantic context as the input signal.
3. Transition to an agent/mode state and emit a repair candidate through δ and λ. (Sec. 4.1, p. 3)
4. Compile, run Miri, and run semantic checks. Reach qF only when the candidate passes; enter qErr after the maximum transition limit. (Sec. 4.1, p. 3)
5. Use the transformation rule δ:(St, αt) ↦ (St+1, At+1), where αt is the runtime signal vector, to choose the next state and action. (Sec. 4.1.2, p. 4)

Inference: In Verus, the FSM can sit outside the proof object and invoke a verifier repeatedly. A candidate state can contain the Rust source plus diagnostics; a transition can select annotation repair, lemma repair, or implementation repair. The resulting proof remains checked by Verus, while the controller itself is trusted orchestration code unless separately verified.

Evidence. In the representative complex UB case, RustBrain’s direct rollback required four rounds and 23 agent invocations, whereas AkiraRust completed the repair with seven agent invocations (Sec. 5, p. 6). These are invocation counts for that single representative case, not averages over the dataset.

Failure and assumptions. The paper notes that each transition introduces a semantic checkpoint and therefore evaluation overhead (Sec. 3, p. 3). Inference: an FSM can oscillate or terminate prematurely if signals are noisy, the transition limit is too low, or the defect taxonomy lacks a matching state.

## technique 4: TestGenAgent intent-guided semantic validation

What it is. TestGenAgent converts an inferred repair intent into tests and accepts a candidate only when at least one semantic variant passes all generated tests. The paper describes: “Given a repaired candidate, TestGenAgent first summarizes key code features and infers potential modification points” (Sec. 4.1.1, p. 4), then derives behavioral constraints, produces variants, and synthesizes unit tests. It uses Rust’s built-in `cargo test` pipeline (Sec. 4.1.1, p. 4).

How to do it.

1. Summarize key features of the candidate and identify modification points such as allocation/deallocation pairs or alignment-sensitive operations. (Sec. 4.1.1, p. 4)
2. Infer intent-aligned semantic constraints from those points. (Sec. 4.1.1, p. 4)
3. Generate repair-aware semantic variants and unit tests that exercise the inferred behavior. (Sec. 4.1.1, p. 4)
4. Accept the repair only if at least one variant passes all generated tests. (Sec. 4.1.1, p. 4)

Inference: In Verus, generated tests are useful as a complement to proof checking, but they cannot replace `ensures`, `requires`, invariants, or proof obligations. A Verus-oriented TestGenAgent could generate concrete tests to expose specification mistakes and then ask Verus to prove the specification for all permitted inputs.

Evidence. Table 2 reports True Positive 0.78, False Negative 0.10, False Positive 0.05, and True Negative 0.07, summing to 1.00; the paper calls this 85% accuracy and describes 10% false negatives plus 5% false positives (Sec. 4.1.1, p. 4). Inference: the stated “85% accuracy” does not follow from the displayed entries if accuracy means TP + TN (0.78 + 0.07 = 0.85, which does match), but the denominator is not supplied beyond normalized table proportions.

Failure and assumptions. False negatives can classify unsafe behavior as normal, and false positives can trigger unnecessary checks or rollbacks (Sec. 4.1.1, p. 4). Inference: the method assumes the generated tests capture the developer’s intent; passing tests can still miss an untested behavior.

## technique 5: waveform-guided hallucination control and rollback

What it is. AkiraRust turns runtime error categories into a fixed-dimensional signal f(t) = [U(t), G(t), I(t), L(t), C(t)], normalizes the signal, and computes a defect-evolution waveform E(t) = Σi wi·gi(fi(t)). The categories are unchecked operations, global objects, interoperability, low-level control, and concurrency objects (Sec. 4.2, p. 5). The paper states: “When detected, AkiraRust stops further modifications and rollback to the initial code state.” (Sec. 4.2, p. 5)

How to do it.

1. After each state transition, collect UB reports, semantic information, and structural logs. (Sec. 4.2, p. 5)
2. Map them to f(t), normalize the components, and compute E(t), weighting categories by historical frequency and severity while smoothing temporal persistence. (Sec. 4.2, p. 5)
3. Define rollback points when E(t) fluctuates sharply or exceeds a threshold. (Sec. 4.2, p. 5)
4. Define semantic-evaluation points when E(t) stabilizes in a low-variance region; evaluate the candidate there. (Sec. 4.2, p. 5)
5. On rollback, return to the initial or lowest-incorrectness candidate and choose another state or mode. (Secs. 4.2 and 5, pp. 5–6)

Inference: For Verus, the waveform can aggregate failed verification-condition counts, diagnostic categories, proof time, and model-counterexample severity. This is an external controller metric, not a Verus proof of semantic correctness; the trusted proof boundary remains Verus and its admitted axioms or external bodies.

Evidence. The paper reports that high temperature without rollback had 67% success and 1.8 hallucination score, while high temperature with rollback had 72% success and 0.6 hallucination score; Figure 3 supplies these values but does not state a denominator in the prose (Sec. 2.3, p. 3). Across LLM configurations, AkiraRust’s exec rates are reported as approximately 85–95%, compared with standalone LLM rates typically 25–50% (Sec. 5, p. 5); these are percentages over the paper’s evaluation samples, whose exact per-configuration denominator is not given in the text.

The paper’s overall comparison reports 92% semantic correctness for AkiraRust, a 15% increase over RustAssistant and a 50% increase over RustBrain, plus about 2× speedup against RustBrain (Sec. 5, p. 6). Table 3’s final row gives average times of 218.4 seconds for RustBrain, 101.4 for AkiraRust+GPT-5, 114.6 for GPT-4, 147.3 for Claude-3.5, and 442 seconds for humans, with a stated 2.2× speedup (Table 3, p. 7). Inference: the table’s “speedup” is human time divided by AkiraRust+GPT-5 time (442/101.4 ≈ 4.36), so the displayed 2.2× appears to use a different baseline or aggregation; the paper does not reconcile this denominator.

## what is proved, measured, and trusted

The paper measures Miri pass rate, TestGenAgent exec rate, agent invocations, and execution time. It does not provide a machine-checked proof that the FSM, waveform, generated tests, or LLM repairs preserve the original program intent. Inference: for VL, the untrusted LLM/controller may propose arbitrary annotations or code, but Verus must check the final contracts; any `assume`, `axiom`, `external_body`, or unverified specification remains part of the trusted base and must be audited.

Inference: The product threat is substantial when “passing” means only compilation, Miri, or generated tests: these checks can accept a semantically wrong repair. The paper itself motivates this gap by observing that repairs can pass security tools while deviating from intended semantics (Sec. 1, p. 1). VL should reuse the feedback-loop architecture while retaining proof obligations as the acceptance gate.

## what VL should not redo

Inference: VL should not reimplement a generic finite-state controller, fast/slow routing, rollback on worsening feedback, or intent-guided test generation from scratch. These are already explicit in AkiraRust. VL still needs a Verus-specific signal taxonomy, specification-repair actions, proof-state persistence, and a policy for trusted assumptions because those are outside this paper.

## techniques for the catalog

- defect-feature agent selection: classify the UB or proof failure and route it to a specialized repair action
- dual-mode reasoning: use fast heuristic repair for simple cases and slow semantic reasoning for complex cases
- FSM orchestration: represent agents and modes as states and transition using runtime verification feedback
- intent-guided test generation: infer behavioral constraints and accept candidates that pass generated tests
- waveform rollback: aggregate runtime error signals, evaluate stable regions, and roll back on semantic drift
Checked 2026-10-14 against the paper by a Codex agent: audit record jiang2026akirarust; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
