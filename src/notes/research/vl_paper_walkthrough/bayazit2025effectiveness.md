# A Case Study on the Effectiveness of LLMs in Verification with Proof Assistants
(authored by agents unless marked 🧑)
Tag: `bayazit2025effectiveness`, [paper](https://doi.org/10.1145/3759425.3763391)
## study question and setup

This paper measures LLM proof generation in two mature Rocq projects: hs-to-coq’s Haskell base-library theory and Verdi’s distributed-systems proofs. Its abstract states four findings: “external dependencies and context in the same source file can significantly help proof generation”; models do better on small proofs; models differ across projects; and they can produce concise proofs as well as odd failures (abstract, PDF page 1).

The corpus has 187 hs-to-coq theorems and 579 Verdi theorems (section 3, PDF page 3). The authors summarize one result as: “LLMs perform significantly better on proofs of smaller sizes.” (section 1, PDF page 2). Five models are tested: GPT-4o-mini, GPT-4o, o4-mini, DeepSeek Prover V2, and DeepSeek R1-0528. Each theorem is prompted in four conditions: full informed context, no dependencies and notations, no in-file context, and neither (section 4, PDF page 5). A proof counts only when the matching Rocq/SerAPI version accepts the generated proof body with the theorem signature and preceding file context (section 4, PDF pages 5–6).

## technique 1: provide dependencies and local source context

Inference: use this when an LLM must generate a proof in a real library with imported definitions, notations, and nearby lemmas. The authors extract each theorem’s signature, all prior lines in the same file, external definitions/theorems used by the original proof, and notation declarations. Dependencies already in the in-file context are excluded from the dependency list. Ambiguous identifiers can cause unnecessary dependencies to be included. Omitting dependencies also removes notations. Omitting in-file context retains imports and extends dependencies with in-file dependent signatures (section 4, PDF page 5).

The method is: extract constructs with SerAPI; identify dependency signatures; collect imported notations; construct four prompts; ask for proof body only; run SerAPI’s `sertop` with the true project version; compare success rates by original tactic count and check whether generated proofs are identical to the originals (sections 4–5, PDF pages 5–6). Most models achieve their highest success rate in informed mode; Table 1 also contains exceptions. Table 1 gives denominators explicitly: for hs-to-coq, GPT-4o succeeds on 92/187 (49.2%) informed versus 48/187 (25.7%) with neither; for Verdi, it succeeds on 177/579 (30.6%) versus 38/579 (6.6%) (Table 1, PDF page 7). Inference: the context effect is a measured association, not proof that every dependency should be included.

Inference: Verus form: supply the agent with the current Rust module, imported contracts, nearby lemmas, and exact Verus signatures. Preserve the project’s version and compile the generated proof with Verus. Include relevant `requires`, `ensures`, `invariant`, and ghost-state definitions. This adaptation is not evaluated in the paper.

The token tradeoff is substantial. Mean informed prompts are 3,379 tokens for hs-to-coq and 6,944 for Verdi; “neither” means are 152 and 174 tokens respectively (Table 2, PDF page 7). Inference: these results do not establish an optimal context-selection policy. The reported token estimates exclude the system prompt.

## technique 2: exploit induction, reflection, and existing lemmas

Inference: use this when the theorem’s definitions expose standard structural proof patterns. Figure 1 proves `forall n:nat, n + 0 = n` by induction: invoke `induction n`, solve the base case with `reflexivity`, simplify the successor expression, rewrite with the induction hypothesis, and close with `reflexivity` (section 2, PDF pages 2–3). The example shows how context and goals change after each tactic.

LLMs also discovered shorter classical proofs. For a monoid-law theorem, the original proof splits four goals and unfolds many definitions, while o4-mini and DeepSeek R1-0528 generate `constructor; intros []; auto.` (Figure 5, PDF page 7). In Verdi, o4-mini replaces an original 24-line proof with four basic tactics by applying an immediately preceding contrapositive lemma (Figure 6, PDF page 8). DeepSeek R1-0528 proves `EqExact_pair` with in-file context but no external dependencies by case analysis on `Eq_eq`, whose type uses the inductive proposition `reflect`. This replaces the original proof’s case analyses on Boolean equality tests and conversions between Boolean and propositional equality (Figure 7, PDF pages 8–9).

Inference: Verus form: encode recursive Rust properties as `spec fn`s, use loop `invariant`s or recursive lemmas for induction, and expose algebraic helper lemmas to the solver. Reflection-style proofs become lemmas connecting executable predicates to mathematical equality. The Rocq tactics themselves do not carry over; the proof shape does.

The authors note that CoqHammer can solve the first two examples, but not the `EqExact_pair` example (section 5, PDF page 8). Inference: these qualitative examples show that concise generated proofs can reuse established proof techniques. A failure example begins with an unsuccessful `unfold` and later repeats the same `rewrite` tactic, “seemingly indefinitely.” The authors suggest low temperature as a possible factor but do not test that hypothesis (Figure 8 and discussion, PDF page 9).

## technique 3: stratify by proof size and test memorization

Inference: use this when evaluating whether proof generation scales beyond toy goals. Group theorems by original tactic count, report success per interval, and compare generated scripts to original scripts. Across both projects, all models except GPT-4o-mini have high success on small proofs, with success dropping as tactic count grows, although some proofs over 20 tactics still succeed (section 5, PDF page 6). Compare exact script identity to detect possible memorization: identical proofs occur in both projects; all identical hs-to-coq proofs are small, while some larger Verdi proofs are also identical (section 5, PDF page 6). The paper reports, “The results show that LLMs indeed generate identical proofs in both projects.” (section 5, PDF page 6). The authors note that small hs-to-coq proofs can match by coincidence; larger identical Verdi proofs suggest possible memorization rather than establish it.

Inference: Verus form: maintain benchmarks partitioned by proof-obligation size and compare generated proof text plus semantic acceptance. A short proof is valuable only if it verifies against the unchanged specification; do not reward deleting or weakening obligations.

## what is proved and threat to VL

Success means SerAPI’s `sertop` accepts the generated proof in the original context (section 4, PDF pages 5–6). Inference: this supports the stated Rocq theorem, not independent correctness of the Haskell translation or the adequacy of a distributed-system specification. The experiment uses single-pass generation without feedback, indexes only files in the same project, and does not verify assumed model knowledge of external libraries. Its two-project scope limits generalization. Exact Rocq versions are 8.10.2 for hs-to-coq and 8.11.0 for Verdi (section 4, PDF page 5; limitations, PDF pages 9–10). Inference: for VeruLaw, the direct lesson is to provide dependency-aware context and benchmark proof generation by obligation size, while preserving exact contracts and checking with the current Verus toolchain. Inference: insufficient local specification and mistaking short proofs for broader correctness are risks to examine in agent-written verified Rust; the paper does not measure or rank these risks.

## techniques for the catalog

Inference: the following catalog entries adapt the paper’s techniques to proof-generation workflows.

- dependency-aware prompting: include imported contracts, notations, and theorem signatures used by the target proof
- in-file context prompting: provide preceding definitions and lemmas, then measure token cost against success
- structural proof patterns: use induction, simplification, rewriting, constructors, and existing contrapositives
- reflection-based reasoning: case-analyze inductive propositions that connect executable predicates to equality
- proof-size stratification: report success by tactic-count interval and compare exact script identity as evidence of possible memorization
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "A low temperature (0.1) is a possible factor, but we did not run further experiments to test this hypothesis."): checked all study quotations, numbers, section and PDF page references, and technique descriptions; corrected methodology and table pages, context-ablation details, proof descriptions, memorization caveats, and inference labels, and replaced the link with the paper’s DOI; did not rerun experiments, inspect the artifact, or verify the proposed Verus adaptations.
