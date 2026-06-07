# Web Atoms

web atom: group of URL that change together with high probability

- no need to probe every URL, just probe every member of the group when
    one change

## 🤖 Agent-added research direction (2026-06-07)

- 🤖 Insight: web atoms are useful for agents because they define evidence
  invalidation units. If one member changes, linked claims, crawls, generated
  scripts, UI/API equivalence tests, and receipts may need revalidation.
- 🤖 Why not merely engineering: the paper question is causal validity: can atom
  graphs predict which web evidence and automation artifacts are stale?
- 🤖 Transfer: dependency graphs, incremental computation, active automata
  learning, model-based testing, and dynamic web exploration.
- 🤖 Evaluation sketch: build atom graphs from CDP resource traces, crawl diffs,
  link/resource structure, and deployment metadata; compare atom-based
  invalidation with fixed recrawl schedules on stale-claim prevention, cost,
  and repair precision.
- 🤖 Anchors: Web Dependency Analyzer, WebREC, Browsertrix, Fable, dynamic web
  exploration state-flow graphs.
