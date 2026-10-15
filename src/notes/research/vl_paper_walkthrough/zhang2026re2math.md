# Re$^2$Math: Benchmarking Theorem Retrieval in Research-Level Mathematics
(authored by agents unless marked 🧑)
Tag: `zhang2026re2math`, [paper](http://arxiv.org/abs/2605.09012v1)

## scope and measured result

Re²Math evaluates whether an assistant can retrieve a source-grounded theorem that actually closes a local research-proof gap. The paper distinguishes finding true mathematics from proving that its assumptions and conclusion fit the current step. Its abstract reports that the best fixed-judge ToolAcc is 7.0%, “despite substantially higher rates of source grounding” (Abstract, p. 1). This is a benchmark and diagnostic protocol, not a formal proof system.

The current release has 860 proof-gap instances from 631 papers across five domains; Eval-200 is balanced at 40 instances per domain (section 4.3, p. 6). In Table 1, Claude Opus 4.5 obtains 14/200 = 7.0% ToolAcc, while Grok 4 grounds 83/200 but succeeds on 7/200 = 3.5% (Table 1, p. 7). Thus sourced statements are often insufficient for the proof transition. Oracle-source ToolAcc for Claude is 9/71 = 12.7% on the 71/200 materialized author sources, still low (Table 2, p. 8).

## technique 1: source–tool pair and citation-invariant validity

What it is. Given a partial proof and a non-trivial transition Δ, return `(d̂, K̂)`: an admissible scholarly source and theorem-like statement grounded in that source and sufficient for Δ. The exact author citation is only a construction witness; any admissible source receives credit if it closes the gap (sections 3 and 3.3, pp. 3–5). The paper states: “The author citation is one human witness for the gap, not the definition of correctness” (section 3, p. 3).

How to apply it.

1. Expose global setup and an ordered local window of up to five blocks before the citation (section 3.1, p. 4).
2. Infer the missing proof role; in the assisted track, use a sanitized anchor that omits titles, authors, identifiers, and source metadata (section 3.1, p. 4).
3. Generate search queries, retrieve ranked candidates, select at most one source, and extract a theorem statement (section 3.2, p. 4; section 5.1, p. 7).
4. Check that the statement is independently grounded in the selected source and that its hypotheses and conclusion are sufficient for Δ; stronger statements count only when additional assumptions hold (section 3.3, p. 5).
5. Accept any valid source–tool pair, not merely the stored citation.

Verus form. Inference: represent `K̂` as a proved Verus lemma with explicit `requires` matching the proof state's assumptions and `ensures` matching the target transition. Store the source and exact theorem text as metadata, but let Verus check the encoded lemma. Citation-invariance means an equivalent lemma from another library is acceptable if its contract is sufficient. Verus cannot check whether a PDF really entails the contract unless the lemma is formalized and proved; imported axioms remain trusted.

Evidence and limits. Claude's 13/14 successful predictions use alternative sources (Table 2, p. 8), showing citation-locking would undercount valid tools. The human audit validates 39/42 alternative-source successes and identifies three fixed-judge false positives (section 6, p. 9). Inference: VL should record provenance and assumptions for every imported lemma and reject a source merely because it is topically similar.

## technique 2: staged retrieval policy and diagnostics

The benchmark factorizes the policy into proof-need planning, query generation, retrieval, source selection, and theorem extraction: `x → â → Q → R → d̂ → K̂` (section 3.2, p. 4). Only the final pair is scored, but diagnostics expose where failures enter.

How to apply it.

1. Plan the immediate mathematical role from raw global and local context; measure this with AnchorAcc (section 3.4, p. 5).
2. Lexicalize that role into bounded search queries.
3. Retrieve through a shared release-frozen interface; the canonical run uses one Scholar query, Top-20 metadata, and at most one full-text opening per instance (section 5.1, p. 7).
4. Select a source, extract a theorem-like statement, and test source grounding and sufficiency.
5. Record AnchorAcc, CiteRecall@20, GroundRate, and ToolAcc separately. CiteRecall checks whether the stored citation appears in the candidate pool; it is diagnostic, not correctness (section 3.4, p. 5).

Verus form. Inference: the planner can produce a ghost obligation record; a retriever can propose candidate lemmas; a Verus compilation step is the final sufficiency test. Keep diagnostics separate from acceptance: finding a candidate or proving it is sourced does not establish that its `requires` are met at the call site.

Evidence and limits. Table 1 shows Claude AnchorAcc 48/200 = 24.0%, CiteRecall@20 21/200 = 10.5%, GroundRate 48/200 = 24.0%, but ToolAcc 14/200 = 7.0% (Table 1, p. 7). The fixed retrieval artifact improves reproducibility but inherits Google Scholar coverage and ranking; query results are not a theorem index (section 5.2, p. 7).

## technique 3: frozen, leakage-controlled benchmark construction

What it is. A published-first, arXiv-backed pipeline identifies instrumental citations in main-theorem proofs, extracts the pre-citation proof state, and releases a versioned retrieval artifact. Splits are at citing-paper level so gaps from one paper cannot cross partitions (sections 4.1 and 5.2, pp. 6–7).

How to apply it.

1. Pair published papers with high-confidence arXiv twins when available to localize theorem statements and citation occurrences (section 4.1, p. 6).
2. Identify setup, target theorem, proof span, and candidate instrumental citations.
3. Build each instance from global context, a five-block local window, optional sanitized anchor, reference witness, and citation metadata.
4. Filter ambiguous matches, low-confidence alignments, and suspicious witnesses rather than forcing them into the release (section 4.1, p. 6).
5. Freeze query results, ranks, timestamps, and source-materialization outcomes; use a paper-level split (section 5.2, p. 7).

Verus form. Inference: build a VL benchmark from real proof obligations by freezing crate versions, source revisions, and candidate lemma indexes. The release should retain exact contracts and assumptions, and score whether the selected lemma compiles at the target call site. A frozen artifact controls information access but does not prove benchmark labels.

Evidence and limits. Eval-200 is quality-controlled rather than random and prioritizes journal witnesses, nonempty context, sanitized anchors, and complete witnesses (section 4.3, p. 6). The authors report residual citation-role and anchor-sanitization risks; therefore percentages describe this curated split, not all mathematical literature.

## technique 4: assumption accounting and source localization

The main failure pattern is true but unusable mathematics. The paper says “The missing capability is assumption accounting: checking objects, domains, hypotheses, parameter ranges, quantifiers, and conclusion strength against the local proof state” (section 6, p. 9). Apply it by locating the theorem boundary in the source, extracting every hypothesis, matching each to the local context, and checking that the conclusion discharges the exact transition rather than a nearby claim.

Inference: in Verus, this is contract matching. Before invoking a lemma, compare every `requires` clause with available facts; use explicit intermediate assertions to establish domains and parameter bounds. A lemma with a weaker `ensures` than the target is insufficient even if its statement is true. This technique directly addresses VL's risk of importing mathematically correct but inapplicable lemmas.

Evidence. Grok grounds 83/200 statements but reaches only 7/200 ToolAcc; the paper attributes this gap to applicability, not necessarily hallucination (section 6, p. 9). Oracle-source evaluation still reaches only 12.7% for the best model (Table 2, p. 8), showing that source acquisition is not the sole bottleneck.

## what is proved, measured, and trusted

The paper measures policy diagnostics and judge-labelled source–tool validity. It does not prove that the held-out judge is mathematically sound; the judge is fixed across runs, and a single-annotator audit is “not an inter-annotator agreement study” (section 5.2, p. 7). Trusted elements include source parsing, admissibility rules, the frozen retrieval artifact, model outputs, and judge predicates. The benchmark itself is citation-invariant, but source materialization coverage varies by instance.

Inference: threat to agent-written verified Rust is high for lemma retrieval and medium for overall product correctness. A VL agent can use Re²Math's staged diagnostics to find candidate Verus lemmas and expose missing assumptions. It must still compile the proof, inspect contracts, and keep external-body or library assumptions explicit. VL should not redo a citation-recovery leaderboard; it should measure compile-checked applicability and repair cost on real Verus proof gaps.

## techniques for the catalog

- citation-invariant source–tool retrieval — accept any admissible sourced theorem whose assumptions and conclusion close the local proof gap
- staged retrieval diagnostics — separate proof-need planning, query generation, source selection, grounding, and sufficiency metrics
- frozen leakage-controlled evaluation — freeze search artifacts and split by citing paper for reproducible assessment
- assumption accounting — check objects, domains, hypotheses, parameters, quantifiers, and conclusion strength at the proof state

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
