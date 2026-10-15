# Understanding and Improving Automated Proof Synthesis for Interactive Theorem Provers
(authored by agents unless marked 🧑)
Tag: `zhang2026automated`: [paper](https://www.semanticscholar.org/paper/136a2a3f13638cbe68150025ac11b2abe8c4a19e)

## study and measurable bottlenecks
This paper profiles six proof-synthesis tools on CoqGym and derives a search heuristic called Pattern-Guided Tactic Search (PGTS). CoqGym has 13,137 test theorems from 27 projects; the authors compiled all 27 projects with Coq 8.9.0 (§3.1.2, p.3). For a fair comparison of the four tools used by PGTS, they use the intersection of compatible runs: 8,879 theorems from 24 projects (§3.1.2, p.3). The paper's central observation is that synthesis is a tree search in which a neural model proposes tactics and the interactive theorem prover (ITP) accepts, rejects, or advances each candidate.

The authors mine human proof scripts rather than asking the neural model to rediscover all ordering information. PrefixSpan finds frequent tactic subsequences; two authors classify them into Introduction, Simplification, Application, Rewriting, Automation, and Analysis patterns. Their Cohen's kappa is 0.90 (§3.2.2, p.4). To reproduce the data preparation: collect training proof sequences, represent each as tactic tokens, mine frequent sequential patterns with PrefixSpan, classify each pattern, and count parent-tactic/child-tactic transitions. The resulting frequency table is the input to PGTS.

## PGTS algorithm
PGTS is a ranking layer around an existing neural tactic predictor and DFS proof search. Its steps are explicit in Algorithm 1 (p.12):

1. start from the initial goal and ask the neural network for its top 20 tactics (Algorithm 1, lines 2–4)
2. push candidates in descending score order and maintain a `Seen` set containing goals already reached
3. pop a tactic, apply it in the ITP, and record the result (lines 10–11)
4. on success, return the accumulated proof; on an error or repeated goal, skip the tactic (lines 12–20)
5. on a new proving state, append the tactic, add the goal to `Seen`, and generate another top-20 list (lines 22–26)
6. when there is a parent tactic, partition predictions into transitions present in the mined pattern table and the remaining predictions (lines 30–37)
7. sort matching transitions by observed frequency, then sort the remainder by neural probability; continue depth-first
8. if a node exhausts its candidates, backtrack to the preceding goal and try its untried tactics (lines 5–9)
9. terminate with no proof after 300 tactic applications or 600 seconds (Algorithm 1 and §6, p.11)

For the initial goal there is no parent tactic, so PGTS preserves the neural ordering. For every later goal, pattern frequency is a heuristic only: each tactic still must compile and produce a new ITP state. Restricted PGTS (RPGTS) applies pattern ranking only to parameterized tactics, providing an ablation.

The paper describes the interaction succinctly: “The system attempts to apply each tactic in the top-k list using the interactive theorem prover” (Algorithm discussion, §6, p.11). It also specifies the stopping rule: “We follow the settings used in prior work by imposing a maximum time limit of 600 seconds and restricting the total number of tactic applications to 300” (§6, p.11). These are operational limits, not completeness guarantees.

## results and denominator checks
On the common 8,879-theorem subset, PGTS raises the number proved by ASTactic from 1,595 to 1,685 (90 additional, 5.64%); Tac from 1,343 to 1,506 (163, 12.14%); Tok from 1,407 to 1,537 (130, 9.24%); and Passport from 1,430 to 1,504 (74, 5.17%) (Fig. 11, p.13). The arithmetic is additional divided by the DFS baseline: 90/1,595, 163/1,343, 130/1,407, and 74/1,430. The reported mean is 8.05% across the four tools. The paper's answer is, “PGTS improves the performance of proof synthesis tools by increasing the number of successfully proven theorems by an average of 8.05%” (§7.2, p.13).

Unique Added Value uses theorems PGTS proves that DFS does not, divided by the DFS count. Table 1 reports 240/1,595 = 15.05% for ASTactic, 327/1,343 = 24.35% for Tac, 329/1,407 = 23.38% for Tok, and 246/1,430 = 17.20% for Passport; mean 286 and 20.00%. RPGTS is lower (50, 68, 94, and 82 additional, mean 74 and 5.15%), so ranking all tactics is material.

For capability, the share of newly proved theorems involving higher-order logic rises from 19.44% to 29.17% for ASTactic, 18.76% to 32.72% for Tac, 16.84% to 38.91% for Tok, and 20.42% to 37.80% for Passport (Table 2, p.13). The reported relative increases (50.05%, 74.41%, 131.00%, 85.11%) are each computed against the DFS percentage. For quality, PGTS has average proof length 6.20 tactics versus DFS 7.65 and RPGTS 6.67, and the average reduction compared with human proofs is 20.82% (§7.4, p.14). ASTactic is an exception where PGTS is slightly longer than DFS; RPGTS remains shorter.

## Verus form and limits
Inference: represent a Verus verification goal as executable Rust plus `requires`/`ensures`, and treat each candidate lemma call, `assert`, or loop `invariant` as an action submitted to Verus. Maintain a normalized state consisting of the current diagnostic obligations and available facts; branch on candidate `proof fn` calls or assertions, and let Verus decide whether the branch verifies. A mined transition table can rank which lemma or assertion tends to follow a previous proof action, but Verus has no Coq tactic-state API or universal top-20 tactic vocabulary.

Inference: the PGTS structure transfers as a checker-in-the-loop search policy, while Coq tactics, PrefixSpan token meanings, and the 600-second/300-step limits do not transfer without calibration. A proof function is erased from executable Rust, so generated proof code must remain in proof contexts; `invariant` is a loop declaration, not a call. The final Verus check, specification, and trusted library contracts remain authoritative.

Inference: The threat to agent-written verified Rust is substantial for proof-search cost and stability: PGTS improves an existing search by 8.05% on this Coq benchmark, but it does not synthesize specifications, loop invariants, or models. The paper itself reports the boundary: “The search process is formally described in Algorithm 1, which integrates neural predictions with mined human expert proof patterns” (§6, p.11). Inference: VL should reuse the idea of mining successful proof transitions from its own Verus corpus; it should not claim the Coq percentages as Verus evidence.

## what is trusted and what remains open
The ITP checks each tactic transition, but theorem statements, imported Coq libraries, mined pattern labels, neural predictions, and benchmark setup remain outside the learned heuristic's proof. Search can fail because the budget expires even when a proof exists. The paper studies four baseline systems in the PGTS evaluation and does not establish superiority over all synthesis methods or all theorem distributions. It already covers pattern mining, backtracking, no-repeat goal detection, and restricted-pattern ablation; a VL study should measure transfer to real Verus proof diagnostics rather than repeat a generic pattern-ranking claim.

## techniques for the catalog
- sequential proof-pattern mining — mine PrefixSpan tactic subsequences from human scripts and classify them into six proof roles
- pattern-guided tactic ranking — reorder neural top-k candidates by parent-tactic transition frequencies, then fall back to model probability
- checker-in-the-loop DFS — apply candidates in the ITP, skip errors and repeated goals, and backtrack when a branch exhausts
- bounded synthesis evaluation — enforce explicit tactic and time budgets and report added-value fractions against the same DFS denominator

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
