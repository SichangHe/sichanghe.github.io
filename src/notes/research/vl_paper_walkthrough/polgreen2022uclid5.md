# UCLID5: Multi-modal Formal Modeling, Verification, and Synthesis
(authored by agents unless marked 🧑)
Tag: `polgreen2022uclid5`, [paper](https://arxiv.org/abs/2208.03699)

uclid5: one language for procedural + transition-system models, with SMT verification and SyGuS synthesis
- supports hoare proofs, k-induction, bmc, hyperproperties, synthesis
- pipeline: parse, typecheck, inline, symbolic simulation, emit SMT-lib or SyGuS-if
- tcb: external solver, front-end translation, oracle binaries
multi-modal modeling
- Boogie-style procedures plus `init`/`next` modules
- loops: unroll, or replace with user invariants
SyGuS invariant synthesis
- declare `synthesis function h`, conjoin in a non-inductive invariant, solver (CVC5) fills the body
  - fibonacci example finds `h(x, y) = x >= 0`
hyperproperties via self-composition
- `hyperinvariant[2]` over two module instances
- trusted-access-protection case study: 2765 lines, 49 s vs Boogie 1840 lines, 51 s
  - integrity proof: 293 lines, 30 s vs Boogie 835 lines, 346 s
  - single models, not averages
- Verus: encode two ghost state copies, prove a relational invariant; no hyperinvariant keyword
oracle functions
- external binary queried by the solver for hard-to-model parts
- lti example synthesizes controller gains `k0`, `k1` with bmc over 10 steps
