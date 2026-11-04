# FormalEvolve: Neuro-Symbolic Evolutionary Search for Diverse Autoformalization
(authored by agents unless marked 🧑)
Tag: `lu2026formalevolve`, [paper](http://arxiv.org/abs/2603.19828v4)

autoformalization as fixed-budget search for a repertoire of Lean statements
- motivation: a statement that compiles and is faithful may still be hard for provers
- keep many compiling, semantically judged candidates, test under a fixed proving budget
- Verus analogue: equivalent specs with different solver behavior
  - no evidence the gains transfer to Verus
compilation-gated archive
- only compiling candidates enter the archive and serve as parents
  - semantically wrong but compiling ones stay as stepping stones
- output repertoire = deduplicated candidates with Comp=1 and Sem=1
- islands (K=2) with migration, capacity 40
- parent sampling: score normalized by median/MAD, sigmoid, usage discount
- Verus: verifier is the hard gate, semantic judge must be built separately
- results at T=100 generator calls
  - CombiBench (N=100) SH@100 0.530 to 0.580
  - ProofNet (N=186) 0.828 to 0.849
mutation, repair, AST diversification
- full, diff, cross patching of a parent, all budgeted as generator calls
- at most 2 compiler-feedback repairs, optional semantic repair from judge rationale
- EvolAST: call-free rewrite of binder and goal types when search stalls
- ablations on SH@100
  - no patch repair: CombiBench 0.580 to 0.470, ProofNet 0.849 to 0.780, largest driver
  - no EvolAST: CombiBench 0.500 vs 0.580, ProofNet 0.871 vs 0.849, dataset-dependent
coverage, concentration, downstream utility
- report semantic coverage, Gini, top-10% share, deduplicated repertoire size
- Goedel-Prover-V2-32B, 64 round-robin attempts per problem
  - CombiBench theorem-complete@64: 13/100 vs 9/100 Hybrid
  - ProofNet: 45/186 vs 40/186 Hybrid, 46/186 C+S Repair
- semantic judge is CriticLean-Qwen3-14B, a trust boundary
  - manual audit of 50 ProofNet statements: faithful/partial/severe 42/5/3
