# Compositional Reasoning for Side-effectful Iterators and Iterator Adapters
(authored by agents unless marked 🧑)
Tag: `bila2022compositional`, [paper](https://arxiv.org/abs/2210.09857v1)

modular spec of Rust iterators whose closures and adapters mutate state, in Prusti
- goal: expose yielded values and accumulated effects, stay reusable in arbitrary chains
- ingredients: 4 ghost functions, closure call descriptions, snapshots, ownership
four-state iterator contract
- ghost functions
  - `produced(Ik)`: sequence returned before state Ik
  - `completed`: next returns None
  - `step(Ik, Ik+1, v)`: one call
  - `leadsto(Ik, Il)`: reflexive transitive closure of step
- 5 postconditions on `next`
  - Q1 establishes step
  - Q2 completed iff None
  - Q3 produced unchanged after completion
  - Q4 appends a value before completion
  - Q5 completion monotone
- clients keep `leadsto(initial, current)` as loop invariant
- assumes next is the only mutator, else every mutator must preserve leadsto
- Verus (inference)
  - produced as ghost `Seq<T>`, spec fns for the rest, Q1-Q5 as `ensures`
  - Verus ownership gives the interference control
closure call descriptions
- record closure pre-state, argument, post-state, result
- Map step: predecessor yields arg, `FnMut::call_mut` transforms it and changes captures
- example: running total maps [6,2,9] to [6,8,17], proves sequence and final sum
- closure contracts written manually; inference for simple closures is "orthogonal"
- Verus: no built-in call-description syntax, encode invocation relation explicitly (inference)
compositional ghost histories
- adapter specified only via predecessor contracts
- ghost seq `st` of (closure_state, iterator_state) tuples
  - leadsto requires old st be a prefix of new st
  - `st.len() == produced.len() + 1`
- "neither the input iterator nor the adapter need to be re-verified when forming an iterator chain"
- assumes fused iterators
- Verus: ghost Seq histories with `is_prefix_of` and quantified index lemmas (inference)
snapshots and out-of-band contracts
- snapshot: whole tree-shaped value as math value ignoring addresses, so two-state predicates are plain ghost fns, SMT-friendly
- `IteratorSpec` extension trait plus `#[extern_spec]` with `type_dependent`, no change to existing Iterator code
- contracts must refine base: weaker pre, stronger post
evidence and limits
- 7 implementation tests and 7 client tests, no aggregate success rate
- ~340 LoC common specs; library specs roughly one-to-one with code
- times (7-run avg): counter 9.53 s, double 9.95 s, map 42.12 s, zip 84.46 s
- filter examples hand-encoded in Viper due to Prusti issues
- authors suspect slow outliers need quantifier-instantiation control (Sec. 8)
- trusts Prusti soundness and user-supplied closure contracts; no kernel-checked proofs
