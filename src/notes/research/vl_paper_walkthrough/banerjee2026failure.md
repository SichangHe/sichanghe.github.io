# Failure Modes of Large Language Models on Research-Level Mathematics: A Taxonomy and an Empirical Characterisation
(authored by agents unless marked 🧑)
Tag: `banerjee2026failure`, [paper](https://arxiv.org/abs/2606.24902)

## scope and measured evidence
The paper studies four failure modes in research proofs: F1 citation fabrication, F2 premise smuggling, F3 silent problem reformulation, and F4 local-to-global compatibility gaps (sections 1 and 3, pp. 1–2). It generated eight one-shot proofs with Gemini 2.5 Flash: Question 1 three times, Question 2 twice, and Question 5 three times; each run used temperature 0.7 and a 32,768-token ceiling (section 4.1, p. 3). A third Q2 run was dropped for quota error, so the denominator is eight, not nine.

Table 2 reports zero correct final answers: Q1 0/3, Q2 0/2, Q5 0/3, total 0/8 (section 5.1, p. 3; Table 2, p. 4). Every proof had at least one manually identified load-bearing smuggle, 8/8. The paper reports 5/5 judge-confirmed smuggles as true positives (100% precision), detection of four of eight proofs (50% proof-level recall), and an F1 score of approximately 0.667 (section 5.3, p. 4). The precision denominator counts confirmed flags; the recall denominator counts proofs. One of six regex flags was never adjudicated because the judge crashed. These are a tiny corpus and one model; the author states, “eight proofs is a small corpus, and Gemini 2.5 Flash is not the model First Proof tested” (section 1, p. 1).

## technique 1: citation-verification instrument (F1)
What it is: a two-stage measurement pipeline that extracts citations and checks whether an arXiv search plausibly matches them. It is intended as an instrument, not production mitigation (section 4).

How to apply:
1. Use an extraction model to return every external reference in structured JSON (Algorithm 1, step 1, p. 3).
2. Query the arXiv client for the top three hits for each citation (step 3).
3. Mark VERIFIED ARXIV if any cited author surname appears in a hit or title-token overlap is at least 50%; otherwise mark NEEDS WEB CHECK (steps 4–8). Algorithm 1 uses ≥50%; section 4.2 instead says “exceeds 50%”.
4. Treat NEEDS WEB CHECK as inconclusive, never as proof of fabrication (section 4.2).

Evidence and limits: 22 citations were extracted; 16 were labeled VERIFIED ARXIV and 6 NEEDS WEB CHECK (Table 2 and section 5.2). The matcher accepted a wrong initials match, showing that 16/22 is not ground truth. The paper argues, “RAG addresses one failure mode and leaves the others completely open.” (section 6.1, p. 5). It did not test a RAG intervention: “I cannot test the RAG hypothesis directly.” (section 6.1, p. 5).

Verus form: Inference: model citation records as ghost data and write a proof obligation that each load-bearing external fact has a trusted source identifier; a source identifier alone does not establish the cited mathematical claim, so the mapping from sources to encoded facts would still require checking.

## technique 2: premise-audit instrument (F2)
What it is: a coarse lexical scan followed by semantic judging. Algorithm 2 first splits proof text into sentences, flags sentences matching regexes for “fundamental result”, “standard argument”, “well-known”, “clearly”, “trivially”, and similar phrases, then asks a judge model to decide whether the claim is non-trivial, load-bearing, and unsupported (Algorithm 2 and section 4.3, p. 3).

How to apply:
1. Split generated proof P into sentences (Algorithm 2, step 1).
2. Run the regex library and retain sentences containing a trigger phrase (step 2).
3. Give each candidate plus a 300-character context window to Gemini 2.5 Flash-Lite at temperature 0 (steps 3–5 and section 4.3).
4. Record binary smuggle status, severity, and rationale; reject elementary claims or cited claims (steps 5–6 and prose after algorithm).
5. Inference: audit regex misses separately. This is an additional review step, not part of Algorithm 2. Section 4.3 warns that the instrument misses claims without its trigger vocabulary, including theorem misuse and unjustified formal manipulations.

Evidence: five judge-confirmed smuggles were all true positives (5/5); four of eight proofs were detected (4/8). The instrument missed Q1 run 3, Q2 run 1, and Q5 runs 1 and 3. Q1 run 3 imported a Wick-translation formula without the required renormalisation; the other three misapplied named results. A sixth regex flag, on an elementary embedding in Q1 run 1, was never adjudicated because the judge crashed on a JSON escape character; the author excluded it from the precision calculation (section 5.3, p. 4). Inference: regex recall cannot establish proof soundness.

Verus form: Inference: encode each needed lemma as a proved `proof fn` with explicit `requires`; use `assert` to expose intermediate obligations, and audit assumptions that verification treats as trusted. A Verus proof cannot automatically compare a theorem’s mathematical hypotheses with a statistical setting unless those hypotheses are encoded.

## technique 3: explicit taxonomy checks
F1 is a fabricated paper, lemma, or attribution; verify the cited result. F2 asserts a non-trivial premise without proof or citation, often using language that makes it sound established. F3 silently solves a related easier problem, such as replacing interpolation polynomials with non-interpolation ones (section 3, p. 2). F4 proves local steps but never checks compatibility across overlaps; the symplectic example has locally valid smoothings but leaves compatibility of transformations across overlapping charts unchecked (section 3, p. 2).

Inference: turn the taxonomy into a review checklist:
1. Compare every cited claim with the actual source (F1).
2. Mark each load-bearing premise and demand proof or citation (F2).
3. Compare symbols, constraints, and non-triviality clauses against the original problem (F3).
4. State and prove overlap/interface invariants when composing local lemmas (F4).

Inference: in Verus, F3 corresponds to proving a different `requires`/`ensures` contract, while F4 corresponds to composing verified modules without a shared invariant. Verification checks the encoded contract; a proof of a mistaken contract need not establish the intended property.

## techniques for the catalog
- citation verification — extract citations, search top arXiv hits, and label matches or inconclusive cases
- premise audit — regex-flag rhetorical claims, then judge load-bearing unsupported premises with context
- four-mode review — Inference: use the taxonomy to check citation truth, premise support, problem identity, and local-to-global compatibility
