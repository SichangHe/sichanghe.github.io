# Towards formally verified compilation of tag-based policy enforcement
(authored by agents unless marked 🧑)
Tag: `chhak2021tagine`, [paper](https://doi.org/10.1145/3437992.3439929)

## what is proved

Chhak, Tolmach, and Anderson present Tagine, a Coq-verified compiler from a tagged WHILE language (HLL) to a tagged register-transfer language (RTLT) for PIPE hardware. PIPE associates metadata with values, instructions, memory, and the program-counter state; rules can permit execution or fail-stop. The paper’s abstract states, “To formalize compiler correctness in this setting, we extend the source language semantics with its own form of user-specified tag-based monitoring, and show that the compiler preserves that monitoring behavior.” (Abstract, p. 1.)

The central theorem is policy preservation: generated code preserves ordinary behavior and fail-stop behavior. The prototype verifies RTLgenT and DeadcodeT, implements but does not verify CSE, and designs but does not implement ConstProp. The paper says, “Our key verification result is policy preservation: Tagine correctly preserves fail-stop behavior as well as standard semantics in the target code.” (Section 1, p. 2.) The RTLgenT proof is about 1700 lines and DeadcodeT about 650 lines (Section 7, p. 13), while the system lacks memory and pointers.

## technique: attach source monitoring to high-level control points

Use when a security policy refers to source concepts such as variables, function calls, structured branches, and implicit-flow scope.

1. Define tags for values and a PC tag for control state; parameterize expression and statement semantics by a policy whose rules return `OK` with new tags or `Error` (Sections 2–3, pp. 3–4).
2. Put control points on assignments, binary operations, conditional split and join points, function calls, and function entry/exit. For an `if`, save the original PC tag at `IfSplit` and pass it to `IfJoin` (Section 3, p. 4).
3. Define fail-stop states separately from stuck states (Section 4, p. 5). Add a fail-stop state E(err) to the source transition system, with no transitions out of it; a rule that returns an error steps to E(err), and errors in sub-expressions propagate outward (Section 5.1, pp. 6–7).
4. For the example IFC policy, raise the PC tag when testing secret data, reject stores to public memory when the effective tag is secret, and restore the saved PC tag at the join (Sections 2–3, pp. 3–4).

Inference: In Verus, model tags and policy outcomes as enums or ghost values, use `spec fn` for rule semantics, and prove transition lemmas with `proof fn`. A Rust implementation would need explicit `Result` handling for fail-stop; this is a design inference, not a paper claim.

Evidence and limits: The paper notes that high-level `IfJoin` can reset the PC tag because structured control flow is visible, whereas machine-level monitoring cannot. Control-point adequacy is not guaranteed for policies invented later (Section 3, p. 4).

## technique: carry provenance with instruction tags

Use when several source constructs compile to the same machine opcode and the monitor must invoke the correct source rule.

1. Compile source control points to target instructions while preserving the source and target tag policies (Section 4, p. 5).
2. Attach an instruction tag (I-tag) recording the source construct that generated an instruction, such as `IT+` for an explicit addition or `ITdc` for an instruction whose provenance does not matter (Section 4, p. 5).
3. Define each opcode rule to dispatch on the I-tag. For `add`, `IT+` invokes the source `+` rule, while `ITdc` (“don’t care”) propagates the PC tag and the left operand’s tag (Section 4, p. 5).
4. Insert dummy instructions when a source control point has no natural single target instruction. For an `if`, a tagged `mov` saves the split PC tag in a register or stack slot until the join (Section 4, p. 5).

The paper states, “Instruction tags (I-tags) effectively let us design a customized instruction set that refines the hardware ISA by providing different variants of some opcodes based on the instruction’s semantic role in the policy being enforced.” (Section 4, p. 5.)

Inference: In Verus, represent provenance as a ghost or runtime enum carried through an instruction IR, and prove that each generated instruction’s tag selects the corresponding source rule. The hardware cache and processor are outside the Rust proof unless separately modeled.

Evidence: This is a construction used by the verified translation; the paper gives no independent policy corpus or percentage. It explicitly warns that saving/restoring PC tags adds instructions and register pressure.

## technique: prove compiler correctness with forward simulation and matching

Use for a source-to-CFG compiler where source structures expand into instruction intervals and policy state must remain synchronized.

1. Define HLL as a deterministic imperative language with expressions, assignments, sequencing, conditionals, loops, calls, and returns; define RTLT as a 3-address register-transfer language over explicit control-flow graphs (Sections 5.1–5.2, pp. 6–8).
2. Compile expressions and statements into CFG intervals. Define a hierarchical matching relation between source statements/expressions and target intervals, including register-bank, environment, call-stack, atom, and tag-error matching (Section 5.5, pp. 10–11).
3. Add side conditions to matching: intermediate code must not overwrite registers holding source variables or expression results, and split/join save registers must remain intact (Section 5.5, pp. 10–11).
4. Prove a forward simulation: each source step is matched by zero or more target steps, preserving policy outcomes and ordinary values. Determinism of the target semantics lifts this to refinement (Section 5.4, p. 10). The notion of preservation is refinement for safe programs: behaviors are equal up to results and errors, and source programs that go wrong are excluded, which lets the compiler, for example, remove an unused division by zero (Section 5.4, p. 10).
5. State semantic preservation as `safe(S) → C_I(P) ⇓ B → S_P ⇓ B`, so target behavior implies corresponding source behavior (Theorem 5.1, p. 10).

Inference: In Verus, express matching as a ghost relation over source and target states and prove each instruction compilation case with `proof fn`; loop and CFG invariants belong in `invariant` clauses on executable loops. Verus’s supported Rust subset and solver obligations differ from Coq’s inductive semantics.

Evidence: RTLgenT is verified with this theorem; the proof size is approximately 1700 lines (Section 7, p. 13). The theorem assumes source safety and deterministic target semantics; the paper states the theorem over its formal HLL and RTLT semantics only. Inference: PIPE hardware and the rule cache are therefore not covered by it, since the paper does not model them.

## technique: restrict dead-code elimination by rule properties

Use when optimizing tagged code while preserving not only values but also policy fail-stop and PC-state behavior.

1. Retain ordinary register liveness, but recognize that an unused result does not make an instruction semantically dead: its rule might fail-stop, change the PC tag, or mutate policy state (Section 6.1, p. 11).
2. Require `DFS(rule)`: the rule never returns an error, and `PCP(rule)` (“PC-purity”): whenever the rule succeeds, the output PC tag equals the input PC tag (Section 6.1, p. 12).
3. Add `DFS ∧ PCP` as an additional guard to the standard notion of deadness, in both the liveness analysis and the code transformation; remove an instruction only when its destination is dead and these rule properties hold (Section 6.1, p. 12).
4. Use conservative static approximations, since the conditions are not statically computable: a rule counts as DFS if it never returns a tag error, and as PCP if the output PC tag is always syntactically equal to the input PC tag (Section 6.1, p. 12).
5. Encode properties as `option Prop`: `Some(H:DFS(rule))` carries a proof usable by the optimizer, while `None` tells the compiler the property does not hold (Section 6.2, p. 12). The paper notes that having to case-analyze an HLL flag to build such a witness is a hint that the compiled rule is wrong, and that this caught several bugs in its initial compiler (Section 6.2, p. 12).

Inference: In Verus, make DFS and PCP spec predicates and require them as preconditions to an optimization lemma. An `Option` proof witness can be represented by a ghost enum or separate lemma assumptions; exact syntax depends on the Verus version.

Evidence: Theorem 6.1 states semantic preservation for DeadcodeT under `safe(S)`. The paper reports about 650 lines for its proof (Section 7, p. 13). The current implementation models only policy signatures, so flag settings are external axioms; the authors identify this as a caveat (Section 6.2, p. 12).

## technique: adapt common-subexpression elimination and constant propagation

Use when applying value-based optimizations to tagged operations whose rules may observe PC tags or fail-stop.

1. Use local value numbering (LVN), as in CompCert’s CSE (Section 6.3, p. 12). Standard LVN is sound when the repeated operation’s rule is weakly PC-insensitive, or when all instructions between the original and the repetition (including both) are PC-pure. Hence Tagine’s LVN clears the value numbers of all non-WPCI instructions upon encountering a non-PCP instruction (Section 6.3, p. 13).
2. Define weak PC insensitivity as PC purity plus independence of output value tags and failure from the input PC tag (Section 6.3, p. 13).
3. For constant folding, either retain the original tag rule via a parameterized I-tag carrying constant operand tags, or compute a concrete output tag only under PC-purity/insensitivity conditions (Section 6.4, p. 13). The paper lists three concrete-output cases: PCP with a constant output value tag; PCP with an output tag propagated from an input known at compile time; and strong PC insensitivity with known input value tags.
4. In the third case, if the rule evaluated at compile time would fail-stop, do not replace the operation, which preserves fail-stop behavior (Section 6.4, p. 13).

Inference: In Verus, optimization correctness should be a lemma relating pre/post IR semantics under explicit rule properties; solver proofs should keep those properties as local assumptions rather than treating them as executable checks.

Evidence and limits: CSE is implemented but not verified; ConstProp is designed but not implemented (Section 1, p. 2). Thus only RTLgenT and DeadcodeT provide completed formal evidence.

## techniques for the catalog

- high-level monitoring points: attach policy rules to source operations, branches, calls, and joins
- provenance I-tags: dispatch target opcode rules using source-construct metadata
- simulation matching: relate source states to target CFG intervals and prove forward simulation
- guarded dead-code removal: require non-fail-stop and PC-pure rules before deleting instructions
- tag-aware optimization: adapt CSE and constant folding to PC sensitivity and fail-stop behavior
