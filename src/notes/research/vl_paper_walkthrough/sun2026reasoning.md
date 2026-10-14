# On Reasoning-Centric LLM-based Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `sun2026reasoning`, [paper](http://arxiv.org/abs/2604.19558v1)
## scope and result

The paper introduces ReCent-Prover, a Rocq proof agent with two mechanisms: validation with reflection and retrieval with planning (Sections 1, 3–5, pp. 1–14). The authors evaluate on CoqStoq. They report 138/200 theorems proved (69%) with o4-mini, and 114/222 versus CobbleStone's 93/222, a relative gain of (114−93)/93 = 22.58% (Section 6, pp. 15–18). The abstract states: “We argue that proof agents should not merely generate tactics but also reason about proof plans and critically evaluate their own proposals.” (Abstract, p. 1)

Inference: The transferable design is a verifier-in-the-loop search controller: use the proof assistant for hard acceptance, an LLM for strategic critique, and structured records to avoid repeating failed branches. The result is evidence for Rocq, not a Verus benchmark.

## technique: validation with reflection

What it is. The module checks each generated tactic in Rocq and selectively asks an LLM whether a syntactically accepted tactic is misapplied. The paper motivates this because “an LLM may occasionally misapply a tactic in a way that does not immediately trigger an error.” (Section 3, p. 7) Reflection is applied only to tactics that may create several subgoals or lead to unprovable states, including `assert`, `apply`, `induction`, and `destruct`; `intros`, `simpl`, and `rewrite` are excluded (Section 4, p. 8).

When to use it. Use the check at branching or irreversible tactic categories. The authors explicitly select tactics that “may (1) generate multiple subgoals, or (2) lead to unprovable states” (Section 4, p. 8). Their running example performs `intros l1 l2 pos; induction l1; simpl`; this is accepted by Rocq but weakens the induction hypothesis because `pos + data_size a + data_list_size l1'` differs from the corresponding argument in the hypothesis (Section 3, pp. 7–8).

How to apply it, following Algorithm 1 (p. 10). (1) Start `pid ← −1` and `gpre ← ∅`. (2) For each generated tactic `Ti`, execute it and obtain the applied goal, an error, and new goals. (3) If the assistant reports an error, return all earlier tactics and a failure record containing the goal, `Ti`, and the error. (4) If no goals remain, update `pid` and save the next first unproved goal. (5) If `Category(Ti) ∈ ReflCat`, call `Reflection(gapp, gsnew, Ti)`. (6) If reflection says `Misapplied`, resume from the tactics after `pid`, return the retained prefix, and record `(gpre, Tpid+1 … Ti, summary)`; otherwise update `pid` and `gpre`. (7) If all tactics survive, return them with an empty failure record. The failure record stores the subgoal, the complete contiguous tactic sequence, and either a Rocq error or an LLM summary (Section 4, pp. 8–10).

The reflection prompt performs two checks: whether any new goal likely admits a counterexample, and for induction/destruct whether the variable and generalization are appropriate (Section 4, p. 11). The first prompt includes all new goals and their definitions; the second additionally includes the pre-tactic goal so the model can compare states (Section 4, p. 11). The paper's example records: “The induction is performed without appropriate generalization, making the hypothesis too weak to be applied...” (Example 6, p. 8).

Verus form. Inference: represent each generated Verus proof block as a candidate transaction, run `cargo verus` after each tactic-like step, and use a separate LLM review only around branching proof commands or structural changes. Verus proof code can use `assert`, `assume` only when explicitly trusted, `reveal`, `lemma`, `requires`, `ensures`, and loop `invariant` declarations; the paper's Rocq tactic names do not carry over. Inference: rollback must restore the previous Rust proof source or proof state because Verus does not expose Rocq's `SubGoals(0)` API. The non-negotiable acceptance check remains the Verus verifier, while the LLM's critique is a heuristic and must never replace it.

Evidence and limits. In Table 2, the BM25/no-reflection configuration proves 118/200 and BM25+reflection proves 130/200, so the reported gain is (130−118)/118 = 10.17%; planning/no-reflection proves 128/200 and full planning+reflection 138/200, giving (138−128)/128 = 7.81% (Section 6.3, Table 2, pp. 17–18). The same table reports 55/200 for Hammer-only and 138/200 for the full system, so (138−55)/55 = 150.91%. Under MiniMax-M2.5, the full system solves 61/100 versus 52/100 for BM25/no-reflection, a (61−52)/52 = 17.31% gain (Section 6.3, p. 18). Reflection costs tokens: average tokens are 30.0K for BM25, 45.5K for reflection+BM25, 58.5K for planning, and 66.7K for the full system (Table 2, p. 17).

Inference: reflection can reject good but unusual tactics if the LLM misjudges provability, and it cannot establish semantic correctness beyond the supplied goal and definitions. The paper only tests 200 randomly sampled CoqStoq theorems for the main result, so transfer to Verus code, concurrency, and unsafe Rust is unmeasured. The paper itself says that the LLM is queried multiple times and that this overhead makes the full system more expensive (Section 6.3, p. 18).

## technique: retrieval with planning

What it is. Instead of matching a goal to lemmas by surface terms, ReCent-Prover asks an LLM for a step-by-step natural-language plan and retrieves lemmas and proof examples by embedding semantic descriptions of their intended use. The paper's motivation is that “similar subgoals imply similar proof plans and lemma usage—which does not necessarily hold.” (Section 1, p. 2)

How to build the index. Restrict candidates at query time to lemmas imported and usable at the current proof location, preventing data leakage (Section 5.2, p. 13). For each lemma, ask an LLM for a short description that preserves semantic intent and typical usage; embed it with `text-embedding-3-large` and store the lemma, description, and vector (Section 5.2, p. 13). For each existing proof, generate and embed a natural-language plan, storing the proof and plan vector (Section 5.2, pp. 13–14).

How to retrieve. (1) Give the current subgoal and definitions to the LLM. (2) Require a structured list of natural-language proof steps. (3) Embed each plan step and rank lemma-description vectors by similarity, such as cosine similarity. (4) Merge retrieved lemmas, descriptions, and usage into the proof-generation prompt. (5) Embed the entire current plan and retrieve proofs whose stored plans are nearest; include those proof ideas as examples (Section 5.2, pp. 14–15). In the `approx_scale` example, the plan step “Use a multiplication-rearrangement lemma to rewrite the expression” retrieves `mulRCA`, although BM25 ranks it low because its formal statement shares few terms with the goal (Sections 5.1–5.2, pp. 11–14).

Verus form. Inference: index Verus `spec fn`, `lemma`, and `proof fn` descriptions, but filter candidates to modules imported by the current Rust crate and to visibility permitted at the call site. Generate a plan such as a plan such as establish sortedness invariant, apply permutation lemma, close arithmetic then retrieve lemmas by embeddings and present their exact Verus signatures. Use `ensures` and `requires` signatures as the semantic facts; do not treat prose descriptions as proof evidence. Inference: this can guide `assert`, `assert forall`, `calc`, and lemma calls, but a retrieved lemma still needs a verifier-checked invocation and matching trigger/quantifier context.

Evidence and limits. Planning without reflection proves 128/200 versus BM25 without reflection 118/200, a gain of (128−118)/118 = 8.47%; planning with reflection proves 138/200 versus reflection+BM25 130/200, a gain of (138−130)/130 = 6.15% (Section 6.3, Table 2, pp. 17–18). The paper uses eight lemmas and eight proofs per retrieval step, clips prompts to the model token limit, and uses a database built once from CoqStoq (Section 6, p. 15). Inference: embedding quality, stale descriptions, and prompt clipping can hide a needed lemma; no experiment isolates these failure modes in Verus.

## appendix implementation details

Appendix A fixes prompt formats. Proof generation receives the subgoal, definitions, examples, lemmas, and failure history, and generated tactics must be wrapped in parseable `<coq>` tags (Appendix A.1, p. 23). Reflection's provability prompt asks for `PROVABLE`, `UNPROVABLE`, or `UNCERTAIN` and explicitly says to be conservative when confidence is lacking (Appendix A.2, pp. 24–26). The induction prompt checks over-binding, the variable in the top-level match, and generalization; its examples recommend `induction n; intros m` rather than introducing all variables first (Appendix A.3, pp. 26–30).

Appendix B gives the complete `ReflCat`: “Introducing auxiliary subgoals: assert, have, pose”; “Applying lemmas: apply, eapply”; “Choosing a proof branch: left, right”; and “Induction-related tactics: induction, destruct, case, elim.” (Appendix B, p. 32) Inference: a Verus implementation should maintain an explicit category list and version it with the verifier, because treating every command as reflective would increase cost while omitting a structural command can miss a bad branch.

## what is proved, measured, and trusted

The proof assistant checks all retained Rocq tactics and complete proofs. The measured claims are theorem counts, relative percentages, token averages, and p-values on the stated CoqStoq samples. Table 3 gives p-values 0.0196 versus CobbleStone, 0.0000 versus Hammer, 0.0002 versus BM25, 0.0075 versus planning, and 0.0481 versus reflection+BM25 (Section 6.3, p. 18). The system still trusts Rocq, its libraries, the embedding model, the LLM prompts, and the manually chosen reflection categories; the LLM is not itself a trusted proof checker.

Inference: threat to an agent-written verified-Rust product is moderate. The approach can reduce repeated failed proof attempts and retrieve domain lemmas, but its only hard guarantee is whatever Verus proves after generation. It does not solve specification mistakes, unsupported Rust features, missing invariants, or unsafe external assumptions.

The paper shows a concrete workflow VL should reuse: maintain per-goal failure records, distinguish syntax acceptance from strategic usefulness, and retrieve by proof intent. VL should not redo a generic claim that LLM self-reflection improves theorem proving; its new work would need Verus-specific measurements, failure taxonomies, and trustworthy handling of specifications and external code.

## techniques for the catalog

- validation with reflection — execute generated proof steps, selectively ask an LLM to detect misapplied branching tactics, roll back, and preserve a structured failure record
- retrieval with planning — generate a natural-language proof plan, embed plan steps and semantic lemma descriptions, and retrieve strategy-aligned lemmas and proof examples
- per-goal failure history — feed the full failed tactic sequence and reason back into the next proof-generation prompt
Checked 2026-10-13: audit record sun2026reasoning; paper-study comparison complete; gate executed; experiments not rerun
