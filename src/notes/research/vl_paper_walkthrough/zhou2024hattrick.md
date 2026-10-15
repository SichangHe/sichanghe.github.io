# A HAT Trick: Automatically Verifying Representation Invariants using Symbolic Finite Automata
(authored by agents unless marked 🧑)
Tag: `zhou2024hattrick`, [paper](https://doi.org/XXXX)

## scope and result
The paper verifies representation invariants of functional clients that call stateful libraries whose internal state is hidden. Its core claim is: “SFAs can be used to succinctly and precisely capture fine-grained temporal and data-dependent histories of interactions between functional clients and stateful libraries.” Hoare Automata Types (HATs) put symbolic finite automata (SFA) preconditions and postconditions around ordinary refinement types, so a function must preserve an invariant over traces of calls and return values.

The prototype, Marple, is about 12K lines of OCaml and uses Z3 for SMT and finite-automata inclusion. Table 1 covers 19 ADT/library implementations: stacks, queues, sets, heaps, MinSet, LazySet, a file system, DFAs, and connected graphs. Total verification times range from 1.42 to 176.89 seconds per ADT. The paper proves type soundness and decidability of algorithmic typing, with a Coq mechanization of the main soundness theorem and corollary in the appendix.

## technique: trace invariants with symbolic finite automata
Use this when a client relies on an API whose state cannot be inspected directly, but calls and returns expose enough evidence. Define an event as an operator, arguments, and result, such as `put key value = unit` or `exists key = bool`. An SFA recognizes permitted finite event traces; predicates over event arguments and results constrain transitions.

The paper's file-system example starts with an informal parent-directory invariant, then writes it as an SFA formula. For a path p, `P_isDir(p)` means a `put` of a directory at p that is never replaced or deleted; `P_isFile(p)` is analogous. The invariant is “`P_isFile(p) ∨ P_isDir(p) ⇒ P_isDir(parent(p))`,” together with an always-valid root case. A bad implementation that simply executes `put path bytes` yields a trace that stores `/a/b.txt` without `/a`; the correct implementation first checks existence and directory status. Because both input and output are recorded, `initialize() = true` and `initialize() = false` denote different hidden states (Section 2).

Inference: For Verus, model an opaque service with a ghost event history and state predicates over event arguments/results. This is an architectural translation, not a Verus feature described by the paper. Verus can encode histories in ghost data and prove state transitions with `requires`/`ensures`, but the paper does not provide Verus syntax.

## technique: HAT specifications and compositional preservation
Use a HAT `[A] t [B]` when a function's legal input context and resulting context are both trace properties. `A` is the precondition SFA, `t` is a pure refinement type for the return value, and `B` is the postcondition SFA. Ghost variables quantify an invariant over arbitrary values. For the set example, the paper gives an insert type whose pre- and postcondition are the same uniqueness automaton. For the file system it gives `add` and `delete` types with `[I_FS(p)] {bool} [I_FS(p)]`.

The application rule is compositional: type each effectful library operator with a HAT, sequence postconditions into the next context, and check that the client's postcondition remains included in the invariant. The paper explains: “Verifying that the representation invariant holds now reduces to an inclusion check between two symbolic automata.” Intersection types describe different outcomes of an operation. For `exists`, one HAT branch applies when the key was previously stored and returns true; the other applies when it was absent and returns false. `LAST` constrains a postcondition to append exactly one event.

Inference: In Verus, each API wrapper can expose a ghost history transition and a contract preserving an invariant predicate. Branch-specific HATs correspond to separate `ensures` cases or lemmas. This is an inference; HAT syntax is from the paper's lambda calculus, not Verus.

## technique: refinement and effect typing
The core calculus has pure operators and effectful operators, call-by-value functions, pattern matching, and traces. Pure refinement types constrain values with logical formulas. HATs constrain the effects of stateful computations. Well-formedness requires that the postcondition language is a prefix extension of the precondition language: `L(B) ⊆ L(A; any trace)`. Subtyping is contravariant in preconditions and covariant in postconditions. Ghost variables are logical only and are instantiated at calls.

The declarative typing rules type pure expressions, effectful applications, intersections, and ghost abstractions. The fundamental theorem states: “the trace of effects produced by a well-typed term e are captured by its corresponding HAT τ.” Type soundness then says a function typed `[A] t [A]` preserves A for every well-typed input and every trace consistent with A.

## technique: SFA inclusion through minterms and alphabet transfer
Use this to decide whether one symbolic trace language is included in another despite an infinite data alphabet. First collect every literal used in event qualifiers, atomic predicates, and the typing context. Build maximal satisfiable Boolean combinations, called minterms, that partition the infinite alphabet into finitely many equivalence classes. Replace each symbolic transition by its minterm class, producing ordinary finite automata, then run standard finite-automata inclusion.

Algorithm 1 (`SFAInclusion`) enumerates Boolean combinations of context literals and event literals, discards unsatisfiable combinations by a refinement-type subtype query, records the surviving event minterms, applies `AlphaTrans` to both automata, and returns false on the first failed inclusion or true after all combinations pass. The paper states: “As long as the satisfiability of minterms is decidable, so is checking inclusion between two SFAs.” EPR qualifiers make that satisfiability decidable in Marple.

Inference: Verus's SMT-backed predicates could use a similar finite partition only for a decidable fragment. The translation from Rust/spec expressions to event minterms would be trusted glue and would require independent tests; the paper does not claim this transfer.

## technique: bidirectional typing and ghost abduction
Use bidirectional synthesis/checking to make declarative subsumption deterministic. The algorithm keeps ghost variables qualified by unknown formulas, specializes them from the current context, and restricts ghosts to SFA positions. For effectful calls, it considers every branch of an intersection-typed operator, combines the current postcontext with the branch postcondition, and checks the continuation against that precondition.

The `Abduce` subroutine infers the weakest ghost qualifiers sufficient for an inclusion `A ⊆ A'`, or reports none. The paper proves: “Given a well-formed built-in typing context Δ, type context Γ, term e, and HAT τ, Γ ⊢ e ⇐ τ =⇒ Γ ⊢ e : τ,” and separately proves that checking is decidable.

Inference: A Verus analogue could infer ghost facts needed to instantiate a contract, but Verus does not have HAT subtyping or an `Abduce` primitive. Treat this as a synthesis design, not an existing Verus construct.

## evidence, assumptions, and limits
Marple checks diverse invariants including linked-list acyclicity, set uniqueness, heap ordering, file-system parent directories, DFA transition determinism, and graph connectivity. The largest total times are ConnectedGraph 176.89 s and FileSystem over KVStore 157.27 s. The most expensive single method has 8,144 satisfiability queries for FileSystem/KVStore; its average transformed automaton has 56.64 transitions and FA-inclusion time is 16.54 s. Times are per benchmark on the paper's implementation, not a comparison with Verus.

The approach assumes sound specifications for backing libraries, sound method-predicate lemmas, and decidable EPR queries. Hidden state itself remains trusted through the API specifications. Z3, the alphabet transformation, and the OCaml implementation are trusted components; the paper's Coq mechanization covers the metatheory, not all implementation code. The paper reports no unsoundness found, but its evaluation is OCaml and synthetic hidden-state wrappers rather than Rust systems.

Inference: For VL, this is a direct threat model for agent-written verified Rust that wraps databases, caches, or other opaque services: a local function contract can look valid while violating a temporal invariant across calls. VL should not redo generic SFA trace specifications, HAT pre/post effect typing, minterm-based inclusion, or bidirectional ghost abduction as ideas. It should test whether Verus ghost histories and ordinary contracts can express the same invariants, and measure the cost and trust of the translation.

## techniques for the catalog
- SFA trace invariant: specify legal histories of opaque-library calls using predicates over arguments and returns
- Hoare Automata Type: attach pre/post trace automata to refinement types so functions preserve representation invariants
- compositional effect typing: sequence API HATs and use intersection branches for context-dependent results
- minterm alphabet transfer: partition symbolic event alphabets into satisfiable classes and reduce SFA inclusion to FA inclusion
- bidirectional ghost abduction: infer ghost qualifiers needed for deterministic inclusion checks
Checked 2026-10-14 against the paper by a Codex agent: audit record zhou2024hattrick; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
