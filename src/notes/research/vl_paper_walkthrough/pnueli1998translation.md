# Translation Validation
(authored by agents unless marked 🧑)
Tag: `pnueli1998translation`, [paper](https://www.semanticscholar.org/paper/d8b4164fef65ffc7082a3c95b0a706e5c3aa38f9)

## scope and result

The paper proposes validating each compiler run instead of proving one compiler implementation for all future runs. It states: “Rather than proving in advance that the compiler always produces a target code which correctly implements the source code (compiler verification), each individual translation (i.e. a run of the compiler) is followed by a validation phase which verifies that the target code produced on this run correctly implements the submitted source program.” (abstract, p. 151). The demonstration translates SIGNAL, a synchronous multi-clock data-flow language, into asynchronous sequential C (abstract, p. 151). The validator models both programs as synchronous transition systems (STS), checks a refinement relation with an inductive simulation mapping, and emits a proof script for a small checker (§1, pp. 152–153).

Inference: for VeruLaw, this is a pattern for checking each generated Rust artifact against a source-level specification or previous implementation. It can catch a bad generation run without requiring a proof that the generator is forever correct; it does not prove the generator, specification, or model is correct.

## technique: per-run translation validation

Use this when a translator or code generator changes often and a whole-translator proof would freeze development. The paper's concrete procedure is:

1. Feed source and generated target programs to one analyzer (§1, p. 152). The paper says, “Both the source and the target programs are fed as inputs to an Analyzer.”
2. Represent both in a common semantic framework (§1, p. 152). The required ingredient is “A common semantic framework for the representation of the source code and the generated target code.”
3. Define correct implementation as refinement over that framework (§1, p. 152). The analyzer must establish that the target behavior is contained in the source behavior at the chosen interface.
4. If refinement succeeds, generate a detailed proof script; if it fails, emit a counterexample execution (§1, p. 152). The paper states, “If the analyzer finds that the generated target program correctly implements the source program, it generates a detailed proof script.”
5. Run a rudimentary proof checker over that script (§1, p. 152). This split keeps the final checker small and “almost ‘verifiable by inspection’” (§1, p. 153).

Inference: a Verus implementation can make the source contract a `spec fn` or a ghost state machine, expose the generated Rust implementation as executable code, and prove a per-build refinement lemma. The stable Verus constructs are `spec fn`, `proof fn`, `requires`, `ensures`, `invariant`, and `assert`; the checker is Verus plus its solver rather than the paper's standalone script checker. Inference: a failed proof can be paired with a concrete counterexample state produced by bounded execution or a model checker, but Verus itself does not automatically provide the paper's analyzer-and-counterexample pipeline.

## technique: STS semantic normalization

An STS is the common model. Definition 1 lists finite variables `V`, a satisfiable initial condition `O`, a transition relation `p(V,V')`, and externally observable variables `E` (§3, p. 156). A computation is an infinite sequence satisfying initiation and consecution (Definition 2, p. 157). Volatile SIGNAL variables can be absent, represented by a designated bottom value; persistent “memorization” variables retain values across steps (§3.1, p. 157).

The paper models the MUX source with variables `FB`, `N`, `ZN`, and a memory variable `x.N`; its transition relation includes a stutter step that sets signals absent while retaining memory (§3.1, p. 157). It models C with the same observables plus clock booleans and a program counter `pc` (§3.2, p. 158). The generated loop's location 15 is the observation point: entering it means one abstract transition has been cumulatively computed (§2, pp. 155–156; §3.2, p. 158). The C model adds `x.N` immediately before that point so abstract previous-value state is available (§3.2, p. 158).

Inference: in Verus, define a ghost state record for abstract observables and concrete locals, and a `spec fn` that projects a concrete state to the abstract state at an observation boundary. Model absence explicitly (for example, an option-like spec value) rather than silently treating an uninitialized Rust value as absent. Verus loop `invariant` clauses can maintain the STS invariant at each iteration; the paper's STS semantics, not Rust execution, remains the specification.

## technique: clocked refinement and inductive simulation

For concrete system `C` and abstract system `A`, a clocked interface mapping maps every concrete state to an abstract observable state while either preserving each observable value or declaring it absent (Definition 3, §4.1, p. 159). `C` refines `A` when every mapped concrete computation is an abstract computation; refinement exists when some such mapping exists (Definitions 3–4, p. 160).

The proof method extends the interface mapping to a full abstract-state refinement mapping `f`. It is clocked when each abstract observable is preserved or absent. It is inductive when (1) every concrete initial state maps to an abstract initial state and (2) every concrete transition maps to an abstract transition (Definition 5, §4.2, pp. 160–161). Theorem 1 concludes: “If f : S c ----+ S a is an inductive (clocked) refinement mapping from C to A, then C E_ A.” (§4.2, p. 161).

Inference: the Verus shape is a ghost projection `f`, an initial-state `ensures`, and a loop or transition proof whose `ensures` establishes the abstract transition relation. A Rust implementation must expose the observation boundary and preserve ownership facts needed to evaluate `f`; the paper's mathematical state mapping does not itself prove memory safety or API contracts.

## technique: syntactic REF rule and generated invariants

To automate the semantic proof, the paper represents `f` as a substitution `σ` from each abstract variable to an expression over concrete variables (§5.1, pp. 161–162). Substitution rewrites unprimed and primed variables in the abstract initial condition and transition relation. Rule REF requires an invariant `inv` and checks five obligations: concrete initiation implies `inv`; `inv` propagates through concrete transitions; concrete initiation implies abstract initiation after substitution; `inv` plus a concrete transition implies the substituted abstract transition; and each abstract observable is either equal to its concrete counterpart or absent (§5.1, p. 162).

The paper warns that arbitrary systems cannot generally yield `inv` and `σ` automatically (§5.2, p. 162). SIGNAL-to-C translation is tractable because the compiler has a fixed loop shape. It computes clock expressions from guards on paths to assignments, then builds `σ` from the observation location and clocks (§5.2, pp. 163–164). For MUX, it obtains `clk(FB)=h2`, while `N` and `ZN` are always clocked, and maps `FB` to its value only when `h2` is true at `pc=15`; `N` and `ZN` are mapped at `pc=15`; `x.N` maps directly (§5.2, p. 164). The invariant records legal program-counter locations, clock values, assignments on each control path, and the relation between `x.N` and `N` (§5.2, p. 164).

Inference: Verus can encode the REF obligations as `requires`/`ensures` on a proof transition function and maintain `inv` with `invariant` clauses. The substitution becomes a `spec fn` projection. Inference: automatic invariant and projection synthesis is outside ordinary Verus proofs; it would require a separate generator whose output Verus checks.

## evidence, trust, and limits

The paper reports that all REF premises for MUX were verified with its TLV proof system, with scripts omitted from the short paper (§5.2, p. 164). No benchmark denominator, runtime, bug count, or percentage is reported. The trusted base includes the STS encoding, the analyzer's generated script, the proof checker, and the assumption that the compiler's fixed loop structure supports the synthesis rules. The authors explicitly state that arbitrary systems do not admit a general automatic construction of invariant and substitution (§5.2, p. 162), so the automation claim is limited to the translation family and assumptions described.

Inference: the threat to a product that generates Verus Rust is moderate. Per-run refinement could detect semantic regressions in generated code, especially after generator revisions, but it adds a second specification and model that can disagree with the intended behavior. Memory safety, unsafe Rust, library behavior, solver soundness, and the correctness of the source model remain trusted unless separately proved.

## techniques for the catalog

- per-run translation validation — analyze each source/target pair and proof-check a generated refinement certificate
- STS semantic normalization — encode source and target as transition systems with explicit observables, clocks, memory, and stuttering
- clocked refinement mapping — relate concrete states to abstract observations while allowing absent signals
- inductive simulation — prove initialization and transition propagation of the refinement mapping
- syntactic REF rule — discharge refinement with an invariant, substitution, and five initiation/propagation/observation obligations
- compiler-shape invariant synthesis — derive clocks, substitution, and accumulated path facts from a fixed generated-loop control graph

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
