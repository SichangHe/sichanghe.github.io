# Cocoon: Static Information Flow Control in Rust
(authored by agents unless marked 🧑)
Tag: `lamba2024cocoon`, [paper](https://doi.org/10.1145/3649817)

## result and security model

Cocoon is a Rust library for static, termination-insensitive information-flow control (IFC) with the unmodified Rust language and compiler. Its key claim is: “The key insight of Cocoon lies in leveraging Rust’s type system and procedural macros to establish an effect system that enforces noninterference.” (Abstract, PDF p.1) The intended guarantee excludes explicit declassification and unsafe Rust; the authors do not prove correctness (§3.1, PDF p.5; §4.4, PDF p.16). The prototype requires Rust 1.69.0-nightly for unstable features, including auto traits and negative implementations (§4.3, PDF p.16).

Labels are sets of secrecy policies. `Secret<Type,Label>` wraps a value, and the label is ordered by set inclusion. The wrapper has no runtime representation cost: “wrapping values in Secret incurs no run-time cost; a Secret<Type,Label> instance has the same run-time representation as a Type instance.” (§4.1, PDF p.6)

The scope is narrow. The paper supports static secrecy labels, not integrity or dynamic labels, does not integrate the OS, and does not protect timing or termination channels (§3.1, PDF p.5). The trusted codebase includes Cocoon, the Rust compiler and standard library, unsafe code, declassification, and components receiving declassified data. Programmers must also audit Cargo.toml (§3.2, PDF p.5; §4.4, PDF p.16).

## technique 1: labeled Secret values and lexically scoped secret blocks

When to use it. Wrap data whose confidentiality must be tracked across Rust code, and put computations that read it inside a block with a declared maximum secrecy label.

How to do it.
1. Define labels as types implementing Cocoon's `Label` and `MoreSecretThan` traits. A label `{a,b}` is more secret than `{a}` because it contains both policies; `MoreSecretThan<M>` is implemented for `L` exactly when `M` is a subset of `L` (§4.1, PDF p.6).
2. Wrap a value as `Secret<T,L>`; it becomes opaque outside Cocoon's access API (§4.1, PDF p.6).
3. Open `secret_block!(L { body })`. The body may read values no more secret than `L` and may write only values at least as secret as `L` (§4.1, PDF p.6). It can return a `Secret` or tuple of secrets with label `L`, or no value (Fig. 4a, PDF p.9; footnote 7, PDF p.8).
4. Use `unwrap_secret`, `unwrap_secret_ref`, or `unwrap_secret_mut_ref` inside the block. Mutable unwrapping requires the value's label to equal the block label; immutable unwrapping permits a less-secret label (Fig. 3d, PDF p.7).
5. Call `.declassify()` only at an intentional release boundary. The paper states: “Declassification is a trusted operation and should be audited by developers.” (§4.1, PDF p.8)

The calendar example stores secret boolean availability values in two maps with labels `{a}` and `{b}`, computes an overlap count using `{a,b}` blocks, and declassifies only the final count (Fig. 2, PDF p.4).

Verus form. Inference: model labels as ghost/spec types and make secret data an invariant-bearing wrapper. Use `requires`/`ensures` to constrain which labels a function may read or return, and make declassification a separately specified proof boundary. Such an API would need checked constructors and contracts; the paper does not evaluate Verus integration.

## technique 2: procedural-macro type constraints for explicit flows

The `secret_block!` macro rewrites unwrapping calls into functions whose Rust trait constraints compare the value label with the block label. For mutable references, equality is required because a mutable reference can both read and write (§4.2.1, PDF p.8).

How to apply it. Write ordinary source using the four operations, then expand through the macro. The expansion calls `Cocoon::call_closure::<L,_,_>` with a closure constrained by `VisibleSideEffectFree` and a return implementing `SecretTrait<L>` (Fig. 4a, PDF p.9). Compilation rejects a label mismatch. For a returned secret or tuple of secrets, the macro requires label `L`; an empty return is also permitted (footnote 7, PDF p.8).

Verus form. Inference: encode the label order as ghost predicates and prove each unwrap requires the appropriate relation. A separate proof would need to relate those contracts to noninterference; Cocoon supplies compile-time type constraints, not a Verus proof.

## technique 3: visible and invisible side-effect control

Visible effects. Cocoon prevents a block from mutably capturing ordinary surrounding variables by requiring `VisibleSideEffectFree`. Auto traits and negative implementations reject transitively contained `&mut T` (except mutable secret values) and `UnsafeCell` types (§4.2.2, PDF p.11). Assignments are rewritten through `check_not_mut_secret`, which rejects assignment to a secret without the mediated mutable-unwrapping operation (Fig. 5c, PDF p.10).

Transitive calls. Mark application functions with `#[side_effect_free_attr]`; side-effect-free functions can call similarly marked functions or allowlisted standard-library functions. Mark custom data types with `#[derive(InvisibleSideEffectFree)]` (§4.1, PDF p.8). The function macro generates a checked and an unchecked trampoline and an unsafe wrapper returning `Vetted<R>`. It rewrites calls in side-effect-free contexts to require and unwrap that return type. Constructing `Vetted` or calling the generated wrapper directly requires unsafe Rust, preventing ordinary unverified functions from fabricating vetted returns (Fig. 4b, PDF p.9; §4.2.2, PDF pp.11–12). Allowlisted calls must be fully qualified, and the allowlist is trusted (§4.2.2, PDF p.12).

Invisible effects. Rust overloaded operators, deref coercions, and destructors can hide calls from an untyped macro. Cocoon emits two versions of side-effect-free code: an executed version and unreachable checking code. The paper says: “the expanded version causes compiler errors if Cocoon’s requirements are violated, but it never executes.” (§4.2.3, PDF p.12) In the checking version, `e1 + e2` becomes `Cocoon::SafeAdd::safe_add(...)`, so application-defined overloaded operators fail to type-check; paths are checked with `check_ISEF_unsafe` (Fig. 5c, PDF p.10). The `InvisibleSideEffectFree` derive macro generates negative implementations of `Deref`, `DerefMut`, and `Drop` and requires contained values to implement `InvisibleSideEffectFree` (§4.2.3, PDF p.13).

Exceptional flow. A secret block runs inside a closure, so ordinary exits cannot bypass its single exit. It catches panics using `catch_unwind`, returns a Secret-wrapped default value, and continues after the block. This prevents a caller from catching a secret-dependent panic and observing an illegal implicit flow (§4.2.3, PDF p.14). Secret blocks cannot contain macros; side-effect-free code cannot use interior mutability (§4.5, PDF pp.17–18).

Verus form. Inference: represent effect freedom with a ghost effect set in function contracts and prove that an effect set is empty or contains only approved secret writes. Applying this approach to external calls would require specifications covering their effects. The two-version macro trick is a useful Rust compilation pattern, not a replacement for proof of the trusted macro implementation.

## technique 4: retrofitting a real application

Spotify TUI. Wrap the 32-digit hexadecimal client secret as `Secret<String,Label_A>`, validate it inside a `{a}` secret block, and, in that validation routine, declassify the error string rather than the full client secret (Figs. 9–10, PDF pp.18–19). The retrofit inserted 167 lines and deleted 54 in a 12,169-line program, with 17 declassification calls (Table 1, PDF p.19). Fourteen of 17 declassifications passed the secret to RSpotify/Serde or a configuration file; those dependencies and the OS became trusted (§5.1, PDF pp.18–19).

Servo. Wrap the HTTP response body in `Secret`, expose it through `Response::get_body()`, and declassify only when the response is not opaque, enforcing the browser same-origin policy (§5.2, PDF pp.20–21). Servo required 77 inserted and 44 deleted lines in 397,141 original lines and one declassification (Table 1, PDF p.19).

Verus form. Inference: a similar retrofit could use a Verus wrapper with a confidentiality invariant and a proof that `get_body` returns data only under an origin predicate. A proof would need to justify the release policy and any unsafe operations or external calls it uses. Cocoon describes its own `declassify_transmute` implementation as safe because the wrapped and unwrapped values have the same layout (§5.2, PDF p.21).

## evidence, trust, and VL implications

Performance experiments ran on a 16-core Xeon Gold 5218 with 187 GB RAM (§5, PDF p.17). Spotify and Servo were compiled ten times; Servo tests ran twenty times. Table 2 reports compile times and run times with 95% confidence intervals, and executable sizes in bytes (PDF p.19). Spotify compile time was 14.395 ± 0.031 s original versus 14.395 ± 0.053 s with Cocoon; Servo was 312.579 ± 4.354 s versus 309.983 ± 4.262 s. Battleship, a smaller case, incurred 2.068 ± 0.003 s versus 2.321 ± 0.002 s. These are compile times, not run times. Spotify run-time measurements cover only configuration and authentication, with 100,000 trials per version (§5.1, PDF p.20); Servo run time covers its tests (§5.2, PDF p.21). The paper reports no added run-time overhead for these applications and Battleship, with unexplained speedups for Spotify and Battleship (§5.1, PDF p.20; §5.3, PDF p.23).

The authors explicitly limit the security claim: “Cocoon’s general guarantee (which we have not proved) is termination-insensitive noninterference in the absence of declassify operations and unsafe Rust code (§3.2).” (§4.4, PDF p.16) The evaluation measures retrofit effort, declassification counts, compile time, run time, and executable size; it does not prove noninterference.

The performance-focused evaluation wraps primary calculations in secret blocks for nine of ten Benchmarks Game programs. It excludes reverse-complement because it concurrently modifies a shared mutable buffer, and uses unsafe blocks to bypass macro transformation of external-crate calls (§5.4, PDF p.23). The paper reports compile-time overhead of 7–16% except for n-body at 53%, and describes run-time overhead as negligible or nonexistent (§5.4, PDF pp.23–24). Table 3 nevertheless lists k-nucleotide at 1.539 ± 0.007 s versus 1.559 ± 0.007 s and regex-redux at 0.957 ± 0.003 s versus 0.967 ± 0.003 s. Inference: those central estimates increase by about 1.3% and 1.0%, respectively, so the prose claim of less than 1% overhead should not be read as a bound on every measurement.

Inference: for VL, Cocoon suggests explicit secrecy labels, constrained access, and audited declassification as design ideas for agent-written Rust that handles secrets. The paper provides no evidence about Verus or VL; proving that a proposed Verus integration enforces noninterference remains separate work.

## techniques for the catalog

- labeled Secret wrapper — encode a secrecy policy in a Rust type and prevent ordinary access to the inner value
- scoped secret block — restrict reads, writes, and returned labels by a lexical block label
- macro-enforced effect system — use procedural expansions, traits, and auto traits to reject explicit and hidden side effects
- declassification audit — make every intentional release an explicit operation at a trusted boundary
- application retrofit — protect existing secrets by wrapping sources, mediating access, and changing only release points
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "It is generally unsafe to allow this generated code to execute; generating it in the nonexecuted version means it only aﬀects whether the code compiles."): checked the full paper, quotations, numbers, section and PDF page references, technique steps, limitations, and evaluation scope; corrected the unproved security claim, nightly requirement, block returns, call checking, calendar and validation descriptions, and performance interpretation; added panic handling and benchmark qualifications; did not check source code, reproduce experiments, or validate the proposed Verus/VL integration.
