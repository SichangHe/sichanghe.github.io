# Computer-Assisted Verification of Four Interval Arithmetic Operators
(authored by agents unless marked 🧑)
Tag: `ishii2020computer`, [paper](http://arxiv.org/abs/2003.10623v2)

goal: verify WhyML interval + - * / over IEEE-754 floats with Why3
- 3 properties: validity, soundness (enclosure), tightness; division also checks zero-denominator exception
- no empty intervals; division by interval containing 0 throws
- result: whole code proved with Alt-Ergo + Coq
layered contracts
- implement with Float64.t and explicit rounding
- P_V pre, Q_S, Q_T, Q_Z posts
- Why3 wp generates VCs, each sent to Alt-Ergo or Coq
- hard VCs split manually in GUI
  - mult soundness: 2 VCs timed out at 10 min, split into 26
  - compared no split, full split, cost-optimal split; division timed out with no split and full split
solver-supporting arithmetic lemmas (main takeaway)
- SMT fails on nonlinear float VCs even when the math fact is simple
- add real-number lemma to the module, e.g. Rmult_le_compat
  - prove it in Coq when SMT cannot
  - it discharged 2 stuck VCs; 4 more lemmas for mult soundness
- 19 extra lemmas total
- reusable part is the math lemma; triggers and Coq handoff do not port to Verus
NaN-aware extremum spec
- min2 ignores NaN; min4 nests min2; max4 likewise
- lemmas min4_feq, min4_fle with triggers
- tightness split into min4/max4 postconditions plus all-NaN case requiring zero interval
- branch-specific rounding lemmas closed the last 4 VCs after 10 min timeouts
evidence and limits
- Alt-Ergo, split-optimal: add 24.7 s, sub 47.0 s, mult 140 s, div 578 s
- Z3 proved only 1/8, 1/10, 48/100, 2/33 of full-split VCs
- Why3 1.1.0, Alt-Ergo 2.2.0, Coq 8.8.0, Z3 4.7.1, 10 min per VC
- rounding operators are trusted C code at extraction
- no Rust ownership, unsafe, concurrency, or spec adequacy
Verus takeaway (inference)
- put enclosure in requires/ensures over a math interval model
- proof fn lemmas expose monotonicity facts to Z3
- model NaN with an explicit enum or predicate
- branch-heavy numeric code stays proof-costly; lemma libraries pay off
