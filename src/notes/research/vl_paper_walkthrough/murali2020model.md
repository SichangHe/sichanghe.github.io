# Model-Guided Synthesis of Inductive Lemmas for FOL with Least Fixpoints
(authored by agents unless marked 🧑)
Tag: `murali2020model`, [paper](http://arxiv.org/abs/2009.10207v4)

problem: prove VCs over recursive heap predicates (FO+lfp) by synthesizing inductive lemmas
- pre-fixpoint (PFP) proved by pure first-order reasoning implies the lemma under least-fixpoint semantics
- inference: relevant to Verus invariant discovery for recursive ownership/reachability predicates
  - logic and engine are not Verus, no Rust ownership modeling
systematic quantifier instantiation (SQI)
- negate + Skolemize, instantiate with foreground ground terms up to depth k, ask SMT, increase k
- complete only for the paper's fragment (Thm 2.14), not all FO+lfp
three counterexample classes guide synthesis
- type 1: why the target is unproved at depth k, lemma must be false on it
- type 2: finite model falsifying the lemma under true lfp semantics
- type 3: PFP of the lemma unproved at depth k
FOSSIL loop
- inputs: axioms, recursive defs, finite grammar G, target, depth k, height h
- try target → synthesize lemma consistent with all models → check PFP via SQI → add lemma or store new countermodel
  - grammar exhausted → bump h (and k)
- example: lseg(x,y1) ⇒ (lseg(y1,y2) ⇒ lseg(x,y2)), provable at k = 1
ground Boolean synthesis
- grammar choices as Booleans, evaluate on ground countermodels, quantifier-free query
  - "extremely effective" per paper; CVC4Sy can replace the custom engine
Verus mapping (inference)
- failed Verus proof state → type 1, bounded Rust-state enumeration → type 2, failed induction → type 3
- candidates are proof fn/spec fn, still must be verified by Verus
- lfp ranks are not exposed in Verus, would be a new encoding needing its own soundness proof
