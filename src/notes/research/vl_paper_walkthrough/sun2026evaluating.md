# Evaluating Research-Level Math Proofs via Strict Step-Level Verification
(authored by agents unless marked 🧑)
Tag: `sun2026evaluating`, [paper](http://arxiv.org/abs/2606.10799v1)

## scope and result

The paper presents a natural-language proof verifier for research-level mathematics. Its central claim is that expanding each deduction into a constrained, auditable derivation exposes gaps that global “is this proof correct?” prompts miss. The paper explicitly says: “we shift from global evaluation to strict step-level verification” (section 1, p. 1). This is an LLM workflow, not a machine-checked proof: the paper says the agent “operates without relying on a formal proof assistant or domain-specific theorem whitelists” (section 3.2, p. 4).

The benchmark contains 21 expert-labelled proofs: 11 valid and 10 invalid (section 4.1, p. 5). Over three independent trials, the proposed agent correctly classified 8/11 valid proofs, rejected 10/10 invalid proofs, and scored 18/21 overall; Table 1 reports these denominators and the avg@3 setting (Table 1, p. 7). The three valid-proof failures involved unstated domain conventions, so the method trades completeness for conservative soundness. The paper reports zero false acceptances of invalid proofs, but this is evidence only for this 21-proof suite and protocol.

## technique 1: constructive step elaboration

What it is. Treat the proof text S as ordered deduction steps `(s1, …, sn)`. For each step `si`, extract its assertion `ai` and generate a finer derivation `s'i` that ends in exactly the same assertion while preserving the original route. The paper defines elaboration as “expanding a deduction step si into a finer-grained derivation string s′i in natural language” (section 1, p. 1), and requires that “s′i must strictly preserve the original reasoning trajectory of si” (section 3, p. 3).

When to use it. Use this when a long natural-language proof can hide a spurious inference inside plausible prose. The paper's rationale is that global evaluation “often obscures subtle flaws and logical gaps” (section 3, p. 3). A failed elaboration is treated as evidence of a gap, but an unresolved difficult theorem remains OPEN rather than automatically flawed.

How to apply it.

1. Split every source sentence with mathematical content into minimal logical units. The initialization prompt requires that every source sentence appear verbatim in at least one `Original step` field (Appendix A.1, p. 8).
2. For the most critical untouched or OPEN step, record its original text, target assertion, original route, and a “thick elaboration” (Appendix A.1, p. 8; Appendix A.2, pp. 9–10).
3. Expand skipped algebra and logical links, but keep the same conclusion and route. The template requires “conclusion preserved” and “route preserved” in its diagnosis (Appendix A.2, p. 10).
4. If the step is too coarse, split it into substeps and initialize each substep OPEN; the paper calls this “Dynamic Decomposition (OPEN → {OPENa, OPENb})” (section 3.2, p. 4).
5. Mark the step VERIFIED only when the elaboration is closed and all external items are supported; otherwise leave it OPEN unless an explicit flaw witness exists (section 3.2, p. 4; Appendix A.1, p. 8).

Worked shape. In the paper's √2 irrationality case, Step 7 (“If the square of an integer is even, then the integer itself must be even”) is represented with local context `{a² is even} ∪ {a ∈ Z}`, external theorem `{∀n ∈ Z, n² is even ⇒ n is even}`, and empty background theory; the assertion is “a is an even integer” (Appendix B, p. 11). Step 9 uses local equations `a = 2k` and `2b² = a²`, no external lemma, and routine equality substitution and integer arithmetic in T9 (Appendix B, pp. 11–12).

Verus form. Inference: model each step assertion as a `spec fn` over a proof-state datatype, and prove a `proof fn` lemma that the elaborated transition preserves the assertion. Use `requires` for the local context, `ensures` for the target assertion, and `assert` for intermediate arithmetic facts. A dynamic split can be represented by separate proof lemmas for each substep. Natural-language route preservation and source-sentence coverage do not become executable Rust properties unless encoded as ghost data and specifications; Verus will check the encoded arithmetic or logical entailment, not whether prose followed the same route.

Evidence and limits. The paper's case study is illustrative, not a correctness experiment. Inference: to reproduce it in Verus one would need formal integer types and lemmas for evenness; the paper's use of “rigorous informal entailment” (Appendix B, p. 10) is weaker than SMT-checked entailment. The paper also states that it does not algorithmically verify the extraction itself (section 3.1, p. 3), so malformed decomposition remains trusted.

## technique 2: tripartite dependency accounting (Γ, Σ, T)

What it is. Every elaborated step is explained by three finite sets. Γ contains statements from the proof text (definitions, hypotheses, prior results, including implicit local assumptions); Σ contains non-trivial external statements from literature or domain consensus; T contains trivial background rules and rewrite operations. The validity condition is written as `Γi ∪ Σi ⊢Ti ai` (section 3.1, p. 3). The paper stresses that the triple is a minimal set needed for this step, not all truths in context (section 3.1, p. 4).

When to use it. Use Γ/Σ/T whenever a proof relies on a theorem, convention, or omitted algebraic operation whose provenance could be confused. It prevents a globally true theorem from being silently applied without checking local hypotheses. The paper warns that unconstrained retrieval risks “contextual misapplication” when prerequisites are not met (section 3.2, p. 5).

How to apply it.

1. For each step, list effective local assumptions and definitions in Γ, respecting scope; case-local facts expire after the case (Appendix B, p. 10).
2. List each non-trivial external theorem or convention in Σ with an exact as-used statement, proof sketch or precise citation, and an applicability note (Appendix A.1, p. 8).
3. Put routine rules such as Modus Ponens, equality substitution, and ground arithmetic in T (section 3.1, p. 4; Appendix B, pp. 11–12).
4. Derive the assertion only from these sets. If any used σ remains unsupported, label the route conditionally closed and keep the step OPEN (Appendix A.2, p. 10).
5. Preserve the exact assertion and route in the diagnosis; do not replace an unresolved inference with an alternative proof (Appendix A.1, p. 9).

Verus form. Inference: Γ maps naturally to `requires` facts and ghost state; T maps to built-in arithmetic and explicit proof lemmas; Σ maps to separately proved `proof fn` lemmas imported by the module. A step lemma can use `requires` for Γ and `ensures` for `ai`, while `assert` or a named lemma supplies each T rule. An external theorem should not be represented by `external_body` on the function under verification; instead, its contract must itself be trusted or proved and its trust boundary documented. Verus cannot check a prose citation's authority or whether an implicit convention was intended.

Evidence and limits. The paper's main evidence is the 10/10 invalid-proof rejection result under the 21-proof suite (section 4.2, p. 6; Table 1, p. 7). External retrieval is internet-based and provenance is only prompted, not computationally enforced: “we do not computationally enforce strict constraints on the exact provenance or syntactic precision of the cited theorems” (section 3.2, p. 5). Thus Σ can still contain a wrong or misapplied theorem.

## technique 3: state machine, flaw confirmation, and halting

What it is. Each step has state OPEN, VERIFIED, or FLAWED. Initialization sets every step OPEN. A step becomes VERIFIED only when its elaboration is logically closed and every Σ item is supported; it becomes FLAWED only with an explicit witness such as a false statement, invalid inference, contradiction with Γ, or misapplied theorem (section 3.2, p. 4). A FLAWED step enters a confirmation pass; if the witness fails on re-evaluation, the state returns to OPEN (section 3.2, p. 4).

How to apply it.

1. Initialize `steps/`, `dependency.txt`, `stepsprocess.txt`, and `answer.txt` as specified in Prompt 1 (Appendix A.1, p. 8).
2. Select the most critical OPEN step and elaborate it; record status, criticality, blocker, dependencies, and next action in `stepsprocess.txt` (Appendix A.2, p. 9).
3. On a suspected flaw, write the exact false statement or invalid inference and a flaw witness. Prompt 3 requires checking scope, hypotheses, and nearby lemmas before retaining FLAWED (Appendix A.2, p. 9).
4. Resume unresolved steps. If five consecutive resumptions produce neither OPEN→VERIFIED nor a split, stop and reject by exhaustion (section 3.2, p. 4).
5. Accept iff all steps are VERIFIED; reject immediately after a confirmed FLAWED step (section 3.2, p. 4).

Verus form. Inference: represent state transitions as ghost enums and prove transition invariants with `proof fn`s. A confirmed flaw corresponds to a failed proof obligation or an explicitly stated contradictory precondition; Verus itself does not support “revert to OPEN” as a verifier mode, so the orchestration loop remains external to Rust. The accepted terminal condition can be a ghost predicate requiring every step's status to be VERIFIED.

Evidence and limits. The state machine produced identical final verdicts across three trials, whereas baselines varied slightly (section 4.2, p. 6). However, the 3/11 valid failures show incompleteness: the agent rejected or left OPEN proofs relying on implicit conventions such as linearity of a subgroup or strictly positive kernel diagonals (section 4.2, p. 6). The paper proposes human-in-the-loop queries for such epistemic ambiguity and an adversarial re-verification pass for accepted steps (section 5, p. 6). These are future work, not measured capabilities.

## what is proved, measured, and trusted

The measured artifact is a four-pipeline comparison on a 21-proof diagnostic suite over three trials. Table 1 gives Global GPT-5.4 16/21, Global Codex-5.4 15.33/21, sentence-by-sentence Codex 18/21, and the proposed agent 18/21; valid proofs total 11 and invalid proofs total 10 (Table 1, p. 7). The paper's strongest measured property is 0/10 false negatives for invalid proofs. It does not establish formal soundness, generalization beyond the curated suite, or independence from benchmark leakage. The authors report auditing logs for FirstProof exposure and caution that Gemini results may reflect internet-visible answers (section 4.1, p. 5).

Trusted parts include the base LLM, prompt files, source decomposition, retrieved theorem correctness and applicability, the human labels, and the interpretation of implicit conventions. Lean, Rust, or Verus is not used.

The paper explicitly notes limitations: “our purely text-based agent remains susceptible to subtle hallucinations” and does not yet run a secondary adversarial pass (section 5, p. 6).

## techniques for the catalog

- strict step elaboration — expand each deduction into a route-preserving derivation with the same assertion and explicit skipped logic
- Γ/Σ/T dependency ledger — separate local context, external non-trivial theorems, and routine background rules, and close every used dependency
- state-driven verification loop — move steps OPEN→VERIFIED or OPEN→FLAWED with explicit witnesses, confirmation, decomposition, and bounded exhaustion
- auditable theorem retrieval — record exact as-used statements, proof or citation, and applicability before accepting an external dependency
