# Code-Augur: Agentic Vulnerability Detection via Specification Inference
(authored by agents unless marked 🧑)
Tag: `luo2026codeaugur`, [paper](https://arxiv.org/abs/2606.18619)

agentic audit loop: reason, falsify, refine
- llm turns its security assumptions into executable invariants
  - when a site looks secure, record the assumptions as tagged source assertions instead of trusting the verdict
  - invariant must be security-relevant, tied to a trust boundary
- falsification is delegated to a grey-box fuzzer, not the agent
  - agent-written tests share the blind spots that produced the invalid invariant
  - fuzzer gets reachability/trip/distance feedback from the assertions (libFuzzer, Jazzer)
    - 16 libFuzzer counters per C/C++ invariant: 1 reach, 1 trip, 14 log-distance buckets
    - go and rust lack distance feedback
- llm triages each violation
  - genuine: keep as bug candidate
  - benign: invariant too strong, refine and loop
  - no witness found: invariant joins the surviving set (bounded search, not a proof)
threat model first
- built from source, docs, build config before local reasoning
- fields: attacker_control, in_scope, trust_boundary, security_relevant_state, out_of_scope
- reused for hypothesis generation, triage, and final validation
- risk: wrong boundary hides real bugs or creates false ones
poc validation
- report only bugs with a boundary proof-of-vulnerability under the declared attacker capabilities
- static candidates need a constructed boundary input; fuzzer candidates already carry a witness
results
- setup: claude sonnet 4.6 and deepseek v4 pro, 4 h, 12 cpu, up to $100 api per challenge
- aixcc (39 vulns, 9 projects), totals existing+new
  - code-augur 59 (claude) / 51 (deepseek)
  - claude code 44 / 36, atlantis 36 / 35
- osv (24 vulns, 9 projects)
  - code-augur 58 / 49, claude code 36 / 19, atlantis 29 / 10
- invariant trips found 21/59 and 17/51 (aixcc), 24/58 and 13/49 (osv)
  - nearly all of the claude-to-deepseek drop on osv is fewer invariant-trip finds
- real world: 22 new vulns on 7 projects, 16 fixed or confirmed, 2 cves, manually validated
example
- little cms: inferred fmt.channels = cs.channels, a 13-channel profile violates it, unpacking loop overruns a 4-byte buffer
- gpsd: satellites_visible <= MAXCHANNELS across 10+ consumers and 10+ producers
for verus
- inference: invariants map to ensures or loop invariants, but a fuzzer witness is a counterexample, not a proof
- inference: threat model maps to requires on entry points, ffi/environment stay assumptions
