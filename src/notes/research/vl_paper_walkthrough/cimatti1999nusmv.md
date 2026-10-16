# NuSMV: A New Symbolic Model Verifier
(authored by agents unless marked 🧑)
Tag: `cimatti1999nusmv`, [paper](https://doi.org/10.1007/3-540-48683-6_44)

## scope and contribution
NuSMV is a symbolic model checker intended to be reusable in technology-transfer projects. The authors state that “NuSMV is designed to be a well structured, open, flexible and documented platform for model checking” (Section 1, p. 495). It re-engineers SMV 2.4.4 and adds an interactive shell, GUI, model-partitioning methods, LTL checking, modular architecture, and the CUDD BDD package (Section 1, p. 495).

The input is an SMV model. NuSMV can construct the model, analyze reachability, check fair CTL and LTL properties, check invariants, compute quantitative characteristics, and generate counterexamples (Section 2, p. 495). The paper's main reusable lesson is to separate a language-specific front end from a representation-independent verification back end.

## technique: symbolic finite-state verification with BDDs
What it is: NuSMV compiles a finite-state model into Boolean variables and binary decision diagrams (BDDs), then computes reachability and temporal properties over the resulting symbolic transition system. The compiler's encoding submodule maps data types and finite ranges into Boolean domains; the FSM compiler builds a monolithic or partitioned BDD representation (Section 3, pp. 497–498).

When to use it: use this when the system has a finite, explicitly modeled state space but enumerating every state is too expensive. The paper targets synchronous and asynchronous models and supports fair CTL, invariants, and reachability (Section 2, p. 495).

How to do it:
1. Write the model in the SMV language and declare modules, variables, transitions, and specifications (Sections 1–2, p. 495).
2. Parse the input and instantiate the declared modules into a finite-state-machine description (Section 3, p. 497).
3. Encode finite data domains as Boolean variables (Section 3, p. 497).
4. Build the transition relation as a BDD, choosing monolithic or partitioned form (Section 3, pp. 497–498).
5. Run reachability, invariant, fair-CTL, or quantitative analyses; request a counterexample when a property fails (Section 2, p. 495; Section 3, p. 498).

Verus form: Inference: a Rust/Verus adaptation would keep the executable transition function and state representation in Rust, define mathematical state predicates and transition specifications, and prove that each transition preserves the stated invariant with proof functions and contracts. Verus does not directly provide NuSMV's BDD engine or finite-state temporal-model-checking workflow; the BDD computation would remain an external analysis or a separately verified algorithm. The Rust proof therefore covers the modeled transition and invariant, while the correspondence between the real program and the model must be specified and proved separately.

Evidence and limits: the authors report that “In most examples NuSMV performs better than SMV, in particular for larger examples” (Section 5, p. 499). They attribute the improvement mainly to CUDD. The paper gives no table of example names, runtimes, hardware, or denominator, so this is a qualitative comparison rather than a reproducible quantitative result. Inference: BDD size and variable ordering remain practical limits; the paper explicitly exposes ordering and cache choices because they can change verification behavior (Section 2, p. 496).

## technique: transition-relation partitioning
What it is: NuSMV represents a transition relation either monolithically or as partitions. Synchronous models support enhanced partitioning; asynchronous models support disjunctive partitioning (Section 2, p. 495). The compiler provides conjunctive partitioning and reorders clusters using heuristics at the BDD level (Section 3, p. 497).

How to use it: compile the same FSM under monolithic and partitioned representations, choose conjunctive or disjunctive partitioning according to the model's synchronous/asynchronous structure, then compare reachability and checking cost. The interactive shell lets the user repeat computation after changing partitioning and variable-ordering settings (Section 2, p. 496).

Verus form: Inference: represent a partitioned transition as several Rust functions or proof-level relations and prove that their conjunction or disjunction is equivalent to the intended whole-step relation. Use contracts to state each relation and proof functions for equivalence lemmas; do not treat partitioning itself as a Verus runtime feature.

## technique: LTL-to-CTL reduction
What it is: NuSMV checks LTL by constructing a tableau for the LTL formula and combining it with standard CTL model checking. The paper says, “The algorithm is based on the combination of a tableau constructor for the LTL formula with standard CTL model checking” (Section 2, p. 495).

How to do it: provide an LTL formula; translate it into a tableau; form the synchronous product of the original model and tableau; generate a CTL formula over that product; invoke the CTL checker (Section 3, p. 498). Verus form: Inference: encode the product-state invariant and prove the Rust transition preserves it. Temporal trace completeness and the tableau translation would need separate mathematical lemmas; they are not automatic consequences of a Verus function contract.

## technique: modular verifier architecture and interactive diagnosis
The architecture separates kernel, parser, compiler, model-checking, LTL, shell, and GUI modules with defined interfaces (Section 3, pp. 496–498). “A clear distinction between the system back-end and front-end has been enforced” (Section 3, p. 497). The compiler exposes image and counter-image operations independently of the transition-relation representation (Section 3, p. 498). The shell supports a read-eval-print loop in which parsing, construction, reachability, and model checking can be invoked, undone, or repeated with different options (Section 2, p. 495).

Inference: VL can apply this boundary by keeping Rust specifications and proof APIs independent of a model-import front end, and by making each verification phase callable in isolation. This reduces the cost of trying alternative abstractions but leaves the front-end translation trusted unless it is itself verified.

## what is proved, measured, and trusted
The paper demonstrates a working model-checking platform and qualitative performance improvement over SMV. It does not provide a formal proof of NuSMV's implementation, a complete benchmark table, or a quantified error rate. Trusted components include the CUDD package, the C implementation, the parser/compiler translation, the LTL tableau translator, the underlying solver algorithms, and the correctness of each user's model and property. Inference: for agent-written verified Rust, the largest product threat is specification/translation mismatch: a successful proof of a wrong model or wrong invariant can still certify behavior the product does not require. NuSMV's separation of model construction, representation, and checking is useful engineering guidance, but it does not remove that threat.

## techniques for the catalog
- BDD symbolic model checking — encode finite domains and transitions as BDDs, then compute reachability and temporal properties symbolically
- transition partitioning — choose monolithic, conjunctive, or disjunctive transition representations and tune their ordering for the model
- LTL tableau reduction — form a synchronous product with an LTL tableau and check the resulting CTL formula
- modular verification architecture — isolate parsing, compilation, representation, checking, and interfaces so implementations can be replaced independently
- interactive verification tuning — rerun phases while changing partitioning, variable ordering, cache, and other internal parameters
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Having separated this module makes it possible to have different encoding policies which can be more appropriate for different kind of variables (e.g. data path, control path)."): I checked every section, quotation, number, page reference, technique step, and tag against the complete paper; I found no substantive discrepancy and changed only this Checked line; link from the fetch record; I did not check the implementation source beyond the paper.
