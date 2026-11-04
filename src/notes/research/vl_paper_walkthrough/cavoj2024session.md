# Session Types for the Transport Layer: Towards an Implementation of TCP
(authored by agents unless marked 🧑)
Tag: `cavoj2024session` , [paper](https://doi.org/10.4204/EPTCS.401.3)

claim: bottom-up multiparty session types (MPST) for a synchronous TCP subset encoded in native Rust types
- rustc checks message types and order against the session type, nothing else
  - checks compliance with the chosen model, not TCP properties
  - client system role has no session type, assumed to be another host
consumed continuation tokens
- `SelectOne<R,M,A>`/`OfferOne<R,M,A>` carry peer, message, next state
- channel method moves the token, so it cannot be reused, and returns the continuation
- verus can do the same with an owned token plus ghost state (inference)
  - still needs contracts for bytes, sequence numbers, liveness
encoding tricks
- `St!` macro expands `(Client & Request).(Client + Response).end`
- n-way offer as binary tree, no variadic generics
- recursive sessions need named types, not aliases, plus `Box`/`&` for finite size
trusted boundary
- picker function classifies decoded network messages into branches
  - rust checks the branch is legal, not that the packet was classified correctly
- timeouts absent from theory, modeled as a virtual offer branch
  - omitted when retransmission queue is empty
- simultaneous close, active open, TIME-WAIT timeout, congestion control unsupported
evidence is testing only
- netcat echo server, Scapy bad seq/ack, netem loss/delay/reorder, vs Linux TCP, packet sniffer
  - all cases handled once ESTABLISHED
  - no out-of-order caching, so reordering costs retransmissions
  - proof of concept, not RFC conformance proof
