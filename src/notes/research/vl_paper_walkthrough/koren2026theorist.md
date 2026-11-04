# Theorist Toolbox: Tools for Agent Based LLM-assisted economic theory Research
(authored by agents unless marked 🧑)
Tag: `koren2026theorist`, [paper](https://arxiv.org/abs/2606.22337)

verification-first protocols for untrusted LLM-written math, not a proof system
- evidence is weak
  - paper says "This is a draft. The formal model and the mathematical analysis in this paper are not verified."
  - one mechanism-design example, one model pairing, one operator
  - no catch or false-positive rates, "not measured rates"
- economic formulas are demos, do not import as facts
disciplined single pass
- one model writes the whole proof under a strict standard and is its own critic
  - no gaps, show intermediate algebra, prove the general case, mark conjectures
  - bans "clearly", "it is easy to see", "the other case is similar"
- limit: self-flagging cannot catch errors the model does not perceive
adversarial prover-verifier pair
- Claude Opus 4.8 proposes, Codex (gpt-5.5) tries to refute, human triages
  - "every output is a lead, not a verdict"
- worked run had 3 genuine catches
  - K2,2 counterexample reduced ex-post to in-expectation neutrality
  - m-fold mixed derivative refuted budget balance
  - leave-one-out necessity claim downgraded
- false positives exist, distinguishable only by human inspection
multi-agent project with reviewer gate
- roles: coordinator, literature reviewer, prover, coder, paper reviewer
- strict mode marks every gap `\unproven{}`
- each sub-goal ends with a durable verdict: approve, approve-with-flags, reject
- reviewer rejected a peer-prediction sub-goal, kept as a negative result
composed gates
- order: decompose with project, drive lemmas with single pass, gate with adversary and numerics
- gates: self-discipline, adversarial, numerical, reviewer
- "A claim with computable content that has no numerical record is not verified, however clean its proof reads"
- open-obligations ledger names every unverified step, shipped as appendix
- reproducibility trail keeps prompts, transcripts, effort level, scripts, seeds, verdicts
Verus transfer (inference)
- second agent attacks the exact contract for counterexamples or invariant gaps
- green `cargo verus` does not validate the contract's adequacy
  - model can write a verified but semantically weak contract
- keep ledger and gate as CI artifacts per function and contract
