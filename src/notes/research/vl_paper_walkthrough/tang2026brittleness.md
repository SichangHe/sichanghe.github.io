# Generalization or Memorization? Brittleness Testing for Chess-Trained Language Models
(authored by agents unless marked 🧑)
Tag: `tang2026brittleness`, [paper](https://arxiv.org/abs/2605.17565)

## scope and finding
Tang tests whether chess language models generalize or memorize and evaluates LLM-Modulo, a verifier-in-the-loop method. The paper's central limitation for training-only approaches is: “The clear limitation to both methods is a lack of validity or correctness guarantees at inference time, as their additional training on synthetic data only increases the probability of success when asked to solve any particular chess-related task.” (§3, p. 2) The experiment uses 300 mate-in-N puzzles (100 mate-in-1, 200 mate-in-2, 300 mate-in-3 are described for the larger 600 suite; the modulo comparison uses n=300) and compares normal, cheating, pass@10, and modulo prompting (§6.1–6.2, pp. 3–4).

## technique: define a hard verifier loop
Use this when a generator proposes a structured action and an executable checker can reject it. The paper's modulo procedure is explicit:

1. query the model up to K=10 times at temperature 0.7 (§6.2.1, p. 4)
2. send each candidate to Critic #1, which checks whether the move is legal in the position (§6.2.1, p. 4)
3. send legal candidates to Critic #2, which checks whether the move improves the original position's evaluation (§6.2.1, p. 4)
4. accept only output passing both hard critics; otherwise re-prompt with rejection feedback (§6.2.1, p. 4)
5. if parsing fails three consecutive times, reset context to the original prompt without feedback (§6.2.2, p. 4)

The paper describes the gate as: “Two hard critics gate model output, with Critic #1 checking move validity (Is the generated move legal in the given position?) and Critic #2 checking move accuracy (Does the generated move improve the evaluation of the original position?).” (§6.2.1, p. 4) Appendix A shows an invalid `Rxc7` rejected with a legal-move list; Appendix B shows legal but inaccurate `f3e2` rejected because the position is mate in one (Appendix A–B, pp. 12–14).

Inference: in Verus, replace the chess checker with a Verus compile/verify invocation. Generate a candidate Rust proof or implementation, run Verus as the hard critic, feed diagnostics back, and accept only a verifier-successful candidate. Verus errors are stronger than a language-model self-critique, but the loop still proves only the written contracts.

## technique: separate parser recovery from semantic checking
The implementation filters hallucinated “Model:” and “User:” tags, gives new feedback only when the parsed move differs from the previous move, and checks response coherence on every retry (§6.2.2, p. 4). After three parse failures it resets context, preventing unhelpful feedback from accumulating. This is a general repair policy: syntactic failures get a bounded retry and reset; semantic failures receive domain-specific counterevidence.

Inference: a VL loop should distinguish Rust syntax/parse failures, Verus contract failures, and timeouts. Repeating the same diagnostic without changing the candidate is wasteful; after a bounded number of identical failures, restart with a compact original context. This policy is not a Verus feature and must be implemented by the orchestration layer.

## technique: measure validity and correctness with explicit denominators
The paper defines position-wide accuracy as “# of correct responses / total # of positions” (Eq. 1, §6.3, p. 4), puzzle accuracy as solved puzzles divided by total puzzles (Eq. 2), and sanity as one minus invalid parses divided by total positions (Eq. 3, §6.4, p. 4). For pass@10 and modulo, any of ten responses may count as correct (§6.3, p. 4), so those results are not directly comparable to pass@1 deployment behavior.

Table 2 reports RedPajama 3B on n=300 mate-in-N puzzles: position accuracy rises from 2.0±1.4% with pass@10 to 21.2±4.3% with modulo; puzzle accuracy rises from 1.4±1.4% to 10.9±4.5% (§7.2, Table 2, p. 6). Table 3 reports sanity on the same denominator: RedPajama rises from 50.8% pass@10 to 95.3% modulo, while OpenLLaMa rises from 51.5% to 81.3% (§7.3, Table 3, p. 7). ChessGPT-Base instead has higher position accuracy with pass@10 (58.7±5.1%) than modulo (33.8±4.9%), showing that a verifier loop is not uniformly better for a model that already internalized some verifier signal (§7.2, Table 2, p. 6).

## what is proved, trusted, and brittle
Stockfish 18 depth 20 supplies the ground truth; the authors report it remains correct at 0.05 seconds with 98.9% puzzle and 99.5% position accuracy on n=300 (§7.1, Table 1, p. 5). The LLM-Modulo loop guarantees accepted moves satisfy the implemented legality and evaluation critics, not that Stockfish's evaluation captures all chess quality. The model, parser, prompt, temperature, and critic implementation remain trusted for the experiment. A reported inconsistency is that the paper's abstract says RedPajama best-move accuracy rises from 1.2% to 21.2%, whereas Table 2's pass@10 baseline is 2.0% position accuracy and its modulo result is 21.2% (§Abstract, p. 1; §7.2, Table 2, p. 6); the denominator and inference condition differ, so the abstract number should not be silently substituted for the table.

Inference: for VL, the threat is high if an agent treats plausible proof text as evidence and moderate if every candidate is checked by Verus. The paper's own conclusion says verifier-in-the-loop can provide correctness guarantees for final output, but intermediate reasoning traces remain unverified (§8.1–8.2, pp. 8–9). VL should therefore verify executable code and contracts, discard failed candidates from active context after bounded retries, and avoid claiming that explanations are proofs.

## techniques for the catalog
- hard verifier-in-the-loop — gate generated actions with independent validity and semantic critics, retrying with feedback
- bounded retry and reset — suppress repeated parser failures and restart context after three consecutive failures
- explicit metric denominators — distinguish pass@1, pass@10, puzzle-wide success, position accuracy, and sanity
- verifier-scope discipline — treat accepted output as satisfying implemented checks while recording what remains trusted
Checked 2026-10-15 against paper tang2026brittleness: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
