# Neurosymbolic Language Reasoning as Satisfiability Modulo Theory
(authored by agents unless marked 🧑)
Tag: `oh2026neurosymbolic`, [paper](https://arxiv.org/abs/2602.18095)

logitext = prose documents with explicit logic, solved by Z3 interleaved with LLM calls
- natural language text constraints (NLTCs): `let` binds a prose clause to a Boolean variable
- Boolean relations written in Z3/PyZ3 notation, e.g. `d = C1 and C2 and (C3 or C4 or C5)`
- `check(d, partial_assignment, cover)` returns assignment, `unsat`, or `timeout`
- same interface for classification, constrained generation, coverage generation
- guarantee covers only the Boolean skeleton, clause truth values stay LLM outputs
  - no soundness, completeness or termination theorem

llms fail at combinatorial logic
- content-moderation policies with 6–22 clauses
- GPT-5 misses over 99% of satisfying assignments that Z3 enumerates
- GPT-4o-mini fails on all tasks
- compositional gap shrinks with model scale, combinatorial gap stays severe

interleaved solving loop
- Z3 proposes Boolean assignment
- NLSolver: LLM proposes string, LLM verifies each relevant NLTC, up to T refinement rounds
  - disagreeing clauses go into a needs-to-change set for the next proposal
- on failure block that Boolean candidate and ask Z3 again
- caching and refinement history have modest impact

evidence
- instance generation near saturation with GPT-5-nano, direct prompting of GPT-5 degrades
- coverage generation faster (solver instead of repeated LLM calls), NLSolver calls dominate
- task execution with GPT-4o is mixed
  - better on CMOD and Super-NaturalInstructions, worse on LegalBench
  - expanded tables: 7 of 10 tasks better than few-shot
- small instance counts, CMOD re-evaluation unfinished in the appendix

Verus translation (inference)
- treat the LLM judgment as an external assumption behind a trusted adapter contract
- loop `invariant`: every blocked assignment violates a recorded textual constraint
