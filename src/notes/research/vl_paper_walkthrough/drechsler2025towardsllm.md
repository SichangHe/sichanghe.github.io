# Towards LLM-based Generation of Human-Readable Proofs in Polynomial Formal Verification
(authored by agents unless marked 🧑)
Tag: `drechsler2025towardsllm`, [paper](https://doi.org/10.48550/arxiv.2505.23311)

## scope and result
This invited paper asks whether an LLM can draft human-readable proofs for Polynomial Formal Verification (PFV), while a formal reasoning engine checks correctness. PFV targets circuit classes such as adders and multipliers for which theory gives polynomial resource bounds and an efficient proof engine. The paper's proposal is a workflow, not a measured verification system: prompt ChatGPT 4o, inspect its explanation, and validate every useful claim with BDD-based formal methods. The abstract says: "Here, we study how modern approaches from Artificial Intelligence (AI) based on Large Language Models (LLMs) can be used to generate proofs that later on can be validated based on reasoning engines." (Abstract, p. 1).

The strongest lesson is separation of explanation from proof. The authors warn: "But due to the hallucinations in the AI tool, finally the correctness has to be proven." (§1, p. 1). Inference: for VL, an LLM-generated Verus proof sketch is input to a verifier and cannot be accepted as evidence until Verus checks it.

## technique 1: induction proof templates for BDD properties

what it is
- prove a structural BDD property by mathematical induction on variables or BDD size
- generate a readable explanation with an LLM, then connect it to a graph-based proof engine

when to use it
- adders or Boolean functions whose BDD size or construction follows a recursive pattern
- functions where a root split reduces the problem to smaller Then/Else BDDs

how to do it
1. state the property and induction measure, such as number of variables (§2, p. 1–2)
2. prove a base BDD with zero or one variable (Appendix Q1, p. 4)
3. state the inductive hypothesis for all BDDs up to `n` variables (Appendix Q1, p. 4)
4. split an `n+1`-variable BDD at its root into branches with at most `n` variables (Appendix Q1, p. 4)
5. apply the hypothesis to the branches and conclude the property for `n+1` (Appendix Q1, p. 4)
6. ask the LLM to render these steps in readable prose, then validate node counts and logical implications with the BDD method (§2, p. 2)

The paper gives the generic sequence verbatim: "Step 1: Base Case: Prove the property holds for a trivial BDD, such as one with 0 or 1 variable. Step 2: Inductive Hypothesis: Assume the property holds for all BDDs with up to n variables. Step 3: Inductive Step: Prove it holds for n + 1 variables." (Appendix Q1, p. 4).

Verus form
Inference: encode the induction measure and property as a `spec fn`; use a recursive proof `fn` with `requires` and `ensures`, and prove the base and recursive cases with `decreases`. BDD nodes and sharing need a model (for example, a finite sequence or map) and invariants. Verus can check the resulting arithmetic and structural lemmas, but the paper's BDD reasoning engine is not a Verus construct.

evidence and limits
- For `f_n = Σ x_{2i-1}x_{2i}`, Q2 claims a base of three internal nodes, an inductive addition of three nodes, and size `3n+1` (Appendix Q2, p. 4).
- For three-variable monomials, Q3 groups three variables in the base and adds four nodes per term, concluding `O(n)` (Appendix Q3, p. 4).
- These are illustrative examples, not an evaluation set. No number of prompts, success fraction, runtime, or independent checker failures is reported.

## technique 2: adapt induction to grouped monomials and symmetry

what it is
- choose an induction unit matching the function's repeated structure: two variables for `f2`, three for `f3`, and Hamming-weight states for totally symmetric functions

when to use it
- the induction step is invalid if it adds only one variable while the function's monomial or state structure requires a group

how to do it
1. identify the repeated term size (§2, p. 2)
2. make the base case contain one complete term (Appendix Q2–Q3, p. 4)
3. add one complete term in each inductive step and count the newly created BDD nodes (Appendix Q2–Q3, p. 4)
4. for a totally symmetric function, track the number of ones seen at each level; level `i` has `i+1` possible counts (Appendix Q4, p. 4)
5. sum levels `Σ(i+1)` to obtain `(n+1)(n+2)/2 = O(n²)` (Appendix Q4, p. 4)

The paper explicitly cautions for `f2`: "Here, it is important to do the induction step not only for a single but for two variables." (§2, p. 2). It states the symmetry result: "For totally symmetric functions (see Q4) it is known that BDDs only require a quadratic number of nodes, i.e. O(n2) [9]." (§2, p. 2).

Verus form
Inference: represent the level and Hamming weight as ghost or specification state, prove the node-count recurrence by arithmetic lemmas, and use a `decreases` measure for recursive construction. The BDD package's canonical reduction and sharing remain an external model unless reimplemented and verified.

evidence and limits
- The only denominators are the explicit formulas for one function family and the `O(n²)` level sum; no empirical BDD-size table is given.
- Inference: an LLM can suggest a grouping, but a verifier must check that the grouping corresponds to the actual BDD construction and variable ordering.

## technique 3: adversarial prompting and correction of an LLM's false proof

what it is
- ask the model a broad complexity question, inspect the answer for an overclaim, and issue a follow-up prompt targeting the disputed condition

when to use it
- whenever an LLM generalizes from a few variable orderings or examples to a universal theorem

how to do it
1. ask whether induction can prove polynomial BDD bounds for multiplication (§2, p. 2)
2. detect the model's unsupported claim that only “most” orderings cause exponential size (§2, p. 2)
3. ask for a counterexample or ordering that avoids blow-up (§2, p. 2)
4. compare the answer with the established theorem; the paper says multiplication is exponential for every variable ordering, so the generated “polynomial in practice” claim is wrong (§2, pp. 2–3)
5. send the corrected statement to the formal proof process rather than retaining the prose as evidence (§3, p. 3)

The model's wrong generalization is preserved in the paper: "A poor ordering like: a0, b0, a1, b1, a2, b2, . . . leads to exponential size." (§2, p. 2). The authors then correct its conclusion: "From a complexity analysis point of view the last sentence is not correct, while the core message is clear." (§2, p. 3).

Verus form
Inference: encode the theorem as a Verus lemma whose postcondition quantifies over every permitted variable ordering, and reject a proof that establishes only an existential or empirical ordering. The model's prose can be a comment or proof plan; only solver-checked `ensures` clauses and lemmas count.

evidence and limits
- One multiplication prompt generated a wrong answer; one follow-up exposed the error. This is a 1/1 reported failure for that showcased prompt, not a general hallucination rate.
- The paper does not report automatic correction, checker integration, or a reproducible prompt benchmark.

## technique 4: connect LLM explanations to a formal reasoning engine

what it is
- use LLM text to explain induction or graph patterns, then validate the underlying mathematical claim with PFV's BDD proof machinery

when to use it
- a proof needs readable exposition but its correctness depends on exact graph transformations and complexity bounds

how to do it
1. select a PFV instance and its BDD representation (§1, p. 1)
2. prompt the LLM for an explanation or proof outline (§2, p. 1–2)
3. translate the outline into the graph-based proof patterns from prior PFV work (§2, p. 2)
4. run the formal engine and retain the explanation only if the engine proves the property (§2, p. 2; §3, p. 3)
5. feed tool feedback back into later prompts; the authors list feedback and chain-of-thought as future improvements (§3, p. 3)

The conclusion is explicit: "LLMs are a very powerful tool in the context of text generation." (§3, p. 3) but "the correctness has to be checked by some formal tools." (§3, p. 3).

Verus form
Inference: the corresponding VL workflow is prompt or generate a proof outline, encode its claims as Verus specifications and lemmas, run Verus/Z3, and present only checked obligations plus the model's explanation. Retrieval of prior Verus lemmas can supply context, but retrieved text is not trusted until checked.

evidence and limits
- The paper offers examples and future directions, not an implemented LLM-to-PFV tool or performance result.
- Trusted parts include the BDD implementation, PFV theorem and resource analysis, proof-engine translation, LLM output filtering, and the verifier itself. The specification and the correspondence between circuit and BDD remain assumptions unless proved.

## what is proved, trusted, and relevant to VL
The paper proves or relies on known PFV/BDD facts for the example families; it measures neither proof success nor resource use in this invited paper. What remains trusted includes ChatGPT 4o's generated text until checked, the BDD engine, the circuit-to-BDD encoding, and all underlying PFV theorems and implementations. Inference: the threat to an agent-written verified-Rust product is indirect but real: a language model can produce persuasive false lemmas or weaken a universal claim to an empirical one. The mitigation is architectural—make Verus the acceptance gate and treat LLM text as an untrusted explanation/proof proposal.

The paper already demonstrates induction prompts, grouped-variable reasoning, symmetry node counting, adversarial follow-up, and formal-tool feedback as a workflow. VL should not redo these as novel techniques. A useful new experiment would measure Verus proof success and repair effort over a fixed corpus of generated lemmas, with denominators for accepted, rejected, and corrected proposals; this paper supplies no such numbers.

## techniques for the catalog
- induction proof prompting — ask for base, hypothesis, and recursive BDD proof steps, then check them formally
- structure-matched induction — group variables or track Hamming weight so the induction measure matches the BDD construction
- adversarial correction — challenge broad LLM complexity claims with follow-up prompts and theorem checks
- explanation-plus-verification — use LLM prose for readability while a BDD or Verus engine is the authority
- feedback-driven generation — feed formal-tool feedback and retrieved prior proofs into subsequent proof prompts

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
