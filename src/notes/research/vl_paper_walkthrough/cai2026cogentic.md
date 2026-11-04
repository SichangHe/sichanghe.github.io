# Cogentic: Multi-Agent Orchestration for Automated Proof Discovery
(authored by agents unless marked 🧑)
Tag: `cai2026cogentic`, [paper](https://arxiv.org/abs/2609.40324)

harness for open math/TCS problems: prove–verify loop, parallel provers, adversarial checking, persistent ledger
- O(100) Gemini calls for most problems, O(1000) for the hardest
- 5 results in online learning, auction theory, mechanism design, checked by domain experts afterwards
- Verus form (inference): each candidate must verify under Verus before entering a trusted ledger
round-based allocation
- orchestrator splits prover slots across directions (bound, construction, counterexample, repair, finalization)
- one summarizer per prover writes a selective briefing, not full history
- each round writes to the record (all attempts) and the ledger (verified lemmas)
adversarial dual verification
- each draft checked alone, then all drafts checked together, assuming every step is wrong until justified
- accept only if both pass
- Verus caveat: verified contracts do not show the spec matches intent
verified ledger and dead-end record
- "Verifiers often confirm individual lemmas inside proofs they otherwise reject"
- auditor extracts a lemma from a rejected proof, rewrites it standalone, reverifies
- verified counterexamples recorded as excluded directions
- Verus form: ledger entries are compilable `proof fn` lemmas pinned to crate and dependency versions
process-level advisor
- reads all verification logs, tunes instructions and allocation
- no mathematical opinions allowed: cannot guess the answer or recommend a technique
final audit
- comparator picks strongest proof, writer expands it, verifier checks the manuscript against the accepted proof
