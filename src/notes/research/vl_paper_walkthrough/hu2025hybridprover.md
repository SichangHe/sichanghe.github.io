# HybridProver: Augmenting Theorem Proving with LLM-Driven Proof Synthesis and Refinement
(authored by agents unless marked 🧑)
Tag: `hu2025hybridprover`, [paper](https://arxiv.org/abs/2505.15740)
## what the paper builds

HybridProver combines whole-proof synthesis with tactic-level proof generation in Isabelle/HOL. A whole-proof model proposes high-level Isar structure. If the candidate fails, a sketch builder replaces failed subproofs with `sorry` while preserving independently verified subproofs. A tactic model and Sledgehammer then solve the remaining subgoals, and the completed proof is checked again by Isabelle. The paper describes the aim as “separating high-level planning from low-level refinement and bridging them through verifiable proof sketches.” (section 1, p. 2).

The benchmark is miniF2F, with 488 mathematical problems and 244 test problems. The reported HybridProver success is 73.8% on the 244-test setting, compared with 61.9% for the prior best Isabelle system ProofAug. The result depends on trained Qwen-Coder-7B models, filtered proof data, sampling, and Isabelle verification. Inference: the system reduces proof-search labor while preserving the theorem prover as the acceptance boundary; it does not make the LLM itself trustworthy.

## technique: whole-proof synthesis for global structure

what it is

A whole-proof model receives a theorem statement and a structured prompt, then generates many complete Isabelle proof candidates. This stage captures induction choices, case structure, and high-level proof planning. HybridProver samples 128 candidates in parallel.

when to use

Inference: use whole-proof synthesis to propose global structure, such as induction or a case split, and retain useful structure from failed attempts.

how to do it

1. concatenate theorem statement with the prompt template
2. generate 128 candidate proofs
3. filter malformed JSON and outputs that do not begin with accepted Isabelle keywords such as `proof`, `apply`, or `by`
4. check remaining candidates concurrently with Isabelle
5. return any verified proof immediately
6. forward syntactically valid failures to sketch construction

The paper notes that syntactic validity does not guarantee correctness, so every retained candidate is checked by Isabelle (section 3.1, p. 4). It reports: “The whole-proof synthesis model alone achieves 45.9%, while the tactic-based generation model achieves 39.3%.” (section 4.2, p. 6).

Verus form

Inference: ask an agent to propose a complete Verus proof function and contract structure, then run Verus before accepting it. Inference: preserve a failed proof’s structural choices as an intermediate representation, but replace invalid proof bodies with explicit holes for later repair. Inference: `requires`, `ensures`, `invariant`, and `proof fn` are the relevant Verus forms; a whole-proof candidate remains untrusted until Verus accepts it.

## technique: mechanically built proof sketches

what it is

When no whole proof passes, HybridProver constructs sketches from candidate proofs. It independently checks each subgoal while replacing the other subgoal proofs with `sorry`. Correct local proofs are preserved; failed portions become placeholders. The sketch is then checked for structural validity before refinement.

when to use

Inference: use this when whole-proof candidates contain useful global structure but have local errors. The sketch lets tactic generation focus on unresolved subgoals while preserving checked local proofs and the surrounding structure.

how to do it

1. check each subgoal proof while replacing all other subgoal proofs with `sorry`
2. preserve the subproof if Isabelle accepts it
3. replace failed subproofs with `sorry`
4. reject sketches with invalid proof methods or missing structural lemmas
5. parse the remaining subgoals
6. refine each placeholder independently

The paper calls this “a partially verified intermediate representation that reuses correct local proof steps and leaves only unresolved subgoals for refinement.” (section 3.1, p. 4). Inference: `sorry` is a search placeholder in this workflow, not evidence of a completed proof.

Verus form

Inference: represent a sketch as a proof function with helper lemma calls retained and unresolved obligations as separate proof functions to synthesize. Inference: do not ship or treat a `proof fn` containing `admit` or an external body as verified; Verus must check the completed body. Inference: preserving already checked lemmas can reduce regeneration while keeping each unresolved obligation explicit.

## technique: tactic-level subgoal refinement with a hammer

what it is

For every unresolved sketch subgoal, a tactic-generation model proposes n local tactics in parallel. Sledgehammer independently searches for a proof. Candidates are checked, inserted into the sketch, and the complete proof is re-verified. Failed combinations trigger backtracking and alternative tactic substitution.

when to use

Inference: use this for local reasoning within a structurally valid sketch. Separately, the paper reports that the tactic model can produce concise solutions to simple theorems for which the whole-proof model generates verbose, incorrect Isar proofs (section 4.2, p. 6).

how to do it

1. parse each `sorry` into a subgoal
2. sample tactic candidates from the tactic model
3. run Sledgehammer on the same subgoal
4. check candidate tactics and retain valid ones
5. substitute them into the sketch
6. verify the complete proof
7. backtrack and try alternatives when final verification fails

The paper reports that combining tactic generation with sketch refinement reaches 71.3% on the 244 miniF2F test problems, before the final HybridProver configuration reaches 73.8% (Table 3, section 4.2, p. 6). The paper says: “In the final stage, the sketch refiner replaces the sorry placeholders in the proof sketch with the corresponding proof steps generated in Step 4, yielding a complete Isabelle proof.” (section 3.1, p. 4).

Verus form

Inference: use Verus diagnostics to generate local proof steps or helper `proof fn` calls for each unresolved obligation, then rerun Verus on the assembled function. Inference: a solver-backed tactic analogue can suggest assertions or lemma calls, but Verus remains the checker. Inference: final re-verification is necessary because locally valid fragments may not compose under the complete contract context.

## technique: proof-data optimization and verification-guided training

what it is

The authors build separate Isar-style and apply-style datasets from Isabelle’s Standard Library and Archive of Formal Proofs. Cleaning removes formatting artifacts, comments, and redundant whitespace; length filters retain structured Isar proofs and concise apply proofs. Two models are supervised-fine-tuned with LoRA. GRPO reinforcement learning then uses Isabelle verification as reward. Appendix A.5 specifies rewards of 1.0 for passing proofs, 0.2 for syntactically valid proofs that fail verification, and 0.0 for invalid outputs, with a penalty of −0.2 for `sorry` or malformed proof patterns (p. 15).

how to do it

1. extract theorem-proof pairs from STD and AFP
2. normalize symbols and remove comments/formatting artifacts
3. partition by Isar and apply proof style
4. filter proof lengths, retaining Isar proofs of 5–50 steps and concise apply proofs
5. use Qwen-Coder-7B as the base model and apply LoRA adapters
6. fine-tune a whole-proof model on Isar and a tactic model on apply data
7. run GRPO with Isabelle-derived verification rewards

The training corpus contains 116,308 apply-style and 35,803 Isar-style AFP training samples, plus 36,038 apply and 9,018 Isar STD samples (Table 1, p. 5). Three supervised fine-tuning epochs and learning rate 10^-5 performed best in the reported ablation; LoRA rank had limited effect (section 4.3, p. 7).

Verus form

Inference: construct separate datasets for high-level Verus contract/proof structure and local proof idioms, then reward only candidates that pass Verus. Inference: penalties for placeholder proofs should target `admit`, unsound external bodies, or other project-specific escape hatches, while preserving legitimate specification boundaries. Inference: verification-derived rewards improve search behavior but cannot correct a wrong specification.

## technique: sampling diversity and component composition

what it is

HybridProver combines candidate sampling, proof filtering, whole-proof and tactic models, Sledgehammer, and sketch refinement. The ablation compares component unions and temperature/sample counts.

how to do it

1. sample multiple whole proofs at a moderate temperature
2. retain syntactically valid candidates
3. verify in parallel and stop on success
4. if all fail, build sketches and sample local tactics
5. combine tactic model and Sledgehammer outputs
6. backtrack over alternatives and re-verify

On miniF2F, whole-proof alone scores 45.9%, tactic-only 39.3%, their union 49.6%, tactic plus sketch refinement 71.3%, and full HybridProver 73.8% (244 test problems, Table 3, p. 6). Moderate temperatures 0.6–0.9 performed best; higher temperatures increased hallucinated facts and verification failures, while larger sampling rates improved success (section 4.3, pp. 7–8).

Verus form

Inference: sample multiple Verus contracts and proof candidates, filter syntax, run Verus concurrently, and retain only passing candidates. Inference: moderate sampling can improve coverage, but it increases compute cost and does not change the proof obligation. Inference: keep denominators and model settings with every success rate because pass rates are benchmark-specific.

## evidence, limitations, and VL impact

HybridProver’s 73.8% is on 244 miniF2F test problems, not all Isabelle/HOL theorems. The paper reports up to 90% success for sketches evaluated without detailed tactics (section 4.2, p. 6). Inference: this measures retained structure rather than completed proofs and suggests that local proof completion is a remaining obstacle. Training and evaluation differ: the training data include mathematics, software, and systems proofs, while miniF2F is purely mathematical. The paper states: “One limitation of HybridProver lies in its relatively simple proof search strategy during the proof sketch refinement stage.” (Limitations, p. 9) It also reports increasing inefficiency as subgoals grow. It also relies heavily on Isabelle as a verification oracle, causing latency and scalability costs.

The reported ablations do not isolate supervised fine-tuning from GRPO: the authors attribute improvements to the post-training pipeline as a whole (section 4.2, p. 7). Including premises in training reduces undefined-fact errors by around 50%, without improving miniF2F performance; the paper says most miniF2F theorems do not require external premises. Three few-shot examples separately provide no performance gain for either the trained model or the base model (section 4.3, p. 7). The authors state: “In addition, our empirical conclusions are limited to miniF2F and do not establish generalization across broader Isabelle/HOL domains.” (Limitations, p. 9).

Inference: for agent-written verified Rust, the strongest reusable idea is the proof-sketch boundary between global design and local repair. A Verus agent can retain a valid abstraction or contract skeleton while regenerating only failed proof functions. Inference: retaining proof structure may reduce regeneration, while wrong contracts and repeated verification remain concerns for a Verus adaptation. Inference: VL should not repeat a monolithic one-shot proof generator when a verifier can expose partial structure and guide local repair.

## techniques for the catalog

- whole-proof synthesis — sample complete theorem proofs to capture global induction and case structure
- mechanically verified sketches — preserve accepted subproofs while replacing failed parts with explicit placeholders
- tactic-plus-hammer refinement — solve each unresolved subgoal with an LLM and symbolic automation, then reverify
- proof-style dataset separation — train high-level and low-level models on cleaned Isar and apply proof corpora
- verification-guided reinforcement learning — use theorem-prover outcomes as rewards and penalize placeholders
- sampled component composition — combine diverse candidates, sketch refinement, and backtracking under final checker acceptance
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "In addition, our empirical conclusions are limited to miniF2F and do not establish generalization across broader Isabelle/HOL domains."): checked the full text, quotations, reported numbers, technique steps, section and PDF page references, tag and paper link; corrected page references, the refinement quotation, the attribution of the undefined-fact error reduction, training-step order and reward details, and marked recommendations as inferences; did not reproduce experiments, inspect released code or datasets, or validate the proposed Verus adaptations.
