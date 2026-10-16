# Interface Generation and Compositional Verification in JavaPathfinder
(authored by agents unless marked 🧑)
Tag: `giannakopoulou2009interface`, [paper](https://doi.org/10.1007/978-3-642-00593-0_7)

## what the paper proves or measures

The paper learns a finite-state interface for a component and then uses that interface as an assumption in Java PathFinder (JPF) compositional model checking. Its target is an interface that is both safe (it accepts no call sequence that can lead the component to an error) and permissive (it accepts every legal component call sequence). The authors state: “Our goal is to compute M ’s precise interface as a finite state automaton A over Σ.” (Section 3.1, p. 97). They implement the method for UML statecharts translated to readable Java models with labeled-transition-system semantics, and demonstrate it on NASA flight-phase models.

The component is a finite labeled transition system (M), with communication alphabet Σ. A word is illegal when a component trace reaches error state π. Safety is defined by (L_{legal}(A) \cap L_{illegal}(M)\uparrow\Sigma=\emptyset); permissiveness by (L_{legal}(M)\uparrow\Sigma\subseteq L_{legal}(A)). These definitions matter because legal words can include behavior that the component never executes, whereas illegal words correspond to actual error-reaching traces (Section 3.1, p. 97).

## technique 1: L* learning with model-checking query oracles

what it is: Angluin's L* learner proposes a deterministic finite automaton (A). A JPF-backed teacher answers membership queries and returns counterexamples to unsafe or non-permissive conjectures. The paper says: “We use an off-the-shelf learning algorithm, L* [4], to iteratively compute interface specification A for M that is both safe and permissive.” (Section 3.2, p. 97).

when to use: use this when a component has a finite state model and a finite set of observable actions, but the environment assumptions are not written down. The learned automaton is intended to expose legal call sequences as an explicit reusable artifact.

how to do it, following the paper:

1. choose the interface alphabet Σ, the component's environment-visible actions (Section 3.1, p. 97)
2. answer each L* query for a trace (w) by model-checking whether π is reachable in (lts(w)\parallel M); return the query result to L* (Section 3.2, p. 98)
3. let L* build a conjecture accepting positive-query strings and rejecting negative-query strings (Section 3.2, p. 98)
4. run Oracle 1 by checking reachability of π in (A\parallel M); if reachable, project the returned trace onto Σ and give it to L* as a counterexample (Section 3.2, p. 98)
5. if Oracle 1 finds no error, run Oracle 2 on completed automata (A_π\parallel M_C), looking for ​(π, ok) where the interface is in error but the component is non-error (Figure 2 and Section 3.2, pp. 98–99)
6. query the projected trace against (M). If it is legal, return it to L*; if it is spurious because another nondeterministic path reaches an error, backtrack and continue Oracle 2 (Section 3.2, pp. 99–100)
7. stop when both oracles find no counterexample. Theorem 1 states that for finite-state (M), the algorithm terminates and returns a safe, permissive interface (Section 3.3, p. 100)

The paper's Oracle 2 pseudocode is concrete: “(1) Model-check Aπ || MC: (2) if (π, ok) is reachable by trace t then (3) if π is not reachable in lts(t ↑ Σ) || M (4) return t ↑ Σ to L*; (5) else (6) backtrack.” (Figure 2, p. 99). Query results are memoized, so repeated projected traces do not require another model-checking call (Section 3.2, p. 100).

evidence and limits: the correctness argument is conditional on finite-state models and correct model-checking oracles. The authors explicitly claim: “Theorem 1. Given component finite state M (that may include error states), the algorithm implemented by our approach terminates and it returns a safe and permissive interface A.” (Section 3.3, p. 100). The approach avoids explicit determinization of (M), handling nondeterminism dynamically and selectively, but the paper gives no runtime table or denominator for a broad benchmark. Its prior determinization-based method has exponential cost; L* instead grows toward a minimal deterministic interface, which is advantageous when the interface is much smaller than the component (Section 3.3, p. 100). The algorithm does not establish properties for infinite-state components. Inference: a Verus analogue would need a finite abstraction or bounded action model before an L* learner can be used; Verus proofs alone do not make an unbounded Rust component finite.

## technique 2: assume-guarantee discharge in JPF

what it is: JPF checks a component under a finite-state assumption and a property automaton. The generated interface can be used as an assumption while checking a component, then discharged on its environment. The paper says: “For compositional reasoning, one needs to also discharge the generated interface on the component environment.” (Section 4.4, p. 106).

how to do it:

1. represent UML statechart components as finite-state Java models; represent assumptions and properties as finite-state automata (Section 4.3, p. 102)
2. attach `SCSafetyListener` to JPF. On `instructionExecuted`, advance the automaton; an undefined transition enters error state π and causes a property failure (Section 4.3, p. 103)
3. on `choiceGeneratorAdvanced`, check the next action without committing it. If it would violate an assumption, mark the path ignored so JPF backtracks (Section 4.3, p. 103)
4. on `stateBacktracked`, restore the automaton state so automaton and model-checker exploration backtrack together (Section 4.3, p. 103)
5. invoke JPF with `+jpf.listener=.cv.SCSafetyListener` and `+safetyListener1.property=Foo` to check automaton `Foo` as a property (Section 4.3, p. 103)
6. after generating the interface, model-check the environment with the interface installed as the property (Section 4.4, p. 106)

Inference: the corresponding Verus structure is an executable Rust function with `requires` for the environment assumption and `ensures` for the component guarantee, plus proof lemmas that show each allowed transition preserves an invariant. A loop can use a loop invariant declaration inside the loop; the automaton state should be an explicit ghost or spec value, and each transition lemma should update it. Verus has no direct JPF listener or automatic L* teacher, so the learner and finite-state exploration would remain external code; Verus checks the resulting transition and discharge lemmas. Inference: this decomposition can let VL prove a small component contract once and reuse it at callers, but only if the interface contract captures all behavior relevant to the caller.

## technique 3: extracting assumptions from the flight model

The experience section uses a UML statechart model of the Ascent and EarthOrbit phases. Universal-environment exploration produced spurious violations because the environment allowed any event sequence. The authors therefore generated interfaces for implicit flight rules. They write: “The models had been created under the assumption that the use of the model respects some implicit flight rules.” (Section 5, p. 106).

To reproduce the case study, configure an assertion filter so only the target property remains, run interface generation with an alphabet and output file, and inspect the resulting FSP automaton. The paper gives `+assumption.alphabet=<actions>` and `+assumption.outputFile=<file name>` for configuration (Section 4.4, p. 103). It generated one interface forbidding `lsamRendezvous` before `lasJettison`, and another forbidding `tliBurn` before `lsamRendezvous` (Figure 7 and Section 5, p. 107). The model developer inspected the generated interfaces and confirmed that they encoded actual flight rules (Section 5, p. 107).

Inference: in VL, this pattern suggests first writing an explicit protocol-state datatype and proving that each public Rust operation preserves the protocol automaton; callers then prove they satisfy the protocol preconditions. The generated-interface idea is useful for discovering missing assumptions, but the paper's developer inspection remains a human validation step, not a proof that the requirements are the right flight requirements.

## trusted boundary, contradictions, and product risk

The paper's formal guarantee covers the finite-state component model, L* learner, and correctly implemented model-checking oracles. It does not prove that the UML model matches the spacecraft, that the chosen alphabet contains every relevant action, or that the developer's implicit flight rules are complete. The implementation's Oracle 2 was still manual: “This is a manual step that we intend to automate in the future.” (Section 4.4, p. 104). That is an explicit limitation, not a measured failure rate.

Inference: for agent-written verified Rust, the main threat is omitted environment assumptions. A Verus proof can establish a contract while the contract permits an unsafe call sequence or models a dependency too weakly. VL should therefore retain an assumption-discovery and environment-discharge phase, and require review of the generated protocol before treating it as a product requirement. The paper already supplies the finite-state learning and counterexample loop; VL should not redo that algorithm as a new contribution unless it adds a Rust/Verus-specific abstraction or evidence that existing automata cannot express.

## techniques for the catalog

- L* interface learning with model-checking oracles — iteratively learn a minimal automaton and refine it with safety and permissiveness counterexamples
- nondeterministic permissiveness oracle — complete the interface and component, test `(π, ok)` reachability, query projected traces, and backtrack on spurious paths
- memoized counterexample queries — cache projected-trace results to avoid nested or repeated model-checker calls
- assume-guarantee interface discharge — check the generated interface as a property of the component environment
- protocol assumption extraction — generate finite-state rules from spurious violations, then inspect and reuse them as explicit environment assumptions
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
