# DR. CHECKER: A Soundy Analysis for Linux Kernel Drivers
(authored by agents unless marked 🧑)
Tag: `machiry2017drchecker`, [paper](https://www.usenix.org/conference/usenixsecurity17/technical-sessions/presentation/machiry)

## scope and result

DR. CHECKER is a modular LLVM-bitcode static analyzer for Linux drivers. It combines flow-, context-, and field-sensitive points-to and taint analyses with pluggable vulnerability detectors. The authors call it “soundy (i.e., mostly sound)” (abstract, p.1007): it sacrifices soundness under three explicit assumptions to keep analysis scalable and precise. The evaluation covers 437 drivers from nine mobile kernels, over 3.1 million lines of code, and reports 158 previously unknown bugs with 3,973 correct warnings (5,071 total; Table 4, p.1019), an overall precision of 78% (abstract, p.1007).

Inference: the result is bug finding, not a proof that a driver satisfies a complete safety contract. A VL pipeline could use the same analysis to prioritize proof obligations, while Verus proofs would need explicit contracts and invariants for the reported paths.

## technique: soundy driver traversal

What it is and when to use it. Instead of running each client to a global fixed point and then detecting bugs, DR. CHECKER performs one shared traversal of a driver CFG and invokes analysis clients at each instruction. The clients share global state, so taint and points-to information are available immediately. This avoids forcing every client to the precision of the least precise analysis. The paper says: “This also allows all of the analyses, or clients, to consume each other’s results whenever the results are needed, and without loss of precision.” (§3.2, p.1011).

Steps from Algorithm 1 (§3.2, pp.1010–1012).
1. Build a CFG and topologically sort its strongly connected components with Tarjan's algorithm.
2. Create points-to state for globals, traverse all driver initialization functions, add taint for entry arguments, then analyze each entry point.
3. Visit each SCC; visit every basic block and instruction, dispatching the instruction to all clients with the current context and global state.
4. For a loop SCC, compute the longest use-definition chain and traverse the SCC that many times, the reach-definition bound used by the implementation.
5. For a direct in-driver call, extend the context with the call site and propagate argument/global maps; resolve indirect calls by matching function-pointer types and referenced functions.
6. Mark each call site visited once per context, then run vulnerability detectors over the accumulated state.

The soundy assumptions are explicit: core-kernel APIs and their usages are assumed correct; most are not analyzed, with modeled exceptions such as memory-copy operations; loops use only reach-def traversals rather than a points-to fixed point; and each call is traversed once even in loops (§3.2, p.1009). The paper notes that the last two choices can be unsound but avoid unconstrained growth and context explosion.

Verus form (inference). A Verus implementation would represent each abstract state as a mathematical map and prove transfer lemmas for each instruction. A `proof fn` can show that a transfer preserves an abstraction invariant; a loop needs `invariant` clauses and a proven bound. Verus does not provide a built-in LLVM traversal or soundy approximation, so this is a design pattern rather than a direct API translation.

## technique: field- and context-sensitive points-to analysis

What it is and when to use it. The points-to map maps each value to possible alias objects and field offsets. An alias object stores an offset map to other objects and a taint map per offset, which preserves field sensitivity. Stack locals get one object each, heap allocations get one object per allocation site and context, and globals get unique objects (§3.1, pp.1010–1011). Context is the ordered call-site list from an entry function, so repeated calls are distinguished.

Steps from Definitions 3.7–3.9 and Algorithm 2 (§3.1, §3.3, pp.1010–1013).
1. Allocate alias objects for locals, allocation sites, and globals; attach context and call-site identity.
2. Represent each value as a set of `(offset, alias-object)` pairs.
3. For `alloca`, map the result to a fresh zero-offset object; for binary operations, merge pointed-to objects at offset zero.
4. For `load`, fetch each possible object/offset and add the object's fields at offset zero to the loaded value.
5. For `store`, add the stored value's possible objects to every target object at the destination offsets.
6. For `getelementptr`, Algorithm 2 fetches the alias objects referenced at each base offset, then pairs those objects with the requested offset; it does not add that offset to the base offsets.

The motivating Huawei bug requires all three sensitivities: a tainted structure field overflows during multiplication, then a different function copies too much data. The paper says it is “likely only possible to detect and report concisely with an analysis that is flow-, context-, and field-sensitive.” (§2, p.1009).

Verus form (inference). Encode alias objects and offsets as ghost/spec maps and prove each transfer relation. Rust ownership can eliminate some aliases, but unsafe pointers and FFI still need explicit validity and non-aliasing predicates. A Verus proof would establish a concrete memory operation refines the abstract points-to state; the paper's LLVM transfer functions are not themselves Verus constructs.

## technique: taint propagation and traceable detectors

What it is and when to use it. Taint traces map a value to the instructions that introduced taint. Entry points are seeded according to Linux driver operation type: direct user arguments for read/write/ioctl and indirect pointers for attribute and socket operations (Table 1, p.1016). Taint transfer functions then propagate sources through binary operations, loads, stores, and GEP; detector policies decide which sinks are dangerous.

The detector plugins include Improper Tainted-Data Use, Tainted Pointer Dereference, Tainted Size, Uninitialized Leak, Tainted Arithmetic, Tainted Loop Bound, Invalid Cast, and Global Variable Race detectors (§4, pp.1014–1015). A warning includes source line, function, detector, and a complete taint trace; Listing 7 shows this format (p.1021). The architecture makes adding a detector practical: the authors report that they deployed Global Variable Race Detector in under 30 minutes (§4, p.1014).

Steps.
1. Identify driver source files, compile ARM32/ARM64 LLVM bitcode, and link vendor files (§5.1, p.1015).
2. Parse kernel headers with `c2xml` to find operation-structure offsets and discover entry functions (§5.2, p.1016).
3. Seed direct or indirect taint according to the entry-function type (§5.3, p.1016).
4. Apply Algorithm 3 transfer functions to every instruction during SDT traversal.
5. Run detector-specific policies at tainted sinks and retain the trace for triage.

Verus form (inference). Define a ghost taint map and `spec fn` transfer functions; prove detector lemmas such as a tainted length cannot reach a copy without a checked bound. Executable Rust remains separate from ghost state. This can guide proof obligations but cannot prove the paper's soundy analysis assumptions.

## evidence, limitations, and product implications

Table 4 reports counts with denominators: 5,071 warnings, 3,973 confirmed-correct traces, and 158 confirmed zero-day bugs across Huawei, Qualcomm, Mediatek, and Samsung drivers (p.1019). The 78% precision in the abstract is 3,973/5,071, rounded. The authors compare four tools; their total warning counts are 242 for cppcheck, 44,900 for flawfinder, 8,968 for RATs, and 31,929 for Sparse (Table 2, p.1017), but those are warnings, not confirmed bugs. After noting that seven of the 158 bugs had CVE identifiers, the paper says Sparse found one, flawfinder three, RATs one, and cppcheck none of these (§7.1, p.1019).

Table 4’s per-chipset bug totals (78, 19, 44, 24) sum to 165, while its overall bug count and detector totals give 158; the paper does not reconcile that difference. Table 2 warning totals also differ from surrounding narrative totals for several comparison tools. The limitations are material. The analyzer treats each entry point independently and misses state-dependent bugs; assumes kernel APIs are correct and misses improper API usage; and targets input-validation bugs, so it misses side channels and access-control errors (§6, p.1017). In the comparison with a configuration called “sound”, only 18 of 100 entry points completed within four hours when kernel APIs were included and fixed-point loops were used (Table 5, p.1020); the soundy configuration averaged 35.320 seconds, versus 175.823 seconds for the 18 completed sound runs (Table 5, p.1020). These denominators make the runtime comparison incomplete. The configuration called “sound” still omitted kernel API definitions that LLVM failed to compile, so it is not evidence of full soundness (section 7.2, p.1020).

Inference: agent-written verified Rust faces a different threat: a warning-oriented, assumption-heavy analyzer cannot replace Verus contracts for safety-critical code, but its modular taint and points-to summaries can identify where contracts and `proof fn` lemmas are needed. Existing work already demonstrates pluggable flow/context/field-sensitive analyses and traceable warnings; VL should reuse the engineering pattern rather than claim the detector architecture as new.

## techniques for the catalog

- soundy shared traversal — share state across analysis clients and bound loop traversals using reach-def analysis, accepting explicit sources of unsoundness
- field/context-sensitive points-to — represent alias objects by field offset and call context
- taint trace propagation — seed user-controlled entry arguments and propagate instruction-level traces
- pluggable vulnerability detectors — attach detector policies to abstract state and emit traceable warnings
- driver extraction pipeline — identify vendor files and entry points, compile LLVM bitcode, then seed taint by operation type
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "To analyze the drivers independently, we must first differentiate driver source code files from that of the core kernel code."): checked the entire extracted paper, algorithms, quotations, counts, pages, limitations, tag and publisher link; corrected shared-traversal quotation, initialization order, GEP transfer, Sparse comparison, page references and completeness language; exposed unreconciled table totals; did not execute the analyzer, re-triage warnings, or independently prove transfer-function soundness.
