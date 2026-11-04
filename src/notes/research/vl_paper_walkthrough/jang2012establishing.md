# Establishing Browser Security Guarantees through Formal Shim Verification
(authored by agents unless marked 🧑)
Tag: `jang2012establishing`, [paper](https://www.usenix.org/system/files/conference/usenixsecurity12/sec12-final217.pdf)

formal shim verification: verify only a small kernel mediating untrusted components
- QUARK browser: Coq-verified kernel, tabs/input/output/cookie processes sandboxed
- 859 lines kernel code, 4,383 lines proofs, covers ~969k lines WebKit
- properties: response integrity, tab non-interference, socket/cookie isolation, domain-bar integrity
  - tab NI covers interference by the kernel only, not network or cookie processes
trace-based spec in two phases
- phase 1: implementation satisfies trace spec (Ynot pre/postconditions, opaque `traced tr` for real history)
- phase 2: trace spec implies security properties, no monad reasoning
  - later domain-bar proof took ~300 lines
- proof-only trace in kernel state, invariant `traced tr ∧ tcorrect tr`
- external nondeterminism captured in the request
domain policy enforced at kernel
- tab has fixed domain suffix, sockets only to subdomains, else `GetURL` without cookies/headers
- manual CDN whitelists widen the suffix
- limit: isolation is per domain not per frame, compromised subframe can leak tab cookies; no mashups, third-party cookies, postMessage
lesson
- build unverified prototype first, keep kernel simple, put complexity in untrusted tabs
Verus transfer (inference)
- enums for messages, `Seq<Action>` trace, loop invariant tying state to valid trace
- external effects need contracts justifying their trace actions
