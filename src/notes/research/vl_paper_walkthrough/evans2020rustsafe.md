# Is Rust Used Safely by Software Developers?
(authored by agents unless marked 🧑)
Tag: `evans2020rustsafe`, [paper](https://doi.org/10.1145/3377811.3380413)

## question and evidence

This ICSE 2020 paper measures how Unsafe Rust propagates through real crates. Its abstract reports that “software engineers use the keyword unsafe in less than 30% of Rust libraries, but more than half cannot be entirely statically checked by the Rust compiler because of Unsafe Rust hidden somewhere in a library’s call chain.” (§abstract, p. 1). The study asks how often developers use Unsafe Rust, how much code is potentially unsafe after dependencies are included, which operations are used, which foreign interfaces are called, whether usage changes over time, and why developers use it (§3.1, pp. 4–5).

The data contains 15,097 compilable crates out of 18,478 registered in September 2018, or 81% of all registered crates and 97% of syntactically correct crates (§5.2, p. 6). A “most downloaded” group covers 90% of crates.io downloads and contains 473 compilable crates; a Servo group is about fifty crates that, with all dependencies, comprise almost 400 crates (§5.2, p. 6). Compiler-generated unsafe is excluded (§3.1, p. 4), and the standard library is treated as trusted (§4.1, p. 5).

Inference: the study's percentages describe this sampled and filtered ecosystem, under the paper's compiler and trust assumptions. They are evidence about exposure to unsafe call chains, not a proof that every reported path executes in deployment.

## technique 1: classify unsafe exposure at four abstractions

Use this measurement when a repository needs to distinguish visible `unsafe` syntax from the broader set of code whose behavior is not statically guaranteed. The authors count unsafe blocks, declared unsafe functions, unsafe traits, and unsafe trait implementations (RQ1, §3.1, p. 4). They define a function as “possibly unsafe” when it is declared unsafe, contains an unsafe block, or calls another possibly unsafe function (§2.5, p. 4). A safe function has compile-time memory-safety and data-race guarantees (§2.5, p. 4).

Steps: (1) parse each crate and count each of the four unsafe abstractions; (2) record the abstraction category; (3) report crate-level percentages and per-crate cumulative distributions; and (4) compare all crates, most-downloaded crates, and Servo. These are the counting procedure and strata in §§3.1 and 5.3.1 (pp. 4, 7). Table 1 reports, for all crates, 29.4% with any unsafe, 27.5% with unsafe blocks, 17.1% with declared unsafe functions, 1.2% with unsafe traits, and 5.9% with unsafe trait implementations. For most-downloaded crates, the corresponding percentages are 52.5%, 47.7%, 47.7%, 4.2%, and 14.8% (Table 1, p. 7). More than 90% of all crates have fewer than ten unsafe blocks, and 90% have fewer than two declared unsafe functions (§5.3.1, p. 7).

Inference: a Verus-oriented inventory should report both syntactic unsafe sites and exported contracts whose implementations or callees cross an unsafe boundary. A crate-level badge alone misses transitive exposure. This inventory can be generated from MIR or compiler metadata before proof generation.

## technique 2: construct a type-aware extended call graph

Use this technique to propagate unsafe status through generic functions, trait dispatch, and higher-order calls. The authors obtain each function's control-flow graph from Rust MIR and perform context-sensitive type inference. A call-graph node contains the function plus generic type parameters and known substitutions (§4.1, p. 5). At a call site, they infer the concrete function when `Self` and argument types are known; otherwise they apply the substitutions recursively, adding new nodes as needed, and if `Self` is still unknown they add an edge to a node parameterized by the `Self` type (§4.1, p. 5).

Dynamic dispatch and function pointers cannot always be resolved. The paper therefore constructs two call graphs: a conservative graph that assumes an unresolved call is unsafe, and an optimistic graph that assumes it is safe (§4.1, p. 5). Construction for a function stops when any unsafe usage is found, because the function is then possibly unsafe and further calls have no impact; it also stops at a virtual call or function pointer, because the two approximations cover both cases (§4.1, p. 5). Calls into the standard library are cut off; declared-unsafe standard-library functions are marked unsafe, while all other standard-library functions are considered safe even if their implementations use unsafe (§4.1, p. 5).

Steps drawn from §4.1 (p. 5): (1) compile a crate to MIR; (2) read each function's control-flow graph; (3) infer callees using `Self`, argument types, and generic substitutions; (4) add unresolved virtual or higher-order calls to both conservative and optimistic graphs; (5) stop expansion at unsafe, virtual, function-pointer, or trusted-standard-library boundaries; and (6) retain a separate graph for each crate so cross-crate dependencies can be combined later. The paper publishes its implementation and says, “To generate a call graph, we use the Rust compiler to compile the crate to an intermediate representation of Rust known as MIR (Middle Intermediate Representation).” (§4.1, p. 5).

Inference: for Verus, this graph can identify functions whose proof depends on an external or unsafe implementation. A conservative graph is suitable for a product risk report; a proof obligation can require a verified contract at every unresolved edge. The optimistic graph is useful for lower-bound estimates, but it cannot justify a safety claim.

## technique 3: reverse-propagate unsafety with a worklist

After building an extended call graph, the authors mark every function containing an unsafe block and propagate that mark to callers. Algorithm 1 initializes a worklist with those functions, reverses the graph, and repeatedly marks each unmarked predecessor as possibly unsafe until the worklist is empty (§4.2, p. 6). Functions not marked are deemed safe under the analysis assumptions. Declared-unsafe functions need not be separately initialized because the paper says they “will necessarily be called from within an unsafe block in another function” (§4.2, p. 6).

A paper example starts with an unresolved trait implementation in the worklist, marks its caller, then marks the caller's caller. Thus `foo` appears safe syntactically but is possibly unsafe because it may dispatch to an unsafe implementation (§4.3, p. 6). The key claim is, “Our goal is to mark every function as either safe or possibly unsafe.” (§4.2, p. 6).

Steps: (1) seed the worklist with functions containing unsafe blocks; (2) reverse the call graph; (3) pop a function; (4) mark each unmarked caller possibly unsafe and enqueue it; and (5) stop when the worklist is empty. Report the remaining functions as safe only relative to the graph and trust cutoffs. Inference: a standard worklist implementation should visit each reverse edge at most once; the paper does not report a complexity analysis or runtime measurement.

Inference: a Verus build pipeline can use this pass to require `requires`/`ensures` contracts on every path into unsafe or foreign code. It should preserve the distinction between a proved-safe result and a graph that simply did not reach a function, because dead code, unresolved dispatch, and missing platform crates create false negatives or false positives.

## technique 4: measure transitive dependency exposure

RQ2 compares direct unsafe syntax with dependency-aware status. Table 2 reports the percentage of crates containing only safe functions, with compiler-generated unsafe ignored and the standard library trusted: 44.8% under conservative analysis and 53.8% under optimistic analysis for crates.io; 38.9% and 43.9% for most-downloaded crates (Table 2, p. 8). The paper then inspects dependencies. A crate averages twelve dependencies. Table 3 reports 23% of crates both contain unsafe and depend on unsafe crates, 12% contain unsafe but have no unsafe dependencies, 38% contain no unsafe locally but depend on unsafe crates, and 27% have neither local nor dependency unsafe (§5.3.2, p. 8). Thus 38% of crates look locally safe while inheriting unsafe from dependencies.

Inference: a Verus product's trust report must traverse the dependency closure, including optional features and platform-specific implementations. A verified top-level function does not remove the need for a contract or audit at a dependency edge. The denominator for each percentage is the study's crate set, and the conservative/optimistic model must be shown beside the number.

## technique 5: classify the operations hidden behind unsafe

The authors count unsafe operation kinds in unsafe blocks (Table 4) and declared unsafe functions (Table 5). In all crates, unsafe-function calls make up 79.3% of operations in blocks, C-style pointer dereferences 16.2%, and mutable global access 3.7%; the analogous declared-function percentages are 89.2%, 6.7%, and 3.9% (Tables 4–5, p. 8). The percentages in the most-downloaded set are different: unsafe-function calls are 66.9% in blocks and 64.0% in declared functions, while pointer dereferences are 19.5% and 26.0% (Tables 4–5, p. 8). Among all crates.io crates, the paper reports that the most frequent calls to declared unsafe functions are to Rust unsafe functions (65%), followed by C functions (22.5%) and Rust intrinsics (§5.3.4, p. 9). The tables are titled “Unsafe Operations in Unsafe Blocks” and “Unsafe Operations in Unsafe Functions”; the paper does not state their denominator, and shows only operations present in more than 1% of crates (§5.3.3, p. 8).

Inference: the dominant Verus risk is often an unsafe Rust API call, not only FFI. Generated proofs should expose the callee's preconditions and preserve them through wrappers. Pointer-heavy and intrinsic-heavy crates need separate models because their failure modes differ.

## technique 6: survey developer justification and confidence practices

The authors posted a survey on the Rust Subreddit and collected data from twenty respondents (§5.4, pp. 9–10). Multiple responses were allowed. Fifty-five percent selected higher performance as a reason for unsafe, 40% that Safe Rust was too restrictive, 25% that the safe alternative was too verbose or complicated, 10% that unsafe was needed to make code compile, and 5% that it was faster to write (§5.4, p. 9). For confidence, 65% said they read code carefully, 55% add runtime checks, and 50% write more unit tests; respondents also mentioned proofs, fuzzing, analysis tools, and Miri (§5.4, pp. 9–10).

Inference: these responses suggest that a Verus workflow should make proof obligations cheap at performance-sensitive boundaries and combine static proof with runtime checks where assumptions remain. The sample is small, self-selected, and not a measurement of defect rates.

## what is proved, measured, and trusted

The paper's contribution is an empirical result and a reusable analysis algorithm, not a proof that the analyzed crates are unsafe in executions. The call graph is an approximation: unresolved dispatch is bounded by optimistic and conservative assumptions, dead code may be included, and crates that require Windows or macOS libraries are absent (§7, p. 10). The authors explicitly warn that “The Unsafe Rust segments we identify may be in unreachable or dead code that may not ever be executed for a particular library.” (§7, p. 10).

Inference: trusted components include MIR generation and type inference, the standard-library trust assumption, the compiler version, the crate-selection procedure, and the correctness of the unsafe classification. Verus adds its solver, erasure, supported-Rust semantics, and every external contract to that trust boundary. The study's threat to agent-written verified Rust is high for transitive dependencies: a safe-looking wrapper can call an unsafe implementation several edges away.

The authors recommend compiler support (for example, identifying implicitly unsafe functions and printing a possible call chain to Unsafe Rust), and three crates.io changes: a tag or badge for crates with Unsafe Rust, a dependency tree with unsafe crates marked, and a list of code reviews for any Unsafe Rust (§6, p. 10). They call requiring “an automatic correctness proof” for every use of unsafe “particularly ambitious” and “unlikely to scale to all Rust code”, while annotating unsafe function calls with pre- and post-conditions is described as “another more feasible short-term approach” (§6, p. 10).

## techniques for the catalog

- unsafe abstraction census: count unsafe blocks, functions, traits, and implementations by crate and ecosystem stratum
- type-aware extended call graph: use MIR, generic substitutions, and two dispatch assumptions to resolve or bound calls
- reverse worklist propagation: mark callers of unsafe functions until all possibly unsafe functions are reached
- dependency closure analysis: distinguish locally safe crates from crates whose dependencies contain Unsafe Rust
- operation taxonomy: measure unsafe function calls, pointer dereferences, globals, and intrinsics with explicit denominators
- developer confidence survey: collect reasons for unsafe and static, dynamic, testing, and proof practices
