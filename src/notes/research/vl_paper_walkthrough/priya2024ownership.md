# Ownership in low-level intermediate representation
(authored by agents unless marked 🧑)
Tag: `priya2024ownership`, [paper](https://doi.org/10.48550/arxiv.2408.04043)

The paper addresses a specific verification gap: compiling Rust-like ownership into LLVM-style IR loses ownership, while unrestricted byte pointers force an expensive address map. Its central claim is that low-level verification can retain selected ownership facts and use pointer-local caches. The abstract states: “We have identified two challenges. First, ownership information is lost when a program is compiled to a low-level intermediate representation (e.g., in LLVM IR). Second, pointers in low-level programs point to bytes using an address map (e.g., in unsafe Rust) and thus the verification condition (VC) cannot always replace a pointer by its FOL abstraction.” (abstract, p. 1)

## technique 1: encode ownership as a borrow-stack IR

Use this when verifying a low-level, pointer-manipulating IR whose source has ownership or borrowing discipline. OSEA-IR extends SEA-IR in SSA form with `mk_own`, paired mutable-borrow operations, read-only borrows, copies, `die`, and memory-pointer operations (Section II, pp. 2–3). The machine state is a program counter, register map, address map, and per-address borrow stack. Pointer values are fat `(address, tag)` tuples; stack entries record tags and pointer kinds: owned, mutable-borrowed, read-only-borrowed, or copied. Access is permitted only when the pointer tag is on top of the borrow stack (Section II, p. 2).

Apply the paper's sequence: allocate with `mk_own`; create `q0` and succeeding `p1` with `mut_mkbor` followed by `mut_mksuc`; perform loads and stores through the active pointer; terminate the borrow with `die q0`; then access through `p1`. In Figure 2, this changes `42` to `43` through `q0`, removes `q0`'s tag, and loads `43` through `p1` (Section II, pp. 3–4). A copy uses `cpy_mkcpy1` and `cpy_mkcpy2`; `die` is restricted to a top mutable borrow and returns access to its immediate lender.

Inference: in Verus, model the ownership relation as a ghost borrow-state predicate over a Rust representation and make operations executable Rust functions with `requires` and `ensures`. Use `proof fn` lemmas and `assert` statements to establish stack transitions. A Verus proof should preserve Rust's actual borrow checker where possible; the paper's fat-pointer and address-map machine is a model for low-level behavior, not a Verus construct. Do not write `invariant(...)` as a call or use a `modifies` clause.

The formal evidence is the defined transition semantics and the example's generated VC, rather than a theorem that all LLVM programs satisfy ownership. The model initially restricts allocations to one word and does not store pointers in memory; Section IV and Appendix A extend it to multiword allocations and fat pointers. These restrictions and the assumption that source C is annotated with ownership macros are material limits.

## technique 2: cache data in fat pointers and prove cache equivalence

Use this when most accesses obey ownership and repeated address-map lookups dominate SMT solving. Machine M1 adds a `val` cache field to each fat pointer. Stores update memory and the pointer cache. A load reads the cache only when the pointer is top of the borrow stack and owning or mutably borrowed; otherwise it reads memory and refreshes the cache (Section II, pp. 4–5). Mutable-borrow creation copies cache values to the borrower and successor; `die` transfers the borrower's cache to the successor.

The soundness step is Theorem 1's invariant: “For all pointers in the register map, if the pointer is top-of-(borrow)stack and is owning or mutably borrowed then the pointer cache value is the same as the value of memory at address of the pointer.” (Section II, p. 4). Prove it by structural induction over instructions. The paper then defines observational equivalence between M0 and M1 and states that it is a forward and backward simulation (Theorem 2, Section II, p. 4), so safety transfers between the machines.

Inference: in Verus, put cache equality in a `spec fn` predicate and require each executable operation's `ensures` to preserve it for active owners. A loop `invariant` can carry cache equality across iterations; `proof fn` lemmas can handle borrow creation and return. The exact machine simulation is outside ordinary Rust contracts, so a VL implementation would need a separate model/refinement proof.

## technique 3: use prophecy values for mutable-borrow return

The problem is returning a changed cache from `q0` to `p1` without an expensive shared-memory operation or symbolic register-map search. In VC generation, represent a fat pointer as `(addr, val, retval)`. For a mutable borrow, copy the address and cache, equate `p1.val` with a fresh prophecy value tied to `q0.retval`, and set `p1.retval` to the lender's prophecy. `die q` constrains `q.val = q.retval` (Figure 5, p. 5). The example's final assertion `r == 43` becomes unsatisfiable when negated, establishing the property for that path (Figures 3 and 5, pp. 4–5).

Inference: Verus can represent the predicted return value as ghost state and prove a borrow-return lemma with `requires`/`ensures`; it cannot use the paper's `tngle` macro directly. The proof must show that the ghost prediction equals the value produced before the borrow ends, and executable code must not depend on erased ghost values.

## technique 4: move typestate into pointer caches

Use this when a property such as file typestate is repeatedly stored in shadow memory. The paper's C macro API adds `SET_CACHE`, `GET_CACHE`, `MUT_BORROW`, and `DIE`; Figure 9 compares cache-stored typestate with shadow-memory or ordinary-memory maps (Section IV, pp. 6–7). The example checks that the file is open before writing and closed afterward (Section IV, p. 7). This removes an if-then-else over one of `n` possible objects from the VC when the pointer itself identifies the object.

Inference: a Verus API can keep typestate in a ghost field or a ghost map keyed by an owned object identity, with contracts on `write` requiring open state and ensuring closed state. The paper's pointer cache is a low-level optimization; Verus still needs a proof that the ghost identity tracks the executable object.

## evidence, scope, and product threat

Experiments use SEA BMC, Z3's `smtfd` tactic, an Intel Xeon E5-2680 at 2.70 GHz with 64 GiB RAM, handcrafted benchmarks, and three mbedTLS functions (Section V, pp. 7–8). The `many_buffers` benchmark shows a consistent 3x improvement. For mbedTLS, `write_handshake_shad` is 1.3x faster at 8 buffers and `write_records_shad` is 5x faster at 8 buffers; these are comparisons of ownsem against the named shadow-memory baseline at that buffer count, not universal speedups. The appendix reports that `write_records_shad` has one SAT conflict under ownsem versus around 500,000 for baseline at 8 buffers (Appendix B, pp. 10–11). The paper says: “Overall, we see improvements in solving time and attribute it to the simplicity of VC.” (Section VII, p. 8)

What is proved is semantic equivalence of the cache machine to the address-map machine under the stated invariant and bounded semantics, plus successful BMC checks for the selected C programs. Trusted elements include the ownership macros and their correct translation, SEA BMC, SMT solving, allocator assumptions, and the programmer's cache updates in M2. The paper itself notes that cache benefits depend on the fraction and conditionality of typestate accesses (Section V, p. 8). Inference: threat to agent-written verified Rust is moderate. The design is a competing low-level VC optimization and a useful pattern for preserving ownership across compilation, but Verus already exposes ownership-oriented proof state. VL should reuse the cache-equivalence proof shape and prophecy idea where unsafe pointer models require them; it should not redo the reported SEA BMC benchmark as a new result.

## techniques for the catalog

- borrow-stack ownership IR — represent low-level aliases with tagged borrow stacks and explicit borrow, copy, and end operations
- cache equivalence — replace eligible address-map reads with fat-pointer cache reads under a proved invariant
- prophecy for borrow return — encode mutable-borrow results in fat-pointer prophecy fields and constrain them at `die`
- pointer-cache typestate — store verification metadata on pointer values to avoid symbolic shadow-memory lookups

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
