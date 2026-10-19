# Formal Mathematical Reasoning: A New Frontier in AI
(authored by agents unless marked 🧑)
Tag: `yang2024formalreasoning`, [paper](https://arxiv.org/abs/2412.16075)

## scope and status of claims

Yang, Poesia, He, Li, Lauter, Chaudhuri, and Song survey AI for formal mathematical reasoning and argue for combining language models with proof assistants and other formal systems. They define the subject as reasoning grounded in systems with syntax and explicit inference rules, and write: “A formal environment can guarantee the soundness of reasoning, provide automatic feedback, and check if the goal has been achieved.” (Section 2.2, p. 5). The authors describe it as a position paper and explicitly say it is not intended as a comprehensive survey (Section 1, p. 3). It introduces neither a new verifier nor a single controlled experiment. The performance and dataset numbers discussed below are reported from cited work and retain those settings. The numbered workflows are proposed applications of the paper’s ideas, labeled Inference:.

## technique 1: formalize requirements and check code against them

what it is: translate an informal requirement into formal assertions, then prove that a system satisfies them or find bugs. Under Curry–Howard in Lean, statements are types and proofs are expressions; proof checking checks that an expression has the specified type (Section 2.2, p. 6). In software verification, the assertions specify correctness and security requirements (Section 3.4, p. 11).

when to use: Inference: use this when generated code must satisfy explicit requirements. Ambiguous requirements need clarification as well as formalization. The paper describes the verification process: “In this area, one first specifies the correctness and security requirements of a system as formal assertions. Next, theorem proving and model-checking techniques are used to prove that the system satisfies its requirements or, alternatively, to find bugs.” (Section 3.4, p. 11).

how to do it: Inference:

1. identify entities, states, inputs, outputs, and assumptions in the informal requirement (Sections 2.2 and 4.2, pp. 5, 13)
2. define them in the target formal language and retrieve existing definitions where possible (Section 4.2, p. 13)
3. state the theorem or contract, separating preconditions from the desired postcondition
4. invoke the checker; use counterexamples or failed goals to revise the formalization
5. generate or verify code against the formal statement; the paper also permits simultaneous generation of code, specifications, and proofs (Section 4.4, p. 19)

Verus form. Inference: turn the requirement into Rust function `requires` and `ensures`, `spec fn` predicates, and loop invariants, using `proof fn` lemmas for intermediate facts. This is an inference because the survey names Dafny and Verus but does not prescribe Verus syntax. Review whether the specification captures the requirement. The authors identify the risk directly: “However, a key challenge is ensuring the trustworthiness of the generated specifications—that they are neither too strong nor too weak and accurately reflect developers’ intent.” (Section 4.4, p. 19).

evidence and limits: the paper cites seL4 verification as requiring “more than 20 person-years of intricate engineering work” (Section 3.4, p. 11). This is a cited case, not a denominator for all verification. Formalization itself can be wrong; the survey notes that syntactically similar formal statements can have opposite meanings (Section 4.2, p. 13).

## technique 2: autoformalization with checker feedback

what it is: translate informal mathematics into formal statements and optionally proofs. For verification, the paper also discusses generating specifications from natural language or code (Section 3.4, p. 12). Formal feedback helps refine candidates, but cannot by itself establish that a translation preserves the intended meaning. The survey describes autoformalization as taking informal mathematics and translating it into formal theorems and proofs (Section 2.2, p. 6).

how to do it: Inference:

1. supply the model with the informal statement and retrieved definitions or few-shot examples (Section 3.1, p. 9)
2. generate a formal statement, and if needed an informal proof sketch or formal proof attempt
3. compile/check the statement and proof in Lean, Coq, Isabelle, or the target verifier
4. feed failed goals, counterexamples, and diagnostics back to the model
5. break hard statements into definition retrieval, statement generation, and proof completion; iterate until the formal checker accepts (Section 4.2, pp. 13–14)

Verus form. Inference: have an agent produce a Rust/Verus contract draft, run `verus` as the oracle, and use diagnostics to repair syntax, missing invariants, and proof lemmas. Keep a human or policy review for semantic adequacy. The paper reports that neither BLEU nor compilation success correlates well with human evaluation of autoformalized statements (Section 4.2, p. 13). Passing the checker is therefore insufficient to evaluate translation fidelity.

evidence and limits: reporting Wu et al., the authors write: “With the same model, about 30% accuracy was achieved in formalizing competition-level math statements, while over 70% accuracy was achieved in informalizing even more challenging undergraduate-level math problems.” (Section 3.1, p. 9). The denominators are not specified in this paper. Formalization can require retrieving or inventing definitions, rather than merely matching text patterns (Section 4.2, pp. 13–14).

## technique 3: neural theorem proving with tactic generation and search

what it is: generate formal proof steps (tactics) and search the resulting proof tree. Figure 4's architecture has a tactic generator and a proof-search algorithm; candidate tactics transform a goal into subgoals until no goals remain (Section 2.2, pp. 6–7).

how to do it: Inference:

1. represent the current formal goal and local context
2. ask a model to propose one or more tactics
3. apply each tactic in the proof assistant; discard candidates that fail
4. expand promising proof states using breadth-first search, best-first search, or Monte Carlo tree search (MCTS); the paper discusses learned value models as one way to prioritize goals (Section 4.2, p. 15)
5. stop when the checker closes all goals, and retain the checked proof artifact

Verus form. Inference: treat each Verus diagnostic state as a search node; let an agent propose `assert`, invariant, or lemma steps; run Verus after candidate edits and retain useful intermediate states until the complete proof checks. An incomplete intermediate proof can still have unresolved obligations. Bound search by time and proof size, and pin the toolchain. Verus proofs are source files rather than Lean tactics, so the adapter must preserve Rust context and avoid treating a proof function as runtime code.

evidence and limits: theorem proving in sufficiently expressive systems is undecidable (Section 3.2, p. 9), so search is heuristic. The survey names breadth-first, best-first, and MCTS but gives no common benchmark denominator. It notes whole-proof generation can have lower latency than search, while systematic evidence comparing them was unavailable (Section 4.2, p. 15).

## technique 4: expert iteration and learning from mistakes

what it is: alternate proof attempts with model training on newly checked proofs, and include verifier error messages and selected failed predictions in subsequent prompts. The paper defines expert iteration: “In the context of theorem proving, expert iteration consists of alternating between (a) attempting a set of unsolved problems, and (b) finetuning the model using new training data produced during the first phase.” (Section 3.2, pp. 9–10).

how to do it: Inference:

1. choose unsolved formal goals
2. run theorem-proving search and retain proofs accepted by the formal environment
3. add accepted proofs to training data and fine-tune or update the prover
4. repeat on remaining goals; separately store useful error messages and failed predictions as in COPRA (Section 3.2, pp. 9–10)
5. measure gains after each iteration and detect diminishing returns

Verus form. Inference: log each agent attempt, Verus error, repaired proof, and toolchain version. Add only proofs whose contracts passed review and whose Verus run is reproducible; use failures as retrieval examples rather than silently weakening specifications. A Verus CI job can check proof acceptance; that result alone does not establish that a contract captures the requirement.

evidence and limits: the paper reports improvements from expert iteration in cited systems, including AlphaProof, and adds: “However, gains tend to diminish after a few iterations.” (Section 3.2, p. 10). COPRA uses a memory of incorrect predictions, yet the paper notes that many mistakes create unproductive paths without immediate failure; error messages therefore do not cover all failure modes.

## technique 5: library learning and premise retrieval

what it is: retrieve definitions and lemmas from a changing formal library before proof generation, and learn reusable lemmas or tactics from prior proofs. Premise selection identifies likely useful library items; retrieval-augmented generation places them in the model context (Section 3.2, p. 10).

how to do it: Inference:

1. index theorem statements, definitions, proof metadata, and trusted versions
2. for a target goal, retrieve candidate premises using symbolic or learned premise selection
3. give the candidates and local context to the proof generator
4. generate and check a proof; record newly useful lemmas
5. evaluate on a “new premises” split in which test theorems require at least one premise unseen during training (Section 3.2, p. 10)

Verus form.

evidence and limits: LeanDojo/ReProver and COPRA are cited examples, and the paper describes the “new premises” split as closer to real use cases involving recently proved lemmas (Section 3.2, p. 10). No single accuracy number is reported here. Retrieval cannot repair a missing or wrong specification.

## technique 6: synthetic and multilingual formal data

what it is: generate training problems and proofs from formal axioms, autoformalize informal sources, and transfer knowledge across Lean, Coq, Isabelle, and code. Checked proofs can supply training data; the multilingual and cross-framework approaches include proposed directions, rather than established general solutions (Section 4.1, pp. 12–13).

how to do it: Inference:

1. generate conjectures from axioms or autoformalize existing informal statements (Section 4.1, pp. 12–13)
2. generate candidate proofs with expert iteration or search
3. retain only checker-accepted theorem/proof pairs
4. mix languages or translate formal artifacts across frameworks, tracking semantic equivalence
5. train and evaluate on domains and premise sets held out from training

Verus form. Inference: synthesize small Rust/Verus components from explicit contracts, run Verus, and retain passing code plus diagnostics. Use cross-language transfer only for ideas; Lean/Coq proof terms cannot be assumed to prove Rust behavior. A Verus-specific corpus should include failed proofs and repaired invariants with their denominators and environment.

evidence and limits: the paper reports that Proof Pile aggregated six formal languages and “collected only 500MB of formal proofs.” (Section 4.1, p. 12). It also states: “Autoformalization and synthetic data generation were combined in AlphaProof [7], which autoformalized one million IMO-like informal problems into one hundred million formal theorems, whereas proofs were synthetically generated in an expert iteration loop.” (Section 4.1, p. 13). These are cited system counts. Generalizing beyond domains with abundant human-written problems remains open. Translation across formal proof frameworks is described as relatively unexplored, and multilingual formal models are proposed as an opportunity (Section 4.1, p. 13).

## technique 7: formal verification and verified code generation

what it is: combine AI code generation with theorem proving, model checking, or a verification-friendly language. The paper lists two routes: develop a verified artifact in Coq/Lean then compile it to an efficient lower-level implementation, or incorporate code and proof generation into Dafny or Verus (Section 3.4, pp. 11–12). It also identifies transpilation, where source code is treated as a complete specification and target code must be equivalent (Section 3.4, p. 12).

how to do it: Inference:

1. write or derive formal correctness and security requirements
2. generate implementation and proof obligations together, or generate a verified high-level artifact first
3. run the formal checker and repair code/specification/proof failures
4. if transpiling, prove source-target equivalence and retain the source as the specification; testing alone does not establish equivalence
5. release only checked artifacts with their trusted assumptions and tool versions

Verus form.

evidence and limits: the survey reports that LLM-generated code can be buggy and insecure and cites work finding more vulnerabilities than human-written code (Section 3.4, p. 11), but gives no common denominator. Inference: the guarantee applies to the properties encoded by the specification and the system model, subject to the verification tool’s assumptions.

## techniques for the catalog

- checker-guided formalization — translate requirements, run a formal checker, and repair from diagnostics
- tactic generation and proof search — generate proof steps and explore a checked proof tree
- expert iteration — train on newly verified proofs and measure diminishing gains
- mistake memory — feed verifier errors and selected failed attempts back to the prover
- premise retrieval — retrieve definitions and lemmas, including unseen premises at test time
- synthetic formal data — generate and retain checker-accepted conjecture/proof pairs
- verified code generation — generate code with contracts and proofs, then check the artifact
