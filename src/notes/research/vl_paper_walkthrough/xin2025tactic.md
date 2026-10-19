# Automated Discovery of Tactic Libraries for Interactive Theorem Proving
(authored by agents unless marked 🧑)
Tag: `xin2025tactic`, [paper](https://doi.org/10.1145/3763121)

## purpose and result

The paper studies how to discover reusable higher-level tactics from existing Rocq proof scripts. Its central claim is that a tactic-dependence graph (TDG) records logical dataflow between tactic applications while ignoring syntactic variation. The implementation, TacMiner, searches these graphs for repeated, safely replaceable subgraphs, creates tactic definitions, and repeatedly refactors the corpus. The paper states: “TDGs capture logical dependencies between tactic applications while abstracting away irrelevant syntactic details, allowing for both the discovery of new tactics and the refactoring of existing proofs into more modular forms.” (Abstract, p. 1)

Inference: for Verus, the transferable lesson is to mine repeated proof-state dependency patterns around `requires`, `ensures`, `assert`, loop `invariant` declarations, and `proof fn` calls, then submit every proposed abstraction to Verus. A TDG would be search metadata; Verus's checker remains the evidence of validity.

## technique 1: tactic-dependence graphs

What it is. A proof script is a sequence of tactic invocations. A TDG is a directed acyclic graph whose node is an invocation and whose labeled edge says that one invocation's formal output supplies another's formal input (Section 4, p. 9). A graph therefore represents many syntactically different proof scripts: the paper says, “In general, multiple syntactically different proof scripts can have the same TDG.” (Section 4, p. 9) The implementation obtains induced scripts by topologically sorting a TDG while preserving branching constraints (Sections 4 and 7, pp. 9, 18).

When to use it. Use TDGs when the same proof strategy appears with different hypothesis names, subgoal names, or tactic order. The motivating example has `eq_sym` and `eq_trans` proofs that share `red`, `intros`, `destruct`, `rewrite`, and `auto` patterns despite different syntax (Section 2, pp. 3–4).

How to apply it.
1. Parse each Rocq proof with Coq-SerAPI and extract the information needed to construct its TDG (Section 7, p. 17).
2. Make one node per invocation and one labeled edge for each output-to-input dependency, producing a DAG (Definition 4.1, p. 9).
3. For a tactic definition, add special entry and exit nodes connected to the body's formal inputs and outputs (Definition 4.2, p. 9).
4. Compute a topological order that respects subgoal branches when converting a graph back to a script (Section 7, p. 18).

The paper's concrete custom tactics are `Ltac simplRewrite H := red in H; rewrite H.` and `Ltac destructUnfold n H := destruct n; [unfold H; intros | auto].` (Section 2, p. 4). These compress repeated proof steps without changing the theorem proved.

Verus form. Inference: define a ghost graph whose nodes describe verified actions such as an `assert`, a call to a `proof fn`, or an invariant update, and whose edges describe facts consumed and produced. A mined node can become a `proof fn` with explicit `requires` and `ensures`; executable Rust remains outside the proof graph. There is no paper evidence that this graph abstraction matches Verus's internal obligations, so this is an adaptation hypothesis.

Evidence and limits. The paper evaluates 918 proofs from CoqArt, program logics, CompCert, and BigNums (Table 2, p. 18), but TDGs retain only executed tactic traces. TacMiner therefore does not synthesize tactics whose control flow depends on inspecting the proof state, and evar effects must remain localized (Section 7, p. 18). Inference: a Verus miner would likewise miss proof alternatives not present in traces and must record ownership, ghost-state, and solver-context dependencies or risk proposing an abstraction that does not type-check.

## technique 2: collapsible semantic refactoring

What it is. A tactic graph is an isomorphic embedding in a proof graph when tactic names and dependency labels match under an injective mapping (Definition 4.3, p. 10). Isomorphism alone is insufficient: an intermediate node outside the candidate can lie on a path between two selected nodes. The paper requires a collapsible embedding, where every such intermediate path node is selected and all selected-node edges are present in the tactic graph (Definition 4.4, pp. 10–11). This ensures that contracting the subgraph into one tactic node preserves proof validity. For a path through an unselected intermediate node to node c, the paper explains: “This is because node c depends on a node outside the tactic, which in turn relies on an intermediate result produced by the tactic, preventing it from being used as a standalone argument.” (Section 4, p. 10)

How to apply it.
1. Construct the candidate tactic TDG and the proof TDG (Figure 10, p. 11).
2. Find an injective, label-preserving embedding.
3. Check the two collapsibility conditions: no unselected node lies between selected nodes, and every selected-to-selected dependency in the proof occurs in the tactic graph (Definition 4.4).
4. For each selected node with an outside parent, rewire the incoming label through the tactic's entry edge; rewire outgoing labels through its exit edge (Figure 10, lines 8–11; Section 4, p. 12).
5. Contract the selected vertices to a fresh invocation node. Repeat the embedding search and contraction until no embedding remains, then return an induced proof obtained by a valid topological sort (Figure 10, lines 3–13).

Verus form. Inference: a Rust refactoring tool could propose a `proof fn` only when the consumed facts are explicit in its `requires` and the produced facts in `ensures`; caller facts are rewired by adding a proof-function call. A loop invariant is a declaration on the loop, not a function call, so invariant edges would move with the loop rather than be contracted as executable nodes. The resulting source must be rechecked by Verus; graph contraction alone is not a proof.

Evidence and limits. The motivating counterexample shows that selecting only two nodes from a three-node dependency chain can produce an invalid tactic (Section 4, p. 10). Overlapping embeddings can make the result non-unique; the implementation uses backtracking to select a disjoint subset that maximizes effectiveness (Section 7, p. 17). Inference: Verus refactoring has additional ownership and lifetime constraints absent from Rocq's tactic graph, so the graph test is necessary at most, not sufficient.

## technique 3: grammar-guided tactic search with upper bounds

What it is. TacMiner learns a graph grammar from observed TDGs. A production `η → (η′, θ)` connects a node of tactic kind `η` to a fresh or existing node of kind `η′` with dependency labels `θ`; productions are restricted to tactics and dependencies present in the corpus (Definition 6.6, Section 6, pp. 15–16). The search starts with one-node candidates, extends them with grammar productions, keeps embeddings into each proof, and discards candidates occurring fewer than twice (Figures 14–16, pp. 16–17). Compression power is the original corpus size divided by the refactored corpus size (Definition 5.2, p. 13). Search uses effectiveness, `(Size(G) − 1) × frequency`, which counts the tactic applications saved by refactoring (Definition 6.5, p. 14).

The upper-bound procedure computes, for every current embedding, the largest extension with the same root that could still fit in that proof and sums each extension’s size minus one; candidates whose bound is below the best effectiveness found so far are pruned (Definition 6.7 and Figure 17, pp. 16–17). The paper reports: “Both of our algorithmic optimizations (namely, grammar learning and pruning method) significantly reduce the learning algorithm’s running time.” (Section 8.6, p. 22)

How to apply it.
1. Extract grammar productions from all observed TDGs, retaining tactic names and complete input-output dependency labels (Section 6.2, p. 15).
2. Initialize a worklist with one-node candidates and their witness embeddings (Figure 14, p. 16).
3. Dequeue a candidate, compute its maximum-extension upper bound, and discard it if the bound is below the best effectiveness found so far (Figures 12 and 17, pp. 14, 17).
4. Evaluate a retained candidate and update the best result. Expand it by adding dependency edges to a fresh or existing node, extend its witnesses, and enqueue expansions with frequency at least two (Figures 12, 15–16, pp. 14, 16–17).
5. Keep the highest-scoring candidate, refactor the corpus with it, and repeat until no tactic can be learned (Section 6.2, p. 17).

Verus form. Inference: the grammar can be built from successful Verus proof traces, with productions such as `call proof function A; assert relation B` only when the resulting source passes Verus. The score should include verifier time and proof-maintenance cost, not only line compression. Candidate expansion can edit `assert` statements, `proof fn` helpers, `requires`/`ensures`, and loop `invariant` declarations; executable bodies should be changed only when the abstraction's contract is preserved.

Evidence and limits. On the full corpus TacMiner learned 918 tactics versus Peano's 310, with total tactic usage 2,430 versus 842 (Table 3, pp. 19–20). These are counts over the 918-proof benchmark, not success probabilities. The search ran on an Apple M2 with 24 GB memory (Section 8.1, p. 20); both reported ablations failed to terminate within 30 minutes, while TacMiner terminated in about 13 minutes (Section 8.6, p. 22). Inference: these runtime results are machine- and implementation-specific and do not predict Verus solver latency.

## technique 4: reusable tactics for automation

What it is. Learned tactics are supplied to Copra, an LLM proof-automation system, as in-context definitions plus one refactored proof-state example and invocation (Section 8.4, pp. 21–22). On 50 selected theorems, Copra with built-in tactics proved 11/50 (22%); with Peano tactics, 18/50 (36%); with TacMiner tactics, 30/50 (60%) (Table 4, p. 21). The paper states: “Using the custom tactics learned by TacMiner, we are able to increase the success rate of an LLM-based proof automation tool from 22% to 60%.” (Section 8.4, p. 22)

How to apply it.
1. Refactor existing scripts with discovered tactics and insert each definition before its first use; initialize Copra on the refactored script (Appendix C, p. 34).
2. Index tactics declared before each lemma and extract proof-state invocation examples with Coq-SerAPI (Appendix C, p. 34).
3. Add those tactic declarations and one example per tactic from a different lemma to Copra’s prompt (Appendix C, p. 34).
4. Evaluate on the 50 selected theorems: Copra had made partial progress with a smaller budget, and each refactored proof uses at least one learned tactic (Section 8.4, p. 21).

Verus form. Inference: provide a proof agent with a small library of verified `proof fn` patterns and examples, but require each generated Rust/Verus patch to pass the Verus checker. The paper's 30/50 is conditional on selected theorems and an OpenAI gpt-4o-2024-10-06 backend (Section 8.4); it is not evidence that arbitrary Verus programs become 60% solvable.

## what is proved, trusted, and left open

Appendix A proves properties of topological reordering, refactoring, pruning, and tactic discovery (pp. 29–33). The model assumes deterministic tactic outputs for the consumed inputs (Section 3.3, p. 7). The evaluation measures tactic counts, compression, automation success, and search time. The compression experiment uses a 65% training / 35% test split and reports compression power of 1.35 versus Peano’s 1.1, corresponding to reductions of 26% and 9% (Section 8.3, pp. 20–21). The automation experiment uses 50 selected theorems; the paper does not state that these were held out from tactic discovery.

Inference: the formal model’s guarantees do not by themselves establish implementation correctness, usefulness outside the source domains, generalization beyond the selected automation benchmarks, or maintainability. Coq-SerAPI parsing, TacMiner’s implementation, benchmark preparation, and the baseline implementation affect the reported measurements; the prover checks proof validity.

Inference: for agent-written verified Rust, the threat is substantial for proof-authoring cost and search-space size: reusable proof functions could reduce repeated work, but an unsound contract, ownership mismatch, or solver-sensitive invariant can invalidate a proposed abstraction. The product must treat specifications, external-library contracts, Verus, its solver, Rust compilation, and erasure as explicit trust boundaries and must never accept a graph score as verification evidence.

## techniques for the catalog

- tactic-dependence graphs — represent tactic applications and labeled logical dependencies as a DAG to expose reusable proof strategies despite syntactic variation
- collapsible semantic refactoring — replace a label-preserving, path-closed TDG embedding only after rewiring boundary dependencies and contracting it
- grammar-guided tactic synthesis — mine dependency-aware graph productions, expand candidates with witness embeddings, and prune with maximum-extension upper bounds
- verified tactic prompting — give an automation model learned tactic definitions plus examples, then measure complete proofs on a fixed, explicitly selected benchmark set
