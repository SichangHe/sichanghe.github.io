# AI Agent Swarms as Researchers: Progress, Challenges, and Open Questions
(authored by agents unless marked 🧑)
Tag: `gusev2026swarms`, [paper](http://arxiv.org/abs/2609.35719v1)

## what the paper proves or measures

Gusev and Bernal Neira describe a large agent-swarm experiment rather than a new verifier. They gave agent groups a scientific scope, papers, software, solvers, and a standing request to make useful progress without stopping. The central observation is a review bottleneck: “The agents produced candidate results faster than we could assess their correctness, novelty, and usefulness.” (Section 1, p. 3). The corpus contains notes, paper drafts, code, formal proofs, and experimental proposals across five theoretical areas and catalysis. The paper is explicit that much remains unchecked: “Some of it may be wrong, and some of it may turn out not to be new; we do not know yet, because we have not checked all of it.” (Section 1, p. 3).

The formal-verification lessons are procedural. The authors require a strongest available check for each result: formal proof for mathematical claims, rerun or independent computation for numerical claims, and fresh-agent review in every case. Some claims were proved in Lean, but the authors had not yet checked that every Lean statement matched its paper claim. Their numbers are corpus counts, not proof-quality rates: 45 potential papers (22 drafts), eight proposed catalysis programs, and Lean proofs for selected claims (Table 1, pp. 16–17). The denominator for “selected claims” is not supplied.

## technique 1: scope, resources, and a non-stopping swarm

what it is: launch many agents with freedom to choose problems and methods, while making the process itself explicit. The procedure has three parts: define a broad or narrow problem, provide papers/tools and permission to obtain more, and ask for progress without stopping (Section 4.1, pp. 13–14).

when to use: use this for exploratory formal-verification work where the human cannot enumerate all useful lemmas, benchmarks, or related papers. The scope can be a conjecture, topic, named researcher’s interests, or whole field.

how to do it:

1. State what is in scope, what is excluded, and the priorities; leave agents free to explore ideas (Section 4.1, p. 13)
2. Provide a literature collection, permission to search, formal tools, solvers, licenses, computers, and software (Section 4.1, p. 14)
3. State a stopping criterion for a closed problem; otherwise say there is no stopping point (Section 4.1, p. 14)
4. Require every result to have independent fresh-agent review and the strongest field-appropriate check; retain negative and small findings (Section 4.1, p. 14)
5. Continue after a publishable result and write papers or formal proofs only when the run's budget permits (Sections 4.1 and 4.3, pp. 14–16)

The paper's exact instruction is: “Ask for every result to be verified in the strongest form the field allows: a formal proof where the claim is mathematical, a rerun or an independent computation where it is numerical, and a fresh-agent review in every case.” (Section 4.1, p. 14).

Verus form: Inference: give a Rust/Verus swarm a repository with a fixed trusted specification, a bounded task scope, and permission to add proof bodies, `assert` hints, loop `invariant` clauses, and new `proof fn` lemmas. Require every candidate to run Verus and preserve the original `requires`/`ensures`; let a fresh agent review the diff without the producer's context. This is orchestration, not a Verus theorem. The paper's unrestricted installation and machine access do not carry over safely to a product without isolation and credential limits.

evidence and limits: the run produced 45 potential papers and eight programs in a few weeks, using subscription access reported as $800/month and a rough metered-equivalent estimate above $15,000 for the first four weeks (Section 4.2, p. 15). The cost is access pricing, not machine cost, and is not a controlled comparison. Inference: swarm breadth increases candidate coverage and review load together; it does not establish that the candidates are correct or novel.

## technique 2: independent fresh-agent review and correction loops

what it is: every result receives review by an agent with no shared memory of its production, and issues found must be corrected in both new and existing results. The authors used two providers together so one provider's agents could review the other's work (Section 4.2, p. 15).

when to use: use this when one agent can generate a formal proof, benchmark, or specification faster than the same person can inspect it. Fresh context reduces direct self-approval, though it does not guarantee independent errors.

how to do it:

1. Save the candidate, its assumptions, code, proof files, and prior checks (Section 4.1, p. 14)
2. Start a reviewer with no memory of the producer's reasoning and provide only the claim and artifacts (Section 4.1, p. 14)
3. Ask it to check correctness, novelty, usefulness, and the strongest mechanical evidence available (Sections 4.1 and 5.2, pp. 14 and 22)
4. Feed every issue back to agents; correct the artifact and rerun the checks (Section 4.1, p. 14)
5. Keep the negative result or small finding instead of deleting it (Section 4.1, p. 14)

Verus form: Inference: run a second agent against a clean checkout containing the same Rust code and contracts. It may edit only candidate proof code or add lemmas; a CI job must run Verus from scratch and store diagnostics. The reviewer must not be allowed to weaken a contract or add `external_body` to the function under verification. The paper's claim that independent providers reduce correlation is a design rationale, not a measured independence guarantee.

evidence and limits: The paper says every result had at least one fresh-agent review, but it also says human review was incomplete and gives no reviewer sensitivity, false-accept, or false-reject denominator. It reports that errors, including major ones, were found and corrected by agents before human inspection (Section 5.1, p. 21), but no independently sampled error rate is given. Inference: fresh review is a repeatable filter, not a soundness proof; similar models can share blind spots.

## technique 3: three levels of evidence for formal claims

what it is: the paper separates mechanical checking, agent judgment, and human judgment. Mechanical evidence includes proof checking, rerunning a computation, and automated tests. The authors state: “A formal proof in Lean, or a numerical certificate (a file of evidence that a separate program can check) replayed in exact arithmetic, is the strongest form: if it relies on no unproved assumptions, nobody needs to read it to know that it is valid.” (Section 5.2, p. 22).

when to use: use mechanical evidence whenever the claim can be expressed as a proof, replayable certificate, deterministic computation, or test. Use agent and human review for statement meaning, novelty, usefulness, and physical-experiment interpretation.

how to do it:

1. Formalize a mathematical claim in a proof assistant or produce a separately checkable numerical certificate (Section 5.2, p. 22)
2. Replay the proof/certificate with the checker or rerun the computation from released code and data (Section 5.2, p. 22)
3. Audit that the formal statement and definitions express the paper's intended claim; a checker alone cannot answer that (Sections 4.4 and 5.2, pp. 18 and 22)
4. Use fresh-agent judgment for argument, prior work, and importance, then use human judgment where field policy requires it (Section 5.2, p. 22)
5. Publish the claim together with its checks and what remains unchecked (Section 5.2, p. 23)

Verus form: Inference: treat successful Verus verification as level-one mechanical evidence for the exact Rust contracts and body submitted. Keep the contract text, toolchain, solver version, and proof artifact. A separate agent should check that `ensures` expresses the intended behavior and that external interfaces are not silently assumed. Verus does not certify the natural-language requirement, model adequacy, or runtime behavior outside the verified boundary.

evidence and limits: Some corpus claims have Lean proofs, but the authors had not checked that the Lean statements match the drafts (Section 4.4, p. 18). Thus the evidence establishes that the formal statements are proved, not yet that they prove the advertised scientific claims. Inference: this distinction is exactly the specification gap a verified-Rust product must expose.

## technique 4: statistical audit of agent review

what it is: when production exceeds item-by-item human review, sample accepted claims, have experts check the sample, publish the error rate, and repeat after model changes. The paper calls this statistical quality control and recommends sequential sampling (Section 5.2, p. 23).

how to do it:

1. Define the population of claims accepted by the mechanical-plus-agent pipeline (Section 5.2, p. 23)
2. Draw a random sample and have domain experts independently check it (Section 5.2, p. 23)
3. Record false acceptance and false rejection, publish denominators and the model/date (Section 5.2, p. 23)
4. Repeat the audit after model, prompt, verifier, or library changes (Section 5.2, p. 23)
5. Add reviewers only when their errors are sufficiently independent; similar-model panels can miss the same errors (Section 5.2, p. 23)

Verus form: Inference: sample Verus-accepted patches stratified by obligation type, contract size, unsafe/FFI boundary, and solver time. Have an expert check whether the specification matches the intended API and whether the proof depends on trusted assumptions. Publish accepted/incorrect counts and tool versions. This validates the pipeline's quality; it cannot prove an individual contract's intent.

evidence and limits: The paper proposes the method but does not perform such a quantified audit of its own corpus. It reports that nine model judges can be worth about two independent votes from one cited study, but that number is external evidence, not a result of this experiment (Section 5.2, p. 23). Inference: audit rates must be measured for the particular Verus models and task distribution rather than borrowed from general agent-judge studies.

## technique 5: build and reuse formal libraries

what it is: formalize established results so later agent work can compose checked lemmas instead of repeatedly trusting prose. The paper reports Lean formalizations of adsorption theories, high-energy physics, kinetic theory, and a corrected proof of a published quantum result (Section 5.2, p. 23).

when to use: use this where many new claims depend on recurring algebra, physical assumptions, data structures, or API contracts. Formal libraries make assumptions explicit and expose gaps in old results.

how to do it:

1. Select a stable established result and formalize its definitions and assumptions (Section 5.2, p. 23)
2. Prove the result in the proof assistant and record the checker/library versions (Section 5.2, p. 23)
3. Audit that the formal statement models the scientific meaning and system boundary (Sections 4.4 and 5.2, pp. 18 and 23)
4. Reuse the checked theorem as a dependency for new work, with explicit assumptions (Section 5.2, p. 23)

Verus form: Inference: turn recurring Rust API contracts, representation invariants, arithmetic lemmas, and memory/provenance relations into reviewed Verus modules. Expose reusable `spec fn`s and `proof fn`s, preserve their `requires`/`ensures`, and keep unsafe or FFI assumptions in a separate audited boundary. A library theorem remains conditional on its stated model and trusted bodies.

evidence and limits: The paper argues that formal verification can extend to engineering and physical science but notes that most such fields lack mature checked libraries (Section 5.2, p. 23). It supplies examples, not a coverage or defect-rate denominator. Inference: library growth can reduce repeated proof effort but can also propagate a wrongly formalized specification widely.

## trusted boundary, contradictions, and product threat

The paper measures output volume, cost estimates, review backlog, and selected Lean status. It does not establish that all 45 potential papers are correct, novel, or useful. It explicitly says its “finding no error” in checked material does not show that none remains (Section 4.4, p. 18). The strongest evidence is mechanical checking of an exact formal statement; the remaining trust problem is whether that statement matches the claim and assumptions.

Inference: VL should reuse the paper's three-level evidence model, fresh-context review, independent-provider review where practical, replayable proof artifacts, and statistical audits with denominators. VL should not redo the generic observation that LLMs can draft proofs; it should measure Verus acceptance, specification mismatch, trusted-boundary defects, and reviewer error on a fixed task population. The threat to agent-written verified Rust is high at specification meaning and external interfaces, moderate at proof search, and lower for a precisely stated body accepted by a reproducible Verus toolchain. These are inferences from the paper's evidence structure, not measurements in the paper.

## techniques for the catalog

- open-ended swarm orchestration — define scope, provide literature/tools, and let many agents pursue and review candidate results without a fixed stopping point
- fresh-agent verification loop — require context-independent review, correction, and rerunning of each artifact
- three-level evidence — combine mechanical proof or replayable computation with agent judgment and selected human judgment
- statistical review audit — sample accepted claims, publish error rates and denominators, and repeat after model changes
- formal library building — encode established results and assumptions in a checker so later work composes trusted lemmas
Checked 2026-10-14 against the paper by a Codex agent: audit record gusev2026swarms; compared the full paper and study, corrected metadata where needed, and did not rerun the experiments
