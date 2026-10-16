# Seeking Specifications: The Case for Neuro-Symbolic Specification Synthesis
(authored by agents unless marked 🧑)
Tag: `granberry2025seeking`, [paper](http://arxiv.org/abs/2504.21061v1)
## paper and scope

Granberry, Ahrendt, and Johansson study generation of ACSL contracts for C with Deepseek-R1. The paper asks how a model handles buggy code and how symbolic analyses can steer synthesis. An earlier review already covers the paper's broad motivation; this study records the complete experimental procedure and the transferable workflow. The authors state: “The LLM prompts are augmented with outputs from two formal methods tools in the Frama-C ecosystem, Pathcrawler and EVA.” (Abstract, PDF p. 1.)

The output target is a function contract: ACSL `requires`, `ensures`, and `assigns`; loop invariants are deliberately outside the experiment. The authors write: “we focus on function contracts – particularly preconditions, postconditions, and assigns clauses – and our prompts are designed to generate these while leaving out loop invariants.” (Section 3.2, PDF p. 9.)

## technique 1: prompt the model to separate implementation from intent

What it is and when to use it. Code-derived specifications can formalize a bug. Ask the model explicitly whether the contract should describe observed implementation or intended behavior, especially when code may be faulty.

Steps in the paper. Build the 50-program `intent_tests` suite: 20 Basic programs, 10 Famous programs, and 10 Mirror programs are described in the dataset section; the remaining Unique category appears in the reported table. Create four variants: Baseline, Buggy (small semantic edits), Anonymized (generic function names), and Buggy Anonymized. For each program and prompt, generate three outputs at temperature 0.7. Use a baseline prompt containing the C program, step-by-step ACSL instructions, and few-shot valid annotations. In the intent-prioritized variant, add an instruction to generate contracts for intended behavior when a bug exists; in the implementation-prioritized variant, ask for the code as written. Inspect the model's reasoning and generated contracts rather than comparing against a gold specification.

The paper reports: “Deepseek-R1 was overwhelmingly successful at identifying the intent behind the programs provided.” (Section 3.4, PDF p. 10.) It reports three exceptions, all in the buggy-anonymized condition, where the edit made the code resemble another coherent program. Bug detection is reported as fractions by test suite: Basic 47/60, Famous 9/30, Mirror 28/30, Unique 26/30, Anonymized Basic 50/60, Anonymized Famous 14/30, Anonymized Mirror 26/30, and Anonymized Unique 27/40 (Table 1, PDF p. 11). Each denominator is the number of generated cases in that category.

A concrete palindrome example shows the default danger. The model notices that `right = strlen(str)` compares against the null terminator, then says: “the user’s code may have a bug, but we have to add annotations based on the code as given.” (Section 3.7, PDF p. 11.) When the prompt prioritizes intent, it instead reasons that `right` should start at `strlen(str) - 1` and writes a contract for palindrome behavior. The prompt therefore chooses which behavior is formalized; it does not repair the C implementation.

Verus form. Inference: present Rust to the model together with an explicit mode selecting implementation behavior or intended behavior, and require it to list suspected bugs before writing `requires` and `ensures`. Inference: for intended behavior, a human requirement or reference test must be supplied; Verus can prove the chosen contract about the Rust code, but cannot infer which behavior a human intended. A Rust contract uses `requires`, `ensures`, and loop `invariant` clauses; a `spec fn` can define mathematical predicates, but it is not executable code.

Evidence and limits. The evaluation is qualitative and intentionally has no predefined gold contract. The authors state: “our evaluation methodology does not attempt to benchmark the generated specifications against any predefined gold standard.” (Section 3.3, PDF p. 10.) Thus the fractions measure observed bug recognition, not contract correctness. Famous programs had low detection (9/30 and 14/30 anonymized), and the authors attribute this to difficulty constructing useful specifications before analyzing code. Temperature 0.7 and a hosted model reduce reproducibility.

## technique 2: feed PathCrawler examples into synthesis

What it is and when to use it. PathCrawler combines concrete and symbolic execution to generate input/output examples. Append compact test rows to the ordinary prompt when the model needs concrete behavior to generalize into postconditions.

Steps. Run PathCrawler on each C program. Give the LLM the program, baseline few-shot instructions, and PathCrawler's input/output rows with verdicts; do not provide executable test oracles. Generate three outputs at temperature 0.7. Compare `baseline_set` (program only) with `pathcrawler_set` (program plus rows), inspecting contract counts and reasoning. PathCrawler's goal is minimal full path coverage, but the paper says specification synthesis benefits from “full path coverage” and multiple examples per path; otherwise the model may fit one example.

The paper's exact tool description is: “Employing a technique known as concolic testing – using a combination of concrete and symbolic execution – PathCrawler efficiently explores different execution paths in the program.” (Section 2.2, PDF p. 3.) In the TestShiftRT example, the model traces supplied rows and turns them into a structured postcondition counting which predicates hold. For binary search, rows reveal that the input array must be sorted; the model proposes a `requires` clause even though the C code does not enforce sorting. For BugKPath, rows expose an out-of-bounds write and support a conditional `ensures`, while the authors note that one example is too specific to establish a general contract.

Verus form. Inference: run a Rust test generator or bounded symbolic executor, serialize input/output pairs, and append them to the Verus-generation prompt. Ask for general `ensures` that cover all rows, then verify them with Verus and add a separate reference specification or tests. Examples are evidence for a contract, not a proof of all inputs. Inference: path coverage must be tracked separately from Verus proof success because Verus does not automatically explore all concrete paths.

Evidence and limits. The authors report that PathCrawler context produced “more abstract reasoning and better structural organization when ‘high quality’ input/output examples were provided.” (Section 4.6.3, PDF p. 19.) They also report fewer benefits for programs with a single reachable branch or one test per path. Their PathCrawler dataset contains 55 programs supplied by tool developers, and the paper does not give a numeric accuracy score for generated contracts.

## technique 3: feed EVA value alarms to generate safety preconditions

What it is and when to use it. EVA performs abstract-interpretation value analysis and emits alarms for possible overflow, invalid pointer access, division by zero, and related runtime errors. Append the raw report to the prompt when safety-domain restrictions are useful.

Steps. Run EVA on each C program. Place its report after the code and baseline instructions. Generate three contracts per program, forming `eva_set`; compare against `baseline_set` and `pathcrawler_set`. Ask the model to describe abstract properties from the report and produce ACSL annotations. Inspect whether alarms become `requires` clauses and whether functional postconditions are lost.

In Alias5, EVA alarms for integer ranges and pointer validity lead the model to generate preconditions constraining `x`, `x*2-y`, and valid array addresses. The paper says: “The alarms detail problematic input ranges, such as values that could cause the program to behave unpredictably or fail.” (Section 4.7.1, PDF p. 22.) For the Tritype program, EVA-guided output focuses on integer-overflow bounds and a weak result-range postcondition, while the baseline captures more triangle logic. The authors call this “EVA tunnel-vision”: safety constraints are precise but can overshadow the function's purpose.

Verus form. Inference: translate EVA-like alarms into Rust `requires` clauses over integer ranges, slice lengths, and pointer or reference validity, then prove `ensures` for functional behavior. Rust references already encode some validity, so only arithmetic and index bounds may need explicit preconditions. Keep safety and functional contracts as separate obligations so a model cannot trade postconditions for alarm avoidance. Verus proofs establish the specified preconditions imply safety; they do not establish that the preconditions are acceptable for callers.

Evidence and limits. Across roughly 50 total programs, the paper reports annotation counts and qualitative examples rather than contract-verification rates. It warns that “a larger number of annotations does not necessarily indicate a better or more useful specification.” (Section 4.5.1, PDF p. 15.) The authors observe approximately 20% more annotations in the unaided condition, but no denominator or statistical test is given. EVA reports can be mechanically mapped to restrictions, so the LLM's value is flexible translation across analyzers and specification languages, not proof of correctness.

## what is trusted and what remains open

The study measures model reasoning, annotation types, and prompt effects. It does not prove generated ACSL contracts with Frama-C/WP, compare them with a human gold standard, or establish that intent claims are true. The model, its hidden reasoning, PathCrawler's path-selection policy, EVA's soundness assumptions, the handcrafted 50-program intent set, and the approximately 55-program PathCrawler set remain trusted. The authors explicitly note hosted-model variability, temperature randomness, confirmation bias in qualitative analysis, and that only a subset of programs supports expressive specifications.

Inference: for an agent-written verified-Rust product, the main threat is contract drift toward whatever evidence is easiest to imitate. A model can produce a valid but implementation-mirroring contract, a path-example overfit, or a safety precondition that makes the function unusable. The product should require explicit intent input, independent tests or reference behavior, verifier checks, and review of precondition strength. This paper already explored prompt-level symbolic feedback; VL should not redo that basic experiment. It should test whether Verus proofs and mutation checks catch weak contracts on realistic Rust APIs.

## techniques for the catalog

- intent-directed contract prompting — tell the generator whether to describe implementation or intended behavior and expose suspected bugs
- PathCrawler neuro-symbolic prompting — append concolic input/output rows to guide abstract postconditions
- path-coverage evidence review — require full path coverage and multiple examples per path before generalizing contracts
- EVA alarm prompting — append abstract-interpretation alarms to elicit runtime-safety preconditions
- safety/function separation — inspect whether analyzer context improves safety while displacing functional postconditions
- contract-count caution — treat annotation quantity as a measurement, not as proof of specification quality
Checked 2026-10-13 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
