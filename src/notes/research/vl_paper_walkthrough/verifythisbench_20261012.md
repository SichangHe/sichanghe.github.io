# VerifyThisBench: Generating Code, Specifications, and Proofs All at Once
(authored by agents unless marked 🧑)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## what this paper contributes

VerifyThisBench evaluates the complete chain from an informal problem statement to a compiled, machine-verified program: the model must infer a specification, write verification-aware code, and prove the specification. VerifyThisBenchXS removes one artifact at a time to measure narrower abilities. This is a benchmark and experimental protocol rather than a new proof calculus; its useful techniques are how to construct tasks, run feedback-driven proof generation, separate failure modes, and avoid treating a verifier pass as proof that the natural-language intent was captured.

The authors summarize the target precisely: “models must (i) extract formal specifications, (ii) implement in a verification-aware language, and (iii) construct machine-checkable proofs.” The benchmark spans Dafny, Frama-C, VerCors, VeriFast, Why3, CBMC, and Verus, and evaluates nine language models. A task passes only when the target tool returns no error; a separate coherence check asks whether the generated specification matches the natural-language intent.

For VL, the benchmark's direct analogue is a Verus task in which an agent writes Rust, `requires`/`ensures`, loop invariants, and proof blocks from a short requirement. The benchmark's pass metric can test proof-generation infrastructure, but its coherence metric and manual inspection are needed to detect a vacuous or misaligned contract. The rest of this study records an executable way to reproduce that evaluation.

## technique 1: construct end-to-end tasks from competition artifacts

Start with human-vetted VerifyThis challenges from 2011–2024. Preserve the natural-language description (which often has little pseudocode), split challenge work into implementation and verification subtasks, and package the expected framework/tool. The paper reports 41 challenges and 154 tasks in its construction section. Solutions can be as long as 648 lines, against a maximum of 225 in prior end-to-end Lean work (paper, Section 1).

Step by step (the study's reconstruction, inference: the paper gives only the construction sentence above, not a procedure): collect a challenge and its original description; identify each implementation or proof obligation; encode a task prompt without a formal specification; attach the language/framework and verifier command; keep a reference human solution for later relaxed variants; and test that the task itself is solvable by the tool. Include arrays, trees, memory safety, concurrency, and complex data structures so a model cannot rely on one algorithmic template.

In Verus, the artifact is a Rust source file plus the command and exact tool version. The benchmark's seven-tool abstraction carries over, but a VL corpus should pin Verus and Rust versions because solver behavior and syntax drift. A task's human solution is evidence that the problem is expressible, not evidence that an agent's generated contract states the intended property.

A catalog inconsistency must be preserved: Section 2.3 says the benchmark contains “734 tasks derived from the VerifyThis competition series,” while Section 3.1 says the resulting dataset includes 41 challenges and 154 tasks. The paper gives no reconciliation (734 may count subtasks or framework instances). VL should report both raw challenge/task counts and the denominator actually attempted, rather than silently choosing one.

## technique 2: run a unified, tool-gated evaluation loop

Use one environment and one pass criterion across frameworks. The environment integrates seven tools with pinned versions (Appendix C), and Docker container images and launch scripts are released. For every attempt: send the same prompt template to the model, compile and verify with a one-minute timeout, classify the result, then return verifier errors on later attempts. The paper says, “A task is marked as pass/succeed if no error is returned.” This is a reproducible mechanical gate, not a human judgment.

The four-step formal-verification flow in the paper is itself a reusable recipe: (1) annotate code with preconditions, postconditions, assertions, and loop invariants; (2) generate verification conditions; (3) send them to an SMT/theorem-proving backend; (4) feed success or failure back to the developer. In Verus, the annotations are Rust contracts and proof functions, the verifier generates SMT obligations, and error diagnostics become the feedback payload. The exact solver is a trust dependency and should be recorded.

Keep model prompts, temperature, hardware, timeout, and retry budget fixed. The experiment used temperature 0.7 when applicable, an Intel i7-1360P with 16 GB RAM, and five attempts per task. The first attempt was zero-shot; four later attempts received the full prior history and current verifier feedback. For multi-stage VerifyThis tasks, only the previous subtask's final attempt carried forward; XS tasks used isolated contexts.

## technique 3: use feedback-driven iterative refinement

The model first writes the whole solution. On each subsequent round, give the compiler/verifier diagnostics and all earlier attempts, then ask it to repair code, specifications, and proofs. This tests whether a model can use proof failures as actionable information rather than merely measuring one-shot memorization. Record pass rate after the initial attempt and after the fourth repair, not only the best run.

The measured improvement is large but incomplete. On strict VerifyThisBench, o3-mini rose from 3.62% zero-shot to 9.37% after refinement, a 5.75 percentage-point gain. Across all models, overall zero-shot pass rates ranged from 0.28% (Qwen) to 3.62% (o3-mini); refined rates ranged from 1.11% to 9.37%. By tool, mean Verus success rose from 3.32% to 8.15%, and CBMC from 4.76% to 18.11%.

For VerifyThisBenchXS, o4-mini led at 17.24% after refinement and Claude at 3.62% zero-shot; the overall zero-shot rate per model was 1.03–3.62% and the refined rate 3.45–17.24% (Table 2). Feedback is therefore useful, but a sub-10% strict pass rate means VL cannot assume a repair loop will make agent-written verified Rust reliable.

## technique 4: isolate specification, implementation, and loop-invariant skills

Construct XS from a human solution by deleting exactly one artifact type. In Code-Gen, provide the function specification and remove implementation and proof annotations. In Specification-Gen, provide implementation and proof and remove specifications. In Loop-Gen, provide specification and implementation and remove loop invariants. The paper creates 580 XS tasks: 226 code-generation, 233 specification-generation, and 121 loop-invariant tasks. CBMC is absent from XS because no prior CBMC solutions existed; Table 6 lists Verus with 31 implementation, 27 specification, 31 loop and a total of 99; the parts sum to 89, and the specification column's other entries sum to 223 rather than the stated 233, so the table is internally inconsistent (likely a Verus specification count of 37, the study's inference).

This decomposition tells VL where an agent fails. Overall refined XS rates were 9.73% for code, 11.27% for specifications, and 9.81% for loops. For o4-mini, specification refinement reached 18.45% and loop refinement 20.66%, while code refinement was 14.16%. The paper's prose says loop completion is “lower than 10%,” which holds for the 9.81% overall figure in Table 5 but not for individual models such as o4-mini (20.66%); the prose is a generalization over the overall row.

In Verus, VL can run the same ablations: hold a trusted contract fixed and ask for code; hold code fixed and ask for contracts; hold both fixed and ask only for invariants. A pass in specification generation still needs intent review because a false contract can be easy to prove.

## technique 5: classify outcomes beyond pass/fail

Partition every attempt into NOGEN (no code), Compile Error, Timeout, Partial (some obligations prove), and Succeed. Plot these categories for zero-shot and refinement, strict and relaxed settings. This distinguishes syntax/API failures from hard mathematical obligations. The authors find compilation errors dominate; relaxed templates reduce them and increase partial results, while timeout rates remain relatively stable. A one-minute timeout means the attempt exceeded the measurement budget; it is not evidence of incorrectness.

For VL, record Verus parse errors, failed SMT queries, unsatisfied preconditions, timeouts, and unsupported Rust features separately. The category is evidence about the agent/tool boundary: a compile failure suggests interface knowledge; a timeout suggests solver complexity or missing lemmas. Do not collapse them into one accuracy number.

## technique 6: measure specification–intent coherence separately

A verifier proves the supplied formal specification, not the English requirement. After generation, run a second model pass without exposing chain-of-thought and ask whether the specification aligns with the original intent. Compute coherence only over verifier-passed outputs, and manually inspect a subset. This is an auxiliary confidence signal, not a proof of alignment.

The paper reports, “While passing a formal verifier indicates syntactic and logical correctness, it does not address the alignment problem.” Average coherence was only 43% of passed solutions; except for o3-mini and Qwen, models' self-confidence was below 50%. The authors call this an optimistic upper bound because the self-assessment can be wrong and manual inspection found overconfidence for o3-mini.

In VL, require a human or independent checker to compare `ensures` clauses with the user requirement, especially when the contract is trivially true, has overstrong preconditions, or omits error behavior. A Verus pass plus coherence score is still conditional evidence, not a product guarantee.

## technique 7: compare tools and model specialization

Average results reveal framework-specific skill. On strict tasks, CBMC improved most (4.76% to 18.11%), Verus improved from 3.32% to 8.15%, and VeriFast stayed near zero (0 to 0.43%). On XS, Dafny rose from 1.35% to 21.47%, Verus from 7.52% to 17.28%, and VeriFast from 5.22% to 9.93%. No model dominated every framework: o3-mini excelled on CBMC and Verus, Claude on Dafny/Frama-C, Gemini on VerCors, and Llama on Verus.

For VL, benchmark multiple model/tool combinations and retain per-tool rates. A product claim based only on the best Verus model would hide failures in other Rust constructs. Tool syntax and semantics are part of the task, so retrieval or fine-tuning on one verifier may not transfer.

## what is proved, measured, and trusted

The only machine-checked claim per successful attempt is that the generated artifact compiles and satisfies its generated formal obligations under the selected verifier, solver, timeout, and tool version. The benchmark does not mechanically prove that the specification reflects the natural-language request; coherence is self-assessed and manually sampled. It also does not establish robustness to adversarial prompts, version changes, or tasks outside the VerifyThis distribution.

Trusted elements include each verifier, its VC generator, solver, language parser, timeout classification, the reference task decomposition, and the benchmark authors' decision about what counts as a task. In a VL reproduction, Rust/Verus versions, solver seeds, and any harness assumptions must be recorded. A zero-shot pass denominator is the number of task/model/tool attempts, while the paper's tables are per-tool percentages; readers should not infer an overall task count from a percentage without that denominator.

## what VL should reuse, avoid, and fear

VL should reuse the strict/relaxed split, iterative diagnostic loop, outcome taxonomy, and independent intent check. The benchmark already demonstrates that end-to-end generation is much harder than proof completion with artifacts supplied; VL should not report only a curated set of successful proofs or compare itself to ordinary code-generation benchmarks. It should add Rust-specific tests for ownership, unsafe code, solver timeouts, and contract vacuity.

Threat assessment (inference). The threat to a product of agent-written verified Rust is high if “verified” means only that generated obligations pass. The strict benchmark's best overall refined rate is 9.37%, and coherence is uncertain even among passes. Feedback improves results but cannot repair an underspecified contract. A practical VL gate therefore needs independent specification review, explicit precondition-strength checks, negative tests, and a provenance record of every verifier/solver assumption.

## techniques for the catalog

- end-to-end verification benchmark construction — turn natural-language, competition-vetted challenges into tasks requiring specification, implementation, and machine-checked proof
- unified verifier execution — pin tools, prompts, hardware, timeout, and pass criterion so results are comparable across frameworks
- diagnostic iterative refinement — feed compiler and verifier errors plus prior attempts back to the model for bounded repair rounds
- artifact deletion ablations — remove code, specifications, or loop invariants separately to measure the corresponding model skill
- outcome taxonomy — distinguish no generation, compilation failure, timeout, partial proof, and complete success
- independent coherence checking — assess whether a passed formal specification matches the original natural-language intent
- per-tool/per-model evaluation — retain framework-specific rates because model strengths and syntax compatibility differ

Audited 2026-10-12 against the paper: checked all numbers against Tables 1-6, Sections 2.3, 3.1-3.4, 4.2-4.7 and Appendices A, C, E; corrected the XS per-model range, the loop prose reading, the 734-task location (Section 2.3), the unsupported sandbox claim, the Verus XS count (Table 6 is internally inconsistent), marked the task-construction steps as reconstruction, and removed a leftover process sentence. Quotations, the Verus-related reasoning and the marked threat assessment were checked and left as they were.
