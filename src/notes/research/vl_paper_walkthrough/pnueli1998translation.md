# Translation Validation
(authored by agents unless marked 🧑)
Tag: `pnueli1998translation`, [paper](https://www.semanticscholar.org/paper/d8b4164fef65ffc7082a3c95b0a706e5c3aa38f9) (link from the fetch record; the paper text gives no DOI)

## scope and result

The paper proposes validating each compiler run instead of proving one compiler implementation for all future runs. It states: “Rather than proving in advance that the compiler always produces a target code which correctly implements the source code (compiler verification), each individual translation (i.e. a run of the compiler) is followed by a validation phase which verifies that the target code produced on this run correctly implements the submitted source program.” (abstract, p. 151). The demonstration translates SIGNAL, a synchronous multi-clock data-flow language, into asynchronous sequential C (abstract, p. 151). The validator models both programs as synchronous transition systems (STS), checks a refinement relation with an inductive simulation mapping, and emits a proof script for a small checker (§1, pp. 152–153). The paper only outlines the proof checker and the invariant-generation algorithm; it defers both to a full version (§1, p. 153; §5.2, p. 164). Its one worked example is the small SIGNAL program MUX (§§2–5).

Inference: for VeruLaw, this is a pattern for checking each generated Rust artifact against a source-level specification or previous implementation. It can catch a bad generation run without requiring a proof that the generator is forever correct; it does not prove the generator, specification, or model is correct.

## technique: per-run translation validation

Use this when a translator or code generator changes often and a whole-translator proof would freeze development. The paper's concrete procedure is:

1. Feed source and generated target programs to one analyzer (§1, p. 152). The paper says, “Both the source and the target programs are fed as inputs to an Analyzer.”
2. Represent both in a common semantic framework (§1, p. 152). The required ingredient is “A common semantic framework for the representation of the source code and the generated target code.”
3. Define correct implementation as refinement over that framework (§1, p. 152). Inference: in the paper's terms, the analyzer must establish that the target behavior, observed through the interface mapping, is contained in the source behavior (Definition 3, p. 160).
4. If refinement succeeds, generate a detailed proof script; if it fails, emit a counter-example, “a scenario in which the generated code behaves differently than the source code” (§1, p. 152). The paper states, “If the analyzer finds that the generated target program correctly implements the source program, it generates a detailed proof script.”
5. Run a rudimentary proof checker over that script (§1, p. 152). This split keeps the final checker small and “almost ‘verifiable by inspection’” (§1, p. 153).

Inference: a Verus implementation can make the source contract a `spec fn` or a ghost state machine, expose the generated Rust implementation as executable code, and prove a per-build refinement lemma. The stable Verus constructs are `spec fn`, `proof fn`, `requires`, `ensures`, `invariant`, and `assert`; the checker is Verus plus its solver rather than the paper's standalone script checker. Inference: a failed proof can be paired with a concrete counterexample state produced by bounded execution or a model checker, but Verus itself does not automatically provide the paper's analyzer-and-counterexample pipeline.

## technique: STS semantic normalization

An STS is the common model. Definition 1 lists finite variables `V`, a satisfiable initial condition `O`, a transition relation `p(V,V')`, and externally observable variables `E` (§3, p. 156). A computation is an infinite sequence satisfying initiation and consecution (Definition 2, p. 157). Volatile variables, which represent SIGNAL signals, have a designated element ⊥ in their domain to indicate absence (§3, p. 156). The STS encoding adds persistent memorization variables for variables used in previous-value expressions (§3.1, p. 157).

The paper models the MUX source with variables `FB`, `N`, `ZN`, and a memory variable `x.N`; its transition relation includes a stutter step that sets signals absent while retaining memory (§3.1, p. 157). It models C with the same observables plus clock booleans and a program counter `pc` (§3.2, p. 158). The generated loop's location 15 is the observation point: entering it means one abstract transition has been cumulatively computed (§2, pp. 155–156; §3.2, p. 158). The C model adds the memorization variable `x.N`, copied from `N` at location 14 just before location 15, to match the abstract memorization variable (§3.2, pp. 158–159).

Inference: in Verus, define a ghost state record for abstract observables and concrete locals, and a `spec fn` that projects a concrete state to the abstract state at an observation boundary. Model absence explicitly (for example, an option-like spec value) rather than silently treating an uninitialized Rust value as absent. Verus loop `invariant` clauses can maintain the STS invariant at each iteration; the paper's STS semantics, not Rust execution, remains the specification.

## technique: clocked refinement and inductive simulation

For concrete system `C` and abstract system `A`, with the abstract observables a subset of the concrete ones, a clocked interface mapping maps every concrete state to an abstract observable state while either preserving each observable value or declaring it absent (§4.1, pp. 159–160). `C` refines `A` relative to a mapping when every mapped concrete computation is an abstract computation restricted to the abstract observables (Definition 3, p. 160); `C` refines `A` when some such mapping exists (Definition 4, p. 160).

The proof method extends the interface mapping to a full abstract-state refinement mapping `f`. It is clocked when each abstract observable is preserved or absent. It is inductive when (1) every concrete initial state maps to an abstract initial state and (2) every concrete transition between reachable concrete states maps to an abstract transition (Definition 5, §4.2, p. 161). Theorem 1 concludes that an inductive clocked refinement mapping from `C` to `A` implies that `C` refines `A` (§4.2, p. 161).

Inference: the Verus shape is a ghost projection `f`, an initial-state `ensures`, and a loop or transition proof whose `ensures` establishes the abstract transition relation. A Rust implementation must expose the observation boundary and preserve ownership facts needed to evaluate `f`; the paper's mathematical state mapping does not itself prove memory safety or API contracts.

## technique: syntactic REF rule and generated invariants

To automate the semantic proof, the paper represents `f` as a substitution `σ` from each abstract variable to an expression over concrete variables (§5.1, pp. 161–162). Substitution rewrites unprimed and primed variables in the abstract initial condition and transition relation. Rule REF requires an invariant `inv` and checks five obligations: concrete initiation implies `inv`; `inv` propagates through concrete transitions; concrete initiation implies abstract initiation after substitution; `inv` plus a concrete transition implies the substituted abstract transition; and each abstract observable is either equal to its concrete counterpart or absent (§5.1, p. 162).

The paper warns that, for arbitrary systems, “there is no chance of developing an algorithm” that automatically constructs `inv` and `σ` and verifies the REF premises (§5.2, p. 162). It says SIGNAL-to-C is possible because the C code comes from a code generator “of a very specific structure and mode of operation” (§5.2, p. 162). The main loop has five stages: clock calculation, input reading, output calculation, output writing, and update of previous-value variables (§5.2, p. 163). `σ` maps each memorization variable to its concrete namesake and every other abstract variable `v` to `if pc = obs ∧ clk(v) then v else ⊥` (§5.2, pp. 163–164). The clock expression `clk(v)` is computed from the guards along paths leading to assignments to `v` in the control-flow graph of the loop (§5.2, p. 164). The detailed algorithm for clock expressions and for the accumulated invariant is omitted for lack of space (§5.2, p. 164), so only this outline and the MUX instance are in the paper. For MUX, it obtains `clk(FB)=h2`, while `N` and `ZN` are always clocked, and maps `FB` to its value only when `h2` is true at `pc=15`; `N` and `ZN` are mapped at `pc=15`; `x.N` maps directly (§5.2, p. 164). The proposed invariant records legal program-counter locations, clock values, the effect of assignments on each control path, the relation of `ZN` to `x.N` away from location 15, and `x.N = N` at location 15 (§5.2, p. 164).

Inference: Verus can encode the REF obligations as `requires`/`ensures` on a proof transition function and maintain `inv` with `invariant` clauses. The substitution becomes a `spec fn` projection. Inference: automatic invariant and projection synthesis is outside ordinary Verus proofs; it would require a separate generator whose output Verus checks. The paper's construction relies on a fixed loop shape and a single observation point, so a Rust generator with a different shape would need its own construction.

## evidence, trust, and limits

The paper reports that all REF premises for MUX were verified with the TLV proof system of [PS96], with scripts omitted for lack of space (§5.2, p. 164). The evidence is this one small example: no benchmark denominator, runtime, bug count, or percentage is reported, and no counter-example run is shown. The authors say that for arbitrary systems no algorithm can construct the invariant and substitution (§5.2, p. 162), so the automation claim is limited to the translation family and assumptions described. The conclusions state a scope condition: the approach “seems to work in all cases that the source and the target programs each consist of a repeated execution of a single loop body”, with one source iteration matching one target iteration (§6, p. 165); this is a belief, stated as “seems”, and not tested beyond MUX.

Inference: the trusted base includes the STS encodings of both languages, the analyzer's generated script, the proof checker, and the assumption that the compiler's fixed loop structure supports the synthesis rules.

Inference: the threat to a product that generates Verus Rust is moderate. Per-run refinement could detect semantic regressions in generated code, especially after generator revisions, but it adds a second specification and model that can disagree with the intended behavior. Memory safety, unsafe Rust, library behavior, solver soundness, and the correctness of the source model remain trusted unless separately proved.

## techniques for the catalog

- per-run translation validation — analyze each source/target pair and proof-check a generated refinement certificate
- STS semantic normalization — encode source and target as transition systems with explicit observables, clocks, memory, and stuttering
- clocked refinement mapping — relate concrete states to abstract observations while allowing absent signals
- inductive simulation — prove initialization and transition propagation of the refinement mapping
- syntactic REF rule — discharge refinement with an invariant, substitution, and five initiation/propagation/observation obligations
- compiler-shape invariant synthesis — derive clocks, substitution, and accumulated path facts from a fixed generated-loop control graph

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "In order to match the abstract memorization variables we augment the STS-encoding of the generated C-program with memorization variables which have the same name as their abstract counterparts."): read the whole paper text (pp. 151–166) and the whole study; checked every quotation, definition, rule REF premises, MUX details, section and page references (page numbers taken from the running headers in the text). Changed: page references for Definitions 3–5, memorization variable and volatile/persistent statements; removed a garbled OCR quotation of Theorem 1 in favor of a paraphrase; added that the proof checker and invariant algorithm are omitted from this paper, the five loop stages, the single-example evidence and the single-loop-body scope limit; marked trusted-base text as Inference; tag link kept (link from the fetch record). Not checked: Verus-related Inference statements (not claims about the paper), the cited external works, and the figures beyond the extracted text.
