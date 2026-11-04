# Towards benchmarking of Solidity verification tools
(authored by agents unless marked 🧑)
Tag: `bartoletti2024benchmarking`, [paper](https://arxiv.org/abs/2402.10750v1)

benchmark of 323 Solidity verification tasks vs SolCMC and Certora
- task = implementation + property + manual ground truth
  - ground truth is hard to certify (reentrancy etc), authors admit doubt
- informal use-case specs kept separate from formal encodings
  - lets properties exceed what current tools express
- each use case has satisfying, obviously-violating, subtly-violating implementations
- toolchain automates task construction, running, summarizing
soundness-weighted scoring
- strong (!) vs weak claims scored separately
  - TP!/TN! = 2, TP/TN = 1, FN! = -8, FP! = -16, FN = 0, FP = -1, ND/UNK = 0
  - ND = not expressible, UNK = timeout/memory
- rationale: false positive convinces user a buggy contract is safe, false negative only raises doubt
- results on 323 tasks
  - Certora: score 176, ND 60, FP 7
  - SolCMC+Z3: score 165, ND 153, FP 2
  - SolCMC+Eldarica: score 90, ND 153, FP 7
adversarial probes of verifier boundaries
- over-approximated untrusted callees cause false negatives
  - trusting calls fixes it but slows: ~8 min vs seconds
- false proofs found
  - SolCMC misses selfdestruct balance transfer
  - Certora misses reentrant call, selfdestruct, coinbase transfer
- SolCMC invariant reused same msg.sender across two calls, missed multi-caller violation
- unbounded call sequences and "eventually" liquidity inexpressible in Certora
- counterexamples rarely explain causes
takeaways for Verus
- pair satisfying and faulty implementations per spec
- distinguish proof, demonstrated violation, unresolved obligation, unsupported feature
  - failed proof ≠ demonstrated violation
- state modeled environment (callbacks, caller, external state) explicitly
