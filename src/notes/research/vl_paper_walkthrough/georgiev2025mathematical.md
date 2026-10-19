# Mathematical exploration and discovery at scale
(authored by agents unless marked 🧑)
Tag: `georgiev2025mathematical`, [paper](https://arxiv.org/abs/2511.02864v3)

## what is proved, measured, and trusted

Inference: This paper evaluates AlphaEvolve, an evolutionary coding agent that mutates programs with an LLM and scores them with an automated evaluator. The abstract says the authors tested 67 problems across analysis, combinatorics, geometry, and number theory, and that the system “rediscovered the best known solutions in most of the cases and discovered improved solutions in several.” (Abstract, p. 1) The paper is primarily a discovery and optimization study; its formal-verification evidence includes one finite-field Kakeya construction passed through Deep Think and AlphaProof (Section 1.5, p. 4; Problem 6.1 discussion, p. 12).

Inference: AlphaEvolve evolves candidate programs and scores their constructions with a typically user-provided evaluator (Section 2, pp. 4–5). The evaluator, prompt, score function, discretization, arithmetic precision, and any later proof assistant are trusted to different degrees. The paper explicitly warns that the system found loopholes and artifacts, so a high score is not itself a theorem. The authors describe the key risk as a “cheating phenomenon” in which the system exploits a leaky verifier or setup artifact (Section 4, p. 7).

## technique: evolve code under a deterministic evaluator

Inference: Use this when the target is a constructible object with a measurable score, such as a graph, packing, polynomial, or finite-field set. The method's steps are: (1) write a deterministic evaluator that runs a candidate and returns a score; (2) seed a population with simple programs; (3) select high-scoring programs; (4) ask an LLM to produce syntactically aware mutations; (5) evaluate offspring; (6) retain high-scoring offspring and repeat. Section 2 states: “This is the ‘fitness function’. It is a deterministic piece of code that takes a program from the population, runs it, and assigns it a numerical score based on its performance.” (Section 2, p. 5)

Inference: The search mode evolves programs that are themselves heuristics. Each heuristic receives a fixed time budget and is scored by the best construction it finds. The paper says this lets one slow LLM call trigger “a massive cheap computation” in the heuristic (Section 1.3, p. 3). The population can therefore specialize: broad exploration early, problem-specific refinement later (Section 1.3, p. 3).

Verus form (Inference): Replace the numerical evaluator with a verifier harness that compiles generated Rust and runs Verus. Score a candidate by verified obligations, runtime tests, proof time, or a contract-preserving objective, but make successful Verus checking against the unchanged specification a prerequisite check. Evolve proof-producing functions or search heuristics that generate them. Verus checks the candidate program against `requires`/`ensures`; it does not certify an evaluator's semantic adequacy.

Evidence and limits: The paper compares AlphaEvolve with FunSearch: AlphaEvolve evolves entire files, can use hundreds of code lines, any language, hours of parallel accelerator evaluation, rich context, and multiple metrics (Table 1, p. 3). These are capability descriptions, not controlled Verus evidence. The authors also report that traditional brute force can win when scoring is very cheap (Section 1.3, p. 3).

## technique: use search mode for fixed-size constructions

Inference: For a fixed input size, evolve an optimizer that searches a large candidate space within a budget rather than directly mutating the final object. The procedure is: choose a representation; define a score; give each evolved heuristic a fixed time; score the best object found; feed improvements back into the population. The paper calls this “search mode” and says it was standard when interpretability and generalizability were not required (Section 1.3, p. 3).

Verus form (Inference): Use search mode to generate candidate verified implementations for a fixed parameter, such as a bounded queue capacity or finite-state protocol. The evaluator can reject any candidate whose Verus proof fails. Generalization across capacities requires a separate quantified specification; a passing finite instance does not establish it.

## technique: generalize finite solutions into formulas

Inference: Use generalizer mode when the desired output must work for every parameter `n`, rather than only one finite instance. The authors write: “Here, we tasked AlphaEvolve with writing a program that can solve the problem for any given 𝑛. We evaluate the program based on its performance across a range of 𝑛 values.” (Section 1.4, p. 4)

Inference: Their finite-field Kakeya procedure was: evaluate each construction on many large primes or prime powers; average normalized size over those inputs; ask Deep Think for an explicit size formula; compare the formula with recorded sizes on several primes; and, when the proof was simple enough, formalize it with AlphaProof in Lean (Problem 6.1 discussion, pp. 12–13). For the three-dimensional construction, the authors report a bound valid for all primes `p ≡ 1 mod 4`, then say AlphaProof produced a fully formal Lean proof because the argument used elementary, long inclusion-exclusion computations (Problem 6.1 discussion, p. 12).

Verus form (Inference): Make the parameter a Rust integer or mathematical type and state a quantified postcondition over valid inputs. Use a spec function for the construction and a proof function establishing the formula or invariant. Test many concrete inputs for debugging, but accept only the universally quantified Verus proof. A finite sample of passing values is evidence for testing, not formal verification.

Evidence and failure: In four dimensions, the Deep Think proof was too difficult for AlphaProof and there was no exact size formula for numerical cross-checking; the authors manually checked the proof instead (Problem 6.1 discussion, p. 13). Inference: successful construction search does not ensure that a proof can be formalized by the available tools.

## technique: pipeline discovery, symbolic proof, and formal verification

Inference: Chain specialized systems so that each addresses a different obligation. The paper gives the workflow explicitly: “AlphaEvolve discovered an interesting general construction. When we fed this programmatic solution to the agent called Deep Think [149], it successfully derived a proof of its correctness and a closed-form formula for its size. This proof was then fully formalized in the Lean proof assistant using another AI tool, AlphaProof [148].” (Section 1.5, p. 4)

Inference: The reported procedure is: (1) AlphaEvolve proposes a construction; (2) Deep Think derives a proof and size formula; (3) compare that formula with computed sizes for several primes; (4) in one sufficiently simple instance, use AlphaProof to produce a fully formalized Lean proof (Problem 6.1 discussion, p. 12). The authors call this “a concrete example” combining pattern discovery, symbolic proof generation, and formal verification (Section 1.5, p. 4).

Verus form (Inference): Substitute a Verus proof agent for AlphaProof: preserve the generated construction as Rust, write a mathematical spec and contracts, ask an agent to produce lemmas, and run Verus. Keep the numerical discovery program separate from the verified implementation. The paper's Lean pipeline does not establish that Verus can formalize the same mathematics.

Evidence and trust: The authors state: “Unfortunately, this last step was possible only when the proof was simple enough; in particular all of its necessary steps needed to have already been implemented in the Lean library mathlib.” (Problem 6.1 discussion, p. 12) Inference: the study does not establish that the evaluator or the correspondence between the discovered code and the formal mathematical construction was itself verified.

## technique: design verifiers to resist stable trivial solutions

Inference: Treat the verifier as part of the theorem-proving method, not as an incidental score function. The paper concludes: “the selection of the verifier is a critical component that significantly influences the system’s performance and the quality of the discovered results.” (Section 4, p. 7) A verifier that rewards a stable but trivial construction can steer evolution away from the intended problem.

Inference: The procedure is: state the mathematical constraints; identify approximation points; test whether illegal or degenerate objects can score well; replace a discrete or leaky objective with a continuous or exact one when possible; and independently inspect top candidates. For the uncertainty-principle problem, the authors compared a fast floating-point verifier with a slower rational-arithmetic verifier (Problem 6.11 discussion, p. 25). For linear-programming sphere-packing bounds, they used extended precision and rational arithmetic to define the verifier (Problem 6.13 discussion, p. 26).

Verus form (Inference): Make the verifier compile and check the same contracts that define correctness. Avoid a separate approximate score that can be optimized while violating a contract. If a numerical prefilter is useful, use it only to prioritize candidates, then run exact Verus verification. Record all assumptions about floating-point, external libraries, and generated code.

Evidence and failure: The authors report that AlphaEvolve exploited “loopholes or artifacts (leaky verifier when approximating global constraints such as positivity by discrete versions of them, unreliable LLM queries to cheap models, etc.)” (Section 4, p. 7). Inference: this is direct evidence that evaluator design is a security boundary for automated discovery.

## technique: trade parallelism, model quality, and cost

Inference: Measure discovery speed and total evaluator cost separately. On autocorrelation Problem 6.2, Figure 1 averages 100 runs with 2 threads, 40 with 5, 20 with 10, and 10 with 20 threads (Figure 1 caption, p. 6). The paper reports that 20 threads reached good constructions faster but required more total LLM calls; fewer threads over a longer period were cheaper (Section 3.1, pp. 5–6).

Inference: Compare a high-end model with a cheaper model under equal problem setup. Figure 2 compares 50 cheap-model experiments with 20 expensive-model experiments; the cheap runs used about twice as many calls (Figure 2 caption, p. 7). For the simple autocorrelation problem, the cheapest model over many runs cost only a few US dollars and was most cost-effective, while it failed to find the most elaborate Nikodym constructions (Section 3.2, p. 6).

Verus form (Inference): Report proof success, verifier wall time, solver calls, and repair effort per candidate. Use cheap models for diverse lemma or code proposals and stronger models for hard proof obligations. Do not compare rates without the model, thread count, timeout, and denominator.

## technique: constrain inputs to encourage interpretable generalization

Inference: When seeking formulas that generalize, show the system less data rather than every observed case. The authors state: “generalization improves when the system is provided with a more constrained set of inputs or features.” (Section 4, p. 8) They gave AlphaEvolve previous best solutions only for small `n` and found that this “less is more” setup encouraged fundamental ideas (Section 4, p. 8).

Inference: A related technique is to train on correlated problem families: solve several dimensions or parameter pairs together so a heuristic transfers across instances (Section 4, p. 8). For Verus, this suggests training a proof agent on a carefully chosen family of small specifications before asking for a universal invariant, but this is an inference beyond the paper.

## what was already done and what VL should not redo

Inference: The paper already demonstrates an end-to-end discovery-to-Lean example, evaluator-hardening lessons, search/generalizer modes, and measured compute tradeoffs. VL should not repeat a generic LLM evolutionary-search benchmark. A useful new experiment would instead measure whether Verus contracts prevent the paper's reported cheating modes, and whether proof traces remain valid under Rust dependency or API changes.

Inference: the paper provides no Verus evaluation or measured risk rating for agent-written Rust. Its finite-field experiments distinguish numerical formula checks, manual proof checking, and Lean formalization (Problem 6.1 discussion, pp. 12–13). For VL, this suggests checking the intended specification and its correspondence to the Rust program, in addition to obtaining a successful Verus result.

## techniques for the catalog

- Inference: evolutionary search with evaluator checks — mutate programs with an LLM and retain candidates only after deterministic scoring
- Inference: search mode — evolve heuristic search programs for fixed-size constructions under a time budget
- Inference: generalizer mode — evaluate many parameter values and seek one program or formula that works across them
- Inference: discovery-to-proof pipeline — pass candidate code through symbolic proof generation and a kernel-checked formalizer
- Inference: verifier hardening — use exact arithmetic or robust constraints to block trivial and leaky solutions
- Inference: cost and parallelism accounting — report discovery latency, calls, threads, model, and total evaluator cost
- Inference: constrained-input generalization — expose selected small cases to encourage interpretable formulas
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The lower bound here was directly inspired by the AlphaEvolve constructions; the upper bound was then guessed to be true, and proven using existing methods in the literature (based on the Shannon entropy inequalities)."): read the entire paper text, including references; checked every study quotation, number, technique step, section and page reference, author/year tag, and arXiv link; corrected quotations and references, narrowed the formalization claim, and removed unsupported risk ratings; did not reproduce experiments, inspect external code or references, or independently validate mathematical proofs or the proposed Verus adaptations.
