# Compile to Compress: Boosting Formal Theorem Provers by Compiler Outputs
(authored by agents unless marked 🧑)
Tag: `li2026compilecompress`, [paper](https://arxiv.org/abs/2604.18587v2)

## scope and result

Inference: This paper trains Lean provers to treat compiler diagnostics as structured repair states, then searches a tree that mixes new proof attempts with local repairs. The transferable Verus idea is to classify verifier errors and condition the next proof edit on the current error, while accepting only a successful verifier run.

The abstract says: “we address this scalability bottleneck by exploiting an informative structure in formal verification: the observation that compilers map a vast space of diverse proof attempts to a compact set of structured failure modes.” It introduces “a learning-to-refine framework” and reports that it “achieves state-of-the-art performance on PutnamBench among publicly reported ∼8B and ∼32B parameter models under comparable test-time budgets.”

Inference: The paper proves Lean theorem statements, not Rust behavior. Its proof checking uses Lean v4.15.0 with a pinned Mathlib snapshot through Kimina Lean server (Figure 2, page 4). Model training, compiler diagnostics, benchmark formalizations, and search policy remain assumptions around that checker.

## technique 1: normalize compiler failures into reusable classes

Use this when many syntactically different failed proofs produce recurring verifier messages. For error-frequency analysis, the paper masks identifiers and tactic-state details and counts recurring error types. For refinement, it inserts compiler messages into the failed program; it does not describe feeding these normalized categories to the model. Appendix B.1 says: “Bodies of compiler messages are treated as plain text and tokenized using the original tokenizer.” On MiniF2F-test (244 problems), Kimina's top classes were “LINARITH FAILED TO FIND A CONTRADICTION” (22.60%), “UNKNOWN IDENTIFIER” (16.31%), and “UNSOLVED GOALS” (13.58%); on PutnamBench (660 problems), the leading classes were nested tactic failure (16.78%), Omega failure (13.50%), and unsolved goals (11.31%) (Table 1, page 3).

Sections 3–3.2 (pages 2–3) describe this abstraction:

1. Let `c` be a candidate proof and `Φ(c)` its compiler feedback.
2. Define `Ψ(c) = {c' | Φ(c') = Φ(c)}`, the programs with identical feedback.
3. Condition refinement on the problem, failed proof, and compiler feedback.

Normalization makes recurring categories visible in the frequency analysis; it is distinct from the feedback representation used in refinement prompts.

The paper states: “Empirically, Φ is a many-to-one mapping: distinct Lean programs may induce identical compiler feedback.” It also says that “syntactically distinct programs that induce the same compiler message often benefit from similar corrective actions.”

Inference: In Verus, normalize common diagnostics such as failed `assert`, missing invariant, failed `requires`, arithmetic overflow proof failure, or unsupported library specification. Keep enough source location and obligation text to avoid merging semantically different errors. Error classes should guide repair, not certify it.

## technique 2: inject feedback at the failing source location

Use this when an error message refers to a local line or expression. The paper inserts compiler output between `<error>` and `</error>` tokens at the reported line, preserving the candidate proof around it. The example places a rewrite failure directly after the `rw [h1, ...]` line (Appendix B.1, pages 13–14).

The paper compares this with appending all messages at the end. On MiniF2F validation plus test (477 problems), one direct attempt followed by one refinement attempt yielded 284 solved with insertion after two epochs, versus 246 with appending after two epochs (Table 10, page 14). Insertion after one epoch solved 279. The denominator is 477 problems under the fixed two-attempt budget; this ablation used Kimina-Prover-Preview-7B.

Inference: A Verus repair prompt should insert the `verus` diagnostic adjacent to the failing function, assertion, or invariant, retaining the original code and line context. Verus diagnostics differ from Lean's and may point to generated obligations, so location mapping must be tested. The source-local insertion is an engineering hypothesis for Verus, not a paper result.

## technique 3: cold-start refinement data

Use this to teach a base prover to repair its own failed attempts. For each training problem, sample incorrect and correct Lean programs, ask Claude 3.7 Sonnet to analyze the compiler error and synthesize a repair plan, and pair the plan with the correct program (section 4.1, page 4; Appendix B.2, pages 14–16).

The paper's procedure is:

1. Sample programs from the base prover and use Lean to identify an incorrect/correct pair for each problem.
2. Ask Claude to produce a `<think>` trace that bridges the failed program to the correct one without explicitly mentioning the supplied correct solution.
3. Combine the trace, error-augmented failed program, and correct program into a supervised example.
4. Preserve the base model's response format and mix equal numbers of directly solved examples and refinement examples.
5. Fine-tune the prover on this data.

The authors report 3.1k and 6.6k refinement instances for Kimina's two stages and 4.5k and 6.7k for Goedel's; after adding an equal amount of direct examples, the final sets had 19.4k and 22.4k instances (section 5.1, page 6).

Inference: For Verus, training pairs should contain a failed proof, exact verifier output, corrected proof, and a short repair rationale. Human-generated specifications and trustworthy corrected proofs are required; a model's explanation is not evidence.

## technique 4: expert iteration on the prover's evolving errors

Use expert iteration when a prover's error distribution changes after it learns to repair. Run the prover on training problems, repeatedly refine its latest failed proof until success or budget exhaustion, convert successful trajectories into new refinement data, and retrain while keeping a balanced direct/refinement mixture (section 4.2, page 4).

The paper states: “This is crucial for a self-refining prover: such training progressively adapts the policy’s refinement ability to its own evolving error distribution, enabling the prover to learn repair strategies for failure modes that only emerge after earlier refinements.” Appendix B.3 reports a manual inspection of 200 randomly sampled examples per dataset: 198/200 Kimina SFT, 190/200 Goedel SFT, 186/200 Kimina expert iteration, and 195/200 Goedel expert iteration were classified as building on prior attempts rather than starting from scratch (Table 11, page 17). The authors describe the distinction as “whether the corrected proof substantially builds upon the previous failed attempt or instead restarts from a largely unrelated proof structure” (Appendix B.3, page 16).

Inference: A Verus system could periodically collect failed obligations from its current model and retrain repair behavior on them. This is useful only if verifier acceptance, specifications, and dependency versions are held fixed enough to make the labels meaningful.

## technique 5: mixed tree search with a value model

Use this at test time when direct sampling and iterative repair have different strengths. The root node generates a fresh proof; internal nodes refine failed proofs. Random tree search samples nodes uniformly. Value-guided search trains a scalar value model and expands nodes according to `πθ(c | p) ∝ exp(Vθ(c, Φ(c), p))` (section 4.3.2, page 5).

The paper uses the current failed proof, its compiler feedback, and the problem as the refinement input, without accumulating the full attempt history (sections 3.3–4, pages 3–4). Section 5.6, page 9 states: “Importantly, the Markovian refinement formulation removes dependence on the full refinement history.”

The paper's search steps are:

1. Represent each refinement state as `(c, Φ(c), p)` and the root as `s0 = p`.
2. Prefer later states over earlier states on the same successful trajectory; prefer the root over non-root states outside successful trajectories.
3. Train an initial value function from random-search preference pairs.
4. Collect new trajectories with the latest value function and incorporate their comparisons into the next training round.
5. At inference, sample nodes by the value softmax: selecting the root generates a fresh proof, while selecting a failed proof triggers refinement (section 4.3, page 5).

The authors state: “This stochastic search policy ensures non-zero probability for all nodes, guaranteeing asymptotic coverage of the search tree, while exponentially biasing exploration toward regions with higher predicted refinement potential.”

Inference: In Verus, a value model can rank proof obligations by estimated repair potential, but the controller must still compile and verify every candidate. Search scores are not proof evidence.

Evidence: With sampling budget 64, Kimina Value scored 81.97% on MiniF2F-test and solved 20 PutnamBench problems, versus Kimina base 77.46% and 10; Goedel Value scored 86.89% and solved 63, versus Goedel-V2 84.43% and 32 (Table 3, page 6). At Putnam budgets 128 and 256, Goedel Value solved 82 and 110 problems (denominator 660 each), while Goedel Random solved 80 and 104. The paper reports Goedel Expert 110/660 at budget 256 and Kimina Expert 25/660 (Table 4, page 6).

## where refinement fails

The paper finds refinement is strongest for recurring, localized errors and weak for global semantic gaps. In Goedel Expert's random-search analysis, `FAILED TO SYNTHESIZE` had a 4.04% fix probability, while `LINARITH FAILED TO FIND A CONTRADICTION` had 0.07%, `UNSOLVED GOALS` 0.34%, and maximum recursion depth 0.00% (Table 7, page 8). Multiple errors in one instance are treated independently, so these are error-occurrence denominators, not problem-level success probabilities (section 5.5, page 8).

Inference: Verus agents should route nonlocal specification failures to decomposition or human review rather than endlessly applying local edits. The paper's method cannot turn an incorrect theorem statement into the intended one.

## what is proved, measured, and trusted

The method was evaluated on MiniF2F-test (244), ProofNet (371), MathOlympiadBench (360), and PutnamBench (660) (section 5.2, page 6). Table 3 reports accuracy percentages for the first three benchmarks and solved-problem counts for PutnamBench at budget 64, with additional Putnam budgets 128 and 256. Section 5.4 and Appendix C.1 compare direct and refinement samples using an energy-statistic permutation test with length-normalized Levenshtein distance on canonicalized programs. The authors explicitly qualify the measure: “While edit distance is a purely syntactic metric, Lean proofs exhibit tight coupling between syntactic structure and proof state evolution.” The authors also report less than 0.1% runtime for value-model inference and one Lean compilation per sampled proof (section 5.6, page 8).

Inference: The measured gains establish a Lean search improvement under these models and budgets. They do not establish lower Verus proof cost, better Rust safety, or stable behavior under changed libraries. For VL, the threat is material: verifier errors can become a compact training and search signal that lets an agent explore repairs cheaply. The counter-risk is that error classes can hide semantic differences, and a checker only validates the stated contract.

## what VL should not redo

Inference: VL should not repeat the paper's basic discovery that compiler feedback can guide local proof repair or that direct and refinement search can be combined. New work should test diagnostic normalization, source-local insertion, and value-guided obligation scheduling on real Verus projects, with proof success, verifier time, repair count, and specification changes as denominated outcomes.

## techniques for the catalog

- failure-mode compression: analyze recurring failures with normalized diagnostics; condition repairs on the current proof and compiler feedback
- source-local feedback injection: insert diagnostics beside the failing proof location so code and error remain aligned
- cold-start repair training: synthesize failed/correct proof pairs with verifier-checked labels and fine-tune a repair-capable prover
- expert iteration: retrain on successful repairs from the prover's current error distribution
- value-guided tree search: mix fresh proof generation with error-conditioned refinement and rank nodes by learned repair potential
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "While localized and recurring errors are often repairable, deeper semantic failures remain challenging and continue to limit refinement performance."): checked all study quotations, numbers, section/page references, and technique steps against the full paper, including appendices; corrected normalization versus refinement inputs, the insertion ablation result, page references, a truncated quotation, value-model training steps, accuracy units, and the distribution-test description; changed the link to the paper’s arXiv identifier; did not reproduce experiments, inspect implementation or training data, or validate the proposed Verus transfers.
