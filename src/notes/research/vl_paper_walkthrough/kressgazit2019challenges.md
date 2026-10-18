# The Challenges in Specifying and Explaining Synthesized Implementations of Reactive Systems
(authored by agents unless marked 🧑)
Tag: `kressgazit2019challenges`, [paper](https://doi.org/10.4204/EPTCS.286.5)

## scope and claims

Kress-Gazit and Torfah survey formal synthesis for reactive systems (CREST 2018, EPTCS 286, pp. 50–64). The input is a temporal specification over environment inputs and system outputs; the synthesizer returns an implementation represented as a Mealy or Moore transducer. The paper opens by granting the usual selling point: “The resulting implementation is correct by construction and no further coding tasks are needed.” (section 1, p. 50). Its central warning follows: “However, the correctness of synthesized implementation is only relative to the provided specification.” (section 1, p. 51), while the resulting machine can be difficult to understand. The survey is organized around unrealizability and incompleteness of specifications (section 2, including vacuity detection and runtime monitoring), and around understandable representations of synthesized implementations (section 3).

Inference: for VeruLaw, the transferable lesson is to verify both the Rust implementation and whether its contract constrains the intended behavior. A proof of an underspecified contract can pass while allowing an unwanted implementation.

## technique: unrealizability games, counterstrategies, and cores

What it is. Realizability is treated as a two-player infinite game: the system chooses outputs and the environment chooses inputs (the system player starts). A specification is realizable exactly when the system has a winning strategy. The arbiter example (figure 2, p. 52) conjoins a response guarantee (each request `r_i` is eventually followed by grant `g_i`; the temporal operators are lost in the text extraction) and an access guarantee `¬a -> ¬g_1 ∧ ¬g_2`. The environment can keep `a` false forever, for example with the input sequence `{r1}{}^ω`, so no implementation can satisfy both.

When to use it. Inference: use this before trusting a synthesized implementation whenever assumptions and guarantees interact, especially for adversarial input or liveness requirements.

How to do it (the paper surveys these steps; it does not present them as one procedure, so the ordering is this study's reading).
1. Model the specification as the synthesis game and solve for a system strategy (section 2.1.1, p. 53). “An implementation of a system for a given specification is a winning strategy for the system player in that game.”
2. If no winning strategy exists, compute an environment winning strategy, called a counterstrategy, by solving the game for the environment player (section 2.1.1, pp. 53–54). It is a finite representation of a possibly infinite set of failing input sequences. Large counterstrategies can be pruned [10], or replaced by countertraces [36].
3. For safety properties, incrementally increase a finite input-sequence bound until a counterexample set is found; this is also a semi-decision procedure for the unrealizability problem over undecidable distributed architectures (p. 54, citing [28]).
4. Extract minimal unrealizable cores: sub-specifications that are unrealizable on their own. In the arbiter, `{ϕ1,ϕ3}` and `{ϕ2,ϕ3}` are the two minimal cores (p. 54).
5. Repair each core by weakening guarantees (the paper's example uses weak-until) or strengthening environment assumptions (the paper's example adds an assumption that `a` holds infinitely often) (pp. 54–55). Most cited approaches use a counterexample-guided refinement loop in which a counterstrategy yields new environment assumptions (p. 55). Rerunning synthesis afterwards is Inference, not stated in this form in the paper.

Verus form. Inference: encode an input trace as a ghost `Seq<Input>` and an executable transition function; state a precondition expressing environment assumptions and an `ensures` clause for each guarantee. Use a `spec fn` for the transition relation and `proof fn`s/lemmas to show that every permitted step preserves the safety invariant. Conflicting contracts could be probed by checking whether the conjunction of the `requires`/`ensures` clauses leaves any satisfiable behavior; Verus does not itself synthesize a counterstrategy or solve LTL games, so an external game solver or bounded trace generator would supply candidate traces. Do not treat a `proof fn` as runtime code.

Evidence and limits. The paper gives the arbiter example and the `o ↔ i` example (figure 3, p. 53), where no finite counterexample set exists, and cites a finite-bound algorithm [28]. It reports no benchmark denominator or runtime evaluation for these. It states that for distributed architectures or settings with incomplete information the problem is in general undecidable (p. 53). Counterstrategies for complex specifications can be large and hard to inspect, and countertraces “are hard to compute and sometimes they do not exist” (p. 54).

## technique: completeness through coverage, vacuity, and skeletons

What it is. An implementation may satisfy the written formula while differing from the designer's intent. Coverage asks whether changing an atomic proposition in a state falsifies the specification [20]; if not, that value is not covered by the specification. An implementation that satisfies the formula by ignoring parts of it, such as the figure 5(b) arbiter that ignores `r1` and `r2`, satisfies it vacuously (p. 57).

When to use it. Inference: apply after synthesis when several machines satisfy the same contract, or when outputs appear unrelated to relevant inputs.

How to do it.
1. Inspect each state/output valuation and perturb it. If changing it preserves the specification, the value is not covered (section 2.2.1, pp. 56–57).
2. Check causal coverage: if changing one value alone is harmless, check whether changing it together with the values of a set of other states falsifies the specification, which indicates a causal relation (p. 57).
3. Refine the specification and resynthesize until intended choices are covered (p. 57). The paper's arbiter example changes the implications to biconditionals `(r_i ↔ g_i)` so that “it is more likely that” the figure 5(a) implementation is enforced (p. 56), that is, grants depend on requests.
4. Emit a skeleton alongside the implementation. A skeleton labels each state's output true, false, or open; open means the specification allows implementations with either value, i.e. a decision left to synthesis (p. 57, citing [29]).

Verus form. Inference: create a ghost model of allowed outputs and prove an `ensures` relation from each input to its required output. Add lemmas asserting that changing a supposedly relevant input changes the model's required result; use `assert` and quantified `requires`/`ensures` only where supported. A skeleton corresponds to an enum or ghost predicate recording constrained versus unconstrained fields; it is diagnostic metadata, not executable verification.

Evidence and limits. The paper's figures show two different arbiter implementations (figure 5) and a skeleton (figure 6), but provide no numerical coverage study. Completeness cannot be defined formally because it depends on the user's design intents (p. 56). Inference: coverage therefore detects omissions relative to the chosen perturbations, not all intent errors.

## technique: runtime assumption monitoring

What it is. Environment assumptions may not be known in full to the user. The paper says violations can be detected at runtime or in simulation, and that monitors can give feedback on what caused a violation. In an automated feedback-based process the specification is augmented with new environment assumptions computed at runtime; when the automated process fails, feedback goes to the user, who resolves the conflict by modifying the specification, citing [46, 47] (section 2.2.2, pp. 57–58). “Many violations of the environment assumptions can be detected during runtime or during simulation.” (section 2.2.2, p. 57).

How to do it. Inference: instrument assumptions, collect violating traces, identify the violated condition, add a reviewed assumption, and resynthesize.

Verus form. Inference: keep runtime checks in executable Rust and prove that verified behavior follows only when a ghost predicate representing the checked assumption holds. Log violations outside the proof; never claim the log proves an assumption globally.

Evidence and limits. The survey cites feedback-based systems but reports no common dataset or rates. Inference: monitoring observes tested executions and cannot establish absence of unobserved violations.

## technique: output-sensitive and abstraction-guided implementations

What it is. Synthesized implementations can be much larger than manual ones: the paper shows two- and three-client arbiters (figures 7 and 8, p. 59) and notes that adding one client causes a large blow-up (section 3, p. 58). Bounded synthesis [27] bounds the number of states of the implementation and finds minimal solutions by incrementally increasing the bound; bounded-cycle synthesis [25] also bounds the number of cycles in the state graph (pp. 59–60). For the TBURST4 component of the AMBA bus controller, the paper reports 14 states and 61 cycles for standard synthesis with Acacia+, 7 states and 19 cycles for bounded synthesis, and 7 states and 7 cycles for bounded cycle synthesis, “which is the minimum” (figure 9, p. 60). Other methods prune low-importance behavior (importance as the probability of visiting a state [10]), or build the implementation by incremental refinement of a coarse abstraction with counterexample-guided suggestions [40, 41, 44] (p. 60).

Verus form. Inference: model an implementation's abstract state as a Rust enum or bounded `Seq`, then prove each refinement preserves the same transition contract. Verus can prove the final bounded implementation's invariants; it does not optimize transducer size or perform CEGAR automatically.

## what is proved, trusted, and risky for VL

The paper is a survey. It surveys techniques for realizability, specification satisfaction, and structural simplicity of synthesized machines, and gives one short argument (that the figure 3 specification has no finite counterexample set). Its examples are symbolic; it reports no empirical product reliability. Inference: trusted elements include the temporal-logic semantics, game solver, synthesis implementation, and the user's assumptions and intent. Inference: agent-written verified Rust faces high threat from incomplete contracts and opaque generated choices. VL should require explicit assumptions, adversarial counterexamples, coverage/vacuity checks, and readable state models before treating a Verus proof as sufficient. The surveyed work already covers game-based unrealizability, counterstrategy extraction, vacuity analysis, monitors, bounded synthesis, and abstraction refinement; Inference: VL should reuse these ideas rather than rebuild a temporal synthesis engine.

## techniques for the catalog

- unrealizability games — solve the environment/system game, extract counterstrategies, and isolate minimal unrealizable cores before repairing assumptions or guarantees

- coverage and vacuity — perturb synthesized state/output choices, detect unconstrained or ignored specification parts, and refine until intended behavior is covered

- skeletons — emit three-valued true/false/open state annotations to expose choices made by synthesis rather than by the specification

- assumption monitoring — detect violated environment assumptions in simulation or deployment and feed reviewed assumptions back into specification refinement

- output-sensitive synthesis — bound states and cycles, or refine abstractions incrementally, to obtain smaller and more understandable implementations

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "To understand which parts of the implementation were forced by the specification and which parts were decided by the synthesis procedure, one has to perform a coverage analysis"): read the whole text (pp. 50–64, through the start of the references); checked all three quotations, page and section references, the arbiter, counterstrategy, core, coverage, skeleton, monitoring and TBURST4 figures (14/61, 7/19, 7/7); changed the link to the paper's DOI, added the p. 51 correctness-relative quote, fixed the claim that counterstrategy pruning may be unavailable, softened the biconditional repair claim, corrected skeleton labels to states, spans of p. 54–55 and p. 57–58, and marked the unsourced steps and VeruLaw statements as Inference; did not check the reference list entries, the figure images beyond the text extraction, or the cited papers, and the temporal operators were lost in pdftotext so formulas are described in words.
