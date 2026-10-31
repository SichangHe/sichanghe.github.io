# AI for Mathematics: Progress, Challenges, and Prospects
(authored by agents unless marked 🧑)
Tag: `ju2026aiformath`, [paper](https://arxiv.org/abs/2601.13209)

This survey treats formal verification as the reliable feedback layer for AI mathematics. Its basic claim is: "Formal systems provide a precise symbolic language paired with rigorously defined mechanisms for constructing and verifying proofs." (§3.3.1, p. 10). Once an informal argument is translated into Lean, Isabelle, Coq/Rocq, HOL, Metamath, or Mizar, the prover checks each formal step. The survey distinguishes statement autoformalization, proof generation, premise retrieval, and agentic workflows; the techniques below are the actionable verification patterns it teaches.

## technique: use an interactive theorem prover as a proof oracle

What it is. Formalize definitions, theorem statements, and proof steps in an interactive theorem prover (ITP), then use its checker as a binary or structured validity signal. The survey says: "Interactive theorem provers bridge this gap by providing precise feedback on the validity of every logical step." (§3.3.1, p. 10). The survey adds that, unlike elementary mathematics where answers are often numeric and easily checked, "advanced proof-oriented problems lack simple verifiers", so the prover's feedback "supplies high-quality training signals for RL" (§3.3.1, p. 10).

Inference: When to use it: use this whenever a generated mathematical claim can be expressed in the prover's logic and library. It is strongest for checking a formal statement and proof; it does not by itself show that the formal statement captures the original informal intent.

Steps stated or implied by the survey:

1. Translate the informal definitions and target into the prover's formal language (§3.3.1, p. 10).
2. Generate a proof script or proof term in the prover's syntax (§3.3.3, pp. 12–14).
3. Run the checker and use its validity feedback to accept, reject, or revise each step (§3.3.1, p. 10).
4. Keep the verified formal artifact as training data or evidence; unverified generations are not proof data (Inference: this follows from the survey's distinction between verified pairs and model output).

Verus form. Inference: write executable Rust with `requires`/`ensures`, mathematical definitions as `spec fn`, and intermediate facts as `proof fn`s; run Verus and keep only code that verifies. Inference: a failed Verus check supplies an obligation diagnostic, while a passing check proves only the stated contract under trusted assumptions. Inference: Verus's `invariant` clauses and `assert` statements play the role that tactic-state feedback plays in Lean for loops and local facts.

Evidence and limits. The survey reports Lean's mathlib4 had over 250,000 theorems and 120,000 definitions as of December 2025 (§3.3.1, p. 10), but gives no independent error rate for the prover-oracle approach.

## technique: autoformalize with dependency-aware synthetic data

What it is. Train a model to translate natural-language mathematics into formal declarations. Because aligned informal/formal pairs are scarce, use an LLM to informalize large formal libraries such as mathlib4, then train specialized autoformalizers on those pairs (§3.3.2, p. 11). Herald improves grounding by translating declarations in topological dependency order, so descriptions of prerequisite concepts are available before dependent theorems. It combines this with tactic-based state synthesis and reports over 96% statement autoformalization accuracy on miniF2F validation (§3.3.2, p. 11).

Steps from the survey:

1. Start from a formal library and generate natural-language descriptions paired with each declaration (§3.3.2, p. 11).
2. Build the library dependency graph and translate declarations in topological order so prerequisite descriptions are available (§3.3.2, p. 11).
3. Augment examples with synthesized tactic states and train the statement translator (§3.3.2, p. 11).
4. Retrieve existing formal declarations when generating a new statement; RAutoformalizer uses retrieval to anchor generated code in existing formal declarations (§3.3.2, p. 11).
5. For missing concepts, decompose the statement into a dependency graph and recursively define concepts bottom-up, as Aria does (§3.3.2, pp. 11–12).

Verus form. Inference: build a Rust/Verus corpus from verified `spec fn` definitions, function contracts, and `proof fn` signatures. Order prompts by the dependency graph, retrieve existing specifications, and require generated code to pass Verus. Inference: a dependency graph should include contracts and ghost definitions; generated natural-language descriptions are hints and cannot replace the machine-checked contract.

Evidence and limits. The only benchmark the survey names for Herald is the miniF2F validation set; it gives the accuracy as “over 96%” but does not state the validation-set size in this passage. Statement accuracy is not proof accuracy: the survey says that once a statement is correctly autoformalized, evaluating a formal proof "becomes straightforward", which "makes statement autoformalization the primary difficulty from an evaluation perspective" (§3.3.2, p. 12).

## technique: evaluate statement semantics with equivalence and decomposition

What it is. With a reference formal statement, test logical equivalence rather than string identity. The survey describes BEq using a neural theorem prover to check whether generated and reference statements can be derived from one another (§3.3.2, p. 12). Without a reference, one can back-translate formal code to English, but the survey calls this "prone to errors as LLMs may miss subtle logical discrepancies" (§3.3.2, p. 12). Mathesis instead decomposes a statement into assumptions and conclusions, evaluates alignment component by component, and aggregates scores using a fuzzy integral (§3.3.2, p. 12). Aria retrieves types, values, and informal descriptions for every formal term to improve semantic judgment.

Steps from the survey:

1. If ground truth exists, ask a neural theorem prover to test whether the two statements can be derived from one another (§3.3.2, p. 12).
2. If it does not, split the formal statement into assumptions and conclusion and score their alignment separately (§3.3.2, p. 12).
3. Aggregate component scores with the fuzzy integral and reject inconsistencies (§3.3.2, p. 12).
4. Retrieve metadata (types, values, informal descriptions) for each term in the formal statement, as Aria does, to support semantic judgments (§3.3.2, p. 12).

The survey warns: "The challenge, therefore, lies in developing automated metrics for correctness." (§3.3.2, p. 12)

Verus form. Inference: compare a generated Rust contract with a trusted contract using `spec fn` equivalence lemmas and `proof fn`s in both directions. Inference: decompose `requires` and `ensures` into named conjuncts, check each against the informal requirement, and retain the mapping as review evidence. Inference: back-translation can help a human inspect intent but is not a Verus proof.

Evidence and limits. The survey provides no aggregate accuracy for Mathesis or BEq in this section. Inference: the method addresses semantic mismatch that a proof checker cannot see when the wrong statement is nevertheless provable; the survey itself notes that formalization "does not eliminate all failure modes—models may still exploit unintended problem specifications" (§3.3.3, p. 15). Inference: this is one of the most important safeguards for agent-written verified Rust.

## technique: generate proofs by proof-state search

What it is. Treat theorem proving as a tree search. A node is a proof state; an edge applies a tactic; success is reaching a state with no remaining goals. At each state, retrieve relevant premises and propose several tactic candidates (Figure 3, §3.3.3, p. 13). Holophrasm combines Monte Carlo Tree Search with a relevance network, a variable-substitution generator, and a value network. Later systems use best-first or hypertree search, online training, and retrieval-guided tactic generation.

Steps from the survey:

1. Take the current proof state and retrieve candidate premises (Figure 3 and §3.3.3, p. 13).
2. Generate several tactic candidates and apply them to obtain successor states (Figure 3 and §3.3.3, p. 13).
3. Search the tree with MCTS, best-first, or another policy/value strategy (§3.3.3, pp. 12–13).
4. Merge repeated states when possible and stop at a no-goal state (§3.3.3, p. 12).

Verus form. Inference: treat each failing Verus obligation as a state and candidate `assert`, lemma call, `reveal`, or added loop `invariant` as an action. Rerun Verus after each candidate and retain a proof only when the function verifies. Inference: if the verifier is invoked only as a command-line check, the search driver must invoke it repeatedly; a missing invariant is not evidence that the specification is false.

Evidence and limits. The survey says proof-step methods have reusable states and strong exploration but suffer from slow inference, training instability, and reliance on efficient interactive tools (§3.3.3, pp. 12–13). It gives no common success denominator across the many systems.

## technique: whole-proof generation with verified-pair filtering

What it is. Generate an entire formal proof in one forward pass, then filter and train only on statements and proofs that pass the formal checker. The survey describes a pipeline of automatic statement formalization, filtering trivial or false statements, statement proving, and iterative training on verified pairs (§3.3.3, p. 14). DeepSeek-Prover-V1.5 adds informal proofs, inline comments, and reinforcement learning from verifier feedback.

Inference: When to use it: use whole-proof generation when low inference latency and independence from interactive tools matter more than search exploration. It is vulnerable to error accumulation because intermediate proof states are unavailable during generation (§3.3.3, p. 14).

Verus form. Inference: generate a complete Rust module with contracts and proof bodies, run Verus, discard failures, and add successful modules to the training corpus. Inference: keep the specification fixed during proof repair; otherwise a model may weaken `ensures` to obtain a passing pair. Inference: add mutation or counterexample checks for vacuous contracts because Verus proves only the written property.

Evidence and limits. The survey says data quality has no principled a priori test and is often evaluated indirectly through model performance (§3.3.3, p. 14). Inference: therefore verified-pair filtering establishes proof validity, not semantic intent. Inference: the residual threat is high when agent-written Rust and its contract are generated together.

## technique: agentic decomposition and iterative verification

What it is. Agentic systems coordinate retrieval, decomposition, proof generation, and verification. DSP creates an informal proof, translates it into a formal sketch with open subgoals, and closes them with a lightweight prover. LEGO-Prover maintains a persistent lemma pool and evolves verified lemmas through dimension extension, concept identification, parameterization, and complexity enhancement. Hilbert recursively decomposes subgoals with theorem retrieval. Aristotle drafts proofs as sequences of lemmas, formalizes them, attempts verification, and refines its outputs iteratively from feedback (§3.3.3, p. 14).

Steps from the survey:

1. Draft an informal proof (§3.3.3, p. 14).
2. Translate the draft into a formal sketch with open subgoals (§3.3.3, p. 14).
3. Close the open subgoals with a lightweight or dedicated prover, with theorem retrieval guiding recursive subgoal decomposition as in Hilbert (§3.3.3, p. 14).
4. Attempt verification and refine outputs iteratively based on feedback, as Aristotle does (§3.3.3, p. 14).
5. Keep a persistent pool of verified lemmas and evolve them into new ones, as LEGO-Prover does (§3.3.3, p. 14). Inference: re-run the checker on every evolved lemma before reuse.

Verus form. Inference: make each subgoal a `proof fn` with explicit `requires` and `ensures`; use a final function contract as the dependency-graph sink. Inference: retrieve existing Verus lemmas by their specifications, run Verus on each candidate, and preserve only verified lemmas. Inference: a failed proof remains an open obligation, not a trusted placeholder.

Evidence and limits. Seed-Prover-1.5 is reported at 80% on FATE-H and 33% on FATE-X, but the survey does not state the benchmark denominators in this passage (§3.3.3, p. 14). It says miniF2F is effectively saturated for some agentic systems and describes IMO-level or Putnam results for particular systems, but these are system-specific claims, not general success rates.

## what is proved, measured, and trusted

The survey reports a field-wide synthesis rather than one new verifier. It establishes that formal checkers provide precise proof feedback, that statement semantics remain harder than proof checking, and that retrieval, search, filtering, and agentic decomposition are recurring techniques. Reported numbers include mathlib4's theorem/definition counts, Herald's “over 96%” miniF2F statement accuracy, AlphaProof's 300B-token pretraining, 300k state-tactic pairs, and 80 million autoformalized statements, and Seed-Prover-1.5's 80%/33% benchmark results (§§3.3.1–3.3.3, pp. 10–14; AlphaProof and Seed-Prover-1.5 figures on pp. 13–14). These denominators and settings belong to the cited systems; the survey does not independently reproduce them. Inference: trusted components include theorem provers, libraries, parsers, retrieval systems, model-generated formal statements, and human intent judgments.

## techniques for the catalog

- prover-as-oracle supervision — use an interactive theorem prover's validity feedback as a training and acceptance signal
- dependency-aware autoformalization — generate aligned data and translate declarations in topological dependency order
- semantic statement verification — use bidirectional derivability or assumption/conclusion decomposition instead of string matching
- proof-state search — retrieve premises and explore tactic successors until no goals remain
- verified-pair filtering — train only on generated statements and proofs accepted by the formal checker
- agentic iterative proving — coordinate retrieval, decomposition, formal sketches, verification, and lemma reuse
