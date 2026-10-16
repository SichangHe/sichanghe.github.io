# PinChecker: Identifying Unsound Safe Abstractions of Rust Pinning APIs
(authored by agents unless marked 🧑)
Tag: `dai2025pinchecker`, [paper](http://arxiv.org/abs/2504.14500v2)

## what the paper establishes

PinChecker searches Rust libraries for safe abstractions that violate `Pin`’s two contracts: a pinned value must not be moved, and a pinned value must eventually be dropped (the Drop Guarantee). It translates Rust MIR into a smaller Reference Provenance Intermediate Language (RPIL), then uses a reversible Prolog interpreter to synthesize short function-call programs that reach a violating state. The paper describes the goal as “automatically synthesizes minimal counterexample programs that expose unsound safe abstractions” (Section 3, p.3). This is bug-finding evidence, not a proof of pin soundness.

## technique 1: MIR-to-RPIL behavior extraction

what it is: RPIL keeps only reference creation, assignment, pinning, memory moves, and forget operations. Its atomic instructions are `BORROW`, `BIND`, `DEREF-PIN`, `DEREF-MOVE`, and `FORGET`; a context tracks variable types, reference graph, and value states. The paper says RPIL “eliminates nonessential details from MIR while adding capabilities to track reference targets and pinning state transitions” (Section 3.2.1, p.4).

when to use: use this when a library’s pin safety depends on how references move through nested fields and wrappers. MIR exposes operations but does not directly encode pinned states, so RPIL supplies the analysis vocabulary.

how to do it:
1. compile the crate with rustc and enumerate public functions
2. traverse each function’s MIR with Algorithm 1’s worklist, interpreting statements and following calls depth-first
3. linearize each control-flow path into one RPIL sequence; emit multiple variants for branches
4. split composite assignments into atomic field assignments and maintain label mappings
5. emit `BORROW`/`BIND` for reference introduction and transfer, `DEREF-PIN` for pinning through a reference, `DEREF-MOVE` for moves, and `FORGET` for destructor suppression (Algorithm 1 and Section 3.2.1, pp.4–5)

The paper’s `store_refs` example turns two stored mutable references into `BIND(_0[1][1], _1)` and `BIND(_0[2][1], _2)` (Figure 7, p.5). Its self-reference example reaches `v1:pinned_moved` after `DEREF-PIN(v2)` followed by `DEREF-MOVE(v2)` (Figure 5, p.4).

Inference: in Verus, RPIL’s reference graph corresponds to ghost ownership/provenance state, while pin transitions can be represented by a ghost pinned predicate and `requires`/`ensures` contracts. Inference: Verus proofs must establish these transitions for the actual Rust implementation; translating MIR to RPIL is only an analysis aid.

evidence: the expressiveness dataset contains 30 real pin-API usage examples; 27/30 (90%) were linearizable with semantics preserved, after MIR comparison and manual inspection (Section 5.3, p.10; Table 6 denominator is 30). The three failures all used closure-based APIs.

limits: RPIL currently models one-line linear programs and function-level behavior. Procedural macro-generated abstractions and closure/function-pointer parameters are outside its direct model (Section 6, p.10). Inference: a Verus integration must inspect expanded code and higher-order callback contracts separately.

## technique 2: reversible constraint interpreter for synthesis

what it is: PinChecker composes library functions into a program and reasons both forward from a call sequence and backward from a desired violating state. Prolog predicates encode type, liveness, borrows, state, and RPIL behavior. The paper states, “PinChecker’s program synthesis mechanism is based on constraint solving: it searches for function call sequences that satisfy specific constraint conditions by running the interpreter in reverse.” (Section 3.2.3, p.6).

how to apply it:
1. load each public function’s signature and RPIL variants
2. add default operations for borrowing (`&`, `&mut`), moving (`deref_move`), and forgetting (`forget`)
3. set a target such as `state(Prgm, _, pinned_moved)` or `pinned_forgotten`
4. run backward interpretation line by line to synthesize a sequence whose forward execution reaches that target
5. enforce the five rules below during search; stop at the first violating program and return it as a counterexample

Rule 1 requires arguments to be alive and well typed. Rule 2 marks return values alive and consuming arguments dead, except borrows. Rule 3 introduces reference edges for `BORROW` and transfers them for `BIND`; Rule 4 retracts edges when either endpoint dies. Rule 5 transitions values among initial, pinned, forgotten, pinned-moved, and pinned-forgotten states (Section 3.2.2, pp.5–6). A `DEREF-MOVE` through a reference to a pinned sublocation yields `pinned_moved`; `FORGET` after pinning yields `pinned_forgotten` (Figure 9, p.6).

Inference: a Verus repair agent can use synthesized call sequences as concrete counterexamples, then add a lemma or contract that blocks the sequence. Inference: the sequence is evidence that the safe abstraction is unsound under the modeled pin semantics; it does not prove all other sequences safe.

evidence: the tool found two confirmed issues in 13 evaluated crates. Bug 1 in `moveit` was an eight-call Move-after-Pin sequence and was fixed by removing the exposing function in version 0.6.0; Bug 2 in `rio` was a seven-line Pin-And-Leak sequence and corresponds to RUSTSEC-2020-0021 (Section 5.1, pp.8–9; Table 5 gives discovery times 2.4s and 0.6s).

limits: synthesis is bounded by a target length and a ten-hour per-crate runtime limit. It terminates when the constraint space is exhausted or the first violating program is found (Sections 3.2.3 and 4.2, pp.6–7). Inference: absence of a result is not evidence of soundness when the bound or model omits a needed API.

## technique 3: lazy liveness checking

what it is: the initial monolithic interpreter evaluates all five rules eagerly, but liveness rules are expensive. PinChecker therefore has a lazy variant that defers liveness verification while searching for state violations (Section 4.2, p.7).

how to apply it:
1. run the RPIL and state-transition constraints during candidate generation
2. postpone Rule 2 and Rule 4 checks until a candidate has a possible target state
3. validate liveness for the resulting candidate before reporting it
4. compare with eager mode when measuring completeness or investigating a suspicious candidate

The evaluation reports the lazy version is approximately 19.1 times as fast and uses about 5% of the monolithic runtime for target length five; Rule 5 receives 11.2% of computation versus 1.4% in eager mode (Section 5.2, p.10). These are relative measurements on the authors’ server and workload, not universal speed guarantees.

Inference: in Verus, this resembles delaying expensive proof obligations until a candidate trace is found, but Verus’s final checker must still discharge every required obligation. Inference: lazy search can improve agent throughput only if the final verification pass remains complete for the stated contract.

## technique 4: linearization and semantic expressiveness checking

what it is: PinChecker tests whether real API call sequences can be represented as one linear sequence of calls without changing semantics. For each example, the authors identify pin-related calls, rewrite them linearly, then compare MIR and manually inspect behavior (Section 5.3, p.10).

how to apply it:
1. collect examples from dependent crates and official documentation/tests
2. isolate a self-contained pin API call sequence
3. rewrite it into the tool’s linear form
4. compare original and rewritten MIR and manually inspect semantic equivalence
5. include only accepted sequences in expressiveness and synthesis claims

The dataset has 15 self-referential examples, nine async primitives, and six pin-safe data-structure examples; 14/15, 8/9, and 5/6 respectively were linearizable, totaling 27/30 (Table 6, p.10). Closure APIs account for all three non-linearizable cases.

Inference: for VL, this is a useful precondition check before asking an agent to synthesize or repair a proof: ensure the trace language captures callback and ownership behavior. Inference: traces omitted by linearization are a coverage gap, not a successful verification result.

## trust boundaries and implications for VL

PinChecker trusts rustc MIR extraction, the RPIL translation, its Prolog interpreter and five rules, the selected Rust pin semantics, and the library function set. The two reported issues were confirmed by maintainers or vulnerability records, but the 13-crate evaluation is not a prevalence estimate. The authors list macro abstractions, broader unsafe features, and more efficient constraint solving as future work (Section 6, p.10).

Inference: pinning is a direct product threat for agent-written verified Rust when unsafe wrappers expose `Pin::new_unchecked`, `get_unchecked_mut`, `mem::swap`, or `mem::forget` through safe APIs. VL should not redo generic API-composition synthesis as an isolated idea; PinChecker already supplies it. New work should connect counterexample traces to Verus contracts, cover closure and macro boundaries, and check that Drop and pin invariants survive dependency upgrades.

## techniques for the catalog

- MIR-to-RPIL extraction — linearize public Rust function paths into pin-relevant atomic operations and reference-state transitions
- reversible constraint synthesis — search backward from pinned-moved or pinned-forgotten states and execute candidates forward
- five-rule pin semantics — constrain typing, liveness, reference introduction/retraction, and pinned state transitions
- lazy liveness checking — defer expensive lifetime predicates until state-violating candidates are found
- linear expressiveness audit — compare rewritten call sequences with original MIR to quantify model coverage

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
