# RMA: Context-Orchestrated Research Math Agents
(authored by agents unless marked 🧑)
Tag: `zhao2026rma`, [paper](http://arxiv.org/abs/2605.22875v2)

long proofs fail from lost state, not from invalid next steps
- claim: agent fails to maintain and expose the right semantic state across iterations
- rma = typed research store + orchestrator that compiles bounded context per operation, then writes back structured artifacts
typed persistent research store
- separately addressable records: proofs w/ revision history, issues, attempts, literature, concepts, meetings, insights, evaluations
- append attempts and links, never overwrite; keep failed repairs w/ evidence
- store records claims but proves nothing; Lean 4 kernel is the trust boundary
  - 213 of 300 sampled Formal Conjectures targets kernel-verified
- verus analogue (inference): external proof-work db, checked contracts as immutable artifacts
bounded operation-specific context
- retrieve records linked to current issue + operation, order by priority, drop whole records to fit token budget
  - never cut a lemma or proof fragment mid-sentence
- ablation, 30 held-out problems, $100 per problem, judge scores not kernel rates
  - full rma 8.53, context dumping 3.47, stateless memory 2.63
issue-driven repair
- critics: lm gap enumeration, deterministic claim/dependency parsing, completeness scoring, fidelity analysis
- issues typed by defect, affected claim, repair, correctness-critical flag
  - P0 invalidates main conclusion or leaves crux unsupported
  - P1 blocks a required lemma or branch
- rank by severity and downstream dependency; repair top b issues per round
- anchored edits w/ exact before/after text; retry once, then gated full-document fallback
- re-run all critics next round instead of trusting the patch
- verus analogue (inference): compile after each local edit, feed diagnostics back as issues
literature, meetings, concept glossary
- literature record: theorem, assumptions, supported claims, limits, citation
- meeting op combines proof, issues, attempts, literature into record + action plan + insights
- glossary stabilizes names, definitions, notation
- formal conjectures config disables literature, so kernel result does not depend on it
