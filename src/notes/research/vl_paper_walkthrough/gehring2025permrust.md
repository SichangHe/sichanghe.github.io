# PermRust: A Token-based Permission System for Rust
(authored by agents unless marked 🧑)
Tag: `gehring2025permrust`, [paper](http://arxiv.org/abs/2506.11701v1)

## scope and result

PermRust is a proof-of-concept language-level permission system for restricting system-resource access per library and per function. It adapts the access-matrix model, chooses capability-as-keys rather than object capabilities, and encodes unforgeable zero-sized permission tokens in Rust's type system. The paper explicitly limits itself to a concept and proof of concept: “Please note that we consider an evaluation of PermRust as future work and limit this paper to a discussion of the approach’s limitations.” (Section 1, p. 2). Thus its security argument is a design claim supported by Rust's visibility and type checking, not an empirical security evaluation.

The threat is a third-party library that accesses I/O unexpectedly. Subjects in the model are program functions; objects are standard-library functions implementing system I/O; the single modeled right is `call` (Section 3.1, pp. 2–3). The paper's goal is least privilege at library granularity, while preserving ordinary Rust runtime behavior through compile-time checks.

## technique 1: access matrix, abstract function tree, and static permission check

What it is. The access matrix gives each subject a set of rights over objects. PermRust specializes subjects to functions and objects to I/O functions. Because source syntax contains non-function AST nodes, it contracts edges that do not end at function vertices to produce an abstract function tree (AFT). A tree is permission-respecting when every edge to an I/O object has the `call` right, and privilege-escalation-free when every caller's rights include every callee's rights (Definitions 1–5, Section 3.1, pp. 2–4).

When to use it. Use this model before encoding permissions, to state exactly which calls are allowed and to distinguish a direct unauthorized I/O edge from a callee that introduces more authority than its caller.

How to do it. (1) Enumerate function subjects `F` and I/O-object functions `O`. (2) Build a matrix `M` whose entry is either `{call}` or empty. (3) Build the AFT by contracting non-function AST edges. (4) For every edge `(p,c)`, if `c` is an object, require `M(p,c) = {call}`. (5) For every object `o`, require `M(p,o) ⊇ M(c,o)`. Algorithm 1 implements these checks: it returns false on a failed direct-call check or on `M(p,o) ⊊ M(c,o)`, and true otherwise (Section 3.1, p. 4).

Evidence. Theorem 1 states that Algorithm 1 is correct and requires `O(|E| · |O|)` matrix reads. Its proof explains that each edge needs at most `1 + 2|O|` accesses, yielding `O(|E|(1 + 2|O|)) = O(|E| · |O|)` (Section 3.1, p. 4). This is a complexity result for the checker, not evidence that a real Rust compiler implementation enforces the model.

Failure and assumptions. The model treats only `call` rights and assumes the AFT captures caller-callee relationships. The paper notes that a permission matrix for a program has only `{call}` or empty entries; richer rights or dynamic resource conditions need additional modeling (Section 3.1, p. 4). It also assumes that all relevant authority flows through modeled function calls.

Inference: In Verus, the matrix and AFT can be represented as specification maps and sequences, with a proof function establishing the edge implication. A Verus proof would establish the checker algorithm's result for its abstract input; it would not by itself connect a Rust crate's actual call graph to that abstract tree. That connection would require a trusted extraction or a separately verified front end.

## technique 2: capability-as-key tokens

What it is. PermRust chooses capability-as-keys: a caller must provide an unforgeable token for each protected resource. The paper contrasts this with object capabilities, where the authority is attached directly to an object such as a file descriptor. It requires keys to be unforgeable, copyable, and restricted to the intended resource; authority is obtained only from an entity that already has the key (Section 3.2, pp. 4–5).

When to use it. Use token capabilities when API signatures can carry explicit authority and the goal is compile-time enforcement without changing runtime resource objects.

How to do it. (1) Define one private-field token type per permission. (2) Expose no public constructor outside its module. (3) Change each protected API to take a reference to the corresponding token. (4) Require library functions that perform I/O to accept and forward that token. (5) Keep the underlying I/O arguments and return values unchanged. Listing 1.1 defines `pub struct ReadPerm(())` inside `mod token`; Listing 1.3 gives a library function a `read_token: &token::ReadPerm`; Listing 1.4 wraps `std::fs::File` in `FileProxy` and adds a `ReadPerm` parameter to `read` (Section 4.1, pp. 5–7).

Evidence. The paper says token types “use no runtime memory” and therefore make the permission check compile-time only (Section 4.1, p. 6). Attempting `token::ReadPerm(())` outside the module fails because its field is private (Listing 1.2, p. 6). The proxy forwards `self.0.read(buf)` and does not use the token at runtime (Listing 1.4, p. 6).

Failure and assumptions. The design depends on Rust memory safety and visibility to prevent token fabrication. The paper states: “Without this feature, a token would be forgeable, meaning that keys could be construed at will.” (Section 3.2, p. 5). `unsafe` Rust can construct arbitrary token representations, so the attacker model excludes malicious unsafe code (Section 5, pp. 10–11). The standard library becomes a trust anchor because it must require the tokens at every I/O entry point (Section 5, p. 10).

Inference: A Verus API can carry a ghost permission token whose specification state records authority, with `requires` clauses demanding that token. However, Verus proof-only state is erased, while PermRust relies on Rust's type checker and module privacy; the two mechanisms have different trusted bases. A Verus contract cannot repair an `unsafe` token fabrication unless the unsafe boundary is modeled and proved.

## technique 3: permission-aware package imports

What it is. PermRust associates package-level permissions with Cargo features. Special `app_` entry points generate local tokens only when the package's permission feature is enabled, so an application chooses a dependency's authority in `Cargo.toml` rather than handing out tokens manually (Section 4.2, pp. 7–8).

When to use it. Use package features when permission policy should be selected at application composition time and library code should expose a controlled entry point.

How to do it. (1) Define a Cargo permission feature corresponding to each token type. (2) Generate an `app_` wrapper around the library function. (3) Inside the wrapper, define a local zero-sized type and implement `AsRef<token::ReadPerm>` only under `#[cfg(feature = "ReadPerm")]`. (4) Construct the local value and pass its reference to the token-taking library function. Listing 1.6 shows `localPerm`, its `new` constructor, a conditional `AsRef` implementation using `unsafe { std::mem::transmute(self) }`, and `read_something(f, localPerm::new().as_ref())` (Section 4.2, p. 8).

Evidence. The paper explains that this wrapper avoids requiring application developers to construct tokens while preventing use of a token with more permissions than declared in `Cargo.toml` (Section 4.2, p. 8). The implementation is described as a proof of concept, not measured across packages.

Failure and assumptions. Cargo features are unified across a dependency graph and are not transitive in the required way. The paper identifies a privilege-escalation scenario: a package that is both a direct and indirect dependency may receive the `direct-dependency` feature and call an `app_` function of another package regardless of its own permissions (Section 5, pp. 9–10). Cargo did not automatically mark direct dependencies at the time of writing, so the design assumes a package-manager extension. The wrapper's `transmute` is an unsafe trust boundary.

Inference: For Verus, package-level permission selection could instantiate module-level specifications or ghost capabilities, but Cargo feature unification would remain outside the verifier. A sound integration would need a build-time proof that resolved features match the authority assumed by each generated wrapper.

## technique 4: procedural permission macro

What it is. The paper combines the token-taking and `app_` wrappers in a `permissions` procedural macro. A developer annotates a function that performs I/O indirectly; the macro emits the permission-requiring function and an application wrapper, documentation, and conditional compilation attributes (Section 4.3, pp. 8–9).

When to use it. Use macro generation to make permission annotations concise and to keep the ordinary library source close to idiomatic Rust.

How to do it. The paper gives four required transformations: “cloning to function, prefixing the cloned function name with app_, adding the call to the original function, adding the conditional compilation arguments.” (Section 4.3, p. 9). Implement them in a procedural macro, generate the token-bearing function and `app_` wrapper, and attach the permission feature conditions. The earlier `lib_func` macro similarly turns a documentation-annotated function into a signature that requests tokens (Listings 1.3 and 1.5, pp. 6–7).

Evidence. The paper reports an implementation in the accompanying repository and says the macro allows developers to write functions almost exactly as in Rust (Section 4.3 and Section 5, pp. 9–10). No benchmark or soundness proof of the macro is provided.

Failure and assumptions. Procedural macro execution increases compile time, and macro-generated code is part of the trusted compiler pipeline. The paper states that the system's security stems from the standard library as a trust anchor and that language maintainers would need extra API work (Section 5, p. 10). Macros cannot prevent an `unsafe` caller from bypassing the token discipline.

Inference: A Verus-aware macro could generate `requires` clauses and proof obligations, but generated specifications would still need inspection and solver checking. Treating macro expansion as trusted would leave the same gap as PermRust's unverified procedural code.

## technique 5: object capabilities and customization boundary

What it is. The paper presents object capabilities as an alternative for finer-grained authority: a library receives the resource object itself, such as a `File`, rather than a generic read token. The object must be unforgeable, and constructors such as `open` and `create` must be restricted to authorized code (Section 5, pp. 10–11).

When to use it. Use object capabilities when permissions must constrain particular paths, sockets, or resource instances rather than granting an entire I/O category.

How to do it. Give a library only the object representing the resource it may use. Make object construction and duplication private or otherwise authority-checked. Ensure all operations on the object preserve the authority boundary. The paper contrasts this with token capabilities, where permissions are granted in full and cannot be customized to a path or IP range without additional runtime checks (Section 5, p. 10).

Evidence. The paper's limitation analysis states that token permissions are tied to standard-library system calls and cannot express path- or address-specific restrictions. It proposes object capabilities as a more customizable but more disruptive alternative, with all resources acquired at program start and possible startup costs (Section 5, pp. 10–11).

Failure and assumptions. Object capabilities require stronger encapsulation and can interrupt normal Rust development. Resource acquisition at startup may increase startup times, and the paper provides no evaluation. Unsafe code can still forge or misuse representations unless the entire object boundary is trusted.

Inference: In Verus, an object capability can be modeled as an owned value with an abstract resource identity and `requires` clauses on methods. Proving that the identity corresponds to an OS file or socket would need a trusted foreign-function model; Verus cannot establish that correspondence from Rust types alone.

## what is proved, measured, and trusted

The paper proves the asymptotic correctness and complexity of its abstract Algorithm 1. It demonstrates that Rust visibility rejects one direct token-construction attempt and gives a proof-of-concept implementation with listings and macros. It measures no security incidents, runtime overhead, compile-time overhead, false positives, or attack success rates; evaluation is explicitly future work. Trusted components include Rust's memory safety and privacy guarantees, the standard library's modified APIs, Cargo feature resolution, procedural macro expansion, and unsafe `transmute` code. The paper's capability claim therefore applies to safe Rust under these assumptions, not to arbitrary Rust crates.

Inference: For a VeruLaw product generating verified Rust, PermRust is a relevant defense against accidental or hidden library I/O and a warning about authority encoded only in APIs. Its largest product threat is unsafe or foreign code that bypasses token types, plus build-system feature resolution that silently grants authority. Verus contracts can make authority preconditions explicit, but they do not automatically verify Cargo, macro expansion, OS effects, or C/FFI behavior.

## what VL should reuse and what it should not redo

The reusable ideas are an explicit access matrix, caller-to-callee privilege monotonicity, unforgeable capability values, and package-level authority declarations. Rebuilding a generic token permission concept would duplicate this paper's design. Remaining work for VL is to connect generated Verus contracts to actual dependency graphs, unsafe boundaries, and external-resource models, and to test whether proof obligations track authority after feature resolution.

## techniques for the catalog

- access-matrix permission checking — model functions and I/O calls as subjects and objects, then check direct rights and caller privilege inclusion over an abstract function tree
- capability-as-key tokens — require an unforgeable, private-field token in every protected API so authority is explicit at compile time
- Cargo permission features — generate application entry points that create local tokens only when package permissions are enabled
- procedural permission macros — clone and rewrite functions to add token parameters, wrappers, documentation, and conditional compilation
- object capabilities — pass unforgeable resource objects for path- or instance-specific authority when category-wide tokens are too coarse

Checked 2026-10-15 against the paper by a Codex agent for permrust_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
