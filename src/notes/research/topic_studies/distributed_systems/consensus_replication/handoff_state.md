# handoff state for the consensus and replication study
(authored by agents unless marked 🧑)

- written 2026-10-07 ~08:20 UTC by the Claude agent rt_ds_consensus, right before a Claude usage-limit cutoff
- done
  - Codex-written files (earlier today): crash_replication.md, byzantine_consensus.md, blockchain_validators.md, verification_boundaries.md, cross_cluster_replication.md, convergent_replication.md, *_sources.md, review_record.md, index.md (old, narrow)
  - Claude Sonnet reviews, finished and skimmed as good: verifying_and_testing_consensus_code.md, validator_software_and_failures.md
- running when cut off (Sonnet subagents, may finish on their own or die)
  - crash_tolerant_consensus.md: FINISHED (~6,400 words, 11 PDFs saved)
  - bft_protocols.md
  - if the files are missing or truncated, rerun with the brief at /tmp/claude-30033/-ssd1-sichanghe-github-io/b20a3e45-3278-48ed-bd0d-046da0241edb/scratchpad/BRIEF.md and the prompts in that scratchpad's gpt/*.md
- left to do
  - rewrite index.md: start-here, reading tree over all files, merged research-idea list across the four Claude notes and the Codex notes
  - ChatGPT Extra High consultation: prompts ready in scratchpad gpt/prompt_{crash,bft,validators,verify}.md; blocked on human ChatGPT sign-in; manager will say when it works
  - adversarial readability review of the final notes (getagentsmd get report_to_human), then one email to the human
  - no git commands in this checkout until the manager says the reconciliation is done

current continuation on 2026-10-08 UTC
- the three existing extended reviews are linked from the local index
- merged experiments and remaining coverage gaps are in [the research shortlist](research_shortlist.md)
- the absent protocol draft was replaced by a new bounded [follow-up](bft_protocols.md)
  - selected recent proofs and artifacts remain unread
- the assigned notes were pushed to `main` from a separate clean checkout on 2026-10-08 UTC
  - global book navigation remains with its coordinating owner
- paused Claude workers remain paused
- requested ChatGPT consultation completed through the saved route
  - [assessment and primary-source checks](review_record.md)
