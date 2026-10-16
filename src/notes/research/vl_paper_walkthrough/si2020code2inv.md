# Code2Inv: A Deep Learning Framework for Program Verification
(authored by agents unless marked 🧑)
Tag: `si2020code2inv`, [paper](https://www.semanticscholar.org/paper/d958d9fc4d660513d8e1854ef487c83045804631)
## scope and relation to earlier notes

Code2Inv learns loop invariants or unknown predicates by interacting with a proof checker. The paper's distinct contribution is a reusable neural policy parameterized by a graph representation and an invariant grammar, with counterexamples converted into a continuous reinforcement-learning reward. Earlier notes already cover general loop-invariant synthesis (`a_neurosymbolic_approach_to_loop_invaria_20261013.md`) and proof decomposition; this study records Code2Inv's checker interface, graph/grammar parameterization, policy algorithm, transfer experiment, CHC extension, and reported limits.

## technique 1: checker-in-the-loop policy learning

What it is. Code2Inv treats proof search as a CEGIS loop. A neural policy samples an invariant candidate; a black-box checker either accepts it or returns a counterexample; the policy updates from accumulated counterexamples. The framework is intentionally independent of a particular checker or domain.

When to use it. Use this when candidate specifications can be generated from a grammar and the checker can provide counterexamples or a graded measure of which counterexamples a candidate satisfies. The paper states: “Code2Inv takes a verification task and a proof checker as input, and automatically learns a valid proof for the verification task by interacting with the given checker” (Abstract, p. 151).

How the paper does it (Algorithm 1, p. 155; explanatory text, p. 156).

1. Define a graph constructor `G` for the verification task and invariant grammar `A`; the grammar has placeholders for variables, constants, and operators (Section 3, pp. 153–154).
2. Initialize graph neural networks for the task and grammar, the context updater, and the Tree-LSTM invariant encoder with random or optional pretrained weights (Algorithm 1 lines 6–10; “Initialization,” p. 156).
3. Start with the grammar's start symbol. Repeatedly select the leftmost non-terminal or placeholder until the candidate is complete (Algorithm 1 lines 11–24).
4. For a non-terminal, use attention over grammar production-rule embeddings to expand it. For a placeholder, use attention over task-node embeddings to choose a concrete value (Algorithm 1 lines 18–23).
5. Count how many accumulated counterexamples the candidate satisfies. If it satisfies all, call the checker; save the invariant and policy weights on success, otherwise add the new counterexample (Algorithm 1 lines 25–35; “Neural Policy Improvement,” p. 156).
6. Update all policy components with standard policy gradient using the reward (Algorithm 1 lines 37–39).

The reward is the fraction `n/|C|`, where `n` is the number of counterexamples satisfied and `C` is the accumulated set (Algorithm 1 lines 25–35). This makes progress possible before a complete invariant is found; a binary success reward would usually be zero.

Verus form. Inference: represent a loop invariant as a constrained candidate generated from a Rust/Verus-specific grammar, then ask Verus to check it against the function's `requires`, loop `invariant`, and `ensures`. A failed check is the Verus analogue of a checker counterexample, although Verus may expose an unsatisfied verification condition rather than a concrete program state. Score candidates by the number of saved obligations they discharge, or by verified subgoals, and train or rank the generator from that score. Keep the final proof in Verus `invariant` clauses, `assert` statements, and `proof fn`s; the learned policy remains an untrusted search heuristic.

Evidence and limits. On 133 SyGuS C programs, the authors compare Z3-query costs rather than wall-clock time because all C invariant tools use Z3 and hardware/software environments affect absolute time (Section 4, p. 159). The paper calls this metric “imperfect” (Section 4, p. 159). The checker, Z3, graph encodings, and reward implementation remain trusted for the reported result; the neural policy itself does not prove soundness.

## technique 2: graph representations for structural generalization

What it is. The policy embeds both the verification instance and the invariant grammar. For C, the instance graph combines an SSA-based abstract syntax tree with control-flow and data-flow edges. For each graph, a GNN performs message passing; the resulting node embeddings are attention memories.

When to use it. Use a structurally rich graph when similar programs differ in names or constants but share control/data-flow structure. Use a minimal node representation only when domain structure is unavailable or expensive to define.

How the paper does it.

1. Convert the C program to static single assignment (SSA) form (Section 3, “Instantiation to Synthesize Loop Invariants for C Programs,” p. 157).
2. Build an AST graph and add control-flow and data-flow edges (p. 157).
3. Use different edge types as separate message-passing channels (p. 157).
4. Annotate variable, constant, and operator nodes with placeholders such as `VAR`, `CONST`, and `OP`; the sampler later binds placeholders to nodes from the task graph (p. 157).
5. Embed the graph with a GNN and aggregate its node embeddings into the policy context (Sections 2 and 3, pp. 153–155).

Verus form. Inference: build a syntax/control-flow graph from a Rust function, including loop headers, mutable fields, branch edges, and expressions that define the candidate invariant's terms. Embed it to rank which fields, constants, or helper predicates should fill grammar placeholders. The graph is a search representation; Verus still checks the resulting `invariant` and contracts. Rust ownership and mutable aliasing add edges and preconditions that the paper's C graph does not model.

Evidence and limits. The paper's transfer experiment perturbs each benchmark program with edits such as variable renaming and injected variables/statements, then creates 100 variants per program, using 90 for training and 10 for testing (Section 4, “Transferability,” p. 159). Pretrained policy weights accelerate similar programs relative to random initialization (Figure 4b), but the figure gives curves rather than a single aggregate percentage. The graph's structural assumptions are therefore supported for this benchmark family, not for arbitrary programs.

## technique 3: grammar-controlled candidate generation

What it is. An invariant grammar `A = <Σ,H,N,P,S>` specifies terminals, placeholders, non-terminals, production rules, and a start symbol. Separating grammar from policy lets the same networks generate different invariant shapes or solve another domain by changing `A` and the checker.

When to use it. Use a grammar to bound the candidate language, prevent syntactically invalid outputs, and expose a controlled extension point for non-linear arithmetic or other predicate forms.

How the paper does it. At each generation step, the policy selects a production rule for the leftmost non-terminal or a task value for the leftmost placeholder (Algorithm 1 lines 14–23). The grammar is embedded as a node representation in both C and CHC cases; each node is either a terminal or production rule (Section 3, “Embedding Invariant Grammar,” p. 158). Placeholders abstract away instance-specific names so one policy can transfer across similar instances.

Verus form. Inference: define a candidate grammar over Rust expressions and `spec fn` predicates, with placeholders for fields, constants, and library predicates. Generate only text that can become a Verus `invariant` or a helper contract. A grammar cannot encode all Rust typing and ownership constraints, so run Verus after generation and use diagnostics to reject or repair ill-typed candidates. Do not put generated candidates into executable code until the verifier accepts them.

Evidence and limits. The paper reports immediate adaptation to non-linear CHC tasks by changing the grammar, but it does not provide the complete grammar or a controlled cost comparison for each grammar. Grammar design remains human supplied.

## technique 4: transfer learned policies across program variants

What it is. Once a candidate invariant succeeds, Code2Inv saves the neural weights. For related future programs, those weights initialize the search instead of starting randomly.

When to use it. Use transfer in CI/CD or other settings where a program changes incrementally and many variants share structure.

How the paper does it. The authors randomly perturb each C benchmark program, create 100 variants, split them 90/10 into training and test sets, train on the 90, and compare a pretrained model with a randomly initialized model on the 10 test variants (Section 4, “Transferability,” p. 159). The policy's graph representation is intended to preserve structural similarity despite renaming or added statements.

Verus form. Inference: cache policy parameters or ranked invariant templates by a stable structural representation of Rust functions. On a changed function, seed search with transferred candidates, then rerun Verus from scratch. Transfer must never reuse a prior proof result without checking the current source, contracts, dependencies, and compiler version.

Evidence and limits. The evidence is Figure 4b's unaggregated comparison on synthetic variants. It does not measure real repository commits, cache invalidation, or false reuse. A transferred candidate can speed search while still being rejected by the checker.

## technique 5: instantiate the same framework for CHCs and missing checker feedback

What it is. Constrained Horn clauses encode recursive, inter-procedural, and multi-threaded programs as unknown predicates constrained by Horn rules. Code2Inv uses a minimal node representation for a CHC instance, then searches for predicates with the same policy machinery.

When to use it. Use this when a verification domain lacks an obvious control/data-flow graph or when the checker may stall but still allows a search policy to receive reward updates.

How the paper does it.

1. Collect CHCs from C programs using SeaHorn (Section 4, p. 159).
2. Represent predicate arguments and constants as nodes, with no edges (Section 3, “Instantiation to Solve Constrained Horn Clauses,” p. 157).
3. Use a grammar for unknown predicates and train the same policy/checker loop (Sections 3 and 4, pp. 154–160).
4. For non-linear arithmetic, change the invariant grammar and continue learning even when the checker gives no counterexample; assign zero or negative reward when it gets stuck (Section 4, p. 160).

Verus form. Inference: model a Rust module's unknown summary predicates as `spec fn`s and generate candidate definitions. Use Verus proof obligations from callers as checker feedback. If a solver timeout yields no counterexample, record a failed or negative reward and try another candidate; never treat timeout as proof. The CHC node representation has no direct Rust equivalent, so the useful transfer is the checker-independent interface, not the exact graph.

Evidence and limits. SeaHorn produced empty Horn rules for 13 of the 133 C programs because optimization had already proved their assertions (footnote 3, p. 159); those are excluded from the 120 CHC instances. Code2Inv solved 94/120 CHCs, compared with Spacer 112/120 and LinearArbitrary 118/120 (Section 4, p. 160). On seven author-created non-linear instances, Code2Inv solved 5/7 while both baselines solved 0/7. These denominators and exclusions matter: the non-linear set is a seven-instance case study, not the 120-instance benchmark.

## technique 6: naturalness regularization and post-processing

What it is. The authors inspect whether learned invariants are natural and avoid constants overfitted to one instance. Code2Inv's solutions tend to be more general; expressions such as `(+ 0 0)` can be simplified after generation, or naturalness can be added as a reward regularizer.

When to use it. Use this when generated proofs must survive parameter changes or be readable by humans, not merely pass one checker run.

How the paper does it. Compare candidate invariants from Code2Inv, Spacer, and LinearArbitrary on the naturalness case study (Figure 5). Apply peephole-like simplification to trivial expressions, or modify the reward to penalize dependence on instance-specific constants (Section 4, pp. 160–161).

Verus form. Inference: score generated `spec fn` predicates and `invariant` clauses for dependence on concrete test values, then prefer symbolic field relationships and reusable helper predicates. Run a simplifier only when its rewrite rules are separately proved sound or followed by Verus rechecking. Readability is a product constraint; it does not weaken the final proof obligation.

## what is proved, measured, and trusted

The paper proves no theorem about neural-policy convergence. It measures checker outcomes and query/time proxies: 133 C SyGuS programs, 120 CHC instances, transfer variants with a 90/10 split and 100 variants per original, 94/120 CHCs solved by Code2Inv, 112/120 by Spacer, 118/120 by LinearArbitrary, and 5/7 author-created non-linear cases solved by Code2Inv versus 0/7 by both baselines. For C runtime, 90% of solved instances took at most 2 hours; the remainder took as long as 12 hours (Limitations, p. 161). The paper explicitly says Code2Inv generally runs slower than contemporary approaches.

The proof checker and its semantics, Z3, the frontends (Clang and SeaHorn), the graph constructors, grammar supplied by the authors, policy implementation, and benchmark transformations are trusted or assumed. A learned candidate is useful only because the checker accepts it; policy success is not a soundness argument.

Threat to a product of agent-written verified Rust. Inference: high productivity opportunity and medium operational risk. The checker-in-the-loop reward, graph-conditioned transfer, grammar control, and explicit timeout handling fit VL's need to synthesize Verus contracts and invariants. The main mismatch is feedback: Verus often returns proof obligations rather than concrete counterexamples, and Rust ownership/type constraints are richer than C SSA. VL should cache only suggestions, rerun Verus on every version, distinguish timeout from proof, and retain human review for grammar and specification design.

## techniques for the catalog

- checker-in-the-loop synthesis — sample grammar-constrained invariants, accumulate checker counterexamples, and update a neural policy with fractional reward
- graph-conditioned search — encode task control/data flow and grammar nodes with GNN message passing to transfer across structurally similar programs
- grammar-controlled generation — separate candidate language from policy so invariant forms and domains can change without rewriting the learner
- policy transfer — save successful weights and initialize related program variants from them after a 90/10 training/test split
- checker-independent CHC extension — reuse the policy with a minimal node representation and a different checker, including non-linear grammars
- naturalness-aware output — simplify trivial expressions or penalize overfitting to instance constants while retaining checker validation
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
