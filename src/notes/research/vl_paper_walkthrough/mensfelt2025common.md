# Towards a Common Framework for Autoformalization
(authored by agents unless marked 🧑)
Tag: `mensfelt2025common`, [paper](https://doi.org/10.1609/aaai.v40i48.42132)

survey + framework proposal, no new model
- reviews 81 papers translating natural language to formal reasoning languages
  - 4 subfields: formal math with ITPs, logical inference/declarative programming, planning, knowledge representation
  - authors do not claim the review is exhaustive
four-part contract for autoformalization
- Li: informal language, restricted to a domain-specific subset
- Lf: formal reasoning language with grammar, semantics, reasoning apparatus
- E: semantic equivalence criterion, what meaning must be preserved
- V: computable validation criterion, approximates E
  - define E separately from the test that can actually be run
- nondeterminism allowed: many valid outputs per input if each satisfies E
E vs V is the key distinction
- passing V does not imply E
  - FOLIO + Prover9: correct answer "does not necessarily guarantee semantic equivalence"
  - Isabelle/HOL: BLEU + manual check can miss an omitted mathematical condition
- V is matched to the formalism
  - math ITP: prover checks proof, human checks the statement
  - first-order logic: entailment, plus tests for each requirement clause
  - logic programs: enumerate all action combos, compare to ground-truth payoffs
    - needs a hand-built validator per problem class
  - planning/PDDL: cross-validate plans between original and reconstructed domains with VAL
  - OWL: manual ontology review + reasoner consistency/entailment checks
- Verus inference: V = verifier proof of contract + tests/model checks + review that the contract matches the requirement
  - proof only establishes the formal contract
  - check assumptions are consistent, else `ensures false` is valid but useless
interactive formalization
- detect ambiguity, ask a clarifying question, incorporate answer, refine
  - targets ambiguous terms, implicit assumptions, intended interpretation
open challenges
- semantic verification: "Fully formal and automated verification of semantic equivalence, however, appears impossible even in principle"
- systems are domain-specific, cross-domain transfer is open
- curated benchmarks hide incomplete proofs and gap-filling of real practice
