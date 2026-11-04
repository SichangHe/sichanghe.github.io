# LIGHTYEAR: Using Modularity to Scale BGP Control Plane Verification
(authored by agents unless marked 🧑)
Tag: `tang2022lightyear`, [paper](http://arxiv.org/abs/2204.09635v2)

assume-guarantee decomposition: global BGP property reduced to local checks per router/edge
- Verus lesson (inference): per-component invariant, prove each transition preserves it, prove target invariant implies global property
  - BGP traces and SMT stack are outside Verus
safety checks per edge A→B, solved with SMT
- import: route in I_{A→B} gives rejected or in I_B
- export: route in I_A gives rejected or in I_{A→B}
- originate: every originated route in I_{A→B}
- final: I_target ⊆ P
- external edges unconstrained
- sound for infinite traces and arbitrary failures (safety)
ghost attributes add proof-only route fields
- example: FromISP1 set by import filters, used for no-transit
- do not affect routing or the soundness proof
liveness: user gives a path and good-route set C_i per hop
- propagation checks per hop + no-interference safety check per router
- needs no link failure only along the path
- first-hop assumption cannot be proved when from an external router
counterexample-guided invariant refinement
- failed check gives concrete route map and input route
- many simple properties beat one combined property (easier to debug, faster)
evidence
- cloud WAN (hundreds of routers): 11 latent config bugs in peering policies, 1 bug for reused IPs
  - 15 min worst single property, 16 min for four properties, sequential
- synthetic full mesh no-transit: size 100 in 5.5 min, Minesweeper not done in 2 h at size 40
  - separate implementation on Minesweeper's parser
  - checks linear in nodes+edges
trust
- parser, Zen, Z3, simplified BGP model, user invariants, external-route assumptions
- proofs not machine-checked
- main risk: wrong invariant that still composes
