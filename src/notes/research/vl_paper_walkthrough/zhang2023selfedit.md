# Self-Edit: Fault-Aware Code Editor for Code Generation
(authored by agents unless marked 🧑)
Tag: `zhang2023selfedit`, [paper](https://arxiv.org/abs/2305.04087)

## result and relevance

Zhang et al. propose Self-Edit, a generate–execute–edit pipeline for competitive-programming code. An LLM first writes code, an executor runs one example test, and a small fault-aware editor rewrites the code using a structured comment containing the result. The paper reports improvements over direct generation across APPS-dev, APPS-test, and HumanEval, using nine generators.

The abstract states: “We execute the generated code on the example test case provided in the question and wrap execution results into a supplementary comment.” (abstract, p. 1). It reports average pass@1 improvements of 89% on APPS-dev, 31% on APPS-test, and 48% on HumanEval across nine models (abstract, p. 1). These are relative improvements as reported by the authors; the tables give the underlying percentage points, and Table 1 gives the problem counts. Inference: from Table 2 I recompute the APPS-dev mean pass@1 as 6.17% to 11.67% over nine models, matching the 89%; Table 4 lists only eight models for HumanEval (text-davinci-002 appears on HumanEval only in the Table 8 in-context variant), and the mean over those eight is about 5.57% to 8.23%, about 48%.

## technique 1: execute one example and serialize a fault-aware comment

what it is and when to use

Use a trusted executor to turn a generated program's observed behavior into a short, typed feedback message. The method has three result classes: pass, wrong output, and termination error. This is useful when a task supplies executable examples and the editor can learn from concrete failures.

how to do it

1. Generate a program from the natural-language problem description with a black-box LLM (Sections 3 and 3.1, p. 3).
2. Execute it on one example test case from the description; if several examples exist, the authors choose only one (Section 4.1, p. 6).
3. For a passing run, emit the template “Pass the example test case.” (Section 3.2, p. 4).
4. For a wrong output, include the input, expected output, and generated output, then append “Rewrite the code.” (Section 3.2, p. 4). The paper's template is: “Wrong Answer with input: <input>. Expected output is <output_1>, but generated output is <output_2>. Rewrite the code.” (Section 3.2, p. 4).
5. For a runtime or compile error, include the line number, line content, and full error message, followed by “Fix the bug.” (Section 3.2, p. 4). The template begins: “Line <lineno>, <line_content>, <error_msg>. Fix the bug.” (Section 3.2, p. 4).

The paper's figure gives a concrete Python example: GPT-3 emits `print n + k`, and execution returns “SyntaxError: Missing parentheses in call to 'print'. Did you mean print(n + k)?” (Figure 1b, p. 1). The comment therefore points to a local repair.

Verus form (inference)

Inference: replace the example executor with `verus` verification plus executable tests. Serialize the exact verifier diagnostics, failed postcondition, or counterexample into the editor prompt. Keep the original `requires` and `ensures` text in the input so the editor cannot silently replace the specification. A passing Verus run should produce a “verified” comment; a failed run should identify the proof obligation. Inference: this improves feedback strength but still depends on the specification and trusted verifier toolchain.

limitations

One passing example is not proof of hidden-test correctness. The paper evaluates functional correctness with hidden tests, while the comment uses only one example test (Section 4.1, pp. 5-6). On HumanEval the authors edit only the outputs that fail the example test, following an executability filter from earlier work (Section 4.2, pp. 6-7).

## technique 2: train a fault-aware sequence-to-sequence editor

what it is and when to use

The editor takes the problem description, generated program, and supplementary comment and emits a revised program. The authors fine-tune PyCodeGPT-110M, separately for each generator's comment distribution.

how to train it

1. Represent each training input as `(N, S, C)`: natural-language description, generated source, and comment (Section 3.3.1, p. 4).
2. Concatenate fields with separators: `[SOS]`, description tokens, `[CODE]`, source tokens, `[CMNT]`, comment tokens, and `[EOS]` (Section 3.3.1, p. 4).
3. Generate candidate programs for APPS-train, sample 10 programs per problem, execute the example, and construct comments (Section 3.3.2, p. 4).
4. Obtain target programs from standard APPS ground-truth programs and generated programs that pass all hidden tests (Section 3.3.2, p. 4).
5. Build one editor dataset per LLM, each with nearly 4.5k generated programs with comments and at most 15 ground-truth programs per generated program (Section 3.3.2, p. 4).
6. Fine-tune PyCodeGPT-110M on the edit task (Section 3.3.1, p. 4). The paper says: “We train a decoder-only model to complete the code edit task.” (Section 3.3.1, p. 4).
7. At inference, generate programs, execute each on the example, create its comment, and ask the editor for one final program (Section 3.3.1, p. 4).

The training objective is a one-of-many objective. The authors use a variation of GOLD with an off-policy importance weight, `Pθ(t)`, so the loss emphasizes high-likelihood tokens in correct target solutions (Section 3.3.3, pp. 4-5). The paper's stated motivation is: “we focus on a model’s ability to edit a single correct solution based on the existing generated code within a limited budget of attempts (like precision).” (Section 3.3.3, p. 4). Training and inference settings (Section 4.1, p. 6): at most 10 epochs, learning rate 1e-5, maximum input length 1024 and output length 512, temperature sampling with T = 0.8 for both LLM and editor, an LLM budget of 10 samples, and one edited program per LLM output.

Verus form (inference)

Inference: train on tuples `(specification, Rust candidate, Verus diagnostic)` paired with a target Rust/Verus implementation that verifies. Use normal Rust source plus Verus proof code in the target. The editor must output source; it does not execute proof code at runtime. Validate every output with Verus before accepting it. Inference: if multiple targets satisfy a specification, preserve the paper's one-of-many framing, but measure whether the generated target preserves the exact contracts and executable behavior.

## technique 3: pass@k and sol@k evaluation with hidden tests

what it measures

For each problem, pass@k is the percentage of problems for which at least one of k submitted programs passes all hidden tests. sol@k is the total number of correct programs given k samples per problem, counted over the whole benchmark (for 5000 problems, 5000 * k programs are generated and the correct ones counted). The paper defines pass@k and then states: “Then pass@k is the percentage of solved problems.” (Section 4.1, p. 6). It sets k to 1, 5, and 10 for pass@k, and k=10 for sol@k (Section 4.1, p. 6).

how to apply it

1. Generate k candidates per problem.
2. Run every candidate on all hidden tests.
3. Mark the problem solved if any candidate passes all tests; divide solved problems by the number of problems for pass@k.
4. Count all passing candidates over all problems and report that count as sol@k (Section 4.1, p. 6).

Dataset denominators are APPS-dev 598 problems, APPS-test 5,000 total problems split into Introductory 1,000, Interview 3,000, and Competition 1,000, and HumanEval 164 problems (Table 1, p. 5). APPS-train has 4,207 problems used for editor training; the table reports average hidden tests per problem as 4.03 for APPS-dev, 21.19 for APPS-test, and 8.08 for HumanEval (Table 1, p. 5).

Results include text-davinci-002 on APPS-dev: direct pass@1 26.6%, edited pass@1 32.4%, pass@5 43.8%→48.8%, and pass@10 49.7%→58.0% (Table 2, p. 7; denominator 598). On APPS-test, the same model's pass@1 is 7.48% before and 7.94% after editing, with the table's footnote limiting GPT-3 sampling to five and evaluating sol@5 because it is accessed through a paid API (Table 3, p. 7; denominator 5,000). On HumanEval, CodeGen-2B zero-shot is 14.02%→17.07% pass@1 and 29.27%→29.88% pass@5, while its pass@10 is unchanged at 34.15% (Table 4, p. 8; denominator 164); the text notes that sol@10 still rises for CodeGen-2B (Section 4.2, p. 7).

Verus form (inference)

Inference: report pass@k over independent verified candidates, where a candidate counts only if Verus verifies all selected contracts and hidden executable tests pass. Report sol@k as the number of verified candidates, retaining the exact denominator and k. This distinguishes one acceptable candidate from many correct candidates, which matters for reliability of agent-written verified Rust.

## technique 4: ablations and edit-round control

The authors remove comments and add a second edit round. With PyCodeGPT-110M-finetuned, APPS-dev pass@1 is 4.8% base, 11.4% after edit, 9.4% without comments, and 11.7% with an additional edit round; APPS-test is 0.2%, 0.6%, 0.3%, and 0.4%, respectively (Table 7, p. 8; APPS-dev denominator 598 and APPS-test denominator 5,000). The paper concludes: “The results indicate that losing the guidance of the supplementary comment will hurt the performance of the editor model.” (Section 4.4, p. 8). A second round slightly helps APPS-dev but hurts APPS-test, which the authors attribute to a train/test gap because the editor was trained to edit LLM outputs but is then used to edit its own output (Section 4.5, pp. 8-9).

## technique 5: in-context self-edit and cost comparison

The authors also use text-davinci-002 as both generator and editor, with comments supplied as in-context prompts and no additional editor training (Section 5.2, p. 9). Table 8 reports APPS-test pass@1 7.48%→8.94%, pass@5 15.94%→17.12%, sol@5 1,876→2,214; HumanEval pass@1 34.76%→39.63%, pass@5 60.98%→64.63%, sol@5 288→331 (Table 8, p. 9; denominators 5,000 and 164; the table uses sol@5, not sol@10).

For time, the paper reports nearly 8.4 seconds per text-davinci-002 sample, less than 0.01 seconds for the executor, and 3.7 seconds for the editor, versus more than 110 seconds for CodeRanker's candidate list and 0.53 seconds for its ranker (Section 5.1, p. 9; Google Colab Tesla T4).

## proved, measured, and trusted

The work measures hidden-test pass rates, number of correct programs, ablations, and one timing comparison. Inference: the paper gives no formal argument that the editor preserves semantics or that an example failure has been fixed; it reports only empirical rates. Hidden tests, target programs, execution environments, and metric scripts are trusted. The paper's limitation section says the editors are relatively small pretrained models, the editor datasets are small (10 sampled programs per problem), and there is no strict comparison of computing resources with other post-processing methods (Limitations, p. 10).

## techniques for the catalog

- fault-aware execution comments: run one supplied example and serialize pass, wrong-output, or error diagnostics for an editor
- trained code editor: fine-tune a decoder-only model on description, source, comment, and a correct target
- hidden-test pass@k: count a problem solved when any of k candidates passes all hidden tests
- sol@k: count every correct candidate among k outputs to measure correction yield
- edit-round ablation: remove diagnostics or add another repair round to test whether feedback and iteration help
- in-context self-edit: use one large model as generator and editor with execution comments as context
