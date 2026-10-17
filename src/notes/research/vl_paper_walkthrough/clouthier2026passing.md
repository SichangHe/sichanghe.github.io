# Passing Proofs That Prove Nothing: Deciding Postcondition Vacuity, Precondition Satisfiability, and Contract Completeness for Rust and Kani
(authored by agents unless marked 🧑)
Tag: `clouthier2026passing`, [paper](https://doi.org/10.5281/zenodo.21865170)

## problem and result

The paper studies a failure mode in which a checker reports success while a contract constrains no useful behavior. Its running example is Kani's contract on `NonZero<u32>`:

> “The return type is NonZero<u32>. Its type invariant is already “not zero,” so result.get() > 0 is true of every value the type can hold.” (section 1, PDF p. 2)

An implementation that ignores its input and returns `1` therefore satisfies the same postcondition as the correct implementation. Reachability does not expose this: the assertion executes for every input, so the harness is healthy. The paper separates three emptiness points: jointly unsatisfiable preconditions, a postcondition true for every value admitted by the return type, and a completeness condition that accepts an output the implementation never produces. The paper's Table 1 says the detectors are respectively an unreachable reachability cover, return-value havoc, and a satisfied wrong-output cover (section 2, PDF p. 2).

The contribution is a Rust/Kani tool named `vacuity`, plus Lean 4 proofs of the decision claims. The abstract reports twenty theorems, fourteen with no axioms and none using `sorry`; the empirical pass finds 124 return-value postconditions in the Rust standard-library verification effort, with 36 probeable and 88 skipped with reasons. The 124, 36 and 88 figures come from section 7 (PDF p. 4). In `elicitation`, a 4,693-file project, the tool found 946 postconditions, covered 4, skipped 942, and found 833 preconditions, covered 370 and skipped 463 (Table 3, section 7, PDF p. 5). The paper explicitly says the mathematics is prior work; its claimed contribution is mechanising these checks for Rust and Kani and providing rerunnable artifacts.

## technique 1: postcondition-vacuity decision by return-value havoc

What it is. Given a postcondition `P(a, result)` and return-type invariant `Inv(result)`, the tool asks whether `P` holds for every admissible result, independently of the function body. The paper presents the equivalence:

> “The two statements are equivalent, and the hard direction is the constant function: for any admissible value b, the implementation that always returns b is itself type-valid, so it already lies inside the left quantifier.” (Figure 1 caption, section 3, PDF p. 3)

The left statement quantifies over every type-valid implementation; the right quantifies over every input and every invariant-satisfying return value. A single arbitrary return value query consequently decides a universal claim about all implementations, under the stated generator condition.

How to apply it in Kani:

1. Parse every `#[ensures]` clause from the crate. The paper says `vacuity` uses `syn` and creates one probe per clause (section 5, PDF p. 3).
2. Build a harness with the same inputs as the original contract, but do not call the function. Replace its result with `kani::any::<ReturnType>()` (section 6, PDF p. 4).
3. Assert the clause against that arbitrary result. If Kani proves the assertion, classify the postcondition as vacuous; if a counterexample exists, the clause carries at least some information.
4. Read the verdict as the paper shows it. For the `NonZero::count_ones` probe, `VERIFICATION:- SUCCESSFUL` is annotated “(the clause is vacuous)” (section 7, PDF p. 4). The paper's cover `Status:` example is for the completeness harnesses (technique 3), not for this probe: it reports `Status: SATISFIED <- a wrong output passes: LOOSE` for `*r >= x`, while `*r == x + 1` is `UNSATISFIABLE <- only the true output: TIGHT`; both print `VERIFICATION:- SUCCESSFUL` (section 5, PDF p. 4).
5. Exit non-zero on a finding. The paper says the tool “exits non-zero on a finding so it works as a continuous-integration gate” (section 5, PDF p. 4).

The paper's formal Lean shape is `havoc_decides_vacuity (I : B -> Prop) (P : A -> B -> Prop) : Vacuous I P <-> forall g : A -> B, TypeValid I g -> Satisfies P g` (section 3, PDF p. 3). The evidence for soundness is the theorem, not a finite sample. The method's key assumption is pointwise surjectivity: the generator must be able to produce every admissible result at every input. If it produces more values than the function can return, the tool under-reports (misses some vacuity but invents none); if it produces fewer, it can over-report a real clause as empty (Table 2, section 6, PDF p. 4). Derived and standard `Arbitrary` instances are described as over-covering; a narrow hand-written instance is trusted and listed.

Inference: In Verus, an analogous audit would inspect each `ensures` clause and prove whether it follows from the return type's spec invariant alone. A practical probe can use a separate proof harness over an arbitrary value satisfying the type invariant, with `requires` for the input assumptions and `assert` for the postcondition. This checks specification strength without executing the function; it does not replace the function's own proof. Verus code would retain executable code and contracts, while the probe is proof-only. `kani::any` itself does not carry over; the arbitrary-value construction and its coverage assumption must be expressed using Verus specification values or a proved generator model.

Evidence and limits. The paper's standard-library experiment uses `NonZero::count_ones`, with `result.get() > 0` reported successful and a control `result.get() == 1` failing because a red value is reachable (section 7, PDF p. 4). The control demonstrates that the green verdict is not merely an inert harness. A function whose return type has no usable arbitrary construction is skipped; the paper reports 88 of 124 clauses skipped in the standard-library scan and 942 of 946 postconditions skipped in `elicitation`.

## technique 2: precondition satisfiability by an unreachable cover

What it is. Conjoin all `#[requires]` clauses, havoc the inputs, assume that conjunction, then cover a point after the assumptions. If the cover is unreachable, no input satisfies the preconditions, so every guarded postcondition can pass without depending on code.

> “If no input satisfies it, the body is unreachable and every guarded postcondition holds for every implementation, which is precisely “the proof establishes nothing”: the verdict no longer depends on the code or the specification.” (section 4, PDF p. 3)

Steps from the paper are: construct the conjunction; havoc inputs; assume the conjunction; ask Kani for a reachability cover after it; classify an unreachable cover as precondition vacuity. The paper states both directions as axiom-free Lean theorems (`vacuous_iff_unsat` and `unsat_iff_everything_vacuous`) (section 4, PDF p. 3).

Inference: In Verus, write the conjunction as the function's `requires` contract and make a proof-only harness that introduces symbolic/spec inputs, assumes or establishes the precondition, then attempts to prove reachability of a concrete post-assumption fact. The exact Kani cover operation has no direct Verus equivalent in the cited material; a satisfiability lemma or an explicit witness proof is the safer Verus form. A witness lemma should construct one admissible input, while a contradiction proof shows the precondition is unsatisfiable. Do not treat a successful function proof as evidence that a `requires` conjunction has a witness.

The paper calls the precondition case “classic dead-code vacuity” that reachability finds (Table 1, PDF p. 2). Inference: it does not establish that a satisfiable precondition is useful, nor that the resulting postcondition is strong; the paper's limitation 1 says the tool decides one precise question, not whether a clause is a good specification (section 11, PDF p. 7).

## technique 3: contract completeness by wrong-output cover

What it is. A contract can be non-vacuous, because a random result can violate it, yet still accept an incorrect output. The paper's example is `|r| *r >= x` for a function that adds one: `x + 2` satisfies the contract, so an off-by-one implementation survives. The tool calls the real function for its correct output, havocs a different output, and covers the contract on that output. A satisfiable cover means a wrong output passes; an unsatisfiable cover means only the true output passes (section 4, PDF p. 3). The paper calls this “single-query mutation adequacy over the whole output space”.

Steps, as the paper's description supports them (it says the tool “havocs a different output”; how the difference is enforced is not stated, so steps 2-3 are an Inference about the encoding):

1. Run the real function on symbolic inputs to obtain its reference output.
2. Create a distinct arbitrary output of the same return type.
3. Constrain the arbitrary output to differ from the reference output.
4. Ask whether the contract is satisfiable on that wrong output; classify satisfiable as loose and unsatisfiable as tight.
5. Report the cover status because Kani's top-line success is identical for both outcomes (section 5, PDF p. 4).

Inference: In Verus, encode the intended output relation as an `ensures` clause and prove a separate uniqueness lemma: any value satisfying the contract equals the reference result. This is stronger than merely proving that the implementation's result satisfies the contract. For deterministic code, a proof of uniqueness can use `forall` reasoning over spec values and `assert`/lemma steps; if the contract intentionally describes a bound or set of allowed outputs, the result should remain “loose” because the paper says that is a factual report rather than a judgment (section 11, PDF p. 7). A direct `external_body` or unproved assumption would defeat the audit and is not a Verus form for this technique.

## machine-checked evidence, trust, and reuse

The paper's Lean artifacts are `Vacuity.lean`, `Completeness.lean`, `Precondition.lean`, and `Collapse.lean`; the table reports 7, 5, 2, and 6 theorems respectively. Fourteen of twenty are axiom-free; the remaining six use only Lean's standard classical foundations, and none depend on `sorryAx` (section 9, PDF p. 6). The paper gives commands to clone the repository and run each file, and says Lean 4.20.0 and 4.32.2 both check successfully.

Inference: For VL, the immediate product threat is specification acceptance without semantic content. Agent-written Verus Rust can pass while an `ensures` clause is implied by a type invariant, while `requires` is impossible, or while multiple wrong outputs satisfy a loose contract. The tool's separation of whether a proof is mechanically valid from whether a contract excludes bad behavior is directly relevant. The threat estimate is an inference from the paper's contract examples and is limited by the fact that `vacuity` targets Kani syntax and Kani's arbitrary-value machinery, not Verus's solver and type system.

Inference: trusted components remain Kani and the Lean kernel, solver behavior, the `syn` parser and arbitrary generators, the Rust compiler, and the human-written contract; the paper does not list them this way. The paper's own limitation list says vacuity is not the same as weakness, hand-written narrow generators can be wrong, return-type-dependent modes skip type-rich code, macro-generated functions are invisible to `syn`, and completeness assumes a deterministic contract (section 11, PDF p. 7). Its real-code counts are internally reconciled: each row in Table 3 satisfies found = covered + skipped (4 + 942 = 946; 370 + 463 = 833). Section 7's “36 of them probeable by kani::any()” matches 124 − 88 = 36.

## what VL should not redo

The paper explicitly credits vacuity detection, coverage duality, deductive-verification coverage, testability hypotheses, and mutation adequacy as prior work (section 10, PDF pp. 6–7); it also says the pointwise-surjectivity condition is “one such hypothesis” of Gaudel's framework. Inference: VL should therefore not claim the abstract mathematics or mutation adequacy as new. The reusable work is the contract-level audit pipeline, the explicit generator-coverage boundary, and the requirement that a green verifier result be paired with a content check.

## techniques for the catalog

- return-value havoc: replace a function result with an arbitrary invariant-valid value and decide whether an `ensures` clause holds for all admissible outputs
- unreachable precondition cover: havoc inputs, assume all `requires` clauses, and test whether any state remains reachable after them
- wrong-output cover: compare a contract against a distinct arbitrary output to detect completeness gaps that let incorrect implementations pass
- generator-surjectivity audit: verify that arbitrary-value generation covers every admissible value before trusting a vacuity result
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The control failing is the point: it proves a red was reachable on the same shape, so the green verdict above is not itself hollow."): read all 8 pages of the paper text and the whole study; checked every quotation, number (124/36/88, Table 3 rows and sums, 7+5+2+6 = 20 theorems, 14 axiom-free), section and PDF page reference and technique step; changed misattributed page references, a mangled quotation in technique 2, the wrong claim that a loose contract rejects no random output, the "abstract" attribution of 36 probeable, the unsupported "percentages" remark, and a cover-status example that belongs to completeness, not postcondition vacuity; marked unsupported statements as Inference. Link from the fetch record (the paper text gives no DOI, only the GitHub and simgen.dev addresses). Not checked: the Lean files, the vacuity tool and the repository, the cited prior work, the Verus inferences beyond labelling them, and Section 8 (Mathlib) which the study does not cover.
