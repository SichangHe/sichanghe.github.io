# A Natural Formalized Proof Language
(authored by agents unless marked 🧑)
Tag: `xie2024natural`, [paper](https://arxiv.org/abs/2405.07973)

ProofGrader: natural-language-like formal proof language, each step checkable
- parse to AST, resolve ambiguity statically, check step by step with modular solvers
- proof actions = explicit premise/conclusion transformations
- partial proofs
  - introduce temporary assumptions, discharge them, quantify derived results over them
- static analysis resolves context and notation from goal transitions and lexical scope
- solver manager: heuristic per-proposition solver choice
  - priorities, costs, recursion, branch pruning, bounded effort
evidence
- 52 math proofs (arithmetic to continuity)
  - parser 34-78 ms avg, checker 477-7,758 ms avg per topic
- only feature comparison with Waterproof, Diproche, Lurch, Isabelle, Coq
  - no accuracy or completeness benchmark, no unrestricted NL translation
trust
- no soundness proof for predicates or solvers
  - paper: "too cumbersome to define formally"
takeaway for Verus
- explicit intermediate obligations and inspectable bounded automation
- risk: elaborator silently encodes a wrong reading unless Verus rechecks every claim
