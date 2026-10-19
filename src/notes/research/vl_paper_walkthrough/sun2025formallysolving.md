# Formally Solving Answer-Construction Problems in Lean
(authored by agents unless marked 🧑)
Tag: `sun2025formallysolving`, [paper](http://arxiv.org/abs/2505.18492v6)

## what the paper establishes

This paper distinguishes theorem proving from answer construction. A theorem-proving problem supplies the target statement and asks for a proof; reduced answer-construction benchmarks substitute the ground-truth answer. An answer-construction problem asks the system to synthesize the witness and prove it. The formal shapes are `∀X. P(X) → Q(X)` versus `∃Ψ. ∀X. P(X) → Q(X, Ψ(X))` (section 1, PDF pp. 1–2). The paper's concrete failure is that Lean may accept a proof whose witness is a circular expression such as `sInf Property` when the task requires a canonical numeral. The authors write: “Although the second proof passes the Lean check, it is clearly inadmissible and trivializes the proof via a circular argument.” (section 1, PDF p. 2)

Their system, Enumerate-Conjecture-Prove (ECP), assigns bounded search and answer construction to a general LLM, then proof generation to a prover LLM, and inserts an admissibility checker between construction and proving. The abstract reports 17/346 PutnamBench instances and 18/75 MathArena instances solved with admissible answers and proofs. Those denominators are the answer-construction subsets evaluated by the paper, not all Lean benchmark problems (abstract, PDF p. 1; section 5, PDF pp. 10–15).

## technique 1: preprocess an informal task into a typed Lean problem with an admissible vocabulary

what it is and when to use it

ECP first converts natural language into a formal problem and records which constants an answer may use. Inference: use this when proof compilation alone does not enforce the required answer format. The paper says: “Each formalization is validated using Lean compilation for syntax correctness and manual inspection for equivalence to its informal statement.” (section 4.1, PDF p. 6)

how to do it

1. Prompt a general LLM with the raw problem and the autoformalization template in Appendix H.1, following the problem formulation in section 2.4 (section 4.1, PDF p. 6; section 2.4, PDF pp. 4–5; Appendix H.1, PDF pp. 32–33).
2. Ask for a compilable Lean formalization.
3. Compile it for syntax correctness and manually inspect equivalence to the informal statement.
4. Send failed formalizations back to the LLM for repair (section 4.1, PDF p. 6).
5. Label `A` with rule-based heuristics. The paper uses numerals only for AIME answers, elementary arithmetic expressions for HMMT and Apex, and broader university-level constants for PutnamBench (section 4.1, PDF p. 7).
6. Validate that the labeled vocabulary covers constants in the ground-truth answer. All 75/75 MathArena tasks passed; 301/346 (87.0%) PutnamBench tasks passed automatically, and 45/346 (13.0%) were manually fixed (section 4.1, PDF p. 7).

Verus form

Inference: For VL, preprocessing should produce a Rust/Verus function signature and explicit contract candidates, with a separate allowed vocabulary for generated specifications or witnesses. Use Verus `requires` and `ensures` on executable functions and `spec fn` for mathematical predicates. Inference: the product should retain ordinary tests, callers, and documentation as evidence for the manual-equivalence step because a Verus proof only checks the formal contract that was supplied. The paper is about Lean and provides no Verus translation.

evidence and limits

The 87.0% validation figure is a coverage check against the benchmark's ground-truth answers, not evidence that the heuristics discover every admissible expression for a new task. The authors state: “Currently, the admissible vocabulary is automatically labeled by heuristics that partially rely on implicit information about answer formats and the mathematical knowledge level required by the problem.” (limitations, section 6, PDF p. 15) Inference: a VL vocabulary policy needs an explicit review path for APIs, types, and helper functions that are legitimate but not listed by a heuristic.

## technique 2: reject circular or noncanonical witnesses with structural admissibility checking

what it is and when to use it

An answer is admissible when it uses only constants in `A`. ECP checks the answer syntax rather than trusting Lean compilation. This rejects the circular `sInf Property` example because its constants fall outside the numeral-only vocabulary (Figure 2, PDF p. 3). The paper formalizes the rule as: “We define admissibility of the constructed answer Ψ with respect to A, Admissible(A, Ψ), as UsedConstants(Ψ) ⊆ A.” (section 4.2, PDF p. 7)

how to do it

1. Parse the elaborated Lean expression `Ψ`.
2. Define `UsedConstants` recursively. A bare global constant contributes itself; lambda and dependent-function expressions contribute constants from their bodies and types; let expressions also include constants from the bound value; a projection contributes constants from its argument and its projection constant; an application contributes the head and explicit arguments (section 4.2, PDF pp. 7–8).
3. Ignore administrative constants introduced by the compiler, such as type formers and typeclass instances (section 4.2, PDF p. 7).
4. Forbid a universal quantifier when the task vocabulary does not allow it; handle an existential through its elaborated `Exists` application (section 4.2, PDF p. 8).
5. Accept only if `UsedConstants(Ψ) ⊆ A`.
6. Run the check before asking a prover LLM to prove the substituted theorem.

Verus form

Inference: The corresponding VL checker can walk a generated Verus expression or contract AST and enforce an allowlist of types, function symbols, predicates, and ghost operators. Prove the checker properties with Verus `spec fn` definitions over the AST, `requires` clauses for well-formed trees, `ensures` clauses for the returned Boolean, and `proof fn` lemmas that accepted trees contain only allowed symbols. Inference: this is a structural policy proof, not a proof that the selected specification matches intent. Inference: keep the checker executable and prove its soundness separately with erased `proof fn` lemmas.

evidence and limits

Table 7 measures the effect of admissibility checking. On MathArena, GPT-5.4 had 13 standard solves and 19 additional spurious solves under a naive metric that checked only Lean compilation; Goedel-Prover-V2-32B had 7 standard and 18 spurious. On PutnamBench, GPT-5.4 had 8 standard and 134 spurious, while Goedel-Prover-V2-32B had 7 standard and 99 spurious. The denominator is 75 MathArena problems or 346 PutnamBench problems, and the caption explains: “Each entry is a + b, where a denotes solved instances under the standard metric, while b denotes the number of spurious “solved” instances under the naive metric without enforcing admissibility checking.” (Table 7, PDF p. 15) The authors report: “We manually inspected the instances counted under the standard metric and found that the constructed answers and their Lean proofs are nontrivial and do not rely on circular or trivial existential witnesses.” (section 5.4, PDF p. 15) Inference: these results show that compilation alone can overcount success in answer-construction tasks.

## technique 3: bounded enumeration followed by LLM conjecture

what it is and when to use it

ECP uses a general LLM's tool calls to explore small cases, then asks it to generalize. Inference: use this when a tractable bounded search can expose a pattern and direct symbolic search is expensive. The method section states: “ECP first queries a general LLM to write one or more Python programs to directly solve for the answer or search for tuples (X,Y ) satisfying P(X) ∧ Q(X,Y ) over bounded and tractable values.” (section 4.3, PDF p. 8)

how to do it

1. Build a prompt from the formal task and any failed answers.
2. For up to `max_enumerate_rounds`, ask the general LLM for a Python tool call.
3. Parse the call, execute it in the sandbox, and append the code and stdout/stderr to the context (Algorithm 1, section 4.3, PDF p. 9).
4. When the model stops calling tools or reaches the round limit, ask it to reason from the traces and emit an explicit answer between the extraction delimiters `<<<` and `>>>` (section 4.3, PDF p. 8).
5. Compile the proposed answer and run admissibility checking. Feed compiler errors or an “inadmissible” message back for another conjecture round (Algorithm 1, PDF p. 9).

The AIME II P8 trace illustrates symbolic preprocessing with SymPy, brute-force loops over bounded positive integers, and a conjecture that the least answer is 245 (Figure 4, PDF p. 8). In the default setup, the limits are 10 enumeration rounds, 5 conjecture rounds, and 2 ECP rounds (section 5, PDF p. 11).

Verus form

Inference: A VL version can use executable Rust or Python to enumerate bounded states, then generate candidate Verus contracts or implementations. A `spec fn` can state the bounded predicate; a `proof fn` can prove that a returned candidate satisfies the predicate for the searched range. Inference: finite enumeration cannot prove the unbounded property, so the candidate must still pass Verus proofs for the full contract. Keep tool output as provenance and make failed candidates explicit inputs to the next round.

evidence and limits

Disabling enumeration reduced answer-only accuracy from 68 to 58 on MathArena (75 tasks) and from 303 to 290 on PutnamBench (346 tasks), a loss of 10 and 13 tasks respectively (Table 6, PDF p. 14). More than 50% of instances used at least two tool calls; the mean rose from about 2.5 for AIME to 8.2 for Apex (section 5.2, PDF p. 12). The limitation is combinatorial explosion in difficult combinatorics problems (section 6, PDF p. 15). Inference: bounded search is a useful proposal generator, not a completeness argument.

## technique 4: separate proof automation, prover-LLM repair, and disproof-guided reconstruction

what it is and when to use it

After an admissible answer `Ψ` is found, ECP substitutes it into the theorem to form `T_Ψ`. It first tries a fixed Lean automation portfolio, then asks a prover LLM to repair failed proofs. It also attempts to prove the negation `¬T_Ψ`; if that proof succeeds, it records the answer as failed and returns to construction. The paper states: “In ECP, Prove is invoked for both TΨ and its negation ¬TΨ.” (section 4.4, PDF p. 9)

how to do it

1. Substitute `Ψ` with Lean's `use Ψ`.
2. Try `native_decide`, `simp`, `aesop`, `ring`, and `norm_num` sequentially (section 4.4, PDF p. 9).
3. If automation fails, run multiple parallel prover-LLM attempts. Give each failed proof and Lean's error message to the next repair round (Algorithm 2, PDF p. 10).
4. Run the same proving procedure on `¬T_Ψ`.
5. If `T_Ψ` proves, return the answer and proof. If `¬T_Ψ` proves, add `Ψ` to `FailedAnswers` and reconstruct a new answer. If neither proves, stop (Algorithm 3, PDF p. 10).

Verus form

Inference: The analogous Verus workflow runs the verifier on a generated implementation and contract, then uses counterexamples or failed obligations as repair context. Use Verus `requires`, `ensures`, loop `invariant` clauses where needed, `assert` statements, and `proof fn` lemmas. Inference: encode any negated target as a separate specification with explicit quantifiers before attempting a Verus proof. Inference: preserve the distinction between “proof failed” and “counterexample proved”; a timeout is not a disproof.

evidence and limits

Table 5 shows why both automation and repair matter. Disabling proof automation lowered solves from 18 to 11 on MathArena (75) but left PutnamBench at 17/346; using the smaller prover lowered PutnamBench from 17 to 7. Disabling proof correction lowered MathArena from 18 to 16 and PutnamBench from 17 to 16 (Table 5, PDF p. 14). ECP's end-to-end results are 18/75 MathArena and 17/346 PutnamBench at Pass@32; the strongest GPT-5.4-only baseline solves 13/75 MathArena, while the PutnamBench Pass@32 GPT-5.4 baseline is omitted because its projected cost is about 1,400 USD (section 5.1, PDF pp. 11–12).

## technique 5: equivalence testing for constructed answers

For a find-all problem, or a find-any problem with a unique answer, ECP can prove `Ψ = Ψ_ground_truth` in Lean. The paper says this test is “type-aware and certified whenever it succeeds.” (section 4.5, PDF p. 9) The steps are: substitute both answers into an equality goal; try the fixed automation portfolio; invoke prover-LLM repair if needed; and count equivalence only when Lean proves it. Inference: a successful equality proof supplies stronger evidence than string comparison or an LLM judgment.

Verus form

Inference: For VL, prove equality or refinement between a generated specification and a reference specification with a Verus `proof fn`, using `assert` and lemmas over the relevant `Seq`, `Set`, map, or scalar values. Inference: if the answer is an implementation rather than a value, define the observations to compare and prove that they agree; satisfying a shared `ensures` contract alone need not establish observational equivalence. The paper does not claim equivalence can be established when the reference answer is nonunique or when the equality goal is outside the prover's supported automation.

## measured cost, evidence, and trust boundary

The default ECP uses GPT-5.4 for construction and Goedel-Prover-V2-32B for proving. Lean runs on 64 AMD EPYC 9655 cores with a 120-second timeout; local models run on four H100 SXM GPUs (section 5, PDF p. 11). On MathArena Pass@32, the GPT-5.4 baseline costs 341.2 USD and solves 13/75; ECP costs 110.6 USD total and solves 18/75. On PutnamBench Pass@32, the projected GPT-5.4 baseline costs 1,430.4 USD, while ECP costs 474.5 USD and solves 17/346. The cost setup states: “Our GPUs are on computing clusters, but we assume the H100 GPU hourly rate is 2.0 USD” (section 5, PDF p. 12; footnote marker omitted). The projected baseline multiplies a Pass@4 cost by eight (Table 4 and section 5.3, PDF p. 13). Inference: these assumed and projected costs should not be read as universal prices.

Inference: proof acceptance establishes the supplied formal statement, while agreement with the informal task still depends on formalization and vocabulary selection. The general and prover LLMs and Python enumeration propose answers and proofs; their outputs must pass the stated Lean and admissibility checks. Inference: a Verus adaptation likewise needs independent evidence that its contracts express the intended behavior.

## what VL should learn and what it should not redo

The paper already demonstrates specialized model routing, bounded enumeration, admissible-vocabulary checking, fixed proof automation, prover-LLM repair, disproof-guided answer reconstruction, equivalence testing, and cost accounting. Inference: VL should reuse the separation principle but adapt the admissibility object from Lean constants to Verus specification and API symbols. Inference: a product test should measure spurious “verified” Rust projects when a generated contract can be satisfied by circular or vacuous predicates, then compare a structural contract checker and independent intent evidence.

Inference: the analogous risk for agent-written verified Rust lies at the specification boundary: a proof may establish a vacuous contract. Inference: VL should require an explicit contract vocabulary and reject target-shaped or self-referential specifications before proof generation, then keep negative checks and equivalence/refinement evidence separate from the main proof. Inference: the paper's spurious counts motivate checking answer admissibility alongside proof success; the paper does not evaluate Rust or Verus.

## techniques for the catalog

- typed problem preprocessing: convert natural language to a formal task with domain, predicates, answer variables, and an allowed vocabulary
- admissibility checking: recursively collect expression constants and require the result to stay inside the task's vocabulary
- bounded enumerate-and-conjecture: search finite instances with executable tools and generalize traces into an explicit candidate answer
- proof automation and repair: apply a fixed tactic portfolio, then use prover-LLM feedback loops with compiler errors
- disproof-guided reconstruction: attempt proofs of the substituted statement and its negation, and regenerate after a proved negation
- certified equivalence testing: prove equality of constructed and reference answers in the proof assistant
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "For GPT-5.4, ECP improves MathArena correct answer construction from 58/75 to 68/75 and PutnamBench answer construction from 290/346 to 303/346."): checked every quotation, reported number, section and page reference, and technique step against all 33 PDF pages; corrected page references, preprocessing instructions, an altered quotation, and overstatements about checking and equivalence; marked proposed Verus adaptations and other conclusions as Inference; did not run ECP, inspect its repository, recompile the printed Lean proofs, or validate the proposed Verus adaptations.
