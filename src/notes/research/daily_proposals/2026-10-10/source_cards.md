# Allocator resource-bound evidence
(authored by agents unless marked 🧑)

Six final sources checked locally; author results not reproduced. Confidence is high in quoted scope and provisional in novelty inference. Snapshots/extractions are in `primary/`. Preliminary parser work is archived separately; resource-cap deviations are recorded in the memo.

## Verified RLSF

unsoundsystem maintainers; *Formally verified real-time allocator written in Rust (wip)*. Official artifact, commit a973020873d9f8fac88e073ec34b27e353e33575, retrieved October 10, 2026. [README](https://github.com/unsoundsystem/rlsf-verified/blob/a973020873d9f8fac88e073ec34b27e353e33575/README.adoc). Discovery: ChatGPT candidate, direct retrieval. Selected as concrete target. Exact title quoted above; proof-status table marks allocation, deallocation, search, mapping, link/unlink proved.

Task/target: functional verification of the RLSF port. Baseline/metric: no controlled study in README. Result: project status, not today's reproduction. Limitation: work in progress, `unverified_api.rs` listed. Inspected [search contract](https://github.com/unsoundsystem/rlsf-verified/blob/a973020873d9f8fac88e073ec34b27e353e33575/src/search_block.rs#L16) specifies suitability without a cost bound; whole-crate absence is unestablished. Local relation: allocator evolution notes. Saturation: verified allocator exists. Access: README is `.adoc`; `.md` fetches failed.

## Upstream RLSF

yvt maintainers; *rlsf*. [Official README](https://github.com/yvt/rlsf), snapshot retrieved October 10, 2026 from `master`. No pinned commit was established. Discovery: verified project's upstream link. Selected for operational claim.

Exact quote: “Allocation and deallocation operations are guaranteed to complete in constant time.” Task: TLSF allocation for bare-metal/RTOS-compatible Rust. Targets/baselines: README compares allocator crates on STM32F401. Metrics: cycles and size, not reproduced. Limitation: source-event complexity differs from hardware timing; verified port correspondence untested. Saturation: constant-time TLSF is established. Local relation: systems allocator notes. Access: public README.

## RaRust

Qihao Lian, Di Wang. *Automatic Linear Resource Bound Analysis for Rust via Prophecy Potentials*. [arXiv:2502.19810v1](https://arxiv.org/abs/2502.19810v1), February 27, 2025. Later venue/version not established. Discovery: ChatGPT citation checked by PDF. Selected as resource-analysis baseline.

Exact quote, §1, PDF p.3: “RaRust does not support unsafe code”. Also excludes generic types, higher-order functions, trait objects and nonlinear bounds in this version. Task: automatic amortized analysis with borrows. Target: nontrivial Rust programs. Metric/result: inferred symbolic bounds; numerical evaluation/baselines not extracted or reproduced today. Limitation supports a version-specific boundary, not universal absence. Local relation: resource-model notes. Saturation: Rust cost inference already exists. Access: public versioned PDF.

## Alerus

Alexander Y. Bai, Joseph Tassarotti. *Verifying Probabilistic Programs in Rust*. [arXiv:2607.12282v1](https://arxiv.org/abs/2607.12282v1), July 14, 2026. Later venue/version unestablished. Discovery: ChatGPT citation, PDF checked. Selected for tracked-credit precedent.

Exact quote, §3, PDF p.8: “Alerus adds Eris’s error credits to Verus without modifying the verifier.” Task: probabilistic correctness with ghost resources. Targets: randomized algorithms. Baseline/metric/numerical results not extracted or reproduced. Limitation: error credits differ from execution costs. Inference: generic credit encoding is weak novelty. Local relation: tracked-resource verification. Saturation: Verus library credit encoding exists. Access: versioned PDF.

## VerusBelt

Travis Hance, Laila Elbeheiry, Yusuke Matsushita, Derek Dreyer. *VerusBelt: A Semantic Foundation for Verus’s Proof-Oriented Extensions to the Rust Type System*. PACMPL 10, PLDI, Article 247, June 2026; DOI 10.1145/3808325. [Primary PDF](https://iris-project.org/pdfs/2026-pldi-verusbelt.pdf#page=1). Discovery: ChatGPT citation, author PDF checked. Selected for foundations.

Exact abstract phrase: “cells, invariants, resource algebras, and storage protocols”. Task/result: significant-subset semantic soundness model in Iris/Rocq. Dataset/baseline/metric: formal development, not allocator performance comparison. Limitation, §1: “We do not attempt to verify the actual implementation of Verus itself”. Local relation: trusted-base notes and October 8 proposal. Saturation: resource-algebra foundations exist. Access: public paper, collection preserved.

## Verus ghost types

Andrea Lattuada, Travis Hance, Chanhee Cho, Matthias Brun, Isitha Subasinghe, Yi Zhou, Jon Howell, Bryan Parno, Chris Hawblitzel. *Verus: Verifying Rust Programs using Linear Ghost Types*. PACMPL 7, OOPSLA1, Article 85, 2023; DOI 10.1145/3586037. [Author PDF](https://www.andrew.cmu.edu/user/bparno/papers/verus-ghost.pdf#page=2). Discovery: ChatGPT citation checked. Selected for tracked-resource mechanism.

Exact quote, §1, p.85:2: ghost permissions “do not impose any overhead on compiled executable code”. Task: verification with linear ghost permissions. Targets: pointer-manipulating/concurrent examples. Results: formal model and systems examples, not today's allocator cost theorem. Baseline/metric not extracted as a resource comparison. Limitation: ghost erasure does not establish faithful accounting. Local relation: practical Verus notes. Saturation: linear permissions are established. Access: author PDF extraction succeeded with annotation warnings; original retained.
