# Cocoon: Static Information Flow Control in Rust
(authored by agents unless marked 🧑)
Tag: `lamba2024cocoon`, [paper](https://doi.org/10.1145/3649817)

## result and security model

Cocoon is a Rust library that enforces static, termination-insensitive information-flow control (IFC) with the unmodified Rust language and compiler. Its key claim is: “The key insight of Cocoon lies in leveraging Rust’s type system and procedural macros to establish an effect system that enforces noninterference.” (Abstract, PDF p.1) A well-typed Cocoon program cannot flow a secret into a less-secret value except through an explicit declassification operation.

Labels are sets of secrecy policies. `Secret<Type,Label>` wraps a value, and the label is ordered by set inclusion. The wrapper has no runtime representation cost: “wrapping values in Secret incurs no run-time cost; a Secret<Type,Label> instance has the same run-time representation as a Type instance.” (§4.1, PDF p.6)

The scope is narrow. The paper supports static secrecy labels, not integrity or dynamic labels, does not integrate the OS, and does not protect timing or termination channels (§3, PDF p.5). Unsafe code, declassification, allowlisted library functions, the compiler, and unintegrated dependencies remain trusted.

## technique 1: labeled Secret values and lexically scoped secret blocks

When to use it. Wrap data whose confidentiality must be tracked across Rust code, and put computations that read it inside a block with a declared maximum secrecy label.

How to do it.
1. Define labels as types implementing Cocoon's `Label` and `MoreSecretThan` traits. A label `{a,b}` is more secret than `{a}` because it contains both policies (§4.1, PDF p.6).
2. Wrap a value as `Secret<T,L>`; it becomes opaque outside Cocoon's access API (§4.1, PDF p.6).
3. Open `secret_block!(L { body })`. The body may read values no more secret than `L`, may write only values at least as secret as `L`, and returns a `Secret` with label `L` (§4.1, PDF p.6).
4. Use `unwrap_secret`, `unwrap_secret_ref`, or `unwrap_secret_mut_ref` inside the block. Mutable unwrapping requires the value's label to equal the block label; immutable unwrapping permits a less-secret label (Fig. 3d, PDF p.7).
5. Call `.declassify()` only at an intentional release boundary. The paper calls declassification “a trusted operation and should be audited by developers.” (§4.1, PDF p.8)

The calendar example creates two `Secret<bool>` values with labels `{a}` and `{b}`, computes an overlap in a `{a,b}` block, and declassifies only the final count (Fig. 2, PDF pp.4–5).

Verus form. Inference: model labels as ghost/spec types and make secret data an invariant-bearing wrapper. Use `requires`/`ensures` to constrain which labels a function may read or return, and make declassification a separately specified proof boundary. Verus does not automatically enforce every Rust call's information-flow label, so the API must expose checked constructors and contracts.

## technique 2: procedural-macro type constraints for explicit flows

The `secret_block!` macro rewrites unwrapping calls into functions whose Rust trait constraints compare the value label with the block label. The paper states: “secret_block! expands unwrap_secret(e) to a call to a function that requires e’s label to be no more secret than the block’s label L.” (§4.2.1, PDF p.8) For mutable references, equality is required because a mutable reference can both read and write (§4.2.1, PDF p.8).

How to apply it. Write ordinary source using the four operations, then expand through the macro. The expansion calls `Cocoon::call_closure::<L,_,_>` with a closure constrained by `VisibleSideEffectFree` and a return implementing `SecretTrait<L>` (Fig. 4a, PDF p.9). Compilation rejects a label mismatch. The macro also checks that the block returns a value labeled exactly `L`.

Verus form. Inference: encode the label order as ghost predicates and prove each unwrap requires the appropriate relation. A Verus proof can establish noninterference for a function body, but macro-generated Rust trait errors are a compile-time library mechanism rather than Verus's proof language.

## technique 3: visible and invisible side-effect control

Visible effects. Cocoon prevents a block from mutably capturing ordinary surrounding variables by requiring `VisibleSideEffectFree`. Auto traits and negative implementations reject transitively contained `&mut T` (except mutable secret values) and `UnsafeCell` types (§4.2.2, PDF p.11). Assignments are rewritten through `check_not_mut_secret`, which rejects assignment to a secret without the mediated mutable-unwrapping operation (Fig. 5c, PDF p.10).

Transitive calls. Mark application functions with `#[side_effect_free_attr]`; side-effect-free functions can call only similarly marked functions. Mark custom data types with `#[derive(InvisibleSideEffectFree)]` (§4.1, PDF p.8). The macro generates a checked and an unchecked trampoline; calls inside a secret block receive a `Vetted<R>` wrapper (Fig. 4b, PDF p.9).

Invisible effects. Rust overloaded operators, deref coercions, and destructors can hide calls from an untyped macro. Cocoon emits two versions of side-effect-free code: an executed version and unreachable checking code. The paper says: “the expanded version causes compiler errors if Cocoon’s requirements are violated, but it never executes.” (§4.2.3, PDF p.12) In the checking version, `e1 + e2` becomes `Cocoon::SafeAdd::safe_add(...)`, so application-defined overloaded operators fail to type-check; paths are checked with `check_ISEF_unsafe` (Fig. 5c, PDF p.10).

Verus form. Inference: represent effect freedom with a ghost effect set in function contracts and prove that an effect set is empty or contains only approved secret writes. External calls need explicit specifications; Verus cannot infer hidden destructor or trait effects from an arbitrary library. The two-version macro trick is therefore a useful Rust compilation pattern, not a replacement for proof of the trusted macro implementation.

## technique 4: retrofitting a real application

Spotify TUI. Wrap the 32-digit client secret as `Secret<String,Label_A>`, validate it inside a `{a}` secret block, and declassify only an error string indicating invalid format (Figs. 9–10, PDF pp.18–19). The retrofit inserted 167 lines and deleted 54 in a 12,169-line program, with 17 declassification calls (Table 1, PDF p.19). Fourteen of 17 declassifications passed the secret to RSpotify/Serde or a configuration file; those dependencies and the OS became trusted (§5.1, PDF p.19).

Servo. Wrap the HTTP response body in `Secret`, expose it through `Response::get_body()`, and declassify only when the response is not opaque, enforcing the browser same-origin policy (§5.2, PDF pp.20–21). Servo required 77 inserted and 44 deleted lines in 397,141 original lines and one declassification (Table 1, PDF p.19).

Verus form. Inference: the same retrofit can use a Verus wrapper with a confidentiality invariant and a proof that `get_body` returns data only under an origin predicate. The trusted boundary must include unsafe transmute-like operations, external crates, and the policy specification.

## evidence, trust, and VL implications

Performance experiments ran on a 16-core Xeon Gold 5218 with 187 GB RAM (§5, PDF p.17). Spotify and Servo were compiled ten times; Servo tests ran twenty times. Table 2 reports compile/runtime/size values with 95% confidence intervals (PDF p.19). Spotify compile time was 14.395 ± 0.031 s original versus 14.395 ± 0.053 s with Cocoon; Servo was 312.579 ± 4.354 s versus 309.983 ± 4.262 s. Battleship, a smaller case, incurred 2.068 ± 0.003 s versus 2.321 ± 0.002 s. These denominators and intervals support no detectable runtime cost in these cases, not a universal overhead claim.

Proved by the Cocoon type/macro mechanism: termination-insensitive noninterference under its programming model and trusted boundaries. Measured: retrofit effort, declassification counts, compile time, runtime, and binary size. Trusted: unsafe code, declassification calls, allowlists, macro implementation, Rust compiler, OS, and unintegrated libraries. Inference: threat to VL is medium where agent-written Rust handles secrets through ordinary APIs, because Verus functional proofs alone do not imply noninterference. Cocoon's explicit labels and declassification audit are reusable; VL should not redo its two application retrofits. The open integration question is a Verus proof layer for label policies that covers unsafe and foreign-code boundaries.

## techniques for the catalog

- labeled Secret wrapper — encode a secrecy policy in a Rust type and prevent ordinary access to the inner value
- scoped secret block — restrict reads, writes, and returned labels by a lexical block label
- macro-enforced effect system — use procedural expansions, traits, and auto traits to reject explicit and hidden side effects
- declassification audit — make every intentional release an explicit operation at a trusted boundary
- application retrofit — protect existing secrets by wrapping sources, mediating access, and changing only release points
Checked 2026-10-14 against the paper by a Codex agent: audit record lamba2024cocoon; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
