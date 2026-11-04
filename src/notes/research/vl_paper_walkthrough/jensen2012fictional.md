# Fictional Separation Logic
(authored by agents unless marked 🧑)
Tag: `jensen2012fictional`, [paper](https://www.semanticscholar.org/paper/3c34432c58e2b58f44f7784a3168a0f25988df3f) (link from the fetch record; the paper text gives no DOI)

fictional separation logic (FSL) = modular specs for abstract data types whose implementations share memory
- ordinary separation logic demands physical disjointness; FSL asks only abstract disjointness
  - abstract separation algebra Σ (partial commutative monoid) + interpretation I : Σ → P(heap)
  - Σ, I, representation predicates are existential in the public spec, so sharing stays hidden
- sequential language only; concurrency is future work
- no benchmark or runtime numbers; worked examples only
  - bit pair, monotonic counter, wrapper, fractional permissions, stacked collection
  - proofs sit in an online appendix, not the paper
indirect triple I.{P} C {Q} = ∀φ. {∃σ∈P. I(σ◦φ)} C {∃σ∈Q. I(σ◦φ)}
- quantifying over abstract frame φ bakes the frame rule in
- Enter1 + Lemma 1 reduce it to a standard triple over I(σ◦φ)
  - bit pair: two bits packed in one integer, each abstractly owned separately
  - needs a hand-derived saturation lemma per interpretation; no automation
- Verus: ghost abstract state + spec fn interpret, universally quantified ghost frame, frame-preservation lemma
  - Verus has no indirect-triple connective; encode as a lemma
monotonic counter: MC(c,i) freely duplicable, MC(c,j) ⊢ MC(c,j) * MC(c,i) for i≤j
- read only guarantees ret ≥ i
- no dealloc, since the predicate is shared; fits garbage-collected languages
- Verus: ghost lower bound, duplicating it is logical weakening not ownership
separating products I1 ∗ I2 compose independently abstracted modules in a client
- rules CreateL/R, ForgetL/R, LeakL/R, Prod-Pure
- LeakL leaves state uncleaned, as for counters
- complex stacking may need tool support (authors)
indirect entailment P |=I Q: weaken abstract pre/post where one heap fits several σ
- use: fractional permissions encoded on top of full-permission rules
  - permissions are rationals 0<z≤1, composition = addition up to 1
  - Ifp demands full permission (f(l)=(v,1)) per described location
- write and alloc rules follow from the standard ones via ROC-Indirect and bi-entailment
- Verus does not enforce fractions; they must be a proved ghost protocol
stacking interpretations I ▷ J = (I∗1);J, relational composition I ; J hides the top layer
- lets a module extend another abstraction and show clients one or both layers
- example: fractional permissions stacked over a collection spec; contains/clone need any fraction, others full
- converse of RelComp does not hold
