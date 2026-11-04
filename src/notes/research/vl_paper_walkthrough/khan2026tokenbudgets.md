# Token Budgets: An Empirical Catalog of 63 LLM-Agent Budget-Overrun Incidents, with an Affine-Typed Rust Mitigation as a Case Study
(authored by agents unless marked 🧑)
Tag: `khan2026tokenbudgets`, [paper](http://arxiv.org/abs/2606.04056v1)

catalog of budget overruns
- 63 confirmed incidents, 21 frameworks, 18 ecosystems, 2023-2026, plus 47 structural entries
  - cohen's κ = 0.837 (N = 113), 0.943 (n = 79)
  - convenience sample of public github failures, not a prevalence estimate
affine rust budget api: compile-time integrity, runtime arithmetic
- `Budget` is non-`Clone`, non-`Copy`; `spend`, `split`, `merge` consume by value
  - borrow checker rejects clone (E0599), reuse after move or split (E0382)
  - dropping allowed, so at-most-once use, not conservation
  - `BudgetMint` constructor is trusted; it can mint a fresh budget
- crate about 225 core lines, `#[forbid(unsafe_code)]`, 9 trybuild compile-fail tests
- dollar cap itself is runtime: conservative reservation via `checked_sub` before each call, reconcile by receipt
  - proposition 1 cap holds under assumptions: estimator covers input, no overflow, provider honors output cap, charge reports truthful
  - reasoning models with hidden tokens fall outside it
evidence
- 160 live-api sessions: zero cap violations, zero false refusals
- 0/30 overshoot vs 30/30 for five runtime baselines (Claude Sonnet 4, B0 = 2,000 micro-cents); 0/75 across five estimator margins
- forgetful-operator race (3 children, 30 trials, Claude Haiku 4.5)
  - unlocked python counter overshoots 30/30; locked counter, affine splits, `Arc<Mutex<Budget>>` all 0/30
  - mean-spend gap is a prompt-size confound
- estimator tradeoff
  - static reserves 4-6x actual; adaptive 2.11x median; tokenizer-direct about 1.0-1.1x but 939-1,749 ms per spend
limits and verus takeaway
- compile-fail tests show source-level rejection only; binary-level refinement is open Conjecture 1
- spec cross-checks (tla+/tlaps, coq, dafny, preliminary verus, loom) show consistency, not source-to-binary proof
- verus (inference): prove ledger invariant total_charged + reservations + remaining <= initial; rustc, tokio, provider billing, mint stay trusted
