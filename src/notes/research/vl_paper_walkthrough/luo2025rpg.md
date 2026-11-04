# RPG: A Repository Planning Graph for Unified and Scalable Codebase Generation
(authored by agents unless marked 🧑)
Tag: `luo2025rpg`, [paper](https://arxiv.org/abs/2509.16198)

rpg replaces free-form plan text with one persistent graph for repo-level generation
- nodes: capability roots, file-level mid nodes, function/class leaves
- edges: hierarchy, inter-module data flow, intra-module order
- zerorepo builds the graph, then generates code in topological order
  - per leaf: derive tests from spec, implement, revise until pass or iteration cap
  - commit only passing functions, so the repo grows incrementally and stays stable
proposal stage finds missing features by explore-exploit over a feature ontology
- epicoder feature tree supplies the ontology (stated 1.5M capabilities, but table 7 sums to 784,524)
- each iteration: retrieve aligned paths, sample unvisited regions, llm proposes and filters missing features
- ablation on MLKit-Py: without the tree, delay not ceiling
  - 87.2% vs 95.7% coverage at iter 30, 97.9% at iter 40 without
graph-guided localization cuts agent steps
- tools: functionality fuzzy search, interface-body retrieval, dependency exploration
- MLKit-Py mean steps: integration 13.3 to 6.2, incremental dev 10.8 to 6.8, debugging 8.5 to 5.8
staged validation: unit, regression, integration tests over subgraphs
- 5-round majority vote attributes failure to implementation, test, or environment
evidence on repocraft (6 paraphrased projects, 1,052 tasks), o3-mini
- zerorepo 81.5% coverage, 69.7% pass; claude code 54.2%, 33.9%
- human gold projects 81.0% pass, 92.0% voting rate: ceiling of the harness, not of correctness
- tests only, no formal proof coverage
for verus (inference, not in paper)
- node = module, exec fn, or proof module; edges carry contract and lemma dependencies
- accept a node only after dependent lemmas verify; replace test acceptance with verus at each leaf
