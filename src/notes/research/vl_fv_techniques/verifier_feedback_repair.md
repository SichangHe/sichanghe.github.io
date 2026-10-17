# Verifier-feedback repair loop
(authored by agents unless marked 🧑)

Take a failed proof and the verifier's exact diagnostics.
Hand both back to the model.
Re-run the verifier.
Stop at success or at a fixed budget.
Some systems also route each error class to its own repair prompt.

Two neighbours have their own pages and I do not cover them here.
Repair driven by a concrete counterexample: [counterexample_guided_repair.md](counterexample_guided_repair.md).
Search over many repair candidates: [proof_search_strategies.md](proof_search_strategies.md).

Notes on keeping proofs working over time are in [proof maintenance and repair](../topic_studies/formal_verification_rust/practical_fv/proof_maintenance_repair.md).
That is a different problem: the code changed, the proof broke.
Here the model's own first draft is what broke.

## the problem

One-shot proof generation misses often.
The typical miss is small: a lost cast, one missing invariant, one assertion Z3 cannot see.
Sampling again throws away the first draft and the verifier's message.

The studies agree on one point.
The verifier is the only judge.
The loop gives the model the verifier's words, not the other way round.
The study of the first Verus proof-synthesis paper says it directly (study's words):
"Do not treat a model explanation as evidence. The proof checker is the acceptance test."
([study](../vl_paper_walkthrough/leveraging_large_language_models_for_aut_20261012.md))

## how to do it in Verus

The studies mostly give Verus forms for this technique.
Where a step below comes from a non-Verus study, I say so.
The assembled recipe is my inference.

1. Run `verus` on the candidate. Keep the whole output, verbatim.
2. If it verifies, check it against the rules below, then accept.
3. Otherwise build a repair prompt from the full current file, the diagnostics, and the instructions.
4. Ask for a complete replacement file or annotation block.
5. Re-run `verus`. Repeat to a fixed attempt budget.
6. On budget exhaustion, restore the last stable source and report failure.

Rules the studies add around that core.

- Acceptance is mechanical.
  - Only a clean Verus run counts.
  - A model's explanation is not evidence.
- Freeze the code.
  - DafnyPro parses the output, strips the annotations, and demands the rest equal the original. ([study](../vl_paper_walkthrough/dafnypro_20261012.md))
  - That is Dafny. The Verus form is my inference: a syn-based diff on the function body.
- Ban escape hatches.
  - The Dafny repair prompt forbids unproved `assume`, `decreases *`, and deleting tests. ([study](../vl_paper_walkthrough/automatic_generation_of_formal_specifica_20261012.md))
  - For Verus the study suggests rejecting `assume`, `admit`, and `external_body`. That list is the study's inference.
- Fix pure syntax without a model call.
  - Example: Python-style chained comparisons in Nagini. ([study](../vl_paper_walkthrough/can_llms_enable_verification_in_mainstre_20261012.md))
  - The converter must not change the contract.
- Do not let a failed candidate become the next baseline unless you chose that.
  - The Eiffel batch mode does continue from the previous suggestion. The study says to pick a policy and document it.
    ([study](../vl_paper_walkthrough/large_language_models_and_language_serve_20261012.md))
- If the specification is model-written, validate it separately.
  - The loop can "repair" a proof by weakening the claim.
  - OSVBench says to track whether repair fixes the proof by weakening the specification. ([study](../vl_paper_walkthrough/osvbench_20261012.md))

### routing by error class

Some systems pick the repair by the kind of error.
That is the step that separates a plain loop from a routed one.

A routed loop needs three things.
A parser for the diagnostics.
A class label.
A small prompt or edit rule per class.

The classes the studies name:

- AutoVerus: precondition, vector length, postcondition, invariant failure at loop entry, invariant failure at loop exit, assertion, arithmetic under or overflow, type mismatch.
  Plus an assertion-with-proof-function agent and a default fallback. ([study](../vl_paper_walkthrough/autoverus_20261012.md))
- VeriStruct: parser, type, arithmetic, pre/postcondition, invariant, missing element, mode, old-self, assertion, decreases, redundant invariant.
  ([study](../vl_paper_walkthrough/veristruct_20261012.md))
  - Example actions: `by(nonlinear_arith)`, bounds assertions, `old(self)`, imports.
- Dissect-and-Restore: syntax, unprovable condition, timeout. It treats Verus borrow-checker errors as their own class. The Verus part is the study's inference.
  ([study](../vl_paper_walkthrough/dissect_and_restore_20261012.md))

A typical order from the studies: casts, argument types and plain annotations first.
Stronger invariants second.
The Verus-focused study says so for Verus (study's words): "prioritize casts, argument types, and annotations before searching for stronger invariants."

## variants by paper

Verus, plain loop.

- Yao et al., first Verus proof synthesis with GPT-4. Resend the last response plus the error text. One retry in the main setup. A later model got two more attempts.
  ([study](../vl_paper_walkthrough/leveraging_large_language_models_for_aut_20261012.md))
- Can LLMs enable verification (Dafny, Nagini, Verus). Claude 3.5 Sonnet, up to five repair iterations. The paper's words:
  "Following this, we attempt verification of the code produced and if any issues are detected, the feedback is passed back to the LLM to refine its suggestion."
    ([study](../vl_paper_walkthrough/can_llms_enable_verification_in_mainstre_20261012.md))
- VerifyThisBench. Five attempts. The first is zero-shot. Later ones get the full history plus current diagnostics. Tools include Verus and CBMC.
  ([study](../vl_paper_walkthrough/verifythisbench_20261012.md))
- AlgoVeri. Up to 15 rounds, then an LLM judge for semantic fit. Verus is one of three languages. ([study](../vl_paper_walkthrough/algoveri_20261012.md))
- OSVBench. Original prompt, generated spec, and the verifier errors. Two rounds. Hyperkernel's verifier, not Verus. ([study](../vl_paper_walkthrough/osvbench_20261012.md))

Verus, routed.

- AutoVerus. Three phases.
  In the debugging phase: pick one reported error by a fixed priority (type errors, then bound errors, then invariant-before-loop errors, then the rest in report order), send it to the
    matching agent, iterate to a maximum (10 by default).
  Return at once if a candidate verifies. Otherwise accept a safe, compilable candidate that scores better, or that cuts the errors of the target type without lowering V.
  ([study](../vl_paper_walkthrough/autoverus_20261012.md))
- VeriStruct. A planner picks which components to write. A repair module classifies and patches. ([study](../vl_paper_walkthrough/veristruct_20261012.md))
- VCoT-Bench. A repair agent gets the Verus errors, grammar rules, and curated examples. The paper's words:
  "At this stage, the Verus verifier compiles and checks the program with the transformed proofs, and the resulting error messages are fed back to the repair agent".
  ([study](../vl_paper_walkthrough/can_llms_reason_like_automated_theorem_p_20261012.md))

Verus, trained.

- SAFE. Keep each rejected proof, its Verus errors, and the later verified proof. Fine-tune generation and repair together.
  ([study](../vl_paper_walkthrough/automated_proof_generation_for_rust_code_20261012.md))

Other verifiers, same idea.

- Baldur (Isabelle). A separate model, trained on theorem, wrong proof, and error message. Output is a new whole proof. ([study](../vl_paper_walkthrough/baldur_20261012.md))
- Eiffel-tools (AutoProof). Per feature or per class. On failure, restore the backup and try again. The paper's words:
  "If verification still fails, the original is restored and another candidate is tried". ([study](../vl_paper_walkthrough/large_language_models_and_language_serve_20261012.md))
- Dafny, generate-check-repair-minimize. Repair accumulates patches, so a deletion pass follows. ([study](../vl_paper_walkthrough/automatic_generation_of_formal_specifica_20261012.md))
- DafnyPro. Prune non-inductive invariants when repair wastes attempts. Add retrieved hints to later prompts. ([study](../vl_paper_walkthrough/dafnypro_20261012.md))
- VERINA (Lean). Feed Lean errors back into repeated proof generation. ([study](../vl_paper_walkthrough/verina_20261012.md))
- WybeCoder (Lean). The history is a list of (code, error) pairs. ([study](../vl_paper_walkthrough/wybecoder_20261012.md))
- APOLLO (Lean). Repair is local: keep the sketch, mark failing parts with `sorry`, re-prompt only those. The paper's words:
  "all of those information/feedback from the compiler remains unused." ([study](../vl_paper_walkthrough/apollo_20261012.md))
- P^3 (Lean). Local repair may not change the plan. An unplanned algorithm or invariant sends it back to planning. ([study](../vl_paper_walkthrough/p_3_20261012.md))
- Neuro-symbolic (ESBMC, C). The only feedback carried between rounds is three sets: proved, disproved, unknown. Failed conjunctions are split into atoms.
  ([study](../vl_paper_walkthrough/neuro_symbolic_software_verification_20261012.md))
- SpecAgent (ACSL, Frama-C). Each failure is mapped to caller, callee and line, and the repair agent may edit an upstream weak contract,
  not only the local one. Annotation edits only. ([study](../vl_paper_walkthrough/specagent_20261012.md))
  - precision with repair added to planning and generation: 94.79% (DeepSeek) and 94.34% (GPT-5), against 89.78% and 88.66% for generation only
  - the study notes WP incompleteness can make a valid candidate look failed
- Knowledge-graph SVA (SystemVerilog). Separate loops for syntax errors, counterexamples, and coverage. ([study](../vl_paper_walkthrough/knowledge_graphs_formal_verification_20261012.md))
- KBSpec (JML): up to three rounds; retrieve one item from the current specification plus its error. [study](../vl_paper_walkthrough/kbspec_20261012.md)
  - partial progress p = |E_t - E_(t+1)| / |E_t| over the error multiset, and a penalty for errors that come back; credit goes to the retrieved item
  - the Verus form (diagnostic categories, three attempts, keep the original contract to detect weakening) is the study's inference
- What's in a Proof? (F* and Verus, expert telemetry). Experts differ in how they use feedback, not only in whether they do.
  [study](../vl_paper_walkthrough/what_s_in_a_proof_analyzing_expert_proof_20261012.md)
  - verifier calls per minute: F* 3.39, Verus 9.11; average active errors 1.49 (F*) and 1.9 (Verus)
  - some Verus participants let active errors reach 35-40; the paper does not say those sessions failed
  - rapid-verifier sessions failed more: F* success 67% against 100% for spec-first planners; Verus 60% against 100%
  - P7 (dense verify and spec churn) failed after 45 minutes; P8 (full skeleton, temporary assumptions, one subgoal at a time, deliberate pauses) succeeded
  - advice: after a focused run, interpret the error, fix one cause, and do not rerun without a changed hypothesis
  - a loop that refuses repeated verifier calls without a changed hypothesis is the study's inference for Verus

Lean, compile-checked loop. [study](../vl_paper_walkthrough/advancing_mathematics_research_with_ai_d_20261012.md)
- each turn compiles the sketch and feeds pending goals or errors to the next turn; the output is accepted only when Lean reports no pending goals
- failed sketches and unresolved goals are kept as structured diagnostics for a human; the study says these steps are its reconstruction and the claim is not a measured time saving
- the Verus form (run `cargo verus` after each edit, keep failed states apart from accepted proofs) is the study's inference

## the evidence, with denominators

Every number is the study's, for that paper's benchmark and model.
They do not add up across rows.

Verus:

- AutoVerus: 137 of 150 tasks (91.3%) with at most three tries. The GPT-4o baseline (max 10 minutes) proves 67 of 150 (Table 2).
  Phase 1 alone handles slightly over half. 2,637 candidates and about $37 in total.
  The paper does not split out the gain of the debugging phase in these study lines, so I cannot say how much of 137 the routed repair earned.
  ([study](../vl_paper_walkthrough/autoverus_20261012.md))
-
  Yao et al.: 110 segments from 20 programs. 55 needed nothing. 18 verified from the direct proof. 17 more after static propagation. 2 after error feedback. 1 after both. 16 after human
    correction. 1 unverified, because the program was buggy.
  With the 2023-03 GPT-4, 3 of 20 programs were fully automated and feedback fixed 2 segments.
  With the 2023-11 model and two extra attempts: 14 of 20 programs, and over 20 segments fixed by feedback.
  ([study](../vl_paper_walkthrough/leveraging_large_language_models_for_aut_20261012.md))
- SAFE: DeepSeekCoder, VerusBench (139 tasks). Direct Accuracy@2 is 46.76%. With the debugging model, 49.64%. At @100, 59.71% vs 70.50%. CodeNet-Test at @2: 44.74% vs 48.43%.
  ([study](../vl_paper_walkthrough/automated_proof_generation_for_rust_code_20261012.md))
- VerifyThisBench, strict, Verus: mean success 3.32% to 8.15% after refinement. CBMC 4.76% to 18.11%. Best model overall: o3-mini, 3.62% to 9.37%.
  ([study](../vl_paper_walkthrough/verifythisbench_20261012.md))
- AlgoVeri, 77 tasks: Gemini-3 Flash with 15 rounds gets 25.97% compiler-verified in Verus, 24.68% after semantic filtering. GPT-5.3 Codex with 8 rounds: 14.29% and 11.69%.
  ([study](../vl_paper_walkthrough/algoveri_20261012.md))
- VeriStruct: 10 of 11 modules, 128 of 129 functions (99.2%).
  The baseline asks the model once per iteration for all annotations and feeds back the last failing code and error, for 13 invocations.
  It solves 4 of 11 modules and 52 functions, and plateaus below full coverage.
  The paper has no ablation that isolates syntax guidance or repair, so the gain cannot be credited to repair alone. ([study](../vl_paper_walkthrough/veristruct_20261012.md))
- Can LLMs enable verification, Verus subset, 55 programs, at least one of five runs: 25 verified in Mode 1, down to 8 in Mode 6.
  This is the whole loop with up to five repair iterations, with no no-repair control in the study lines I read.
  ([study](../vl_paper_walkthrough/can_llms_enable_verification_in_mainstre_20261012.md))

Verus error mix (five Mode 1 runs, same paper): 192 type errors, 46 assertion failures, 28 invariant-maintenance failures, 22 invariant-entry failures, 17 syntax errors, 14 arithmetic under
  or overflow.
So plain type errors dominate.
That is the case for cheap class-specific fixes first.

Other verifiers:

- Baldur, 6,336 test theorems: one generation plus one repair proves 266 more (4.2%), but uses two samples against one. At matched cost, the paper's gain is 1.5%. Cost two: 24.9%.
  A second repair: 26.2%. Plain generation at cost three: 25.4%. ([study](../vl_paper_walkthrough/baldur_20261012.md))
- Dafny, 110 programs: Claude Opus 4.5 under repair prompting 90.0% by attempt five, 96.4% by ten. Multimodel 94.5% at five, 98.2% at ten (108 of 110).
  Direct multimodel at five attempts: 57.3%. ([study](../vl_paper_walkthrough/automatic_generation_of_formal_specifica_20261012.md))
- Eiffel, 539 bugs, up to ten attempts: Sonnet 4.6 fixed 513 (95.2%) with the full prompt and 486 (90.2%) with the minimal one. The full prompt adds 6.4 points on average.
  Among features eventually fixed, the first attempt accounts for 67.9% to 83.5%. ([study](../vl_paper_walkthrough/large_language_models_and_language_serve_20261012.md))
- VERINA: one-shot o3 4.9%. Iterative refinement reaches up to 20.1% with 64 rounds. The paper gives no model or count for 20.1%. The paper's words:
  "iterative proof refinement reliably outperforms direct generation at matched query budgets". ([study](../vl_paper_walkthrough/verina_20261012.md))
- APOLLO, miniF2F-test (244 problems): o4-mini 7.0% at one sample, 46.7% with APOLLO. Syntax refiner alone gives 7.4%. Auto solver alone 7.0%. LLM re-invocation alone 8.2%.
  All three together 46.7%. ([study](../vl_paper_walkthrough/apollo_20261012.md))
- DafnyPro, 782 programs, ten attempts: over 85% for both Claude models. Hint retrieval adds about 10 percent and pruning about 3.
  The paper says only "percentage gains", not points or relative. ([study](../vl_paper_walkthrough/dafnypro_20261012.md))
- P^3 (Lean): full-restart rates fall from 28.6% to 11.7% (Codex) on Verina, 189 runs per backend. This measures plan-checked local repair against sequential repair.
  ([study](../vl_paper_walkthrough/p_3_20261012.md))
- KBSpec, 699 Java programs, C@All: removing iterative repair lowers it by 21.82, 17.22 and 13.33 points (GPT-5.2, GPT-5-mini, Claude-Sonnet-5);
  removing partial-repair credit by 1.53 to 3.40. [study](../vl_paper_walkthrough/kbspec_20261012.md)
- What's in a Proof?: 8 expert sessions per language, human not LLM. Rapid verifier use went with lower success in both languages.
  [study](../vl_paper_walkthrough/what_s_in_a_proof_analyzing_expert_proof_20261012.md)
  - the Verus planner cluster is one session, so its 100% is exploratory

## where the studies disagree

How many rounds help.

- SAFE: the study says "Two further self-debugging rounds beyond the first add less than 1%", citing the paper's section 4.3.2.
  ([study](../vl_paper_walkthrough/automated_proof_generation_for_rust_code_20261012.md))
- OSVBench: GPT-4o repairs 14.67% of broken specs in round one and 1.56% in round two. DeepSeek-Chat 11.45% and 2.59%. ([study](../vl_paper_walkthrough/osvbench_20261012.md))
- Baldur: a second repair adds 1.3 points.
- Against that, VERINA gains up to 64 rounds. A case reached the right proof on attempt 24 after 23 failures.
  Dafny repair runs to ten attempts and still climbs from 90.0% to 96.4% for one model.
  AlgoVeri says Gemini's Dafny pass rate "nearly triples" from round 0 to 15, while GPT-OSS-120B saturates near round 3.
- I read these as: depth depends on model and task. A small cap fits what SAFE and OSVBench saw. A larger cap suits stronger models on harder tasks. That is my guess.
  No study tests a Verus run past three tries against a cap sweep.

Whether to put counterexamples in the repair prompt.

- Neuro-symbolic: counterexample traces "were tried but generally harmed smaller models because they lengthened context".
  ([study](../vl_paper_walkthrough/neuro_symbolic_software_verification_20261012.md))
- Eiffel-tools puts the AutoProof counterexample or compile error in the prompt, and its full prompt beats minimal. It does not isolate the counterexample's share.
  ([study](../vl_paper_walkthrough/large_language_models_and_language_serve_20261012.md))
- That question belongs to [counterexample_guided_repair.md](counterexample_guided_repair.md).

Does the error text matter.

- Baldur: a repair model with no error message did not beat plain generation after normalising for inference cost. ([study](../vl_paper_walkthrough/baldur_20261012.md))
- Eiffel: removing the syntax guide, template and concrete error drops Sonnet 4.6 by 5 points and GPT-5 Nano by 5.2. The study cannot say which part matters.
  ([study](../vl_paper_walkthrough/large_language_models_and_language_serve_20261012.md))
- APOLLO's ablation points the other way for syntax-only help: the syntax refiner alone moved o4-mini from 7.0% to 7.4%. Gains come from the combination.
  ([study](../vl_paper_walkthrough/apollo_20261012.md))

Keep the whole history or only the last attempt.

- Yao et al. resend the last response and error. VerifyThisBench sends all earlier attempts. WybeCoder keeps all (code, error) pairs. Neuro-symbolic sends only the three sets.
- No study compares these.
- Baldur warns of error accumulation: "later repair sees a malformed predecessor and may lose useful structure". That is the study's wording.

## where it fails

- It cannot invent a missing requirement. The Yao et al. study says error feedback "does not discover a missing high-level requirement."
- It does not fix a wrong plan. APOLLO needs a coherent initial sketch. P^3 retreats to planning when local repair fails.
- It can repair by weakening. Verification passing does not mean the contract is right.
  - AlgoVeri loses a point or more under semantic filtering: 25.97% to 24.68% on Verus.
  - VerifyThisBench says a verifier pass does not show the contract captured the intent. ([study](../vl_paper_walkthrough/verifythisbench_20261012.md))
- Timeouts carry little information. The Can-LLMs study says more retries may not help there. Dissect-and-Restore says never turn a timeout into success or add `assume`.
  ([study](../vl_paper_walkthrough/dissect_and_restore_20261012.md))
- The model can repeat the same bad fragment. Dissect-and-Restore says a retry cap is required.
- Repair piles up scaffolding. In the Dafny study, repaired programs are 63.2% larger than manual solutions. A deletion pass cuts 58% of annotation lines.
- Routing depends on the classifier. The AutoVerus study says debugging "depends on accurate error classification and a finite iteration bound."
- First-error training only. Baldur's repair data sees only Isabelle's first error. The model learns local fixes, not global ones.
- Verus diagnostics may be less pointed than Isabelle's first-step error (Baldur study, its inference).
- Low scores remain. VerifyThisBench: 9.37% best, on strict end-to-end tasks. The study says that a repair loop cannot be assumed to make agent-written verified Rust reliable.
- Reported benchmark numbers may be contaminated. Eiffel's study notes the benchmarks may have leaked into training data.
- Credit for a disappeared error is not credit for a right contract. KBSpec's study says only a final pass establishes correctness, and Table 7 shows weakening in 33.0-51.2% of learned repair items.
  - the error classes there (loop 16.6-24.0%, arithmetic 14.7-22.5%) come from keyword matching, which the paper does not validate. [study](../vl_paper_walkthrough/kbspec_20261012.md)
- Fast retries are not progress. Expert telemetry ties rapid verification with many persistent errors to failure, but not causally.
  [study](../vl_paper_walkthrough/what_s_in_a_proof_analyzing_expert_proof_20261012.md)

AlphaProof Nexus ([study](../vl_paper_walkthrough/advancing_mathematics_research_with_ai_d_20261012.md)).
- a repeated loop can keep polishing a false or misformalized target without a separate statement validator
- failed sketches often hid a target-sized `sorry` or a hallucinated literature lemma

## open questions

- How much of AutoVerus's 137 of 150 comes from the routed debugging phase? A run with the routing off, same budget, is not in the studies I read.
- What is the right cap for Verus? SAFE and OSVBench suggest one or two. VERINA and AlgoVeri suggest more for strong models. No sweep exists.
- Does routing beat one general prompt with the same budget? I found no study that runs that comparison.
  VeriStruct's ablation does not isolate repair or syntax guidance, and its baseline already has a feedback loop.
- Does history help or hurt? No controlled comparison.
- Can the loop detect repair by weakening? OSVBench says to track it. No study measures it on Verus.
- Do the Lean and Dafny results transfer to Verus? The studies say so only by inference. SMT-driven failures are less local than tactic goals (P^3 study, its inference).
- How do you stop a repair from undoing an earlier proof? AutoVerus uses a never-decrease-V rule in its refinement phase. The debugging phase relies on valid-and-safe checks.
  I found no study that tests a regression prerequisite check in repair.

