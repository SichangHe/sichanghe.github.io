# Smart Casual Verification of the Confidential Consortium Framework
(authored by agents unless marked 🧑)
Tag: `howard2024smartcasual`, [paper](http://arxiv.org/abs/2406.17455v2)

production workflow for ccf (63-kloc c++): tla+ spec + model checking + trace validation + tests
- found 6 subtle bugs before production impact
- no rewrite of the implementation
two specs
- consensus spec: 1,134 lines, 17 actions, 13 variables
  - checks log consistency, append-only committed logs, 27 more properties
  - ~10^8 states in tlc, needs bounds on terms/requests/reconfigs
- client-consistency spec: append-only history + log branches
  - strict serializability for committed rw txs, serializability for ro txs
  - 12-step counterexample found in 4 s shows ro txs are not linearizable
    - authors keep the behavior; the spec communicates it
trace validation
- "checks that every observed implementation trace matches a behavior of the system's high-level specification"
- constrain spec actions by trace events; need nonempty intersection of behaviors
- 15 log statements in the scenario driver; preprocess away bootstrap events
- loop: map happy-path trace, run tlc, inspect longest partial behavior, fix spec or code
mismatch repair
- compose actions with different atomicity (e.g. UpdateTerm + HandleAppendEntriesReq)
- compose fault actions for unlogged message loss
- finite stuttering for one spec action split over several events
- reconstruct other clients' txs from observed ids
verus transfer (inference)
- ghost state machine for protocol, predicates over histories for client view
- runtime trace checks sample executions; cannot replace proofs
- tlc exploration does not carry over; verus needs inductive invariants
