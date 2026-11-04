# PROVE-RT: Generating Mechanized Theorem Prover Scripts for Real-Time Systems using LLMs
(authored by agents unless marked 🧑)
Tag: `shahriyar2026provert`, [paper](https://www.semanticscholar.org/paper/cdb0a57a95e3002a31ff1d8e847dec6032b95804)

prove-rt: llm turns real-time schedulability papers into checked prosa/rocq proofs
- core difficulty: recover implicit definitions, dependencies, proof obligations from prose
- pipeline
  - extract invariants + informal sketches + dependency dag (gemini-2.5-flash)
    - validate names: exact, normalized, fuzzy (> 0.88); reject cycles, > 0.15 unresolved
  - retrieve prosa docs per sketch (5,097 fragments), recover prerequisites recursively
  - skeleton first: full declarations/contexts, proof bodies Admitted
    - typing a statement is easier than finding a proof strategy
  - fill proofs one block at a time, in dependency order
    - integrity checker rejects changed theorem, new axioms, leftover Admitted, proof burden moved to new lemmas
    - repair from compiler error + location, roll back on budget exhaustion
- corpus: 1,191 papers, 13,134 invariants; eval 300 sketches from 109 papers
results
- success = all sections compile in order, no Admitted, checker clean
  - dense retrieval 134/300 (44.7%), bm25 126/300, hybrid 123/300
  - direct gpt-5 0/300, claude-opus-4.6 1/300
- section-level numbers use another denominator (hybrid 608/1,393)
- deeper dependency chains lower success
takeaways
- staged skeleton + integrity-checked proof filling is the transferable design
- compiled proof may formalize the wrong reading of the paper
