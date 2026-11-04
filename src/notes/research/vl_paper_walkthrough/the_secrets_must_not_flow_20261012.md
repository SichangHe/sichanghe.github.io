# The Secrets Must Not Flow: Scaling Security Verification to Large Codebases
(authored by agents unless marked 🧑)
Tag: `arquint2026secrets`, [paper](https://doi.org/10.1109/sp63933.2026.00026)

Diodon: prove a small protocol Core, auto-check the huge Application
- evaluation in Go with Gobra, Tamarin, Argot; Verus mappings below are inference
- problem: verifying only the protocol module is unsound if other code logs keys, mutates state, or misuses APIs
- split: Core refinement proof in semi-automated verifier, whole-program static analyses for the rest
- refinement = trace inclusion: program I/O behavior contained in the model's
- soundness assumes no UB, no data races, sound tools
  - unsafe Go, cgo, reflection not handled
- symbolic model: perfect crypto, no timing side channels
protocol model + Core
- Tamarin model of roles and attacker, prove secrecy/agreement
- Core = syntactically isolated, minimal, holds all protocol state and protocol I/O
- separation-logic invariant plus pre/postconditions on every public Core API
- Core gets exactly the I/O permissions the role model justifies, at init
  - verification then implies Core does at most model-permitted I/O
- Verus form (inference): ghost tokens / linear resources for I/O permissions; custom bridge to Tamarin events
I/O independence by taint analysis
- sources: key generation, pre-shared keys, derived session keys
- sinks: all Application I/O, Core I/O without permission (Go: Capslock finds file/network/syscall/exec)
- no branching on tainted data without justified override
- model-permitted payloads sanitized as non-secret
- reject codebase if taint reaches a sink
- Verus form (inference): MIR-level whole-crate taint; types alone cannot track copies or serialization
discharging Application obligations statically
- ghost sets: per-thread local heap lhs, Core-invariant heap ihs, global shared heap ghs
- Core API contracts restricted: preserve invariant, full permissions in and out for pointers
- conditions C1 init, C2 no modification, C3 preservation, C4 locality, C5 callback, C6 parameter locality, C7 disjoint parameters, C8 Application access
  - checked by pointer, escape/thread-locality, pass-through analyses
- C5 (no re-entry in callbacks) not automated in the SSM case
- false positives on captured Core pointers and struct escapes needed rewrites or manual inspection
virtual I/O at module boundaries
- Core/Application calls and callbacks treated as protocol I/O events with permissions
- lets network send be far from message construction
case study: SSM Agent (100k+ LoC Go)
- Core 749 LoC, 3,825 spec/proof lines (1,064 generated from Tamarin)
  - Gobra 1.17 min, 12-state machine, serialization/channel ops axiomatized
- taint analysis 29.0 s, no flows found
- Argot Core-assumption checks 2.12 min, under 1.5 person-months
- effort: Tamarin <2, Gobra <3, I/O independence <0.5, Core assumptions <1.5 person-months
  - abstract's "<3 person months" covers Core verification only, not whole method
- found: Mallory-in-the-middle in earlier protocol (recipient identity missing from signatures)
- found: data race in earlier Core
- negative tests (inference): logging session keys fails taint; plaintext DH secret fails refinement
  - not a detection rate over a corpus
case study: signed DH
- Tamarin 177 LoC, 3.2 s; Gobra Core 178 LoC + 1,726 spec lines, 14.2 s; all static analyses 9.7 s
