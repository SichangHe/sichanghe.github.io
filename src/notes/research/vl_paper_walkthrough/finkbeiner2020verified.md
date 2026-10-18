# Verified Rust Monitors for Lola Specifications
(authored by agents unless marked 🧑)
Tag: `finkbeiner2020verified`, [paper](http://arxiv.org/abs/2012.08961v1)

## scope and result

Finkbeiner, Oswald, Passing, and Schwenger compile stream-monitoring specifications in Lola into Rust and emit verification annotations for Prusti/Viper. The abstract states: “The generated code contains verification annotations that enable the Viper toolkit to automatically prove functional correctness, absence of memory faults, and guaranteed termination.” (Abstract, p. 1). The compiler analyzes dependencies, statically computes bounded memory, generates prefix/loop/postfix execution phases, and can evaluate independent streams concurrently. Its correctness argument relates a bounded working-memory ring buffer to an unbounded ghost sequence. The target is a monitor whose verdicts match Lola's evaluation model for every input length, subject to the stated platform and specification assumptions.

Inference: this is a useful architecture for VL when a high-level declarative contract can be compiled into small, structured Rust with a proof scaffold. It does not show that arbitrary hand-written Rust can be verified automatically.

## technique: dependency and memory analysis before code generation

When to use it: use static analysis when a specification has streams with relative-time accesses and the generated implementation can replace dynamic checks with phase-specific code. The paper says, “The compilation proceeds in two steps. First, the Lola specification is analyzed to determine inter-stream dependencies, the overall memory requirement, and the different phases of the monitoring process. Second, the compiler produces Rust code that implements the specification.” (Section 3, p. 6).

Steps from the paper:

1. build the dependency graph whose vertices are streams and whose weighted edges record stream offsets (Definition 2, p. 5)
2. compute each stream's shift and partial evaluation order. A non-positive offset can fail until a statically calculated time; a positive offset delays evaluation until the referenced value exists (Definitions 3–4, p. 5; Section 3.1, p. 6)
3. derive memory requirement `µ(s)` as the maximum weighted shift difference over outgoing dependencies, then total memory `µ*` as the sum of `µ(s)·size(Ts)` (Definition 5 and Definition 6, p. 7)
4. derive prefix length `η←` and postfix length `η→`, and assign each output stream an evaluation layer. Streams incomparable in the evaluation order share a layer (Definitions 6–7, p. 7)
5. generate separate evaluation functions for prefix, steady loop, and postfix. Static knowledge of failing accesses allows the generated functions to substitute defaults without a runtime presence test (Section 3.2, p. 8)

The generated structure has a `Memory` struct with a fixed array per stream, a prelude, prefix, monitor loop, and postfix (Listing 1.2, p. 8). Each layer computes values using an immutable `&Memory` reference and then commits them with `write_layer_i`; after `µ(s)` iterations the ring buffer evicts the oldest value (Section 3.2, p. 9). This separation gives both predictable memory and a simple proof boundary.

Verus form: Inference: a compiler targeting Verus can compute maximum history for a protocol or monitor, emit fixed-size arrays and phase-specific functions, and generate `requires` bounds for every index. Use Rust arrays, immutable borrows, and ordinary executable functions; express semantic promises with `requires` and `ensures`. A Verus `spec fn` can describe the mathematical stream equation, while executable code updates the ring buffer. Inference: if the required history is not statically bounded, reject the specialization or use a separately proved dynamic structure instead of silently weakening the contract.

Evidence and limits: the paper reports compilation under ten milliseconds and below 4 MB for all experiments (Section 6, p. 15). In the flight-phase specification, verification flagged a division whose denominator was an input stream access and so was not necessarily non-zero; the paper reads this as detecting “flaws in specifications stemming from implicit assumptions on the system” (Section 6, pp. 16–17). Inference: this is evidence that generation plus proof can detect specification flaws, not evidence that the original requirements are correct.

## technique: ghost memory and a correspondence invariant

When to use it: use ghost state when the implementation stores only a bounded window but the specification semantics refers to an unbounded history. The paper identifies this as its central proof difficulty: the main challenge is that “the evaluation model of the Lola semantics refers to unbounded data sequences, disregarding any memory concerns.” (Section 4, p. 10).

Steps:

1. generate a `Ghost Memory` wrapper around dynamically growing vectors, and commit every input or computed stream value to it (Section 4, p. 10)
2. keep ghost memory separate from executable monitor state; remove it after successful verification without changing monitor behavior (Section 4, p. 10)
3. prove the correspondence between the bounded working memory `m` and the relevant suffix of ghost memory `g`
4. use an invariant for every stream and index: `0 ≤ i < µ(s) ⇒ m_s[i] = g_s[i]` (Equation (1), p. 12)
5. establish the invariant at loop entry using the statically computed prefix length, preserve it across each loop iteration, and use it after the loop to connect every computed output to the semantic sequence (Section 4, pp. 11–13)

The paper explains why the invariant is repeated explicitly: “However, after completing one loop iteration, Viper deletes prior knowledge about all variables that were mutated in the loop. Further reasoning about these variables is thus solely based on the loop invariants.” (Section 4, p. 12). It generates per-stream quantified invariants and unrolls the finite bound `µ(s)` to reduce solver work (Section 4, p. 12). Inline assertions after each stream expression establish that a new value is correct assuming the values read from memory are correct; the paper calls this argument well-founded because failing accesses are replaced by default values, so any value read from memory “was computed in an earlier iteration or layer and therefore proven correct by Viper” (Section 4, p. 12).

Verus form: Inference: model ghost history as proof-only state or a `Ghost` value and write a `lemma` that relates the executable ring-buffer sequence to an abstract sequence. Put the loop relation in an `invariant` declaration on the executable loop, for example an invariant that each valid index in the ring buffer equals the corresponding abstract history entry. Use `assert` statements or lemmas to prove each newly written slot and the unchanged suffix. Verus erases proof code, but the implementation must remain independent of the ghost sequence. Inference: the exact indexing and wraparound arithmetic must be proved in the chosen array representation; the paper's Viper annotation syntax cannot be copied into Verus.

What is established and trusted: the abstract claims the generated annotations let Viper prove functional correctness, absence of memory faults, and guaranteed termination; the body argues mainly the functional correspondence (Section 4). The paper states the approach relies on external tools and that Z3 running times are unpredictable (Section 6, pp. 15, 17). Inference: the Lola semantics, the Rust compiler, the Prusti-to-Viper-to-Z3 translation chain, and the platform are therefore trusted, not proved, by this work; the paper does not list a trusted base.

## technique: contracts, loop invariants, and assertions as generated proof scaffolding

The compiler emits three annotation classes. Function contracts constrain callers and bodies with preconditions and guarantees; loop invariants are checked on entry, preserved by the body, and assumed after loop exit; inline `assert!` assertions add local facts that Viper verifies statically (Section 4, pp. 11–12). For a memory lookup it emits a `requires` annotation with the condition `index < µ(s)` and per-index `ensures` annotations with the condition `index == i ==> result == self.s[i]` (Section 4, p. 11). The paper's generated loop entry checks also ensure the iteration count and ghost-memory length agree with `η← − ∆(s)` (Section 4, p. 12).

Verus form: Inference: translate the lookup contract into a Rust function with `requires` for the index bound and `ensures` relating the returned value to the array slot. Put preservation facts on the loop with `invariant`, and use `assert` plus `lemma` calls for arithmetic or sequence updates. Keep executable assertions only when they are intended runtime checks; proof-only assertions and lemmas should not alter monitor behavior. Inference: a generated contract must mention all mutable state that matters, because a missing frame or state relation can let a proof pass while the monitor is wrong.

## technique: dependency-layer concurrency

When to use it: parallelize streams that are incomparable in the dependency order and whose evaluation functions only read shared memory. The paper states, “Thus, the compilation spawns a new thread for each stream within the layer with read access to the global memory.” (Section 5, p. 13).

Steps:

1. compute evaluation layers from the dependency graph
2. annotate evaluation functions with `#[pure]` and pass immutable memory references (Section 5, p. 13)
3. in each layer, spawn one thread per stream and join all handles before writing the layer's results. The paper's code uses `crossbeam::scope`, `scope.spawn`, and `join().unwrap()` (Section 5, p. 14)
4. the paper says correctness “is an immediate consequence of the correctness of the evaluation order and memory locality of streams” and that it adds annotations so Viper verifies the parallel execution (Section 5, pp. 13–14); it does not show those annotations. Inference: the returned tuple is then committed to memory as in the sequential code

The paper notes that Rust's ownership model enforces a strict separation of mutable and immutable data (Section 5, p. 13). It warns that one thread per stream has constant spawn overhead and benefits most when the dependency graph is wide or expressions are large (Section 5, p. 14).

Verus form: Inference: retain the paper's pure-function and layer-independence conditions, but encode the shared-state protocol with Verus's supported Rust ownership and concurrency specifications. Verify each worker's `ensures` against an immutable snapshot and prove that joining all workers yields the same layer result as sequential evaluation. The paper shows only `#[pure]` for the parallel case, and Viper annotations do not carry over verbatim to Verus.

## evidence, limitations, and product threat

The experiments use a 3.1 GHz dual-core Intel i5 with 16 GB RAM and 20 verification runs per plotted monitor (Section 6, pp. 14–15; Figure 4). The altitude monitor's verification time has a median of 225 s and never exceeds 600 s; memory ranges 648–711 MB with one 914 MB outlier. The network monitor has a median of roughly 15 minutes, most runs under 25 minutes, a longest run near 90 minutes, and about 3 GB memory (Section 6, pp. 15–16). For the flight-phase monitor modified to avoid division, only four runs terminated successfully (6–16 min, 1.38–1.66 GB); two runs did not terminate within three hours, and four runs reported assertions that might not hold or crashed internally (Section 6, p. 17). These denominators and run conditions matter: success is not deterministic under Z3.

Runtime performance is compared against the RTLola interpreter on randomly generated input: for the altitude specification, 438 ns per event on average over 10 runs for the interpreter versus 6.2 ns for the compiled monitor; for the network traffic specification, the paper prints “1, 535µs for the interpreter and 63.4ns for the compiled version” (Section 6.1, p. 17). The 10-run count is stated only for the first specification, and the µs/ns unit mix looks like a typo in the paper. The altitude specification was adapted for RTLola by using a negative offset of -2 instead of a future offset (footnote 6, p. 17). The paper's all-benchmark claim is that each specification either yielded a verified monitor or exposed an error, but the difficult flight monitor demonstrates solver timeouts and instability.

Inference: this work poses a high threat to VL's monitor and compiler use cases because it shows a mature pattern—compile a restricted declarative language, generate contracts and ghost invariants, and erase proof artifacts. It is a smaller threat to general agent-written Rust: the approach depends on a static memory bound, a restricted stream model, generated code shape, and substantial solver annotations. VL should reuse the correspondence-invariant and dependency-layer ideas, but should measure Verus proof repair, specification drift, and solver stability on real Rust APIs before claiming equivalent coverage.

## what VL should not redo

The paper already demonstrates bounded-history ghost-state proofs, generated contracts and loop invariants, and compiler-versus-interpreter performance on Lola monitors. It describes dependency-based parallelization (Section 5) but its experiments (Section 6) report no measured speedup from concurrency. A VL study should not repeat those claims without a Verus-specific boundary. It should instead test whether the same generator can preserve contracts across Rust dependency updates and whether Verus can verify the generated concurrency and ring-buffer APIs under the intended product assumptions.

## techniques for the catalog

- dependency-driven monitor compilation: analyze shifts, memory bounds, phases, and evaluation layers before emitting Rust
- ghost-memory correspondence: relate a bounded executable ring buffer to an unbounded semantic history with a loop invariant
- generated proof scaffolding: emit function contracts, loop invariants, and local assertions for every lookup and update
- phase-specialized execution: separate prefix, steady loop, and postfix code so statically known missing accesses use defaults
- layer-based parallel evaluation: run pure, incomparable stream computations concurrently and join before committing a layer
- solver-backed validation: treat successful verification, timeouts, and exposed arithmetic assumptions as separate measured outcomes
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Thus, any value retrieved from Memory was computed in an earlier iteration or layer and therefore proven correct by Viper."): read the whole paper text (pp. 1-19) and checked quotations, definitions and steps, section and page references, and all experimental numbers; changed the Section 4 and Section 5 quotes to match the paper, corrected pages (Section 5 quote p. 13, hardware p. 14, flight-phase results p. 17), removed unsupported claims (an unstated static-analysis assumption, a required independence proof, Prusti concurrency annotations, ten runs for both benchmarks, a demonstrated parallel speedup), and marked the trusted-base list as Inference; did not check the Viper/Prusti details behind the paper, the cited works, the Verus mapping beyond labeling it Inference, or the PDF figures beyond the text.
