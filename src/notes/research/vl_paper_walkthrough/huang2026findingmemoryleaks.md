# Finding Memory Leaks in C/C++ Programs via Neuro-Symbolic Augmented Static Analysis
(authored by agents unless marked 🧑)
Tag: `huang2026findingmemoryleaks`, [paper](https://doi.org/10.1145/3377811.3380396)

## system and evidence

M⟂EM H⟂INT combines LLM code understanding with Z3 symbolic checks and existing static analyzers to find leaks through project-specific allocators and deallocators. The paper’s central claim is that semantic guesses must be checked before they influence analysis: “We thus complement them with a symbolic component that validates each LLM-generated annotation and filters analyzer output against path feasibility constraints using the Z3 Satisfiability Modulo Theories (SMT) solver.” (Section 1, p. 2). The pipeline has three stages: summary generation, summary-augmented analysis, and warning validation.

The evaluation covers eight open-source C/C++ projects totaling more than 3.6 million lines. It reports 54 unique leaks, all confirmed or fixed by maintainers or submitted patches; vanilla CodeQL finds 19, Infer 3, Semgrep 2, and LeakGuard 20 (Section 1, p. 2; Table 2, p. 9). The paper’s summary-quality sample contains 1,532 manually labelled functions. It uses Gemini 3 Flash for summary generation and a second LLM pass for warning validation (Section 4.1, p. 8).

## technique 1: generate analyzer-agnostic memory-management summaries

what it is

The system parses each function and its callees, asks an LLM to classify it as allocator, deallocator, or neither, and emits a structured summary. A summary records `name`, `role` (ALLOCATOR or DEALLOCATOR), and `target` (`return` for allocator ownership or `arg<i>` for the freed argument). The paper says: “A function summary is an analyzer-agnostic annotation that records the function’s MM role (allocator or deallocator) and which argument or return value carries memory ownership.” (Section 3.1, p. 4).

when to use it

Use this when an analyzer lacks project-specific wrappers around malloc/free or equivalent primitives. Restrict generation to likely candidates to control cost, but retain macros because they may hide pointer operations.

how to do it

1. Parse functions, signatures, bodies, direct callees, macros, and pointer typedef aliases with Tree-sitter (Section 3.1, p. 4).
2. Pre-filter to functions whose signatures involve pointer types; always retain macros; exclude entry points and test functions (Section 3.1, p. 4).
3. Give the LLM the signature, full body, and up to five direct callees. The paper emphasizes callee context for non-local ownership semantics (Section 3.1, p. 4).
4. Discard “neither” results and keep structured allocator/deallocator summaries (Section 3.1, p. 4).
5. Example: the paper gives `{name: freerdp_certificate_clone, role: Allocator, target: return}` when the function calls an allocating helper and returns its pointer, and a deallocator targeting `arg0` for a freeing wrapper (Section 3.1, p. 4).

The component alone achieves 92.0% precision and 100.0% recall on MM-versus-non-MM classification over the 1,532-function sample (Table 3, p. 9). LeakGuard’s corresponding values are 78.1% precision and 59.9% recall. These figures evaluate classification, not leak-finding soundness.

Verus form

Inference: In Verus, represent ownership summaries as specifications around wrapper functions: an allocator’s `ensures` can state that the returned value satisfies an ownership predicate, while a deallocator’s contract can require a live resource and ensure it is consumed. Rust’s ownership system already rejects many double-free patterns, but custom resource wrappers still need contracts. The paper does not discuss Rust or Verus; this is an inferred adaptation.

limits and assumptions

LLM labels can be wrong, and names do not guarantee allocation. A summary can be syntactically plausible while the claimed operation is unreachable. The pre-filter also excludes non-pointer signatures, so hidden ownership conveyed through integers or global state is outside this design.

## technique 2: validate summaries with CFG reachability in Z3

what it is

Each candidate summary is checked against an intraprocedural control-flow graph. Branches become Boolean variables; the solver asks whether at least one path reaches the claimed allocation or deallocation with the relevant ownership flow. Summaries without a satisfiable path are discarded before analyzer injection.

how to do it

1. Build a CFG with ENTRY/EXIT nodes and typed nodes for allocation, free, return, branch, assignment, and dereference (Section 3.1, pp. 5–6).
2. Give each branch a Boolean `bᵢ`; a path condition is the conjunction of `bᵢ` or `¬bᵢ` according to the taken edge (Section 3.1, p. 5).
3. For allocator summaries, require a satisfiable path where a known allocation (or transitively identified wrapper) reaches return without overwrite or release. The paper formalizes this as “An allocator summary is valid if and only if” a path and allocation satisfy the reachability predicate (Equation 1, p. 5).
4. For deallocator summaries, track aliases derived from argument `i`, follow assignments and transitive call chains up to depth 10, and require a satisfiable path where an alias reaches a known free primitive (Section 3.1, p. 6).
5. Retain SAT summaries and discard UNSAT summaries (Section 3.1, p. 5).

The full LLM-plus-Z3 “Validated MM” criterion reaches 100.0% precision and 100.0% recall on the 1,532-function sample (Table 3, p. 9). The denominator is the manually labelled sample; it does not establish soundness for all functions or deeper heap semantics.

Verus form

Inference: Encode a Rust wrapper’s control-flow assumptions as `requires` and use proof functions or loop `invariant` clauses to show that a resource reaches a return or is consumed on a permitted path. Verus’s SMT backend can discharge Boolean path conditions, but ownership and alias facts must be stated in valid Rust/Verus contracts. Do not treat an LLM summary as a trusted `external_body`; the summary must be proved or independently reviewed.

limits and assumptions

The symbolic layer is deliberately lightweight. The paper says: “Branch conditions are treated as uninterpreted Boolean variables in Equations 1–2, so the solver discards a warning only when no control-flow path structurally reaches the leak while leaving the object allocated, unfreed, and unescaped.” (Section 6, p. 11). It cannot refute a path using numeric or pointer semantics alone, and its alias analysis is intraprocedural and identifier-based.

## technique 3: inject summaries into complementary analyzers

what it is

Validated summaries extend CodeQL’s allocation/deallocation models and Infer Pulse’s ownership models without changing source code. CodeQL uses `allocationFunctionModel` and `deallocationFunctionModel`; Infer uses Pulse allocation and deallocation pattern flags (Section 3.2, pp. 6–7).

how to do it

1. Translate each analyzer-agnostic summary to the target extension format (Section 3.2, p. 6).
2. Run CodeQL and Infer with the injected models (Section 3.2, p. 6).
3. Use extended CodeQL queries for branch-specific leaks, error paths, and conditionally skipped frees (Section 3.2, p. 6).
4. Retain analyzer warnings for the next feasibility stage.

Table 4 shows the summary-generation funnel: 99,648 extracted functions become 88,474 pointer candidates, 15,198 LLM summaries, and 5,382 Z3-validated summaries. The reductions are 11.2%, 82.8%, and 64.6% respectively (Table 4, p. 9). Across eight projects, injected summaries enable 54 confirmed/fixed bugs versus 19 for vanilla CodeQL and 3 for vanilla Infer (Table 2, p. 9).

Verus form

Inference: The analogous VL pattern is to keep a tool-independent resource contract, then instantiate it in Verus modules for each Rust API. Rust type and trait structure replaces analyzer-specific extension files, while the contract remains the authority shared by proof and checking tools.

## technique 4: filter warnings by path feasibility and LLM review

what it is

For every static-analysis leak warning, M⟂EM H⟂INT rebuilds a CFG and uses Z3 to determine whether an execution path can reach an exit with allocation true, freed false, and escaped false. It then asks an LLM to validate surviving warnings using the function body and trace.

how to do it

1. Parse the flagged function and construct its CFG (Section 3.3, p. 7).
2. Encode one-path reachability and the three abstract state predicates (alloc, freed, escaped) in Z3 (Section 3.3, pp. 7–8).
3. Discard warnings with no SAT leak path; retain SAT warnings (Section 3.3, p. 8).
4. Provide surviving warning location, analyzer path, code snippets, and function context to the warning-validation LLM (Appendix A.2; Section 3.3).
5. Manually validate final warnings and report confirmed bugs (Section 4, p. 8).

Table 5 aggregates 4,715 CodeQL warnings and 4,562 Infer warnings. Z3 leaves 688 and 742 respectively, reductions of 85.4% and 83.7%; LLM validation leaves 81 and 67; manual validation confirms 44 CodeQL bugs (54.3% of 81) and 31 Infer bugs (46.3% of 67). A random sample of 50 warnings rejected by the LLM contained no true bugs on manual inspection, but that sample is not a proof of zero false negatives (Section 4.4, p. 10).

Verus form

Inference: For verified Rust, use proof obligations to show that a reported resource leak path is feasible, and encode state transitions in loop `invariant` clauses. A model-generated warning explanation can prioritize review, but only a Verus proof and executable regression test should accept it. The paper’s LLM review remains an untrusted triage layer.

limits and assumptions

The warning filter over-approximates heap state and defers semantically incorrect but feasible summaries to the LLM. The system targets C/C++ parseable by Tree-sitter and buildable by CodeQL or Infer; use-after-free and double-free are future work (Section 6, p. 11). Summary generation costs $87.01 total (about $10.9 per project and 2.1 hours per project); warning validation costs $3.44 for CodeQL and $3.42 for Infer, while static phases are about 35 and 38 minutes per project. These are the paper’s eight-project setting and model choices.

## what is proved, measured, and trusted

The paper demonstrates empirical bug finding and component ablations; it proves only the stated SAT path predicates under its abstraction, not complete memory safety. Trusted elements include Tree-sitter parsing, Z3’s solver checks, analyzer behavior, and human confirmation. LLM summaries and warning judgements are untrusted until symbolic or human checks. The main product threat is an incorrect but feasible summary: Z3 checks reachability, not semantic ownership correctness. Inference: VL can reuse the staged LLM proposal, symbolic gate, analyzer, path gate, and human/proof review architecture, but must map resource claims to valid Verus contracts and avoid accepting model output as proof.

## what VL should not redo

The paper already provides an analyzer-agnostic summary schema, CFG-based SAT validation, path-feasibility warning filtering, and evidence that combining semantic and symbolic stages improves detection. VL should focus on Rust resource models, contract authority, and proof-backed validation rather than recreate a generic LLM classifier.

## techniques for the catalog

- analyzer-agnostic ownership summaries — represent allocator/deallocator roles and ownership targets independently of a specific checker
- CFG/SAT summary validation — retain an LLM summary only when a feasible path satisfies its allocation or deallocation claim
- summary-augmented static analysis — inject validated summaries into complementary analyzers to expose custom wrappers
- path-feasibility warning filtering — use symbolic state reachability to discard infeasible leak reports before expensive review
Checked 2026-10-15 against paper huang2026findingmemoryleaks: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
