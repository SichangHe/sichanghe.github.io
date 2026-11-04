# Just Type It in Isabelle! AI Agents Drafting, Mechanizing, and Generalizing from Human Hints
(authored by agents unless marked 🧑)
Tag: `kappelmann2026justtype`, [paper](http://arxiv.org/abs/2604.15713v3)

paper result: simplified Smolka-Blanchette printing algorithm is complete (Thm 4) and annotation-minimal (Thm 5)
- scope: rank-one polymorphic lambda calculus, typable unambiguous terms
- correct printing = original most-general typing is the unique most-general well-typed completion of printed term
- mechanized in Isabelle/HOL
agent workflow cost and trust
- AI paper-proof phase: $70, 2 h compute, 1 day human review; human proof took ~5 days
- 2 autoformalizations, 1,938 and 2,071 lines, $139 and $140, Claude Opus 4.6
- Isabelle checks proofs; human review only aligns statements/definitions with paper
  - remaining mismatch: formalization fixed a concrete post-order enumeration while claiming order abstraction
  - lesson: checked proofs do not validate intended abstraction
- agent setup: background material, experiment-specific `AGENTS.md`, corrected implementation + execution trace
  - 4 human review rounds caught ground-term restrictions, missing definitions, contradictions, invalid sort claim that agent self-review missed
  - formalization: Isabelle/Q interface, interaction guide, plan required before editing theories
algorithm techniques
- maybe-type completion model: `⊥` = no annotation, completion adds annotations and is well-typed
- reverse greedy with coverage test: erase annotation at p if every type variable there is annotated elsewhere
  - local minimality only; global minimum is NP-hard
  - any compatible `pickPos` works; termination by annotation count
- sandwich lemma: completion between current annotations and fixed most-general completion is unique (Lemma 8)
- human-hinted autogeneralization: reduce algorithm to independence-system greedy theorem, mechanize reduction
verus mapping (inference)
- `spec fn` for erase/positions/subsumption, recursive `spec fn` with decreases = annotation count
