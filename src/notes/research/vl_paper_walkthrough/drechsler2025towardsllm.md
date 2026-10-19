# Towards LLM-based Generation of Human-Readable Proofs in Polynomial Formal Verification
(authored by agents unless marked 🧑)
Tag: `drechsler2025towardsllm`, [paper](https://arxiv.org/abs/2505.23311)

## scope and result
This invited paper explores ChatGPT 4o as a source of human-readable proof proposals for Polynomial Formal Verification (PFV). PFV pairs selected circuit implementations with proof engines and theoretical resource bounds (§1, p. 1). The abstract describes the proposed role of LLMs: "Here, we study how modern approaches from Artificial Intelligence (AI) based on Large Language Models (LLMs) can be used to generate proofs that later on can be validated based on reasoning engines." (Abstract, p. 1). The paper presents example conversations, not an implemented LLM-to-PFV integration or a measured verification experiment.

The author warns: "But due to the hallucinations in the AI tool, finally the correctness has to be proven." (§1, p. 1). Inference: for VL, an LLM-generated Verus proof sketch is a proposal whose claims require verification.

## technique 1: induction proof templates for BDD properties

what it is
- prompt an LLM for mathematical induction on a structural property of a binary decision diagram (BDD)
- use the generated explanation as a candidate proof, with formal validation still required

when to use it
- the appendix suggests properties measured by the number of variables or BDD size
- Inference: the chosen property must support the proposed decomposition and induction hypothesis

how to do it
1. Ask how to perform an induction proof for BDDs (Appendix Q1, p. 4).
2. The quoted answer proposes a base case with zero or one variable (Appendix Q1, p. 4).
3. Assume the property for all BDDs with up to `n` variables (Appendix Q1, p. 4).
4. Split an `n+1`-variable BDD at its root into Then/Else branches with at most `n` variables, and apply the hypothesis (Appendix Q1, p. 4).
5. Inference: check whether the branch properties actually imply the desired property of the whole BDD; the generic template alone does not establish this.

The quoted ChatGPT answer begins: "Step 1: Base Case: Prove the property holds for a trivial BDD, such as one with 0 or 1 variable." (Appendix Q1, p. 4). It then says: "Step 2: Inductive Hypothesis: Assume the property holds for all BDDs with up to n variables." (Appendix Q1, p. 4).

Verus form
Inference: express the property and induction measure in specifications, and use a recursive proof function with a decreasing measure. A model of BDD nodes, branches, and sharing would be needed to connect these lemmas to BDDs. The paper contains no Verus encoding.

evidence and limits
- Q1 supplies a generic induction outline, not a checked proof of a particular property.
- The paper reports four appendix questions and excerpts from a multiplication conversation; it supplies no systematic prompt benchmark, success rate, or timing for LLM-assisted verification.

## technique 2: adapt induction to grouped monomials and symmetry

what it is
- match the induction step to pairs or triples of variables, or count states by the number of input ones

when to use it
- the illustrated families are disjunctions of disjoint two-variable or three-variable conjunctions, and totally symmetric Boolean functions (§2, p. 2)

how to do it
1. For `f_n = Σ_{i=1}^n x_{2i-1}x_{2i}`, Q2 fixes the ordering `x1 < x2 < ... < x2n` and adds a two-variable term at each step (Appendix Q2, p. 4).
2. Q2's answer claims three internal nodes for the base case, an inductive hypothesis of size `≤ 3k+1`, and three added nodes giving `3(k+1)+1` (Appendix Q2, p. 4).
3. For `n = 3k` and `f_k = Σ_{i=1}^k x_{3i-2}x_{3i-1}x_{3i}`, Q3's answer claims three internal nodes in the base and four added nodes per term, including an OR node (Appendix Q3, p. 4).
4. For a totally symmetric function, Q4 tracks how many ones have been seen. Its answer counts `i+1` nodes at level `i` and sums from `i=0` to `n` to obtain `(n+1)(n+2)/2 = O(n²)` (Appendix Q4, p. 4).
5. Require a formal proof of these candidate arguments (§2, p. 2).

The author says of the two-variable example: "Here, it is important to do the induction step not only for a single but for two variables." (§2, p. 2). After discussing the examples, he adds: "Of course, in all cases a formal proof that should be tool assisted is required." (§2, p. 2).

Verus form
Inference: model the construction, state the variable ordering, and prove the node-count bound with structural and arithmetic lemmas. For symmetric functions, a specification can track the level and number of ones seen.

evidence and limits
- The exact node counts above are claims in reproduced ChatGPT answers. The paper gives no checker output establishing them.
- Inference: the node convention, reduction, sharing, and treatment of terminal nodes must be fixed before using these counts as verified bounds. In particular, Q3's reference to an OR node needs justification in a BDD model.
- The author cites prior work for quadratic BDD bounds for symmetric functions (§2, p. 2); this paper does not newly verify that theorem.

## technique 3: follow-up prompts to expose false complexity claims

what it is
- challenge an LLM's qualification of a known theorem and inspect the proposed exception

when to use it
- Inference: use this when a generated answer weakens a universal theorem or offers empirical behavior as an asymptotic bound

how to do it
1. Ask whether induction can prove polynomial BDD size for multiplication (§2, p. 2).
2. Inspect the model's initial answer: it denies a general polynomial bound but says exponential size occurs under most variable orderings (§2, p. 2).
3. Ask for a case avoiding exponential growth (§2, p. 2).
4. Compare the proposed ordering with the known result. The author states that multiplication has exponential BDD size independently of variable ordering and cites Bryant's 1991 work (§2, p. 2).
5. Inference: reject the unsupported exception; the follow-up answer is not a correction or a verified proof.

The initial answer includes: "In fact, under most variable orderings, BDDs for multiplication require exponential space." (§2, p. 2). The follow-up question is: "But many cases does not mean all, right? can you give me a case where you can avoid the exponential blow-up." (§2, p. 2). The author rejects the follow-up's complexity claim: "From a complexity analysis point of view the last sentence is not correct, while the core message is clear: for a small number of variables the program might terminate within the given resources." (§2, p. 3).

Verus form
Inference: preserve a theorem's quantification over permitted variable orderings in its specification. A proof about one ordering or a finite set of small inputs cannot establish the universal asymptotic claim.

evidence and limits
- The paper shows an initial multiplication answer and an erroneous follow-up, with the author's corrections. This conversation supplies no general error rate.
- There is no demonstrated automatic correction, checker integration, or verified replacement proof.

## technique 4: proposed connection to formal reasoning engines

what it is
- connect readable LLM proof proposals to formal validation; the connection is a research direction

when to use it
- Inference: a generated explanation needs an independent correctness check before supporting a verification claim

how to do it
1. Generate an induction argument as in the illustrated conversations (§2, pp. 1–2).
2. Seek formal validation through patterns from prior BDD work or an explanation based on logical reasoning; the paper proposes these alternatives (§3, p. 3).
3. As future work, consider modern data structures, retrieval of tailored proofs, chain-of-thought reasoning, and feedback from a formal tool (§3, p. 3).

The conclusion says: "While the suggestions for proofs — at least for induction — are promising, a formal approach has to be applied." (§3, p. 3). It describes feedback as a possibility: "Using techniques like chain of thought reasoning and feedback from the formal tool can further aid the LLMs in proof generation." (§3, p. 3).

Verus form
Inference: a corresponding VL experiment could generate proof outlines, encode their claims as Verus specifications and lemmas, and run Verus. Retrieved lemmas and tool feedback could inform later attempts. Neither this translation nor a feedback loop is implemented or evaluated in the paper.

evidence and limits
- The paper concludes: "For PFV a linking of formal tools with the LLM is a promising direction for future work." (§3, p. 3).
- Inference: an implementation would need to justify the correspondence between a circuit, its BDD model, and the property checked by the formal engine. The paper provides no implemented trust analysis for that connection.

## what is proved, trusted, and relevant to VL
The paper illustrates proof suggestions and cites established PFV/BDD results; it does not report machine-checked proofs of the generated answers. It identifies ChatGPT 4o as the model (§1, p. 1). Its introductory timing example concerns earlier PFV work on adders, not an LLM experiment. Its future directions remain proposals (§3, p. 3).

Inference: VL can use the examples as motivation to check generated proof claims, including their quantifiers and complexity assumptions. LLM prose should remain untrusted; Verus acceptance also depends on the specification and any assumptions. A further experiment could measure accepted, rejected, and repaired Verus proposals over a fixed corpus. This paper provides no such measurements.

## techniques for the catalog
- induction proof prompting — demonstrated generic base, hypothesis, and recursive-step suggestions
- structure-matched induction — demonstrated suggestions for pairs, triples, and Hamming-weight state counts; exact counts remain unchecked
- follow-up questioning — demonstrated challenge to a multiplication claim that elicits another erroneous answer
- explanation plus formal validation — proposed connection to proof engines, without an implemented integration
- retrieval and formal-tool feedback — future directions, not demonstrated techniques

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "While the suggestions for proofs — at least for induction — are promising, a formal approach has to be applied."): checked all four pages, quotations, numbers, section and page references, technique steps, model identity, and link; changed the link to the paper's arXiv identifier, distinguished reproduced model claims from verified results and future work from demonstrated behavior, removed unsupported error rates and trust claims, and marked VL conclusions as Inference; did not independently prove the BDD bounds, reproduce the conversations, or inspect the cited works.
