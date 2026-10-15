# Parsel: Algorithmic Reasoning with Language Models by Composing Decompositions
(authored by agents unless marked 🧑)
Tag: `zelikman2022parsel`, [paper](https://www.semanticscholar.org/paper/e325fe41c8c1d547ccd102ac82be3ec8b23960f2)

## scope and result

Zelikman et al. introduce Parsel, an intermediate language and synthesizer for hierarchical program generation. A language model first decomposes a task into natural-language function descriptions; another model samples implementations; a synthesizer composes candidates and tests combinations against constraints. The paper's core observation is that modular functions let a search reuse implementations instead of regenerating complete programs. “With Parsel, we automatically decompose algorithmic tasks into hierarchical natural language function descriptions and then search over combinations of possible function implementations using tests.” (Abstract, PDF p.1)

Parsel is not a formal verifier. Its validation evidence is executable tests, generated tests, CodeT scores, and benchmark pass rates. Inference: the relevance to verified Rust is its decomposition and candidate-search structure could organize specification, proof-lemma, and implementation generation, but tests do not prove a contract.

## technique 1: the Parsel intermediate language

A Parsel program has lines that are function descriptions, references, or constraints. Descriptions say what a function does in natural language and can include a name and arguments. References tell a model that one function should call another description. Constraints are executable checks; if absent, the framework may generate them. The paper states: “In Parsel, each line contains a function description, a constraint, or a reference to a description.” (Section 2.1, PDF p.2)

Apply it as follows. (1) Write a high-level algorithm sketch. (2) Split it into named functions with signatures and concise behavior descriptions. (3) Add references from parents to children. (4) Add input-output assertions or unit tests for functions whose behavior can be checked locally. (5) Keep descriptions modular so a child implementation can be replaced without editing its parent. In the paper's knapsack example, parsing, per-size dynamic programming, and output formatting are separate functions, and the root composes them.

Inference: in VL, each description could state a Rust function's mathematical postcondition, each constraint could be a Verus `ensures` obligation or proof lemma, and references could become calls between verified modules. The mapping is not in the paper; Parsel's language has no verifier semantics, ownership model, or proof obligation.

## technique 2: SCC factoring and sequential synthesis

The dependency graph is split into strongly connected components (SCCs). When there is no recursion, every function is its own SCC and can be implemented in topological post-order. For each function, the synthesizer prompts a code LLM with its description, signature, and child descriptions, samples candidate implementations, and selects one satisfying that function's constraints. The paper says: “By factoring the dependency graph into strongly-connected components (SCCs), we ensure the complexity grows exponentially only with the size of the largest strongly-connected component but not the total number of functions.” (Section 2, PDF p.2)

Steps (Sections 2.3.1–2.3.2, PDF pp.3–4). (1) Build the call graph. (2) Compute SCCs. (3) Process acyclic components from leaves toward the root. (4) For a function, aggregate child signatures and descriptions into the model prompt. (5) Generate several implementations. (6) Run that function's constraints and retain passing candidates. (7) Make parent prompts refer to the selected child interface, not its source details. (8) Continue until the root is implemented.

Recursive SCCs require joint implementation because each function can call another in the same component. The paper searches combinations of candidate implementations for the SCC and tests the resulting group. Inference: a Verus-oriented generator could make an SCC contain mutually recursive proof functions and implementations, then require all `requires`/`ensures` and termination obligations to pass together. Verus's actual termination and recursive-proof syntax must be supplied separately; Parsel does not specify it.

## technique 3: combinatorial mix-and-match search

For each function, generate a set of candidates once, then search minimal combinations instead of sampling complete programs. If function i has candidate set I(fi), the composed space is the Cartesian product; generation cost is roughly linear in candidates while the number of complete programs can grow exponentially. Constraints prune combinations. When all functions have tests and the graph is acyclic, post-order local selection is enough. When only the root has tests, the synthesizer tests complete combinations. For test-less inner functions, the paper adds dependency edges from the test-less child to its parent, so a parent's constraint evaluates the child indirectly.

The paper reports: “Since Parsel will ‘mix-and-match’ function implementations, the number of distinct candidate programs available to test grows exponentially with k, while the generation cost for the components is linear.” (Section 3.1, PDF p.5). Use this when candidate generation is expensive and execution tests are cheap. Limitations are explicit: recursive SCCs and many weak constraints can make exhaustive evaluation expensive.

Inference: VL could mix implementation candidates with proof candidates, retaining only combinations whose Verus verification succeeds. A proof obligation should be a hard constraint, while tests can be a cheap pre-filter. This is a proposed adaptation, not a Parsel result, and it must preserve soundness by never treating a passing test as a proof.

## technique 4: automatic test generation and constraint propagation

If a top-level function has no tests, Parsel asks a language model to generate tests and selects the implementation with the highest CodeT score. For inner functions, the dependency approach lets parent constraints validate them indirectly. Generated tests are treated as potentially incorrect: the paper says, “For generated tests, we select the best implementation based on CodeT score [11], as some generated tests could be incorrect.” (Section 2.3.2, PDF p.4)

Steps. (1) Detect missing constraints. (2) For an inner function, add a dependency edge to a constrained parent. (3) For an unconstrained root, prompt for tests. (4) Run all candidate implementations on the tests. (5) Rank by number or model score of passing tests. (6) Retain the best candidate and continue composition. This improves search but leaves underspecification and incorrect generated tests as failure modes.

Inference: use this in VL only as a triage stage before Verus; generated examples can suggest lemmas or counterexamples but cannot discharge `ensures`. A robust system would ask Verus to prove each generated property and record the property as trusted only after proof checking.

## technique 5: evidence from benchmark evaluation

On APPS competition problems, the authors translate generated high-level plans into Parsel, sample n Parsel programs and k implementations per function, and report pass@n×k against direct Codex and AlphaCode generation. The paper reports an increase from 14.5% to 25.5% in its stated comparison (Section 3.1, PDF p.5). On HumanEval, GPT-4 plus Parsel reaches 85.1% pass@1 with generated tests; the procedure sampled until three Parsel programs had an implementation pass one generated test, then selected the candidate passing the most tests. It averaged 3.5 Parsel programs per problem with eight implementations each, fewer than 32 complete implementations on average. Without filtering, up to eight Parsel programs achieved 91.5% pass@any, while 64 direct programs achieved 82.3%; with 128 direct programs versus 16×8 Parsel, rates were 84.1% and 93.9% respectively (Figure 5, PDF p.6).

The ablation gives stronger causal evidence for the intermediate language: translating the same plans directly to Python dropped pass@8×16 from 25.5% to 6% on 100 randomly sampled APPS problems. The human-expert study solved 5/10 problems in six hours; GPT-3-generated Parsel solved 2/10 with eight attempts per problem. The authors identify decomposition generation as the bottleneck. These are benchmark results with denominators and sampling budgets; they do not measure proof success, specification accuracy, or Rust safety.

## what is proved, measured, and trusted

Measured: executable benchmark pass rates, sampled candidates, evaluation counts, and a robotic-plan accuracy comparison. Trusted: model-generated decompositions, function descriptions, candidate code, generated tests, test harnesses, and the benchmark's oracle. The paper includes a 21-function Lisp interpreter as a larger synthesis example but does not provide a formal semantic proof. Its failure cases include statefulness assumptions and possible dataset contamination: two GPT-4 solutions match a canonical-looking pattern while not matching the dataset's canonical solution.

Inference: for agent-written verified Rust, Parsel threatens productivity rather than proof soundness directly. It may increase the number of candidate implementations and expose compositional proof opportunities, but it can also produce plausible code that passes weak tests while violating ownership, termination, or security contracts. VL should not redo generic LLM decomposition and test-search benchmarks; existing APPS and HumanEval ablations establish that benefit. A focused experiment would compare Parsel-style decomposition plus Verus checking against direct verified-code generation, counting proved contracts, failed obligations, repair time, and specification errors.

## techniques for the catalog

- hierarchical function decomposition — express an algorithm as named descriptions, references, and local constraints
- SCC-aware synthesis — process acyclic functions in post-order and jointly search recursive components
- combinatorial implementation search — mix candidate implementations across functions and test minimal combinations
- dependency-based constraint propagation — validate unconstrained children through constrained parents
- generated-test ranking — use model-generated tests and CodeT scores to choose candidates when specifications are absent

Checked 2026-10-15 against the paper by a Codex agent for parsel_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
