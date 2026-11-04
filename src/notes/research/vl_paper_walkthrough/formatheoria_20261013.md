# FormaTheoria: Constructing Large-Scale Lean Theories from Mathematical Literature $-$ Toward the Formalization of the Classification of Finite Simple Groups
(authored by agents unless marked 🧑)
Tag: `nie2026formatheoria`, [paper](https://arxiv.org/abs/2608.10894)

lean 4 group theory, no verus, every verus form below is inference
- source: Nie et al. (Tsinghua, Warwick), arXiv:2608.10894v1, 57 pp, pages are printed ones
result: llm agents formalized 4 finite-group theorems from 15 books/papers
- theorems: Feit–Thompson Odd Order, Glauberman Z*, Brauer–Suzuki, Bender–Suzuki (App. A, pp.49–50)
- over 994,000 lean lines in over 850 files (§5, p.24), about 7 months (table 1), 64B tokens (§5.1.3)
  - longest trajectory 9.17 days, 3.5B tokens, 606 context compactions
  - model for the main build unnamed, ablations use gpt-5.6-sol at max effort in Pi harness
- vs human rocq odd order: 40,549 lines vs 626,021 root-specific lean lines, about 15 to 1
  - per section 0.2 to 34.9; authors: rapid construction does not give a concise reusable library
  - over 10% of lines unused by odd order or bender–suzuki closures
core lesson: kernel checks proof vs statement, not statement vs source
- quote: "Lean's elaborator establishes well-typedness, not semantic fidelity." (§1.1, p.6)
- trusted: kernel + 3 axioms, mathlib, root statements (leaneval file for 3, authors' own for bender–suzuki)
  - about 30,000 intermediate declarations trusted to the llm reviewer
  - wrong-but-provable intermediate statements cannot break root theorems, but mislead reuse
t1 candidate/approved states
- approval freezes statement, proof may be replaced
  - definition approved after review, theorem after proof passes
  - only reconciler may revise approved statements, when authorized
- verus map: freeze signature + requires/ensures/decreases, and `spec fn` bodies
- fails: freezing preserves errors too (§5.4, p.36)
t2 statement-hash immutability
- hash kernel-level declaration info, not source text, snapshot before each agent run
  - compare at every stop point, reject and tell agent to restore
  - reason: metaprogramming defeats source audits (§3.2, p.20)
- verus: hash spec after macro expansion, stability of that unconfirmed
t3 review-gated agent loop
- agent cannot finish, reviewer R must accept; rejection diagnostics appended, loop continues (§3.1)
- prover R: project elaborates, no statement changed, no axiom beyond fundamentals
  - refine agent drops the elaboration check
- verus R: zero `verus` errors, spec hashes unchanged, no new `assume(`, `admit()`, `external_body`, `assume_specification`
  - scan must cover all callees, not only edited file
- reviewer is the whole guarantee
t4 persistent proof graph of helper lemmas
- prove agent does one node, refine agent splits too-hard nodes, dead ends kept as pruned
  - statuses: Success, NotProvable, TooHard, MissingDependency, Conflict
  - TooHard = split, NotProvable = looks false or no proof found
  - pruned nodes stop repeated failed decompositions
  - graph, path, active node survive compaction
- prompt rules
  - sketch 3–8 lines before new route
  - isolate hard core as weakest useful lemma
  - try to falsify unsupported jumps first
  - keep `state.md`, probe file outside repo where `sorry` allowed
- verus map: proposed node = `proof fn` with `admit()`, proved = admit gone
  - falsify via executable assertions on small inputs
- result graph: 30,298 nodes, 186,187 edges, median depth 2, root depth 458
- cost: lean helper-lemma inflation, 80x declarations in PF Part I §6 vs rocq
t5 independent semantic review of translations
- fresh-context reviewer sees source, pages, transcription, candidate, checklist, no translator reasoning
  - ambiguous source: translator must fail, not pick an interpretation
  - self-improve agent rewrites checklist from failures
- human checklist: conclusion moved into assumptions, omitted conditions, ∃/∀ confusion, subtly different library decl, wrong typeclass
- learned rules: recover inherited context, preserve canonical and complete structured data, no strengthening for convenience, audit bundled interfaces
- example Peterfalvi (12.6): conclusions packed into hypothesis struct, trivially provable, unusable downstream, found only later
- verus map: `requires` already implies `ensures` = vacuous
  - test: write one caller establishing `requires` from stated inputs, none possible means vacuous spec
- evidence
  - 11 of 14 PF Part I sections (78.6%) rejected at least once, 16 rejections in 30 rounds
  - pilot, 10 items, 1 run each, manual judging: no review 6/10 (22.5M tokens), accept/reject 7/10 (36.1M), with diagnostics 9/10 (64.4M), self-improved checklist 10/10 (59.8M)
  - rejection counts show usefulness, not accuracy
  - review misses what reconciler repairs later
t6 constrained reconciliation
- when approved item unusable, one agent repairs minimally or escalates
  - causes: DEF1 source statement wrong, DEF2 source proof wrong, MAL1 equivalent defs not definitionally equal, MAL2 same name different objects, INT1/INT2 wrong translation
  - repair local, downstream uses must still elaborate, only 2 handed items editable
  - at most one reconciler at a time, others pause
  - no evidence in sources means escalate
- patterns: write bridge lemma first, make existence statements constructive
- examples
  - MAL1 bridged by Schur–Zassenhaus lemma
  - DEF1 omitted oddness condition added
  - DEF1 typo escalated to human
  - Dickson divisibility: prover found counterexamples and escalated
- verus map: bridge `proof fn` equating two `spec fn`s, name witness through `spec fn`, crate lock during spec edits
- evidence: 284 of 10,417 declarations modified (2.7%), 219 in PF I §§9,10,13
  - modification share tracks outgoing dependency edges (r = 0.861) more than size (r = 0.607)
  - counts declarations, not success rate or cost
t7 on-demand recursive dependency discovery
- agent returns MissingDependency, workflow formalizes it then restarts the caller
- 3 human-given sources (357 pp) grew to 15 (1,037 pp), 65.6% of pages discovered
- restart cost unmeasured, k deps means k+1 translations
t8 dependency-aware batch parallelism
- table of item to active invocation, no duplicates, wait on in-progress deps
- Glauberman Z*: sequential 51.4 h / 2.09B tokens vs parallel (max 10 provers) 12.3 h / 3.04B
  - wall −76.1% (4.2x), tokens +45.7%, not token-saving
  - one target, one run each
- verus: separate build dirs, since full rebuild exceeds 30 min
t9 section-level context sharing and compaction
- start from latest context of same section, compact keeping spec, contract, results, open work, artifact refs
- PF II ch.4 §3, 21 theorems: 23.6 h / 520.8M tokens fresh vs 17.3 h / 426.8M shared
  - tokens −18.0%, output −20.9%, one run each
t10 independent root-statement check
- comparator: independently written statement with only mathlib constants, same type, replay in kernel, 3 axioms only
- converse as sanity check: prove reverse implication from short standard side to vouch for project-specific constructions
- verus: customer-written top spec in file agents cannot write
paper inconsistencies
- context sharing wall time 26.5% in text vs 26.7% in table 11 (computed 26.7%)
- type I maximal subgroup definition cited as 8.1 vs 8.3
- reconciler remit differs across §2.2, §2.3, §3.4
not reported
- human call count, reconciler call count, main model, money cost
