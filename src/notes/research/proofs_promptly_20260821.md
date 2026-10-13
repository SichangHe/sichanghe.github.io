# 🤖 Proofs Promptly and VL: expert-guided proof-oriented programming

(authored by agents unless marked 🧑)

This note studies Ioannidis et al., “Proofs Promptly: Proof-Oriented Programming with AI Agents (Experience Report),” PACMPL/ICFP 2026, DOI `10.1145/3828709`.

## bottom line

The paper is credible evidence that agents can accelerate substantial F*/Pulse proof engineering when experts retain responsibility for specifications, architectural choices, and key invariants. It is not evidence that agents autonomously discover correct repository-wide specifications from ordinary Rust or English requirements. Sources: `PAPER-scope`, `PAPER-human-role`, `PAPER-limits`, `VL-boundary`.

The direct competitive threat to VL is medium. The demonstrated case studies overlap with VL’s intended proof-and-specification workflow, but use a different stack: Pulse and F* rather than Verus and Rust. The more important lesson is operational: make a verified build the objective, keep human semantic review at the specification boundary, and explicitly record the invariant help a human supplied. Sources: `PAPER-cases`, `PAPER-human-role`, `ARTIFACT-workflow`.

## what the paper demonstrates

The experience report describes agents using a CLI and a proof assistant to produce machine-checked code across three Pulse case studies: standard-library data structures and concurrency primitives, an MSQuic circular buffer translated from unverified C with natural-language specifications, and a Low* to Pulse garbage-collector port. Source: `PAPER-cases`.

The paper internally reports both “over the course of two weeks” in its abstract and one month in its introduction and effort table. It compares that agent-assisted time with author estimates of two weeks, one month, and three months of manual work for the three cases. The conflict and the absence of a controlled baseline make duration unsuitable as a precise productivity metric; neither figure transfers unchanged to Verus. Sources: `PAPER-abstract-duration`, `PAPER-effort`.

The paper’s stated human role is narrow but material: provide a natural-language problem description, evaluate the generated specification, and sometimes provide a key invariant or proof idea. That leaves specification review—not syntax, theorem search, or proof repair—as the essential human safety boundary. Source: `PAPER-human-role`.

## comparison with VL

Current VL evidence supports focused Verus proof work and named-target specification work. It does not establish autonomous repository-wide specification discovery or Verus project generation from ordinary Rust. Source: `VL-boundary`.

Therefore the demonstrated overlap is in proof-oriented workflow, verifier feedback, reusable proof infrastructure, and expert invariant intervention. It is not a matched result on VL’s target language, agent configuration, or autonomy level. Source: `PAPER-scope`, `VL-boundary`.

The main competitive risk is that a small expert team can use general coding agents plus a proof assistant to move faster on realistic verified systems code. The paper does not establish semantic correctness beyond the formal specifications reviewed by those experts. This is an inference from the authors’ stated division of labor, not a claim they directly test. Source: `PAPER-human-role`.

## actionable lessons for VL

Treat checked artifacts as the outcome. The companion artifact’s root `make verify` runs the GC, receive-buffer, and Pulse-standard-library verification targets and reports detected admitted assumptions from the verification logs. Source: `ARTIFACT-workflow`.

Make specification review auditable. A green verifier only supports “implementation meets the supplied formal specification”; it does not establish that the formal specification captures intent. VL should retain explicit evidence for requirements, review, and supplied invariants. Sources: `PAPER-human-role`, `VL-boundary`.

Track the expert intervention budget. Record whether a result required a named target, a key invariant, a proof idea, or an implementation redesign. Those are essential inputs to a credible autonomy claim. Source: `PAPER-human-role`.

Evaluate transfer rather than assume it. The paper’s evidence is F*/Pulse, so a VL claim needs a separately reproduced Verus/Rust evaluation with the same whole-artifact completion criterion. Sources: `PAPER-cases`, `VL-boundary`.

## full-paper, evidence, and artifact audit

The official ACM eReader was opened at `https://dl.acm.org/doi/epdf/10.1145/3828709` on 2026-08-21. Its paper-specific Download PDF control saved the 19-page primary PDF to the established collection: `/hdd1/sichanghe/paper_collection/Proofs Promptly- Proof-Oriented Programming with AI Agents, Eleftherios Ioannidis, Nikhil Swamy, Gabriel Ebner, Matthai Philipose, Tahina Ramananandro, ICFP, 2026/Proofs Promptly- Proof-Oriented Programming with AI Agents, Eleftherios Ioannidis, Nikhil Swamy, Gabriel Ebner, Matthai Philipose, Tahina Ramananandro, ICFP, 2026.pdf`. SHA-256: `3587288cba9bf362307b09ca7ef340e4b406a75648cd4ddf8f7f58bae7a0c1f4`. `pdfinfo` identifies the published title and authors, 19 pages, and a 936,533-byte file. Source: `PAPER-status`, `PAPER-PDF`.

The full paper confirms that the evidence is an experience report, not a controlled benchmark. It reports agent session logs, coarse milestones, token usage, source diffs, and expert manual-work estimates; it does not provide a matched no-agent arm, repeated-run variance, or a cross-language comparison with Verus. The last three absences are an audit observation, not a claim by the authors. Sources: `PAPER-evaluation`, `PAPER-effort`.

The paper also documents the scope boundary behind the main recommendation: its authors say an overnight verified system is “not yet realistic,” require a human to check each phase, and describe human architectural decisions and key invariants in the difficult cases. Therefore a green verifier is evidence about the supplied specification, not independent evidence that the specification captures intended behavior. Sources: `PAPER-limits`, `PAPER-human-role`.

The official Zenodo record `10.5281/zenodo.20538205` provides the companion software artifact. It was downloaded outside the paper collection at `/ssd1/sichangheagent/proofs_promptly_study/artifact/icfp26-artifact.tar.gz`, verified against Zenodo’s published MD5, and decompressed at `/ssd1/sichangheagent/proofs_promptly_study/unpacked/`. Artifact MD5: `f2ee19df7950809c929c5331bf8b793b`; local SHA-256: `bac72b469f0327ee6cf301a5fd77697110656c00d440e36e6648350967f77331`. The artifact was not run because its supplied workflow builds a Docker image and runs a pinned F*/Pulse toolchain; this note verifies its archive and documented entry point, not its proof results. Sources: `ZENODO-artifact`, `ARTIFACT-workflow`.

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

`VL-boundary`: `/ssd1/sichangheagent/VeruLaw/docs/current_capability_summary.md`, SHA-256 `1c1c0bacde17e3d011050ebd739e9ed2aa92d715d75c4ba7d8eaf75d7ccd776c`. Classification: local dated capability documentation, not a matched benchmark result. Quote: “useful evidence for focused proof work”. Quote: “does not yet establish autonomous repository-wide specification discovery”.
