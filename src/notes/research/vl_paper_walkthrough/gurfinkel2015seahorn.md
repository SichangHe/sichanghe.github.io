# The SeaHorn Verification Framework
(authored by agents unless marked 🧑)
Tag: `gurfinkel2015seahorn`, [paper](https://doi.org/10.1007/978-3-319-21690-4_20)

llvm-based safety verifier using constrained Horn clauses (CHCs) as the intermediate language
- layers: front end (C to optimized llvm bitcode) / middle end (bitcode to CHCs) / back end (Spacer, GPDR; Ikos supplies invariants)
  - separates syntax, operational semantics, verification semantics
  - new language = new front end, engines reused
- evidence is experience + benchmarks, no theorem
  - SV-COMP 2015: 85% of max score in Device Drivers (BLAST 88%), 69% in Control Flow (CPAChecker 74%)
  - autopilot code: mnav 160K loc, paparazzi 20K loc
precision picked by memory model
- 3 tiers: registers only / + pointers without contents / + heap as non-overlapping arrays
  - heap partitioned by a context-insensitive Data Structure Analysis (Steensgaard-like)
  - paparazzi needed only pointers, mnav needed the heap model
- inference: start coarse, refine only when a proof fails for lack of state
mixed-semantics transformation lifts deep assertion failures to main
- each call becomes a nondeterministic choice
  - fail branch: inline the callee once, keep its assertions
  - success branch: normal call with assertions turned into assumes
- inlined bodies end in assume(false), only main's assertions are checked
- limit: recursion and indirect branches are not inlined
inter-procedural summaries avoid exponential inlining
- each call is a summary rule, so CHCs become non-linear
- error flags ein/eout propagate failure through calls
  - safe iff the query merr(true) is unsatisfiable
- Spacer keeps may (over-approximate) and must (under-approximate) summaries
model-based projection (MBP) eliminates existential locals lazily
- gives a quantifier-free under-approximation still satisfied by the current model
- arrays: replace array variable by fresh index/value variables, case split by the model
abstract interpretation feeds SMT checking
- Ikos domains: intervals, congruences, DBMs, octagons
- loop example: Spacer alone misses y >= 0 and diverges, Ikos alone proves it, Spacer + Ikos invariants proves it faster
- best configuration on autopilots: inter-procedural encoding + Ikos
numbers to distrust
- 215 hard benchmarks, 30 min limit: Spacer 21 safe / 74 unsafe, Z3-PDR 3 safe / 7 unsafe
- Table 2 gives a 43% warning rate for paparazzi.mixed, contradicting the text claiming proof for both
- results are tool- and benchmark-specific
verus analogues (all inference)
- ghost error flag + state machine for success/failure paths
- narrow requires/ensures per function replaces summaries
- machine-generated invariants enter as assert/lemma candidates, never trusted assumes
