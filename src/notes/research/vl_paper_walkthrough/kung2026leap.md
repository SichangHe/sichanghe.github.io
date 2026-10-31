# LEAP: Supercharging LLMs for Formal Mathematics with Agentic Frameworks
(authored by agents unless marked 🧑)
Tag: `kung2026leap`, [paper](http://arxiv.org/abs/2606.03303v2)

## scope and measured object

LEAP (LLM-in-Lean Environment Agentic Prover) is an agentic Lean framework that combines informal planning, formal proof generation, compiler feedback, decomposition, and graph memory. The authors describe the central design as: “LEAP generates a high-level blueprint forming a directed acyclic graph (DAG), then generates the Lean proof, iteratively correcting errors via compiler feedback.” (Section 1, p. 2). The paper introduces Lean-IMO-Bench, evaluates Putnam 2025, and reports case studies on combinatorics.

Inference: The paper's main contribution is a control loop for proof search, not a new theorem-proving calculus. Its techniques are therefore directly relevant to a Verus agent's orchestration layer, while all numerical results remain Lean-specific.

## technique 1: direct attempt followed by blueprint decomposition

What it is: try a normal proof first, then switch to structured decomposition when that fails. Figure 1 says: “LEAP first attempts direct formalization with compiler-feedback revision and LeanSearch(Gao et al., 2024) retrieval.” If direct proving fails, the system drafts an informal blueprint, converts it to a Lean sketch, and introduces supporting lemmas in an AND-OR DAG.

How to apply:
1. Register the input theorem as the DAG root, represented as an OR node (Section 2.2, p. 4).
2. Read its statement, dependencies, and related lemmas, then generate an informal proof and translate it to Lean (Section 2.2).
3. Compile the candidate. If it succeeds, retain the proof; if it fails, draft an informal blueprint with intermediate lemmas (Sections 2.2 and 2.4).
4. Convert the blueprint into a formal sketch. The sketch must prove the current goal with `sorry` allowed only in newly proposed lemma statements (Section 2.2).
5. Compile the sketch; on success, add an AND node and child OR nodes for each proposed lemma (Section 2.2).
6. Recursively process child goals, revising or abandoning branches as compiler feedback dictates (Sections 2.2 and 2.5).

The paper emphasizes that “the main theorem body is sorry-free, while sorry placeholders are permitted only in the newly proposed lemma statements.” (Section 2.2, p. 4). Inference: this is a staged trust boundary: placeholders represent explicit open obligations rather than silently accepted proof holes.

Verus form: Inference: start with a fixed `fn` plus `requires`/`ensures`; first ask for a direct proof. On failure, introduce helper `proof fn`s and split the obligation into child lemmas. Keep the parent proof body free of `external_body`; each child must later verify under Verus. The AND-OR graph and fallback policy are host-language orchestration, not Verus syntax.

Evidence and limits: On Putnam 2025, direct Gemini-3.1-pro and Goedel-Prover-V2-32B both solve 0/12 under Pass@128, whereas LEAP solves 12/12 with rollout=2 (Table 2, p. 7). Inference: the gain measures the complete agent, so it cannot be attributed to decomposition alone without the ablations below.

## technique 2: AND-OR DAG hierarchical memoization

What it is: store proof state as a graph instead of an isolated tree. OR nodes are goals that can be solved by any strategy; AND nodes are decompositions requiring all child subgoals. The paper names two advantages and defines the first as: “First, monotone refinement: once a goal is decomposed into supporting subgoals, subsequent search can focus on expanding and resolving these descendants without restructuring the established dependency order.” (Section 2.3, p. 4). The second is lemma memoization: intermediate lemma statements are stored as shared proof nodes and reused when the same subproblem arises in another branch.

How to apply:
1. Represent every open theorem or lemma as an OR node (Section 2.3).
2. When a sketch proposes dependencies, create an AND node whose children are the proposed OR subgoals (Section 2.2).
3. Preserve established dependency order while revising local proof attempts; do not rebuild the whole graph for each retry (Section 2.3).
4. Store intermediate lemmas as shared nodes so repeated subproblems reuse the same proof (Section 2.3).
5. Permit anticipatory lemmas that are not needed immediately but may support later branches, while retaining their graph dependencies (Section 2.3).
6. Run depth-first search with backtracking over unresolved nodes (Section 2.5).

Verus form: Inference: represent each verified Rust obligation by a content-addressed node keyed by specification and context. A parent proof can depend on helper `proof fn`s; memoization reuses verified lemmas across branches. Rust modules and Verus visibility rules replace Lean namespaces, and the graph must invalidate cached proofs when specifications or imports change.

Evidence: The DAG ablation compares a naive tree with the full DAG on 60 Lean-IMO-Bench problems split into 30 Basic and 30 Advanced. Overall solve rate rises from 73.3% to 83.3% on Basic and from 40.0% to 56.7% on Advanced (Table 6, p. 9). Inference: denominators are 30 tasks per tier, and the improvement is an agent-level result that also includes planning and verification.

## technique 3: interleaved informal and formal planning

What it is: use natural-language reasoning as a planning space, then force every accepted step through the formal checker. The paper says: “both the direct proof path and the blueprint decomposition path in LEAP pass through an informal proof sketch.” (Section 2.4, p. 5).

How to apply:
1. Generate an informal argument for the current goal before writing Lean (Section 2.4).
2. Translate the argument into a candidate formal proof (direct path) or into a blueprint and formal sketch (decomposition path) (Section 2.4).
3. Pair each formal attempt with its informal rationale so a user can inspect why the step was proposed (Section 2.4).
4. Accept progress only when Lean compiles the formal artifact (Section 2.5).

Verus form: Inference: ask the model to state an informal invariant or lemma plan, then translate it to Rust/Verus. Preserve the rationale in agent logs, but treat only the Verus-checked code as evidence. A natural-language invariant does not establish a Rust safety property.

Evidence and limits: On Lean-IMO-Bench Basic, Gemini 2.5 Pro's Natural Language Proof Pass@1 is 55.2% (human expert review, cited from Luong et al. (2025)), but Gemini 3.1 Pro's Formal Theorem Proving Pass@128 is 20.0%; on Advanced the values are 17.6% and 3.3% (Table 1, p. 6). The two numbers come from different Gemini versions and different graders. Inference: informal ability alone does not give compilable proofs, which supports keeping the formal checker in the loop.

## technique 4: verification-guided search and LLM decomposition review

What it is: use two filters. Lean checks syntax and typing of candidate proofs and sketches; an LLM reviewer judges whether a decomposition is relevant, simpler, and plausibly useful. The paper states: “Compiler verification checks whether a proof sketch is formally well-typed, but not whether its decomposition is useful.” (Section 5.3, p. 10).

How to apply:
1. Compile every candidate proof or sketch (Section 2.5).
2. For a blueprint, ask a reviewer whether subgoals are relevant to the parent, make the problem easier, and offer a plausible route (Section 2.5).
3. Reject weak decompositions, trigger backtracking, and try an alternative branch (Section 2.5).
4. Commit only reviewed sketches whose dependencies preserve an acyclic DAG (Figure 1 caption, p. 3; Section 2.2).

The failure mode is concrete: “The proposed subgoal restates the grandparent goal, so the decomposition is formally admissible but does not simplify proof search.” (Figure 3 caption, p. 10). Inference: compiler success alone cannot detect vacuous helper lemmas or cycles in a proof-search strategy.

Verus form: Inference: run `verus` first, then a separate reviewer that compares each helper's statement with its parent and checks that the child reduces the obligation. This semantic review is heuristic and untrusted; only Verus verification establishes the final property. Never accept a helper merely because it type-checks if it restates the parent specification.

Evidence: Removing the LLM decomposition reviewer makes LEAP fail on Putnam problem A5 after eight rollout attempts (Section 5.3, p. 10). With the reviewer, A5 needed two rollouts, the longest runtime in the evaluation (Section 5.3, p. 10), and 3.0k LLM calls and 170 active DAG nodes (Table 3, p. 8). This ablation covers one problem. Inference: review can save search budget, but the method still has a high, problem-dependent compute cost.

## technique 5: compiler-feedback iterative refinement

What it is: retain one initial proof and repeatedly repair it using exact compiler diagnostics. In the controlled ablation, the iterative setting gives one initial attempt and up to 20 compiler-feedback revisions, rather than 128 independent attempts (Section 5.1, p. 9).

How to apply:
1. Generate one formal proof attempt (Section 5.1).
2. Compile it with the Lean compiler (Sections 2.2 and 5.1).
3. Give the model compiler feedback to revise the proof; allow up to 20 revision steps (Section 5.1). The paper does not say what the revision prompt contains.
4. Count the result as Pass@1 under this smaller sampling budget (Section 5.1).

Verus form: Inference: feed `verus` diagnostics back with the unchanged Rust specification and previous body. Cap retries and preserve each diagnostic so context loss is measurable. The paper's 20-turn limit is a design choice, not a Verus requirement.

Evidence: On Lean-IMO-Bench Basic, Gemini-3.1-pro improves from 20.0% one-shot Pass@128 to 36.6% iterative Pass@1, while Goedel-Prover-V2-32B declines from 10.0% to 6.6% (Table 5, p. 9; denominator 30 Basic problems). Inference: feedback capability is model-dependent; a verifier loop is not automatically beneficial.

## technique 6: benchmark construction with verified statements

What it is: create a difficult, domain-balanced benchmark whose theorem statements are manually formalized and checked. Lean-IMO-Bench contains 60 IMO-style problems, evenly split into 30 Basic and 30 Advanced; the categories cover algebra, combinatorics, number theory, and geometry. The authors state: “Lean experts manually formalized and verified all 60 problem statements.” (Section 3.1, p. 6).

How to apply:
1. Select short statements whose informal solutions require non-routine, multi-step arguments (Section 1, p. 2; Section 3.1).
2. Split into difficulty tiers and balance mathematical categories (Section 3.1).
3. Have experts formalize and verify every statement before model evaluation (Section 3.1).
4. Evaluate separate tasks for natural-language proof, formal theorem proving, and formal proof translation (Section 3.1).

Verus form:

Evidence: LEAP's overall solve rate is 83.3% on Basic and 56.7% on Advanced; its Algebra and Number Theory rows are 100% in both tiers, while Geometry is 16.7% Basic and 12.5% Advanced (Table 4, p. 8; each tier has 30 tasks, category counts differ as listed in Section 3.1). Inference: the geometry floor and category imbalance mean the aggregate score should always be accompanied by per-category denominators.

## what is proved, trusted, and left open

Inference: accepted Lean artifacts are checked by Lean, but the model, retrieval, state reader/writer, reviewer, extraction code, and DAG manager remain trusted orchestration components. The paper's case study claims a verified Lean proof of a Knuth Hamiltonian-decomposition subproblem with “over 5000 lines of rigorous Lean 4 code” (Section 6, p. 11), and a separate reconstruction of Erdős Problem 457. Inference: these are demonstrations, not controlled accuracy measurements; the paper reports no success rate for them.

Inference: threat to a product that emits agent-written verified Rust is high for search engineering and medium for assurance. DAG memoization, decomposition review, and diagnostic repair could reduce proof-generation cost and improve completion. However, the evidence does not measure Rust memory safety, concurrency, unsafe code, weak specifications, or malicious model output. Lean's `sorry`-in-sketch discipline also does not transfer automatically: Verus trust escapes and external bodies require an explicit policy.

## techniques for the catalog

- fallback decomposition — attempt direct formalization, then create compiler-checked helper subgoals in an AND-OR DAG
- DAG lemma memoization — share verified intermediate lemmas across branches while preserving acyclic dependencies
- informal-formal interleaving — use natural-language plans to guide formal code while accepting only checker-verified artifacts
- decomposition review — have an LLM reject subgoals that are irrelevant, cyclic, or no simpler than their parent
- compiler-feedback refinement — repair one proof for a bounded number of turns using exact diagnostics
- verified benchmark construction — balance difficulty and categories, and expert-check every formal statement before evaluation
