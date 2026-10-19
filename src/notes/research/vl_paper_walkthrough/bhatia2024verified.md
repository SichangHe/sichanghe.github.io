# Verified Code Transpilation with LLMs
(authored by agents unless marked 🧑)
Tag: `bhatia2024verified`, [paper](https://arxiv.org/abs/2406.03003)
## what the paper builds

The paper presents LLMLIFT, an LLM-based implementation of verified lifting (VL). It translates a source program into a higher-level intermediate representation (IR) of target DSL operators, verifies that representation against the source for all inputs, and only then emits concrete target code. The key separation is between semantic search and concrete syntax. The authors state: “Once the synthesized code is verified, it is then translated to the concrete syntax of the DSL using rewrite rules.” (section 1, p. 2). The LLM generates both a program summary and proof annotations; successful theorem proving is a prerequisite check for acceptance.

VL’s target is a program T equivalent to source S for every input state σ. The paper writes the condition as ∀σ.S(σ)=T(σ), and searches for a program summary PS plus loop invariants Inv that satisfy that condition. The source and target are restricted to functions without externally visible side effects: “For VL considered in this paper, source and target programs are side-effect free functions of their inputs.” (section 3.1, p. 4). The approach targets DSLs that may be underrepresented in LLM training data. The authors’ claim is that Python is a broadly represented language suitable for expressing DSL operator semantics in prompts, allowing an LLM to reason in a familiar notation while verification remains formal.

Inference: this is directly relevant to VL’s agent-written Rust goal because the LLM proposes semantic summaries and proof facts, while an external verifier decides acceptance. Inference: the method proves equivalence to the supplied source semantics; it does not establish that the source program or the DSL operator model expresses the user’s intended behavior.

## technique: verified lifting as a three-phase pipeline

what it is

The paper decomposes verified transpilation into Search, Verification, and Code generation. Search finds a target-language program summary expressed in the IR. Verification checks semantic equivalence for all source states. Code generation applies simple pattern-matching rewrites to the verified summary.

when to use

Inference: use this pipeline when direct LLM translation to a low-resource DSL is unreliable or when concrete target syntax is too detailed for the model to reason about. The paper reports that direct generation can hallucinate nonexistent DSL functions, while an IR exposes only the intended high-level operators (section 3.2, p. 5).

how to do it

1. define the target DSL operators as semantic IR functions
2. provide the source program and operator semantics to the synthesizer
3. generate a program summary PS using only those operators
4. generate any loop invariants needed to prove equivalence
5. translate PS and invariants to the automated prover’s input language
6. reject candidates that fail parsing or theorem proving
7. rewrite the verified PS into concrete target DSL syntax

The Spark example maps and reduces a list, then emits `map(lambda i: i if i < 100 else 0).reduce(lambda a, b: a + b)` after verification (section 2, p. 4). The paper says, “VL comprises of three phases: 1) Search, 2) Verification, and 3) Code generation.” (section 2, p. 3).

Verus form

Inference: represent the source semantics and target operator semantics with executable Rust plus Verus `spec fn` abstractions. Inference: give each generated target function `requires` and `ensures` clauses stating the source-level relation, and use `proof fn` lemmas to establish equivalence. Inference: a verified summary can be lowered to ordinary Rust only after Verus verifies the summary-to-source theorem; concrete syntax rewriting must preserve the verified operator structure. Inference: Rust APIs with externally visible mutation, ownership-sensitive behavior, I/O, or concurrency require modeling those effects beyond this paper’s input/output equivalence. The paper already handles loops and local mutation; Verus may additionally require termination arguments such as `decreases` clauses.

## technique: Python IR for LLM synthesis

what it is

LLMLIFT defines each target DSL operator in Python, using Python as the prompt-visible IR. The IR captures semantics while hiding implementation details. For the running example, Python defines `map`, `reduce`, and `ite`; the LLM composes those operators to form PS. The paper chooses Python because it is widespread, concise, expressive, and represented in code-training data.

when to use

Inference: use a familiar, expressive IR when the target DSL is underrepresented in model training or has difficult concrete syntax. The IR should expose only the target’s semantic operators, so generated expressions are already in the target operator vocabulary.

how to do it

1. write a Python function for every supported target operator
2. include all operator definitions in the prompt
3. instruct the model to translate S using only those operators
4. parse the returned Python expression and reject disallowed constructs
5. pass the accepted expression to the verifier
6. rewrite the expression to target syntax after proof succeeds

The paper reports: “Python’s significant representation in the training datasets of LLMs makes it a suitable choice for this purpose.” (section 1, p. 2). It also says, “To ensure that the generated candidates follow the DSL operators defined in the prompt, we use a parser to reject candidates which do not satisfy this constraint.” (section 3.3, p. 6).

Verus form

Inference: the analogous Verus IR can be a small set of `spec fn` operators over `Seq`, `Map`, or other mathematical values, with executable Rust wrappers generated only after proof. Inference: parser rejection corresponds to checking that generated proof/spec code uses an approved operator vocabulary; Verus then checks the contracts, but a parser alone cannot prove semantic equivalence. Inference: operator definitions become trusted specifications unless their correspondence to the concrete Rust implementation is separately proved.

## technique: few-shot generation of program summaries and invariants

what it is

The prompt has three parts: task instruction, Python definitions of all DSL operators, and the source program as the specification. LLMLIFT uses zero-shot generation for PS and one-shot generation for invariants. The model receives examples or a structural explanation of invariant form rather than requiring DSL-specific fine-tuning.

how to do it

1. state that the model must translate S using only listed operators
2. include the complete operator semantics in Python
3. include S directly as the correctness specification
4. ask for PS in a zero-shot prompt
5. show one invariant example and ask for Inv in a one-shot prompt
6. parse both outputs and translate them to the verifier language

The paper’s invariant template is `Inv ≜ f(i) ∧ e(Tlang)`, where f(i) constrains loop indices and e is recursively built from target operators (section 3.3, p. 6). Its example invariant states that `i` remains between 0 and `len(data)` and that the accumulated sum equals the MapReduce expression over the first i elements. The paper explains: “The loop invariant states that the loop index i remains within the bounds of the data array (0 ≤ i ≤ len(data)).” (section 3.3, p. 6).

Verus form

Inference: encode PS as a `spec fn` returning the target’s mathematical result and encode Inv as a loop `invariant` clause over index bounds and the accumulated abstract value. Inference: use `requires` for input-domain facts and `ensures` for final equivalence; use `proof fn` lemmas for operator identities. Inference: Verus syntax and libraries differ from Python, so the model’s Python output must be translated into valid Verus constructs before verification.

## technique: two-phase PS then invariant generation

what it is

LLMLIFT first generates PS and then generates invariants while showing the previously generated PS. This makes the invariant construction conditional on the exact summary that needs proving. The paper compares this with generating PS and Inv together.

how to do it

1. generate PS
2. include S in the invariant prompt with an added assertion equating its return variable to PS
3. ask for invariants that prove that assertion
4. translate PS and Inv to the theorem prover
5. verify equivalence
6. try further invariants for that PS; if none verifies, mark the PS as incorrect for subsequent summary generation

In the tensor-processing experiment, the unified one-phase prompt solved 20/23 benchmarks, while the two-phase method solved all 23/23 under the same query budget (section 4.5, p. 9). The paper hypothesizes that simultaneous generation is harder and that access to PS helps the model reason about the needed constraints. Inference: this benchmark result does not establish that two phases always perform better.

Appendix A (pp. 13–14) describes the retry procedure: generate summaries while supplying previously unsuccessful summaries as feedback, skip summaries already processed, discard unparsable summaries, and generate invariants for each remaining summary. Skip previously checked invariants and discard unparsable ones. Return PS only if verification succeeds; return `None` if the iteration budget is exhausted. The authors explicitly describe the fallback as an assumption: “If none of the generated Invs for a PS are found to be valid, the algorithm assumes that the PS itself is incorrect.” (Appendix A, p. 13). Inference: failure to find a proving invariant does not establish that the summary is wrong.

Verus form

Inference: generate a `spec fn` summary first, then write loop `invariant` clauses that relate the concrete accumulator to that summary. Inference: each candidate must be compiled and checked by Verus; the generation order is a search heuristic, not a soundness argument.

## technique: theorem-prover translation and rewrite lowering

what it is

Python PS and invariants are translated by pattern-matching rules into the syntax accepted by an automated theorem prover. After verification, the same structural approach rewrites PS into target DSL syntax. The background names cvc5 and z3 as VL verifiers: “VL currently uses cvc5 and z3 for this purpose.” (section 2, p. 4).

how to do it

1. parse Python expressions into their operator structure
2. rewrite operators and predicates into prover syntax
3. invoke the prover on the source/summary equivalence and invariants
4. retain only candidates with a successful proof
5. rewrite the verified operator tree into concrete DSL calls

The paper states: “To verify the functional equivalence of the generated program to the given source program for all program states, we translate both the generated program and the proof to the syntax of an automated theorem prover.” (section 1, p. 2). It later says that “The translation process is simplified due to Python’s highly structured syntax.” (section 3.3, p. 6).

Verus form

Inference: the Verus backend can consume Rust/Verus source directly, with `spec fn`, `requires`, `ensures`, `invariant`, and `proof fn` constructs, so a separate SMT-LIB lowering layer is usually unnecessary for the product. Inference: the generated proof remains untrusted search output until Verus accepts it; the verifier, solver, erasure, compiler, and any external operator specifications remain trusted components.

## evaluation and evidence

The evaluation uses GPT-4 through APIs with temperature 0.7 (section 4, p. 7). The paper states: “We keep a budget of 50 queries for the PS and a budget of 10 queries for each PS.” (section 4, p. 7). In context, the latter budget is for invariant generation. It covers four DSL domains. For Spark, with a one-hour MetaLift timeout, LLMLIFT solved 44/45 benchmarks, compared with MetaLift’s 40/45, and averaged under one minute per solved benchmark versus MetaLift’s three minutes; MetaLift required over approximately 1,000 lines to describe its search space (section 4.1, p. 7). For Domino network processing, both systems solved 10/10, with LLMLIFT averaging 2 seconds versus MetaLift’s 6 seconds; MetaLift again required over approximately 1,100 lines (section 4.2, pp. 7–8). For TACO, with a 90-minute timeout per benchmark, LLMLIFT solved 60/60 versus C2TACO’s 57/60, with average times of 2 seconds versus 41 seconds; C2TACO used over 1,000 lines of heuristics (section 4.3, p. 8). For tensor processing, both LLMLIFT and Tenspiler solved 23/23, but LLMLIFT averaged 95.89 seconds versus Tenspiler’s 115.14 seconds; removing Tenspiler’s optimizations reduced it to 5/23 within one hour (section 4.4, pp. 8–9).

Inference: the denominators and settings are important because the 44/45, 40/45, 10/10, 60/60, and 23/23 figures are benchmark counts in their respective domains, while times are per-benchmark averages under the stated tools and timeouts. The paper’s Table 1 (p. 9) reports TACO benchmark accuracy by named suites; LLMLIFT is 100% in every listed suite, while C2TACO is below 100% on mathfu (91.6%), simpl_array (90%), and darknet (92.8%).

Inference: the evaluation shows that an LLM can generate summaries and invariants that pass formal equivalence checks in these selected functional DSL tasks. Inference: it does not measure arbitrary Rust, mutable aliasing, unsafe code, concurrency, or specification discovery from ordinary user intent. Inference: the source programs and operator semantics are supplied as specifications, so wrong source behavior or wrong operator definitions would be proved consistently rather than detected.

## what VL should reuse and what it should avoid repeating

Inference: VL should reuse the semantic IR boundary, parser filtering, separate summary/invariant generation, and independent verification. These reduce pressure on the model to emit low-level syntax and make accepted output auditable. Inference: VL should not claim that Python-style few-shot prompting alone provides correctness; the paper’s guarantee comes from theorem-prover acceptance after generation. Inference: for agent-written verified Rust, the main product threat is specification and abstraction error, followed by unsupported stateful features; the residual trust base includes Verus, solver behavior, Rust compilation, and the correctness of any model-to-implementation operator correspondence.

## techniques for the catalog

- verified lifting pipeline — search for a semantic target summary, prove equivalence for all inputs, then generate concrete DSL code
- Python semantic IR — expose target operators in a familiar intermediate language to make LLM synthesis domain-independent
- parser-constrained generation — reject summaries that use operators outside the supplied DSL vocabulary
- few-shot invariant synthesis — prompt the model with operator semantics, source specification, and an invariant example
- two-phase summary/invariant generation — generate PS first and use it to guide loop-invariant synthesis
- verification before lowering — translate candidates to an automated prover and rewrite only verified summaries into executable target syntax
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The 3 benchmarks that C2TACO fails to solve require expressions of depth greater than 4."): read the entire paper, including references and appendices, and the entire study; checked quotations, numbers, section/page references, technique steps, and source identity; corrected an incomplete quotation, page references, the paper link to its arXiv identifier, the functional scope, and retry details; did not reproduce experiments, inspect implementation artifacts, or validate the proposed Verus adaptations.
