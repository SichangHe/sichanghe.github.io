# SysMoBench: Evaluating AI on Formally Modeling Complex Real-World Systems
(authored by agents unless marked 🧑)
Tag: `cheng2025sysmobench`, [paper](https://arxiv.org/abs/2509.23130v3)

## scope and result

SysMoBench is a benchmark and harness for testing whether generative AI can turn real concurrent or distributed system code into executable formal models. The paper targets TLA+ and evaluates models against syntax, execution, implementation traces, and safety/liveness invariants. It includes eleven artifacts: Asterinas synchronization/data structures, Etcd and Redis Raft, Xline CURP, ZooKeeper leader election, and PGo systems (Table 1, p. 4). The authors summarize the goal: “In this paper, we present S YS M O B ENCH, a benchmark to evaluate AI’s ability to formally model complex systems.” (Section 1, p. 2.)

The benchmark deliberately separates a model that parses from a model that describes the implementation and preserves its properties. The paper warns: “successfully running TLC is not an indicator of whether the model correctly describes the system.” (Section 1, p. 2.) Inference: the result is a reproducible evaluation pipeline, not a proof that any generated model is complete.

## technique 1: define a task at behavioral granularity

What it is. A benchmark task specifies a system artifact, modeling granularity, core actions to include, and implementation details to exclude. Agents may use source code, documents, or runtime traces from that artifact. The model is judged by behavioral conformance rather than textual or structural similarity. For a spinlock, mandatory behavior includes lock and unlock, atomic compare exchange, and spinning under contention; RAII guard details and debugging/trait code are excluded (Section 3.1, p. 4).

How to apply it.

1. Select a real artifact and choose inputs such as source code, documentation, or runtime traces. (Section 3.1, p. 4.)
2. State the modeling granularity and list mandatory core actions and excluded details. (Section 3.1, p. 4.)
3. Require a model-checker configuration as part of the generated artifact. (Section 3.1, p. 4.)
4. Express the target as state variables, an initial predicate, a next-state relation made of atomic actions, and temporal properties. (Section 2, p. 3.)
5. Permit multiple semantically equivalent abstractions, provided they preserve the obligations needed for verification. (Section 3.1, p. 4.)

The spinlock example uses variables `lock_state` and `pc`; actions `StartLock`, `Acquire`, and `Unlock`; and a mutual-exclusion invariant `Cardinality({t \in Threads : pc[t] = "locked"}) <= 1` (Figure 2, p. 3). `Acquire` combines the implementation's acquire loop and compare-exchange operation into one atomic model action.

Verus form. Inference: use the task's mandatory actions as executable Rust methods and define an abstract state machine in ghost/spec code. Write a representation invariant relating the concrete lock state and thread states to the abstract model, then prove mutual exclusion and lifecycle properties with Verus `requires`, `ensures`, loop invariants, and lemmas. The benchmark's exclusion of RAII details does not justify dropping ownership obligations in Rust; it defines only the abstraction boundary.

Evidence and assumptions. Section 3.1 states: “We evaluate behavioral conformance rather than structural equivalence, allowing fine-grained modeling of core actions as long as they preserve semantic obligations needed for verification.” (p. 4.) Inference: this makes the task useful for VL's abstraction design, but a passing abstract model still needs a proved refinement link to concrete Rust.

## technique 2: four automated quality metrics with prerequisite checks

What it is. SysMoBench computes four normalized percentage metrics: syntax correctness, runtime correctness, conformance to implementation traces, and invariant correctness. The metrics are staged because later checks require an executable model. The authors state: “S YS M O B ENCH includes four metrics that evaluate a TLA+ model on syntax (§3.2.1), runtime correctness (§3.2.2), conformance to system code (§3.2.3), and invariant correctness (§3.2.4).” (Section 3.2, p. 5.)

How to apply it.

1. Run the complete model through SANY. A model that passes receives 100% syntax. For partial scoring, wrap each action with its dependencies and run SANY per action; if `n_c` of `n_t` actions pass, the per-action score is `n_c/n_t`. Weight per-action and whole-model checks equally, so all per-action checks without whole-model success yield 50%. (Section 3.2.1, p. 5.)
2. Run TLC bounded model checking and simulation without invariants. Let `n_r` be covered actions without runtime errors and `n_t` all actions; runtime score is `M_r = n_r/n_t`. Only models with no runtime errors proceed; full action coverage is not required. (Section 3.2.2, pp. 5–6.)
3. Instrument the system implementation, collect traces, map model elements to code/log elements, and ask TLC whether each trace is a model path. Let `n_c` be instrumented code actions covered without conformance errors and `n_t` all instrumented code actions; conformance is `M_c = n_c/n_t`. (Section 3.2.3, p. 6.)
4. Instantiate invariant templates against model-specific names and run TLC separately for each invariant. If `n_i` of `n_t` invariants hold across the explored state space, invariant score is `M_i = n_i/n_t`. (Section 3.2.4, p. 7.)

Verus form. Inference: use the same staged discipline for agent-written Rust: compile and type-check first; run bounded executable scenarios; check traces against a ghost transition relation; then prove each invariant as a separately named lemma. Report denominators for each metric rather than collapsing partial coverage into one pass/fail number. Verus proofs can establish a contract, while runtime traces test the correspondence to the linked implementation.

Evidence. The paper's metric design treats syntax, runtime, conformance, and invariants as distinct; a syntax-valid but behaviorally wrong model can therefore be exposed. A model that passes per-action syntax checks can still fail the full model because inter-action dependencies are not included in that partial check (Section 3.2.1, p. 5).

## technique 3: LLM-assisted trace mapping and invariant concretization

What it is. Generated models often rename variables and actions. SysMoBench uses a coding LLM to extract model constants, variables, and actions and map them to task-specified code/log elements. It also stores invariants as templates containing a property description, formal definitions, and an example, then asks an LLM to produce model-specific properties. The paper says: “We then use an LLM to translate these templates into model-specific invariants that can be checked against the system model.” (Section 3.2.4, p. 6.)

How to apply it.

1. Provide the model and implementation code to the mapping LLM, with task-specific trace information. (Appendix F.1, pp. 27–28.)
2. Extract constants, variables, and actions, then map them to implementation/log concepts. (Section 3.2.3, p. 6.)
3. Instrument code at the task's granularity and validate each trace through TLC; infer missing events when traces are coarser than the model. (Section 3.2.3, p. 6.)
4. Concretize each invariant template for the model and run TLC in a separate model. The prompt also permits changing predicate structure to fit the representation while preserving the property: “DO redesign the predicate logic to fit the model’s data structure granularity”. (Section 3.2.4, p. 7; Appendix F.2, p. 29.)

The spinlock template “Only one thread can access a shared resource at a time” becomes `Cardinality({t \in Threads : status[t] = "locked"}) <= 1` after replacing `pc` with `status` and `in cs` with `locked` (Section 3.2.4, p. 7).

Verus form. Inference: use an explicit reviewed mapping file between Rust fields and abstract variables, then make the mapping a proof obligation rather than trusting an LLM's name match. Invariant templates can become parameterized Verus predicates; concretization should generate candidate predicates that compile only after a proof establishes their relation to concrete fields. Avoid treating LLM-generated mappings as trusted evidence.

Evidence and limits. The authors inspected mapping/concretization and report them correct in their experiments; they also created 10 variants of gold models by changing names and granularity (five Etcd Raft and five spinlock), and report perfect scores (Section 4, p. 8). Inference: this small robustness experiment does not establish general reliability. Name-based mapping is a threat when agents introduce semantically misleading names or omit state, so independent trace checks remain necessary.

## technique 4: compare direct modeling, code translation, and trace learning agents

What it is. The benchmark isolates three ways to produce a model: a basic agent prompted with source and requirements; a code-translation agent that translates statements and then organizes control flow; and a trace-learning agent that infers a model from traces without source code. The paper states: “The agent translates code statement by statement (from the source language to TLA+ ), and then organizes the control flows of the translated statements into a TLA+ model.” (Section 4, pp. 7–8.)

How to apply it.

1. Run each agent five times and keep its best output, following HumanEval-style evaluation. (Section 4, p. 8.)
2. Allow up to three feedback iterations when compilation or runtime errors occur; do not provide human intervention. (Section 4, p. 8.)
3. Use the same SANY, TLC, trace harness, and invariant checks for every agent. (Section 4, p. 8.)
4. Compare scores by artifact size and complexity, rather than comparing only syntax. (Section 5, p. 8.)

Results. For Asterinas Spinlock, all basic-modeling and code-translation combinations in Table 3a reached 100% syntax and runtime; conformance was 80% for GPT-5, Gemini-2.5-Pro, and DeepSeek-R1 basic modeling, and invariant scores ranged from 85.71% to 100% (Table 3a, p. 9). For Etcd Raft, basic modeling with Claude-Sonnet-4 reached 100% syntax, 25.00% runtime, 7.69% conformance, and 69.23% invariants; other basic-modeling LLMs failed syntax and therefore have no later scores (Table 3b, p. 9). Code translation with Claude-Sonnet-4 reached 100% syntax, 66.67% runtime, 15.38% conformance, and 92.31% invariants; GPT-5 reached 100% syntax but 20.00% runtime and no later scores (Table 3b, p. 9). The main results omit trace-learning scores because that agent fails runtime checks; Appendix I.2 reports its syntax/runtime scores for all eleven artifacts (Section 5, p. 8; Tables 13–23, pp. 34–37).

Verus form. Inference: direct modeling corresponds to writing a Rust abstraction from requirements; code translation corresponds to translating concrete Rust control flow into proof-oriented code; trace learning corresponds to inferring a candidate contract from executions. For verified Rust, code translation should be followed by explicit ownership, aliasing, and refinement proofs that TLA+ does not cover.

## what is proved, measured, and trusted

Inference: SysMoBench measures generated model quality; it does not prove that an AI model is complete for all executions. TLC explores the configured bounded state space, traces cover instrumented executions, and invariants are those supplied by the task templates. The LLM mapping and concretization components, instrumentation, model checker, generated configuration, and invariant definitions are trusted enough to interpret scores. The paper's own conclusion is limited: “modern AI, despite showing strong abilities in coding and bug fixing, is still limited in comprehending, abstracting, and specifying large, complex systems.” (Section 7, p. 11.)

The authors report: “Without any hints about specific bugs, AI-generated models successfully reproduced several hard-to-find bugs across multiple systems in S YS M O B ENCH.” Table 11 identifies Etcd Raft #10998, Xline CURP #402, Redis Raft #19, Asterinas Mutex #1279, and Asterinas Rwmutex #1303. Models were generated from earlier code versions and checked for these known bugs (Appendix C.2, p. 19). Inference: known-bug reproduction is evidence that partial models can be useful for bug finding, not evidence of full correctness.

## what VL should not redo and product threat

Existing formal-model benchmarks target small puzzles, function contracts, or proof generation; SysMoBench's distinct target is real system code with concurrency, distributed behavior, traces, and invariants (Section 6, p. 10). Inference: VL should not spend effort rebuilding a syntax-only benchmark; the useful gap is a Rust/Verus harness that checks abstraction, trace refinement, and proof invariants together.

Inference: threat to agent-written verified Rust is high for model-generation assistance on small synchronization components, because the benchmark shows strong spinlock scores. Threat is lower for large distributed Rust systems: Etcd Raft scores expose failures in abstraction and conformance even when syntax passes. SysMoBench's metrics and prerequisite checks are a practical template for detecting plausible but semantically incomplete agent output.

## techniques for the catalog

- behavioral task contracts — specify mandatory core actions and excluded implementation details before generation
- staged quality metrics — separate syntax, runtime, trace conformance, and invariant scores with explicit denominators
- trace validation — instrument implementation code and check executions as paths in the formal model
- invariant concretization — map reusable invariant templates to model-specific names, then model-check each separately
- code-translation modeling — translate source statements and control flow before asking an LLM to abstract the system
- no-human feedback loops — rerun agents with compiler/model-checker errors for up to three iterations

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Without any hints about specific bugs, AI-generated models successfully reproduced several hard-to-find bugs across multiple systems in S YS M O B ENCH."): checked all quotations, numbers, section/page references, technique steps, results, and inference labels; corrected the paper link, optional task inputs, page references, mapping inputs and semantic adaptation, agent-result scope, and known-bug evidence; did not rerun benchmark experiments, inspect the repository artifact, or verify the proposed Verus adaptations.
