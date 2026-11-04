# Foundational VeriFast: Pragmatic Certification of Verification Tool Results through Hinted Mirroring
(authored by agents unless marked 🧑)
Tag: `jacobs2026foundationalverifast`, [paper](http://arxiv.org/abs/2601.13727v1)

early result: VeriFast Rust verifier emits a Rocq proof script after successful verification
- problem: VeriFast is ~30K lines of unproved OCaml
- script proves the program correct against a Rocq axiomatic semantics (`AxSem`, Iris-based) of Rust MIR
hinted mirroring: record verifier decisions, replay in a small Rocq checker
- emits `bodies`, `preds`, `specs`, one `symex_trees` per function
- single goal `bodies_are_correct`
- hints: `ConsumeChunk(k)` names the heap chunk to match, `Done` marks an infeasible path
  - avoids rerunning SMT or satisfiability checks
  - hints are untrusted; replay checks each step
- tactic script is nearly just `repeat (split || intro || congruence || tauto)`
- `SymEx` replay soundness proved against `AxSem`
verification style: separation-logic symbolic execution
- heap = list of chunks; call consumes callee pre, produces post
- `open`/`close` ghost commands for predicates
- example: reversing a raw-pointer linked list via recursive `llist(head)`
- Verus differs: ownership plus `requires`/`ensures`, no `&*&` chunks
trust boundary still large
- `AxSem` not validated at all
  - known unsoundness: `StorageLive`/`StorageDead` ignored, all locals alive
- `bodies` and `specs` must be faithful; a false spec still certifies
- unsupported: loops, structs, generics, unwinding, inductive types, fixpoints, lemmas, fractional permissions
- evidence is qualitative (linked-list example), no benchmarks
- plan: compare with Radium or MiniRust semantics
