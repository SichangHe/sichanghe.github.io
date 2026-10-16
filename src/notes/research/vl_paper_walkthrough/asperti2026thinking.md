# Thinking Machines: Mathematical Reasoning in the Age of LLMs
(authored by agents unless marked 🧑)
Tag: `asperti2026thinking`, [paper](https://www.semanticscholar.org/paper/87ee17d9c5b482893864d6dd865096cf9262928a)

## scope and baseline

Asperti, Naibo, and Sacerdoti Coen review LLMs for traditional mathematics, formal proof, code synthesis, and autoformalization. Their central distinction is between natural-language arguments and machine-checked proof states. They define formalized mathematics as “mathematics expressed in a formal language that a machine can parse, interpret, and mechanically verify.” (Section 2, PDF p. 3.) The survey argues that proof synthesis remains more brittle than coding because proof assistants enforce exact state transitions and usually expose sparse binary feedback, while code execution gives partial and decomposable feedback.

The authors frame three questions: how traditional and formal mathematics differ as learning targets, why proving is harder than coding, and whether LLMs maintain a computational or deductive state. They describe the formal loop as a model proposing one tactic, a prover checking it, and the updated state being returned for the next prediction (Section 5.2, PDF pp. 13–14). The survey is evidence synthesis rather than a new benchmark; reported denominators, models, and datasets belong to the cited studies.

## technique 1: prover-in-the-loop tactic generation

what it is and when to use it. Generate one tactic or inference step from the current proof state, submit it to the proof assistant, and feed the resulting state back into the next prompt. This is the default interaction for Lean, Isabelle, and Coq systems when exact formal correctness is required. The paper states: “The model proposes a proof step (e.g., a tactic), which is checked by an external proof assistant that explicitly maintains and updates the proof state.” (Figure 1 caption, PDF p. 14.)

how it is done. (1) Serialize the current goal, local hypotheses, and selected library context. (2) Ask the model for one tactic. (3) Execute it in the proof assistant. (4) If accepted, replace the prompt state with the returned subgoals and continue; if rejected, use the tool error or discard the branch. (5) Stop when all goals close or search limits are reached. The survey’s Table 2 identifies the resulting granularity as “Single tactic or step at a time” and feedback as frequent assistant checking (Section 5, PDF p. 12).

evidence and limits. The interaction is a method description, not a new result. The survey reports that Kimina-Prover, Lyra, and DeepSeek-Prover all use variants, with different state representations and feedback. A proof assistant’s acceptance establishes a formal derivation under its kernel and imported assumptions; it does not establish that the statement captures the intended requirement. The paper emphasizes the brittle failure mode: “A single incorrect tactic can invalidate the entire proof state” (Section 7.1, PDF p. 22).

Verus form. Inference: expose the current Verus function contract, quantified facts, and loop state to a generator; let the generator propose a lemma, invariant, or code edit; run Verus; then return diagnostics and the new verification state. Inference: executable Rust remains ordinary Rust, while proof-only code is checked and erased by Verus. The model cannot replace Verus’s kernel or solver, and a passing proof still depends on the written specification.

## technique 2: premise retrieval and context injection

what it is and when to use it. Retrieve a small set of relevant library theorems and place them in the model prompt. The survey calls this necessary because proof libraries are too large to fit into fine-tuning and says the context “remains a linear string rather than a semantic state” (Section 5.2.1, PDF p. 15). Use retrieval for non-trivial goals whose solution depends on existing lemmas or definitions.

how it is done. (1) Index theorem statements or use an ad hoc theorem retriever. (2) Given the goal and local hypotheses, score candidate premises. (3) Inject top-k candidates into the prompt. (4) Generate tactics conditioned on this preamble. (5) Optionally update retrieval as a tree-search branch changes. The survey distinguishes three concrete regimes in Table 4: Kimina uses static top-k retrieval prepended to the prompt; Lyra performs no theorem retrieval and relies on the current goal and tools; DeepSeek-Prover dynamically selects premises within RMaxTS.

evidence and limits. The survey does not supply a single cross-system retrieval denominator. Its evidence is the cited system descriptions and Table 4. Static top-k can miss a needed lemma; dynamic retrieval adds search cost and another failure surface. Inference: retrieval quality should be measured with recall of premises actually used by a verified proof, while reporting k, library revision, and goal set. Inference: a Verus retriever should include local hypotheses, imported `spec fn`/lemma signatures, and relevant trait contracts, then present source locations so a human can inspect the trusted dependency.

## technique 3: choose a feedback regime matched to proof search

what it is and when to use it. The survey compares three supervision designs. Kimina-Prover uses reinforcement learning with whole-proof pass/fail; Lyra uses deterministic correction from tool errors; DeepSeek-Prover uses supervised fine-tuning followed by reinforcement learning from proof-assistant feedback (RLPAF), checking each tactic.

how it is done. For Kimina, sample a complete trajectory, give reward one only for a proof accepted by Lean, and optimize the policy. For Lyra, run a tactic, parse the error, apply Tool Correction to invalid or hallucinated calls, or Conjecture Correction to ill-formed/unprovable subgoals, then retry. For DeepSeek, execute every tactic, assign step-level acceptance feedback, and train on the resulting trajectory after supervised initialization. These distinctions are reported in Table 5 (Section 5.2.2, PDF p. 16), which labels Kimina’s feedback “Whole-proof success/failure (pass/fail)” and DeepSeek’s “Step-by-step tactic validation.”

evidence and limits. The paper’s comparison says whole-proof reward is goal-aligned but sparse, Lyra is sample-efficient but offers limited learning of new strategies, and step-level feedback gives denser credit assignment. These are qualitative conclusions from the cited systems, not a controlled head-to-head experiment. Inference: Verus training should log both per-attempt verifier diagnostics and final proof completion, because a binary final reward cannot show which invariant or contract caused failure. A step-level reward must not be treated as proof evidence unless the final Verus run succeeds.

## technique 4: autoformalize statements and definitions with verification feedback

what it is and when to use it. Translate a natural-language statement or definition into a proof-assistant language, then use the assistant’s errors or library context to revise it. The survey separates translation difficulty (syntax and vocabulary) from reconstruction difficulty (implicit assumptions, omitted steps, and background lemmas) (Section 6, PDF p. 17).

how it is done. The reviewed definition systems prompt an LLM with the natural-language text, optionally retrieve relevant formal definitions or lemmas, submit the candidate to an assistant, feed back identified errors, and ask for a revision. ReForm is described as iteratively evaluating semantic fidelity and self-correcting through progressive refinement (Section 6.2, PDF p. 19). An earlier miniF2F study used 10 problems as few-shot prompts and evaluated the remaining 140 algebra and 120 number-theory problems with BLEU; manual analysis of 150 MATH items found 38 correct formalizations, or 25.3% (Section 6.2, PDF p. 18). The survey also reports an improvement from 29.6% to 32.5% on miniF2F when autoformalized statements were used by a neural prover (Section 6.2, PDF p. 19).

evidence and limits. BLEU measures textual similarity rather than semantic acceptance, while the 25.3% figure is a 38/150 manual sample. The 29.6-to-32.5% comparison is a cited miniF2F proof-success result; the model, split, and proof budget are those of the cited work, not specified as a new controlled experiment here. The authors warn that syntactically valid formalizations can still be semantically misaligned through wrong definitions, quantifiers, or scopes (Section 6.4, PDF pp. 20–21).

Verus form. Inference: translate a natural-language requirement into a Verus `requires`/`ensures` contract, compile it, and use diagnostics to revise the contract or proof. A human must decide whether the formal contract expresses the requirement; Verus acceptance cannot decide that. Inference: keep generated definitions and imports under review because an overly strong precondition can make a proof pass while weakening the product guarantee.

## technique 5: proof sketches plus automated refinement

what it is and when to use it. Generate a high-level formal proof sketch with open conjectures, then let a theorem prover discharge the low-level details. The survey presents this as an alternative to demanding a complete formal script in one generation.

how it is done. In the reviewed Isabelle/HOL pipeline, Codex receives 20 hand-crafted informal-proof/formal-sketch examples, generates a sketch for a miniF2F conjecture, and leaves open conjectures. Sledgehammer, Isabelle tactics, or Thor then attempt to solve those holes (Section 6.3.2, PDF p. 20). The method therefore separates structural planning from symbolic completion.

evidence and limits. On the 244-problem validation and 244-problem test splits of miniF2F, test success was 20.9% for Sledgehammer with tactics, 29.9% for Thor, and 39.9% for the sketch pipeline. Using machine-generated informal proofs, Minerva-62B reached 37.7% and Minerva-540B 38.9% on the same reported test set (Section 6.3.2, PDF p. 20). The denominator is 244 test problems. Inference: the gains show the value of an intermediate representation in that Isabelle setting; they do not prove that every Verus proof can be decomposed into a useful sketch.

Verus form. Inference: generate a Rust/Verus skeleton with target lemmas and unresolved proof obligations, then use Verus lemmas and solver guidance to close them. The skeleton is a search artifact; only a complete Verus verification run is evidence. Do not mark unresolved holes as `external_body` on the function under verification, because that would remove the obligation rather than solve it.

## technique 6: iterative refinement and self-correction

what it is and when to use it. Multi-pass loops alternate proposal, critique or external checking, and regeneration. Intra-pass methods interleave edits or checks during one decoding window. The paper lists the multi-pass pattern as “1. Propose an initial solution; 2. Detect errors or weaknesses (via self-critique or an external tool); 3. Refine or regenerate the solution from scratch or in part.” (Section 8.1, PDF p. 27.)

how it is done. For formal proof, run a candidate through the assistant, retain the updated state or error, ask for a repaired tactic or proof fragment, and repeat with a budget. Intra-pass systems can insert, delete, or justify text while decoding; the survey cites EditCoder and some CriticGPT configurations. External compiler traces and test suites give coding systems denser signals than proof assistants, where feedback is often binary and non-local.

evidence and limits. The survey reports that self-correction can become “performative self-correction” (Section 8.2, PDF p. 28), adding artificial mistakes or commentary without improving correctness. It concludes that hybrid pipelines combining LLM revisions with prover validation are more promising than unaudited self-critique (Section 8.3, PDF p. 29). Inference: Verus repair loops should count only verifier-accepted revisions, record total attempts and wall time, and retain the first failing diagnostic for audit. Self-critique text is not evidence of a valid proof.

## what is proved, measured, and trusted

This review synthesizes published system results and conceptual arguments. The formal facts established by the surveyed proof assistants are kernel checks of particular statements; the survey’s percentages measure cited benchmark success, not semantic understanding. Trusted components include each assistant kernel, solver, imported library, benchmark labels, retrieval index, model implementation, and any natural-language-to-contract choice. The survey explicitly notes that a proof assistant’s accepted script does not show that the LLM understood the mathematics (Section 6.4, PDF p. 21).

Inference: for VeruLaw, the greatest product threat is brittle search and specification translation, not a new attack on Verus soundness. Existing work already covers tactic loops, retrieval, sparse/dense feedback, autoformalization, sketches, and repair; VL should reuse these patterns and measure them on Verus workloads rather than redo generic surveys. Inference: the decisive product metrics are final Verus acceptance, proof-repair effort after library changes, timeout rate, and the fraction of contracts reviewed by a human.

## techniques for the catalog

- prover-in-the-loop tactics: generate one proof step, check it, and feed the updated state back
- premise retrieval: inject top-k relevant library theorems, statically or during search
- feedback-regime design: choose whole-proof RL, deterministic error correction, or step-level rewards
- verified autoformalization: revise translated statements using assistant errors and contextual lemmas
- proof sketches: generate high-level structure and let automated provers close open conjectures
- iterative repair: alternate proposals, checks, critiques, and verifier-accepted revisions

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
