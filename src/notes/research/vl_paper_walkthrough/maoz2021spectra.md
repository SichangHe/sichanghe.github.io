# Spectra: a specification language for reactive systems
(authored by agents unless marked 🧑)
Tag: `maoz2021spectra`, [paper](https://doi.org/10.1007/s10270-021-00868-z)

## what the paper proves or measures

Spectra is a domain-agnostic language for writing reactive-system specifications for GR(1) synthesis. Its semantics is defined by translation to a small Boolean kernel, and Spectra Tools checks realizability, synthesizes controllers, executes them, and diagnoses specification problems. The abstract says: “We introduce Spectra, a new specification language for reactive systems, specifically tailored for the context of reactive synthesis.” (Abstract, p. 1553). The language separates environment inputs from system outputs and assumptions from guarantees, then translates every well-formed specification to a GR(1) synthesis problem.

The paper reports four student collections with 327 specification versions in total: 78, 149, 27, and 73. It states: “In total, we have collected 327 (= 78 + 149 + 27 + 73) specifications.” (Section 6, p. 1572). It describes these as benchmarks and reports observations about writing specifications; it does not evaluate Verus, Rust, or a general-purpose program verifier.

## technique 1: translate a friendly language to a small kernel

what it is: the kernel contains Boolean environment variables, Boolean system variables, initial assumptions/guarantees, safety assumptions/guarantees, and justice assumptions/guarantees. Spectra maps these to the GR(1) tuple `X, Y, θe, θs, ρe, ρs, Je, Js`. The paper states: “The semantic domain of the Spectra kernel language is GR(1) synthesis problems.” (Section 3.3, p. 1559).

Inference: when to use it: use a kernel translation when the surface language needs readability and reuse but the analysis engine should remain small and stable. Add each new construct as a modular translation to the kernel.

how to do it:
1. classify each declaration as environment input (`env`) or system output (`sys`) (Section 3.3, p. 1559).
2. conjoin initial assumptions and guarantees separately into `θe` and `θs`, and safety assumptions and guarantees separately into `ρe` and `ρs`; collect justice assumptions and guarantees as the sets `Je` and `Js` (Section 3.3, p. 1559).
3. eliminate each extension through a modular translation that may still use other extensions; applying all translations yields the kernel. An `alw` expression without `next` receives the state-invariant translation described below (Section 4, p. 1559; Section 4.3, p. 1562).
4. pass the kernel representation to GR(1) realizability checking or synthesis.

Inference: Verus form: keep surface-level Rust contracts or helper macros separate from a small verified specification core. Translate reusable declarations into `spec fn`s and contracts, then discharge the resulting `requires`, `ensures`, and `invariant` obligations. Verus has no GR(1) controller synthesis, so the kernel is a specification organization pattern, not a direct executable feature.

evidence and limits: the translation gives a formal meaning to each accepted construct, while GR(1) synthesis supplies the algorithm. The kernel is intentionally restricted to GR(1); the paper notes that the language does not cover probabilistic, timed, or quantitative requirements (Introduction, p. 1554). Spectra uses strict realizability: “Spectra supports strict realizability.” (Section 2.2, footnote 1, p. 1556).

## technique 2: encode enumerations and bounded integers as Booleans

what it is: Spectra supports finite enumerations and bounded integer arithmetic while the kernel has Boolean variables. An enumeration with `n` values is encoded with `ceil(log2 n)` Boolean variables, plus constraints excluding unused bit patterns. A bounded integer is similarly encoded and arithmetic expressions are translated using an encoding inspired by Bartzis and Bultan (Section 4.1.3, p. 1560).

Inference: when to use it: use this when specifications need readable multi-valued modes, bounded counters, or comparisons but the synthesis engine accepts only Boolean state.

how to do it:
1. declare an enum or `Int(lower..upper)`; enumeration values must have unique names distinct from variable names, and `upper` must be strictly greater than `lower` (Section 4.1.2, p. 1560).
2. assign each enum value a Boolean code (Section 4.1.3, p. 1560).
3. add initial and safety constraints so the bit vector denotes a legal value; unused encodings are excluded (Section 4.1.3, p. 1560).
4. replace equality and bounded arithmetic expressions by Boolean formulas implementing the encoding.

Inference: Verus form: represent a bounded mode with an enum or an integer type and prove range invariants with `requires`, `ensures`, and loop `invariant`. If a solver needs bits, expose a specification-level encoding and prove round-trip and arithmetic lemmas. Do not replace the executable Rust value with an unconstrained bit vector.

evidence and limits: the paper gives the traffic-light example with `go ∈ {MAIN,SIDE,NONE}` and integer variables `carsMain` and `carsSide` bounded to `0..10` and `0..6` (Listing 2, p. 1560). Unused Boolean combinations are excluded by constraints. The paper gives no separate performance measurement for this extension.

## technique 3: reuse definitions, types, and arrays by expansion

what it is: `define` names a repeated expression; type definitions name an enum or bounded type; arrays provide indexed fields. Translation substitutes each define, expands each array field into a fresh scalar declaration, and replaces type references with their underlying type (Section 4.2.3, p. 1562).

Inference: when to use it: use these constructs to reduce duplication and make long constraints maintainable, especially for maps or repeated predicates.

how to do it:
1. declare a named expression such as `streetsEmpty` and reference it in assumptions and guarantees (Listing 3, p. 1561).
2. declare a type and an array, for example a `10×10` map (Listing 4, p. 1561).
3. check unique names, positive dimensions, and the correct number and range of array coordinates (Section 4.2.2, p. 1562).
4. substitute defines, expand every array cell to a fresh variable, replace field references, and replace type references (Section 4.2.3, p. 1562).

Inference: Verus form: use `spec fn` for pure reusable predicates and sequence/map specifications for arrays. Keep a single representation relation between an array abstraction and the Rust storage; prove index bounds and cell updates with `requires`, `ensures`, and `invariant`. Macro expansion must preserve the proof-relevant relation.

evidence and limits: the map example expands 100 fields from a `10×10` array (Section 4.2.1, p. 1561; Section 4.2.3, p. 1562). Inference: array expansion can make the kernel larger. The paper gives no separate timing measurement for this expansion.

## technique 4: state invariants and PastLTL history

what it is: a state invariant is a formula that must hold initially and after every transition. Spectra translates it into an initial constraint plus an `alw` constraint whose expression is nested under `next` (Section 4.3.3, p. 1562). PastLTL adds `Y` (previous), `S` (since), `O` (once), and `H` (historically) so a justice constraint can refer to history. The paper gives `alwEv ONCE carSide` for “a car appears on the side street at least once in every run” (Section 4.4.1, p. 1562).

Inference: when to use it: use state invariants for current-state safety facts and PastLTL when a requirement depends on whether an event occurred previously.

how to do it:
1. write the invariant without `next`; environment invariants cannot mention system variables (Section 4.3.2, p. 1562).
2. translate it to initial and next-state constraints (Section 4.3.3, p. 1562).
3. for history, choose `Y`, `S`, `O`, or `H` and place the resulting expression in an assumption or guarantee (Section 4.4, pp. 1562–1563).
4. introduce a fresh Boolean system variable `aux` for each translated history expression. For `PREV φ`, add `ini !aux` and `alw next(aux) <=> φ`. For `φ SINCE ψ`, add `ini aux <=> ψ` and `alw next(aux) <=> (aux & next(φ) | next(ψ))`. Replace the history expression with `aux`; express `ONCE` and `HISTORICALLY` through `SINCE` and negation (Section 4.4.3, p. 1563).

Inference: Verus form: put state facts in loop or state-machine `invariant` clauses. Represent “once” or “historically” with a ghost Boolean or sequence predicate updated on each transition, and prove its update in a proof `fn`. Verus does not supply temporal operators; the ghost history must be connected to every executable transition.

evidence and limits: the translation gives a finite-state encoding for the supported PastLTL fragment. The paper’s state-invariant example is the mutual exclusion of two green lights (Section 4.3.1, p. 1562). Inference: auxiliary history variables may affect synthesis cost. No separate measurement is reported.

## technique 5: predicates, monitors, and counters

what it is: predicates package parameterized expressions; monitors introduce an auxiliary state variable with constraints that update only that variable; counters provide bounded integer state changed by `inc`, `dec`, and `reset` constraints. Monitor well-formedness requires a unique monitor value at every step without restricting other variables; this is a deterministic, complete automaton requirement (Section 4.6.2, p. 1564). Counter translation supports three overflow and underflow policies: `false` disallows the event by making it violate a safety guarantee, `keep` preserves the value, and `modulo` wraps to the opposite bound. The default is `false` (Section 4.7.3, pp. 1565–1566).

Inference: when to use it: use predicates for repeated parameterized conditions, monitors for finite automata over events, and counters for bounded progress or resource counts.

how to do it:
1. define a predicate with parameters and reference it from assumptions or guarantees (Section 4.5, pp. 1563–1564).
2. declare a typed monitor and initial/safety constraints that determine its value uniquely without restricting other variables; monitor bodies cannot contain justice constraints (Section 4.6.2, p. 1564).
3. declare a bounded counter and optional initial, increment, decrement, and reset constraints. Increment/decrement/reset conditions must be mutually exclusive; reset sets the lower bound (Section 4.7, pp. 1565–1566).
4. expand predicate instances by substituting arguments into copies of their bodies. Replace each monitor with a system variable of the same name and type, and its constraints with guarantees. Replace each counter with a bounded integer system variable of the same name and range, adding initial/safety guarantees for its constraints and a safety guarantee preserving its value when no update condition holds (Sections 4.5.3, 4.6.3, and 4.7.3, pp. 1564–1566).

Inference: Verus form: write predicates as `spec fn`s, monitor state as an enum in a verified state machine, and counters as bounded integers with range invariants. Prove each transition’s contract and overflow behavior explicitly. A Verus `spec fn` is not executable code and cannot substitute for a runtime counter update.

evidence and limits: the monitor example is the Boolean `needGreenMain` (Listing 6, p. 1564). The separate response pattern uses states `S0` and `S1` (Listing 8, p. 1566). Malformed monitors can make the whole specification unrealizable, and Spectra Tools provides checks for this problem (Section 5.7, pp. 1571–1572). The paper does not quantify solver cost per counter.

## technique 6: reusable temporal patterns, quantification, and imports

what it is: patterns package common LTL relations in GR(1)-compatible automata. The response pattern `G(p → F s)` is defined with local states and exactly one justice constraint, then instantiated for main and side streets (Section 4.8, pp. 1566–1567). Universal and existential quantification are expanded into conjunctions and disjunctions over finite domains (Section 4.9.3, p. 1568). Imports copy transitively referenced predicates and patterns into the current file (Section 4.10.3, p. 1568).

Inference: when to use it: use patterns for recurring specification idioms, quantification for finite arrays or bounded values, and imports for shared libraries of predicates and patterns.

how to do it:
1. define a pattern with parameters, optional local variables and initial/safety constraints, and exactly one justice constraint. Initial and justice constraints cannot use `next`; safety constraints can use `next` only on pattern variables. Initial/safety constraints must determine a complete, deterministic automaton without restricting other variables (Section 4.8.2, pp. 1566–1567).
2. instantiate it as an entire assumption or guarantee, outside other expressions. Create fresh system variables for local variables and substitute actual parameters. Initial and safety constraints always become guarantees; the justice constraint becomes an assumption or guarantee according to the instance’s enclosing constraint (Section 4.8.3, p. 1567).
3. for `forall`, make one copy per value in the finite domain and conjoin; for `exists`, make copies and disjoin (Section 4.9.3, p. 1568).
4. import files with unique pattern/predicate names across the imported and current files. Imported predicate bodies may reference only other predicates and their parameters. Copy all transitively referenced patterns and predicates, then remove imports (Sections 4.10.2–4.10.3, p. 1568).

Inference: Verus form: borrow the reuse structure through parameterized specification functions or proof lemmas. A temporal response requirement still needs an explicit execution model and progress argument; a state invariant alone does not establish eventual response. Finite quantification can be unrolled or represented by quantified specifications, and shared definitions can live in Rust modules. These are proposed analogies, not Verus features evaluated by this paper.

evidence and limits: the authors investigated 55 Dwyer patterns and report that 52 can be supported in GR(1); the three unsupported patterns are identified in footnote 8 on p. 1566. Pattern initial/safety constraints must define deterministic, complete automata. Inference: finite quantifier expansion can enlarge the resulting specification.

## technique 7: realizability, synthesis, and specification diagnosis

what it is: Spectra Tools translates to a BDD-based kernel model, checks GR(1) realizability, synthesizes either a concrete or symbolic controller, and offers analyses for unrealizability and non-well-separation. The architecture separates parsing, modular translations, BDD generation, analyses, and UI; “The main concerns of Spectra Tools are the input language syntax, the definition of semantics of language constructs in terms of the Spectra kernel, a representation of the semantics of Spectra at the BDD level, analyses and tools that operate on this BDD-based representation, and a UI layer.” (Section 5.1, p. 1568).

how to do it:
1. parse and type-check the specification and apply modular language translations. The implementation handles bounded integers and arithmetic in `BddGenerator` for performance, rather than in `GameInputTrans` (Section 5.1, pp. 1568–1569, footnote 11; Section 5.7, p. 1572).
2. generate a BDD representation of the kernel model (Section 5.1, p. 1569).
3. run GR(1) realizability checking; the implementation uses variable grouping, combined conjunction/existential abstraction, partitioned transitions, early fixed-point/unrealizability detection, and fixed-point recycling (Section 5.2, p. 1569).
4. if realizable, synthesize a concrete controller for application-specific code generation or a symbolic BDD controller for the execution API and Controller Walker. The paper also describes just-in-time synthesis, which skips symbolic controller construction and computes next states during execution (Sections 5.3–5.4, p. 1570).
5. if unrealizable, compute a locally minimal unrealizable core with DDmin, a concrete environment counter-strategy, a symbolic Justice Violations Transition System, or a repair suggestion (Section 5.5, pp. 1570–1571).
6. check whether the system can force the environment to violate its assumptions; if so, inspect the reported type, a witnessing strategy, or a minimal set of assumptions causing non-well-separation (Section 5.6, p. 1571).

Inference: Verus form: use the diagnosis ideas around failed `verify` results: isolate minimal contract subsets, generate counterexamples, and inspect symbolic invariants. A synthesized controller is outside Verus’s role; Verus can independently verify the generated Rust implementation against explicit contracts. DDmin can prioritize which assumptions or guarantees to review, but it cannot prove that the remaining specification expresses the real requirement.

evidence: the paper reports 327 student specifications across four collections (Section 6, p. 1572) and says all described tools were implemented and used by the students (Introduction, p. 1554). It refers to an earlier evaluation for runtime heuristics rather than giving a new timing table in this paper. The student population consisted of third-year undergraduates with no prior formal-methods experience (Section 6, p. 1572). Inference: these observations concern student use in that setting; they do not establish industrial effectiveness.

limits: guarantees can make a specification unrealizable. Contradictory or trivially false assumptions instead raise a specification-quality concern; the tools check trivial constraints and inherent vacuity (Section 5.7, pp. 1571–1572). Concrete controllers can be too large to inspect or compile; the authors introduced symbolic controllers partly because of this (Section 5.3, p. 1570). A controller can exploit non-well-separation by preventing the environment from satisfying assumptions, which is logically valid but usually undesirable (Section 5.6, p. 1571).

## trusted boundary, contradictions, and scope

The paper formally defines syntax and translations and relies on GR(1) algorithms, BDD operations, and the correctness of generated controllers. Inference: realizability does not show that the author’s assumptions and guarantees describe the intended system. The paper reports 320-plus specifications in the introduction and the exact total 327 in Section 6; these are consistent because the introduction’s “over 320” is a rounded description. Inference: the 52-of-55 pattern result counts supported pattern types; it does not measure success on student specifications.

## techniques for the catalog

- kernel translation — map a readable specification language to a small Boolean GR(1) kernel
- bounded-value encoding — compile enums and bounded arithmetic into Boolean variables with legality constraints
- reusable definitions and arrays — expand named expressions, types, and array fields into kernel declarations
- invariant and history translation — encode state invariants and PastLTL through initial/safety constraints and auxiliary state
- monitors and counters — model finite automata and bounded progress with translated state variables
- patterns, quantifiers, and imports — package temporal idioms, expand finite quantification, and reuse specification libraries
- realizability diagnosis — combine BDD synthesis with unrealizable cores, counter-strategies, repairs, and well-separation checks
