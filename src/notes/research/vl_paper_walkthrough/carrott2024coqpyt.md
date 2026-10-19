# CoqPyt: Proof Navigation in Python in the Era of LLMs
(authored by agents unless marked 🧑)
Tag: `carrott2024coqpyt`, [paper](https://arxiv.org/abs/2405.04282v1)

## purpose

CoqPyt is a Python client over Coq LSP for collecting proof-state data and modifying proofs. The paper's motivation is machine-checked proof automation: “Recent automation techniques based on neural methods address this issue, but require good programmatic support for collecting data and interacting with proof assistants.” (abstract, PDF p.1). CoqPyt targets Coq 8.17–8.19 (section 1, PDF p.1) and exposes file, term, proof, and step objects through Python (Figure 1, PDF p.2).

## technique 1: navigate executable proof files and extract contexts

What it is. A `CoqFile` hides Coq LSP and exposes `is_valid`, `save_vo`, and `exec`. The paper says, “A CoqFile object provides an exec method which allows users to take an arbirary number of forward and backward steps through the file.” (section 2.3, PDF p.2). Each returned `Step` includes textual representation and AST contents. A `FileContext` indexes terms defined up to the execution point, including module-qualified names and term types; notations are indexed by their string patterns (section 2.3, PDF p.2).

How to apply it. (1) Instantiate a CoqFile for a source file. (2) Call `exec(n)` to move forward or backward. (3) Save the returned steps, text, AST, and validity. (4) Read `context` to inspect terms defined up to that point (Figure 1, PDF p.2). (5) Use `save_vo` when a compiled library artifact is needed. Coq LSP can request a whole-document AST and can ignore erroneous steps while evaluating later valid ones (section 2.2, PDF p.2).

Verus form. Inference: build a Rust parser/verifier adapter that records source spans, function/spec names, and Verus diagnostics after each accepted or rejected edit. Use executable Rust for collection; any formal guarantee should be a `proof fn` about the adapter's event-log consistency, not a claim that Verus proves arbitrary parser behavior.

Evidence and limits. CoqPyt uses Coq LSP, whose protocol supports proof state and AST requests. Coq LSP can save compiled `.vo` files; the paper says “valid files may still import terms from invalid files.” (section 2.2, PDF p.2). The authors later state that context extraction omits module types and section-local constructs and does not recursively fetch each term's own context (conclusion, PDF p.4); these are explicit completeness limits.

## technique 2: proof-aware navigation and premise extraction

What it is. `ProofFile` extends `CoqFile` with proof context. It tracks `in_proof`, `current_goals`, imported terms, `open_proofs`, and ordered `ProofTerm` and `ProofStep` objects. A `ProofTerm.context` lists terms from the current context used to define that proof; a `ProofStep.context` lists terms used in that step. These used terms differ from the available terms in `pf.context` (sections 2.4–2.6, PDF pp.2–3). A `ProofStep` records the goals before its step is taken. The paper describes a `ProofStep` as “a mapping from each proof step to the intermediate proof goals it attempts to solve or simplify.” (section 2.4, PDF p.2).

How to apply it. (1) Construct `ProofFile` for the target file. (2) Execute all steps or stop at a desired cursor. (3) Iterate `pf.context` for available premises. (4) Iterate each `proof.steps`; record `step.text`, `step.ast`, `step.context`, and `step.goals`. Listing 2 demonstrates execution and extraction with `pf.exec(len(pf.steps))` and printing these four fields (section 2.6, PDF p.3). Figure 1 labels the goal field `goal`, whereas Listing 2 uses `goals`; the paper is inconsistent here. Inference: use the pre-step goals and available terms as generation inputs, and the tactic and terms it uses as training targets. Keep used premises distinct from information available before generating the tactic.

Verus form. Inference: represent a Verus proof state as a serializable record containing function location, assumptions, quantified facts, and diagnostic text. Verus-specific fields must be obtained from its tool output; do not invent a Coq-style `current_goals` API. Premise retrieval can feed candidate lemmas to a `proof fn`, while the verifier remains the acceptance oracle.

Evidence. The paper's feature table reports full support for getting proof state, checking validity, executing/modifying steps, extracting step context, and tracking modules/terms/proofs (Table 2, PDF p.4). The comparison is with Coq LSP and Coq Serapy. The authors state, “Coq Serapy does not collect the terms used in each step” (section 4, PDF p.4). Inference: this supports a feature comparison; the evaluation does not measure a downstream theorem-proving success rate.

## technique 3: transactional proof modification for search and repair

What it is. CoqPyt supports `add_step` and `delete_step` at arbitrary positions, batched `change_steps`, and proof-local `append_step`, `pop_step`, and `change_proof`. The authors state, “For erroneous modifications, the file will revert to its original state, ignoring the requested changes.” They also warn that invalid changes can cause explicit errors or undefined behaviour (section 2.5, PDF p.3). The paper's example starts from a proof with `Admitted`, pops that step, appends candidate tactics, and catches `InvalidChangeException` (Listing 3, PDF p.3).

How to apply it. (1) Execute the file and obtain `pf.unproven_proofs[0]`. (2) Try `reflexivity.` followed by `Qed.`; the second attempt prepends `rewrite app_assoc.`. (3) Build each transaction with `ProofPop()` to remove `Admitted.`, then one `ProofAppend` for each candidate step. (4) Call `change_proof`; catch `InvalidChangeException` and try the next candidate. (5) Stop when the call succeeds (Listing 3, PDF p.3). For multi-edit file changes, submit `CoqAdd`/`CoqDelete` objects to `change_steps`; intermediate invalid states are allowed as long as the final state is valid (section 2.5, PDF p.3).

Verus form. Inference: implement candidate patching in a temporary Rust buffer, invoke `cargo verus`, and retain a patch only when the verifier succeeds. A verified transaction invariant can state that the committed buffer equals one accepted candidate; proof search itself and compiler diagnostics remain executable tooling.

Evidence. The example's incorrect candidate leaves `test.v` unchanged, while the valid candidate applies. This is a behavioral demonstration, not a benchmark of proof-search accuracy. Inference: the stated rollback behavior and example do not establish recovery from every undefined behavior or process failure.

## technique 4: benchmark API cost and scalability

What it is. The authors evaluate all CoqPyt features on CompCert in Docker on an Intel Xeon Silver 4210R at 2.40 GHz. CompCert has 259 Coq files; CoqPyt runs on 193, while 58 contain Coq errors, 6 run out of memory, and 2 crash for unknown reasons (section 4, PDF p.4). For modifying features, they test the beginning and the current execution point after executing the whole file. They state, “We performed each case 5 times for each feature.” For `change_steps`, each test uses a single addition or deletion. Table 1 reports means, variances, medians, and Pearson correlation with step count (section 4, PDF p.4).

Evidence. The table reports 609.6 mean steps per file, 6.6 s mean load time, and 31.2 s mean execute time; execution-time PCC with step count is 0.72. Add-step PCC is 0.90 at the beginning and 0.92 at the current pointer; delete-step PCC is 0.94 and 0.92 respectively (Table 1, PDF p.4). The benchmark unit is a Coq file; the paper reports 193 runnable files and the failure counts above, but does not explicitly state a denominator for every table statistic. The authors conclude execution time is positively correlated with file steps, while cache affects execution time (section 4, PDF p.4).

## techniques for the catalog

- proof-file navigation — step through source and retain text, AST, validity, and visible definitions at each cursor
- premise and goal extraction — associate every proof step with context and intermediate goals for retrieval and training
- transactional proof repair — apply candidate edits atomically, revert invalid changes, and keep accepted proofs
- verifier API benchmarking — measure feature latency and failures against file size with explicit hardware and denominators
