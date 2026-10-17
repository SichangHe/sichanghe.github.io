# Automated Proof Generation for Rust Code via Self-Evolution
(authored by agents unless marked 🧑)
Tag: `chen2024automated`, [paper](https://arxiv.org/abs/2410.15756v3)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## scope and contribution

SAFE (Self-evolving Automated prooF gEneration) addresses the data bottleneck for Verus proof generation. The paper's claim is that iterative synthesis, verifier filtering, and fine-tuning can turn proof-poor Rust corpora into useful proof models. The input is 45,395 single-function programs from MBPP and CodeNet; GPT-4o translates them into Verus-compatible Rust, then generates specifications and proofs. The authors report 21,398 compilable translations, 19,017 accepted specifications, 9,706 verified programs, and 10,486 debugging pairs (section 4.1, PDF p. 7). The central design is verifier-in-the-loop self-training, rather than trusting model text.

The paper explicitly says: “SAFE establishes a self-evolving cycle where data synthesis and fine-tuning collaborate to enhance the model capability, leveraging the definitive power of a symbolic verifier in telling correct proofs from incorrect ones” (abstract, PDF p. 1). This is a claim about the workflow; the verifier determines acceptance, while model improvement is measured on held-out benchmarks.

## technique 1: translate ordinary Rust into Verus-compatible Rust

What and when. Verus supports only part of Rust. SAFE first converts ordinary snippets before specifications or proofs are attempted. The paper names `for`, iterators, `HashMap`, and other standard-library features as unsupported or partial (section 3.1, PDF p. 4).

How to apply it:

1. Collect Rust functions and their natural-language docstrings from the source corpus
2. Prompt GPT-4o with Verus's unsupported-feature list and request equivalent Verus-supported code
3. Compile every translation with the Verus compiler's grammar/compatibility checks
4. Drop every non-compiling result; pass only compilable functions onward

The concrete transformation is an iterator implementation into a `while` loop (section 3.1, p. 4). This stage runs once, before self-evolution.

Verus form (inference). Keep executable code inside `verus!`, use supported ownership and collection APIs, and replace unsupported iteration with explicit indices and loop invariants. Translation changes implementation but should preserve the docstring's intended behavior; the compiler check establishes syntax and typing, not semantic equivalence to the source Rust.

Evidence and limits. Of 45,395 inputs, 21,398 (47.1%) survived translation (section 4.1, p. 7). The paper does not report a semantic-equivalence proof between source and translation. This is a trusted assumption and a threat if translation changes behavior. Large projects additionally need cross-file dependency resolution, which SAFE leaves open (appendix D.1, PDF p. 20).

## technique 2: score and filter synthesized specifications

What and when. Proof generation needs `requires` and `ensures`, but few Verus programs have specifications. SAFE generates candidate preconditions and postconditions from code plus docstrings, then keeps specifications that are useful without requiring perfect completeness.

The paper's binary-search shape has quantified ordering and membership preconditions and an indexed result postcondition: `requires forall|i:int, j:int| ...`, `exists|i:int| ...`, and `ensures ... k == v[r as int]` (Listing 1, PDF p. 3). A loop then carries invariants such as `i2 < v.len()` and existence of a remaining matching index.

How to apply it:

1. Generate candidate Verus specifications with GPT-4o in round 0
2. Obtain original input/output tests `T`; if few exist, generate tests
3. For each test `(i,o)`, use Verus symbolic evaluation to check whether specification `S(i,o)` holds; the experiments use 5 ground-truth tests on average
4. Mutate each output to a random `o'`, forming `T'` (20 wrong cases on average), and check that `S(i,o')` is rejected
5. Compute `Correctness_S = |{(i,o) in T : S(i,o)}|/|T|` and `Completeness_S = |{(i,o') in T' : not S(i,o')}|/|T'|`
6. Keep candidates with correctness at least 80% and completeness at least 60%; retain up to three per function
7. Fine-tune the next model on accepted pairs and repeat until accepted-pair growth stops; SAFE uses two specification rounds after GPT-4o round 0

The exact rationale is: “SAFE is fine with incomplete specifications, as the usage of specifications in SAFE is to stimulate proof synthesis not to judge code correctness” (section 3.2, PDF pp. 5–6). Trivial specifications are discarded because they produce no proof annotations.

Verus form (inference). Encode candidate behavior with `requires`, `ensures`, quantifiers, and sequence views; use Verus symbolic checks rather than executing tests. The score is a data-selection heuristic, not a proof that the specification describes the intended function. A 100% correctness threshold is deliberately avoided because generated tests may themselves be wrong.

Evidence and limits. The resulting 19,017 specifications came from the 21,398 compilable programs after two self-evolution rounds (section 4.1, p. 7). Low-quality specifications materially damage learning: on VerusBench, low-quality training gives total Accuracy@1 17.27% versus SAFE 43.17%, and Accuracy@10 23.02% versus 53.96% (Table 3, PDF p. 10). The gcd example shows the failure mode: specification `result > 0` omits the divisor property, allowing a proof that merely copies `a > 0` and `b >= 0` (appendix F.4, p. 25).

## technique 3: verifier-filtered proof synthesis and self-evolution

What and when. Once function-specification pairs exist, generate complete proof annotations. Acceptance is mechanical: Verus must verify the function; any error discards the proof. SAFE bootstraps with a detailed GPT-4o prompt, then fine-tunes an open model (Llama 3.1 or DeepSeekCoder) in three rounds.

How to apply it:

1. Prompt GPT-4o with Rust code, specification, and explicit loop-invariant/proof-writing guidance
2. Run Verus; retain only proofs with zero verification errors
3. Fine-tune the open model on accepted `(program, specification, proof)` pairs with sequence-to-sequence loss `-sum log P(y_i | S,y_<i)`
4. Generate the next round's proofs with the fine-tuned model; the reported model has three proof rounds after bootstrapping
5. Verify every output and add only verified proofs to the next training set
6. Stop after diminishing gains; the paper uses three rounds

Verus form (inference). Proofs use loop `invariant` clauses, `assert`, `lemma` functions, proof blocks, quantifier triggers, and arithmetic bounds. Listing 1 demonstrates invariants preserving binary-search range, sortedness, and existence. A useful model must emit annotations that make the SMT-backed verifier discharge the whole function; unlike Lean tactic search, Verus does not expose a naturally ordered sequence of proof steps.

Evidence. On 139 human-written VerusBench tasks, (23 Verus-tutorial programs, 38 SV-COMP-2021 tasks, 78 MBPP-DFY tasks, Section 4.2; the AutoVerus paper's Verus-Bench has 150 tasks, with 11 more from CloverBench by its Table 1, and the study infers that this accounts for the 139 versus 150 gap, which neither paper states) DeepSeekCoder SAFE reaches 43.17% Accuracy@1 and 53.96% Accuracy@10; GPT-4o raw reaches 11.51% and 24.46%. On 1,435 CodeNet-Test tasks, SAFE reaches 43.83% at @1 versus GPT-4o raw 0.28% (Table 1, PDF p. 8). Round 3 improves VerusBench total @1 from 32.37% (round 1) to 43.17%; @10 from 41.73% to 53.96% (Table 2, p. 9). GPT-4o bootstrapping cost one month of nonstop invocations and produced proofs for “more than one thousand Rust functions” (section 3.3, p. 6), a major cost assumption.

## technique 4: train whole-proof self-debugging from verifier errors

What and when. Incorrect proof attempts are retained as supervision when a later attempt succeeds. For each incorrect `Y_X`, pair it with Verus's error message and eventual correct `Y✓`; fine-tune a debugging task with loss `-sum log P(y_i | Y_X, Error_YX,y_<i)` (section 3.3, PDF p. 7).

How to apply it:

1. Generate multiple proofs for one program
2. Record each rejected proof and the complete Verus diagnostics
3. When a verified proof is found, create `{incorrect proof, errors, correct proof}` triples
4. Jointly fine-tune proof generation and repair
5. At inference, sample initial proofs, then repair each failed proof using its diagnostics
6. Re-run Verus and accept only a verified repair

The paper reports a concrete repair: an `is_sorted` invariant used `0 <= i < j < index`; SAFE changes the boundary to `0 <= i < j < index + 1`, after which Verus succeeds (appendix F.2, PDF p. 24). A separate GPT-4o-versus-SAFE comparison (not a debugging repair) shows SAFE's first proof adding an invariant bounding old array values by `0x7FFFFFFB`, which addresses the overflow error GPT-4o's proof left; Verus reports “verification results:: 2 verified, 0 errors” (appendix F.1, p. 23; Listing 9, p. 25).

Evidence. DeepSeekCoder SAFE+ reaches 49.64% Accuracy@2 and 70.50% @100 on VerusBench; corresponding SAFE direct values are 46.76% and 59.71% (Table 1, p. 8). CodeNet-Test SAFE+ is 48.43% @2 versus 44.74% direct. Two further self-debugging rounds beyond the first add less than 1% (section 4.3.2, p. 9), so repeated repair has sharply diminishing value.

Verus form (inference). Feed the model exact compiler diagnostics that identify failed invariants, preconditions, arithmetic obligations, or triggers. Repair should edit annotations while preserving executable code and specifications, then invoke Verus again. The training pair does not identify which edit fixes which error; the authors propose finer-grained edit/error alignment as future work.

## what is proved, measured, and trusted

Proved by the system: each retained proof passes the Verus verifier, whose SMT backend discharges Rust specifications and annotations. Measured: benchmark Accuracy@K, where a task counts as one only if at least one sampled proof verifies; denominators are 139 VerusBench tasks and 1,435 CodeNet-Test tasks. The paper also measures specification scores over test sets and mutations.

Trusted or assumed: GPT-4o translations preserve intended semantics; docstrings and generated tests express the intended contract; Verus, its libraries, and SMT solver are sound; benchmark specifications are meaningful; model outputs are not accepted without verifier checking. The authors report that SAFE fails on 20.86% of VerusBench programs “even after sampling 100 proofs and 100 debugged proofs for each incorrect proof (i.e., Accuracy@100)” (appendix F.3, p. 25). This disagrees with Table 1 (p. 8), whose best Accuracy@100 is 70.50% (10 initial proofs and 10×10 debugged proofs, so 29.50% fail), while the introduction (p. 3) says 79.14%; the paper's own figures are inconsistent. Removal-of-odds needs `assert` and `reveal`; the authors “suspect that the reveal feature is never synthesized in any finetuning dataset” (appendix F.3), a suspicion, not a measured fact. SAFE targets small function-level algorithms; dependencies in large projects and deep proof decomposition remain unresolved.

## implications for VL and product threat (inference)

VL should reuse the verifier-filtered data loop, correctness/completeness filtering, and error-conditioned repair. It should not redo a generic prompt-only proof benchmark or train on low-quality contracts: the paper's controlled low-quality comparison shows large drops. It also should not assume function-level success transfers to a product with cross-module dependencies, unsupported Rust features, or specifications that encode weak behavior.

The threat to a product that accepts agent-written verified Rust is medium to high (inference). Verification catches proof and implementation obligations only relative to the supplied specification; SAFE's own gcd case (`ensures result > 0`, appendix F.4) demonstrates a weak contract that yields an extremely simple proof. Translation and generated tests can silently change intent, and benchmark failure remains (20.86% per appendix F.3). Product use therefore needs human-owned specifications, dependency-aware verification, and explicit review of trusted Verus/SMT components.

## techniques for the catalog

- Verus-compatibility translation — translate unsupported Rust constructs, compile with Verus, and discard non-compiling programs
- Specification score filtering — retain candidates with at least 80% correctness and 60% mutation completeness, up to three per function
- Verifier-filtered self-evolution — fine-tune on proofs that Verus verifies and iterate rounds until gains plateau
- Error-conditioned whole-proof repair — train on rejected proof, Verus diagnostics, and later verified proof, then reverify repairs

Audited 2026-10-12 against the paper: checked all counts (45,395; 21,398 = 47.1%; 19,017; 9,706; 10,486), thresholds, test counts (appendix C), Tables 1-3 values, loss formulas, algorithm steps, listings, the quotations, and page references. Changed: quote page range, the 0x7FFFFFFB example (a GPT-4o comparison, not a repair), debugging-round wording, the 20.86% figure (flagged as inconsistent with Table 1 and the introduction), reveal claim (paper only suspects), gcd 'vacuous' to 'weak'. Not checked: the Verus syntax of the studies' prose descriptions beyond the paper's listings; Table 5-8 t-tests. Follow-up: added a clause saying the 139-task VerusBench composition (23+38+78) differs from the 150 of AutoVerus and verusyn.
