# Thinking Machines: Mathematical Reasoning in the Age of LLMs
(authored by agents unless marked 🧑)
Tag: `asperti2026thinking`, [paper](https://arxiv.org/abs/2508.00459v2)

## scope and baseline

Asperti, Naibo, and Sacerdoti Coen review LLMs for traditional mathematics, formal proof, code synthesis, and autoformalization. Their central distinction is between natural-language arguments and machine-checked proof states. They define formalized mathematics as “mathematics expressed in a formal language that a machine can parse, interpret, and mechanically verify.” (Section 2, PDF p. 3.) The survey argues that proof synthesis remains more brittle than coding because proof assistants enforce exact state transitions, while code execution gives partial and decomposable feedback. Its descriptions of formal feedback differ across sections; see technique 3 below. The paper identifies this version as “arXiv:2508.00459v2 [cs.AI] 30 Jan 2026” (PDF p. 1).

The authors frame three questions: how traditional and formal mathematics differ as learning targets, why proving is harder than coding, and whether LLMs maintain a computational or deductive state. They describe the formal loop as a model proposing one tactic, a prover checking it, and the updated state being returned for the next prediction (Section 5.2, PDF pp. 13–14). The survey is evidence synthesis rather than a new benchmark; reported denominators, models, and datasets belong to the cited studies.

## technique 1: prover-in-the-loop tactic generation

what it is and when to use it. Generate one tactic or inference step from the current proof state, submit it to the proof assistant, and feed the resulting state back into the next prompt. The authors describe this as the typical formal-proof interaction, rather than an intrinsic requirement (Section 5.2, PDF p. 13). Inference: use it when incremental machine checking is useful. The paper states: “The LLM proposes a proof step (e.g., a tactic), which is checked by an external proof assistant that explicitly maintains and updates the proof state.” (Figure 1 caption, PDF p. 14.)

how it is done. Inference: the following operational outline combines the loop in Section 5.2 with the context and feedback descriptions in Sections 5.2.1–5.2.2. (1) Serialize the current goal, local hypotheses, and selected library context. (2) Ask the model for one tactic. (3) Execute it in the proof assistant. (4) If accepted, replace the prompt state with the returned subgoals and continue; if rejected, use the tool error or discard the branch. (5) Stop when all goals close or search limits are reached. The survey’s Table 2 identifies the resulting granularity as “Single tactic or step at a time” and feedback as frequent assistant checking (Section 5, PDF p. 12).

evidence and limits. The interaction is a method description, not a new result. The survey reports that Kimina-Prover, Lyra, and DeepSeek-Prover all use variants, with different state representations and feedback. Inference: proof acceptance is evidence about the formal statement under the assistant’s assumptions, not a check that the statement expresses the intended requirement. The paper emphasizes the brittle failure mode: “A single incorrect tactic can invalidate the entire proof state” (Section 7.1, PDF p. 22).

Verus form. Inference: expose the current Verus function contract, quantified facts, and loop state to a generator; let the generator propose a lemma, invariant, or code edit; run Verus; then return diagnostics and the new verification state. Inference: count a candidate as complete only after Verus accepts it, and review whether its specification expresses the requirement. The survey does not study Verus.

## technique 2: premise retrieval and context injection

what it is and when to use it. Retrieve a small set of relevant library theorems and place them in the model prompt. The survey motivates retrieval with the difficulty of fine-tuning over a proof library and says the context “remains a linear string rather than a semantic state” (Section 5.2.1, PDF p. 15). Inference: use retrieval for goals that need existing lemmas or definitions.

how it is done. Inference: an implementation outline consistent with Section 5.2.1 is: (1) Index theorem statements or use an ad hoc theorem retriever. (2) Given the goal and local hypotheses, score candidate premises. (3) Inject top-k candidates into the prompt. (4) Generate tactics conditioned on this preamble. (5) Optionally update retrieval as a tree-search branch changes. The survey distinguishes three concrete regimes in Table 4: Kimina uses static top-k retrieval prepended to the prompt; Lyra performs no theorem retrieval and relies on the current goal and tools; DeepSeek-Prover dynamically selects premises within RMaxTS.

evidence and limits. The survey does not supply a single cross-system retrieval denominator. Its evidence is the cited system descriptions and Table 4. Inference: static top-k can miss a needed lemma; dynamic retrieval adds search cost. Inference: retrieval quality should be measured with recall of premises actually used by a verified proof, while reporting k, library revision, and goal set. Inference: a Verus retriever should include local hypotheses, imported `spec fn`/lemma signatures, and relevant trait contracts, then present source locations so a human can inspect the trusted dependency.

## technique 3: choose a feedback regime matched to proof search

what it is and when to use it. The survey compares three supervision designs. Kimina-Prover uses reinforcement learning with whole-proof pass/fail; Lyra uses deterministic correction from tool errors; DeepSeek-Prover uses supervised fine-tuning followed by reinforcement learning from proof-assistant feedback (RLPAF), checking each tactic.

how it is done. For Kimina, use Lean acceptance or rejection of a proof attempt as binary feedback for RL; the survey does not specify a numerical reward formula. For Lyra, run a tactic, parse the error, apply Tool Correction to invalid or hallucinated calls, or Conjecture Correction to ill-formed/unprovable subgoals, then retry. For DeepSeek, execute every tactic, assign step-level acceptance feedback, and train on the resulting trajectory after supervised initialization. These distinctions are reported in Table 5 (Section 5.2.2, PDF p. 16), which labels Kimina’s feedback “Whole-proof success/failure (pass/fail)” and DeepSeek’s “Step-by-step tactic validation”.

evidence and limits. The paper’s comparison says whole-proof reward is goal-aligned but sparse, Lyra is sample-efficient but offers limited learning of new strategies, and step-level feedback gives denser credit assignment. These are the survey’s qualitative comparisons, not results of a new controlled experiment. Its account is internally inconsistent: Section 5.2.2 says DeepSeek feedback “produces a far denser reward signal than whole-proof verification” (PDF p. 16), whereas Section 7.2 says “the lack of step-level feedback remains a bottleneck” (PDF p. 23), and Section 9 describes feedback as “binary, sparse, and typically provided only after a complete proof attempt” (PDF p. 29). Inference: the survey alone cannot establish the exact reward design of each cited system. Inference: Verus training should log both per-attempt verifier diagnostics and final proof completion, because a binary final reward cannot show which invariant or contract caused failure. Inference: require a successful final Verus run before treating intermediate feedback as evidence of a completed proof.

## technique 4: autoformalize statements and definitions with verification feedback

what it is and when to use it. Translate a natural-language statement or definition into a proof-assistant language, then use the assistant’s errors or library context to revise it. The survey separates translation difficulty (syntax and vocabulary) from reconstruction difficulty (implicit assumptions, omitted steps, and background lemmas) (Section 6, PDF p. 17).

how it is done. The reviewed definition systems prompt an LLM with the natural-language text, optionally retrieve relevant formal definitions or lemmas, submit the candidate to an assistant, feed back identified errors, and ask for a revision. ReForm is described as iteratively evaluating semantic fidelity and self-correcting through progressive refinement (Section 6.2, PDF p. 19). An earlier miniF2F study selected a subset of 140 algebra and 120 number-theory problems, used 10 problems for few-shot prompting, and evaluated the remainder with BLEU; manual analysis of 150 MATH items found 38 correct formalizations, or 25.3% (Section 6.2, PDF p. 18). The survey also reports an improvement from 29.6% to 32.5% on miniF2F when autoformalized statements were used by a neural prover (Section 6.2, PDF p. 18).

evidence and limits. Inference: BLEU measures textual similarity rather than semantic acceptance, while the 25.3% figure is a 38/150 manual sample. The 29.6-to-32.5% comparison is a cited miniF2F proof-success result; the model, split, and proof budget are those of the cited work, not specified as a new controlled experiment here. The authors warn that syntactically valid formalizations can still be semantically misaligned through wrong definitions, quantifiers, or scopes (Section 6.4, PDF pp. 20–21).

Verus form. Inference: translate a natural-language requirement into a Verus `requires`/`ensures` contract, compile it, and use diagnostics to revise the contract or proof. Inference: have a human review whether the formal contract expresses the requirement; do not use Verus acceptance alone to decide that. Inference: keep generated definitions and imports under review because an overly strong precondition can make a proof pass while weakening the product guarantee.

## technique 5: proof sketches plus automated refinement

what it is and when to use it. Generate a high-level formal proof sketch with open conjectures, then let a theorem prover discharge the low-level details. The survey presents this as an alternative to demanding a complete formal script in one generation.

how it is done. In the reviewed Isabelle/HOL pipeline, Codex receives 20 hand-crafted informal-proof/formal-sketch examples, generates a sketch for a miniF2F conjecture, and leaves open conjectures. Sledgehammer, Isabelle tactics, or Thor then attempt to solve those holes (Section 6.3.2, PDF p. 20). The method therefore separates structural planning from symbolic completion.

evidence and limits. On the 244-problem validation and 244-problem test splits of miniF2F, test success was 20.9% for Sledgehammer with tactics, 29.9% for Thor, and 39.9% for the sketch pipeline. Using machine-generated informal proofs, Minerva-62B reached 37.7% and Minerva-540B 38.9% on the same reported test set (Section 6.3.2, PDF p. 20). The denominator is 244 test problems. Inference: the gains show the value of an intermediate representation in that Isabelle setting; they do not prove that every Verus proof can be decomposed into a useful sketch.

Verus form. Inference: generate a Rust/Verus skeleton with target lemmas and unresolved proof obligations, then use Verus lemmas and solver guidance to close them. Inference: treat the skeleton as a search artifact, and require all intended obligations to be checked before counting it as complete.

## technique 6: iterative refinement and self-correction

what it is and when to use it. Multi-pass loops alternate proposal, critique or external checking, and regeneration. Intra-pass methods interleave edits or checks during one decoding window. Section 8.1 gives three steps: “Propose an initial solution;”, “Detect errors or weaknesses (via self-critique or an external tool);”, and “Refine or regenerate the solution from scratch or in part.” (Section 8.1, PDF p. 27.)

how it is done. Inference: to apply the multi-pass pattern to formal proof, run a candidate through the assistant, retain the updated state or error, ask for a repaired tactic or proof fragment, and repeat with a budget. Intra-pass systems can insert, delete, or justify text while decoding; the survey cites EditCoder and some CriticGPT configurations. External compiler traces and test suites give coding systems denser signals than proof assistants, where feedback is often binary and non-local.

evidence and limits. The survey reports that self-correction can become “performative self-correction” (Section 8.2, PDF p. 28), adding artificial mistakes or commentary without improving correctness. It proposes hybrid pipelines as a promising direction: “Hybrid pipelines, where LLMs propose structured revisions and provers validate them, could bridge the gap between narrative reasoning and symbolic verification, offering a pathway toward more stable, grounded refinement loops.” (Section 8.3, PDF pp. 28–29.) This is a proposal, not a measured comparison. Inference: Verus repair loops should count only verifier-accepted revisions, record total attempts and wall time, and retain the first failing diagnostic for audit. Inference: do not count self-critique text as evidence of a valid proof.

## what is proved, measured, and trusted

This review synthesizes published system results and conceptual arguments. The survey reports benchmark success rates from cited studies rather than a new measure of semantic understanding. The authors write: “Even when an LLM-generated formalization is accepted by a proof assistant, it does not follow that the model has captured the underlying mathematical ideas.” (Section 6.4, PDF p. 20.) Inference: distinguish dependencies of formal correctness, such as the proof checker and assumptions, from dependencies of benchmark scores, such as labels, retrieval, and model implementation. Retrieval and generation can affect success without becoming logical authorities.

## techniques for the catalog

- prover-in-the-loop tactics: generate one proof step, check it, and feed the updated state back
- premise retrieval: inject top-k relevant library theorems, statically or during search
- feedback-regime design: choose whole-proof RL, deterministic error correction, or step-level rewards
- verified autoformalization: revise translated statements using assistant errors and contextual lemmas
- proof sketches: generate high-level structure and let automated provers close open conjectures
- iterative repair: alternate proposals, checks, critiques, and verifier-accepted revisions
