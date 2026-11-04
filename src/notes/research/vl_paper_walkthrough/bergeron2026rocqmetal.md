# From Rocq to Metal: A Pipeline for Formally Verified Microcontroller Firmware
(authored by agents unless marked 🧑)
Tag: `bergeron2026rocqmetal`, [paper](https://arxiv.org/abs/2606.02651v2)

firmware logic as pure Rocq state machine
- step : State x Event -> State x list Effect
  - effects are data, interpreted outside the proved core
- proofs cover parser and transition function only
  - deserialize_preserves_data: bytes not dropped or reordered
  - check_encoding_spec: memo bytes are ASCII
  - signing only from PendingTx, by simpl; discriminate
- example app is a toy, not tied to a real crypto protocol
  - ~400 lines verified Gallina, ~575 lines unverified Rust
  - ran on Ledger Flex hardware, other measurements on QEMU Cortex-M
- verus analogue (inference): State/Event/Effect datatypes, requires/ensures on parser and step
extraction to Scheme, run on Encore! no_std CPS VM
- 256 registers, no call stack, mark-compact GC, bump heap
- vs modified CertiRocq runtime on 7 benchmarks
  - rbtree-100: CertiRocq ~63 KB heap exceeds 50 KB RAM, Encore! 3,671 B
  - flash ~18 KB flat vs 6 KB to 146 KB growth
  - less heap in all cases except fsm, build time 1.3x-665x better
  - restricted CertiRocq runtime, not a fair GC comparison
explicit trust chain
- trusted: Rocq kernel and extraction, Scheme frontend, Encore! compiler (9 CPS passes in Rust) and VM, Rust compiler, callbacks, poller, interpreter, hardware
- crypto primitives (hash, CRC, field ops) admitted as axioms plus host callbacks
- compiler and VM proofs left as future work
