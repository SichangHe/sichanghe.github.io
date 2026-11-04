# Hammer for Coq: Automation for Dependent Type Theory
(authored by agents unless marked 🧑)
Tag: `czajka2018hammer`, [paper](https://doi.org/10.1007/s10817-018-9458-4)

hammer = premise selection + translation to ATP + reconstruction in Coq
- general, no domain knowledge
- 40.8% of 9276 coq 8.5 stdlib theorems proved push-button (8 strategies, 3786 solved on 90% validation set)
  - 30 s per ATP run, 10 s per reconstruction tactic, ~40 s real time on 8 cpus
  - comparable to isabelle/mizar hammers
premise selection
- learned k-NN and sparse naive Bayes, features = constants + parse-tree constant-variable pairs, TF-IDF
- labels = dependencies of earlier theorems
cic -> untyped first-order logic
- CIC0 approximation, props -> formulas, types -> guards, terms -> terms
- `prf` constant for proofs = proof irrelevance
- neither sound nor complete, only "sufficiently"
  - core version sound; equality w/o guards + functext can be inconsistent
- ATPs: E 1.9, Vampire 4.0, Z3 4.0
reconstruction
- eauto-style backward search + limited rewriting, congruence closure, forward reasoning
- adds no axioms, so result is a real coq proof
- trusted only for search: translation, ATPs, selection model
limits
- best near first-order goals and stdlib, weak on induction, small propositional inductive types
- nonreproducible due to external provers
verus takeaways (inference)
- treat solver/selector output as untrusted hint, accept only on verifier replay
- reconstruction = emit ordinary `assert`/lemma calls, not `external_body`
