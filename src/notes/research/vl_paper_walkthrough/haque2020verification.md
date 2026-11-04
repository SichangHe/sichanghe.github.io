# Verification of a Generative Separation Kernel
(authored by agents unless marked 🧑)
Tag: `haque2020verification`, [paper](http://arxiv.org/abs/2001.10328v2)

verify a generator's outputs: conditional parametric refinement (muen, spark ada)
- problem: muen turns an xml policy into a kernel system, so proving a family of programs
- kernel = parametric program, generated tables/mappings are parameters
- prove once: concrete Q[V] refines abstract B[U] when condition R holds
  - obligations: type compatibility, initialization, simulation under gluing relation pi
- per policy: separate checker validates R
  - R is assumed in the proof, not a theorem about the generator
- 12 configs proved, seeded undeclared sharing detected
- ~20K lines source+annotation, 3-4 person-years
- z3, cvc4, alt-ergo; post-facto verification of an existing system
combined-state proof
- run abstract and concrete op in one program with disjoint state
  - prove pi plus equal outputs per op
- tick-event proof 8 subcases, interrupt-event proof 5
- concurrency ignored
virtualization as ordinary state
- model vmx registers, vmcs, page tables, translation as program state
  - trusted: hardware behaves as modeled
policy checker
- checks injectivity, permissions, validity, contents in O(Nu + P) per subject
  - Nu is used space, not 256-TB address universe
  - read-only sharing allowed
- 16 configs, avg 5.6s, flags the 3 seeded-fault configs
security by refinement
- derive no exfiltration, no infiltration, temporal separation from simulation plus injective mappings
- kernel integrity only via injectivity check
- covers error-free traces of the abstract model only
verus relevance (inference)
- Q and B as rust structs, spec fn for R and pi, proof fn per operation
- checker loops need invariants, still needs trusted policy parser
