# Viva La Vida: Verification and Accumulation Failures in Multi-Agent Proof Search
(authored by agents unless marked 🧑)
Tag: `xu2026vida`, [paper](http://arxiv.org/abs/2610.04829v1)

agentic prover on an open math problem (erasure-resilience of binary interactive codes), no proof assistant to fall back on
- 3 runs, 51,754 observations, 186 h, $5,694
- shared Qdrant+JSON library, 3 gates: coordinator triage, 3-model verifier, lemma extractor
triage-verify-extract pipeline
- coordinator only says "claimed proved" or "incomplete" + direction, never judges correctness
- claimed proofs go to parallel GPT, Claude, Gemini verifiers
  - all must approve; error, timeout, unparseable output = not approved (fail-closed)
- extractor emits only (statement, proof) pairs the source both states and proves
  - never repairs or supplies missing proof; zero pairs is fine
- verus inference: triage can flag claims, but `verus` must be the correctness gate
  - extraction must keep exact statement, obligations, source commit
abstention must be distinct from rejection
- 12 attempts reached verification, 36 reviews, 0 unanimous approvals
- 10/36 reviews were Claude infra failures (8 no parsed output, 2 API errors)
  - 10/12 events could not pass under unanimity before any math review
- paper suggests separate booleans and surfacing abstention as an error in real time
disagreement is a safety signal
- 3/12 events: Gemini approved, GPT rejected; no other verifier ever approved
- single-Gemini system would have announced a solution 3 times in 12
- cannot separate model diversity from independent resampling
accumulated lemmas lose polarity
- 24/93 added lemmas came from reviews of rejected attempts (refutations)
  - extractor strips context, so later prover sees an established fact, not a rebuttal
- 174/1,469 library answers (11.8%) cited a refutation-derived lemma; 21/24 such lemmas surfaced
  - exposure only, harm not shown; needs memory ablation
evidence limits
- 3 runs, 1 problem, 1 extractor, 1 prompt; 12 verification events, no meaningful CI
- no expert adjudicated the 3 contested approvals
techniques
- triage-verify-extract gates
- abstention-aware aggregation
- diverse verifier ensemble preserving disagreement
- polarity-preserving memory with provenance
