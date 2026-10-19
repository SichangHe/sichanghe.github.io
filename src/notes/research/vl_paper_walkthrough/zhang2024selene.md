# Selene: Pioneering Automated Proof in Software Verification
(authored by agents unless marked 🧑)
Tag: `zhang2024selene`, [paper](https://arxiv.org/abs/2401.07663)

## benchmark and isolation technique
Selene turns seL4 Isabelle lemmas into a project-level proof-generation benchmark. Its central engineering technique is lemma isolation: build a target session containing one lemma and a dependency session containing its prerequisites, then verify dependencies once and reuse their persistent results. The paper states: “The isolation process yields a minimal target session AInvs_TGT, which exclusively contains only the target lemma strengthen_Not.” (Section 3.2, PDF p.5).

Apply it as follows:

1. Gather seL4 refinement-session theory files and identify lemmas with a rough parser. The paper describes declarations beginning with `lemma` or `throrem` and proofs ending with `qed`, `done`, or a `by` statement; `throrem` is the paper's spelling (Section 3.3, PDF p.5).
2. Exclude lemmas inside contexts/locales and proofs longer than 20 lines. Classify procedural proofs as P1 (one line), P2 (2–6), or P3 (7–20), sample each category, and sample all 45 extracted declarative lemmas (Section 3.3, PDF p.5).
3. Make a dependency theory containing the contents preceding the target lemma in its original theory. Include that theory's prerequisite theories. Copy the original session metadata, replace the target theory with the dependency theory, and set the ROOT entry to the dependency theory (Sections 3.2–3.3, PDF p.5; Appendix B, PDF p.12).
4. Put the target lemma in a separate target session dependent on the dependency session. Verify the dependency sessions once and retain their results. Check isolation correctness and exclude failures before evaluation. For each generation, append the generated proof to the target specification and verify the target session (Sections 3.2–4.1, PDF pp.5–6).

The construction extracts 5,464 lemmas across 11 sessions: 5,419 procedural and 45 declarative. Table 1 gives extracted counts 1,995/2,496/928/45 for P1/P2/P3/D, sampled counts 160/120/80/45, and correctly verified counts 144/109/64/43. The latter total 360. Five demonstrations per category leave evaluation counts 139/104/59/38, totaling 340 (Table 1, PDF p.5; Section 4.2, PDF p.6).

Appendix C compares initial correctness checking with verification of isolated targets. For P1, the average times are 148.9 seconds for correctness checking, 40.2 for GPT-3.5-turbo evaluation, and 35.6 for GPT-4 evaluation. Table 7 includes ten-minute timeouts in evaluation averages (PDF p.12).

Inference: A Verus experiment could similarly separate target proofs from prerequisite helpers, but Selene does not establish how to cache or reuse verification results in Verus.

## end-to-end generation and verification
The pipeline concatenates an instruction, five fixed demonstrations, and a target specification. Each demonstration pairs a specification with its ground-truth proof. The paper describes the goal as: “The subject LLM’s goal is to write proofs for the given specifications from seL4 and pass the verification.” (Section 3, PDF p.3). The model emits a complete Isabelle proof, which is appended to the isolated target specification and checked by Isabelle (Sections 4.1–4.2, PDF p.6).

ACC#k is one for a lemma if at least one of k independently generated proofs verifies, and zero otherwise. The reported category accuracy averages these outcomes. Both models use top-p 0.95; temperature is 0 for ACC#1 and 0.5 for ACC#5. Trials exceeding 2,048 tokens, containing `sorry` or `oops`, or taking over ten minutes to verify count as failures (Sections 4.1–4.2, PDF p.6).

GPT-4 reaches ACC#1/ACC#5 of 41.7%/51.8% on P1, 7.7%/12.5% on P2, 0%/1.7% on P3, and 10.5%/15.8% on D (Table 2, PDF p.6). The paper explains: “The majority of the errors (over a half) committed by GPT-4 can be attributed to its inadequate reasoning capability, which leads to unfinished proof goals (logic errors).” (Section 4.3, PDF p.7). Table 3 reports logic errors in 41/81 P1 failures (51%), 55/96 P2 (57%), 31/59 P3 (52%), and 20/34 D (59%). Undefined errors number 38, 37, 21, and 12, respectively, under ACC#1 (PDF p.7).

Inference: A Verus benchmark could use the same at-least-one-success metric and explicitly reject verification bypasses. Independent sampling and diagnostic repair should be measured separately because repair conditions later attempts on earlier failures.

## similar-lemma augmentation
Segment seL4 theory files into chunks using blank lines, build a BM25 retrieval library, and query it with the target specification. Omit the target's ground-truth proof from retrieval and provide the first ten lines of the closest chunk (Section 5.1, PDF p.7). Appendix D also augments demonstration inputs with similar chunks, enclosed in `<sim>` tags, while leaving demonstration proofs unchanged (PDF p.12).

GPT-4 ACC#1 changes from 41.7% to 47.5% on P1, 7.7% to 14.4% on P2, 0% to 1.7% on P3, and remains 10.5% on D (Table 4, PDF p.8).

## dependency-fact augmentation
Extract facts applied by the ground-truth proof and locate their definitions, functions, or lemmas in the chunk library. Omit chunks outside the dependency sessions. Provide the first five lines from the origin of each identified fact (Section 5.1, PDF pp.7–8). Appendix D encloses dependency chunks in `<dep>` tags (PDF p.12).

GPT-4 ACC#1 rises from 41.7% to 52.5% on P1, from 7.7% to 14.4% on P2, and from 0% to 1.7% on P3. The authors skip D because fact extraction is complex there. P1 undefined errors fall from 38/81 failures (47%) to 16/66 (24%) (Tables 4–5, PDF p.8). The authors caution that origins cannot always be located precisely and describe the result as “a potential upper limit of the subject LLM’s capability in this context.” (Section 5.1, PDF p.8). The 41.5% baseline in Section 5.2's prose disagrees with Table 4's 41.7%; the figures here follow the table.

## fixing augmentation and ablation
If the first proof fails, provide the error message and ask the model to try again in a second dialogue round. Skip the second round after an initial success. Error messages can include the error type and proof state at failure (Section 5.1, PDF p.8). This is complete-proof repair; interactive proof-state access during construction remains future work (Section 7, PDF p.9).

For fixing demonstrations, invoke the model on each of the five demonstration lemmas using the other four as examples. On failure, the resulting demonstration pairs the specification with the erroneous proof, then pairs the error message with the ground-truth proof. If generation succeeds, use only the specification and ground-truth proof (Appendix D, PDF pp.12–13).

GPT-4's fixing results are 53.2% P1, 9.6% P2, 0% P3, and 18.4% D. Asking it to try again without the error message gives 49.6% P1, 7.7% P2, 0% P3, and 10.5% D. Combining similar and fixing gives 61.9% P1, 20.2% P2, 1.7% P3, and 7.9% D (Tables 4 and 6, PDF p.8). Although the ablation paragraph is labeled “Similar + dependency”, its text and Table 6 describe similar plus fixing.

## techniques for the catalog
- lemma isolation — separate a target session from prerequisite sessions whose verification results persist
- project-level proof benchmark — sample real-system lemmas by proof style and check generated proofs with Isabelle
- similar-lemma retrieval — use BM25 chunks while withholding the target's ground-truth proof
- dependency-fact augmentation — provide source excerpts for facts selected from a known proof
- diagnostic fixing — feed prover errors into a second complete-proof generation round
