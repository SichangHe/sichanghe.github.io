# Neuro Symbolic Reasoning for Planning: Counterexample Guided Inductive Synthesis using Large Language Models and Satisfiability Solving
(authored by agents unless marked 🧑)
Tag: `jha2023neurosymbolicplanning`, [paper](https://arxiv.org/abs/2309.16436)

## what is proved or measured
The paper instantiates counterexample-guided inductive synthesis (CEGIS) with an LLM as learner and an SMT solver (Z3) as verifier. It is a short 8-page paper plus appendix, with no theorems and no experiment beyond block-world planning. The LLM translates natural-language action descriptions into Z3 constraints (App. A and B), proposes a plan, and the solver either accepts it or returns an infeasible prefix that is appended to the next prompt. The abstract claims: “Our method allows the user to communicate the planning problem in natural language; even the formulation of queries to SMT solvers is automatically generated from natural language.” (abstract, p. 1). The paper shows the generated constraints only for the four action semantics (pick-up, put-down, stack, unstack; App. A and B). It does not show how the candidate plan and the goal are turned into a solver query, nor how the infeasible prefix is computed.

The experiments use block-world planning with GPT-4, GPT-3.5 Turbo, Davinci, Curie, Babbage, and Ada. The prompt contains two worked examples (sec. 4, p. 5). Figure 2 (p. 7), on 20 random 3-block problems, shows “Number of Successful Plans”: GPT-4 19, GPT-3.5 Turbo 12, Davinci 2, Curie 2, Babbage 2, Ada 0. Figure 3 (p. 7) reports “Number of Correct Solutions” for GPT-4 at 3, 4, 5, 6, and 10 blocks as 19, 11, 11, 9, and 2. The text says “it is only able to solve 2 out of the 20 problems with 10 blocks even though it could solve 19 out of the 20 problem with 3 blocks”. Figure 4 (p. 8) reports GPT-3.5 Turbo at 3, 4, 5, and 6 blocks as 12, 4, 6, and 1. The paper does not state the denominator for Figure 4 or whether Figures 2 to 4 count plans accepted after the verifier loop or first-shot plans. Inference: the denominator is 20, as for the other figures.

The paper measures iterations of counterexamples in Figure 5 (p. 8) for GPT-4 and GPT-3.5 Turbo on “20 random problems involving 3 and 4 blocks”, and in Figures 6 and 7 (App. A.1, pp. 13–14) for 5 and 6 blocks. The plots give a per-problem “Number of Trials” (the y-axis stops at 10); there is no aggregate success rate and no stated iteration limit. In Figure 5 many GPT-3.5 Turbo bars sit at 10. Inference: this may mean a cap of 10 or failure, but the paper does not say. The sentence “We study how LLMs are improved by adding verification in the loop” is not followed by any comparison with and without the loop.

Inference: a plan counted as successful is presumably one accepted by Z3. The LLM and its natural-language formalization are untrusted. The SMT encoding, Z3, the parser, and the correctness of the stated specification remain trusted assumptions. The authors describe the architecture as follows: “The final output is the candidate produced by the LLM that is formally verified to be consistent with the given specification.” (Fig. 1 caption, p. 4).

## technique 1: formalize natural language into a solver query

when to use it
Use this front end when users can state a planning/program requirement in ordinary language but cannot author SAT/SMT constraints. In the paper, the predicates, permitted actions, initial state, and goal are given to the LLM (sec. 4, p. 5). The action semantics are translated into Z3 Python code with the prompt “Translate the following into first-order logic using the formatting of Z3 Python API and the following state information:” (App. A, p. 11).

how to do it
1. Define predicates for state. Sec. 4 names `BlockOn`, `OnTable`, and `Holding`; the Z3 `State` class in App. A uses the functions `table`, `hand`, `stacked`, `clear`, and `handsfree`. Give an informal specification of each action's preconditions and effects between a before-state s1 and an after-state s2 (for example the pick-up text in App. A, p. 11).
2. Ask the LLM to output Z3 constraints for that action (the “corresponding produced formal constraints” in App. A).
3. Prompt the LLM with two in-context examples (problem plus a plan between `START-PLAN` and `END-PLAN`) and the natural-language problem instance, so that the plan format is parseable (sec. 4, pp. 5–6).
4. Inference: encode the candidate plan as a chain of states linked by these action constraints, add the initial state and the goal, and ask Z3 whether the chain is consistent. The paper does not spell out this step.

The paper's theory section also says the specification may be partial: “Φ is likely to be a partial specification that allows for multiple correct concepts.” (sec. 3, p. 3).

Inference: the appendix shows that LLM-written constraints need review. In the put-down code (App. B, p. 18), `ForAll([x], And(x != block, ...))` cannot hold for x equal to the block. The paper does not say whether the authors checked the generated constraints.

Verus form

## technique 2: counterexample-guided LLM refinement

how to do it
1. Generate an initial plan from the problem and the in-context examples.
2. Run the formal verifier. If the plan is invalid, give the model more than a bare “wrong”. The paper considers two kinds of response: one that only states the sequences “are not valid”, and one that gives “a richer response as a prefix of the invalid plan such that any completion would be incorrect” (sec. 4, p. 5). It does not compare the two.
3. Append the statement “Any plan with the following prefix is not correct” and the prefix to the next prompt (sec. 4, p. 6).
4. Have the LLM generate a new plan. The paper says “This iteration continues till the response of the LLM is verified to be correct.” (sec. 4, p. 5). Inference: a real deployment needs a resource limit, which the paper does not specify.
5. The final response “provides a human-readable justification in addition to the final plan” (sec. 4, p. 5).

The paper's worked example (sec. 4, pp. 6–7) gives an incorrect plan for `BW-rand-6`. The solver identifies steps 1 to 5 (through `pick-up b2`) as an infeasible prefix, and the revised plan instead does `unstack b2 b3` and `put-down b2`, and “is verified to be correct by the decision procedure”. The authors state: “This interaction between inductive LLMs and deductive SMT solvers can iteratively steer the LLM to generate the correct response.” (abstract, p. 1).

Verus form
Inference: This is directly transferable as a CEGIS loop around agent-written Rust/Verus. After each failed verification, pass the exact Verus diagnostic/model (for example, a counterexample state or failed assertion) back to the model and ask for a minimal code/proof revision. Keep all prior counterexamples in context when they fit. Acceptance remains a successful Verus proof; a textual claim that a revision fixes the issue is not evidence.

## technique 3: verifier-localized feedback and concept exclusion

what it is
The paper argues the verifier can “localize the part of the solution that violates the specification and ... provide informative feedback to the LLMs that rule out not just a single incorrect solution but a whole class of incorrect solutions” (sec. 3, p. 4). The formal synthesis view models the LLM as a learner over a concept class C and the verifier as an oracle O that returns positive witnesses or negative counterexamples; CEGIS searches for a concept c satisfying Φ (sec. 3, pp. 3–4). In the experiment, this feedback is the invalid-plan prefix put into the prompt text. The paper gives no evidence that the LLM actually avoids every completion of the prefix.

how to do it
1. Represent the candidate artifact as a concept in a constrained class (plans over allowed actions).
2. Ask the verifier for a counterexample whenever the candidate violates Φ.
3. Put the counterexample into the next prompt; where the verifier can show that no completion of a prefix is valid, say so.
4. Continue until the verifier finds no counterexample.

Verus form
Inference: Verus diagnostics can serve as local counterexamples to a candidate proof or implementation, but Verus's SMT model is not automatically a sound high-level exclusion for all future Rust programs. Use only diagnostics that the tool exposes and preserve the original specification; avoid turning one failing path into an unproved global lemma.

## evidence, assumptions, and limits
The reported counts decline with size but not monotonically: GPT-4 goes 19, 11, 11, 9, 2 for 3, 4, 5, 6, 10 blocks, and GPT-3.5 Turbo goes 12, 4, 6, 1 for 3, 4, 5, 6 blocks. The text says GPT-4 was analyzed “with 3, 4, 5 and 6 blocks”, yet Fig. 3 also has 10 blocks; no 10-block run for GPT-3.5 Turbo is reported. The paper does not report confidence intervals, an iteration limit, solver timeouts, or a comparison with LLM-only generation using the same prompts. Its conclusion calls the results “initial experiments” that are “encouraging”. Inference: the generated formalization is a trusted-input risk. If the LLM mistranslates the natural-language requirement, Z3 can certify the wrong problem. The block-world domain also has small, deterministic action semantics unlike systems Rust.

The abstract claims the combination “can produce provably correct solutions”.

## techniques for the catalog
- natural-language-to-formal query: have the LLM emit Z3 constraints for the domain's action semantics from informal text, then review them
- counterexample-guided synthesis: append verifier-produced infeasible prefixes or models to the next prompt and regenerate
- concept-class exclusion: represent candidates as concepts and use oracle counterexamples to rule out classes of invalid completions
- final solver certification: accept an artifact only when the formal verifier finds it consistent with the supplied specification
