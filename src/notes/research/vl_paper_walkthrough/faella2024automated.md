# Automated Verification of Tree-Manipulating Programs Using Constrained Horn Clauses
(authored by agents unless marked 🧑)
Tag: `faella2024automated`, [paper](https://doi.org/10.48550/arxiv.2410.09668)

Link from the fetch record. The supplied manuscript identifies Marco Faella and Gennaro Parlato as authors and gives October 2024, but prints only the placeholder DOI `https://doi.org/10.1145/nnnnnnn.nnnnnnn` (p. 1).

## scope and result
The paper encodes executions of programs operating on input trees as knitted-trees, then reduces questions about those encodings to constrained Horn clause (CHC) satisfiability. A knitted-tree retains the input, output, and intermediate heap states in one tree of node histories (Secs. 4–6). The input tree may have arbitrary finite size; the bounds concern spare nodes and history length at each node.

The formal memory-safety problem requires every execution satisfying the precondition to terminate normally (Sec. 3, p. 6). Dereferencing nil or using nil for deallocation produces an error configuration. The language gives `free` special semantics: pointers to the freed node become nil (Sec. 3, pp. 5–6). Thus the result concerns this language and memory model. The introduction also discusses use-after-free and uninitialized-memory errors, but the formal semantics should not be read as a general model of C or Rust memory.

The method has two adjustable parameters: `m` spare allocation children per internal backbone node, and a log of `n+1` frames per node. Frame `n+1` detects overflow. A successful safety proof checks that no execution reaches an error, allocation exhaustion, or log overflow for the chosen parameters (Theorem 8.2, p. 21). Merely finding no represented error does not suffice.

## technique 1: knitted-tree execution encoding
The backbone preserves the input tree's structure while its node logs record mutations and pointer rewiring. The chronological doubly linked sequence of frames is the lace. Consecutive lace frames belong to the same node or adjacent backbone nodes. The final heap can have a different graph structure (Secs. 4.1–4.3, pp. 6–12).

How to do it:

1. Choose `m` and `n`. Construct the smallest backbone containing the input tree, making every input node internal and giving every internal node `k+m` children, where `k` is the input arity. Require at least one internal node; an empty input gets a root and its children (Sec. 4.1, pp. 6–7).
2. Mark input nodes initially active and auxiliary nodes inactive. Store the initial data and child-activity information in each node's first frame. Start the lace at the root's second frame, with the first declared pointer at the input root, or nil for empty input; the other pointers are nil (Sec. 4.3.1, p. 8).
3. Push updates into the smallest available frame of the relevant log. Preserve index order: “Frames within the same node are sorted temporally by index.” (Sec. 4.2, p. 7). Maintain data variables, program counter, nil flags, allocation flags, symbolic instructions, and lace links.
4. Encode local instructions in one new frame. For walking instructions, rewind the recorded history to locate a pointer's most recent assignment. The `upd` flags allow shortcuts within a log; intermediate rewind frames keep the program counter unchanged (Sec. 4.3.2, pp. 9–11).
5. For a pointer-field read, first find the source node, then its most recent field assignment in that node's log. An explicit assignment can require another rewind to recover the stored pointer value; an unchanged field refers to its original input child when that child is active (p. 11).
6. For `new`, use the smallest inactive allocation child with index in `[k+1,k+m]` of the current node. If none exists, record out-of-memory status `M`. For `free`, locate the pointed node, mark it inactive, and set nil flags for pointer variables currently pointing there. A nil dereference records runtime-error status `E` (pp. 10–12).
7. Resolve data conditions locally. Resolve pointer equality using nil flags when possible; otherwise rewind to find assignments and compare the referenced nodes. Advance the program counter according to the condition (p. 12).

The paper's execution correspondence is in Lemma 5.3 (p. 15), with error and infinite-execution properties in Lemmas 5.4–5.5. It is not a theorem that any fixed parameters cover every program.

## technique 2: compositional CHC encoding
Local parent-child consistency enables subtree replacement: Lemma 5.2 (pp. 13–14) combines subtrees from different knitted-tree prefixes when their root logs satisfy `consistent_child`. This predicate checks the interactions across their shared backbone edge using the upward and downward frame rules. Appendix C gives the detailed constraints (pp. 32–44).

How to do it (Sec. 6.1, Fig. 5, pp. 15–17):

1. Introduce the relation `Lab`, whose argument is a complete node log.
2. Add base facts for non-root logs with only the first frame used, and root logs with the first two frames used.
3. Add a rule for an internal extension of a log. Add separate upward and downward extension rules, using `consistent_child` to combine compatible logs before extending the lace.
4. Interpret the rules through their minimal model. Theorem 6.1 states that `Lab` contains exactly the logs appearing in some knitted-tree prefix for the chosen parameters.
5. Add query VI to reject a log whose exit status belongs to a selected set `Ex`. Theorem 6.2 (p. 18) says the resulting CHC system is unsatisfiable exactly when such a knitted-tree exists.

The direction matters: satisfiable means the selected exit status is absent; unsatisfiable means it is reachable within the representation. Clean termination `C` is also an exit status, so an unsatisfiable query is not inherently a bug report (Secs. 5.2 and 6.2).

## technique 3: parameter refinement and memory safety
Figure 7 and Theorem 8.3 (Sec. 8, p. 21) give a sound procedure that may not terminate:

1. Initialize `m=m0` and `n=n0`.
2. Query whether status `E` occurs. If yes, report memory unsafe.
3. Query whether status `M` occurs. If yes, increase `m` and restart.
4. Query whether status `O`, log overflow, occurs. If yes, increase `n` and restart.
5. If all three statuses are absent, report memory safe.

Theorems 8.1–8.2 justify the negative and positive results. The procedure may run forever because a CHC query never returns, or because no finite parameter choice suffices for a safe program (p. 21). The parameters therefore limit each attempt, but a completed safety proof explicitly establishes that those limits exclude no relevant execution.

Termination uses the finite backbone and logs: “Each step of an execution adds at least one frame to the lace of its knitted-tree.” (Lemma 5.5, p. 15). Infinite executions must overflow. For a safety proof, allocation exhaustion must also be ruled out, so execution cannot escape the encoding through a failed allocation.

## technique 4: automaton preconditions
Symbolic data-tree automata (SDTAs) specify input trees through bottom-up transitions over data and symbolic states (Sec. 2.1, pp. 3–4). Section 1 (p. 2) lists binary-search, red-black, AVL, and heap data structures as supported specification examples, citing prior work.

Section 7 (pp. 18–20) extends the CHCs:

1. Introduce `Pre(log,state,flag)` alongside `Lab`. The state describes a run of the precondition automaton on the input subtree recovered from first frames.
2. Label auxiliary leaves with nil state. Combine child summaries using `consistent_child`; apply the automaton transition at initially active nodes.
3. Propagate a Boolean flag recording whether the subtree contains the queried exit status.
4. At the root, query a final automaton state together with a true flag. Theorem 7.2 makes unsatisfiability equivalent to an execution satisfying the precondition and reaching that status.

The memory-safety procedure uses this precondition-aware query at every stage (Sec. 8, pp. 21–22).

## evidence, trust, and limitations
Section 9 (pp. 22–23) reports a Python prototype using Z3, tested on list removal and binary-search-tree insertion, each with a correct and buggy version. The machine was an AMD Ryzen 5900X Windows PC with 32 GB RAM. Reported times are the lowest among Z3 4.12.0 and 4.12.6.

Both correct versions require `n=4`; the bugs are detected with `n=3`. The list-removal bug takes 2 seconds and the insertion bug 26 seconds. At `n=4`, absence of runtime errors takes 31 seconds for list removal and 17 seconds for insertion. Insertion's overflow and allocation checks take 44:53 and 50:58 respectively. Table 2 specifies: “Time is in mm:ss format and does not include the time to generate the system of CHCs.” (p. 23). These four cases demonstrate feasibility, not broad scalability.

The discussion of other properties is explicitly high-level, with formal details deferred (Sec. 10, pp. 23–24). It sketches automata that detect contract violations, check output tree structure, and check other output properties. It also states: “This limitation arises because we can only handle a bounded number of passages through each node.” (p. 24). Summarizing internal lace steps and handling broader data structures are future work (Sec. 12, pp. 25–26).

Inference: applying the encoding to verified Rust would require a proved connection between Rust's heap operations and the paper's language, plus proofs of the log and consistency rules. The paper supplies no Verus implementation or verified frontend. Its useful transferable idea is the local execution-history representation; checking one error query alone would omit the completeness checks needed for an unbounded safety claim. Trust in the prototype additionally depends on its CHC translation, solver, and supplied precondition matching the intended program and inputs.

## techniques for the catalog
- knitted-tree encoding: retain heap executions in a fixed backbone with bounded node logs
- compositional CHCs: combine compatible logs and extend them one frame at a time
- staged memory-safety queries: check runtime errors, allocation exhaustion, and log overflow before claiming safety
- SDTA preconditions: combine input-tree acceptance with exit-status queries
- frame-bounded termination: exclude infinite executions by ruling out log overflow and allocation exhaustion
