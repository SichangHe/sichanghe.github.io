# PRISM 4.0: Verification of Probabilistic Real-Time Systems
(authored by agents unless marked 🧑)
Tag: `kwiatkowska2011prism`, [paper](https://doi.org/10.1007/978-3-642-22110-1_47) (link from the fetch record)

## scope and claims

PRISM 4.0 adds formal modelling and analysis for probabilistic, nondeterministic and real-time systems through probabilistic timed automata (PTAs). The paper lists support for discrete- and continuous-time Markov chains, Markov decision processes, probabilistic automata, PTAs and priced PTAs. It reports that PRISM had been downloaded more than 20,000 times, but gives no experiment denominator or new-versus-old comparison for this release. The paper's concrete verification claims are the algorithms and supported model classes; it does not report a benchmark table of success rates or runtimes in this paper.

## technique: model a probabilistic timed automaton

What it is: a PTA is a finite-state automaton with real-valued clocks and discrete probabilistic choice. A guard on a transition constrains when it may fire; a state invariant constrains time spent in the state; a transition chooses its target, clock resets and data updates from a discrete distribution. Nondeterminism selects among enabled transitions and chooses how time elapses while invariants hold.

When to use it: use a PTA when a system combines random outcomes, nondeterminism, and real-time constraints. The paper's example repeatedly transmits over an unreliable channel: sending takes 1--2 time units, failure has probability 0.1, and retry delay is 3--5 time units (Section 2, p. 587). The prose says “before retrying (up to N times)”; Figure 2 (p. 588) enables sending while `tries<=N`, initializes `tries` to zero, and increments it after failure. Inference: the code permits N+1 transmission attempts, rather than N total attempts.

How to do it: (1) declare finite-ranging data variables and clocks; (2) write state invariants such as `s=0 => x<=2` and `s=1 => x<=5`; (3) write guarded commands whose probabilistic branches update state, counters and clocks; (4) add a target property, such as maximum probability of an airbag failing to deploy within 0.02 seconds or maximum expected time to termination; (5) run one of the PTA engines. Figure 2 has `x : clock`, an `invariant ... endinvariant` block, a command `[send] s=0 & x>=1 & tries<=N -> 0.9 : (s'=3) + 0.1 : (s'=1)&(tries'=tries+1)&(x'=0);`, and a `[retry]` command resetting `x` (p. 588; mathematical symbols rendered as ASCII here).

Verus form: Inference: a possible adaptation would specify control states, counters, clock bounds and each transition's permitted results, then prove invariant preservation. It would also need a mathematical account of probability and continuous time and a proof connecting the implementation to that account. This paper does not establish such an adaptation.

Evidence and limits: the paper defines the model and gives the transmission example (Section 2, pp. 586--587). It says, “Probabilistic timed automata (PTAs) [6,12] are finite-state automata enriched with real-valued clocks, in the style of timed automata, and with discrete probabilistic choice, in the style of Markov decision processes (MDPs).” Exact quantitative results are not reported here. Digital-clock analysis has restrictions such as disallowing strict comparisons like `x<1` (footnote 1, p. 588).

## technique: priced PTAs and reward properties

What it is: attach a reward rate to each state (possibly depending on data) and accumulate reward as time elapses. This models energy, resource use, or elapsed time. The paper calls the resulting model a priced PTA and analyses minimum or maximum expected reward until a target is reached.

How to do it: add a reward structure to the PTA, assign a rate to states, then ask for an expected accumulated reward. The example declares `rewards "energy" (s=0) : 2.5; endrewards`, charging 2.5 during transmission.

Verus form: Inference: a possible adaptation would specify a reward accumulator and prove that each abstract time-elapse operation adds the state-dependent rate multiplied by elapsed time. Relating that accounting to expected reward would require an additional probability model.

Evidence and limits: Section 2 states that PRISM supports linearly priced PTAs, accumulating reward proportional to elapsed time at a rate dependent on state and data (p. 587). The paper gives no numerical reward case study. Inference: a Verus proof would assume a trusted clock and arithmetic model unless those are themselves verified.

## technique: quantitative abstraction refinement

What it is: iteratively construct, analyse and refine increasingly precise probabilistic abstractions. For PTAs, PRISM builds stochastic two-player games over zones; this gives exact probabilistic reachability verification. Section 3 also describes applications to probabilistic software using predicate abstraction and SAT, and to finite-state MDPs.

How to do it: construct and analyse a series of probabilistic abstractions, refining each step for greater precision. Use stochastic two-player game abstractions defined in terms of zones for PTA reachability (Section 2, p. 587). Configure the model type, refinement strategy and optimisations in the extensible toolkit (Section 3, pp. 588–589). The paper does not specify lower/upper-bound calculations, splitting rules, or stopping conditions; those details require the cited algorithm papers.

Verus form: Inference: a possible adaptation would define an abstract state and a relation to concrete states, then prove that the abstraction covers concrete transitions and yields valid probability bounds. The probability solver and zone semantics would need their own specifications and proofs.

Evidence and limits: the paper calls this PRISM's default PTA engine and says experiments in its cited work show it generally outperforms other available methods (Section 2, p. 587). Section 3 says the method is “a fully automatic approach to verification of large or infinite-state probabilistic systems, by iteratively building, analysing and refining increasingly precise probabilistic abstractions” (p. 589). No denominator, model list, or runtime appears in this paper, so the comparative claim cannot be independently quantified here. Inference: abstraction is only sound when the abstraction and refinement relation cover every concrete behaviour.

## technique: digital-clocks translation

What it is: translate a PTA to an equivalent finite-state discrete-time model with integer-valued clocks, then apply PRISM's existing MDP model-checking algorithms. It supports both probabilistic reachability and expected cumulative rewards for linearly priced PTAs.

How to do it: use the digital-clocks engine to translate an eligible PTA automatically into an equivalent finite-state discrete-time model with integer-valued clocks, then apply PRISM's existing MDP checking techniques. Section 2 says such methods are usually much less efficient than on-the-fly zone reachability for ordinary timed automata, but remain competitive for PTAs, especially with PRISM's symbolic BDD implementation (p. 588). The paper does not give the translation algorithm.

Verus form: Inference: a possible adaptation would represent the finite MDP in Rust and prove both the finite checking algorithm and a relation preserving the relevant property between the timed model and its integer-clock translation.

Evidence and limits: Section 2 describes the method and its applicability (p. 588). Footnote 1 states, “Under slight restrictions, e.g. strict clock comparisons (such as x<1) are not allowed.” This paper does not list all restrictions; it refers to [11].

## technique: symbolic and explicit-state engines

What it is: PRISM offers MTBDD, sparse and hybrid engines, described as fully or partially symbolic (BDD-based), and a new explicit-state library using sparse matrices. The explicit library supports stochastic two-player games, MDPs, DTMCs and CTMCs and is intended for reusable algorithms and on-the-fly model construction.

How to do it: Section 3 describes the explicit Java library as reusable in other techniques or for prototyping model checking algorithms. The abstraction-refinement toolkit uses it to construct and modify models on the fly, which the paper says is not well suited to symbolic implementations (p. 589). The paper provides no library API or engine-selection procedure.

Verus form: Inference: a possible Rust adaptation would prove that sparse matrix construction preserves the intended transitions and probability distributions. A proof of the complete checker would also need to cover its arithmetic and solving routines.

Evidence and limits: Section 3 reports the Java sparse-matrix library and its use by abstraction refinement (p. 589). The paper gives no memory or runtime measurements. Inference: choosing an engine does not remove the need to justify model construction.

## technique: statistical model checking

What it is: sample random paths through a discrete-event simulator and use statistical tests instead of exhaustive state exploration. For quantitative properties, PRISM computes a confidence interval at a chosen confidence level or a probabilistic correctness guarantee using the Chernoff--Hoeffding bound. For bounded properties such as `P<0.1[...]`, it uses acceptance sampling implementing Wald's sequential probability ratio test (SPRT).

How to do it: use the discrete-event simulator to generate random paths; request a confidence interval or a Chernoff--Hoeffding correctness guarantee for a quantitative property, or acceptance sampling implementing Wald's SPRT for a threshold property (Section 3, p. 589). The paper does not specify sampling independence, sample counts, likelihood calculations, or stopping rules. Inference: those statistical prerequisites and the chosen error parameters must be checked in the cited methods before applying them.

Verus form: Inference: a possible adaptation would verify the path simulator, property evaluator and sample accounting against a probabilistic transition model. Its statistical guarantee would additionally require a probability theorem and justified sampling assumptions.

Evidence and limits: Section 3 says statistical checking “offers significantly improved scalability, in comparison to conventional probabilistic model checking techniques, and applies to a broader class of models” (p. 589), but gives no sample counts, confidence levels, error bounds, or benchmark denominator. Inference: the result is approximate and can miss rare behaviours unless the supplied statistical parameters make the desired error probability acceptable.

## technique: optimal adversary or strategy generation

What it is: when an MDP checker computes a minimum or maximum reachability probability or expected reward, it also returns an adversary resolving nondeterministic choices that attains that value. The strategy can explain a result, generate probabilistic counterexamples, or produce an optimal schedule. The digital-clocks engine extends this to PTAs.

How to do it: specify the extremal reachability or reward property and run MDP verification with adversary generation, or use the digital-clocks engine for a PTA. Use the generated resolution of nondeterminism to analyse results, generate counterexamples, or obtain a schedule (Section 3, p. 589). The paper does not describe the strategy storage or replay algorithm.

Verus form: Inference: a possible adaptation would specify which action a strategy selects at each relevant decision, prove that selected actions are enabled, and prove that the induced probability or reward attains the claimed extremum. The paper does not specify a strategy representation for Rust or Verus.

Evidence and limits: Section 3 states that PRISM can generate an adversary “that produces” the computed minimum or maximum (p. 589). No optimality benchmark is given. Inference: an adversary is only as meaningful as the model's nondeterministic choices and reward specification.

## what is proved, trusted, and relevant to VL

The paper describes implemented model classes, algorithms and components; it presents no Rust or Verus implementation or proof. Inference: possible uses for agent-written verified Rust include explicit state modelling, abstraction/refinement, strategy extraction to explain results, and statistical checking as a testing complement. Their effect on implementation correctness is not evaluated here. Section 3 describes the benchmark suite as probabilistic models and corresponding properties, grouped by type (p. 590). Inference: these could supply evaluation problems for a future checker, but do not establish the correctness of a Rust implementation.

## techniques for the catalog

- PTA modelling — encode clocks, guards, invariants, probabilistic updates and nondeterministic time in a guarded-command model
- priced PTA rewards — accumulate state-dependent rates and verify extremal expected reward to a target
- quantitative abstraction refinement — build, analyse and refine stochastic-game abstractions for exact PTA reachability verification
- digital clocks — translate timed models to finite integer-clock MDPs and reuse MDP checking
- symbolic and explicit engines — use fully or partially symbolic engines, or the reusable explicit sparse-matrix library
- statistical model checking — estimate quantitative properties with confidence/Chernoff--Hoeffding bounds and test thresholds with Wald SPRT
- optimal adversaries — extract nondeterminism-resolving strategies that attain computed probability or reward extrema
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "This method also has the widest applicability, supporting both probabilistic reachability properties and expected cumulative rewards for (linearly) priced probabilistic timed automata [11]."): checked every quotation, number, section/page reference and technique description against all seven pages; corrected retry counting, the airbag property, engine descriptions and page references, removed unsupported algorithm steps and Verus capability claims, labelled proposed adaptations as Inference, and identified the retained link as from the fetch record; did not check cited papers, run PRISM, test Verus adaptations or resolve the DOI externally.
