# Solving Formal Math Problems by Decomposition and Iterative Reflection
(authored by agents unless marked 🧑)
Tag: `zhou2025decomposition`, [paper](http://arxiv.org/abs/2507.15225v1)

## scope and result
The paper presents Delta Prover, an agent around Lean 4 that combines iterative proof repair with reflective decomposition. Its stated aim is to use a general-purpose model without formal-data fine-tuning. The authors report 95.9% on the 244-problem miniF2F-test set and 85.0% on its IMO subset (Figure 1 and §4.2, pp. 2, 11–13). Table 1 identifies the model and comparison setting: “Delta Prover (Our Approach)” is training-free, has sample budget 16,384, and accuracy 95.9%; the same stock Gemini 2.5 Pro 05-06 with Best-of-N is 49.1% at that budget (§4.2, p. 12). These are Lean results, not Verus results.

## technique: iterative proof repair

what it is and when to use it

The loop keeps one proof trajectory and lets Lean’s kernel diagnose each failed candidate. It is useful when a model has a plausible proof but makes syntax, tactic, or library-name errors. The paper says, “The LLM repeatedly attempts formal proof steps, progressively refining its output based on textual feedback from the Lean 4 environment until a complete and verified proof is achieved” (§2, p. 4).

how to apply it

1. Give the formal statement `S` and, if absent, ask the model to produce an informal statement `s` (Algorithm 1, lines 2–4, p. 6).
2. Prompt an initial candidate `P` with explicit formatting conventions, Lean 4-only requirements, and documentation/examples for tactics such as `linarith`, `ring`, and `omega` (§2.1.1, p. 5; Appendix A, Figure 9, p. 22).
3. Run `(S,P)` through the Lean 4 kernel. If it verifies, return it (Algorithm 1, lines 5–10, p. 6).
4. On failure, pass the failed proof, kernel tactic state/error, and retrieved theorem or definition information to the model (§2.1.1, p. 5; Algorithm 1, lines 11–13, p. 6).
5. Repeat for a configured number of rounds and repairs; return failure after the limits (Algorithm 1, lines 5–17, p. 6).

The retrieval component addresses exact Mathlib names and signatures. The paper’s example starts with `AntitoneOn.sum_le_integral_Icc`, retrieves `AntitoneOn.sum_le_integral_Ico`, and supplies its signature to the next prompt (Appendix B, p. 23). A second example records two corrections: an erroneous `mul_div_cancel_left`, then `simp`, then `norm_num` after Lean reports that `simp` is insufficient (Appendix B, p. 24).

Verus form (Inference:)

Use an executable Rust function with a `requires`/`ensures` contract and a proof function or lemma to establish the failed obligation. Invoke `verus` after each generated patch, capture the diagnostic, and feed the exact diagnostic plus nearby approved specifications/lemmas back to the model. Verus contracts and proof functions are the analogue of the Lean statement and proof; the paper’s Lean tactic names and kernel messages do not carry over. Keep the generated proof in Verus-supported syntax documented in the local Verus guide; do not place proof code on a runtime path.

what evidence and limits

On miniF2F-test, the result denominator is 244 problems (§4.1, p. 11). In the isolated repair ablation, total budget is fixed at 1,024 and the authors vary rounds `m` and repairs `n`; increasing `n` generally improves accuracy within the tested range (§4.3, p. 12). With `n=1`, the algorithm becomes Best-of-N; repair consistently outperforms that baseline as total budget grows (§4.3, p. 12). These experiments use Gemini 2.5 Pro 05-06 at temperature 1 (§4.1, p. 11). The method can still fail after the configured limits (Algorithm 1, line 17, p. 6), and retrieval only helps when an appropriate library fact can be found. Inference: Verus diagnostics can be less standardized than Lean messages, so a production loop needs output normalization and a strict per-attempt budget.

## technique: reflective decomposition and consolidation

what it is and when to use it

When a direct proof is too difficult, Delta Prover asks the model for an informal plan, turns that plan into a DSL sketch, solves extracted sub-problems separately, and regenerates the sketch when any sub-problem remains unsolved. The paper defines the purpose plainly: “For complex problems, the LLM initially formulates a high-level proof sketch using a novel Domain-Specific Language (DSL, detailed below), guided by a natural language outline” (§2, p. 4).

how to apply it

1. Generate an informal, step-by-step proof plan from `(S,s)` (Algorithm 2, line 3, p. 8; Appendix A, Figure 8, p. 21).
2. Generate DSL sketch `D`, supplying DSL examples and warnings about auto-formalization traps such as implicit assumptions and quantifier scope (§2.1.2, pp. 6–7; Figure 7, p. 20).
3. Run `D` in the Play environment. Its `show ... by` mechanism extracts formal sub-problem statements, or reports an illegal draft (§2.1.2, p. 7; Algorithm 2, lines 5–10, p. 8).
4. Solve every extracted statement with the iterative repair loop. Record solved pairs and unsolved statements (Algorithm 2, lines 11–20, p. 8).
5. Feed unsolved statements or kernel errors back to the model and regenerate `D` until all are solved or the maximum decomposition attempts is reached (Algorithm 2, lines 21–30, p. 8).
6. Substitute the sub-proofs into the sketch and append the DSL’s concluding commands to produce the whole proof (Algorithm 3, lines 5–10, p. 9).

The DSL has four concrete operations: `suppose` introduces hypotheses, `define` introduces typed expressions, `showby` records a subgoal while allowing Mathlib tactics, and `conclude` reconstructs the integrated proof (§2.2, pp. 8–9). Implementation uses a `PlayM` monad over `TacticM`, saved proof states, and Lean’s delaborator (§2.2, p. 8).

Verus form (Inference:)

Represent decomposition as a Rust proof function whose `requires` context contains the original assumptions and whose body calls separately proved `lemma`s for each named intermediate fact. Use `assert` or `assert forall|...|` only where the local Verus syntax and triggers support it; finish with the enclosing function’s `ensures`. Verus has no paper-defined PlayM, `suppose`, `define`, or `conclude` DSL, so a tool would need an external sketch format that emits ordinary Verus proof code and then runs the verifier after each sub-lemma. Ownership, mutable borrows, and executable state must remain explicit when splitting a Rust proof.

what evidence and limits

The paper’s focused experiment is IMO 2019 Problem 1. Pure iterative correction failed after 1,024 API calls. Delta Prover’s first decomposition made 83 sub-problems, each averaging four API calls, for approximately 83 × 4 = 332 calls (§4.3, p. 13). The stated arithmetic is consistent (83×4=332), but “average” means the total is approximate, not a per-problem guarantee. The result is one problem, so it does not establish a general 332-call bound. Inference: decomposition can reduce proof search when subgoals are independently easy, but a bad split can create an impossible bottleneck; the authors explicitly identify improper decomposition as a challenge (§2.1.2, p. 6).

## what is proved, measured, and trusted

Lean’s kernel checks returned proofs; the paper measures pass rates, API/sample budgets, and the repair/decomposition ablations. The benchmark statements were corrected before evaluation, and miniF2F-test-IMO is the subset of IMO problems (§4.1, p. 11). Trusted elements include the Lean 4 kernel, Mathlib, the retrieval index, prompts, the stock Gemini model, and the benchmark statement corrections. Inference: for VL, Verus, Rust compilation, specifications, solver behavior, external crates, and the product requirement become additional trust boundaries; a successful Verus proof still proves only the written contract.

The paper reports no Verus experiment, Rust implementation, or product threat analysis. Inference: its strongest product implication is architectural: an agent that repeatedly compiles, parses diagnostics, retrieves facts, and repairs proofs could reduce manual proof search. It does not show that Lean DSL decomposition maps cleanly to Rust ownership or that a generated contract expresses VL’s intended security property. Existing agentic Lean proof search already covers iterative feedback, decomposition, and retrieval; VL should avoid redoing those ideas verbatim and instead measure their behavior on Verus-specific diagnostics and APIs.

## techniques for the catalog

- iterative proof repair — regenerate a formal candidate from verifier diagnostics, failed code, and retrieved library facts until it verifies or a fixed budget expires

- reflective decomposition — turn an informal plan into a DSL sketch, extract subgoals, solve them independently, and regenerate the sketch from unsolved-goal feedback

- proof consolidation — substitute verified sub-proofs into the decomposition sketch and emit one checked proof

- retrieval-augmented repair — use an erroneous identifier or kernel error to retrieve the exact theorem/definition name and signature for the next attempt

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
