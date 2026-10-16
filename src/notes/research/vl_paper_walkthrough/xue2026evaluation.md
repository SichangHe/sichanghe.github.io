# From Evaluation to Enhancement: Large Language Models for Zero-Knowledge Proof Code Generation
(authored by agents unless marked 🧑)
Tag: `xue2026evaluation`, [paper](https://arxiv.org/abs/2509.11708)

## result and what is measured

Xue et al. introduce ZK-Eval and ZK-Coder for generating Circom and Noir zero-knowledge programs from natural-language requirements. Their key diagnosis is that language-model syntax knowledge does not ensure correct constraint modeling. The paper says: “Generated code frequently suffers from typing errors, signal mismanagement, and faulty constraint enforcement.” (Section 4.1, p. 11)

ZK-Coder has three stages: constraint formulation in an intermediate ZK Sketch Language (ZKSL), exact retrieval of primitive implementations, and interactive compile/test repair (Section 4.2, pp. 11–13). On adapted HumanEval tasks, GPT-o3 reaches 87.85% Pass@1 on Circom versus 20.29% for direct generation, and 97.79% on Noir versus 28.38% (Table 2, p. 14). These are task-level pass rates; the table also reports the per-stage denominators implicitly through percentages, but does not state the number of tasks in that table. On LiveCodeBench, averaged across models, ZK-Coder reaches 44.10% Circom and 56.93% Noir, compared with 14.07% and 33.95% for a repair-only baseline (Table 3, p. 16). Production-pattern case studies are 90.83% and 92.09%, but are drawn from standardized patterns and therefore are not equivalent to the harder benchmark.

## technique 1: formulate constraints in ZKSL before writing target code

What it is. ZKSL is a Python-embedded DSL that captures the mathematical relation independently of Circom or Noir syntax. A program has a `verify` function over typed `Field`, `Bool`, and vector inputs and adds formulas with `engine.add(Φ)` (Section 4.2.1, pp. 11–12). The authors explain: “This isolates the mathematical ‘what’ from the DSL-specific ‘how’ by requiring the explicit modeling of constraints over typed inputs.” (Section 4.2.1, p. 11)

How to do it.

1. Translate the natural-language requirement into typed inputs and a `verify` function.
2. Add each relation as a formula. The grammar permits equality and inequalities, Boolean connectives, bounded `all`/`any`, arithmetic, and primitives such as `distinct`, `select`, `abs`, and `sum` (Figure 8, p. 12).
3. Interpret every operation over a finite field modulo p, matching ZK arithmetic (Section 4.2.1, p. 11).
4. Run syntax, type, and arity checks. Feed any error trace back to the model for sketch repair before target-code generation.
5. Keep hidden evaluation cases separate. Sketch correctness is counted only when the sketch passes all hidden tests (Section 5.2, p. 14).

Verus form. Inference: represent the sketch as typed Rust data, with a `spec fn` describing each relation and executable constructors that enforce arity and type tags. Use `requires` and `ensures` on the conversion from a sketch to a Verus implementation; prove that generated constraints imply the specification over a finite field model. Verus does not natively reproduce Circom’s circuit compiler or a cryptographic proving system, so compiler semantics and field representation remain trusted assumptions unless modeled separately.

Evidence and limits. GPT-o3’s sketch correctness is 97.30% for Circom and 97.94% for Noir (Table 2, p. 14). The dominant residual failure is an incorrect sketch: among ZK-Coder failures, it accounts for 41.56% in Circom and 73.07% in Noir (Table 4, p. 17). The paper warns that tests cannot prove correctness: “Although tests cannot prove correctness, they include representative corner cases and explicit checks for soundness and completeness.” (Threats to Validity, p. 19)

## technique 2: retrieve implementations by canonical primitive, not text similarity

What it is. The sketch becomes a structural query. ZK-Coder traverses each `engine.add` formula, canonicalizes aliases such as `>=` to `GreaterEqThan`, distinguishes arity and field type, and exact-matches the resulting primitive against a curated knowledge base of verified implementations and idioms (Section 4.2.2, p. 12). Retrieved patterns are emitted in sketch order.

How to do it.

1. Parse the valid ZKSL sketch into primitive calls and operators.
2. Normalize aliases and annotate each primitive with arity and type.
3. Look up an exact implementation template for each primitive in the verified knowledge base.
4. Provide templates and usage hints to the target-code generator in the same logical order as the sketch.
5. Generate Circom or Noir wiring around these templates, preserving the sketch’s relations.

Verus form. Inference: store verified Rust lemmas or function templates indexed by a typed primitive key. Retrieval can choose a template, but the final proof must establish the template’s `ensures` relation against the sketch predicate. A text or embedding match is evidence for candidate code only; it cannot satisfy a Verus proof obligation.

Evidence. Removing primitive RAG reduces average Pass@1 from 65.66% to 53.04% on Circom and from 76.87% to 72.00% on Noir (ablation V1, Section 5.3, p. 15). Replacing structural retrieval with text-similarity RAG gives 51.42% and 74.59% (V5, p. 16), showing a larger Circom loss. The paper attributes this to grounding exact constraint semantics and signal handling, not to generic documentation retrieval.

## technique 3: separate compile repair from relation-faithfulness repair

What it is. ZK-Coder first repairs programs that fail the target compiler, then tests whether a compiling circuit accepts valid witnesses and rejects invalid ones. The authors summarize the loop as: “generate-compile-test-repair” (Section 4.1, p. 11).

How to do it.

1. Submit generated code to Circom or Noir. Extract diagnostics for signal misuse, illegal declarations, or invalid constraint forms.
2. Feed diagnostics to the model and retry up to N1=8 iterations (Section 4.2.3, p. 13).
3. Once compilation succeeds, generate representative Acceptance and Rejection cases while keeping evaluation cases hidden.
4. Run the circuit on these cases. On a failed case, pass the counterexample to the model to re-examine constraints.
5. Retry semantic repair up to N2=3 iterations, or stop when all checks pass (Section 4.2.3, p. 13).

Verus form. Inference: compile repair corresponds to Rust compilation and Verus verification diagnostics. Relation repair should be a separate proof/test phase: a generated function must have `ensures` for accepted cases and a specification showing rejection of invalid inputs. Use executable tests for counterexamples, but treat them as bug-finding evidence; the Verus proof is the acceptance guarantee. Keep proof functions out of runtime code and do not mark the function under verification `external_body`.

Evidence. GPT-o3’s repair pass rate is 94.41% for Circom and 99.85% for Noir, with final program correctness 95.64% and 100% conditioned on successful repair (Table 2, p. 14). Removing compile repair causes the largest ablation drop: 26.04% Circom and 27.12% Noir (V3, p. 16). Removing execute repair lowers results to 64.48% and 76.00% (V4, p. 16). Failure categories show why compilation is insufficient: false acceptance (under-constraint) is 1.08% Circom and 1.67% Noir; false rejection (over-constraint) is 19.78% and 10.89% (Table 4, p. 17).

## technique 4: evaluate with soundness-oriented pass criteria and ablations

The benchmark includes 172 Circom and 164 Noir questions across four categories (Section 3, pp. 6–8). ZK-Eval separates language knowledge, primitive use, and end-to-end composition. The authors use hand-crafted accepting and rejecting tests, oracle-guided mutation testing, and hidden cases; they report that no test cases or ground-truth solutions were placed in prompts (Threats to Validity, p. 19).

Ablate each component separately: no RAG, no sketch, no compile repair, no execute repair, similarity RAG, and repair only (Section 5.3, pp. 15–16). “Only Repair” reaches 43.31% Circom and 59.80% Noir, versus 65.66% and 76.87% for the full system (p. 16). Inference: this is evidence that a repair loop cannot replace an explicit specification and grounded implementation templates.

## trusted parts, contradictions, and product threat

The measured result is empirical Pass@1 under fixed budgets, models, datasets, and hidden tests. It is not a formal proof of circuit equivalence. The authors identify test coverage, prompt choice, natural-language ambiguity, and no deployment-grade security audit as limitations (Section 7, pp. 18–19). Production case-study scores are high because the tasks use common patterns; they should not be combined with LiveCodeBench rates.

Inference: the strongest lesson for agent-written verified Rust is to keep a typed specification between intent and code, retrieve only type-checked proof patterns, and require a machine-checkable proof after every repair. The threat is high when an agent emits unchecked text or when tests stand in for a proof. ZK-Coder has already explored the sketch, retrieval, and repair pattern; VL should adapt it to Verus predicates and proof obligations rather than redo a generic generate-and-test loop.

## techniques for the catalog

- intermediate constraint sketch: formalize the relation in a typed DSL before target-language code
- structural primitive retrieval: canonicalize operators and exact-match verified templates by type and arity
- two-phase repair: compile first, then test acceptance and rejection behavior with bounded retries
- hidden-case evaluation: score sketch and program correctness on withheld cases, reporting conditional denominators
- component ablation: remove sketch, retrieval, and each repair phase to identify which reliability mechanisms matter
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
