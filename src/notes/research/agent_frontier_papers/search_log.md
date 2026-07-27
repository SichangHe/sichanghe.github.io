# agent-frontier search and selection log 🤖

scope

- research date: 2026-07-26 PDT
- evidence window: 2024-07-26 through 2026-07-26
  - one older-boundary anchor retained only where control evidence required it
- fixed result: 22 papers
  - 21 accepted or published papers
  - 1 authoritative first-party report also posted as a preprint
- evidence families
  - long-horizon planning and tool use
  - software engineering and coding
  - web and computer use
  - scientific and research work
  - memory, learning, and adaptation
  - multi-agent coordination
  - evaluation and reliability
  - safety, security, and control

route and artifacts

- searches used the persistent default personal Chrome session over local CDP
- the Etsy and Texas-proxy lanes were not used
- exact queries and UTC capture times are in [search_queries.tsv](search_queries.tsv)
- raw result captures remain under `/ssd1/sichangheagent/work_logs/agent_frontier_20260726/browser_searches/`
- official-page captures remain under `/ssd1/sichangheagent/work_logs/agent_frontier_20260726/source_pages/`
- selection decisions are in [selection_ledger.tsv](selection_ledger.tsv)
- browser-backed ChatGPT discovery timed out after 300 seconds
  - it supplied no selection evidence
  - the diagnostic is `/ssd1/sichangheagent/work_logs/agent_frontier_20260726/chatgpt_discovery_diagnostic.json`

search design

- queries 01–08 scanned official venue and publisher domains by evidence family
- queries 09–20 checked 2026 recency and acceptance of core candidates
- queries 21–35 closed science, multi-agent, memory, security, and reliability gaps
- queries 36–39 resolved control coverage and duplicate OpenReview records
- candidate inclusion required at least one of
  - a premier accepted result that materially changes the capability map
  - a necessary negative-evidence or measurement anchor
  - a first-party report that materially shaped frontier evaluation
- breadth was capped when another selected paper covered the same claim more directly
- accepted records were preferred over rejected duplicate submissions

status corrections

- UltraHorizon is an ICML 2026 regular paper
  - selected record: `qRNtMWrTvo`
  - rejected ICLR record: `FTZfVHWAIq`
- SWE-Bench Pro is an ICML 2026 regular paper
  - selected record: `uEVTdoAbnK`
  - rejected ICLR record: `9R2iUHhVfr`
- BrowseComp is not counted as accepted evidence
  - status: OpenAI first-party technical report and arXiv preprint
- some Google result labels displayed the current conference-site year beside older paper paths
  - acceptance status was therefore checked against proceedings or OpenReview records

known collection limits

- this is a defensible premier-paper set, not an exhaustive census
- the fixed breadth cap omits accepted alternatives including AndroidWorld, RiOSWorld, Agent Security Bench, LongMemEval, and WebCoach
- absolute scores are model, scaffold, budget, environment, and benchmark-version dependent
- several benchmarks are public and may enter training or agent-development feedback loops
- direct cross-paper ranking is usually invalid
  - task distributions, time limits, tools, graders, and success definitions differ
- the newest 2026 papers have less independent replication
- the search was English-first and web-index dependent
- source-page extraction was incomplete for some dynamic proceedings pages
  - the official SWE-Lancer page triggered a Unicode-surrogate serialization failure
  - its official PMLR PDF was still retrieved and extracted
- residual uncertainty is highest for very recent accepted 2026 work and high-impact preprints that search indexing may not yet surface
