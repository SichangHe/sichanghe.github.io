# ANPL: Towards Natural Programming with Interactive Decomposition
(authored by agents unless marked 🧑)
Tag: `huang2023anpl`, [paper](https://arxiv.org/abs/2305.18498)

ANPL is a Python-like interactive programming system in which a user fixes control and data flow while an LLM fills natural-language “holes.” The paper’s claim is about interactive intent grounding, not formal verification: in a 400-task ARC user study, ANPL had 75.0% mean solving rate versus 58.4% for GPT plus interaction (Section 5.2, p. 7). The generated Python is executable but not proved.

## technique: sketch plus natural-language holes

What it is. A sketch is programmatic control/data flow; a hole is a function module described in natural language. The paper says, “The main idea under ANPL is to decouple the description of hole and sketch” (Section 3.1, p. 4). Hole calls specify input/output variables, while the sketch may use Python-like `for`, `while`, and `if` constructs (Section 3.2, p. 4).

When and steps. The paper motivates the split by saying that users “often have an idea about the general form of a solution (a high-level strategy) but feel it challenging to implement the program details” (Section 3.1, p. 4). The steps below are my ordering of what Sections 3.2–3.3 describe; the paper gives no numbered list. (1) Name variables and connect holes. (2) Write control flow in the sketch. (3) Describe each hole in natural language. (4) Compile, then inspect trace or provide input-output constraints. The paper lists four edits: recursively decompose a hole into lower-level holes, abstract low-level holes back into a higher-level hole, explain and modify hole descriptions, or change the sketch by coding, e.g. the input-output variables of holes (Section 3.3, “Editing”, p. 5).

Verus form. Inference: make the sketch ordinary Rust control flow and each hole a Rust function with `requires` and `ensures`; write `spec fn` predicates for the hole contract and prove composition with `proof fn` lemmas. Natural-language descriptions can suggest contracts, but Verus checks only the written contracts and code. Python execution and unconstrained LLM holes do not carry over.

Evidence. The study compares System A (ANPL), B (GPT plus interaction), C (ANPL one-shot), and D (vanilla GPT). Means are 75.0%, 58.4%, 23.5%, and 16.8%, respectively, with paired t-tests at df = 399, i.e. over the 400 ARC tasks (Section 5.2, p. 7). Success is judged on the held-out ARC test input-output examples (Section 5.1, p. 7), so the study measures task success under human interaction, not correctness beyond those examples.

## technique: dependency-graph hole compilation

What it is. The compiler fills holes in appearance order, analyzes generated functions into a dependency graph, and identifies the implementation function. The paper’s rule is: if the user named a hole, a same-named generated function is its implementation; otherwise a function with no dependencies is selected (Section 4.1, p. 6).

Steps. (1) Send the whole ANPL program, the hole description, and its I/Os to the LLM. (2) Build a dependency graph and topologically sort it. (3) Find entry nodes. (4) Match the user’s name and remove unrelated nodes; if there is one entry node, use it; if there are multiple independent entry nodes, regenerate. (5) Insert the selected function while preserving the sketch. These cases are given in the compiler pseudocode (Figure 2, p. 5).

Verus form. Inference: generate a Rust module only after checking that the selected function satisfies the hole’s contract; preserve the sketch as fixed executable code. A dependency graph can organize proof obligations, but it is not a proof of functional correctness. Use `assert` and lemmas to establish that each selected function’s `ensures` supports the next hole.

## technique: differential compilation and intent-priority merge

What it is. Debugging creates old and new dependency graphs. ANPL merges them with the priority “the user’s current intention > the user’s previous intention > the LLM’s previous intention > the LLM’s current intention” (Section 4.2, p. 6). The goal is to change only the requested region.

Steps. Compile a new program if it still has holes; construct old and new graphs; merge according to the four-level priority; retain old generated code where the user did not express a new intention. The compiler’s `compilingDiff` pseudocode gives this procedure (Figure 2, p. 5).

Verus form. Inference: treat a graph merge as a source transformation followed by re-verification. Keep unchanged functions and their proofs; re-run proofs for changed functions and callers. The priority rule is a maintenance policy, not a Verus construct, and it cannot justify retaining a proof when an unchanged function’s assumptions have changed.

## technique: trace and I/O-directed resynthesis

ANPL exposes execution traces between high-level holes and lets users add input-output constraints. The paper calls input-output constraints “a typical gold standard for correctness” (Section 3.3, p. 4), but its benchmark success is still defined by test examples. In the HumanEval automatic experiment, generated tests were used, a passing composition was selected, and failing functions were debugged using traces for at most two rounds (Appendix F.5, pp. 28–29). This produced Pass@1 of 76.22% for GPT-3.5 (original model 56.7) and 86.59% for GPT-4 (Table 4, p. 30). The authors note that ANPL “is not designed for automatic code generation tasks” (Appendix F.5, p. 29).

Verus form. Inference: translate stable I/O examples into executable `assert` checks and generalize them into `requires`/`ensures`; use traces to locate the failing contract or lemma. Finite examples cannot replace quantified specifications. Verus can prove the generalized property, while ANPL’s test-based loop only supplies evidence for sampled inputs.

## what is proved, measured, and trusted

The paper measures user solving rate, time, interactions, lines of code, and generated-test Pass@1. Its ARC generalization table reports, among 224 tasks passed by both systems on test cases, 10 ANPL programs and 5 GPT programs failed to generalize to all I/Os (Appendix F.2, pp. 26–27; Table 2, p. 27). The authors say the two systems have “similar generalization abilities” and that 300 of the 400 ARC tasks were decomposed into Python with an average of 2.7 holes (Section 5.3, p. 10). Inference: the LLM, Python runtime, test selection, and user-written sketches remain trusted, since the paper describes no theorem prover or other proof check on the generated program.

## techniques for the catalog

- sketch-hole decomposition — fix program control/data flow and let an LLM implement independently specified natural-language modules
- 
- dependency-aware compilation — select a hole implementation from a generated dependency graph and regenerate ambiguous multi-entry output
- 
- intent-priority differential merge — merge old and new graphs while prioritizing current user intent over older model output
- 
- trace and I/O repair — inspect inter-hole execution and resynthesize a failing module from additional examples
