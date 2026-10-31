# Humanize Olympiad Agents: A Multi-Session Workflow for Olympiad Problem Solving with Solve, Review, Wiki, Verify
(authored by agents unless marked 🧑)
Tag: `zhang2026humanize`, [paper](https://arxiv.org/abs/2610.13632)

source: Zhengyang Zhang, Jing Xiong, Hongzhou Lin, Juihui Chung, Zijian Zhang, Song Han, Sihao Liu, Ligeng Zhu, arXiv:2610.13632v1 (9 Oct 2026), a preprint of 15 pages; the appendix is one page of placeholders. The system is called HOA. Page numbers are PDF pages.

## what is claimed, what is measured, what is trusted

HOA is a controller above a coding-agent command-line tool (Codex). It runs several agent sessions on one problem: a worker that builds a candidate, a reviewer that reads the finished candidate, a lookup store ("wiki"), and a checker. The paper's one-sentence definition of its contribution: “We propose HOA (Humanize Olympiads Agent), whose new contribution is an artifact-centered acceptance protocol that routes structured knowledge retrieval, independent semantic review, and task-specific objective verification through a shared worker–reviewer repair loop and accepts a candidate only after all applicable gates pass.” (Section 1, p.2)

Three failure modes of a single session motivate it (Section 1, p.1): a false intermediate claim spreads; a missing fact cannot be reasoned into existence; and “Third, an agent may misread a requirement or weaken a goal—for example, by proving a nearby statement or testing convenient cases—and appear to succeed without solving the original task.” (p.1–2) The paper calls the third “problem misunderstanding and reward hacking”.

Measured (Table 1, p.7): with GPT-5.6 Sol, 672/672 on the Lean subset of PutnamBench, 251/304 on Lean-Eval, 6/6 on formalized IMO 2026 problems, and competition scores on IPhO, IChO and IOI 2026.

Trusted, for the Lean results: the Lean kernel, the Comparator tool, and the challenge statements, which other parties wrote (the IMO statements are “Axiom Math’s formalized versions of the six IMO 2026 problems”, Section 4.1, p.6; part of a sentence). The paper is explicit that the last item is outside the proof: “Comparator verifies agreement with trusted Lean statements, but this guarantee depends on the correctness and fidelity of those formalizations.” (Limitations, p.10) For physics and chemistry scores the trusted party is a language-model grader whose grades human reviewers check, not a proof checker (Section 4.1, p.6).

Inference: the paper is a system description with headline numbers. It has no algorithm listing, no prompts, no per-problem results and no cost figures. The appendix (p.15) says per-problem outcomes, confidence intervals, and token and tool distributions will come in a later version; the reproducibility statement (p.10) says the supplement holds the prompts. What can be learned is the acceptance protocol.

## technique 1: the worker–reviewer loop over a frozen artifact

what it is: two agent sessions with different information. The worker builds and repairs. The reviewer sees only the result and decides. Neither can do the other's job.

when to use: tasks long enough that one session's early mistake or self-serving reading of the task survives to the end.

how it is done (Section 3.2, p.5):
1. round 1: the worker receives the problem, task instructions, tools and acceptance criteria, and produces a candidate artifact
2. the candidate is frozen: “It does not see the worker’s hidden reasoning or conversation history, and the candidate remains read-only during review.” (p.5), said of the reviewer
3. the reviewer receives exactly four things: “The reviewer receives the original problem, candidate artifact, acceptance plan, and a runner-generated summary of the current round.” (p.5)
4. the reviewer returns findings, not fixes; each finding follows the record of Appendix A.2 (p.15): a verdict `accept | revise`, and per finding a `location` (artifact span), `type` (error category), `evidence`, and `request` (the minimal repair asked for)
5. later rounds: the worker receives the current artifact, the reviewer's findings and the verifier's diagnostics, and “must address every reported issue” (p.5; part of a sentence)
6. stop: “The loop ends when the reviewer declares the candidate complete or the run reaches its resource limits.” (p.5)

Two rules that make it a protocol and not a chat between agents:
- the worker cannot self-certify: “It may call the verifier for immediate machine feedback, but it cannot accept its own output or bypass review.” (p.5)
- the reviewer sees no worker reasoning and cannot edit the candidate: “This separation reduces anchoring and prevents silent repairs.” (p.5)

A third rule, for disputes (Appendix A.2, p.15): “When a worker disputes a finding, the evidence and final adjudication remain in the log.” Who adjudicates is not stated.

Verus form (Inference: the paper is about Lean and competition answers, not Verus). The artifact is the Rust file with its Verus annotations. The reviewer session gets the original task text, the trusted specification, the frozen file, and the runner's summary (Verus exit status, counts of errors), and none of the worker's transcript. Its findings point at spans: a `requires` that is stronger than the task allows, an `ensures` that is weaker, a `spec fn` that does not say what the prose says, an `assume`, an exec function left `#[verifier::external_body]`. The finding record of A.2 can be used as is. What does not carry over: nothing; the loop does not depend on the proof language.

evidence: Table 3 (p.8), 50-problem subsets, solved counts at three levels (direct API call, command-line agent, full loop). PutnamBench subset: GPT-5.6 Sol 3, 46, 50; Kimi-K3 1, 4, 47; GLM-5.3 0, 2, 25; DeepSeek V4 Pro 0, 4, 13. Physics Cup subset: GPT-5.6 Sol 31, 41, 44; Kimi-K3 35, 37, 42; GLM-5.3 24, 34, 40; DeepSeek V4 Pro 32, 35, 39. All are out of 50. The paper adds: “The PutnamBench results for these configurations remain provisional.” (Section 4.4, p.8)

Figure 3 (p.9) splits the same PutnamBench subset into four levels for two models: API call (Kimi-K3 1, GPT-5.6 Sol 3), Codex with /Goal (4, 46), plus wiki and verifier without the loop (21, 49), plus the loop (47, 50). Inference: for Kimi-K3 the wiki and verifier add 17 problems and the review loop a further 26; for GPT-5.6 Sol the loop adds 1. The loop matters most where the base model is weaker.

limits: no count of rounds per problem, no rate of wrong reviewer findings, no rate of wrong acceptances. The paper says so: “Finally, the current experiments do not isolate every component interaction or fully characterize reviewer false positives and false acceptances.” (Limitations, p.10) The loop and the single-agent baseline did not get equal compute: “In particular, longer multi-session runs consume more computation than a single-agent baseline.” (p.10)

## technique 2: two separate gates, one for meaning and one for a machine check

what it is: acceptance needs both a reviewer verdict and a tool verdict, and the two are not allowed to stand in for each other.

when to use: a machine check exists for part of the requirement only. A proof checker says a theorem is proved; it does not say the theorem is the one that was asked.

how it is done (Section 3.1, p.4; Section 3.5, p.6):
1. name the machine-evaluable condition for the task type: for Lean, Comparator accepts; for code, tests the agents write and run for answer and time limit
2. let both worker and reviewer call the tool at will; keep its exit status and log as evidence held by the runner, not by an agent: “Its exit status and diagnostic log are retained as runner evidence.” (p.6)
3. a tool failure blocks acceptance whatever the reviewer thinks: “When verification fails, the calling agent receives the diagnostic summary, and the candidate cannot be accepted.” (p.6)
4. for mathematical tasks, the reviewer runs the tool on the unchanged candidate before accepting (Section 1, p.2)
5. the reviewer keeps the part the tool cannot do: “The reviewer remains responsible for detecting reward hacking and problem misunderstanding; the verifier checks whether the stated theorem is proven.” (p.6)

The division in the paper's words: “The verifier is an objective, task-specific tool rather than an agent in the loop.” (Section 3.5, p.6)

Verus form (Inference): gate A is a script, gate B is the reviewer session. Gate A: Verus reports no errors on a clean build of the frozen file; the script, not the agent, reads the exit status. Gate B: the reviewer compares specification and task. A product should record gate A's output outside the agents' reach, as the paper's runner does, so that an agent's report of "verified" is never the evidence.

evidence: none that isolates the gate split; Figure 3's third level adds wiki and verifier together.

## technique 3: check an untrusted proof against a trusted statement (Comparator)

what it is: the machine check for Lean. It is more than compiling the file.

when to use: the party that writes the proof is not the party that wrote the statement, and the prover may edit files.

how it is done; the paper gives the four steps in one sentence (Section 3.5, p.6): “Comparator builds the candidate in a sandbox, confirms that the submitted theorem matches the trusted challenge, restricts permitted axioms, and validates the exported proof with the Lean kernel.”
1. build the submission in a sandbox
2. compare the submitted theorem with the trusted challenge statement
3. allow only a fixed list of axioms
4. export the proof and re-check it with the kernel; in one reported run with two kernels, the default one and Nanoda (Section 4.5, p.9)

Why compiling is not enough: “These checks matter because a proof can compile while using a disallowed axiom (Vamshi & Yang, 2026).” (Section 2.3, p.4)

Comparator is a tool of the Lean FRO that the paper uses, not one it built. The same acceptance rule is used for the IMO problems, PutnamBench and Lean-Eval (Section 4.1, p.6).

Verus form (Inference; the steps below are not in the paper). The same four checks for agent-written verified Rust:
1. run Verus in a clean checkout that the agent cannot write to, with the trusted specification file taken from the task, not from the agent's copy
2. compare, token for token, the target function's signature, `requires`, `ensures`, and every `spec fn` those clauses reach, against the trusted version
3. reject any `assume(...)`, `admit()`, `assume_specification`, or `#[verifier::external_body]` that the task did not contain; these are Verus's counterparts of an added axiom
4. there is no step 4: Verus has no small kernel that re-checks an exported proof, so the trusted base stays Verus, its encoding, and Z3

What changes: step 2 is harder in Verus than in Lean, because an agent can keep `ensures` intact and change the meaning underneath by editing a `spec fn` or a `View` implementation it depends on; the comparison must follow those dependencies. Also to forbid: a `requires` added to a function the task's callers use, and `decreases *` or other opt-outs if the task demands termination.

evidence: every Lean number in the paper is under this rule. The paper reports no count of candidates that compiled and were then rejected by Comparator; Appendix A.3 lists a “Comparator confusion analysis” among results still to be reported.

## technique 4: a lemma store filled only from accepted proofs

what it is: after a problem is solved and accepted, an agent extracts its reusable lemmas into records; later workers query the store by need and get a few records back.

when to use: many related problems over one library, where a later proof would otherwise re-derive what an earlier one established.

how it is done (Section 3.3, p.5):
1. trigger: only after acceptance: “After a mathematical problem is solved and accepted, a curation agent extracts the main theorem and reusable intermediate lemmas from the Lean development.”
2. record: “Each record contains declaration names, Lean signatures, a short description, the source problem, required imports, source locations, and verification status.”
3. query: issued by the worker when it can name what is missing: “When the worker identifies a missing fact or method, it sends a focused query.”
4. answer: the retrieval layer searches the Lean declarations and “returns a small set of records with source identifiers” (p.5; end of a sentence)
5. use: the worker cites the record's source in the artifact and calls the declaration; it does not paste and re-prove

The paper's example (Section 4.5, p.9), a Lean trajectory on the tensor-square decomposition for G2 (the paper does not say which benchmark): the agent retrieved three records that had passed Comparator and review, and “The agent applied these Lean declarations directly when assembling the final theorem instead of reproducing their proofs.” The paper's reading: “This example shows how verified lemma records turn completed subproblems into typed, provenance-tracked building blocks for later formalization steps.” (p.9)

A second kind of store, for chemistry, is built before evaluation from textbooks, olympiad problems outside the test set and online references, as concept pages with sources (Section 3.3, p.5). No store was built for physics or programming.

Verus form (Inference): one record per accepted `proof fn`: its name and module path, its full signature with `requires` and `ensures`, a one-line description, the task it came from, the `use` lines needed, file and line, and whether it currently verifies. Three differences from Lean. A Lean theorem checked once stays checked for that library version; a Verus lemma's proof can stop verifying after a toolchain or solver change, so "verification status" needs a re-run date. A lemma about a `closed spec fn` or an `opaque` function is usable only where its contract is enough. And a lemma useful to the solver without being called can be offered through a `broadcast group`, which Lean has no counterpart for.

evidence: Figure 3's third level (wiki and verifier together): Kimi-K3 from 4/50 to 21/50, GPT-5.6 Sol from 46/50 to 49/50, on the first 50 PutnamBench problems. The wiki alone is not isolated. Appendix A.3 lists “wiki retrieval audits” as still to come.

limits (Inference): the paper does not say how the store was seeded for the 672 PutnamBench problems or the 304 Lean-Eval problems. If it is filled from problems of the same benchmark it is then used on, a benchmark score depends on the order of solving and is not a per-problem measure of the method.

## technique 5: formalize the statement first, review it, then freeze it

what it is: for problems given in prose and figures (physics), a separate pipeline writes the theorem statement, a reviewer checks it against the problem, and only then is a prover allowed near it.

when to use: no trusted formal statement exists and the same system must produce both statement and proof. This is the case closest to writing a specification for code.

how it is done (Section 3.4, p.5–6), with the Science Mango pipeline:
1. from the problem text and figures write a blueprint that separates “the physical laws, given values, results from earlier parts, and the claim to prove” (p.5; end of a sentence)
2. ground the blueprint in existing libraries by searching Mathlib and PhysLean through LeanExplore
3. write typed Lean declarations with `sorry` as proof bodies, keeping the roles and dimensions of physical quantities
4. where no library definition exists, add a small local abstraction that keeps the physical meaning
5. fallback: “If the model cannot write the physical laws as equations, it first produces a natural-language derivation and then autoformalizes that derivation.” (p.6)
6. review: “A physics reviewer compares the Lean statement with the original problem and rejects missing laws, omitted figure parameters, tautologies, and statements that assume the answer.” (p.6)
7. freeze: “Once the statement compiles and passes review, it is frozen.” (p.6)
8. prove: “The prover may fill the proof body but cannot weaken the statement; semantic errors return for redrafting.” (p.6)

One sentence in this section is unclear: “The target equation is withheld before being presented to agents for solving.” (p.6) Inference: it probably means the answer to be derived is not shown to the solving agent, but a theorem to be proved must state its conclusion, so how a withheld target and a frozen statement coexist is not explained.

The reviewer's four rejection classes are the reusable part. Inference: each has a direct counterpart in a program specification:
- missing laws: a postcondition that omits a required property
- omitted figure parameters: an input the specification never mentions
- tautologies: `ensures true`, or an `ensures` that follows from the `requires` alone
- statements that assume the answer: a `requires` that already states what should be established, or a specification that is a copy of the implementation

Verus form (Inference): step 3 is a file of `spec fn`s and exec function signatures with `requires`/`ensures` and bodies left unimplemented; step 6 is technique 1's reviewer run on the specification alone, before any proof exists; step 7 hands the file to technique 3 as the trusted statement; step 8 is ordinary proving. Two cheap mechanical checks can back the reviewer and are not in the paper: verify a function whose `requires` are the specification's and whose `ensures` is `false` (it must fail, else the preconditions are contradictory), and check that the `ensures` is not provable from the `requires` without the body.

evidence: weak. The physics numbers reported are competition scores graded against rubrics, not counts of accepted Lean proofs: “IPhO and IChO responses are graded by an LLM judge according to their official scoring rubrics, and human reviewers check the resulting grades.” (Section 4.1, p.6) The paper gives no count of physics statements formalized, rejected by the physics reviewer, or proved. The limitation is stated: “It does not by itself establish that an informal problem was translated correctly.” (p.10)

## technique 6: count honestly

what it is: three scoring rules that make the numbers hard to inflate.

how it is done (Section 4.1, p.6–7):
1. binary credit for formal mathematics: “A solution receives full credit if it is mathematically correct and formalized as a Lean proof accepted by Comparator and the Lean kernel; otherwise, it receives zero points.” (p.6)
2. nothing leaves the denominator: “Failures, timeouts, and budget exhaustion remain in the denominator.” (p.7)
3. a fixed, non-selected subset for the time study: the first 100 eligible Lean-Eval problems in alphabetical order (Section 4.5, p.8)

Verus form (Inference): a task counts only if the frozen file passes technique 3's check; partial verification, a file that verifies with one `assume`, and a run that timed out all count as zero and stay in the total.

## the numbers, with denominators

- PutnamBench, Lean subset, 672 problems (Table 1, p.7): HOA 672; Harmonic 672; Aleph Prover 668; Mistral Prover 658; Goedel-Architect 642; Seed-Prover 1.5 581. HOA ties the best earlier result; its difference is that it is released
- Lean-Eval, 304 problems (Table 1): HOA 251 (82.6%); AxiomProver 246; Tau 200; Aristotle 162; Seed-Prover 156; GPT-5.6 official 112 (36.8%). 251/304 and 112/304 check
- competitions with GPT-5.6 Sol (Table 1): IMO 6/6, IPhO 30/30, IChO 97.2/100, IOI 600/600; with Kimi-K3: 6/6, 30/30, 97.1/100, 600/600
- the same competitions without the loop, Codex with /Goal (Table 2, p.8), in the order IOI, IMO, IPhO, IChO: GPT-5.6 Sol 562/600, 6/6, 30/30, 87.8; Kimi K3 400/600, 4/6, 30/30, 65.0; DeepSeek V4 Pro 347/600, 4/6, 28.4/30, 58.7; GLM-5.3 249/600, 2/6, 28.3/30, 54.8
- with HOA (Table 2): GPT-5.6 Sol 600, 6/6, 30/30, 97.2; Kimi K3 600, 6/6, 30/30, 97.1; DeepSeek V4 Pro 411, 4/6, 28.8, 60.7; GLM-5.3 428, 4/6, 29.9, 58.8
- time study (Figure 4, p.9; GPT-5.6, first 100 eligible Lean-Eval problems): “On Lean-Eval, Pure Codex + /Goal plateaus at 34/100 after about 30 hours, while HOA reaches 63/100 over 150 hours.”

Not reported: tokens, money, number of rounds, number of sessions, the resource limits that end a run, how many wiki records exist, any confidence interval (Section 4.1 promises bootstrap intervals where the sample size allows; the paper contains none).

## where the paper disagrees with itself

- Lean-Eval has 304 problems in the abstract, Table 1 and Section 4.2, and “the 302 formal theorem-proving tasks in Lean-Eval” in Section 4.1 (p.6).
- Table 2 gives GLM-5.3 on IChO as 54.8 without and 58.8 with HOA, and prints the gain as +4.8; the difference is 4.0. The other printed gains check.
- Section 4.3 (p.7) says “Table 2 shows that HOA consistently improves performance across base models.” In Table 2, DeepSeek V4 Pro's IMO score is 4/6 with and without HOA, and its IPhO and IChO gains are 0.4 and 2.0 points. Only Kimi K3 reaches the closed model's level; DeepSeek V4 Pro and GLM-5.3 with HOA (411 and 428 on IOI) stay below GPT-5.6 Sol without it (562).
- Section 4.4 (p.8) says it compares “three levels of scaffolding”; Figure 3 (p.9) shows four, and its extra level (wiki and verifier without the loop) is the only place the loop's own effect can be read.
- Figure 4(b) (p.9) is captioned as Kimi K3 on the 50-problem PutnamBench subset, HOA against Codex with /Goal, and carries the labels 94% and 42%. 94% is 47/50, which matches Table 3. Table 3 and Figure 3 give Codex with /Goal for Kimi K3 as 4/50, which is 8%; 42% is 21/50, Figure 3's value for the wiki-and-verifier level. Inference: the baseline curve in Figure 4(b) is either mislabeled or from a different configuration; this reading of the figure's labels comes from the extracted text, not from the picture.
- the 100-problem Lean-Eval subset gives HOA 63/100 after 150 hours, the full benchmark 251/304. Inference: if the subset is part of the full run, the other 204 problems were solved at 188/204 (92%), or the full run had more time or a fuller wiki; the paper does not relate the two numbers.
- the abstract and Table 1 name the model “GPT-5.6 Sol”, the setup “GPT-5.6”; whether these are one snapshot is not stated.
- the reproducibility statement (p.10) says the supplement contains prompts, per-run logs and proof artifacts; Appendix A.1 and A.3 (p.15) say the per-problem inventory and additional results will be in “The camera-ready version” and “The final appendix”. In the preprint itself none of it can be checked.
- contamination: the contributions (p.3) say of the 2026 competitions that “there is no leakage”, while the limitations (p.10) say “possible benchmark contamination therefore cannot be ruled out” (both are parts of sentences). Inference: the PutnamBench problems, which the paper dates from 1963 to 2023, predate every model used, so that benchmark is not leak-free.

## techniques for the catalog

- blind reviewer over a frozen artifact: a second session sees only the task, the read-only candidate, the acceptance plan and a runner-written summary, and returns findings instead of fixes
- structured finding record: each reviewer finding carries a location in the artifact, an error type, evidence and the minimal repair requested, under a verdict of accept or revise
- separate semantic and objective gates: the reviewer judges whether the right problem was solved, a tool judges the machine-checkable condition, and acceptance needs both
- runner-held verifier evidence: the checker's exit status and log are kept by the controller, so no agent's claim of success counts as proof
- statement-matching proof check: build in a sandbox, match the submitted theorem against the trusted statement, restrict axioms, and re-check with the kernel
- accepted-only lemma store: after acceptance a curation agent extracts lemmas into records with signature, description, source, imports, location and verification status, retrieved by focused query
- formalize, review, freeze: write the formal statement from a blueprint of laws, givens and claim, have a reviewer reject missing laws, omitted parameters, tautologies and answer-assuming statements, then freeze it before proving
- failures stay in the denominator: binary credit under the machine check, with timeouts and budget exhaustion counted as unsolved
