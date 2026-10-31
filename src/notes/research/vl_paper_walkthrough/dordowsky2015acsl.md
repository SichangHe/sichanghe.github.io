# An experimental Study using ACSL and Frama-C to formulate and verify Low-Level Requirements from a DO-178C compliant Avionics Project
(authored by agents unless marked 🧑)
Tag: `dordowsky2015acsl`, [paper](https://doi.org/10.4204/EPTCS.187.3)

## study scope

This is an industrial case study, not a new verifier. ESG translated low-level requirements (LLRs) from a real helicopter-sensor controller into ACSL and attempted deductive verification with Frama-C WP and Alt-Ergo. The sensor software was developed under DO-178B level D (section 4, page 30). The authors say: “The low level specification of a software function was formalized with ACSL, and the corresponding source code was partially verified using Frama-C and the WP plugin, with Alt-Ergo as automated prover.” (abstract, page 28). Their criteria include usable notation, available training and documentation, mature tools, and useful failure feedback; DO-333 soundness, coverage and qualification were explicitly outside scope (section 2, page 30).

## technique: behavioral ACSL contracts with ghost state

Use this when an LLR refers to persistent module state that is hidden from a public function declaration.

1. translate each natural-language case into a named ACSL `behavior`, with `assumes` for its condition and `ensures` for its postcondition.
2. add `complete behaviors` and `disjoint behaviors`; the authors say that with these “one can automatically verify completeness and consistency of the formal specification” (section 5, page 33).
3. expose an internal static variable through a ghost variable in the header. The paper's exact code shape is `//@ ghost uint16_t gWorkCond = NCD_IDLE_EMIT ;` (section 5, page 32).
4. align ghost and concrete state in the implementation with an assertion before the update and a ghost assignment after it. The paper reports: “The assertion in line 3 is necessary to inform the prover that the internal state is always equal to the ghost state. It is not possible to prove it.” (section 5, page 33)
5. omit `assigns` only as a documented workaround when hidden file-scope state cannot be named; the authors warn that the ACSL manual discourages this and that adding it generated unprovable conditions (section 5, page 33).

Inference: Verus can represent the state as a ghost/spec value and relate executable updates with `assert` proof steps, while a public function contract uses `requires` and `ensures`. Verus does not carry ACSL `behavior`, `complete`, or `disjoint` syntax; encode mutually exclusive cases as implications or separate lemmas, and keep executable state updates explicit. This is a transfer inference.

The evidence is six scheduled obligations for `cbit_set_work_cond`: five valid and one unknown (table 1, page 38). The paper says the alignment assertion cannot be proved and needs justification under DO-333 objective FM2 (section 5, page 33). Inference: the one unknown obligation is probably that assertion, but the paper does not say so. The evidence is one small function, not a benchmark.

## technique: ghost state for behavior across calls

Use this when the result depends on prior invocations, such as a discrepancy counter. ACSL specifies one execution, so the authors introduce `gerrcnt`, update it with assertions, and keep it aligned with the implementation using assertions in the function body (section 6.1, page 34). The contract then refers to its pre-state with `\at(gerrcnt,Pre)` and `\old(gerrcnt)` (section 6.2, page 35). Inference: the steps are identify persistent state, add a ghost counter, update it in the body, write postconditions over the old ghost value, and run WP.

The paper says this is “rather close to the implementation and discloses internals of the implementation.” (section 6.1, page 34). Its alternative is a state automaton in YA or LTL translated by the Aoraï plug-in into ACSL and annotated C, then proved by WP; the authors needed to learn an additional specification language and “were not able to accomplish this in the time available for the study” (section 6.1, page 34).

Inference: a Verus state machine can make cross-call transitions explicit and prove an invariant over the abstract counter; use state-machine transition specifications where the component is concurrent or long-lived. This inference follows the paper's automaton motivation, not an evaluation in the paper.

## technique: predicates for values returned by subroutines

Use this when a caller's contract depends on values produced by a callee and those values are unavailable at the caller's pre-state.

1. copy returned values into ghost variables immediately after the call (`T1 = temp1; T2 = temp2`).
2. define named predicates over the ghost values and old state, for example transient and permanent temperature discrepancy.
3. replace `assumes` with implication-style `ensures` clauses whose antecedents invoke those predicates and `\at(...,Pre)` values (section 6.2, pages 34–35).
4. add explicit completeness and consistency postconditions because behavior clauses can no longer be checked automatically (section 6.3, page 35).

The authors give the reason: “Again, the return values of subroutines are not visible at specification level.” (section 6.2, page 34). They found ambiguous natural-language requirements while proving this contract, including the calculated module temperature under permanent discrepancy (section 6.2, page 35); the implementation was correct and the specification text misleading.

Inference: in Verus, prefer a callee `ensures` contract that exposes the returned value directly, then prove caller implications from that contract; use `old(...)` in a postcondition for pre-state values. If modelling an external function, the contract becomes a trusted assumption until its implementation is verified. This distinction is an inference about Verus trust boundaries.

## technique: flattening and controlling specification proliferation

Use this design rule when higher-level contracts repeat lower-level behavior. The corrected temperature contract had to repeat the callee's `gWorkCond == NCD_IDLE_EMIT` guard. The paper calls this “specification proliferation” and says it “leads to redundancy in the specifications which in turn leads to a higher maintenance effort” (section 6.4, page 36).

The authors' steps are: avoid input values obtained from subroutine calls where possible; flatten the call hierarchy; move algorithmic complexity to low-level functions; keep higher-level functions to simple call sequences suitable for code review; or introduce predicates for expressions shared between specifications, similar to the “specification macros” used in the Verisoft project [5]; the authors say this last technique cannot be demonstrated with their small example (section 6.4, page 36). They note that a flat hierarchy “might not be possible for large and complex programs” and that moving complexity down means using formal specifications only at the lowest levels.

Inference: in Verus, expose compact contracts at each verified API and prove composition lemmas once, instead of copying implementation conditions into every caller. This is a maintainability recommendation inferred from the case study.

## technique: approximate unsupported mathematics

Use this when the implementation is a table lookup but the natural requirement is expressed with transcendental functions. The authors first specified an ACSL logic function using `exp` and `floor`; WP did not recognize standard math functions. They then replaced it with a piecewise-linear approximation backed by ghost arrays, which WP accepted, but the verification attempt failed due to timeouts that the authors could not explain (section 6.5, page 37). The implementation itself iterates through a look-up table of 100 pre-calculated values.

Inference: a Verus model can use a spec function for the mathematical relation and prove bounds for the finite lookup table, but the approximation error must be an explicit contract. Do not treat an accepted model as proof of the real analogue circuit without a lemma connecting approximation to hardware behavior.

## technique: isolate unsupported compiler and hardware behavior

Use this when source uses compiler-specific register extensions or volatile hardware effects. The paper lists three choices: ban extensions by coding standard; define their semantics for WP (“very laborious” and not tried); or use them only in very small lowest-layer routines and review those manually, which the authors call “probably the most practical solution” (section 6.6, pages 37–38). Because volatile ghost variables were not implemented in the Fluorine version of Frama-C used, hardware access was concentrated in small subroutines that are specified formally but reviewed manually instead of proved; the ADC channels were modelled as a ghost array to specify and partially verify that the correct channels were used (section 6.7, page 38).

Inference: Verus can wrap FFI, raw-pointer and device operations behind a small API with explicit `requires`/`ensures`; the wrapper's external behavior remains a trusted assumption until separately verified. This mirrors the paper's isolation rule but is not a result reported there.

## techniques for the catalog

- ghost state contracts — expose hidden persistent state with ghost variables and prove alignment assertions
- cross-call state modelling — encode prior-invocation behavior with ghost counters or a translated state automaton
- predicate-based call contracts — snapshot callee outputs and express caller cases as predicate implications
- specification factoring — flatten call hierarchies or factor repeated conditions to limit contract proliferation
- approximation for unsupported math — replace unavailable math functions with piecewise-linear approximations (the paper's proof attempt timed out)
- hardware isolation — confine compiler-specific and volatile operations to small manually reviewed boundaries
