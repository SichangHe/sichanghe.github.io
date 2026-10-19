# Using Reasoning Models to Generate Search Heuristics that Solve Open Instances of Combinatorial Design Problems
(authored by agents unless marked 🧑)
Tag: `rosin2025reasoning`, [paper](https://arxiv.org/abs/2505.23881)

## scope and claims

The paper studies whether a reasoning large language model (LLM) can generate heuristic search programs that construct combinatorial designs whose validity is checked by an executable verifier. The central artifact is Constructive Protocol CPro1, which takes a textual problem definition, a Python verifier, development-instance parameters, and open-instance parameters. The paper reports open instances solved for 7 of 16 Handbook design types, 3 of 4 February 2025 problems, and improved deletion codes. These are construction results: a verifier establishes that an output satisfies the encoded constraints, while CPro1 does not prove that an instance is impossible.

The paper defines a design instance as numerical parameters and asks whether a finite object satisfying constraints exists (section 1, pp. 1–2). Its motivating example is a symmetric weighing matrix satisfying both `WW^T = wI` and symmetry. The paper says, “CPro1 guides LLMs to select and implement strategies in C code, while providing automated hyperparameter tuning and execution feedback using the verifier (Algorithm 1).” (section 1, p. 2). It further states, “CPro1 successfully solves long-standing open instances for 7 of 16 combinatorial design problems selected from the 2006 Handbook of Combinatorial Designs” (section 1, p. 2).

## technique 1: verifier-centered problem interface

What it is. Encode each target as a textual definition that fixes an integer-array representation, a Python verifier that returns whether a candidate is correct, development instances with known solutions, and open instances. The protocol searches for programs and accepts constructed designs that pass the verifier.

When to use it. Inference: use this interface when correctness can be computed for a complete candidate and when solved instances provide useful development data. The paper specifies “Textual Definition of the problem, mandating a specific solution representation as an integer array.” and “Verifier in Python Determines whether a proposed solution in this representation is correct.” For development instances, it states: “Candidates are executed on these, with results checked by the Verifier, to identify the most promising approaches.” (section 3.1, p. 5).

How to do it.
1. State the mathematical constraints and the candidate representation (section 3.1, p. 5).
2. Implement a verifier that checks the representation against every constraint (section 3.1, p. 5).
3. Separate known development parameters from unknown open parameters (section 3.1, p. 5).
4. Score generated programs by the verifier on development instances, then run survivors on open instances (Algorithm 1, p. 2; section 3.2, p. 5).

Verus form. Inference: represent the candidate data in Rust types and make a `spec fn` express the mathematical predicate; use `requires` for input shape and `ensures` for the postcondition of a constructor or checker. Inference: retain an executable checker for development feedback, while Verus proves that the Rust constructor's result satisfies the predicate. The paper's Python verifier and C programs do not carry over directly; the mathematical predicate and candidate representation do.

Evidence and limits. The protocol can only establish existence by finding a verifier-accepted object. The paper states, “CPro1 can only show existence by constructing a solution.” (section 5, p. 8). It also warns that non-existence proofs are outside scope and that one full run per model/design is nondeterministic (section 5, p. 8). Inference: correctness depends on the verifier implementation and execution environment; a Verus adaptation would additionally depend on the Verus toolchain and solver. Inference: independently review the predicate because a buggy verifier can accept an invalid design.

## technique 2: staged generate–tune–optimize–verify pipeline

What it is. CPro1 uses a fixed funnel. Algorithm 1 generates 1,000 diverse C candidates, tunes each on development instances, keeps five, asks the LLM for repeated speed improvements, retests for two hours, keeps two, and runs those for 48 hours on open instances. The algorithm gives exact budgets: “for 50 reps” and 20 strategies per repetition; “Up to 1000 grid points run for 0.5 seconds; top 100 for 5 sec.; top 10 for 50 sec.; return best 1.” (Algorithm 1, p. 2).

When to use it. Inference: use staged filtering when long execution is expensive and development-instance results help rank candidates. Short tests can remove immediate failures; longer tests can reveal different rankings.

How to do it.
1. Prompt for 20 different approaches, elaborate each selected strategy, and prompt for C code plus hyperparameter ranges; repeat 50 times (Algorithm 1, p. 2).
2. Execute each candidate with grid-based hyperparameter tuning on development instances and score it with the verifier (Algorithm 1, p. 2).
3. Truncate to the top five, then request 50 performance-improvement variants for up to five rounds, replacing a candidate only when the best result is much better (Algorithm 1, p. 2).
4. Run the five optimized candidates for two hours on development instances and retain the top two (Algorithm 1, p. 2).
5. Run each top-two candidate for 48 hours on open instances and emit only outputs that pass the verifier (Algorithm 1, p. 2).

Verus form. Inference: use a Rust harness to generate candidates and invoke verified constructors. Inference: keep orchestration and hyperparameter scores as executable code, while `requires`/`ensures` prove candidate validity. Inference: a Verus adaptation would need separate justification that its executable checker and proof predicate express the same constraints.

Evidence. The paper reports that a full run takes approximately 6–10 days on a dedicated AMD Ryzen 9 7950X3D machine with 128 GB memory (section 3.4, p. 6). It attributes the majority of time to development and open-instance runs. For the seven successful Handbook problems, the paper states: “Table 4 shows that all considered elements of the protocol are needed to obtain the full results on the 7 successful Handbook problems, though CPro1 runs with o3-mini-high are less degraded by ablation.” (section 4.1, p. 6; Table 4, p. 7). Inference: this supports retaining the funnel when compute is available, but does not isolate the causal effect of each element beyond the listed ablations.

## technique 3: local-search heuristic families and randomized exploration

What it is. Generated programs instantiate simulated annealing, tabu search, genetic algorithms, greedy randomized adaptive search, or depth-first search. The paper explains that local search changes a candidate to reduce a cost function and sometimes accepts worsening moves to escape local optima (section 3.3, p. 5). Successful programs are randomized and 120–270 C lines for GPT-4o and up to 540 lines for o3-mini-high (section 4.3, p. 7).

How to do it.
1. Inference: for a local-search candidate, define a cost function measuring constraint violations and moves that change the represented object. The paper describes manual local search as follows: “The local search methods selected changes which minimize a cost function, while sometimes accepting worsening moves to escape local optima.” (section 3.3, p. 5).
2. Generate alternative implementations within each strategy family. The paper states: “This gives adequate room to explore alternatives within each method (e.g. for cost function, neighborhood).” (section 4.3, p. 7).
3. Score programs on development instances using the verifier, then run selected programs on open instances and output verified designs (Algorithm 1, p. 2).

Verus form. Inference: express the cost and neighborhood as executable `fn`s, and prove a separate postcondition for a final object. Inference: randomized mutation itself is not a proof step; verification checks the returned object after search. Inference: a Verus adaptation must separately justify any claim that a heuristic terminates successfully.

Evidence. On the prototyping set, Table 3 reports GPT-4o solving 2 Symmetric Weighing Matrix and 1 Equidistant Permutation Array open instances, o3-mini-high solving 3 and 1, and DeepSeek R1 solving 2 and 1 (Table 3, p. 6). The paper reports success for 7 of 16 Handbook design types, including newly solved instances in three types: “This includes open instances that were only solved with CPro1 using the reasoning model o3-mini-high (and not using GPT-4o) for 3 of these 7.” (section 4, p. 6). These denominators are design types or distinct instances as the table caption specifies, not percentages of all combinatorial designs.

## technique 4: decomposing coupled constraints into phases

What it is. For some designs, CPro1 first constructs an object satisfying one subset of constraints, then searches over a second representation layer. The paper gives two concrete decompositions: for Uniform Nested Steiner Quadruple Systems, Algorithm X first creates a Steiner Quadruple System and tabu search then finds nested pairs; for Bhaskar Rao Designs, a 0/1 incidence matrix is found first and +1/−1 signs are added afterward (section 4.3, p. 8).

How to do it.
1. For Uniform Nested Steiner Quadruple Systems, first construct a Steiner Quadruple System using Knuth’s Algorithm X, then use tabu search for nested pairs (section 4.3, p. 8).
2. For Bhaskar Rao Designs, first find a binary incidence matrix, then add signs. The paper states: “A two-phase approach also arises for Bhaskar Rao Designs: first find a 0/1 matrix that meets incidence constraints, then add +1/-1 signs.” (section 4.3, p. 8).
3. Inference: use this decomposition for another problem only if the second phase can satisfy the remaining constraints while preserving the first phase’s constraints.

Verus form. Inference: give each phase a separate `ensures` predicate, then prove that the second phase preserves the first predicate and establishes the final conjunction. Inference: this decomposition can reduce solver complexity, but the paper reports heuristic success rather than a Verus proof of phase composition.

## what is proved, measured, and trusted

The measured outcomes are verifier-accepted constructions: 7/16 selected Handbook design types, 3/4 selected February 2025 problems, and deletion-code improvements over prior reported sets (sections 1 and 4, pp. 2 and 6). The paper reports that CPro1's reasoning-model results are a superset of GPT-4o results in Table 4, but each model/design pair receives one full run and responses are nondeterministic (sections 3.4 and 5, pp. 6 and 8). Inference: the reported constructions do not establish optimality, uniqueness, or non-existence. Inference: for agent-written verified Rust, the main threat is specification and checker mismatch: a correct Verus proof of the wrong predicate still accepts the wrong behavior. Inference: a secondary threat is search brittleness: the protocol's success depends on randomized heuristics, model outputs, and days of compute.

The paper explicitly says, “All of the successful strategies are randomized, and most appear well-optimized.” (section 4.3, p. 7). It also says, “CPro1 fails to replicate FunSearch’s 512-size Cap Set solution for n = 8.” (section 5, p. 8), suggesting scale as one possible cause: “One issue may be a vast difference in scale: while CPro1’s run generated only 1000 candidate programs, FunSearch’s 512 result was found in 4 of 140 runs, each of which generated 2.5 million candidate programs [39].” (section 5, p. 8).

## techniques for the catalog

Inference: the following are reusable adaptations of the reported protocol.

- verifier-centered interface: define a representation, executable verifier, development instances, and open instances before generation
- staged generate–tune–optimize–verify: filter 1,000 candidates through short tuning, five-candidate optimization, two-hour development tests, and 48-hour open runs
- randomized local search: generate simulated annealing, tabu, genetic, greedy, or depth-first heuristics and score them with the verifier
- phased constraint decomposition: construct a base object first, then search a second layer such as signs or nested pairs
