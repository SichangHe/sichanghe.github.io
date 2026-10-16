# FormalScience: Scalable Human-in-the-Loop Autoformalisation of Science with Agentic Code Generation in Lean
(authored by agents unless marked 🧑)
Tag: `meadows2026formalscience`, [paper](http://arxiv.org/abs/2604.23002v1)

## scope and result

FormalScience is a human-in-the-loop pipeline for translating informal scientific statements and proofs into Lean 4 code, checking compilation, and reviewing semantic alignment. The authors state: “We propose FormalScience (Alg. 1), a domain-agnostic semi-automatic pipeline for generating problem statements, expanded informal solutions, and formally valid code” (§2, p.2). Their physics corpus, FormalPhysics, contains 200 university-level questions, informal LaTeX solutions, and complete Lean proofs (§3, p.3). The key warning is that compilation alone can certify a distorted statement.

## technique 1: gold-seeded statement and solution generation

Use a small set of expert examples to generate a larger, consistently formatted corpus. Let D be informal proofs and D* a gold-standard set of statement-proof pairs. A few-shot template asks an LLM to generate statements corresponding to D and alter proofs to align with D* (§2, p.2). Post-process the response into separate (S,P) pairs and have an expert assess alignment before formal code generation. The paper's pipeline grouped 200 physics examples into batches of five; one physics expert ran it for one month at approximately $50 (§3, p.3; Appendix A).

Apply: (1) curate several gold statement-proof examples; (2) prompt the model with each batch and the examples; (3) split the output into pairs; (4) have an expert binary-classify whether each statement and proof matches the intended content; (5) revise misaligned pairs before Lean translation. The expert is part of the data-generation loop, not a post-hoc sample check.

Verus form (inference): curate Rust specifications and reference implementations as gold pairs. Ask an LLM to expand informal requirements into `requires`/`ensures`, then have a human review whether the contract captures the requirement before asking Verus to prove it. A compiling proof cannot repair an incorrect contract.

Evidence: FormalPhysics has 100% formal validity after final compilation, but that denominator is all 200 corpus examples and says only that Lean accepts the final code (§3, p.3). The authors report roughly twice as many mathematical objects and formulas per example as comparison datasets (Table 2, p.3). The corpus is restricted to physics, so generality remains untested.

## technique 2: compiler-driven correction loop

Use Lean as an error oracle and iterate until code compiles. Define L(C)=(0,ε) when C compiles and (1,e) with the fatal error otherwise (§2, p.2). Generate C(0) from a code-generation prompt. If L(C(t)) returns an error, send x, C(t), and e to the correction prompt and produce C(t+1); stop at the first compiling candidate. The paper writes: “To begin iterative error correction, we initially use a code generation template Tg to prompt an LLM-based agent M′ to use tool L, with correction template Tc.” (§2, p.2)

The implementation recompiles all post-processed code, because post-processing can introduce errors (§2, p.2). It preserves the conversation context across turns. This loop addresses syntax, missing imports, unknown identifiers, type mismatches, and unsolved goals, but an accepted program may still represent the wrong science.

Verus form (inference): run `verus` after each generated Rust/proof revision and feed exact diagnostics to the repair prompt. Keep executable code, `spec fn`, `proof fn`, `requires`, `ensures`, and loop `invariant` constructs valid for Verus. Terminate on a successful verification result, but retain a human alignment review.

Evidence: in the agentic baseline, the authors use a maximum of 25 correction iterations and report that GPT-OSS-20B formal validity rises from below 10% to 31% with the agentic loop (§4.2, p.4). Formal validity is the fraction of the 200 FormalPhysics examples whose Lean code compiles (Table 3, p.4). Self-refinement costs approximately twice the tokens without clear primary-judge gains (§4.1, p.4), showing that raw error feedback is not sufficient.

## technique 3: surface guard, error categorisation, and minimal patch agent

Use a guard before compilation to reject malformed outputs cheaply. The agentic implementation first rejects forbidden tokens, incomplete proofs, and malformed imports (§4.2, p.4). It then compiles the remaining code and classifies errors. Structural errors (syntax, unknown identifiers, missing modules) trigger full regeneration with an error-type hint. Semantic errors (type mismatches, unsolved goals) trigger a patch agent that applies a minimal unified diff. The loop terminates after 25 ReAct cycles or successful compilation (§4.2, p.4).

Verus form (inference): add a parser/import guard, classify diagnostics into syntax/type/proof-obligation/dependency categories, and let a patch agent edit only the relevant function or proof block. Reject `external_body` on the function being verified and reject unsupported or invented Verus constructs before invoking the verifier. A minimal diff reduces accidental changes but does not establish semantic alignment.

Evidence: the paper reports that open-source GPT-OSS-20B reaches 31% formal validity with this pipeline and that FormalScience exceeds the best open-source agentic approach by more than 3× (§4.2, p.4). Other models vary sharply; the paper says larger 14B/30B models do not necessarily beat smaller models under naive prompting (§4.2, p.4). Compute exceeded 100 hours on an RTX 5090 for each baseline (§4.2, p.4).

## technique 4: human semantic-alignment loop and drift taxonomy

Use a human classifier after compilation to detect semantic drift. Let H(k) be a binary expert assessment of whether formal code C(k) aligns with the original prompt (§2, p.2). If H(k)=0, retain the code; if H(k)=1, regenerate or patch using an alignment prompt and continue up to patience P (§2, p.2). The paper distinguishes four drift categories: Notational Collapse, Abstraction Elevation, Proof Strategy Substitution, and Implicit Premise Selection (§5, pp.5–6).

Apply the categories during review. Notational Collapse maps domain objects to simpler objects, such as treating a quantum state vector as a complex scalar. Abstraction Elevation replaces concrete physics calculations with abstract algebra, such as proving x−0=x. Proof Strategy Substitution preserves objects but proves the conclusion by another route. Implicit Premise Selection adds assumptions absent from the informal statement. The paper reports Notational Collapse in more than 75% of quantum-mechanics proofs, Abstraction Elevation in approximately 25% of all examples, Proof Strategy Substitution in approximately 33%, and Implicit Premise Selection in approximately 25%; only 2% are pure instances of the last category (§5, pp.5–6). These percentages are category prevalence over the 200-example corpus and categories can overlap.

Verus form (inference): require a human to compare each `requires`/`ensures` contract and proof model with the natural-language requirement. Record drift categories before accepting a verified function. For example, a contract that proves `x - 0 == x` while omitting a physical conservation law is formally valid but semantically incomplete.

## what is proved, trusted, and missing

Lean proves that the final code type-checks under Mathlib and its declared hypotheses. It does not prove that the formal statement preserves the physics. The paper's own examples say that a proof can verify “a subset of the required argument” after collapsing scientific objects (§5, p.5). Trusted elements include the expert's binary alignment judgments, prompt templates, LLMs, post-processing scripts, Lean/Mathlib, benchmark source statements, and the choice of drift taxonomy. The dataset has only 200 physics examples and no other scientific domain in the experiments (§6, p.7).

## techniques for the catalog

- gold-seeded corpus generation — use expert statement-proof exemplars, batch prompting, and alignment review before formal translation
- compiler-driven correction — compile each candidate, feed exact errors to an LLM, and iterate to a verified result
- surface guard and minimal patching — reject malformed code early, regenerate structural errors, and apply minimal diffs to semantic errors
- human alignment and drift taxonomy — classify semantic mismatch after compilation and track notational, abstraction, strategy, and premise drift
