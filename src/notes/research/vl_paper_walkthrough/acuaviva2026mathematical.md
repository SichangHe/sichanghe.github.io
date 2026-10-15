# Mathematical Discovery in the Wild: AI-Guided Proofs in Banach Space Theory
(authored by agents unless marked 🧑)
Tag: `acuaviva2026mathematical`, [paper](http://arxiv.org/abs/2607.17388v1)

## what the paper studies
Acuaviva and Acuaviva report two workflows: human-selected Banach-space problems attacked by a language model, and a machine-selected arXiv pipeline that extracts open-problem signals and attempts proofs or counterexamples. The abstract states: “AI systems generated key ideas and proofs for five new results, which were then verified and refined by humans.” The authors explicitly separate generation from acceptance: “The arguments printed in Part 2 were autonomously produced by the model before human verification, editing, and integration into self-contained mathematical notes.” (Section 1.1, p. 3)

## technique 1: repeated exploratory proof search with post-generation verification
Inference: what it is and when to use it: let a general model repeatedly attempt a serious research problem, preserving partial ideas, then have domain experts reconstruct and check the argument. It is useful when the search space is too open for a fixed benchmark protocol and human experts can verify the local mathematics.

steps from the paper:
1. Select substantial problems manually; the five Part 2 problems were “chosen precisely because they seemed to be substantial, non-routine research problems.” (Section 1.1, p. 3)
2. Run model-driven attempts without supplying the next lemma or proof strategy. The paper says, “the proof search itself was fully model-driven.” (Section 1.1, p. 3)
3. Inference: revisit problems and use partial outputs in later attempts; then identify promising outputs.
4. Human experts verify definitions, hypotheses, cited results, and whether the argument answers the original question. The authors write that they “identify outputs worth checking, verify the mathematics, assess significance, and edit the final exposition.” (Section 1.1, p. 3)
5. Inference: rewrite the surviving proof into a self-contained note, correcting minor mistakes where necessary.

Verus form: Inference: treat model output as a candidate proof plan. Translate definitions and lemmas into Verus `spec fn`, `requires`, `ensures`, `assert`, `lemma`, and loop invariants, then run Verus. A proof is accepted only after the verifier checks every obligation; human review still decides whether the formalized statement matches the intended theorem. Mathematical prose and cited theorems do not become trusted Verus facts automatically.

evidence and limits: the paper gives five human-selected results but does not provide a denominator-based success rate for all attempts. It says human verification enters “after generation” in both components (Section 1.1). Inference: because failed attempts and effort are not fully enumerated, the five results measure selected successes, not model reliability. Trust remains in expert checking and any external theorem used.

## technique 2: source-driven candidate extraction and ranking
Inference: what it is: build a target queue from arXiv metadata and source text, using deterministic lexical signals as triage. Use it when scanning many papers for approachable open questions.

steps:
1. Collect arXiv metadata plus TeX when available; source is preferred because “open questions, theorem environments, definitions, and references can be located more reliably in source form than from PDF text extraction.” (Section 10.3, p. 121)
2. Inference: search source for “Question”, “Problem”, “Conjecture”, “we ask”, and “we do not know”. These are markers for an agent to read, not automatic proof targets; papers may answer a question nearby.
3. Inference: rank candidates using functional-analytic terms, explicit question language, publication/affiliation signals, and references to central work. Ranking is triage, not importance.
4. Assign ranked papers to lanes. In the main run each paper is assigned to one of twenty lanes by a deterministic hash of its arXiv identifier (Section 10.4, p. 122).

Verus form: Inference: use the same extractor to queue Rust/Verus repositories, searching specifications, TODO questions, failing proof obligations, and theorem names. Ranking only schedules work; it cannot establish that a target is open or that a proof is valid.

evidence: the first feasibility pass started with 439 papers, selected 35, and found 166 signals across 28. The main run admitted 1,433 papers. The expanded corpus had 35,297 papers, with text extracted from 34,890 and 42,483 signals across 15,666 papers, but those expanded counts are excluded from the aggregate run results (Section 10.6, p. 124).

## technique 3: agent attempt protocol and outcome taxonomy
Inference: what it is: give agents a standard decision procedure and classify every outcome so “solved” does not hide gaps or literature answers.

steps:
1. Inference: consult run memory before attacking a target; if already covered, record avoidance information and move on.
2. Inference: read the source passage, then choose proof, counterexample, special case, obstruction, or applicable literature theorem. The protocol prioritizes “full proofs and counterexamples, followed by substantial partial results and conditional theorems.” (Section 10.4, p. 122)
3. Inference: search relevant literature before calling a result new; searches are targeted, not exhaustive.
4. Write a packet or attempt note. The protocol says agents must not call a proof complete when it depends on an unproved lemma and must label conditional arguments honestly (Section 10.4, p. 122).
5. Inference: assign one category: full solution, counterexample, partial result, conditional result, explicit or implied literature answer, proof gap, or attempt record. A full solution remains a candidate for review, not a certificate.

Verus form: Inference: map categories to verified, refuted, partial lemma, conditional `requires`, known theorem, unresolved obligation, and failed attempt. Store the exact Verus commit, compiler version, dependencies, and proof log in the packet. A “full solution” label should require a successful Verus run for the formal statement, while a proof-gap packet records the failing obligation.

evidence: Table 1 reports 126 full-solution records (124 unique sources), 102 counterexamples (101), 211 partial results (185), 14 conditional (14), 140 explicit literature answers (137), 116 implied answers (114), 18 proof gaps (17), and 925 attempt records (822), for 1,127 registry records from 945 unique sources. Table 2 reports 31 human-reviewed packets from 29 sources verified and 10 from 10 sources rejected. The denominators are records and unique arXiv sources as labelled by the table; categories are not disjoint mathematical results because one source can contribute multiple records.

## technique 4: persistent run memory and reproducible packets
Inference: what it is: maintain a shared index of targets, outcomes, proof gaps, references, and active assignments to prevent duplicate work and preserve evidence.

Inference: steps: before work, query memory; after work, record status and source; include the source PDF, question, proposed result, proof idea, references, and exact computations or code in a human-readable packet. The paper calls the packet “the persistent record” and says it contains “enough evidence for a human reader to reconstruct the claim.” (Section 10.5, p. 123)

Verus form: Inference: packetization should include source hashes, the exact Rust/Verus files, `verus` output, assumptions, trusted axioms, and a replay command. Run memory should distinguish verified proofs from model claims and stale failures.

## what is proved, trusted, and relevant to VL
Inference: the paper’s five promoted results are mathematical claims verified by authors, while the automated aggregate is bookkeeping plus selected human review. The authors caution: “All reported attempts should be treated as candidates for mathematical inspection rather than as independently certified results.” (Section 10.8, p. 126) Novelty searches are not exhaustive, and the paper says absence from inspected references “should not be taken as evidence that the result is new.” (Section 10.8, p. 126)

Inference: the strongest reusable design for VL is the separation of deterministic candidate setup, model exploration, persistent evidence packets, and an independent verifier. Existing work already supplies outcome taxonomies and run-memory discipline; VL should not collapse these into a single “proved” flag. Threat to a product of agent-written verified Rust: moderate operational risk from duplicate or stale attempts, low soundness risk when every accepted patch passes Verus, and high risk if “full solution” packets bypass machine checking. The paper’s human review counts (31 verified, 10 rejected) show that model-generated classifications can be wrong even after structured recording.

## techniques for the catalog
- exploratory proof search: repeatedly generate proof candidates for expert-selected problems, then verify and rewrite them
- source-signal harvesting: scan TeX for question markers and rank targets before agent work
- outcome taxonomy: classify full, counterexample, partial, conditional, literature, gap, and attempt outcomes
- persistent packets: store source, claim, proof idea, references, code, and review status in shared run memory
Checked 2026-10-15 against paper acuaviva2026mathematical: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
