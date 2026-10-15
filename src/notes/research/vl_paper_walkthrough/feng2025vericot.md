# VeriCoT: Neuro-symbolic Chain-of-Thought Validation via Logical Consistency Checks
(authored by agents unless marked 🧑)
Tag: `feng2025vericot`, [paper](https://www.semanticscholar.org/paper/6d2282be863dce7834a11fb3e9cb83a879d0d142)

## what the paper proves and measures
VeriCoT is a pipeline that translates every natural-language chain-of-thought (CoT) step into first-order logic (FOL), accumulates premises, and asks Z3 whether each step is entailed or contradicted. The paper's central claim is operational: a trace is valid only when a consistent premise set entails every formalized step. The authors state, “We assume we are given a natural language context (which includes a question, an optional conversation history, and a source document with information relevant to the question) and a CoT consisting of NL steps C1 , . . . , Cn .” (section 2, p. 2). Their implementation uses Claude-3.5-Sonnet-V2 as executor and Qwen2.5-7B-Instruct for fine-tuning (section 3, p. 5).

## technique 1: stepwise solver validation with explicit error classes
Use this when an LLM emits a multi-step explanation and a final answer is insufficient evidence of sound reasoning. The algorithm is explicit (Algorithm 1, p. 3):

1. Set prior formulas, premises, and errors to empty (Algorithm 1, step 1)
2. For each CoT step, autoformalize it into an SMT-LIB formula; after repeated syntax or expressiveness failure, record `untranslatable` and continue (Algorithm 1, step 2a)
3. Check contradiction against accumulated knowledge; record `contradiction` if the prior formulas entail the negation (Algorithm 1, step 2b)
4. Check entailment; if prior formulas entail the new formula, add it and continue (Algorithm 1, step 2c)
5. Otherwise generate supporting premises, reject premises inconsistent with prior formulas, optionally judge source attribution, and label the step `ungrounded` if entailment still fails (Algorithm 1, steps 2d and 3)

The paper's worked SARA example makes the state update concrete. It formalizes “Charlie was born in 2005 and lives with his parent Bob” as `birthYear(charlie)=2005 ∧ LivesWith(charlie,bob) ∧ Parent(bob,charlie)` and then derives age from a quantified commonsense rule (section 2.1, pp. 3–4). The authors explain, “We distinguish the following logical relationships between a new statement and our established knowledge” before defining entailed, contradicted, and consistent-but-not-entailed cases (section 2, p. 3).

Verus form (Inference): represent the generated Rust state with ghost/spec data and prove each transition's postcondition. A `spec fn` can encode the abstract step relation; `requires`/`ensures` state entailment and contradiction conditions, and a proof function can establish that adding a premise preserves an invariant. Verus cannot directly carry arbitrary SMT-LIB quantifiers or trust an LLM translation, so the translation and premise extraction remain an external trusted boundary; the Rust proof checks only the encoded formulas.

Evidence: Table 1 reports pass rate, verifier precision, VCAR, and task accuracy. VeriCoT's rows are ProofWriter 45.2/94.1/42.5/75.8, BioASQ 25.3/84.3/21.3/81.4, and LegalBench-SARA 15.2/87.0/13.2/80.0 (percent, denominator is each benchmark's evaluated CoTs; section 3.3, Table 1, p. 6). The paper defines VCAR as the fraction both verified and correct, so it is not the same denominator as precision. Failure assumptions are material: “As both autoformalization and premise inference rely on LLMs, it is possible that either step can be incorrect” (section 5, p. 9).

## technique 2: vocabulary-growing autoformalization
Use this when a step mentions concepts absent from the current logical vocabulary. The two-stage procedure first prompts an LLM for a structured SMT-LIB translation using existing variables and types; the second prompt adds declarations such as `declare-fun` or `declare-sort`, then retries. The paper permits three retries before marking the step untranslatable (section 2.2, p. 4). In its example, the failed age translation triggers declarations for `current_year` and `age_in_year`, after which `(<= (age_in_year charlie current_year) 18)` succeeds (section 2.2, p. 4).

Verus form (Inference): model the vocabulary as a fixed Rust ghost map from symbols to typed interpretations, and expose only approved constructors in specs. A newly introduced symbol requires a corresponding type invariant and proof obligations; dynamic declaration generation itself must stay outside verified code. Evidence is the paper's pass/precision table above; no ablation isolates the three-retry limit, so its effect is unknown.

## technique 3: premise generation and LLM-as-judge grounding
When a formula is neither entailed nor contradicted, generate multiple non-contradictory candidate natural-language premises, autoformalize them, regenerate if declarations are not semantically covered, satisfiability-filter them, and conjoin survivors (section 2.3, p. 5). Then judge source-derived premises for attribution and commonsense premises for acceptability (section 2.4, p. 5). Table 2 gives acceptance scores: grounded contextual premises 93.5 (SARA), 87.3 (BioASQ), 96.4 (ProofWriter); acceptable commonsense 83.9, 93.0, 90.5; necessary commonsense 77.0, 81.1, 77.4 (percent of judged premises, denominators are all generated premises of that category in each dataset; Table 2, p. 6).

Verus form (Inference): encode each accepted premise as a ghost fact guarded by a proof of consistency with the current state. A judge verdict is evidence for triage, not a Verus proof; require a machine-checkable lemma or refuse the premise. The paper itself warns that judges may miss confabulations, so this is a trust limitation.

## technique 4: verifier feedback for repair and training
For a failed trace, feed each step, added premises, formulas, solver results, parameter assignments, and optional judge verdict back to the model and ask it to revise; re-run verification (section 3.4, p. 7). Table 3 shows VeriCoT-Base pass rates after reflection of 60.1 (ProofWriter), 33.4 (BioASQ), and 25.2 (SARA), with VCAR 54.1, 28.8, and 21.6 respectively; the reported mean relative gains are +46.4% pass rate and +41.1% VCAR (Table 3, p. 8). For training, retain traces passing solver and judge checks for SFT, then construct DPO chosen/rejected pairs from passing and failing resamples (section 3.4, pp. 8–9). Table 4 reports Qwen pass-rate changes with SFT+DPO to 26.8 (BioASQ) and 27.8 (ProofWriter), versus direct baselines 22.8 and 21.8; denominators are benchmark examples.

## what stays trusted and threat to VL
The Z3 decision procedure is trusted for the encoded FOL fragment, but LLM translation, premise selection, judge labels, and the mapping from natural language to formulas are not proved. The paper explicitly limits its guarantee to the formalization: “it cannot guarantee that the NL CoT or the premises are correct” (section 5, p. 9). Inference: this is a high threat to agent-written verified Rust if VL accepts prose claims as specifications; it is useful as a front-end that proposes obligations, while Verus must independently prove the Rust implementation against human-approved specs. Existing work already supplies solver-assisted reasoning, self-reflection, SFT, and DPO; VL should reuse the step/error schema rather than rebuild an ungrounded language judge.

## techniques for the catalog
- stepwise FOL/SMT entailment: translate each reasoning step, classify contradiction or entailment, and retain only consistent accumulations
- vocabulary-growing autoformalization: add typed SMT declarations when a step exceeds the current vocabulary, retrying up to three times
- premise generation with judge checks: synthesize, satisfiability-filter, and attribute premises before accepting an unentailed step
- verification-guided repair and DPO: expose solver diagnostics for self-correction and train on verified versus failed trace pairs

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
