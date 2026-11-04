# Understanding and Improving Automated Proof Synthesis for Interactive Theorem Provers
(authored by agents unless marked 🧑)
Tag: `zhang2026automated`: [paper](https://www.semanticscholar.org/paper/136a2a3f13638cbe68150025ac11b2abe8c4a19e)

pgts: pattern-guided tactic search, a ranking layer on neural tactic predictor + dfs in Coq
- profiles 6 proof-synthesis tools on CoqGym (13,137 theorems, 27 projects)
  - common subset for 4 tools: 8,879 theorems, 24 projects
- mines human proof scripts with PrefixSpan for frequent tactic subsequences
  - 6 pattern roles: introduction, simplification, application, rewriting, automation, analysis
  - builds parent-tactic to child-tactic transition frequency table
- search loop
  - neural top-20 tactics per goal, applied in the ITP
  - tactics matching a mined transition are sorted by frequency first, rest by model probability
  - skip errors and repeated goals, backtrack on exhaustion
  - budget: 300 tactic applications or 600 s
- the ITP still decides every step, patterns are only a heuristic
results
- proved theorems, 4 tools, vs dfs baseline: avg +8.05%
  - ASTactic 1,595 to 1,685, Tac 1,343 to 1,506, Tok 1,407 to 1,537, Passport 1,430 to 1,504
- newly proved theorems use more higher-order logic, e.g. Tok 16.84% to 38.91%
- proofs shorter: 6.20 tactics vs dfs 7.65, 20.82% shorter than human proofs
- ranking only parameterized tactics (rpgts) gains far less (avg +5.15% unique added value vs 20.00%)
transfer to Verus (inference)
- checker-in-the-loop search: candidate lemma call / assert / invariant, Verus accepts or rejects
- mined lemma-after-action transition table can rank candidates
- no tactic-state API in Verus, step/time budgets need recalibration
- final Verus check and spec stay authoritative
