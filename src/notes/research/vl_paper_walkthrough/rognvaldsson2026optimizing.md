# Optimizing the Cost-Quality Tradeoff of Agentic Theorem Provers in Lean
(authored by agents unless marked 🧑)
Tag: `rognvaldsson2026optimizing`, [paper](http://arxiv.org/abs/2606.04883v3)

## scope

This paper adds a cost-quality control plane to a lemma-generating Lean prover. The data plane decomposes a problem, formalizes lemmas, and samples proofs. The control plane observes failed attempts and decides whether another attempt is worth its estimated compute or whether to abandon the current target and restart from a different breakdown. The paper's abstract states: “The control plane observes previous failed Lean attempts, estimates both the likelihood of success and the cost of another attempt, and decides whether to continue proving the current target or restart from a new breakdown.” (abstract, PDF p. 1).

## technique: modular lemma data plane

Use this when whole-proof generation wastes attempts on a large theorem. The data plane has four modules (section 3.1, PDF p. 3): generate a natural-language lemma decomposition; formalize the decomposition in Lean; prove the formal breakdown; then recursively prove only lemmas actually invoked by an accepted proof. The formal breakdown is initially proved while its natural-language dependencies are supplied as Lean axioms. If a proof compiles, extract the invoked lemmas and push them onto a stack. Pop one lemma, include its statement, proof sketch, and sketch dependencies, and generate attempts with the same prover. Successful lemma proofs can add more dependencies to the stack; an empty stack means the original problem is solved. Failed breakdowns or lemmas are discarded when the attempt limit or router says stop.

Inference: in Verus, the analogous decomposition is a top-level executable function with `requires`/`ensures`, plus `proof fn` lemmas for each subclaim. A temporary external assumption would need to be represented explicitly and then discharged by a verified lemma; Verus constructs do not make an unproved axiom safe. Keep a dependency stack of lemmas referenced by accepted proof functions and invoke Verus after each generated proof (inference).

Evidence comes from the paper's 85-problem PutnamBench test. With the same Goedel-Prover-V2-8B model, the data-plane pipeline solved 48/85 at high budget, versus 23/85 for whole-proof generation at pass@256; its average solve-rate AUC was 88.2% higher than whole-proof 8B and 23.2% below whole-proof 32B (section 4.3.3, PDF p. 7). These denominators and comparisons are specific to that 85-problem subset and model settings.

## technique: marginal-value action router

At each target, record the trajectory: generated proof text and its normalized structure, compilation success/failure, error messages, output lengths, and attempt count. The paper defines actions `{ATTEMPT, TERMINATE}` (section 3.2.1, PDF p. 4). It summarizes the motivation: “Agentic theorem provers are expensive.” (section 1, PDF p. 1) It always samples two attempts before the first routing decision. Train a logistic regression quality estimator on random trajectories from a 42-problem training split, labeling whether the next attempt succeeds. Estimate cost as the mean output-token cost of prior attempts; the authors assume attempts for one target are identically distributed and treat Lean compilation cost as negligible (section 3.2.3, PDF p. 5).

Compute proof similarity by extracting proof bodies, renaming variables canonically, removing comments and redundant whitespace, then taking average pairwise fuzzy-string ratio. Compute error diversity as unique compilation errors divided by total errors. Low diversity indicates repetition. Feed these features and attempt count into the logistic regression to obtain q-hat(s), the probability that one more attempt succeeds. Let c-hat(s) be estimated cost and choose a penalty lambda. The paper's rule is: “A positive value of τ (s) indicates that the expected gain in success probability outweighs the cost of another attempt under the chosen budget preference.” (section 3.2.2, PDF p. 4). Specifically, τ(s)=q-hat(s)−lambda*c-hat(s); attempt when τ>0, otherwise terminate and restart. Smaller lambda spends more compute; larger lambda terminates earlier.

Inference: a Verus controller can extract failed verifier diagnostics, proof-body similarity, and repeated error classes, train the same lightweight classifier, and choose whether to ask for another `proof fn`, change decomposition, or abandon a contract. The cost proxy should include model tokens and Verus verification time if that time is material. Verus diagnostics are not Lean errors, so feature extraction requires an adapter (inference).

The action space can be generalized: the paper explicitly suggests model switching, self-correction from compiler errors, and recursive decomposition, with policy `arg max_a q-hat(a,s)−lambda*c-hat(a,s)` (section 3.3, PDF p. 5). This creates a reusable controller separate from any particular prover.

## evidence and limits

On the 43-problem held-out test split, the router reduced the area-under-curve cost by 28.9% relative to the fixed-step baseline and improved accuracy 7.9% at equal budget (section 4.2, PDF p. 6). At a high-accuracy point, the fixed baseline solved 44.0% (of the 85-problem evaluation set) using 28.5 M SFLOPs; the router solved 43.6% using 20.4 M SFLOPs, a 28.4% cost reduction with a 0.4 percentage-point solve-rate decrease. In a medium-budget comparison, fixed solved 41.8% at 22.3 M SFLOPs and router solved 41.6% at 15.7 M, a 29.6% cost reduction with a 0.2 point decrease. SFLOPs are model effective parameter count times generated output tokens; each percentage is over the 85 test problems, while the training/test split is 42/43.

Ablations show all three features matter: full features 28.9% cost reduction, proof similarity plus error diversity 23.6%, error diversity plus attempt count 20.3%, proof similarity plus attempt count 19.7%, and attempt count alone 13.1% (Table 2, PDF p. 7). A noisy-oracle analysis gives 62.0% at zero noise and 28.2% at 5% noise; the router's 28.9% lies between the 4% and 5% oracle settings (Table 1, PDF p. 7). These are AUC reductions against the fixed-step baseline, not solve-rate percentages.

Trusted components include Lean's kernel, the generated formalization, the classifier training labels, the cost proxy, and the assumption that prior-attempt means predict future cost. The paper's model and benchmark are Lean-specific; it does not measure Verus, Rust, unsafe code, or specification adequacy. Inference: threat to VeruLaw is moderate and practical: routing could reduce expensive failed verification calls, but a learned stop decision can terminate a proof that would later succeed, and a Verus adapter must preserve sound compile-and-check gates. Existing fixed-step agents should not be rebuilt unchanged; this work already isolates adaptive allocation as the missing control layer (inference).

## techniques for the catalog

- lemma-stack decomposition — formalize a breakdown, then recursively prove only lemmas referenced by accepted proofs
- trajectory features — derive proof similarity, error diversity, and attempt count from failed verifier runs
- logistic success estimator — predict the next-attempt success probability from prior trajectory features
- marginal-value routing — attempt iff predicted quality minus lambda times predicted cost is positive
- action-space extension — add model switching, self-correction, or decomposition as scored actions

Checked 2026-10-15 against the paper by a Codex agent for optimizing_the_cost_quality_tradeoff_of__20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
