# A Complete, Formal Semantics for Rust Source Code
(authored by agents unless marked 🧑)
Tag: `drodt2026complete`, [paper](https://arxiv.org/abs/2610.06003)

source-level Rust semantics from the LAGC framework (Drodt, 2026)
- covers most safe Rust HIR, then async Rust and Tokio current-thread scheduler, then a RustyDL soundness proof
- four steps: local evaluation, well-formedness predicate wf, trace composition, global rules
  - local rule sees one expression, no context
  - program = set of all finite maximal traces plus limits
- new construct means mostly a new local rule
- abstracts memory layout, type and borrow checking
  - assumes well-typed programs, so no memory-safety claim
- Verus use (inference): ghost Seq traces, spec fn wf/chop, reference interpreter to validate generated contracts
  - executable code should not carry an event stack
symbolic traces
- states map variables to values or `*`
- concretization rho maps symbolic variables at composition time
- wf is a firewall: non-symbolic stays non-symbolic, events use only trace variables, event order
- concretizing a well-formed trace stays well-formed (Prop 2.12)
- determinism holds modulo renaming of fresh variables and borrow IDs (Lemma 3.23)
  - proves determinism, not termination
context-sensitive `next` with hole expressions
- exactly one hole, recurse into first unevaluated child
- conditionals recurse only into the condition
- assignments: right-hand side first, then left
- panic terminates the trace
- calls: invEv on entry, retEv on return, compREv passes the result to the caller
async and Tokio
- fresh future ID on call; create, spawn, eval, await events
- await is the only suspension; poll and locks abstracted away
- model is maximally permissive, so it admits schedules no runtime picks
- Tokio current-thread: local queue plus global queue every IG ticks
  - rules proved mutually exclusive, so scheduler is deterministic (Prop 5.6)
- fairness via lexicographic distance measure
  - quiescent fairness, Theorem 5.7, needs no local infinite computation
  - Theorem 5.9 adds Tmax, Pmax; Dmax is existential, not evaluated numerically
  - excludes multi-thread stealing, I/O, unbounded spawning
- Verus form (inference): distance tuple in a decreases clause
RustyDL soundness
- calculus rules replace active expression with update plus simpler program
- soundness: trace sets related by finite prefix/suffix relation (Lemma 6.11)
- Theorem 6.13: calculus is sound, claimed with "considerable confidence"
  - only core rules like copy proved in detail, rest "straightforward but time-consuming"
  - loops: invariant plus anonymizing update
- proofs are on paper
  - section 2 largely mechanized in Lean
  - section 3 in progress
  - Verus use (inference): emit one lemma per calculus rule
