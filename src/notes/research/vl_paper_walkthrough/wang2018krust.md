# KRust: A Formal Executable Semantics of Rust
(authored by agents unless marked 🧑)
Tag: `wang2018krust`, [paper](http://arxiv.org/abs/1804.10806v1)

## scope and result

Wang et al. define KRust, an executable operational semantics for a realistic subset of Rust in the K rewriting framework. The paper targets the language mechanisms that make Rust difficult to model: ownership, moves, borrows, lifetimes, mutability, arrays, vectors, structs, control flow, and functions. Its abstract states, “In this paper, we present a formal executable operational semantics of a realistic subset of Rust, called KRust.” (Abstract, p. 1) The semantics is intended to produce an interpreter and formal-analysis tools from one definition.

The authors report validation against 182 programs: 157 supported tests selected from the official Rust `run-pass` suite and 25 hand-crafted tests covering the syntax table (Section IV-A, p. 7). They state that “KRust successfully parsed all of them and the results produced by the interpreter are same as the one produced by the compiled programs using the Rust compiler.” (Section IV-A, p. 7) The denominator is 182 tests, not all Rust programs or all 3,119 `run-pass` tests.

Inference: this paper supplies a semantic foundation that VL can use to reason about Rust execution, but it is not a Verus proof system and does not establish equivalence to current full Rust. Its most useful lesson is to make state changes, ownership transitions, and contracts executable and testable before building higher-level verification automation.

## technique: executable rewrite semantics in K

Inference: when to use it: use a rewrite-based executable semantics when one formal definition should support interpretation, debugging, symbolic execution, model checking, and deductive verification. K represents an executing program as nested cells and defines each atomic statement by a rewrite rule.

Steps from the paper:

1. Define the language syntax in BNF with semantic attributes. KRust covers primitive types and operations, structs, arrays, vectors, control flow, function definitions/calls, and Rust-specific ownership, borrowing, and lifetime features (Sections III-A–III-D, pp. 3–6; Conclusion, p. 8).
2. Define a nested configuration. The `k` cell stores computations; `env` maps variables to locations; `store` maps locations to values; `typeEnv` stores types; `mutType` records mutability; `ref` and `refType` encode references; `borrow` records borrow status; `moved` records moved values; `fstack` stores function-call frames; and `nextLoc` allocates fresh locations (Sections III-B–III-C, pp. 3–4).
3. For each statement, write a K rewrite rule that updates only the relevant cells. The paper explains that `X ⇒ L` inserts a variable-to-location pair and that `A 7→ (B ⇒ C)` replaces a cell pair, making state transitions explicit (Section III-D, p. 5).
4. Compile the K definition. K automatically generates an interpreter and exposes generic analysis tools. The paper says, “The executable semantics yields automatically a formal interpreter and verification tools for Rust programs.” (Abstract, p. 1)
5. Validate the generated interpreter against compiled Rust and then use the same semantics for debugging and verification applications (Section IV, pp. 6–8).

The K framework's lookup example illustrates the shape: a lookup rule finds `X 7→ L` in `env`, then `L 7→ V` in `store`, and returns `V` in `k` (Section III-A, p. 4). Inference: a Verus-oriented semantic model could similarly expose executable ghost state for ownership or abstract resources, but Verus source itself is checked by Verus and its solver rather than by K rewrite execution.

Verus form: Inference: model executable state with ordinary Rust data and specifications, and model abstract resources with ghost state and proof functions. State transitions should be stated with `requires` and `ensures`; loop preservation belongs in loop `invariant` declarations; intermediate semantic facts can use `assert`. Inference: a K-style interpreter can validate a reference model, but it cannot replace Verus's checking of the actual Rust implementation unless a proven refinement relation connects the two.

## technique: explicit ownership, move, borrow, and lifetime cells

Inference: when to use it: use separate state components when a language property depends on more than variable values. Rust's ownership safety requires tracking whether a location is moved, which references exist, whether a borrow is mutable, and whether a lifetime relation permits it.

The paper's operational encoding proceeds as follows:

1. On immutable or mutable variable declaration, allocate a fresh location in `env`, initialize `store`, record the type in `typeEnv`, record mutability in `mutType`, and advance `nextLoc` (Section III-D.1, p. 5).
2. For a mutable reference `X = &mut Y`, require that X and Y are mutable and not moved, that Y is not already borrowed, and that the declaration order gives X a lifetime included in Y's. Update `ref` from X's location to Y's location, mark the reference type mutable in `refType`, and mark Y as mutably borrowed in `borrow` (Section III-D.2, p. 6).
3. For an immutable reference, allow multiple immutable borrows, mark the reference type immutable, and reject mutation through an immutable reference. Dereference follows the `ref` relation to the target location (Section III-D.2, p. 6).
4. For an ownership move `let X = Y`, require matching types and update the `moved` cell so Y is no longer usable, while helper functions copy struct fields as the semantics requires (Section III-D.4, pp. 6–7).
5. For function calls, save the caller environment, return type, and remaining computation in `fstack`, create a fresh local environment, bind parameters, run the body, and restore the caller frame on return (Section III-D.3, p. 6).

The paper's examples show the intended errors: after `let mut q = p`, using `p.x` is rejected because ownership moved, and using `q.x` after q's scope is rejected because q's object was destroyed (Section II-C, p. 2). For borrowing, two immutable references may coexist, but mutation through them and a simultaneous mutable borrow are rejected (Section II-D, p. 3).

Verus form: Inference: preserve Rust's ownership and borrow checking in executable code, then state functional properties over the owned values and ghost representations. Use `requires` to state valid ownership preconditions and `ensures` to relate pre- and post-state values. Inference: Verus does not expose KRust's `env`, `borrow`, or `moved` cells as a universal runtime API; a Verus proof must use supported Rust/Verus constructs and explicit ghost state where an abstract ownership invariant is needed.

## technique: contract verification of functional and resource properties

KRust's generated verifier handles reachability and Hoare-style claims, including a resource counter for time complexity. The paper's example is Euclid's subtraction algorithm:

1. implement `gcd(a,b)` with positive integer preconditions and recursive subtraction until `a == b` (Section IV-B, p. 7)
2. add a `time` configuration cell whose counter increases on each `gcd` call
3. state `requires X > 0, Y > 0`
4. state `ensures T2 − T1 <= maxInt(X,Y)`, where T1 and T2 are the counter values before and after the call
5. run the generated verifier; it outputs true for the bound, establishing O(max(a,b)) under the modeled semantics (Section IV-B, p. 7)

The paper gives the contract shape verbatim: “requires X > 0 , Y > 0” and “ensures T2 − T1 <= max Int (X, Y)” (Section IV-B, p. 7). Inference: for Verus, the direct form is a Rust function with `requires` and `ensures`, plus a ghost or specification counter and loop invariant for the recursive or iterative bound. The paper's counter is a semantic instrumentation mechanism; a Verus implementation must connect any cost model to the actual code path and environment.

The semantics also supports automatically derived reachability, model checking, symbolic execution, and theorem proving through K's language-independent tools (Section III-A, p. 4). Inference: these analyses can find behavior or proof obligations, but only a sound refinement argument and a checked Verus proof establish that the deployed implementation meets its stated contract.

## technique: conformance testing and differential validation

Inference: when to use it: use differential testing when an executable semantics claims to model an existing language. Compare the generated interpreter against a trusted compiler or reference implementation on a broad, explicitly counted test set.

The paper's procedure is:

1. parse all 3,119 official `run-pass` tests
2. retain 195 tests supported by KRust's syntax
3. remove 38 tests lacking `main` or calling unsupported standard-library functions, leaving 157 official tests
4. add 25 hand-crafted tests covering all primitive constructs in Table I
5. run all 182 tests through KRust and compare outputs with compiled Rust (Section IV-A, p. 7)

All 182 selected tests parsed successfully and produced the same results as compiled programs. The authors explicitly caution that “the semantic coverage of the test suite has not been well-studied” (Section IV-A, p. 7). Inference: passing 182/182 is evidence for these selected cases, not evidence of complete language coverage; the 38 excluded tests and unsupported features are part of the denominator story.

Verus form: Inference: maintain differential tests between reference Rust behavior and verified Rust behavior, and run the Verus verifier on each test's contract. Record which tests exercise ownership, borrows, lifetimes, loops, and external calls. A passing differential test cannot replace a proof, and a passing proof cannot reveal behavior absent from the test or contract.

## technique: executable debugging from semantic states

The same K configuration can drive a debugger. The paper runs `kruntest.rs --debugger` on a loop that decrements a mutable integer and lets a user step through semantic rules and print state. After one iteration it displays `env`, `typeEnv`, `mutType`, and `store` cells (Section IV-B, p. 7). Inference: a VL assistant could expose failed proof states with the current Rust values, ownership facts, and contract assumptions, but any displayed state must be tied to a reproducible source and dependency snapshot.

## evidence, limitations, and trusted boundary

KRust captures the listed subset and its generated interpreter, but it omits structs with reference fields, pattern matching, trait objects, explicit lifetime annotations, complex closures capturing outside variables, concurrency, crates/modules calling external libraries, and `unsafe` (Section VI, p. 8). The authors say, “KRust does not cover the full features of Rust, as Rust is being actively developed and some of these features are not stable so far.” (Section VI, p. 8) The 182-test result therefore supports the subset and test settings only.

The trusted parts are the K framework and its generated interpreter/verifier, the compiler used for differential comparison, the modeled language rules, and the stated properties. Inference: for Verus, the trusted boundary additionally includes Verus, its solver, Rust compilation, external-library specifications, and the correctness of the written contracts. The semantics does not prove that a contract expresses product intent.

Inference: threat to a product producing agent-written verified Rust is foundational rather than an immediate replacement threat. KRust shows that Rust semantics can be executable and can generate verification tools, while its exclusions show why full-language ownership, concurrency, unsafe code, and external crates remain hard. VL should use semantic models and differential tests to catch model drift, but should avoid claiming that KRust's 182 tests establish full Rust equivalence.

## what VL should not redo

KRust already provides an executable subset semantics, cell-based ownership/move/borrow rules, generated interpreter/debugger/verifier, and a 182-case differential test. VL should not repeat those as if they were new. A useful extension would measure Verus proof robustness when supported Rust features, dependencies, or semantic assumptions change, and would connect executable reference states to verified Rust contracts.

## techniques for the catalog

- executable rewrite semantics: define language statements as K rules over nested state cells and generate an interpreter
- ownership-state modeling: track locations, mutability, moves, references, borrow status, and lifetimes in explicit configuration cells
- generated formal analysis: derive debugging, symbolic execution, model checking, and verification tools from the executable semantics
- contract instrumentation: add a resource or time cell and prove a Hoare-style bound with pre- and postconditions
- differential conformance testing: compare the generated interpreter with compiled Rust over counted official and hand-crafted tests
- semantic-state debugging: step rewrite rules and inspect configuration cells to explain program behavior
Checked 2026-10-14: audit record wang2018krust; paper-study comparison complete; gate executed; experiments not rerun
