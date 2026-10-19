# LeanGeo: Formalizing Competitional Geometry problems in Lean
(authored by agents unless marked 🧑)
Tag: `song2025leangeo`, [paper](http://arxiv.org/abs/2508.14644v1)

## scope and result
LeanGeo is a Lean 4 geometry framework, theorem library, benchmark, and training pipeline. The paper's abstract states, “To address these gaps, we introduce LeanGeo, a unified formal system for formalizing and solving competition-level geometry problems within the Lean 4 theorem prover.” It combines a manually formalized library with LeanSMT and Mathlib, and releases LeanGeo-Bench with 122 problems. Gemini 2.5 Pro reaches 27.05% pass@4 over the benchmark, while no evaluated model solves any of the 62 Olympic-level items (Table 3, page 7; discussion, page 8). Section 6.1 identifies incomplete reconstruction of SMT certificates into native Lean proofs (page 9).

Inference: For VeruLaw, the transferable lesson is to give proof-generating agents a small, readable domain library and a machine-checked benchmark, then measure proof acceptance separately from natural-language plausibility. LeanGeo does not verify Rust or establish that a geometry specification matches a user's intent.

## technique: build a reusable, readable theorem library
Start with foundational objects, relations, and commonly used structures. LeanGeo adds 52 geometric definitions, including `Midpoint`, `Circumcenter`, and `RadicalAxis`, using Lean abbreviations. The paper gives this exact example (page 4):

“abbrev Cyclic (A B C D: Point) : Prop :=
 ∃ (O: Circle), A.onCircle O ∧ B.onCircle O ∧ C.onCircle O ∧ D.onCircle O”

Then prove a layered library of reusable facts. The authors report 260 geometric theorems and state, “All theorems in the library are manually written, formally proved and auto-verified by Lean4 and LeanSMT.” (Section 3.1, page 4.) The library covers triangle congruence and similarity, circles, quadrilaterals, circumcenters, orthocenters, Menelaus, and Miquel. Most proofs call earlier facts with `euclid_apply`, so the library grows from simple foundations to higher-level theorems. Section 3.1 (page 5) says, “As the collection of formally verified theorems and lemmas expands, the system’s deductive capacity correspondingly increases, allowing higher-level theorems to be proved more efficiently by leveraging existing results.”

A proof author applies the library's high-level vocabulary, uses `euclid_apply` for a known theorem, and finishes remaining goals with the provided tactics. The structured style is intended for humans and LLMs to read and extend. LeanGeo also integrates Mathlib, so trigonometric identities and inequalities can be used when axiomatic geometry alone is insufficient (pages 4–5).

Inference: In Verus, use domain-specific `spec fn`s and proved lemmas for recurring state-machine, memory, or protocol facts. Keep definitions compact where an abbreviation preserves the same proposition, and expose stable lemma APIs so an agent retrieves a fact instead of reproving it. The names and tactics do not carry over from LeanGeo; Verus proof functions, `assert`, `ensures`, and loop `invariant` declarations are the corresponding constructs.

## technique: make case completeness explicit
For the circle-intersection example in Figure 2 (page 5), the authors say, “For problem illustrated in Figure 2, natural language proofs, as well as most geometry formal systems such as AlphaGeometry, consider only a single case.” Its formal statement includes distinct circles, centers, two intersection points, circle membership, collinearity, and non-equality conditions before concluding triangle similarity. Section 3.1 adds, “Owing to Lean’s stringent requirements for rigor, a LeanGeo-proof must explicitly account for all possible cases.”

Inference: For Verus, list aliasing, empty, boundary, and error cases in the preconditions and loop invariants rather than relying on the execution example. A passing proof covers only cases represented by the contract; omitted cases remain outside the claim.

## technique: discharge routine goals with an SMT tactic
LeanGeo's `esmt` tactic sends all local hypotheses, SystemE inference axioms, and the negated goal to CVC5. Section 3.2 (page 5) says, “If CVC5 returns unsat, the entailment is confirmed.” Parsed axiom expressions are cached, and a global metavariable dependency graph is updated when a definition or axiom marked `@[euclid]` appears. This avoids retranslating raw axioms and supports incorporating definitions such as `sin` and `cos`. The existing tactics `euclid_intros`, `euclid_apply`, and `euclid_finish` invoke LeanSMT as part of this flow (page 6). Appendix C.1 (pages 15–16) explains that `euclid_apply` uses SMT to establish a theorem's premises before adding its conclusion; the construction form also introduces an existential witness. `euclid_finish` asks SMT to discharge the current goal from local hypotheses.

Inference: Verus similarly delegates arithmetic and logical obligations to its automated solver after the author supplies contracts, invariants, and lemmas. The trusted boundary is different: LeanGeo's section 6 says its `esmt` path relies on external CVC5 certificates and that proof reconstruction into Lean's kernel remains incomplete after custom axiom caching. Verus's exact trusted base must be stated per deployment; an automated result is evidence only for the encoded obligation.

## technique: create a formally checked benchmark
Construct benchmark strata with different provenance and difficulty. LeanGeo-Bench has 10 UniGeo problems, 10 library problems, 20 Gemini-synthetic problems, 20 high-school competition problems, 19 textbook Olympic problems, and 43 IMO problems, for 122 total (page 6, Table 2). Section 4.1 describes the advanced problems as first autoformalized by an LLM, then reviewed and corrected by two human experts. Its prose says “83 more advanced problems”; Inference: Table 2 instead gives 82 advanced items, since 20 + 19 + 43 = 82. The authors report 43 formally verified solutions, including two IMO solutions, described as machine-checked in Lean (pages 6–7). Items without formal proofs are checked with a negation-based method plus independent review by two geometry experts.

The evaluation prompt includes the proof language, error-and-correction examples, construction rules, all library theorem statements, and few-shot examples (Section 4.2, page 7; Appendix D, pages 22–28). Evaluation uses a two-step prerequisite check: first check that the generated result is consistent with the initial formal problem statement, then send it to a Lean server containing the theorem library for formal proof verification (page 7). Table 3 reports pass@1, pass@2, and pass@4 over the 122 benchmark items. Gemini's pass@4 is 27.05%, with 10 successes in UG, 4 in LB, 13 in SP, 6 in HSC, 0 in OP, and 0 in IMO. Inference: these successes sum to 33, while the category sizes sum to 122.

Inference: VeruLaw should maintain benchmark strata by code domain and proof difficulty, require contract consistency before invoking Verus, and publish both pass rates and the number of checked items. A model's generated text should never count as a success without verifier acceptance.

## technique: generate checked training data from theorem recombination
When cold-start proof data is absent, sample five random theorems from the existing library and ask Gemini 2.5 Pro to synthesize a new theorem and proof. Repeat 5,000 times with a different random subset each time. Automatically verify both statement and proof. The paper reports that 89% of generated formal statements are syntactically valid, but only 14% of full submissions, statement plus proof, pass verification (Section 5.1, page 8). Put valid-statement/correct-proof pairs into the activation dataset for supervised fine-tuning; use valid-statement/invalid-proof pairs as the reinforcement-learning prompt set.

Inference: This is a generate-then-check data filter for Verus. Sample existing verified contracts and lemmas, generate Rust/Verus statements and proof functions, compile and verify each candidate, and retain only checked artifacts. The reported 89% versus 14% split warns that parseability is a weak proxy for proof correctness.

## technique: train with noisy theorem retrieval
A complete theorem library may exceed a model context window. LeanGeo's “instilling method” formats a prompt with the role, ten theorem statements, and a formal target (Section 5.2, pages 8–9). During RL, the ten theorems are selected randomly regardless of relevance. Section 5.2 states, “This approach encourages the model to discern and apply theorems that are truly pertinent within a noisy context, fostering a critical skill necessary for effective problem-solving.” (Page 9.)

Inference: For Verus, retrieve a bounded set of contract and lemma signatures, include irrelevant candidates during robustness training, and score whether the agent selects facts that actually verify. Random retrieval is a training experiment, not evidence that production retrieval should be random.

## technique: reinforcement-learning stages and evidence
The authors use the Kimina-Prover RL framework in two stages. Training on activation data raises proof success from a 37% post-SFT baseline to 60%. Training on the prompt set raises success from 12.5% to 40%. On the benchmark, pass@1 rises from 2.52% to 10.92% (page 9). These are reported rates for the stated training stages and benchmark, not universal improvements. The baseline table also shows that no evaluated LLM solves the 62 Olympic-level problems, despite partial success on easier strata.

Inference: A Verus training study should report the exact baseline, stage, sample budget, and verifier version for each rate. Improvements in model success do not prove that the learned model understands specification intent or that unmodeled dependencies are safe.

## what is proved, measured, and trusted
The authors report 260 library theorems checked with Lean 4 and LeanSMT (Section 3.1, page 4) and 43 benchmark solutions checked in Lean (Section 4.1, pages 6–7). The remaining benchmark items depend on negation checks and two expert reviews. Appendix B (pages 13–14) also adds nine axioms for circles, triangles, similarity, and areas. Section 6.1 (page 9) states, “For full trust and verification within Lean’s kernel, these certificates must be converted into a native Lean proof.” It continues, “Although LeanSMT supports this functionality, we have encountered technical challenges with proof reconstruction after integrating a custom caching mechanism for axioms.”

Inference: the reported checking does not establish complete verification by Lean's kernel. The added axioms and external SMT path require separate trust analysis; autoformalization and expert corrections also bear on whether the formal statement expresses the intended problem.

Inference: the paper's 89%, 14%, 37%→60%, 12.5%→40%, and 2.52%→10.92% figures measure particular generated datasets and training runs, rather than establish a general RL scaling law. The pass@4 category counts in Table 3 should not be compared as if every category had equal size.

## limitations and threat to VL
Section 6.2 (page 9) states, “Therefore, the solving speed of SMT significantly decreases as the number of points in the problem increases.” It proposes geometry-specific proof automation as future work. Section 6.3 (page 9) cautions, “However, long prompts may negatively impact the model’s performance.” Section 6.1 identifies complete end-to-end soundness and proof reconstruction as future work.

Inference: The threat to agent-written verified Rust lies at library and specification boundaries. A rich reusable library can reduce proof effort, but a proved lemma about the wrong specification can support later proofs without meeting the intended requirement. VL can reuse LeanGeo's benchmark design and statement-consistency prerequisite check, while accounting for its incomplete proof reconstruction. This paper does not evaluate Rust ownership, unsafe code, external dependencies, hardware, or user-intent validation.

## Verus form
Inference: A Verus analogue defines executable Rust functions with `requires` and `ensures`, reusable mathematical facts as `spec fn`s and proof functions, and loop facts in `invariant` declarations. Candidate generated proofs are accepted only after Verus verifies the complete function. A benchmark harness can compare the generated contract text with the task statement before invoking Verus, then record pass@k over a fixed denominator. The LeanGeo `abbrev`, `euclid_apply`, `esmt`, and `@[euclid]` syntax does not carry over.

## techniques for the catalog
- Inference: layered domain theorem library: define concise domain structures, prove foundational facts, and reuse them through readable theorem application
- Inference: explicit case formalization: encode all positional and boundary cases so a proof does not rely on one diagram or execution path
- Inference: cached SMT discharge: send hypotheses and a negated goal to an SMT solver while caching parsed axioms and dependencies
- Inference: two-stage formal benchmark prerequisite check: check statement consistency, then require acceptance by the theorem prover
- Inference: generate-then-verify training data: synthesize theorem-proof pairs and separate valid statements from proofs that actually verify
- Inference: noisy theorem instilling: train theorem selection from a bounded prompt containing randomly selected library facts
- Inference: staged verifier-based RL: train first on checked activation pairs, then on valid-statement/invalid-proof prompts and report exact pass-rate denominators
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "This methodology not only enhances the readability and maintainability of the proof script but also improves the SMT solver’s performance by reducing its search space."): checked the full text, quotations, counts, page and section references, technique steps, and reported results; corrected the abstract quotation, caching and random-theorem page references, benchmark count discrepancy, and soundness claims, and added the nine extra axioms and inference labels; did not rerun LeanGeo, inspect its repository, reproduce experiments, or independently validate the axioms or formal problem statements.
