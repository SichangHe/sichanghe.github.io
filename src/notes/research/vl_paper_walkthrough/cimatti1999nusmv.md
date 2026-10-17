# NuSMV: A New Symbolic Model Verifier
(authored by agents unless marked 🧑)
Tag: `cimatti1999nusmv`, [paper](https://doi.org/10.1007/3-540-48683-6_44) (link from the fetch record)

## scope and contribution
NuSMV is a symbolic model checker intended to be reusable in technology-transfer projects. The authors state that “NuSMV is designed to be a well structured, open, flexible and documented platform for model checking” (Section 1, p. 495). It re-engineers SMV 2.4.4 and adds an interactive shell, GUI, model-partitioning methods, LTL checking, modular architecture, and the CUDD BDD package (Section 1, p. 495).

The input is an SMV model. NuSMV can construct the model, analyze reachability, check fair CTL and LTL properties, check invariants, compute quantitative characteristics, and generate counterexamples (Section 2, p. 495). Inference: a reusable lesson is to separate the language-specific front end from verification routines that do not depend on the transition-relation representation.

## technique: symbolic finite-state verification with BDDs
What it is: NuSMV compiles a finite-state model into Boolean variables and binary decision diagrams (BDDs), then computes reachability and temporal properties over the resulting symbolic transition system. The compiler description states, “The Encoding submodule performs the encoding of data types and finite ranges into boolean domains.” The FSM compiler builds a monolithic or partitioned BDD representation (Section 3, p. 497).

When to use it: Inference: consider symbolic verification when the system has a finite modeled state space and explicit state enumeration is too expensive. The paper targets synchronous and asynchronous models and supports fair CTL, invariants, and reachability (Section 2, p. 495).

How to do it:
1. Provide a model file written in the SMV language (Section 2, p. 495).
2. Parse the input and instantiate the declared modules into a finite-state-machine description (Section 3, p. 497).
3. Encode finite data domains as Boolean variables (Section 3, p. 497).
4. Build the transition relation as a BDD, choosing monolithic or partitioned form (Section 3, pp. 497–498).
5. Run reachability, invariant, fair-CTL, or quantitative analyses; request a counterexample when a property fails (Section 2, p. 495; Section 3, p. 498).

Verus form: Inference: a Rust/Verus adaptation would keep the executable transition function and state representation in Rust, define mathematical state predicates and transition specifications, and prove that each transition preserves the stated invariant with proof functions and contracts. Verus does not directly provide NuSMV's BDD engine or finite-state temporal-model-checking workflow; the BDD computation would remain an external analysis or a separately verified algorithm. The Rust proof therefore covers the modeled transition and invariant, while the correspondence between the real program and the model must be specified and proved separately.

Evidence and limits: the authors report that “In most examples NuSMV performs better than SMV, in particular for larger examples” (Section 5, p. 499). They attribute the improvement mainly to CUDD. The paper gives no table of example names, runtimes, hardware, or denominator, so this is a qualitative comparison rather than a reproducible quantitative result. The shell exposes partitioning, cache configuration, and variable ordering so users can investigate their effects on verification (Section 2, p. 496): “For instance, it is possible to control the application of BDD variable orderings in a particular phase of the verification (e.g. after the model is built).”

## technique: transition-relation partitioning
What it is: NuSMV represents a transition relation either monolithically or as partitions. Synchronous models support enhanced partitioning; asynchronous models support disjunctive partitioning (Section 2, p. 495). The compiler provides conjunctive partitioning and reorders clusters using heuristics at the BDD level (Section 3, p. 497).

How to use it: Inference: compare reachability and checking cost under monolithic and partitioned representations. Figure 2 (p. 497) lists monolithic and conjunctive forms for synchronous models, and monolithic and disjunctive forms for asynchronous models. The interactive shell lets the user repeat computation after changing partitioning and variable-ordering settings (Section 2, p. 496).

Verus form: Inference: represent a partitioned transition as several Rust functions or proof-level relations and prove that their conjunction or disjunction is equivalent to the intended whole-step relation. Use contracts to state each relation and proof functions for equivalence lemmas; do not treat partitioning itself as a Verus runtime feature.

## technique: LTL-to-CTL reduction
What it is: NuSMV checks LTL by constructing a tableau for the LTL formula and combining it with standard CTL model checking. The paper says, “The algorithm is based on the combination of a tableau constructor for the LTL formula with standard CTL model checking, along the lines described in [5].” (Section 2, p. 495).

How to do it: give the LTL formula to the external translator, which produces a tableau suitable for loading into NuSMV and a new CTL formula. Verify that CTL formula on the synchronous product of the original system and tableau (Section 3, p. 498): “This program also generates a new CTL formula to be verified on the synchronous product of the original system and the generated tableau.” Verus form: Inference: encode the product-state invariant and prove the Rust transition preserves it. Temporal trace completeness and the tableau translation would need separate mathematical lemmas; they are not automatic consequences of a Verus function contract.

## technique: modular verifier architecture and interactive diagnosis
The architecture separates kernel, parser, compiler, model-checking, LTL, shell, and GUI modules with defined interfaces (Section 3, pp. 496–498). “A clear distinction between the system back-end and front-end has been enforced, in order to make it possible to reuse the internal components independently of the input language being used to describe the model.” (Section 3, p. 497). The compiler exposes image and counter-image operations independently of the transition-relation representation (Section 3, p. 498). The shell supports a read-eval-print loop in which parsing, construction, reachability, and model checking can be invoked, undone, or repeated with different options (Section 2, p. 495).

## what is proved, measured, and trusted
The paper describes an implemented model-checking platform and reports qualitative performance improvement over SMV. It does not provide a formal proof of NuSMV's implementation, a complete benchmark table, or a quantified error rate. Inference: trusting a verification result requires trusting the CUDD package, the C implementation, the parser/compiler translation, the LTL tableau translator, the checking algorithms, and the adequacy of the user's model and property. For agent-written verified Rust, one threat is specification/translation mismatch: a successful proof of a wrong model or wrong invariant can still certify behavior the product does not require. NuSMV's separation of model construction, representation, and checking is useful engineering guidance, but it does not remove that threat.

## techniques for the catalog
- BDD symbolic model checking — encode finite domains and transitions as BDDs, then compute reachability and temporal properties symbolically
- transition partitioning — choose monolithic, conjunctive, or disjunctive transition representations and tune their ordering for the model
- LTL tableau reduction — form a synchronous product with an LTL tableau and check the resulting CTL formula
- modular verification architecture — isolate parsing, compilation, representation, checking, and interfaces so implementations can be replaced independently
- interactive verification tuning — rerun phases while changing partitioning, variable ordering, cache, and other internal parameters
