# Translating Informal Proofs into Formal Proofs Using a Chain of States
(authored by agents unless marked 🧑)
Tag: `wang2026translating`, [paper](https://doi.org/10.4208/csiam-am.so-2025-0105)

The paper presents CoSProver, a two-stage Lean 4 system. First, a model translates an informal proof into a chain of intermediate formal proof states (CoS). Second, a tactic generator solves each adjacent state transition. The abstract states: “Rather than generating formal tactics directly, we first extract a chain of states (CoS), a sequence of intermediate formal proof states aligned with the logical structure of the informal argument. We then generate tactics to transition between adjacent states in the CoS, thereby constructing the full formal proof.” (Abstract, p. 1). Inference: the intended gain is to replace one difficult whole-proof generation problem with smaller, checked transitions.

## technique: rewrite an informal proof into a Lean-friendly proof

what it is: preprocess natural-language proofs so that omitted logical steps, ambiguous terms, type information and Lean-preferred proof methods are explicit. Section 3.2 says the process “aims to reduce translation brittleness by surfacing tactic-relevant structure without altering the mathematical content.” (Section 3.2, p. 8).

when to use it: use it before generating states or tactics when an informal proof relies on phrases such as “similarly” or “obviously”, skips a case split, hides a type conversion, or uses a human-friendly argument that Lean handles poorly. The paper identifies four recurring mismatches: proof by exhaustion, proof by calculation, type transformation, and logical leaps (Section 3.3, pp. 9–14; Table 1, p. 7). It also states, “The decomposition into states and tactics is not unique.” (Section 4.1, p. 15)

how it is done: (1) remove explanatory text without logical content; (2) remove duplicate application modeling already present in the formal statement; (3) regenerate a natural-language proof when the original is non-rigorous; (4) replace ambiguous words with explicit reasoning and state the conditions and conclusions of contradiction or induction (Section 3.2, p. 8). For finite ranges, tell the downstream prover to enumerate cases rather than reproduce an elegant but difficult AM-GM argument (Section 3.2, p. 8). The paper's example rewrites `a + m + c = 12` into explicit bounds `0 ≤ a,m,c ≤ 12`, then explains nested enumeration of `a`, `m` and `c` and arithmetic simplification in each case (Section 3.3.1, p. 9; Figure 3).

Verus form: Inference: apply the same rewrite stage to a Rust/Verus requirement by making preconditions, case splits, casts and intermediate claims explicit before asking a model for `requires`, `ensures`, `assert` and `proof fn` code. Inference: a rewrite must preserve the formal specification text and only clarify proof steps; Verus's checker, rather than a language model, must decide whether the resulting proof compiles. Inference: the paper's Lean tactics (`interval_cases`, `simp_all`, `rfl`, `ring_nf`) have no guaranteed Verus equivalents; the transferable object is explicit state structure.

evidence, assumptions and limits: Table 8 reports MiniF2F-test success of 62.1% for original informal proofs under a `20 × 15 × 30` budget, 69.2% after GPT-4o rewriting under `20 × 15 × 32`, and 67.8% after Qwen3.5-9B rewriting under the same `20 × 15 × 32` budget (Table 8, p. 28). Inference: the budgets differ for the original and rewritten rows, so the percentages do not isolate rewriting alone, despite the prose claiming “under the same tactic budget” (Section 6.4, p. 28). Algorithm 1 names DeepSeek-R1 for rewriting, while Table 8 evaluates GPT-4o and Qwen3.5-9B; the paper does not reconcile these settings. The paper also manually corrected a subset of MiniF2F informal proofs for notation mismatch, proof skipping and logical gaps (Section 6.3, p. 25). GPT-4o participates in rewriting and in some semantic checks, so the rewriting evidence is not independent of the models used elsewhere.

## technique: represent a proof as a chain of states

what it is: represent each proof state as hypotheses plus a target, and each tactic as a transition. The paper defines a goal as `{h1,…,hm} ⊢ g`, a state as a set of goals, and a tactic as a function from state `S` to successor `S′` (Section 2.2, pp. 5–6). A complete proof is `S0 → S1 → … → Sn`, where the final state has no goals (Section 2.2, p. 6).

when to use it: use CoS when a direct model rollout from the theorem statement tends to skip intermediate facts or when the natural-language argument contains several semantic steps that should be checked separately. Inference: the representation is useful for interactive repair because each failed transition has a local source and target.

how it is done: (1) collect a formal statement and its completed Lean proof; (2) extract the proof-state trajectory and tactics; (3) use GPT-4o to generate an informal proof and a natural-language description for each state; (4) align each informal step with adjacent formal states; (5) fine-tune a CoS model on tuples containing the statement, informal proof, detailed informal proof and CoS (Section 4.1, pp. 14–15; Section 6.1.1, p. 22). Retain the mathematical subset, approximately half of Mathlib's theorems (Section 4.1, p. 14). The filtering descriptions differ: Section 4.1 says “we filter the problems that have two or more states”, whereas Appendix A.1 explicitly says “filter out all CoS with only two states” (p. 34). The appendix identifies these as initial-goal/final-state chains. Postprocessing removes adjacent duplicates and regenerates chains that do not end in `No Goals` (Section 6.1.1, p. 22).

Verus form: Inference: define a Verus transition record containing the relevant ghost state, hypotheses and target predicate, and ask a model to produce a sequence of intermediate assertions. Each adjacent transition can be checked by Verus after inserting `assert` or calling a `proof fn`; executable Rust stays unchanged. Inference: Verus does not expose Lean's interactive infoview state, so a front end must serialize contracts, ghost values and unsatisfied obligations itself. The paper's state sequence is an orchestration representation, not a Verus language feature.

evidence, assumptions and limits: CoS decomposition is not unique: a coarse chain has fewer but harder transitions, while a fine chain exposes more facts and increases local work (Section 4.1, p. 15). The authors therefore sample multiple CoS candidates. Their 100-problem CoS benchmark uses 80 Mathlib and 20 LeanWorkbook problems (Section 6.2, p. 24). GPT-4o performs semantic consistency checks and Leanjixia performs Lean syntax checks; a chain is accepted only after both checks (Section 6.2, p. 24). A later expert audit shows that the automated judge can overestimate quality: for GPT-4o, agreement with expert labels is 73.0% over 100 cases with Cohen's kappa 0.4304, and for Qwen3.5-9B it is 67.0% with kappa 0.3426 (Table 4, p. 25).

## technique: extract and augment proof states from elaboration trees

what it is: inspect Lean's elaboration tree to recover intermediate states hidden inside tactics, theorem applications and term proofs. The paper describes each node as recording an expression, local context, declarations, metavariable assignment, type-checking context and elaborated result (Section 4.2, p. 16). Leanjixia exposes the tree; a Python layer traverses it and records `(expr, res, state)` sequences (Section 4.2, p. 16).

when to use it: use this when a source proof is term-based, uses a `have` subproof, or composes several lemmas in one expression, so ordinary tactic-level extraction would produce a misleading two-state chain.

how it is done: (1) obtain the elaboration tree with Leanjixia; (2) record node type, source span, variables, theorems and proof state; (3) extract subtrees rooted at `by` nodes for tactic proofs; (4) recursively inspect `term.app` nodes; (5) insert the expected type of an internal node as an intermediate hypothesis; (6) treat nested `by` blocks as independent sub-CoS and the outer proof as one tactic-level application (Sections 4.2–4.3, pp. 16–19). For `even_x_plus_2 (even_x_plus_2 h)`, the enhancement inserts the intermediate fact `∃ k, x + 2 = 2 * k`; the original term proof had only the initial state and `No goals` (Section 4.3, pp. 17–19; Figures 11–12).

Verus form: Inference: a Verus tooling layer can obtain syntax and verifier diagnostics from Rust ASTs, then insert ghost intermediate facts corresponding to contract expressions or lemma postconditions. A generated `proof fn` can expose a term application's expected result as an `ensures` clause. Inference: Verus has no Lean elaboration tree or Leanjixia API in the referenced material, so this requires a separate Rust/Verus front end and cannot be claimed as existing Verus functionality.

evidence, assumptions and limits: the paper reports that augmentation reduces degenerate chains that jump directly to `No goals` and supplies richer training signals (Section 4.3, p. 19). It does not report a separate ablation number for elaboration-tree extraction alone; its effect is mixed into CoSProver results. Inference: expected-type extraction is useful only if the inserted facts and their ordering yield realizable transitions. The text on p. 17 calls the inner even-number application's expected type `∃ k, x = 2 * k`, but the enhanced state on p. 18 has `∃ k, x + 2 = 2 * k`. The study follows the enhanced state.

## technique: generate tactics for adjacent states

what it is: solve `(S_p, S_n)` rather than asking for a complete proof from `S_0`. If the next state only adds a hypothesis, the task becomes proving that hypothesis. For general state changes, the paper transforms the obligation into a higher-order implication `h_p → (h_n → τ_n) → τ_p` and gives a `have`/`apply`/`assumption` proof shape (Section 5.1, pp. 19–21).

when to use it: use local generation when a full proof is too difficult for a model or when a candidate CoS gives a reliable semantic plan but leaves individual transitions unresolved.

how it is done: (1) provide the previous and target states; (2) first try deterministic tactics; (3) if they fail, ask DeepSeek-R1 for tactics conditioned on both states; (4) execute the tactics in Leanjixia; (5) compare the resulting state with the target; (6) retain the tactic list only when the transition or complete proof succeeds (Algorithm 1, p. 20). The deterministic prover tries `nlinarith`, `linarith`, `aesop`, `omega`, `field_simp`, `ring`, `simp` and `norm_num`, then uses interactive `apply?` for library search (Section 5.1, p. 21).

Verus form: Inference: define each local obligation as a Verus assertion, loop invariant, or lemma postcondition, then ask the model to fill only the proof code needed to move from the current verified facts to that obligation. Re-run Verus after each candidate and compare diagnostics or proof completion. Inference: there is no Lean-style tactic sequence in Verus; the analogous output is Rust/Verus proof code using supported `assert`, `proof fn`, `requires`, `ensures`, `reveal`, and loop `invariant` constructs; their applicability here has not been tested. A state comparator must normalize verifier output rather than compare Lean goal text.

evidence, assumptions and limits: CoSProver evaluates MiniF2F-test on 227 problems and MiniF2F-valid on 229 problems (Section 6.1.2, p. 23). Its full setting reaches 69.2% on MiniF2F-test and 70.3% on MiniF2F-valid with a `20 × 15 × 32` budget (Table 5, p. 26). Inference: the CoSProver percentages correspond to approximately 157/227 and 161/229. Exact solved counts are not printed; Table 5 does not establish that every cited baseline used these reduced splits. The authors claim “a 2-3 orders of magnitude reduction in computation” (Section 6.3, p. 26). Inference: Table 5 compares heterogeneous methods and budgets; the full maximum budget is 20 × 15 × 32 = 9,600 calls, so its maximum does not support the prose's “only a few hundred calls”. Actual average call counts are not reported. Table 7 compares direct generation at 32–192 calls with the local-subproblem attempt scale, not a matched total CoSProver budget (Section 6.4, pp. 27–28).

## technique: error tactic regeneration

what it is: feed syntax or semantic failure information back into the tactic-generation prompt. The paper distinguishes syntax errors, which violate Lean syntax, from semantic errors where the generated state differs from the expected target (Section 5.2, p. 22).

when to use it: use it after a generated tactic does not parse or produces the wrong state, before abandoning the candidate CoS.

how it is done: (1) execute the generated tactic; (2) collect Leanjixia's error; (3) classify it as syntax or state mismatch; (4) append the error to the DeepSeek-R1 prompt; (5) regenerate tactics; (6) re-execute and compare the state (Section 5.2, p. 22; Algorithm 1, p. 20). In the paper's case study, replacing an unknown `mem_insert` identifier with `Finset.mem_insert` and related lemmas yields a complete proof after error feedback (Section 6.6.3, pp. 32–33).

Verus form:

evidence, assumptions and limits: Table 6 isolates the effect on MiniF2F-test: DeepSeek-R1 with 32 calls reaches 37.00%, and adding ETR reaches 49.78% under the same nominal budget (Table 6, p. 27). Inference: the comparison supports a repair effect on this benchmark; its state representation and tactic outputs are Lean-specific.

## technique: error state renewal

what it is: when a model skips ahead to a later state and cannot reach the requested intermediate target, replace the target state with `No Goals` and ask for a direct proof from the current state (Section 5.2, p. 22).

when to use it: use it after ETR when the generated tactics produce a later chain state, especially in induction or case-analysis problems (Section 5.2, p. 22).

how it is done: (1) execute and regenerate tactics with error information; (2) if the target still does not match, set the target to `No Goals`; (3) request a direct completion from the current state; (4) verify the resulting proof in Lean (Section 5.2, p. 22). In the induction example, the first CoS captured only a base case; renewal allows a direct induction proof with `induction'`, simplification and `nlinarith` (Section 6.6.2, pp. 31–32).

Verus form:

evidence, assumptions and limits: Table 6 reports 58.59% for DeepSeek-R1 with 10 CoS plus ETR and ESR under `10 × 15 × 30`, versus 49.78% for ETR alone and 69.16% for the full `20 × 15 × 32` system (Table 6, p. 27). These are MiniF2F-test percentages over the 227-problem split. Inference: direct fallback can prove the theorem while bypassing the proposed intermediate chain, so success does not demonstrate fidelity to every generated state.

## technique: sample multiple CoS candidates

what it is: generate several semantically aligned state chains and try them independently because state granularity is underdetermined (Section 4.1, p. 15).

when to use it: use multiple candidates when one chain may be too coarse, too fine-grained, or contain a tactically difficult intermediate state.

how it is done: (1) generate `nCoS` chains; (2) validate each chain's syntax and semantic alignment; (3) run local tactic generation for each adjacent pair; (4) stop when a complete proof is verified (Algorithm 1, p. 20). Section 6.1.2 describes 20 independent CoS samples, 10 tactic-generation attempts per adjacent pair, and up to three additional calls per round for error recovery (Section 6.1.2, p. 23). Section 6.3 is more specific: 19 chains have intermediate states, while the 20th omits them and receives 16 initial direct-proof attempts with regeneration (p. 25). Algorithm 1 separately appends an original initial-to-proved chain. These descriptions do not give one unambiguous candidate count.

Verus form: Inference: sample alternative sequences of Verus proof obligations or lemma decompositions, then compile and verify each candidate against the same executable code and unchanged contracts. Inference: candidate diversity is a search strategy, not evidence that any unverified intermediate claim is true; Verus must check the final artifact.

evidence, assumptions and limits: CoS generation on MiniF2F-test improves from one to five candidates: GPT-4o is 46.31% to 95.90%, DeepSeek-R1 16.80% to 67.62%, and CoSLLM 58.60% to 95.49% (Table 2, p. 24). The matched 50-problem expert audit gives GPT-4o 17/50 (34.0%) for one CoS and 34/50 (68.0%) for five, while CoSLLM gives 20/50 (40.0%) and 33/50 (66.0%) (Table 3, p. 24). The expert denominator is 50, not the full 227-problem test set.

## what is proved, measured and trusted

The paper requires a concrete final script accepted by Lean; Leanjixia executes candidate tactics and compares their successor states (Section 2.3, p. 6; Algorithm 1, p. 20). The experiments measure semantic state alignment, tactic success, ablations, failure categories and proof rates on MiniF2F. The paper's failure analysis covers 70 unsuccessful MiniF2F-test cases: 47 (67.1%) are Lean-specific proving difficulty, 10 (14.3%) invalid or hallucinated states, 9 (12.9%) syntax or state-rendering errors, and 4 (5.7%) large state gaps or budget exhaustion (Table 9, p. 29). The 47 Lean-specific cases contain 27 type/coercion or number-theory cases (57.4% of that category), 15 log/trig/sqrt cases (31.9%), 3 library retrieval cases (6.4%) and 2 nonlinear/positivity cases (4.3%) (Table 10, p. 29). The ratios have the stated denominators: Table 9 uses 70 failures; Table 10 uses 47 Lean-specific failures.

Inference: proof soundness depends on Lean's checking environment and the actual accepted artifact. Leanjixia controls extraction, execution and reported success. GPT-4o semantic labels, expert judgments, rewrites and fine-tuning data affect alignment and evaluation quality; their correctness is not needed to establish a faithfully replayed Lean proof of the supplied statement. Human corrections are part of the data pipeline. Inference: the method verifies a supplied theorem; acceptance alone does not establish that its statement captures the user's intent; the authors explicitly say that informal proofs can omit intermediate results and side conditions (Section 3.1, p. 7). The paper also says, “A proof is counted as successful only when all placeholders are replaced by concrete Lean code and the resulting script is accepted by Lean with no remaining goals.” (Section 2.3, p. 6)

## techniques for the catalog

- Lean-friendly proof rewriting — expose omitted cases, types, conditions and Lean-suitable calculations before generation
- chain-of-states representation — decompose an informal proof into explicit formal states and adjacent transitions
- elaboration-tree extraction — recover hidden proof states from Lean tactic and term elaboration
- composite-term enhancement — insert expected-type hypotheses as semantic checkpoints
- adjacent-state tactic generation — solve local state transitions with deterministic tactics and an LLM
- error tactic regeneration — feed syntax and semantic failures back into tactic generation
- error state renewal — fall back to direct completion when a model skips a target state
- multi-CoS search — sample and verify multiple alternative state decompositions
