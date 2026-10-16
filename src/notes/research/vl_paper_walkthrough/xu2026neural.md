# Neural Theorem Proving for Verification Conditions: A Real-World Benchmark
(authored by agents unless marked 🧑)

Tag: `xu2026neural`, [paper](http://arxiv.org/abs/2601.18944v2)

## what the paper builds and measures

Xu et al. define Neural Theorem Proving for Verification Conditions (NTP4VC), extract verification conditions (VCs) from industrial Why3 and Frama-C pipelines, translate them into Isabelle, Lean, and Rocq, and evaluate neural theorem provers. Their motivation is that VCs are the direct logical obligations produced by program verification, while existing automated theorem provers (ATPs) often need manual annotations. The paper states that its pipeline uses “∼800 expert-written translation rules for each of the three target languages (so ∼3 × 800 in total)” (sec.1, p.2).

The benchmark contains 600 VCs: 300 “Pearls of Programs” and 300 real C verification cases from Linux, Contiki, STL, X.509, kLIBC, and Paparazzi projects (secs.4, Tables 2–3, pp.5–6). Categories target functions, loops, memory, invalid arguments, algorithms, data structures, calculations, engineering, and competitions. The strongest neural model reaches only 2.08% pass@1 in the abstract; Table 5 reports model-specific pass rates, with DeepSeek-Prover-V2-671B reaching 1.67% Lean pass@1 and 3.00% Lean pass@8. Sledgehammer reaches 18.00% Isabelle pass@1 and CoqHammer 5.67% Rocq pass@1 (Table 5, p.8). Table 6 aggregates neural models at 34/600 (5.67%) and hammers at 114/600 (19.00%) (p.8). Denominators differ by metric: GPT-o4-mini has one attempt per problem, other models have eight; hammers are deterministic (sec.5, p.8).

## technique: extract VCs from an industrial verification pipeline

What it is: reuse Why3's verification-condition generator (VCG) on source programs and specifications already used by industrial verification projects, then export each VC's abstract syntax tree (AST) for translation (sec.3.1, pp.4–5).

When to use it: use this when a project has a mature VCG but lacks a benchmark or training corpus in the target theorem-prover language.

How to do it:

1. Start with Why3 source, or C processed by Frama-C into Why3 (secs.2–3.1, pp.3–4)
2. Run Why3's VCG and a customized printer to dump VC ASTs as XML (sec.3.1, p.4)
3. Process XML ASTs in a Python framework (sec.3.1, p.4)
4. Translate each AST into a target ITP language using expert rules (sec.3.1, p.4)
5. Keep one VC per theory file, with project-specific library dependencies (sec.4, p.7)

Verus form:

Evidence and limits: the authors extract more than 7,500 VCs and select 600 (sec.4, p.5). The source VCs came from formally checked projects, but they caution that bugs in Frama-C, Why3, translation, or processing may make some cases unprovable (sec.4, p.7). The benchmark therefore measures a pipeline, not only model intelligence.

Quote: “The key idea is to reuse existing industrial VCGs to extract VCs from existing verification projects, and translate these VCs into the language of the target ITPs (§ 3.1).” (sec.3, p.4)

## technique: rule-based, semantically preserving multi-language translation

What it is: map Why3 ASTs to Isabelle, Lean, and Rocq with syntax printers and rewrite rules, rather than asking an LLM to translate each VC. The rules cover prefix/infix syntax, `if-then-else`, pattern matching, indexing, and idiomatic integer/natural-number rewrites (sec.3.1, p.4).

When to use it: use deterministic translation when benchmark correctness and cross-language semantic equivalence matter more than translation convenience.

How to do it:

1. Define syntax mappings and ad-hoc pretty-printers for each target ITP (sec.3.1, p.4)
2. Add rewrite rules for target-idiomatic terms (sec.3.1, p.4)
3. Validate target syntax and cross-check rules with independent experts (sec.3.1, p.4)
4. Run the complete translation automatically after the rule base is fixed (sec.3.1, p.4)

Verus form:

Evidence and limits: the paper reports more than 2,400 total human-written mapping and rewriting rules, approximately 800 per target language (sec.3.1, p.4). Rules are checked by syntax checking and author cross-validation, but the paper does not provide a formal proof that every translation is semantics preserving.

Quote: “These expert-written rules form the foundation of the translations’ correctness and quality.” (sec.3.1, p.4)

## technique: make already-proved VCs difficult by erasing annotations

What it is: remove assertion, global lemma, and lemma-application annotations that simplify VCs while preserving their provability for a sufficiently strong prover (sec.3.2, pp.4–5).

When to use it: use this to construct hard proof tasks from existing verified programs, especially when the original ATP succeeded because engineers supplied decomposition hints.

How to do it:

1. Identify `assert` annotations that introduce subgoals, lemma declarations, and explicit lemma applications (sec.3.2, p.4)
2. Erase those annotations using their syntactic patterns (sec.3.2, p.4)
3. Keep the underlying VC and source specification unchanged (sec.3.2, p.4)
4. Check that the resulting VC remains well formed and evaluate ATP/neural provability (sec.3.2, p.5)

Verus form: Inference: this resembles removing agent-supplied helper assertions or proof lemmas from a Verus task, then measuring whether the agent can reconstruct them. It must not remove a required executable contract or change the property being proved.

Evidence and limits: erasure lowers Why3's strongest ATP pass rate from about 99% to about 62% on bundled examples (sec.3.2, p.5). The claim that erasure preserves provability is conditional on a strong enough prover; the benchmark does not prove every generated case is solvable.

Quote: “The exact job of our complication process is erasing the annotations.” (sec.3.2, p.5)

## technique: balance benchmark breadth, difficulty, and operation classes

What it is: select 600 cases from more than 7,500 with equal halves for minimal programs and real C verification, then target 20–25% ATP pass rate in each category (sec.4, pp.5–7).

How to do it:

1. Choose source projects and categories, including functions, loops, memory, and invalid arguments (sec.4, pp.5–6)
2. Run AL3, a hybrid of Z3, CVC4, SPASS, Alt-Ergo, and E-prover; classify a VC as hard when AL3 fails within ten minutes on a 12-core workstation (sec.4, p.7)
3. Select all hard VCs, then add easy but meaningful cases to reach the target pass range (sec.4, p.7)
4. Screen candidates for nontrivial specifications and balanced project/category coverage (sec.4, pp.6–7)
5. Report operation counts, AST size/depth, and quantifier counts (Table 4, p.6)

Verus form:

Evidence: all 600 cases, category counts, and ATP baselines are given in Tables 2, 4, and 5 (pp.5–8). The paper warns that one VC per file can depend on project libraries, so participants must learn unfamiliar definitions (sec.4, p.7).

## technique: verifier-backed proof evaluation and failure taxonomy

What it is: query models zero-shot with the VC plus definitions/lemmas, extract generated proofs, and check them in Lean 4.21.0, Rocq 8.20.1, or Isabelle 2024 with a ten-minute timeout. A proof counts only if the ITP verifies it and it contains no `admit`/`sorry` (sec.5, pp.7–8).

How to do it:

1. Generate one or eight attempts according to the model condition (sec.5, p.8)
2. Extract the proof from model output and insert it into the target ITP context (sec.5, p.8)
3. Run the target prover with fixed hardware and timeout (sec.5, p.8)
4. Report pass@1, pass@4, and pass@8, retaining denominators and language (Table 5, p.8)
5. Inspect failures as syntax errors, semantic/pragmatic confusion, or hallucinated entities (sec.5.2, pp.9–10)

Verus form: Inference: apply the same gate to generated Verus code: preserve specifications, run `verus` on a clean checkout, reject proof holes and unsupported escape hatches, and classify parser, mode, invariant, arithmetic, and missing-lemma failures.

Evidence and limits: more than 24% of generated Isabelle proofs contain syntax errors; more than 64% of Goedel-Prover-V2-32B Lean proofs show repetitive meaningless tactic use; at least 9% of Isabelle attempts fail on undefined entities (sec.5.2, p.9). These are reported fractions over generated attempts in the stated model/language settings, not all 600 cases.

Quote: “A proof attempt is considered successful if it can be verified by the corresponding ITP and does not contain any fake proofs such as admit or sorry.” (sec.5, p.8)

## trust, limits, and product implication

The benchmark trusts Why3/Frama-C VCGs, expert translation rules, target ITP kernels, and source specifications. It measures proof acceptance, not whether each natural-language property is the intended product requirement. Hammers outperform neural models on this benchmark: 114/600 (19.00%) versus 34/600 (5.67%) in Table 6 (p.8). Inference: agent-written Verus Rust remains threatened by long generated obligations, library-context gaps, syntax/mode errors, and specification mismatch; this paper supplies a concrete evaluation design and a warning against importing mathematics-benchmark success rates into systems verification.

## techniques for the catalog

- industrial VC extraction — run existing Why3/Frama-C VCGs and export real project obligations
- expert AST translation — map VCs across proof languages with checked human-written rules
- annotation erasure — remove assert and lemma hints to create harder but intendedly provable VCs
- stratified benchmark design — balance industrial and algorithmic cases while targeting ATP difficulty
- kernel-backed scoring — count only proofs accepted by the target prover without holes
- failure taxonomy — separate syntax, semantic confusion, and hallucinated constants or tactics
