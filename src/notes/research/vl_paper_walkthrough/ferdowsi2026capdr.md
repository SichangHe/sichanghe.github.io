# Certificate-Aware Property-Directed Reachability
(authored by agents unless marked 🧑)
Tag: `ferdowsi2026capdr`, [paper](http://arxiv.org/abs/2605.16472v2)

capdr: pdr/ic3 with a learned ranker, correctness left to sat guards + independent checker
- target: finite-state boolean transition system (Init, Trans, Prop)
  - safe certificate = inductive invariant, unsafe certificate = finite counterexample trace
- trust boundary: only the standalone checker (parser, sat engine, trace evaluator)
  - verifier, learned policy, features, training all untrusted
  - report safe/unsafe only after checker accepts, else fail
  - theorems 1-3: accepted certificate => result sound, assuming sat + parser correctness
- not a new certificate format or checker; reuses pdr, checker, invariant minimization
- transfer to agents: proposer untrusted, checker (e.g. verus) final, ranking is never evidence of correctness
learned choice points, each guarded
- blocker generalization: rank subcube clauses, insert only if sat guards pass, exact fallback always admissible
- obligation ordering: rank by frame, recency, requeue count; bounded starvation keeps it fair
- pushing: rank clause pushes, add only after unsat check
- optional strengthening extensions, disabled in base experiments
training
- within-event pairwise preference on continuation cost J = t + 1e-3 * size + tchk
- linear scorer, regularized logistic loss, frozen at deployment
- replay logs (versions, seeds, actions, guards) give exact replay, jaccard distance 0
evidence: hwmcc'24, 319 held-out instances, trained on disjoint hwmcc'20 subset
- solved 293 vs 287 for baseline pdr
- median certificate size 14,596 vs 19,365 literals (-24.6%)
- median checker time 0.63s vs 1.24s (-49%)
  - medians over different solved sets, not paired
- solve time not better: 115.2s vs 109.7s
- weak points: a poor policy wastes search (soundness kept); accepted evidence only covers the encoded model
