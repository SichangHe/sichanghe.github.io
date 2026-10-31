# A Human Audit of OpenAI’s AI-Generated Mathematical Proofs
(authored by agents unless marked 🧑)
Tag: `sienicki2026audit`, [paper](https://arxiv.org/abs/2608.14673)

## audit scope and evidence model
This paper audits the review record for OpenAI’s ten advertised mathematical results. Its snapshot contains 23 LaTeX documents, of which 18 are chapter-specific reports or technical assessments (§2.1, p. 2). It fixes the manuscript dated 1 August 2026 and the public Lean repository at commit `94bc0fe`, dated 2 August; the repository metadata report `sorry_count` zero for the principal formalized results, while challenge files may contain deliberate `sorry` placeholders (§1, p. 2). The authors emphasize: “What a successful check establishes is the encoded proposition relative to the kernel, definitions, imported results, and axioms.” (§1, p. 2)

The audit distinguishes formal proposition, published theorem, and advertised achievement: `Tformal`, `Tpublished`, and `Cadvertised` (§2.2, p. 3). It requires a semantic correspondence check between the first two, then separately assesses scope, novelty, significance, attribution, and literature for the advertised claim. The paper states: “Neither task is settled automatically by the existence of a certificate.” (§2.2, p. 3) Across the reports, no surviving confirmed substantive mathematical error in a principal result is identified, but Chapter 8 remains verification-incomplete because compressed analytic transitions were not independently checkable (§3.2, p. 4; §8, p. 10). This is a bounded synthesis, not a complete reconstruction of all ten proofs (Abstract, p. 1).

## technique: classify review outcomes instead of using one approval label
Apply four statuses to every audited claim: confirmed mathematical error (false statement, invalid inference, violated hypothesis, or reproducible counterexample); unresolved proof gap (necessary step insufficiently justified); expository omission (compressed derivation recoverable without changing the claim); and verification incomplete (checking too shallow for a positive or negative judgment) (§2.2, p. 3). Record which status applies to which proposition and dependency, and preserve uncertainty rather than averaging incompatible reviewer conclusions. The paper says: “These categories prevent a favorable result from saying more than the review warrants.” (§2.2, p. 3)

Verus form (Inference): attach a status record to every generated Rust/Verus contract and proof. A Verus pass can support only the encoded proposition; semantic mismatch, unproved external assumptions, or an unresolved requirement stays a separate status. Use `requires`/`ensures` and proof logs as formal evidence, then review whether the contract matches ordinary Rust intent, tests, callers, and dependencies. This is an inference from the paper’s evidence model, not a technique implemented in the paper.

## technique: audit source fidelity before accepting objections
Chapter 6 gives a concrete failure mode. PDF extraction removed an overbar from a probability expression, turning a failure probability into a success probability and creating an apparently valid polarity objection (§3.1, p. 4). The typeset source showed the actual condition and the audit withdrew the objection. The operational steps are: (1) locate the exact formula in the immutable typeset source; (2) compare extraction, source, and reviewer quotation; (3) test any counterexample against the source formula; (4) record the withdrawal and reason in the permanent audit trail (§3.1, p. 4). The paper concludes: “Reviewing the original source is therefore part of checking an objection.” (§3.1, p. 4)

Inference: before diagnosing a Verus proof or compiler failure, inspect the actual source, generated file, and tool output rather than relying on copied text or PDF extraction. Store checksums and line-addressable artifacts. A polarity, complement, bound, or missing precondition can change the claim while preserving a plausible-looking critique.

## technique: separate formal checking, human reconstruction, and independent follow-up
The paper’s evidence table assigns distinct questions to distinct acts (Table 2, p. 8): a formal certificate checks an encoded proposition; human technical review checks mathematics to a stated depth; an independent derivation supplies another argument; a strengthening or extension may entail a weaker theorem only after assumptions match; complementary uptake develops related content; and a reference-work entry documents recognition but is not independent certification. The paper warns that independent follow-up may itself use AI assistance and therefore distinguishes independence from the original project from independence from AI systems (§5, p. 7).

## technique: preserve correction and provenance as first-class artifacts
The audit recommends a standardized report header and immutable manifest containing stable identifiers, exact manuscript version and checksum, report date, reviewer status and expertise, checking scope, disclosed authorship mode and AI/formal-tool use, Lean commit, and unresolved dependencies (§6, p. 9). Public deposition makes correction auditable, but does not make reports infallible (§6, p. 9). The archive DOI is `10.5281/zenodo.22218229` (§6, p. 9).

## techniques for the catalog
- proposition-scope separation — distinguish encoded theorem, published theorem, and advertised achievement
- review-status taxonomy — classify errors, proof gaps, omissions, and incomplete verification separately
- source-fidelity audit — verify objections against immutable source artifacts and record withdrawals
- evidence decomposition — report certificates, human review, independent derivation, extensions, uptake, and references separately
- immutable provenance — preserve versions, checksums, tool commits, reviewer scope, AI use, and unresolved dependencies
