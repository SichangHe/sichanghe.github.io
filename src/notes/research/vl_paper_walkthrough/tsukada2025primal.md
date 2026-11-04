# A Primal-Dual Perspective on Program Verification Algorithms
(authored by agents unless marked 🧑)
Tag: `tsukada2025primal`, [paper](https://arxiv.org/abs/2501.01512)

claim: one Lagrangian framework unifies verification searches that alternate proof candidate and counterexample
- L : X × Y -> P, P a totally ordered complete lattice
  - primal inf_x sup_y L, dual sup_y inf_x L; weak duality always, strong duality = equality
- generic loop (Algorithm 1)
  - dual witness beta with inf_x L(x,beta) >= 0 certifies the property
  - else get delta with L(delta,beta) < 0, update alpha (join if semilattice)
  - primal witness alpha with sup_y L(alpha,y) <= 0 gives upper bound
  - else get gamma with L(alpha,gamma) > 0, update beta
- progress: one side join semilattice + monotone/antimonotone L, always update by join
- termination not general
  - gap sup inf < 0 < inf sup blocks both returns
  - strong duality alone insufficient
  - stratified layers (finite height, smallest-layer choice, positive witness exists) give conditional termination
instances
- CEGAR: X = traces, Y = predicate sets
  - dual check = abstract safety, primal check = refinement
  - restricted predicate language loses strong duality: safe system may lack expressible proof, returns unknown or diverges
- ICE: X = finite subsystem info, Y = candidate invariants
  - teacher = dual check, learner = primal check
- primal-dual Houdini: Cartesian invariant search on system S and induction-dual system I
  - both sides join semilattices; symmetric, swap S and I flips sign
- termination
  - ranking-function ICE: dual check reduces to safety on pair-state system
  - disjunctive CEGAR: set R of ranking functions, relation needs decrease for every pair i<j (Terminator, Podelski-Rybalchenko)
- quantified LRA: strategy skeletons replace infinite Skolem functions with finite term choices
  - SAT skeleton checked by SMT after expansion, UNSAT skeleton from countermodel; termination via finite term vocabulary (Farzan-Kincaid)
- fixed-point logic solver MuStrat: skeletons + disjunctively well-founded relations
  - angelic branching is unsound if choice sees history; fix with function of real state only
evidence
- MuStrat (Spacer backend, 300 s, StarExec): 335 termCOMP, 202 MuVal, 47 game benchmarks
  - solves 6 and 7 instances MuVal times out on, slightly fewer total than MuVal on each set
  - rpgsolve solves all but 2 of the games
- IC3/PDR and MuVal Lagrangian analyses left to future work
takeaway for verified-Rust proof search (inference)
- accumulate candidates under a proved monotonicity condition
- restricted proof vocabulary can leave search inconclusive even for safe programs
- no Verus encoding or validation in the paper
