# Automated Discovery of Tactic Libraries for Interactive Theorem Proving
(authored by agents unless marked 🧑)
Tag: `xin2025tactic`, [paper](https://doi.org/10.1145/3763121)

## purpose and result

The paper studies how to discover reusable higher-level tactics from existing Rocq proof scripts. Its central claim is that a tactic-dependence graph (TDG) records logical dataflow between tactic applications while ignoring syntactic variation. The implementation, TacMiner, searches these graphs for repeated, safely replaceable subgraphs, creates tactic definitions, and repeatedly refactors the corpus. The paper states: “TDGs capture logical dependencies between tactic applications while abstracting away irrelevant syntactic details, allowing for both the discovery of new tactics and the refactoring of existing proofs into more modular forms.” (Abstract, p. 1)

Inference: for Verus, the transferable lesson is to mine repeated proof-state dependency patterns around `requires`, `ensures`, `assert`, loop `invariant` declarations, and `proof fn` calls, then submit every proposed abstraction to Verus. A TDG would be search metadata; Verus's checker remains the evidence of validity.

## technique 1: tactic-dependence graphs

What it is. A proof script is a sequence of tactic invocations. A TDG is a directed acyclic graph whose node is an invocation and whose labeled edge says that one invocation's formal output supplies another's formal input (Section 4, p. 8). A graph therefore represents many syntactically different proof scripts: the paper says, “In general, multiple syntactically different proof scripts can have the same TDG.” (Section 4, p. 8) The implementation obtains induced scripts by topologically sorting a TDG while preserving branching constraints (Sections 4 and 7, pp. 8, 18).

When to use it. Use TDGs when the same proof strategy appears with different hypothesis names, subgoal names, or tactic order. The motivating example has `eq_sym` and `eq_trans` proofs that share `red`, `intros`, `destruct`, `rewrite`, and `auto` patterns despite different syntax (Section 2, pp. 3–4).

How to apply it.
1. Parse each Rocq proof with Coq-SerAPI and record every tactic invocation, its formal inputs, and its formal outputs (Section 7, p. 18).
2. Make one node per invocation and one labeled edge for each output-to-input dependency, producing a DAG (Definition 4.1, p. 8).
3. For a tactic definition, add special entry and exit nodes connected to the body's formal inputs and outputs (Definition 4.2, pp. 8–9).
4. Enumerate topological orders that respect subgoal branches when converting a graph back to a script (Section 7, p. 18).

The paper's concrete custom tactics are `Ltac simplRewrite H := red in H; rewrite H.` and `Ltac destructUnfold n H := destruct n; [unfold H; intros | auto].` (Section 2, p. 4). These compress repeated proof steps without changing the theorem proved.

Verus form. Inference: define a ghost graph whose nodes describe verified actions such as an `assert`, a call to a `proof fn`, or an invariant update, and whose edges describe facts consumed and produced. A mined node can become a `proof fn` with explicit `requires` and `ensures`; executable Rust remains outside the proof graph. There is no paper evidence that this graph abstraction matches Verus's internal obligations, so this is an adaptation hypothesis.

Evidence and limits. The paper evaluates 918 proofs from CoqArt, program logics, CompCert, and BigNums (Table 2, p. 18), but TDGs retain only executed tactic traces. TacMiner therefore does not synthesize tactics whose control flow depends on inspecting the proof state, and evar effects must remain localized (Section 7, p. 18). Inference: a Verus miner would likewise miss proof alternatives not present in traces and must record ownership, ghost-state, and solver-context dependencies or risk proposing an abstraction that does not type-check.

## technique 2: collapsible semantic refactoring

What it is. A tactic graph is an isomorphic embedding in a proof graph when tactic names and dependency labels match under an injective mapping (Definition 4.3, p. 9). Isomorphism alone is insufficient: an intermediate node outside the candidate can lie on a path between two selected nodes. The paper requires a collapsible embedding, where every such intermediate path node is selected and all selected-node edges are present in the tactic graph (Definition 4.4, pp. 10–11). This ensures that contracting the subgraph into one tactic node preserves proof validity. The paper explains: “Intuitively, these conditions enforce that, if we replace the subgraph of G′ that is isomorphic to G with a single node representing a new tactic invocation, then the resulting proof is still valid.” (Section 4, p. 11)

How to apply it.
1. Construct the candidate tactic TDG and the proof TDG (Algorithm 1, Figure 10, p. 11).
2. Find an injective, label-preserving embedding.
3. Check the two collapsibility conditions: no unselected node lies between selected nodes, and every selected-to-selected dependency in the proof occurs in the tactic graph (Definition 4.4).
4. For each selected node with an outside parent, rewire the incoming label through the tactic's entry edge; rewire outgoing labels through its exit edge (Algorithm 1, lines 8–11; Section 4, p. 12).
5. Contract the selected vertices to a fresh invocation node and return any induced proof obtained by a valid topological sort (Algorithm 1, lines 12–13).

Verus form. Inference: a Rust refactoring tool could propose a `proof fn` only when the consumed facts are explicit in its `requires` and the produced facts in `ensures`; caller facts are rewired by adding a proof-function call. A loop invariant is a declaration on the loop, not a function call, so invariant edges would move with the loop rather than be contracted as executable nodes. The resulting source must be rechecked by Verus; graph contraction alone is not a proof.

Evidence and limits. The motivating counterexample shows that selecting only two nodes from a three-node dependency chain can produce an invalid tactic (Section 4, p. 10). Overlapping embeddings can make the result non-unique; the implementation uses backtracking to select a disjoint subset that maximizes effectiveness (Section 7, p. 18). Inference: Verus refactoring has additional ownership and lifetime constraints absent from Rocq's tactic graph, so the graph test is necessary at most, not sufficient.

## technique 3: grammar-guided tactic search with upper bounds

What it is. TacMiner learns a graph grammar from observed TDGs. A production `η → (η′, θ)` adds a node of tactic kind `η′` and dependency labels `θ`; productions are restricted to tactics and dependencies present in the corpus (Definition 6.6, Section 6, pp. 15–16). The search starts with one-node candidates, extends them with grammar productions, keeps embeddings into each proof, and discards candidates occurring fewer than twice (Figures 14–16, pp. 16–17). It scores a candidate by compression power: replacing a matched subgraph by one node saves its size minus one (Section 5, pp. 13–14).

The upper-bound procedure computes, for every current embedding, the largest extension that could still fit in that proof and sums those sizes; candidates whose possible score cannot beat the incumbent are pruned (Definition 6.7 and Figure 17, pp. 16–17). The paper reports: “Both of our algorithmic optimizations (namely, grammar learning and pruning method) significantly reduce the learning algorithm’s running time.” (Section 8.6, p. 22)

How to apply it.
1. Extract grammar productions from all observed TDGs, retaining tactic names and complete input-output dependency labels (Section 6.1, pp. 15–16).
2. Initialize a worklist with one-node candidates and their witness embeddings (Figure 14, p. 16).
3. Expand each candidate by adding a fresh node or an edge allowed by a production; extend every witness and retain candidates with frequency at least two (Figures 15–16, p. 16).
4. Compute a maximum-extension upper bound over all current embeddings (Figure 17, p. 17).
5. Keep the highest-scoring candidate, refactor the corpus with it, and repeat until no tactic can be learned (Section 6.2, p. 17).

Verus form. Inference: the grammar can be built from successful Verus proof traces, with productions such as `call proof function A; assert relation B` only when the resulting source passes Verus. The score should include verifier time and proof-maintenance cost, not only line compression. Candidate expansion can edit `assert` statements, `proof fn` helpers, `requires`/`ensures`, and loop `invariant` declarations; executable bodies should be changed only when the abstraction's contract is preserved.

Evidence and limits. On the full corpus TacMiner learned 918 tactics versus Peano's 310, with total tactic usage 2,430 versus 842 (Table 3, p. 19). These are counts over the 918-proof benchmark, not success probabilities. The search ran on an Apple M2 with 24 GB memory (Section 8.1, p. 19); both reported ablations failed to terminate within 30 minutes, while TacMiner terminated in about 13 minutes (Section 8.6, p. 22). Inference: these runtime results are machine- and implementation-specific and do not predict Verus solver latency.

## technique 4: reusable tactics for automation

What it is. Learned tactics are supplied to Copra, an LLM proof-automation system, as in-context definitions plus one refactored proof-state example and invocation (Section 8.4, pp. 21–22). On 50 selected theorems, Copra with built-in tactics proved 11/50 (22%); with Peano tactics, 18/50 (36%); with TacMiner tactics, 30/50 (60%) (Table 4, p. 21). The paper states: “Using the custom tactics learned by TacMiner, we are able to increase the success rate of an LLM-based proof automation tool from 22% to 60%.” (Section 8.4, p. 22)

How to apply it.
1. Discover and verify reusable abstractions from a training corpus.
2. Attach each tactic definition and one proof-state invocation example to the automation prompt (Section 8.4).
3. Run the automation system on held-out theorems whose refactored proofs use at least one discovered tactic (Section 8.4).
4. Count complete proofs over the fixed denominator and report the model and prompt context.

Verus form. Inference: provide a proof agent with a small library of verified `proof fn` patterns and examples, but require each generated Rust/Verus patch to pass the Verus checker. The paper's 30/50 is conditional on selected theorems and an OpenAI gpt-4o-2024-10-06 backend (Section 8.4); it is not evidence that arbitrary Verus programs become 60% solvable.

## what is proved, trusted, and left open

The paper proves graph-level refactoring properties and checks generated Rocq tactic scripts by Rocq; it measures tactic counts, compression, automation success, and search time. It does not prove that the learned tactic is useful outside the source domains, that the LLM automation generalizes beyond 50 selected theorems, or that compression preserves maintainability. Rocq, Coq-SerAPI parsing, TacMiner's implementation, the benchmark proofs, and the baseline implementation remain trusted components of the reported workflow.

Inference: for agent-written verified Rust, the threat is substantial for proof-authoring cost and search-space size: reusable proof functions could reduce repeated work, but an unsound contract, ownership mismatch, or solver-sensitive invariant can invalidate a proposed abstraction. The product must treat specifications, external-library contracts, Verus, its solver, Rust compilation, and erasure as explicit trust boundaries and must never accept a graph score as verification evidence.

## techniques for the catalog

- tactic-dependence graphs — represent tactic applications and labeled logical dependencies as a DAG to expose reusable proof strategies despite syntactic variation
- collapsible semantic refactoring — replace a label-preserving, path-closed TDG embedding only after rewiring boundary dependencies and contracting it
- grammar-guided tactic synthesis — mine dependency-aware graph productions, expand candidates with witness embeddings, and prune with maximum-extension upper bounds
- verified tactic prompting — give an automation model learned tactic definitions plus examples, then measure complete proofs on a fixed held-out denominator
Checked 2026-10-14 against the paper by a Codex agent: audit record xin2025tactic; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
