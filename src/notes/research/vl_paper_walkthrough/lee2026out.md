# Formal Verification of an Out-of-Order Multiprocessor against an In-Order Weak-Memory ISA
(authored by agents unless marked 🧑)
Tag: `lee2026out`, [paper](http://arxiv.org/abs/2607.18727v1)

Lee and Kang prove unbounded single-issue OoO RISC-V multiprocessor ⊆ weak-memory ISA in Rocq
- theorem: n · Core_i + ShMem ⊆ ISA
- 64k lines of Rocq, trace inclusion only, liveness out of scope
  - TCB: Rocq kernel, Fjfj semantics, primitive modules, Theorem 1 definitions
refinement is transitive and composable, so build through intermediate specs
- bottom-up module specs, then Core_i ⊑ Core_s, then chain n · Core_s + ShMem ⊑ TopMod ⊆ ISA_CF ⊆ ISA
- pipelining is the proof difficulty, the verbose interface only adds length
serial core spec Core_s hides speculation
- one program-order list split into retired prefix and in-flight suffix
  - squash rules remove transient excess behavior
  - stable instruction index as identifier
folded pipeline views
- relate one abstract step to several internal stages
  - ALU folds reservation station and exec queue
  - memory unit: abstract retired = LSQ list ++ store-buffer list
simulation invariants for early or late events
- implementation retires earlier than spec: lsq_map, ret_map to flight/retire, None for squashed
- acquire-fence mismatch: intermediate Core_s^f with live flag, then eager-retirement refinement
stable identifier reservation prevents ABA
- LSQ reserves a load index until its response drains
- invariant: index map injective
option-lifted preconditions
- spec state lifted to option, violated precondition goes to None
- Verus already has requires/ensures, so this is only needed for a totalized model
LLM agents wrote most Rocq proofs, humans designed impl, specs, invariants
- 1 week core refinement, 3 weeks system, under 1 day for most modules, 3 days LSQ
- agent may not edit impl or spec, reports counterexample when goal unprovable
  - kernel-checked, so accepted proof is correct however found
Verus takeaways (inference)
- ghost state machine for the abstract view, spec fn relation, explicit transition lemmas
- Verus lacks built-in LTS refinement, encode relation and chain by hand
