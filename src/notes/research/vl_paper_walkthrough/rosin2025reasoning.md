# Using Reasoning Models to Generate Search Heuristics that Solve Open Instances of Combinatorial Design Problems
(authored by agents unless marked 🧑)
Tag: `rosin2025reasoning`, [paper](https://www.semanticscholar.org/paper/043d886c710206b2154ac9b1990bd93e44ee83ef)

## scope and claims

The paper studies whether a reasoning large language model (LLM) can generate heuristic search programs that construct combinatorial designs whose validity is checked by an executable verifier. The central artifact is Constructive Protocol CPro1, which takes a textual problem definition, a Python verifier, development-instance parameters, and open-instance parameters. The paper reports open instances solved for 7 of 16 Handbook design types, 3 of 4 February 2025 problems, and improved deletion codes. These are construction results: a verifier establishes that an output satisfies the encoded constraints, while CPro1 does not prove that an instance is impossible.

The paper defines a design instance as numerical parameters and asks whether a finite object satisfying constraints exists (section 1, pp. 1–2). Its motivating example is a symmetric weighing matrix satisfying both `WW^T = wI` and symmetry. The paper says, “CPro1 guides LLMs to select and implement strategies in C code, while providing automated hyperparameter tuning and execution feedback using the verifier (Algorithm 1).” (section 1, p. 2). It further states, “CPro1 successfully solves long-standing open instances for 7 of 16 combinatorial design problems selected from the 2006 Handbook of Combinatorial Designs” (section 1, p. 2).

## technique 1: verifier-centered problem interface

What it is. Encode each target as a textual definition that fixes an integer-array representation, a Python verifier that returns whether a candidate is correct, development instances with known solutions, and open instances. The protocol searches for programs; the verifier is the acceptance oracle.

When to use it. Use this interface when correctness can be computed for a complete candidate and when small solved instances can stand in for development data. The paper explicitly lists “Textual Definition of the problem, mandating a specific solution representation as an integer array,” “Verifier in Python Determines whether a proposed solution in this representation is correct,” “Open Instances Instance parameters for which existence is not yet known,” and “Development Instances (Dev Instances) Instances known to exist” (section 3.1, p. 5).

How to do it.
1. State the mathematical constraints and the candidate representation (section 3.1, p. 5).
2. Implement a verifier that checks the representation against every constraint (section 3.1, p. 5).
3. Separate known development parameters from unknown open parameters (section 3.1, p. 5).
4. Score generated programs by the verifier on development instances, then run survivors on open instances (Algorithm 1, p. 3; section 3.2, p. 5).

Verus form. Inference: represent the candidate data in Rust types and make a `spec fn` express the mathematical predicate; use `requires` for input shape and `ensures` for the postcondition of a constructor or checker. Inference: retain an executable checker for development feedback, while Verus proves that the Rust constructor's result satisfies the predicate. The paper's Python verifier and C programs do not carry over directly; the mathematical predicate and candidate representation do.

Evidence and limits. The protocol can only establish existence by finding a verifier-accepted object. The paper states, “CPro1 can only show existence by constructing a solution.” (section 5, p. 7). It also warns that non-existence proofs are outside scope and that one full run per model/design is nondeterministic (section 5, p. 7). The trusted base includes the verifier implementation, the compiler/runtime used to execute candidates, and (for a Verus adaptation) the Verus toolchain and solver. Inference: a buggy verifier can certify an invalid design, so independently reviewing the predicate is required.

## technique 2: staged generate–tune–optimize–verify pipeline

What it is. CPro1 uses a fixed funnel. Algorithm 1 generates 1,000 diverse C candidates, tunes each on development instances, keeps five, asks the LLM for repeated speed improvements, retests for two hours, keeps two, and runs those for 48 hours on open instances. The algorithm gives exact budgets: “for 50 reps” and 20 strategies per repetition; “Up to 1000 grid points run for 0.5 seconds; top 100 for 5 sec.; top 10 for 50 sec.; return best 1.” (Algorithm 1, p. 3).

When to use it. Use staged filtering when candidate generation is cheap relative to long execution and the verifier supplies an objective score. Short tests remove obvious failures; longer tests spend compute on robust candidates.

How to do it.
1. Prompt for 20 different approaches, elaborate each selected strategy, and prompt for C code plus hyperparameter ranges; repeat 50 times (Algorithm 1, p. 3).
2. Execute each candidate with grid-based hyperparameter tuning on development instances and score it with the verifier (Algorithm 1, p. 3).
3. Truncate to the top five, then request 50 performance-improvement variants for up to five rounds, replacing a candidate only when the best result is much better (Algorithm 1, p. 3).
4. Run the five optimized candidates for two hours on development instances and retain the top two (Algorithm 1, p. 3).
5. Run each top-two candidate for 48 hours on open instances and emit only outputs that pass the verifier (Algorithm 1, p. 3).

Verus form. Inference: use a Rust harness to generate candidates and invoke verified constructors. Inference: keep orchestration and hyperparameter scores as executable code, while `requires`/`ensures` prove candidate validity. Inference: proof code supplies intermediate facts and is erased before execution, as described for Verus.

Evidence. The paper reports that a full run takes approximately 6–10 days on a dedicated AMD Ryzen 9 7950X3D machine with 128 GB memory (section 3.4, p. 6). It attributes the majority of time to development and open-instance runs. Ablation Table 4 reports that all considered protocol elements are needed for the full seven successful Handbook results (section 4.1, p. 6). Inference: this supports retaining the funnel when compute is available, but does not isolate the causal effect of each element beyond the listed ablations.

## technique 3: local-search heuristic families and randomized exploration

What it is. Generated programs instantiate simulated annealing, tabu search, genetic algorithms, greedy randomized adaptive search, or depth-first search. The paper explains that local search changes a candidate to reduce a cost function and sometimes accepts worsening moves to escape local optima (section 3.3, p. 5). Successful programs are randomized and 120–270 C lines for GPT-4o and up to 540 lines for o3-mini-high (section 4.2, p. 7).

How to do it.
1. Define a cost function measuring violated constraints (section 3.3, p. 5).
2. Define a neighborhood move that changes the represented object (section 3.3, p. 5).
3. Use a randomized strategy; simulated annealing may accept worsening moves, while tabu search records forbidden recent moves (section 3.3, p. 5; Table 4, p. 7).
4. Let the verifier score candidates and retain the best found object (Algorithm 1, p. 3).

Verus form. Inference: express the cost and neighborhood as executable `fn`s, and prove a separate postcondition for a final object. Inference: randomized mutation itself is not a proof step; verification checks the returned object after search. A Verus proof cannot assume that a heuristic eventually finds a solution unless that termination-and-success property is separately specified and proved.

Evidence. On the prototyping set, Table 3 reports GPT-4o solving 2 Symmetric Weighing Matrix and 1 Equidistant Permutation Array open instances, o3-mini-high solving 3 and 1, and DeepSeek R1 solving 2 and 1 (Table 3, p. 6). The paper reports that o3-mini-high solved three Handbook instances not solved by GPT-4o and that it solved 7 of 16 Handbook design types overall (sections 3.3–4, pp. 5–6). These denominators are design types or distinct instances as the table caption specifies, not percentages of all combinatorial designs.

## technique 4: decomposing coupled constraints into phases

What it is. For some designs, CPro1 first constructs an object satisfying one subset of constraints, then searches over a second representation layer. The paper gives two concrete decompositions: for Uniform Nested Steiner Quadruple Systems, Algorithm X first creates a Steiner Quadruple System and tabu search then finds nested pairs; for Bhaskar Rao Designs, a 0/1 incidence matrix is found first and +1/−1 signs are added afterward (section 4.2, p. 7).

How to do it.
1. Identify a base object with a tractable exact or heuristic constructor (section 4.2, p. 7).
2. Run that constructor and validate its constraints (section 4.2, p. 7).
3. Search over the remaining degrees of freedom with a second heuristic and validate the combined object (section 4.2, p. 7).

Verus form. Inference: give each phase a separate `ensures` predicate, then prove that the second phase preserves the first predicate and establishes the final conjunction. Inference: this decomposition can reduce solver complexity, but the paper reports heuristic success rather than a Verus proof of phase composition.

## what is proved, measured, and trusted

The measured outcomes are verifier-accepted constructions: 7/16 selected Handbook design types, 3/4 selected February 2025 problems, and deletion-code improvements over prior reported sets (sections 1 and 4, pp. 2 and 6). The paper reports that CPro1's reasoning-model results are a superset of GPT-4o results in Table 4, but each model/design pair receives one full run and responses are nondeterministic (sections 3.4 and 5, pp. 6–7). It does not prove optimality, uniqueness, or non-existence. Inference: for agent-written verified Rust, the main threat is specification and checker mismatch: a correct Verus proof of the wrong predicate still accepts the wrong behavior. A secondary threat is search brittleness: the protocol's success depends on randomized heuristics, model outputs, and days of compute.

The paper explicitly says, “All of the successful strategies are randomized, and most appear well-optimized.” (section 4.2, p. 7). It also says, “CPro1 fails to replicate FunSearch’s 512-size Cap Set solution for n = 8.” (section 5, p. 7), attributing one possible cause to scale: FunSearch generated 2.5 million candidates in each of 140 runs, whereas CPro1 generated 1,000. Inference: VL should reuse the verifier-centered funnel and staged testing, but should not claim that more candidates or a passing checker establishes completeness.

## techniques for the catalog

- verifier-centered interface: define a representation, executable verifier, development instances, and open instances before generation
- staged generate–tune–optimize–verify: filter 1,000 candidates through short tuning, five-candidate optimization, two-hour development tests, and 48-hour open runs
- randomized local search: generate simulated annealing, tabu, genetic, greedy, or depth-first heuristics and score them with the verifier
- phased constraint decomposition: construct a base object first, then search a second layer such as signs or nested pairs

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
