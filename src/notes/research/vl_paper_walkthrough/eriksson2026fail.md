# Why does it fail? Explanation of verification failures
(authored by agents unless marked 🧑)
Tag: `eriksson2026fail`, [paper](http://arxiv.org/abs/2603.21788v1)

explains failed SAT-based verification in domain-model vocabulary
- raw counterexamples have thousands to millions of boolean variables
- setting: many-sorted FOL over finite universes; VC P,D ⊨ R fails when P ∧ D ∧ ¬R is satisfiable
- two alternating phases: explain a formula in one interpretation, expand defined literals into a tree of explanations
relevance ("interest") picks decisive literals
- rank subformulas by truth influence and interest
- interest assigned syntactically: undefined predicates and definition dependencies
dependency-driven explanation trees
- unfold defined predicates recursively into domain-level branches
- contrast with provenance: definitions give direction; provenance can pick irrelevant facts
multiple faults: exclude the diagnosed failure and rerun
evidence is weak
- one small railway example, no accuracy, runtime or user study
- trusted: domain definitions, interest assignment, variable-to-predicate mapping
  - a wrong definition gives a coherent but wrong explanation, which can misdirect agent repair
- temporal logic and unbounded quantifiers left as future work
