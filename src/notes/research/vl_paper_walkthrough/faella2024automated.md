# Automated Verification of Tree-Manipulating Programs Using Constrained Horn Clauses
(authored by agents unless marked 🧑)
Tag: `faella2024automated`, [paper](https://doi.org/10.48550/arxiv.2410.09668)

## scope and result
This paper models executions of heap programs that manipulate trees as knitted-trees and reduces safety questions to constrained Horn clause (CHC) solving. Its abstract states: “At the core of our methodology is the knitted-tree encoding, which maps a program execution into a tree data structure encapsulating input, output, and intermediate configurations, within a single structure.” (abstract, p. 1). The main demonstrated property is memory safety: no null dereference, use-after-free, uninitialized access, illegal free, or non-termination for inputs accepted by a symbolic data-tree automaton (SDTA).

The method is parameterized by `m` spare backbone nodes and `n` frames per node. Those bounds are an explicit completeness assumption. The authors say: “the parameters defining a knitted-tree – namely, the number of spare nodes added to the backbone and the number of frames in a node label – may not suffice to encompass all possible program executions.” (Sec. 1, p. 2)

## technique 1: knitted-tree execution encoding
What it is. Start with the input tree as a backbone, add `m` inactive child slots to every internal node, and attach an `n+1`-frame log to each node. Frames record pointer/data updates, pointer-variable assignments, program counter, and predecessor/successor links. The chronological linked sequence of frames is the “lace”; it can move within a node or between adjacent nodes. The backbone remains tree-shaped even when the final heap graph differs.

When to use it. Use it for bounded-pass tree traversals, allocation/free, and pointer rewiring where execution history can be represented with bounded local logs. The paper notes that every instruction gets at least one frame, so frame bounds can also prove termination.

How to do it.
1. Choose `m` and `n`; form the smallest `(arity+m)`-ary backbone containing the input tree and making every input node internal (Sec. 4.1, pp. 6–7)
2. Mark input nodes active and spare nodes inactive (Sec. 4.1, p. 7)
3. Allocate a fixed log of frames to every backbone node; keep frames ordered by index and connect them with `prev`/`next` lace links (Sec. 4.2, pp. 7–8)
4. For the initial configuration, populate the root and pointer-variable fields; leave other frame fields unspecified where the definition permits (Sec. 4.3.1, pp. 9–10)
5. For each instruction, push the smallest available frame, update its program counter and event fields, and rewind the lace to find the latest assignment when a pointer value is needed (Sec. 4.3.2, pp. 10–14)
6. Encode `new` by selecting an inactive child, `free` by moving to the pointed node and marking it inactive, and null dereferences by assigning an error exit status (Sec. 4.3.2, pp. 13–15)
7. Encode conditionals and loops by evaluating the condition in the current frame and pushing the appropriate successor program counter (Sec. 4.3.2, pp. 15–16)

Verus form (Inference: the paper is CHC/automata based, not Verus based). Represent a heap node and its history with Rust ghost state; use executable pointer operations wrapped by proof functions. Use `requires` to state non-null and ownership preconditions, `ensures` for pointer/data postconditions, and loop `invariant` clauses for traversal facts. The bounded frame log is a ghost history, not runtime storage. Verus ownership may enforce local alias discipline, but the knitted-tree lace and inactive allocation slots still require a separately proved ghost encoding.

Evidence. The formal encoding proves computability and an execution correspondence theorem: “This paper introduces an automatic technique for analyzing such programs.” (abstract, p. 1). It also proves execution correspondence under the selected bounds (Theorem 2, Sec. 3.2, p. 15). These are mathematical results; they do not show that fixed bounds cover every program.

## technique 2: compositional CHC encoding
What it is. Introduce one relation `Lab(σ)` for labels (node logs). CHCs generate all labels that can occur in a valid knitted-tree prefix. Local predicates `ΨInternal`, `ΨUp`, and `ΨDown` constrain one-frame extensions within a node, to its parent, or to a child. The compositionality lemma lets locally consistent labels be combined into a complete knitted-tree.

How to do it.
1. Add base CHC facts for zero-length executions: one rule for non-root labels and one for the root label (Sec. 5, p. 16)
2. Add an internal-step rule that extends a log when the next lace frame stays in the same node (Sec. 5, p. 16)
3. Add upward and downward rules that extend parent/child logs when the lace crosses an edge; guard them with `consistent_child` and `ΨUp`/`ΨDown` (Sec. 5, p. 16)
4. Add query CHC VI encoding an exit status set `Ex`; solve the resulting system with a CHC solver (Sec. 5, pp. 16–17)
5. Use the minimal model: `Lab(σ)` holds exactly for labels appearing in some knitted-tree prefix (Theorem 3, Sec. 5, p. 16)

The reduction uses solver technology: “This reduction allows us to capitalize on advancements in CHC solvers.” (Sec. 1, p. 1). Theorem 3 states the minimal-model correspondence for the bounded representation.

Verus form (Inference). A Verus implementation could define ghost predicates for label consistency and prove frame-extension lemmas as `proof fn`s. CHC minimal-model reasoning does not carry over directly; Verus would need explicit induction over lace length and a finite bound. Use only supported contracts and loop invariants; do not put proof-only functions in executable code.

## technique 3: semi-algorithm for memory safety
What it is. Query exit statuses in stages. First detect null dereferences; then test out-of-memory and label overflow. If no error is found, increase `m` or `n` and repeat. The method is sound when it terminates, but may run forever because memory safety is undecidable.

Steps from Algorithm MemSafety (Sec. 5.1, p. 17).
1. Set `m=m0`, `n=n0`
2. Solve `ExitStatus(P,m,n,{E})`; if positive, report memory unsafe
3. Solve `{M}` for out-of-memory; if positive, increase `m` and restart
4. Solve `{O}` for label overflow; if positive, increase `n` and restart
5. If both are negative, report memory safe; Theorem 6 justifies this result for the current bounded representation

The paper emphasizes undecidability: “The memory safety problem is undecidable.” (Sec. 3, p. 6). Theorem 7 nevertheless proves soundness when the semi-algorithm terminates.

Verus form (Inference). Use a verified bounded checker with ghost counters and a termination measure only when a finite bound is known. Otherwise state the checker as a partial procedure and expose the bound as a trusted assumption. A Verus proof of one bound does not establish safety for larger executions.

## technique 4: automaton preconditions and termination
SDTAs specify accepted input trees bottom-up. Cross-product the automaton state with knitted-tree label state, adding CHCs that constrain the backbone’s first frames. This supports binary-search, red-black, AVL, and heap preconditions (Sec. 7). Termination follows when no label reaches the overflow frame: each executed instruction consumes a frame, so a bounded lace implies a bounded execution.

Inference: in Verus, encode the input-tree predicate as a recursive `spec fn` and prove it is preserved by each pointer update with `ensures`; this is a translation of the paper’s automaton idea, not a result reported by the paper.

## evidence, trust, and limitations
The prototype checks memory safety on tree procedures and can discover bugs, but the provided text reports no aggregate denominator or runtime table in the sections establishing the reduction. CHC solver correctness, the data theory, the SDTA specification, and chosen `m,n` remain trusted or assumed. If no bounds suffice, the semi-algorithm may not terminate. The authors summarize the contribution: “While we focus on the memory safety problem for illustration, our technique applies broadly to various verification tasks involving tree data structures.” (abstract, p. 1)

Inference: threat to agent-written verified Rust is moderate for pointer-heavy tree code. The useful pattern is a compositional history encoding that turns heap executions into solver-friendly relations. The main gap is bounded completeness: a passing bounded CHC query can miss an execution requiring more spare nodes or frames, so a VL product must report those bounds and overflow outcomes explicitly.

## techniques for the catalog
- knitted-tree encoding: represent input, output, and every heap update in a bounded tree of node logs
- compositional CHCs: generate local frame-extension clauses whose minimal model equals valid execution labels
- staged memory-safety queries: test error and overflow exit statuses, increasing bounds until a sound terminating result
- SDTA cross-product: constrain accepted input-tree shapes and data values through bottom-up automaton states
- frame-bounded termination: infer termination when no execution reaches the log-overflow frame
Checked 2026-10-14 against the paper by a Codex agent: audit record faella2024automated; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
