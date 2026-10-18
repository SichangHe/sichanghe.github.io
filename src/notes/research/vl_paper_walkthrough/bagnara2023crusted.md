# C-rusted: The Advantages of Rust, in C, without the Disadvantages
(authored by agents unless marked 🧑)
Tag: `bagnara2023crusted`, [paper](http://arxiv.org/abs/2302.05331v3)

## central idea
C-rusted keeps ISO C syntax and toolchains while adding annotations that express ownership, exclusivity, shareability, resource properties, and state transitions. The paper says: “C-rusted is based on annotations with which the programmer can express: a) ownership, exclusivity and shareability of language, system and user-defined resources; b) properties of resources and the way they evolve during program execution.” (Section II, p. 2). A static analyzer interprets macros before they disappear during preprocessing; an ordinary C compiler sees compatible C. Inference: this is gradual, annotation-driven static verification, whereas Verus checks Rust programs against executable and mathematical specifications.

The authors' analyzer tracks resource state intraprocedurally, using value-range analysis, multi-interval constraint propagation, and finite domains for resources and references (Section IX, p. 11). Its claims are about annotated code accepted by the analyzer. The paper does not report a benchmark denominator, soundness proof of the analyzer implementation, or a Verus comparison.

## technique: ownership and optional-resource qualifiers
Use annotations when a C pointer or descriptor represents an owned resource. `e_own()` marks ownership, `e_opt(NULL)` permits a null state, and annotations on function parameters describe ownership transfer. In Figure 3, `process(char * e_hown() string)` requires a non-null heap array whose ownership moves into `process`; `open` returns either `-1` or an owning file descriptor; `malloc` returns either `NULL` or an owning heap pointer; `close` and `free` consume ownership (Section III, p. 4, Figure 3; Section IV, p. 5, Figure 4; Section V, p. 7, Figure 6).

Inference: apply the method by annotating library prototypes first, checking error branches immediately, and freeing or closing every successful resource before return; the paper says the C Standard Library and the POSIX Library "have been annotated once and for all", and its analyzer interprets the standard library functions as if annotated (Section III, p. 3; Section IV, p. 5, footnote 3). The original unannotated example increments a possibly invalid descriptor, indexes with a possibly negative read result, and leaks both the file and buffer; the analyzer reports those warnings (Figure 2, p. 3). The repaired Figure 3 (p. 4) checks `fd == -1`, checks allocation and zero size, checks `bytes == -1`, calls `free` and `close` on error paths, and transfers the buffer to `process`.

Verus form (Inference): represent ownership with `tracked` permission tokens or ghost predicates and write `requires` clauses for consuming functions. Executable Rust ownership and borrowing enforce much of this automatically; Verus proofs still need contracts for external descriptors and FFI. The C-rusted annotation itself does not carry over as Verus syntax.

## technique: resource initialization and finalization states
Use nominal resource properties for objects whose legal operations depend on lifecycle state. Figure 8 declares `Channel_t` with `e_fini()`, a constructor `channel_ctor(Channel_t * e_init() chanp)`, a sender, and `channel_dtor(Channel_t * e_fini() chanp)` (Section VI-A, pp. 7–8, Figure 8 on p. 8). A call to `channel_send` before construction is flagged as use of an uninitialized resource; returning without `channel_dtor` is flagged as missing finalization. The paper says resources of type `channel_t`, once initialized, "need to be finalized before being released" and that a finalized resource "is not readable anymore: it can only be re-initialized or released" (Section VI-A, pp. 7–8).

Verus form (Inference): encode lifecycle as a ghost enum or state-machine field, require `Initialized` for send, and ensure destructor transitions to `Finalized`. A `proof fn` can show that every verified path ends in the required state. Rust's ownership can enforce drop execution, but domain-specific protocol states need explicit invariants.

## technique: custom preconditions, postconditions, and state properties
Use `e_in(...)` and `e_out(...)` annotations to state protocol conditions. Figure 9 declares `mixer_open` requiring `blade=off` and producing `door=opened`, `mixer_close` producing `door=closed`, `mixer_on` requiring a closed door and producing `blade=on`, and `mixer_off` producing `blade=off` (Section VI-B, pp. 8–9). The analyzer flags `qux` because it calls `mixer_on` while the door may be open and returns while the blade is still on, violating its output property.

Inference: the application steps are: define an opaque resource type, annotate each operation's accepted state and resulting state, annotate each function's input/output state, then run the analyzer so state inconsistencies become compile-time warnings. The paper says: “The problem is that this is not happening: the programmer has probably forgotten to call mixer_off() before returning from the function.” (Section VI-B, p. 9).

Verus form (Inference): a `struct` or state machine can hold the abstract mixer state; each operation uses `requires` and `ensures`; proof lemmas establish that a sequence preserves the protocol. This maps directly to Verus contracts, with the analyzer's finite state domain becoming a Verus invariant.

## technique: nominal units and subtypes
Use nominal types when ordinary C types hide semantic distinctions. Figure 7 defines Celsius, Kelvin, and delta types with `e_val(e_geq(...))` constraints and declares only valid subtraction and division operators (Section V, pp. 7–8, Figure 7 on p. 8). The analyzer flags `c1 / c2` ("Operation not allowed" in the figure) while accepting Kelvin division; the paper's reason is that Celsius division "has no physical meaning due to the fact that Celsius is not an absolute scale", and `e_bop` declares only the subtraction and Kelvin-division operators. This prevents unit confusion and range violations while retaining C representation.

Verus form (Inference): define distinct Rust wrapper types or `spec fn` predicates for units and ranges; implement only permitted operators and prove range preservation. A raw integer should not be treated as a temperature without a constructor proof.

## technique: unsafe boundaries and checked escape hatches
Use `e_unsafe("kind")` to mark data types, functions, or operations requiring special implementation knowledge. Figure 10 marks `FILE` unsafe, gives `fopen` an optional owning `FILE` pointer type (`fp_opt_own_t`), and makes `fclose` take an owning pointer; by default all accesses to `FILE` objects are flagged (Section VII, p. 9). Encapsulate implementation access inside `e_checked("FILE")` blocks. Figure 11 shows `fclose` reading `fp->flags` inside such a block; "under the responsibility of implementers, function fclose() will be considered as safe by the C-rusted Analyzer" (Section VII, pp. 9–10, Figure 11 on p. 10).

The paper distinguishes `e_unchecked(...)`, which marks code as not expected to conform and requires the function to be unsafe, from `e_checked(...)`, which also marks a statement as not expected to conform to C-rusted syntax and semantics but whose use is guaranteed safe by the programmer (Section VII, p. 9). This creates a safe interface around a reviewed unsafe implementation.

Verus form (Inference): keep unsafe FFI in a small `external_body` boundary only when its contract is explicitly trusted, and prove safe wrappers' `requires`/`ensures`. The paper's checked block is a process annotation, not evidence that the implementation is mathematically verified.

## technique: annotation erasure and incremental adoption
Annotations are macros that expand to nothing; global annotations expand to ISO-C syntax ignored by the compiler (Section II, p. 2; Section IX, p. 11). This lets teams annotate prototypes and critical resources first, reuse existing C compilers, and leave legacy code unannotated. The analyzer consumes annotations before preprocessing erases them. The authors state: “C-rusted has been conceived for incremental adoption” (Section VIII, p. 10).

Inference: Verus cannot preserve this exact source compatibility because proof annotations affect the Rust verifier, although proof code is erased from execution. A migration tool could use C-rusted-style contracts as input specifications for Rust wrappers.

## evidence, assumptions, and threat to VL
The paper's evidence consists of worked examples: Figure 2 diagnostics on one unsafe function, Figure 3 a repaired function with no warnings, Figure 7 unit constraints, Figure 8 lifecycle errors, Figure 9 protocol errors, and Figure 11 an unsafe boundary. No table gives benchmark counts, false-positive rates, proof times, or independent validation. Inference: the analyzer's implementation, library annotations, finite domains, and interpretation of absent annotations remain trusted. The paper also claims prevention of leaks, use-after-deallocation, race conditions due to sharing, and other resource errors for accepted annotated programs (Section VIII, pp. 10–11), but those broad claims are not accompanied by quantitative coverage.

Inference: threat to agent-written verified Rust is moderate as a competing workflow idea. C-rusted could reduce migration cost and annotate legacy C, but it does not provide Verus's solver-backed functional proofs or Rust compiler guarantees. VL should borrow its explicit resource protocols and safe/unsafe boundary discipline, then discharge them with Verus contracts.

## what VL should not redo
The paper already illustrates, by examples, ownership qualifiers, lifecycle states, nominal subtypes, protocol pre/postconditions, unsafe encapsulation, and annotation erasure. New work should measure how these contracts translate into Verus and whether agents can preserve them during C-to-Rust migration.

## techniques for the catalog
- ownership qualifiers — annotate resource-producing and resource-consuming interfaces so ownership transfer and leaks are checked
- lifecycle annotations — require initialization before use and finalization before scope exit
- protocol pre/postconditions — describe resource states before and after each operation with `e_in` and `e_out`
- nominal value properties — distinguish units and ranges with nominal types and constrained operators
- unsafe boundaries — isolate implementation-only operations with `e_unsafe`, `e_checked`, and `e_unchecked`
- incremental annotation erasure — let macros disappear for existing C compilers while a static analyzer checks them
Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "Nominal typing is a restriction placed by strong type systems whereby two types are compatible only if they have the same name, independently from their underlying representation."): read the whole paper text and checked every quotation, figure content, section and page reference, and technique step against it; changed page references (Figures 3, 4, 6, 7, 8, 10, 11, `e_unchecked` and `e_checked` text), the `fopen` description (optional owning FILE pointer, not a descriptor), the `e_checked` wording, the finalization wording (released, not scope exit), the erasure wording (all annotations expand to nothing except global ones), and the sharing-race claim (pp. 10-11), added two paper quotes, and marked my own procedure steps and trust remarks "Inference:"; did not check the Verus mappings (outside the paper), references, or the analyzer behavior beyond the paper text.
