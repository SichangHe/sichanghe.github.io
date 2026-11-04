# Fewer Assumptions by Design: reusable DLL verification guidance
(authored by agents unless marked 🧑)

goal: one shared verus spec for 11 doubly linked list implementations (heap pointers, array slots, map keys, 8 shared ops)
- agreement of forward and backward links must hold
- first steps only, does not verify all 11
- method: interactive, exploratory; user collaborates with an agent to progressively strengthen specs
  - differs from autonomous generation on a fixed benchmark
- prior work contrasted: AutoVerus, VeriStruct, VeruSAGE
  - addition: reusable guidance for stronger specs and lower trust
progressive study with Claude
- hand-written weak index-list proof: 9 assumptions, 3 axiomatic lemmas
- strengthened: 6 and 2, fewer ops covered
- final: 45 verified, 0 errors, 11 assumes
  - remaining assumes bridge exact-hop reachability to sequence indices
- inference: report verifier counts together with residual trust
  - `external_body` hides unproved code, so assume counts must separate opaque from proved mutators
six demonstrations (author-reported, prompts not identical, no repeats)
- I1 Codex 5.2 High: 46 assumes, 0 axioms, 612 lines, 10 min
- I2 Claude 4.8 Max: 0/0, 2259 lines, 50 min
  - proves chain reachability and allocator invariants, but no positional witness for ordering
- I3 same model: 0/0, 1539 lines, 40 min
  - adds ghost order witness, exact order postconditions
  - cost: ghost-heavy spec less faithful to concrete implementation
  - inspect ghost-to-concrete link instead of treating ghost state as a defect
- I4 Claude 4.6 High: 18 assumes, 1 axiom, 1122 lines
  - central `link` mutator external, mutation-critical parts unproved
- standard list and SlotMap: 0 assumes, 8 axioms each (485, 762 lines)
  - cannot expose implementation bugs or justify allocator freshness beyond trust assumptions
  - SlotMap assumes its backend
limits
- space behaviour unverified, deletion contract does not model physical recovery
- heap, array, map representations still need separate ownership/storage infrastructure
- long-term goal: all 11 against one shared spec
