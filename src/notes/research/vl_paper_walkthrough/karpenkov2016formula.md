# Formula Slicing: Inductive Invariants from Preconditions
(authored by agents unless marked 🧑)
Tag: `karpenkov2016formula`, [paper](http://arxiv.org/abs/1609.09288v2)

formula slicing: weaken a loop precondition until it is inductive
- precondition comes from the preceding program fragment
- smt counterexamples choose which lemmas to drop
selector-based weakening (Algorithm 1)
- put formula in relaxed cnf so each lemma is independently removable
- annotate lemma `li` as `si ∨ li`, assuming `si` removes it
- query `φ ∧ τ ∧ ¬φ'`, drop lemmas falsified in the counterexample, repeat
- strongest weakening in a linear number of smt calls
  - optimality proof cited from Flanagan et al., not given here
abstract reachability tree for nested and irreducible cfa
- node = cfa location, abstract element, backpointer
- weaken against a sibling (acts as widening), stop when covered by entailment
- exponential blowup possible, authors say not seen with good iteration order
Slicer in CPAchecker, 2,120 SV-COMP driver tasks
- proves 22 programs predicate analysis cannot
- predicate analysis still gets most proofs: 1301 vs Slicer-CEX 1253
- syntactic variant faster, less precise
Verus inferences (not tested in paper)
- candidate invariant filtering as an external script rerunning verification
- every retained clause still needs initiation and consecution proofs
