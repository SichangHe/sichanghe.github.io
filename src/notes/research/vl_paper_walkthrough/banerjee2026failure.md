# Failure Modes of Large Language Models on Research-Level Mathematics: A Taxonomy and an Empirical Characterisation
(authored by agents unless marked 🧑)
Tag: `banerjee2026failure`, [paper](https://arxiv.org/abs/2606.24902)

## scope and measured evidence
The paper studies four failure modes in research proofs: F1 citation fabrication, F2 premise smuggling, F3 silent problem reformulation, and F4 local-to-global compatibility gaps (sections 1 and 3, pp. 1–3). It generated eight one-shot proofs with Gemini 2.5 Flash: Question 1 three times, Question 2 twice, and Question 5 three times; each run used temperature 0.7 and a 32,768-token ceiling (section 4.1, p. 4). A third Q2 run was dropped for quota error, so the denominator is eight, not nine.

Table 2 reports zero correct final answers: Q1 0/3, Q2 0/2, Q5 0/3, total 0/8 (section 5.1, Table 2, p. 6). Every proof had at least one manually identified load-bearing smuggle, 8/8. The premise-audit instrument confirmed 5/5 flagged smuggles (100% precision) but detected four of eight proofs (50% proof-level recall), giving F1 approximately 0.667 (section 5.3, p. 7). These are a tiny corpus and one model; the author states, “eight proofs is a small corpus, and Gemini 2.5 Flash is not the model First Proof tested” (section 1, p. 1).

Inference: a VL verifier must check assumptions and theorem applicability, not merely retrieve citations or check that Rust syntax compiles. The paper’s conclusion is that prevention should require every load-bearing claim to be derived, sourced from a verified reference, or explicitly marked unverified (section 7, p. 8). It states: “The main contribution is the characterisation itself, and in particular the finding that F2 dominates the corpus even though F1 is what most mitigation proposals are aimed at” (abstract, p. 1).

## technique 1: citation-verification instrument (F1)
What it is: a two-stage measurement pipeline that extracts citations and checks whether an arXiv search plausibly matches them. It is intended as an instrument, not production mitigation (section 4).

How to apply:
1. Use an extraction model to return every external reference in structured JSON (Algorithm 1, step 1, p. 4).
2. Query the arXiv client for the top three hits for each citation (step 3).
3. Mark VERIFIED ARXIV if any cited author surname appears in a hit or title-token overlap is at least 50%; otherwise mark NEEDS WEB CHECK (steps 4–8).
4. Treat NEEDS WEB CHECK as inconclusive, never as proof of fabrication (section 4.2).

Evidence and limits: 22 citations were extracted; 16 verified and 6 needed web checks (Table 2 and section 5.2). The matcher accepted a wrong initials match, showing that 16/22 is not ground truth. Retrieval addresses F1 only: the authors write, “RAG addresses one failure mode and leaves the others completely open” (section 6.1, p. 8).

Verus form: Inference: model citation records as ghost data and write a proof obligation that each load-bearing external fact has a trusted source identifier; no Verus construct can prove that an arXiv result is the intended theorem, so source identity remains trusted metadata.

## technique 2: premise-audit instrument (F2)
What it is: a coarse lexical scan followed by semantic judging. Algorithm 2 first splits proof text into sentences, flags sentences matching regexes for “fundamental result”, “standard argument”, “well-known”, “clearly”, “trivially”, and similar phrases, then asks a judge model to decide whether the claim is non-trivial, load-bearing, and unsupported (Algorithm 2 and section 4.3, p. 4).

How to apply:
1. Split generated proof P into sentences (Algorithm 2, step 1).
2. Run the regex library and retain sentences containing a trigger phrase (step 2).
3. Give each candidate plus a 300-character context window to the judge model (steps 3–5).
4. Record binary smuggle status, severity, and rationale; reject elementary claims or cited claims (steps 5–6 and prose after algorithm).
5. Audit regex misses separately: the paper identifies implicit smuggles where a named theorem is applied outside its hypotheses (section 4.3).

Evidence: five judge-confirmed smuggles were all true positives (5/5); four of eight proofs were detected (4/8). The instrument missed Q1 run 3 and Q5 runs 1 and 3 because their errors were implicit theorem misuse, and one judge crashed on a JSON escape character (section 5.3). Inference: regex recall cannot establish proof soundness.

Verus form: Inference: require every externally asserted lemma to appear as a proved `proof fn` with explicit `requires`; use `assert` to expose intermediate facts and reject any branch whose postcondition depends on an unproved assumption. A Verus proof cannot automatically compare a theorem’s mathematical hypotheses with a statistical setting unless those hypotheses are encoded.

## technique 3: explicit taxonomy checks
F1 is a fabricated paper, lemma, or attribution; verify the cited result. F2 is an uncited non-trivial premise, often rhetorical. F3 silently solves a related easier problem, such as replacing interpolation polynomials with non-interpolation ones (section 3, p. 3). F4 proves local steps but never checks compatibility across overlaps; the symplectic example has locally valid smoothings with no globally consistent transformations (section 3, p. 3).

Use these as a review checklist:
1. Compare every cited claim with the actual source (F1).
2. Mark each load-bearing premise and demand proof or citation (F2).
3. Compare symbols, constraints, and non-triviality clauses against the original problem (F3).
4. State and prove overlap/interface invariants when composing local lemmas (F4).

Inference: in Verus, F3 corresponds to proving a different `requires`/`ensures` contract, while F4 corresponds to composing verified modules without a shared invariant. The compiler checks the encoded contract, so a wrong contract still passes.

## trusted boundary, prior work, and VL threat
The manual audit is a single reader without independent agreement; the judge and extraction model share a family blind spot; arXiv matching is intentionally lenient (section 6.4). Thus the reported percentages are instrument characteristics under this setting, not population estimates. The paper says RAG may suppress F1 but does not address premise smuggling. Existing process-reward, debate, and retrieval methods are acknowledged, but the paper’s empirical contribution is the F2 audit and four-mode taxonomy. Inference: agent-written verified Rust is threatened primarily by false specifications and hidden assumptions. Verus can guarantee implementation-level properties only after the contract and mathematical premises are encoded correctly; a prevention pipeline should force explicit assumptions and independent checking before code generation.

## techniques for the catalog
- citation verification — extract citations, search top arXiv hits, and label matches or inconclusive cases
- premise audit — regex-flag rhetorical claims, then judge load-bearing unsupported premises with context
- four-mode review — check citation truth, premise support, problem identity, and local-to-global compatibility
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
