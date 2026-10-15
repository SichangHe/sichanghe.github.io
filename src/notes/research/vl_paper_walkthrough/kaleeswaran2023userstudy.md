# A User Study for Evaluation of Formal Verification Results and their Explanation at Bosch
(authored by agents unless marked 🧑)
Tag: `kaleeswaran2023userstudy`, [paper](https://doi.org/10.1007/s10664-023-10353-4)

## what the paper studies

Kaleeswaran et al. study how Bosch engineers understand formal-verification results. The paper combines a 41-person questionnaire with a 13-person one-group pretest/posttest experiment. Its motivation is practical: a model checker can find an inconsistency but expose engineers to a large temporal formula and raw trace. The authors’ counterexample-explanation approach localizes the fault to requirements, contracts, components, states, and variables, then presents a pattern-based explanation with an annotated trace.

Inference: this paper teaches a human-interface technique for verification evidence, not a new proof calculus. For VeruLaw, the relevant question is how to present a failed Verus obligation so an engineer can identify the faulty contract, state, or value flow.

## technique 1: derive a structured counterexample explanation

What it is. The approach takes a violated LTL refinement specification and model-checker counterexample and computes the information needed for diagnosis. The paper says it “eases the error comprehension of engineers—especially of non-experts in formal methods—if the refinement check fails.” (Section 4, p.6). It generates a statement that names the erroneous components and violated contract and highlights erroneous states and variables in the trace.

How to apply it, following the six-step method. (1) Manually import SysML models and DNG requirements into FASTEN and translate informal requirements into contracts (Step 1, Section 4, p.6). (2) Automatically translate the contract-based design into a formal system model K and refinement specification φ (Step 2, Section 4, p.6). (3) Check the refinement with NuSMV/nuXmv; if it fails, retain the violated LTL formula and counterexample (Step 3, Section 4, p.6). (4) Extract inconsistent specifications, inconsistent sub-specifications, erroneous contracts/components, erroneous states, and erroneous variables (Steps 4A–4E, Section 4, pp.6–7). (5) Generate a pattern-based statement containing the component, violated contract, and inconsistent specification, and annotate the counterexample with the erroneous state/variables (Step 5, Section 4, p.7). (6) Have the engineer remodel the component or change the requirement and re-verify the changed refinement (Step 6, Section 4, p.8).

The paper’s EPS example explains: “The variable EPS_system.pd_state holds Passive in State: 1.3. But EPS_system.pd_state is expected to be Master in State: 1.3.” (Figure 31, p.51). The explanation names the parent and sub-component guarantees that conflict, rather than presenting only the full formula and trace.

Verus form. Inference: when Verus reports a failed `assert`, `ensures`, or loop `invariant`, build a structured record containing function/contract location, violated predicate, relevant ghost and executable state, and the smallest trace or symbolic path that reaches it. Use Verus diagnostics and proof functions to compute facts; render the result as prose and an annotated state transition. Verus has no built-in counterexample-explanation language, so this is a product layer over verifier output. Preserve exact source snippets and distinguish a concrete counterexample from an SMT failure with no model.

Evidence and limits. The approach’s automated steps depend on the correctness of the translation from SysML/DNG to contracts and from contracts to K/φ. The paper does not show that every highlighted explanation is semantically complete; it evaluates engineer comprehension.

## technique 2: compare raw output and explanation in a controlled workflow

What it is. The second study uses a one-group pretest/posttest design: participants first inspect raw model-checker output for an airbag system, then watch an explanation-method video, then inspect a more complex Bosch EPS system with the generated explanation. The authors explicitly call it pre-experimental and note: “The pre-experimental study designs does not have a control group like a true experiment.” (Section 5, p.11)

How to apply it. (1) Recruit engineers with formal-methods knowledge from the survey population (Section 5.6, p.14). (2) In the pretest, show a video explaining the airbag model, let participants inspect the violated specification and raw counterexample, and ask task questions about inconsistent components/specifications, cause, fix, and expected behavior (Section 5.6, pp.15–16). (3) Collect four pre-questionnaire ratings: better understanding, quicker understanding, confidence, and value (Table 3, pp.10–12). (4) Show a video introducing the counterexample-explanation approach (Section 5.6, p.16). (5) In the posttest, repeat the task with the more realistic EPS model and the explanation output, then collect the same opinion dimensions and feature feedback (Section 5.6, p.16). (6) Compare task accuracy and Likert responses within participants, while recording the changed use case and possible learning effects.

Verus form. Inference: evaluate VL’s failure presentation by giving engineers the same Verus proof obligation first as raw diagnostics and then as an explanation that groups the failing contract, state, and data dependency. Keep the underlying failure and task questions fixed; use a separate but matched Rust example if learning from the first task would otherwise dominate. Record denominators for each question because participants may skip items.

Evidence and design boundary. The authors selected a simpler airbag case for pretest and a more complex EPS case for posttest to reduce memorization, but this also changes task difficulty. They discuss history, maturation, testing, and generalization threats (Section 8, pp.65–67). Inference: any product experiment should include a counterbalanced control or matched cases before claiming a causal comprehension improvement.

## technique 3: measure comprehension at four concrete levels

The study does not rely only on subjective preference. Task questions measure whether participants can identify inconsistent components (TQ5), identify inconsistent specifications (TQ6), explain the reason (TQ7), propose a fix (TQ8), and state the expected nominal transition (TQ9) (Section 7.5, pp.53–54). Opinion questions separately measure better understanding, quicker understanding, confidence, and added value (Section 7.6, pp.54–57).

How to apply it. (1) Define the expected component and specification answers from the formal model before the study. (2) Score full, partial, and incorrect answers separately. (3) For a repair question, require a change that actually restores the intended refinement, not merely a syntactically valid edit. (4) For a nominal-behavior question, score the expected state transition against the model’s intended behavior. (5) Report both task accuracy and opinion counts, retaining the denominator for each item.

Results. For inconsistent components, 8/13 participants identified both parent and sub-components with raw output and 10/13 with the explanation; no participant completely missed the components with the explanation (Section 7.5, p.53). For inconsistent specifications, 4 of the 9 respondents who answered the raw-output item were fully correct, while 9/13 were fully correct with the explanation (Section 7.5, pp.53–54). Among participants who identified specifications fully or partially, 4/5 gave the correct cause and fix from raw output, compared with 11/13 for cause and 9/13 for fix from the explanation (Section 7.5, p.54). For nominal behavior, 4/6 raw-output respondents and 7/9 explanation respondents named the expected transition (Section 7.5, p.54).

Verus form. Inference: VL should score failure explanations on localization (which function/contract), semantic cause (which assumption or invariant), repair quality (proof succeeds while preserving the requirement), and expected-state reconstruction. A proof pass alone is not a comprehension measure.

## technique 4: expose high-level fault context while preserving trace evidence

The raw model-checker output in Figure 30 contains the complete violated refinement formula and a multi-state counterexample. The explanation in Figure 31 instead lists the violation type, inconsistent specifications, corresponding components, expected versus actual variable values, and highlighted erroneous states/variables (Section 7.4, pp.50–51). This is a presentation transformation: retain enough trace context to justify the diagnosis, but foreground the semantic mismatch.

How to apply it. (1) Preserve the original verifier output for audit. (2) Identify the smallest failed contract or specification and the component/function that owns it. (3) Extract the first state where expected and actual predicates diverge. (4) Mark the variables and transitions that witness the divergence. (5) State expected behavior in ordinary language, then link each claim to the exact formal predicate and trace state. (6) Let the engineer inspect the raw trace and re-run verification after repair.

Verus form. Inference: map a failing `ensures` to pre-state, return value, and modified locations; map a loop invariant failure to the iteration and invariant conjunct that cannot be re-established; map a failed `assert` to the preceding proof facts. Show executable values where available and ghost terms with their definitions. Do not fabricate a concrete counterexample when Z3 only reports an unproved obligation.

Evidence. Only 6/13 participants found the raw model-checker output easy to understand, versus 12/13 for the explanation (Section 7.4, pp.51–52). The raw output was already highlighted for the pretest, so this comparison is not simply a highlighting change. The explanation also names component and contract context, which is a confounding improvement.

## findings relevant to product adoption

The 41-person survey found that 51% rated identifying inconsistent formal specifications as hard and 73% as at least slightly hard (Table 5, p.22); 77% rated understanding the inconsistency at least slightly hard (Table 6, p.23). The used methods were model checking 18/56 responses (32%), manual inspection/review 10/56 (18%), simulation 6/56 (11%), reasoner 5/56 (9%), and contract-based design 4/56 (7%), with 13/56 (23%) no opinion (Table 8, p.27). The denominator is the 56 method selections, not the 41 participants, because participants could mention multiple methods.

In the posttest opinion questions, all 13 participants responded positively that the explanation improved understanding, compared with 9/13 for raw output (Section 7.6, p.54). Seven/13 agreed it saved time and none responded negatively; all 13 agreed it increased confidence, compared with mixed raw-output responses (Section 7.6, pp.55–56). These are self-reports in a small, non-randomized experiment, not measured completion times.

The survey also reports 34/41 (83%) positive opinions that formal methods are usable in real-world development, while respondents cite lack of scalability, understandability, and plug-and-play integration as barriers (Section 6, p.43). Inference: the product threat from agent-written verified Rust is high if raw solver diagnostics are delivered without semantic context: engineers may accept or weaken a contract incorrectly. A structured explanation can reduce that usability risk, but it cannot establish that the specification is the right requirement.

## what is proved, measured, and trusted

Proved by the underlying tools: whether the FASTEN/NuSMV or nuXmv refinement model satisfies its LTL specifications, and counterexamples when it does not (Section 4, pp.6–7). Measured: questionnaire ratings, task answer counts, and qualitative comments from 41 survey participants and 13 pretest/posttest participants. Trusted: the formalization of Bosch requirements, model and specification translations, the model checker, the explanation algorithm’s extraction rules, participant self-reports, and the study’s interpretation of “correct” fixes. No runtime comprehension time was measured because the authors say workplace timing would be difficult to capture (Section 5.6, p.14).

The main methodological limitation is explicit: the one-group pretest/posttest design has no control group and changes from an airbag to an EPS use case. The authors discuss history and maturation, testing, instrumentation, selection, and generalization threats (Section 8, pp.65–67). Inference: VL should treat the reported 12/13 versus 6/13 comprehension result as evidence that this explanation format is promising, not as a causal estimate of improvement.

## techniques for the catalog

- fault-localized explanation — derive inconsistent specs, contracts, components, states, and variables from a failed refinement
- annotated counterexample — highlight the first erroneous state and variables while retaining the raw trace
- semantic repair loop — let engineers change the model/requirement and re-verify the changed refinement
- comprehension tasks — score localization, cause, repair, and expected behavior separately
- explanation evaluation — compare raw diagnostics and structured explanations with per-question denominators
- human-centered evidence — preserve exact formal predicates and trace links while presenting domain-language summaries
Checked 2026-10-14 against the paper by a Codex agent: audit record kaleeswaran2023userstudy; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
