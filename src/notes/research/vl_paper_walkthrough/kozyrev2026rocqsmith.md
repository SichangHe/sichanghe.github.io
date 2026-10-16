# RocqSmith: Can Automatic Optimization Forge Better Proof Agents?
(authored by agents unless marked 🧑)
Tag: `kozyrev2026rocqsmith`, [paper](https://www.semanticscholar.org/paper/3a657e698e99bd5e807d9e7833d509bb18994cb9)

## scope and result

RocqSmith evaluates automatic optimization methods for an agent that generates Rocq proofs. The setting is a simplified RocqStar-style loop, and the question is whether automatic prompt, memory, or control-flow optimization can approach a carefully engineered proof agent. The abstract reports: “simple few-shot bootstrapping is the most consistently effective; however, none of the studied methods matches the performance of a carefully engineered state-of-the-art proof agent.” (Abstract, PDF p. 1.)

The benchmark is 300 IMM theorems, split by the length of the human reference proof. The test set contains 50 theorems from each difficulty group, and 60 separate theorems train the optimizers (Section 3, PDF p. 3). Every test run uses GPT-4.1 and at most 20 tool calls; success means the Rocq environment accepts a proof (Section 3). The DSPy and Koog implementations use slightly different training subsets, with DSPy mildly skewed toward easier theorems, so cross-framework absolute comparisons require caution (Section 3).

Inference: for VeruLaw, the useful lesson is a controlled way to optimize prompts and proof-agent context against a real verifier. Rocq tactics and Verus Rust proofs differ, so the proposed Verus forms are inferences.

## baseline: minimal proof-agent loop

What it is. The authors remove RocqStar's hand-built planning, reflection, critique, retrieval-based replanning, and auxiliary controls. The baseline repeatedly observes the current proof state, reasons lightly, chooses a tool call, and executes it until termination. They describe the core as “a single-loop agent topology, where a minimal control structure repeatedly observes the current proof state, performs lightweight reasoning, selects a tool call, and executes it until termination.” (Section 2, PDF p. 2.)

How to do it.
1. Expose the current Rocq goal and context to GPT-4.1 (Section 2).
2. Let the model produce either a tool call directly (Koog Simple) or intermediate reasoning followed by a tool call (Koog ReAct and DSPy ReAct) (Section 3, PDF p. 3).
3. Execute the tool call in Rocq and return the new proof state or error (Sections 1–3).
4. Repeat until the theorem is solved or the 20-call budget is exhausted (Section 3).

Verus form. Inference: expose the current Verus diagnostics and source context, ask the model for a Rust/specification edit or proof action, run Verus, and feed back the resulting obligations or errors. A passing Verus invocation is the termination condition. Inference: the model's explanation is untrusted; only the verifier's result should mark a candidate as solved.

Evidence. The unoptimized Simple agent reaches 6% overall in Koog, while the unoptimized ReAct reaches 20%; DSPy ReAct reaches 19% (Table 1, PDF p. 3). These totals are percentages of the 150-theorem test set (50 in each of three proof-length groups), inferred from the stated split; the table itself reports percentages, not raw counts. The hand-written SOTA agent reaches 53% overall under the same table.

Limits and assumptions. This is a deliberately simplified baseline, not the strongest RocqStar pipeline. Performance depends on GPT-4.1 tool use, context windows, and the IMM benchmark. The paper does not test whether a stronger baseline would change optimizer rankings.

## technique 1: BootstrapFewShot from successful traces

What it is. BootstrapFewShot collects successful execution traces from optimizer-training theorems and inserts the first four demonstrations directly into the prompt. The four-example cap is due to context limitations (Section 2, PDF p. 2; Section 3, PDF p. 3). The demonstrations show proof-state observations, reasoning or tool calls, and accepted Rocq transitions.

When to use it. Use when a small set of verifier-accepted traces is available and prompt context is limited. This is the paper's most reliable optimization method.

How to do it.
1. Run the baseline agent on the 60-theorem optimizer-training set (Section 3).
2. Keep successful execution traces (Section 2).
3. Select at most four traces and place them in the prompt before test-time proof generation (Section 2).
4. Evaluate the resulting agent on the fixed test split with at most 20 tool calls (Section 3).

Verus form. Inference: collect successful Verus proof-repair trajectories containing the original obligation, source edit, verifier output, and final verified state. Insert a small number of structurally relevant examples into the agent context. Keep the exact toolchain and dependency versions with each example so that an accepted trace is replayable. Inference: examples teach behavior but do not discharge a new Verus obligation.

Evidence. Koog Simple rises from 6% to 13% overall with BootstrapFewShot; Koog ReAct rises from 20% to 33%; DSPy ReAct rises from 19% to 40% (Table 1, PDF p. 3). For DSPy ReAct, the three difficulty-group rates change from 38%, 16%, 4% to 66%, 32%, 22%; for Koog ReAct they change from 34%, 16%, 10% to 54%, 28%, 18% (Table 1). The paper concludes that “Few-shot demonstrations lead to reliable performance improvements in all evaluated settings” (Section 3, PDF p. 4).

Limits and assumptions. Longer demonstrations exhaust context and increase token use (Section 3). Training traces can overfit the benchmark's theorem distribution. The paper does not isolate how much gain comes from better examples versus implicit framework prompt handling; it warns that Koog and DSPy BootstrapFewShot results reflect framework-specific differences.

## technique 2: optimize instructions and demonstrations with MIPROv2, SIMBA, or GEPA

What it is. The paper evaluates three prompt-centric optimizers in DSPy. MIPROv2 proposes instruction candidates and demonstration sets, then performs discrete Bayesian optimization over their combinations. SIMBA randomly searches prompt variants and keeps changes that improve task performance. GEPA performs evolutionary optimization over textual prompts or instructions, with optional reflective feedback (Section 2, PDF p. 2).

How to do it.
1. Define the ReAct agent's prompt and demonstration slots as optimizer parameters (Section 2).
2. Run each optimizer on the 60-theorem training subset using Rocq success as the score (Section 3).
3. Freeze the selected prompt and evaluate on the 150-theorem test set with the 20-call limit (Section 3).
4. Record wall-clock optimization time and success by proof-length group (Section 3).

MIPROv2 uses light mode in this study because heavy mode is substantially more expensive; GEPA uses heavy evolutionary search. The paper leaves heavy MIPROv2 for future work (Section 3 footnote, PDF p. 4).

Verus form. Inference: expose Verus agent instructions, proof-edit examples, and tool-call formatting as optimizer parameters. Score each candidate prompt by verified theorem count under a fixed compile/solver budget. Keep the Verus checker outside the optimizer's learned score and rerun final candidates from clean workspaces.

Evidence. DSPy ReAct with MIPROv2 reaches 43% overall, with 66%, 42%, and 22% by difficulty; SIMBA also reaches 43%, with 60%, 42%, and 26% (Table 1, PDF p. 3). BootstrapFewShot reaches 40% overall, so the more complex methods are comparable but not clearly better. GEPA reaches 17% overall, with 30%, 18%, and 4%, below the unoptimized 19% DSPy ReAct baseline (Table 1). Optimization times are 12 hours for MIPROv2, 14 hours for SIMBA, and 32 hours for GEPA (Table 1).

Limits and assumptions. The comparison uses one GPT-4.1 model, a single benchmark, and unequal optimizer modes. The authors state that “more sophisticated methods do not consistently outperform simpler baselines in this setting” (Section 3, PDF p. 4). The reported performance does not justify assuming prompt evolution will improve a different proof assistant or a Verus code-generation agent.

## technique 3: maintain contextual knowledge with ReasoningBank and ACE

What it is. Both methods run the agent on training data, use a language model to analyze successful and failed executions, and store reflections. ReasoningBank embeds the test query and retrieves the five most similar memories; ACE maintains an agent-specific context that is incrementally refined and injects up to 200 memories at inference (Section 2, PDF pp. 2–3). ReasoningBank also has a no-retrieval variant that injects the full memory bank.

How to do it.
1. Execute the baseline on training theorems and classify successes and failures (Section 2).
2. Generate high-level reflections about effective strategies and failure modes (Section 2).
3. Store reflections in the method's memory structure (Section 2).
4. At test time, retrieve the top five ReasoningBank items by encoder similarity, or inject the entire bank for the no-retrieval ablation; for ACE, inject its maintained context (Section 3, PDF p. 4).
5. Run the proof loop with the same 20-call budget (Section 3).

Verus form. Inference: store verified and failed Rust proof attempts with normalized diagnostics and task features. Retrieve a small number of memories whose specifications and diagnostics resemble the current obligation. Avoid injecting an unbounded memory dump into the prompt; retain provenance and rerun any suggested edit through Verus.

Evidence. Koog Simple with ReasoningBank reaches 17% overall, versus 10% with ACE and 6% unoptimized (Table 1, PDF p. 3). Koog ReAct reaches 25% with ReasoningBank and 17% with ACE, versus 20% unoptimized. Disabling ReasoningBank retrieval gives 21% for ReAct, lower than 25% with top-five retrieval (Table 1). The authors report that “ReasoningBank benefits from retrieving a small number of relevant memory items rather than injecting the entire memory bank into the prompt” (Section 3, PDF p. 4).

Limits and assumptions. Similarity retrieval assumes the input used for encoding is meaningful. In this experiment the raw input initially contains only a theorem identifier and file path, while the actual proof state is resolved later; the authors say this requires additional engineering (Section 3). ACE's large context can introduce noise. Memory reflections are model-generated and may be wrong; Rocq acceptance still provides the decisive check.

## technique 4: optimize control flow with ADAS

What it is. ADAS represents the agent as executable code and asks a language model to generate code defining the agent's topology from the available tools and task description (Section 2, PDF p. 3). The authors run ten optimization runs and report the best agent obtained (Section 3, PDF p. 4).

How to do it.
1. Describe the proof task and available Rocq tools to the ADAS optimizer (Section 2).
2. Let it generate executable agent control-flow code (Section 2).
3. Run the generated agent on training theorems, keep candidates with improved proof success, and iterate (Section 3).
4. Select the best of ten runs and evaluate it on the fixed test set (Section 3).

Verus form. Inference: allow a code optimizer to propose a bounded orchestration policy for Verus calls, such as when to inspect diagnostics, retry an edit, or branch candidates. Treat generated orchestration as ordinary untrusted code and sandbox it. The final Rust proof remains accepted only after a clean Verus run.

Evidence. ADAS reaches 17% overall, with 30%, 14%, and 8% by proof-length group (Table 1, PDF p. 3), equal to or below several simpler methods. The authors report no monotonic improvement across iterations; the best agent appears early and exhibits training-data bias and brittle hard-coded logic (Section 3, PDF p. 4).

Limits and assumptions. Ten runs and one benchmark do not establish the general behavior of code-level agent optimization. Generated control logic may overfit training theorems and can introduce tool-call bugs or unsafe resource use.

## what is proved, measured, and trusted

Rocq's checker decides whether a proposed proof is accepted. The paper measures theorem success percentages by proof-length group, total success, optimizer wall-clock time, and the effect of a fixed 20-call test budget. It does not prove the optimizer's generated prompts, memories, or control code correct. It also does not compare all methods under identical training subsets: DSPy and Koog use slightly different 60-theorem subsets, and DSPy is mildly easier (Section 3).

Inference: in VeruLaw, the corresponding trusted boundary is the Verus verifier plus the specifications, imported contracts, solver, compiler, and environment assumptions. Automatic prompt or workflow optimization can improve the rate of verified candidates but cannot validate that the specification matches product intent.

## threat to a product of agent-written verified Rust

Inference: the main product threat is false confidence from benchmark gains. Even the best automatic optimizer reaches 43% in the tested DSPy setting, while the hand-written agent reaches 53%; most proposed changes leave a large fraction of theorems unsolved. Context methods can also inject misleading reflections, and ADAS can create brittle control logic. A Verus product should measure verified pass rate on held-out specifications, repair cost, solver time, and failures after dependency changes rather than optimize prompt scores alone.

## what VL should not redo

Inference: VL should not assume that expensive prompt evolution or agent-topology search will replace a small curated set of successful Verus traces. This paper already finds few-shot bootstrapping the most consistent low-cost improvement and shows that more complex optimizers can regress. VL should reuse that baseline pattern, then test any additional optimizer against a fixed verifier-gated benchmark.

## techniques for the catalog

- minimal verifier loop — repeatedly observe a proof state, choose a tool action, execute it, and stop only on checker acceptance
- successful-trace bootstrapping — insert a small fixed set of accepted proof trajectories into the agent prompt
- instruction and example search — optimize prompts and demonstrations with Bayesian, random, or evolutionary search
- reflection memory — store model-generated summaries of successes and failures for later retrieval
- top-k memory retrieval — inject only the most similar contextual memories instead of the full bank
- executable topology search — generate and evaluate alternative agent control-flow programs
- fixed-budget optimizer evaluation — compare success by proof difficulty under a common tool-call limit

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
