# Data for Mathematical Copilots: Better Ways of Presenting Proofs for Machine Learning
(authored by agents unless marked 🧑)
Tag: `frieder2024data`, [paper](http://arxiv.org/abs/2412.15184v2)

## scope and central claim

The paper studies what data and evaluation must contain if a language model is to become a useful mathematical copilot rather than a system that emits plausible final answers. Its central diagnosis is that common datasets map a theorem statement directly to a final proof and therefore omit proof discovery, tool interaction, error recovery, and mathematical workflow. The abstract states: “In particular, it is necessary for benchmarks to move beyond the existing result-based datasets that map theorem statements directly to proofs, and instead focus on datasets that translate the richer facets of mathematical research practice into data that LLMs can learn from.” (Abstract, p. 1.) The authors explicitly include formal mathematics and interactive theorem provers (ITPs), while warning that a single formal system cannot cover all research activity.

## technique: represent proving as a mixed-mode tool trajectory

What it is. A mixed-mode datapoint records a short trajectory instead of only an input and final response. The paper gives five components: “(i) natural-language problem context, (ii) intermediate formal objects (expressions, goals, proof states, or formal statements), (iii) tool calls with arguments, (iv) tool outputs (for example, the result of executing code, a CAS simplification, or a proof assistant error message), and (v) a final response that integrates the tool outputs into a mathematically coherent explanation.” (Section 2.0.1, p. 11.) The representation is intended to teach when to call a tool, how to translate between representations, and how to recover from timeouts, type errors, missing imports, and failed searches.

When to use it. Inference: use this format when work alternates between natural-language planning, formal states, and external tools. The paper specifically treats a proof assistant as the tool in paired informal/formal data: “In these settings, the tool is the proof assistant itself: correctness can be checked by verifying the generated formal artifact, while intermediate feedback takes the form of proof-state information and type errors, which can be recorded in the dataset.” (Section 2.0.1, p. 11.)

How to apply it.

1. Store the natural-language request and the current formal goal (Section 2.0.1).
2. Store every attempted tool call, including its arguments (Section 2.0.1).
3. Store the exact tool output, including diagnostics and timeouts (Section 2.0.1).
4. Store the subsequent patch in a repair trajectory (Section 4.3.1, p. 36). Inference: continue recording until a checked artifact or an explicit failure.
5. Pin tool versions, libraries, dependencies, and execution settings so that the trace can be replayed (Section 2.0.1).
6. Separate tasks in which tool use is optional from tasks in which it is required, so evaluation can distinguish mathematical reasoning from tool invocation competence (Recommendations, Section 2.0.1, p. 11).

Verus form. Inference: represent each trajectory as a record containing the user goal, Verus source revision, verifier invocation, diagnostics, and successive patches. Preserve the original contracts and failed attempts. Replay with a pinned Verus toolchain and retain the verification output and executable build result. These are proposed applications; the paper does not study Verus.

Evidence and limits. The paper does not report a new model trained on this trajectory format. It presents the format as a recommendation: “Tool outputs depend on the toolchain (version, library state, and sometimes randomness).” (Section 2.0.1, p. 11.)

## technique: make formal benchmarks specify the task and environment

What it is. Under “Unclear benchmarking protocols,” the paper recommends specifying the task, input and output, success criterion, automation, resource limits, environment, and metrics. It enumerates five task variants: theorem proving from scratch, tactic prediction, proof repair or hole filling, premise selection, and autoformalization (Section 2, pp. 10–11). It recommends reporting pass@k when multiple attempts are allowed and average time to solution; proof length and tactic counts are optional secondary measures (p. 10).

When to use it.

How to apply it.

1. Declare the task variant and the exact input context, including imported modules, available lemmas, implicit environment, and context limits (Section 2, p. 10).
2. Define valid outputs, whether acceptance requires no placeholders such as `sorry`/`admit`, and failure conditions such as type errors, timeouts, and unsolved goals (Section 2, p. 10).
3. Declare permitted automation and whether it is counted as part of the model or an external oracle (Section 2, p. 10).
4. Pin prover version and library commit, and use a harness that replays proofs in a fixed environment (Section 2, p. 10).
5. Report time and memory limits, internal prover and search limits, maximum attempts, pass@k when multiple attempts are allowed, and average time to solution. Optionally report proof length or tactic count (Section 2, p. 10).

Verus form.

Evidence and limits. The recommendations are not a controlled experiment. The paper gives a concrete reason for the protocol: “Without these details, two papers can report the same score while solving different tasks under different constraints.” (Section 2, p. 10.)

## technique: diagnose failures with structured labels and checker feedback

What it is. Binary correct/incorrect scoring hides why a model failed. The paper recommends structured error and warning codes. GHOSTS has two types of labels, error codes and warning codes, “which make up, in total, 15 error or warning labels, while NaturalProofs-Gen distinguishes between 11 types of errors.” (Section 3.1.2, pp. 14–15.) Formal proof assistants provide diagnostics, but the authors caution: “However, this feedback is more akin to a compiler error than high-level feedback on the mathematical reasoning process.” (p. 15.)

How to apply it. The paper recommends multi-aspect feedback and, as a middle ground, deriving ratings from error and warning codes (Section 3.1.2, p. 15). Inference: attach a label to each failed attempt and retain its raw diagnostic; distinguish syntax/type/import failures, unsolved goals, resource exhaustion, and evidence of a false statement.

Verus form.

Evidence and limits. The reported counts (15 and 11 labels) are dataset descriptions, not accuracy results. The authors say: “We speculate that this feedback may be useful but still limited in its ability to diagnose AI systems.” (Section 3.1.2, p. 15.) Inference: labels can expose failure categories without establishing that an agent understood the underlying algorithm.

## technique: model formal proof engineering as repair and refactoring trajectories

What it is. Section 4.3.1 proposes a repair trajectory corpus with “(i) an attempted proof edit, (ii) compiler/LSP diagnostics (type errors, missing imports, failing goals, timeouts), and (iii) the subsequent patch.” (Section 4.3.1, p. 36.) It also proposes a refactoring corpus containing before/after proofs that improve readability, reduce instance pollution, decrease resource use, or align with library style. Stability and hygiene lints become structured metadata.

How to apply it. Capture compile–diagnose–fix edits, before/after refactorings, lint warnings, and resource use (Section 4.3.1, p. 36). Preserve imports and local context to address hidden context dependence (Section 3.2.5, p. 23). The refactoring example describes compiling after each helper-lemma extraction and using LSP diagnostics to locate natural boundaries (Section 4.3.1, p. 36).

Verus form. Inference: apply the same corpus shape to Verus functions and proofs. Require refactorings to preserve executable behavior and specifications; record solver time and failed obligations before and after each change to assess maintenance costs alongside verification success.

Evidence and limits. This section is a design proposal, not a measured benchmark. The authors write: “This makes formal proof engineering a promising setting for process-level datasets.” (Section 4.3.1, p. 36.)

## technique: decompose mathematical work into explicit workflows

What it is. The authors recommend a taxonomy of workflow steps, distinguishing global workflows (for example literature search) and local workflows (for example energy estimates for differential equations), without a hard boundary between them. They give an ODE/PDE chain: “ODE/PDE → find functional → compute derivative of functional → bound derivative → reach Gronwall-type inequality” (Section 4.1, p. 27). Their proposed datapoint stores the ODE/PDE, functional, derivative, derivative bound, and Gronwall-type inequality, potentially joined by filler text. They propose symbolic or numerical generation of the mathematical objects and tool integration for individual steps (p. 27).

When to use it. Inference: use decomposition when a verification task contains repeated subgoals, domain-specific transformations, or exploratory choices, so that intermediate progress can be evaluated.

How to apply it. The paper proposes categorizing workflow steps and turning workflows into tuples, while noting that a complete taxonomy and dataset structure remain future work (Section 4.1, pp. 25–26). It also recommends structured problem analysis for reinforcement learning: “Concretely, this can include a normalized restatement of the problem, the relevant definitions and constraints, a decomposition into subgoals that a solver would aim to establish, and examples of admissible intermediate claims (or failure modes) that an evaluator can recognize.” (p. 26.)

Verus form. Inference: decompose a Rust verification task into a data-structure invariant, helper lemmas, loop invariants, mutation steps, and postconditions. Record dependencies and failed obligations to assess which parts the agent can discharge. The paper does not test this decomposition in Rust or Verus.

## technique: evaluate motivated proofs, not only correct proofs

What it is. The paper defines the concept: “Broadly speaking, a motivated proof is one that makes clear to the reader where each step comes from.” (Section 4.4, p. 37.) For Cantor’s theorem, it starts with a generic subset `{x ∈ X : P(x)}`, analyzes what is required for it to differ from every `f(y)`, tries `y` as the distinguishing element, and obtains `P(y)` as `y ∉ f(y)` (Section 4.4.1, p. 37). For nilpotent units, it parameterizes an integer-polynomial inverse, compares coefficients, and uses nilpotence to truncate the polynomial (p. 37). Inference: the printed coefficient recurrence omits the minus sign required by its own subsequent alternating coefficients; this study does not reproduce that erroneous equation.

How to apply it. The older-model generation experiment used o1-preview and Llama 3.2-90B on five problems, with a definition and motivated examples from the other four problems, then also with examples and non-examples. If generation failed, the authors prompted once for a correction and identified the unmotivated step (Section 4.4.2, p. 38). Recognition evaluated human and machine proofs individually, with three attempts per proof per problem; the reported table totals are 46/48 true positives and 39/60 true negatives. A separate pairwise task used three valid attempts per motivated/unmotivated pair per problem and reported 80/96 correct (pp. 39–40). These are reported table totals, not estimates of general model accuracy. The authors advise permuting proof order, including in-context examples, and ensuring negative examples also contain superficial features associated with motivated proofs (p. 40).

Verus form. Inference: ask a Verus agent to accompany a checked proof with an explanation of why each invariant or lemma was chosen and how the postconditions follow. Evaluate explanation separately from verification; a successful check alone does not establish that the accompanying narrative explains the construction faithfully.

Evidence and limits. In newer-model generation, GPT-5.2 Pro, DeepSeek Prover-V2, Gemini 3 Pro, and GPT-OSS 120B produced a reported 38/60 motivated proofs across five problems and three attempts per model/problem (Section 4.4.2, p. 41). The authors caution: “Although these are still preliminary investigations, we acknowledge the risk of data contamination.” (p. 40.) They also say more difficult problems are needed to distinguish the top models (p. 41). Reported older-model failures include pseudo-motivation and unsound deductions that reach a correct result (pp. 38–39). Inference: motivated-proof scoring could expose weaknesses in agent-written explanations, but these experiments do not establish explanation faithfulness or a Verus benefit.

## what is proved, measured, and trusted

The paper proves no theorem about LLMs and introduces no new soundness result for Lean, Isabelle, or Verus. It measures small preliminary model-generation and recognition tasks, reports dataset label counts, and gives engineering recommendations. The formal checker is trusted to validate formal artifacts, but the paper notes that formalization does not cover informal conjecture, exploration, proof summaries, or tool choice.

## threat to a product of agent-written verified Rust

Inference: the threat is substantial when product claims rely on one-shot pass rates, because agents can exploit fixed benchmarks, hidden context, permissive automation, or incomplete specifications. Inference: the threat is lower when every change is checked in a pinned Verus environment, failures and repairs are recorded, resource limits are reported, and explanations are evaluated separately from proof validity. Inference: the paper does not quantify this threat for Rust or Verus, so these are risk judgments rather than paper findings.

## techniques for the catalog

- mixed-mode proof trajectories — store natural-language context, formal states, tool calls, outputs, and the checked response, then replay with pinned dependencies
- formal benchmark protocol — declare task, context, artifact, automation, resources, versions, and pass@k/time metrics
- diagnostic failure labels — attach structured error and warning codes to verifier feedback instead of one binary score
- repair and refactoring corpora — capture compile–diagnose–fix edits and before/after proof maintenance with lint metadata
- workflow decomposition — turn a long proof into checked intermediate transformations and explicit subgoals
- motivated-proof evaluation — require each construction's origin and test pairwise against unmotivated proofs
