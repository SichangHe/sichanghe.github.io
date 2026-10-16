# PRISM 4.0: Verification of Probabilistic Real-Time Systems
(authored by agents unless marked 🧑)
Tag: `kwiatkowska2011prism`, [paper](https://doi.org/10.1007/978-3-642-22110-1_47)

## scope and claims

PRISM 4.0 adds formal modelling and analysis for probabilistic, nondeterministic and real-time systems through probabilistic timed automata (PTAs). The paper lists support for discrete- and continuous-time Markov chains, Markov decision processes, probabilistic automata, PTAs and priced PTAs. It reports that PRISM had been downloaded more than 20,000 times, but gives no experiment denominator or new-versus-old comparison for this release. The paper's concrete verification claims are the algorithms and supported model classes; it does not report a benchmark table of success rates or runtimes in this paper.

## technique: model a probabilistic timed automaton

What it is: a PTA is a finite-state automaton with real-valued clocks and discrete probabilistic choice. A guard on a transition constrains when it may fire; a state invariant constrains time spent in the state; a transition chooses its target, clock resets and data updates from a discrete distribution. Nondeterminism selects among enabled transitions and chooses how time elapses while invariants hold.

When to use it: use a PTA when a system combines random outcomes, scheduling or environmental nondeterminism, and real-time constraints. The paper's example repeatedly transmits over an unreliable channel: sending takes 1--2 time units, failure has probability 0.1, and retry delay is 3--5 time units, up to N attempts.

How to do it: (1) declare finite-ranging data variables and clocks; (2) write state invariants such as `s=0 => x<=2` and `s=1 => x<=5`; (3) write guarded commands whose probabilistic branches update state, counters and clocks; (4) add a target property, such as maximum probability of an airbag failing within 0.02 seconds or maximum expected time to termination; (5) run one of the PTA engines. The paper's code shape has `x : clock`, an `invariant ... endinvariant` block, a command `[send] s=0 & x>=1 & tries<=N -> 0.9 : (s'=3) + 0.1 : (s'=1)&(tries'=tries+1)&(x'=0);`, and a `[retry]` command resetting `x`.

Verus form: Inference: represent the finite control state and counters as Rust fields with a `closed spec fn` describing the abstract state; express legal clock bounds as a `spec fn` invariant and require it in `requires` clauses. A verified transition function can use `ensures` to preserve the invariant and to state each probabilistic branch's result, but Verus has no native probabilistic or real-time execution model. Inference: probability distributions and continuous time therefore need a separate mathematical model (for example, finite maps and real-number specifications) and proof that the implementation conforms to it.

Evidence and limits: the paper defines the model and gives the transmission example (Section 2, pp. 586--587). It says, “Probabilistic timed automata (PTAs) [6,12] are finite-state automata enriched with real-valued clocks, in the style of timed automata, and with discrete probabilistic choice, in the style of Markov decision processes (MDPs).” Exact quantitative results are not reported here. Digital-clock analysis has restrictions such as disallowing strict comparisons like `x<1` (footnote 1, p. 588).

## technique: priced PTAs and reward properties

What it is: attach a reward rate to each state (possibly depending on data) and accumulate reward as time elapses. This models energy, resource use, or elapsed time. The paper calls the resulting model a priced PTA and analyses minimum or maximum expected reward until a target is reached.

How to do it: add a reward structure to the PTA, assign a rate to states, then ask for an expected accumulated reward. The example declares `rewards "energy" (s=0) : 2.5; endrewards`, charging 2.5 during transmission.

Verus form: Inference: represent reward as a ghost/specification accumulator updated by each transition and by an abstract time-elapse operation; prove an `ensures` relation between the accumulator and the mathematical integral or discrete sum. The executable Rust should retain only the concrete state and sampled timing; proof code establishes the accounting relation.

Evidence and limits: Section 2 states that PRISM supports linearly priced PTAs, accumulating reward proportional to elapsed time at a rate dependent on state and data (p. 587). The paper gives no numerical reward case study. Inference: a Verus proof would assume a trusted clock and arithmetic model unless those are themselves verified.

## technique: quantitative abstraction refinement

What it is: iteratively construct, analyse and refine probabilistic abstractions until probability bounds become precise. For PTAs, PRISM builds stochastic two-player games over zones; this gives exact probabilistic reachability verification. The toolkit also applies predicate abstraction with SAT to probabilistic software and abstractions of finite-state MDPs.

How to do it: construct and analyse a series of probabilistic abstractions, refining each step for greater precision. Use stochastic two-player game abstractions defined in terms of zones for PTA reachability (Section 2, p. 587). Configure the model type, refinement strategy and optimisations in the extensible toolkit (Section 3, pp. 588–589). The paper does not specify lower/upper-bound calculations, splitting rules, or stopping conditions; those details require the cited algorithm papers.

Verus form: Inference: define an abstract state type and a refinement relation as `spec fn`s; prove that every concrete transition is simulated by an abstract game transition and that abstract probability bounds enclose concrete behaviour. Verus can discharge finite arithmetic and invariant-preservation lemmas, but a probability solver and zone semantics would remain an external specification or trusted library.

Evidence and limits: the paper calls this PRISM's default PTA engine and says experiments in its cited work show it generally outperforms other available methods (Section 2, p. 587). Section 3 says the method is “a fully automatic approach to verification of large or infinite-state probabilistic systems, by iteratively building, analysing and refining increasingly precise probabilistic abstractions” (p. 589). No denominator, model list, or runtime appears in this paper, so the comparative claim cannot be independently quantified here. Inference: abstraction is only sound when the abstraction and refinement relation cover every concrete behaviour.

## technique: digital-clocks translation

What it is: translate a PTA to an equivalent finite-state discrete-time model with integer-valued clocks, then apply PRISM's existing MDP model-checking algorithms. It supports both probabilistic reachability and expected cumulative rewards for linearly priced PTAs.

How to do it: (1) restrict clock expressions as required by the translation; (2) replace each real-valued clock with integer clock states; (3) generate the finite discrete-time MDP; (4) run symbolic or explicit MDP checking; (5) map the result back to the PTA property. The paper notes this is less efficient than on-the-fly zones for ordinary timed automata but remains competitive for PTAs and combines well with BDDs.

Verus form: Inference: implement the translated finite MDP as Rust enums and finite maps, prove a bisimulation or value-preserving relation between the concrete timed model and integer-clock model, then verify the finite algorithm with `requires`/`ensures` and loop invariants. Verus cannot by itself establish the real-time equivalence; that relation is the central additional proof obligation.

Evidence and limits: Section 2 describes the method and its applicability (pp. 587--588). Footnote 1 restricts strict clock comparisons. Inference: models requiring those comparisons or unbounded clock precision cannot use this translation without a new soundness argument.

## technique: symbolic and explicit-state engines

What it is: PRISM offers BDD-based symbolic engines (MTBDD, sparse and hybrid) and a new explicit-state library using sparse matrices. The explicit library supports stochastic two-player games, MDPs, DTMCs and CTMCs and is intended for reusable algorithms and on-the-fly model construction.

How to do it: choose a symbolic engine when compact decision diagrams are useful; choose the explicit library when states and transitions must be constructed or modified during analysis; represent transitions in sparse matrix form and invoke the relevant probabilistic linear-algebra/model-checking routine.

Verus form: Inference: a Rust implementation can use verified finite map/vector representations and prove that matrix construction preserves transition probabilities and row-sum constraints. BDD internals and floating-point or rational arithmetic need their own trusted specifications; Verus does not provide these engines.

Evidence and limits: Section 3 reports the Java sparse-matrix library and its use by abstraction refinement (pp. 588--589). The paper gives no memory or runtime measurements. Inference: engine choice is an engineering trade-off, not a correctness theorem; both require a sound model construction.

## technique: statistical model checking

What it is: sample random paths through a discrete-event simulator and use statistical tests instead of exhaustive state exploration. For quantitative properties, PRISM computes a confidence interval at a chosen confidence level or a probabilistic correctness guarantee using the Chernoff--Hoeffding bound. For bounded properties such as `P<0.1[...]`, it uses acceptance sampling implementing Wald's sequential probability ratio test (SPRT).

How to do it: use the discrete-event simulator to generate random paths; request a confidence interval or a Chernoff--Hoeffding correctness guarantee for a quantitative property, or acceptance sampling implementing Wald's SPRT for a threshold property (Section 3, p. 589). The paper does not specify sampling independence, sample counts, likelihood calculations, or stopping rules. Inference: those statistical prerequisites and the chosen error parameters must be checked in the cited methods before applying them.

Verus form: Inference: verify the path simulator and property evaluator against a finite probabilistic transition model, then state the statistical theorem as an external lemma or separately verified probability library. Verus can prove deterministic sampling bookkeeping and loop invariants, but it does not turn a finite sample into an exhaustive proof.

Evidence and limits: Section 3 says statistical checking “offers significantly improved scalability, in comparison to conventional probabilistic model checking techniques, and applies to a broader class of models” (p. 589), but gives no sample counts, confidence levels, error bounds, or benchmark denominator. Inference: the result is approximate and can miss rare behaviours unless the supplied statistical parameters make the desired error probability acceptable.

## technique: optimal adversary or strategy generation

What it is: when an MDP checker computes a minimum or maximum reachability probability or expected reward, it also returns an adversary resolving nondeterministic choices that attains that value. The strategy can explain a result, generate probabilistic counterexamples, or produce an optimal schedule. The digital-clocks engine extends this to PTAs.

How to do it: specify the extremal reachability or reward property and run MDP verification with adversary generation, or use the digital-clocks engine for a PTA. Use the generated resolution of nondeterminism to analyse results, generate counterexamples, or obtain a schedule (Section 3, p. 589). The paper does not describe the strategy storage or replay algorithm.

Verus form: Inference: represent a strategy as a total function from abstract states to enabled actions; prove with `ensures` that every selected action is enabled and that the resulting value equals the claimed extremum. Optimality requires a separately specified dynamic-programming or game-solving theorem.

Evidence and limits: Section 3 states that PRISM can generate an adversary “that produces” the computed minimum or maximum (p. 589). No optimality benchmark is given. Inference: an adversary is only as meaningful as the model's nondeterministic choices and reward specification.

## what is proved, trusted, and relevant to VL

The paper proves no new theorem about Rust or Verus. It describes implemented model classes, algorithms and components. Inference: for agent-written verified Rust, the strongest reusable ideas are explicit state modelling, abstraction/refinement to control state explosion, strategy extraction for counterexamples, and statistical checking as a scalable testing complement. Inference: the threat reduction is moderate for probabilistic protocol logic but low for probability semantics, clock realism, solver correctness, and specification adequacy; those remain trusted unless separately formalized. The paper's benchmark suite is a reusable evaluation asset, but its purpose is to compare probabilistic model checkers rather than to verify Rust implementations.

## techniques for the catalog

- PTA modelling — encode clocks, guards, invariants, probabilistic updates and nondeterministic time in a guarded-command model
- priced PTA rewards — accumulate state-dependent rates and verify extremal expected reward to a target
- quantitative abstraction refinement — iteratively refine stochastic-game abstractions until probability bounds are exact
- digital clocks — translate timed models to finite integer-clock MDPs and reuse MDP checking
- symbolic and explicit engines — choose BDD or sparse-matrix state exploration according to model-construction needs
- statistical model checking — estimate quantitative properties with confidence/Chernoff--Hoeffding bounds and test thresholds with Wald SPRT
- optimal adversaries — extract nondeterminism-resolving strategies that attain computed probability or reward extrema
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "This method also has the widest applicability, supporting both probabilistic reachability properties and expected cumulative rewards for (linearly) priced probabilistic timed automata [11]."): checked all seven pages including references, quotations, numbers, examples, section/page references, techniques, and tag; corrected reward-rate wording and removed algorithm details absent from this paper concerning refinement, sampling, and strategy generation; link from the fetch record; did not check implementation or cited algorithm papers.
