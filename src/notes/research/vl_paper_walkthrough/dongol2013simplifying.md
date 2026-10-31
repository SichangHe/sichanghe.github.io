# Simplifying proofs of linearisability using layers of abstraction
(authored by agents unless marked 🧑)
Tag: `dongol2013simplifying`, [paper](http://arxiv.org/abs/1307.6958v1)

## problem and proof architecture
The paper verifies Heller et al.'s lazy concurrent set without identifying a concrete linearisation point for each fine-grained operation. Its abstract states: “This paper proposes an alternative method for verifying linearisability that does not require identification of linearisation points.” The method proves that every concrete behavior over an interval is allowed by a coarse-grained abstraction (Figure 3 of the paper), after which the abstraction must be shown linearisable. The paper does not carry out that second step: it only says that “due to the coarse granularity of atomicity, the linearising statements are straightforward to identify and the linearisability proof itself is simpler [8]” (Section 1, p. 2), and in Section 7 names the guards `⟨x ∈ absSet⟩` and `⟨x ∉ absSet⟩` as the linearising statements of the coarse `contains`. The body (Section 6) proves the refinement for `contains` only; the refinement for `add` and `remove` is in Appendix A (pp. 15–20). Inference: The paper's claim is methodological and is demonstrated on the lazy set; it is not a claim that all concurrent algorithms can be handled automatically.

## technique: layered refinement to coarse atomicity
What it is. Build a coarse-grained program with the same operations but atomic set tests and updates. Prove behavior refinement from the fine implementation to this abstraction. Then prove ordinary linearisability of the abstraction, where atomic statements are easy to identify.

How to do it. (1) Model the lazy list with `add`, `remove`, `contains`, and `locate`; nodes have `val`, `nxt`, `mrk`, and `lck`, and values are strictly sorted. (2) Replace fine `contains` traversal with an abstract atomic guard `⟨x ∈ absSet⟩`, which holds on an interval iff some time in the interval has x in the abstract set; the coarse `contains` (`CGCon`, Figure 6) is `(⟨x ∈ absSet⟩ ; resp := true) ⊓ (⟨x ∉ absSet⟩ ; resp := false)`, and a concrete execution returning true must refine the true branch. (3) State a rely condition for interference from other processes; the paper leaves it open at first and derives it during the proof (conditions (7)–(11), combined by conjunction into `r`). (4) Prove each concrete operation's behavior implies the corresponding coarse behavior using interval refinement and rely/guarantee rules (Lemmas 2–3, Theorems 5.1–5.2; proof decomposition in Figure 7): `add` and `remove` are unchanged in the abstraction so their step is trivial in the body, and `contains` is split by Lemma 2 into a true case (5) and a false case (6). (5) Prove the coarse program linearisable by selecting its atomic operation steps; the paper asserts this is easy but does not carry it out. In Section 2 the paper says, citing [6], that none of C1–C5 is a valid linearising statement of `contains(x)`; instead `contains(x)` “is linearised by the execution of a statement within add(x) or remove(x)”.

Quote: “Because we prove behaviour refinement, any behaviour of the fine-grained implementation is a possible behaviour of the coarse-grained abstraction, and hence, an implementation is linearisable whenever the abstraction is linearisable.” (Section 2, p. 4)

Verus form. Inference: represent the abstract set as a ghost state machine or `spec fn`, and give each Rust operation `requires`/`ensures` relating concrete memory to the abstract state. For concurrent code, Verus transition-system APIs and proof of state-machine invariants are the closest fit. The interval refinement relation and coarse atomic guard are not built-in Verus syntax; encode them as ghost predicates and `proof fn` lemmas. Ownership and permissions must be represented explicitly, often through proof-oriented wrappers.

Evidence and limits. Section 6 (pp. 10–12) reduces the refinement to two obligations, S1 (`RELY r • CGS(p) ⊑ S(p)`) and S2 (the other processes imply `r`), and proves S1 for `contains` with the rely conditions (7)–(11). The proof of S2 is not given: “The details of this proof are elided.” (p. 12). Appendix A (pp. 15–20) gives the `add` and `remove` refinement, with the rely side conditions (13) and (16) argued only as “straightforward due to the locks held by process p”. The paper says full mechanisation is future work, so the derivation is a paper proof, not a checked Verus artifact.

## technique: interval predicates and streams
What it is. An interval is a contiguous set of discrete times; a stream maps every time to a state. Commands are interpreted as interval predicates over streams, allowing properties to refer to all states during an operation rather than only pre/post states.

How to do it. Define sequential composition with chop `g1 ; g2`, parallel composition by conjunction, and iteration as the greatest fixed point `gω = νz • (g ; z) ∨ empty`. Use complete invocation-to-response intervals for operations. To state that an abstract condition holds sometime during an interval, use the existential interval semantics of an atomic guard. The paper's true-returning `contains` behavior is `C1 ; (C2 ; C3)ω ; C4 ; return true`, refined by `⟨x ∈ absSet⟩ ; return true`.

Quote: “Capturing the behaviour of a program over its interval of execution is crucial to proving linearisability of concurrent data structures.” (Section 1, p. 2)

Verus form. Inference: Verus specifications are state predicates, so an interval can be modeled as a ghost sequence of states with a predicate over every index and a transition relation between adjacent states. A loop invariant and `decreases` establish finite iteration; unbounded `ω` behavior requires a separate liveness model and is not obtained from ordinary Verus functional proofs.

## technique: fractional permissions and rely/guarantee interference
What it is. Each state carries a rational permission for every process and location. Permission 1 gives write access, a fraction between 0 and 1 gives read access, and zero gives no access. The sum of permissions over processes is at most 1 (a healthiness condition on streams), preventing two writers. Rely predicates describe environment interference over intervals.

How to do it. (1) Attach permission maps to stream states. (2) Require that a process writes or reads a location in the step from time t-1 to t only if it holds write or read permission in state s.t. (3) State healthiness that `Σp Π.va.p ≤ 1`. (4) Define interference `I.VA.p` as some other process q holding write permission to some location in VA. (5) Use compositional rely/guarantee rules to transfer the environment assumption into each refinement proof. The framework allows non-conflicting accesses to occur truly concurrently, rather than forcing every statement into a total interleaving.

Quote: “We assume that at most one process has write permission to a location va at any time”. (Section 3, p. 7)

Verus form. Inference: Verus's ownership and linear ghost types can encode exclusive write authority and split read permissions, but the paper's rational permission map is not a direct Verus type. State-machine invariants and `tracked` ghost resources can carry the authority; each operation's contract must state which resource it consumes or preserves.

## technique: apparent-state evaluation
What it is. A fine-grained process may read fields at different times, so an expression can evaluate to a value that was never an instantaneous actual state. The paper defines an apparent-state evaluator that does not fix the order of reads; it argues its proof “is more general because it shows that any order of evaluation is valid” (Section 4, p. 7).

How to use it. Identify expressions that read multiple locations, such as the paper's `¬(n1p ↦ mrk) ∧ ((n1p ↦ val) = x)` (statement C4 / cl3). Model each read against the set of states in which the process can read the needed locations (`apparent_{p,W}`), rather than splitting the expression into a fixed order of atomic reads. Use the resulting evaluator in interval behavior and refinement lemmas.

Quote: “Our definition of apparent states evaluation does not fix the order in which n1p 7→ mrk and n1p 7→ val are read.” (Section 4, p. 7; the “7→” is the text extraction of the paper's ↦ symbol)

Verus form. Inference: expose each atomic load in Rust and prove an invariant that relates both possible observation orders to the abstract set predicate. Verus cannot assume an arbitrary read order without modeling the concurrent atomic API and memory ordering; this is a trusted-library boundary.

## techniques for the catalog
- layered refinement: prove fine operations refine coarse atomic ones, then prove the abstraction linearisable
- interval semantics: reason over complete invocation-to-response intervals and streams, with chop and iteration
- fractional permissions: enforce exclusive writes and model environment interference compositionally
- apparent-state evaluation: allow nondeterministic field-read order for fine-grained expressions
