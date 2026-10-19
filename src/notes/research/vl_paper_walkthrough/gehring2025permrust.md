# PermRust: A Token-based Permission System for Rust
(authored by agents unless marked 🧑)
Tag: `gehring2025permrust`, [paper](http://arxiv.org/abs/2506.11701v1)

## scope and result

PermRust is a proof-of-concept language-level permission system for restricting system-resource access per library and per function. It adapts the access-matrix model, chooses capability-as-keys rather than object capabilities, and encodes unforgeable zero-sized permission tokens in Rust's type system. The paper explicitly limits itself to a concept and proof of concept: “Please note that we consider an evaluation of PermRust as future work and limit this paper to a discussion of the approach’s limitations.” (Section 1, p. 2). Inference: The security argument is a design claim supported by Rust's visibility and type checking, rather than an empirical security evaluation.

The paper describes the threat as libraries that “provide functions which (in some corner-cases) access system resources without making the access obvious to the application developer.” (Section 5, p. 10). Subjects in the model are program functions; objects are standard-library functions implementing system I/O; the single modeled right is `call` (Section 3.1, p. 3). The paper's goal is least privilege at library granularity, while preserving ordinary Rust runtime behavior through compile-time checks.

## technique 1: access matrix, abstract function tree, and static permission check

What it is. The access matrix gives each subject a set of rights over objects. PermRust specializes subjects to functions and objects to I/O functions. It defines an abstract function tree (AFT) by contracting AST edges that do not end at function vertices and naming the merged vertices after the original edge targets (Definition 3, Section 3.1, p. 3). A tree is permission-respecting when every edge to an I/O object has the `call` right, and privilege-escalation-free when every caller's rights include every callee's rights (Definitions 1–5, Section 3.1, p. 3).

Inference: When to use it. Use this model before encoding permissions, to state exactly which calls are allowed and to distinguish a direct unauthorized I/O edge from a callee that introduces more authority than its caller.

How to do it. (1) Enumerate function subjects `F` and I/O-object functions `O`. (2) Build a matrix `M` whose entry is either `{call}` or empty. (3) Build the AFT using the contractions and naming rule of Definition 3. (4) For every edge `(p,c)`, if `c` is an object, require `M(p,c) = {call}`. (5) For every object `o`, require `M(p,o) ⊇ M(c,o)`. Algorithm 1 implements these checks: it returns false on a failed direct-call check or on `M(p,o) ⊊ M(c,o)`, and true otherwise (Section 3.1, p. 4).

Evidence. Theorem 1 states that Algorithm 1 is correct and requires `O(|E| · |O|)` matrix reads. Its proof explains that each edge needs at most `1 + 2|O|` accesses, yielding `O(|E|(1 + 2|O|)) = O(|E| · |O|)` (Section 3.1, p. 4). Inference: This abstract checker result does not establish that a Rust compiler implementation enforces the model.

Failure and assumptions. The model treats only `call` rights and assumes the AFT captures caller-callee relationships. The paper notes that a permission matrix for a program has only `{call}` or empty entries (Section 3.1, p. 4): “M (s, o) can only be {call} or ∅.” Inference: Richer rights or dynamic resource conditions need additional modeling; enforcement also needs the modeled calls to cover the relevant I/O entry points.

Inference: In Verus, the matrix and AFT can be represented as specification maps and sequences, with a proof function establishing the edge implication. A Verus proof would establish the checker algorithm's result for its abstract input; it would not by itself connect a Rust crate's actual call graph to that abstract tree. That connection would require a trusted extraction or a separately verified front end.

## technique 2: capability-as-key tokens

What it is. PermRust chooses capability-as-keys: a caller must provide an unforgeable token for each protected resource. The paper contrasts this with object capabilities, where the authority is attached directly to an object such as a file descriptor. It requires keys to be unforgeable, copyable, and restricted to the intended resource; authority is obtained from an entity that already has the key, or from the special root subject that initially holds all keys (Section 3.2, p. 5). The paper states: “The keys need to be unforgeable, copy-able and only access the specific resource it was designed for.”

Inference: When to use it. Use token capabilities when API signatures can carry explicit authority and the goal is compile-time enforcement without changing runtime resource objects.

How to do it. (1) Define one private-field token type per permission. (2) Expose no public constructor outside its module. (3) Change each protected API to take a reference to the corresponding token. (4) Require library functions that perform I/O to accept and forward that token. (5) Keep the underlying I/O arguments and return values unchanged. Listing 1.1 defines `pub struct ReadPerm(())` inside `mod token`; Listing 1.3 gives a library function a `read_token: &token::ReadPerm`; Listing 1.4 wraps `std::fs::File` in `FileProxy` and adds a `ReadPerm` parameter to `read` (Section 4.1, pp. 6–7).

Evidence. The paper says token types “use no runtime memory” and therefore make the permission check compile-time only (Section 4.1, p. 6). Attempting `token::ReadPerm(())` outside the module fails because its field is private (Listing 1.2, p. 7). The proxy forwards `self.0.read(buf)` and does not use the token at runtime (Listing 1.4, p. 7).

Failure and assumptions. The design depends on Rust memory safety and visibility to prevent token fabrication. The paper states: “Without this feature, a token would be forgeable, meaning that keys could be construed at will.” (Section 3.2, p. 5). The authors also require authority not to be distributed through static variables (Section 3.2, p. 5): “This means, that keys cannot be saved in static variables since they could be used to distribute tokens to unauthorized players.” They assert that safe Rust meets their requirements; this paper does not prove that assertion. Section 5, p. 10 states: “It is clear that all security mechanism of PermRust can easily be circumvented by using unsafe Rust to construct an arbitrary token type at will.” Section 5, p. 9 identifies the standard library as a trust anchor. Inference: Protection requires preventing untrusted code from bypassing the token API, including through unsafe code or globally available authority.

Inference: A Verus API can carry a ghost permission token whose specification state records authority, with `requires` clauses demanding that token. However, Verus proof-only state is erased, while PermRust relies on Rust's type checker and module privacy; the two mechanisms have different trusted bases. A Verus contract cannot repair an `unsafe` token fabrication unless the unsafe boundary is modeled and proved.

## technique 3: permission-aware package imports

What it is. PermRust associates package-level permissions with Cargo features. Special `app_` entry points generate local tokens only when the package's permission feature is enabled, so an application chooses a dependency's authority in `Cargo.toml` rather than handing out tokens manually (Section 4.2, pp. 7–8).

Inference: When to use it. Use package features when permission policy should be selected at application composition time and library code should expose a controlled entry point.

How to do it. (1) Define a Cargo permission feature corresponding to each token type. (2) Generate an `app_` wrapper around the library function. (3) Inside the wrapper, define a local zero-sized type and implement `AsRef<token::ReadPerm>` only under `#[cfg(feature = "ReadPerm")]`. (4) Construct the local value and pass its reference to the token-taking library function. Listing 1.6 shows `localPerm`, its `new` constructor, a conditional `AsRef` implementation using `unsafe { std::mem::transmute(self) }`, and `read_something(f, localPerm::new().as_ref())` (Section 4.2, p. 8).

Evidence. Section 4.2, p. 8 claims: “It prevents the developer from using a token with more permissions than defined in Cargo.toml.” This describes the intended wrapper behavior; Section 5 identifies a feature-unification counterexample to the overall permission design.

Failure and assumptions. Cargo features are unified across a dependency graph and are not transitive in the required way. Section 4.3, p. 9 first proposes a `direct-dependency` feature so only an application's direct dependencies expose `app_` functions. It states: “Currently, Cargo does not implement the functionality to automatically flag direct dependencies and to ensure, that the feature is not set by other dependencies.” Section 5, p. 10 then gives a remaining privilege-escalation scenario: the application directly depends on LibA and LibB, and LibB also depends on LibA. Feature unification enables `direct-dependency` on LibA, allowing LibB to call LibA's `app_` functions regardless of LibB's permissions. The paper says: “The real-world effect of this vulnerability is unclear, since the author of LibB cannot make assumptions on the dependencies of other projects.” Inference: The proposed Cargo extension alone does not resolve this counterexample; the wrapper's `transmute` is also a trusted unsafe boundary.

Inference: For Verus, package-level permission selection could instantiate module-level specifications or ghost capabilities, but Cargo feature unification would remain outside the verifier. A sound integration would need a build-time proof that resolved features match the authority assumed by each generated wrapper.

## technique 4: procedural permission macro

What it is. The paper combines the token-taking and `app_` wrappers in a `permissions` procedural macro. A developer annotates a function that performs I/O directly or indirectly; the macro emits the permission-requiring function and an application wrapper, documentation, and conditional compilation attributes (Section 4.3, pp. 8–9).

Inference: When to use it. Use macro generation to make permission annotations concise and to keep the ordinary library source close to idiomatic Rust.

How to do it. The paper gives four required transformations: “cloning to function, prefixing the cloned function name with app_, adding the call to the original function, adding the conditional compilation arguments.” (Section 4.3, p. 9). Implement them in a procedural macro, generate the token-bearing function and `app_` wrapper, and attach the permission feature conditions. The earlier `lib_func` macro takes the `#[lib_func("ReadPerm")]` annotation in Listing 1.5 and generates the token-taking signature and permission documentation in Listing 1.3 (Section 4.1, p. 7).

Evidence. Section 4.3, p. 8 reports an implementation in reference [7], but evaluation remains future work (Section 1, p. 2). Section 5, p. 9 says: “The permission macro should minimize the workload, making it possible to write function in PermRust almost exactly as in Rust.” No benchmark or soundness proof of the macro is provided.

Failure and assumptions. Section 5, p. 9 states: “Using the macro we have to pay a high price in respect to compile time, since type-checking and executing of macro code is done by the compiler.” This cost is asserted, not measured. It also states: “Because the security of the whole system stems from the fact that the standard library is a trust anchor, language maintainers need to spend more time on designing and implementing the API in a capability-compatible way.” Inference: Generated code must preserve the intended token discipline; macros alone cannot protect against unsafe token fabrication.

Inference: A Verus-aware macro could generate `requires` clauses and proof obligations, but generated specifications would still need inspection and solver checking. Treating macro expansion as trusted would leave the same gap as PermRust's unverified procedural code.

## technique 5: object capabilities and customization boundary

What it is. The paper presents object capabilities as an alternative for finer-grained authority: a library receives the resource object itself, such as a `File`, rather than a generic read token. The object must be unforgeable, and constructors such as `open` and `create` must be restricted to authorized code (Section 5, p. 10).

Inference: When to use it. Use object capabilities when permissions must constrain particular paths, sockets, or resource instances rather than granting an entire I/O category.

How to do it. Give a library the resource object from its caller. Restrict `open` and `create` to the places where PermRust constructs tokens. The paper states: “This object would need to be made unforgeable, meaning that the open and create methods could only be executed where token types are constructed in PermRust.” (Section 5, p. 10). The paper contrasts this with token capabilities, where permissions are granted in full and cannot be customized to a path or IP range without additional runtime checks (Section 5, p. 10).

Evidence. The paper's limitation analysis ties token permissions to standard-library system calls and says customized path or IP-range conditions would require runtime checks (Section 5, p. 10). It presents object capabilities as a more disruptive alternative and claims: “Since in this system, all resources of a program would need to be obtained at the beginning of the program, startup times would increase rapidly.” This is the paper's claim about its proposed alternative, not an evaluated cost or a general requirement established for object-capability systems.

Failure and assumptions. This is a future alternative, not the implemented token design. The paper provides no evaluation of its proposed startup behavior. Inference: The resource objects and their constructors would need protection against fabrication and unauthorized acquisition, including through unsafe code.

Inference: In Verus, an object capability can be modeled as an owned value with an abstract resource identity and `requires` clauses on methods. Proving that the identity corresponds to an OS file or socket would need a trusted foreign-function model; Verus cannot establish that correspondence from Rust types alone.

## what is proved, measured, and trusted

Theorem 1 proves correctness and an asymptotic matrix-read bound for abstract Algorithm 1 (Section 3.1, p. 4). The paper illustrates Rust visibility rejecting one direct token-construction attempt and gives a proof-of-concept implementation with listings and macros. It measures no security incidents, runtime overhead, compile-time overhead, false positives, or attack success rates; evaluation is explicitly future work. Inference: Enforcement depends on Rust's memory safety and privacy guarantees, the standard library's modified APIs, generated code, and the unsafe token conversion. Cargo permission resolution is additionally necessary, but the paper's own feature-unification example shows a remaining bypass even without arbitrary unsafe token fabrication. The paper therefore does not establish complete enforcement for all safe Rust dependency graphs.

Inference: For a VeruLaw product generating verified Rust, PermRust is a relevant defense against accidental or hidden library I/O and a warning about authority encoded only in APIs. Potential product threats include unsafe or foreign code that bypasses token types and build-system feature resolution that grants unintended authority. Verus contracts can make authority preconditions explicit, but they do not automatically verify Cargo, macro expansion, OS effects, or C/FFI behavior.

## what VL should reuse and what it should not redo

Inference: The reusable ideas are an explicit access matrix, caller-to-callee privilege monotonicity, unforgeable capability values, and package-level authority declarations. Rebuilding a generic token permission concept would duplicate this paper's design. Remaining work for VL is to connect generated Verus contracts to actual dependency graphs, unsafe boundaries, and external-resource models, and to test whether proof obligations track authority after feature resolution.

## techniques for the catalog

- access-matrix permission checking — model functions and I/O calls as subjects and objects, then check direct rights and caller privilege inclusion over an abstract function tree
- capability-as-key tokens — require an unforgeable, private-field token in every protected API so authority is explicit at compile time
- Cargo permission features — generate application entry points that create local tokens only when package permissions are enabled
- procedural permission macros — clone and rewrite functions to add token parameters, wrappers, documentation, and conditional compilation
- object capabilities — pass unforgeable resource objects for path- or instance-specific authority when category-wide tokens are too coarse

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The other arguments and the return value of the underlying File object’s read function are unmodified."): read the complete paper and study; checked quotations, numerical bounds, section and page references, technique steps, tag, and arXiv identifier; corrected listing and section pages, the lib_func transformation, the LibA/LibB feature-unification scenario, and unsupported object-capability steps; distinguished paper claims from inferences; did not inspect the implementation repository, execute PermRust, or validate Verus integrations.
