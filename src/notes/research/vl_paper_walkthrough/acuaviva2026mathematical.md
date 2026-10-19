# Mathematical Discovery in the Wild: AI-Guided Proofs in Banach Space Theory
(authored by agents unless marked 🧑)
Tag: `acuaviva2026mathematical`, [paper](http://arxiv.org/abs/2607.17388v1)

## what the paper studies
Antonio Acuaviva and Pablo Acuaviva report two workflows: human-selected Banach-space problems attacked by a language model, and a machine-selected arXiv pipeline that extracts open-problem signals and attempts proofs or counterexamples. The exploratory work used ChatGPT 5.5 Pro; the setup combined direct interaction with that model and Codex agents working over a filesystem (Sections 1.2 and 4.6, pp. 5, 16). The abstract states: “AI systems generated key ideas and proofs for five new results, which were then verified and refined by humans.” The authors explicitly separate generation from acceptance: “The arguments printed in Part 2 were autonomously produced by the model before human verification, editing, and integration into self-contained mathematical notes.” (Section 1.1, p. 3)

## technique 1: repeated exploratory proof search with post-generation verification
Inference: what it is and when to use it: let a general model repeatedly attempt a serious research problem, preserving partial ideas, then have domain experts reconstruct and check the argument. It is useful when the search space is too open for a fixed benchmark protocol and human experts can verify the local mathematics.

steps from the paper:
1. Select substantial problems manually. “They were chosen precisely because they seemed to be substantial, non-routine research problems: difficult enough that a solution would, in our judgement, constitute a meaningful advance in Banach-space theory.” (Section 1.1, p. 3)
2. Run model-driven attempts without supplying the next lemma or proof strategy. The paper says, “the proof search itself was fully model-driven.” (Section 1.1, p. 3)
3. Revisit problems and preserve partial outputs for later attempts. “Problems could be revisited, and partial outputs could inform later attempts, but the mathematical content of the promoted proofs was generated in the model attempts rather than supplied by a mathematician; see Section 2.” (Section 1.2, p. 4)
4. Human experts verify definitions, hypotheses, cited results, and whether the argument answers the original question. The authors write: “The authors formulate or select problems in the human-chosen cases, run the exploratory process, identify outputs worth checking, verify the mathematics, assess significance, and edit the final exposition, fixing some minor mistakes whenever necessary.” (Section 1.1, p. 3)
5. Verify and edit the surviving arguments into self-contained notes. Problems 1–4 needed verification, small modifications, and editing. Problem 5 required more: “It involved reorganising the proof, making the indicated arguments precise, and turning the architecture provided by the model into a complete written argument.” (Section 2.1, p. 11)

Verus form: Inference: treat model output as a candidate proof plan. Translate definitions and lemmas into Verus `spec fn`, `requires`, `ensures`, `assert`, `proof fn`, and loop invariants, then run Verus. A proof is accepted only after the verifier checks every obligation; human review still decides whether the formalized statement matches the intended theorem. Mathematical prose and cited theorems do not become trusted Verus facts automatically.

evidence and limits: the paper gives five human-selected results but does not provide a denominator-based success rate for all attempts. It says human verification enters “after generation” in both components (Section 1.1). Inference: because failed attempts and effort are not fully enumerated, the five results measure selected successes, not model reliability. “Nor are the proofs formally verified. They are ordinary mathematical proofs, checked by human mathematical reading.” (Section 1.3, p. 6)

## technique 2: source-driven candidate extraction and ranking
Inference: what it is: build a target queue from arXiv metadata and source text, using deterministic lexical signals as triage. Use it when scanning many papers for approachable open questions.

steps:
1. Collect arXiv metadata plus TeX when available; source is preferred because “open questions, theorem environments, definitions, and references can be located more reliably in source form than from PDF text extraction.” (Section 10.3, p. 121)
2. Search source for “Question”, “Problem”, “Conjecture”, “we ask”, and “we do not know”. These are markers for an agent to read, not automatic proof targets; papers may answer a question nearby.
3. Rank candidates using functional-analytic terms, explicit question language, publication/affiliation signals, and references to central work. “Ranking was a triage device, not a measure of absolute importance.” (Section 10.3, p. 121)
4. Assign ranked papers to lanes. In the main run each paper is assigned to one of twenty lanes by a deterministic hash of its arXiv identifier (Section 10.4, p. 122).

Verus form: Inference: use the same extractor to queue Rust/Verus repositories, searching specifications, TODO questions, failing proof obligations, and theorem names. Ranking only schedules work; it cannot establish that a target is open or that a proof is valid.

evidence: the first feasibility pass started with 439 papers, selected 35, and found 166 signals across 28. The main run admitted 1,433 papers. The expanded corpus had 35,297 papers, with text extracted from 34,890 and 42,483 signals across 15,666 papers, but those expanded counts are excluded from the aggregate run results (Section 10.6, pp. 123–124).

## technique 3: agent attempt protocol and outcome taxonomy
Inference: what it is: give agents a standard decision procedure and classify every outcome so “solved” does not hide gaps or literature answers.

steps:
1. Consult run memory before attacking a target; if already covered, record avoidance information and move on.
2. Read the source passage, then choose proof, counterexample, special case, obstruction, or applicable literature theorem. “The instructions give priority to full proofs and counterexamples, followed by substantial partial results and conditional theorems.” (Section 10.4, pp. 121–122)
3. Search relevant literature, particularly before classifying an output as a full solution; searches are targeted, not exhaustive (Section 10.4, p. 122).
4. Write a packet or attempt note. The protocol says agents must not call a proof complete when it depends on an unproved lemma and must label conditional arguments honestly (Section 10.4, p. 122).
5. Classify outcomes as full solution, counterexample, partial result, conditional result, explicit or implied literature answer, proof gap, or attempt record. “Full solution. A claimed proof of the extracted question as stated in the source paper. These packets are treated as high priority candidates for human review, not as formally certified proofs.” (Section 10.5, p. 122) Agents may produce an additional packet after extending a partial result (Section 10.4, p. 122).

Verus form: Inference: map categories to verified, refuted, partial lemma, conditional `requires`, known theorem, unresolved obligation, and failed attempt. Store the exact Verus commit, compiler version, dependencies, and proof log in the packet. A “full solution” label should require a successful Verus run for the formal statement, while a proof-gap packet records the failing obligation.

evidence: Table 1 reports 126 full-solution records (124 unique sources), 102 counterexamples (101), 211 partial results (185), 14 conditional (14), 140 explicit literature answers (137), 116 implied answers (114), 18 proof gaps (17), and 925 attempt records (822). It separately reports 709 active solution packets (653 unique sources). The broader registry has 1,127 records from 945 unique sources. Table 2 reports 31 human-reviewed packets from 29 sources verified and 10 from 10 sources rejected. These are separate counts of records and unique sources, not success-rate denominators. Reviewed packets are excluded from the active solution counts. “Attempt records should not be interpreted as disjoint mathematical results.” (Section 10.7, p. 125)

## technique 4: persistent run memory and reproducible packets
Inference: what it is: maintain a shared index of targets, outcomes, proof gaps, references, and active assignments to prevent duplicate work and preserve evidence.

Steps (Section 10.5, p. 122): before work, query memory; after work, record status and source; include the source PDF, question, proposed result, proof idea, references, and exact computations or code in a human-readable packet. “The packet is the persistent record. It identifies the source paper, the question or conjecture being addressed, the proposed result, and enough evidence for a human reader to reconstruct the claim.” (Section 10.5, p. 122)

Verus form: Inference: packetization should include source hashes, the exact Rust/Verus files, `verus` output, assumptions, trusted axioms, and a replay command. Run memory should distinguish verified proofs from model claims and stale failures.

## techniques for the catalog
- exploratory proof search: repeatedly generate proof candidates for expert-selected problems, then verify and rewrite them
- source-signal harvesting: scan TeX for question markers and rank targets before agent work
- outcome taxonomy: classify full, counterexample, partial, conditional, literature, gap, and attempt outcomes
- persistent packets: store source, claim, proof idea, references, code, and review status in shared run memory
