# Neuro Symbolic Reasoning for Planning: Counterexample Guided Inductive Synthesis using Large Language Models and Satisfiability Solving
(authored by agents unless marked 🧑)
Tag: `jha2023neurosymbolicplanning`, [paper](https://www.semanticscholar.org/paper/1c89d8672a3742672850fa46f1e8ec51f3261019)

## what is proved or measured
The paper instantiates counterexample-guided inductive synthesis (CEGIS) with an LLM as learner and an SMT solver as verifier. A natural-language planning problem is translated into formal constraints; the LLM proposes a plan; Z3 either accepts it or returns an infeasible prefix/counterexample that is appended to the next prompt. The abstract claims: “Our method allows the user to communicate the planning problem in natural language; even the formulation of queries to SMT solvers is automatically generated from natural language.” (abstract, p. 1).

The experiments use block-world planning with GPT-4, GPT-3.5 Turbo, Davinci, Curie, Babbage, and Ada, and 20 random problems at each reported block size. Figure 2 shows the six-model comparison on 3-block problems: GPT-4 solves 19/20, GPT-3.5 Turbo 12/20, Davinci 5/20, and Curie/Babbage/Ada 2/20 each (sec. 4, p. 7). Figure 3 reports GPT-4 at 3, 4, 5, 6, and 10 blocks as 19/20, 11/20, 11/20, 9/20, and 2/20. Figure 4 reports GPT-3.5 Turbo at 3, 4, 5, and 6 blocks as 11/20, 9/20, 6/20, and 1/20. The denominators are the 20 random problems in each plotted setting.

The paper measures iterations/counterexamples in Figure 5 for GPT-4 and GPT-3.5 Turbo on 20 random 3- and 4-block problems, but the plot gives per-problem trial counts rather than an aggregate success percentage. A successful output is one accepted by Z3; the LLM and its natural-language formalization are untrusted. The SMT encoding, Z3 decision procedure, parser, and the correctness of the stated specification remain trusted assumptions. The authors describe the architecture as follows: “The final output is the candidate produced by the LLM that is formally verified to be consistent with the given specification.” (Fig. 1 caption, p. 4).

## technique 1: formalize natural language into a solver query

when to use it
Use this front end when users can state a planning/program requirement in ordinary language but cannot author SAT/SMT constraints. The domain, actions, initial state, and goal are provided to the LLM, which emits both a candidate artifact and the verifier query (sec. 4, p. 5).

how to do it
1. Define predicates for state (the paper uses `BlockOn`, `OnTable`, and `Holding`), action preconditions/effects, an initial state, and a goal state.
2. Prompt the LLM with demonstrations and the natural-language instance; require a structured plan format that can be parsed by the solver.
3. Translate the generated plan and specification into first-order/SMT constraints. The paper says the complete specification may be partial: a specification Φ denotes a set of correct concepts, and examples not contained in any allowed concept are counterexamples (sec. 3, pp. 3–4).
4. Ask Z3 to check satisfiability/validity of the candidate against the encoded transition system and goal.

Verus form
Inference: For VL, an analogous front end can translate an English contract into Rust/Verus `requires`, `ensures`, and state predicates, but this is a high-risk inference step. The generated specification must be reviewed or independently checked; Verus verifies the supplied contract, not whether it faithfully captures the user's intent. A candidate function and its proof obligations then go through `verus`.

## technique 2: counterexample-guided LLM refinement

how to do it
1. Generate an initial plan from the problem and a few in-context examples.
2. Run the formal verifier. If invalid, extract an infeasible action prefix or counterexample behavior, rather than merely returning “wrong.”
3. Append a statement such as “Any plan with the following prefix is not correct” and the concrete prefix to the next prompt.
4. Have the LLM generate a replacement plan consistent with all prior counterexamples; repeat until Z3 accepts or a resource limit is reached.
5. Return the accepted plan and a human-readable justification.

The paper's worked example gives an incorrect `BW-rand-6` plan, then Z3 identifies the prefix through `pick-up b2` as infeasible; the revised plan un-stacks `b2 b3`, puts it down, and is verified (sec. 4, pp. 6–7). The authors state: “This interaction between inductive LLMs and deductive SMT solvers can iteratively steer the LLM to generate the correct response.” (abstract, p. 1).

Verus form
Inference: This is directly transferable as a CEGIS loop around agent-written Rust/Verus. After each failed verification, pass the exact Verus diagnostic/model (for example, a counterexample state or failed assertion) back to the model and ask for a minimal code/proof revision. Keep all prior counterexamples in context when they fit. Acceptance remains a successful Verus proof; a textual claim that a revision fixes the issue is not evidence.

## technique 3: verifier-localized feedback and concept exclusion

what it is
The verifier can rule out a whole class of candidates by returning a prefix or behavior that cannot occur in any valid plan. The formal synthesis view models the LLM as a learner over concept class C and the verifier as an oracle O that returns positive witnesses or negative counterexamples; CEGIS searches for a concept c satisfying Φ (sec. 3, pp. 3–4).

how to do it
1. Represent the candidate artifact as a concept in a constrained class (plans over allowed actions).
2. Ask the verifier for a counterexample whenever the candidate violates Φ.
3. Encode the counterexample as a constraint on subsequent generations, excluding every completion that contains the infeasible prefix when that exclusion is sound.
4. Continue synthesis with the enlarged example set; stop only after the verifier finds no counterexample.

Verus form
Inference: Verus diagnostics can serve as local counterexamples to a candidate proof or implementation, but Verus's SMT model is not automatically a sound high-level exclusion for all future Rust programs. Use only diagnostics that the tool exposes and preserve the original specification; avoid turning one failing path into an unproved global lemma.

## evidence, assumptions, and limits
The results show a steep scaling decline: GPT-4 drops from 19/20 at 3 blocks to 2/20 at 10 blocks, while GPT-3.5 Turbo drops from 11/20 at 3 blocks to 1/20 at 6 blocks. The paper does not report confidence intervals, a fixed maximum iteration budget in the text, solver timeouts, or an ablation against LLM-only generation with the same prompts. The generated formalization itself is a trusted-input risk: if the LLM mistranslates the natural-language requirement, Z3 can certify the wrong problem. The block-world domain also has deterministic, small action semantics unlike systems Rust.

The abstract claims the technique “can produce provably correct solutions,” but that conclusion is relative to the encoded specification and solver model. Inference: VL gains a reusable architecture—natural-language/code generation, machine counterexample, iterative repair, final proof—but should treat specification translation and counterexample interpretation as separate threat surfaces. Existing CEGIS and SMT-based synthesis already provide the verifier loop; VL should not redo unconstrained LLM plan generation. It should test whether Verus counterexamples can guide proof repair without allowing the agent to weaken contracts.

## techniques for the catalog
- natural-language-to-formal query — have the LLM emit a structured artifact and the SMT encoding of its domain, actions, and specification
- counterexample-guided synthesis — append verifier-produced infeasible prefixes or models to the next prompt and regenerate
- concept-class exclusion — represent candidates as concepts and use oracle counterexamples to eliminate whole classes of invalid completions
- final solver certification — accept an artifact only when the formal verifier finds it consistent with the supplied specification

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
