# RustAssure: Differential Symbolic Testing for LLM-Transpiled C-to-Rust Code
(authored by agents unless marked 🧑)
Tag: `bai2025rustassure`, [paper](https://arxiv.org/abs/2510.07604v1)

rustassure = llm c-to-rust transpile, checked by differential symbolic execution against the c original
- outputs semantic similarity score S3 = graph edit distance between symbolic return values and output params
  - S3 = 0 means equivalent output value, not equivalent function
- compositional: callees abstracted as symbolic-return stubs
- evaluation: 5 codebases (libcsv, urlparser, optipng, libbmp, u8c), 176 c functions, 4 models
  - compilable: GPT-4o 158 (89.8%), 4o-mini 146, GPT-3.5 124, Claude-3.5-Sonnet 85 (48.3%)
  - equivalent outputs: 72% / 74% / 71% / 80%; claude high rate pairs with low compilability
  - bugs: 12 complex + 13 simple, recurring across models in 20 and 17 functions
  - libopenaptx vs FLUORINE: 33 symbolic passes of 38 compilable; fuzzing passed 10 of 31
transpilation front end (untrusted in a verus setting)
- expand headers, drop unused defs with Clang ASTMatchers
- translate each struct once into a cache, reuse in every function prompt for consistent field names
- infer use of ambiguous fields: buffer `char*` to `Vec<u8>`, string to `String`
- chunk oversized functions; on compile error send c plus diagnostics back for repair
- retranslate if result uses `unsafe`, up to a limit
symbolic checking
- instrument both sides with symbolizer prologue (symbolic args, depth 10) and epilogue (log returns, outputs, modified struct fields)
- compile both to LLVM IR, run KLEE 3.1, 180 min timeout
- parse KQuery into graphs, compare with networkx edit distance; no SMT, strict equivalence future work
language-aware normalization
- drop rust overflow-check and integer-extension nodes
- `#[repr(C, packed)]` on every struct to align layout
  - inference: packed removes padding, so does not generally match c layout
- `Option` cast to inner type; strings/slices via data pointer (slice length 100); `Vec` element-wise compare
divergence diagnosis
- found missing pointer increment in `scan_option` (`ptr+3` vs `ptr+2`)
- found wrong conditional in `csv_set_blk_size` (c tests `p` non-null, rust tests `p.blk_size != 0`)
- utf-8 bug: rust omits reset of `val`, returns `0x02` not `0xC2`
- precision 85.7% (libcsv), 88.2% (u8c); recall 100% on manual review of those two only
- semantic feedback to llm is proposed, not implemented
limits
- claim of proving all inputs equivalent exceeds the depth, timeout, stub, and normalization assumptions
- c memory-corruption bugs absent in rust cause false positives; KLEE array optimizations too
- verus takeaway
  - treat c reference, foreign stubs, and ub as separate trusted assumptions
  - prove an abstract value relation instead of a graph-distance threshold
  - turn each mismatch into a failing assert or regression lemma; do not weaken `ensures` to silence it
