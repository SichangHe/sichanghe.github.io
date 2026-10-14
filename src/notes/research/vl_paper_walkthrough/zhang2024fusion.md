# The Fusion of Large Language Models and Formal Methods for Trustworthy AI Agents: A Roadmap
(authored by agents unless marked 🧑)
Tag: `zhang2024fusion`, [paper](https://doi.org/10.48550/arxiv.2412.06512)

## scope and contribution

This position paper gives a roadmap for combining formal methods (FMs) and large language models (LLMs), rather than reporting one implemented verifier. Its central division is “FMs for LLMs” (use solvers, testing and monitoring to make model outputs more reliable) and “LLMs for FMs” (use language models to formalize specifications, prove theorems and build model-checking models). Section 2 states the intended agent properties: local deployment for client privacy, a low entry barrier for domain experts, and certification of deterministic outputs. The paper warns that its integration proposals are preliminary: “While a fully comprehensive methodology for integrating formal methods into LLMs remains elusive, we present our current implementations and future visions as preliminary steps toward advancing this direction.” (Section 3, p. 4.)

## technique 1: solver-mediated LLM reasoning with debate, tests and self-correction

What it is: translate a natural-language task into SMT constraints, delegate satisfiability and model construction to a solver, then translate the model back. The paper identifies three failure modes: verbose or suboptimal formulas, incorrect or inconsistent formulas, and syntactically invalid solver input (Section 3.1, pp. 4–5). Its three proposed controls are multiple-LLM debate, generated tests (including fuzzing and mutation), and iterative self-correction from critics, tests or solver errors.

When to use (Inference): use this for bounded arithmetic, bit-vector, array or scheduling constraints where an SMT solver can decide a precise formalization. Steps from Section 3.1.1 (pp. 4–5) and the Z3 case study (pp. 5–7):

1. ask an LLM to formalize the natural-language task as solver code;
2. have critic LLMs inspect logical consistency, syntax and alignment with the description;
3. generate tests, fuzz inputs, and mutate both solver code and the natural-language description;
4. classify failures as syntax, semantic misalignment or performance problems and ask an LLM to repair the affected constraints;
5. run the solver and interpret its model in natural language;
6. when natural-language and solver answers collide, debate alternatives and test the selected consensus.

The meeting example declares Boolean availability variables for four days, adds each person's positive availability and a disjunction requiring one common day, then adds negative constraints for unavailable days. Z3 returns Tuesday. The paper explicitly notes that the first generated code omitted the negative constraints and that self-correction adds them (Section 3.1.2, pp. 5–7). The paper's solver code shape includes `Solver()`, `solver.add(Or(...))`, `solver.check() == sat`, and `solver.model()`.

Verus form (Inference: the paper uses Python Z3, not Verus): represent the request as a Verus `spec fn` over mathematical values and prove the selected result with `ensures`; use `assert` or a proof function to discharge finite Boolean cases. Keep the LLM outside the trusted proof: it may propose the specification and proof text, while Verus checks the final Rust. Inference: Verus does not provide Z3's Python API, so the exact `Solver` and `model` calls do not carry over.

Evidence and limits: the paper provides the complete scheduling example but no success-rate denominator, runtime, or controlled experiment. The shown omission demonstrates that solver execution alone does not prove that the natural-language statement was translated faithfully. Inference: a VL product should treat the solver as checking the generated formula, not as certifying the translation from user intent.

Quote: “The strategy helps check the consistency between the natural language description and the SMT code produced by the LLM.” (Section 3.1.1, p. 5.)

## technique 2: reasoning and metamorphic testing for factual hallucinations

What it is: build an automatically extensible test oracle from verified fact triples, derive more facts with logical rules, ask matched questions, and compare parsed answers with the ground truth. The target is fact-conflicting hallucination (FCH), which the paper says needs authoritative external knowledge rather than only semantic consistency checks (Section 3.2, pp. 7–9).

Steps from Sections 3.2.1–3.2.5 (pp. 7–9):

1. extract `(subject, predicate, object)` triples category by category from a structured database;
2. exhaustively apply negation, symmetric, inverse, transitive and composite rules to derive new triples;
3. populate question-answer templates from triples, and mutate templates with synonyms or antonyms to create opposite answers;
4. construct prompts requiring explicit “yes/no/I don’t know” judgments and standardized reasoning;
5. classify “I don’t know” as correct when the model cannot answer;
6. parse suspicious reasoning into triples, build response and ground-truth semantic graphs, and compare node similarity (facts) and edge similarity (reasoning);
7. label outputs as correct, erroneous-inference hallucination, erroneous-knowledge hallucination, or both.

Verus form (Inference): encode each generated fact as a ghost/spec value and prove metamorphic relations with `proof fn`s and `ensures`; use executable Rust only to gather model responses and parse them. A Verus proof can check that a mutation preserves or negates a relation, but NLP parsing and semantic similarity remain trusted external code unless separately specified and verified.

Evidence and limits: this is a proposed framework with no reported benchmark size, model count, accuracy, or denominator. Inference: it assumes the source database is correct and that the graph parser captures the model's reasoning. The paper says ordinary string matching, manual validation and another LLM are insufficient for FCH (Section 3.2, p. 7), so a VL deployment should preserve provenance for every oracle triple.

Quote: “This testing framework leverages factual knowledge reasoning combined with metamorphic testing principles to ensure a comprehensive and robust FCH evaluation of LLM outputs.” (Section 3.2, p. 7.)

## technique 3: runtime monitoring of formalized LLM behavior

What it is: place monitoring between testing and full verification, checking execution traces against predefined properties at runtime. The paper motivates it because responses are nondeterministic, input dimensions are high, and natural language is difficult to specify exactly (Section 3.3, p. 9). It cites conditional-fairness monitoring using linear temporal logic and bounded metric interval temporal logic as a more formal direction.

The paper gives no step list for monitoring (Section 3.3, p. 9). It describes only the idea: monitoring of formalized properties at runtime, by examining execution traces against predefined properties. Inference: the paper does not prescribe an algorithm for compiling an LLM trace into temporal-logic propositions.

Verus form (Inference): verify the monitor's trace-state transition function with a `spec fn`, `requires` for well-formed traces, and `ensures` that a returned violation corresponds to a trace satisfying the negated property. Verus can prove monitor code, while the LLM output and proposition extractor remain assumptions unless modeled.

Evidence and limits: no monitoring experiment or denominator is reported. The paper says the specifications used by earlier LLM-monitoring methods “remain ambiguous and informal” and that further efforts are needed to monitor a wider range of properties, which it calls its future focus. Inference: monitoring lowers per-request computation but cannot provide a universal guarantee over all possible LLM outputs.

Quote: “Positioned between testing and verification, monitoring of formalized properties at runtime enables rigorous certification of system behavior with minimal computation overhead by examining execution traces against predefined properties.” (Section 3.3, p. 9.)

## technique 4: outline-and-tool autoformalization

What it is: use an LLM to produce a high-level proof outline, call an external computer algebra system (CAS) for omitted symbolic steps, then integrate and refine the result. The motivating induction example has an Isabelle attempt that incorrectly simplifies `2 * (n + 2) - (n + 1)` to `2*n + 3` (Sections 4 and 4.1, pp. 10–11).

Steps from Section 4.1 (p. 11); the paper does not say a prover is run inside this loop:

1. parse the informal proof and create an outline with placeholders;
2. send algebraic or symbolic gaps to a CAS;
3. insert the CAS-derived steps into the outline, filling the placeholders;
4. if gaps remain, revisit the informal proof and consult external tools again, iteratively.

Verus form (Inference): ask the LLM for a Verus proof skeleton, then use `assert` and arithmetic lemmas/proof functions for each algebraic step; finish with Verus checking the function's `ensures`. The CAS and LLM are proposal tools, not trusted proof components. Inference: Isabelle syntax and `sledgehammer` lines in the paper cannot be copied into Verus.

Evidence and limits: the paper offers only the induction example and no aggregate success rate. Inference: the example shows why plausible intermediate algebra must be checked by a prover. Inference: VL should preserve each generated intermediate equality as a separately checkable assertion rather than accepting a prose derivation.

Quote: “To address this, we propose the use of autoformalization agents equipped with enhanced capabilities for symbolic reasoning.” (Section 4.1, p. 11.)

## technique 5: semantic premise selection

What it is: retrieve useful lemmas for a proof goal by semantic descriptions instead of only syntactic similarity. The paper reports that Sledgehammer usually selects about 1,000 lemmas from tens of thousands, and that a transformer premise selector improved Sledgehammer's miniF2F success rate by 13% (Section 4.2.1, p. 12). The paper does not say whether the 13% is a relative or an absolute gain, or give the baseline success rate.

Steps (Section 4.2.1, p. 12): collect each lemma's definition and context; ask an LLM to generate a natural-language semantic description; store them as a knowledge base; for a proof goal, have the agent generate a semantic representation; and query the knowledge base for relevant lemmas. Passing the result to a prover is not spelled out.

Verus form (Inference): index Verus `spec fn`, `lemma`/proof-function statements and their `requires`/`ensures` text; retrieve candidates for a target `assert` or `ensures`; include only selected proof functions in the generated Rust; let Verus reject irrelevant or ill-typed calls. Inference: embedding retrieval is outside Verus and must be treated as heuristic.

Evidence and limits: the paper reports no new experiment for its LLM proposal. Inference: semantic descriptions can themselves hallucinate, and a relevant lemma may have little lexical overlap with a goal. Inference: VL needs verifier feedback or a mechanically checked candidate list before treating retrieval as successful.

Quote: “This approach effectively simulates the expert’s intuition across a vast number of possibilities, fully leveraging semantics information to guide the premise selection process.” (Section 4.2.1, p. 12.)

## technique 6: intention-aware, retrieval-augmented proof agents

What it is: generate proof steps together with explicit proof intentions, retrieve definitions and lemmas dynamically, and use errors to repair failed steps. The paper distinguishes this agent from a standalone next-token proof model (Section 4.2.2, pp. 12–13).

Steps: make a high-level plan; generate a step and its intention; retrieve missing definitions or theorems; submit the step; if it fails, feed the intention and error back for repair; the paper does not state a stopping rule. These are the paper's two key features—“Explicit Proof Intentions” and “Dynamic Retrieval of Relevant Knowledge”—plus its described trial-and-error interaction (Section 4.2.2, p. 13).

Verus form (Inference): generate a proof function with a stated `ensures` target, annotate each block with comments or intermediate `assert`s expressing intention, call retrieved proof functions, and rerun Verus after each error. Comments do not affect soundness; only Verus-checked assertions and proof-function bodies do.

Evidence and limits: no success rate is given for this proposed agent. The paper says current LLMs lack broader strategic reasoning and adaptability. Inference: the useful product boundary is a loop that accepts only verifier-checked patches, while intentions are explanatory metadata.

Quote: “A defining feature of LLM agents is their ability to generate both proof steps and explicit proof intentions—statements that explain the reasoning or goals underlying each step.” (Section 4.2.2, p. 13.)

## technique 7: natural-language-to-Coq proof workflow

What it is: a four-step agent that understands a theorem, formalizes it, collaborates interactively with Coq, and translates the verified result back to natural language. The even-number example defines `even n -> even m -> even (n + m)` and proves it by destructing witnesses, constructing their sum, rewriting, and invoking `ring` (Section 4.2.3, pp. 13–14).

Steps exactly listed in the paper: “Step 1. Natural Language Understanding”; “Step 2. Formalization of the Problem”; “Step 3. Proof Construction”; and “Step 4. Proof Verification and Feedback” (Section 4.2.3, pp. 13–14). The paper additionally says the user must check consistency between natural language and generated Coq code.

Verus form (Inference): translate the theorem into a Rust signature with `requires`/`ensures`, use executable or ghost witnesses as appropriate, and have Verus check each proof step. Coq's `Theorem`, `Proof`, `Qed`, `destruct`, and `ring` syntax does not carry over.

Evidence and limits: only one elementary example is shown; no experiment or denominator is reported. Inference: the explicit user consistency check leaves the natural-language/formalization link trusted. Inference: VL should display that translation for human review and then rely on Verus for the formal result.

Quote: “Coq verifies this proof, and the LLM agent explains and responds in natural language.” (Section 4.2.3, p. 14.)

## technique 8: planning, completion and feedback for model checking

What it is: an LLM planning model maps natural language to a structured model plan, a code-completion model emits tool-specific code and assertions, a model checker verifies them, and an automated prompt engineer (APE) turns counterexamples into revised instructions. The six workflow steps are listed in Section 4.3.1 (pp. 14–15): natural-language input, LLM planning, code/assertion completion, verification, feedback generation, and iterative improvement.

The PAT case study starts from a car requirement that a key never be locked inside. GPT-4o generated an unsafe transition `[ key == i && owner [ i ] == near ] leavekey { key = incar ;}`. PAT produced an error trace; the agent added `door == open` to `leavekey` and restricted `lockdoor` to owners near the key or inside. The refined model was then formally verified (Section 4.3.2, pp. 15–16). The prototype uses a LangChain pipeline with modular memory, a Planning LLM, a Code Generation LLM, PAT, and APE (p. 16).

Verus form (Inference): represent system states as Rust enums/structs, write a `spec fn` for safety, and use Verus `assert`/`ensures` to reject generated transitions. Counterexample traces from a finite-state checker can be supplied to the LLM, but acceptance must require a successful Verus run. Inference: PAT's deadlock/reachability checks are not equivalent to Verus functional proofs and need separate specifications.

Evidence and limits: one qualitative example is reported; there are no counts of generated models, iterations, or failures. The paper says the framework can adapt to Alloy, PRISM and UPPAAL but supplies no porting measurements. Inference: this is a design pattern, not evidence of production reliability.

Quote: “The refined model, guided by PAT’s feedback, results in a system that can now be formally verified to ensure the key will never be locked inside the car.” (Section 4.3.2, p. 16.)

## technique 9: LLM-guided refinement calculus with backtracking

What it is: start with a formal abstract specification, transform it through correctness-preserving refinement laws, generate executable code, build proof obligations and verification scripts, and use ATP feedback to retry or backtrack. The paper defines refinement by weakest preconditions: `S0 ⊑ S1` iff for every postcondition P, `wp(S0,P) → wp(S1,P)` (Section 5.2, p. 18), and gives a transitive sequence `S0 ⊑ S1 ⊑ ... ⊑ Sn`.

Steps from Section 5.3.2 (pp. 18–19): formalize the natural-language specification with LLM assistance; parse it into an abstract syntax tree; describe the refinement laws to the LLM in a prompt; have the LLM select a law from the specification's description and constraints, apply that law formally to get the new specification and its proviso constraints, and have the LLM generate the associated code; automatically build proof obligations and ATP scripts; feed success or counterexamples back; and, after repeated failures, backtrack to the last refinement and choose another law.

Verus form (Inference): model each refinement as a Rust function whose `ensures` establishes the abstract relation, and keep provisos as `requires`; prove transitivity with proof functions. Generated executable code must remain ordinary Rust checked by Verus. Inference: weakest-precondition notation and ATP scripts are conceptual guidance; the paper gives no Verus encoding.

Evidence and limits: this section is an architectural proposal without implementation results, counts or denominators. Inference: it assumes a sound refinement-law library and correct AST/specification parsing. Inference: backtracking can reduce search dead ends but cannot repair a wrong initial formalization.

Quote: “If multiple failures occur, our method will backtrack to the last refinement step, interact with the LLM again to choose another refinement law, re-generate the associated code, and then proceed as previously.” (Section 5.3.2, p. 19.)

## proved, measured and trusted

The paper proves no new theorem about an implementation and reports no aggregate evaluation for its roadmap. It gives worked Z3, Isabelle, Coq and PAT examples, plus the refinement relation definition. Inference: the trusted elements include the LLM-to-formal translation, prompts, critic judgments, mutation generation, semantic graph parser, temporal-logic property choice, and (in the proposed refinement tool) the refinement-law and AST machinery. Solver, theorem-prover and model-checker outputs are trusted only for the formal artifacts they actually check. Inference: a VL system should make those boundaries explicit and retain raw verifier logs, counterexamples and the natural-language/formal pair.

## what VL should not redo and product threat

Proposed or sketched in this paper (not evaluated): the solver–LLM debate/test/repair loop; fact-triple metamorphic testing; runtime monitoring as an intermediate assurance layer; outline-plus-CAS autoformalization; semantic premise selection; intention-aware proof agents; a four-stage natural-language-to-prover workflow; planning/completion/feedback model-checking agents; and LLM-guided refinement with backtracking. VL should reuse these as design patterns and test them against Verus rather than re-arguing their motivations.

Inference: threat to a product that emits agent-written verified Rust is moderate. The paper's patterns can automate specification and proof search around VL, but every example leaves translation, parsing or prompt behavior outside the formal guarantee, and the roadmap reports no end-to-end Rust evaluation. The strongest transferable safeguards are verifier-gated iteration, explicit counterexample feedback, semantic retrieval, and preserving a human check at the natural-language/formal boundary.

## techniques for the catalog

- solver-mediated LLM reasoning — generate SMT constraints, debate and mutate them, self-correct from solver feedback, and translate checked models back
- factual metamorphic testing — derive fact triples with logical rules and compare parsed model graphs with authoritative ground truth
- runtime formal monitoring — check execution traces against temporal properties as a lower-cost layer between testing and proof
- outline-and-tool autoformalization — make a proof outline, delegate symbolic gaps to a CAS, and submit every step to a prover
- semantic premise selection — index natural-language lemma descriptions and retrieve premises by meaning rather than syntax
- intention-aware proof agents — pair each proof step with an intention, retrieve definitions dynamically, and repair from verifier errors
- model-checking agent loop — plan from natural language, complete tool code, verify, and refine from counterexample feedback
- refinement-law backtracking — generate code through proof-preserving laws, discharge provisos, and retry from the last failed refinement
Checked 2026-10-13: audit record zhang2024fusion; paper-study comparison complete; gate executed; experiments not rerun
