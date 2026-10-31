# Repository scale verification: what to verify, how to keep it alive, how to keep it fast
(authored by agents unless marked 🧑)

## the problem

Most studies verify one function or one small module.
A real repository is different.
It is too big to prove whole.
It changes every week.
Its proof check has to finish before someone loses patience.
And no one person knows all of it.

So there are six questions.
Which parts do we verify, and which do we leave to tests?
How do we verify a part when it sits inside a big codebase?
How do we hand one part to an agent or a stranger without the rest?
How do we run all the proofs on every change?
How do we keep a proof working after the code moves?
How do we keep the whole check fast?

No study runs an agent on a Verus repository over months.
The plan section of the [Formal Disco](../vl_paper_walkthrough/formal_disco_20260822.md) study names the same gap.
That plan is the study's own, not the paper's.
It proposes measuring whole-repository build and proof maintenance under change.
So most of this page is human practice, plus my inference of what it means for Verus.

Related notes, not repeated here:
[proof decomposition](proof_decomposition.md) splits one hard proof.
[trusted base audit](trusted_base_audit.md) covers what each proof trusts.
[proof minimization](proof_minimization.md) shrinks proofs, which makes them cheaper to maintain.
[solver modes and instability](solver_modes_and_instability.md) covers slow and brittle solver queries.
[bounded model checking harnesses](bounded_model_checking_harnesses.md) covers Kani beside Verus.
[Cost and adoption of practical verification](../topic_studies/formal_verification_rust/practical_fv/cost_adoption.md) covers published costs.
[The Rust standard library effort](../topic_studies/formal_verification_rust/rust_verifiers/rust_std_verification_effort.md) is the older topic note.

## how to do it in Verus

Only the Verus mappings are mine.
The studies use Kani, Gobra, VST, Lean, Dafny and a few Verus systems.
Each step cites where it comes from.

1. Rank the components.
Score each by cost of failure, number of users, how clear its requirements are, how stable its code is, and whether it can be proved at all.
Prove the top ones.
Cover the rest with tests, Kani or review.
([Toward practical deductive verification](../vl_paper_walkthrough/toward_practical_deductive_verification_20261012.md); the steps are the study's inference.)

2. Cut a boundary around the ranked part.
Put the critical code in a small module with a narrow public API.
Write `requires` and `ensures` on that API.
Everything behind a call to unverified code gets an `external_body` contract and a line in a list of assumptions.
(My inference. The Core/Application split in [The Secrets Must Not Flow](../vl_paper_walkthrough/the_secrets_must_not_flow_20261012.md) is the closest.)

3. Prove the rest of the program cannot break the boundary.
The Core proof is only sound if outside code cannot call the API wrongly or touch the Core's state.
In Rust, module privacy and ownership do some of this.
`unsafe`, callbacks and shared mutable state still need a whole-program check.
(Study's inference, Verus form is mine.)

4. Write contracts when the code is written.
Add `requires`, `ensures` and loop `invariant`s with each new function.
Run `verus` on every pull request.
Review the contract diff next to the code diff.
(Toward practical deductive verification, inference.)

5. Verify callees before callers.
When a caller's proof fails, the fix is often a stronger callee `ensures`.
Revise the contract, then recheck every proof that depends on it.
([Assurance cases](../vl_paper_walkthrough/assurance_cases_20261012.md), VST in Coq, not Verus.)

6. To hand out one piece, extract a standalone task.
Run Verus with `log-all` on the target function.
Build a file with the needed data types, `spec fn`s and the dependency signatures.
Mark each dependency's proof body `external_body` and keep its contract.
Strip the target's proof, keep its code and contract, and take back only what Verus accepts.
([VeruSAGE](../vl_paper_walkthrough/verusage_20261012.md).)

7. Then check the answer in the whole repository.
Inside the task, every dependency is trusted.
So a pass there is not a pass in the repo.
(Inference. The study says the same: an external-body dependency is trusted during the isolated task.)

8. Make each task a challenge if many people work on it.
A challenge names the target, the assumptions, the acceptance test and a reviewer.
CI runs every accepted proof on every later change.
The aim is a link from every unsafe function to a completed challenge.
([Verifying the Rust standard library](../vl_paper_walkthrough/verifying_the_rust_standard_library_20261012.md), [Lessons learned](../vl_paper_walkthrough/lessons_rust_std_20261012.md).)

9. Keep proofs alive.
Keep lemmas and invariants small.
Give proof functions stable names, so an edit changes one piece and the old pieces still check.
When CI fails, repair at once, starting from the old proof, not from nothing.
Watch the assumptions at unverified boundaries with tests or runtime checks.
([Toward practical deductive verification](../vl_paper_walkthrough/toward_practical_deductive_verification_20261012.md), [WybeCoder](../vl_paper_walkthrough/wybecoder_20261012.md).)

10. Track how fast the check runs, and how steady it is.
Time each phase of the pipeline.
Run independent proofs in parallel.
Cache what does not change.
Count every stub you add as a new assumption.
([Verifying the Rust standard library](../vl_paper_walkthrough/verifying_the_rust_standard_library_20261012.md),
[Verus systems](../vl_paper_walkthrough/verus_practical_20261012.md).)

### choosing what to verify

[Toward practical deductive verification](../vl_paper_walkthrough/toward_practical_deductive_verification_20261012.md)
interviews 30 practitioners, 29 usable.
22 of 29 name criticality as a decision criterion.
8 mention how widely a component is used.
The study lists four more traits: clear requirements (11 of 29), stable or self-contained code (4), realistic to verify (9), not too large (6).
The authors recommend "Concentrate verification efforts on critical components" (the paper's words, as the study quotes them).
They also say separating components reduces contact with unverified code.
This is self-report. The study notes academics dominate: 21 academic, 9 industry.

[Lessons learned](../vl_paper_walkthrough/lessons_rust_std_20261012.md) chooses the tool by the property.
Kani for finite safety checks, VeriFast for linked lists, Flux for refinement types.
The paper's words, as the study quotes: "No one-size-fits-all approach."

[A hybrid approach to Rust verification](../vl_paper_walkthrough/hybrid_rust_verification_20261012.md) splits by safety.
Creusot proves the safe code. Gillian-Rust proves the unsafe modules.
It is a proof of concept on standard-library LinkedList and Vec fragments.

### cutting a boundary

[The Secrets Must Not Flow](../vl_paper_walkthrough/the_secrets_must_not_flow_20261012.md) (Diodon) proves a small Core by hand.
Automatic taint and alias analyses cover the large Application.
The paper's words:
"This split allows us to apply powerful semi-automated verification techniques to the security-critical Core, while fully-automatic static analyses scale the verification to the entire codebase."
Case: a "100k+ lines of code (LoC) production Go codebase" with a Core of 749 lines.
It is sound only if no race and no undefined behavior exist outside the Core.
Callbacks, `unsafe`, cgo and reflection are not handled soundly.

[Lessons learned](../vl_paper_walkthrough/lessons_rust_std_20261012.md) has a smaller version for concurrency.
The paper's words, as the study quotes:
"if unsafety is encapsulated sufficiently that the unique ownership property holds, then it should be sound to verify relevant methods as if they were in a sequential program."
Where ownership does not hold, it says to use a verifier that handles concurrency.
That decomposition is untried in these challenges.

### verifying with the code

[Toward practical deductive verification](../vl_paper_walkthrough/toward_practical_deductive_verification_20261012.md) recommends specifying early and in small steps, with CI.
11 participants report CI use and 3 report code review.
It flags its own contradiction: the paper says early verification finds bugs sooner, yet "Changes to the codebase can invalidate existing proofs".
It also notes some practitioners prefer to wait for frozen code.

[Assurance cases](../vl_paper_walkthrough/assurance_cases_20261012.md) builds contracts bottom-up, callees first.
It revises a contract when the proof exposes a gap.
Six benchmarks, 299 functions, 18 translation units, all without admitted obligations.
Human effort is "under one person-day per benchmark" in the study's words, for C and VST.

[Combining mechanical and agentic specification inference for Move](../vl_paper_walkthrough/combining_mechanical_and_agentic_specifi_20261012.md)
makes the agent workflow part of the repository.
Ordered skills, an `[inferred]` marker on every generated condition so a rerun never overwrites a human's contract, and an edit hook that checks each save.
Its cache note: "The advantage of MCP over a CLI is a long-lived cache for the active package."
The study says it reports no denominators, no baseline and no scalability measure.

### extracting one task with its dependencies

[VeruSAGE](../vl_paper_walkthrough/verusage_20261012.md) is the only Verus study of this.
849 tasks from eight systems.
Each task is one function with its dependencies in one file.
The paper says: "In all cases, we do not change the pre- and post-conditions of F".
Skipped on purpose: permissioned unsafe APIs and the `state_machine` macros.
It does not say whether the extraction preserves project intent.

### community challenges and traceability

[Verifying the Rust standard library](../vl_paper_walkthrough/verifying_the_rust_standard_library_20261012.md) runs a prize program.
The paper's words: "Each challenge specifies a concrete verification target, a list of assumptions, explicit success criteria, and a financial reward disbursed upon completion."
A contributor forks the verification repository and submits a pull request.
A committee reviews and merges. CI reruns every active proof on every pull request.
Four tools are integrated: Kani, ESBMC, VeriFast, Flux.

[Lessons learned](../vl_paper_walkthrough/lessons_rust_std_20261012.md) adds traceability.
A link from every unsafe function to a completed challenge is what the paper calls ideal, not current practice.
The paper's words, as the study quotes: "challenge solutions are peer-reviewed, almost entirely by Amazon staff."
The study says existing scripts only count annotated functions that have proof harnesses, and do not show a contract is sufficient.

### proofs in CI with several tools

The same two studies argue one tool is not enough.
The paper's words, as the study quotes: "no single tool can discharge all verification conditions."
[Kani](../vl_paper_walkthrough/kani_20261012.md) reports CI times: 34 Firecracker harnesses in 21 minutes, 153 Hifitime in 42, 16,748 standard-library harnesses in 69.
The paper warns that "the evaluated projects self-selected into Kani adoption, potentially over-representing favorable cases".
The study also says Kani alone does not cover aliasing, so CI with one tool leaves holes.

### keeping proofs alive

[Toward practical deductive verification](../vl_paper_walkthrough/toward_practical_deductive_verification_20261012.md): 12 of 29 discussed proof maintenance.
8 discussed instability.
One participant saw a slight definition change cause random CI failures.
The paper asks for proof repair that "can utilize the proof for the prior version of the code" (the paper's words, as the study quotes).
The study says the maintenance burden is interview consensus, with no repository measurement over time.

[WybeCoder](../vl_paper_walkthrough/wybecoder_20261012.md) shows proof transfer in Lean.
It names each obligation, such as `h_count.loop`.
After an edit it re-extracts the goals and reuses the proofs whose names still match.
The study says a Verus version needs an orchestrator that generates temporary proof modules.
That is the study's inference.

[Quantifying SMT solver instability](../vl_paper_walkthrough/smt_instability_20261012.md) is about brittleness.
Harmless reorderings of a query can change its runtime a lot.
About 60,000 query forms from three domains (bounded model checking, symbolic execution, SMT-Comp), two solvers.
Instability rises with average runtime, and the study calls that correlational.
The paper proposes, but does not implement, restructuring queries for runtime.
For Verus, benchmarking equivalent forms of a proof is the study's inference.

[VeruSAGE](../vl_paper_walkthrough/verusage_20261012.md) gives a size signal.
On 688 successful Sonnet 4.5 tasks, human proofs add a median of 9 lines and LLM proofs add 24.
Shrinking by repeated Verus runs can remove unneeded assertions, which cuts review cost.
See [proof minimization](proof_minimization.md).

[Knowledge graphs for agentic verification](../vl_paper_walkthrough/knowledge_graphs_formal_verification_20261012.md)
links each property to its requirement, code location, tool message and counterexample, and keeps the links after edits.
This is for SystemVerilog assertions, on seven designs, with formal coverage from 78.5% to 99.4% in the abstract.
The study notes Table II's lowest is 82.98, and the paper has no run without the graph.
It is not about Rust, repositories or maintenance, so the Verus use is the study's suggestion only.

### making the check fast

[Verifying the Rust standard library](../vl_paper_walkthrough/verifying_the_rust_standard_library_20261012.md):
16,748 generated harnesses made compilation the bottleneck.
The authors measured compilation, then used parallelism, caching, ordering of code generation and stubbing.
They report a 3.97x compilation speedup.
The study stresses a stub is a trust boundary and must be counted.

[Verus systems](../vl_paper_walkthrough/verus_practical_20261012.md) reports whole-project times on one core and on eight.
IronKV 41 s and 18 s, node replication 17 s and 9 s, page table 63 s and 34 s, allocator 262 s and 55 s, persistent log 12 s and 6 s.

[Synthesizing proofs using proof sharding](../vl_paper_walkthrough/synthesizing_proofs_using_proof_sharding_20261012.md) runs many prover instances at once.
One proof took over six hours on one node and under 25 minutes on ten nodes.
The study says these are different tasks (the six-hour case is one hand-modified ring-election search), so the abstract's range of one minute to two hours is not a hardware-free bound.

## the evidence, with denominators

Proof to code size, per study.
The ratios are my arithmetic on the numbers the studies give, unless noted.

[Verus systems](../vl_paper_walkthrough/verus_practical_20261012.md), five hand-built systems: 6,119 executable lines, 31,231 proof lines, about 5.1 to 1.
The audit found the paper's own Figure 9 rows sum to 31,691 proof lines, against the printed total of 31,231.
Page table: 400 executable, 5,329 proof, a 13.3 ratio as the study states.
Allocator: 3,178 executable, 13,703 proof, about 4.3 to 1.
The study says trusted-spec lines and proved code are not interchangeable categories.

[Buddy allocator](../vl_paper_walkthrough/buddy_allocator_20261012.md), one Verus allocator: 1,923 spec and proof lines against 349 executable, about 5.5 to 1.
About 2 person-months, 4.3 seconds to verify.

[Scaling verification of cryptographic software](../vl_paper_walkthrough/scaling_verification_of_cryptographic_so_20261012.md),
Rust extracted to Lean: 16,680 Rust lines, 124,777 Lean proof lines, about 7.5 to 1.
The abstract separately says 16.7 KLOC and 237 KLOC of Lean including generated definitions.

[The Secrets Must Not Flow](../vl_paper_walkthrough/the_secrets_must_not_flow_20261012.md), Go with Gobra: 749 Core lines, 3,825 spec and proof lines, about 5.1 to 1.
The Core is about 1% of the code.

People and time:
Diodon: Core proof under 3 person-months in the abstract.
The detailed case reports Tamarin under 2, Gobra under 3, taint analysis under 0.5 and Core-assumption analysis under 1.5 person-months.
The study says these should not be conflated.
The Argot Core-assumption checks ran in 2.12 minutes.
Assurance cases: under one person-day per benchmark, 299 functions in all.
[Inductive and deductive synthesis](../vl_paper_walkthrough/inductive_deductive_synthesis_20261012.md) compares its agent to historical expert effort of 9 to 12 months.
The agent used about 6.8 hours and $106 per specification, over seven specifications with three runs each.
The study says the "roughly 200x" claim is not a controlled human trial.

Selecting and CI:
22 of 29 interviewees name criticality.
12 of 29 report maintenance trouble.
The std effort: 27 challenges, 9 accepted, 18 open, in the lessons study.
It has 361 of 9,078 core unsafe functions (3.98%) and 10 of 714 std functions (1.4%) annotated with Kani contracts.
The paper notes annotated is not the same as fully verified.
The other study counts 989 functions with contract proofs, 694 manual plus 295 automatic, out of 33,955 in its snapshot.

Task extraction:
VeruSAGE proves 688 of 849 tasks (81%) with Sonnet 4.5, one task being one function plus its extracted dependencies.
A three-task whole-project run on IronKV worked but cost 1.6x the time and 2.2x the money.
An Atmosphere task ran over an hour and was killed.

## where studies disagree

Challenge counts.
The lessons study says 27 challenges, 9 accepted, at least 50 contributors.
The standard library study says 29 published challenges, more than 450 pull requests, at least 21 external contributors from four institutions.
They are different papers and probably different dates.
I cannot tell which is later, and "contributors" may be counted differently.

Effort.
Diodon's abstract says under three person-months.
Its detailed case sums to more, as above.

Early or late.
One paper says verify early.
The same paper reports people who prefer frozen code, because changes break proofs.
The studies give no way to settle it.

Where a metric means different things.
"Functions verified" in the std work is mostly Kani passes without contracts: 11,675 of 11,970 automatic passes had none.
That is safety under a bound, not a proof of what the function should do.
Compare it to a Verus function with a full contract only with care.

## where it fails

The Verus evidence is thin.
Only [Verus systems](../vl_paper_walkthrough/verus_practical_20261012.md), [Buddy allocator](../vl_paper_walkthrough/buddy_allocator_20261012.md) and VeruSAGE use Verus.
The first two are hand-built, by the tool's authors or researchers.
The study says VeruSAGE has "no evidence that they are good at breaking down the project-level verification goal" (the paper's words, as the study quotes).
Its tasks come from projects that were already verified.

Nobody measures maintenance over time.
The maintenance claims rest on interviews and on a few anecdotes.

Extracted tasks hide cross-file difficulty.
The VeruSAGE whole-project run was slower and costlier.

A pass for one tool is a narrow pass.
Kani does not model Stacked or Tree Borrows aliasing, and has no concurrency in its frontend.
The std effort covers safety, not functional correctness.
Coverage scripts do not tell whether a contract is strong enough.

Peer review does not scale cheaply.
The std reviewers are mostly Amazon staff.
A Verus repository run by agents needs a mechanical way to judge a contract.
See [specification quality checks](specification_quality_checks.md).

A split is only as sound as its edges.
Diodon needs no races and no undefined behavior outside the Core.
Callbacks, `unsafe` and FFI break it.

Speed-ups can quietly cost trust.
A stub, a cache of a stale result, or a bounded run changes what the pass means.

## open questions

Does a Verus proof in an evolving repository survive?
I would measure the share of proofs that break per commit, and the time to repair.
Nothing here measures it.

Can an agent repair a proof from the old proof, as the interviewees ask for?
WybeCoder reuses names inside one session.
No study does it across commits.

How should a challenge be reviewed when agents write the proofs?
The std program uses human experts.

Does extraction preserve intent?
VeruSAGE keeps contracts fixed, so the question is not tested.

What belongs in the Core?
Diodon says keep it small but include all protocol I/O.
I do not see a rule for choosing in Rust.

Is a provenance graph worth building?
One SystemVerilog study says it helps.
I do not know of any Rust evidence.

How do we report effort so numbers compare?
Studies give lines, person-months, hours or dollars, and each counts different work.
