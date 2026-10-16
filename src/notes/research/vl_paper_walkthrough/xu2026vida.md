# Viva La Vida: Verification and Accumulation Failures in Multi-Agent Proof Search
(authored by agents unless marked 🧑)
Tag: `xu2026vida`, [paper](http://arxiv.org/abs/2610.04829v1)

## scope and system
Viva La Vida instruments an agentic prover working on the open exact erasure-resilience ratio for binary interactive error-correcting codes. The paper emphasizes that “When an agentic prover works on an open problem, there is no proof assistant to fall back on” (Abstract, p.1). It traces 51,754 observations across three runs, 186 hours, and $5,694 (Abstract, p.1). The system has a shared Qdrant+JSON library and three gates: a coordinator triages whether a proof attempt claims completion, a three-model verifier checks claimed proofs, and a lemma extractor integrates statements for later retrieval (Sections 1–2, pp.1–2).

Inference: for VL, the open-problem setting is less applicable whenever Verus can check a candidate. The relevant lesson is to preserve trust boundaries around generated proof artifacts, verifier outcomes, and memory used by later agents.

## technique: triage, verify, extract pipeline
The algorithm takes problem x, library L, iteration limit T, and recursion depth dmax. At each iteration, the prover samples library artifacts and generates an attempt using conversation and tools (`discuss`, web, `ask_library`, `fork`, and bounded `spawn_sub_prover`). Empty attempts are saved and retried. The coordinator emits either “claimed proved” or “incomplete” with a direction; it does not assess correctness (Section 2, Figure 2, p.2). Incomplete attempts and directions are injected into the library and returned to the prover. Claimed proofs go to parallel GPT, Claude, and Gemini verifiers. The algorithm states: “Errors, timeouts, or unparseable responses yield approvedm = FALSE (fail-closed)” (Figure 2, p.2). Only if every verifier approves is the attempt saved as success and the run halted. Otherwise the attempt and reviews are saved, reasons are fed back, and extraction runs on both proofs and reviews.

The extractor is intentionally conservative: “It emits only (statement, proof) pairs that the source both states and proves, never repairs, extends, or supplies a missing proof, and returning zero pairs is acceptable” (Section 2, p.2). An integrator may skip, merge, or add extracted pairs; survivors are embedded for retrieval.

Inference: in Verus, triage can classify whether a generated Rust function claims to meet a contract, but `verus` verification should be the correctness gate. A candidate function should carry `requires`, `ensures`, and loop `invariant`s; proof functions and lemmas remain proof-only code. Extraction must retain the exact theorem statement, proof obligations, and source commit so a later agent cannot turn a rejected proof fragment into an asserted fact. This is an inference because the paper uses informal proofs, not Verus.

## technique: distinguish abstention from rejection
Twelve attempts reached verification, yielding 36 reviews and zero unanimous approvals. Ten reviews (10/36) were infrastructure failures from Claude: eight had no parsed output and two had API errors (Section 3, p.2). Because the ensemble required unanimity, 10 of 12 events (83%) were arithmetically unable to pass before mathematical review. The paper states: “Separating abstention and rejection as distinct booleans and treating an aggregate containing an abstention as an error that is surfaced in real-time could be an interesting follow-up work here” (Section 3, p.3).

Inference: VL's verifier wrapper should represent at least `proved`, `rejected`, and `abstained` states. A solver timeout or parser failure must not be serialized as a failed proof, and CI should surface it. A Verus proof failure is meaningful only when verification ran to completion; this distinction is separate from whether the specification is correct.

## technique: disagreement as a safety signal
In 3 of 12 verification events, Gemini approved while GPT rejected. No verifier other than Gemini approved any event. A single-Gemini system would therefore have announced a solution three times in twelve opportunities (Section 4, p.3). The paper concludes that model diversity blocked these false approvals, although it cannot separate diversity from independent resampling.

Inference: for VL, a second model is optional when the proof checker is authoritative, but disagreement between independent specification reviewers can expose an underspecified contract. It cannot substitute for Verus's checked proof.

## technique: provenance and polarity for accumulated lemmas
Of 93 added lemmas, 24 (26%) came from reviews of rejected attempts (Table 2, p.4). Those reviews were refutations, yet the extractor removed their context. The paper warns: “A later prover retrieving it sees an established fact about α⋆ and not a rebuttal of one” (Section 5, p.4). Exposure was measured separately: 174 of 1,469 library answers (11.8%) cited at least one refutation-derived lemma, and 21 of 24 such lemmas surfaced at least once (Section 5, p.4). The authors explicitly say these are provenance and exposure, not demonstrated harm; a memory ablation would be needed (Section 8, p.5).

Inference: VL memory should store polarity (`proved`, `refuted`, `unverified`, `abstained`), parent artifact, verifier transcript, and exact specification. Retrieval should filter or visibly label refuted and unverified material. A Verus lemma is useful only when its statement and proof are checked under the current environment; a review-derived explanation is not a lemma.

## what is measured and trusted
The evidence is three runs on one open problem, one extractor, one embedding model, one integrator, and one prompt. No confidence interval is meaningful at 12 verification events, and no expert adjudicated the three contested approvals (Section 8, p.5). Table 1 reports 17,553 generations, 37 coordinator iterations, and 12 verified attempts; the runs cost $5,694. The system trusts model judgments and its extraction/integration rules rather than an external proof assistant.

Inference: a VL report should separate checked Verus obligations from model-generated metadata and should list trusted dependencies: Verus, solver, compiler, libraries, and specification assumptions. This paper does not establish that critique-derived lemmas caused downstream errors.

## threat to VeruLaw
Inference: the threat is high for any VL workflow that lets agents write shared proof memory, because a rejected argument can be stripped of polarity and reused as an asserted fact. The threat is lower for final code whose claims are rechecked by Verus from source. The paper's open-problem results do not show failures of Rust ownership or Verus soundness.

## techniques for the catalog
- triage-verify-extract gates — separate completion triage, independent checking, and tightly scoped library intake
- abstention-aware aggregation — encode parser, timeout, and API failures separately from substantive rejection
- diverse verifier ensemble — require independent judgments when no external checker exists and preserve disagreement
- polarity-preserving memory — retain provenance and refutation context when storing claims for retrieval

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
