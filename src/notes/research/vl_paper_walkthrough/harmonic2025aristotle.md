# Aristotle: IMO-level Automated Theorem Proving
(authored by agents unless marked 🧑)
Tag: `harmonic2025aristotle`, [paper](https://www.semanticscholar.org/paper/39be23d432ab9c45243fed3dd0bee47b530d8a92) (link from the fetch record)

## system and acceptance rule

Aristotle combines a Lean proof-search system, an informal reasoning and lemma-formalization system, and a separate geometry solver. The paper defines formal reasoning as a proof in a machine-verifiable language and requires a complete Lean 4 proof with Mathlib, “without gaps or unsound axioms like sorryAx.” (Introduction, p. 1.) Its reported headline is five formally verified solutions out of the six 2025 IMO problems, which is gold-medal-equivalent under the contest rule. Geometry is handled outside Lean and still requires machine verification; the Lean discussion covers the four solved non-geometry problems (Introduction and Sect. 3.1, pp. 1, 8–9).

The evaluation manually translated each of the six contest statements into Lean. Lemma statements in the resulting proofs were autoformalized, and candidate unknowns such as a constant were first generated with a language model and basic mathematical programming tools (Sect. 3.1, p. 8). Inference: the denominator is six IMO problems, and the reported automation starts after human formalization of the contest statements.

Inference: for Verus, the important transferable boundary is the insistence that a generated artifact must pass the verifier and contain no proof hole. A Rust function with `requires` and `ensures` should be accepted only after Verus proves its body and every generated `proof fn` obligation; this analogy does not make Lean tactics or Mathlib available in Verus.

## technique: MCTS/MCGS over Lean proof states

Inference: use this when a formal theorem has a large tactic search space and a language model can propose tactics conditioned on the current goal. Its Monte Carlo Tree Search (MCTS) becomes Monte Carlo Graph Search (MCGS) when equivalent states are merged. Aristotle starts from a Lean code block with `sorry` goals and samples progressively widened actions from a generative policy. An action is a Lean tactic or sequence of tactics, optionally with informal comments; executing it can create several successor states, producing a search hypertree (Sects. 2.1 and 2.1.1, pp. 2–3). The paper says: “We use a generative policy to take progressively widened [7] samples from the large action space of Lean tactics, conditioning on the Lean proof state, proof history, and, if available, an informal proof.” (Sect. 2.1, p. 3.)

The operational procedure is:

1. Execute an initial Lean snippet. Split into one state per goal if none contains metavariables; otherwise retain the goals together. Explicit `sorry` goals must be split and are not allowed to contain metavariables (Sect. 2.1.1, p. 3).
2. Prompt the policy with the current proof state and action history, and include a reference natural-language proof when available (Sect. 2.1.1, p. 4).
3. Merge equivalent states. States are equivalent when goal expressions, local context expressions, and local variable names match; actions are equivalent when they produce equivalent state transitions. This changes the hypertree into a search hypergraph. The paper notes that tactics such as `aesop` can use global state, so state equivalence does not always preserve resulting states, although the authors report working around this in practice (Sect. 2.1.2, p. 4).
4. Select actions with a PUCT-style upper-confidence bound, weighting exploration by the empirical distribution of sampled actions. The authors avoid sequence log probabilities because equivalent textual representations can bias them (Sect. 2.1.3, p. 4).
5. Treat proof choice as an AND/OR minimax problem: a state is proven if one action succeeds, but an action succeeds only if all its resulting states are proven. Prioritize the hardest resulting state, using the lowest lower-confidence bound, and add a negated-goal transition for each single-goal state to spend search on disproofs (Sect. 2.1.3, p. 4).
6. After search, retain an acyclic successful subgraph, apply linter suggestions, remove redundant action sequences, and condense the proof (Sect. 2.1.5, p. 5).

The policy emits informal comments alongside Lean code and uses a hidden reasoning trace with a dynamic thinking budget. All three outputs are co-evolved in training, and the authors report that reinforcement learning makes comments ubiquitous and useful for formal search (Sect. 2.1.4, p. 4). Training uses expert iteration: start from a pretrained model, train on search-found proofs, train the value function on proven states and nearby disproven or unresolved states, and use a faithfulness judge when informal proofs are available (Sect. 2.1.6, p. 5).

Inference: a Verus analogue would let an agent propose small Rust/Verus edits, run Verus after each edit, canonicalize equivalent proof states where possible, and prioritize obligations with the largest downstream failure set. Verus accepts Rust syntax and proof constructs rather than Lean tactic strings, so the state equivalence and action grammar would need to be implemented for Verus diagnostics. Inference: the acceptance check must reject `assume`, `admit`, or newly trusted `external_body` declarations when the target claim is meant to cover executable code; the Aristotle paper's no-`sorryAx` rule supports this policy, but does not name Verus constructs.

Evidence is qualitative for this technique: the authors describe the search component as “capable of proving many challenging university-level and Olympiad-level math problems” (Sect. 2.1, p. 3), and the IMO result uses the scaling setup in Sect. 3.1 (pp. 8–9). The paper gives no isolated ablation for MCGS versus another search algorithm. It also notes that graph complexity can be O(V) per step rather than O(D), but reports no CPU bottleneck for graphs arising in practice (Sect. 2.1.2, p. 4). Inference: this search needs useful policy candidates and reliable Lean checking. Appendix B (p. 16) describes the final verification: “When a proof is found via the search process, it is verified by rendering the proof out as a self contained Lean file and running it through Lean as a command in order to check for kernel errors, check which axioms are used, and check which lemmas from the file were necessary in order to complete the proof.”

## technique: lemma decomposition with formal feedback

Inference: use this when direct proof search stalls or when the theorem has a high-level argument that can be broken into short subclaims. Aristotle's pipeline is explicit:

1. Ask for an informal proof of the target theorem (Sect. 2.2.1, p. 6).
2. Restructure it into a sequence of lemmas that build on one another and individually have short proofs (Sect. 2.2.1, p. 6).
3. Ask for formal Lean statements of those lemmas (Sect. 2.2.1, p. 6).
4. Send each formalization to the Lean REPL, return error messages to the model, and request corrections (Sect. 2.2.1, p. 6).
5. Attempt the candidate lemmas before the target, using proved lemmas as context for subsequent search (Fig. 2 and Sect. 2.2.1, p. 6).

The authors explicitly warn that the process is noisy: informal proofs have gaps and formalized lemma statements can remain wrong after correction, but enough useful lemmas are produced to improve over search alone (Sect. 2.2.1, pp. 6–7). If the target still fails, keep proved lemmas, add a new collection, formalize and correct the new statements, then retry. The revision prompt is asked to consider both an unsound strategy and a sound strategy whose lemmas were too coarse (Sect. 2.2.2, p. 7). The paper summarizes the architecture as: “First, we ask for an informal proof of the theorem.” (Sect. 2.2.1, p. 6.)

Inference: the direct Verus form is a staged proof plan: generate candidate `spec fn` facts or `proof fn` lemmas, compile each in a temporary module, feed Verus diagnostics back, and retain only proved lemmas for the next function proof. Inference: a lemma's executable Rust body must not be replaced by an unverified claim; the candidate remains ghost specification code until its proof passes. Inference: the staged loop is useful for VL because it separates specification repair from routine proof repair, but the paper's evidence is Lean-specific.

The IMO examples show why formal feedback matters. For the divisor-sequence problem, Aristotle's informal reasoning confused strict and weak decrease; subsequent formalization repaired the logical gaps while retaining useful ideas, and the final comments gave a corrected informal account (Sect. 3.1.3, pp. 9–10). For “Bonza functions”, it invented and formalized an auxiliary set of primes, and for “Inekoalaty Game” it introduced an invariant-like function, later replacing a calculus proof with `nlinarith` (Sect. 3.1.2 and 3.1.4, pp. 9–10). These are examples, not a measured rate of successful lemma repair.

## technique: test-time training from search traces

At deployment Aristotle repeatedly attempts the main theorem and generated lemmas. If the theorem remains unsolved, it retrains on search traces from those attempts, then tries again (Sect. 2.1.7, p. 5). The paper reports that this improved efficiency and specialization, solved problems that the base model could not solve at the same search budget, and helped transfer discoveries between lemmas. The authors also describe learning chains of basic commands for unfamiliar Mathlib abstractions, effectively providing a more robust API in later attempts (Sect. 2.1.7, p. 5).

Inference: a Verus agent could cache failed proof states, diagnostics, and successful repairs per repository and fine-tune or retrieve them at inference time. Inference: the cache must be keyed by Verus version, Rust version, and module context because proof behavior can drift; this version policy is a product recommendation, not a result in the paper. Inference: replaying a cached proof through Verus remains the acceptance criterion.

## technique: geometry solver with optimized deductive algebra

Geometry is handled outside Lean by Yuclid, a C++ deductive-database and algebraic-reasoning engine based on AlphaGeometry. The numerical matcher first finds diagram configurations and activates matching rules. The main loop deduplicates statements in a dictionary; Gaussian-elimination algebraic reasoning stores echelon forms and reduced equations so repeated goals resume rather than restart (Sect. 2.3.1, pp. 7–8). Memory is optimized with C++ containers and pointers. The paper reports up to 500x speed over AlphaGeometry-1, and, with prebuilt numerical diagrams, Yuclid solves 17 of 30 AG-30 problems and saturates the rest in about 0.4 seconds on one 3.1 GHz core (Sect. 2.3 and 2.3.1, pp. 7–8). The denominator is 30 AG-30 problems. Inference: the remaining 13 are saturated, which is not reported as proving them.

Yuclid adds a squared-length algebraic table, optional sine-law support, equations as generic statements, and rules generated from small auxiliary-construction problems. The sine extension proves one additional AG-30 problem but slows Yuclid by approximately 10x, so it is turned off in the recommended configuration (Sect. 2.3.2, p. 8).

Inference: Verus is not a geometry prover, so this subsystem has no direct Rust mapping. A VL product could call a specialized external prover only behind a checked contract, but the paper does not establish that a geometry result can be imported into a Verus proof without rechecking its semantics.

## evidence, trust, and product threat

The paper reports five of six 2025 IMO problems with formally verified solutions, using Lean for non-geometry problems and a separate geometry solver. Yuclid also solves 17 of 30 AG-30 geometry problems under its stated single-core setup (Introduction, Sects. 3.1 and 2.3.1, pp. 1, 7–9). The paper also reports contributions to Mathlib, discovery of four false exercises in a Lean real-analysis textbook, and proof of the other exercises it processed (Sect. 3.2, p. 10). Those claims use different populations and should not be combined into one accuracy percentage. The paper gives no denominator for “many” university-level problems or for the textbook chapters beyond the examples described.

Inference: trusting the end-to-end result requires trusting the human statement translations, the Lean kernel and permitted axioms, the intended meaning of the Mathlib definitions, and the separate geometry verification. Model training and judging affect candidate quality; they do not replace the final formal check. A formal proof alone does not establish that a manually translated statement captures the natural-language contest statement. Inference: this is a high threat to any VL claim that an LLM can generate verified proofs without a structured search-and-feedback loop, because Aristotle demonstrates a mature version of that loop. Inference: it is a low direct competitor for verified Rust, since the paper does not translate Rust programs, prove systems properties, or check Verus specifications. Inference: a Rust contribution should distinguish its treatment of ownership, mutable state, unsafe code, and Rust-specific specifications from the generic lemma decomposition and formal-feedback techniques already described here.

## techniques for the catalog

- verifier-guided graph search: sample tactic actions, merge equivalent Lean states, and use PUCT over AND/OR proof obligations
- lemma decomposition with feedback: generate informal lemmas, formalize them, compile in Lean, repair diagnostics, and iterate on failed targets
- test-time training: retrain on current search traces to specialize later attempts and learn unfamiliar library APIs
- geometry DD/AR solving: match numerical diagram rules, deduplicate statements, and cache Gaussian-elimination state
- Lean proof acceptance: render the completed proof as a standalone Lean file, check the kernel and axioms, and reject gaps or `sorryAx`
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Upon processing a few chapters from the book, Aristotle discovered four exercises which were false as written, providing explicit counterexamples."): checked all paper text, quotations, numbers, technique steps, section and page references, and the catalog; corrected page references, goal splitting, the Lean/geometry distinction, test-time training wording, verification details, and inference labels; retained the link from the fetch record because the paper text provides no DOI, arXiv, or publisher URL for this paper; did not rerun Aristotle, Lean proofs, or external repository results.
