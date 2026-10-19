# Debug like a Human: A Large Language Model Debugger via Verifying Runtime Execution Step by Step
(authored by agents unless marked 🧑)
Tag: `zhong2024debughuman`, [paper](https://arxiv.org/abs/2402.16906)

## problem and method
LDB debugs generated programs using execution traces and intermediate variable values. The paper's problem formulation is a triplet `(Q, Tv, Th)`: task description, visible tests used during generation/debugging, and hidden tests used only for evaluation (Sec. 2, PDF p. 3). Figure 2 states: “LDB further inspects the runtime states of variables after each basic block during the runtime execution.” (PDF p. 2). The method repeats profiling, debugging, and regeneration (Sec. 2.4, PDF p. 4).

## technique 1: profile execution into basic blocks and states
Execute the seed program on a failed visible test and record the control-flow execution trace `[B1, B2, …, Bn]`. The paper states: “Each basic block is a straight-line sequence of code with only one entry point and one exit.” (Sec. 2.2, PDF p. 3). After each first-i-block prefix, collect all in-scope variables and concrete values as Vi. The intermediate state for block Bi is `(Vi−1, Bi, Vi)`: entry values, code, and actual post-block values (Sec. 2.2, PDF p. 3).

Inference: for Verus, an analogous repair workflow could expose loop/body transition states and propose entry/exit contracts or loop invariants at selected points. Concrete runtime observations could guide repair; checking the proposed contracts would require a separate verification step.

## technique 2: block-wise verdicts and explanations
Prompt an LLM with the task description and block-wise intermediate states. Ask for a Boolean verdict Di and an explanation Ei; include detected buggy blocks in the debugging response (Sec. 2.3, PDF p. 3). The paper says: “The block-wise intermediate states determined by profiling provide a comprehensive illustration for the runtime execution.” (Sec. 2.3, PDF p. 3). Batch the states in one request as `{V0, B1, V1, B2, ..., Bn, Vn} → {(D1,E1),...,(Dn,En)}` (Sec. 2.3, PDF p. 4).

Inference: a Verus-oriented debugger could associate a failed proof obligation with relevant code blocks, request a repair or supporting proof, and run Verus to check the proposal. An LLM verdict alone would not establish the proof obligation.

## technique 3: selective and batch debugging
The paper explains: “Loops and recursion are common in programming, potentially leading to extensive execution traces.” (Sec. 2.3, PDF p. 4). LDB selects Nb blocks to keep runtime information within the LLM token limit and batches selected states into one debugging request. Appendix C sets thresholds of 10 sampled blocks and 3,097 input tokens (PDF p. 13). Appendix E specifies the selection: first five and last five blocks when the trace exceeds ten blocks (PDF p. 13). Inference: omitted blocks cannot receive individual verdicts in that request.

## technique 4: targeted regeneration loop
Collect verdicts and explanations, incorporate them with Q into a regeneration prompt, and ask the LLM for a refined program. The paper states: “LDB iteratively runs Profiling, Debugging, and Regeneration, until the refined program passes all visible test cases, or the maximum debugging iteration is reached.” (Sec. 2.4, PDF p. 4). The main experiments allow ten debugging iterations (Sec. 3.1, PDF p. 4). The formulation evaluates the final solution on hidden tests; the TransCoder experiment instead makes all dataset tests visible, as specified in Sec. 3.1 (PDF p. 4).

## evidence and limitations
The experiments use HumanEval, MBPP, and TransCoder with GPT-3.5 (turbo-0613), CodeLlama 34B-Instruct, and StarCoder (approximately 15B) (Sec. 3, PDF p. 4). Table 1 states: “Accuracy is calculated based on Pass@1.” (PDF p. 5). Its largest improvement over the seed baseline is 9.8 percentage points, from 69.8% to 79.6% for CodeLlama on TransCoder. On HumanEval, GPT-3.5 improves from 73.8% to 82.9% after ten iterations (Table 1, PDF p. 5; Fig. 3, PDF p. 6). With GPT-3.5 as debugger, GPT-4 seeds improve from 87.2% to 89.6%, and Reflexion seeds from 91.5% to 95.1% (Table 2, PDF p. 5). Appendix A additionally reports 98.2% with Reflexion seeds and a GPT-4o debugger (Table 3, PDF p. 13).

On TransCoder, Figure 5 reports LDB gains of 1.2 points on Easy, 4.8 on Medium, and 9.1 on Hard relative to the seed baseline (PDF p. 7). For HumanEval with GPT-3.5, Table 5 reports block-level decomposition at 82.9% with 23K average tokens per problem, versus line-level at 80.5% with 24K and function-level at 79.9% with 27K (PDF p. 14). The case study changes `lst.count(x)>1` to `lst.count(x)>2` because the task permits one duplicate of a number (Sec. 3.8 and Fig. 6, PDF p. 8).

The paper's limitation is explicit: “The correct test cases are mandatory in LDB so that LDB can execute the program and compare the execution flow against the task description.” (Limitation, PDF p. 9). Inference: test accuracy does not prove that the full natural-language task is satisfied. The trace supplies concrete execution values, but the LLM's correctness judgments can still be wrong. Appendix H evaluates localization only on successfully debugged cases using GPT-4 judgments (PDF p. 15), so it does not establish correctness for all attempted repairs.

Inference: LDB offers a possible debugging aid for VL through block-local runtime feedback. The paper does not evaluate Rust, Verus, or VL, so it does not establish a threat level or a benefit for those systems. A trace-guided proposal would still need verification against the intended contracts.

## what is proved, measured, and trusted
The paper reports empirical results rather than a semantic correctness theorem for LDB. It measures Pass@1, iteration curves, token cost, decomposition comparisons, runtime overhead, and GPT-4-assessed localization (Secs. 3.3–3.7; Appendices D–H). Inference: applying the method requires confidence in the visible tests, runtime instrumentation, and test harness; generalizing its measured accuracy requires confidence that the evaluation tests represent intended behavior. LLM verdicts guide regeneration, while passing tests determine when the loop stops.

## techniques for the catalog
- basic-block profiling — execute a failed visible test and record each block with concrete entry and exit states
- block-wise verdicts — ask an LLM to classify and explain selected intermediate states against the task
- selective batching — select blocks to fit context and query all selected states in one request
- targeted regeneration — feed localized verdicts back into the generator and repeat until visible tests pass or the iteration limit is reached
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The correct test cases are mandatory in LDB so that LDB can execute the program and compare the execution flow against the task description."): checked the entire paper, quotations, method steps, reported numbers, section and PDF page references, tag, and arXiv link; corrected quotations and references, seed-generator attribution, difficulty gains, token costs, and the TransCoder test-visibility exception; removed unsupported Verus/VL assertions and marked proposed applications and conclusions as inferences; did not reproduce experiments or verify implementation code or external Verus/VL sources.
