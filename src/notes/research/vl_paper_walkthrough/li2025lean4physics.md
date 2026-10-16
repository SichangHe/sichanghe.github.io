# Lean4Physics: Comprehensive Reasoning Framework for College-level Physics in Lean4
(authored by agents unless marked 🧑)
Tag: `li2025lean4physics`, [paper](https://doi.org/10.1145/3372885.3373824)

## what the paper builds and measures

Lean4PHYS combines a domain library, a formal benchmark, and model evaluation. PhysLib supplies physics units and theorems; LeanPhysBench contains 200 Lean4 statements: 104 college-level and 96 competition-level, with 62 competition-easy and 34 competition-hard. The benchmark spans mechanics, waves and acoustics, thermodynamics, electromagnetism, optics, and modern physics. The paper describes its purpose directly: “Lean4PHYS includes LeanPhysBench, a college-level benchmark for formal physics reasoning in Lean4, which contains 200 hand-crafted and peer-reviewed statements derived from university textbooks and physics competition problems.” (abstract, PDF p. 1)

Evaluation is pass@16 over eight models, with and without PhysLib in the prompt. The best open model is DeepSeek-Prover-V2-7B at 14.50% overall with PhysLib; Gemini-2.5-pro reaches 39.50%; Claude-Sonnet-4 reaches 34.50%. These are percentages over all 200 benchmark statements, not per-topic samples. The abstract’s 35% Claude figure is rounded from the table’s 34.50%. PhysLib improves performance on average by 11.75% according to the authors, but the table contains mixed positive and negative per-model differences, so the aggregation method is not specified in the quoted result. Lean4 auto-verification accepts or rejects generated proofs; this is compilation evidence, not a proof that the benchmark statements faithfully encode every intended physical assumption.

## technique 1: build a layered domain library

What it is and when to use it: formalize a domain from foundational quantities upward so theorem statements have reusable typed units and laws. This is useful when a general theorem library lacks dimensional types or domain-specific definitions.

How to do it (paper, §2.1.1–§2.1.3): extend Mathlib4 and the Lean4 UnitSystem kernel. Define the seven SI base units (time, length, mass, electric current, temperature, amount of substance, luminous intensity). Add normed-space operations, algebraic computation, derivatives, conversions between physics and mathematical quantities, and dimension casts; prove that casts preserve mathematical propriety. Then create independent namespaces/files for six physics topics. In each topic, add unit types and constants, encode experimentally summarized rules as definitions, and finish with proved topic theorems. Maintain a three-layer hierarchy: foundation unit system, topic-specific units, and topic-specific theorems. The paper states: “Our implementation principle for this section of PhysLib is to first create different namespaces and independent Lean files for each topic. Subsequently, we add topic-specific unit types and constants in the topic namespace. Then, we implement basic physics rules summarized from experiments as definitions. Finally, we implement theorems with their proofs, which are relevant to the topic, as the final layer.” (section 2.1.2, PDF p. 3)

Verus form (Inference): define Rust ghost/spec types for dimensions and quantities, with `spec fn` operations and `ensures` contracts for conversion and arithmetic. Prove a cast-preservation lemma before using a law in executable code. Verus does not provide Lean’s elaborator or Mathlib; all unit algebra and theorem statements would need Verus-compatible specifications and proof lemmas. The paper’s experimentally sourced laws remain assumptions unless their empirical premises are modeled.

Evidence and assumptions: the current repository is detailed in mechanics and foundational elsewhere. Community extension and inherited Apache-2.0 code are project assumptions, not measured verification coverage. PhysLib’s theorem correctness is checked by Lean compilation, while physical validity depends on the definitions and hypotheses chosen by authors.

## technique 2: convert natural-language questions into checked proof statements

What it is and when to use it: turn a numerical or formula-finding QA problem into a closed-end theorem whose hypotheses expose laws and initial conditions. Use this when a benchmark must test formal reasoning rather than answer string matching.

How to do it (paper, §2.2.1–§2.2.2): collect Olympiad and textbook problems; manually convert figures to textual context; classify by topic. For each NL problem, rewrite “Finding the answer to …” as “Prove that the answer is …”. Ask an LLM to produce a step-by-step solution, extract the physical laws and initial conditions, and choose a proving target: numerical value, physical expression, or logical formula describing a physical state. Encode conditions and target in Lean4. If a required law is absent from PhysLib, add and prove it. Compile the theorem, then have one expert formalize each statement and at least two experts verify it. The paper says: “Each statement requires one expert to formalize and at least two experts to verify.” (section 2.2.2, PDF p. 5)

Verus form (Inference): make the extracted laws and conditions explicit as function preconditions and postconditions. Use executable Rust for the calculation and proof functions for algebraic lemmas; a `requires`/`ensures` contract can state the target equality. Unlike Lean’s theorem files, Verus does not automatically validate that a prose problem and contract are equivalent, so expert review of the specification remains necessary.

Evidence and limits: the benchmark’s examples include direct unit-aware calculations, formula substitution, and hard functional derivations. The authors use “Lean4 auto-verification” after inference, but no independent audit of NL-to-Lean semantic equivalence is reported. A compiled theorem can therefore be vacuous if hypotheses are too strong or the target omits the intended quantity.

## technique 3: use library context as retrieval for proof generation

What it is and when to use it: provide PhysLib definitions, units, and theorem names in the model context, then compare generated proofs with and without that context. This tests whether domain-specific retrieval improves theorem selection and tactic use.

How to do it (paper, §3.1–§3.2 and Appendix C): prompt each model with the NL statement and Lean statement, and request two code blocks: a proof plan and Lean4 code. In PhysLib mode, first instruct the model to learn the new library and unit system. In the no-library mode, provide only the normal Lean header and statement. Configure imports and namespaces manually, allow long chain-of-thought unless otherwise specified, generate up to 16 attempts, and let Lean compile each attempt. The paper reports: “Furthermore, to demonstrate the effectiveness of PhysLib, we test the LLM’s capability under modes that have or do not have PhysLib in the generated context.” (section 3.1, PDF p. 6)

Verus form (Inference): expose a curated Verus module of dimension definitions, contracts, and lemmas to an agent, then compile and verify the returned Rust proof. A repository index can play the retrieval role, but only verified contracts should be admitted to the proof context. The model prompt is not part of Verus’s trusted kernel.

Evidence: with PhysLib, Claude-Sonnet-4 rises from 2.00% to 34.50% overall, Gemini-2.5-pro from 7.50% to 39.50%, and GPT-4o from 2.00% to 13.00%; each denominator is the 200 statements and each value is pass@16. Some smaller-model rows decrease (for example Qwen3-8B is 2.00% with and 6.50% without), so the result is not a universal gain. The paper attributes improvement to unit-system understanding and theorem selection; that attribution is an inference from the authors’ analysis, not a separately controlled causal experiment.

## technique 4: match proof strategy to problem difficulty

What it is and when to use it: decompose tasks by the kind of formal reasoning they require, then choose tactics and libraries accordingly. College problems emphasize unit consistency and numerical calculation; competition-easy problems resemble algebraic MiniF2F proofs; competition-hard problems require quantifiers, functions, calculus, and new lemmas.

How to apply it (paper, §3.3): for a college statement, normalize units and use PhysLib operations. For competition-easy, derive a formula in one or two substitutions and use Mathlib tactics. For competition-hard, decompose the goal, prove intermediate lemmas, handle unit casts, and combine symbolic and calculus reasoning. The paper reports: “Solving this level of problem requires careful decomposition of the problem, proving new lemmas, and multiple proof strategies with creativity.” (section 3.3, PDF p. 8)

Verus form (Inference): represent each decomposition as a lemma with explicit preconditions and preserve dimension invariants across calls. Use `proof fn` only for proof-time facts and keep executable calculations separate. Verus can check the resulting contracts, but it does not make a difficult calculus proof automatic.

Evidence and limits: competition-hard closed-source models score 0.00% in Table 1, while expert provers do better; the hardest cases combine unit casts with symbolic manipulation. In the authors’ case study, Gemini proves 22 thermodynamics theorems versus six for DeepSeek-Prover-V2, showing domain/model effects. The paper does not report proof lengths, human repair time, or independent replication.

## what remains trusted and what VL should reuse

Lean’s kernel/compiler, Mathlib, UnitSystem, PhysLib definitions, theorem hypotheses, NL-to-formalization judgments, expert review, and model-generated proof search all remain part of the trusted or reviewed boundary. Auto-verification proves only that Lean accepts the supplied theorem. Inference: for VeruLaw, the main threat is specification drift: an agent may write a valid Rust/Verus proof for a unit conversion or physical law whose assumptions do not match the product’s real system. The useful existing work is the layered-library and contract discipline; VL should avoid redoing a generic benchmark and instead measure whether retrieved Verus lemmas remain correct through dependency changes and whether generated specifications preserve the intended semantics.

## techniques for the catalog

- layered domain library — build foundations, topic units, and proved topic theorems in separate layers
- qa-to-theorem formalization — transform natural-language answers into hypotheses, targets, and compiled proof statements
- library-context proof retrieval — compare proof generation with and without domain definitions and lemmas in context
- difficulty-matched proof decomposition — select unit normalization, algebra, or new lemmas according to problem class
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
