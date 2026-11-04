# Multi-Grained Specifications for Distributed System Model Checking and Verification
(authored by agents unless marked 🧑)
Tag: `ouyang2025multigrained`, [paper](https://doi.org/10.1145/3689031.3696069)

mixed-grained specs balance state explosion against model-code gaps
- fine specs explode the state space
- coarse specs leave gaps to the code
- compose fine specs for changed modules with coarse specs for stable ones (Remix, TLA+/TLC, ZooKeeper)
  - module choice is manual
interaction-preserving coarsening
- keep the target module's dependency variables and all interaction variables
- hide variables with no external effect
- no abstraction-refinement relation holds with the code
  - instead, traces projected onto the target module are equal (proof sketch, assumes deterministic updates)
- verus analog (inference): prove projection-preserving coarsening, then prove invariants separately
conformance checking closes the model-code gap
- sample model traces randomly, replay in instrumented code with a central scheduler and fault injection
- report a discrepancy on a variable mismatch or a missing code action within 50s
- found wrong message types, branches, assignments
- incomplete: random exploration, safety only, unsound for unmodeled behavior
results
- six severe bugs found violating five invariant types, fixes merged into ZooKeeper
  - 2 known, 4 new; detection in 9-109s
- fully fine-grained baseline did not finish in ten days
- verus caveat (inference): model-to-code mapping and runtime hooks stay trusted assumptions
