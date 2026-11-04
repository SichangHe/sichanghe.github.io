# AutoTam: Specifying Secure Protocol Implementations with Tamarin Model Generation
(authored by agents unless marked 🧑)
Tag: `wilson2026autotam`, [paper](https://doi.org/10.48550/arxiv.2606.19937)

one protocol-specific DSL gives implementation, Tamarin model, and symbolic tests
- roles are states (output then input) plus transitions, calling predefined crypto/message/network functions
- same description is interpreted to run, translated to Tamarin rewrite rules, and run under KLEE
- Dolev-Yao symbolic adversary only; computational soundness out of scope
restricting control flow to a state machine makes extraction sound
- req 1: a transition must not overwrite variables live at a sibling transition
- req 2: no non-network failure (equality check, AEAD, signature verify) in output part
- then 1 extended transition (prev input, transition body, next output) = 1 Tamarin rule
- translation table: recv to In, send to Out, secrets to Fr, equality checks to action facts
soundness theorem is trace inclusion, not equality
- every concrete trace has a matching generated Tamarin trace
- proof: drop partial transitions (lemma 1), complete truncated traces (lemma 2), nondeterminism only adds traces (lemma 3)
- assumes well-formed programs and a faithful function translation table
- extra symbolic traces may remain
auto-generated lemmas
- weak secrecy and injective agreement from event names and agreement variables
- reachability lemma per handshake guards against vacuous proofs
- WireGuard still needed a manual sources lemma
evaluation is two case studies
- DH: roles 68 and 74 lines, model 107 lines, Tamarin under 5 s
- WireGuard: roles 222 and 243 lines, model 242 lines, Tamarin 359.62 s
- KLEE: 0 errors on all 4 roles; WireGuard responder 4,120 paths in 16 min 33 s
  - packets capped at 512 bytes, 1 transport message, so bounded evidence only
- omits WireGuard DoS mitigation, timed renegotiation, concurrent transport I/O, most transport lemmas
takeaways for verus
- generate the spec model from the same source as the implementation, with a trace-inclusion theorem
- check non-vacuity (reachability) before trusting a proved property
- verus cannot cover symbolic adversary or crypto soundness; that stays in Tamarin
