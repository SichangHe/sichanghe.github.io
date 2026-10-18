# Specifying verified x86 software from scratch
(authored by agents unless marked 🧑)
Tag: `carneiro2019verifiedx86`, [paper](http://arxiv.org/abs/1907.01283v1)

## purpose and result

Mario Carneiro presents the x86-64 part of Metamath Zero (MM0), a minimal framework for specifying and proving properties of ELF binaries down to machine-code semantics. The design deliberately keeps the trusted base small: specifications are written in a first-order theory equivalent to Peano Arithmetic (PA), the proof checker is custom and minimal, and only the behavior needed by a target program is modeled. The paper's goal is a reusable method for end-to-end verification, not a benchmark of many programs.

The abstract states: “We present a simple framework for specifying and proving facts about the input/output behavior of ELF binary files on the x86-64 architecture” (p. 1). It also says that “the specification says only what it needs to about the target executable” (p. 1). Inference: VL can borrow the paper's scope discipline—specify the exact machine behavior exercised by a verified Rust binary—while retaining Verus for source-level contracts.

## technique 1: minimize the trusted bootstrap

What it is. MM0 treats the verifier binary and the correctness theorem as the trusted bootstrap. A compiler need not be trusted because the output program is described by a checked specification. The project aims to verify the verifier itself, but the paper openly notes the circularity risk: a buggy prover could prove its own correctness. The mitigation is to reduce the bootstrap until it is inspectable. The paper writes: “The best we can do is to decrease the size of the bootstrap until it can be easily inspected” (Section 1, p. 1).

When to use it. Use a small trusted kernel when proof results are intended to cover the compiler, verifier, or runtime, and when a large host theorem prover would dominate the assurance argument. The approach is most useful for a product that wants a clearly enumerated trust base rather than an assumption that the entire toolchain is correct.

How to do it.

1. Define the axiom system as part of the specification, since MM0 is a logical framework (Section 1, p. 2). The first part of the specification file defines PA together with operations on lists, bitvectors, and sets, running to 311 lines (Section 1, p. 2).
2. Use a small reference checker while the self-hosted MM0 verifier is under construction. The Haskell implementation checks the files used in the report (Section 1, p. 2).
3. State the verifier's correctness theorem and the target binary semantics in the same framework (Section 1, p. 2: the trusted part is "the verifier binary, and the statement of the correctness theorem").
4. Check the proof; the paper's argument is that, assuming the trusted part is correct, "the proof is checked correctly and the program that is output is described in the specification, so we know that the output program is also a correct verifier" (Section 1, pp. 1-2). Steps 3-4 describe the plan; the paper says the verified MM0 verifier is still under construction.

Verus form. Inference: the analogous Verus design is to make the Verus verifier, Rust compiler, and proof erasure explicit trust assumptions, then minimize the application-specific trusted layer. A Verus `proof fn` can establish a source-level refinement theorem, but Verus cannot by itself prove the machine-code semantics of its own compiler. A product can instead define a small verified runtime model as `spec fn`s and record the compiler/ISA boundary as an external assumption. The MM0 approach does not carry over as a Verus construct; it is a trust-base architecture.

Evidence and limits. The paper reports a framework and specifications, not a completed self-verifying MM0 binary: “While the verified MM0 verifier is still under construction” (Section 1, p. 2). Thus the trust minimization is a design and partial implementation result. Inference: claims about complete end-to-end assurance would exceed the evidence in this paper.

## technique 2: specify only the ISA slice exercised by the program

What it is. The x86 model is intentionally incomplete. It starts from the Sail x86 specification, formalizes it in MM0, and also translates it into Lean because the MM0 bootstrap is not complete, giving three versions for comparison (Section 2, p. 2). It keeps only common user-mode integer instructions and the Linux behavior needed for simple IO. The author explains: “It is not a complete specification, but we do not need the complete semantics of x86 in order to specify our simple program” (Section 2, p. 2). This is a compositionality tradeoff: a universal lower layer cannot omit behavior that an unknown upper layer might use, whereas an endpoint proof can.

How to do it.

1. Choose the target executable and list its required instructions, memory behavior, and system calls.
2. Translate or write only those instruction semantics. The paper's x86-specific portions are about 1600 Sail lines, 766 Lean lines, and 1095 MM0 lines (Section 2, p. 2).
3. Define configurations as tuples `(RIP, regs, flags, mem)`, where `RIP` is a 64-bit instruction pointer, `regs` maps the 16 general-purpose registers, `flags` tracks four bits, and `mem` maps addresses to protection bits and bytes (Section 2, p. 3).
4. Define a step relation `step ⊆ Config × Config`. Loads read only from readable bytes and writes go only to writable bytes (Section 2, p. 3). States that would fault, or that invoke an unspecified instruction, have no successor (Section 3, p. 4).
5. Add nondeterminism where the Intel manual leaves parts unspecified, or where one wishes to abstract from specified behavior, particularly when it depends on state outside the user-mode model (Section 3, p. 4).

Verus form. Inference: represent the machine configuration as a Verus struct or ghost tuple and define `spec fn step(old: Config, new: Config) -> bool`. Prove each Rust operation's postcondition implies a corresponding `step` relation using `requires` and `ensures`. Model protection checks as preconditions on memory access. Verus `old(...)` in postconditions can refer to the pre-state; the paper's relation is mathematical and does not require an executable simulator. Unspecified instructions should produce an explicit precondition or an `Option`-like transition relation rather than an unproved execution path.

Evidence and limits. The paper gives one complete MM0 theorem for `mul`: `execXASTMul` relates decoded syntax to register reads, multiplication, and writes to `RAX`/`RDX` (Section 2, p. 3). This demonstrates the representation but does not establish coverage of every x86 instruction. The model gives no successor to unsupported instructions and faulting states (Section 3, p. 4). Inference: a proof about the binary therefore only covers executions that avoid them.

## technique 3: replace pattern matching and types with explicit predicates

What it is. MM0 has first-order logic but no inductive types or pattern matching. The paper avoids boilerplate and unchecked duplication by declaring a definition signature and proving its specification later. The declaration `def execXAST (k ast k2: nat): wff;` introduces a relation; subsequent theorems constrain it. The author says: “This command declares the existence of a definition, but doesn’t say what it is” (Section 2, p. 3).

Types are recovered as predicates. The theorem `execXASTT` states that a valid configuration and execution imply that the syntax is an `XAST` and the resulting state is a configuration. All variables range over natural numbers because PA is untyped (Section 2, p. 3).

How to do it.

1. Encode data by natural-number pairing and list/bitvector constructors. MM0 uses `<>` for pairing and `:` for cons (Section 2, p. 3).
2. Declare a relation signature without giving an unchecked body.
3. State theorems that constrain every allowed use of the relation, including semantic equations such as `execXASTMul`.
4. Add type predicates (`Config`, `XAST`) and prove preservation theorems such as `execXASTT`.
5. Per the paper, a proof of the specification must supply a definition that satisfies all subsequent theorems; the paper compares this to a Coq Module (Section 2, p. 3).

Verus form. Inference: Verus already has typed Rust data, so the MM0 encoding is unnecessary for ordinary application code. The transferable idea is specification-first interfaces: declare a `spec fn` relation, then prove lemmas that characterize each constructor or instruction case. Use Rust enums and pattern matching for executable code, and `ensures` for type/shape preservation. Do not mark the executable function `external_body` merely to obtain this effect; the paper's relation still has to satisfy its theorems.

Evidence and assumptions. The Haskell reference implementation "has been used to check the files in this report" (Section 1, p. 2), but the verified MM0 checker itself was incomplete at publication. The use of an untyped PA model shifts trust to explicit type predicates and their preservation lemmas. Inference: an agent-written Verus proof has a similar failure mode if a ghost predicate is too weak; type correctness alone does not show functional correctness.

## technique 4: model IO as streams and simplify ELF

What it is. The paper extends the machine state with `KernelState = List u8 × List u8 × Config`; the lists model stdin waiting input and stdout output. These are unbounded mathematical streams, not hardware memory. Only the Linux `syscall` instruction is supported, with `mmap`, `read`, and `write`. The ELF model has one program header, no section headers, nondeterministic initial memory except for a stack with command-line arguments and loaded code (Section 3, p. 4). The paper states: “Nevertheless, they allow us to turn an x86 program into an abstract function on byte streams” (Section 3, p. 4).

How to do it.

1. Extend `Config` to `KernelState` with input and output byte lists.
2. Support only the `syscall` instruction, with `mmap()`, `read()`, and `write()` available to the program (Section 3, p. 4). Inference: other calls then have no transition.
3. Specify the single ELF program header and code loading; omit linking and section metadata.
4. Inference: state the endpoint theorem as a relation between input and output streams; the paper says only that the model turns a program into an abstract function on byte streams.

Verus form. Inference: use `Seq<u8>` ghost values for streams and a state-machine proof for each syscall transition. Executable Rust can read and write through an abstraction whose `ensures` clauses relate buffers to ghost stream prefixes. A Verus state machine can preserve the postcondition that output is the program transformation of input across calls; the Linux kernel and ELF loader remain trusted unless separately modeled.

Evidence and limits. The ELF and IO layer adds 237 lines of MM0 code (Section 3, p. 4). This is a size measurement of the presented model, not a completeness claim about Linux. The assumptions exclude arbitrary linking, all section semantics, and unsupported syscalls.

## what is proved, measured, and trusted

The paper specifies instruction execution, memory permissions, selected Linux IO, and a simplified ELF format, and demonstrates theorem statements checked by the Haskell MM0 implementation. It measures specification size: 311 PA foundation lines, 1600 Sail/766 Lean/1095 MM0 x86-specific lines, and 237 ELF/IO lines (Sections 1–3, pp. 2–4). It does not report a completed verified MM0 binary, runtime performance, or a count of verified application properties.

The trusted base is explicitly the verifier binary plus the correctness theorem, with the reference checker and incomplete self-verification as engineering scaffolding. Inference: the main threat to agent-written verified Rust is an overly weak endpoint model or an omitted machine/environment assumption; a small trusted kernel reduces the review burden but cannot repair a wrong specification.

## what VL should not redo

VL should not reproduce the PA encoding, MM0 parser design, or x86 instruction formalization as a new contribution. Those are available as the MM0 project artifact and this paper's documented method. A useful VL adaptation would measure which Rust/Verus proofs need machine-level models and whether an automatically generated ISA slice remains sound across compiler upgrades.

## techniques for the catalog

- minimal trusted bootstrap: place the verifier binary and correctness theorem in a small, inspectable trust base
- endpoint ISA slicing: specify only the instructions, memory rules, and syscalls exercised by a target binary
- predicate-based weak-logic specification: replace missing types and pattern matching with explicit relations and preservation theorems
- stream-and-ELF abstraction: model IO as mathematical byte streams and simplify ELF to the headers needed by the endpoint

Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Lean is a full dependent type theory with support for inductive types and pattern matching."): read the whole 4-page paper text; checked every quotation, the line counts (311, 1600/766/1095, 237), the configuration and KernelState definitions, the mul and execXAST examples, and section and page references. Changed: removed the unsupported "proof-checking rules" claim in technique 1 step 1; added the paper's own wording for the trust argument; fixed the unspecified-versus-nondeterministic mix-up in technique 2 (unspecified Intel behavior is nondeterministic; faults and unspecified instructions have no successor); fixed page ranges for execXASTT (p. 3 only); marked the stream-theorem step and the step on other syscalls having no transition as inference. Not checked: the linked MM0 repository, Sail and Lean sources, the cited external works, and all Verus-form paragraphs (these are the study's own inference, not claims of the paper).
