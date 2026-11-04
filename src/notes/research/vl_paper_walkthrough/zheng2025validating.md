# Large Language Models for Validating Network Protocol Parsers
(authored by agents unless marked 🧑)
Tag: `zheng2025validating`, [paper](https://arxiv.org/abs/2504.13515v1)

PARVAL: multi-agent differential check of a parser vs its rfc via a shared format spec
- both code and rfc lifted to the same DSL (3D, syntax-checked by EverParse), then compared
  - CodeSpec from code, DocSpec from rfc
- pipeline: retrieve parser code → isolate → extract specs → differential compare → manual triage
parser retrieval and isolation
- follow data/control dependencies and calls from entry parse function, Tree-sitter fetches definitions
- isolation agent writes standalone `(buffer, length) → bool` parser, build errors trigger more retrieval
- caveat: negotiated or config state can break isolation
CodeSpec refinement by tests
- generate symbolic positive/negative packets from spec, run on isolated parser
- positive rejected or negative accepted = semantic mismatch
  - instrument parser, feed trace back to spec agent
DocSpec from rfc
- BFD (RFC 5880): names 100% p/r, types 97.3% p / 97.7% r, constraints 100% p / 58.3% r
  - low constraint recall: many constraints implied, not stated
results: FRRouting 8.4 BFD parser, one protocol only
- 36 discrepancies, 34 true, 2 extraction errors (5.6% false positive)
- 7 unique implementation bugs (5 new), 2 rfc issues
- manual effort ~10 min to pick entry parser, ~20 min to triage
- authors: no soundness or completeness guarantee
for Verus
- inference: format spec as `spec fn` over byte sequence, prove parser `ensures` against it
  - generated tests give counterexamples, not equivalence
  - docspec is a candidate spec, needs human approval before proving
