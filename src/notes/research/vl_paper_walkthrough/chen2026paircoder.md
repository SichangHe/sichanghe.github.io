# PairCoder++: Pair Programming as a Universal Paradigm for Verified Code-Driven Multimodal and Structured-Artifact Generation
(authored by agents unless marked 🧑)
Tag: `chen2026paircoder`, [paper](https://www.semanticscholar.org/paper/3fee873288142ec3e7d644c1dfbbefcd349dc1f7)

## scope and result

PairCoder++ treats code generation as a loop in which a Driver writes code and a Navigator inspects concrete compiler, execution, test, or rendering evidence. The paper's claim is about toolchain-verifiable artifacts, not a proof in a sound theorem prover. Its abstract says: “We present PairCoder, which grounds review in the toolchain and realizes it as two agent pair programming: a Driver agent writes the program, a Navigator agent reviews it against verification evidence (diagnostics, execution results, and renderings of the current artifact beside the target), and the two switch roles when errors persist.” (Abstract, p.1) The method therefore supplies a practical oracle and a repair policy; it does not prove semantic properties that the benchmark oracle omits.

The paper evaluates 17 public benchmarks, seven models from three vendors, and official metrics such as pass@1, compile or execution rate, SSIM, CLIP, DINO, SigLIP-2, and Chamfer. Its main grid reports, for example, gpt-5.4-mini GenCAD-Code executability 0.200→0.783 and 3DCodeBench executability 0.200→0.783, while the exact denominators are the benchmark cases (60 for these rows; Table 2, p.11). The paper reports an overall 7.4× token ratio over 138M logged tokens (§4.5, p.10). These are reported benchmark measurements, not guarantees for Verus programs.

## technique 1: verification-grounded driver/navigator loop

Use this when a generated program can be run through a concrete checker that emits diagnostics, a test result, or a rendering. The paper defines a Driver as responsible for construction and revision and a Navigator as responsible for checking and actionable feedback (§3.2, p.4). Apply it as follows.

1. Put the task specification Q in shared state. On the first round prompt the Driver with Q and collect a complete candidate C1; the paper explicitly says, “on the first round the Driver is prompted with the task Q alone and emits C1” (§3.2, p.4).
2. Run the candidate through the benchmark's own toolchain before review. The paper says, “Before each review the candidate Ct is run through the benchmark’s own toolchain and the result is attached to the Navigator’s prompt as evidence ψt” (§3.2, p.5).
3. Include up to three signals: compile/execute diagnostics, an optional specification test, and a candidate rendering beside the target for image tasks (§3.2, p.5). Preserve the evidence in the interaction memory.
4. Prompt the Navigator with Q, Ct, prior memory, and ψt. Require either `[NOERROR]` or `REVISE(∆t)`. A revision must quote the offending line, the violated requirement, and a specific fix (§3.2, p.5).
5. Feed Ct, Rt, and ψt back to the Driver, which returns the full revised program. Continue until acceptance or the budget T is exhausted. Algorithm 1 gives the loop: verify at line 9, review at line 11, return on `[NOERROR]` at lines 12–13, update memory and roles at lines 15–18.
6. If the verifier passes and the Navigator cannot identify a definite fault, accept; the paper calls this conservative rule: “when ψt already passes and the Navigator cannot point to a definite fault it must accept with [NOERROR] rather than churn working code on style or vague suspicion” (§3.2, p.5).

Verus form (inference): make `exec` Rust code expose a `spec fn` model and a `requires`/`ensures` contract, then run `verus` as the evidence-producing checker after each generated revision. The Navigator receives compiler/prover diagnostics and any failing proof obligation; it proposes a concrete contract or proof change. A Driver revision is a complete Rust function plus proof code. A Verus proof uses `proof fn` and `assert`/`assert forall` where needed, while executable code remains separate. The loop itself is an orchestration policy outside Verus; Verus does not provide the two-agent roles. A benchmark execution result cannot replace a Verus proof of the intended contract, and a passing proof still depends on the contract being the right one.

Evidence and limits: the full Table 1 grid shows broad gains, but the paper reports occasional regressions where the signal is weak, for example DS-1000 on some DeepSeek models and RTLLM compile-only evidence (§4.3, p.9). The abstract states that gains “concentrate where the toolchain provides an informative oracle and the baseline leaves headroom” (Abstract, p.1). This technique assumes the checker is informative and that the task's requirement can be observed through it. It does not catch an error absent from the checker.

## technique 2: self-mirror role prompts and explicit review verdicts

Use this to keep the two agents' responsibilities distinct across turns. The implementation injects a role-specific system message whenever an agent acts. The paper defines `SelfMirror(ρt,Q,Mt)=concat(RolePrompt(ρt),Q,Mt)` and says the role prompt “explicitly states whether the agent should act as Driver or Navigator” (§3.4, p.6). Apply it by giving each role a short, stable instruction; provide the Driver the previous candidate, review, and evidence after round one; provide the Navigator the candidate and current evidence. Keep raw dialogue in memory but extract only the program needed to run the verifier (§3.4, p.6).

Verus form (inference): use one generation prompt that asks for executable Rust and proof obligations, and one review prompt that asks only for diagnostics and a proposed proof repair. The review prompt should cite exact lines and failed obligations; it must not silently weaken `ensures`. Role separation is a prompting discipline, not a Verus construct.

Evidence: PairCoder improves all six of seven official metrics in the gpt-5.4-mini multimodal Table 2; ChartMimic is the exception where execution is already near ceiling (Table 2, p.11). The evidence does not isolate self-mirror from the other components.

## technique 3: error-triggered role switching

Use this when the agent that diagnoses a fault is better positioned to repair it. The default switches immediately after each `REVISE`; the Navigator that found the error takes the keyboard and the former Driver reviews the repair (§3.2, p.4). Algorithm 1 calls `CheckSwitch` after updating memory. The paper also tests switching after η consecutive errors, fixed-interval switching, and no switching (§3.2, p.4; §4.6, pp.10–11).

Apply: (1) start with roles ρ0; (2) on `REVISE`, record the error and swap role assignments before repair; (3) have the diagnosing agent generate the full fix; (4) verify and let the other agent review; (5) retain a fixed iteration budget. If no candidate is accepted, return the best candidate seen, ordered first by passing verification, then continuous quality, then recency (Algorithm 1, p.6).

Verus form (inference): switch which LLM edits the Rust/proof pair after a failed verification run. Keep the same contract and evidence. The Verus checker decides whether the revised proof verifies; switching does not alter trust assumptions.

Evidence: in the four-benchmark gpt-5.4-mini study, immediate switching reaches 0.427 on HumanEval-X C++, while delaying to two errors reaches 0.390 and no switching has the same 0.390 (§4.6, p.10). The paper says immediate switching is “the best or tied-best policy on all four benchmarks, and never the worst” (§4.6, p.10). These values are benchmark pass rates under that model and matched budget, not universal probabilities.

## technique 4: safe termination and best-candidate fallback

Terminate immediately on `[NOERROR]`; otherwise stop at τ≥T. If the budget expires, return `arg max Ci∈Mτ Quality(Ci)` rather than the last attempt (Algorithm 1, pp.6–7). Quality prioritizes verification evidence, then a continuous benchmark score, then recency (§3.4, p.6). This avoids replacing a previously valid artifact with a late failed repair.

Verus form (inference): retain the last Rust/proof candidate for which `verus` succeeds and whose tests pass. If all candidates fail, return the candidate with the strongest partial diagnostic only if the surrounding product can safely reject it; a Verus proof cannot certify an unverified candidate.

Evidence and cost: PairCoder consumes 2.9×–9.2× single-model tokens by benchmark, with 7.4× overall over 138M logged tokens (§4.5, p.10). The fallback therefore trades cost for robustness and assumes the quality ordering is meaningful.

## what is proved, trusted, and missing

The paper proves only empirical benchmark outcomes under each benchmark's official checker; it does not prove PairCoder's orchestration, model behavior, or the correctness of benchmark specifications. Trusted components include the frozen LLMs, prompts, program extractor, compilers/interpreters/renderers/simulators, test suites, visual metrics, and the benchmark's target data. Inference: a Verus deployment would additionally trust the Verus verifier, solver, proof erasure, Rust compiler, external-library specifications, and the correctness of the written contracts. The paper's own boundary is clear: “where the toolchain cannot adjudicate, review quality becomes model bound” (§4.3, p.9).

Existing work already supplies generic multi-agent collaboration and self-correction; PairCoder's contribution is the minimal two-role protocol grounded in a task toolchain and role switching. Verus should not redo this as a claim of formal soundness. Inference: threat to a product that accepts agent-written verified Rust is moderate. The loop can reduce failed proofs and repair compiler diagnostics, but it cannot detect a missing or incorrect contract, unsupported unsafe behavior, or a specification that omits a security property. Its 3–9× token cost also creates an operational cost and denial-of-service surface if failure loops are unbounded.

## techniques for the catalog

- verification-grounded review — run each generated program through its concrete toolchain and require the reviewer to cite evidence and a specific fix

- self-mirror roles — inject explicit Driver/Navigator prompts and preserve shared candidate, review, and evidence memory

- error-triggered switching — let the diagnosing agent repair immediately after a revision verdict, then have the other agent review

- best-candidate fallback — stop on acceptance or budget exhaustion and return the highest-quality verified candidate seen

Checked 2026-10-15 against the paper by a Codex agent for paircoder_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
