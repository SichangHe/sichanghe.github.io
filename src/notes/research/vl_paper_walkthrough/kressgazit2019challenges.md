# The Challenges in Specifying and Explaining Synthesized Implementations of Reactive Systems
(authored by agents unless marked 🧑)
Tag: `kressgazit2019challenges`, [paper](https://www.semanticscholar.org/paper/32d9703f67c5b20ad6215f7ad97b150f3a539d03)

## scope and claims

Kress-Gazit and Torfah survey formal synthesis for reactive systems. The input is a temporal specification over environment inputs and system outputs; the synthesizer returns a Mealy or Moore transducer. The paper's central warning is that correctness is relative to the specification, while the resulting machine can be difficult to understand. “The resulting implementation is correct by construction and no further coding tasks are needed.” (section 1, p. 50). The survey organizes practical verification around unrealizability, incompleteness, vacuity, runtime monitoring, and understandable representations.

Inference: for VeruLaw, the transferable lesson is to verify both the Rust implementation and whether its contract constrains the intended behavior. A proof of an underspecified contract can pass while allowing an unwanted implementation.

## technique: unrealizability games, counterstrategies, and cores

What it is. Realizability is treated as a two-player infinite game: the system chooses outputs and the environment chooses inputs. A specification is realizable exactly when the system has a winning strategy. The arbiter example has guarantees `r_i -> g_i` and `¬a -> ¬g_1 ∧ ¬g_2`; the environment can request while holding `a` false, so no implementation can satisfy both.

When to use it. Use this before trusting a synthesized implementation whenever assumptions and guarantees interact, especially for adversarial input or liveness requirements.

How to do it (paper's procedure).
1. Model the specification as the synthesis game and solve for a system strategy (section 2.1.1, p. 53). “An implementation of a system for a given specification is a winning strategy for the system player in that game.”
2. If no winning strategy exists, compute an environment winning strategy, called a counterstrategy (section 2.1.1, pp. 53–54). It compactly represents potentially infinitely many failing input sequences.
3. For safety properties, incrementally increase a finite input-sequence bound until a counterexample set is found; this is also a semidecision procedure for some undecidable distributed settings (p. 54).
4. Extract minimal unrealizable cores: subsets of conjuncts that are themselves unrealizable. In the arbiter, `{ϕ1,ϕ3}` and `{ϕ2,ϕ3}` are the two minimal cores (p. 54).
5. Repair each core by weakening guarantees (the paper uses weak-until) or strengthening environment assumptions, then rerun synthesis (p. 54).

Verus form. Inference: encode an input trace as a ghost `Seq<Input>` and an executable transition function; state a precondition expressing environment assumptions and an `ensures` clause for each guarantee. Use a `spec fn` for the transition relation and `proof fn`s/lemmas to show that every permitted step preserves the safety invariant. An unrealizable core is found by trying contracts whose conjunction makes the proof obligations inconsistent; Verus does not itself synthesize a counterstrategy or solve LTL games, so an external game solver or bounded trace generator would supply candidate traces. Do not treat a `proof fn` as runtime code.

Evidence and limits. The paper gives arbiter and `o ↔ i` examples and a finite-bound algorithm, but no benchmark denominator or runtime evaluation. It states that distributed architectures with incomplete information are generally undecidable (p. 53). Counterstrategies can be too large; pruning or fixed countertraces may be unavailable (p. 54).

## technique: completeness through coverage, vacuity, and skeletons

What it is. An implementation may satisfy the written formula while ignoring the designer's intent. Coverage asks whether changing an atomic proposition in a state falsifies the specification; if not, that value is unconstrained. A vacuous implementation satisfies the formula without using all of its meaningful parts.

When to use it. Apply after synthesis when several machines satisfy the same contract, or when outputs appear unrelated to relevant inputs.

How to do it.
1. Inspect each state/output valuation and perturb it. If changing it preserves the specification, mark it uncovered (section 2.2.1, pp. 56–57).
2. Check causal coverage: if changing one value alone is harmless, change it together with a set of other states to detect dependencies (p. 57).
3. Refine the specification and resynthesize until intended choices are covered. The paper's arbiter repair changes implications to biconditionals so grants depend on requests (p. 56).
4. Emit a skeleton alongside the implementation. A skeleton labels each output true, false, or open; open marks decisions left to synthesis (p. 57).

Verus form. Inference: create a ghost model of allowed outputs and prove an `ensures` relation from each input to its required output. Add lemmas asserting that changing a supposedly relevant input changes the model's required result; use `assert` and quantified `requires`/`ensures` only where supported. A skeleton corresponds to an enum or ghost predicate recording constrained versus unconstrained fields; it is diagnostic metadata, not executable verification.

Evidence and limits. The paper's figures show two different arbiter implementations and a skeleton, but provide no numerical coverage study. Completeness cannot be defined formally because it depends on user intent (p. 56); coverage therefore detects omissions relative to chosen perturbations, not all intent errors.

## technique: runtime assumption monitoring

What it is. Unknown environment assumptions are monitored during simulation or deployment. When an assumption is violated, a monitor reports the cause; an automated feedback loop augments the specification with a new assumption (section 2.2.2, p. 57).

How to do it. Instrument assumptions, collect violating traces, identify the violated condition, add a reviewed assumption, and resynthesize. The paper says, “Many violations of the environment assumptions can be detected during runtime or during simulation.” (section 2.2.2, p. 57).

Verus form. Inference: keep runtime checks in executable Rust and prove that verified behavior follows only when a ghost predicate representing the checked assumption holds. Log violations outside the proof; never claim the log proves an assumption globally.

Evidence and limits. The survey cites feedback-based systems but reports no common dataset or rates. Monitoring observes tested executions and cannot establish absence of unobserved violations.

## technique: output-sensitive and abstraction-guided implementations

What it is. Standard transducers can explode in size. Bounded synthesis incrementally searches for a machine with a bounded state count; bounded-cycle synthesis also bounds cycles. For the TBURST4 AMBA component, the paper reports 14 states/61 cycles for standard synthesis, 7/19 for bounded synthesis, and 7/7 for bounded-cycle synthesis (figure 9, p. 60). Other methods prune low-importance behavior, or refine an abstract implementation incrementally with counterexample-guided suggestions (p. 60).

Verus form. Inference: model an implementation's abstract state as a Rust enum or bounded `Seq`, then prove each refinement preserves the same transition contract. Verus can prove the final bounded implementation's invariants; it does not optimize transducer size or perform CEGAR automatically.

## what is proved, trusted, and risky for VL

The paper proves or surveys realizability, specification satisfaction, and structural properties of synthesized machines; its examples establish behavior symbolically, not empirical product reliability. Trusted elements include the temporal-logic semantics, game solver, synthesis implementation, and the user's assumptions and intent. Inference: agent-written verified Rust faces high threat from incomplete contracts and opaque generated choices. VL should require explicit assumptions, adversarial counterexamples, coverage/vacuity checks, and readable state models before treating a Verus proof as sufficient. Existing synthesis work already covers game-based unrealizability, counterstrategy extraction, vacuity analysis, monitors, bounded synthesis, and abstraction refinement; VL should reuse these ideas rather than rebuild a temporal synthesis engine.

## techniques for the catalog

- unrealizability games — solve the environment/system game, extract counterstrategies, and isolate minimal unrealizable cores before repairing assumptions or guarantees

- coverage and vacuity — perturb synthesized state/output choices, detect unconstrained or ignored specification parts, and refine until intended behavior is covered

- skeletons — emit three-valued true/false/open transition annotations to expose choices made by synthesis rather than by the specification

- assumption monitoring — detect violated environment assumptions in simulation or deployment and feed reviewed assumptions back into specification refinement

- output-sensitive synthesis — bound states and cycles, or refine abstractions incrementally, to obtain smaller and more understandable implementations

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
