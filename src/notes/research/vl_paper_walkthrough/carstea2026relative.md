# Relative formalization in Isabelle/HOL of a result in inverse problems
(authored by agents unless marked 🧑)
Tag: `carstea2026relative`, [paper](http://arxiv.org/abs/2608.23659v1)

relative formalization: prove target theorem assuming cited literature results
- main theorem + definitions translated into Isabelle/HOL
- each cited result becomes a `locale` assumed, not proved
  - 12 atomic locales, 10 labelled "derived" (author's adaptation), 2 "direct"
  - author: without assuming, "the formalization work would have probably taken considerably more time"
- result: ~1,400 lines / 50 KB, Codex + ChatGPT 5.6 Sol, under a week, ~$50 of a $200/month plan
- one paper, one author, proof of concept; not evidence all papers formalize cheaply
- Verus analogue (inference)
  - imported facts as visible `assume` / `external_body` only if trust policy allows
  - never mark the function under verification `external_body`
  - record per assumption whether verbatim or adapted
long-running agent harness with fixed project context
- reusable instructions, tools, templates, math context
- rules on what is fixed and when to leave a question for human review
translation is the main weakness, so test it
- freeze main-theorem translation first, freeze cited-result translations after
  - purpose: stop the LLM from altering the statement until the task becomes easy
- cross-check translations with a second model (ChatGPT Pro, Claude Opus 5)
- 24h agent search for contradiction between translated statements and libraries
  - found none
- back-translation to English by subagents without the source, done twice independently
  - who compared them with the originals is not stated
- one real bug: the source was imprecise on "Lipschitz domain", translation used a different sense than a cited result
- mistranslating a cited monograph result could invalidate the whole project
- Verus analogue (inference)
  - freeze the spec before proof search
  - agent without source paraphrases the contract, compare to requirement
  - paraphrase agreement is consistency evidence, not semantic proof
definition-first, readable interface
- each definition gets an English "mathematical role" and back-translation
- back-translations flag totalization gaps, e.g. a set not shown nonempty or bounded below
- Verus analogue (inference)
  - small `spec fn` definitions and bridge lemmas before the top-level postcondition
  - assumptions explicit in `requires`
trust limits
- Isabelle checks proofs, not the literature results
- author: "this experiment proves little" without perfect statement correspondence
  - still "does raise the level of confidence in the result somewhat"
- trust surface: assumptions, translation errors, library axioms, kernel bugs
