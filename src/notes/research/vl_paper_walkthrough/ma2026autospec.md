# AutoSpec: Safety Rule Evolution for LLM Agents via Inductive Logic Programming
(authored by agents unless marked 🧑)
Tag: `ma2026autospec`, [paper](https://arxiv.org/abs/2606.24245)

## scope and contribution

AutoSpec evolves deployed symbolic safety rules from labeled agent traces. Its central claim is a combination of counterexample-guided inductive synthesis (CEGIS) and inductive logic programming (ILP): "Starting from the expert rules and a stream of annotated traces, AutoSpec iteratively evaluates rules, mines false-positive and false-negative counterexamples, uses ILP to learn which predicates discriminate them, generates candidate rule edits, and verifies candidates to select the best revision." (Abstract, p. 1). The output remains deterministic and auditable rather than a neural classifier. The paper reports: "The paper reports: "The learned rules are human-readable, auditable, and generalize to unseen scenarios." (Abstract, p. 1)" (Abstract, p. 1)

The input is an initial rule set `R0`, labeled traces `DL`, and predicate library `P`; the algorithm returns a refined `R*` (Sections 3.1–3.2, pp. 3–4). A trace is unsafe when any rule fires on any event, so trace-level labels are derived from event-level predicates (Sections 2.2 and 5.3, pp. 2, 5). The intended use is continuous asynchronous maintenance of deployed guardrails, not one-shot synthesis from nothing (Section 3.3, p. 4).

## technique: CEGIS loop with explicit failure mining

What it is: repeatedly evaluate current rules, classify errors as false negatives (missed unsafe traces) or false positives (safe traces wrongly blocked), and use those errors as counterexamples.

When to use it: use this when expert guardrails already encode useful domain knowledge but drift as models, tools, or workloads change.

How to apply it:

1. Replay each labeled trace through `Ri`; mark it unsafe if any rule fires, otherwise safe (Section 4.1, p. 4).
2. Compare predictions with labels and record each implicated rule and failed predicate (Section 4.1, p. 4).
3. Treat an FN as evidence that coverage must broaden; treat an FP as evidence that a rule must tighten (Section 4.1, p. 4).
4. Pass the counterexample set to ILP and candidate generation, then stop if no candidate improves the score (Algorithm 1, p. 3).

The running example starts with `r0(e)=net_call(e)`: nine safe package-manager scripts are FPs, so an `is_pkg_mgr` exception raises precision from 0.50 to 0.75; one missed exfiltration FN then adds an `rd_cred ∧ ext_host` disjunct, reaching F1 0.95 (Section 4, p. 4; Figure 3, p. 4).

Verus form: Inference: represent traces and labels as ghost data, define a pure rule evaluator as a `spec fn`, and prove that each rewrite preserves a stated safety classification property on the modeled trace set. Use `requires`/`ensures` on transition functions and `proof fn` lemmas for monotonic score updates. CEGIS’s dataset search remains an external synthesis tool; Verus proves the selected rule’s executable enforcement relation.

Evidence: Algorithm 1 guarantees finite termination after at most `K` iterations, monotonic score improvement, and local optimality when no single-step edit improves the score (Section 4.5, p. 5). These are algorithmic guarantees over `DL`, not guarantees of global optimality or unseen-task safety.

Limits: labels are trace-level while rules fire per event; a mislabeled or incomplete trace can steer refinement. The authors state, "Because the underlying synthesis problem is NP-hard, we do not guarantee global optimality or convergence rate; solution quality depends on the richness of the predicate library P." (Section 4.5, p. 5).

## technique: ILP-guided predicate learning

What it is: encode predicate truth on each event as `holds(τ,i,p)` facts, then ask ILASP for a small symbolic hypothesis separating FNs (positive examples) from FPs (negative examples) (Section 4.3.1, p. 4).

How to apply it:

1. Build facts for every predicate in `P` at every event (Section 4.3.1, p. 4).
2. Give missed unsafe traces as positives and wrongly flagged safe traces as negatives (Section 4.3.1, p. 4).
3. Solve for a disjunction of conjunctions, favoring few predicates for readability (Section 4.3.1, p. 4).
4. Convert each learned predicate into a directed edit: recall-increasing predicates use `AddDisjunct` or `Relax`; precision-increasing predicates use `AddConjunct` or `AddException` (Section 4.3.2, p. 5).
5. Rank suggestions by FN coverage minus newly violated FPs and retain a small set with greedy set cover (Section 4.3.2, p. 5).

Verus form: Inference: compile a learned predicate hypothesis into a `spec fn` guard and prove its relation to the event representation. Keep ILP outside the trusted Verus kernel; only a reviewed rule artifact and its proof obligations enter the verified Rust crate.

Evidence: ILP-guided AutoSpec reaches code-execution F1 0.980 with 2 FPs and 0 FNs, and embodied-agent F1 0.933 with 4 FPs and 3 FNs (Table 3, p. 5). Against heuristic predicate ranking, code F1 is 0.980 versus 0.203 and embodied F1 is 0.933 versus 0.758 (Table 4, p. 6). The code domain used 191 traces (91 unsafe, 100 safe); the embodied domain used 100 traces (52% unsafe) (Section 5.4, p. 5).

Limits: ILP only proposes predicates; it does not write rules. Its quality depends on `P`, labels, and finite traces. The reported held-out scores and in-sample convergence scores use different protocols, so they must not be compared as if they shared a denominator (Section 5.5, p. 5).

## technique: constrained edit operators and greedy selection

The primitive edits are `AddConjunct (g,φ)→(g,φ∧p)`, `AddException (g,φ)→(g,φ∧¬p)`, `AddDisjunct R→R∪{(g,ψ)}`, and `Relax (g,φ∧ℓ)→(g,φ)` (Table 2, p. 4). Candidate generation tries a single edit, a mixed precision/recall repair chain, or a failure-driven high-precision disjunct branch (Section 4.4, p. 5). Candidates are scored lexicographically by `(F1, precision, −unresolved counterexamples, −rule count)` and only a strict improvement is accepted (Section 4.4, p. 5).

Verus form: Inference: model each edit as a new immutable specification predicate and prove refinement lemmas between old and new guards. A runtime Rust guard must execute the same predicate ordering and side effects assumed by the proof; candidate selection itself remains off-chain.

Limits: fixed triggers are assumed; rewriting trigger `g` is left for future work (Section 4.2, p. 4). Greedy ascent gives local, not global, optimality.

## what is measured, trusted, and already done

The implementation is Python 3.10 (12K lines), ILASP 4.4.1 with a 120-second timeout per learning task, on a MacBook Pro M2 Max with 32 GB RAM (Section 5.6, p. 5). Evaluation compares expert rules, an LLM classifier, CEGIS without ILP, random search, and AutoSpec. Generalization used a 70% initial/30% incoming split; reported gaps were 1.6% for code and 4.7% for embodied tasks (Figure 5, p. 6).

Trusted elements include human labels, predicate implementations, ILASP, candidate evaluator, and the assumption that trace-level labels represent deployment safety.

## techniques for the catalog

- CEGIS counterexample mining — classify labeled traces, localize false positives and negatives, and iterate
- ILP predicate separation — learn small symbolic conjunctions/disjunctions that distinguish missed hazards from false alarms
- constrained rule rewrites — use conjunct, exception, disjunct, and relax operators to control precision and recall
- greedy candidate verification — score every candidate on the full labeled set and accept only strict improvements
- finite convergence controls — stop at a target score, no-improvement point, or iteration budget while reporting local optimality
