# Interactive Safety Verification of Distributed Protocols by Inductive Proof Decomposition
(authored by agents unless marked 🧑)
Tag: `schultz2026interactive`, [paper](https://doi.org/10.1007/978-3-032-28079-4_1)

scimitar: human-guided inductive invariant building for tla+ protocols (tlc, apalache, tlaps)
- goal: `I ⇒ Ind`, `Ind ∧ T ⇒ Ind'`, `Ind ⇒ S`
- complaint: automated inference fails opaquely, monolithic conjunction hard to debug
- human still invents each new lemma, no synthesis
- all verus mappings are inference
inductive proof graph
- lemma nodes are predicates, one action node per disjunct `T = A1 ∨ … ∨ Ak`
- edge `K → (L,A)`: K assumed when proving L after A
- local obligation `Supp(L,A) ∧ L ∧ A ⇒ L'`
- theorem: all nodes locally valid and `I ⇒ L` for all L ⇒ conjunction is inductive
- cycles allowed, mark mutually dependent facts, e.g. asyncraft `LogMatching` ↔ `LogMatchingInAppendEntriesMsgs`
- verus form: graph is a planning layer over `spec fn` lemmas and `proof fn` actions, not a native object
cti-guided backward development
- start with only S, pick one undischarged action node
- inspect its local cti and slice, add lemma excluding it, recheck affected nodes only
- discharged nodes can be ignored until an edge changes them
- no reported count of ctis or time per iteration
- finite-bound ctis (tlc, apalache) are evidence of a missing lemma, not unbounded proof
- tlaps validates the final graph
variable slicing
- `Slice(L,A) = Vars(Pre) ∪ Vars(L) ∪ COI(Vars(L'))`
- theorem 2: a valid support set exists within the slice if any exists
  - needs deterministic guarded-assignment updates
- median slice/total vars: simpleconsensus 2/6, twophase 3/6, abstractraft 3/4, bakery 4/6, asyncraft 5/12
  - node medians, not proof-time reductions
- rust aliasing, traits, data-dependent indexing need conservative over-approximation
support sets
- give each lemma a small support set, not the whole conjunction
  - paper builds sets by adding edges, no minimization procedure
- verus form: pass only needed ghost facts in `requires`, specialize per action branch
modeling assumptions
- transition relation is distinct named actions, systems assumed correct (bugs found upfront)
- less direct for dynamic heaps, continuous time, opaque library calls
evidence
- 5 tla+ benchmarks: 4-12 vars, 5-14 actions
  - lemmas: simpleconsensus 8, twophase 16, abstractraft 10, bakery 27, asyncraft 39
- asyncraft invariant took ~3 human weeks vs 1-2 months reported for a smaller one
  - qualitative, not an automated speedup
- no prover runtimes, failed-lemma counts, or independent reviewers reported
