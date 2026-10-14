# Generative Compilation: On-the-Fly Compiler Feedback as AI Generates Code
(authored by agents unless marked 🧑)
Tag: `mundler-sasahara2026generative`, [paper](https://doi.org/10.48550/arxiv.2607.13921)
## scope

The paper introduces generative compilation: a compiler checks partial code while an LLM is still generating it. The key device is a sealor that closes a partial program with syntactic structure and typed placeholders, then sends the result to an existing compiler. The paper says: “We introduce generative compilation, the first approach to obtaining compiler feedback on partial programs during generation” (Abstract, PDF p. 1). It targets real Rust and black-box models, so it does not require model logits or constrained-decoding access.

The method is evaluated on 20 C-to-Rust Translation instances and UpdatedAPI repository tasks across seven models. Table 1 reports compiler-error and unit-test functional-correctness fractions for each model/task and each of LLM, post-generation compilation (PC), and generative compilation (GC). Across all 14 model–dataset configurations, GC has a better compiler-error rate than PC in 13 and a tie in one; it is best for functional correctness in 11 of 14 (Section 7.2, PDF p. 23). Overall average compiler-error rate drops from 65.9% with PC to 13.1% with GC; this is an average over the reported configurations, not a per-task denominator (Section 7.2, PDF p. 23).

Inference: for VeruLaw, this suggests placing Rust and Verus feedback inside token or edit generation, so an agent stops building on an already-invalid ownership or syntax prefix before it reaches proof generation.

## technique 1: seal partial programs and reuse rustc

A generative compiler `G` accepts a partial string when it has a valid completion and returns compiler-style diagnostics otherwise. A sealor `S` maps the partial string to a complete program; the induced checker is `G(c) = C(S(c))`. Completeness means no partial program with a valid completion is rejected; soundness means an accepted sealed program has some valid completion (Section 3.1, PDF pp. 6–7). The paper emphasizes that “Compiler rejection of the sealed program should guarantee that the partial program truly requires revision” (Section 2, PDF p. 3).

How to do it. (1) Parse the streamed prefix with a partial-AST parser. (2) Preserve complete generated structure. (3) Close the unfinished frontier with syntax-guided rules and placeholders. (4) Run the ordinary compiler on the sealed output. (5) If rejected, map diagnostics back to the original prefix and ask the model to revise or restart. (6) When EOS arrives, remove suppressed future-dependent errors and compile the complete file normally.

Verus form. Inference: build a partial Rust parser around rust-analyzer or the project’s parser, preserve complete items and proof blocks, and seal unfinished function bodies with typed placeholders that let rustc proceed. Then run rustc first for syntax, typing, and borrow errors, followed by Verus once a syntactically complete body exists. Inference: a Verus-specific sealor would need placeholders that preserve the intended `requires`/`ensures` context; the paper does not define Verus sealing or prove that Verus obligations remain complete under placeholders.

Limits. The method guarantees prefix completeness, not that every accepted prefix will eventually be completed by the model. Semantic verification remains a later stage. Inference: a sealed prefix can compile while its future Verus proof is impossible; VL must therefore retain a hard verifier gate after generation.

## technique 2: FR sealor with mechanized guarantees

For Featherweight Rust (FR), the authors define partial syntax and a realization relation, then define `S_FR` by case analysis. Empty or keyword-only prefixes seal to unit; complete terms are unchanged; partial blocks recurse and append a unit; partial `box` and declaration/assignment initializers recurse; ambiguous copy, move, and borrow forms seal to unit. The paper’s exact rule is summarized by: “SFR abstracts type checking through a syntax-guided transformation” (Section 5.2, PDF p. 14).

The Lean mechanization proves global completeness: if a partial term can realize a well-typed term, its sealed term is well typed (Theorem 5.1 and Corollary 5.2, PDF pp. 15–16). Soundness is selective at statement boundaries, where a block has complete statements followed by no next statement yet (Theorem 5.7, PDF p. 17). This deliberately trades semantic precision for a lightweight sealor.

Inference: VL can copy this proof pattern for a small Verus-facing fragment: define partial syntax, define realization as append-only token completion, prove that each sealing rule preserves at least one well-typed realization, and state soundness only at boundaries where the preserved context is sufficient. Such a theorem would be new work; the paper’s mechanized result is for FR, not Verus.

## technique 3: Rust placeholders and selective error suppression

Real Rust needs separate statement and expression sealors. The statement sealor appends `holediv()`, implemented as `panic!()` with never type `!`; the expression sealor uses `holeval()`, a generic helper returning any inferred type while its body diverges (Section 6.1, PDF pp. 17–18). `holediv()` avoids obligations after a divergent branch; `holeval()` supplies a value without never-type fallback causing spurious mismatches.

The sealor suppresses only future-dependent diagnostics: missing trait items inside partial trait implementations, type-annotation errors inside partial function bodies, and similar errors whose resolution can depend on later generated code. Suppression is scoped, and all suppressed errors are removed at EOS. Diagnostics are projected from the sealed program back to the original prefix using a positional map; diagnostics arising only from inserted placeholders are suppressed (Section 6.1, PDF p. 18).

Feature rules preserve completed statements and recurse on the frontier. Partial blocks append the appropriate placeholder. Partial `if` branches close a missing branch with `holediv()`; partial loop bodies diverge to avoid false second-iteration borrow obligations; calls query rustc for arity and pad missing arguments with `holeval()`; partial field access keeps the receiver by taking a reference; aggregates recurse on the trailing element; top-level items preserve complete definitions and discard unsupported partial instances until a specific rule applies (Section 6.2, PDF pp. 18–21).

Verus form. Inference: use `panic!()`/never-like divergence only for branches where generated continuation cannot observe a value, and use a typed helper only where rustc type inference needs an expression. Keep suppression narrowly scoped to diagnostics that later tokens can legitimately fix, and run unsuppressed rustc plus Verus at EOS. Inference: never suppress a Verus error merely because proof search is unfinished; the paper’s suppression argument concerns Rust’s future-dependent compilation diagnostics.

## technique 4: fixed harness and feedback budgets

The evaluation harness writes model-generated files or edits deterministically, runs fixed commands, and feeds diagnostics into the next prompt. PC permits up to `n` post-generation rounds; GC allows up to `k` early restarts and then `n-k` post-generation rounds. The paper uses `n = 15` for UpdatedAPI and `n = 20` for Translation, with `k = 10` for both (Section 7.1, PDF p. 22). Each model is evaluated twice per task, with temperature 0.6 where supported.

Inference: a VL harness can use a small early rustc loop, then switch to bounded Verus verification and proof repair. Fixed budgets make comparisons reproducible and prevent an agent from consuming unlimited verification calls.

## evidence

Table 1’s denominators are the generated samples for each model–task configuration; the table reports percentages, while the prose reports aggregate averages. GC eliminates UpdatedAPI compiler errors for Opus 4.8 (0.0% versus 6.7% PC) and reduces GPT 5.3 Codex UpdatedAPI errors from 13.3% to 3.3%. It improves functional correctness for GLM 5.2 UpdatedAPI from 53.3% PC to 71.7% GC and for Kimi Translation from 39.9% to 53.9% (Section 7.2, PDF p. 23). Runtime overhead averages 135 seconds (+170%) over no feedback, versus 233 seconds (+283%) for PC. In 85.3% of tasks, generation finishes without switching back to post-generation feedback; 55.4% are solved correctly in the early phase (Section 7.3, PDF p. 24).

GC reports a median error three lines after the eventual primary error span; PC’s median delay is 89 lines and the function-only baseline’s is 14. GC reports errors at a mean 33.3% of file position, versus 40.3% for the function-only baseline; PC waits for completion by construction (Section 7.3, PDF pp. 24–25). GC error reports average 5.5 diagnostics versus 13.8 for PC, and 65% of GC reports contain one or two diagnostics (Figure 12, PDF p. 24).

The FR sealor and its guarantees are fully mechanized in Lean. The real-Rust sealor has about 5,000 lines of Rust, roughly 3,000 lines of Python for the LLM-facing layer, and 329 Rust/Python tests (Section 7.1, PDF p. 23). The real-Rust section gives informal per-feature arguments rather than a full mechanized proof, because it targets rustc directly (Section 6, PDF p. 17).

## trusted boundary and threat to VL

Trusted components include the parser, sealor rules, source-span mapping, rustc, model harness, and (for Verus use) the Verus verifier. Completeness is about not rejecting prefixes with some valid completion; it does not establish functional correctness or proof validity. Inference: the product threat is that an early compiler loop can improve compilability while leaving an incorrect specification or unproved Verus contract. VL should pair this method with a final Verus gate and specification coverage checks.

Inference: VL should not redo black-box constrained decoding or reimplement all of rustc’s type system. This paper shows a lighter approach that reuses rustc and adds syntax-guided sealing; the open work is a Verus-aware policy and proof-stage adapter.

## techniques for the catalog

- sealor-based prefix checking — close partial Rust with typed placeholders and query the existing compiler during generation
- mechanized completeness — define partial syntax and realization, then prove valid completions are never rejected by the FR sealor
- selective soundness — retain stronger rejection guarantees at statement boundaries while keeping other rules lightweight
- typed placeholders and scoped suppression — use divergent/value placeholders and suppress only errors that later tokens can resolve
- bounded feedback harness — combine early restarts with a fixed post-generation repair budget and deterministic diagnostics
Checked 2026-10-13: audit record mundler-sasahara2026generative; paper-study comparison complete; gate executed; experiments not rerun
