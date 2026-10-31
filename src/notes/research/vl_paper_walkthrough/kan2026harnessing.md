# Harnessing Code Agents for Automatic Software Verification
(authored by agents unless marked 🧑)
Tag: `kan2026harnessing`, [paper](http://arxiv.org/abs/2607.06341v1)
## scope and contribution

The paper presents Aria, a general code-agent plus verification-harness design for automatically proving Coq and Lean lemmas. Its central claim is that the agent need not be forced into tactic prediction, premise retrieval, decomposition, or a hand-designed repair strategy. The agent receives a whole lemma, edits the source, and receives machine-generated verifier feedback until the kernel accepts the proof. The paper says: “We show that imposing such a strategy is unnecessary, and limiting: handing the whole lemma to a general LLM code agent—for example, Claude Code [1]—free to choose its own approach, and wrapping it in a verification harness is both simpler and more effective” (Abstract, PDF p. 1). The target is demanding higher-order concurrent separation logic, not only small sequential benchmarks.

The evaluated sets are Iris’s four core modules (4,257 lemmas), RustBelt standard-library developments (217 lemmas), reglang (318 lemmas), and 72 not-yet-ported iris-lean lemmas. The abstract reports that Aria proves all four sets fully automatically. The Iris and RustBelt results use Coq; iris-lean uses Lean. The paper reports no expert intervention and zero failures for each set. The campaign used Claude Opus 4.7 as its principal model and a Claude Code command-line agent.

## technique 1: whole-lemma agent under a kernel harness

What it is. Give a coding agent the complete lemma and repository context, rather than asking a specialized predictor for one tactic. The agent reads the source file, definitions, and lemmas already in scope, edits the proof, and receives the failing line, error, and pending goal after every rejected attempt. The paper describes the method as: “We hand a whole lemma to a general LLM code agent—an off-the-shelf coding tool built for everyday software engineering” (Section I, PDF p. 2). The agent is free to choose its own proof strategy.

When to use it. Use this when proof obligations require context-sensitive choices, higher-order reasoning, or tactics that a fixed search strategy does not capture. The paper specifically targets Iris concurrency, shared mutable memory, ghost resources, and RustBelt proofs. It also uses the same design for ordinary regular-language lemmas and a different prover (Lean), showing that the harness is not tied to one proof domain.

How to do it, from the paper. (1) Strip each target lemma’s existing proof while preserving the statement and surrounding file. (2) Ask the agent to prove the named lemma; the prompt can be only “Prove the lemma …” because the agent reads the file (Section IV-A, PDF p. 5). (3) Let the agent write a complete proof with its normal file-editing tools. (4) Submit the edited file to the prover after the turn. (5) If the prover rejects it, return the failing step, exact error, and pending goal. (6) Keep the same conversational session and retry, appending the latest feedback, for at most 30 attempts. (7) Count the lemma only when the kernel and all policy checks accept it. The HHL example expresses this as `while !proved && tries < 30`, `invoke(...)`, `proved = !r.is_error`, and `feedback = "\nPrevious error: " ++ r.result` (Section IV-A, PDF p. 5).

Verus form. Inference: use a Rust workspace containing the target `fn`, its `requires` and `ensures`, and surrounding definitions; ask the agent to edit the proof body; run `verus` after each turn; feed back the verifier diagnostic and remaining obligation; retry in the same session with a bounded counter. Inference: acceptance should require the Verus verifier to close the function’s obligations, rather than trusting the model’s claim. Verus syntax must use ordinary `requires`, `ensures`, `assert`, `proof fn`, `lemma`, and `invariant` statements as supported by the local Verus reference; the paper itself does not specify Verus syntax.

Evidence. Aria proved 4,257/4,257 Iris-core lemmas, 217/217 RustBelt lemmas, 318/318 reglang lemmas, and 72/72 iris-lean lemmas, each with zero failures in the reported campaigns (Abstract and Section VI, PDF pp. 1, 6–9). Iris first-attempt success is 79.2%; RustBelt is 72.8%; reglang is 75.5%; iris-lean is 90.3% (Figure 5 and Section VI, PDF pp. 8–9). These percentages use the respective complete lemma sets as denominators.

Limits and assumptions. The paper’s guarantee depends on the prover kernel and on a correctly implemented harness. It assumes the repository builds, target lemmas can be extracted and restored, and the model has enough context and retry budget. The authors report that open-source models proved a fixed 40-lemma subset but were much slower and often failed on proofs longer than roughly 50 lines (Section VI-G, PDF p. 10). Inference: long or highly coupled Verus proofs may need stronger context management, decomposition, or model capacity even when the harness is sound.

## technique 2: declarative HHL hooks and policy checks

What it is. Harness Hook Language (HHL) is a declarative language for binding policy functions to agent events. It makes the checks auditable and reusable instead of embedding them in ad-hoc driver code. The paper says, “By making these concerns first-class language constructs, HHL keeps the agent layer concise and auditable while letting the harness layer enforce strong correctness guarantees uniformly across all proof attempts” (Section IV, PDF p. 4).

How to do it. (1) Declare pre-hooks for `Write|Edit` and `Bash` events. (2) Declare post-hooks for tool events and for the end of a model turn. (3) Define a workspace with working directory, system prompt, and allowed tools. (4) In a workflow, iterate over lemma names and call `invoke` with the workspace, prompt, pre-hook list, and post-hook list. (5) Compile HHL to the target agent SDK: the paper maps pre-hooks to `PreToolUse`, post-hooks to `PostToolUse`, and a Turn hook to driver post-turn logic (Section IV-B, PDF p. 6).

The example uses five checks. `check_imports` rejects edits adding `Require` or `Import`; `no_banned` rejects `admit`, `Admitted`, or an outright-assuming axiom; `safe_command` blocks build and file-deleting commands; `iris_lint` checks Iris style after a turn; and `verify_proof` invokes the kernel plus coverage checks. Pre-hooks run before an action and can deny it. Post-hooks return `Ok` or `Err`; hook order is the declared list order (Section IV-A, PDF pp. 4–5).

Verus form. Inference: implement equivalent pre/post wrappers in the Rust agent driver. A write hook can reject edits that add `assume`, `external_body`, or unauthorized axioms; a command hook can allow only the intended `verus` invocation and read-only tools; a post-turn hook can run Verus and a coverage checker over the target functions. Inference: unlike Coq’s `Admitted`, the forbidden Verus escape hatches must be chosen from the project policy and local Verus documentation. The paper gives no Verus policy list.

Evidence and limits. The harness is described as the “trust anchor” and final authority is the Coq or Lean kernel (Sections III-C and IV-A, PDF pp. 4–5). The policy checks prevent silent target removal and unsafe side effects, but the paper does not provide an independent soundness proof for every Python hook. Inference: policy code itself becomes trusted infrastructure and needs tests, review, and restricted permissions.

## technique 3: staged extractor–prover–fixer–polisher pipeline

What it is. Aria separates proof discovery, repair, and style polishing into roles. An Extractor finds unproved lemmas and checks that none were missed; a Prover generates the first proof; a Fixer repairs rejected proofs; and a Polish agent rewrites accepted proofs against a soft rubric. Every generated or rewritten proof still passes the hard harness. The paper states: “The model is never taken at its word: a lemma counts as proved only once the Coq harness has checked it” (Section V, PDF p. 6).

Steps. (1) Run extraction and a lemma-count completeness check. (2) Send each target to a Prover. (3) On rejection, give the error and open goal to a Fixer and resubmit. (4) Stop on acceptance or attempt limit. (5) Start a fresh Polish session from the accepted proof. (6) Score conciseness, transparency, robustness, idiomatic style, and reuse; ask the Polish agent to address failed criteria. (7) Re-run the kernel after every rewrite, with at most two polishing rounds; retain the already-correct proof if style still fails (Section VI-H, PDF p. 10).

Verus form. Inference: the same roles can operate over a Rust crate: a target extractor identifies functions lacking verified bodies; a prover writes a proof; a fixer consumes Verus diagnostics; and a fresh polisher edits only after verification succeeds. Inference: style criteria should remain soft and must never replace Verus acceptance.

Evidence and limits. The paper gives complete-set results for the hard proof stage, but it does not report a separate success denominator for polishing. Inference: polishing adds cost and another editing surface; keeping the kernel check after every rewrite is necessary to prevent a style pass from invalidating correctness.

## technique 4: session and context management

The retry session is deliberately reused: each retry carries prior attempts and accumulated errors. Sessions carry over across at most six consecutive lemmas within a file, then reset; every new file starts fresh. The authors explain that adjacent lemmas often share definitions, whereas a long history dilutes relevant context and slows the model (Section V-B, PDF p. 7). The Polish agent always starts fresh, so it is independent of proof discovery.

Inference: for Verus, use bounded reuse by module or nearby functions, preserve verifier diagnostics, and reset before unrelated APIs. This is a context heuristic, not a soundness mechanism. Its assumption is that nearby Rust functions share useful invariants; the paper does not test other grouping policies.

## what is proved, measured, and trusted

The proved claims are kernel-checked lemmas in the four benchmark families. Measured quantities include complete-set success, first-attempt rate, retry count, and model time. For example, RustBelt’s 217/217 lemmas had 73% first-attempt success and 86% success within one retry; reglang’s 318/318 had 75.5% first-attempt success and mean 0.38 retries (Section VI-C–D, PDF pp. 7–8). RustBelt’s mean time was 706 seconds per lemma, while Iris and reglang were lower (Figure 5, PDF p. 8). The private Opus model solved all 40/40 fixed-subset lemmas with 72.5% first-attempt success; Kimi K2.6 also solved 40/40 but with 55% first-attempt success, up to 24 retries, and roughly seven times the elapsed time (Section VI-G, PDF p. 10).

Trusted components include the Coq or Lean kernel, the proof assistant implementation, the HHL compiler/runtime, Python policy hooks, the extraction and coverage checks, and the model’s availability. The paper’s zero failures means zero failures under these harness and benchmark conditions; it does not prove that arbitrary generated code is safe outside the checked specifications.

## techniques for the catalog

- whole-lemma kernel loop — give a general code agent a complete lemma, run the prover, return exact diagnostics, and retry with a bounded budget

- declarative event hooks — enforce imports, banned constructs, command safety, linting, coverage, and kernel verification through auditable pre/post hooks

- staged proof pipeline — separate extraction, first proof, error repair, and fresh-session style polishing while kernel-checking every accepted edit

- bounded session reuse — preserve retry history and nearby-lemma context for a small window, then reset to prevent context dilution
