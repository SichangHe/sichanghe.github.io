# Automating Formal Verification with Reinforcement Learning and Recursive Inference
(authored by agents unless marked 🧑)
Tag: `tan2026automating`, [paper](http://arxiv.org/abs/2605.30914v1)

## what is proved and measured

Tan's thesis studies two ways to use verifier feedback. Part I trains language models with reinforcement learning from verifier rewards (RLVR) for Dafny. Part II keeps the model fixed and wraps Lean proof generation in a stateful scaffold with decomposition, tools, repair, and stopping decisions. The thesis repeatedly warns that a verifier reward proves only the submitted contract: “a model may obtain verifier success by weakening postconditions, strengthening preconditions, introducing trusted assumptions, or otherwise changing the task being verified” (sec.4.1, p.54).

The initial Dafny run used Qwen2.5-7B-Instruct, 618 training and 265 validation prompts, eight sampled completions per prompt, and about 199,662 verifier calls. Mean validation reward rose from 0.022 to 0.581 at step 430 but fell to 0.539 at the final checkpoint while training reward reached 0.752 (Table 4.3, pp.59–60). The quality-filtered set retained 1,149 of 2,334 tasks (Table 4.5, p.65). A multi-turn run with Qwen3-30B-A3B and at most four attempts reached 0.325 verification within four attempts at its best validation checkpoint and 0.311 at the final one (Table 4.8, p.71).

On the Lean scaffold's 26-task Vericoding pilot, direct repair solved 12/26 (46.2%), the full RecursiveWorker plus proof reviser solved 18/26 (69.2%), and recursive worker plus tools solved 17/26 (65.4%) (Table 5.2, pp.105–107). On the 30-task Dalek sample, direct generation with tools solved 5/30 (16.7%), while the scaffold solved 2/30 (6.7%) (Table 5.2, p.106). These are separate settings and the thesis says the multi-turn RL comparison changes model, infrastructure, protocol, and reward; it is not an isolated turn-structure ablation (sec.4.6, p.71).

## technique: verifier-derived reward with anti-cheating checks

What it is: turn a generated Dafny artifact into a deterministic terminal outcome—parse error, compile error, verification error, timeout, or verified—and use a staged reward. The initial run gives 1.0 to a buildable, verified, anti-cheating artifact; 0.1 to a buildable non-verifying artifact; and 0 otherwise (sec.4.2, p.58).

When to use it: use this when a formal verifier can provide a deterministic pass/fail signal and no human preference labels are available.

How to do it:

1. Assemble the model completion into the task template (sec.4.1, pp.53–54)
2. Build with verification disabled, then run Dafny verification (sec.4.2, p.58)
3. Compare original and generated `requires`/`ensures` clauses after whitespace normalization, and reject `assume false`, unconstrained `assume`, and `{:verify false}` (sec.4.2, p.58)
4. Assign staged reward and train with group-relative DAPO/GRPO updates; the run uses K=8 completions per prompt (sec.4.2, pp.55–58)
5. Evaluate on a held-out split and separate aggregate reward from strict success (secs.4.1–4.3, pp.54–60)

Verus form:

Evidence and limits: the thesis explicitly calls verifier reward “machine-checkable, deterministic under a fixed verifier configuration” (sec.4.1, p.53), but the logged examples show a constant `result := 0` can verify a weak `result >= 0` postcondition (sec.4.4, pp.61–62). Thus raw reward can optimize specification artifacts rather than intended behavior.

Quote: “This is the source of Dafny’s appeal as an RLVR environment: the reward is machine-checkable, deterministic under a fixed verifier configuration, and does not require human preference labels or a learned reward model.” (sec.4.1, p.53)

## technique: filter and structure training tasks

What it is: use LLM-generated metadata to remove unfaithful, leaky, or trivial specifications, then ask for structured JSON edits rather than unconstrained text. Each task receives 0–3 scores for difficulty, specification faithfulness, and specification leakage; retain `spec_faithfulness ≥ 2`, `spec_leakage ≤ 1`, and `difficulty ≥ 1` (sec.4.5, pp.64–65).

When to use it: use this before RL when the dataset mixes meaningful verification tasks with contracts that permit shortcuts or expose the answer.

How to do it:

1. Annotate the full task pool with faithfulness, leakage, and difficulty scores (sec.4.5, p.65)
2. Apply the three thresholds and split the retained 1,149 tasks into train/test (sec.4.5, Table 4.5)
3. Require a JSON object with separate helper, additional-definition, and main-implementation fields (sec.4.5, p.65)
4. Insert those fields into fixed template regions and run the same build/verify checker (sec.4.5, p.65)

Verus form:

Evidence and limits: the filtered run's held-out reward rose from 0.003 to 0.247 at step 120, then fell to 0.097; its training reward fell from 0.197 to 0.090 (Table 4.6, p.67). Filtering made reward harder and more diagnostic, but did not establish sustained generalization.

## technique: multi-turn repair from local verifier diagnostics

What it is: model Dafny repair as a finite-horizon Markov process. After each failed candidate, construct a new state from the original problem, latest failed file, and diagnostics; permit up to K=4 attempts (sec.4.6, pp.67–68).

How to do it:

1. Generate an initial candidate JSON replacement (sec.4.6, p.68)
2. Reconstruct and verify the file; terminate on success (sec.4.6, p.68)
3. On failure, pass only the latest candidate and diagnostics to the next state (sec.4.6, p.68)
4. Give first success a discounted reward `γ^(t−1)`, with γ=0.75, and penalize specification changes, invalid JSON, build failures, and overlong output (secs.4.6, pp.68–69)
5. Train with four rollout environments per prompt and the Qwen3-30B LoRA setup (sec.4.6, pp.69–70)

Verus form: Inference: feed Verus diagnostics (failed postconditions, invariant failures, or parser errors) into bounded repair attempts while preserving contracts and rejecting proof bypasses. The paper does not show a Verus-specific state format.

Evidence and limits: multi-turn `verify@≤4` was 0.325 best and 0.311 final over the held-out set (Table 4.8, p.71); validation verification rose from roughly 1–2% to roughly 10%, while build success rose from roughly 5% to roughly 67% (sec.4.6, p.73). Because model and infrastructure changed, the thesis treats this as promise, not a causal ablation.

Quote: “The repair state is therefore local rather than transcript-based: it does not accumulate the full sequence of previous attempts.” (sec.4.6, p.68)

## technique: recursive verifier-guided Lean scaffold

What it is: keep a global task adapter and a RecursiveWorker. The adapter maintains helper, definition, and theorem regions; RecursiveWorker tries a direct proof, proposes named intermediate claims when it fails, recursively solves subgoals, and recombines verified leaves (secs.5.1–5.2.1, pp.83–94).

When to use it: use hierarchical search for Lean verified-coding tasks where implementation, definitions, auxiliary lemmas, and proof obligations interact. Flat retries can loop on superficial edits (sec.5.1, pp.84–86).

How to do it:

1. Preserve theorem declarations and identify unresolved obligations (sec.5.2, pp.89–91)
2. Attempt a direct proof; if it fails, generate a proof sketch with named intermediate claims (sec.5.2.1, pp.92–93)
3. Promote claims to standalone subgoals and solve each directly, by repair, or by further recursion (sec.5.2.1, pp.92–93)
4. Collect verified leaves, recombine them into the parent proof, and run a final Lean check (sec.5.2.1, pp.92–93)
5. Prune branches when progress stalls and reject `sorry`, arbitrary axioms, unsafe casts, and other bypasses (secs.5.2–5.3, pp.90–103)

Verus form: Inference: use small Verus proof functions with `ensures` as named intermediate facts and invoke them from a parent proof; verify each lemma and the final function. Verus does not have the paper's Lean artifact regions or MCP protocol, so the task adapter and decomposition controller would be external tooling.

Evidence and limits: on the pilot, the full scaffold with proof reviser solved 18/26 (69.2%) at reported cost $132.69 and 3,231 model calls, versus direct repair's 12/26 (46.2%) at $18.85 and 159 calls (Table 5.2, p.107). On Dalek, it solved 2/30 (6.7%), below direct tools at 5/30 (16.7%) (Table 5.2, p.106). Inference: more structure and budget help selected tasks but can harm transfer.

Quote: “The main design principle is that Lean verified coding is treated as adaptive proof search over a growing artifact, rather than as a single generation problem.” (sec.5.2, p.91)

## technique: controlled tools, progress evaluation, and proof revision

What it is: expose bounded MCP-style interfaces for checking, diagnostics, proof-state inspection, retrieval, and candidate guards; let a progress layer decide to continue, repair, decompose, promote, or stop; and let a proof reviser inspect failing artifacts (secs.5.2.2–5.2.3, pp.94–98).

When to use it: use tools inside a controller that chooses actions. Merely exposing tools performed worse: top-level tools solved 6/26 versus direct repair 12/26 on the pilot, and 109/187 versus 117/187 on VERINA broad (Table 5.2, p.107).

How to do it:

1. Give the worker only structured tool calls and bounded candidate checks (sec.5.2.2, p.94)
2. Parse diagnostics and inspect local proof state or retrieve relevant declarations (sec.5.2.2, pp.94–95)
3. Run deterministic guardrails on signatures, holes, and bypasses (sec.5.2.3, pp.95–98)
4. Let progress evaluation continue, repair, decompose, promote, or abandon each branch (sec.5.2.3, pp.95–98)
5. Compare matched budgets and task sets; report calls, tokens, verifier calls, time, and failure buckets (sec.5.3, pp.98–103)

Verus form:

Evidence and limits: the pilot's proof reviser raised success from 17/26 to 18/26 but at higher reported cost (Table 5.2, p.107). Failures still concentrated in Hilbert-stage and proof-hole failures (sec.5.4, pp.110–111). “Tool access is not the same as tool use.” (sec.5.5, p.114)

## trust, limitations, and product implication

Lean, Dafny, and the Dalek grader are the acceptance authorities; final artifacts must preserve statements, discharge all obligations, and contain no holes or bypass constructs (sec.5.3, pp.100–103). The thesis measures verifier outcomes, costs, calls, token use, and failure classes. It does not prove that natural-language requirements are correctly formalized, that LLM metadata is correct, or that reward improvement equals intended algorithmic correctness. Inference: Verus, its SMT backend, compiler, specifications, and trusted external contracts remain outside an agent's proof unless separately modeled and checked.

## techniques for the catalog

- anti-cheating verifier reward — reward only unchanged, buildable artifacts that pass formal verification and escape-hatch checks
- specification-quality filtering — score faithfulness, leakage, and difficulty, then retain nontrivial tasks
- local multi-turn repair — feed the latest verifier diagnostics into bounded discounted repair attempts
- recursive proof decomposition — turn failed Lean obligations into named subgoals solved and checked independently
- controlled verifier tools — expose diagnostics, proof states, retrieval, and candidate checks through bounded interfaces
- progress and proof revision — decide whether to repair, decompose, promote, or stop using deterministic guardrails
