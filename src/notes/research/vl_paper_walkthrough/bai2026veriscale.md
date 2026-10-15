# VeriScale: Adversarial Test-Suite Scaling for Verifiable Code Generation
(authored by agents unless marked 🧑)
Tag: `bai2026veriscale`, [paper](https://www.semanticscholar.org/paper/6014a095c1dfe48c9b0ecc503c732c6aeb53f51d)

## scope and result

VeriScale is a benchmark-construction method for verifiable code generation. It expands sparse tests with type-aware inputs and adversarial outputs, then reduces them while preserving discriminative power. The paper instantiates it on VERINA as VERINA PLUS and VERINA LITE. Its central claim is that sparse tests overestimate model capability: “Our experiments across eight state-of-the-art LLMs demonstrate that VERINA PLUS exposes substantial model weaknesses hidden by the original benchmark” (abstract, PDF p. 1). The method assumes each task has a ground-truth precondition and reference implementation (section 3.1, PDF p. 3).

## technique: seed generation and type-aware mutation

Use this to enlarge expected and unexpected input pools while preserving parameter types.

1. Aggregate the problem description, ground-truth precondition, parameter names and types, and existing expected/unexpected inputs into a generation prompt (section 3.1, PDF p. 3)
2. Ask an LLM for a specified volume of distinct candidate inputs, forming a seed pool (section 3.1, PDF p. 3)
3. Build an ingredient pool from existing candidates so mutations can reuse task-context values (section 3.1, PDF p. 3)
4. At each bounded mutation step, choose one parameter, sample a type-specific mutation schema and parameters, and apply it; schemas preserve the parameter's type (section 3.1, PDF pp. 3–4)
5. Apply a syntax filter and classify each candidate against the ground-truth precondition (section 3.1, PDF p. 4)

The paper formalizes mutation as a five-tuple: “M = (T , D, O, p, q).” Here T is input types, D maps a type to its domain, O gives finite mutation schemas, p selects a schema, and q samples its parameters (section 3.1, PDF p. 4). For a candidate expression, first run `#check <expr>`. Then run both `#guard decide <expr>` and `#guard decide (¬ <expr>)`; unresolved cases are unfolded and simplified with `simp_all!`, and bidirectional `plausible` examples decide them (section 3.1, PDF p. 4). Candidates that time out or exhaust search are excluded (section 3.1, PDF p. 4).

Inference: a Verus implementation can generate Rust values using the same type-directed mutator, then check each value with a Rust/Verus precondition predicate. Keep generation outside verified code; use `requires` and `ensures` on the target function and run Verus on each retained case. Type preservation is an input-generation invariant, while semantic validity still requires the precondition check. Lean commands and `simp_all!` do not carry over to Verus.

## technique: adversarial synthesis of unexpected outputs

Use this to test whether specifications reject incorrect outputs that ordinary random negatives miss.

1. Prompt an LLM to decompose the task and expose its structural logic (section 3.1, PDF p. 5)
2. Ask a capable model to generate a formal specification (section 3.1, PDF p. 5)
3. Use a stronger red-team model to synthesize an implementation that exploits weaknesses in that specification (section 3.1, PDF p. 5)
4. If synthesis fails, drop constraints from the ground-truth specification to expose an attack target (section 3.1, PDF p. 5)
5. Execute each adversarial implementation on expected inputs. Retain an output only when it differs from the reference output and is accepted by the generated postcondition (section 3.1, PDF p. 5)

The retention rule makes the negative case specification-relevant: “Outputs are retained only when they differ from the reference outputs while being falsely accepted by the generated postconditions” (abstract, PDF p. 1). The insertion-sort example records seven adversaries; one produces the expected sorted output, while six produce different outputs, so the input kills 6/7 adversaries (Figure 4, PDF p. 6).

Inference: in Verus, represent the reference implementation and candidate postcondition as separate verified functions. Run a candidate implementation on a concrete input, compare its result with the reference result, and retain the case only if the candidate violates the intended result while satisfying the candidate specification. A Verus proof that a specification accepts the case establishes only acceptance by that specification; it does not establish intended correctness. The red-team generator and fallback constraint dropping remain trusted test-generation components.

## technique: precondition-guided bidirectional classification

The method's two-stage classifier rejects malformed expressions before logical evaluation. Syntax failures from missing arguments, type mismatches, or parse errors are discarded. Stage one evaluates both the precondition and its negation with executable decision procedures. Stage two handles unresolved candidates by creating examples, unfolding the precondition, simplifying, and asking `plausible` in both directions (section 3.1, PDF p. 4). In the paper's binary-list example, `[1, 2, 1]` passes `#check`, fails the positive `decide`, and passes the negative `decide`, so it is an unexpected input (Figure 2, PDF p. 4).

Inference: Verus can use executable Rust checks for decidable preconditions and a separate proof obligation for symbolic cases. A case should enter the unexpected-input set only after either a verified positive or verified negated precondition result; unknown cases should remain explicitly unknown rather than being silently assigned a class. Verus's proof obligations do not provide Lean's `plausible` command.

## technique: boundary-preserving reduction

Use this to shrink unexpected-input tests without losing common failure modes.

1. Extract structural signatures such as empty containers, zero or negative values, mismatched lengths, and ordering patterns (section 3.2, PDF p. 5)
2. Place inputs into boundary buckets and retain representative examples from each critical bucket first (section 3.2, PDF p. 5)
3. If budget remains, fill slots from diverse structural buckets, then use a deterministic priority order (section 3.2, PDF p. 5)

The objective is explicitly compact coverage of “typical precondition violations and edge-case behaviors” (section 3.2, PDF p. 5). Unexpected outputs remain associated with their corresponding inputs during reduction (section 3.2, PDF p. 5).

Inference: a Verus-oriented reducer can compute the same signatures over Rust values and select representatives before running verification. This is test selection, not a proof that omitted values are safe to omit; report the bucket policy and budget with every benchmark.

## technique: adversary-killing set-cover reduction

Use this to reduce expected input-output pairs while preserving the ability to expose synthesized specification flaws.

1. Treat every synthesized adversarial implementation as a mutant (section 3.2, PDF p. 5)
2. For each expected pair, record which mutants produce a different output, i.e., which mutants the pair kills (section 3.2, PDF p. 5)
3. Greedily select pairs covering the largest number of currently unkilled mutants until every mutant detected by the expanded suite remains covered (section 3.2, PDF p. 5)
4. Under a fixed per-task budget, add pairs that kill the highest number of remaining implementations (section 3.2, PDF p. 5)

The paper describes this as a set-cover formulation and says it avoids coverage loss from random or diversity-only reduction (section 3.2, PDF p. 5). In Figure 4, one pair kills six of seven mutants, making it high quality (PDF p. 6).

Inference: for Verus tasks, define a mutant's killed relation by unequal reference and mutant outputs on a concrete input, then apply the same greedy set cover. The reducer does not need to prove mutant incorrectness; it needs a trusted reference and deterministic comparison. A product evaluation should keep the full mutant list for audit even when the published suite is reduced.

## evidence, trust, and limits

The expansion uses GPT-5.3-Codex for seeds, decomposition, and adversarial implementations, and six additional models for candidate specifications; expansion cost was $58.89 (section 4.1, PDF p. 6). VERINA PLUS has mean 370.07 expected pairs, 1114.01 unexpected outputs, and 119.00 unexpected inputs, versus VERINA's 5.89, 12.69, and 0.65; the table reports multipliers of 62.83×, 87.79×, and 183.08× respectively (Table 1, PDF p. 6). VERINA LITE has means 52.34, 202.35, and 15.80, with 8.89×, 15.95×, and 24.31× multipliers (Table 1, PDF p. 6). These are means over benchmark tasks; the table also gives min–max ranges.

Eight models are evaluated with Lean 4.24.0 on 80 physical CPU cores, using pass@1 and removing VERINA's original 2-shot setting (section 4.2, PDF p. 6). GPT-5.5's Code Score drops from 96.83 on VERINA to 86.24 on PLUS; its Spec Sound&Complete Score drops from 68.78 to 44.44 (Figure 5, PDF p. 7). Across models, average evaluation time rises from 1032 to 1860 seconds for SpecGen (1.80×) and from 244 to 365 seconds for CodeGen (1.50×); LITE reduces these to 1427 seconds (1.38×) and 255 seconds (1.05×) (Table 2, PDF p. 8). The paper reports a Claude-Opus baseline specification gap of 13.23% as 77.78% versus 64.55%, then a PLUS gap of 4.76% as 50.26% versus 45.50% (section 4.3, PDF p. 7). The displayed Figure 5 values should be treated as the source for those settings; the text does not provide per-model denominators beyond benchmark tasks and pass@1.

The ground-truth preconditions and reference implementations are required (Limitations, PDF p. 8). Unexpected-output quality is bounded by the red-team LLM's reasoning and Lean typing, and expansion is compute-intensive (Limitations, PDF p. 8). The evaluation trusts Lean, the reference implementations, the ground-truth specifications, model-generated adversaries, and the benchmark harness. No theorem proves that the generated test suite is complete.

Inference: VeriScale is a high threat to any claim that agent-written verified Rust succeeds based on sparse examples: a model can satisfy a few tests while failing adversarial cases. The method is directly reusable for VL evaluation, but its Lean-specific classifier and LLM-dependent adversaries require a Verus adapter and independent checks. VL should reuse the expansion/reduction design rather than redo the benchmark-quality idea; it still needs Rust ownership cases, panic/overflow behavior, unsafe boundaries, and specification review. The paper does not establish production correctness of generated Rust.

## techniques for the catalog

- type-aware mutation — generate typed seeds and iteratively mutate one parameter with schema-specific perturbations
- bidirectional precondition classification — decide both a predicate and its negation, then resolve unknown cases with simplification and counterexamples
- adversarial-output synthesis — red-team generated specifications and retain divergent outputs they falsely accept
- boundary-preserving reduction — keep representative empty, zero, sign, length, and ordering boundary cases
- adversary-killing set cover — greedily retain expected pairs that kill the most synthesized mutants
- specification benchmark scaling — compare expanded and reduced suites with pass@1 scores and evaluation-time denominators

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
