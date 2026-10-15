# HoarePrompt: Structural Reasoning About Program Correctness in Natural Language
(authored by agents unless marked 🧑)
Tag: `bouras2026hoareprompt`, [paper](https://doi.org/10.1145/3744916)

## problem and contribution
HoarePrompt classifies whether a program satisfies a natural-language requirement. The paper's central claim is that an LLM reasons better when it is first given descriptions of reachable states at selected program points. Its abstract says: “HoarePrompt employs a systematic, step-by-step process in which an LLM generates natural language descriptions of reachable program states at various code points.” (Abstract, p. 1.) It represents these descriptions as natural Hoare triples `{Pre} C {Post}` and obtains postconditions by prompting an LLM, rather than by executing the program or proving formulas.

Inference: The method is a useful front end for Verus because it turns prose requirements into candidate state facts and exposes a decomposition into contracts, transitions, and loop summaries. It is not a sound proof: the paper explicitly says, “While this approach does not provide formal correctness guarantees, it generates structured informal proofs.” (Section 2.3.)

The evaluation benchmark, CoCoClaNeL, contains 645 Codeforces problem-solution pairs, of which 322 (49.9%) are incorrect (Section 5.1). The authors report an average MCC improvement of 61% over Zero-shot-CoT, 72% over Vanilla, and 106% over the test-generation classifier (Section 5.3). These are averages over four models evaluated on the 645 pairs; Table 3 gives each model's MCC and token counts.

## technique 1: extract a natural precondition

What it is. HoarePrompt first asks an LLM to summarize valid inputs as a natural-language precondition. The paper's example is the Fibonacci task: “given N, write a function that finds the Nth Fibonacci number” produces `{num is a non-negative integer}` (Section 4.1).

When to use it. Use this step whenever the requirement describes an input domain that is not already a machine-checkable contract. It supplies the initial state for later propagation.

How to do it.
1. Give the requirement and function signature to a few-shot prompt (Section 4.1).
2. Ask for one description of the set of valid input states.
3. Treat that description as `Pre` for the first statement in the control-flow graph (Section 4.2).

Verus form. Inference: encode the extracted fact as an `requires` clause, for example `requires num >= 0`, and use the same predicate in later `ensures` clauses. The LLM output is a candidate specification; Verus must prove it or reject it. Inference: do not put an English sentence in a Verus contract unless it has been translated into a supported boolean expression.

Evidence and limits. The paper says implementation uses few-shot learning and points to supplementary Sections B.6 and B.7 (Section 4.1). Inference: because extraction is prompted rather than checked against labeled specifications, it can omit valid inputs or admit invalid ones; the paper does not report precondition-extraction accuracy separately.

## technique 2: compositional natural strongest postconditions

What it is. SP is an LLM completion model for natural Hoare triples, with a conditional distribution `SP(Post | Pre, C)` (Section 4). The workflow traverses the control-flow graph, samples a postcondition for each code fragment, and annotates key points before a final correctness prompt (Section 4).

How to do it.
1. For an assignment or other atomic statement, prompt the model to update variables while preserving relevant facts (Section 4.2, “Simple Statements”).
2. For a sequence `S1; S2`, complete `{Pre} S1 {Post1}` and use `Post1` as the precondition for `S2` (Section 4.2, “Compound Statements”).
3. Group a configurable number of atomic statements to reduce query count (same section).
4. Add descriptions after top-level branches and loops, and after return and print statements (Section 4.3).

The paper explains the purpose directly: “HoarePrompt simplifies this task by decomposing it into small, independent subtasks, which are solved step-by-step in the spirit of chain-of-thought reasoning.” (Introduction, p. 2.)

Verus form. Inference: each natural triple becomes a Rust function contract or a lemma about a state transition. Use `requires` for `Pre`, `ensures` for `Post`, and `assert` or proof functions for intermediate facts. Inference: executable statements remain ordinary Rust; only the specification and proof annotations change. Verus's solver checks the logical relation, whereas HoarePrompt samples a text description.

Evidence and limits. Table 1 reports bug-detection success for one indentation bug, 60 responses per model at temperature 0.5: Qwen2.5-7B 0% unannotated versus 11.7% annotated; Qwen2.5-Coder-32B 15% versus 85%; Qwen2.5-72B 35% versus 85%; Llama3.1-70B 50% versus 100% (Section 2.1). Inference: this is a classification experiment, not proof soundness, and the single motivating bug does not establish general correctness.

## technique 3: branch and exceptional-control-flow summaries

If statements. Given `Pre` and `if b: S1 else: S2`, sample branch preconditions with `SP(· | Pre, assert b)` and `SP(· | Pre, assert ¬b)`, compute each branch postcondition, then prompt the model to merge them (Section 4.2, “If Statements”).

Exceptions. Compute the try-block postcondition from `Pre`; compute each exception handler from the unconstrained description “variables may take arbitrary values”; merge all resulting postconditions (Section 4.2, “Exceptions Handling”). The paper states that handlers do not inherit preconditions because nonlinear control flow makes this difficult.

Input streams. For non-interactive stdin, extract the expected stream structure in the precondition, update it after each `x = input()`, and describe it as “stdin is empty” after all data is read (Section 4.2, “Input Stream”).

Verus form. Inference: encode branches with ordinary Rust `if` and branch-specific `assert` facts; encode exceptional outcomes as explicit `Result` or error-state variants. Inference: Verus cannot soundly assume arbitrary handler state unless that nondeterminism is part of the contract, so the paper's unconstrained handler model would weaken a product proof.

Evidence and limits. The stream model applies only to predetermined, non-interactive input (Section 4.2). Inference: interactive I/O, foreign calls, and hidden side effects require a separate state model and remain outside the reported method.

## technique 4: few-shot-driven k-induction for loops

What it is. The method unrolls a loop `k` times, computes a natural pre/postcondition pair for each iteration, then supplies those triples as few-shot examples to infer the whole-loop postcondition (Sections 2.2 and 4.2). The paper's algorithm samples `Pre_i` from `Post_{i-1}` plus the loop guard and then samples `Post_i` from the body.

How to do it.
1. Sample the loop-body precondition from `Pre` and `assert b` (Section 4.2).
2. Compute `Post1` for the body.
3. Repeat `k-1` times: sample `Pre_i` from `Post_{i-1}` and the guard, then compute `Post_i` (Section 4.2).
4. Prompt an inductive NSP model with all `{Pre_i} S {Post_i}` examples to infer the loop summary.
5. For Python iterators, explicitly model an index incremented by each `next()`; for `for item in I`, include iterator state in each iteration precondition (Section 4.2).

Verus form. Inference: the corresponding Verus proof needs a loop invariant written with `invariant` on the loop, plus a `decreases` clause when termination is proved. The k unrollings can suggest invariant candidates, but they do not replace the invariant proof. Inference: a Verus `while` loop executes once; proof code establishes preservation for all iterations rather than sampling three examples.

Evidence and limits. On a 140-entry pilot set, `k=3` achieved MCC 0.262, compared with 0.211 for no unroll, 0.228 for `k=1`, and 0.231 for `k=5`; token increase was 11.29× at `k=3` versus 1× at no unroll (Table 2, Section 5.2). Across the 645-pair benchmark and four models, k-induction improved MCC by an average 25.7% over no-unroll (Section 5.4). Inference: the best `k` is model- and dataset-dependent; the paper's tuning does not prove an invariant is inductive.

## technique 5: correctness classification and feedback

After annotation, HoarePrompt asks an LLM to classify the program as Correct or Incorrect (Section 4.3). Baselines are Vanilla, Zero-shot-CoT, and Tester; Tester generates tests, executes the program, and accepts it iff all generated tests pass. The authors also replace AgentCoder's test feedback with HoarePrompt judgments during iterative generation. On 100 randomly sampled CoCoClaNeL problems, Llama3.1-70B achieved 33% fully correct with HoarePrompt versus 29% Testing and 30% Baseline; GPT-4.1 achieved 47%, 42%, and 37%, respectively (Table 5, Section 5.6). The denominator is 100 problems per model.

Inference: a VL pipeline could use HoarePrompt annotations to propose Verus contracts and proof obligations, then require Verus to accept generated Rust before release. The paper's token cost is substantial: averaged over models, full HoarePrompt used 85.9× Vanilla tokens and 64.1× Zero-shot-CoT tokens (Section 5.5), while no-unroll used 90% fewer tokens than full unrolling. Inference: this cost and the absence of formal guarantees are direct product risks for agent-written verified Rust.

## what is proved, trusted, and already done

The paper proves neither program correctness nor soundness of its LLM. It measures MCC, balanced accuracy, TPR/FNR/FPR, token use, and generated-code pass rates. Trusted components include the LLM, prompts and few-shot examples, Python semantics and iterator model, Codeforces labels, and the final classifier. Inference: Verus would move the final safety claim to machine-checked contracts, but the extracted requirements and any external-model assumptions would remain trusted inputs.

The paper already covers natural-language state decomposition, branch/loop summaries, and test-free correctness classification. Inference: VL should not redo those as an unqualified novelty claim; a useful extension would measure whether these summaries reduce Verus proof repair on a fixed Rust benchmark, with proof acceptance as the outcome.

## techniques for the catalog
- natural precondition extraction — prompt an LLM to turn requirements and a signature into a valid-input state predicate
- compositional natural strongest postcondition — propagate sampled state descriptions through atomic and compound statements
- branch and exception merging — compute path-specific postconditions and merge them at control-flow joins
- few-shot-driven k-induction — unroll loops, use iteration triples as examples, and infer a whole-loop summary
- state-annotation classification — classify or refine code after annotating key points with reachable states
Checked 2026-10-15 against paper bouras2026hoareprompt: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
