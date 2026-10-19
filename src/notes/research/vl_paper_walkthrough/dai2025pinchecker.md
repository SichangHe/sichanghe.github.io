# PinChecker: Identifying Unsound Safe Abstractions of Rust Pinning APIs
(authored by agents unless marked 🧑)
Tag: `dai2025pinchecker`, [paper](https://arxiv.org/abs/2504.14500v2)

## what the paper establishes

PinChecker searches Rust libraries for safe abstractions that violate the pinning API contract. The authors describe two violation categories: moving a pinned value and failing to guarantee its destruction (the Drop Guarantee). It translates Rust MIR into Reference Provenance Intermediate Language (RPIL), then uses a reversible Prolog interpreter to synthesize short function-call programs that reach a violating state. The paper describes the approach as “automatically synthesizes minimal counterexample programs that expose unsound safe abstractions” (Section 3, p.3). Inference: finding counterexamples establishes defects within the model; unsuccessful search does not prove pin soundness.

## technique 1: MIR-to-RPIL behavior extraction

what it is: RPIL represents reference creation, assignment, pinning, memory moves, and destructor suppression. Its atomic instructions are `BORROW`, `BIND`, `DEREF-PIN`, `DEREF-MOVE`, and `FORGET`; a context tracks live variables and their types, a reference graph, and value states. The paper says RPIL “eliminates nonessential details from MIR while adding capabilities to track reference targets and pinning state transitions” (Section 3.1, p.4).

Inference: use this abstraction when a library’s pin safety depends on references passing through nested fields and wrappers. MIR exposes memory operations but does not directly express pinned states (Section 3.1, p.4).

how to do it (Section 3.1, Algorithm 1, pp.4–5; implementation in Section 4.1, pp.7–8):
1. use the crate’s `Cargo.toml` to obtain compilation arguments; extract MIR for public functions through `rustc_private`
2. traverse each function’s MIR with Algorithm 1’s worklist, interpreting statements, following calls, and returning to callers
3. enumerate control-flow paths depth-first, translating each path into a linear RPIL variant
4. split composite assignments into atomic field assignments and maintain mappings between MIR locals and RPIL labels
5. record reference introduction and transfer with `BORROW` and `BIND`, pinning with `DEREF-PIN`, moves through references with `DEREF-MOVE`, and destructor suppression with `FORGET`

The `store_refs` example yields `BIND(_0[1][1], _1)` and `BIND(_0[2][1], _2)` (Figure 7, p.5). The example in Figure 5 reaches `v1:pinned_moved` after `DEREF-PIN(v2)` followed by `DEREF-MOVE(v2)` (p.4).

Inference: in Verus, an adaptation could represent RPIL’s reference relationships and pin states with ghost state and function contracts. Proving those contracts for the actual Rust implementation would remain separate from extracting an RPIL model.

limits: RPIL represents paths as linear call sequences. The authors report that closure-based APIs require multiple function definitions, beyond the current model (Section 5.3, p.10). They also identify procedural macro abstractions as a limitation and propose analysis after macro expansion (Section 5.4.2, p.11). Inference: a Verus adaptation would need separate support for these cases.

## technique 2: reversible constraint interpreter for synthesis

what it is: PinChecker reasons forward from a call sequence and backward from a desired violating state. Prolog predicates encode types, liveness, reference relationships, value states, function signatures, and RPIL instructions (Table 2, p.6). The paper states, “PinChecker’s program synthesis mechanism is based on constraint solving: it searches for function call sequences that satisfy specific constraint conditions by running the interpreter in reverse.” (Section 3.2.3, p.7).

how to apply it (Sections 3.2–4.3, pp.5–8):
1. extract public function signatures and RPIL variants; select up to ten library functions, prioritizing safe functions with internal unsafe blocks
2. add four default functions: borrowing (`&`, `&mut`), moving (`deref_move`), and forgetting (`forget`)
3. choose a target state, `pinned_moved` or `pinned_forgotten`; the paper illustrates `state(Prgm, _, pinned_moved)`
4. fix the program length and synthesize backward, from the final line toward the first, subject to the five rules below
5. start with length one and increase it by one after unsuccessful search; stop at the first violating program

Rule 1 requires well-typed, live arguments and a satisfiable function type signature. Rule 2 makes well-typed return values live and consumed arguments dead; `borrow` and `borrow_mut` do not consume their arguments. Rule 3 introduces reference edges for `BORROW` and transfers them for `BIND`; Rule 4 retracts edges when either endpoint’s variable dies. Rule 5 tracks initial, `pinned`, `forgotten`, `pinned_moved`, and `pinned_forgotten` states (Section 3.2.2, pp.6–7).

Moving a value through a reference also affects its internal subplaces: the example moves `v1` and marks its pinned field `v1[1]` as `pinned_moved`. Figure 9 also represents both pin-then-forget and forget-then-pin transitions to `pinned_forgotten` (p.7).

The authors report two confirmed issues among 13 selected crates. Table 5 gives an eight-line Move-After-Pin case taking 2.4 seconds and a seven-line Pin-And-Leak case taking 0.6 seconds (p.9). For `moveit` v0.5.1, Figure 11 shows eight calls; the authors say developers removed `new_unchecked_hygine_hack` in v0.6.0 (Section 5.1, p.9). For `rio` v0.9.4, they identify the existing RUSTSEC-2020-0021 issue (pp.9–10).

The paper has reporting inconsistencies: Table 5 reports seven lines for `rio`, but Figure 12 displays twelve `let` statements (pp.9–10). Table 3 lists 13 crates, including `pinus`, while Table 4 has twelve rows and omits `pinus` (p.9). Inference: these inconsistencies limit how precisely the study can state per-crate coverage and the `rio` counterexample length.

limits: synthesis requires a fixed target length for each search; the evaluation imposes ten hours per crate (Sections 4.2 and 4.4, p.8). The authors claim termination when the constraint space is exhausted (Section 3.2.3, p.7). Inference: that statement does not establish completeness for unbounded call sequences or omitted functions.

Inference: a Verus repair agent could use a synthesized trace to locate an unsound wrapper and guide a repair. A proposed contract must hold for the implementation and its safe callers; merely excluding the counterexample from the model would not repair the library.

## technique 3: lazy liveness checking

what it is: the initial monolithic interpreter combines all five rules. The authors found Rules 2 and 4 expensive and introduced a variant that defers liveness verification (Section 4.2, Figure 10, p.8).

how to apply it:
1. search using typing, reference introduction, state transitions, and the target violation constraint
2. defer the liveness and reference retraction checks represented by Rules 2 and 4
3. check liveness before returning a violation program

These steps follow Figure 10 (p.8). The performance comparison searches target lengths one through eight; a separate instrumentation experiment fixes length five. For that experiment, the authors report approximately 19.1 times the speed, about 5% of runtime, and a Rule 5 computation share of 11.2% versus 1.4% without lazy checking (Section 5.2, Figures 13–14, p.10). Inference: these relative measurements do not establish the same speedup for other workloads.

Inference: a Verus adaptation could postpone expensive checks until a candidate trace exists, provided the final verification still checks every obligation required by the claimed contract.

## technique 4: linearization and semantic expressiveness checking

what it is: the authors evaluate whether real pin-API call sequences can be represented linearly without changing semantics (Section 5.3, p.10).

how they evaluate it:
1. collect 18 examples from dependent crates and twelve from official documentation and tests
2. isolate a self-contained sequence of calls to pin-related APIs
3. rewrite each sequence in linear form while preserving its semantics
4. compare MIR and inspect the result manually to assess semantic equivalence
5. report both successful and unsuccessful rewrites

Table 6 contains 15 self-referential-struct examples, nine async-primitive examples, and six pin-safe-data-structure examples. Respectively, 14, eight, and five were linearizable: 27/30, or 90%. All three unsuccessful cases involved closure-based APIs (Section 5.3, Table 6 and Figure 15, p.10).

## techniques for the catalog

- MIR-to-RPIL extraction — linearize public function paths into pin-relevant atomic operations and reference-state transitions
- reversible constraint synthesis — search backward from pinned-moved or pinned-forgotten states using a relational interpreter
- five-rule pin semantics — constrain typing, liveness, reference introduction/retraction, and pin-state transitions
- lazy liveness checking — defer liveness checks until candidate violation programs are generated
- linear expressiveness audit — compare rewritten call sequences with original MIR and manually inspect semantic equivalence
