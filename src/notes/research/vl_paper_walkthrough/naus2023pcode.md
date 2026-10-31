# A Formal Semantics for P-Code
(authored by agents unless marked 🧑)
Tag: `naus2023pcode`, [paper](https://doi.org/10.1007/978-3-031-25803-9_7)

## purpose and result

The paper addresses high P-Code, Ghidra's intermediate representation for decompiled binaries. Its starting facts are that P-Code has limited documentation and no formal semantics, while analyses built on it therefore lack a defined meaning. The authors state: “P-Code lacks a formal semantics, and its documentation is limited.” (Abstract, p. 111). Their result is an extended language, an executable big-step operational semantics, and a Haskell interpreter. They warn that the original language cannot receive an executable semantics without adding information: “As-is, P-Code cannot be given an executable semantics.” (Introduction, p. 112).

The workflow is evidence-driven. They read the P-Code documentation, compile C programs to binaries, decompile those binaries with Ghidra, and compare high P-Code and decompiled C against the known source. They report: “These experiments consist of compiling several C programs to binary, decompiling them using Ghidra, and comparing the high P-Code and decompiled C code to the original source code.” (Introduction, p. 112). This is a reusable technique for any undocumented IR whose producer is available: use documentation as a hypothesis, then test ambiguous instructions against programs with known behavior.

## technique 1: derive executable semantics from producer experiments

What it is. Construct a formal language model by combining documentation with observations of generated IR. Inference: because the target is executable semantics, every state transition should produce a determinate result or explicitly model nondeterminism, as the paper's INDIRECT rules do (Section 5, p. 123).

When to use it. Use this when an IR is used for verification or analysis but its manual is incomplete, inconsistent, or semantically wrong. The paper's motivation is direct: “This limits the usability of P-Code for formal analysis, since there is no way to know if the analysis that is being performed is correct with respect to the language semantics.” (Introduction, p. 112).

How to do it.

1. Fix a producer version and documentation snapshot. The authors use Ghidra 10.1.4 and its P-Code documentation last updated September 5, 2019 (Introduction, p. 112).
2. Enumerate instructions whose behavior is unclear or whose output disagrees with the documentation. The paper's design choices cover conditional branches, phi-nodes, varnodes, calls and returns, fall-through, user-defined instructions, and indirect instructions (Section 3, pp. 114–116).
3. Compile small C programs and retain the source as an oracle. Decompile with the producer and compare source, P-Code, and generated C (Introduction, p. 112).
4. Record the producer API's more reliable observations. For conditional branches, the control-flow API returned correct outgoing addresses even when emitted P-Code did not (Section 3, p. 114).
5. Turn each observation into a language design choice, syntax rule, or semantic rule. The resulting program model is a mapping from addresses to blocks, and every block is non-empty and ends in a terminator (Section 4, pp. 116–117).
6. Implement the rules and run an interpreter. The paper's interpreter is in Haskell and consumes output from a companion Java dumping script (Sections 1 and 5.1, pp. 112, 123–124).

Verus form. Inference: represent the extended IR as Rust enums and immutable specification values; use `spec fn` definitions for varnode evaluation and state updates, and `proof fn` lemmas for preservation of state invariants. Executable interpretation can be ordinary Rust functions whose contracts state that one step follows the corresponding semantic relation. Use `requires`, `ensures`, and loop `invariant` clauses for an interpreter loop. Inference: this does not carry over as a direct translation of the paper's Haskell big-step rules; the Rust implementation must choose data representations and prove that executable transitions refine the mathematical semantics.

Evidence. The paper validates executability by building the interpreter, not by proving semantic soundness against a separately formalized machine. It says: “Since there is no interpreter for high P-Code available, we are only able to validate our semantics by writing an interpreter for high P-Code to show that our semantics are executable.” (Introduction, p. 112). No benchmark denominator, runtime table, or accuracy percentage is reported. The evidence is therefore existence of a working implementation and agreement with the tested producer observations, not a quantified coverage claim.

Limits and assumptions. Their experiments support four explicit assumptions: local variables do not overlap; variables are local rather than global; constants encode direct calls and branches; and terminators occur only at block ends (Section 5, p. 119). The authors say local-variable separation was checked by decompiling large binaries, but give no number of binaries or variables. User-defined instructions are out of scope because “the semantics are user-provided” (Section 3, p. 116). Harvard-architecture support is described as straightforward but omitted (Section 5, p. 123).

## technique 2: repair missing control-flow information

What it is. Make control-flow choices explicit when generated P-Code is not executable. The paper replaces conditional branches with a terminator carrying both true and false destinations, obtained from Ghidra's control-flow API (Sections 3–4, pp. 114, 118). It removes implicit fall-through and requires each block to end in a branch or return because emitted fall-through destinations are inconsistent (Section 3, p. 116).

How to do it.

1. Query true and false destinations through the control-flow API rather than trusting the P-Code instruction (Section 3, p. 114).
2. Encode both destinations in the conditional-branch syntax, and put the instruction at block end (Section 4, p. 118).
3. Treat a condition equal to decimal 1 as true and every other value as false (Section 5, p. 120).
4. Update the previous and current block registers on branches so phi-node selection can inspect the predecessor (Section 5, p. 120).
5. Remove fall-through semantics; require an explicit terminator for every block (Sections 3–4, pp. 116, 117).

Verus form. Inference: a Rust `enum Terminator` can carry `Branch { target }`, `CondBranch { cond, when_true, when_false }`, and `Return`; a `Block` can require a non-empty instruction vector ending in a terminator through a constructor contract. A verified step function can ensure the next block is one of the encoded destinations. Inference: proving that Ghidra's API destination is correct requires a trusted API model or a separate proof about the binary translator, which the paper does not provide.

Evidence and limits. The authors identify three observed conditional-branch cases: correct; incorrectly jumping to fall-through on true; or needing a different non-fall-through false target (Section 3, p. 114). They report that Ghidra developers acknowledged the issues, while considering preservation of low-to-high destinations more important than instruction correctness (Section 6.4, pp. 125–126). The approach assumes the API's addresses are correct and does not establish that assumption formally.

## technique 3: make SSA phi-nodes and calls explicit

Phi-nodes. P-Code's `MULTIEQUAL` lists alternatives without predecessor addresses. The authors experimentally establish that alternative order follows inbound-edge order in Ghidra's control-flow API (Section 3, pp. 114–115), then extend the syntax so each alternative includes its guarding predecessor address (Section 4, p. 118). Evaluation chooses the alternative whose address equals the previous-block register (Section 5, p. 123).

Calls and returns. The paper rejects the manual's claim that CALL is equivalent to BRANCH. Its semantics evaluates the target and arguments, places arguments in registers according to a calling convention, executes the callee with a fresh local-variable map, discards callee locals, cleans registers, and retrieves the return value (Section 5, pp. 121–122). The paper gives an AMD64-ABI rule allowing at most six arguments (Section 5, p. 122).

Verus form. Inference: model a phi-node as a finite map from predecessor addresses to values and specify that lookup uses the stored predecessor; prove lookup succeeds for well-formed blocks. Model a call frame as a struct containing memory, registers, and locals; a `requires` clause can state the calling-convention arity, while `ensures` states that caller-visible registers and the return register are restored as specified. Inference: ABI correctness and external-call behavior remain assumptions unless separately modeled and proved.

## what is proved, measured, and trusted

The paper defines syntax and big-step rules and demonstrates that those rules can execute through a Haskell interpreter. It does not prove a metatheorem such as determinism, preservation, or correspondence with machine semantics. It reports no numeric evaluation: there is no denominator, benchmark count, runtime, or accuracy percentage for the interpreter. The interpreter deliberately simplifies one hard case: “In our interpreter, we have chosen to regard INDIRECT instructions as deterministic, assuming that their value has not been changed by the indicated side-effect.” (Section 5.1, p. 124).

The paper also states that realistic programs make INDIRECT produce many possible outcomes, so execution may propagate unknown values rather than meaningful results (Section 5.1, p. 124). Inference: trusted components therefore include Ghidra's disassembly, control-flow API, calling-convention model, the assumptions about variable layout, and the Haskell runtime. Inference: a Verus port would additionally trust the modeled binary format, parser, Rust compiler, Verus verifier, and solver unless those layers receive independent proofs.

## techniques for the catalog

- producer-guided semantics: compare generated IR with known-source programs, then turn observations into executable syntax and transition rules
- explicit control flow: obtain reliable branch destinations from a producer API and encode both successors instead of trusting malformed fall-through
- predecessor-keyed phi: attach predecessor addresses to phi alternatives and select using tracked previous-block state
- call-frame semantics: model ABI argument registers, fresh locals, cleanup, and return values explicitly in the transition system
- executable validation: implement the semantics as an interpreter and report its assumptions and nondeterministic cases
