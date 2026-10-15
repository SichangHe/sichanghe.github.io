# From Solvers to Research: Large Language Model-Driven Formal Mathematics at the Research Frontier
(authored by agents unless marked 🧑)
Tag: `jiang2026solvers`, [paper](https://doi.org/10.48550/arxiv.2607.07779)

## scope and claims
This position review surveys LLM theorem proving and identifies a path from isolated proof solving to research agents. Its concrete formal-verification workflow is neuro-symbolic: a model proposes formal statements or proof steps, an interactive theorem prover checks them, and verifier results drive search and training. The paper reports benchmark results, but it is a review rather than a new implementation; many method descriptions summarize cited systems.

## technique: autoformalization with verifier filtering
What it is: translate a natural-language or informal mathematical problem into an ITP statement, then retain statements whose syntax and downstream proof behavior pass checks. The review states, “Autoformalization is the task of translating mathematical problems from natural language descriptions” (Section 2.6, p. 4). DeepSeek-Prover is described as converting competition problems and producing 8 million theorem–proof pairs for fine-tuning (Section 3.1.1, pp. 7–8).

When to use it: use this bridge when the available mathematics is informal but the target prover needs explicit types, hypotheses, and conclusions. The paper warns that compilation alone does not ensure semantic fidelity: “A subtle mistranslation can make subsequent verification effectively meaningless” (Section 5.1, p. 16).

Steps reported by the paper: (1) generate a formal statement from the informal problem (Section 3.1.1); (2) filter or verify the statement and its candidate proof in Lean (Figure 3, p. 8); (3) add successful theorem–proof pairs to training data (Figure 3). The Figure 3 example makes assumptions explicit (`x y : ℝ`, `x ≤ 1/2`, `x > 0`, `y < sin x`) and proves `y < 1/2` by chaining `sin x ≤ x`, `x ≤ 1/2`, and transitivity.

Verus form. Inference: represent the translated claim as a Rust function contract with `requires` for typed hypotheses and `ensures` for the conclusion; use `spec fn` predicates for mathematical definitions and `assert` or proof functions for the chain of inequalities. Inference: unlike Lean syntax, Verus contracts must be attached to Rust functions and use the supported Verus arithmetic and sequence libraries. Inference: a separate human or agent review must check that the contract states the intended theorem, because Verus can prove a weakened contract.

Evidence and limits: MiniF2F results in Table 4 are best reported extended-inference pass rates; Seed-Prover is listed at 99.6% (243/244 problems). The review also says formalization errors can weaken a problem into a trivial one or make it unprovable (Section 5.1, p. 16). These denominators are benchmark problems, not all mathematics, and the paper gives no universal semantic-fidelity rate.

## technique: verifier-feedback training and reflective repair
What it is: use Lean's success or error output as a reward or correction signal. The paper defines RL from proof-assistant feedback: “Lean’s verification of a correct proof provides the reward signal” (Section 3.1.1, p. 8). Reflective systems feed formal error messages and success signals back into generation (Section 3.1.2, p. 9).

Steps: (1) sample a proof candidate; (2) execute it in the prover; (3) assign reward for verification success or expose the error; (4) update the policy or ask for a repaired proof; (5) repeat. Search-in-the-loop variants collect validated proofs for self-training; reflective variants extract a sketch and refine it stepwise (Section 3.1.2).

Verus form. Inference: compile each candidate Verus function or proof block, classify verifier diagnostics, and feed the diagnostic plus current goal back to a generator. Keep executable code separate from proof-only code; use `requires`, `ensures`, loop `invariant`, `assert`, and proof functions found in the Verus reference. Inference: Verus diagnostics are not Lean tactic errors, so an adapter and empirical error taxonomy are required.

Evidence and limits: Table 4 lists Leanabell-Prover-V2 at 78.2% on MiniF2F-test and Goedel-Prover-V2 at 94.8%; each figure is a reported system result under extended inference, not an ablation proving feedback alone caused the score. The review notes that proofs can become verbose and slow to compile (Section 5.1, p. 16), so feedback can improve validity while leaving maintainability unresolved.

## technique: draft–sketch–prove decomposition
What it is: separate informal planning, formal subgoal scaffolding, and final proof construction. The paper states, “The DSP framework streamlines this process by generating an informal proof plan (Draft), autoformalizing it into a subgoal-based skeleton (Sketch), and then completing the proof using automated tactics or LLMs (Prove).” (Section 3.2, p. 9)

Steps: (1) write a concise informal plan; (2) create formal intermediate goals; (3) solve each goal with tactics or a prover; (4) compose the solved goals into the theorem. Figure 4 gives the chain `sin x ≤ x`, then `y < x`, then `y < 1/2`, with `linarith` used for the final arithmetic step.

Verus form. Inference: encode intermediate facts as helper `proof fn`s with `ensures`, call them from a top-level proof, and preserve loop facts with `invariant`. Inference: a Verus helper must expose all needed preconditions; Lean's `sorry` placeholder and tactic names in Figure 4 do not carry over.

Evidence and limits: Table 4 reports DSP+ at 83.6% and DeepSeek-Prover-V2 at 88.9% on MiniF2F-test, while Hilbert's recursive decomposition is listed at 99.2%. The paper presents these as system-level scores; it does not isolate decomposition from model size, search, or inference budget. It also notes that long-horizon proofs suffer combinatorial explosion (Section 5.2, p. 17).

## technique: theorem retrieval and persistent proof knowledge
What it is: retrieve relevant lemmas from a formal library and insert them into the model context. LeanDojo, COPRA, and AlphaProof use premise selection; Hilbert combines retrieval with recursive decomposition (Section 3.2, p. 10). Continual systems store solved proofs or subproofs for later retrieval.

Steps: (1) index theorem statements and proofs; (2) retrieve candidates for the current goal; (3) add candidates to the prompt; (4) generate and verify a proof; (5) store successful subproofs. Inference: retrieval ranking should use goal and type compatibility, not only lexical similarity.

Verus form. Inference: index Verus `spec fn` lemmas, contracts, and proof functions by symbols and normalized formulas; inject selected declarations into the proof context or source file; run Verus and retain only checked proofs. Inference: a library contract remains an assumption about external code unless its implementation is also verified.

Evidence and limits: ReProver is listed at 26.5% on MiniF2F-test and COPRA at 30.7% (Table 4), whereas stronger systems combine retrieval with decomposition. The paper gives no common retrieval-only denominator beyond the benchmark table, so these values cannot establish retrieval as the sole cause.

## technique: search-in-the-loop and multi-agent orchestration
Search-in-the-loop expert iteration learns to prioritize proof branches; methods include MCTS, best-first search, graph search, and critic-guided trajectories (Section 3.1.2, pp. 8–9). Agentic workflows specialize formalization, lemma generation, proving, and verification agents; Figure 5 shows parallel prover agents, a critic, and a subgoal cache.

Inference: a Verus implementation can parallelize candidate proofs and cache solved obligations, then accept only verifier-checked artifacts. Inference: concurrency of agents does not remove the need for a sound Verus check or a specification review.

The review reports AlphaProof's silver-medal-level result and Seed-Prover's 99.6% MiniF2F score, but emphasizes selection bias and specification errors in research-level reports (Section 4.3, p. 13). For agent-written verified Rust, the threat is high for specification fidelity and long proof maintenance: generation can be productive, yet a formally checked weakened contract still gives the wrong product behavior.

## proved, measured, and trusted
The paper measures benchmark pass rates, corpus sizes, and counts of AI contributions to Erdős problems. Table 6 counts are approximate and drawn from a community-maintained tracker; they are not independently verified theorem counts. Trust remains in the ITP kernel, solver integration, formal libraries, autoformalization fidelity, external tools, and human interpretation. The review explicitly says SMT outputs may have certificates while CAS outputs typically lack comparable guarantees (Section 5.4, p. 19). Inference: VL should treat generated specifications, dependency contracts, and tool certificates as separate trust boundaries.

## techniques for the catalog
- autoformalization with verifier filtering — translate informal mathematics to explicit ITP statements, then filter with compilation and proof checks
- verifier-feedback training — turn proof-assistant success and errors into rewards and repair signals
- draft–sketch–prove decomposition — plan informally, expose formal subgoals, and solve them incrementally
- theorem retrieval with proof memory — retrieve typed lemmas and retain verified subproofs for later goals
- search-in-the-loop proving — use MCTS, best-first, graph, or critic-guided search to collect validated trajectories
- multi-agent proof orchestration — specialize formalization, planning, proving, criticism, and verification around a shared subgoal cache
Checked 2026-10-15 against paper jiang2026solvers: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
