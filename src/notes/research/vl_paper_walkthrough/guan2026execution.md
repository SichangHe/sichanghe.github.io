# Execution-Verified Reinforcement Learning for Optimization Modeling
(authored by agents unless marked 🧑)
Tag: `guan2026execution`, [paper](https://doi.org/10.48550/)

## what EVOM does and what remains trusted
EVOM trains a solver-conditioned code generator with execution outcomes instead of process traces. The paper's core description is: “Given a natural-language problem and a target solver, EVOM generates solver-specific code, executes it in a sandboxed harness, and converts execution outcomes into scalar rewards.” (Abstract, p.1) The trusted elements are the ground-truth outcome labels, solver implementations, sandbox, parser, reward code, base model, and the assumption that the objective value or status captures correctness. Inference: for Verus, the analogous verifier is the `verus` compiler and its solver backend, but a proof result still depends on the written `requires`/`ensures` contract and models of external code.

## technique: strict structured output and sandbox observation
Each response must contain exactly one `<think>` block followed by one `<code>` block. The parser executes only code; malformed tags are non-executable. The harness runs code under a 10-second timeout and 2 GB memory cap, invokes the selected solver, and returns `o = (c, σ, v, ℓ)`: execution flag, solver status, objective value, and logs (§3.2–3.3, pp.3–4). Apply it step by step: (1) include the target solver name in the context; (2) generate the tagged response; (3) parse exactly one code block; (4) execute in a resource-limited sandbox; (5) normalize syntax/import/runtime failures and solver status into the observation tuple; (6) retain logs for diagnosis.

Inference: a Verus harness can require a single Rust module, run `verus` with a pinned toolchain, and record exit status, diagnostics, verification time, and build logs. Unlike EVOM, Verus proofs are static and do not return an objective value; the outcome should be proof success plus explicit checks for compilation and trusted assumptions. Do not treat a free-form `<think>` block as evidence: the paper itself says it is never executed.

## technique: outcome-only reward
The reward is `R(y,o;a) = rfmt(y) + rans(o;a)`. The paper states, “Crucially, no intermediate reasoning traces or reference programs are used in reward computation.” (Section 3.4, p.4) Format reward gives partial credit for one occurrence of each tag and a regex match. Outcome reward is 1 only when execution succeeds and either the numeric objective is within absolute and relative tolerance 10^-4 of the ground truth or a discrete solver status equals the ground truth; otherwise it is 0 (§3.4, pp.4–5). Numeric closeness is `|v-a| < 10^-4` or `|v-a|/max(|a|,10^-12) < 10^-4`.

Apply it by retaining only problem/outcome pairs, executing each generated program, computing format and correctness rewards, and discarding process traces and reference code. Inference: for Verus, `rans=1` can mean `verus` exits successfully and the proved postcondition is checked against a separately trusted specification suite. This only rewards the stated property; it cannot discover that the property is incomplete.

## technique: GRPO or DAPO closed-loop update
For each context `(q,s)`, sample a group of outputs, execute all, normalize rewards within the group as `A_i=(R_i-μ_R)/(σ_R+δ)`, and apply GRPO's clipped policy objective (§3.5, p.5). DAPO removes the KL term, uses asymmetric clipping, and skips uninformative groups. The full loop is: generate a group, execute, compute rewards, compute group-relative advantages, update the policy, and repeat. Inference: a Verus proof generator can use the same group-level update with binary compile/proof rewards and richer diagnostics as non-training metadata; reward normalization should not replace a hard acceptance gate.

## technique: solver transfer by environment switching
EVOM distinguishes zero-shot transfer, which changes only the solver label and execution backend, from low-cost adaptation, which continues the same loop under a target backend without reconstructing solver-specific datasets (§3.6, p.5). Apply it by training on one backend, swapping the observation-producing environment for another, and either evaluating directly or continuing outcome-only updates. The paper reports zero-shot Gurobi-to-OR-Tools transfer and adaptation to COPT/OR-Tools.

Inference: Verus can test toolchain, library, or platform variation by replaying the same proof-generation policy against pinned verifier environments. API changes are not automatically abstracted as solver changes; proof scripts may require explicit migration.

## evidence and limitations
On the Gurobi evaluation, EVOM (GRPO) scored 62.95 OptiBench, 84.08 NL4OPT, 88.19 MAMO-E, 34.28 MAMO-C, and 31.00 IndustryOR, average 60.10% (Table 1, p.6). The paper says its training data is 3,000 OR-Instruct problems, with process annotations discarded; accuracy is the fraction of test instances whose predicted outcome matches the ground truth, using 0.05 relative tolerance in the main results (§4.1, p.6). Zero-shot Gurobi-to-OR-Tools EVOM scored 54.31, 77.55, 84.81, 22.27, and 24.00% on the same five benchmarks, while ORLM SFT scored 3.49, 4.89, 0.00, 1.42, and 6.00% (Table 2, p.7). Adaptation gains under OR-Tools were +11.63, +17.96, +28.99, −2.37, and +11.00 percentage points (Table 3, p.7). These are benchmark percentages, not proof soundness rates; MAMO-C includes corrected erroneous reference answers, and the paper does not report every test-set denominator in the tables.

Removing the reasoning block caused a “significant performance collapse across most benchmarks,” while MAMO-E slightly improved (Ablation, p.7). GRPO and DAPO curves were nearly identical under the same setup (Sensitivity, p.8). The method assumes deterministic execution, a correct answer label, and an objective that can stand for correctness. It does not address adversarial sandboxes, specification omission, unsafe foreign functions, or the soundness of a solver itself.

## techniques for the catalog
- sandboxed execution observation: normalize parser, runtime, solver status, value, and logs into a deterministic tuple
- outcome-only reward: reward only executable outputs whose verified outcome matches a trusted answer
- group-relative verifier RL: update a policy from within-group normalized execution rewards
- environment switching: transfer or adapt by changing the verification backend instead of rebuilding process labels
