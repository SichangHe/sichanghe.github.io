# For a Few Dollars More
(authored by agents unless marked 🧑)
Tag: `haslbeck2021dollars`, [paper](https://doi.org/10.1007/978-3-030-72019-3_11)

## scope and result

Haslbeck and Lammich present an Isabelle/HOL refinement framework that proves functional correctness and worst-case resource bounds together, down to generated LLVM. The case study is introsort: the extracted sorter is functionally correct, has worst-case (O(n\log n)) complexity, and has measured time comparable to GNU libstdc++. The paper's abstract states: “We present a framework to verify both, functional correctness and worst-case complexity of practically efficient algorithms.” (Abstract, PDF p. 1). The framework matters to VL because it makes a resource theorem follow the same refinement chain as the executable implementation; its cost model and LLVM semantics remain explicit trusted modeling choices.

## technique 1: resource-aware nondeterministic specifications

What it is. NREST is a nondeterministic-result monad whose result map associates each possible result with a resource bound. A computation can be `fail` (possibly nontermination) or `res M`; when several paths produce one result, their costs are combined by a supremum. A resource type must provide a complete lattice and a monoid, so costs can be ordered and added. The paper says: “We require the resources γ to have a complete lattice structure, such that we can form suprema over the (possibly infinitely many) paths that lead to the same result.” (Section 2.1, PDF p. 4).

When to use it. Use NREST for an abstract algorithm with many legal outputs and a bound that should be independent of implementation details. Encode a sorting specification as any permutation that is sorted, with a symbolic currency for its cost.

How to apply it. Define `spec Φ T` as a computation returning results satisfying predicate `Φ`, charging resource function `T`; use `return`, `bind`, `assert`, and resource-aware `ifc`, `recc`, and `whilec`. Give each abstract operation a currency. Example 1 specifies sorting with `$q |xs|^2 + $c`; later refinement exchanges these abstract coins for concrete operation coins. The paper warns: “Abstract currencies like q and c only ‘have value’ if they can be exchanged to meaningful other currencies, and finally pay for the resource costs of a concrete implementation.” (Section 2.1, PDF p. 5).

Verus form (Inference): represent the abstract result relation with a `spec fn`, and put the resource bound in an `ensures` clause over a ghost cost value or cost map. Use executable Rust only for the algorithm; use proof functions and lemmas to establish result predicates and arithmetic bounds. Verus does not provide this NREST monad or Isabelle's lattice automation, so the developer must define the result/cost representation and prove supremum or aggregation lemmas. `ensures` belongs on executable or proof functions, not on a `spec fn`.

Evidence and limits. The evidence is the formal refinement theorems, not a runtime measurement of NREST. NREST's supremum can be unattained: the paper's Example 2 has infinitely many paths to one result, so the aggregate is infinite even though no path takes infinite cost (Section 2.2, PDF p. 6). This is an assumption users must understand when composing resource bounds.

## technique 2: currency refinement and lockstep decomposition

What it is. Currency refinement maps each abstract coin to a finite combination of concrete coins. For example, one abstract comparison coin becomes two list-lookups and one less-than operation. The exchange rate is a function from abstract currency names to concrete currency names and multipliers. The paper gives the rule: “one abstract coin may be exchanged into multiple coins of different currencies.” (Section 2.3, PDF p. 7).

When to use it. Introduce a currency at every algorithmic boundary whose implementation is not yet fixed (`sortc`, `partitionc`, `lookup`, and so on). Refine the algorithmic proof first, then instantiate each abstract currency with the cost of its implementation.

How to apply it. (1) Write the abstract operation and its symbolic currency. (2) Write the concrete implementation with its own costs. (3) Define exchange rate `E`; in Example 5, `idxs cmp` maps to two `$lookup` and one `$less`. (4) Prove the concrete computation is below the exchanged abstract computation. (5) Compose such lemmas by lockstep refinement: traverse structurally equal `bind`, `ifc`, and `recc` programs and discharge generated preconditions. The paper notes that exchange rates must currently be aligned manually across components (Section 2.4, PDF pp. 8–9).

Verus form (Inference): use a ghost cost struct or `spec fn` mapping operation tags to natural counts. Each implementation lemma has `ensures` that its cost is bounded by the exchanged abstract budget; composition is a proof lemma over sequence or tuple costs. A Verus proof can encode lockstep recursion and arithmetic, but an automatic Sepref-style synthesizer is outside ordinary Verus and would need a separate generator.

Evidence and limits. Currency refinement gives modular proofs and supports amortized structures. The authors explicitly leave automatic exchange-rate inference as future work (Section 2.4, PDF p. 9). The `hnr` predicate later cannot generally perform currency refinement, so basic operations use LLVM currencies and are wrapped in costed data-structure specifications (Section 4.2, PDF p. 13).

## technique 3: LLVM instruction cost semantics with separation logic credits

What it is. The LLVM model is a deterministic state monad returning result, cost, and state. Each LLVM instruction consumes a cost token; costs are maps from instruction names to natural numbers. For example `ll_load` consumes `$load` before invoking raw memory load (Section 3.2, PDF p. 10). The paper states: “As a cost model for running time, we chose to count how often each instruction is executed.” (Section 3.3, PDF p. 12).

When to use it. Use this level when the theorem must cover generated low-level code and pointer/memory operations. Define the model before proving the algorithm, then attach one cost to each instruction and function call.

How to apply it. (1) Define a cost monoid, state, and `consume`. (2) Layer shallow LLVM instructions over a raw memory model. (3) Add instruction costs at the top layer while reusing raw-memory proofs. (4) Define concrete state as memory plus available credits. (5) Prove primitive Hoare triples, then let the VCG compose them. (6) Treat `malloc` as proportional to allocated elements; leave tuple construction free because the authors expect register allocation. The weakest-precondition condition requires actual cost to be no greater than available credit and subtracts it from the post-state (Section 3.4, PDF pp. 12–13).

Verus form (Inference): model credits as a ghost natural or map carried through contracts, and make each counted wrapper consume the corresponding ghost amount. Use `requires` for available budget, `ensures` for remaining budget and memory facts, and loop `invariant` clauses for repeated instructions. Verus can prove a source-level event-count bound; it does not automatically prove that LLVM optimization, cache misses, pipeline effects, or `malloc` implementation costs follow the abstract model.

Evidence and limits. The paper itself calls the model “at best, a rough approximation of the actual running time” because optimization and machine architecture matter (Section 3.3, PDF p. 12). It argues only a linear correlation to an upper bound under assumptions about instruction lowering and constant machine-instruction time. Thus the proved statement is an LLVM instruction-count theorem, not a hardware-time theorem.

## technique 4: heap nondeterminism refinement and Sepref synthesis

What it is. The `hnr` predicate connects an abstract NREST computation to a concrete heap program, preserving a refinement assertion and paying concrete costs with abstract advertised costs plus amortized credits. Sepref symbolically executes the abstract program, maintains representation relations, emits LLVM code, and emits an `hnr` proof.

How to apply it. (1) Give each abstract value a heap representation assertion. (2) Supply synthesis rules for `bind`, recursion, conditionals, loops, and atomic operations. (3) For `bind`, synthesize the first component, then the second, then free the intermediate representation; `MK FREE` proves the deallocator and permits prepaid amortization (Section 4.2, PDF p. 13). (4) Supply concrete rules such as array lookup, including its LLVM cost. (5) Extract a final Hoare triple when the abstract cost does not depend on the result.

The paper's rule is explicit: “The Sepref tool [14,15] automatically synthesizes a concrete program in the LLVM-monad from an abstract algorithm in the NREST-monad.” (Section 4.2, PDF p. 13). Verus form (Inference): write representation predicates as `spec fn`s over Rust values and ghost heap state, prove each operation's representation-preservation lemma, and keep deallocation obligations in ownership/permission proofs. A separate code generator would be needed to synthesize Rust from abstract specs; Verus itself checks the supplied Rust.

Evidence and limits. `hnr` can discard time credits but must explicitly free memory (Section 4.1, PDF p. 12). Composition has a supremum problem when a data relation is non-single-valued; the authors require an `attains_sup` witness and say this is automatic for single-valued relations or one-time (result-independent) bounds (Section 4.4, PDF pp. 14–15). This is a concrete limitation on generic composition.

## technique 5: introsort proof by phased refinement

The algorithm is refined from a slice-sorting specification into two phases. First, quicksort partitions recursively until a depth limit, then invokes heapsort; second, insertion sort finishes an almost-sorted slice. The quicksort recursion charges partition work proportional to slice length and fallback work `μ(n)`. The authors prove the bound by induction over recursion: “The correctness of the running time bound is proved by induction over the recursion of introsort rec.” (Section 5.3, PDF p. 15). Choose `μ(n)=n log n`, require superadditivity, and set depth (2\lfloor\log n\rfloor); the resulting recursion cost is (O(n\log n)). The final insertion pass is (O(τn)=O(n)) for constant threshold (τ) (Section 5.2, PDF p. 14).

Steps. (1) Prove the slice permutation/sortedness specification. (2) Define abstract almost-sort and final-sort phases. (3) Prove the recursive cost recurrence and depth computation. (4) Refine fallback to heapsort and partition to Hoare median-of-three partition. (5) Refine final insertion sort, including the unguarded optimization justified by the almost-sorted invariant. (6) Separate functional and resource proofs for the optimized `sift_down2`; combine them by transitivity (Section 5.5, PDF p. 16). (7) Instantiate arrays and 64-bit unsigned comparison, synthesize LLVM, and sum all currencies.

The concrete total is `4693 + 5 log n + 231 n + 455(n log n)` (Section 5.6, PDF p. 17), which the authors routinely prove (O(n\log n)). Verus form (Inference): encode sortedness/permutation and slice bounds as predicates, use recursive proof lemmas with `decreases`, and maintain loop invariants for partition, heap, and insertion loops. A resource ghost variable can mirror the recurrence; the LLVM-specific refinement and automatic synthesis do not carry over directly.

Evidence. Figure 1 measures arrays with (10^8) `uint64`s, displays the smallest of 10 runs, compiles with clang-10 `-O3`, and runs on an Intel Xeon E5-2699 with 128 GiB RAM and 256K/55M L2/L3 cache (Section 5.7, PDF p. 18). The three implementations (new Isabelle-LLVM, earlier no-time extraction, and libstdc++) have similar times; the paper says timing differences are within measurement noise. No denominator beyond the ten runs and no confidence interval is reported.

## what is proved, measured, and trusted

Proved: refinement from abstract sorting to LLVM, functional sorting correctness, instruction-count resource bounds, and (O(n\log n)) worst-case complexity. Measured: smallest runtime among ten runs for the stated machine and input distributions. Trusted or assumed: Isabelle/HOL, the LLVM semantics and code generator, the cost-model assumptions about lowering, the C library allocator behavior represented by `malloc`, compiler correctness, and the sorting specification itself. The paper's measured parity does not validate hardware-time upper bounds.

Inference: for VL, the main threat is model mismatch. Agent-written verified Rust can carry a precise source-event budget, but users may mistake it for wall-clock or denial-of-service protection unless the event model is tied to actual runtime behavior. Existing work already covers a complete verified introsort pipeline and should not be redone as a generic “verified sorting with complexity” demonstration. A useful VL adaptation would instead test whether Verus contracts and ghost budgets remain compositional through unsafe Rust representations and dependency changes.

## techniques for the catalog


- resource-aware nondeterministic specifications: associate each legal result with a supremum-composable resource bound in a monadic specification
- currency refinement: exchange abstract operation coins for concrete instruction or data-structure currencies along stepwise refinement
- LLVM cost semantics: charge each modeled instruction and prove Hoare triples with separation-logic time credits
- heap nondeterminism refinement: connect abstract computations to heap implementations while preserving representations and amortized credits
- phased introsort complexity proof: prove recursive partition/fallback and final insertion costs separately, then compose them into an (O(n\log n)) bound
Checked 2026-10-15 against paper haslbeck2021dollars: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
