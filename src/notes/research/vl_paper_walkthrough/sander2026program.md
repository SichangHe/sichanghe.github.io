# LLM-Guided Program Evolution for Circle Packing: Breaking 10 Packomania Records for $28
(authored by agents unless marked 🧑)
Tag: `sander2026program`, [paper](https://arxiv.org/abs/2609.05093)

## what the paper does

The paper presents Discovery Loop, a single-machine system that evolves complete optimization programs with an LLM. Its abstract says: “We present Discovery Loop, a lightweight system that uses a large language model (LLM) to iteratively evolve optimization algorithms.” The task is Packomania csqv circle packing: maximize the sum of radii of N variable-radius circles in the unit square. The constraints are that each circle stays inside the square, every pair is non-overlapping, and every radius is positive (Section 2.1, equations (1)–(3), p.2). The objective is “max N [sum] i=1 ri” (Section 2.1, p.2).

The system starts with a penalty L-BFGS-B solver whose radii are optimized by linear programming. A single LLM call proposes a full replacement solver. The proposal is run against target instances, independently checked, scored, and retained only if the aggregate score improves. The abstract reports gains of 2.4%–5.4% over prior records for 10 values of N from 101 through 114, within 15 iterations, at a total LLM cost of $27.72. These results were accepted by Packomania (Abstract, p.1).

## technique 1: verifier-gated full-program evolution

what it is

Algorithm 1 makes the verifier a gate between generation and retention. The controller gives the LLM the current champion, scoreboard, history, and problem description. The LLM returns one idea description and complete Python solver. Each target is evaluated, then checked by an independent zero-tolerance verifier. The aggregate score is compared with the champion; only an improvement becomes the new champion.

The paper gives the exact loop: “Input: champion solver S ∗ , scoreboard B, history H, targets T , records R” followed by “Construct prompt P from S ∗ , B, H, and the problem description” and “S ′ ← LLM(P )” (Algorithm 1, p.3). It then says: “vt ← verify(vt )                                      ▷ Independent zero-tolerance check” and “if σ > σ ∗ then” retain the candidate (Algorithm 1, p.3). The prompt contains the complete champion source, per-target best and last-run values, and the last 12 ideas with outcomes (Section 3.2, p.3).

how to apply it

1. Define a deterministic problem plugin with constraints, objective, target set, candidate interface, and independent checker (Section 3.1, p.3)
2. Build a seed solver and initialize the champion and scoreboard (Sections 3.1 and 3.2, pp.3–4)
3. Construct each prompt from the problem description, complete champion code, scoreboard, and the last 12 ideas (Section 3.2, p.3)
4. Ask for one idea description and one complete replacement program (Section 3.2, p.3)
5. Run the candidate on every target in parallel with a timeout (Algorithm 1, p.3)
6. Verify each output independently, recomputing feasibility and score (Section 3.4, p.4)
7. Sum the target scores and retain the candidate only if the aggregate improves (Algorithm 1, p.3)
8. Append the idea, score, and status to history (Algorithm 1, p.3)

The complete replacement choice is deliberate: “Crucially, the LLM outputs a complete replacement solver, not a patch.” (Section 3.2, p.3). Per-target maxima are retained separately, so a solver that is not the overall champion can still own the best result for one target (Section 3.3, p.4).

verus form

Inference: Use a Rust function that proposes or loads a candidate artifact, an executable evaluator, and a Verus proof function for the checker’s mathematical conditions. Keep candidate generation outside the trusted proof. Express feasibility as predicates over circle coordinates and radii; use `requires` and `ensures` on the checker, and prove that an accepted result satisfies bounds, non-overlap, and the independently recomputed objective. Verus proofs are erased before execution, so the generator remains ordinary Rust or an external process. The paper’s Python replacement loop does not carry over directly: Verus verifies the checker and candidate data contract, not an arbitrary generated solver unless the candidate is translated into verified Rust and proved against the same predicates.

what demonstrates it

The experimental setup used Claude Fable 5.1, a consumer Intel Core i7-13700KF PC with 32 GB RAM and Windows 11, 12 targets, a $30 budget, 40-iteration maximum, 120-second per-target timeout, and six parallel workers (Section 4.1, p.4). Table 1 reports 10 improved targets. For example, N=101 rose from 5.163845 to 5.289154 (+2.43%), and N=114 rose from 5.336683 to 5.624188 (+5.39%). The table’s denominator for the total improvement is the sum across the 10 listed targets: 51.814380 prior versus 54.406044 best, a +5.00% increase (Table 1, p.5). The two additional targets, N=26 and N=32, did not beat their prior records (Section 4.2, p.5).

limitations and assumptions

The verifier assumes its own implementation is independent and correct. The paper specifies four checks: “Confirms all circles are within [0, 1]2 (with zero tolerance)”; “Confirms no pair of circles overlaps (with zero tolerance)”; “Recomputes the sum of radii independently”; and “Applies a strict feasibility shrink to eliminate numerical-precision artifacts” (Section 3.4, p.4). The paper does not prove the checker formally; independent code separation is the stated credibility measure.

Inference: A Verus implementation should make the checker’s predicates and arithmetic assumptions explicit, because proving generated output against a mistaken predicate still accepts the wrong property. Inference: zero tolerance in floating-point Python is an engineering policy, whereas Verus proofs usually need a specified numeric model and explicit rounding or fixed-point treatment.

## technique 2: plateau detection for stopping

what it is

The controller detects diminishing returns with a window of four iterations. It stops when all iterations in the window are rejected or produce no code, when no champion iteration occurs in the window, or when total improvement in the window is below θ=0.01 (Section 3.5, p.4). Backtesting on this run would have stopped after iteration 9, saving $13.77, described as 50% of cost, while sacrificing 0.006 on total sum (0.01% of final value) (Section 3.5, p.4).

how to apply it

1. Record each iteration’s status, cost, and aggregate score (Section 3.5, p.4)
2. After each iteration, inspect the last W=4 records (Section 3.5, p.4)
3. Stop if every record is rejected or has no code, if no record creates a champion, or if score gain is below θ=0.01 (Section 3.5, p.4)
4. Otherwise continue until the budget or iteration limit (Sections 3.5 and 4.1, pp.4–5)

verus form

Inference: Make stopping an ordinary controller decision around verified runs. A Verus specification can prove monotonicity of a stored best-score sequence (`best_next >= best`) and prove that a stop decision follows the window predicate, but it cannot prove that θ is economically optimal. The candidate checker remains the proof boundary.

what demonstrates it

The actual run had 15 iterations (0–14). Productive iterations 0–5 spent $4.96 and increased the total from 59.39 to 59.96 (+0.57), while iterations 6–14 spent $22.76 and increased it from 59.96 to 59.98 (+0.02) (Section 4.4, p.6). The paper reports cost per unit improvement of $8.70 and $1,138, respectively, a 130× increase. It also reports an inconsistency in the backtest wording: Section 3.5 says saving $13.77, while Section 4.4 says early stopping would spend $13.95 instead of $27.72 (Sections 3.5 and 4.4, pp.4 and 6). Both imply approximately half the cost, but the exact savings differ by $0.18.

limitations

Inference: Plateau detection assumes that recent aggregate stagnation predicts future value and can discard a later breakthrough. It also optimizes a fixed target set; the paper itself says practical use may require expanding targets or accepting the plateau (Section 6.2, p.7).

## technique 3: independent feasibility checking and domain moves

The checker’s four operations above are reusable as a verifier-gated search pattern. The LLM-generated innovations included basin hopping with contact-graph SLSQP polish (iteration 1), hexagonal-lattice initialization (iteration 4), island-model parallel chains with elite migration (iteration 5), KKT-Newton contact polish (iteration 8), and defect migration that removes weak circles and reinserts them into holes (Section 4.5, p.6). The iteration table records these ideas and distinguishes champion, rejected, and no-code outcomes (Table 2, p.5).

The paper’s limitations are concrete: it tested one problem domain; it kept one champion rather than a population; model performance depends on generating correct compilable Python; and a MIPLIB experiment had a 75% code-generation failure rate (Section 6.2, p.7). Its evaluation was cheap enough for 120-second target runs and one LLM call per iteration (Sections 4.1 and 5, pp.4 and 6). The comparison table reports Discovery Loop’s single consumer PC, local parallel evaluation, one LLM call per iteration, full-program replacement, $27.72 reported cost, and open source status (Table 3, p.6).

## what is proved, measured, and trusted

Measured results are candidate scores, feasibility checks, iteration costs, wall-clock time, and Packomania acceptance. The paper reports approximately eight hours on the consumer PC and says the results were independently accepted by Packomania (Abstract and p.2). It does not present a formal proof of the optimization algorithm’s global optimality, of the checker implementation, of the LLM translation, or of the generated programs’ general correctness beyond tested targets.

Inference: The trusted base for a Verus product would include the Verus verifier and solver, the formal specification, the checker implementation and its numeric model, and any external target or library contracts. The LLM, score history, and candidate search are untrusted proposal mechanisms. Inference: the strongest product lesson is to preserve independent acceptance checks and make generated artifacts replaceable, rather than to trust an LLM because its score improved.

Inference: For agent-written verified Rust, the threat is moderate. A verifier gate can reject invalid artifacts, but a faulty or incomplete specification can still accept an undesired program; model failures and plateau stopping can also miss useful candidates. The paper’s own 75% MIPLIB code-generation failure rate shows that generation reliability is a material operational risk (Section 6.2, p.7).

## techniques for the catalog

- verifier-gated full-program evolution — prompt a complete candidate from current code and history, independently verify every target, and retain only an aggregate improvement
- per-target best tracking — preserve each target’s best verified result even when another candidate is the overall champion
- independent zero-tolerance feasibility checking — recompute bounds, pairwise non-overlap, objective, and numerical shrink outside the solver
- plateau-window stopping — stop after a configurable window has no champion or has improvement below a threshold
- complete replacement isolation — evaluate self-contained candidate programs so architectural changes do not accumulate patch conflicts
