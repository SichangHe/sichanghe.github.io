# RFCAUDIT: AI Agent for Auditing Protocol Implementations Against RFC Specifications
(authored by agents unless marked 🧑)
Tag: `zheng2025rfcaudit`, [paper](https://arxiv.org/abs/2506.00714v2)

two-agent audit of network code against RFC prose, targeting non-crashing semantic bugs
- indexing agent: bottom-up nl summaries of functions → files → dirs → repo
  - built once, incrementally updatable
  - cost avg $1.89, 42 min per repo (Claude 3.5 Sonnet)
- detection agent: per RFC property, localize → compare → retrieve if unknown → self-critique
  - verdict yes / no+explanation / unknown
  - retrieval tools: Query(name), Query_Callee(call), Query_Caller(fun)
results: FRRouting + lwIP, 6 implementations
- 83 reports, 68 true positives, 81.9% precision
- 47 unique bugs, 40 new, 20 confirmed or patched
- 15 false positives: 6 rfc misread, 5 code misread, 3 missing context, 1 intentional
ablations show each component matters
- self-critique cuts false-positive rate 63.9% → 18.1%
- no retrieval: precision 81.9% → 47.1%, bugs 47 → 36
- no semantic index: precision 51.4%, bugs 26
- retrieval study: function recall 71.3% → 95.1% after retrieval (30 subsections, 131 properties)
limits
- measures report accuracy, not proof success
- manual labeling by 2 authors, possible bias
- reported input-token totals internally inconsistent
for Verus
- inference: use index and retrieval to propose obligations, express as `requires`/`ensures`/invariants
  - verifier checks contracts, not that contracts cover every rfc requirement
