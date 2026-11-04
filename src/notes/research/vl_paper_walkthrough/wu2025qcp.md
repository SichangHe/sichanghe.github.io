# QCP: A Practical Separation Logic-based C Program Verification Tool
(authored by agents unless marked 🧑)
Tag: `wu2025qcp`, [paper](https://arxiv.org/abs/2505.12878v3)

qcp verifies c against separation-logic specs written in comments, with rocq for leftover obligations
- symbolic execution generates verification conditions (VCs)
  - auto solver first, unsolved VCs exported to rocq
- 155 functions, 2,972 c lines, 3,876 annotation lines
  - 1,964 auto and 679 manual VCs, 74.3% auto
  - arithmetic 68.3%, data structures 78.9%, liteos lists 60.3%
- more annotations than VST-A (397 vs 300 lines) but fewer proof lines (704 vs 1,426)
  - line counts are not human time
- no soundness proof of the symbolic executor, unlike VST-A
- unsupported: floats, function pointers, bit-fields, goto
proof workflow
- 4 generated files: goal, auto, manual, check
  - rocq module type checks every goal has a proof
  - only `proof_manual.v` is user-edited
- verify defined functions assuming specs of declared-only functions
- one primitive spec per function, others derived by proof
  - avoids reverifying the body per spec
  - swap example needs manual case split, a known limitation
- assertions expose the heap shape for the next statement
  - e.g. unfold `listrep(x)` before reading `x->next`
- incomplete c is executable
  - tracks Normal, Break, Continue, Return assertions
  - green = checks passed, red = symex failure, yellow = unsolved VCs
demand-triggered strategies
- user-defined rules with priority, patterns, checks, actions
  - e.g. unfold a predicate only when a load/store needs a field
  - each strategy gets an auto-generated soundness lemma
- smt solver: linear integer arithmetic + uninterpreted functions, no quantifiers
- manual recipe: preprocess, apply structural lemma, instantiate existentials, cancel common heap predicates
refinement via abstract program
- prove algorithm in rocq as a monadic program, prove c consistent via `safeExec` contract
spec patterns from verified components
- checker soundness: positive answer correct, no completeness demanded
- capacity bounds as explicit preconditions
- keep entry values (`x == x@pre`) to state unchanged pointers
