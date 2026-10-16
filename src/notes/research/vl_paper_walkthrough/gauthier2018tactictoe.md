# TacticToe: Learning to Prove with Tactics
(authored by agents unless marked 🧑)
Tag: `gauthier2018tactictoe`, [paper](https://www.semanticscholar.org/paper/b1b88c6d1f05913be18750ff00e06edd5e1f49ef)

## scope and result

TacticToe is a HOL4 prover that learns tactic choices from recorded human proofs and searches with Monte Carlo tree search (MCTS). The abstract states: “TacticToe learns from human proofs which mathematical technique is suitable in each proof situation.” (Abstract, p. 1). On 7,164 HOL4 standard-library theorems with a 60-second limit, it proved 4,760 (66.4%); E prover proved 2,472 (34.5%), and their union proved 4,946 (69.0%) (Table 2, p. 23). These are theorem counts over the 7,164-theorem evaluation set, not percentages of all HOL4 results. Every TacticToe proof in that experiment was reconstructed and checked by HOL4; replay took 0.37 seconds on average (Section 9.3, p. 23).

## technique: feature-based prediction of tactics, theorems, and goal lists

Use this when a prover has a library of prior proof steps and must rank candidates for a new goal. The paper records tactic-goal pairs from successful human applications, then orders tactics by similarity to the current goal; the same predictor selects theorem arguments and evaluates lists of resulting goals (Section 3, p. 7). Its feature set contains constant names, type constructors, variable-normalized subterms, and variable names. Assumptions and conclusions receive different tags; a goal-list feature set is the union of its goals' features (Section 3.1, p. 8). Similarity is TF-IDF-weighted overlap, with each weight raised to the sixth power; `sim1` sums shared weights, while `sim2` additionally divides by `ln(e + |f0| + |f1|)` (Section 3.1, p. 8).

Steps: (1) record each successful pair `(tactic, goal)`; (2) extract the four term-feature classes and tag assumption versus conclusion features; (3) compute TF-IDF and rank database objects by `sim1` or `sim2`; (4) use the ranked tactics as the search prior, theorem ranking to fill tactic arguments, and ranked goal lists as node evaluations. The paper says, “A good rule of thumb is that the rarer the shared features are, the more similar two goals should be.” (Section 3.1, p. 8).

Inference: In Verus, extract features from `requires`/`ensures` formulas, function names, datatypes, and normalized terms; rank candidate lemmas or proof steps before invoking `assert`, `assert forall`, `broadcast proof`, or `lemma` calls. Verus proof scripts do not expose HOL4 tactics, so the ranked object should be a candidate proof function or assertion transformation; the soundness check remains Verus/Z3. Inference: feature extraction is useful for choosing reusable lemmas but can miss semantically equivalent formulas whose syntax differs.

## technique: MCTS over tactic applications

Use this when prediction is imperfect and a wrong tactic can fail, loop, or move away from a proof. The search tree has goal-list nodes and tactic edges. A tactic is productive only if it does not fail or time out (the default interruption is 0.05 seconds), does not recreate an ancestor goal, and is not subsumed by an already-applied tactic (Definition 4, pp. 6–7). Each MCTS step is node selection, node extension, and backpropagation (Section 4.1, p. 9).

Steps: (1) initialize a root containing the conjecture; (2) repeatedly select the child with maximum `CurEvaluation + c_exploration * Exploration`; (3) stop descent when the widening policy is reached; (4) apply the best untested predicted tactic to the open goal; (5) reject failure, timeout, loops, and redundant effects; (6) backpropagate visits, failures, and child evaluations; (7) stop when the root is solved, tactics are exhausted, or the time limit expires. The paper states, “The search ends when the algorithm reaches one of these 3 conditions” and lists proof, saturation, and time limit (Section 4.1, p. 10).

Inference: a Verus analogue can maintain a host-side search tree whose nodes are sets of unresolved verification goals and whose edges are candidate proof-function calls or assertions; each candidate must be compiled and checked by Verus before its result is accepted. Inference: Verus has no soundness-preserving way to treat an unverified search result as a proof, so MCTS is only a proposal mechanism and the verifier is the trusted checker. Inference: loops in this setting include repeatedly generating equivalent solver obligations, which can be detected by normalized obligation hashes.

## technique: supervised priors and asynchronous ATP calls

The prior policy ranks up to 500 productive tactics by similarity and assigns `PriorPolicy(ai) = (1-c_policy)^i * c_policy`; the prior evaluation labels a goal-list positive when it was produced by an orthogonalization winner and uses the fraction of positive examples among ten nearest lists (Section 4.2, pp. 11–12). HOL4's Metis is tried first with predicted premises. E prover is called asynchronously with 128 predicted premises and a five-second timeout; successful external proofs are reconstructed inside HOL4 with Metis (Section 4.3, p. 12).

Inference: a Verus implementation can run bounded candidate-lemma generation and SMT queries asynchronously, then backpropagate only verifier-confirmed outcomes. Inference: external solver output must be replayed as Verus proof obligations or checked certificates; trusting an opaque solver result would enlarge the trusted base beyond the paper's HOL4 reconstruction path.

## technique: dependency-aware preselection

Preselection limits search data to 500 tactic-goal pairs, 500 theorems, and induced goal lists. The paper warns that selecting only by similarity to the original conjecture fails when later goals drift, so each object inherits the maximum of its own and its parent's similarity score through an asymmetric dependency relation (Section 5, pp. 12–13). Steps: build dependencies from tactic outputs and theorem-use traces, compute each object's dependency score, and retain the 500 highest-scoring objects per dataset.

Inference: for Verus, preselect lemmas using dependencies recorded from successful verification runs and propagate scores through calls and generated obligations. Inference: this reduces latency but can omit a lemma needed only after a substantial specification change.

## technique: orthogonalization by coverage and subsumption

Use this to remove proof steps with effects already covered by more general steps. For each recorded `(t,g)`, compare the 20 nearest tactic-goal pairs by default. Keep the tactic that subsumes the original goal effect and has the largest coverage, where coverage is the number of goals for which the tactic appears (Section 6, pp. 13–14). The default goal subsumption is alpha-equivalence; list subsumption requires every goal in the first list to be subsumed by a goal in the second. The paper says, “As a result, already successful tactics with a large coverage are preferred, and new tactics are considered only if they provide a different contribution.” (Section 6, p. 13).

Inference: in Verus, compare candidate proof functions by normalized postcondition sets and keep a function that establishes at least the same obligations for more call sites. Inference: alpha-equivalence alone is weaker than semantic implication, so this filter may retain duplicates or discard useful syntactic variants only when the chosen relation is too coarse.

## technique: abstraction and argument prediction

Abstract a recorded tactic by replacing an SML subterm with a placeholder, then instantiate it from predictors driven by the current goal (Section 7.1–7.2, pp. 14–16). For theorem-list arguments, select 16 predicted theorems and use them as a list. For single-theorem arguments, try 16 instantiations in predictor order with `ORELSE`; for term arguments, try the 16 closest goal subterms. The paper gives the concrete shape `EXISTS_TAC term1 ORELSE ... ORELSE EXISTS_TAC term16` (Section 7.2, p. 16). In the training set of 273 theorems, theorem-list abstraction with 16 theorems solved 199 at 60 seconds versus 156 for the default (Table 1, p. 22); the table's denominator is 273 training theorems.

Inference: Verus can parameterize a proof function over a `spec` term, lemma, or sequence of lemmas and instantiate from expressions in the current goal, but Rust type checking and explicit ownership constrain which substitutions are legal. Inference: an existential witness often cannot be guessed from goal subterms, matching the paper's limitation for term arguments.

## technique: proof recording, globalization, and tactic units

Parse proof scripts rather than modifying the kernel. Extract each tactic proof, replace local identifiers with definitions and qualify globals by module, wrap each tactic unit in a recording function, and save `(tactic, goal)` pairs without changing behavior (Section 8, pp. 17–20). A tactic unit is an SML expression of type tactic whose root is not an infix operator; this avoids recording every subexpression and keeps steps general. The running example records `STRIP_TAC THEN LIST_INDUCT_TAC THEN ASM_REWRITE_TAC [MAP, APPEND]` (Examples 1–5, pp. 18–20).

Inference: for Verus, record source-level proof-function calls, `assert` statements, and solver-triggering annotations together with pre-state and post-state obligations; canonicalize module paths and generic parameters before indexing. Inference: unlike HOL4's textual SML tactics, Rust macro expansion and solver-trigger attributes can make source replay context-sensitive, so the recorded artifact must retain the relevant specification environment.

## technique: proof extraction, minimization, and embellishment

When the root is solved, recursively extract a tactic for each solved goal and combine child proofs with `THENL`; replace singleton `THENL` with `THEN` and remove empty combinators (Section 10, p. 26). Then remove a tactic `A` from `A THEN B` when `B` has the same effect, delete theorem-list elements one at a time when the effect is unchanged, and strip module prefixes or group local declarations when replay remains equivalent. These transformations preserve a checked proof while improving readability and replay cost.

Inference: a Verus analogue can minimize a proof function by deleting assertions or lemma calls and rerunning Verus after each deletion; retain a deletion only when all `ensures` obligations still verify. Inference: this produces maintainable verified Rust, but solver nondeterminism means equivalence must be checked under the same toolchain and triggers.

## evidence, trust, limits, and VL threat

The strongest evidence is the full-scale 7,164-theorem result and HOL4 reconstruction. The paper reports that TacticToe solved 81.2% of arithmetic, 79.5% of list, and 82.0% of finite-map theory theorems, while E prover solved 59.9%, 26.5%, and 24.7%, respectively (Table 3, p. 23; each percentage is the fraction of that theory's re-proved theorems). A one-shot reinforcement update from TacticToe's own proofs improved success by less than one percent (Section 9.3, p. 24). The paper's trusted base includes HOL4's kernel and tactic implementations; external E prover results are trusted only after Metis reconstruction. Inference: for VL, the main product threat is engineering dependence on fragile learned proof search rather than unsoundness, provided Verus remains the acceptance gate. Inference: the method is most useful for reducing proof-authoring effort in repetitive APIs; it does not replace specification design, ownership reasoning, or review of what properties are actually stated.

## techniques for the catalog

- feature-weighted proof-step retrieval — represent goals with tagged TF-IDF features and rank tactics, theorems, and goal lists by weighted overlap
- MCTS tactic search — explore predicted proof steps with selection, extension, backpropagation, and verifier-checked termination
- orthogonalized tactic database — retain high-coverage tactics that subsume redundant effects
- abstraction and argument prediction — replace tactic arguments with placeholders and try goal-ranked instantiations
- dependency-aware preselection — propagate similarity through proof dependencies before limiting the candidate pool
- script-level proof recording — extract generalized tactic units, globalize names, and save tactic-goal pairs
- proof minimization — delete redundant tactics and arguments only after replay confirms the same checked result

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
