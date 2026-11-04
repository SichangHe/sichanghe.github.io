# A Polymorphic Intermediate Verification Language: Design and Logical Encoding
(authored by agents unless marked 🧑)
Tag: `leino2010polymorphic`, [paper](https://www.semanticscholar.org/paper/7f8db62d17088defaa56f949d7ee0406d6a60715)

Boogie 2 is an IVL between source front ends and SMT solvers
- adds impredicative higher-rank polymorphism, polymorphic maps, type quantification, type checking
- front ends: Spec#, VCC, HAVOC, Dafny
- two translations of typed expressions into simply typed logic
polymorphic maps model typed heaps
- HeapType = [α][Ref, Field α] α
- maps are first-order individuals with select/store
- extensionality not assumed; user axioms for it remain assumptions
- Verus (inference): no impredicative quantifiers or polymorphic map encoding; keep type invariants in Rust types
types encoded as first-order terms
- sorts bool, int, U (individuals), T (types); type: U→T
- per-constructor function C# plus unique Ctor constant gives disjointness, selectors give injectivity
- only most-general map types get constructors; else incompleteness
- no correctness proof for encodings; omitted axioms (e.g. well-foundedness) not expected to help solvers
type-guard translation
- guards like type(x) = [[t]] on quantified vars, result-type axiom per function
- "rather naive": complicates propositional structure, many extra axioms
type-argument translation
- type params become explicit leading function args, triggers type-specific
- depends on e-matching; not for superposition provers
- Z3 2.0, >10,000 VCs, 120s timeout
  - VCC (7840 VCs) avg: guards 3.447s, args 2.181s, no types 2.196s
  - guards ~55% slower on VCC, similar on HAVOC
  - on Z3 1.3 Boogie tests, args (1.212s) slower than guards (1.107s)
encoding must preserve triggers
- else too many (poor perf) or too few (incompleteness) instantiations
conclusion: advanced IVL types are desirable and feasible
- unsound "No Types" is only a baseline
- trusted: Boogie, Z3, front ends, user axioms
- agent risk (inference): inconsistent ghost type/map axioms, solver blowup from too many quantified facts
