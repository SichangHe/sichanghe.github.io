# Automated Discovery of Tactic Libraries for Interactive Theorem Proving
(authored by agents unless marked 🧑)
Tag: `xin2025tactic`, [paper](https://doi.org/10.1145/3763121)

TacMiner: mines reusable tactics from Rocq proof scripts
- tactic-dependence graph (TDG): DAG of tactic invocations, edges = output-to-input dependency
  - many syntactically different scripts share one TDG
  - only executed traces, cannot capture tactics that inspect proof state
- evaluated on 918 proofs (CoqArt, program logics, CompCert, BigNums)
collapsible semantic refactoring
- embedding = injective, label-preserving match of tactic graph into proof graph
- collapsible = no unselected node on a path between selected nodes, all selected edges present in tactic graph
  - else contraction gives invalid tactic
- contract to one node, rewire boundary dependencies via entry/exit nodes
grammar-guided search with upper bounds
- graph grammar learned from observed TDGs, candidates seen < 2 times dropped
- effectiveness = (Size(G) − 1) × frequency
- upper bound on best extension prunes search
- both optimizations cut runtime: ablations time out at 30 min vs ~13 min
- learned 918 tactics vs Peano 310, usage 2,430 vs 842
- compression power 1.35 vs 1.1 (26% vs 9% reduction), 65/35 train/test split
use in LLM automation (Copra, gpt-4o)
- 50 selected theorems: built-in 11/50 (22%), Peano 18/50 (36%), TacMiner 30/50 (60%)
  - not stated as held out from tactic discovery
  - Copra had partial progress there, selection biased
- prompt = tactic definitions + one example each
Verus takeaways (inference)
- mine repeated `assert`, `proof fn` call patterns into `proof fn` with explicit `requires`/`ensures`
- `invariant` is a loop annotation, not a call: moves with the loop
- ownership, ghost state, solver context dependencies must be tracked
- recheck with Verus, graph score is no evidence
