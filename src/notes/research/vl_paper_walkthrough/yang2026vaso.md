# VASO: Formally Verifiable Self-Evolving Skills for Physical AI Agents
(authored by agents unless marked 🧑)
Tag: `yang2026vaso`, [paper](https://arxiv.org/abs/2606.05395)
## skill contracts and feasibility
VASO represents a reusable skill as `(G, ψsk, Csk)`: global LTL specifications `G`, a local LTL rule `ψsk`, and a semantic contract `Csk=(Lsk, Csk^p)` consisting of a proposition-aligned labeling function and text plan template (section 3, pp. 3–4). The labeling maps each execution state to atomic propositions; the template guides an LLM planner. A skill is feasible when some trace satisfies `G ∧ ψsk`, while generated plans must satisfy that formula under all executions of the environment model.

The paper states: “The semantic contract Csk = (Lsk, Csk p ), which is the core of a skill, consists of a proposition-aligned labeling function Lsk and Csk p is a text-based plan template.” (section 3, p. 4). How to apply it:
1. enumerate atomic propositions and global/local temporal rules (section 3; Appendix B Listing 2)
2. define an executable API or waypoint template and a labeling function from states to propositions (section 3)
3. have `Fskill` produce the skill and `Fplan` produce a plan from the contract and task prompt (section 3)
4. retain global `G` while refining only the local rule and contract (section 4, p. 4)

Inference: in Verus Rust, `G` and `ψsk` can be represented by spec predicates over ghost traces, while the contract and label function are executable Rust plus proof lemmas connecting API effects to propositions. LTL model checking is outside native Verus; the translation therefore requires an external checker and a proved correspondence boundary.

## skill-level satisfiability filtering
Before planning, VASO tests whether the local rule contradicts global rules. It builds a universal transition system over all proposition valuations, `S=2^AP`, with every state initial and every transition possible. It checks `M |= ¬Φsk`, where `Φsk=(∧φ∈G φ)∧ψsk`; if that property holds, no satisfying trace exists and the skill is infeasible, so `Fskill` is queried to refine the local rule. Otherwise a counterexample trace satisfying `Φsk` witnesses logical feasibility (section 4.1, p. 5).

The paper explains: “This skill-level verification checks logical feasibility of the generated specification rather than behavioral correctness.” (section 4.1, p. 5). Steps are: construct the universal valuation model, negate the combined formula, run the model checker, reject and regenerate contradictory skills, or retain a witness trace. Inference: a Verus workflow can encode a finite proposition valuation and prove satisfiability/consistency lemmas, but should not call a satisfying trace proof of executable behavior. The paper assumes atomic propositions correctly describe the domain; that assumption remains trusted.

## plan-to-automaton compilation
For a generated plan `π`, VASO constructs `Aπ=(S,S0,T,L)` by extracting the ordered API calls, commands, waypoints, or trajectory segments, creating one state per element, labeling each state with `Lsk`, choosing the first as initial, and linking consecutive states (Algorithm 1, Appendix C, p. 12). It then checks `Aπ |= G ∧ ψsk` against a transition model `M`; implementations are emitted in NuSMV.

The algorithm's steps are: initialize empty state, transition, and label sets; extract `σ0…σH`; create `st` for each `σt`; assign `L(st)=Lsk(σt)`; set `S0={s0}`; add `(st,st+1)`; return the automaton (Algorithm 1). If checking fails, NuSMV returns a counterexample trace identifying a violated specification (section 4.2, p. 5).

Inference: for Verus, each plan step can be a ghost sequence element and each API wrapper can have `ensures` connecting concrete state updates to proposition labels. The automaton checker remains external; Verus can prove the wrapper-to-label correspondence and selected finite traces.

## counterexample textual-gradient refinement
VASO turns verifier outcomes into reusable contract updates. The checker returns `pass` or `fail(φ)` for a violated global or local formula. VASO renders this as a textual gradient, for example “violate specification: G(person observed -> X stop)”, then updates the contract with `Csk^(k+1)=Fskill(Csk^k,g,τ)` while keeping model weights fixed (section 4.2, pp. 5–6). The forward pass maps contract to plan to automaton; the backward pass maps automaton failure to gradient to revised contract.

Inference: this is counterexample-guided contract repair for Verus. A failed proof or checked trace should be summarized into a concrete invariant or postcondition edit, then the Rust proof rerun. The update must distinguish a real counterexample from an incomplete proof; otherwise an agent may weaken a contract to hide a bug.

## techniques for the catalog
- semantic skill contracts — couple global/local temporal rules, proposition labels, and a reusable plan template
- feasibility filtering — model-check a universal proposition system to reject contradictory local rules before planning
- plan-to-automaton compilation — map ordered executable steps to labeled states and transitions for model checking
- textual-gradient refinement — convert violated formulas and traces into contract updates without changing model weights
- proposition-alignment auditing — measure and verify the mapping from concrete API behavior to symbolic propositions
