# Forward Symbolic Execution for Trustworthy Automation of Binary Code Verification
(authored by agents unless marked 🧑)
Tag: `lindner2023symbolic`, [paper](https://doi.org/10.1007/978-3-032-15700-3_8)

## what the paper proves
The paper gives a forward symbolic-execution theory for unstructured programs, instantiates it for BIR, and proves soundness in HOL4. The central object is a progress structure, a summary from one symbolic state to a set of target states over a set of labels. The paper states: “We present a theory of forward symbolic execution for unstructured programs suitable for use in theorem provers that enables automated verification of both functional and non-functional program properties.” (abstract, p. 1)

A symbolic state is a concrete program counter, symbolic store, and path condition. An interpretation maps symbols to concrete values. The simulation theorem says every concrete transition from a matched state has a matching symbolic successor: “If s ▷ s and s → s′ , then exists s′ ∈ symsem(s) such that s′ ▷ s′ .” (Theorem 1, p. 7). Inference: this is the foundational trust claim, since the paper's rules are proven correct for any symbolic and concrete semantics that satisfies Theorem 1 (Sec. 4, p. 7).

## technique 1: progress structures and sound composition
What it is. A progress structure `s ⇝L Π` records that every concrete state matching source `s` reaches a state matching one target in `Π`, after a positive number of transitions whose source program counters lie in `L`. Fresh target symbols are allowed through a loose match and therefore support sound overapproximation.

When to use it. Use it to summarize loops, branches, or binary fragments and then reuse those summaries. The paper warns that iterating raw symbolic semantics creates “a large execution tree, which is infeasible to directly compute.” (Sec. 4, p. 7)

How to do it.
1. Define concrete and symbolic semantics for each instruction; for a conditional jump, evaluate the guard in the symbolic store and create one successor per feasible target (Sec. 3, pp. 6–7)
2. Start with `symbstep` for one instruction, yielding a sound one-step progress structure (Sec. 4.2, p. 10)
3. Use `case` to split a target by an additional path-condition conjunct; use `infeasible` only when the path condition is unsatisfiable (Sec. 4.2, p. 10)
4. Use `rename` or `freesymb_rename` to avoid symbol collisions; use `subst` to instantiate a previously proved fragment with a bound symbol replaced by an expression (Sec. 4.2, p. 10)
5. Use `simplify` when an expression is equivalent under the path condition. It can replace a large expression with a fresh symbol while adding an equality constraint (Sec. 4.2, pp. 10–11)
6. Use `consequence` to strengthen a source path condition or weaken a target condition; use `transfer` for sound target strengthening from a source condition (Sec. 4.2, p. 11)
7. Compose summaries with `sequence`, ensuring that the second summary has no free symbol bound by the first (Sec. 4.2, pp. 11–12)

The running modular-exponentiation example first splits the loop branch, summarizes both paths, simplifies memory stores, introduces a fresh symbol for the loop result, removes branch conjuncts with `consequence`, and merges the paths. The resulting loop summary abstracts irrelevant values while preserving control flow. The paper says: “Overapproximating the behavior of the loop reduces the complexity of the analysis.” (Sec. 4.3, p. 12)

Verus form (Inference: the paper uses HOL4, not Verus). Represent executable Rust state separately from a ghost symbolic state. A `spec fn` can describe expression evaluation and a `proof fn` can establish each instruction’s simulation lemma. Use `requires` and `ensures` on proof functions and executable methods, and `invariant` clauses on loops. Encode a progress summary as a predicate over source and target states; do not write `invariant(...)` as a call. Fresh-symbol loose matching is an abstract ghost relation, not runtime data. Verus can discharge arithmetic and path-condition consequences with its SMT backend, but the paper’s HOL4 inductive relation and BIR semantics must be re-established in Verus.

Evidence. The authors formalized all rules and BIR semantics in HOL4: “The definitions and proofs of the symbolic execution rules consist of around 16,000 lines of HOL4 (SML) code and took 8 person months to develop.” (Sec. 5.1, p. 14). Their RISC-V executor was tested on ten programs, one to 310 instructions; AES at 130 instructions took 6.84 seconds and unoptimized AES at 310 instructions took 71.38 seconds on an Intel Core i5-9600K with 32 GB RAM (Table 1, p. 15). The paper reports a single time per program and no variance.

## technique 2: binary contract workflow
What it is. HolBA-SE lifts an RV64G binary to BIR, symbolically executes it, proves a BIR Hoare contract, and backlifts that contract to RISC-V. The workflow is explicit: “0. Compilation … 1. Disassembly … 2. Lifting … 3. RISC-V specification … 4. BIR specification … 5. Symbolic execution … 6. Symbolic transfer … 7. Backlifting.” (Sec. 6, p. 16)

How to do it. Compile if source exists; disassemble; lift selected addresses to BIR with a HOL4 lifting theorem; write RISC-V pre/postconditions; manually translate them to BIR; run the executor to obtain a progress theorem; apply the contract theorem; compose with the lifting theorem to obtain the RISC-V contract (Sec. 6.2, pp. 17–18). The increment example specifies that register `a0` after the binary equals its initial value plus one (Fig. 7, p. 17).

Verus form (Inference). A Rust wrapper can expose executable functions and `requires`/`ensures` contracts, while a ghost model relates machine registers and memory to Rust values. A verified lifting theorem would be a proof function connecting the binary model to the Rust abstraction. Manual specification translation remains required; Verus does not infer the intended contract.

Evidence. ChaCha20 byte-encryption verification took around four minutes; two S3K trap routines totaling 81 instructions took around seven minutes (Sec. 6.3, pp. 18–19). The workflow is incomplete: “verification steps can fail without specifications being false.” (Sec. 6, p. 16)

## technique 3: interval timing and side-channel bounds
What it is. Add a cycle counter to BIR state. On path merges, represent it as an interval with bounds in the path condition; this yields best-case and worst-case execution-time bounds.

How to do it. Increment the counter by each instruction’s modeled cost; merge paths into `[αc+lo, αc+hi]`; carry interval constraints through `sequence` and loop-summary instantiation; read the final bounds as BCET and WCET (Sec. 7.1, p. 19). The paper says: “Interestingly, equality of lower and upper bounds proves the absence of timing side channels.” (Sec. 7.1, p. 19)

Verus form (Inference). Track a ghost integer `cycles` and loop invariant bounds such as `lo <= cycles <= hi`; prove each instruction’s cost lemma and expose a final `ensures` interval. Constant-time claims require proving bounds independent of secret inputs, plus a trusted timing model.

Evidence. Table 2 reports HolBA-SE BCET/WCET in clock cycles for nine programs, with 1000 random hardware tests per program on STM32F051R8T6. For `aes`, HolBA-SE reports 3761/3761 cycles; for `modexp`, 43704/197560. The table caption says “† indicates unsound result and ∗ indicates constant time” (Table 2, p. 20); `†` appears in the aiT column for ldldbr8, aes and motor_set o3, and `*` for HolBA-SE on ldldbr8 and aes. The paper attributes the simple timing model to the Cortex-M0 having no caches and a three-stage pipeline, with cycle costs taken from the ARM reference manual (Sec. 7, p. 19). Inference: HolBA-SE bounds are only as good as that timing model, which is trusted.

## trusted, measured, and limits
Inference: the trusted components include the HOL4 kernel, the BIR and ISA (L3) semantics, and the restricted Z3 discharge; the paper does not list its TCB in one place. Z3 increases the TCB; the authors state: “This approach increases the TCB, but we believe the trade-off is attractive since the performance boost is considerable and the scope of discharged conditions is restricted.” (Sec. 5.3, p. 15). Measurements are case studies, not coverage guarantees. Indirect-jump target resolution must know all feasible targets, and expression/store complexity can still cause blow-up.

Inference: threat to a product that generates Verus Rust is moderate. The reusable ideas are summary-based symbolic execution, controlled fresh-symbol abstraction, and contract lifting. The main engineering risk is semantic-model construction: binary memory, aliasing, ISA behavior, and timing assumptions need explicit ghost models and proofs before Verus contracts mean what the product claims.

## techniques for the catalog
- progress structures: summarize sound forward executions with reusable roots, leaves, and label scopes
- rule-based abstraction: combine case splitting, infeasibility pruning, substitution, simplification, consequence, transfer, and sequence
- binary contract lifting: prove BIR contracts and transfer them back to the source ISA through a lifting theorem
- interval timing: merge symbolic cycle counts into sound BCET/WCET intervals for timing verification
