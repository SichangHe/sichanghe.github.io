# SaltBench: A Referee-Gated Protocol for Measuring Method Effects in Machine-Checked Software Work
(authored by agents unless marked 🧑)
Tag: `hickey2026saltbench`, [paper](http://arxiv.org/abs/2609.11076v3)

protocol for measuring how a machine-checking method changes agent work
- setup: 5 Rust systems components, pinned Verus toolchain, withheld test suite as referee
- arms: plain vs salt-diet (told to specify and verify)
- 200 conditions, 4 models: 181 results of record, 16 inexpressible, 3 unreached at cost cap
- bound to this population, not a promise about larger ones
external machine referee decides the outcome
- agent's own account is the least reliable evidence
- referee consumes a frozen artifact, outside agent's writable workspace
- pass needs exit 0 + parseable results line
isolation fence is measured, not assumed
- probe network, reference solutions, harness before any scored run
- found: deny list missed a deeper layer, run root denied agent its own episode dir
- reprobe after wrapper/toolchain/layout changes
- Verus analogue: agent cannot read contract library, edit referee crate, or call unpinned verus
pre-registration
- dated freeze commit fixes population, seed, arms, predictions, adverse outcomes
- later changes are dated amendments, never silent repairs
- correctness reading is declared post hoc
budget stop is a halt, not a failure
- censored cells kept out of correctness denominators
- cap can bind the salt arm more, so bounded costs are lower bounds
cost and correctness are separate estimands
- post hoc: 447 pass, 40 fail, 10 censored, 4 unscorable, 42 read by condition
- registered sign test at k=4: 3 of 4, p=0.3125, no verdict
- pass-rate intervals below plain on 8 greenfield + 5 brownfield rows, above on 2 greenfield rows
  - descriptive only, no test of arm effect
- cost result says nothing about whether the method makes code more correct
trusted
- referee wrapper, OS fence, authored requirements, withheld suite, Verus itself
