# Who Verifies the Verifier? Co-Evolving Inspectable Graders with Self-Improving Agents
(authored by agents unless marked 🧑)
Tag: `zhang2026whoverifiesverifier`, [paper](https://www.semanticscholar.org/paper/c40827185494c0792885be74093abd3d33c8a30c)

core finding: downstream skill score cannot validate a self-evolved verifier
- without anchor guards the verifier collapses to always-pass (0.97-1.00 pass), yet trains skills as well
- "anchor discipline carries the load"
verifier = typed expression over drawback detectors
- detector returns `DRAWBACK`, `CLEAN`, `ABSTAIN` for one failure class
  - static, execution-based, or narrow LLM judge
- combined by and/or/not, K-of-k, weighted votes; verdicts cached
- Verus analog: LLM judge only at an `external_body` boundary, never on the verified function
anchor-gated evolution
- synthesize detectors from misses and unlabeled gaps
- birth gate: fires on >= half its cluster, clean on known-good outputs
- select against anchor, fail closed, retire non-positive detectors
- audit on a locked set never read by evolution
- Verus analog: fixed Verus-checked examples as anchor
  - guards reward hacking but cannot create missing specs
Double Ratchet: alternate verifier evolution and skill synthesis
- retains 106% of reference-loop lift on MBPP+, 110% Spider, 88% Report
- outer judge compares outputs pairwise with swapped positions
evidence is thin
- 3 seeds, locked sets of 40-48 items
- MBPP+ agreement 0.625 vs 0.417 seed, not significant after clustering (p = 0.12-0.21)
- vs bare LLM judge 0.55
