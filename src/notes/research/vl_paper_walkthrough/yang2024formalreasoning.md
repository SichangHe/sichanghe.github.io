# Formal Mathematical Reasoning: A New Frontier in AI
(authored by agents unless marked 🧑)
Tag: `yang2024formalreasoning`, [paper](https://doi.org/10.48550/arxiv.2412.16075)

## scope and status of claims

Yang, Poesia, He, Li, Lauter, Chaudhuri, and Song survey AI for formal mathematical reasoning and argue for combining language models with proof assistants and other formal systems. They define the subject as reasoning grounded in systems with syntax and explicit inference rules, and write: “A formal environment can guarantee the soundness of reasoning, provide automatic feedback, and check if the goal has been achieved.” (Section 2.2, p. 5). This is a position and survey paper, not a new verifier or a single controlled experiment. Its numbers are reported results from cited work and must retain the cited work's setting.

Inference: the paper's direct relevance to VL is architectural: agent-written Rust/Verus should be generated inside a feedback loop whose final artifact is checked by Verus. The survey does not establish that LLMs can reliably write Verus proofs or that formal checking validates an inadequate specification.

## technique 1: formalize specifications before proving code

what it is: translate an informal requirement into a formal theorem or program specification, then use a proof assistant or model checker to check it. In formal mathematics, statements and proofs are programs/types under Curry–Howard; in software verification, one states correctness and security assertions and proves them.

when to use: use this whenever natural-language requirements are ambiguous or generated code must have an executable correctness oracle. The survey says that formal verification first specifies “the correctness and security requirements of a system as formal assertions,” then uses theorem proving or model checking (Section 3.4, p. 11).

how to do it:

1. identify entities, states, inputs, outputs, and assumptions in the informal requirement (Sections 2.2 and 4.2, pp. 5, 13)
2. define them in the target formal language and retrieve existing definitions where possible (Section 4.2, p. 13)
3. state the theorem or contract, separating preconditions from the desired postcondition
4. invoke the checker; use counterexamples or failed goals to revise the formalization
5. only then generate or verify executable code against that formal statement (Section 3.4, p. 11)

Verus form. Inference: turn the requirement into Rust function `requires` and `ensures`, `spec fn` predicates, and loop invariants, using `proof fn` lemmas for intermediate facts. This is an inference because the survey names Dafny and Verus but does not prescribe Verus syntax. The specification must be reviewed separately: a passing Verus proof establishes the written contract, not that the contract captures the product requirement.

evidence and limits: the paper cites seL4 verification as requiring “more than 20 person-years of intricate engineering work” (Section 3.4, p. 11). This is a cited case, not a denominator for all verification. Formalization itself can be wrong; the survey notes that syntactically similar formal statements can have opposite meanings (Section 4.2, p. 13).

## technique 2: autoformalization with checker feedback

what it is: translate informal mathematics, prose requirements, or code into formal statements and optionally proofs, then use the formal environment to reject or refine translations. The survey describes autoformalization as taking informal mathematics and translating it into formal theorems and proofs (Section 2.2, p. 6).

how to do it:

1. supply the model with the informal statement and retrieved definitions or few-shot examples (Section 3.1, pp. 9–10)
2. generate a formal statement, and if needed an informal proof sketch or formal proof attempt
3. compile/check the statement and proof in Lean, Coq, Isabelle, or the target verifier
4. feed failed goals, counterexamples, and diagnostics back to the model
5. break hard statements into definition retrieval, statement generation, and proof completion; iterate until the formal checker accepts (Section 4.2, pp. 13–14)

Verus form. Inference: have an agent produce a Rust/Verus contract draft, run `verus` as the oracle, and use diagnostics to repair syntax, missing invariants, and proof lemmas. Keep a human or policy review for semantic adequacy. The paper warns that compile success is not aligned with human quality, so acceptance alone should not be the only metric.

evidence and limits: Wu et al.'s cited result reached about 30% accuracy for formalizing competition-level statements and over 70% for informalizing harder undergraduate problems (Section 3.1, p. 9); the denominators are not specified in this survey. The paper also reports that AlphaProof autoformalized one million IMO-like problems into one hundred million formal theorems (Section 4.1, p. 12), a cited system-specific count, not a general accuracy rate. It notes that formalization can require inventing definitions and is therefore more than translation.

## technique 3: neural theorem proving with tactic generation and search

what it is: generate formal proof steps (tactics) and search the resulting proof tree. Figure 4's architecture has a tactic generator and a proof-search algorithm; candidate tactics transform a goal into subgoals until no goals remain (Sections 2.2 and 3.2, pp. 5, 9).

how to do it:

1. represent the current formal goal and local context
2. ask a model to propose one or more tactics
3. apply each tactic in the proof assistant; discard candidates that fail
4. place resulting subgoals in breadth-first, best-first, or MCTS search, selecting expansion order with a policy/value model (Section 3.2, p. 9; Section 4.2, p. 14)
5. stop when the checker closes all goals, and retain the checked proof artifact

Verus form. Inference: treat each Verus diagnostic state as a search node; let an agent propose `assert`, invariant, or lemma steps; run Verus after every candidate and retain only verified branches. Bound search by time and proof size, and pin the toolchain. Verus proofs are source files rather than Lean tactics, so the adapter must preserve Rust context and avoid treating a proof function as runtime code.

evidence and limits: theorem proving in sufficiently expressive systems is undecidable (Section 3.2, p. 9), so search is heuristic. The survey names breadth-first, best-first, and MCTS but gives no common benchmark denominator. It notes whole-proof generation can have lower latency than search, while systematic evidence comparing them was unavailable (Section 4.2, p. 14).

## technique 4: expert iteration and learning from mistakes

what it is: alternate proof attempts with model training on newly checked proofs, and include verifier error messages and selected failed predictions in subsequent prompts. The survey defines expert iteration as alternating “(a) attempting a set of unsolved problems, and (b) finetuning the model using new training data produced during the first phase.” (Section 3.2, p. 9).

how to do it:

1. choose unsolved formal goals
2. run theorem-proving search and retain proofs accepted by the formal environment
3. add accepted proofs to training data and fine-tune or update the prover
4. repeat on remaining goals; separately store useful error messages and failed predictions as in COPRA (Section 3.2, pp. 9–10)
5. measure gains after each iteration and detect diminishing returns

Verus form. Inference: log each agent attempt, Verus error, repaired proof, and toolchain version. Add only proofs whose contracts passed review and whose Verus run is reproducible; use failures as retrieval examples rather than silently weakening specifications. A Verus CI job can be the acceptance oracle, but no training loop can infer whether a contract is adequate.

evidence and limits: the survey says expert iteration improved formal theorem proving in cited systems, including AlphaProof, but “gains tend to diminish after a few iterations” (Section 3.2, p. 9). COPRA uses a memory of incorrect predictions, yet the paper notes that many mistakes create unproductive paths without immediate failure; error messages therefore do not cover all failure modes.

## technique 5: library learning and premise retrieval

what it is: retrieve definitions and lemmas from a changing formal library before proof generation, and learn reusable lemmas or tactics from prior proofs. Premise selection identifies likely useful library items; retrieval-augmented generation places them in the model context (Section 3.2, pp. 10–11).

how to do it:

1. index theorem statements, definitions, proof metadata, and trusted versions
2. for a target goal, retrieve candidate premises using symbolic or learned premise selection
3. give the candidates and local context to the proof generator
4. generate and check a proof; record newly useful lemmas
5. evaluate on a “new premises” split in which test theorems require at least one premise unseen during training (Section 3.2, p. 10)

Verus form. Inference: index VL's verified lemmas by names, predicates, types, and dependency versions; retrieve contracts and `proof fn` lemmas before generation. Require exact source and toolchain hashes, because a lemma that moved or changed assumptions can invalidate an agent's proof. Measure both proof success and unwanted context growth.

evidence and limits: LeanDojo/ReProver and COPRA are cited examples, and the survey identifies “new premises” as closer to real formalization than random splits (Section 3.2, p. 10). No single accuracy number is reported here. Retrieval cannot repair a missing or wrong specification.

## technique 6: synthetic and multilingual formal data

what it is: generate training problems and proofs from formal axioms, autoformalize informal sources, and transfer knowledge across Lean, Coq, Isabelle, and code. Formal systems provide mechanically checked labels, allowing a data flywheel.

how to do it:

1. generate conjectures from axioms or autoformalize existing informal statements (Section 4.1, pp. 12–13)
2. generate candidate proofs with expert iteration or search
3. retain only checker-accepted theorem/proof pairs
4. mix languages or translate formal artifacts across frameworks, tracking semantic equivalence
5. train and evaluate on domains and premise sets held out from training

Verus form. Inference: synthesize small Rust/Verus components from explicit contracts, run Verus, and retain passing code plus diagnostics. Use cross-language transfer only for ideas; Lean/Coq proof terms cannot be assumed to prove Rust behavior. A Verus-specific corpus should include failed proofs and repaired invariants with their denominators and environment.

evidence and limits: Proof Pile aggregated proofs from six formal languages but contained only 500 MB (Section 4.1, p. 12). AlphaProof is reported to have autoformalized one million IMO-like problems into one hundred million formal theorems, with synthetic proofs from expert iteration (Section 4.1, p. 12). These are cited system counts; the survey says generalization beyond domains with abundant human problems remains open.

## technique 7: formal verification and verified code generation

what it is: combine AI code generation with theorem proving, model checking, or a verification-friendly language. The survey lists two routes: prove in Coq/Lean then translate to efficient code, or generate code and proofs directly in Dafny or Verus (Section 3.4, p. 11). It also identifies transpilation, where source code is treated as a complete specification and target code must be equivalent.

how to do it:

1. write or derive formal correctness and security requirements
2. generate implementation and proof obligations together, or generate a verified high-level artifact first
3. run the formal checker and repair code/specification/proof failures
4. if transpiling, prove or test source-target equivalence and retain the source as the specification
5. release only checked artifacts with their trusted assumptions and tool versions

Verus form. Inference: this is VL's direct pattern: agent writes Rust plus Verus contracts and proof functions; `verus` checks the result; CI reruns it after dependency/toolchain changes. Keep external libraries, unsafe code, compiler, solver, and specification adequacy in the trusted boundary. The paper's argument supports coupling generation to verification but does not measure Verus agents.

evidence and limits: the survey reports that LLM-generated code can be buggy and insecure and cites work finding more vulnerabilities than human-written code (Section 3.4, p. 11), but gives no common denominator. Formal verification reduces the class of checked errors only when the model and specification cover them; it does not certify the whole product automatically.

## what should and should not be redone for VL

The survey establishes no new theorem about Verus, no benchmark of agent-written Rust, and no universal accuracy or speed claim. It does provide a catalog of workflows: formalize requirements, retrieve premises, generate proof steps, search with checker feedback, learn from accepted proofs and failures, and retain reproducible artifacts. Trusted components remain the formalizer's interpretation, the specification, verifier implementation, solver, compiler, and external code.

Inference: the threat to VL is high if agents are allowed to treat compiling code or plausible prose as evidence; it is lower when every claim reaches Verus and the contract is reviewed. VL should not redo the survey's general history or cited theorem-prover benchmarks. A concrete gap is a Verus-specific evaluation with contract-quality review, new-premise splits, pinned toolchains, and counts for accepted proofs, false specifications, repair effort, and missed unsafe behavior.

## techniques for the catalog

- checker-guided formalization — translate requirements, run a formal checker, and repair from diagnostics
- tactic generation and proof search — generate proof steps and explore a checked proof tree
- expert iteration — train on newly verified proofs and measure diminishing gains
- mistake memory — feed verifier errors and selected failed attempts back to the prover
- premise retrieval — retrieve definitions and lemmas, including unseen premises at test time
- synthetic formal data — generate and retain checker-accepted conjecture/proof pairs
- verified code generation — generate code with contracts and proofs, then check the artifact
Checked 2026-10-15 against paper yang2024formalreasoning: full comparison completed; metadata and unsupported claims reviewed; experiments not reproduced
