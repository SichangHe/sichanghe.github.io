# Characterizing Unsafe Code Encapsulation In Real-world Rust Systems
(authored by agents unless marked 🧑)
Tag: `rao2024unsafe`, [paper](http://arxiv.org/abs/2406.07936v1)

## problem and safety model
Interior unsafe encapsulates unsafe code within a safe function or method. Its implementation must ensure soundness for safe callers; input validation is one possible mechanism. Listing 1 executes `unsafe { doUnsafe(x); }` only when `IsValid(x)` holds (section 2.2, p. 2). Constructors, other methods, global state, or external functions can also affect soundness. The compiler checks unsafe markers but cannot establish that a safe function containing unsafe code is sound (section 3.1.2, pp. 2–3).

The paper distinguishes ordinary functions, static methods, dynamic methods, and constructors. Static methods are modeled like ordinary functions because they need no instance. Dynamic methods depend on an instance, so their constructors matter. Safe, unsafe, and literal constructors represent different construction paths (sections 3.1–3.2, pp. 2–4).

## technique: unsafety propagation graph (UPG)
The UPG models relevant functions, calls to unsafe callees, and constructor-to-method object flows. Its definition states: “A UPG G(S, U, C, E) is a directed graph that tracks the propagation of unsafe code through function calls and objects in a Rust program.” (Definition 3.1, section 3.2, p. 3)

Construct it with Algorithm 1 (p. 4):

1. Initialize an empty graph and identify functions and methods with unsafe markers, including safe functions containing unsafe code.
2. Add those nodes.
3. For each dynamic method, find its constructors and add object-flow edges from constructors to the method.
4. Find unsafe call sites within each node.
5. For an unsafe dynamic-method callee, resolve its instance type. For a generic instance, find all implementations of the corresponding trait method; otherwise use the direct callee.
6. For a callee supplied as a function argument, consider functions with the same signature. For other calls, use the direct callee.
7. Add caller-to-callee edges.

Remove unsafe function and unsafe dynamic-method nodes with no callers to obtain an Unsafety Isolation Graph (UIG). This is the specific reduction in Definition 3.2 (p. 4), rather than a general reachability analysis. Calls between safe functions are omitted because each safe callee bears its own soundness responsibility.

## technique: structural isolation and audit formulas
Split a UIG into audit units containing a safe caller, an unsafe callee, and their constructors when they are dynamic methods. Define `RS_x` as the required safety properties of node `x`, and `VS_x` as the safety properties it establishes. The paper states: “Within each UIG, every unsafe node carries specific safety requirements that must be met.” (section 3.2, p. 4)

The nine patterns fall into four types (section 3.3, pp. 4–6). In the formulas below, `sf` is a safe function or static method, `sm` a safe dynamic method, `uf` an unsafe function, and `um` an unsafe dynamic method. `cs` and `cu` denote safe and unsafe constructors; subscripts 1 and 2 distinguish caller and callee constructors.

- Direct isolation, two patterns: a safe function calls an unsafe function or constructor, requiring `RS_uf ⊆ VS_sf`; or it calls an unsafe method with a safe constructor, requiring `RS_um ⊆ VS_sf`.
- Indirect isolation, two patterns: a safe method with a safe constructor calls an unsafe function or constructor, requiring `RS_uf ⊆ (VS_sm ∪ VS_cs)`; or it calls an unsafe method with a safe constructor, requiring `RS_um ⊆ (VS_sm ∪ VS_c1s)`.
- Half isolation, four patterns: a safe method with an unsafe constructor calls an unsafe function or constructor, requiring `RS_uf ⊆ (VS_sm ∪ RS_cu ∪ VS_cu)`; a safe function calls an unsafe method with an unsafe constructor, requiring `RS_um ⊆ VS_sf`; a safe method with a safe constructor calls an unsafe method with an unsafe constructor, requiring `RS_um ⊆ (VS_sm ∪ VS_c1s)`; or a safe method with an unsafe constructor calls an unsafe method with a safe constructor, requiring `RS_um ⊆ (VS_sm ∪ RS_c1u ∪ VS_c1u)`.
- Open isolation, one pattern: a safe method calls an unsafe method and both have unsafe constructors, requiring `RS_um ⊆ (VS_sm ∪ RS_c1u ∪ VS_c1u)`.

For unsafe method callees, the paper treats their safety requirements as independent of their constructors. Unsafe constructors introduce assumed requirements whose satisfaction must be checked in another audit unit. Half isolation can therefore require two verification hops, and open isolation two or three (section 4.2.2, p. 7).

Section 3.4 (p. 6) classifies safety checks by data flow. Direct checks include arguments obtained from global or hardcoded values or a global static function returning a fixed value, and validation through `if` or `assert`. No-check cases depend on the safe caller's input parameters or lack validation of the unsafe callee's parameters. This classification does not establish semantic correctness.

## technique: constructor and visibility audit
Audit all construction paths, including literal field construction. In Aero's `PhysAddr` example, `new` checks bits 52 through 63, while `new_unchecked` directly constructs the address. The authors assign `VS_new = {Init_State}`, `VS_new_unchecked = ∅`, and `RS_new_unchecked = {Init_State}`. For a safe method usable through either constructor, their formula requires the callee's properties to follow from the intersection of the construction paths' guarantees, together with the method's own guarantees (section 4.2.3, pp. 7–8).

Literal construction can bypass those guarantees: “Literal syntax directly sets a structure’s fields if they are accessible.” (section 5.2.1, p. 9) Visibility matters within a module as well as outside it. The authors identify the issue as follows: “Developers may overlook the soundness issues in certain internal module scenarios, such as bypassing unsafe constructors via literal constructors or directly invoking some safe methods that lack safety checks.” (section 5.2, p. 9)

Missing annotations on unsafe constructors require examining their callers in other audit units. Conversely, explicit requirements let the auditor assume them locally and check them separately. The authors recommend explicit safety requirements for every unsafe function and method (section 5.1, pp. 8–9). They also suggest that the compiler consider disabling literal constructors and warning about interior unsafe code without safety checks (section 5.2, p. 10). These are proposals, not evaluated compiler features.

## empirical findings and limits
The experiment covers Asterinas, rCore, Theseus, and Aero. Selection requires over two years of active development, maintenance within the last year, at least 1,000 GitHub stars, and more than 300 instances of unsafe code (section 4.1.1, p. 6). The first author manually reviews audit units, the second reviews statistics, and disagreements are discussed with the third (section 4.1.2, p. 6).

Table 1 (p. 7) reports 188, 273, 261, and 333 audit units respectively. Table 2 (p. 8) reports missing safety annotations as lack/total: Asterinas constructors 1/20, functions 9/27, methods 12/24; rCore 10/10, 58/58, 30/30; Theseus 8/8, 83/95, 23/37; Aero 4/7, 53/57, 36/47.

Table 3 (p. 10) reports no-check/yes-check totals of 75/121, 80/241, 91/179, and 83/397 respectively. Inference: these totals differ from Table 1's audit-unit totals, so the tables should not be treated as interchangeable counts. Section 5.2.2 (p. 10) says: “As detailed in Table 3, the data of no safety checks, on average, 69.0% are related to methods.” It also reports 41.9% of functions' no-check occurrences as related to visibility. Neither percentage describes all unsafe functions.

Inference: the evidence supports a method for organizing manual review, rather than an automatic proof of soundness or a measured bug-detection guarantee. Applying it to verified Rust would require separately formalizing and proving the safety requirements, constructor guarantees, and global-state assumptions. The paper does not evaluate Verus or provide Verus encodings.

## techniques for the catalog
- unsafety propagation graph: model calls to unsafe callees and constructor-to-method object flows
- isolation graph reduction: remove unsafe function and dynamic-method nodes with no callers
- structural isolation formulas: classify nine patterns and assign safety obligations to callers and constructors
- constructor invariant audit: compare safe and unsafe construction paths using required and verified safety sets
- visibility audit: examine literal construction and safe functions whose soundness depends on restricted callers

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Developers and code auditors must identify all preconditions and postconditions associated with the unsafe code."): checked the full paper, quotations, numbers, formulas, technique steps, section and PDF page references, and the arXiv identifier; corrected the safety model, graph reduction, isolation patterns, constructor references, and 69.0% finding; removed unsupported Verus prescriptions and marked conclusions as inference; did not reproduce the project analysis or independently validate Rust or Verus semantics.
