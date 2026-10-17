# VeriStruct: AI-assisted Automated Verification of Data-Structure Modules in Verus
(authored by agents unless marked 🧑)
Tag: `sun2026veristruct`, [paper](https://doi.org/10.1007/978-3-032-22749-2_6)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

source: Sun et al., arXiv 2510.25015v4 (2026), full text in `pdfs/917f...txt`

## what the paper proves and measures
VeriStruct takes Rust module code plus unit tests and synthesizes Verus views, type invariants, specifications and proof blocks. A planner chooses which components are needed; verifier diagnostics drive repair. Eleven modules (129 functions) were tested: 10 modules solved and 128/129 functions (99.2%); Node reached 11/12. Table 3 reports per-module calls and minutes (for example Bitmap 13 calls/12.2 min; RingBuffer 12/4.2 min). The baseline asks an LLM once per iteration for all annotations, feeding back the last failing code and error, for 13 invocations; it solves 4/11 modules and 52 functions (Table 2) and plateaus below the target (Fig. 7 caption: "single-shot baseline plateaus well below full coverage").

## technique: planner-directed decomposition
What: a planner first decides whether to generate a View, type invariant, specifications, and proof code, then invokes dedicated modules.
When: use for a module with several methods sharing representation invariants; single-function synthesis misses cross-method dependencies.
How: provide source and tests; planner selects components; each component prompt states objective, background, steps, output format, and examples; run Verus; feed diagnostics to repair and repeat.
Evidence: ten of eleven modules solved and 128/129 functions (abstract; conclusion p.16).
Limits: requires a comprehensive unit-test suite supplied by the user; VeriStruct left one function unsolved (Node, 11/12); the paper does not say why, so attributing it to the planner would be inference.
Quote: “VeriStruct employs a planner module to orchestrate the systematic generation of abstractions, type invariants, specifications, and proof code.” (abstract, p.1)

## technique: mathematical View abstraction
What: implement `View` mapping concrete fields to a logical `Seq`, `Set`, `Map`, or tuple, hiding layout/index arithmetic.
When: whenever clients should reason about logical contents rather than representation.
How: define `type V`; write pure `closed spec fn view(&self)`; for RingBuffer return `(content, capacity)` where content concatenates wrapped slices; use `self@` in contracts.
Evidence: Fig.1 lines 8–28 and Example 2 show the ring-buffer abstraction; Bitmap’s generated single-sequence view also verified.
Limits: abstraction must faithfully encode behavior; simpler LLM view may differ from human ground truth.
Quote: “defining a custom view offers better abstraction, clarity, and proof efficiency” (sec.2, p.5)

## technique: type invariants
What: a formula attached with `#[verifier::type_invariant]` that every instance must satisfy.
How: write `closed spec fn inv(&self)->bool`; express bounds/nonemptiness; invoke `use_type_invariant(&self)` in proof blocks.
Evidence: RingBuffer invariant requires valid indices and positive length (Fig.1, lines 29–36; Example 3 p.6).
Limits: operations must preserve it; bad or redundant invocations trigger repair.
Quote: “A type invariant is a logical formula that all instances of a data structure must satisfy.” (sec.2, p.5)

## technique: diagnostic repair with syntax guidance
What: repair modules classify Verus failures and patch generated annotations; prompts include tutorial/vstd syntax rules.
How: after failed verification, classify parser, type, arithmetic, pre/postcondition, invariant, missing-element, mode, old-self, assertion, decreases, or redundant-invariant errors; apply targeted edits (e.g. `by(nonlinear_arith)`, bounds assertions, `old(self)`, imports); rerun Verus.
Evidence: Appendix Table 4 lists all classes and actions; the paper compares the whole workflow with the baseline and has no ablation isolating syntax guidance or repair; it states the syntax guidelines are meant "to mitigate syntax errors" (sec.1, p.3).
Limits: Table 4 calls the repairs "specialized repair heuristics"; Node’s final function stayed unverified within the m=5 repair rounds. Inference: the verifier and SMT solver remain trusted.
Quote: “we embedded structured syntax guidelines into the prompt to mitigate syntax errors” (sec.1, p.3)

## what remains trusted and product implication
Inference (the paper has no trust-base discussion): Verus, its SMT backend, Rust compiler/runtime behavior, and supplied tests remain trusted assumptions; the LLM is not trusted because Verus checks generated obligations. Tests constrain intent but do not prove untested properties. Inference: high threat reduction for agent-written data-structure Rust when specifications/tests are independently reviewed; residual risk is wrong/vacuous specs, incomplete tests, and the 1/129 failure.

## techniques for the catalog
- planner decomposition — schedule View, invariant, contracts, and proofs as separate generation tasks
- View abstraction — map concrete data structures to logical sequences/maps used in contracts
- type invariants — attach and invoke representation invariants across methods
- verifier-diagnostic repair — classify Verus errors and apply targeted annotation patches
- syntax-guided prompting — include Verus tutorial/library rules and examples in prompts
Audited 2026-10-12 against the paper: checked all numbers (10/11, 128/129, 99.2%, 11/12, Table 3 calls/minutes, Table 2), Fig. 1 line refs, Table 4 classes, quotations, Verus forms (View, type_invariant, use_type_invariant sound); changed: baseline description (iterative, not single-shot; 4/11, 52), Node failure attributed to planner (unsupported), type-invariant quote page p.6 to p.5, syntax-guidance quote section 3 to 1 and removed claimed credit for improvement (no ablation), trusted-base paragraph marked as inference. Not checked: contents of Figs. 2, 6, 7 (images).
