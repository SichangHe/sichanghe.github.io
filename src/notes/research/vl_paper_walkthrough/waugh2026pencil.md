# Pencil Puzzle Bench: A Benchmark for Multi-Step Verifiable Reasoning
(authored by agents unless marked 🧑)
Tag: `waugh2026pencil`, [paper](https://arxiv.org/abs/2603.02119)

## scope and result

The paper builds a benchmark around pencil puzzles, constraint-satisfaction problems with deterministic checks for every move. The full database has 62,231 puzzles in 94 varieties; the golden benchmark has 300 puzzles in 20 varieties, with 15 puzzles per variety split into 5 short, 5 medium, and 5 long puzzles by required moves (§3.3, p. 6). The abstract describes the central property: “every intermediate board state can be checked against variety-specific constraints, localizing errors to the exact rule violated.” (Abstract, p. 1)

The evaluation compares a direct single-shot answer with an agentic loop that makes moves, checks the board, and corrects errors. It evaluates 51 models from 11 providers. GPT-5.2@xhigh reaches 27.0% on direct ask and 56.0% agentically; Claude Opus 4.6 rises from 0.3% to 30.0% (§5.1–5.2, pp. 9–10). These are point estimates from single runs. The authors state that 49% of individual puzzles remain unsolved by any model (§8, pp. 14–15).

## technique: generate and verify unique solutions with a constraint solver

What it is. The dataset uses cspuz-solver2, a SAT-based constraint solver, to find verified unique solutions. The solver's complete board state is converted into pzprjs's interactive move sequence. The paper says: “Solutions were generated using cspuz-solver2”, “a SAT-based constraint solver that finds verified unique solutions.” (§3.1, p. 4)

When to use it. Use this pattern when a benchmark or product needs a deterministic oracle and a guarantee that the target instance has one intended solution. It separates the authoritative solution state from the sequence in which a model reaches that state.

How to do it.

1. Use a SAT-based solver with a constraint model for each puzzle variety. The paper uses the existing cspuz-solver2 and does not describe the encodings. (§3.1, p. 4)
2. Solve each puzzle and verify that exactly one complete board state exists. (§3.3, p. 6)
3. Convert the solver's complete-state output into a sequence of coordinate-based interactive moves. (§3.1, p. 4)
4. Use the sequence as a solution trajectory; the paper says the conversion enables fine-tuning on solution trajectories and analytics on puzzle difficulty, and that the full dataset suits Gym-compatible RL training. (§3.1, p. 4; §3.4, p. 7)

Verus form. Inference: model a puzzle state as a Rust data structure and write a `spec fn` for each variety's constraints and uniqueness predicate. Inference: prove a solver-produced state satisfies the predicate with a `proof fn`; prove move application preserves state representation and that the final state satisfies the solution specification. Inference: uniqueness is an additional theorem about the instance, not a consequence of proving one candidate state valid.

Evidence and limits. The dataset summary reports SAT-verified 100% for all 62,231 puzzles, the golden 300, and the smaller subsets (Table 1, p. 6). Inference: the uniqueness guarantee depends on the solver encoding and conversion code. Inference: a Verus proof of the checker and move converter can reduce trusted implementation, but it still needs a trusted constraint model and solver result unless the uniqueness proof is independently checked inside the proof system.

## technique: check every intermediate state against ordered constraints

What it is. pzprjs supplies a `check()` function that validates each intermediate board state against variety-specific constraints (§3.1, p. 4). Constraints are ordered from local/direct checks to global state checks. The engine gives localizable error feedback when a direct constraint fails (§3.2, pp. 4–5). Examples include “Two shaded cells are adjacent” for Nurikabe (§1, p. 2; §3.2, p. 4), “Loop branches at vertex” for Slitherlink, and “Duplicate number in row” for Sudoku (§3.2, p. 5).

How to do it.

1. Check the pre-move board for existing violations. (§3.2, p. 5)
2. Apply one coordinate-based move such as `mouse,left,3,5`. (§3.2, p. 5; §4.1, p. 8)
3. Immediately check the post-move state and report newly introduced violations. (§3.2, p. 5)
4. Run a completion check to determine whether the puzzle is fully and correctly solved. (§3.2, p. 5)

The paper gives the Python API (§3.4, p. 7):

```python
puzzle = Puzzle.from_url("http://puzz.link/p?sudoku/...")
puzzle.send_move("mouse,left,3,5")
violations = puzzle.check()  # [] if valid
if puzzle.is_complete():
    print("Solved!")
```

Verus form. Inference: encode `send_move` as an executable Rust function with `requires` for a valid coordinate and `ensures` that the returned state is well-formed. Encode each rule as a `spec fn` over the state, and prove that `check()` reports every violated rule in its declared set. Inference: use a loop invariant when checking a sequence of moves: every accepted prefix has the representation invariant and no reported local violation. Inference: the verifier's diagnostic text is useful feedback, but a proof should rely on structured rule identifiers rather than strings.

Evidence and limits. The paper's infrastructure supports local error highlighting and rule-specific messages. It says that when only a global rule is broken, no intermediate move is known to violate a local sub-rule (§3.2, p. 4). Inference: this distinction matters for Verus because a local postcondition violation can identify the failing operation, while a global invariant may require an entire-state proof or a counterexample trace.

## technique: use iterative verification as an agent loop

What it is. In agentic mode the model receives `make_move`, `check_board`, and `reset_puzzle` tools. It makes moves, checks the board, and course-corrects from the specific error feedback until solved or abandoned (§4.1, p. 8). The abstract says the per-move checks provide “the infrastructure for dense, per-move reward signals for process supervision and reinforcement learning.” (Abstract, p. 1)

How to do it.

1. Present the current board and tool interface to the model. (§4.1, p. 8)
2. Let the model issue one coordinate move or reset. (§4.1, p. 8)
3. Check the board and return rule-specific violations; the paper's tool for this is the model-called board check. (§3.2, p. 5; §4.1, p. 8; App. B.2, p. 20)
4. Let the model revise its next move using that feedback. (§4.1, p. 8)
5. Stop on a complete valid board or when the model gives up (the harness also stops at a 5000-move limit). (§4.1, p. 8; App. B.2, p. 21)

The measured loop is long: across 1,602 runs, turns per attempt have mean 57.2, median 29, P90 113, and maximum 1,221; duration has mean 40 minutes, median 17 minutes, P90 108 minutes, and maximum 14.3 hours (§4.2, p. 8). The paper reports that the expanded agentic evaluation solved three varieties that no model solved directly (§5.2, p. 11; §7, p. 14).

Verus form. Inference: expose a verified state-transition API where each move has a precondition and a postcondition, and return structured violations when the postcondition fails. Inference: a Verus `ensures` clause can certify each accepted transition, while an agent loop can decide which transition to attempt next. Inference: the loop itself needs a termination or resource bound; iterative feedback is not a proof that the agent eventually reaches a valid state.

Evidence and limits. GPT-5.2's direct success improves from 0.33% at no reasoning to 27.0% at xhigh, an 81× ratio, but the paper says 35% of xhigh requests fail before returning a response (§5.3, p. 11; §6.2, p. 13). The paper is inconsistent here: Table 6 (p. 22) lists 132 infrastructure errors out of 300 xhigh direct-ask runs (44%). GPT-5.2@xhigh improves from 20.2% to 56.0% on the same 84 puzzles in the paper's agentic comparison (§5.2, p. 10). These denominators differ from the 300-puzzle direct evaluation, so the percentages should not be combined as one sample. The authors also say that agentic uplift figures use small samples and need repeated trials and confidence intervals (§7, p. 14).

## technique: turn constraint violations into process rewards

What it is. Each move exposes violation counts, types, and locations. The paper proposes composing them into violation-delta or progress-based rewards (§3.2, p. 5). This creates a dense signal for process supervision and RL instead of rewarding only the final solved board.

How to do it.

1. Record the pre-move violation set. (§3.2, p. 5)
2. Apply the candidate move and record the post-move set. (§3.2, p. 5)
3. Compute a reward from the change, such as fewer violations, progress toward completion, or a penalty for introducing a new local violation. (§3.2, p. 5)
4. Preserve the exact rule type and location for analysis or training. (§3.2, p. 5)

Verus form. Inference: define a numeric or ordered `spec fn` measure over the state and prove that an accepted transition preserves validity or changes the measure as promised. Inference: reward arithmetic itself is not a correctness proof; it is a training or selection heuristic layered over a verified transition predicate.

Evidence and limits. The paper provides the verification data needed for dense rewards but does not train an RL policy in this study. The Discussion's future-work list proposes RL fine-tuning, process-reward-model training, and curriculum learning using these signals (§7, p. 14). Inference: VL should treat this as an unvalidated transfer idea until a Rust/Verus experiment measures proof completion, repair cost, and reward hacking.

## technique: measure difficulty from solution compressibility

What it is. The paper compares required move count with the zlib compression ratio of the solution sequence. Move count explains little variance in solve rate, adjusted R² = 0.092; compression ratio reaches adjusted R² = 0.385, described as 4.2× more predictive (§6.1, pp. 12–13). Adding variety indicators raises adjusted R² to 0.621 (§6.1, p. 13).

How to use it. Compute the compressed and raw byte lengths of each canonical move sequence, divide compressed by raw size, and stratify training or evaluation by that measure. This is a benchmark-design technique rather than a verifier.

Verus form. Inference: use compressibility only to choose training or proof-order curricula. It does not belong in a functional contract unless the product requirement genuinely depends on it.

## what is proved, measured, and trusted

Measured: SAT-verified unique-solution dataset construction, deterministic step checks, 51-model direct and agentic success rates, turns, duration, cost, infrastructure failures, and difficulty regressions. The total recorded benchmark cost is approximately $28,246 across 17,032 runs, but the paper notes (footnote 3, p. 12) that agentic runs that end with errors omit token usage from completed turns (§5.5, p. 12).

Trusted or unproved: pzprjs rule implementations, cspuz-solver2 and its encodings, the board-to-move conversion, benchmark sampling, model outputs, tool harness, and the assumption that the chosen constraints capture the intended puzzle rules. All success rates are single-run point estimates without confidence intervals, and no human baseline is established (§7, p. 14).

Inference: the threat to agent-written verified Rust is moderate. The paper supplies a concrete pattern for verified transition feedback and deterministic oracles, but it does not show that an LLM can author Verus proofs or that reward signals avoid gaming. VL should not redo generic model benchmarking; it should apply the state-transition and per-step diagnostic pattern to proof-state editing, with machine-checked contracts and explicit budgets for retries.

## techniques for the catalog

- unique-solution oracle: use a SAT-based solver and independently checked encoding to construct instances with one intended state
- step-level verifier: validate pre-state, apply one move, validate post-state, and test completion with rule-specific diagnostics
- iterative verification loop: let an agent act, inspect deterministic feedback, and course-correct until solved or bounded out
- dense violation rewards: derive process signals from the change in typed, located constraint violations
- compressibility curriculum: use solution compression as a measured difficulty feature for training and evaluation
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Each attempt has one of three outcomes: correct (puzzle solved), incorrect (model returned a response but the solution was wrong), or request failed (infrastructure timeout or API error before any response was returned)."): read the whole paper text and checked every quotation, number, section and page reference and the technique steps against it; fixed page citations (check() §3.1 p. 4; Python API p. 7; unsolved varieties p. 11; 49% pp. 14-15), the abstract quote's attribution, the run-in-heading and footnote artifacts in the solver quote, unsupported steps (encoding the constraints, converting to RL data), and added the paper's own 35% versus 44% xhigh failure-rate inconsistency; did not check the figures' pixel content, the reference list, or the external repositories and dataset.
