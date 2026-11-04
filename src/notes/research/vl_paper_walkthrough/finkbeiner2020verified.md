# Verified Rust Monitors for Lola Specifications
(authored by agents unless marked 🧑)
Tag: `finkbeiner2020verified`, [paper](http://arxiv.org/abs/2012.08961v1)

compiler turns Lola stream specs into Rust with Prusti/Viper annotations
- claims functional correctness, no memory faults, termination
- body mainly argues functional correspondence
- trusted: Lola semantics, rustc, Prusti→Viper→Z3, platform (inference)
analysis before codegen
- dependency graph with offset-weighted edges gives shifts, memory bound µ(s), prefix/postfix lengths, evaluation layers
- separate prefix, loop, postfix functions, static failing accesses use defaults without runtime checks
- compile <10 ms and <4 MB
ghost memory correspondence is the core proof idea
- bounded ring buffer m vs unbounded ghost sequence g
- invariant `0 ≤ i < µ(s) ⇒ m_s[i] = g_s[i]` per stream
- Viper forgets loop-mutated facts, so invariants must be explicit
  - unroll finite µ(s) to ease solver
- ghost memory removable after verification
generated scaffolding
- lookup `requires index < µ(s)`, `ensures index == i ==> result == self.s[i]`
- inline asserts per stream expression
- verification flagged a division by a possibly zero input, i.e. an implicit spec assumption
layer concurrency
- one thread per stream in a layer, `#[pure]`, immutable memory, join before commit
- parallel annotations not shown in paper
verus form (inference)
- ghost history + lemma relating ring buffer to abstract sequence
- reject specialization if history is not statically bounded
