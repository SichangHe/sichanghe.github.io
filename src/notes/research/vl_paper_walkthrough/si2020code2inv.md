# Code2Inv: A Deep Learning Framework for Program Verification
(authored by agents unless marked 🧑)
Tag: `si2020code2inv`, [paper](https://doi.org/10.1007/978-3-030-53291-8_9)
## scope and relation to earlier notes

Code2Inv learns loop invariants or unknown predicates by interacting with a proof checker. The paper's distinct contribution is a reusable neural policy parameterized by a graph representation and an invariant grammar, with counterexamples converted into a continuous reinforcement-learning reward. Earlier notes already cover general loop-invariant synthesis (`a_neurosymbolic_approach_to_loop_invaria_20261013.md`) and proof decomposition; this study records Code2Inv's checker interface, graph/grammar parameterization, policy algorithm, transfer experiment, CHC extension, and reported limits.

## technique 1: checker-in-the-loop policy learning

What it is. Code2Inv treats proof search as a CEGIS loop. A neural policy samples an invariant candidate; a black-box checker either accepts it or returns a counterexample; the policy updates from accumulated counterexamples. The framework is intentionally independent of a particular checker or domain.

When to use it. Inference: use this when candidate specifications can be generated from a grammar and the checker can provide counterexamples or a graded measure of which counterexamples a candidate satisfies. The abstract describes Code2Inv as a framework “which takes a verification task and a proof checker as input, and automatically learns a valid proof for the verification task by interacting with the given checker” (Abstract, p. 151).

How the paper does it (Algorithm 1, p. 155; explanatory text, pp. 155–156).

1. Define a graph constructor `G` for the verification task and invariant grammar `A`; the grammar has placeholder symbols for entities such as variables, constants, and operators, later replaced by concrete values from the verification instance (Section 3, p. 153). The policy has four networks: two GNNs for the task and grammar graphs, a GRU for the attention context, and a Tree-LSTM that encodes the partially generated invariant (Section 3, p. 154).
2. Initialize graph neural networks for the task and grammar, the context updater, and the Tree-LSTM invariant encoder with random or optional pretrained weights (Algorithm 1 lines 6–10; “Initialization,” p. 156).
3. Start with the grammar's start symbol. Repeatedly select the leftmost non-terminal or placeholder until the candidate is complete (Algorithm 1 lines 11–24).
4. For a non-terminal, use attention over grammar production-rule embeddings to expand it. For a placeholder, use attention over task-node embeddings to choose a concrete value (Algorithm 1 lines 18–23).
5. Count how many accumulated counterexamples the candidate satisfies. If it satisfies all, call the checker; save the invariant and policy weights on success, otherwise add the new counterexample (Algorithm 1 lines 25–35; “Neural Policy Improvement,” p. 156).
6. Update all policy components with standard policy gradient using the reward (Algorithm 1 lines 37–39).

The reward is the fraction `n/|C|`, where `n` is the number of counterexamples satisfied and `C` is the accumulated set (Algorithm 1 lines 26 and 34). The paper says a 0/1 sufficiency reward “is too sparse to improve the policy, since most candidate invariants generated are insufficient” (p. 156), so the fraction gives signal before a complete invariant is found.

Verus form. Inference: represent a loop invariant as a constrained candidate generated from a Rust/Verus-specific grammar, then ask Verus to check it against the function's `requires`, loop `invariant`, and `ensures`. A failed check is the Verus analogue of a checker counterexample, although Verus may expose an unsatisfied verification condition rather than a concrete program state. Score candidates by the number of saved obligations they discharge, or by verified subgoals, and train or rank the generator from that score. Keep the final proof in Verus `invariant` clauses, `assert` statements, and `proof fn`s; the learned policy remains an untrusted search heuristic.

Evidence and limits. On 133 C programs from SyGuS, the authors compare Code2Inv with their earlier prototype and three tools (C2I, LoopInvGen, ICE-DT), each on a single 2.4 GHz AMD core with up to 12 h and 4 GB (Section 4, p. 159). They compare the number of Z3 queries rather than wall-clock time because hardware and software environments affect absolute running time and all the C loop-invariant solvers rely on Z3 (Section 4, p. 159). The paper calls this “an imperfect metric but a relatively objective one” (p. 159). It states that Code2Inv “significantly outperforms other state-of-the-art solvers in terms of verification cost” and that the general framework Code2Inv-G is “comparable to (slightly better than)” the earlier specialized prototype Code2Inv-S (Figure 4a, p. 159). Code2Inv is initialized randomly unless stated otherwise (p. 159). Inference: the checker (Z3), graph encodings, and reward implementation are what the reported result relies on; the neural policy gives no soundness guarantee.

## technique 2: graph representations for structural generalization

What it is. The policy embeds both the verification instance and the invariant grammar. For C, the instance graph combines an SSA-based abstract syntax tree with control-flow and data-flow edges. For each graph, a GNN performs message passing; the resulting node embeddings are attention memories.

When to use it. Inference: use a structurally rich graph when similar programs differ in names or constants but share control/data-flow structure. The paper uses a minimal node representation for CHCs because there “graph construction ... is not as obvious” (p. 158).

How the paper does it.

1. Convert the C program to static single assignment (SSA) form (Section 3, “Instantiation to Synthesize Loop Invariants for C Programs,” p. 157).
2. Build an AST graph and add control-flow and data-flow edges (p. 157).
3. Use different edge types as separate message-passing channels (p. 157).
4. Annotate variable, constant, and operator nodes with placeholders such as `VAR`, `CONST`, and `OP`; the sampler later binds placeholders to nodes from the task graph (p. 157).
5. Embed the graph with a GNN and aggregate its node embeddings into the policy context (Section 2, p. 153; Algorithm 1 line 13, p. 155; p. 156).

Verus form. Inference: build a syntax/control-flow graph from a Rust function, including loop headers, mutable fields, branch edges, and expressions that define the candidate invariant's terms. Embed it to rank which fields, constants, or helper predicates should fill grammar placeholders. The graph is a search representation; Verus still checks the resulting `invariant` and contracts. Rust ownership and mutable aliasing add edges and preconditions that the paper's C graph does not model.

Evidence and limits. The paper's transfer experiment randomly perturbs the C benchmark programs with edits such as renaming variables and injecting variables and statements, obtaining 100 variants per program, 90 for training and 10 for testing (Section 4, “Transferability,” pp. 159–160). Figure 4b compares an untrained and a pre-trained model, and the authors conclude that “the learned neural policy can be transferred to accelerate the search for loop invariants for similar programs” (p. 160). The text gives no aggregate number for this comparison. Inference: the evidence supports the structural assumptions for this synthetic benchmark family, not for arbitrary programs.

## technique 3: grammar-controlled candidate generation

What it is. An invariant grammar `A = <Σ,H,N,P,S>` specifies terminals, placeholders, non-terminals, production rules, and a start symbol. Separating grammar from policy lets the same networks generate different invariant shapes or solve another domain by changing `A` and the checker.

When to use it. Inference: use a grammar to bound the candidate language, avoid syntactically invalid outputs, and expose a controlled extension point for non-linear arithmetic or other predicate forms. The paper says the grammar “can be arbitrarily defined” (p. 158).

How the paper does it. At each generation step, the policy selects a production rule for the leftmost non-terminal or a task value for the leftmost placeholder (Algorithm 1 lines 14–23). The grammar is embedded as a node representation (no edges) in both C and CHC cases; each node represents either a terminal or a production rule (Section 3, “Embedding Invariant Grammar,” p. 158). Placeholders such as VAR, CONST, and OP abstract away instance-specific details, so the policy can generalize to instances that share the same grammar (p. 158).

Verus form. Inference: define a candidate grammar over Rust expressions and `spec fn` predicates, with placeholders for fields, constants, and library predicates. Generate only text that can become a Verus `invariant` or a helper contract. A grammar cannot encode all Rust typing and ownership constraints, so run Verus after generation and use diagnostics to reject or repair ill-typed candidates. Do not put generated candidates into executable code until the verifier accepts them.

Evidence and limits. The paper says that “by simply adjusting the invariant grammar, Code2Inv is immediately ready for solving CHC tasks involving non-linear arithmetic” (p. 160). The text shows only an example grammar (Figure 3c, p. 157) and no comparison of costs across grammars. Inference: grammar design remains human supplied.

## technique 4: transfer learned policies across program variants

What it is. Once a candidate invariant succeeds, Code2Inv saves the neural weights. For related future programs, those weights initialize the search instead of starting randomly.

When to use it. The paper calls transfer “especially useful in the CI/CD setting [25] where programs evolve incrementally and quick turnaround time is indispensable” (p. 160).

How the paper does it. The authors randomly perturb each C benchmark program, obtain 100 variants, use 90 for training and 10 for testing, and show the difference between an untrained (random weights) and a pre-trained model in Figure 4b (Section 4, “Transferability,” pp. 159–160). The text does not say precisely which runs the figure plots. The introduction says the graph representation lets the policy “generalize to different but structurally similar programs” (p. 152).

Verus form. Inference: cache policy parameters or ranked invariant templates by a stable structural representation of Rust functions. On a changed function, seed search with transferred candidates, then rerun Verus from scratch. Transfer must never reuse a prior proof result without checking the current source, contracts, dependencies, and compiler version.

Evidence and limits. The evidence is Figure 4b's unaggregated comparison on synthetic variants. It does not measure real repository commits, cache invalidation, or false reuse. Inference: a transferred candidate can speed search while still being rejected by the checker.

## technique 5: instantiate the same framework for CHCs and missing checker feedback

What it is. Constrained Horn clauses encode recursive, inter-procedural, and multi-threaded programs as unknown predicates constrained by Horn rules. Code2Inv uses a minimal node representation for a CHC instance, then searches for predicates with the same policy machinery. The paper notes the downside: “no structural information is captured by the neural embeddings which in turn prevents the learned neural policy from generalizing to other structurally similar instances” (p. 158).

When to use it. Inference: use this when a verification domain lacks an obvious control/data-flow graph or when the checker may stall but a search policy can still receive reward updates.

How the paper does it.

1. Collect CHCs from C programs using SeaHorn (Section 4, p. 159).
2. Represent the arguments of the unknown predicate and the constants of the Horn rules as nodes, with no edges (Section 3, “Instantiation to Solve Constrained Horn Clauses,” pp. 157–158).
3. Embed the invariant grammar as a node representation too (Section 3, “Embedding Invariant Grammar,” p. 158) and train the same policy/checker loop.
4. For non-linear arithmetic, change the invariant grammar and continue learning even when the checker gives no counterexample; assign zero or negative reward when it gets stuck (Section 4, p. 160).

Verus form. Inference: model a Rust module's unknown summary predicates as `spec fn`s and generate candidate definitions. Use Verus proof obligations from callers as checker feedback. If a solver timeout yields no counterexample, record a failed or negative reward and try another candidate; never treat timeout as proof. The CHC node representation has no direct Rust equivalent, so the useful transfer is the checker-independent interface, not the exact graph.

Evidence and limits. SeaHorn produces empty Horn rules on 13 of the 133 C programs “due to optimizations during VC generation that result in proving the assertions of interest” (footnote 3, p. 159). Inference: these 13 are the programs missing from the 120 CHC instances (133 − 13 = 120). Code2Inv solved 94/120 CHCs, compared with Spacer 112/120 and LinearArbitrary 118/120 (Section 4, p. 160). On seven author-created non-linear instances, Code2Inv solved 5/7 while both baselines solved 0/7. The non-linear set is a seven-instance case study, not part of the 120-instance benchmark; the instances are in the paper's artifact (footnote 4, p. 160).

## technique 6: naturalness regularization and post-processing

What it is. The authors inspect whether solutions are natural. They report that Code2Inv's solutions “tend to be more natural, whereas Spacer and LinearArbitrary tend to find solutions that unnecessarily depend on constants from the given verification instance” and that such overfitted solutions “may become invalid when these constants change” (Section 4, “Naturalness,” p. 160). Expressions such as `(+ 0 0)` in Code2Inv's solutions “can be eliminated by post-processing simplification akin to peephole optimization in compilers” (p. 161).

When to use it. Inference: use this when generated proofs must survive parameter changes or be readable by humans, not merely pass one checker run.

How the paper does it. It compares solutions from Code2Inv, Spacer, and LinearArbitrary in a case study (Figure 5, p. 160). The two remedies are only proposed, not implemented or evaluated: post-processing simplification, or “the reward mechanism in Code2Inv could incorporate a regularizer on the naturalness” (p. 161).

Verus form. Inference: score generated `spec fn` predicates and `invariant` clauses for dependence on concrete test values, then prefer symbolic field relationships and reusable helper predicates. Run a simplifier only when its rewrite rules are separately proved sound or followed by Verus rechecking. Readability is a product constraint; it does not weaken the final proof obligation.

## what is proved, measured, and trusted

The paper states no theorem about neural-policy convergence. It measures checker outcomes and query/time proxies: 133 C SyGuS programs, 120 CHC instances, transfer variants with a 90/10 split and 100 variants per original, 94/120 CHCs solved by Code2Inv, 112/120 by Spacer, 118/120 by LinearArbitrary, and 5/7 author-created non-linear cases solved by Code2Inv versus 0/7 by both baselines. For C runtime, the Limitations paragraph says “90% of the solved C instances took 2 h or less, and the rest could take up to 12 hours to solve” and that “Code2Inv generally runs slower compared to other contemporary approaches” (p. 161). It also says Code2Inv “does not support finding loop invariants for programs with multiple loops, function calls, or recursion” (p. 161).

Inference: the proof checker and its semantics, Z3, the frontends (Clang for C, SeaHorn for CHC collection), the graph constructors, the grammar supplied by the authors, the policy implementation, and the benchmark transformations are what a reader must trust; the paper does not use this framing. A learned candidate is useful only because the checker accepts it; policy success is not a soundness argument.

Threat to a product of agent-written verified Rust.

## techniques for the catalog

- checker-in-the-loop synthesis — sample grammar-constrained invariants, accumulate checker counterexamples, and update a neural policy with fractional reward
- graph-conditioned search — encode task control/data flow and grammar nodes with GNN message passing to transfer across structurally similar programs
- grammar-controlled generation — separate candidate language from policy so invariant forms and domains can change without rewriting the learner
- policy transfer — save successful weights and initialize related program variants from them after a 90/10 training/test split
- checker-independent CHC extension — reuse the policy with a minimal node representation and a different checker, including non-linear grammars
- naturalness-aware output — proposed in the paper: post-process trivial expressions or add a naturalness regularizer to the reward, while retaining checker validation
