# Combining Type Checking and Formal Verification for Lightweight OS Correctness
(authored by agents unless marked 🧑)
Tag: `ijaz2024combining`, [paper](http://arxiv.org/abs/2501.00248v1)

## result
This paper reports a hybrid correctness method for the Theseus Rust OS. Its premise is explicit: “This paper presents our experience exploring new ways to ensure OS correctness.” (Introduction, PDF p. 1.) Rust's type system enforces resource and state invariants cheaply; SMT verification proves the small set of properties types cannot express; prose connects the resulting local facts. The guarantee is deliberately weaker than end-to-end formal verification because unverified code, libraries, hardware assumptions, and informal reasoning remain trusted.

The authors report “a proof-to-implementation ratio of 1:117 for the memory subsystem, and 1:8.3 for the ixgbe driver” (Abstract, p. 1), with the ixgbe driver at most 5% below DPDK throughput. They also report that approximately 50% of DPDK ixgbe bugs can be prevented (Table 1, p. 6). These are measurements of effort, speed, and bug classes, not completeness of OS verification.

## technique 1: intralingual representation systems
An Intralingual Representation System (IRS) makes a linear Rust value the sole authority to use a physical or abstract resource. A typestate encodes allowed operations. The paper's concise rule is: “The IRS combines the representation of a resource with the authority to use it, through linear types.” (Section 3.1, p. 3.) A `Pages<S>` value transitions among `Free`, `Allocated`, `Mapped`, and `Unmapped`; only `Pages<Mapped>` exposes memory access.

Inference: this list translates the paper into an implementer sequence; the paper does not give it as a numbered procedure. Apply it by (1) defining a private resource representation; (2) making its state a type parameter; (3) exposing consuming transition methods; (4) exposing only methods valid for each state; (5) using `Drop` to return resources to the allocator. Ownership transfer, shared reference counting, and scoped borrowing provide delegation. For hardware, define register structs with typed read/write fields and methods whose arguments are proof-of-work tokens; the token returned by one operation is required by the next.

Inference: in Verus, use Rust typestates and private fields for runtime enforcement, then add `spec fn` predicates and `requires`/`ensures` for facts beyond the compiler. Verus proofs can establish that a transition preserves the predicate, but the compiler still supplies the aliasing guarantee. Do not treat the typestate alone as a proof of uniqueness: the paper found that linear ownership of a value does not ensure that two values do not denote overlapping resources.

## technique 2: generic uniqueness and three propagation rules
The authors fix IRS uniqueness with a verified generic `RepCreator`. Its private constructor checks a bookkeeping collection for overlap before creating a representation. They then propagate the proof using three rules: ownership transfer, composition (a composite is unique if members are unique), and reuse (one verified generic implementation covers all specializations). The implementation explicitly “maintains the 1-to-1 mapping between the physical resource and its software representation(s)” (Section 5.1, p. 6).

Inference: these steps are an operational restatement and are not in the paper as a numbered procedure. Steps are: choose an identifier with an `overlaps` relation; keep existing identifiers private; have the verified constructor reject overlap; prove `split` and `merge` consume old values and create disjoint values; compose `Chunk` into `Pages` and `Frames`; let generic instantiations reuse the proof. In Theseus this establishes the bijection between virtual pages and physical frames.

Evidence: the memory changes were 1.3k SLOC at a 1:171 proof-to-implementation ratio; the representation creator itself was 392 SLOC at 1:56 (Section 5.1, pp. 6–7). A latent allocator bug created overlapping frames after more than four years of use and blocked driver work for over one person-month (Section 5.3.3, p. 11). Inference: a Verus version would maintain a ghost set of identifiers, prove disjointness on insertion, and use generic lemmas for composed resources.

## technique 3: intralingual specifications and selective SMT proof
Type rules cannot express “must not implement Clone”, private-field requirements, or that an unverified function cannot mutate a verified value. The paper therefore uses compile-time macros: `assert_not_impl_any!`, `#[private_fields("range")]`, `#[nomutates]`, and `#[nocalls]`. It says, “To check such properties at compile time, we employ Rust macros to write static assertions.” (Section 4.2, p. 6.) The workflow is to identify an invariant, encode enforceable fragments as assertions, then use Prusti/SMT only for the remaining uniqueness or arithmetic property. Prose proofs tie the separate obligations together; “Prose proofs can ‘stitch’ together invariants proven by different proof techniques” (Section 4, p. 5).

Inference: Verus can replace Prusti contracts with `requires`, `ensures`, `assert`, and proof lemmas, while Rust visibility and typestate remain compile-time mechanisms. Macros that guard implementation policy remain ordinary Rust tooling. Any prose step should be marked as an assumption in a VL assurance case, since it is outside the verifier.

## technique 4: typed hardware abstraction layer
The ixgbe HAL overlays a typed register layout on MMIO, prevents unsafe pointer arithmetic, and requires proof-of-work tokens for ordering. A register method takes `RxCtrlDisabled` before allowing a filter-control write, then returns `FilterCtrlSet` before re-enabling receive. The paper says the HAL “precludes the unsafe pointer arithmetic commonly used to access MMIO registers” (Section 3.3, p. 4).

Apply it by transcribing datasheet offsets and access modes into structs, making reserved fields unrepresentable, and encoding required operation order in token types. Verify casts from mapped memory and the token-producing methods. Inference: Verus can prove bounds/alignment predicates and token-state transitions, but the datasheet and device behavior remain trusted unless modeled.

## evidence, trust, and VL implications
The formally verified portion totals 1,938 implementation SLOC, 634 Prusti specification SLOC, and 32 proof SLOC; verification takes 922.27 seconds in Table 2 (p. 11). A 4 KiB map/write/unmap repeated 100,000 times has identical 1.99 μs mean time in original and verified Theseus (Section 6.1, p. 11). The hybrid ixgbe driver is 2k SLOC, with 141 verified lines and 1:8.3 proof ratio. The authors explicitly state that selective verification increases trusted code: “For every dependency of verified code, we must write a trusted specification so that the verifier can reason about its behavior.” (Section 4.3, p. 5.) Trusted components include Rust core/alloc, kernel crates, hardware layout, unverified module code, and prose reasoning.

Inference: the main threat to agent-written verified Rust is false confidence from a small proof surface: a valid proof can rely on a wrong external specification, a missing uniqueness constructor, or a prose-only invariant. Existing VL should reuse this paper's allocation of work—types for ownership and state, formal lemmas for uniqueness and arithmetic, explicit trusted specifications—rather than attempt full end-to-end proof for every driver first.

## techniques for the catalog
- intralingual representation systems — encode resource authority and legal state transitions in linear typestates
- verified representation creation — reject overlapping identifiers and propagate uniqueness through composition and generics
- intralingual specifications — enforce trait, visibility, mutation, and call restrictions with compile-time assertions
- typed hardware abstraction layers — encode register layout and operation order as types and proof-of-work tokens
- selective hybrid verification — use SMT proofs for unexpressible invariants and prose only for explicitly trusted composition
Checked 2026-10-14 against the paper by a Codex agent: audit record ijaz2024combining; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
