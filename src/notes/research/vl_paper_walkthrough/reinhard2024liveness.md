# Semi-Automated Modular Formal Verification of Critical Software: Liveness and Completeness Thresholds
(authored by agents unless marked 🧑)
Tag: `reinhard2024liveness`, [paper](https://arxiv.org/abs/2403.00934)

dissertation with two techniques; no verus port, implemented in VeriFast
ghost signals: modular termination of busy-waiting under fair scheduling
- signal is proof-only, initially unset, created with an obligation to set it
  - erased after verification
- busy-wait loop tied to finite set of signals
  - every non-finishing iteration must show some waited-for signal still unset
  - well-founded levels: waited-for signal level must be lower than every held obligation
- thread cannot finish holding an obligation; obligations transfer on fork
- goal triple `{obs(∅)} c {obs(∅)}`; theorem A.3.11: no fair infinite reduction
- why it terminates: pick minimal-level signal waited for infinitely often, its obligation path must only wait on lower levels, contradiction
- non-thread-safe signals need a mutex whose invariant owns the signal chunk
  - mutex has a level; acquire creates a release obligation
  - signal set in same critical section that establishes the condition
- bounded fifo (capacity 10, 100 items): per-event signals, levels `Lpop = 102 - i`, `Lpush = 101 - i`
  - evidence: fifo 160 annotation lines for 37 code lines, 0.08 s; clh lock 343 for 49, 0.1 s
  - no repetition counts for timings
- trust: fair scheduler assumed; VeriFast trusted header axioms; thread-phase rule prevents self-fueling loops
- inference: a verus port needs an explicit concurrent model, fairness assumption, soundness proof; token bookkeeping alone is not enough
completeness thresholds (CTs): bounded memory-safety proofs that cover all array sizes
- CT is a subdomain `Q ⊆ X` sufficient for the whole domain, not a number k
- class `Trav`: loop over `i = L … s-R` reading `a[i+Z]`
  - vc reduces to `∀i. L ≤ i ≤ s-R → 0 ≤ i+Z < s`
  - sizes below `L+R` vacuously safe; any single `q ≥ L+R` is a CT
- vc thresholds transfer to the program only if vc is precise in the parameter (theorem C.8.3)
  - over-approximating vc breaks transfer (unsatisfiable-vc counterexample)
- vc slicing: if vc = `ax ∗ ay` and `x` only in `ax`, a CT for `ax` is a CT for all
- sequential composition: `Q1 ∪ Q2` is a CT
- workflow C.8.10: compute vc, factor out parameter-independent subformulas, extract threshold, repeat until no gain
- lemma C.8.11: for `vc(s) = ∀i. a ≤ i < s+b → 0 ≤ i+Z < s`, `{q}` is a CT whenever `q > a-b`
- appendix D generalizes CTs to arbitrary correctness predicates incl. liveness
- no completed evaluation: freertos tcp/ip experiment and speedup are future work
- does not show arbitrary bmc bounds are safe
