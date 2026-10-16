# Maintaining a Library of Formal Mathematics
(authored by agents unless marked 🧑)
Tag: `vandoorn2020maintaining`, [paper](https://www.semanticscholar.org/paper/58cabec7756c3405ca347e62bed3a4e669d43a7a)

## scope and result

Van Doorn, Ebner, and Lewis describe maintenance tooling for Lean's mathlib: semantic linters that inspect elaborated declarations and metadata, and generators that turn the complete Lean environment into searchable documentation. The abstract states: “To lower the barrier of entry for contributors and to lessen the burden of reviewing contributions, we have developed a number of tools for the library which check proof developments for subtle mistakes in the code and generate documentation suited for our varied audience.” The paper's target is library engineering around formally checked mathematics: logical type checking remains necessary, but conventions, attributes, type-class behavior, simplifier behavior, and documentation need additional checks.

The reported corpus had over 170,000 non-whitespace, non-comment lines, 42,000 declarations, 85 contributors, and 264 commits in April 2020 (Section 2, p. 3). The authors report that fixing `instance_priority` and `dangerous_instance` issues improved performance, while documentation and linting reduced maintainer workload (Section 5, pp. 14–15). These are project observations; the paper gives no controlled causal denominator for the improvements.

## technique 1: semantic linter framework

What it is. A semantic linter consumes a fully elaborated Lean declaration and its metadata, rather than source text. Section 3 says: “The use of semantic linters allows us to automatically check for many commonly made mistakes, using the abstract syntax tree (the elaborated term in Lean’s type theory) for the type or value of a declaration.” The linter interface is a wrapper around a metaprogram of type `declaration → tactic (option string)`: `none` means pass and `some error_msg` means fail (Section 3.1, p. 4).

How to apply it.

1. Define a metaprogram that receives a declaration and returns either no result or an actionable error string (Section 3.1).
2. Bundle it in a `linter` value with test and formatted success/failure messages (Figure 1, p. 4).
3. Tag the declaration with `@[linter, priority ...]` so the framework discovers it (Figure 1).
4. Run `#lint` to check declarations up to the current point, or `#lint_mathlib` to check imported declarations across mathlib (Section 3, p. 3).
5. Permit an intentional exception with `@[nolint]` and a list of tests, while keeping the exception visible in source (Section 3, p. 4).
6. Run the complete lint suite in continuous integration for every pull request (Section 3, p. 4).

The design keeps policy in the library rather than Lean core: “By incorporating our checks into our library instead of the core Lean system, we make them available to all projects that depend on mathlib without forcing users to comply with them.” This lets projects choose stricter or looser conventions.

Inference: A Verus library can use an analogous checker over Verus syntax, generated specifications, and proof metadata before verification. The checker should report a declaration and a concrete repair, while Verus itself remains the authority for proof validity. Verus has no Lean `tactic` monad or `@[linter]` interface in the supplied reference, so the implementation mechanism would be a Rust tool or build-time script; this is an inference, not a claim about the paper.

## technique 2: simple and type-class linters

The simple linters catch errors accepted by the elaborator. The paper lists duplicate namespace components (`list.list.reverse`), mismatch between `def` and proposition-valued theorem declarations (`def_lemma`), disfavored constants such as `>` when `<` is the chosen normal form (`ge_or_gt`), unused declaration arguments, and missing definition documentation (`doc_blame`) (Section 3.2, pp. 5–6). Figure 1 gives executable Lean code for `doc_blame_report_defn` and the `linter.doc_blame` declaration.

Type-class linters enforce search behavior that type checking alone cannot guarantee. `instance_priority` requires forgetful instances to have priority below the default, because they apply broadly and can trigger expensive failed searches (Section 3.3, p. 6). `dangerous_instance` warns when an instance introduces a metavariable argument likely to loop; the paper's example is projecting a ring from `module R M`, which creates a search for `module α ?m` (pp. 6–7). `impossible_instance` catches an instance whose non-type-class argument cannot be inferred, and `incorrect_type_class_argument` catches an argument marked instance-implicit although its type is not a type class (p. 7). `has_inhabited_instance` checks that concrete `Type`-valued declarations have conditions sufficient to derive inhabitedness. `inhabited_nonempty` detects Prop-valued declarations whose `inhabited T` argument can be weakened to `nonempty T`, avoiding proof-irrelevant instance diamonds (pp. 7–8).

How to apply the type-class checks: inspect declaration binders and result types; identify forgetful versus structural instance conclusions; reject metavariable-producing instance heads; ensure non-instance arguments occur in inferable positions; and suggest weakening `inhabited` to `nonempty` when the target is Prop (Sections 3.3, pp. 6–8). The paper does not report a numerical false-positive or false-negative rate for these linters.

Inference: For Verus, these checks could inspect `requires`, `ensures`, `spec fn`, proof-function signatures, and imported proof modules for unused parameters, accidental runtime calls to proof code, or unsupported contract placements. The exact Verus AST and diagnostics are implementation choices outside this paper.

## technique 3: simplifier linters

Lean's `simp` rewrites with the global `[simp]` set. The paper notes that mathlib contained over 7,000 simp lemmas and almost 5,000 occurrences of `by simp` in the measured subset (Section 3.4, p. 8). The `simp_nf` linter finds redundant lemmas by simplifying a lemma's left-hand side and inspecting the returned proof term: if the lemma itself was used, it is not redundant; if another lemma normalizes the left side first, the candidate is redundant (pp. 8–9). It also detects a later, more general lemma that subsumes an earlier one, such as `length_singleton` followed by `length_cons`.

The paper provides additional checks. `simp_comm` rejects commutativity lemmas because ordered rewriting can produce unpredictable results for nested applications. `simp_var_head` rejects lemmas whose left-hand side has a bound variable as head symbol, because the simplifier cannot rewrite such a pattern (Section 3.4, pp. 9–10).

Step by step: run simplification on each candidate left-hand side; inspect the simplifier proof for self-use; compare the candidate with later general patterns; reject commutativity and variable-headed patterns; and emit the list of lemmas responsible for redundancy (Section 3.4). The paper says the first `simp_nf` version found more than one hundred violating lemmas across mathlib, but gives no denominator for the total number checked (p. 9).

Inference: A Verus proof-library linter could flag duplicate or subsumed lemmas, but Verus's solver and trigger behavior differs from Lean's rewriting engine. A direct translation of `simp_nf` would therefore be unsound as a claim about Verus; it would need a Verus-specific proof-obligation or solver-trace analysis.

## technique 4: generated reference documentation

The generator builds a Lean environment importing the entire library and traverses declarations through metaprogramming. It does not parse source files: “By processing a complete environment we can display terms using notation declared later in the library, and include automatically generated declarations that do not appear in the source.” The metaprogram reads file names, line numbers, documentation strings, module documentation, attributes, and type-class instances (Section 4.1, p. 11).

Apply the pipeline as follows:

1. Import the full library into a Lean environment (Section 4.1).
2. Traverse declarations and collect module docs, declaration kinds, types, doc strings, source locations, attributes, instances, and equational lemmas (Sections 4.1–4.2, pp. 11–12).
3. Emit a JSON database containing all information needed for display (Section 4.1).
4. Run a separate script that converts the database into searchable HTML (Section 4.1).
5. Display each source module as one page, preserve declaration order, provide an alphabetical index, hide implicit arguments by default, and link to the exact definition location (Section 4.2, p. 12).
6. Display selected attributes, expandable instance lists for classes, and equational lemmas for definitions (Section 4.2, p. 12).

The design serves newcomers through module overviews and experts through concise API references (Section 4.2). It keeps generated documentation close to the elaborated implementation, reducing source/documentation drift.

Inference: A Verus project could generate Markdown or HTML from verified function signatures, contracts, proof modules, and trusted external bodies. The generator should consume the verifier's elaborated representation so inferred types and erased proof code are represented accurately. This does not prove that documentation is complete or that a contract is correct.

## technique 5: decentralized tactic documentation and library notes

Tactics are implemented across many files, but users need one index. The paper adds `add_tactic_doc`, which stores an entry name, category, associated declarations, optional tags, description, and an optional declaration from which to inherit the description (Section 4.3, pp. 12–13; Figure 4). The command can be called immediately after defining a tactic, keeping documentation beside implementation while a generator collects all entries into category pages and tag filters.

Library notes record distributed design decisions by name rather than file location. A note is declared with `library_note "lower instance priority"`, referenced as `Note [lower instance priority]` in documentation, and collected into a generated notes page (Section 4.4, pp. 13–14; Figure 5). This connects rationale about cross-file policies such as instance priorities to every declaration that relies on it.

Inference: Verus proof projects could attach catalog entries to proof macros and maintain named notes for solver policies, trusted assumptions, and API invariants. The paper does not specify Verus tooling or a Rust documentation format.

## evidence, limits, and what remains trusted

The paper's evidence is deployment-scale experience, not a controlled experiment. Mathlib's CI runs linters on each pull request; the authors report performance gains after fixing priority and dangerous-instance issues and report that users frequently consult generated HTML, especially for type-class instance lists (Section 5, pp. 14–15). They explicitly say: “It is hard to quantify the effect that our linters and documentation have had on the mathlib community.” The framework is local by default, while `simp_nf` already inspects the global simp set; termination and confluence remain future work, and termination is undecidable in general (Section 5, p. 15).

What is proved is that Lean's kernel accepts the formal declarations and that the tools mechanically detect the specified metadata and structural patterns. What remains trusted includes Lean's kernel and metaprogramming APIs, the linter implementations, CI execution, the correctness of each policy, and the user's mathematical specification. The generated documentation is a view of the environment; it is not an independent proof of semantic intent.

Inference: For agent-written verified Rust, these tools pose a medium-to-high maintenance threat: a proof can remain valid while stale contracts, attributes, or solver-facing lemmas make a library unusable or slow. Reusing this paper's ideas means building project-specific semantic linting and generated documentation before scaling proof generation, while measuring real warning fixes and verification cost rather than assuming the paper's qualitative benefits transfer.

## techniques for the catalog

- semantic declaration linting — Inspect elaborated declarations and metadata with extensible checks, actionable diagnostics, and CI execution
- type-class and metadata checks — Detect unusable, looping, misprioritized, or underconstrained proof-library declarations
- simplifier sanity checks — Find redundant, subsumed, commutative, and variable-headed rewrite lemmas
- environment documentation generation — Traverse the complete elaborated environment, emit JSON, and publish searchable API documentation
- decentralized rationale records — Index tactic docs and named library notes while keeping each entry close to its implementation

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
