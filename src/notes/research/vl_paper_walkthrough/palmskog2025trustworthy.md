# Trustworthy Verification of RISC-V Binaries Using Symbolic Execution in HolBA
(authored by agents unless marked 🧑)
Tag: `palmskog2025trustworthy`, [paper](http://arxiv.org/abs/2503.14135v1)

## scope and result

Palmskog et al. describe a HOL4 and HolBA workflow that verifies RISC-V machine binaries directly. The binary is lifted to HolBA's BIR intermediate language with a proof-producing theorem, binary contracts are written against the HOL4 L3 RISC-V model, and forward symbolic execution produces a theorem used to discharge BIR and then RISC-V contracts. The authors validate the workflow on an 847-instruction ChaCha20 binary and two handwritten S3K separation-kernel routines totaling 81 instructions. This is a complementary assurance layer below source-level Verus proofs: it addresses the actual ISA binary, but its contracts and machine model remain trusted inputs.

The abstract says: “The toolchain automates proofs of binary contracts by forward symbolic execution of programs in HolBA’s intermediate language, BIR.” (Abstract, p. 1). It also says: “We validated our toolchain by verifying correctness of RISC-V binaries with (1) an implementation of the ChaCha20 stream cipher and (2) hand-written assembly for context switching in an operating system kernel.” (Abstract, p. 1).

## technique 1: lift disassembly to a proof-linked intermediate language

what it is. HolBA disassembles RV64G instructions, translates selected address ranges to BIR, and emits a HOL4 theorem that the BIR program simulates the RISC-V program. BIR gives one analysis language while preserving the link to machine code. The paper says: “Lifting also produces a HOL4 theorem expressing, roughly, that the BIR program simulates the corresponding RISC-V program.” (Section 3, p. 5).

when to use it. Use lifting when the target property concerns binary behavior, including compiler output or handwritten assembly. It avoids requiring source code and can support ISA-specific behavior. The workflow is incomplete: failed automation does not imply a false specification (Section 3, p. 4).

how to do it. (1) Obtain an RV64G binary; source compilation is optional. (2) Disassemble it with `gnu-objdump`. (3) Set the initial instruction address and address after the final instruction. (4) Parse the selected disassembly into BIR blocks, statements, and jumps. (5) retain the generated HOL4 lifting theorem for later backlifting. These steps are listed as workflow steps 0–2 and explained in Section 3, pp. 4–5. The running example maps `addi a0,a0,1` to a BIR assignment and jump (Figure 3, p. 5).

Verus form. Inference: Verus proves source-level Rust contracts and does not itself provide this binary lifting theorem. A VL pipeline could use Verus for the Rust algorithm and HolBA-like binary verification for the compiled artifact, with a separate refinement or compilation-correctness argument connecting them. Inference: treating the binary contract as an external post-build check avoids claiming that a source proof automatically covers compiler output.

evidence and limits. HolBA's transpiler is proof-producing and based on HOL4 ISA specifications. The paper says: “This is achieved using a proof-producing transpiler built on HOL4 ISA specifications that generates (bi)simulation theorems at the transition system level to ensure that the binary program’s behavior is faithfully mirrored in BIR.” (Section 4.1, p. 6). Inference: correctness depends on the ISA model and the selected address boundaries; omitted code, device effects, or an incorrect boundary are outside the theorem.

## technique 2: express binary contracts at the ISA state and translate them to BIR

what it is. A RISC-V contract is a pair of precondition and postcondition predicates over the L3 machine state. The same conditions are manually translated into BIR expressions. HOL4 proves their equivalence, allowing symbolic execution to reason in BIR and then backlift the result to a RISC-V contract theorem.

when to use it. Use this when the desired property is a functional relation between machine registers/memory before and after a binary fragment. It suits multiple endpoints and unstructured control flow, where ordinary source-level function contracts are unavailable.

how to do it. (1) Define binary boundaries and an L3 precondition over registers and memory. (2) Define the L3 postcondition. (3) Manually define equivalent BIR pre/post expressions. (4) Prove the RISC-V/BIR specification equivalence in HOL4. (5) Use the BIR expressions in symbolic execution. (6) After the BIR contract is proved, apply the lifting theorem to obtain the RISC-V contract theorem. Workflow steps 3, 4, 6, and 7 and Figure 4 show this procedure (Sections 3 and 4, pp. 4–6).

Verus form. Inference: write the Rust contract as `requires` and `ensures` over Rust values, then separately define a binary-level ABI contract for registers and memory. Verus's `spec fn` and `proof fn` can express the source relation, but translating it to machine state and proving compiler correspondence requires a separate verified toolchain or binary theorem. Inference: do not treat a Rust `ensures` clause as evidence about assembly without that linking proof.

evidence and limits. The paper's `incr` example proves that register x10 after execution equals the input plus one (Figure 4, p. 6). Contract expression is partly manual: “As with most ITP-based tools, some parts in our toolchain are fully automated (albeit incomplete), while others require manual interaction with HOL4, e.g., to express specifications.” (Section 1, p. 2).

## technique 3: proof-producing forward symbolic execution

what it is. The executor represents a symbolic state by a path condition and a variable-to-expression map. It applies formally verified inference rules to instructions, sequential composition, case analysis, infeasible-state pruning, symbol renaming, abbreviations, and path-condition strengthening or weakening. An SML procedure selects and composes rules, while HOL4 proves the resulting theorem.

when to use it. Use forward symbolic execution when constants and precondition constraints can prune paths and when binary control flow is unstructured. The authors contrast it with weakest-precondition generation and emphasize context-sensitive memory and indirect-jump handling.

how to do it. (1) Initialize a symbolic state with the BIR precondition. (2) Execute each BIR instruction using verified inference rules. (3) Propagate path conditions and symbolic expressions through sequential composition and branches. (4) Prune infeasible states. (5) Simplify expressions and introduce abbreviations as selected by heuristics. (6) Generate SMT-LIB conditions for path infeasibility, simplification, and postcondition entailment. (7) Use Z3 to discharge those conditions. (8) Compose the resulting symbolic analysis theorem into a BIR contract theorem, then backlift it to RISC-V. Section 4.2, pp. 7–8, gives these mechanics. The paper says: “This process uses the BIR precondition as a path condition and produces a general symbolic execution theorem.” (Section 3, p. 6).

Verus form. Inference: this is analogous to proving loop and branch invariants with Verus, but Verus executes symbolic formulas over Rust abstractions rather than BIR machine states. A VL binary layer could reuse the path-condition idea for assembly contracts; it would need explicit register/memory models and proof lemmas for every instruction or rely on an existing verified ISA library.

evidence and limits. The executor uses an external SMT solver for generated conditions, so Z3 is in the trusted proof-producing path only through HOL4-checked theorem applications and solver-result integration. Symbolic execution is incomplete and can fail even for true contracts (Section 3, p. 4). Inference: path explosion and symbolic-memory growth are practical limits.

## technique 4: verify cryptographic and kernel binaries through high-level functional contracts

what it is. For ChaCha20, the authors define a high-level quarter-round function over four 32-bit words, compose column and diagonal rounds, and connect the byte-encryption loop specification to the binary. For S3K, they specify register-to-memory and memory-to-register effects of `trap_entry` and `trap_exit` handwritten assembly.

when to use it. Use a functional contract for a cryptographic or systems routine when proving the algorithmic relation matters more than source structure. The binary proof can cover hand-written assembly that a source compiler proof would not.

how to do it. (1) Choose the binary fragment and endpoints. (2) Define a mathematical routine specification, such as ChaCha quarter-round and round composition. (3) State register/memory pre/postconditions in L3. (4) Translate them to BIR. (5) Symbolically execute and prove the contract. For S3K, validate the specifications with the kernel author before translating them to BIR. Section 5, pp. 8–10, describes both case studies.

Verus form. Inference: Verus can prove a Rust implementation of the quarter-round with `spec fn` models, `requires`, `ensures`, and `proof fn` lemmas, but it cannot by itself establish that an arbitrary emitted binary implements that model. Inference: use the binary contract as a post-compilation check and keep cryptographic non-functional properties separate; this paper explicitly does so.

evidence and limits. ChaCha20 was compiled with gcc `-O1`, yielding 847 RISC-V instructions; lifting and symbolic execution took a few minutes. The paper states: “we did not prove any non-functional (security) properties of the ChaCha20 binary.” (Section 5.1, p. 8). S3K supplied 81 instructions, and each routine took less than a minute to lift and symbolically execute (Section 5.2, p. 9). The S3K author manually validated specifications, so the behavioral contract itself is a trusted human input.

## scalability evidence

Table 1 evaluates seven programs. AES unoptimized has 637 instructions and takes 67.65 seconds; AES `-O1` has 264 and takes 5.52 seconds; motor has 120 and 3.71 seconds; swap has 8 and 0.19 seconds; isqrt has 15 and 0.11 seconds; mod2 has 4 and 0.03 seconds; and incr has 4 and 0.03 seconds (Table 1, p. 10). These are symbolic-execution running times for the listed binaries, not proof-completion percentages. The paper notes that instruction count is close to but not identical to symbolically executed instructions because `ret` is often skipped. It attributes cost to instruction count and “store complexity,” where symbolic memory may replicate large expressions (Section 6, p. 10).

## what is proved, trusted, and threatening to VL

Proved: lifting/bisimulation theorems, BIR contracts, and backlifted RISC-V contract theorems for the stated fragments. Measured: symbolic-execution time for seven programs and successful case studies for ChaCha20 and two S3K routines. Trusted: HOL4 kernel, L3 ISA model, BIR semantics, binary boundaries, manually written contracts and BIR translations, and the external SMT solver integration. Inference: product risk for agent-written verified Rust is a compiler and binary gap: a Verus proof can be valid while the deployed binary differs through compiler behavior, inline assembly, or build configuration. Inference: a HolBA-style post-build contract check can reduce that threat but requires machine-state specifications that are expensive to author.

The paper already provides binary lifting, proof-producing symbolic execution, Hoare-style contracts for unstructured code, and direct RISC-V case studies. VL should not claim source-level Verus as a substitute for this binary layer. Inference: the useful integration experiment is to compile a small Verus-verified Rust routine to RV64G, generate an ABI-level contract, and compare proof effort and failures between source proof alone and source plus binary contract.

## techniques for the catalog

- proof-linked binary lifting — translate bounded RISC-V disassembly to BIR with HOL4 bisimulation theorems
- ISA/BIR contract translation — state L3 machine pre/postconditions, translate them to BIR, and prove equivalence
- proof-producing forward symbolic execution — propagate symbolic states, prune paths, and use HOL4 plus SMT conditions to produce contract theorems
- backlifted binary assurance — transfer proved BIR contracts back to RISC-V machine-code theorems
- high-level specs for low-level routines — verify cryptographic and kernel assembly by connecting mathematical specifications to register and memory effects

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
