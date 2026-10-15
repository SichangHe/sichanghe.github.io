# LLMS FOR FORMAL THEOREM PROVING – HUMAN–MACHINE COLLABORATION ON PROOFS
(authored by agents unless marked 🧑)
Tag: `kesavan2026theorem`, [paper](https://doi.org/10.34218/ijitmis_17_02_002)

## what this paper actually provides

This paper is a narrative proposal for human–LLM collaboration in Lean and Coq. It gives a workflow, a few recommended interaction patterns, an illustrative model table, and an unsubstantiated claim of a 25 percent improvement in proof success. It does not report a reproducible user study, a theorem corpus, a participant count, a baseline denominator, proof scripts, or a Lean/Coq artifact. The abstract says: “This research explores the value of large language models (LLMs) for improving human-machine collaboration during formal theorem proving.” (Abstract, p. 15.) It also says: “We need qualitative data from user studies and quantitative metrics on proof completion rates and accuracy.” (Abstract, p. 15.) That wording describes data needed, not data supplied.

Inference: the paper is useful as a checklist for an agent interface, but it is not evidence that the proposed workflow improves verification. For VL, its strongest lesson is to keep the prover as the acceptance authority and use the model as a proposal-and-repair assistant.

## technique 1: interactive proof-sketch and tactic loop

What it is. The paper describes LLMs proposing tactic applications and proof sketches that humans refine. Its account is: “Recent advancements have transformed LLMs into interactive agents capable of proposing tactic applications and generating proof sketches that humans then refine.” (Section II, p. 16.) The human remains responsible for theorem selection, strategy refinement, and deciding whether generated steps are mathematically meaningful (Section V, p. 25).

How to apply it.

1. A human chooses the theorem and gives the LLM the local proof context. (Section V.)
2. The LLM proposes a tactic or proof sketch. (Sections II and V.)
3. Submit the candidate to Lean or Coq immediately. (Sections III and V.)
4. Keep only steps accepted by the proof assistant; have the human inspect whether the accepted step expresses the intended mathematics. (Section V.)
5. Repeat until a complete proof path is obtained or the human changes strategy. (Section V.)

Verus form. Inference: have an agent propose Rust/Verus proof steps, lemmas, and invariant candidates, then run `verus` after each small change. Keep executable functions and specifications separate; proof functions and lemmas should discharge obligations at verification time. The paper does not discuss Verus, Rust, or any syntax, so this mapping is an inference.

What the technique establishes. Lean or Coq acceptance establishes that the submitted term checks in that prover. It does not establish that the human chose the right theorem or formalized the intended requirement. The paper does not provide a measured completion denominator for this loop.

## technique 2: sequential verification before acceptance

What it is. The paper contrasts LLM statistical generation with rigid proof engines and recommends checking each informal proposal in a formal prover: “To bridge this gap, modern methodologies incorporate sequential verification schemes where the LLM's informal reasoning is rigorously checked by a formal prover before acceptance.” (Section III, p. 16.) It proposes hierarchical trees of verifiable lemmas so that generated insights are checked in smaller units.

How to apply it.

1. Ask the LLM for one lemma, tactic, or proof step rather than an unchecked final proof. (Sections III and V.)
2. Formalize the step in the proof assistant. (Section V.)
3. Run the checker before adding the step to the proof state. (Sections III and V.)
4. If it fails, return the error and revise the step. (Section V.)
5. Decompose a difficult theorem into smaller lemmas and verify each node before using it as a parent step. (Sections III and V.)

Inference: in Verus, a loop invariant, postcondition, or helper lemma should be introduced with a small proof obligation and verified before an agent builds on it. This is a process rule, not a theorem from the paper. The paper gives no formal definition of “hierarchical tree,” no soundness argument for its decomposition strategy, and no comparison against one-shot generation.

## technique 3: feedback-driven decomposition and revision

The methodology explicitly cycles through prompt design, proof generation, proof verification, and iterative revision. When a proof attempt fails, “the user and model re-enter the cycle, revise the prompt, decompose the theorem into smaller lemmas, and test alternative tactics until a valid proof path is obtained.” (Section V, p. 25.) The paper frames this as controlled refinement rather than one-pass generation.

How to apply it.

1. Record the failed goal and checker diagnostic. (Section V.)
2. Revise the prompt while preserving the theorem and intended statement. (Section V.)
3. Split the goal into smaller lemmas if the current tactic path remains stuck. (Section V.)
4. Try alternative tactics and re-run the checker. (Section V.)
5. Stop when the prover accepts a complete path, or escalate to human strategy revision. (Sections V and VII.)

Inference: a VL implementation should retain failed verification traces, because they show where the model’s proposal diverged from the specification. It should reject “repairs” that weaken `requires`, delete `ensures`, add unreviewed assumptions, or move the target function behind a trusted body. These Verus-specific safeguards are inferences; the paper only says to revise prompts and tactics.

Evidence. The paper lists proof pass rate, proof accuracy, time to completion, and number of correction cycles as quantitative measures (Section V, p. 25), but reports no table with those measures. Its sole numerical result is a claim that “Mathematicians working with LLMs saw proof success rates rise by 25%.” (Section VII, p. 26.) No denominator, theorem set, participant count, baseline workflow, confidence interval, or statistical test is given. Inference: this percentage cannot support a product decision.

## technique 4: human oversight and division of responsibility

The paper repeatedly assigns semantic judgment to the human and formal checking to the prover. It says the model “functions as an assistive reasoning component, while the human participant retains responsibility for theorem selection, strategy refinement, and judgment over whether the generated steps are mathematically meaningful.” (Section V, p. 25.) It also recommends that models “should complement rather than replace human reasoning.” (Section IV, p. 22.)

How to apply it. Keep three roles distinct: the LLM suggests syntax and strategy, the human chooses and interprets the formal claim, and the proof assistant accepts or rejects the formal term. Require human review when a generated lemma changes the abstraction boundary or introduces an axiom. Inference: VL should expose these boundaries in its agent UI and log who supplied each specification clause.

What remains trusted. The prover kernel and its libraries check accepted proof terms, but the human formalization, axioms, imported assumptions, and theorem statement remain trusted choices. The paper does not inventory a trusted computing base. Inference: the corresponding Verus trust boundary includes Rust/Verus toolchains and external API contracts in addition to the human-authored specification.

## technique 5: metric-driven collaboration evaluation

The paper recommends combining quantitative and qualitative evaluation. Quantitative measures are proof pass rate, proof accuracy, time to completion, and correction-cycle count; qualitative assessment asks whether the model reduces cognitive burden while users track long symbolic chains (Section V, p. 25). It also includes an “Illustrative Quantitative Data” table with DeepSeek-Prover 48.5% pass rate and 52.1% accuracy, TheoremLlama 42.0% and 45.3%, GPT-4 (Copra Agent) 39.2% and 41.8%, and Llama3-8B 15.4% and 18.0% (Section III, p. 16).

The table is explicitly introduced as “an illustrative example demonstrating how to effectively present performance data” (Section III, p. 16). It is therefore not an experiment from this paper. The paper gives no sample size or task denominator for any of these percentages, and no source for the four model values. Inference: VL may reuse the metric categories, but must report theorem counts, pass/fail definitions, model versions, proof budgets, and human time units for every number.

## contradictions, limitations, and threat to VL

The abstract says quantitative and qualitative user-study data are needed, while the Results and Discussion sections speak as if such an evaluation occurred. The paper claims a 25% success-rate increase but supplies no experiment setup, denominator, or reproducible artifact. The illustrative table is presented as a format example, yet its values can be mistaken for measured results. These are reporting contradictions and omissions, not evidence of an effective method.

The paper itself notes that LLMs rely on training data, may be biased, and can produce opaque outputs (Sections IV and VII). It calls for transparency, reliability, and human oversight. What it teaches is therefore a process assumption: the formal checker must be in the loop, and human judgment must remain available. It does not establish scalability across theorem domains, Lean versus Coq differences, or any Rust/Verus workload.

Inference: the threat to a product producing agent-written verified Rust is high if this paper is treated as evidence of autonomous proof success, because its central percentage lacks a denominator. The threat is moderate as a UX design source: incremental checker feedback, decomposition, and explicit human responsibility are sensible controls. VL should validate these controls on its own corpus rather than cite this paper’s unsupported gain.

## what VL should reuse and what it should not redo

Reuse the interaction loop, sequential checking, decomposition after failure, and explicit division between model suggestions and prover acceptance. Measure correction cycles and time, but define denominators and baselines first. Inference: VL should not claim novelty for “LLM plus proof assistant” collaboration or for compiler-feedback repair; this paper and the wider literature already describe those patterns. A new contribution would need a Verus-specific artifact, trusted-base accounting, and controlled evidence on real Rust programs.

## techniques for the catalog

- interactive tactic loop: let an LLM propose proof steps while a human refines strategy and a prover checks every accepted step
- sequential verification: check each generated lemma or tactic before accepting it into a hierarchical proof
- feedback-driven decomposition: use diagnostics to revise prompts, split goals into lemmas, and try alternative tactics
- human–machine responsibility split: keep theorem intent and semantic judgment with humans, syntax proposals with the model, and acceptance with the prover
- metric-driven evaluation: report pass rate, accuracy, completion time, correction cycles, and qualitative cognitive load with explicit denominators

Checked 2026-10-15 against the paper by a Codex agent for llms_for_formal_theorem_proving_human_ma_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
