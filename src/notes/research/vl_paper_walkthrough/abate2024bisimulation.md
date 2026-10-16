# Bisimulation Learning
(authored by agents unless marked 🧑)
Tag: `abate2024bisimulation`, [paper](http://arxiv.org/abs/2405.15723v1)

## scope and result

Abate, Giacobbe, and Schnitzer learn finite stutter-insensitive bisimulations of deterministic transition systems from samples, instead of computing exact partition pre-images. A learned binary decision-tree classifier maps concrete states to finitely many classes; each class has a ranking function that decreases during same-class stuttering. An SMT verifier checks the candidate over the whole state space and supplies counterexamples when it fails. The abstract states then support LTL model checking without the next operator and system diagnosis.

The abstract states the central loop precisely: “Upon a negative answer, the solver produces a counterexample state for which the classifier violates the claim, adds it to the dataset, and repeats learning and checking in a counterexample-guided inductive synthesis loop until a valid bisimulation is found.” (Abstract, p. 1). The method is for deterministic systems; strong bisimulation is the special case where ranking functions are constant (Sec. 1, p. 3).

Inference: The useful VeruLaw (VL) lesson is a verifier-guided synthesis loop for candidate invariants, classifiers, or ranking functions. The paper's bisimulation property is not a Rust safety contract, so a direct performance or threat comparison would be invalid.

## technique: characterize stutter-insensitive bisimulation with classifiers and rankings

What it is: replace an equivalence relation over a potentially infinite state space with (i) a finite state classifier `f : S → C`, (ii) a deterministic class transition `g : C → C`, and (iii) a natural-valued ranking function `h_c` for each class. The classifier must preserve observations. For every class transition `c → d`, a state either moves directly to class `d` or remains in `c` while its ranking strictly decreases; if a state moves from `c` to `d`, `g(c)=d` (Theorem 3, pp. 11–12).

Inference: When to use it: use this abstraction when many concrete steps leave observations unchanged and a finite quotient can preserve the temporal properties of interest. Stuttering is especially useful for systems whose concrete state space is infinite but whose observable behavior has few phases.

How to do it:

1. Define the labelled deterministic transition system, state space, initial region, transition function, and observations (Definitions 1 and 5, pp. 5–7).
2. Choose finite classes and a label-preserving classifier `f`.
3. Define the quotient transition `g` between classes.
4. For each class `c`, define a ranking `h_c : S → N`.
5. Require `f(s)=c ∧ g(c)=d` to imply either `f(T(s))=d` or `f(T(s))=c ∧ h_c(s)>h_c(T(s))`.
6. Require an observed class change to agree with `g`.
7. Use Theorem 3 to conclude that equal classifier values form a stutter-insensitive bisimulation and that the quotient transition is `g`.

The ranking argument prevents infinite stuttering: a natural-valued function cannot decrease forever. The paper says: “As the value of hR is bounded from below and must strictly decrease along any trajectory, no trajectory can stutter in R indefinitely and must eventually enter Q.” (Sec. 4, p. 10).

Inference: In Verus, this shape can represent a phase classifier in a `spec fn`, with a natural-valued `spec fn` ranking and proof lemmas establishing decreases across loop iterations. A Rust loop would carry an `invariant` stating class membership and nonnegativity of the rank; the exact encoding depends on the program and is not supplied by this paper.

Limits: the theorem assumes deterministic transitions and label preservation. A strong bisimulation preserves next-step behavior but can produce larger quotients; stutter-insensitive bisimulation preserves LTL without next. Neither relation automatically preserves properties outside the stated logic.

## technique: learner-verifier CEGIS loop

What it is: alternate finite-sample synthesis with whole-state counterexample checking. The learner solves parameter constraints for classifier, class transition, and ranking templates on a dataset `D`. The verifier asks whether any state violates either bisimulation condition. An SMT model of that query is added to `D`; UNSAT terminates the loop with a certificate for the chosen templates.

How to do it:

1. Start with a finite set of sample states and transitions.
2. Instantiate templates `f(θ; s)`, `g(γ; c)`, and `h_c(η; s)`.
3. Ask an SMT solver for parameters satisfying Theorem 3's two conditions on every sampled state (Eq. 4, p. 12).
4. Substitute the candidate parameters into the universal conditions and ask whether there exists a violating state (Eq. 7, p. 13).
5. If SAT, add the returned counterexample state to the dataset and repeat learning.
6. If UNSAT, return the classifier, quotient, and rankings as a valid stutter-insensitive bisimulation for the transition-system model.
7. If the learner returns UNSAT because the template cannot fit samples, enlarge the classifier and resume.

The paper states: “If the formula is unsatisfiable, the procedure terminates and has successfully synthesised a valid stutter-insensitive bisimulation and its corresponding quotient.” (Sec. 4.1, p. 13).

Inference: A VL loop could propose Verus loop invariants or ranking functions, run Verus, convert a failed proof obligation into a counterexample or diagnostic, and regenerate the candidate. Verus's proof checker, rather than an SMT query alone, must establish the final Rust contract. Counterexamples are an engineering extension, not a construct described in the paper's Verus terms.

## technique: interpretable binary decision-tree templates

What it is: use binary decision trees (BDTs) with parameterized real-valued predicates at internal nodes and class labels at leaves. Each class receives a linear ranking `h_c(η,s)=η1·s+η2` (Sec. 4.2, pp. 13–14). The tree is initialized with fixed observation predicates at its top nodes, guaranteeing label preservation for every parameter assignment.

How to do it:

1. Build top nodes from atomic-proposition predicates so each leaf already preserves the system's labels.
2. Add parameterized decision nodes below those fixed nodes.
3. Solve tree parameters and ranking coefficients with the learner.
4. If samples cannot fit the tree, add one layer, doubling available partitions, and rerun CEGIS.
5. Emit the tree as an interpretable partition and use it to explain which valuations share behavior.

The Euclidean-algorithm example starts with terminated versus non-terminated classes. The final tree separates positive unequal inputs, which eventually reach equality, from non-positive inputs that stutter forever (Fig. 1 and Sec. 2, pp. 4–5). The authors emphasize: “Specifically, our approach yields interpretable classifiers as binary decision trees.” (Sec. 2, p. 5).

Inference: For VL, a decision tree could classify states by protocol phase, ownership mode, or resource status, while a Verus rank proves progress within a phase. A Verus proof normally needs explicit specifications and invariants; a tree is a synthesis template, not a replacement for them.

Limits: linear predicates and linear rankings may be unable to express a needed partition. The automatic enlargement handles finite-sample underfitting, but it cannot make an unavailable finite quotient exist.

## technique: sample-efficient refinement with solver counterexamples

What it is: use a small fixed set of uniform initial samples and rely on informative verifier counterexamples rather than expensive exhaustive sampling. The paper identifies a trade-off: more initial samples can reduce CEGIS iterations but increase SMT cost. It therefore chooses a fixed small sample set for benchmarks (Sec. 5.1, p. 17).

Inference: When to use it: use this when the state space is very large or infinite and whole-state symbolic checking is available, but initial exhaustive exploration is infeasible.

Evidence: The verifier and learner both use Z3. For the reactive benchmarks, each experiment is repeated 10 times and Table 1 reports mean runtime and standard deviation. The table has 24 rows: twelve safe/unsafe TTEthernet and twelve safe/unsafe convergence instances. For example, TTEthernet safe at 1,000 steps per second has 2.5×10^6 states, nuXmv IC3 times out at 500 seconds for both properties, nuXmv BDD takes 1.8 seconds for `G(safe)` and 31 seconds for `GF(sync)`, while bisimulation learning takes 1.2±0.4 seconds (Table 1, pp. 16–17). At 10,000 steps, the safe TTEthernet instance has 2.5×10^8 states; BDD takes 193 seconds for `G(safe)` and times out for `GF(sync)`, while learning takes 1.6±0.2 seconds.

Inference: These are per-instance runtime comparisons, not an aggregate speedup over all systems. They support the method on the listed protocols and settings, not universal scalability.

## technique: derive conditional termination partitions

What it is: apply the learned quotient to software model checking so it separates inputs where a program terminates from inputs where it loops forever. Unlike the baselines, which ask whether all inputs terminate, the learned classifier returns an exact partition of variable valuations for the considered model.

How to do it:

1. Encode an integer-state program as a deterministic transition system.
2. Split each benchmark into a terminating-input (`term`) and potentially non-terminating (`¬term`) version.
3. Learn a stutter-insensitive quotient with BDT and ranking templates.
4. Interpret classes as terminating or non-terminating regions.
5. Compare runtime with nuXmv, CPAChecker, and Ultimate; report non-conclusive (`n/c`) and timeout (`oot`) outcomes separately.

Evidence: Table 2 contains 12 SV-COMP-derived program benchmarks. Learning times range from 0.2±0.1 seconds (`term-loop-1`) to 4.2±7.3 seconds (`conic`), while nuXmv has multiple 500-second timeouts. For `euclid`, learning is 0.6±0.2 seconds; CPAChecker reports `n/c` for `term` and 0.3 seconds for `¬term`; Ultimate reports 1.6 and 0.4 seconds (Table 2, p. 18). The paper states that the procedure “is able to generate exact preconditions for which the program terminates” (Abstract, p. 1), but the experiments are finite benchmark instances and do not prove completeness.

Limits: the method is incomplete for infinite systems. The paper gives natural numbers decrementing toward zero with labels zero/even/odd as a system for which no finite stutter-insensitive bisimulation exists; CEGIS keeps enlarging the tree and never generalizes (Sec. 5.2, pp. 18–19).

## what is proved, measured, and trusted

The mathematical sufficient conditions in Theorems 2 and 3 establish a valid bisimulation for the given transition-system model when the verifier's formula is UNSAT. Z3 is used for learner and verifier; nuXmv checks LTL properties on the learned abstraction. Measurements are per-benchmark runtimes, with 10 repetitions and reported mean ± standard deviation for reactive systems; the software table similarly reports runtimes and status values. The source program model, transition encoding, observation labels, chosen templates, SMT solver, and quotient semantics remain trusted assumptions.

Inference: A Verus proof of a ranking invariant would establish the encoded transition relation's property, not that the encoding faithfully models the deployed Rust program unless the code-to-model link is also verified.

## implications for VeruLaw and threat assessment

Inference: The strongest transferable idea is counterexample-guided repair of proof artifacts. An agent can propose an invariant or ranking function, let Verus expose a failed obligation, and use the diagnostic to refine the proposal. The product threat is that a finite candidate may fit sampled executions while failing on an unseen state; a whole-state verifier or mechanically checked invariant is required before acceptance.

Inference: VL should not copy the paper's BDT bisimulation as a generic Rust verification method. It should reuse the CEGIS control loop, explicit template growth, ranking-function discipline, counterexample retention, and reporting of solver/time denominators. Progress proofs must use valid Verus constructs and contracts from the local Verus guidance.

## techniques for the catalog

- classifier-plus-ranking abstraction — represent a finite quotient with a label-preserving state classifier, deterministic class transition, and decreasing ranking per class
- learner-verifier CEGIS — fit templates on samples, search the entire state space for a violating state, add counterexamples, and stop on UNSAT
- observation-fixed decision trees — encode label predicates in tree roots, then learn refinements while preserving observations
- automatic template enlargement — add a tree layer when finite samples cannot fit the current partition
- sample-efficient refinement — use small initial samples and informative SMT counterexamples instead of exhaustive state exploration
- conditional-termination quotient — learn classes that separate terminating from non-terminating input regions and expose interpretable preconditions
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
