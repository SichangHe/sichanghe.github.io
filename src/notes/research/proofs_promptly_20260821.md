# 🤖 Proofs Promptly: expert-guided proof-oriented programming

(authored by agents unless marked 🧑)

This note studies Ioannidis et al., “Proofs Promptly: Proof-Oriented Programming with AI Agents (Experience Report),” PACMPL/ICFP 2026, DOI `10.1145/3828709`.

## what the paper demonstrates

The experience report describes agents using a CLI and a proof assistant to produce machine-checked code across three Pulse case studies: standard-library data structures and concurrency primitives, an MSQuic circular buffer translated from unverified C with natural-language specifications, and a Low* to Pulse garbage-collector port. Source: `PAPER-cases`.

The paper internally reports both “over the course of two weeks” in its abstract and one month in its introduction and effort table. It compares that agent-assisted time with author estimates of two weeks, one month, and three months of manual work for the three cases. The conflict and the absence of a controlled baseline make duration unsuitable as a precise productivity metric; neither figure transfers unchanged to Verus. Sources: `PAPER-abstract-duration`, `PAPER-effort`.

The paper’s stated human role is narrow but material: provide a natural-language problem description, evaluate the generated specification, and sometimes provide a key invariant or proof idea. That leaves specification review—not syntax, theorem search, or proof repair—as the essential human safety boundary. Source: `PAPER-human-role`.

## full-paper, evidence, and artifact audit

The full paper confirms that the evidence is an experience report, not a controlled benchmark. It reports agent session logs, coarse milestones, token usage, source diffs, and expert manual-work estimates; it does not provide a matched no-agent arm, repeated-run variance, or a cross-language comparison with Verus. The last three absences are an audit observation, not a claim by the authors. Sources: `PAPER-evaluation`, `PAPER-effort`.

The paper also documents the scope boundary behind the main recommendation: its authors say an overnight verified system is “not yet realistic,” require a human to check each phase, and describe human architectural decisions and key invariants in the difficult cases. Therefore a green verifier is evidence about the supplied specification, not independent evidence that the specification captures intended behavior. Sources: `PAPER-limits`, `PAPER-human-role`.

No Proofs Promptly artifact was found in this repository’s reachable Git history, so no history rewrite was needed.

## source map

`PAPER-status`: official ACM eReader, DOI `10.1145/3828709`. Claim: article identity, venue, page count, and publication date. Quote: “Article 311 (August 2026), 19 pages.” Quote: “Publication date: August 2026.” The browser snapshot separately recorded no login or challenge; the page states CC BY 4.0.

`PAPER-PDF`: official ACM eReader Download PDF action, DOI `10.1145/3828709`; saved primary PDF at the path and SHA-256 stated above. Claim: this is the complete 19-page publication rather than an eReader print snapshot. Quote: “Proofs Promptly: Proof-Oriented Programming with AI Agents (Experience Report).” Verification: `pdfinfo` reports 19 pages and the named authors.

`PAPER-scope`: official ACM eReader. Claim: proof-oriented programming pairs executable programs with formal specifications and proofs. Quote: “writing executable programs alongside formal specifications and proofs”.

`PAPER-cases`: official ACM eReader, introduction. Claim: the three named case-study targets. Quote: “Pulse 1 standard library”. Quote: “data structures and concurrency primitives”. Quote: “a verified circular buffer with out-of-order reads and writes”. Quote: “MSQuic protocol stack”. Quote: “a mechanically verified mark-and-sweep garbage collector for OCaml”. Quote: “from Low* to Pulse”. Quote: “implementing verified imperative code from unverified C with natural-language specifications”.

`PAPER-abstract-duration`: primary PDF abstract. Claim: the abstract reports a two-week duration. Quote: “over the course of two weeks”. Limitation: it conflicts with the publication's introduction and effort table.

`PAPER-effort`: primary PDF, introduction, Table 1, and Appendix A. Claim: author-estimated effort comparison and one-month experiment duration. Quote: “over the course of one month”. Quote: “two weeks, one month, and three months”. Limitation: this is not a controlled experiment and conflicts with the abstract’s duration.

`PAPER-human-role`: official ACM eReader, introduction. Claim: the authors’ stated human responsibilities. Quote: “providing a natural-language description of the problem”. Quote: “reading and evaluating the auto-generated specification”. Quote: “occasionally supplying a key invariant or proof idea”.

`PAPER-limits`: primary PDF, Section 5. Claim: the authors limit the autonomy claim and identify ongoing human responsibilities. Quote: “not yet realistic”. Quote: “human must be in the loop”. Quote: “crucial architectural decisions”.

`PAPER-evaluation`: primary PDF, Appendix A. Claim: the reported quantitative evidence is mined from session logs and records prompts, turns, compactions, tokens, and diffs. Quote: “quantitative data mined from our Copilot CLI session logs”. Quote: “coarse-grained milestones”. Audit limit: the paper does not report a matched no-agent arm or repeated-run variance.

`ARTIFACT-duration`: extracted official artifact `index.html`. Claim: the artifact repeats the abstract’s two-week duration. Quote: “over the course of two weeks”. Limitation: the primary PDF itself also gives a one-month figure elsewhere, so the discrepancy is not resolved by the artifact.

`ZENODO-artifact`: official Zenodo API record `20538205`. Claim: open published software artifact and checksum. Quote: “icfp26-artifact.tar.gz”. Quote: “md5:f2ee19df7950809c929c5331bf8b793b”.

`ARTIFACT-workflow`: extracted official artifact `Makefile`. Claim: whole-artifact verification entry point. Quote: “verify: verify-gc verify-recv_buffer verify-pulse_std”. Quote: “Verification admitted assumptions summary”.
