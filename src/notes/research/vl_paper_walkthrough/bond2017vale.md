# Vale: Verifying High-Performance Cryptographic Assembly Code
(authored by agents unless marked 🧑)
Tag: `bond2017vale`, [paper](https://www.usenix.org/conference/usenixsecurity17/technical-sessions/presentation/bond)

vale = annotated assembly -> AST + Dafny proofs, checked by Z3 against crypto specs and a machine semantics
- trusted assembly printer emits MASM or GNU asm
- 4 case studies: ARM, x86, x64, AES-NI x86
- trusted: crypto specs, Dafny, asm semantics, printer, assembler; vale and analyzer are outside the TCB
architecture-neutral instruction contracts
- datatypes for regs, operands, state(ok, regs, mem), plus `evalCode`
- `ok` flag: ∀s2. evalCode(c, s1, s2) ⇒ s2.ok proves no crash
- each instruction is a procedure with reads/modifies/requires/ensures, proved against `evalCode`
  - so instruction specs need not be trusted
- higher-level procedures compose via generated Dafny lemmas
- Verus analog (inference): explicit machine state, `spec fn` effects, `proof fn` composition
prove before specializing
- `ghost` params = proof-only; `inline` params = compile-time specialization (path select, loop unroll)
- generic procedure verified for all inline values, then code is printed
- unrolling first is too slow
  - 100 unrolled x86 adds: 58 s
  - AES key expansion, 10 iterations: 2300 s vs 105 s before unrolling
  - some AES inversion cases fail unpredictably after unrolling
verified taint analysis for leakage
- leakage-free = non-interference: equal public inputs + equal traces => equal public outputs + traces
- ghost trace records branches, memory addresses, variable-latency instruction inputs
- flow-sensitive dataflow, 2-point lattice Public/Secret, loops iterated to a fixed point
- soundness proved once: analyzer `LeakageFree` ⇒ `isLeakageFree`
  - sound but incomplete, so `False` is not a leak proof
- loads/stores annotated public/secret; functional proof tracks ghost `pubaddrs`
- found state leakage in OpenSSL SHA-256 ARM
  - caller regs + 16 words of the expanded last block left on the stack
  - stack scrubbing made both state and side-channel freedom pass
- cost: all Dafny verification 35.3 min, taint analyzer 4.3 min
- taint analyzer size: 217 spec, 1276 impl, 2116 proof lines
reuse across ISAs
- SHA-256 spec and abstract lemmas shared by ARM and x86
- Verus analog: algorithm `spec fn`/lemmas separate from ISA adapters
performance
- verified AES-CBC up to 9% faster than OpenSSL
- OpenSSL asm beats its C SHA-256 ARM by up to 67%, AES-CBC x86 C by 247-300%
- caveat: vale AES-CBC lacks OpenSSL's 4-ciphertext parallel mode
