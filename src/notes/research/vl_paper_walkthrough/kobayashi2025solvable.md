# Solvable Tuple Patterns and Their Applications to Program Verification
(authored by agents unless marked 🧑)
Tag: `kobayashi2025solvable` , [paper](https://doi.org/10.48550/ARXIV.2508.20365)

solvable tuple patterns (STPs) infer list relations from positive samples only
- pattern `(p1,…,pk)` = constants, sequence vars, concat, reverse; denotes a k-ary relation
  - e.g. `(l1,l2,l1R l2)` = output is reverse(in1) ++ in2
- conjunctive STP (CSTP) = intersection of STPs
- TPinf rewrites sample matrix by stripping shared prefix/suffix/columns until stuck
  - gives a minimal STP, nondeterministic polynomial time
  - CTPinf intersects results of all rewrite sequences, gives least CSTP covering data, can be exponential
- sequences: sound, complete, learnable from positive samples, decidable, polynomial-size characteristic data
  - multisets: minimality fails, characteristic-data result weakened
least CSTP model for CHC solving
- loop: find tuple satisfying a definite clause but absent from candidate, add as positive sample, rerun CTPinf
- once definite clauses hold, check goals
  - failed goal only means no CSTP model exists, not a concrete counterexample
shape + length combination
- STPs can't express arithmetic like `take n l`/`drop n l`
- abstract `[]→0`, cons→`1+y`, solve integer CHCs, conjoin model with STP relations
  - abstract goals are neither stronger nor weaker than originals, so recheck original goals
CHoCoL results (445 CHC-COMP 2025 ADT-LIN list instances, 3 min limit)
- 180 SAT + 80 UNSAT = 260 solved, 97 SAT uniquely
  - list-STP mode 89 SAT (50 unique), list-length 78 (42 unique)
- +Catalia: 278 solved
- unsolved SAT cases involve sort/filter/map/fold, relations STPs can't express
limits
- targets functional lists; mutable Rust lists need an abstraction step (e.g. RustHorn, speculative)
- learned relations can be too weak; length equality loses order and content
for Verus
- inference: use STPs to propose `spec fn` relations over slices/concat/reverse for contracts and loop invariants
  - Verus still proves them; no native STP learner exists
