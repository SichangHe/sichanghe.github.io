# Lemma Functions for Frama-C: C Programs as Proofs
(authored by agents unless marked 🧑)
Tag: `volkov2018lemma`, [paper](https://arxiv.org/abs/1811.05879)

lemma function = pure, total C function whose contract is the lemma and body is the proof
- ACSL extension in the authors' Frama-C fork with AstraVer (Why3 + Alt-Ergo, CVC4)
- applied to VerKer (verified Linux kernel string functions); 32 of 69 old lemmas had been unproved
- result: 31 lemma functions replaced the old lemmas (not 1-to-1), SMT-verified
- Verus (inference): same as built-in `proof fn`; value is the soundness reasoning and patterns
recursion-mirroring proof
- requires = hypothesis, ensures = conclusion, recursive call = induction hypothesis
- body follows the spec function's case split with the same decreases measure
  - e.g. strchrnul_in_range: `if (*s != 0 && *s != c) strchrnul_in_range(s+1, c)`
- the body turns one inductive goal into non-inductive ones
  - solvers then need few quantifier instantiations, under 1s per example, a few seconds per lemma
- Verus (inference): `proof fn` with `decreases`; string becomes Seq<u8>, so validity hypothesis disappears
explicit call or implicit instantiation
- proved contract is a quantified lemma: call with concrete args, or solver instantiates it
- authors found explicit calls gave enough control
- Verus (inference): plain `proof fn` is explicit only; `broadcast proof fn` + `#[trigger]` gives implicit use
  - fork puts every earlier lemma in every later context; Verus default is safer for solver time
sound axiom generation (§III-A)
- `lemma` keyword; contract becomes axiom in its own axiomatic block
- block imported only through a unique always-true predicate required by later functions
  - lemma cannot see its own axiom, earlier code cannot see it
- lemma gets `assigns \nothing; allocates \nothing; terminates \true`
- trust: translation to axiom, solvers, purity/termination checks
- Verus trap (inference): `admit()` or `assume` in a proof fn is an axiom, not a lemma
- limit: lemmas ordered by file position, no use of later lemmas
loop generalisation for quantified lemmas
- params are C values, so no quantification over logic types
- prove aux(v) per value, then a parameterless lemma loops v1..v2 calling aux under a quantified invariant
- Verus (inference): `assert forall ... by` instead of a loop
proxy functions for logic expressions
- C function with equality postcondition and no assigns, to use l(u) as a C value in ghost code
- postcondition unchecked, can introduce inconsistency; authors used only proxies with bodies
- Verus (inference): spec fn needs none; `external_body` carries the same risk
ordering lemmas
- group into strongly connected components, topologically ordered
- implicit instantiation hides uses; proposed (not implemented) lemma bodies inside axiomatic blocks
- Verus (inference): problem returns only for `broadcast proof fn` used in its own proof
parametrised lemma module (proposed only)
- prove once over abstract cond/dft, instantiate for strchr and strchrnul
- Verus (inference): one spec fn with a bool argument suffices
minimal lemma replacement policy
- prove the smallest set the code proofs need, not each old lemma
- Table I: 9 functions, 69 lemmas, 37 auto, 32 unproved
- Table II: 8 functions, 9 ghost + 31 lemma functions
- Fig. 1 strchr_skipped: Coq 93 user lines vs lemma function 15 lines incl. contract
  - paper claims over tenfold; ~6x with contract, over 10x without (inference)
  - authors admit a thorough overhead comparison is very hard; Coq support was basic
why leave external provers
- two toolsets, proofs break from renamed generated names, proofs stored apart, solver-style VCs unusable interactively, sharing across files
gaps
- conclusion claims all string lemmas proved, but §IV says old lemmas were replaced
- no solver versions, machine, or time table
