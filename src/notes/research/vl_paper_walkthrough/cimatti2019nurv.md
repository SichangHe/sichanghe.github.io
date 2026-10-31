# NuRV: A nuXmv Extension for Runtime Verification
(authored by agents unless marked 🧑)
Tag: `cimatti2019nurv`, [paper](https://doi.org/10.1007/978-3-030-32079-9_23)

## purpose and result

NuRV extends the nuXmv symbolic model checker into an assumption-based runtime-verification monitor for propositional LTL with future and past operators, partial observability, and resets. The paper states: “We present NuRV, an extension of the nuXmv model checker for assumption-based LTL runtime veriﬁcation with partial observability and resets.” (abstract, p. 382). A monitor consumes finite trace states and reports conclusive true, conclusive false, inconclusive, or out-of-model. It can run online or offline, generate C, C++, Java, Common Lisp, or SMV, and have the generated SMV checked by nuXmv.

The measured comparison used Dwyer’s 55 LTL patterns. NuRV generated all 55 monitors in 0.467 s on a MacBook Pro (Intel Core i7 2.6 GHz, four cores, one core used), while RV-Monitor generated 37 in 78.619 s using multiple cores. Java monitors processed one trace of 10^7 random states in approximately 250 ms across the 37 patterns for which both tools produced monitors; RV-Monitor ranged from 500 ms to more than 6 s, “depending on the number of resets” (Sect. 4, p. 390). The paper reports “our Java-based monitors are about 200x faster than RV-Monitor at generation-time and 2–5x faster at runtime” (abstract, p. 382), but the detailed generation numbers (78.619/0.467 ≈ 168×) do not equal 200×. Inference: that ratio also compares 55 NuRV monitors (one core) against 37 RV-Monitor monitors (multiple cores), so it is not like for like.

## technique: symbolic assumption-based LTL monitoring

What it is. Given property ϕ, NuRV translates both ϕ and ¬ϕ into symbolic automata Tϕ and T¬ϕ. It synchronously simulates the input trace on both and repeatedly computes forward images restricted to fair states. The resulting belief-state sets rϕ and r¬ϕ determine the verdict. The paper gives the algorithm directly: “Suppose the monitoring property is ϕ, we first run the LTL translations twice, on ϕ and ¬ϕ, to get two symbolic automata Tϕ and T¬ϕ, resp.” (Sect. 1, p. 383). It then says, “Then an input trace u is synchronously simulated on Tϕ and T¬ϕ, by repeatedly computing forward images w.r.t. all fair states.” (Sect. 1, p. 383).

When to use it. Use this for finite-trace decisions when the property is LTL and a symbolic model checker is available. The three basic outcomes are: true when rϕ is nonempty and r¬ϕ empty; false when rϕ is empty and r¬ϕ nonempty; and unknown when both are nonempty. The paper explains, “In this case, the knowledge of the monitor is limited by the ﬁniteness of u.” (Sect. 1, p. 383).

Steps from the paper.

1. Encode the LTL property and its negation as symbolic ω-automata (Sect. 1, p. 383).
2. Compute fair states, meaning states from which an infinite path is possible, and use forward-image operations constrained to those states (Sect. 1, p. 383).
3. For each input state, advance both automata and retain belief states rϕ and r¬ϕ (Sect. 1, p. 383).
4. Apply the emptiness test to produce true, false, or unknown (Sect. 1, p. 383).

Verus form. Inference: Verus can verify a Rust implementation of a finite-state monitor, but it does not supply LTL-to-automaton translation or BDD operations. Represent each automaton state and belief set as Rust data with a `spec fn` describing transition and acceptance; prove transition-preservation lemmas with `proof fn`, and expose a `fn` with `requires`/`ensures` for each input step. A loop can carry an `invariant` over the processed prefix and the symbolic belief-set representation. The automata construction, fairness computation, and BDD library remain trusted inputs unless separately modeled and proved. Verus uses `old(...)` in postconditions for pre-state values; no paper claim says that Verus can check NuRV’s C or Java generator.

Evidence and limits. The implementation is grounded in nuXmv’s symbolic LTL translation, fair-state algorithm, and CUDD BDD library. The paper cautions that BDD performance depends on variable ordering: “BDD operations are implemented by the BDD manager. Their performance strongly depends on the variable ordering used in the BDD construction.” (Sect. 2.3, p. 387). Generated code supports only binary full assignments or ternary unknown/true/false values; arbitrary Boolean-formula inputs are unsupported. The paper says, “Note that the symbolic monitoring algorithm can take in general input states expressed in Boolean formulae ... but this is not supported by the generated code.” (Sect. 2.3, p. 387). Thus the monitor’s logical result assumes correct translation, BDD implementation, and input encoding.

## technique: assumptions, prediction, and out-of-model verdict

What it is. NuRV accepts an SMV model K describing allowed infinite system traces. It replaces Tϕ and T¬ϕ with K ⊗ Tϕ and K ⊗ T¬ϕ, making unknown results more precise under the assumption. If the observed finite trace is outside K, both belief sets become empty and NuRV reports × (out-of-model), rather than incorrectly calling the property true or false.

Steps. Build K from the system’s variables and temporal constraints; build the two property automata; construct both synchronous products; feed the trace; classify emptiness as assumption-qualified true/false, unknown, or out-of-model. The paper explicitly reports, “By considering only (inﬁnite) traces of K, the above algorithm may give more precise outputs (turning ? into /⊥).” (Sect. 1, p. 383). It also says, “This is why we call K an assumption, and the two verdicts /⊥ are only conclusive under assumptions, thus renamed to a /⊥a .” (Sect. 1, p. 383).

Verus form. Inference: encode K’s transition relation as a `spec fn` and require each Rust input step to satisfy it when a qualified verdict is claimed. Add a separate postcondition for an out-of-model result when the relation fails. A `proof fn` can show that a trace satisfying K remains in the product-state invariant; this does not prove K is a faithful model of the real system.

Evidence and limits. The assumption can express relations involving unobservable variables and can turn unknown into a conclusive verdict, but an incorrect or incomplete K changes the meaning of the verdict. The paper notes that K “may be wrong, or it only captures a partial knowledge of the SUS, or due to unexpected faults.” (Sect. 1, p. 383). Inference: a Verus proof of the monitor is conditional on K and therefore cannot establish behavior outside K.

## technique: partial observability and resettable monitors

Partial observability is handled because symbolic forward images accept incomplete states and therefore produce coarser belief sets. The paper states, “Partial observability becomes more useful under assumptions, as an assumption may express a relation between observable and unobservable variables of the SUS.” (Sect. 1, p. 384). For a reset, union rϕ and r¬ϕ to recover a history belief state; restart at position i using that belief as K’s new initial condition and reduced automaton initial conditions. The paper says this “represents the history of the system after a run given by the input trace seen so far.” (Sect. 1, p. 384).

Steps: accept unknown values in each input state; advance symbolic sets without requiring full valuation; at reset, union the two current belief sets; use the union as the new initial condition; continue from the requested position. Verus form (inference): define an abstract history state and prove that reset preserves a prefix-summary invariant. Use `requires` to constrain unknown fields and `ensures` to state that post-reset beliefs equal the specified summary; concrete BDD equivalence remains an external theorem unless modeled.

## technique: explicit monitor synthesis and checked code generation

NuRV first builds a BDD-based symbolic FSM, then explores it into explicit states and translates the FSM to target-language code. Levels are L1 (stop at conclusive states), L2 (explore all states), and L3 (also include reset states). The paper describes the process: “The Monitor Generator components internally generate monitor code in two steps: (1) generating explicit-state monitor automata from the symbolic monitor; (2) converting monitor automata into code in speciﬁc languages.” (Sect. 2.2, pp. 385–386).

The generated C API takes encoded state, reset mode, and a mutable current location. The caller owns location storage. The paper says the monitor automata can be dumped into SMV modules, “which can be further analyzed in nuXmv for their correctness and other properties” (Sect. 1, p. 384). Verus form (inference): verify the explicit transition table and a Rust wrapper with `requires` on state encoding and location validity and `ensures` relating return values to the abstract verdict. The generator and target compiler must be trusted or separately verified; checking generated SMV establishes properties of that module, not automatically the generator.

## what is proved, measured, and trusted

This tool paper describes the monitoring algorithm only briefly and defers its details to [6], the companion paper; it reports implementation measurements and no machine-checked proof of the NuRV implementation or generated C/Java code. It says generated-code correctness “comes indirectly from the correctness of the symbolic algorithm and mode checking on SMV-based monitors” (Sect. 2.2, p. 386). Inference: the trusted base includes LTL translation, Emerson–Lei fair-state computation, CUDD BDD operations, model K, variable ordering, code generation, and language compilers. The 55-pattern comparison used six Boolean variables and an assumption that they are disjoint; RV-Monitor generated only 37/55 patterns. Runtime used one random trace of 10^7 states and reset monitors after each violation, so the comparison is a particular setup, not a universal bound. Inference: for agent-written verified Rust, NuRV’s main threat is indirect: it offers runtime checks and code generation but does not replace proofs of Rust functional correctness, model adequacy, or memory safety.

## techniques for the catalog

- symbolic dual-automaton monitoring — translate ϕ and ¬ϕ, advance fair-state images, and classify belief-set emptiness
- assumption-based prediction — intersect each automaton with model K to obtain assumption-qualified verdicts and an out-of-model result
- partial-observability monitoring — propagate incomplete valuations as belief sets using symbolic forward images
- resettable monitoring — union current belief sets and restart from the resulting history state
- explicit monitor synthesis — explore symbolic FSMs at L1/L2/L3 and translate states to target-language code
- generated-code checking — emit SMV modules and use nuXmv model checking on the emitted monitor
