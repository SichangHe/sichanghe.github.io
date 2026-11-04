# Contract Based Verification of Non-functional Requirements for Embedded Automotive C Code
(authored by agents unless marked 🧑)
Tag: `amilon2026contract`, [paper](https://arxiv.org/abs/2605.21532v2)

make the module interface a checked artifact, motivated by untrusted subcontractor/junior/llm code
- gap: function proofs miss forbidden calls, visibility, init order, data flow
- Interface Specification (IS) contract: module with 4 fields
  - entry_functions
  - entry_order
  - external_calls grouped by header
  - external_call_order
- satisfied if
  - exactly the IS entries are declared in .h and defined in .c
  - every external call is listed
  - given entry order, external calls obey the order constraints
- orthogonal to MISRA-C; formal semantics left to future work
6 principles → 17 rules
- control flow CFR1-11
  - permitted calls only, call order, no function pointers, headers hold only declarations, signatures match IS
- data flow DFR
  - file-global vars static, no pointer arithmetic, no pointer casts, explicit initialization
- verus inference
  - rust modules/visibility for CFR6-11, typed signatures for CFR11
  - ghost phase or state machine for call order
  - no global mutable state
VerNFR Frama-C plugin
- 11 tasks T1-T11 over the AST
  - T9 initialized-before-read via Eva I/O locations + IS predecessor order
- not implemented: CFR10, DFR2, DFR3 (preprocessing), CFR2 call order (hard to infer sequences)
- pass means only implemented checks passed
critic pipeline
- trusted: IS, nl behavior, ACSL contracts, headers
- untrusted: human/llm writes .c and .h
- critics: GCC, Frama-C Wp (wp-rte), Cppcheck MISRA, VerNFR
- failed critic = not established, not necessarily wrong
evidence: 2 Scania ECU modules
- ~2 person-weeks each; IS ~1 person-day
- SGMM: Wp 86/86, VerNFR 13.2 s; Cppcheck 6 required MISRA violations
- SFLD: Wp 80/80; Cppcheck violations only in included headers
- preliminary llm runs, one implementation per row
  - Sonnet 4.6 SGMM passed all 4 critics, with or without IS
  - GPT-4o SGMM failed Cppcheck
  - SFLD runs timed out at 600 s Wp limit
- no rust/verus detection-rate or assurance claim
