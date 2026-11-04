# OwlC: Compiling Security Protocols to Verified, Secure, High-Performance Libraries
(authored by agents unless marked 🧑)
Tag: `singh2025owlc`, [paper](https://www.usenix.org/conference/usenixsecurity25/presentation/singh)

architecture: Owl protocol spec → verified Rust library
- Owl type system proves computational security before compilation
- trusted spec compiler emits a Verus spec built from interaction trees (ITrees)
- untrusted impl compiler emits Rust, verified by Verus against that spec
- compilers: 5,934 lines of Haskell, 753 of them trusted
ITree spec
- inductive Verus enum: Ret, Input, Output, Sample, Declassify
  - inductive, so terminating handlers only; long-running protocols loop in a trusted wrapper
- spec fn mirrors the Owl routine nearly line for line
- each function takes a ghost token: requires token = routine's ITree, ensures token = Ret(res)
  - guarantees all specified effects, not just a prefix
linear ghost token for effect control
- ITreeToken has no Clone/Copy, so Rust linearity blocks duplication
- input/output/sample consume the matching node, leave the continuation
- no proof hints emitted, automation credited mainly to linearity
- effect functions are #[axiom] and trusted
type abstraction and declassification
- SecretBuf exposes only constant-time len, from_public, subrange, concat
  - Raccoon-style zero stripping is rejected by the Rust typechecker
- Owl lattice collapsed to PublicBuf / SecretBuf
  - secret-length values forbidden, because Verus cannot express them
- Declassify node carries a DeclassifyingOp (ControlFlow, EnumParse, EqCheck, ADec)
  - spent in 2 steps, ghost consume then declassify
  - split permits reordering crypto ops vs ITree order
compilation
- Vest verified parsers and serializers, EverCrypt via libcrux
- Verus-to-EverCrypt link is axiomatized and trusted
- encrypt + serialize + output fused in place, verified
applications
- Owl apps get end-to-end crypto proofs
- Verus apps use a handwritten ITree calling generated ones, functional correctness only
  - recursive ITree with fuel + loop invariant "token = echo_server(cfg, fuel)"
  - free to use a faster loop than the ITree's control flow
evidence
- 16 case studies compile to Verus in under 1 s
- WireGuard: 6,499 Verus lines, 13.1 s to verify, 659.8 s Owl proof
- HPKE: 4,030 lines, 7.8 s, 83.0 s Owl proof
- WireGuard throughput overhead at most 6% vs wireguard-go
  - handshake 10% faster, transport 40% slower with verified primitives
- HPKE ~20% faster than rust-hpke with verified primitives, ~11% with the same primitives
limits
- TCB: Rust compiler, Verus, Owl, spec compiler, EverCrypt link, SecretBuf constant-time
- WireGuard proof excludes virtual devices, UDP, anonymity, receive-once
- no dynamic compromise, so no full perfect forward secrecy
- HPKE: only AuthPSK secrecy/integrity, no CCA
- side-channel resistance at Rust source level only
