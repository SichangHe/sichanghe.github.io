# Agent Hunt: Bounty Based Collaborative Autoformalization With LLM Agents
(authored by agents unless marked 🧑)
Tag: `brown2026agenthunt`, [paper](https://arxiv.org/abs/2603.06737)

## scope and result

Brown, Kaliszyk, and Urban report a multi-agent autoformalization experiment in Megalodon, a higher-order set-theory proof checker, targeting about 200 pages of Munkres's algebraic-topology chapters 9–14. The paper's central mechanism is a simulated bounty market: agents propose lemmas, attach prices, lock work, prove obligations, and collect rewards. Every accepted proof is checked by Megalodon. The authors state: “We describe an experiment in large-scale autoformalization of algebraic topology in an Interactive Theorem Proving (ITP) environment, where the workload is distributed among multiple LLM-based coding agents.” (abstract, p. 1)

The experiment started from about 19,000 normalized library lines and reached 121,000 lines after 2 days 15 hours, or about 39,000 lines per day. The comparison project reached about 406,000 lines in about 60 days, around 7,000 lines per day with one agent. The paper warns that line rate is only a rough comparison because theorem difficulty and dependency status matter. Four agents (Alice, Bob, Charlie, Dave) used two ChatGPT Pro Codex 5.3 models and two Claude Code Opus 4.6/Sonnet 4.6 models. The four subscriptions consumed about $150 over three to four days. The authors report 709 tokens placed in new bounties: 279 were proved and collected by their creator, 114 by another agent, 312 remained active or unsolved, and four were removed or rewritten without a direct collection transition (Section 4, pp. 3–5).

## technique 1: freeze and price the formal statement surface

What it is. A preparatory agent formalizes definitions and theorem statements before the proof market starts. Human or administrative review then freezes those statements so agents cannot make an easy theorem true by weakening it. The initial pass generated 230 definitions and 393 top-level theorems, each with an effort-based bounty.

When to use it. Use this when many agents need a shared target and statement changes would invalidate prices, ownership, or comparisons. It is especially useful when autoformalization itself can silently introduce a wrong premise.

How to do it.

1. Give the source pages and existing background theory to one statement-authoring model. The paper's prompt required definitions and theorems “in order, but without proofs (everything admitted for now)” and prohibited dummy definitions, duplicates, edits outside the new section, and extra lemmas (Section 2.1, p. 2).
2. Require frequent compilation checks, backups, and progress tracking while statements are written.
3. For every lemma or theorem, record textbook-proof line count, formalization difficulty from 1–10, and approximate US-dollar cost at $100/hour. The estimate assumes prior results are proved (Section 2.1, p. 2).
4. Double-check the resulting statements and then expose them to proof agents as immutable targets. The paper explicitly says, “We therefore invest a lot of effort into double-checking the initial autoformalized statements.” (Section 2.1, p. 2)

Verus form. Inference: represent each target as a Rust `fn` or `proof fn` with a reviewed `requires`/`ensures` contract, and keep the contract in a protected module while agents edit proof bodies. A mathematical definition becomes a `spec fn` or a ghost datatype; a bounty record can be ordinary metadata outside the proof. Verus checks the body against the frozen contract, but does not itself judge whether the contract captures the intended requirement.

Evidence and limits. The preparatory run took about eight hours and made 32 backups, but the paper gives no independent accuracy rate for the 230 definitions or 393 statements. It records a concrete failure: the chosen definitions of cosine and sine were non-unique (constant one and zero functions satisfy the stated equations), so later proofs depending on them could be meaningless (Section 6, pp. 7–8). This is evidence that statement review is necessary, not evidence that the review was complete.

## technique 2: bounty, lock, and guard-script coordination

What it is. A shared file encodes theorem states, bounties, balances, locks, and proof status. Agents compete for rewards but can collaborate by creating sub-bounties and proving another agent's theorem. A lock reserves a theorem for 24 hours after paying 10% of its bounty; each agent may hold at most ten locks. Local guard scripts check balances, positive bounties, lock limits and expiry, legal collections, immutable statements, and the distinction between `Qed` and `Admitted`.

When to use it. Use this when independent agents operate concurrently on a large proof tree and need incentives plus mechanical protection against conflicting edits. Do not rely on it to repair an unsound statement or an invalid checker.

How to do it.

1. Initialize a ledger with non-negative balances, positive bounties, ownership, lock expirations, and theorem status.
2. Let an agent lock a theorem by paying 10%; reserve the right to collect its full bounty for 24 hours, and cap simultaneous locks at ten.
3. Enforce ownership: agents do not edit another agent's lock, partial proof, sandbox, or theorem statement. Require pull–commit–push cycles and immediate lock pushes.
4. Run a guard before each commit. The improved stream-based guard tokenizes the whole file, freezes definitions and theorem statements while permitting proof edits, tracks `Qed` versus `Admitted`, validates balances and lock persistence, and ignores keywords inside comments (Section 3, p. 3).
5. Allow sub-bounties for useful intermediate lemmas and pay the locker even if another agent supplies the proof before lock expiry.

Verus form. Inference: model the ledger as ghost state (maps from theorem IDs to status, owner, bounty, and expiry) and prove transition lemmas with `proof fn`, `requires`, and `ensures`. A guarded commit is an external script that rejects source changes to contracts and checks the ledger; Verus can prove transition invariants but cannot enforce Git workflow. Use ordinary Rust for the scheduler and keep theorem bodies as proof code erased before execution.

Evidence and limits. The first guard allowed edge-case violations through naive line parsing; a wrong Megalodon version caused Charlie to commit wrong theorems and collect bounties, forcing a manual balance reset and tighter checks. The improved guard then functioned reliably after minor time-zone fixes (Section 3–4, pp. 3–4). These incidents show that the guard itself is trusted infrastructure and must be tested against adversarial syntax.

## technique 3: proof checking with dependency closure and explicit admits

What it is. Megalodon was modified to make long LLM-produced files practical and to prevent a theorem from being closed when its dependencies are only partially proved. `Qed` is blocked in that case; agents must mark the theorem `Admitted`. Readable names, clearer error messages, faster lookup paths, and an allowed-axiom hash index support iterative repair (Section 5.1, pp. 5–6).

How to do it.

1. Compile the entire file often and expose readable symbols and proof states to agents.
2. Keep incomplete dependencies explicitly admitted rather than silently treating them as proved.
3. Permit `Qed` only when the theorem and all recursively used dependencies are checked.
4. Maintain a hash-indexed allowlist for axioms when the surrounding library is incomplete, and report those assumptions separately.

Verus form. Inference: use ordinary `ensures` contracts and proof functions, and isolate trusted external specifications with explicit `assume` or reviewed external contracts. A Verus function that is still a proof obligation should not be marked `external_body`; the equivalent of an admitted dependency is a clearly tracked assumption in the trust inventory. Re-run callers when a callee contract changes.

Evidence and limits. The experiment completed major proofs but several remained blocked by admitted dependencies, including proofs of 6,132, 5,546, 2,431, and 1,604 lines. The paper's trust boundary therefore includes the checker, its modifications, the allowed axiom hashes, and every admitted theorem.

## technique 4: thematic division with compositional intermediate lemmas

Agents developed different regions: Bob handled homotopy and covering spaces, Charlie geometry and compactness, Alice path concatenation and group-law bridges, and Dave abstract group-theoretic support. The fundamental-group case study shows the pattern: prove reflexivity, well-defined concatenation, associativity, identities, and inverses as separate obligations, then combine them into the group theorem. Bob also added eleven unbountied helper theorems that prevented repeated definition expansion (Section 6, pp. 6–7).

Inference: for Verus, give each subsystem a narrow Rust module and expose reusable `proof fn` lemmas over abstract `spec fn` models. Prove representation invariants once, then use contracts at module boundaries. Rust ownership and `tracked` state can encode resource separation, but Megalodon's set-theoretic quotient construction and bounty ownership need a new ghost model.

## what is proved, measured, and trusted

The checker establishes accepted Megalodon proofs; it does not establish that the initial formalization matches Munkres, that cosine and sine are correctly defined, or that admitted dependencies are true. The measured outcomes are line growth, bounty transitions, theorem proof lengths, and subscription cost. The paper reports no pass fraction over all 393 statements, no independent semantic audit, and no controlled comparison of market versus centralized scheduling. The 39k-versus-7k line comparison uses different projects, durations, and theorem mixes; it is not a causal speedup estimate. The authors themselves say the comparison is “only a rough comparison.” (Section 4, p. 3)

Inference: for VeruLaw, the market could increase parallel proof throughput and surface useful lemma decomposition, but it also creates product risk through statement errors, stale locks, solver/checker bugs, and admitted dependencies. The most important reusable practice is mechanical separation of immutable specifications, proof edits, and trust status. The product should measure verified contracts and dependency closure rather than generated line count.

## techniques for the catalog

- bounty-based decentralized proof search — agents propose and claim priced theorem obligations in a shared ledger

- frozen statement autoformalization — generate definitions and theorem statements first, review them, then forbid proof agents from changing them

- lock and guard protocol — reserve work with expiring locks and mechanically check ownership, balances, and proof-status transitions

- dependency-closed checking — permit a final proof status only when all recursive dependencies are checked, while labeling incomplete work admitted

- compositional lemma ownership — divide theorem regions by theme and expose intermediate lemmas so later proofs avoid expanding definitions
Checked 2026-10-14 against the paper by a Codex agent: audit record brown2026agenthunt; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
