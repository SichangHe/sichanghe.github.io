# CORE: Conflict-Oriented Reasoning Elimination for Verifiable Language-Model Search
(authored by agents unless marked 🧑)
Tag: `song2026core`, [paper](https://arxiv.org/abs/2609.39069)

## purpose and interface

CORE is a controller for search in which a proposer emits structured decisions and an external verifier checks prefixes. On failure, the verifier returns a certified conflict core: a subset of decisions that cannot appear together in any valid completion. CORE caches the core, jumps to its newest member, and rejects future states containing the same core. The abstract summarizes the rule: “a search controller that requests a certified conflict core from a verifier, backjumps to the latest decision in that core, and caches the conflict to avoid repeating it” (Abstract, p. 1).

A decision is `(id, type, value, deps)`; canonical keys preserve type, dependency context, and occurrence identity (Section 3, p. 2). The verifier has three outcomes: `pass`, `fail(C)`, and `unknown`; only a sound `fail(C)` enters the hard cache (Section 3, p. 2). A final scorer separately accepts or rejects complete states.

The paper states that “Under sound verification, finite branching and depth, and exhaustive proposals, the uncapped search is complete and never prunes a valid solution” (Abstract, p. 1). It also emphasizes that “A cached core therefore rejects later supersets regardless of the order of decisions outside C, without treating an unverified critique as a constraint” (Section 4.1, p. 4).

## technique: conflict-directed backjumping with nogood memory

Definition. A core C is sound when no valid complete state contains all of C. The paper formalizes this as “∀s⋆ ∈ S⋆(x), C ⊈ K(s⋆)” (Definition 1, p. 2). This is stronger than a textual critique: one failed continuation does not prove that every continuation containing C fails (Section 4.1, p. 4).

Algorithm steps, following Algorithm 1 (p. 3): (1) initialize an empty stack s and core set N. (2) If s is complete, run `FinalCheck`; return it if accepted, otherwise reject the leaf and retreat. (3) Ask `Propose(x,s)` for an ordered finite candidate list. (4) Select the first untried candidate whose state does not contain a cached core. (5) Run `Verify` on the extended state. (6) On `pass` or `unknown`, append the decision; on `fail(C)`, minimize C when possible, insert it into N, delete stored supersets, and retain the prefix immediately before the newest decision in C. (7) If no candidates remain, construct a certified exhaustion core or backtrack chronologically. (8) Continue until a solution, exhaustion, or budget limit.

The jump index is the maximum position in the current state whose canonical key is in C; decisions newer than that position are discarded (Section 4.1, p. 3). The cache predicate is `Contains(s,N)=1` when a stored core is a subset of active keys, so a later superset is skipped without another verifier call (Section 4.1, p. 4).

Verus form. Inference: represent each attempted proof step as a stable decision key containing lemma name, target function, dependency assumptions, and occurrence identity. A Verus run can act as `Verify`: success appends the step; a failed verification should be turned into a core only when a checker can certify that the listed assumptions jointly preclude a valid proof completion. The orchestrator can backjump to the newest implicated decision and cache the canonical set. Inference: ordinary Verus proofs still use `requires`, `ensures`, loop `invariant` declarations, and `proof fn`; CORE controls retries outside the Rust program.

## technique: exact, replay-certified, and heuristic cores

CORE separates core sources into three tiers (Section 4.2, p. 4). Exact SAT/SMT/CSP solvers, parsers, type checkers, and deterministic constraints can return certified cores. Replay-certified cores are accepted only after a sound checker rules out every completion containing the proposed subset. Heuristic LLM or learned causes remain soft constraints and cannot receive the hard guarantee.

To minimize a core, delete one member and replay certification; retain the smaller set only if it remains sound. If minimization reaches its replay cap, keep the last certified non-minimal core (Section 6.1, p. 6). For exhaustion, certify every legal alternative at a decision level, remove each alternative's own key from its core, and union the remainders; sampled candidates alone do not prove exhaustion (Section 4.1, p. 4).

Inference: for Verus, an SMT unsat core may justify a proof-search nogood only if its literals are mapped back to stable Rust proof decisions and the mapping is validated. A generic “solver failed” message is an unknown result, so it must not prune proof search. This is a major trust boundary: an unsound core can remove a valid proof.

## worked mechanism

The paper's 24-Game example uses cards {1,3,4,6}. It first chooses `1+3=4`, then `4orig+6=10`, then `4new+10=14`; exact arithmetic shows that retaining the first decision leaves no completion to 24. The verifier therefore returns `C={d1}`, CORE caches it, jumps directly to the first decision, and tries `3/4`, `1−3/4`, and `6/(1/4)=24` (Section 4.1, p. 4). The example demonstrates why a causal earlier decision can be changed while intervening irrelevant choices are skipped.

## formal guarantees and assumptions

Theorem 1 states safety and completeness under six assumptions: every learned core is sound; branching and depth are finite; the proposer eventually enumerates every legal candidate at a revisited state; the search verifier never rejects a valid prefix; the final scorer accepts exactly valid complete states; and no finite budget interrupts completion (Section 4.3, pp. 4–5). Under these assumptions, CORE never prunes a valid solution and returns one whenever it exists. Proposition 1 gives termination because finite sequences and candidate ledgers prevent infinitely many retries (Section 4.3, p. 5).

Inference: these guarantees do not cover LLM-generated heuristic cores, incomplete proposals, unknown outcomes, finite token budgets, or a verifier whose failure explanation is unsound. They also do not prove that the final specification captures the product requirement.

## controlled graph-coloring evidence

The testbed uses planted 3-coloring graphs at n ∈ {18,24,30,36}, 500 graphs per size, edge probability 0.28 only between differently colored vertices, and a proposer that ranks the planted color first with probability 0.30 (Section 5.1, p. 5). All methods receive identical candidate orders. Chronological repair, CORE-BJ (backjumping without memory), and CORE are capped at 100,000 verifier calls.

Table 1 reports median calls over 500 paired instances per size; every method solved every main-test instance within budget. At n=30, chronological repair needs 223.5 calls, CORE-BJ 147.0, and CORE 134.5, a 39.8% reduction for CORE versus chronological repair. At n=36, the corresponding values are 267.0, 189.0, and 173.5, a 35.0% reduction. Memoization further lowers median calls relative to CORE-BJ by 5.7%, 8.5%, and 8.2% at n=24, 30, and 36 (Section 5.2, p. 6). These denominators and paired-instance counts are those in Table 1; they are not percentages of all possible colorings.

## language-model evaluation

The end-to-end test uses GSM8K (500), MATH-500 (500), 24-Game (200), Blocksworld (200), and HumanEval (164), with Qwen2.5-7B-Instruct and Qwen3-8B. Candidate decisions are JSON records; decoding uses temperature 0.7, top-p 0.95, up to 128 tokens per candidate, a 16,384-token budget, and 32 verifier calls (Section 6.1, pp. 6–7).

Table 2 reports mean success across the five task denominators. Qwen2.5 CORE reaches 75.9% mean success versus 72.5% for Tree of Thoughts, with 10.9 versus 18.6 verifier calls and 9.1k versus 14.2k generated tokens per problem. Qwen3 CORE reaches 84.2% versus 81.8%, with 12.0 versus 19.0 calls and 6.0k versus 7.0k tokens. The table's task-specific Qwen2.5 CORE rates are 83.8/58.6/92.0/73.0/72.0 for GSM8K/MATH-500/24-Game/Blocksworld/HumanEval; each denominator is the header count above.

Ablations in Table 3 use Qwen2.5-7B-Instruct. Removing core memory lowers mean success from 75.9% to 73.8% and raises calls from 10.9 to 12.7; removing backjumping gives 72.9% and 15.4 calls; full-prefix conflicts give 71.8% and 16.1 calls; soft heuristic cores give 74.9% and 14.3 calls. The authors caution that verifier calls do not capture wall-clock cost because generation and core replay add work (Section 6.2, p. 7).

## trust and relevance to VL

The formal result trusts sound conflict certification, complete candidate enumeration, bounded search, and exact final scoring. The empirical result additionally trusts the proposer, prompts, task parsers, benchmark answer keys, and hardware/software setup. Inference: threat to agent-written verified Rust is substantial when failed Verus runs are converted into pruning rules without certified dependency analysis; an unsound “core” can delete the only valid proof path. Inference: a safe VL integration should begin with exact parser/type-checker constraints and replay-certified proof obligations, retain unknown failures as soft feedback, and log every jump with the source revision and Verus version. Existing conflict-directed backjumping and clause learning already cover the search principle; VL should adapt the interface and certify the mapping to proof decisions rather than claim the algorithm itself as new.

## techniques for the catalog

- certified conflict cores — ask a verifier for a subset of decisions absent from every valid completion and cache it as a semantic nogood
- nonchronological backjumping — discard decisions newer than the latest core member and resume at the implicated level
- subset nogood memoization — skip any candidate whose canonical decision keys contain a stored core
- core minimization — delete core members and replay certification, retaining only reductions that remain sound
- exhaustion cores — combine certified explanations for every legal alternative before declaring a decision level exhausted
- tiered verifier interface — separate exact, replay-certified, and heuristic explanations so only sound cores receive hard pruning
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
