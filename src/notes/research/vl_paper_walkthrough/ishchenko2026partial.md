# Partial Automation of Verification Condition Proving for Reflex Programs (Draft)
(authored by agents unless marked 🧑)
Tag: `ishchenko2026partial`, [paper](http://arxiv.org/abs/2606.23377v1)

## scope and result

The paper modifies a verification-condition generator (VCG) for Reflex, a C-like process language for industrial controllers. Its three contributions are a structured annotation language, structure-derived invariants, and SMT solving. The intended workflow is deductive verification: translate annotated program behavior into verification conditions (VCs), then prove each VC. The paper reports an architecture and algorithms, but no completed implementation or benchmark: its conclusion says future work includes implementing the parser, invariant generator, SMT-LIB translator, and a comprehensive evaluation. Therefore the paper teaches a design, not measured proof coverage or speed.

The paper states: “This paper proposes modifications to the verification condition generator aimed at automating the proof of some of these conditions.” (Abstract, PDF p. 1). It also states that the previous generator produced “thousands of verification conditions, making manual proof of all of them impractical” (Introduction, PDF p. 1). These claims establish the problem and intended benefit; they do not quantify a reduction.

## technique 1: typed, extensible annotations

What it is. Reflex annotations are C-style comments with square brackets and a type, optional language name, and content. The paper gives the shape `//[T(L): C]` or a block form (Section III, PDF p. 2). `assume` specifies a condition before a statement, `assert` requires it after, `invariant` requires it before and after (and supplies loop or global invariants depending on attachment), and `define` introduces a specification variable, constant, or function. Temporal operators `prev`, `before`, `between`, `next`, and `eventually` express iteration relationships; `scope` selects the point at which a temporal expression is evaluated.

When to use it. Put `assume` on trusted input conditions, `assert` on post-state obligations, and `invariant` on properties that must survive iterations. Attach annotations to the first following statement or declaration. Use an external language when the native formula syntax is insufficient; the paper’s example is Isabelle/HOL:
`//[invariant(Isabelle): \\forall s. toEnvP s]` (Section III-A, PDF p. 2).

How to apply it, following the paper. (1) Write the C-style annotation immediately before its program element. (2) Choose one of the four types and write a Boolean formula; use temporal operators with the meaning determined by the attachment context. (3) Optionally name a language such as Isabelle. (4) Parse annotations in parallel with the program and associate them with the corresponding AST/CFG node. (5) Translate native formulas to the VCG’s internal representation; preserve external-language formulas except for variable-name mangling, then translate them at VC generation (Sections III and VI, PDF pp. 2–5).

Verus form. Inference: a Rust/Verus analogue uses `requires` for assumptions on a function, `ensures` for postconditions, and `invariant` clauses on supported loops; temporal history must be modeled explicitly with ghost state or a state-machine history rather than Reflex’s `prev` syntax. Inference: an Isabelle-language annotation has no direct Verus equivalent; write a Verus `spec fn` or proof lemma and connect it with `assert`/`assert forall` facts. The Reflex annotation comment itself does not carry over.

Evidence and limits. The paper provides syntax and translation rules but no implementation results. Reflex annotations are specifications, so assumptions remain trusted unless independently proved. The paper warns that annotations at program/process/state declarations are best expressed as invariants and that input assumptions are “taken as given without verification” (Section III-A, PDF p. 2). That is an explicit trust boundary.

## technique 2: structure-derived invariants

What it is. The generator derives four invariant families from the CFG and state-update structure: reachable process states; stabilized state variables (same value after repeated iterations in a state); non-stabilized state-entry variables; and transition-condition invariants. The paper gives the process-state shape `∀s.toEnvP s → getPstate s ρ ∈ ξ1 ... ξn` (Section IV, PDF p. 3). Stabilized variables additionally require that the predecessor external state has the same process state. Transition conditions use `prevProcState`, which finds the latest state in which the process differed.

How to apply it. (1) Build the CFG while parsing the program. (2) Enumerate each process’s declared states for reachable-state invariants. (3) For stabilized variables, inspect assignments in a state and include a variable only when every iteration ends with the same value; check that later processes do not modify it. (4) For non-stabilized variables, identify variables defined before first entry, then verify they are not modified while the state is active and by later processes. (5) For each `set state`, accumulate path predicates while traversing the CFG; retain predicates guarding that transition and conjoin them. (6) Add an initial-state condition when the process is active in the first iteration. (7) For timeout transitions, conjoin the elapsed-time predicate with the retained path condition (Section IV, PDF pp. 3–4).

The paper’s procedural description is explicit: “Defined non-stabilized process state variables invariants are constructed in two steps: 1) Identify all variables that are defined before the state is first entered. 2) Verify that these variables are not modified while the state is active.” (Section IV, PDF p. 3). It also says transition generation requires “tracing all conditions and variable modifications along the path leading to a set state statement” (Section IV, PDF p. 4).

Verus form. Inference: represent process state as a Rust enum or ghost state-machine variable, and encode reachable-state and state-entry facts as `invariant` clauses or lemma postconditions. Inference: stabilized values become loop invariants over the state variable; transition predicates become `ensures` on state-transition functions. Use Verus state-machine transition proofs for concurrent state updates. Reflex’s `prevProcState` history needs an explicit ghost sequence or an old-state argument; do not use an invented Verus temporal operator.

Evidence and limits. These invariants are syntactically derived and therefore reduce annotation burden, but the paper provides no soundness theorem or measurements in this draft. They assume the CFG accurately models process execution and that later-process writes can be detected. Aliasing, external calls, and incomplete path conditions could invalidate the derived facts unless modeled.

## technique 3: SMT theory embedding and layered lemmas

What it is. The generator translates each VC to SMT-LIB over an algebraic `State` datatype. State updates are constructors (`setVar...`, `setPstate`, `reset`); getters are uninterpreted functions constrained by update axioms. Recursive functions `substate`, `toEnvP`, and `predEnv` expose predecessor and external-state relations (Section V-A, PDF pp. 4–5). The paper’s example axiom is `(= (getVarBool (setVarBool s x v) x) v)`.

How to apply it. (1) Declare sorts for variables, processes, and program states. (2) Declare state constructors for each update. (3) Declare getter functions and assert read-after-write and frame axioms. (4) Define predecessor functions. (5) Classify support lemmas as base (always applicable), advanced (user assumptions plus generated invariants), or optional (transition invariants). (6) Start with base and advanced lemmas; enable optional lemmas only when needed. (7) Restrict each VC’s context to the at-most-two process states it touches. The paper states: “By default, only base and advanced lemmas are used.” (Section V-B, PDF p. 5).

Verus form. Inference: Verus uses executable Rust state plus `spec fn` models, `requires`/`ensures`, `assert` facts, and proof lemmas instead of SMT-LIB declarations. Read-after-write properties become proved lemmas about the model; frame properties become explicit ensures clauses. Inference: context restriction corresponds to exposing only relevant lemmas or using proof blocks, consistent with Verus’s solver-context control. Do not write `modifies`, `ensures` on `spec fn`, or runtime calls to proof functions.

Evidence and limits. The paper does not report solver timings, solved-VC counts, or denominators. CVC5 is the default solver in the described pipeline. `sat` means a counterexample, `unsat` means the VC is valid, and `unknown` triggers context refinement; if refinement is exhausted, the VC is emitted for manual Isabelle/HOL proof (Section VI, PDF p. 5). SMT incompleteness and the optional lemma switch are therefore explicit failure modes.

## end-to-end pipeline and trust

The complete pipeline is: parse annotations and code into an AST; construct a CFG; generate structural invariants; traverse the CFG to produce independent VCs; build a per-VC proof context; negate the behavioral requirement as the SMT goal; translate to SMT-LIB; call CVC5; classify `sat`, `unsat`, or `unknown`; and retry `unknown` with more lemmas before deferring it to Isabelle/HOL (Section VI, PDF p. 5). The paper says: “If the solver returns unknown, the system attempts to refine the proof context.” (Section VI, PDF p. 5).

What is proved is conditional validity of generated VCs under the supplied annotations, generated invariants, SMT encoding, and solver result. Trusted elements include input `assume` annotations, the Reflex-to-VC semantics, CFG construction, state datatype axioms, SMT solver correctness, and Isabelle/HOL for deferred proofs. No experiment establishes that the proposed modifications work on a real controller. Inference: for VL, the design suggests a useful separation between contract syntax, automatically inferred state invariants, and per-obligation solver contexts, but it is an architectural pattern rather than reusable Verus code. Inference: the threat to agent-written verified Rust is moderate for stateful controllers because missing history, aliasing, or unsound assumptions can make a passing proof irrelevant; the absence of evaluation leaves effectiveness unknown.

## what VL should not redo

The paper already specifies a three-layer automation pattern—annotations, CFG-derived invariants, and SMT context refinement—and a fallback to interactive proving. VL should not claim these as new ideas. A potentially new VL contribution would need measured evidence on Rust/Verus programs, such as solved-VC fractions, proof time, repair effort, or robustness under code changes; this paper reports none.

## techniques for the catalog

- extensible annotations — attach typed assumptions, assertions, invariants, and definitions to program elements, with optional external formula languages
- structural invariant generation — derive reachable-state, state-variable, and transition-condition invariants by CFG and path analysis
- layered SMT proof contexts — encode state updates and getters in SMT-LIB, select base/advanced/optional lemmas, and refine on `unknown`
- per-VC fallback — classify solver results and defer unresolved obligations to an interactive theorem prover

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
