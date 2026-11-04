# QED at Large: A Survey of Engineering of Formally Verified Software
(authored by agents unless marked 🧑)
Tag: `ringer2019qed`, [paper](https://doi.org/10.1561/2500000045)

survey: verification as engineering (specs, proof structure, automation, interfaces, maintenance, trust)
- scope: interactive provers with small kernels, excludes Dafny/ACL2/Z3
- worked example: regex matcher from inductive spec to executable code
spec design
- specify first: math relation, deep-embedded syntax, inductive semantics
  - executable function typed as decision procedure for the relation
- separate termination, partial correctness, adequacy
  - adequacy: agree with independent semantic theory
  - Verus: `decreases`, result contract, adequacy lemma vs reference model
- deep embedding for compilers/interpreters, shallow for fixed programs
  - deep makes relations on pairs of programs easy but costs parsers, binders
proof techniques
- refinement via forward/backward simulation, composed across passes
- wp reduces {P} c {Q} to P ⇒ wp c Q
- separation logic: frame rule localizes footprint
  - Verus: ownership + ghost permissions, contracts expose mutated fields
automation
- tactics, structured proofs, reflection, domain solvers
- hammers: premise selection, translation, proof reconstruction
  - CoqHammer reproved 44.5% of Coq stdlib
  - Isabelle up to 70% on 100k+ facts, but rates do not predict evolving projects
- failed automation gives little feedback, so pair with counterexamples and focused lemmas
interfaces and reuse
- modules, type classes, canonical structures hide representation
- avoid generated hypothesis names, use named predicates
- transport across relations: Transfer, DEVOID
maintenance
- regression proving: select affected proofs, check in parallel
  - iCoq up to 3x faster than conventional checking
- repair from examples: PUMPKIN PATCH handles only simple changes
- seL4 studies: proof size correlates with effort, not universal law
trust
- models, axioms, extraction, compiler, runtime, hardware stay trusted
- automation-heavy proofs give huge terms, slow to check
