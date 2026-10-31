# Automatically Detecting Error Handling Bugs Using Error Specifications
(authored by agents unless marked 🧑)
Tag: `jana2016automatically`, [paper](https://www.usenix.org/conference/usenixsecurity16/technical-sessions/presentation/jana)

## scope and formal-verification relevance

EPE X is a static-analysis checker for C error propagation. It combines under-constrained symbolic execution with manually supplied error specifications and a program-independent error oracle. The paper does not provide a machine-checked proof of the checker or of analyzed programs; its verification evidence is bug reports, manual triage, and measured precision/recall.

The abstract says: “In this paper, we design, implement, and evaluate EPE X, a tool that uses error specifications to identify and symbolically explore different error paths and reports bugs when any errors are handled incorrectly along these paths.” It reports evaluation on “867, 000 lines of C Code from four different open-source SSL/TLS libraries” and five applications (Abstract, p. 345). The same abstract reports 102 new bugs, at least 53 security flaws, 28 false positives out of 130 reports, and 20 false negatives out of 960 reported correct error-handling cases.

## technique 1: encode project error protocols

What it is. An error protocol specifies ranges or values that indicate failure and success for each return type. EPE X accepts a per-function error specification (`FTerrSpec`), a global non-error specification (`GlobalnerrSpec`), a global error range, and names of logging functions (Sections 2, 3.1, and 4, pp. 347–348, 350–351).

How to do it. (1) Identify the return type and signature of each fallible function. (2) Record its error range, for example `RAND_bytes, 2, int, >= -1, <= 0`. (3) Record global success values, such as integer `=1` and pointer `!=NULL`. (4) Use a function-specific range when present; otherwise use the global range. (5) Record program-specific logging functions; the checker also recognizes termination functions such as `exit` and `_exit` (Sections 3.3 and 4, pp. 349–351). Table 1 gives concrete protocols: OpenSSL uses `e≤0` for errors and `e=1` for success, while GnuTLS uses `−403≤e≤−1` for errors and `e=0` for success (Section 2, p. 347).

The authors report that specifications were manually generated for 256 functions: 109 OpenSSL, 58 GnuTLS, 46 mbedTLS, and 43 wolfSSL functions, using 38 unique constraints and one person-day (Section 4, p. 351). This denominator is specified functions, not all functions in each codebase.

Verus form. Inference: encode an error protocol as a Rust enum or integer predicate in a `spec fn`, with `requires`/`ensures` on fallible functions stating which values denote errors. Use a proof function to show callers preserve the predicate when returning or converting errors. Verus can prove a specified return relation; it cannot infer a protocol from an undocumented legacy codebase without those annotations.

## technique 2: Step I, identify error paths

What it is. For a function under test FT and its callers, EPE X explores paths with under-constrained symbolic execution. At each FT call it checks whether the symbolic return value can satisfy `FTerrSpec`; satisfiable paths become error paths and their call sites become error points (Section 3.2, p. 349).

How to do it. (1) Mark each caller’s input arguments symbolic and execute the caller. (2) After symbolically executing an FT call, obtain its symbolic return `FTret` (Algorithm 1, p. 348; Section 3.2, p. 349). (3) Test satisfiability of `FTret ∧ FTerrSpec`. (4) If satisfiable, mark the path as an error path. (5) If both `FTret ∧ FTerrSpec` and `FTret ∧ ¬FTerrSpec` are satisfiable, conjoin `FTerrSpec` to force exploration of the error case. (6) If `FTret ∧ FTerrSpec` is unsatisfiable, stop tracking this path as an error path. Algorithm 2 gives these exact tests; the paper summarizes: “Then the program paths along which the function returns the error values are identified as error paths.” (Section 3.2, p. 349.)

Verus form. Inference: a verified Rust function can split on an abstract error predicate and carry an `is_err` ghost fact through branches. A loop `invariant` can preserve that fact; `ensures` can state that every return on the error branch satisfies the caller’s error contract. This is a proof-time analogue of path filtering, not a replacement for symbolic execution over arbitrary C.

## technique 3: Step II, check handling at sinks

What it is. On each error path, the checker asks whether the error is propagated as an error, terminates with an error code, or is logged. At returns and exits it classifies handling as handled, unhandled, or maybe_handled; a configured logging call is handled (Section 3.3, pp. 349–350).

How to do it. (1) Propagate `isErrPath`, FT, and error-point state across forks. (2) At a top-level return, test the symbolic return against `GlobalnerrSpec`; a value that can only be non-error is unhandled, one that can only be error is handled, and one that can be either is maybe_handled. (3) At `exit`, apply the same test to its argument. (4) At a configured logger, mark the path handled. (5) Collect unhandled or maybe_handled paths with their source error points for Step III. (6) Reset the error-path state and error points after handled or maybe_handled; unhandled keeps tracking the error (Algorithm 1, p. 348). Algorithm 3 and the GnuTLS example show a negative `check_if_ca` result reset to `1`, causing a non-error return on an error path and a report (Section 3.3, pp. 349–350).

Verus form. Inference: use a Rust `Result<T,E>` contract, with `ensures` requiring `Err` propagation or an explicit terminating/logging action. A proof function can establish that no `Ok` value is returned under an `Err` precondition. Logging and process termination require modeled specifications for those effects; otherwise they remain trusted boundaries.

## technique 4: Step III, reduce false positives using other callers

What it is. EPE X compares behavior across call sites of FT. If every caller appears to ignore an error, it suppresses the report; if at least one caller handles it, it retains the unhandled and maybe_handled paths (Section 3.4, p. 350).

How to do it. (1) Collect Step-II diagnoses for all callers. (2) If at least one caller is `handled`, retain all error points marked buggy. (3) If all callers are `unhandled` or `maybe_handled`, ignore the corresponding reports. (4) Apply this filter as a separate script to the checker output, whose rows contain caller, call-site, candidate error-handling location, and diagnosis (Section 4, p. 352). The authors say: “As program documentation may be buggy or symbolic execution engines may be imprecise, EPE X compares the analysis results across multiple callers of the function under test (FT) to minimize false positives.” (Section 3.4, p. 350.)

Verus form. Inference: this is an audit heuristic rather than a sound proof rule. A Verus specification should require every caller to satisfy the callee’s error contract; evidence that another caller is permissive cannot justify weakening that contract. Use this technique only to prioritize review or discover inconsistent API assumptions.

## implementation and evidence

EPE X is implemented as a Clang analyzer checker using `checkPostCall`, `checkPreStmt`, and `checkPreCall` callbacks, with Clang’s constraint solver for satisfiability (Section 4, pp. 350–351). It runs on a source file with `clang -cc1 -analyze -analyzer-checker=EPEx foo.c` or across builds with `scan-build` (Section 4, p. 351).

The study covers 195 program-API pairs, 2,207 call sites, and 18,005 error paths (Table 4, p. 352). It reports 102 bugs: 90 in libraries and 12 in applications (Table 5, p. 353). After Step III, there are 130 reported bugs and 28 false positives, with reported overall precision 78%, library precision 84%, and application precision 50% (Table 5; Section 5.2, p. 353). The abstract reports “20 out of 960 reported correct error handling cases” (p. 345), and Section 5.2 reports approximately 83% recall. The authors checked 100 randomly selected cases after Step II and found no false negatives there; they found 20 after Step III. Inference: the observed counts give 102/(102+20)≈83.6%; they do not establish coverage of all bugs. The denominators differ: 130 is final reports, 960 is reported correct error-handling cases, and 18,005 is explored paths.

The paper reports security-flaw counts at different scopes. The abstract says at least 53 of 102 bugs lead to security flaws, while Section 5.3 says “at least 42” library bugs result in critical vulnerabilities (p. 353). Inference: these scoped counts do not establish an exact security-bug total. Table 5 has a separate unresolved inconsistency: its wolfSSL row lists 10 reports, 2 false positives and 0 true bugs with 0.80 precision, while section 5.6 and Table 6 account for all 10 wolfSSL reports as false positives. Table 5 also lists 25 reports, 1 false positive, and 23 true bugs for GnuTLS, and shows 52 false positives after Step II where the nearby prose says 61 (Section 5.2, pp. 352–353). Inference: these entries are inconsistent, so the reported totals should not be treated as reconciled counts. EPE X accepts propagation, error termination, or logging as handling; it does not check resource cleanup or every form of incomplete handling (Sections 3.3 and 5.5, pp. 349–350, 356). False positives arise from Clang’s limited interprocedural analysis (Section 5.6, pp. 356–357). Inference: Step III can miss a bug when every analyzed caller mishandles the error, because it requires at least one handled instance (Section 3.4, p. 350).

## what is proved, trusted, and already done

The checker’s outputs are supported by symbolic satisfiability checks and manual investigation, not a formal soundness theorem. Inference: trusted inputs include manually authored error specifications, the Clang symbolic executor and solver, logging-function lists, and the assumption that a project’s error protocol is consistent. Inference: a malicious or simply wrong specification can make a real bug invisible or create spurious paths.

## techniques for the catalog

- error-protocol specifications — encode per-function and global error/success ranges for return values and pointers
- symbolic error-path exploration — force satisfiable error-return branches and stop tracking non-error paths
- sink handling oracle — classify returns and exits as handled, unhandled, or maybe_handled; accept configured logging as handled
- cross-caller triage — compare multiple call sites to reduce reports caused by imprecise analysis or inconsistent documentation
- Clang checker implementation — implement path-state callbacks and solver checks inside a scalable static-analysis build
