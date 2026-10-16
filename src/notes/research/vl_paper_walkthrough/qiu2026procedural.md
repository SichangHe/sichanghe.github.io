# Procedural Refinement by LLM-driven Algorithmic Debugging for ARC-AGI-2
(authored by agents unless marked 🧑)
Tag: `qiu2026procedural`, [paper](https://www.semanticscholar.org/paper/1bd1bb42770f0b19f80a66a6f099bff0be042e69)

## scope and result

Qiu et al. introduce Abduction-Based Procedural Refinement (ABPR), a neuro-symbolic loop in which an LLM writes executable Prolog hypotheses and a Prolog meta-interpreter exposes proof-tree derivations for repair. The target is abstract rule induction, mainly ARC-AGI-2 grid transformations, with supplementary symbolic I-RAVEN-X and A-I-RAVEN tasks. The paper's formal object is an executable hypothesis `P` over background theory `B`; the desired condition is `B ∪ P |= Etrain` (Sections 2.1 and 2.3, pp. 3–4). It explicitly motivates semantic checking: “refinement is not merely code-level debugging, but semantic re-checking of the model’s hypothesised rule” (Abstract, p. 1).

ABPR separates generation, symbolic validation, and algorithmic debugging. The LLM remains stochastic, so the system searches a refinement closure and keeps a bounded history of high-coverage candidates. ARC experiments use eight parallel threads, depth ten, temperature 1.0, and diversity-prioritized top-two voting (Section 4.1, p. 7; Appendix B.2, p. 13).

## technique 1: bottom-clause initialization and abductive refinement closure

purpose and trigger

Use this method to turn few-shot examples into a structured hypothesis before repair. Given background knowledge and training examples, ABPR constructs a bottom clause as the most specific logical explanation, then asks an LLM to generalize it into an initial program `Hinit` (Section 3.1, p. 5). A refinement operator `ρ` defines admissible local modifications; the closure is `ρ*(H0) = ρ0(H0) ∪ ρ1(H0) ∪ …`, with `ρ0(H0) = {H0}` (Sections 2.3 and 3.1, pp. 4–5).

application sequence

1. collect background predicates and input-output training examples
2. construct the bottom clause that explains the examples
3. prompt the LLM to generalize it into an executable declarative program
4. define local additions, deletions, or modifications of predicate conditions, recursive subgoals, or relation bindings as `ρ`
5. search only the resulting refinement closure
6. accept a candidate when `B ∪ H* |= Etrain`; otherwise retain it for coverage-ranked search (Sections 2.3 and 3.1, pp. 4–5)

Verus form

Inference: represent the hypothesis and background facts as ghost mathematical values, and state `ensures` that a verified candidate preserves every training example. Use a `spec fn` for the interpretation relation and `proof fn`s for local refinement lemmas. Prolog execution and LLM generalization are outside Verus; a Rust implementation can be verified only after its rule semantics and input representation are fixed. Verus cannot establish that the bottom clause is the intended abstraction.

reported evidence and boundary

The paper does not measure bottom-clause quality separately. It reports a boundary condition: “ABPR is most effective when the first-pass hypothesis lies within a repairable neighbourhood of the target rule” (Section 4.4, p. 9). With the same Claude refiner, Gemini-3-Pro initialization rose from 27.92% to 42.92% Pass@2, while Claude-only ABPR reached 5.00% (Table 1, p. 8). The denominator is the public ARC evaluation task set under Pass@2, not individual programs. Poor initial hypotheses can remain outside a short local search.

## technique 2: APD proof-tree tracing with a Prolog meta-interpreter

purpose and trigger

Use Algorithmic Program Debugging (APD) when an output mismatch does not reveal which abstraction is wrong. A proof tree has a query root, predicate-invocation internal nodes, and primitive or built-in leaves. For a faulty clause `H ← B1,…,Bk`, APD identifies a local error when all body literals are semantically valid but the head is not (Section 2.2, p. 3). The paper's implementation reifies SLD resolution as `node(Type, InputSnapshot, OutputSnapshot, Children)` (Section 3.2, p. 6).

application sequence

1. run the candidate query on training data
2. recursively interpret SLD goals and selected clauses
3. record predicate, input and output bindings, child subgoals, and success or failure in a proof-tree node
4. traverse the tree top-down to find suspicious semantic judgements
5. provide the localized trace to the LLM oracle and repairer
6. rerun the verifier on the revised program (Sections 2.4 and 3.2–3.3, pp. 4, 6)

The paper's worked reachability example has `reachable(a,d)` fail because the two-hop clause tests `edge(Z,Y)` rather than recursive `reachable(Z,Y)`. The trace records `edge(a,d)` failing, `edge(a,b)` succeeding, and `edge(b,d)` failing (Appendix C, p. 16). This identifies a rule-level abstraction error rather than a breakpoint-level state error.

Verus form

Inference: model a trace node as a Rust enum or struct containing a predicate identifier, snapshots, and a finite sequence of children. A `spec fn` can define whether a trace is a valid derivation, and `proof fn`s can prove that each child justifies its parent under a fixed relation. `requires` and `ensures` can connect a verified Rust rule to its trace. The Prolog interpreter, clause selection, and LLM oracle remain trusted unless reimplemented and verified in Rust.

reported evidence and boundary

The trace is evidence for localization, not a proof that the LLM's repair is semantically intended. The appendix implementation imposes a maximum depth, suppresses system predicates, expands selected background calls, and summarizes outputs (Appendix D, p. 16). Depth limits can omit relevant subgoals. The paper also states that LLM generation makes the formerly deterministic APD trajectory probabilistic (Section 3.1, p. 5).

## technique 3: verifier-in-the-loop local repair and top-k history

purpose and trigger

Algorithm 1 runs repeated diagnosis and repair while preserving a bounded candidate pool. Use it when a candidate fails training examples and a localized trace is available.

application sequence

1. initialize `H0` and set history `H = {H0}`
2. for each iteration up to `Tdepth − 1`, select the latest candidate
3. compute `τ = Trace(Hb, Etrain)`
4. sample a successor `Hn` from the LLM-conditioned APD distribution
5. return immediately if `IsConsistent(Hn,Etrain)` is true
6. otherwise score every candidate with `Coverage(H,Etrain)`
7. retain the top `K` candidates from the union of old and new hypotheses
8. after the depth limit, return the highest-coverage candidate (Algorithm 1, p. 6)

The LLM oracle localizes faulty nodes, and the repairer proposes a minimal abductive change `Δi`, giving `Pi+1 = Pi ⊕ Δi` (Section 3.3, p. 6). The paper says, “ABPR leverages this idea by reducing program synthesis/refinement to a sequence of low-entropy, verifiable sub-problems” (Section 3.1, p. 5).

Verus form

Inference: encode the bounded history as a ghost sequence and prove that top-k selection never returns a candidate outside the refinement relation. Use `spec fn coverage` and proof lemmas for monotonic bookkeeping; executable Rust can implement the queue with `requires` on capacity and `ensures` on retained membership. The stochastic sampler and semantic adequacy of a proposed patch are not proved by Verus. A proof of training-example consistency is necessary but does not prove the latent rule is correct.

reported evidence and boundary

In matched Gemini experiments, first-pass Pass@2 was 34.03% for Flash and 31.11% for Pro; execution-feedback repair reached 49.17% and 43.33%; ABPR reached 56.67% and 53.33% (Table 1, p. 8). Pass@2 means a task is solved if a correct answer appears among two submissions, so percentages use ARC tasks as denominator. Removing semantic traces reduced performance by up to 10 percentage points (Section 4.3, p. 9). These comparisons hold the verifier and task protocol fixed; they do not prove that every repair is minimal or correct.

## technique 4: parallel stochastic search and diversity-prioritized voting

purpose and trigger

Use an ensemble when one LLM trajectory is sensitive to seeds or can converge prematurely. ABPR starts `N = 8` independent threads with distinct random seeds, sampling temperature 1.0, and total depth `Tdepth = 10` (Section 4.1, p. 7). The final candidates are aggregated by diversity-prioritized voting and the top two are submitted (Appendix B.2, p. 13).

application sequence

1. permute few-shot examples and initialize eight independent processes
2. run each process for one generation plus up to nine repair rounds
3. collect final hypotheses and their training outcomes
4. choose two candidates maximizing consensus and verification consistency while preserving diversity
5. report Pass@2 over those two outputs
6. repeat runs to estimate sample standard deviation and range (Appendix B.3–B.4, pp. 13–14)

Verus form

Inference: the ensemble itself is an execution policy, not a proof technique. A Rust coordinator can be verified for bounded worker count, deterministic top-two selection under a tie rule, and correct Pass@2 bookkeeping. Candidate correctness still requires separate contracts. Random seeds, API responses, and model weights are trusted inputs.

reported evidence and boundary

On the 120-task public evaluation set, repeated-run means and sample standard deviations were 56.25±0.59 for Gemini-3-Flash ABPR and 98.05±0.48 for GPT-5.5 xHigh ABPR (Table 2, p. 13). The denominator is 120 tasks, and the standard deviation is across repeated runs, not task-level uncertainty. At `N=8`, `Tdepth=10`, the averaged standard deviation was 0.665 percentage points and range 1.667 (Appendix B.4, p. 14). Larger ensembles reduce variance but increase API cost and do not repair a fundamentally wrong initial abstraction.

## technique 5: transfer beyond ARC with trace-guided symbolic solvers

ABPR also uses the same verifier-in-the-loop trace repair for fill-in-the-blank symbolic RAVEN tasks. The runner hides candidate answers from the prompt and scores the returned Prolog solver (Appendix B.5, pp. 14–15). It allows at most two repair rounds and five oracle questions per instance.

On 500 I-RAVEN-X instances, Prolog direct solved 170/500 (34.00%), execution-feedback repair 198/500 (39.60%), and Prolog ABPR 443/500 (88.60%). On 500 A-I-RAVEN-style instances, the corresponding counts were 141/500 (28.20%), 170/500 (34.00%), and 468/500 (93.60%) (Table 3, p. 15). The denominator is 500 instances per suite. Python no-trace references reached 320/500 and 408/500 on I-RAVEN-X and 370/500 and 443/500 on A-I-RAVEN, so the comparison is not a claim that Prolog is universally better.

Verus form

Inference: encode the symbolic matrix relation as a Verus `spec fn` and prove the solver's returned entry against the relation. Use trace structures and `ensures` to connect local repairs to the relation. The paper's Prolog engine and benchmark generator are external; Verus can check a ported solver, not the LLM's choice of abstraction.

## evidence, trust, and VL implications

The paper proves no theorem that ABPR finds a correct latent rule. It measures Pass@2, solved-task fractions, repeated-run variance, and ablations. Trusted elements include background predicates, training labels, Prolog semantics, the meta-interpreter, LLM oracle and repairer, prompts, model APIs and weights, benchmark scoring, and the human interpretation of the intended rule. Inference: this is a strong pattern for VL's proof repair loop: generate code, extract a machine-checkable semantic trace, localize a failed contract, propose a small patch, and rerun Verus. The threat is circularity if the same agent both invents the specification and judges its repair; Verus should remain the independent checker.

The paper already covers APD-style proof-tree localization, stochastic top-k search, execution-feedback baselines, and ensemble variance control. VL should not redo these as generic claims. A distinct VL experiment would measure whether Verus proof obligations provide a better trace than Prolog derivations for Rust repairs, with denominators for accepted repairs and regressions.

## techniques for the catalog

- bottom-clause initialization: construct a most-specific explanation and have an LLM generalize it into an executable hypothesis
- APD proof-tree tracing: reify SLD goal-subgoal resolution into nodes containing bindings, clauses, and child derivations
- localized abductive repair: use a failed trace to identify faulty predicates and propose a local hypothesis change
- bounded top-k refinement: iterate verifier-guided repairs while retaining the highest-coverage candidates in a fixed history
- parallel diversity search: run independent seeded trajectories and select two diverse, verification-consistent outputs

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
