# Data for Mathematical Copilots: Better Ways of Presenting Proofs for Machine Learning
(authored by agents unless marked 🧑)
Tag: `frieder2024data`, [paper](http://arxiv.org/abs/2412.15184v2)

## scope and central claim

The paper studies what data and evaluation must contain if a language model is to become a useful mathematical copilot rather than a system that emits plausible final answers. Its central diagnosis is that common datasets map a theorem statement directly to a final proof and therefore omit proof discovery, tool interaction, error recovery, and mathematical workflow. The abstract states: “In particular, it is necessary for benchmarks to move beyond the existing result-based datasets that map theorem statements directly to proofs, and instead focus on datasets that translate the richer facets of mathematical research practice into data that LLMs can learn from.” (Abstract, p. 1.) The authors explicitly include formal mathematics and interactive theorem provers (ITPs), while warning that a single formal system cannot cover all research activity.

For VeruLaw (VL), the relevant lesson is a data and evaluation architecture: retain the complete interaction trace around a verified Rust artifact, and test repair, context sensitivity, resource use, and explanation rather than only whether one final proof checks. Inference: this is a threat to a product that trains agents only on successful Verus snippets, because such a corpus omits the failures and decisions that dominate real verification work.

## technique: represent proving as a mixed-mode tool trajectory

What it is. A mixed-mode datapoint records a short trajectory instead of only an input and final response. The paper gives five components: “(i) natural-language problem context, (ii) intermediate formal objects (expressions, goals, proof states, or formal statements), (iii) tool calls with arguments, (iv) tool outputs (for example, the result of executing code, a CAS simplification, or a proof assistant error message), and (v) a final response that integrates the tool outputs into a mathematically coherent explanation.” (Section 2.0.1, p. 11.) The representation is intended to teach when to call a tool, how to translate between representations, and how to recover from timeouts, type errors, missing imports, and failed searches.

When to use it. Use this format whenever correctness depends on an external checker or solver, or when the work alternates between natural-language planning and formal state manipulation. The paper specifically treats a proof assistant as the tool in paired informal/formal data: correctness is checked by verifying the generated formal artifact, while proof-state information and type errors become intermediate feedback (Section 2.0.1, p. 11).

How to apply it.

1. Store the natural-language request and the current formal goal (Section 2.0.1).
2. Store every attempted tool call, including its arguments (Section 2.0.1).
3. Store the exact tool output, including diagnostics and timeouts (Section 2.0.1).
4. Store the patch or next attempted action and continue until a checked artifact or an explicit failure (Section 4.3.1, p. 36).
5. Pin tool versions, libraries, dependencies, and execution settings so that the trace can be replayed (Section 2.0.1).
6. Separate tasks in which tool use is optional from tasks in which it is required, so evaluation can distinguish mathematical reasoning from tool invocation competence (Recommendations, Section 2.0.1, p. 11).

Verus form. Inference: represent each trajectory as a record outside executable Rust containing the user goal, Verus source revision, verifier invocation, diagnostics, and successive patches. The final source can use ordinary Verus contracts (`requires`, `ensures`), loop `invariant` clauses, and proof functions, while the trajectory corpus records failed attempts rather than weakening the contract with `external_body`. Inference: replay should invoke a pinned Verus toolchain and check the final function and its specifications; proof-only code is erased for execution, so the replay record must retain both verification output and the executable build result.

Evidence and limits. The paper does not report a new model trained on this trajectory format. It presents the format as a recommendation and notes that tool outputs vary with toolchain version, library state, and sometimes randomness (Section 2.0.1, p. 11). Inference: evidence for VL is therefore methodological, not a measured Verus gain. The assumption is that recorded traces are sufficiently complete to replay; hidden environment state violates that assumption.

## technique: make formal benchmarks specify the task and environment

What it is. The paper argues that a single success rate is uninterpretable unless the benchmark states the task, input and output, checker policy, automation, resource limits, environment, and metrics. It enumerates five task variants: theorem proving from scratch, tactic prediction, proof repair or hole filling, premise selection, and autoformalization (Section 3.2, pp. 9–10). It then requires input context, accepted artifact, placeholder policy, permitted tactics, time and memory limits, exact prover and library versions, and pass@k or time-to-solution in addition to success rate.

When to use it. Use this protocol for every VL evaluation or product regression claim. A Verus result that does not state which source files, imported specifications, solver settings, attempt budget, and timeout were used cannot be compared with another result.

How to apply it.

1. Declare the task variant and the exact input context, including imported modules and available lemmas (Section 3.2).
2. Define what counts as a valid artifact and reject placeholders such as `sorry` or `Admitted` where applicable (Section 3.2.1, pp. 9–10).
3. Declare permitted automation and whether external automation is counted as part of the model or an oracle (Section 3.2).
4. Pin prover version and library commit, and replay every submission in that environment (Section 3.2).
5. Report wall-clock and memory limits, heartbeat or search budgets, number of attempts, pass@k, average time, and proof length or tactic count (Section 3.2).

Verus form. Inference: a VL benchmark should pin the Verus commit, Rust toolchain, imported crate revisions, solver version and flags, and the exact verifier command. A repair task should expose a hole or failing function and require a patch that compiles and verifies with the original `requires`/`ensures`; accepting a patch that adds `external_body` would change the task and should be disallowed. Inference: report pass@k over independent candidate patches, verification time, and solver resource settings, while recording whether a proof function was used only at verification time.

Evidence and limits. The recommendations are not a controlled experiment. The paper gives a concrete reason for the protocol: “Without these details, two papers can report the same score while solving different tasks under different constraints.” (Section 3.2, p. 10.) Inference: VL product comparisons that omit these fields are claims with an unknown denominator and setting, not evidence of agent quality.

## technique: diagnose failures with structured labels and checker feedback

What it is. Binary correct/incorrect scoring hides why a model failed. The paper recommends structured error and warning codes. GHOSTS uses 15 total error or warning labels, and NaturalProofs-Gen distinguishes 11 error types (Section 3.1.2, p. 14). Formal proof assistants provide diagnostics, but the authors caution that these are often compiler-like rather than high-level explanations of mathematical failure.

How to apply it. Attach a label to each failed attempt; retain the raw diagnostic; distinguish syntax/type/import failures, unsolved goals, timeout, resource exhaustion, and a mathematically false statement; and evaluate both final correctness and diagnostic category. The paper recommends multi-aspect feedback and, as a middle ground, deriving ratings from error and warning codes rather than assigning one opaque number (Section 3.1.2, p. 14).

Verus form. Inference: define a VL error taxonomy covering Rust compilation, Verus elaboration, failed preconditions, failed postconditions, invariant failures, solver timeouts, and specification mismatches. Preserve the verifier message and the source location. Inference: a training example should pair the failing patch with the next repair action, but the label must not be treated as proof of semantic intent; only a successful Verus check establishes the stated contract.

Evidence and limits. The reported counts (15 and 11 labels) are dataset descriptions, not accuracy results. The paper says ITP feedback may still be limited for diagnosing AI systems (Section 3.1.2, p. 14). Inference: labels improve observability but do not establish that an agent understood the underlying algorithm.

## technique: model formal proof engineering as repair and refactoring trajectories

What it is. Section 4.3.1 proposes a repair trajectory corpus with “(i) an attempted proof edit, (ii) compiler/LSP diagnostics (type errors, missing imports, failing goals, timeouts), and (iii) the subsequent patch.” (Section 4.3.1, p. 36.) It also proposes a refactoring corpus containing before/after proofs that improve readability, reduce instance pollution, decrease resource use, or align with library style. Stability and hygiene lints become structured metadata.

How to apply it. Capture each compile–diagnose–fix cycle; preserve the surrounding imports and local context; record lint warnings and resource use; and pair a valid refactoring with its pre-refactoring proof. For a refactoring, compile after each extraction and use diagnostics to locate boundaries, as the paper describes (Section 4.3.1, p. 36). Do not collapse a sequence into only the final source.

Verus form. Inference: apply the same corpus shape to Verus functions and proof functions. A refactoring must preserve the original executable behavior and the original specification; it may extract a `proof fn`, add a lemma call, or make a loop `invariant` explicit, but it must not replace verification with `external_body`. Inference: record solver time and failed obligations before and after the change, since a proof that still checks but becomes fragile or expensive is not a successful maintenance example.

Evidence and limits. This section is a design proposal, not a benchmark with denominators. Its product implication is direct: a one-shot proof generator is measured on the least informative artifact, while the proposed corpus measures the maintenance loop that practitioners actually perform.

## technique: decompose mathematical work into explicit workflows

What it is. The authors recommend a taxonomy of workflow steps, separated into global workflows (for example literature search) and local workflows (for example energy estimates for differential equations). They give an ODE/PDE chain: “ODE/PDE → find functional → compute derivative of functional → bound derivative → reach Gronwall-type inequality” (Section 4.1, p. 27). A mixed-mode datapoint can store the tuple of mathematical objects and tool calls between them.

When to use it. Use decomposition when a proof or verification task contains repeated subgoals, domain-specific transformations, or exploratory choices. It gives an agent intermediate targets and makes partial progress measurable.

How to apply it. Identify the starting artifact; enumerate the transformations; define a checker or expected object at each step; record alternatives and failures; and compose the checked intermediate results into the final argument (Section 4.1). The paper also recommends structured problem analysis for reinforcement learning: normalized statement, definitions and constraints, subgoals, and admissible intermediate claims or failure modes (Section 4.1, p. 26).

Verus form. Inference: decompose a Rust verification task into data-structure invariant, helper lemma, loop invariant, mutation step, and postcondition. Each stage can be a `proof fn` or a local proof block whose facts are consumed by the next stage; executable functions retain their contracts and no proof function is called at runtime. Inference: this decomposition can expose which obligation failed, but it does not eliminate the need to prove aliasing, arithmetic, or solver-sensitive facts.

## technique: evaluate motivated proofs, not only correct proofs

What it is. A motivated proof explains where each step came from. The paper contrasts an unmotivated proof that simply presents a witness with a motivated proof that derives the witness by searching from an unknown. For Cantor’s theorem, it starts with a generic subset `{x ∈ X : P(x)}`, analyzes what is required for it to differ from every `f(y)`, and is forced to choose `P(y)` as `y ∉ f(y)` (Section 4.4.1, pp. 37–38). For nilpotent units, it parameterizes a generic polynomial inverse, equates coefficients, and uses nilpotence to truncate the polynomial (Section 4.4.1, p. 37).

How to apply it. Give the model an unmotivated proof and ask it to explain the construction; score whether each construction is derived from constraints rather than merely narrated; include positive and negative examples; randomize example order; and use pairwise motivated-versus-unmotivated classification when absolute judgments are unreliable (Section 4.4.2, pp. 38–40). The paper's preliminary binary experiment used five problems and three attempts per proof. In the older-model table, the total was 46/48 true positives and 39/60 true negatives; the pairwise task totaled 80/96 correct (Section 4.4.2, pp. 39–40). These denominators are the authors' complete reported attempts for those tasks, not general model accuracy.

Verus form. Inference: ask a Verus agent to accompany a checked contract proof with a derivation trace: why a loop invariant was chosen, which ownership fact motivates a lemma, and how each postcondition follows. The trace is explanatory metadata and cannot replace machine checking. Inference: evaluate explanation separately from verification, because a syntactically valid `proof fn` can contain an unsound narrative while the verifier checks only the formal obligations.

Evidence and limits. The authors explicitly call the experiments preliminary. In newer-model generation, four models produced 38/60 motivated proofs across five problems and three attempts per model/problem (Section 4.4.2, p. 40); the paper warns that contamination and problem difficulty limit strong conclusions. The reported failures include pseudo-motivation and unsound deductions that happen to reach a correct result. Inference: motivated-proof scoring is a useful threat detector for agent-written explanations, but it is not evidence that the explanation is semantically faithful.

## what is proved, measured, and trusted

The paper proves no theorem about LLMs and introduces no new soundness result for Lean, Isabelle, or Verus. It measures small preliminary model-generation and recognition tasks, reports dataset label counts, and gives engineering recommendations. The formal checker is trusted to validate formal artifacts, but the paper notes that formalization does not cover informal conjecture, exploration, proof summaries, or tool choice. Inference: for VL, the trusted base additionally includes Verus, its solver and translation, the Rust compiler, external libraries, and the specification itself. A passing check proves the written contract under the pinned environment; it does not prove that the contract captures product intent.

## what VL should not redo

The paper already gives the mixed-mode trace schema, benchmark protocol fields, workflow decomposition, repair/refactoring corpus design, and motivated-proof evaluation pattern. VL should reuse these abstractions and focus its novelty on Verus-specific contracts, ownership, solver behavior, and product maintenance measurements. Inference: rebuilding another result-only benchmark or another generic final-answer score would duplicate work while leaving the identified process gap.

## threat to a product of agent-written verified Rust

Inference: the threat is substantial when product claims rely on one-shot pass rates, because agents can exploit fixed benchmarks, hidden context, permissive automation, or incomplete specifications. Inference: the threat is lower when every change is checked in a pinned Verus environment, failures and repairs are recorded, resource limits are reported, and explanations are evaluated separately from proof validity. Inference: the paper does not quantify this threat for Rust or Verus, so these are risk judgments rather than paper findings.

## techniques for the catalog

- mixed-mode proof trajectories — store natural-language context, formal states, tool calls, outputs, and the checked response, then replay with pinned dependencies
- formal benchmark protocol — declare task, context, artifact, automation, resources, versions, and pass@k/time metrics
- diagnostic failure labels — attach structured error and warning codes to verifier feedback instead of one binary score
- repair and refactoring corpora — capture compile–diagnose–fix edits and before/after proof maintenance with lint metadata
- workflow decomposition — turn a long proof into checked intermediate transformations and explicit subgoals
- motivated-proof evaluation — require each construction's origin and test pairwise against unmotivated proofs
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
