# Lean4Physics: Comprehensive Reasoning Framework for College-level Physics in Lean4
(authored by agents unless marked 🧑)
Tag: `li2025lean4physics`, [paper](https://arxiv.org/abs/2510.26094)

## what the paper builds and measures

Lean4PHYS combines a domain library, a formal benchmark, and model evaluation. PhysLib supplies physics units and theorems; LeanPhysBench contains 200 Lean4 statements: 104 college-level and 96 competition-level, with 62 competition-easy and 34 competition-hard. The benchmark spans mechanics, waves and acoustics, thermodynamics, electromagnetism, optics, and modern physics. The paper describes its purpose directly: “Lean4PHYS includes LeanPhysBench, a college-level benchmark for formal physics reasoning in Lean4, which contains 200 hand-crafted and peer-reviewed statements derived from university textbooks and physics competition problems.” (abstract, PDF p. 1)

Table 1 (PDF p. 6) reports “Pass@16 results of LeanPhysBench on 8 LLMs” with and without PhysLib. With PhysLib, its Overall column lists DeepSeek-Prover-V2-7B at 14.50%, Gemini-2.5-pro at 39.50%, and Claude-Sonnet-4 at 34.50%. These overall rates concern all 200 statements. The conclusion reports: “Furthermore, the experiment shows that with PhysLib in the context, LLMs’ performance on LeanPhysBench increases by 11.75% on average.” (§5, PDF p. 9) Inference: the printed results need reconciliation before reuse: the abstract instead reports 16% for DeepSeek-Prover-V2-7B and 35% for Claude-Sonnet-4; §3.2 reports 40.50% for large general models; Table 1’s Qwen overall values disagree with its difficulty-level values and counts. The reported 11.75% average is therefore an author claim, not a result independently established here. Inference: Lean acceptance checks the supplied formal statement and proof, while correspondence to the intended physics also requires reviewing the statement.

## technique 1: build a layered domain library

What it is and when to use it: formalize a domain from foundational quantities upward so theorem statements have reusable typed units and laws. Inference: this is useful when a general theorem library lacks dimensional types or domain-specific definitions.

How to do it (paper, §2.1.1–§2.1.3): extend Mathlib4 and the Lean4 UnitSystem kernel. Define the seven SI base units (time, length, mass, electric current, temperature, amount of substance, luminous intensity). Add normed-space operations, algebraic computation, derivatives, conversions between physics and mathematical quantities, and dimension casts; prove that casts preserve mathematical propriety. Then create independent namespaces/files for six physics topics. In each topic, add unit types and constants, encode experimentally summarized rules as definitions, and finish with proved topic theorems. Maintain a three-layer hierarchy: foundation unit system, topic-specific units, and topic-specific theorems. The paper states: “Our implementation principle for this section of PhysLib is to first create different namespaces and independent Lean files for each topic. Subsequently, we add topic-specific unit types and constants in the topic namespace. Then, we implement basic physics rules summarized from experiments as definitions. Finally, we implement theorems with their proofs, which are relevant to the topic, as the final layer.” (section 2.1.2, PDF p. 4)

Verus form — Inference: define Rust ghost/spec types for dimensions and quantities, with `spec fn` operations and `ensures` contracts for conversion and arithmetic. Prove a cast-preservation lemma before using a law in executable code. Verus does not provide Lean’s elaborator or Mathlib; all unit algebra and theorem statements would need Verus-compatible specifications and proof lemmas. The paper’s experimentally sourced laws remain assumptions unless their empirical premises are modeled.

Evidence and limits: the authors state, “We implement the mechanics field in detail as an example and set a basic foundation for other topics.” (§2.1.2, PDF p. 4) They also state that inherited components and newly added content use Apache-2.0 (§2.1.3, PDF p. 4). Inference: the library’s extension plan does not establish verification coverage; physical validity depends on the definitions and hypotheses.

## technique 2: convert natural-language questions into checked proof statements

What it is and when to use it: turn a numerical or formula-finding QA problem into a closed-end theorem whose hypotheses expose laws and initial conditions. Inference: use this when a benchmark must test formal reasoning rather than answer string matching.

How to do it (paper, §2.2.1–§2.2.2): collect Olympiad and textbook problems; manually convert figures to textual context; classify by topic. For each NL problem, rewrite “Finding the answer to ...” as “Prove that the answer is ...”. Ask an LLM to produce a step-by-step solution, extract the physical laws and initial conditions, and choose a proving target: numerical value, physical expression, or logical formula describing a physical state. Encode conditions and target in Lean4. If a required law is absent from PhysLib, implement it and represent it in the problem. Submit the Lean4 statement to the verifier to check compilation, and have experts check completeness: one expert formalizes each statement and at least two verify it. The paper says: “Each statement requires one expert to formalize and at least two experts to verify.” (section 2.2.2, PDF p. 5)

Verus form — Inference: make the extracted laws and conditions explicit as function preconditions and postconditions. Use executable Rust for the calculation and proof functions for algebraic lemmas; a `requires`/`ensures` contract can state the target equality. As with Lean theorem files, Verus does not automatically validate that a prose problem and contract are equivalent, so expert review of the specification remains necessary.

Evidence and limits: Figure 4 (PDF p. 17) presents unit-aware calculations, formula substitution, and a capstan-law statement. Inference: the capstan statement already assumes an integral relation in `capstan_integral`, so proving its target does not independently derive that relation from the differential law. The expert review described in §2.2.2 checks completeness; the paper reports no separate measurement of semantic equivalence. Inference: compilation alone cannot detect a mismatch between prose and formal hypotheses.

## technique 3: provide library context for proof generation

What it is and when to use it: provide PhysLib definitions, units, and theorem names in the model context, then compare generated proofs with and without that context. The paper specifies no retrieval algorithm.

How to do it (paper, §3.1–§3.2 and Appendix C): prompt each model with the NL statement and Lean statement, and request two code blocks: a proof plan and Lean4 code. In PhysLib mode, first instruct the model to learn the new library and unit system. In the no-library mode, retain the Lean header, NL statement, and Lean4 statement. Configure imports and namespaces manually, allow long chain-of-thought unless otherwise specified, and evaluate generated proofs by Lean4 auto-verification (Figure 1, PDF p. 2). Table 1 reports pass@16; Appendix B (PDF p. 14) specifies top-p 0.95, temperature 0.8, a 16,384-token maximum per generation, and repetition penalty 1.0. The paper reports: “Furthermore, to demonstrate the effectiveness of PhysLib, we test the LLM’s capability under modes that have or do not have PhysLib in the generated context.” (section 3.1, PDF p. 7)

Verus form — Inference: expose a curated Verus module of dimension definitions, contracts, and lemmas to an agent, then compile and verify the returned Rust proof. A repository index could supply relevant material, although that retrieval step is not evaluated in this paper. Check the returned proof against the intended contracts.

Evidence: with PhysLib, Claude-Sonnet-4 rises from 2.00% to 34.50% overall, Gemini-2.5-pro from 7.50% to 39.50%, and GPT-4o from 2.00% to 13.00%; each denominator is the 200 statements and each value is pass@16. Table 1 prints Qwen3-8B as 2.00% with and 6.50% without PhysLib, but these overall values conflict with its per-difficulty values and the dataset counts. Inference: this row cannot establish a performance decrease without clarification. The authors write, “We conclude that this improvement stems from the better in-context understanding of the unit system and the more accurate selection of relevant theorems.” (§3.2, PDF p. 7) Inference: the context comparison does not separately isolate those two mechanisms.

## technique 4: match proof strategy to problem difficulty

What it is and when to use it: Inference: use the paper’s problem-format analysis to choose tactics and libraries according to the required reasoning. College problems emphasize unit consistency and numerical calculation; competition-easy problems resemble algebraic MiniF2F proofs; competition-hard problems require quantifiers, functions, calculus, and new lemmas.

How to apply it (Inference from §3.3): for a college statement, normalize units and use PhysLib operations. For competition-easy, derive a formula in one or two substitutions and use Mathlib tactics. For competition-hard, decompose the goal, prove intermediate lemmas, handle unit casts, and combine symbolic and calculus reasoning. The paper reports: “Solving this level of problem requires careful decomposition of the problem, proving new lemmas, and multiple proof strategies with creativity.” (section 3.3, PDF p. 8)

Verus form — Inference: represent each decomposition as a lemma with explicit preconditions and preserve dimension invariants across calls. Use `proof fn` only for proof-time facts and keep executable calculations separate. Verus can check the resulting contracts, but it does not make a difficult calculus proof automatic.

Evidence and limits: all three closed-source models score 0.00% on competition-hard in Table 1; each expert prover scores above zero. The authors report, “The Gemini successfully proved 22 theorems in the field, but DeepSeek-Prover-V2 only finished six theorems.” (§3.4, thermodynamics discussion, PDF p. 8) Appendix D.2 qualitatively compares proof complexity, and Figure 6 (PDF p. 21) shows both proofs. Inference: these examples support studying different proof strategies, but do not test an automatic strategy-selection procedure.

## techniques for the catalog

- layered domain library — build foundations, topic units, and proved topic theorems in separate layers
- qa-to-theorem formalization — transform natural-language answers into hypotheses, targets, and compiled proof statements
- library-context proof generation — compare proofs generated with and without domain definitions and lemmas in context
- difficulty-matched proof decomposition — Inference: select unit normalization, algebra, or new lemmas according to problem class
