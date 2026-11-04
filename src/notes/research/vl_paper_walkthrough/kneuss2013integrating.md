# On Integrating Deductive Synthesis and Verification Systems
(authored by agents unless marked 🧑)
Tag: `kneuss2013integrating`, [paper](http://arxiv.org/abs/1304.5661v1)

Leon: synthesis + verification for recursive Scala-subset programs over unbounded ints and ADTs
- synthesis problem = relational postcondition `choose`; solution = precondition P + term T
  - obligations: relation refinement and domain preservation
- output proved against the spec when verification succeeds
  - 15 of 18 benchmark rows proved; 3 only manually inspected
  - verification timeout 3 s
- trusted: Leon verifier, Z3, Scala front end, evaluator, abstraction fns (`value`, `content`, `isSorted`)
- verus form: generate bodies from `requires`/`ensures`, refine with verifier counterexamples
validated deduction rules
- one-point, ground, case-split, recursion rules, each valid independently of context
- weak specs yield useless programs, e.g. split returned `(lst, Nil)`; spec strengthened twice
  - relational spec correctness vs intent never tested
symbolic term exploration
- typed nondeterministic term generators encoded in SMT
  - formula grows exponentially with depth
  - concrete execution often rules out all candidates first
- failure to find a program does not show none exists (bounded depth)
condition abduction CEGIS
- rank typed expressions on examples, abduce branch guards excluding counterexamples
- 18 benchmarks (lists, sorted lists, unary numerals), 0.3 to 87.7 s
anytime AND/OR search
- cost = program size; user may interrupt and get a program with remaining `choose` holes
