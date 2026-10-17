# DR. CHECKER: A Soundy Analysis for Linux Kernel Drivers
(authored by agents unless marked 🧑)
Tag: `machiry2017drchecker`, [paper](https://www.usenix.org/conference/usenixsecurity17/technical-sessions/presentation/machiry)

## scope and result

DR. CHECKER is a modular LLVM-bitcode static analyzer for Linux drivers. It combines flow-, context-, and field-sensitive points-to and taint analyses with pluggable vulnerability detectors. The authors call it “soundy (i.e., mostly sound)” (abstract, p.1007): it sacrifices soundness under three explicit assumptions to keep analysis scalable and precise. The evaluation covers 437 drivers from nine mobile kernels, over 3.1 million lines of code, and reports 158 previously unknown bugs with 3,973 correct warnings (5,071 total; Table 4, p.1019), an overall precision of 78% (abstract, p.1007).

## technique: soundy driver traversal

What it is and when to use it. Instead of running each client to a global fixed point and then detecting bugs, DR. CHECKER performs one shared traversal of a driver CFG and invokes analysis clients as instructions are visited. The clients share global state, so taint and points-to information are available immediately. The authors argue that this avoids limiting every client to the precision of the least precise analysis. The paper says: “This also allows all of the analyses, or clients, to consume each other’s results whenever the results are needed, and without loss of precision.” (§3.2, p.1011).

Steps from §§3.1–3.2 (pp.1010–1012; Algorithm 1, p.1011).
1. Create points-to state for globals, traverse all driver `.init` functions, add taint for entry arguments, then analyze the entry point independently.
2. For each function, topologically sort the CFG's strongly connected components (SCCs) with Tarjan's algorithm.
3. Visit each SCC's basic blocks and instructions with the current context and global state. Handle calls and returns separately; dispatch other instructions to analysis clients.
4. For a loop SCC, traverse it as many times as the longest use-definition chain, the paper's bound for reaching a reach-def fixed point.
5. For a direct in-driver call, extend the context with the call site and propagate argument/global maps. Resolve indirect calls to same-driver functions with matching types that are referenced by non-call instructions.
6. Analyze each call instruction once per context. Detectors run continuously during traversal, using updated client results (§4, p.1014).

The soundy assumptions are explicit: core-kernel APIs and their usages are assumed correct; most are not analyzed, with modeled exceptions such as memory-copy operations; loops use only reach-def traversals rather than a points-to fixed point; and each call is traversed once even in loops (§3, p.1009; §§3.2–3.3, pp.1011–1013). The authors explain the once-per-call restriction as: “This is to avoid creating additional contexts and limit false positives, which may result in our analysis being unsound.” (§3, p.1009).

Inference: A Verus implementation would represent each abstract state as a mathematical map and prove transfer lemmas for each instruction. A `proof fn` can show that a transfer preserves an abstraction invariant; a loop needs `invariant` clauses and a proven bound. This proposes a proof structure; the paper does not implement or evaluate Verus.

## technique: field- and context-sensitive points-to analysis

What it is and when to use it. The points-to map maps each value to possible alias objects and field offsets. An alias object stores an offset map to other objects and a taint map per offset, which preserves field sensitivity. Stack locals get one object each, heap allocations get one object per allocation site and context, and globals get unique objects (§3.1, pp.1010–1011). Context is the ordered call-site list from an entry function, so repeated calls are distinguished.

Steps from Definitions 3.7–3.9 and Algorithm 2 (§3.1, §3.3, pp.1010–1013).
1. Allocate alias objects for locals, allocation sites, and globals. Distinguish stack and heap objects by context, heap objects additionally by allocation site, and globals by variable identity.
2. Represent each value as a set of `(offset, alias-object)` pairs.
3. For `alloca`, map the result to a fresh zero-offset object; for binary operations, merge pointed-to objects at offset zero.
4. For `load`, fetch the objects referenced by each possible source object/offset and add zero-offset pairs for those objects to the result's points-to set.
5. For `store`, add the stored value's possible objects to every target object at the destination offsets.
6. For `getelementptr`, Algorithm 2 fetches the alias objects referenced at each base offset, then pairs those objects with the requested offset; it does not add that offset to the base offsets.

The authors use the Huawei bug to motivate all three sensitivities: a tainted structure field overflows during multiplication, then a different function uses the original oversized count to modify the allocated buffer (Listing 1, p.1009). The paper says: “Thus, this bug is likely only possible to detect and report concisely with an analysis that is flow-, context-, and field-sensitive.” (§2, p.1009).

Inference: Encode alias objects and offsets as ghost/spec maps and prove each transfer relation. For a proposed Verus port, validity conditions for concrete memory accesses would need to justify the abstract points-to state. The paper provides no such proof.

## technique: taint propagation and traceable detectors

What it is and when to use it. Taint traces map a value to the instructions that introduced taint. Table 1 (p.1016) seeds read/write buffer and length arguments and the ioctl argument directly; DevStore buffers, NetDevIoctl structures, and V4Ioctl structures are indirectly tainted. The distinction is whether the argument itself is user-controlled or points to kernel memory containing user-controlled data (§5.3). Taint transfer functions then propagate sources through binary operations, loads, stores, and GEP; detector policies decide which sinks are dangerous.

The detector plugins include Improper Tainted-Data Use, Tainted Pointer Dereference, Tainted Size, Uninitialized Leak, Tainted Arithmetic, Tainted Loop Bound, Invalid Cast, and Global Variable Race detectors (§4, pp.1014–1015). Listing 7 shows a warning with its calling context, detector, source locations, function names, and taint trace (p.1021). The paper qualifies the general behavior: “Almost all of the detectors use taint analysis results to verify a vulnerable condition and produce a taint trace with all of their emitted warnings.” (§4, p.1014). The authors report: “In fact, in the process of analyzing our results for this paper, we were able to create the Global Variable Race Detector (GVRD) detector and deploy it in less than 30 minutes.” (§4, p.1014).

Steps.
1. Identify vendor driver files using differences from mainline, configuration options, and vendor names. Compile 32-bit and 64-bit ARM LLVM bitcode, then link dependent vendor files into one bitcode file per driver (§5.1, pp.1015–1016).
2. Parse kernel headers with `c2xml` to find operation-structure offsets and discover entry functions (§5.2, p.1016).
3. Seed direct or indirect taint according to the entry-function type (§5.3, p.1016).
4. Apply Algorithm 3 to the supported instruction kinds during traversal: alloca does nothing for taint; binary operations merge operand traces and append the instruction; loads collect field taint through points-to results; stores update destination field taint; GEP reuses the binary-operation transfer. Phi instructions are treated as binary operations (§3.2, p.1012; Algorithm 3, p.1013).
5. Also taint destination objects for user-copy sources, such as `copy_from_user`. Most core-kernel calls do not propagate taint, with modeled exceptions such as `memcpy` (§3.4, pp.1013–1014).
6. Run detector policies on the current analysis results; taint-based detectors retain traces for triage.

Inference: Define a ghost taint map and `spec fn` transfer functions; prove detector lemmas such as a tainted length cannot reach a copy without a checked bound. This could guide proof obligations; it would still require explicit assumptions for the kernel code omitted by the analysis.

## evidence, limitations, and product implications

Table 4 reports counts with denominators: 5,071 warnings, 3,973 confirmed-correct traces, and 158 confirmed zero-day bugs across Huawei, Qualcomm, Mediatek, and Samsung drivers (p.1019). Inference: 3,973/5,071 rounds to the reported 78% precision. The authors compare four tools; their total warning counts are 242 for cppcheck, 44,900 for flawfinder, 8,968 for RATs, and 31,929 for Sparse (Table 2, p.1017), but those are warnings, not confirmed bugs. Section 7.1 (p.1019) states: “In fact, 7 of the 158 identified zero-days have already been issued Common Vulnerabilities and Exposures (CVE) identifiers [6–10]. Of these, Sparse correctly identified 1, flawfinder correctly identified 3, RATs identified 1 of the same ones as flawfinder, and cppcheck failed to identify any of them.” Inference: the passage leaves the comparison denominator unclear; these counts should not be treated as detection rates over all 158 bugs.

Inference: Table 4’s per-chipset bug totals (78, 19, 44, 24) sum to 165, while its overall bug count and detector totals give 158; the paper does not reconcile that difference. Table 2 warning totals also differ from surrounding narrative totals for several comparison tools.

The analyzer treats each entry point independently and misses state-dependent bugs; assumes kernel APIs are correct and misses improper API usage; and targets input-validation bugs, so it misses side channels and access-control errors (§6, p.1017). In the comparison with a configuration called “sound”, only 18 of 100 entry points completed within the four-hour timeout per entry point when kernel APIs were included and fixed-point loops were used (Table 5, p.1020); the soundy configuration averaged 35.320 seconds, versus 175.823 seconds for the 18 completed sound runs (Table 5, p.1020). Section 7.2 (p.1020) also states that the configuration called “sound” omitted kernel API definitions that LLVM failed to compile. Inference: its runtime average covers a different subset, and this experiment does not establish full soundness. 

The No API configuration, which retained fixed-point loops, completed all 100 entry points and averaged 110.409 seconds, versus 35.320 seconds for DR. CHECKER on those 100 (Table 5).

## techniques for the catalog

- soundy shared traversal — share state across analysis clients and bound loop traversals using reach-def analysis, accepting explicit sources of unsoundness
- field/context-sensitive points-to — represent alias objects by field offset and call context
- taint trace propagation — seed user-controlled entry arguments and propagate instruction-level traces
- pluggable vulnerability detectors — attach detector policies to abstract state and emit traceable warnings
- driver extraction pipeline — identify vendor files and entry points, compile LLVM bitcode, then seed taint by operation type
