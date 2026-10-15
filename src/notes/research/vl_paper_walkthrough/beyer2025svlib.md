# SV-LIB 1.0: A Standard Exchange Format for Software-Verification Tasks
(authored by agents unless marked 🧑)
Tag: `beyer2025svlib`, [paper](http://arxiv.org/abs/2511.21509v1)

## scope and result

SV-LIB 1.0 is a human-readable intermediate language for exchanging complete software-verification tasks: program, safety/liveness specifications, and correctness or violation witnesses. It extends SMT-LIB 2.7 with procedures, variables, control flow, nondeterminism, property annotations, verification queries, and witness retrieval. The central semantic question is `p |= φ`; a witness is evidence that the relation holds or fails. The paper's design goal is explicit: “Thus, the format extends SMT-LIB with a syntax for imperative program statements and commands for the definition of procedures and correctness claims.” (§1, p. 5)

## technique 1: exchange complete tasks through a structured SMT-LIB extension

What it is. SV-LIB files use `.svlib`, retain SMT-LIB sorts, terms, functions, and commands, and add `define-proc`, recursive procedures, global variables, structured/unstructured control flow, `annotate-tag`, `verify-call`, `select-trace`, and `get-witness` (§2, pp. 5–6; Figure 9, p. 14). The language is divided into fragments: basic statements (B), procedures (P), unstructured control flow (U), structured commands (S), and nondeterminism (N) (Figure 11, p. 19). This preserves program structure before a verifier chooses a particular encoding.

Why use it. A common text format lets front ends transform C, Java, Dafny, or Rust tasks once into SV-LIB and lets multiple back ends consume them. The authors contrast direct pairwise transformations, which require `O(n²)`, with a hub that needs `O(n)` transformations (§1, p. 3). They also require a formal semantics, no accidental undefined behavior, interoperability, separate specification, and witness validation reducible to first-order SMT checks (§2.1, pp. 5–6).

How to apply it.

1. Declare global state with `(declare-var x Sort)` and define procedures with input, output, and local variables.
2. Encode assignments, `sequence`, `if`, `while`, calls, labels/gotos, `havoc`, and `choice` using the appropriate fragment.
3. Attach unique `:tag` annotations to locations of interest and connect properties with `annotate-tag`.
4. Issue `(verify-call proc (args))`; receive `correct`, `incorrect`, `unknown`, `unsupported`, or `error` (§4.6, p. 16).
5. If the result is `correct` or `incorrect` and witness production is enabled, issue `(get-witness)` (§4.7, p. 17).

The complete add example defines a loop that increments `x` and decrements `y`, then separates the contract from the body: `:requires (<= 0 y0)` and `:ensures (= x (+ x0 y0))`; the loop has `:not-recurring` and a witness supplies its invariant and decreases term (Figure 3, p. 8). The paper states: “This program shows how SV-LIB can separate the program from its specification.” (§3.1, p. 8)

Verus form (Inference). Rust executable functions and Verus contracts already combine code and specifications, but an export layer could serialize function signatures, `requires`, `ensures`, loop `invariant`, and proof lemmas into a separate task file. The correct Verus constructs are `requires`, `ensures`, `invariant`, `assert`, `spec fn`, and `proof fn`; SV-LIB's `:annotate-tag` is an exchange mechanism, not a Verus keyword. A translator must preserve ownership and mutable-borrow facts, which SV-LIB's scalar examples do not model.

## technique 2: incremental verification interaction

What it is. SV-LIB keeps an interactive verifier connection. A client sends `verify-call`; the verifier answers `correct` or `incorrect`; the client can request a witness. Multiple calls may reuse internal state. Figure 4 first verifies `add`, then verifies `mul` using `add`'s contract; the verifier may retain invariants, contracts, or counterexample abstractions, but is allowed to recompute from scratch (§3.2, p. 9).

How to apply it.

1. Send declarations, procedures, annotations, and the first `verify-call`.
2. Preserve the verifier session and issue a second query over the same or extended script.
3. Reuse earlier proven contracts only when their postconditions are strong enough; the paper warns that `:ensures true` may not prove a caller's property (§3.2, p. 9).
4. Request a witness immediately after the query; inserting an annotation before `get-witness` invalidates the previous witness (§4.7, p. 17).
5. For reproducibility, use command-line options such as `--produce-witnesses` and `--witness-output-channel` (§2.3, p. 6).

## technique 3: properties separated from statements

What it is. SV-LIB properties attach to statement tags instead of changing statement semantics. Supported attributes are location invariants `:check-true`, recurring/not-recurring liveness, procedure/statement `:requires` and `:ensures`, loop `:invariant`, and integer or lexicographic ranking functions `:decreases`/`:decreases-lex` (Figure 12, p. 23). A location invariant is checked before execution; a loop invariant must hold initially, be inductive, and be strong enough to prove the remainder (§6.1–6.2, pp. 23–24). Contracts are checked for precondition, modular validity under arbitrary modified variables, and strength for the rest of the program (§6.3, p. 24).

How to apply it.

1. Tag the top-level procedure body, loop heads, and labels.
2. State a location condition with `:check-true` when it must hold at each visit.
3. State an inductive `:invariant` for loops; include all facts needed after abstraction.
4. State `:requires` before and `:ensures` after a procedure or statement.
5. Prove termination with a nonnegative integer that strictly decreases, or a lexicographic tuple (§6.4, p. 25).
6. Encode liveness with `:recurring` or `:not-recurring`; termination can be expressed by marking loop/function heads not recurring (§6.5, p. 25).

The insufficient-invariant example omits `y >= 0`; SV-LIB constructs a leap to `x=3,y=-1` satisfying the weak invariant and reaches a violated postcondition (Figure 7, pp. 12–13). This deliberately models modular over-approximation, including states not reachable in the concrete program.

## technique 4: correctness and violation witnesses

What it is. A witness is a sequence of SV-LIB/SMT-LIB commands that can be combined with the original script to form a validation task. Correctness witnesses provide invariants, contracts, and ranking functions, reducing validation to SMT queries. Safety-violation witnesses provide concrete traces and models; liveness witnesses provide a finite prefix plus a lasso/inductive abstraction. The paper emphasizes: “A witness is a sequence of commands, which can be combined with the original script to generate a new valid SV-LIB script.” (§7, p. 26)

How to apply it for correctness.

1. Run `verify-call` and request `get-witness`.
2. Preserve auxiliary SMT definitions and `annotate-tag` properties from the witness.
3. Insert the witness commands immediately before the original `verify-call`.
4. Run the resulting validation script; the witness supplies the facts needed for direct SMT checks (Figure 8, p. 13).

How to apply it for a safety violation.

1. Record an SMT model for global values, an entry procedure, and a sequence of initialized locals, `havoc`, and branch choices.
2. Execute the trace eagerly through the program.
3. End with `incorrect-annotation` naming the violated property (§7.2, pp. 27–28).

For liveness, represent a finite prefix and use `using-annotation` invariants to characterize the infinite part; the paper's nonterminating `add` example uses a lasso that remains at `y=0` (Figure 6, pp. 10–11). For an insufficient invariant, a `leap` may enter an arbitrary state satisfying the invariant, exposing failure of inductiveness or postcondition strength (§3.5, pp. 12–13).

## techniques for the catalog

- SMT-LIB-based exchange format: extend a known parser and term language with procedures, control flow, specifications, and witness commands
- separate tagged properties: attach contracts, invariants, ranking functions, and liveness requirements to program locations without changing statement semantics
- incremental verifier protocol: issue `verify-call`, reuse state when sound, and retrieve a witness immediately after a verdict
- correctness witness validation: combine witness commands with the original task so invariant and contract validation reduces to SMT checks
- violation witnesses: encode concrete safety traces, lasso-shaped liveness counterexamples, and modular-invariant leaps
- explicit nondeterminism: model `havoc` and `choice` as demonic behavior and resolve choices in counterexample traces
