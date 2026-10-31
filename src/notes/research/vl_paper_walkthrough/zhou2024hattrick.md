# A HAT Trick: Automatically Verifying Representation Invariants using Symbolic Finite Automata
(authored by agents unless marked 🧑)
Tag: `zhou2024hattrick`, [paper](https://arxiv.org/abs/2404.01484v2)

## scope and result
The paper verifies user-specified representation invariants of functional clients of stateful libraries with hidden state. Its abstract states: “We show that SFAs can be used to succinctly and precisely capture fine-grained temporal and data-dependent histories of interactions between functional clients and stateful libraries.” Hoare Automata Types (HATs) qualify refinement types with symbolic finite automata (SFA) describing context traces before and after execution. Using the same invariant in both conditions specifies preservation (Sections 2 and 4.1, pp. 7, 10).

Marple consists of approximately 12K lines of OCaml and uses Z3 for SMT and finite-automata inclusion queries (Section 6, p. 18). Table 1 contains 19 ADT/library implementations covering stacks, queues, sets, heaps, MinSet, LazySet, file systems, DFAs, and connected graphs. Total verification times range from 1.42 to 176.89 seconds per implementation (pp. 19–20). The paper states conditional type soundness and proves soundness and decidability of algorithmic typing (Sections 4.3 and 5.2, pp. 15, 18; Appendix E, pp. 34–41).

## technique: trace invariants with symbolic finite automata
An event records an operator, its arguments, and its result, such as `put key value = ()` or `exists key = true`. An SFA recognizes permitted finite event traces; predicates constrain event arguments and results (Section 2, p. 5). Recording results matters: the paper says the hidden state after successful initialization is “likely to be different” from that after failed initialization (p. 5).

The file-system invariant requires a stored non-root file or directory to have a parent stored as a non-deleted directory. In the formal specification, `P_isDir(p)` describes a directory put at p without a subsequent put marking p deleted or a file; `P_isFile(p)` is analogous. The invariant combines an always-valid root case with `P_isFile(p) ∨ P_isDir(p) ⇒ P_isDir(parent(p))`. A bad implementation simply stores `/a/b.txt` without checking for `/a`; the correct implementation checks existence and directory status before storing a new path (Section 2, pp. 4–6).

Inference: This technique is useful when calls and returns expose enough information to specify the required hidden-state property. A proposed Verus translation could model an opaque service with a ghost event history and predicates over event arguments and results. The paper does not establish that translation's feasibility.

## technique: HAT specifications and compositional preservation
A HAT `[A] t [B]` has a precondition SFA A describing permitted context traces, a pure refinement type t describing the result, and a postcondition SFA B describing the extended context after execution. Logical ghost variables quantify invariants over arbitrary values. The file-system `add` and `delete` signatures use the same invariant in both conditions (Section 2, p. 7; Section 4.1, p. 10).

Effectful application passes the operator's postcondition to the continuation as its precondition (Figure 6, pp. 13–14). Preservation can then be checked by automata inclusion. Intersection types specify context-dependent outcomes: `exists` returns true if the key was previously stored and false otherwise. In the operator signatures, `LAST` restricts the appended portion to one event (Example 4.2, p. 10).

Inference: A Verus API wrapper could expose a ghost history transition and an invariant-preserving contract. Intersection branches suggest conditional postconditions or separate lemmas. These are proposed translations, not features established by this paper.

## technique: refinement and effect typing
The core calculus supports call-by-value functions, recursive functions, pattern matching, pure and effectful operators, and event traces (Section 3, pp. 7–9). Pure refinement types constrain values; HATs constrain effectful computations. Well-formedness requires `L(B) ⊆ L(A; any trace)`. HAT subtyping is contravariant in preconditions and covariant in return types and postconditions; postcondition inclusion is restricted to traces extending the target precondition (Figure 5, p. 12).

Theorem 4.8 assumes a well-formed built-in operator typing context: the operators' semantics must agree with their supplied types (Definition 4.7, p. 15). Corollary 4.9 says that a function typed to preserve an invariant preserves it on evaluations that terminate in a value from a context satisfying the invariant. The denotation quantifies over evaluations reaching a value; it does not establish termination (Figure 7, p. 14; Corollary 4.9, p. 15).

## technique: SFA inclusion through minterms and alphabet transformation
Algorithm 1 enumerates Boolean combinations of typing-context literals, then constructs minterms for each event class from literals in the context and input automata. Minterms are maximal satisfiable Boolean combinations that partition the symbolic alphabet. A refinement subtype query against the uninhabited type tests satisfiability. For each context combination, `AlphaTrans` maps the surviving minterms to a finite alphabet and translates both SFAs to ordinary finite automata. Standard FA inclusion checks decide the query; a failed inclusion returns false (Section 5.1, pp. 16–17; Algorithm 2, p. 32).

The paper states: “As long as the satisfiability of minterms is decidable, so is checking inclusion between two SFAs.” It justifies decidable minterm satisfiability using effectively propositional (EPR) formulas for qualifiers (Section 5.1, p. 16).

Inference: A Verus adaptation could explore finite partitions of event predicates. It would need a decidable predicate fragment and a correctness argument for the translation; the paper does not supply either for Rust or Verus.

## technique: bidirectional typing and ghost abduction
The algorithm combines synthesis and checking, qualifies ghost variables with unknown formulas, and restricts them to SFA positions. For an effectful call, it infers ghost qualifiers from the current context, considers every intersection branch, and checks the continuation under the intersection of arbitrary extensions of the current precondition with the branch postcondition (Section 5.2, pp. 17–18; Figure 8).

`Abduce` infers the weakest ghost qualifiers sufficient for the required inclusion or reports failure. Appendix D describes a counterexample-guided refinement loop over unknown, positive, and negative minterms; a decision tree synthesizes distinguishing formulas (pp. 31–33). Theorem 5.1 states that algorithmic checking implies declarative typing under a well-formed built-in typing context. Theorem 5.2 states decidability (p. 18; proofs in Appendix E).

Inference: A Verus adaptation could use a separate synthesis procedure to infer facts needed to instantiate contracts. This paper establishes no corresponding Verus mechanism.

## evidence, assumptions, and limits
The evaluated invariants include linked-list acyclicity, set uniqueness, heap ordering, file-system parent directories, DFA transition determinism, and graph connectivity (Table 2, p. 19). The largest total verification times are ConnectedGraph/Graph at 176.89 s and FileSystem/KVStore at 157.27 s. FileSystem/KVStore's selected method performs 8,144 satisfiability queries; its average transformed automaton has 481 transitions, satisfiability-check time is 56.64 s, and FA-inclusion time is 16.54 s (Table 1, p. 19; Appendix F, Table 4, p. 43).

Table 1's caption states: “We have rewritten functional implementations of these benchmarks into stateful versions by assuming there is a hidden mutable datatype instance that ADT methods use to perform their operations.” It also states: “The backing stateful libraries are drawn from a verified OCaml library [Charguéraud et al. 2017].” (p. 19) Marple uses first-order lemmas to define method-predicate semantics (Section 6, p. 18). Appendix E links a Coq formalization of the core language, typing rules, Theorem 4.8, and Corollary 4.9 (p. 34).

Inference: An end-to-end guarantee for Marple additionally depends on supplied specifications and lemmas, Z3, alphabet transformation, and the OCaml implementation. The paper does not claim that the Coq artifact verifies the entire Marple implementation. Its evaluation does not establish results for Rust systems.

## techniques for the catalog
- SFA trace invariant: specify legal histories of opaque-library calls using predicates over arguments and returns
- Hoare Automata Type: attach pre/post trace automata to refinement types to specify invariant preservation
- compositional effect typing: sequence API HATs and use intersection branches for context-dependent results
- minterm alphabet transformation: partition symbolic event alphabets into satisfiable classes and reduce SFA inclusion to FA inclusion
- bidirectional ghost abduction: infer ghost qualifiers needed for deterministic inclusion checks
