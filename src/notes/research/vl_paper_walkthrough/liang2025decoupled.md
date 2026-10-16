# Towards Solving More Challenging IMO Problems via Decoupled Reasoning and Proving
(authored by agents unless marked 🧑)
Tag: `liang2025decoupled`, [paper](http://arxiv.org/abs/2507.06804v1)

## central idea

This technical report separates strategic mathematical reasoning from formal proof construction. A general-purpose Reasoner proposes formal intermediate lemmas; a specialized Prover verifies those lemmas; then a Prover or capable reasoner constructs the final proof using the verified lemma library. The abstract describes the aim: “Our approach utilizes two distinct, specialized models: a powerful, general-purpose Reasoner to generate diverse, strategic subgoal lemmas, and an efficient Prover to rigorously verify them.” (abstract, PDF page 1).

The authors evaluate non-geometry IMO problems from 2000–2024 and report five solved problems: IMO 2000 Problem 2, 2005 Problem 3, 2011 Problem 3, 2019 Problem 1, and 2020 Problem 2 (section 3, PDF page 3; section 4, PDF page 7). They release generated and verified lemmas for post-2000 IMO problems (Data Release, PDF page 3). This is a Lean result; the report does not evaluate Rust or Verus.

Inference: for VL, the architecture maps to an agent that proposes Rust proof lemmas and a verifier-facing agent that checks each lemma with Verus before the final proof agent sees it. The separation is valuable only if the final proof is replayed with the same contract, code, and dependency assumptions.

## technique 1: generate strategic formal subgoals with a dedicated Reasoner

What it is. The Reasoner receives a difficult Lean theorem and outputs a proof strategy plus a list of formal theorem declarations, without proofs. The prompt asks for meaningful milestones and forbids trivial mechanical splits. The report's required output is “A list of Lean 4 theorem declarations, each representing a sub-theorem, all starting with ’theorem XXX’ and ending with ’:= by sorry’.” (section 3.1, PDF page 5).

How to apply it. (1) Give the Reasoner the formal main theorem. (2) Ask it to reason through a complete strategy before writing declarations. (3) Ask for intermediate statements that are logically coherent, self-contained, and collectively imply the main theorem. (4) Require the same syntax and conventions as the input theorem. (5) Extract the declarations from the free-form response. (6) Do not ask the Reasoner to prove them; that is the Prover's job. The prompt explicitly says to “Avoid trivial splits such as case analysis or mechanical ‘divide into two cases’ tactics unless they are genuinely part of the reasoning process” (section 3.1, PDF page 5).

The IMO 2019 Problem 1 example decomposes a functional equation into five milestones: derive `f (f x) = 2 f x + f 0`, derive `f (2x) = 2 f x − f 0`, derive a shifted Cauchy identity, characterize a linear form, constrain the parameter, and verify both candidate solutions (section 4.1.1, PDF pages 7–8). This decomposition exposes structure that brute-force tactic enumeration misses.

Verus form. Inference: ask a general model to emit named Verus `proof fn` or lemma declarations with precise `requires` and `ensures`, leaving bodies as placeholders. Each lemma should preserve the Rust function's ownership and integer-width semantics. A useful milestone can be a `spec fn` property over a ghost sequence or map, but executable code must remain separate. Verus does not accept Lean's `by sorry` as a proof; placeholders must be rejected before cataloging.

Evidence and failure. The authors say that a good lemma set can “dramatically prune this search space by decomposing the primary goal into more manageable components” (section 3.1, PDF page 5). However, the Reasoner still misses “magical” human insights: the report identifies an “ingenuity gap” in which systematic decomposition succeeds but non-obvious reframing remains difficult (section 4.3, PDF page 10). A generated lemma can also be formally valid yet irrelevant, so verification alone does not guarantee that it helps the main theorem.

## technique 2: extract candidate lemmas robustly from free-form output

What it is. The Reasoner explains its strategy in natural language and emits theorem declarations. The pipeline uses a regular expression to select declarations matching `theorem (.*?):= by sorry` (section 3.1, PDF page 6). This creates a clean machine-to-machine handoff without attempting to parse every explanatory sentence.

How to apply it. (1) Request a fixed declaration prefix and placeholder proof ending. (2) Run the regular expression over the response. (3) Parse each captured theorem as a standalone source unit. (4) Reject malformed syntax before sending it to the Prover. (5) Preserve the raw response and the extracted declaration for provenance. (6) Deduplicate identical declarations before verification.

Verus form. Inference: use a real Rust parser or Verus compiler diagnostics rather than a permissive regular expression, because Rust generics, attributes, nested braces, and macro syntax can defeat a text pattern. Extract `proof fn` and `spec fn` declarations only when they parse as valid Verus source. Preserve the model's explanation as metadata, not as proof evidence.

Evidence and limits. The paper presents the regex as a “simple yet robust regular expression” (section 3.1, PDF page 6), but provides no precision or recall measurement. The method depends on the Reasoner's adherence to the exact output format; declarations containing nested text or alternate spacing may be missed. Inference: a VL implementation should report extraction failures and never silently omit a proposed lemma.

## technique 3: verify each subgoal independently and filter by pass@k

What it is. Every proposed lemma becomes an independent theorem. A dedicated Prover generates up to k candidate proofs; a lemma is retained when at least one candidate verifies. The report sets k = 128 to trade exploration against cost (section 3.2, PDF page 6).

How to apply it. (1) Send one extracted lemma at a time to the Prover. (2) Generate up to 128 proof candidates. (3) Compile and kernel-check each candidate. (4) Retain the lemma and one verified proof when any candidate succeeds. (5) Discard unverified lemmas from the final context, while keeping them as labeled failures for analysis. (6) Record k, attempts used, and the exact Lean environment. This stage lets the Reasoner be speculative while the Prover imposes formal rigor.

Verus form. Inference: run Verus on each lemma with a fixed crate and contract, sampling up to K candidate proof bodies. Retain only a body that verifies without `external_body` or unverifiable assumptions. Keep the lemma's preconditions and postconditions with the result; a body proved under stronger assumptions cannot be substituted under weaker caller assumptions. Use actual Verus constructs such as `assert`, `assert forall`, `broadcast`, and proof functions; do not represent `invariant` as a call.

Evidence and assumptions. The report calls this stage “a critical filter to ensure that only logically sound and verifiable lemmas are passed to the final stage” (section 3.2, PDF page 6). The claim is relative to Lean's formal statement and environment. It does not show that the statement expresses the intended natural-language problem, and it does not report the number of candidate lemmas or the cost per retained lemma. The authors' later oracle experiment, in which hard lemmas are manually proved or replaced by `sorry`, shows that the Prover's raw strength bounds end-to-end performance (section 4.3, PDF page 10); `sorry` is therefore analysis-only and cannot be production evidence.

## technique 4: construct the final proof from verified lemmas

What it is. The final stage prepends verified lemmas to the main theorem's context and asks a Prover to assemble a proof. The report says: “These lemmas are prepended to the context of the main problem statement, effectively enriching the problem statement with a suite of pre-proven, reusable components.” (section 3.3, PDF page 6).

How to apply it. (1) Gather all subgoals that passed independent verification. (2) Add their declarations and proofs to the main theorem context. (3) Ask a final model to use the lemmas rather than reprove them. (4) Compile the assembled proof. (5) If the final proof fails, diagnose whether the lemma was irrelevant, mismatched, or insufficient and regenerate only the needed stage. (6) Retain the final proof only after the original theorem verifies.

Model specialization matters. DeepSeek-Prover-v2 often ignored standalone auxiliary lemmas and tried to prove the main theorem from scratch. OpenAI-o3 and Gemini 2.5 Pro were better at integrating the supplied lemmas, so the authors used those reasoners for final results (section 3.3, PDF page 6). The report contrasts reusable standalone lemmas with local `have` statements: `have` forces alignment with the current proof state but is less flexible, while a standalone lemma is reusable but can be ignored (section 4.3, PDF page 10).

Verus form. Inference: expose verified Verus lemmas through module visibility and call them from the parent `proof fn`, preserving each lemma's `requires`. If a lemma depends on a mutable borrow or invariant, the parent must establish the same ownership facts before the call. Use explicit calls and `assert` chains so the verifier's dependency is inspectable. A standalone proof function is erased and cannot be called by executable runtime code; only the verified specification effect carries into the proof.

Evidence and failure. The standalone-lemma integration problem is a measured behavioral observation, not a theorem about all provers. The pipeline solved five reported IMO problems, but the report does not provide a denominator of all attempted problems or a per-stage success table. It also says that many unsolved cases have plausible Reasoner strategies whose critical lemmas the Prover cannot verify (section 4.3, PDF page 10).

## technique 5: use decoupling to avoid specialized-reasoning degradation

What it is. The report hypothesizes that reinforcement learning with verifiable rewards (RLVR) can optimize final proof success while degrading broad mathematical reasoning. It compares the general Qwen2.5-Math-7B-Instruct base model with Kimina-Prover-Preview-Distill-7B, its Lean-prover specialization, on non-formal MATH and AIME24 tasks (section 4.2, PDF page 9).

Results. On MATH pass@1, the base scores 83.6% and the prover 78.7%, a 4.9-point drop. On AIME24, the base scores 16.7%, 33.3%, 43.3%, and 46.7% at pass@1, 4, 8, and 16; the prover scores 11.0%, 24.1%, 32.0%, and 40.9%, drops of 5.7, 9.2, 11.3, and 5.8 points (Table 1, PDF page 9). The authors use this as evidence for retaining a general Reasoner for strategic work and a specialized Prover for tactics.

Verus form. Inference: use separate model roles in VL: a general model proposes high-level Rust invariants and lemma statements, while a Verus-specialized model repairs proof bodies and diagnostics. Do not assume specialization harms reasoning without a controlled comparison; measure both contract-planning quality and proof success on the same tasks.

## technique 6: diagnose failure with oracle lemmas and decomposition gaps

What it is. The authors identify two bottlenecks: the Prover cannot verify some critical lemmas, and the Reasoner misses human creative reframings. To measure the first, they manually prove bottleneck lemmas or replace their proofs with `sorry`, then observe that many more main problems become solvable (section 4.3, PDF page 10). The second is analyzed by comparing Reasoner outputs with official IMO solutions.

How to apply it. (1) Record every generated lemma that blocks final proving. (2) Replace one blocked proof with a trusted oracle only in a diagnostic branch. (3) Re-run the final prover and compare the number of solved main theorems. (4) Attribute the difference to lemma proving capacity, not to Reasoner quality. (5) Separately inspect whether the proposed decomposition contains a missing conceptual step. (6) Never include oracle branches in production results or training positives.

Verus form. Inference: use a separate analysis crate for manually proved lemmas, never `external_body` in the product proof. Compare a normal Verus run with a diagnostic model that supplies a reviewed proof artifact. Measure the remaining proof obligations after each oracle and record the assumptions the oracle introduces. This distinguishes a hard lemma from a bad decomposition without weakening the shipped contract.

## what is proved, measured, and trusted

Lean verifies retained subgoal proofs and final theorem proofs in the reported environment. The measured claims are five solved post-2000 non-geometry IMO problems, model behavior on MATH and AIME24, and qualitative integration and failure observations. The denominator for the “five” is not stated as a total number of attempted problems, so it is a solved count rather than an accuracy percentage. The AIME table denominators are benchmark questions under pass@k, while the report does not give their raw counts in the text.

Trusted components include Lean, imported Mathlib definitions, the formal theorem statements, the Reasoner's interpretation of each problem, and any manual oracle proof used in analysis. A verified lemma can be logically valid and still irrelevant to the intended theorem; an omitted lemma can make a solvable proof appear impossible.

Inference: threat to a product of agent-written verified Rust is medium to high. Decoupling reduces search complexity and creates reusable proof artifacts, but the product still depends on contract fidelity, correct lemma interfaces, and a final Verus replay. The main operational risk is “contextual blindness”: a final model may ignore verified lemmas and burn budget proving from scratch. The main correctness risk is a strategically plausible lemma whose assumptions are stronger than the caller can establish.

## what VL should reuse and avoid redoing

Inference: VL should reuse role separation, formal-subgoal generation, independent verification, bounded candidate sampling, final assembly from verified lemmas, and oracle-based bottleneck diagnosis. It should not claim that the five IMO solves establish Rust systems capability or repeat a Lean-only proof count. The useful new evaluation is a Verus maintenance benchmark measuring how often a general model proposes reusable invariants, how often Verus verifies them, and how much final proof cost falls when the parent proof receives those lemmas.

## techniques for the catalog

- decoupled Reasoner and Prover: separate strategic lemma generation from low-level formal proof search
- formal subgoal prompting: require meaningful self-contained theorem declarations that collectively imply the target
- independent lemma filtering: retain a candidate only after one of bounded proof attempts verifies it
- verified-lemma final assembly: prepend checked lemmas to the main context and construct the parent proof
- role-specific model selection: use general reasoning models for strategy and specialized provers for tactics
- oracle bottleneck diagnosis: temporarily supply manually proved lemmas to measure whether proving capacity limits completion

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
