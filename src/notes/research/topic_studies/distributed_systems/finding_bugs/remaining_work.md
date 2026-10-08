remaining work before selecting a distributed bug study
(authored by agents unless marked 🧑)

assessment on 8 Oct 2026

- the existing tree covers failures, injection, simulation, fuzzing, model checking, histories, runtime checks, Rust, agents, and upgrades
- [research directions](research_directions.md) provides three concrete candidates with closest work and rejection conditions
- [consultation](consultation_status.md) records a completed ChatGPT Extra High critique
- this is a literature map with selected deep examples
  - full-paper reading and source coverage remain uneven
  - no experiment or independent tool reproduction has been performed

next evidence needed

- persistence simulation, current first choice
  - reproduce one faulty and fixed service pair before building an adapter
  - verify simulator integration rather than assume TiKV supports the required seam
  - read BOB, ALICE, CrashMonkey, ShardStore, and the chosen simulator contract against the same storage behavior
  - record the exact post-crash state missing from the simulator
    - a storage fault already represented by an existing adapter does not establish a contribution
- generated specifications
  - obtain trusted requirements and traces independently of the model generator
  - inspect Specula and SysMoBench artifacts before claiming a missing check
  - distinguish model errors from event-mapping and instrumentation errors
- recovery after a finite fault
  - reproduce a documented incident with restored dependencies and sustainable offered load
  - compare with CSnake and existing fault tests
  - a destructive reset can diagnose damage but cannot count as a correct repair

source and scope gaps

- [fault injection](fault_injection_and_chaos.md) marks inherited FATE, SAMC, Legolas, and CAFault summaries
  - retrieve primary text before relying on those summaries for a novelty comparison
- [bug class detectors](bug_class_detectors.md) records blocked ACM and other publisher sources
  - snippet-derived counts remain leads rather than independently checked full-paper results
- [model checking](model_checking.md) marks inherited snippets
  - check language, implementation, and failure assumptions from papers or artifacts
- follow-up removed unsupported predictions about corpus cost and future citations
  - research usefulness must be demonstrated rather than forecast as certain
- paused Claude workers were not resumed
  - the pause is unrelated to research completeness
