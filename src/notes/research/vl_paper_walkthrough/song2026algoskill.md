# AlgoSkill: Learning to Design Algorithms by Scheduling Human-Like Skills
(authored by agents unless marked 🧑)
Tag: `song2026algoskill`, [paper](https://arxiv.org/abs/2606.29999)

## what is proved or measured

AlgoSkill is a method for algorithm synthesis that searches over typed design operations instead of unconstrained text. The paper's central claim is empirical: “These results support treating automatic algorithm design as verification-guided skill scheduling rather than one-shot code generation.” (abstract, PDF p. 1). A state stores the parsed problem, plan, code, complexity estimate, failures and skill history. A scheduler chooses from twenty skills; an external verifier supplies compilation, tests, stress tests, oracle agreement and complexity signals. The paper evaluates 275 competitive-programming problems, reporting pass@1 and pass@5. This is testing evidence, not a formal proof that every accepted algorithm is correct.

## technique 1: typed skill states and precondition filtering

what it is and when to use it

Use a typed state when an agent must make several algorithm-design decisions and later repair them. The library includes abstraction, constraint reading, brute force, state design, data-structure selection, invariant checking, counterexample construction and complexity refinement. The paper says, “We propose AlgoSkill, a skill-guided framework for algorithm design.” (section 1, PDF p. 2)

how to do it

1. Parse the input statement into `q = (D, I, O, K, M)` containing description, input, output, constraints and metric (section 2, PDF p. 2).
2. Initialize state `s=(q,r,p,x,κ,E,h)`, where `E` records failed tests, counterexamples and verifier messages (section 2, PDF p. 2).
3. Represent each skill as precondition, transition, expected postcondition, complexity effect, verification rule and failure modes (section 3, PDF p. 3).
4. Compute `Ovalid(s)={o:ϕpre(s)=1}` and mask every skill whose precondition is false (section 4.1, PDF p. 3).
5. Select a valid skill, apply its transition, and retain the updated state for subsequent search.

The paper's worked trajectory starts with Maximum Subarray Sum: abstraction identifies a prefix-sum structure, constraint analysis targets O(n) time and O(1) space, brute force builds O(n³), state design introduces `dp[i]`, and complexity refinement reaches Kadane's O(n) algorithm (Figure 3, PDF p. 4). The quote “Each transition st → st+1 is typed and precondition-checked, and the terminal state decodes to a verified solution.” appears in that figure caption (PDF p. 4).

Verus form

Inference: model a design state as a Rust datatype with ghost fields for plan, failures and complexity. Use executable functions to apply a skill and `requires`/`ensures` to state its precondition and postcondition. Use `spec fn` predicates for validity and a `proof fn` to show that a transition preserves state well-formedness. Verus has no generic dynamic dispatch proof for arbitrary generated skills, so each skill needs a concrete verified transition or a trusted boundary. Inference: the external test and complexity checker remain evidence outside the Verus proof unless their semantics are modeled.

evidence and limits

The filter reduces branching by excluding skills that do not fit the current state; the paper gives timeout risk as an example that enables complexity, data-structure, decomposition and monotonicity skills (section 4.1, PDF p. 3). The paper does not report a separate percentage for filtering alone. A precondition can itself be wrong or incomplete, and state parsing can omit a relevant constraint. Inference: a false precondition can prevent the correct algorithmic path even when the verifier would later accept it.

## technique 2: MCTS scheduling with verifier reward

what it is and when to use it

Use search when several skill sequences are plausible and local greedy choices can lead to dead ends. AlgoSkill treats states as tree nodes and skill applications as edges. Selection uses `Q(s,o)+βPθ(o|s)√(N(s)/(1+N(s,o)))` over valid skills (section 4.3, PDF p. 4).

how to do it

1. Build the root state and an empty search tree.
2. Traverse with the UCB expression above.
3. Apply the selected skill and decode the resulting state into candidate code and explanation.
4. Estimate symbolic time and memory, then run compilation, public tests, stress tests against a brute-force oracle, and complexity checks.
5. Update `Q(s,o)` with the reward, increment visit counts, assign local credit `Δt=R(st+1)-R(st)`, and update the learned policy (Algorithm 1, PDF p. 5).
6. Return the best verified algorithm after budget `B` (Algorithm 1, PDF p. 5).

The reward combines correctness, efficiency, explanation, repair and risk: “The reward contains correctness, efficiency, explanation, repair, and risk terms” (section 2, PDF p. 2). Correctness includes compilation, public-test pass rate, stress-test pass rate and oracle agreement; efficiency penalizes symbolic time, memory and empirical runtime (section 5.1, PDF p. 5).

Verus form

Inference: run Verus on each concrete candidate implementation and use verifier success or failed obligations as search feedback. Encode algorithmic invariants in `invariant` clauses on loops and use `assert` plus `proof fn` lemmas for intermediate facts. Keep policy and MCTS outside verified Rust unless the scheduler itself is the product being verified. Inference: a Verus proof establishes the candidate's stated contract; it does not certify the MCTS reward function or the oracle's independence.

evidence and limits

The paper reports improvements over direct generation, chain of thought, self-refinement, Reflexion and MCTS without typed skills (abstract, PDF p. 1). It reports 275 problems across Codeforces, AtCoder and LeetCode Hard (section 6.1, PDF p. 5). Tests are still finite and complexity fitting is empirical. A candidate can pass public and stress tests while violating an untested input case; symbolic complexity rules can mis-model implementation costs.

## technique 3: symbolic complexity tracking and empirical cross-check

Represent an algorithm as an operation graph and compose rules such as `C(sort)=O(n log n)`, `C(BFS)=O(|V|+|E|)`, and `C(DP)=O(|S|·|A|)` (section 4.4, PDF p. 4). Compute penalties when estimated time or memory exceeds limits. Then run implementations at increasing sizes and fit `T̂(n)=cn^α(log n)^γ`; disagreement with the symbolic estimate adds a risk penalty (section 4.4, PDF p. 4). Inference: in Verus, complexity is generally a ghost relation or separately audited measurement, not something Verus proves automatically. This technique catches asymptotic mismatches but assumes representative sizes and a suitable fit.

## trust, reuse and product threat

The verifier, compiler, test oracle, stress generator, symbolic complexity model, policy model and benchmark labels remain trusted. The paper's experiments show measured pass rates, not kernel-level guarantees. Inference: VL should reuse typed decomposition, counterexample feedback and search over proof-relevant repair actions; it should not redo generic MCTS scheduling without testing whether proof obligations provide better signals than tests. The threat to agent-written verified Rust is medium to high: a candidate can be “verified” against an incomplete contract, while the algorithmic search may optimize the wrong property. A separate contract review and adversarial input suite are required.

## techniques for the catalog

- typed skill state: represent problem, plan, code, failures and complexity explicitly and permit only precondition-satisfied skills
- verifier-guided MCTS: search skill sequences using compilation, tests, oracle and complexity rewards
- local skill credit: update a skill's value from the reward change after its transition
- symbolic plus empirical complexity: compare operation-graph estimates with fitted runtime exponents
- counterexample repair: feed failed tests, verifier messages and stress failures into later typed skills
Checked 2026-10-15 against paper song2026algoskill: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
