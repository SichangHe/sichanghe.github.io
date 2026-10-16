# Token Budgets: An Empirical Catalog of 63 LLM-Agent Budget-Overrun Incidents, with an Affine-Typed Rust Mitigation as a Case Study
(authored by agents unless marked 🧑)
Tag: `khan2026tokenbudgets`, [paper](http://arxiv.org/abs/2606.04056v1)

## claims and scope

The paper has two linked contributions: a catalog of documented budget failures and a Rust case study using affine ownership. It separates runtime dollar arithmetic from compile-time integrity. The abstract states, “the affine layer supplies the in-program integrity that makes that arithmetic non-bypassable.” (Abstract, p. 1) Inference: this is a narrower claim than proving that an agent stays within a real provider bill; provider reporting, estimator assumptions, compiler behavior, and the constructor authority remain trusted.

The catalog contains 63 confirmed incidents across 21 orchestration frameworks and 18 ecosystems from 2023–2026, plus 47 supplementary structural entries. Two-human coding gives Cohen’s κ = 0.837 for all N = 113 four-class labels and κ = 0.943 for n = 79 rows both raters marked confirmed (Abstract and Section 2.1, pp. 1, 5). The authors explicitly say the public-GitHub corpus is a convenience sample that selects on failures, so it is not a prevalence estimate (Section 1, p. 2).

## technique 1: affine, self-consuming budget API

What it is. `Budget` is an owned Rust value containing remaining quota in micro-cents. It is non-`Clone` and non-`Copy`. `Budget::new` is capability-gated; `spend` consumes the value and returns a remainder plus a receipt; `split` consumes one budget and returns two; `merge` consumes both and returns one. The paper says, “Compile-time layer (this work). The borrow checker rejects programs that alias, double-spend, or reuse a delegated Budget before the binary is built” (Section 2.7, p. 8)

When to use it. Use affine ownership for a Rust agent that delegates a finite session budget to concurrent tasks and must prevent accidental duplication or stale use. It does not replace a provider hard cap or a conservative estimator. Dropping a budget is allowed, so the property is at-most-once use rather than conservation of every unit.

Steps from Sections 3.1 and Appendix A (pp. 9, 22–23):

1. Construct a budget through the trusted `BudgetMint` capability; keep the constructor surface auditable.
2. Call `split(left, right)` by value before spawning workers. Move each child into its task; the parent remainder stays with the parent.
3. Before an API call, call `spend(estimate)`. The result is a new remainder and a `ReservationReceipt`; a failed `checked_sub` refuses the call.
4. After the call, confirm the actual charge and refund unused reservation, or forfeit it on failure.
5. Await worker completion and `merge` returned remainders by value.

The worked example passes a child into `tokio::spawn`, runs parent work concurrently, and merges the worker’s unspent budget (Appendix A.2, p. 23). The paper’s `Budget::new` authority is itself trusted: the affine type prevents duplication of an existing value but cannot prevent code with minting authority from creating a fresh one (Appendix A.1, p. 22).

Verus form. Inference: represent the budget ledger as a ghost state with a unique owned token and prove conservation across `split`, `spend`, `confirm`, `refund`, `forfeit`, and `merge`. Use `requires` for ownership and amount bounds, `ensures` for returned remainder and receipt relationships, `proof fn` lemmas for arithmetic, and `invariant` clauses for loops or task-state reasoning. Verus cannot make Rust’s compile-time move checker itself a theorem; the executable ownership discipline remains part of the Rust type system and compiler trust.

Evidence. The crate has about 225 core lines and 1,180 non-comment lines, uses `#[forbid(unsafe_code)]`, and has nine trybuild compile-fail tests covering seven rustc diagnostics (Abstract and Table 1, p. 2). The three structural failures include attempted cloning (E0599), reusing a moved budget (E0382), and using a parent after split (E0382) (Appendix A.1, pp. 22–23).

Limits. Compile-fail tests show source-level rejection, not binary-level cap soundness. The authors call binary-level refinement an open Conjecture 1 and say their specification checks are consistency evidence rather than an end-to-end source-to-binary proof (Table 1, p. 2). Inference: a Verus proof of the ledger would strengthen arithmetic reasoning but would not remove trust in rustc, LLVM, Tokio scheduling, provider billing, or `BudgetMint`.

## technique 2: conservative reservation and runtime cap

What it is. Before each call, select a provider-specific estimator, multiply by a safety margin, and reserve via `checked_sub`; refuse the call if the remaining budget is too small. The paper states, “The borrow checker turns cloning, double-spending, and use-after-delegation into compile errors (§3); the dollar cap itself is runtime arithmetic under estimator assumption A1.” (Section 1.1, p. 3)

Steps (Section 3.4, p. 10):

1. Select byte-length estimation for OpenAI/Groq or a tool-loop-aware Anthropic estimator.
2. Include a conservative output reservation bounded by `max_output_tokens`.
3. Atomically subtract the reservation from the owned budget.
4. Make the provider call only after successful subtraction.
5. Reconcile with `actual_charge` through the receipt; refund conservatively or forfeit.

Proposition 1 proves the abstract ledger cap under A1 (estimator covers billable input), A2 (overflow-free amounts), A6 (provider honors output cap), A7 (reported charge is at least actual charge), and related assumptions (Section 3.4, p. 10). Reasoning models with hidden tokens fall outside the proposition (Abstract, p. 1).

Verus form. Inference: state the ledger sum as a ghost invariant and prove each transition preserves `total_charged + outstanding_reservations + remaining <= initial`. Use `requires` for estimator and provider assumptions and `ensures` for refusal or updated totals. Since the provider response is external, the charge-truthfulness assumption must remain explicit.

Evidence. In a temperature-stratified live-API sweep of N = 160 sessions, the paper reports zero cap violations and zero false refusals (Abstract, p. 1). Its primary independent evidence is 0/30 overshoot at B0 = 2,000 micro-cents against 30/30 for five runtime baselines on a Claude Sonnet 4 workload (Figure 1 and Section 4.2, pp. 11–12). A separate sweep reports 0/75 overshoot across five estimator margins (Table 1, p. 2). These are sessions or trials under named providers and caps, not universal guarantees.

Estimator tradeoff. The static estimator reserves 4–6× actual cost; AdaptiveEstimator has 2.11× median over-reservation; tokenizer-direct estimation reaches about 1.0–1.1× but incurs 939–1,749 ms per-spend latency (Abstract and Section 1.2, pp. 1, 3). Inference: operators must choose capital efficiency versus latency and still pin tokenizer/provider behavior.

## technique 3: delegation race isolation and compile-fail evidence

The forgetful-operator experiment isolates the affine mechanism from a carefully locked runtime counter. It runs three concurrent children for N = 30 trials at temperature 0 against Claude Haiku 4.5. Condition A uses an unlocked shared Python counter; B uses a locked Python counter; C and D use affine splits at caps 60 and 100 micro-cents; E uses Rust `Arc<Mutex<Budget>>` with explicit lock discipline (Sections 4.3.1–4.3.2, pp. 12–13).

Condition A overshoots 30/30 because all children pass `can_admit` before any records spend. B, C, D, and E each overshoot 0/30 (Table 6, p. 13). At cap 100, affine D admits all three children and spends 69 micro-cents; at cap 60, affine C refuses because each 31-micro-cent estimate cannot fit. The authors emphasize that E’s minimal prompt costs 1 micro-cent, while A–D use a 23-micro-cent prompt, so the mean-spend difference is a prompt-size confound (Section 4.3.2, p. 13).

The three compile-fail tests reject shared-budget reuse, `.clone()`, and parent reuse after `split` with E0382/E0599 (Section 4.3.1, p. 12). Inference: this demonstrates non-bypassability under the tested ownership API, not that every possible budget implementation or unsafe escape is impossible.

Verus form. Inference: model each child’s reservation as a distinct ghost capability and prove disjointness and a sum bound before spawning. Verus can prove the abstract split ledger; Tokio’s scheduler and provider call remain external assumptions unless separately modeled.

## technique 4: specification cross-checks and bounded concurrency checks

The artifact cross-checks the abstract six-variable budget ledger in TLA+ with TLC model checking and a TLAPS proof, and supplies Coq and Dafny re-encodings plus a preliminary Verus source mechanization. A randomized stress harness and bounded Loom model checking exercise concurrency (Appendix B, p. 23). These checks target internal consistency of the abstract specification; the paper explicitly says they are not a binary-level refinement proof. Inference: for a Verus implementation, this layered workflow is useful: first check transition invariants in a small model, then prove Rust contracts, then run bounded scheduler tests. The layers should remain separate in the trust argument because agreement between models does not establish that the compiled Tokio binary implements either model.

## techniques for the catalog

- affine owned budgets — make split, spend, merge, and delegation consume non-cloneable values so aliasing and stale use fail to compile
- conservative reservation — estimate provider charge, subtract before calling, then reconcile through a receipt under explicit provider assumptions
- capability-gated minting — isolate the constructor that creates budget authority and audit every caller
- compile-fail ownership tests — use targeted trybuild cases and rustc diagnostics to mechanically demonstrate forbidden clone, double-spend, and post-split use
- specification cross-checking — combine TLA+/TLAPS/TLC, Coq or Dafny encodings, Verus obligations, and bounded Loom schedules as consistency evidence while keeping binary refinement open
- delegation race experiment — compare racy, locked, affine-split, and shared-mutex conditions with explicit trial denominators and cap settings
