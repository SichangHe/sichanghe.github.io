# Local Success Does Not Compose: Benchmarking Large Language Models for Compositional Formal Verification
(authored by agents unless marked 🧑)
Tag: `xu2025local`, [paper](https://arxiv.org/abs/2509.23061v1)

Audit: audited 2026-10-13 against the paper; checked every number, page and section reference, the technique steps, quotations, Table 1 and Table 2 arithmetic and the Verus forms; changed: the 95.67% and 3.69% averages and the Pass@4 to Pass@8 gains now flagged as not matching Table 1, verification denominator corrected to the paper's definition over syntactically valid outputs, pages for the validation pipeline and Observations 2 and 3, array-bound invariant example reworded, a Verus benchmark claim the paper does not make removed, Inference marks added to the study's own statements, a stray catalog word fixed.

## what the paper establishes

The paper introduces DAFNYCOMP, a benchmark for generating specifications for programs made of several interacting Dafny functions. Its central claim is measured on 300 automatically synthesized, mechanically verified programs. The benchmark contains chains of 2–5 functions, with mean 3.2 functions and 8.4 cross-function data dependencies (§3.4, p.6). The benchmark asks a model to reconstruct removed `requires`, `ensures`, `reads`, `modifies`, and `decreases` clauses while leaving the implementation in place (§3.3, p.6). The paper reports 13 models from five families.

The headline result is a sharp compositional gap. At Pass@8, syntax correctness averaged 95.67% (standard deviation 4.21%) while verification averaged 3.69% (standard deviation 2.14%) across the model set (§4.3, Observation 1, p.7). Inference: these two averages do not match Table 1; recomputing the 13 Pass@8 entries gives about 95.0% syntax and about 1.3% verification, so the paper's own figures are inconsistent and the headline 3.69% should not be relied on. The paper states: “This performance cliff persists across all model families despite increased sampling (Pass@8), indicating an architectural rather than search limitation.” (§7, p.10). The paper states the averages are over the 13-model set at Pass@8; the table has 300 benchmark programs per model. The paper's comparison to roughly 53% single-function verification is a comparison with DAFNYBENCH, not a result obtained from this 300-program set (§4.3, Observation 2, p.8).

## technique 1: assemble a compositional benchmark with controlled dependencies

When to use it: use this construction when evaluating whether a generator can preserve contracts across calls, rather than merely annotate isolated functions. A chain exposes whether one function's postcondition establishes the next function's precondition.

How the paper does it:

1. Select source functions whose McCabe cyclomatic complexity is greater than 5 and whose code has at least 10 lines (§3.1, p.4). Restrict to single-input/single-output functions, leaving 1,847 candidates.
2. Compose functions in a chain, feeding each output to the next input. Try permutations because ordering changes data flow and verification difficulty (§3.1, p.4). The paper reports 47% synthesis success for chains and less than 8% for arbitrary call graphs; these are synthesis success rates for the construction trials, not model verification rates.
3. Resolve the smallest shared import set so external names can be replaced or interpreted during translation (§3.1, p.4).
4. Type-check each chain by propagating input/output types, shapes, and simple value constraints along the chain. Reject incompatible interfaces (§3.1, p.5).
5. Canonicalize formatting with deterministic rewriting using tools such as Black and isort. Run the source unit tests and discard exceptions, failed assertions, or wrong outputs (§3.1, p.5).

The result is 1,200 valid Python compositions. The paper says: “This filtering isolates verification challenges to specification and reasoning rather than implementation errors during the Dafny translation stage.” (§3.1, p.5). It then balances the final benchmark by function-count bands: 100 programs with 2–3 functions, 100 with 3–4, and 100 with 4–5 (§3.2, p.5). The benchmark spans 15 algorithmic categories; dynamic programming is 18%, string manipulation 20%, number theory 15%, and graph algorithms 12% (§3.4, p.6). The median program needs seven loop invariants and four assertions; 23% need nontrivial `decreases` termination arguments (§3.4, p.6).

Verus form: Inference: make a benchmark harness around Rust/Verus methods with explicit `requires` and `ensures`, then compose methods so one method's postcondition must imply the next method's precondition. Keep the implementation and test oracle fixed, and remove only contracts and proof annotations from the model prompt. Inference: Verus uses Rust syntax and its own specification/proof constructs, so Dafny `reads`, `modifies`, and `decreases` clauses do not transfer literally; preserve the underlying obligations as Verus `requires`, `ensures`, loop `invariant` statements, and proof functions where needed. Inference: use deterministic tests and type/shape checks before Verus translation to separate implementation defects from specification failures.

Evidence and trust: the paper reports every retained program verified by Dafny 4.10.0 (§3.4, p.6), and 564 verified Dafny programs from 1,200 translation attempts (47%); the reported failure shares are incomplete specifications 31%, type inference errors 22%, timeouts 18%, and irreconcilable semantic gaps 29% (§3.2, p.5). Inference: the benchmark's trust boundary includes the source implementations, unit tests, AST translator, Claude-4-Sonnet synthesis/refinement, and Dafny verifier. Inference: mechanical verification establishes the generated Dafny contract against its implementation; it does not establish that the contract captures user intent. The paper is internally inconsistent about the synthesis model: Appendix E says its prompts were used with Claude 3.5 Sonnet, §3.2 says Claude-4-Sonnet.

## technique 2: incremental AST-guided translation with verifier refinement

When to use it: use this pipeline when direct whole-program translation cannot supply invariants, postconditions, or termination arguments. It localizes errors while retaining a complete source-level data-flow blueprint.

How to do it:

1. Compose and validate the entire Python program first (§3.2, p.5).
2. Decompose its abstract syntax tree into function-level and control-structure fragments (§3.2, p.5).
3. Translate one fragment into Dafny and verify it immediately. Keep verified fragments and progressively reassemble them in AST order (§3.2, p.5).
4. Run up to ten refinement iterations per candidate. On verifier feedback, strengthen specifications, add loop invariants, refine postconditions, or insert assertions (§3.2, p.5).
5. Retain only complete Dafny programs that verify, then balance the complexity bands.

The paper explains why the two levels are complementary: “Whole-program composition in Python provides two benefits: (i) Python’s explicit AST nodes and mature tooling make program assembly more reliable and transparent; and (ii) having a coherent Python blueprint ensures that the incremental Dafny translation preserves global logical relationships, rather than producing isolated fragments that fail to compose.” (§3.2, p.5). Direct end-to-end translation had below 5% empirical success (§3.2, p.5), whereas the incremental pipeline produced 564 verified programs from 1,200 attempts.

Verus form: Inference: build or retain a complete Rust call chain as the executable blueprint, then synthesize one Verus contract or loop proof obligation at a time and run Verus after each fragment. Inference: use the verifier's diagnostics to add `invariant` statements, strengthen `ensures`, and add `assert` or proof-function lemmas; do not express a Verus invariant as `invariant(...)`, and do not put `ensures` on a `spec fn`. Inference: the paper's ten-iteration cap can become a bounded repair loop around `verus`, with the original Rust body immutable unless a separate implementation task is intended.

Evidence and limits: the 47% figure is for the authors' Claude-based translation pipeline, not for an LLM asked to solve the benchmark. The paper lists the translation failure causes as incomplete specifications 31%, type inference errors 22%, timeouts 18%, and irreconcilable semantic gaps 29% (§3.2, p.5). The chain topology is tractable but omits cycles and mutual recursion.

## technique 3: reconstruct contracts and score syntax separately from proof

When to use it: use this evaluation protocol to distinguish language-format competence from semantic contract competence.

Procedure:

1. Remove only method-level `requires`, `ensures`, `reads`, `modifies`, and `decreases` clauses; leave implementations, assertions, and invariants as the task context (§3.3, p.6).
2. Ask the model to regenerate the missing clauses with one unified prompt (§3.3, p.6; Appendix G).
3. Count syntax correctness when Dafny parses the output (§4.1, p.6).
4. Count verification success when Dafny proves the complete program; the paper defines the rate as the fraction of syntactically correct programs that pass, computed only over syntactically valid outputs (§4.1, p.6).
5. Report Pass@1, Pass@2, Pass@4, and Pass@8; Pass@k is the probability that at least one of k attempts solves a problem (§4.1, p.6).

Verus form: Inference: apply the same protocol by stripping Verus `requires` and `ensures` and any proof-only annotations selected for the task, while preserving Rust executable code. Run `verus` for parse/type checking and proof checking separately; report denominators explicitly because a verification percentage conditioned on parseable outputs is different from an all-attempt percentage.

Results and interpretation: Claude-3.5-Sonnet reaches 7.00% verified at Pass@8, the best entry in Table 1; GPT-4o reaches 0.33%; GPT-4.1 reaches 0%; QWQ-32B reaches 0%. Inference: Table 1's verified values are multiples of 1/300 (for example 0.33 and 3.67), which fits a 300-program denominator, not the valid-output denominator that §4.1 states; the paper does not reconcile the two. The paper reports average gains from Pass@4 to Pass@8 of 0.8% in verification versus +7.3% in syntax (§4.3, Observation 3, p.8); Inference: Table 1 gives about 0.4 and about 3.9 percentage points on recomputation, so these figures also do not match the table. Inference: more samples mostly find parseable contracts, not valid compositional proofs.

## technique 4: classify failures by contract propagation, alignment, and induction

When to use it: use this diagnosis after verification failures to decide whether a repair should add a boundary contract, reconcile code and proof, or repair an inductive argument.

The authors manually validate 10% of an automated analysis of 900 failures from three representative model families (Table 2, p.8). The denominator is 900 failures, not all generated programs. Specification fragility is 353/900 = 39.2%; implementation–proof misalignment is 195/900 = 21.7%; reasoning instability is 127/900 = 14.1%; other failures are 225/900 = 25.0% (Table 2, p.8). The fractions sum to 900/900 and the percentages sum to 100.0%.

* specification fragility: a local contract omits a fact required downstream. Their digit-sum example omits `ensures result >= 0`; a later function requires non-negativity, so the chain fails although each implementation is locally sensible (§5.1, p.8).
* implementation–proof misalignment: generated code contradicts its own annotations. The paper gives `assert 0 >= 1` and a loop invariant, forall k :: 0 <= k < i ==> cnt[k] >= 0, that fails because the implementation's array access patterns violate the stated bounds (§5.2, p.9).
* reasoning instability: an invariant does not preserve state across iterations, or a recursive method lacks a termination argument. The paper's example is `invariant res == stringToIntHelper(s[..i])` (§5.3, p.9).

Verus form: Inference: classify a failed Rust proof first by checking whether a callee `ensures` entails the caller's `requires`; next check that every `assert` and loop `invariant` matches actual indexing and mutation; finally check base case, preservation, and termination obligations. Inference: this is a repair triage rule derived from the paper's categories, not a procedure evaluated by the authors.

## what is proved, what stays trusted, and product threat

Inference: the benchmark proves only that retained Dafny implementations satisfy the supplied generated contracts under Dafny 4.10.0. It does not prove that contracts express intended behavior, that finite source tests cover all Python behavior, or that a model's high syntax rate means reliable verification. The paper explicitly limits the benchmark to functional correctness—preconditions, postconditions, and invariants—and excludes liveness, resource bounds, and security policies (§6, p.10). It also restricts compositions to chains because arbitrary call graphs had less than 8% synthesis success in construction trials (§3.1, p.4).

Inference: the threat to a product that asks agents to write verified Rust is high at component boundaries. A locally verified function can export a weak `ensures`, allowing callers to fail or forcing callers to assume facts that were never proved. The paper's 3.69% Pass@8 verification rate is a warning about generated compositional specifications, not a direct failure rate for Verus or for production code. Inference: VL should require contract review and caller–callee checks, preserve implementation/specification coupling during generation, and test impossible outputs or behaviors in addition to running the verifier. Inference: benchmark results should be reported with parseability, verification, and task denominators separated.

The paper's own future work leaves arbitrary call graphs, richer specification types, and scarce verified multi-function training data unresolved (§6, p.10). The paper names single-function Dafny benchmarks (DAFNYBENCH, MBPP-DFY; §2, p.3) and presents DAFNYCOMP as the first benchmark of compositional specification generation (§1, p.2); it names no Verus benchmark.

## techniques for the catalog

- controlled chain benchmark — compose verified functions with explicit data dependencies, type/shape checks, formatting normalization, and unit-test filtering
- incremental AST translation — translate and verify fragments, reassemble them, and refine contracts from verifier feedback for bounded iterations
- contract reconstruction evaluation — strip method contracts, regenerate them, and report syntax and Pass@k verification separately
- three-mode failure diagnosis — classify failures as boundary-contract fragility, implementation–proof misalignment, or broken induction
