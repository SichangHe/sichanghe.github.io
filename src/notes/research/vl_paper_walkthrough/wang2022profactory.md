# ProFactory: Improving IoT Security via Formalized Protocol Customization
(authored by agents unless marked 🧑)
Tag: `wang2022profactory`, [paper](https://www.usenix.org/conference/usenixsecurity22/presentation/wang-fei)

typed dsl + staged verification turns protocol specs into checked c (iot bluetooth/zigbee)
- pipeline: specify msg formats, sockets, state transitions -> z3 model check -> generate c -> verify c -> deploy
- dsl: bounded fixed/variable fields, headers, params, param lists, nested msgs, conn/chan types, state/recv/send transitions
  - only homogeneous conn/chan kinds
  - no cipher suites or flow control; crypto delegated to lower layer
  - l2cap example: hundreds of c lines -> 31 dsl lines
generator derives safety from the model
- bounds/validity checks from field ranges, kernel sk_buff bounds, mutexes for shared mux data, fragmentation, timers
- cve-2017-1000251 (unchecked append into 64-byte buffer) precluded by required max param-list size
- trust: platform wrappers and model-to-code correspondence are assumed
generated c is verified by off-the-shelf tools
- vcc: lock claims and ownership annotations prove race/deadlock freedom of channel-list and channel access
  - relies on mock apis and vcc lock model
- frama-c/acsl: pointer-validity and separation preconditions, loop invariants and variants
  - proves no overflow, invalid deref, leak, use-after-free, double free
  - sk_buff manually simplified once
- z3 on dsl model, loops unrolled 10, paths <= 15 transitions
  - checks reachability, transition coverage, no conflicting transitions, race-free sends, deadlock-free receives, consistent security level
evidence
- 8 generated bluetooth/zigbee protocols passed all checks
- 82 cves counted as averted (81 table entries + motivating cve)
  - validated by poc or manual patch inspection
  - cve search may be incomplete
verus transfer (inference)
- parser = fn with requires on buffer/length, ensures on exact consumption
- loop invariant + decreases for param loops
- ffi/allocator contracts stay trusted
