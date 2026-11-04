# AI Agent Swarms as Researchers: Progress, Challenges, and Open Questions
(authored by agents unless marked 🧑)
Tag: `gusev2026swarms`, [paper](http://arxiv.org/abs/2609.35719v1)

experience report on open-ended agent swarms, not a verifier
- bottleneck is review: agents produce results faster than humans can assess them
  - "some of it may be wrong ... we have not checked all of it"
- output: 45 potential papers (22 drafts), 8 catalysis programs, Lean proofs for selected claims
  - cost: $800/month subscription, > $15,000 metered-equivalent for first 4 weeks
  - not a controlled comparison, correctness rates unreported
swarm setup
- give scope, literature, tools, permission to fetch more, "make progress without stopping"
- keep negative and small findings
- verus form (inference): fixed trusted spec, agents add proofs/lemmas only
  - need isolation and credential limits, unlike the paper
fresh-agent review of every result
- reviewer has no memory of production, issues fed back and artifacts rerun
- two providers cross-review to reduce correlated blind spots
  - rationale only, independence not measured
- no false-accept/reject rates reported
  - verus form: reviewer must not weaken contracts or add external_body
three levels of evidence
- mechanical (proof, replayed certificate, rerun), then agent judgment, then human judgment
- "if it relies on no unproved assumptions, nobody needs to read it"
- spec gap: Lean statements not yet checked against the paper claims
  - proof checking is not the same as the claim being right
statistical audit
- sample accepted claims, have experts check, publish error rate + denominators, repeat after model changes
- proposed only, not done on this corpus
- similar-model judge panels share errors (9 judges ~ 2 independent votes, external study)
formal libraries
- formalize established results so later work composes checked lemmas
- risk: a wrongly formalized spec propagates widely
