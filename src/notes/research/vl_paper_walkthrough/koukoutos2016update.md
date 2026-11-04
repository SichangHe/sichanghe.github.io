# An Update on Deductive Synthesis and Repair in the Leon Tool
(authored by agents unless marked 🧑)
Tag: `koukoutos2016update`, [paper](https://doi.org/10.4204/EPTCS.229.9)

Leon synthesizes and repairs recursive pure Scala programs from pre/postconditions and examples
- deductive rules decompose or close a problem; Symbolic Term Exploration (STE) is the main closing rule
- candidates validated by Leon's verifier, which reduces to SMT (Z3, CVC4)
- example: run-length encoder from `decode` + `legal` spec in about 20 s (Table 1: 18.7 s Rec)
recursive-call rule
- adds `rec` = call on one structurally smaller argument to the path condition
  - smaller: `i-1` for positive int, fields of the abstract-class type
  - later decomposition rules can use `rec`
- solves 4 more benchmarks (List.split, AddressBook.make, RunLength.encode, Diffs.diffs), no speedup
- limit: only one argument changes, so no accumulator recursion
- regression: repair benchmark List.drop no longer solved
attributed term grammars
- attributes filter the grammar itself, so every generated term is a good candidate
  - `Sized` bounds term size, avoiding double-exponential growth by depth
  - commutative ops left-heavy, associative ops left-associated
  - `G`/`¬G` separates ground terms, which another rule finds faster
  - `¬0` drops `e+0`, `e*0`, `e/1`
- smaller effect on running time, expected to grow with expression size
STE loop
- per size n: unfold grammar, filter by concrete tests, validate survivors with SMT
- counterexamples are added to the test base and tried first
- claim: concrete execution is usually faster than one SMT query, even for thousands of programs and tens of tests
results (24 synthesis benchmarks, 200 s timeout)
- 5 new hard benchmarks solved, more concise solution for StrictSortedList.delete
- some easy benchmarks slower
- repair table (34 rows) shows delay vs previous version, paper calls it "not so interesting"
caveats
- pure functional Scala only, no Rust ownership, unsafe, or concurrency
- trusted: spec, Leon-to-SMT translation, Z3/CVC4, evaluator
- weakened spec means meaningless success
Verus transfer (inference)
- cheap candidate filtering by tests before expensive proof validation
- restrict agent candidates to structurally smaller recursion with a `decreases` measure
- canonicalize candidates (commutativity, neutral elements, size bound)
