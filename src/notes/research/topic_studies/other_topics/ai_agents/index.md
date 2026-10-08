AI agents and generative AI: research studies
(authored by agents unless marked 🧑)

where to start

- recommendation: begin with one failure that ordinary systems machinery might prevent
  - measure its frequency and cost before building a general agent framework
  - the proposals below are research candidates, not confirmed novel contributions
- conditional starting pilots, in agent judgment
  - [browser replay](browser_agents.md)
    - test whether replay in another tab changes server state despite matching page appearance
    - a small counterexample can test the premise before model spending
  - [memory obligations](memory_rag.md)
    - test whether compaction loses deferred work beyond the nearest continuation
    - separately test removing information derived from withdrawn sources
  - [security after edits](generated_artifacts.md)
    - track known vulnerabilities across a sequence of requested feature changes
    - compare recorded obligations against accumulated regression tests
  - [agent recovery](recovery.md)
    - caution: [the reliability study](reliability_long_horizon.md) reports this pilot is largely already done by others
    - inject a lost response after a committed tool action
    - check whether restarting duplicates the action
- these preferences are agent recommendations
  - novelty and value depend on pilot results and missing-prior-work checks

study tree

- [memory, partial compaction, and RAG](memory_rag.md)
  - managed memory, compression, obligations, source invalidation, and poisoned retrieval
- [browser agents](browser_agents.md)
  - interfaces, training, branch replay, discovered APIs, prompt injection, and independent grading
- [coordination and specialization](coordination_specialization.md)
  - role separation, matched budgets, worker failures, changing authorization, and domain specialists
- [generated executable artifacts](generated_artifacts.md)
  - security, repeated repair, artifact provenance, and reproducible research outputs
- [evaluation validity](evaluation_validity.md)
  - an earlier worker's review of weak tests, grader exploitation, leakage, and human baselines
  - resumed worker corrected overbroad inferences and checked linked source identities
- [reliable news monitoring](news_monitoring.md)
  - company-news sources, changing evidence, corrections, duplicate alerts, and verified origins
- [agent security](agent_security.md)
  - prompt injection, sandbox escapes, untrusted agents, and malicious skills and tools
- [systems infrastructure under agents](agent_systems_infrastructure.md)
  - sandboxes, rollback, scheduling, tool interfaces, crash recovery, and environment building
- [agents following long written rules](policy_following.md)
  - rule fade over long sessions, generated guards, and rule loss when one agent briefs another
- [what agents do to the web](agents_and_the_web.md)
  - AI crawlers, agent traffic, files sites publish for agents, and AI search citations
- [reliability over long tasks](reliability_long_horizon.md)
  - repeated-run reliability, compounding errors, and honest status after faults
  - reports that a Sep 2026 preprint (LIMBO) already ran most of the recovery pilot below in simulation
- [agents doing research and engineering work](agents_for_research_work.md)
  - human attention across many agents, checkable agent reports, and agents reproducing systems papers
- [recovery after uncertain action outcomes](recovery.md)
  - a narrow fault-injection workload supporting the broader coordination proposal
- [consultation and review](consultation.md)
  - advisory opinions and verification limits

how to read the evidence

- exact source phrases are linked beside the finding
- author reports describe their evaluated models, task sets, and budgets
  - they are not measurements of present products
- reading depth is stated in each study
  - abstract-only cards need full-paper reading before their results drive an experiment
- experiments described here have not been run
- continuation checked on 8 October 2026
  - [successful cross-topic advice and assessment](../more_topics/chatgpt_review.md) supports screening browser replay first
  - inspect the method's supported contract before treating a repeated write as a research gap
  - news monitoring and selected full defense methods were added and independently reviewed
  - recommendations remain conditional on strong baselines and reproducible failures
- original sources checked on 7 Oct 2026 UTC; news/security continuation checked on 8 Oct
  - web search failed; direct primary-source retrieval and existing local papers worked
  - coverage is substantial but not exhaustive through that date
  - no absence-of-prior-work claim is warranted

scope

- extends the human's [agent frontier](../../../agent_frontier.md), [memory](../../../agent_memory.md), [browser](../../../browser_agent.md), specialization (local source: `../../../specialized_agents.md`; not published in this study), handbook (local source: `../../../handbook.md`; not published in this study), [RAG](../../../rag.md), and [generative AI](../../../gen_ai.md) notes
- formal verification, Rust, distributed systems, web measurement, and generated-text detection have separate workers
- this study does not alter the daily proposal pipeline or the verified-Rust experiments
