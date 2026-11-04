# A verified packrat parser interpreter for parsing expression grammars
(authored by agents unless marked 🧑)
Tag: `blaudeau2020packrat`, [paper](https://doi.org/10.1145/3372885.3373836)

pvs formalization of peg metatheory plus a verified reference and packrat parser
- packrat and semantic-action variants proved equivalent to the reference interpreter
- evidence object is an ast recording the full computation trace, not an inductive parse relation
- covers a parser model, not arbitrary rust parsers, lexers, or unicode
peg termination via grammar properties
- pegs are unambiguous but may not terminate
  - nullable repetition like `ϵ*`
  - left recursion like `A → A/a`
- classify each expression: failure, success without consuming, success consuming
  - fixpoint iteration, bounded by 3 x number of nonterminals
- well-formed grammar: no star over nullable, and nonterminal order ranks pre-consumption recursive calls
  - user supplies the order, not computed
proof-carrying ast
- constructors carry start/end indexes
- well-formed trees are meaningful (success or failure), and unique for given grammar, input, start
  - so the parser's tree is the only possible one, usable as a certificate
reference parser
- output type forces grammar fidelity, input fidelity, and property preservation
- terminates on lexicographic `(b − sT, b − s, A, |G|)`
packrat memoization
- table keyed by (nonterminal, position), each entry typed as equal to the reference result
  - `O(b × n)` time assuming constant-time calls
  - cost of allocation or hash maps not covered
semantic compaction
- replace nonterminal subtrees with user semantic values, failures with `fail` nodes
- equivalence to the full tree defined by three conditions, checked on an arithmetic example in PVSio
verus takeaways (inference)
- enum ast with ghost indexes plus a `well_formed` predicate
- reject nullable star and unranked left recursion in the grammar constructor
- prove cache-hit lemma: known entry equals spec result
- pvs predicate subtyping does not transfer, use `requires`/`ensures` and lemmas instead
