# A Case Study on the Effectiveness of LLMs in Verification with Proof Assistants
(authored by agents unless marked 🧑)
Tag: `bayazit2025effectiveness`, [paper](http://arxiv.org/abs/2508.18587v1)
## study question and setup

This paper measures LLM proof generation in two mature Rocq projects: hs-to-coq’s Haskell base-library theory and Verdi’s distributed-systems proofs. Its abstract states four findings: “external dependencies and context in the same source file can significantly help proof generation”; models do better on small proofs; models differ across projects; and they can produce concise proofs as well as odd failures (abstract, PDF page 1).

The corpus has 187 hs-to-coq theorems and 579 Verdi theorems (section 3, PDF page 3). The authors summarize one result as: “LLMs perform significantly better on proofs of smaller sizes.” (section 1, PDF page 2). Five models are tested: GPT-4o-mini, GPT-4o, o4-mini, DeepSeek Prover V2, and DeepSeek R1-0528. Each theorem is prompted in four conditions: full informed context, no dependencies, no in-file context, and neither (section 4, PDF page 4). A proof counts only when the matching Rocq/SerAPI version accepts the generated proof body with the theorem signature and preceding file context (section 4, PDF page 4).

## technique 1: provide dependencies and local source context

Use this when an LLM must generate a proof in a real library with imported definitions, notations, and nearby lemmas. The authors extract each theorem’s signature, all prior lines in the same file, external definitions/theorems used by the original proof, and notation declarations. They then vary which material is supplied while keeping model, theorem, and validation fixed (section 4, PDF pages 4–5).

The method is: extract constructs with SerAPI; identify dependency signatures; collect imported notations; construct four prompts; ask for proof body only; run SerAPI’s `sertop` with the true project version; record accepted proofs, tactic count, and whether the proof is identical to the original. Informed mode is usually best. Table 1 gives denominators explicitly: for hs-to-coq, GPT-4o succeeds on 92/187 (49.2%) informed versus 48/187 (25.7%) with neither; for Verdi, it succeeds on 177/579 (30.6%) versus 38/579 (6.6%) (Table 1, PDF page 6). Inference: the context effect is a measured association, not proof that every dependency should be included.

Verus form (inference): supply the agent with the current Rust module, imported contracts, nearby lemmas, and exact Verus signatures. Preserve the project’s version and compile the generated proof with Verus. Context should include `requires`, `ensures`, `invariant`, and ghost-state definitions, while avoiding unneeded modules that burden solver search.

The token tradeoff is substantial. Mean informed prompts are 3,379 tokens for hs-to-coq and 6,944 for Verdi; “neither” means are 152 and 174 tokens respectively (Table 2, PDF page 6). The paper does not establish an optimal context-selection policy.

## technique 2: exploit induction, reflection, and existing lemmas

Use this when the theorem’s definitions expose standard structural proof patterns. Figure 1 proves `forall n:nat, n + 0 = n` by induction: invoke `induction n`, solve the base case with `reflexivity`, simplify the successor expression, rewrite with the induction hypothesis, and close with `reflexivity` (section 2, PDF pages 2–3). The example shows how context and goals change after each tactic.

LLMs also discovered shorter classical proofs. For a monoid-law theorem, the original proof splits four goals and unfolds many definitions, while o4-mini and DeepSeek R1-0528 generate `constructor; intros []; auto.` (Figure 5, PDF page 7). In Verdi, o4-mini proves a 24-line theorem with four tactics by applying an immediately preceding contrapositive lemma (Figure 6, PDF page 8). Another proof performs case analysis on an inductive `reflect` proposition, a form of proof by reflection, instead of splitting equality cases manually (section 5, PDF pages 7–9).

Verus form (inference): encode recursive Rust properties as `spec fn`s, use loop `invariant`s or recursive lemmas for induction, and expose algebraic helper lemmas to the solver. Reflection-style proofs become lemmas connecting executable predicates to mathematical equality. The Rocq tactics themselves do not carry over; the proof shape does.

Evidence is qualitative for these examples. The authors note that CoqHammer can solve the first two examples as well, so an LLM’s one-shot discovery is useful but not necessarily novel (section 5, PDF page 8). They also report that some generated proofs repeat a tactic indefinitely or make apparently odd mistakes (abstract, PDF page 1).

## technique 3: stratify by proof size and test memorization

Use this when evaluating whether proof generation scales beyond toy goals. Group theorems by original tactic count, report success per interval, and compare generated scripts to original scripts. Across both projects, all models except GPT-4o-mini have high success on small proofs, with success dropping as tactic count grows, although some proofs over 20 tactics still succeed (section 5, PDF page 6). Compare exact script identity to detect possible memorization: identical proofs occur in both projects, mostly small hs-to-coq proofs, but some larger Verdi proofs are also identical (section 5, PDF page 6). The paper reports, “The results show that LLMs indeed generate identical proofs in both projects.” (section 5, PDF page 6).

Verus form (inference): maintain benchmarks partitioned by proof-obligation size and compare generated proof text plus semantic acceptance. A short proof is valuable only if it verifies against the unchanged specification; do not reward deleting or weakening obligations.

## what is proved and threat to VL

Rocq’s kernel or SerAPI accepts the proof term, which is strong evidence for the stated theorem. The experiments do not prove the translated Haskell semantics, the distributed-system specification, or that generated proofs are maintainable after library changes. Project versions are old: hs-to-coq uses Rocq 8.10 and Verdi 8.11 (section 3, PDF page 4). Inference: for VeruLaw, the direct lesson is to provide dependency-aware context and benchmark proof generation by obligation size, while preserving exact contracts and checking with the current Verus toolchain. The threat from agent-written verified Rust is greatest when an agent sees too little local specification or when short proofs are mistaken for broad correctness.

## techniques for the catalog

- dependency-aware prompting: include imported contracts, notations, and theorem signatures used by the target proof
- in-file context prompting: provide preceding definitions and lemmas, then measure token cost against success
- structural proof patterns: use induction, simplification, rewriting, constructors, and existing contrapositives
- reflection-based reasoning: case-analyze inductive propositions that connect executable predicates to equality
- proof-size stratification: report success by tactic-count interval and test whether exact scripts are memorized
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
