# On Repair with Probabilistic Attribute Grammars
(authored by agents unless marked 🧑)
Tag: `koukoutos2017repair`, [paper](https://arxiv.org/abs/1707.04148)

repair as CEGIS over typed probabilistic grammars, in Leon (PureScala)
- spec: predicate, input-output examples, reference implementation, or a mix
- pipeline: test generation, fault localization, then synthesize a replacement expression
- loop: enumerate against finite example set A, verify universally, add counterexample to A
- accept only when verification succeeds
A* enumeration of partial terms
- partial terms with holes, cost = -log(probability), priority = cost + horizon
  - horizon = minimum cost to complete each hole, by fixpoint
- emits complete terms in decreasing probability (Theorems 2.1, 2.2)
  - assumes finite productions per nonterminal, unambiguous grammar, probabilities below 1
- partial evaluation prunes terms already contradicted by known inputs
  - score-based promotion voids Theorem 2.2
- generic productions: type set bounded, completeness abandoned
attribute and corpus grammars
- nonterminals carry attributes such as nonzero
- probabilities extracted from a code corpus, depth-1 (unconditional) or depth-2 (parent-conditioned)
- also extracts a grammar from the file under repair to bias toward local definitions
results (37 benchmark rows, timings exclude compile, test generation, verification)
- new enumerator slightly faster on built-in grammars
- depth-1 grammar solves a couple more benchmarks, fails one easy one
- depth-2 grammar generally bad
  - conflicts between corpus nonterminals and the file's nonterminals
- no overall success rate reported
corpus probabilities encode style, not correctness
Verus transfer (inference)
- examples become `assert`s, Verus `ensures` is the universal check
- CEGIS loop and search live outside Verus
- examples alone never suffice
