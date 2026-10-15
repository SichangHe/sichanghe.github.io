# Fuzz Driver Synthesis for Rust Generic APIs
(authored by agents unless marked 🧑)
Tag: `zhang2023fuzzdriver`, [paper](http://arxiv.org/abs/2312.10676v2)

## problem and result

Zhang, Wu, and Xu synthesize Rust fuzz drivers that exercise generic APIs after choosing concrete type arguments. A generic function can have many or infinitely many monomorphic instances; each instance may expose a different bug. The paper's abstract says: “By solving such dependencies and type constraints, we can generate a collection of candidate monomorphic APIs.” It then prunes versions whose trait implementations imply similar behavior and emits API-call sequences through RULF+.

The prototype has more than 3K lines of Rust, evaluates 29 open-source libraries, and reports 23 bugs, 18 related to generic APIs (Abstract and Sections 1, 5.4). This is a testing technique, not a proof technique: fuzzing finds executions and crashes but does not establish absence of failures. It is useful to Verus because generated drivers can supply adversarial instances and counterexamples before or alongside specification writing.

## technique: generic API dependency graph

What it is. The graph is `G=(N_A,N_T,E)`, with non-generic and generic API nodes, non-generic and generic type nodes, consumer edges from an API to required input types, producer edges from an API to returned types, and match edges from concrete types to generic types. The paper defines a valid sequence by reachability: “An API in the API sequence is said to be reachable if each of its input satisfy any one of the following criteria” (Section 2.2, p. 3), followed by primitive, produced non-generic, or matched generic cases.

How to apply it. Extract APIs, argument types, return types, generic parameters, trait bounds, and implementations from rustdoc. Add consumer edges for every input and producer edges for every output. Add a match edge when a concrete type can instantiate a generic type, such as `Vec<i32>` to `Vec<T>`. A sequence is valid only when each call's inputs are primitive, produced by a prior call, or obtained through a concrete-to-generic match. Keep nested returned types: calling a generic producer can create `Vec<Vec<T>>` and new graph nodes.

Verus form. Inference: the same graph can generate proof harnesses. Treat each verified function as a node with `requires` input predicates and `ensures` output predicates; connect producer outputs to consumer preconditions when the predicates and types match. A harness then calls only reachable instantiations. The graph does not prove the function contract, and Rust lifetime or ownership facts need additional Verus lemmas.

Evidence and limits. The paper's graph is built from rustdoc, whose missing third-party API information leaves edges absent. The authors explicitly report that this causes low coverage for APIs such as `axum-core` that consume `http::Request` (Section 5.2.2, pp. 7–8). Thus the graph is complete only for the extracted library boundary.

## technique: reachable monomorphic API search

What it is. The algorithm iterates to a fixed point over reachable concrete types. For each generic API, it matches every generic argument against all currently reachable types, intersects the resulting monomorphic solution sets across arguments, checks trait bounds, and adds newly reachable return types. The paper's algorithm initializes `reachableType = ∅` and repeats “until reachableType remains unchanged” (Algorithm 1, Section 3.2.1, p. 4).

How to apply it step by step. First mark primitive-producing and otherwise reachable non-generic APIs. Add each reachable return type to `reachableType`. For each generic API, start its common solution set at all-top (`(⊤,⊤,...)`). For each consumer edge, union `Match(ty,p)` over reachable types; intersect these sets across all arguments. For each candidate tuple, reject it unless all trait bounds hold. Monomorphize the API, retain it only if its concrete inputs are reachable, and add its return type. Repeat until no new type appears. Cap nested type depth to avoid infinite chains.

The matching operation returns a concrete substitution when a match edge exists and bottom otherwise. For `foo<T,U>(Vec<T>,U)`, the paper gives `Match(Vec<i32>,Vec<T>)=(i32,⊤)` and a mismatch with `Box<i32>` as `(⊥,⊥)` (Section 3.2, p. 3). Top denotes an arbitrary type and bottom denotes no valid type.

Verus form. Inference: instantiate generic Verus functions only with concrete types whose `requires` predicates can be constructed by earlier harness calls. Encode the fixed-point search as an executable Rust analysis and separately prove that every emitted call has the required type and precondition. Verus's generic bounds and `ensures` can reject invalid instantiations at compile time, but the paper's graph algorithm remains external tooling.

## technique: similarity pruning as set cover

What it is. Distinct monomorphic APIs can share a default or blanket trait implementation. The authors define the implementation set `Impls(gapi,m)` and greedily select a minimum-covering set of monomorphic solutions. The algorithm starts with no reserved APIs, selects a solution with maximum uncovered implementations, and reserves producer APIs needed to make selected arguments reachable. The paper states: “The idea of our algorithm is to cover all implementations of the minimum number of monomorphic solutions” (Section 3.3.1, p. 5).

How to apply it. For each generic API, compute each candidate's trait implementation set. Repeatedly choose the candidate covering the most not-yet-covered implementations, mark those implementations covered, and stop when all are covered. If no candidate is selected, retain one random candidate. Add selected APIs to the reserved set. Recursively reserve APIs that produce each selected input type, repeating until required and produced type sets stop changing. This is a greedy approximation because exact set cover is NP-hard.

Verus form. Inference: use the same cover to select representative verified instantiations, but only when a semantic argument supports equivalence. Shared trait implementation is evidence of shared dispatch, not proof that all generic behavior is equal: type-specific constants, associated items, specialization, and unsafe code can differ. A Verus harness should retain a counterexample-oriented sample of unselected types and prove any claimed equivalence separately.

Evidence and limits. Across 29 libraries, 6,371 monomorphic APIs are reduced to 1,911 reserved APIs, about 30% of the original count (Table 2 and Section 5.3, p. 8). The denominator is all 6,371 candidates produced by the search. The paper reports that `dlopen` reaches a best-case reserved ratio of 2% (Section 5.3), but it does not claim all selected implementations are behaviorally equivalent.

## technique: rustdoc extraction and conservative transformations

The implementation extracts source information through rustdoc and handles common type transformations before matching. The paper lists borrow transformations `T→&T` and `T→&mut T`, pointer transformations `T→*const T` and `T→*mut T`, and wrapper transformations `Result<T,E>→T` and `Option<T>→T` (Table 1, Section 4.2, p. 6). The trait checker is intentionally unsound because rustdoc exposes only a subset of implementations and associated items: “it may produce false positive results in some cases” (Section 4.2, p. 6).

Apply it by extracting public APIs and implementations, normalizing these wrappers and references before matching, then checking bounds. Track the source of every normalized edge so that a generated driver can construct the correct owned, borrowed, pointer, or unwrapped value. Inference: a Verus harness must preserve ownership and lifetime contracts rather than silently applying wrapper rules; `Option::unwrap` or pointer creation needs explicit preconditions and proofs.

## technique: bounded API sequence and fuzz configuration

After pruning, RULF generates sequences that cover each retained API if a valid sequence exists. The paper limits sequences to 300 and requires each generated sequence to include at least one monomorphic API (Section 4.3, p. 6). Drivers are built with `cargo afl build`; AFL++ runs each for 24 hours with `AFL_EXIT_WHEN_DONE=1` and `AFL_NO_AFFINITY=1` (Section 5.1.3–5.1.4, p. 6).

For the html2text case, `parse` creates a `RenderTree`, then `render` is called once with `RichDecorator` and once with `TrivialDecorator`; the paper says the former triggers overflow and the latter an infinite loop (Section 5.4.2, pp. 8–9). This demonstrates why retaining multiple trait implementations matters.

## evidence, assumptions, and threat to VL

The experiment uses two 20-core Xeon Gold 6242 CPUs, 256 GB RAM, and Ubuntu 20.04 (Section 5.1.1, p. 6). The 29-library denominator includes 7,710 APIs and 2,609 generic APIs. Total API coverage is 0.66 and generic API coverage 0.27; per-library ranges are 0.01–0.96 and 0.01–0.75 respectively (Table 2, p. 7). RULF+ emits 2,566 drivers, 103 invalid, so the invalid fraction is 103/2,566 ≈ 0.04; the text calls the ratio “0.04” (Section 5.2.1). Fuzzing finds 23 bugs, 10 confirmed by maintainers at submission, with categories 2 UTF-8, 9 arithmetic overflow, 6 out-of-memory, 2 index-out-of-bounds, and 4 other (Section 5.4.1, p. 8); these sum to 23. The 18 generic-related bugs are a subset of the 23, not an additional denominator.

Inference: for VL, this is a practical generator of typed, ownership-aware test harnesses that can expose missing Verus preconditions and generic corner cases. Its largest threat is false confidence from the unsound trait checker and incomplete third-party extraction. An agent-generated proof may verify a single selected instantiation while an omitted implementation violates the contract. The workflow should therefore record all candidate and pruned instantiations, use the official compiler for trait validation, and treat fuzz crashes as specification evidence rather than proof failures.

## what VL should not redo

RULF+ already provides generic API graph construction, fixed-point reachability, trait-bound filtering, greedy implementation-cover pruning, bounded sequence synthesis, and a 29-library evaluation. VL need not reproduce this fuzz-driver system unless it adds verified contract generation or complete dependency extraction. The reusable gap is connecting the generated sequences to Verus `requires` construction and counterexample minimization.

## techniques for the catalog

- generic API dependency graph — model API consumers, producers, concrete-to-generic matches, and valid call reachability
- fixed-point monomorphization — iteratively infer reachable concrete type substitutions, enforce trait bounds, and cap nested types
- implementation-cover pruning — greedily retain monomorphic APIs that cover distinct trait implementations and reserve their producers
- rustdoc normalization — extract APIs and apply explicit borrow, pointer, and wrapper type transformations
- bounded fuzz-driver synthesis — generate at most 300 reachable sequences and fuzz each selected generic instance
- generic differential bug triggering — exercise multiple trait implementations of one API to expose implementation-specific failures
Checked 2026-10-15 against paper zhang2023fuzzdriver: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
