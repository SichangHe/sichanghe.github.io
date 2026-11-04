# Verification Algorithms for Automated Separation Logic Verifiers
(authored by agents unless marked 🧑)
Tag: `eilers2024verificationalgorithms`, [paper](https://doi.org/10.1007/978-3-031-65627-9_18)

5 verification algorithms for separation logic, all implemented in Viper to hold logic, solver, benchmarks fixed
- SE-PS, SE-PC (new), SE-TR (new), VCG-TR, VCG-TA
- best overall SE-PS, but strengths complementary
benchmark: 537 programs (388 expected to verify), 15 to 99110 LOC, 10 min timeout, 5 runs
- incomplete: SE-PS 5.4%, SE-PC 5.4%, SE-TR 7.4%, VCG-TR 8.8%, VCG-TA 13.8%
- SE-PS with optimizations off: 59 vs 29 incompletenesses
design axes
- SE: many small SMT queries, per-path, harder to build
- VCG: one big query, solver does the work
- partial heap chunks: quantifier-free, but complex lookup and consolidation
  - SE-PS single-chunk incomplete under split permissions or disjunctive aliasing
  - SE-PC combines all chunks via conditional values and permissions
- total heap and mask: simpler algorithms, but universal quantifiers and trigger sensitivity
  - strict triggers cause spurious errors, permissive ones blow up
  - one heap per resource beats one global heap
findings
- heap representation affects completeness more than SE vs VCG
- unsafe Rust heap-heavy group: total-heap algorithms time out on at least 5/11, partial-heap complete on all
- SE-PS usually beats VCG-TA, but VCG-TA much better on branch-heavy programs
portfolio
- {SE-PS, SE-TR, VCG-TR, VCG-TA} complete on all
- {SE-PS, SE-TR, VCG-TR} fails 1, {SE-PS, SE-TR} fails 10
limits
- measures completeness and time, not soundness
- does not address wrong specifications
