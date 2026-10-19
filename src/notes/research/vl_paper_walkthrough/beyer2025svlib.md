# SV-LIB 1.0: A Standard Exchange Format for Software-Verification Tasks
(authored by agents unless marked 🧑)
Tag: `beyer2025svlib`, [paper](https://arxiv.org/abs/2511.21509v1)

## scope and result

SV-LIB 1.0 is a human-readable intermediate language for exchanging complete software-verification tasks: program, safety/liveness specifications, and correctness or violation witnesses. It extends SMT-LIB 2.7 with procedures, variables, control flow, nondeterminism, property annotations, verification queries, and witness retrieval. The central semantic question is `p |= φ`; a witness is evidence that the relation holds or fails. The paper's design goal is explicit: “Thus, the format extends SMT-LIB with a syntax for imperative program statements and commands for the definition of procedures and correctness claims.” (§1, p. 5)

Inference: VL could investigate exporting Verus verification obligations into a comparable exchange artifact. This paper does not establish that a translation preserves Rust or Verus semantics. The relevant design ideas are separation of code and properties, incremental queries, and witnesses.

## technique 1: exchange complete tasks through a structured SMT-LIB extension

What it is. SV-LIB files use `.svlib`, retain SMT-LIB sorts, terms, functions, and a subset of its commands, and add `define-proc`, recursive procedures, global variables, structured/unstructured control flow, `annotate-tag`, `verify-call`, `select-trace`, and `get-witness` (§2, pp. 5–6; Figure 9, p. 14). The language is divided into fragments: basic statements (B), procedures (P), unstructured control flow (U), structured commands (S), and nondeterminism (N) (Figure 11, p. 19). This preserves program structure before a verifier chooses a particular encoding.

Why use it. A common text format is intended to let front ends translate imperative-language tasks into SV-LIB for multiple back ends. The paper reports C-to-SV-LIB translation (§1, pp. 3–4); Figure 1 illustrates possible transformations, rather than establishing an implementation for every pictured language. The authors contrast direct pairwise transformations, which require `O(n²)`, with a hub that needs `O(n)` transformations (§1, p. 3). The community requirements include formal semantics without undefined behavior, subject to SMT-LIB-style underspecification, interoperability, separate specifications, and witness validation reducible to first-order SMT checks (§2.1, pp. 5–6). These are requirements, not all completed results: the abstract says, “Formal semantics and further extensions to concurrency are planned for future versions.” (p. 1)

How to apply it.

1. Declare global state with `(declare-var x Sort)` and define procedures with input, output, and local variables.
2. Encode assignments, `sequence`, `if`, `while`, calls, labels/gotos, `havoc`, and `choice` using the appropriate fragment.
3. Connect properties to statement tags with `annotate-tag`. Tags can group several locations, but full well-formedness requires script-unique tags for procedure bodies, loops, labels, and statements with inline annotations (§5.1, p. 20; §8.2, pp. 31–32).
4. Issue `(verify-call proc (args))`; receive `correct`, `incorrect`, `unknown`, `unsupported`, or `error` (§4.6, p. 16).
5. If the result is `correct` or `incorrect` and witness production is enabled, issue `(get-witness)` immediately, with no intervening command (§4.7, p. 17).

The complete add example defines a loop that increments `x` and decrements `y`, then separates the contract from the body: `:requires (<= 0 y0)` and `:ensures (= x (+ x0 y0))`; the loop has `:not-recurring` and a witness supplies its invariant and decreases term (Figure 3, p. 8). The paper states: “This program shows how SV-LIB can separate the program from its specification, since the specifications are given by the :annotate-tag commands, which refer to the :tag annotations and are therefore not intertwined with the program itself.” (§3.1, p. 8)

Inference: a VL exporter could separate a function body from its contracts and loop annotations. Any mapping from Verus constructs to SV-LIB would need its own semantics-preservation argument; this paper supplies none.

## technique 2: incremental verification interaction

What it is. SV-LIB keeps an interactive verifier connection. A client sends `verify-call`; after a `correct` or `incorrect` response, it can request a witness. Queries may also return `unknown`, `unsupported`, or an error (§4.6, p. 16). Multiple calls may reuse internal state. Figure 4 first verifies `add`, then verifies `mul` using `add`'s contract; the verifier may retain invariants, contracts, or counterexample abstractions, but is allowed to recompute from scratch (§3.2, p. 9).

How to apply it.

1. Send declarations, procedures, annotations, and the first `verify-call`.
2. Preserve the verifier session and issue a second query over the same or extended script.
3. Reuse earlier proven contracts only when their postconditions are strong enough; the paper warns that `:ensures true` may not prove a caller's property (§3.2, p. 9).
4. Request a witness immediately after the query. Any intervening command requires `get-witness` to produce an error because the previous witness may be invalid (§4.7, p. 17).
5. Enable witnesses with `--produce-witnesses` or `:produce-witnesses`; choose their destination with `--witness-output-channel`. Command-line flags override options in the script (§2.3, pp. 6–7).

Inference: VL could reuse previously verified contracts or auxiliary facts across related obligations, provided it checks that they remain applicable and strong enough. The paper does not establish an incremental protocol for Verus.

## technique 3: properties separated from statements

What it is. SV-LIB properties attach inline to statements or indirectly through tags, without defining statement semantics. Supported attributes are location invariants `:check-true`, recurring/not-recurring liveness, procedure/statement `:requires` and `:ensures`, loop `:invariant`, and integer or lexicographic ranking functions `:decreases`/`:decreases-lex` (Figure 12, p. 23). A location invariant is checked before execution, including every loop-condition evaluation and every jump to an annotated label; a loop invariant must hold initially, be inductive, and be strong enough to prove the remainder (§6.1–6.2, pp. 23–24). Contracts are checked for precondition, modular validity under arbitrary modified variables, and strength for the rest of the program (§6.3, pp. 24–25).

How to apply it.

1. Tag the top-level procedure body, loop heads, and labels.
2. State a location condition with `:check-true` when it must hold at each visit.
3. State an inductive `:invariant` for loops; include all facts needed after abstraction.
4. State `:requires` before and `:ensures` after a procedure or statement.
5. Supply an integer ranking term with `:decreases`, or an integer tuple with `:decreases-lex` (§6.4, p. 25). Inference: the stated bound is inconsistent. The simple form must “decrease strictly according to the built-in order < but remain non-zero”, while the violation discussion refers to “the designated range of values such as non-negative integers”. An implementation needs a clarified bound; this study cannot resolve it from the paper.
6. Encode liveness with `:recurring` or `:not-recurring`; termination can be expressed by marking loop/function heads not recurring (§6.5, p. 25).

The insufficient-invariant example omits the fact `y >= 0` according to §3.5 (p. 12), although the Figure 7 caption instead prints `(<= y 0)`. SV-LIB constructs a leap to `x=3,y=-1` satisfying the weak invariant and reaches a violated postcondition (Figure 7, pp. 12–13). This deliberately models modular over-approximation, including states not reachable in the concrete program.

Inference: a VL translation should distinguish a condition that holds on reachable executions from an inductive annotation strong enough for modular verification. The paper’s `leap` mechanism makes that distinction explicit; it does not define a Verus implementation.

## technique 4: correctness and violation witnesses

What it is. A witness is a sequence of SV-LIB/SMT-LIB commands that can be combined with the original script to form a validation task. Correctness witnesses provide invariants, contracts, and ranking functions, reducing validation to SMT queries. Safety-violation witnesses provide concrete traces and models; liveness witnesses provide a finite prefix plus a lasso/inductive abstraction. The paper emphasizes: “A witness is a sequence of commands, which can be combined with the original script to generate a new valid SV-LIB script.” (§7, p. 26)

How to apply it for correctness.

1. Run `verify-call` and request `get-witness`.
2. Preserve auxiliary SMT definitions and `annotate-tag` properties from the witness.
3. Remove the witness’s outer response parentheses and insert its commands immediately before the original `verify-call` (§3.6, p. 13).
4. Run the resulting validation script; a sufficient correctness witness supplies the facts needed for direct SMT checks (Figure 8, p. 13; §7, p. 26).

How to apply it for a safety violation.

1. Record a trace-specific SMT model for global constants, relevant global-variable initial values, and the entry procedure. Resolve relevant local/output initializations, `havoc` values, and `choice` branches; omit initial values overwritten before use.
2. Match the listed steps eagerly as the program executes; `choice` indices start at zero.
3. End with `incorrect-annotation` naming the unique tag and the exact violated annotation (§7.2, pp. 27–28).

For liveness, use a finite stem followed by `using-annotation` abstractions, potentially including ranking functions to establish progress back to the lasso head. The stem must reach a state satisfying those annotations, and every abstracted path from the head must eventually return while satisfying them again. Only the `using-annotation` properties are used for the infinite part; relevant original annotations must be repeated there (§3.4, pp. 11–12; §7.4, pp. 29–30).

Inference: Figure 6 (p. 11) has an internal inconsistency: its caption says the lasso “stays forever in the loop with (= y 0)”, and its witness supplies `:invariant (= y 0)`. The displayed input `y1=1` and code leave `y=1` unchanged, so this annotation does not describe that execution. The example cannot support the study’s former `y=0` claim.

For a modular-specification violation, a `leap` sets all and only variables modified by the loop or contracted statement to values satisfying its annotations, potentially reaching a state absent from concrete executions. It is applied as soon as the tag is reached, before executing its statement (§7.3, pp. 29–30).

Inference: VL could treat a proof patch and its discharged obligations as a candidate correctness artifact, or investigate concrete inputs and traces for violations. This paper does not establish either as an SV-LIB-compatible witness for Verus.

## evidence boundary and VL implications

SV-LIB specifies syntax and informal semantics. Section 5 (p. 18) defers precise verification conditions to a future version; §7 (p. 26) likewise defers precise witness semantics. The authors warn: “Note that axioms can render the verification meaningless: for example, adding (assert false) to the script should make the program vacuously correct.” (§4.9, p. 17) Section 7.1 (p. 27) recommends forbidding `assert` in competition correctness witnesses, but also notes that recursive SMT definitions can introduce inconsistency. Inference: checking a witness does not by itself establish that its background assumptions are consistent.

The paper reports supporting implementations: PySvLib provides a parser, printer, and verification-condition generator; an ANTLR grammar supports parser generation; CPAchecker translates SV-LIB to an AST and then its control-flow automaton, uses JavaSMT for terms, and exports witnesses from an abstract reachability graph or counterexample. The integration supports predicate analysis and is included in CPAchecker 4.2 (§9, pp. 32–33). These implementation reports are not a quantitative interoperability evaluation.

Inference: VL should investigate translation fidelity and independent validation before adopting this exchange model. Rust ownership, unsafe code, external libraries, and Verus semantics require separate evidence.

## techniques for the catalog

- SMT-LIB-based exchange format: extend a known parser and term language with procedures, control flow, specifications, and witness commands
- separate tagged properties: attach contracts, invariants, ranking functions, and liveness requirements to program locations without changing statement semantics
- incremental verifier protocol: issue `verify-call`, reuse state when sound, and retrieve a witness immediately after a verdict
- correctness witness validation: combine witness commands with the original task so invariant and contract validation reduces to SMT checks
- violation witnesses: encode concrete safety traces, lasso-shaped liveness counterexamples, and modular-invariant leaps
- explicit nondeterminism: model `havoc` and `choice` as demonic behavior and resolve choices in counterexample traces

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The command (get-witness) requests the verifier to return a witness for the last verification query."): checked the complete paper, quotations, numbers, sections, pages, and technique steps; corrected quotation boundaries, page references, witness timing, tag requirements, the Figure 6 claim, and unsupported Verus assertions; distinguished planned semantics from results and noted inconsistent ranking bounds; did not run the tools, validate translations, or check external Verus guidance.
