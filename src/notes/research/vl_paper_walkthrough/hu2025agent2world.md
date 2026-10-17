# Agent2World: Learning to Generate Symbolic World Models via Adaptive Multi-Agent Feedback
(authored by agents unless marked 🧑)
Tag: `hu2025agent2world`, [paper](https://arxiv.org/abs/2512.22336)

## problem and verification boundary

Agent2World generates executable symbolic world models from natural-language descriptions. A world model is either PDDL or code and represents predicates, actions, states, and a transition function. The paper's motivation is that “correctness is behavioral and execution-dependent, while large-scale, verifiable supervision is scarce.” (section 1, page 1). Its system is a three-stage workflow: Deep Researcher fills specification gaps; Model Developer writes the PDDL or executable code; Testing Team generates tests and simulations and feeds failures back for repair. The paper presents no formal proof of any generated model; its verifier accepts a model that executes and passes the generated unit tests and, where applicable, simulation checks (section 3.2.2, page 5).

Inference: for VeruLaw, this is a useful front end for turning a prose system description into candidate state transitions and tests before writing Rust/Verus. Passing tests cannot replace a Verus proof because tests cover selected executions, while a proof must establish the stated contract for all modeled inputs.

## knowledge synthesis

Step 1 extracts questions and missing details from the task specification. The Deep Researcher uses web search and retrieval, summarizes sources, and updates a structured intermediate representation until no questions remain or a preset research count is reached (algorithm 1, appendix B.2, page 16). This stage explicitly addresses underspecified commonsense rules. The agent's tools are `browser_search` and `browser_open` (table 5, appendix B.1, page 15). The experiment blocks benchmark and source repositories to reduce leakage (section 4.3, page 6).

Inference: a VL implementation should turn research results into explicit assumptions and a reviewable model before code generation. External facts remain trusted inputs; Verus cannot prove that a web result is true. The research artifact should record source, assumption, and the transition or invariant it motivates.

## executable model generation

Step 2 gives the completed representation to a Model Developer with file and sandboxed code-execution tools. The developer writes a concrete PDDL domain or Python world model, executes it, observes errors, and patches it repeatedly. The paper says, “To support iterative refinement, the Model Developer is equipped with a sandboxed code-execution tool, enabling it to test and debug implementations in multiple rounds until the code is functional and consistent with the specification.” (section 3.1.2, page 4). Algorithm 1 saves the candidate, invokes unit testing and simulation, merges feedback, and loops for a bounded number of rounds.

Inference: the Verus form is to generate Rust plus a specification, compile it, run Verus, and feed failed proof obligations or test failures to a repair agent. The executable code and `spec fn`/contracts must be kept distinct. A successful sandbox run only establishes that this candidate executed in this environment; it does not prove memory safety or universal behavior.

## adaptive unit and simulation testing

Step 3 uses two specialized testers. The Unit Tester creates Pytest-style tests for predicates, actions, and invariants in the description, executes them, and reports basic functionality and coverage. The Simulation Tester runs a ReAct-style play loop: it explores actions and queries, records trajectories, and diagnoses unreachable goals, missing preconditions, and inconsistent updates. Their report covers correctness, coverage, logical consistency, and physical requirements. The two reports are merged and returned to the developer; the loop stops when all checks pass or a convergence criterion is reached (section 3.1.3, page 4).

The distinction matters: static parsers or fixed trajectories can miss behavior errors. The authors write, “Unlike prior works that rely on annotated gold trajectories (Dainese et al., 2024) or human feedback (Guan et al., 2023), our method is fully autonomous and does not require manual labels.” (section 3.1.3, page 4). The test cases are generated for the observed model's errors, rather than selected from a fixed universal suite.

Inference: Verus can encode each discovered invariant as a contract and use a `proof fn` to show that a transition preserves it. Simulation can find missing cases and guide invariant discovery, but only the final `requires`/`ensures` proof gives universal coverage. The testing loop should therefore be treated as a bug finder and specification debugger, not as the proof itself.

## verifier-guided rejection sampling

The paper formalizes the Model Developer as an agent in an MDP. A state contains the specification and test diagnostics; an action is a new implementation or patch; executing it and rerunning the Testing Team produces the next observation and reward. A trajectory records proposals and feedback. The verifier outcome V(τ) is 1 only when the final model executes in the sandbox and passes synthesized unit tests and applicable simulation checks. Rejection sampling retains only `(x, τ)` with V(τ)=1 while preserving intermediate repairs (section 3.2.2, page 5). The resulting 1,526 verified trajectories cover four world-model types and are used for supervised fine-tuning.

Inference: the Verus analogue is to retain repair traces only when the final candidate passes the actual verifier and a separate requirement check. Do not label a trace verified merely because a test harness returned success. The proof result should be a machine-readable predicate tied to the exact source revision and configuration.

## evidence and denominators

The training data starts from 500 CWMB, 500 ByteSized32, 600 PDDL, and 800 MCP specifications; filtering retains 266, 277, 483, and 500 respectively (appendix E, page 18). Evaluation uses Text2World's 103 PDDL domains, CWMB's 18 MuJoCo-style environments, and ByteSized32's 32 text-game environments (appendix C.1, table 6, page 16). Agents use temperature 0, top_p 1, and at most 10 ReAct tool steps. Text2World and ByteSized32 receive two refinement iterations; CWMB receives three (section 4.3, page 6).

For GPT-4.1-mini on Text2World's 103 domains, Agent2WorldMulti scores 93.1 executability and 75.4 F1AVG, versus 78.2 and 60.1 for Text2World with error-correction budget 3 (table 1, page 6). For Llama-3.1-8B, multi-agent SFT scores 44.6 executability and 28.2 F1AVG, versus 27.7 and 21.8 before SFT (table 1, page 6). Executability is defined as the fraction of test cases whose generated PDDL is parsed and validated (appendix C.2, page 17), and F1 values are computed only for executable outputs. On CWMB, GPT-4.1-mini multi-agent normalized return is 0.4811 overall, compared with 0.3488 for GIF-MCTS† (the official implementation), the paper's “previous best method”; its own enhanced GIF-MCTS⋆ with a Deep Researcher scores 0.3649 (table 2, page 7; section 4.5, page 7). R is averaged over a fixed number of episodes per environment (10 in the original setup), and discrete and continuous action spaces are reported separately (appendix C.2, page 17). ByteSized32 GPT-4.1-mini multi-agent reaches 0.8958 runnable-game rate and 0.4768 physical-alignment score over 32 games (table 3, page 8). The paper's ablation reports that removing the Unit Tester lowers discrete CWMB accuracy by 0.3008 and normalized return by 0.4470, while removing the Deep Researcher lowers discrete return by 0.3926 (table 7, appendix D, page 18; section 5.1, page 9).

The pairwise study reports final-turn wins of 68.8% on CWMB and 93% on ByteSized32, with no losses there; Text2World has 14% wins and 7% losses (figure 4, page 9). These percentages are instance-level comparisons under each benchmark's primary metric, not proof probabilities. The paper has no limitations section. It notes that continuous dynamics are harder than discrete ones (section 4.5, page 7) and that the remaining errors shift toward dynamics mismatches in later iterations (section 5.4, page 10).

The paper describes the training data inconsistently. Section 4.1 (page 5) says traces come from running Agent2World with gpt-4.1-mini, and table 8 gives the 500/500/600/800 counts above. Appendix L (pages 47-48) instead lists 200 PDDL tasks, 200 MCP tasks, and 50 each of game-style and MuJoCo-style tasks, with three rollouts from llama-3.1-8b-instruct per task and the highest-reward rollout kept. This note does not resolve which description applies.

Inference: the tests and the LLM judges (GPT-4o evaluates ByteSized32, section 4.3, page 6) remain trusted components, since the paper reports no check of them beyond the contamination analysis in appendix J.

Inference: the threat to a verified-Rust product is substantial in behavioral specification and test adequacy. Agent2World already demonstrates research, executable synthesis, adaptive unit testing, simulation, repair traces, and rejection-sampled training. VL should not claim these as new. A distinct contribution would connect adaptive failures to formally stated Verus invariants and measure which test-found bugs become proof obligations, which remain outside the model, and how many candidate proofs are rejected by an independent semantic checker.

## techniques for the catalog

- specification research — use a retrieval agent to fill missing rules and produce an explicit intermediate representation
- sandboxed synthesis — have a developer execute and patch the generated PDDL or code against its specification
- adaptive unit testing — synthesize tests for predicates, actions, and invariants observed in the candidate
- simulation validation — explore trajectories to expose unreachable goals, missing preconditions, and inconsistent state updates
- feedback refinement — merge unit and simulation diagnostics into bounded repair iterations
- verifier-guided rejection sampling — keep only trajectories whose final artifact executes and passes the generated checks
- behavior-aware training — fine-tune on multi-turn repair traces rather than isolated final programs
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "This trajectory is consistent with the qualitative analysis in Section 5.4: the Testing Team first drives the Model Developer to resolve structural and specification-level issues, and then focuses on subtle dynamics and invariant failures, ultimately producing world models that are both syntactically robust and semantically faithful to the target environments."): read the whole text (main body and appendices A-L); checked both quotations, every number against tables 1, 2, 3, 7, 8 and figure 4, the technique steps against section 3 and algorithm 1, and page references against the PDF page breaks; changed one quotation (works, not methods), four page references (section 3.1.2 to page 4, table 1 to page 6, table 2 to page 7, appendix C.1 to page 16), the CWMB baseline (GIF-MCTS† versus GIF-MCTS⋆), the unsupported limitation sentence, and added the training-data inconsistency; did not check the Inference paragraphs for VeruLaw beyond marking them as inference, the figures 5-8 and tables 9-16 beyond what is cited, or the cited external papers. The link is the arXiv identifier printed on the paper text (2512.22336).
