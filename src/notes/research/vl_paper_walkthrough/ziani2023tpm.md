# Towards Formal Verification of a TPM Software Stack
(authored by agents unless marked 🧑)
Tag: `ziani2023tpm`, [paper](http://arxiv.org/abs/2307.16821v2)

## target and result

This is a Frama-C case study of the ESAPI part of the open-source `tpm2-tss` C library. The full target has over 120,000 lines of C; the ESAPI layer alone has over 50,000. The study verifies a representative subset involved in storing an encryption key, proving selected functional properties and absence of runtime errors (RTE). The abstract says, “Heavily based on linked lists and complex data structures, the library code appears to be highly challenging for the verification tool” (abstract, PDF p. 1). The authors adapt the code for verification, replace `calloc` with a verified static allocator, add linked-list lemmas proved in Coq, and identify Frama-C limitations. This is a partial case study, not a proof of the full library.

## technique 1: ACSL contracts and Frama-C/WP proof obligations

Frama-C's ACSL annotations specify C assertions and function contracts. A contract has `requires` preconditions, `ensures` postconditions, and an `assigns` frame listing non-local memory that may change (section 2, PDF p. 3). The WP plugin turns annotated C into verification conditions, discharging them internally, through Why3 and SMT solvers, or with Coq. With the dedicated option (`-wp-rte` in section 7), WP adds assertions for possible runtime errors and attempts to prove them (section 2, PDF p. 3; section 7, PDF p. 16).

The following application procedure is my reconstruction of the workflow the paper describes (it is not a numbered procedure in the paper):

1. State the intended functional behavior and memory-safety assumptions as ACSL predicates and preconditions.
2. State postconditions for normal returns and an `assigns` frame for permitted writes (section 2).
3. Run WP to generate proof obligations; enable RTE assertions with `-wp-rte` (section 2).
4. Use Qed, SMT solvers via Why3, or Coq for remaining goals; inspect failures and add intermediate assertions or lemmas (sections 5 and 6).
5. Run smoke tests to find dead code or specification inconsistencies (section 7, PDF p. 16).

Inference: in Verus, the analogous function contract uses Rust `requires` and `ensures`, and loop facts use `invariant`; a function's allowed memory effects are represented by Rust ownership and borrow checking rather than an ACSL `assigns` clause. The paper is not about Verus, so this mapping is an inference. The key transferable practice is to prove both behavior and memory safety from explicit contracts.

## technique 2: model linked-list shape, separation, and reachability

The example defines an inductive `linked_ll` predicate relating a C pointer chain to an ACSL logic list. Its cases require valid nodes, memory separation, and recursive reachability. `to_ll` translates a pointer-bounded list segment to a logic list; `in_list` and `in_list_handle` express membership; `unchanged_ll` states that, between two labels, all list elements stay valid and their `next` fields keep the same value (section 4, PDF pp. 5–6). The authors explain, “In particular, we need to ensure that the resource list is well-formed — that is, it is not circular, and does not contain any overlap between nodes — and stays that way throughout the layer” (section 4, PDF p. 6).

To use the method, define predicates for (a) list-to-logic-list correspondence, (b) validity and pairwise separation, (c) membership by pointer or key, and (d) preservation of `next` links. Put these predicates in function preconditions, loop invariants, and postconditions. Add assertions at pointer updates and block boundaries to propagate list facts to the final postcondition (section 5, PDF p. 13). When a proof needs a list split, use lemmas such as the paper's `linked_ll_split_variant`, which decomposes a linked concatenated logic list into two linked segments at a bound element (section 6, Fig. 7, PDF p. 15).

Inference: a Verus implementation would use recursive predicates over owned node structures or a ghost sequence of node identities, with `requires`/`ensures` and loop `invariant`s preserving acyclicity and separation. Rust ownership already constrains aliasing, but it does not by itself prove the algorithm's key-to-node correspondence or list shape; those remain explicit proof obligations.

## technique 3: replace unsupported dynamic allocation with a verified static allocator

The Frama-C/WP memory model used in the study did not support ACSL allocability and freshness clauses. The paper says that without allocability and freshness, “proving goals involving validity or separation between a newly allocated node and any other pointer is impossible” (section 4, PDF p. 6). They therefore replace `calloc` with a bank-based allocator: a static array of `_alloc_max` nodes and an `_alloc_idx` pointing to the next available cell (Fig. 2, PDF pp. 7–8).

The allocator method is:

1. Define a bank-validity predicate requiring `0 <= _alloc_idx <= _alloc_max` (Fig. 2).
2. Define predicates separating all allocable cells from existing lists, pointers, and contexts (Fig. 2).
3. On allocation, initialize every field to zero, increment `_alloc_idx`, and return the former first allocable cell (Fig. 2).
4. Contract the allocator so bank validity holds before and after, the index increases by one on success, the returned cell is valid and zeroed, and other cells are unchanged (section 4, PDF pp. 7–8). The paper shows only the successful-allocation behavior; the code returns `NULL` when the bank is full.
5. Define a freshness predicate (`freshness`) stating that the context, the existing list, the list head, the node pointed to by the output pointer, and the output double pointer are each separated from the still-allocable bank cells; require it at the search function's entry and ensure it at exit (Fig. 3 and Fig. 4, PDF pp. 9–11).

The paper says, “In the meanwhile, a static allocator with an additional separation predicate simulating freshness provides a reasonable solution to verify the target library” (section 4, PDF p. 9). The authors write that they “expect that the migration from our specific allocator to a real-life dynamic allocator — with a more general contract — will be very easy to perform, as soon as necessary features are supported by Frama-C” (section 4, PDF p. 9). Inference: because the proof is about the bank allocator, not `calloc`, it assumes the production memory behavior matches the model. Inference: for Verus, an arena with an index and a ghost set of allocated slots could make freshness explicit; the model must be related to the production allocator before claiming the production code is verified.

## technique 4: use scopes and assertions to control side effects and propagate facts

The search function `getNode` traverses a list, returns an existing node by handle, or allocates and prepends a node. The real-life code takes the address of a local pointer in the `createNode` call; the paper explains that the WP memory model has no separate allocation tables for heap, stack and static segments, so this marks the single allocation table as modified and the list property (e.g. the assertion at line 377 of Fig. 4) cannot be proved. The authors add anonymous blocks and a second temporary (`tmp_node_2`) so that the pointer used by `createNode` goes out of scope and the side-effect-prone allocation does not affect the list (section 5, Fig. 5, PDF pp. 12–13). They add assertions around list insertion, marshaling, separation, and return points to carry list and freshness facts across scopes; the paper notes that such assertions can require experience to discover (section 5, PDF p. 13).

Inference: the Verus analogue is to keep mutable borrows short, split operations into helper functions with precise `requires`/`ensures`, and add `assert` statements or proof lemmas at ownership and list transitions. The paper's block transformation is a verification-oriented source change, so its soundness depends on preserving C behavior; it is not a general Verus rule.

## technique 5: avoid unsupported pointer casts in byte copying

Frama-C's standard `memcpy` contracts relied on pointer casts, whose support in WP is “currently limited” (section 5, PDF p. 14). The authors define a custom copy routine that extracts byte chunks with shifts and bit masks instead of casting a 32-bit integer pointer to bytes (section 5, Fig. 6, PDF pp. 13–14). Preconditions require valid source and destination locations; this version is fully handled by WP for the properties studied. Inference: verified Rust should prefer explicit, bounds-checked byte operations and prove endianness and slice bounds, rather than relying on an opaque cast-heavy helper. The exact Rust code is not in the paper.

## technique 6: prove inductive linked-list lemmas in Coq when SMT stalls

SMT solvers can become inefficient on inductive definitions, so the study adds lemmas that solvers can instantiate and proves difficult lemmas interactively in Coq (section 6, PDF p. 14). It uses twelve earlier linked-list lemmas and adds two new ones; 11 of the 14 used lemmas are proved by Coq scripts and three by Alt-Ergo (section 7, PDF p. 16). A Frama-C version change altered the translation of logic lists, so older Coq proofs could not simply be reused. The newer translation axiomatized `nil`, `cons`, length, concatenation, and `nth` without an induction or case principle. The authors add a tail function and decomposition axioms, and reason inductively through the `linked_ll` predicate when needed (section 6, PDF pp. 14–15).

Inference: in Verus, isolate recursive list facts in `proof fn` lemmas and call them from executable-proof boundaries; do not mark a function being verified as an external body merely to bypass an obligation. The general lesson is to provide explicit induction structure and reusable lemmas when automation cannot discover it.

## evidence, trust, and limits

The reported setup is Frama-C 26.1 on Ubuntu 20.04.4, an Intel i5-6600 at 3.30 GHz with four cores and 16 GB RAM, using `-wp-par 3`, timeout 30 seconds, Why3 1.5.1, Alt-Ergo 2.4.3, and CVC4 1.8 (section 7, PDF pp. 15–16). The maximum time to prove one goal was 20 s for the example and 1 min 50 s for the library subset; smoke tests were run and checked manually (section 7, PDF p. 16). For the illustrative example, 282 total goals were proved in 5m13s: 243 functional goals (86.17%) and 39 RTE goals (13.83%); Qed proved 123 goals, one script proved 1, and SMT proved 158. For the real-life library subset, 659 goals were proved in 18m07s: 590 functional (89.53%) and 69 RTE (10.47%); Qed proved 312, scripts 5, and SMT 342. The displayed percentages match the fractions: 243/282 = 86.17%, 39/282 = 13.83%, 590/659 = 89.53%, and 69/659 = 10.47% (rounding to two decimals). The subset covers 10 functions and excludes macro functions, cryptographic operations, and interfaces without code (whose behaviors had to be modeled in ACSL) (section 7, PDF p. 16).

The proof trusts the Frama-C kernel/WP, Why3 and solver implementations, Coq proofs and added axioms, the ACSL contracts, and the verification-oriented allocator/code adaptations. It does not prove the entire 120,000-line library, real `calloc` behavior, cryptographic operations, or the unadapted source (“the current real-life code cannot be verified without adaptations”, section 9, PDF p. 18). Handle uniqueness is not yet specified in the contracts (footnote 6, PDF p. 5), and the shown contracts are partial. That the adapted code's “logical behavior was preserved” is the authors' claim, not a proved property. The conclusion lists as needed tool improvements support for dynamic allocation and the basic ACSL clauses for it, a byte-level memory model, and clearer separation of modification statuses between heap, stack and static segments (section 9, PDF pp. 17–18); sections 5 and 6 also note limited pointer-cast support and suggest a concrete list representation in the Frama-C–Coq translation. Inference: the threat to agent-written verified Rust is high when unsafe memory models, pointer casts, or ownership abstractions are hidden behind unproved helpers; it is lower when all resource invariants and helper contracts are checked in the target verifier and the modeled allocator is related to production behavior.

## techniques for the catalog

- ACSL contract verification — state functional, frame, and runtime-safety obligations and discharge them through WP, SMT, or Coq
- linked-list separation predicates — model list shape, reachability, validity, membership, and unchanged links as reusable predicates and lemmas
- static allocator workaround — replace unsupported dynamic allocation with a bank allocator plus explicit freshness and separation contracts
- proof-guiding assertions and scopes — constrain side effects and propagate list facts across blocks and return paths
- cast-free byte copying — use shifts and masks with explicit validity contracts when pointer-cast memory models fail
- interactive inductive lemmas — prove list lemmas in Coq when SMT automation cannot handle inductive definitions
