# Selene: Pioneering Automated Proof in Software Verification
(authored by agents unless marked 🧑)
Tag: `zhang2024selene`, [paper](https://doi.org/10.18653/v1/2024.acl-long.98)
## benchmark and isolation technique
Selene turns seL4 Isabelle lemmas into a project-level proof-generation benchmark. Its central engineering technique is lemma isolation: build a target session containing one lemma and a dependency session containing the prerequisite theory, then verify dependencies once and reuse their persistent results. The paper states: “The isolation process yields a minimal target session AInvs_TGT, which exclusively contains only the target lemma strengthen_Not.” (Section 3.2, p.4).

Apply it as follows:

1. Gather seL4 refinement-session theory files and identify lemmas with a rough parser: declarations begin with `lemma` or `throrem` and end with `qed`, `done`, or a `by` statement (Section 3.3, p.5).
2. Exclude lemmas inside contexts/locales and proofs longer than 20 lines; classify procedural proofs as P1 (one line), P2 (2–6), or P3 (7–20), and include all 45 declarative lemmas (Section 3.3, p.5).
3. For a target theory, copy the original session metadata, replace its theory file with a dependency copy, and set the dependency ROOT entry to that copy (Section 3.2, p.4; Appendix B, p.22).
4. Put only the target declaration in the target theory and point it at the dependency session. Build dependency sessions once, check extracted targets for correctness, and then append each generated proof to the target specification (Sections 3.2–4.1, pp.4–6).

The construction starts with 5,464 lemmas across 11 sessions; 5,419 are procedural and 45 declarative. Table 1 lists extracted counts 1,995/2,496/928/45 by category, sampled counts 160/120/80/45, and correctly verified counts 144/109/64/43 (Table 1, p.5). The evaluation counts are 139/104/59/38, totaling 340, while the introduction says 360 lemmas were randomly extracted for benchmarking. The table and prose therefore disagree; the paper gives no reconciliation.

Inference: A Verus version would create a minimal crate or module containing one target proof and import compiled helper modules. Verus does not use Isabelle sessions, but separate crates and cached verification artifacts can provide the same isolation. The target’s specification and all imported helper proofs remain trusted inputs to the experiment.

## end-to-end generation and verification
The pipeline concatenates an instruction, five fixed demonstrations, and a target specification; the paper describes the goal as “The subject LLM’s goal is to write proofs for the given specifications from seL4 and pass the verification.” (Section 3, p.4) the model emits a complete Isabelle proof, which is appended to the isolated target theory and checked by Isabelle (Sections 4.1–4.2, pp.6–7). ACC#k is one if at least one of k independently sampled proofs verifies. Trials exceeding 2,048 tokens, containing `sorry` or `oops`, or taking over ten minutes to verify are failures (Section 4.2, p.7).

The paper reports GPT-3.5-turbo and GPT-4 ACC#1/ACC#5 by category. GPT-4 reaches 41.7%/51.8% on P1, 7.7%/12.5% on P2, 0%/1.7% on P3, and 10.5%/15.8% on D (Table 2, p.7). These denominators are the evaluation lemmas in each category, not generated-token counts. The paper explains the difficulty: “The majority of the errors (over a half) committed by GPT-4 can be attributed to its inadequate reasoning capability, which leads to unfinished proof goals (logic errors).” (Section 4.3, p.8). In the ACC#1 error table, GPT-4 has logic errors in 41/81 P1 (51%), 55/96 P2 (57%), 31/59 P3 (52%), and 20/34 D (59%); undefined-fact errors are 38/81, 37/96, 21/59, and 12/34.

Inference: In Verus, ACC#k can mean k independent attempts whose files all pass `verus`; keep proof-state or compiler diagnostics between retries rather than requiring a single whole proof. A Rust agent must avoid `sorry`-like escape hatches such as `external_body` on the function under verification.

## similar-lemma augmentation
Use this when a project contains recurring procedural proof patterns. Segment theory files at blank lines, build a BM25 retrieval index, query with the target specification, and take the first ten lines of the closest chunk while omitting the ground-truth proof (Section 5.1, p.8). GPT-4 ACC#1 changes from 41.7 to 47.5 (P1), 7.7 to 14.4 (P2), 0 to 1.7 (P3), and 10.5 to 10.5 (D) (Table 4, p.9). This helps procedural categories, but the D result is unchanged.

Inference: For VL, retrieve Verus lemmas by normalized signatures and nearby `requires`/`ensures`, but preserve the target’s type and invariant context; textual similarity alone can import irrelevant triggers.

## dependency-fact augmentation
Extract facts applied by the ground-truth proof, locate each definition/function/lemma in the chunk library, and provide the first five source lines to the model (Section 5.1, p.8). On P1, ACC#1 rises from 41.7% to 52.5%; undefined errors fall from 38/81 (47%) to 16/66 (24%) in the corresponding augmented run (Tables 4–5, pp.9–10). The authors call this an upper bound because fact origins cannot always be located precisely and ground-truth facts are supplied.

Inference: A VL system can construct a retrieval index over verified helper lemmas and expose only declarations that type-check in the target crate. This is a product design inference, not a result measured by Selene.

## fixing augmentation and ablation
When a first proof fails, send Isabelle’s error message and proof state in a second dialogue round; if it succeeds initially, no fix round is run (Section 5.1, p.8). GPT-4 P1 ACC#1 becomes 53.2%, P2 9.6%, P3 0%, D 18.4% (Table 4). Merely asking “try again” gives P1 49.6% and does less, showing error messages matter (Table 6, p.10). Combining similar and fixing reaches 61.9% P1 and 20.2% P2 but reduces D to 7.9% (Table 6).

Inference: Verus diagnostics should be passed verbatim into a repair loop, with each attempt reverified. The augmentation cannot prove that the specification is correct, and Selene excludes specification generation.

## limits and VL relevance
Selene’s evaluation is on seL4’s Isabelle environment, not Rust or Verus. The benchmark deliberately omits contexts/locales and proofs over 20 lines; P3 performance is effectively zero. The paper proposes interactive proof-state integration as future work and notes dependency extraction remains difficult. It also states that specification construction is outside the study. Trust includes Isabelle, seL4 theory files, extraction correctness, and the benchmark’s target specifications.

Inference: Selene is a direct template for VL’s evaluation harness and retrieval/repair loops, but its headline percentages should not be treated as Verus success rates. VL should reuse isolated verification, dependency-aware retrieval, and diagnostic repair; it should not redo the same seL4 benchmark.

## techniques for the catalog
- lemma isolation — build a target theory beside a cached dependency theory so each generated proof verifies quickly
- project-level proof benchmark — sample real-system lemmas by proof style and enforce a real prover check
- similar-lemma retrieval — use BM25 chunks while withholding the target’s ground truth
- dependency-fact retrieval — expose source locations of facts used by a known proof
- diagnostic fixing — feed prover errors into a second proof-generation round
Checked 2026-10-13: audit record zhang2024selene; paper-study comparison complete; gate executed; experiments not rerun
