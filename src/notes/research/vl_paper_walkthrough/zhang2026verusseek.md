# VerusSeek: Retrieval-Augmented LLM-Based Proof Synthesis for Rust Programs
(authored by agents unless marked 🧑)
Tag: `zhang2026verusseek`, [paper](https://doi.org/10.1145/3832783.3834603)

task: fill missing invariants, assertions, lemmas, proof blocks in Verus programs
- code and contracts given
- every candidate checked by Verus, diagnostics drive repair
index verified Verus code as semantic proof constructs, not whole files
- types: contracts, assertions, loop invariants, lemmas, proof blocks
- metadata: type, span, enclosing function, verification status
- query type inferred from failing program and verifier error
  - `while`/invariant errors to invariant and contract chunks
  - `proof fn` to lemmas and proof blocks
  - failed `assert` to assertions and proof blocks
- bounded hierarchical context expansion: enclosing contract, companion invariants
structural loop hints from syntax
- bounds from guards and array accesses
- frame conditions for unmodified inputs
- `decreases` from progress variable
- complements retrieval; analyzer rules not given in the paper
verifier-guided generate-repair loop
- run Verus, retrieve, hint, LLM patch, repeat within budget
results: 150 non-trivial VerusBench tasks, gpt-4o, at most 3 attempts
- VerusSeek 122/150 (81.3%)
  - AutoVerus 69, RagVerus 85, Basic RAG 78, Chunked RAG 95
  - 104 first attempt, 13 second, 5 third
- deepseek-v3.2: 116/150 vs Chunked RAG 87
- ablation uneven
  - hints add 27 tasks overall, 26 on MBPP
  - Diffy: Chunked RAG 35/38 beats VerusSeek 32/38
  - Basic to Chunked: Diffy +30, MBPP -12
- cost per task ~$0.31 gpt-4o, ~$0.01 deepseek-v3.2
