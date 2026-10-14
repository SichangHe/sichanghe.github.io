# CaMeLoT: CaMeL orchestrated with Temporal logic for static verification and liveness
(authored by agents unless marked 🧑)
Tag: `nikolaou2026camelot`, [paper](http://arxiv.org/abs/2609.18674v1)
## scope and central idea
CaMeLoT adds static temporal model checking to CaMeL, an agent framework that already enforces capability policies at tool-call time. A privileged LLM emits restricted Python; CaMeLoT extracts its AST, builds a finite-state transition system with tool calls, provenance, taint, and history labels, and checks CTL policies with nuXmv before execution. The abstract states: “CaMeLoT extends CaMeL by adding a static verification layer that checks an agent’s plan before any tool is invoked.” (abstract, p. 1). A failing check returns a counterexample trace that is converted into feedback for plan repair.

Inference: For Verus, the transferable pattern is to verify an agent-generated Rust plan or proof patch against temporal and safety properties before applying it, while retaining ordinary Verus checking and runtime tests. This paper does not evaluate Rust or Verus.

## technique 1: AST-to-finite-state plan abstraction

What it is. The restricted plan is parsed into an AST and split into TOOL CALL, ASSIGNMENT, CONDITIONAL, and LOOP regions. States represent program points; transitions represent possible steps; labels record atomic propositions. Loops use nondeterministic iteration/exit transitions, yielding a finite over-approximation (Sections 3 and 3.2, pp. 5–9).

How to apply it.
1. Normalize the generated plan without changing behavior (Section 4, p. 10)
2. Traverse its AST and extract regions, variables, arguments, successors, and tool signatures (Section 4, pp. 10–11)
3. Create `M=(S,s0,Δ,Σ,L)` with finite states, initial state, transitions, effects, and labels (Section 3.2, p. 8)
4. Emit branch/merge states for conditionals and entry/body/exit states for loops
5. Encode loops as nondeterministic continue-or-exit transitions to keep the state space finite (Section 3.2, p. 8)
6. Preserve the branching structure relevant to policy violations, then send M to nuXmv

Verus form (Inference). Build a control-flow graph for generated Rust/proof actions and attach labels such as “lemma called,” “unsafe operation,” or “external effect.” The finite abstraction can check ordering before invoking Verus, but Verus remains the authority for functional correctness. A Rust loop abstraction must be conservative and may produce false positives, just as CaMeLoT documents.

Limits. The model abstracts conditions and treats tools as black boxes; it can block safe plans or fail to verify properties requiring finer detail (Section 6, pp. 18–19). Arbitrary Python loops and uncontrolled breaks are excluded (Section 3.2, p. 8).

## technique 2: provenance lattice and conservative taint propagation

What it is. Variables receive provenance in the ordered lattice `trusted < user < untrusted < qllm`; derived values inherit the maximum provenance of dependencies (Section 3.2, p. 8). Tool arguments are labelled trusted or tainted, allowing CTL policies to refer to stable argument propositions even when call syntax varies.

How to apply it.
1. Assign each literal, user value, external-tool output, and Q-LLM output a provenance class
2. Propagate the maximum class through assignments and expressions
3. Normalize positional/keyword tool arguments using tool signatures (Section 4, p. 10)
4. Emit propositions such as `recipient_trusted` or `recipient_tainted`
5. Write CTL safety policies over those propositions, for example `AG(call_send_direct_message -> recipient_trusted)` (Sections 3.1–3.2, pp. 7–9)

Verus form (Inference). Attach ghost taint labels to values crossing trust boundaries and require trusted labels in proof lemmas before security-sensitive operations. Because Verus does not execute an agent plan as a model checker, this layer should be a separate pre-check or ghost policy checker; runtime ownership and functional proofs remain separate.

Evidence. In the running example, a Q-LLM-derived email becomes tainted and the subsequent direct-message call violates the CTL rule; nuXmv emits a trace reaching the call with `recipient_tainted = TRUE` (Section 3.2, pp. 8–9). CaMeLoT conservatively marks unknown or conditionally trusted values tainted, while dynamic reader confidentiality stays with CaMeL (Section 4, p. 10).

Limits. Over-tainting can reject safe plans; static analysis cannot resolve dynamic reader sets or runtime capabilities (Sections 4 and 6, pp. 10, 18–19).

## technique 3: CTL policies for safety, ordering, and liveness

What it is. CTL combines path quantifiers A/E with temporal X (next), F (eventually), G (always), and U (until). The paper explains: “Thus, AG φ states that φ holds in every state along every path; AF φ states that φ eventually holds along every path; and A[φ U ψ] states that, on every path, φ holds until ψ becomes true.” (Section 3, p. 6).

How to apply it.
1. Define atomic propositions for calls, taint, provenance, and history
2. Express local safety as `AG(call a -> condition)`
3. Express required completion as `AF(done)` or triggered liveness as `AG(call a -> AF(call b))`
4. Express ordering with `A[¬call b U call a]` or history predicates
5. Select only policies relevant to tools/actions in the plan and model-check them with nuXmv (Sections 3.1 and 4, pp. 7, 11)

Verus form (Inference). Encode CTL-like obligations over a ghost event trace or finite protocol state. Safety corresponds to invariants; ordering corresponds to state-machine predicates; liveness requires a termination/fairness argument and is not supplied by ordinary `ensures`. Use Verus for per-step invariants and a separate temporal checker for the generated plan.

Evidence. Seven SOC properties were tested: CaMeLoT caught all seven unsafe fixed-plan variants, while a simplified CaMeL baseline caught only the taint-style S7 (Table 5, pp. 14–15). Four P-LLM-generated unsafe plans were also all caught by CaMeLoT and none by CaMeL (Table 6, p. 15). The denominator is seven variants in Table 5 and four tests in Table 6.

## technique 4: counterexample-guided plan repair

What it is. If nuXmv finds a violating path, CaMeLoT converts the counterexample into natural-language feedback and prompts the P-LLM to repair the plan; verification repeats until acceptance or a repair budget is exhausted (Section 3, p. 6). The authors connect this to CEGAR.

How to apply it.
1. Generate and statically verify a plan
2. If a policy fails, capture the violated formula and counterexample state sequence
3. Summarize the path, likely program location, and violation type
4. Ask the planner to modify the plan
5. Re-extract, rebuild, and re-check; stop on success or budget exhaustion (Sections 3.2 and 4, pp. 9, 11)

Verus form (Inference). Feed Verus diagnostics, failed assertions, and a minimized counterexample trace back to an agent proposing a patch. Re-run both temporal checks and `cargo verus`; cap repair iterations and retain all candidate diffs. This mirrors the control loop but does not establish semantic equivalence automatically.

## technique 5: typed task-property extraction with trusted grounding

What it is. The LLM does not write CTL directly. It proposes typed obligations such as existence, precedence, response, enabled reachability, absence-after, next-step prohibition, and side-effect allowlists; trusted code validates vocabulary and compiles them into CTL (Section 5.3, pp. 16–18). The paper states: “The LLM never writes CTL directly; instead, it proposes a small language of typed obligations, which is then grounded and compiled into CTL formulas by trusted code.” (Section 5.3, p. 16).

How to apply it.
1. Give the proposer the user prompt and fixed tool/atom vocabulary
2. Accept only a typed obligation form
3. Ground tool names and atoms; reject unknown or malformed obligations
4. Compile the typed form to CTL, e.g. response `a requires eventual b` becomes `AG(call a ⇒ AF(call b))`
5. Install the formula alongside security policies and verify the plan (Table 7, pp. 16–17)

Verus form (Inference). Let an LLM propose a typed obligation such as `after allocating, eventually initialize`, then compile it with trusted code into a Verus invariant/lemma template. Never concatenate model text directly into executable proof code or policy formulas.

Evidence. Across 97 AgentDojo tasks, exact required side effects were recovered for 85/97 (87.6%) and faithful conditional sets for 88/97 (90.7%); vocabulary and grounding survival were 100% (Table 9, p. 17). In 20 controlled enforcement cases, all 20 good plans passed and all 20 bad plans were blocked, matching handwritten CTL (Table 11, p. 19). Direct CTL generation was less reliable: for GPT-4.1 nano only 12/97 tasks were clean, with 182 valid, 54 malformed, and 419 ungrounded outputs (Table 10, p. 18), whereas the typed Haiku pipeline had 97/97 clean tasks and 182/182 valid outputs.

Limits. Extraction accuracy is benchmark-specific and depends on a fixed vocabulary. Static checks can over-taint and cannot see dynamic readers; accepted plans may still be rejected by CaMeL at runtime (Section 6, pp. 18–19).

## proved, trusted, and product threat
The paper measures policy coverage, agreement, temporal-property detection, extraction accuracy, and controlled enforcement. In AgentDojo, static coverage was 22/28 CaMeL policies; the remaining six needed runtime state (Section 5.1, p. 12). Across 97 tasks, both systems had 42 passes, 22 failures, and 17 blocks; CaMeLoT-only pass was 9 and CaMeL-only pass 7 (Table 3, p. 13). Trusted components include AST extraction, typed grounding/compiler, nuXmv, and CaMeL runtime enforcement. The finite model is an abstraction, so model-checking a plan does not prove tool internals or dynamic confidentiality.

Inference: Threat to agent-written verified Rust is medium to high for temporal safety and workflow ordering: a pre-execution model can reject unsafe sequences and provide useful counterexamples, but finite abstraction and over-tainting can block valid plans. VL should not redo generic CTL model checking or typed-grounding lessons; it should connect such a gate to Verus proof checking, ownership effects, and explicit runtime side effects.

## techniques for the catalog
- AST-to-FSM abstraction: convert restricted agent plans into finite control-flow models with labelled effects
- provenance taint lattice: conservatively propagate trust levels and expose taint propositions to policies
- CTL temporal policies: express safety, ordering, next-step, until, and liveness requirements over plan states
- counterexample-guided plan repair: feed model-checker traces back to the planner and repeat verification
- typed obligation grounding: compile constrained LLM proposals to CTL through trusted vocabulary checks
Checked 2026-10-13: audit record nikolaou2026camelot; paper-study comparison complete; gate executed; experiments not rerun
