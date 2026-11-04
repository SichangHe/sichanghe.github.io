# Ownership guided C to Rust translation
(authored by agents unless marked 🧑)
Tag: `zhang2023ownership`, [paper](https://arxiv.org/abs/2303.10515)

Crown: retypes c2rust raw pointers into safe Rust via ownership inference
- ownership monotonicity: along an access path, ownership only decreases
  - `O_p >= O_q` if `p` is a prefix of `q`
  - avoids full alias analysis
  - may reject schemes rustc accepts
- inference
  - MIR access paths, one Boolean ownership var each
  - constraints: assignment (Box move), call, alloc/free, φ joins, loops (body once)
  - 3-var `Ov = Ow + Ou` and unit constraints, solved by SAT
  - NP-complete; no satisfying scheme means leak or monotonicity violation
- rewriting
  - owning non-array pointer to `Option<Box<T>>`
  - output param to `Option<&mut T>`
  - arrays and local borrows stay raw `*mut T`
  - uses via `take`, `as_deref_mut`, `as_ref`, `Box::from_raw`
evidence, 20 benchmarks (154 to 537k LoC)
- median reduction: 37.3% mutable raw-pointer decls, 62.1% raw-pointer uses
  - brotli (largest) only 21.4% / 20.9%
  - beats Laertes in most rows, not lodepng
- 6 benchmarks with tests all pass; whole suite under 60s
trust boundary
- neither sound nor complete by the authors' own statement (Sec 7.2)
- trusted: c2rust, MIR analyses, rustc as post-check, allocators
- unsupported: function pointers, unions, variadics, array metadata, custom allocators
Verus relevance (inference)
- shrinks unsafe surface before verification; proves no functional correctness
- residual raw pointers need modeled contracts
