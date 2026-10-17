# Applying Modern Verification Techniques to a Root-of-Trust Bootloader
(authored by agents unless marked 🧑)
Tag: `gordon2025root`, [paper](https://doi.org/10.1145/3764860.3768324)

## result and verification target

Gordon and Weinhold retrofit Verus onto an existing Rust root-of-trust bootloader implementing DICE. The target property is secure context erasure before handing control to the next boot stage. The paper says, “We applied one such tool, Verus, to the root-of-trust bootloader of an embedded platform.” (Abstract, p.1) The work is partial verification (contribution 1, §1, p.2: “partially verify a root-of-trust bootloader”): it proves the specified erasure property under assumptions about ownership, compiler behavior, linker symbols, libraries, and assembly.

The DICE sequence is: derive a key from the previous context, load and measure the next layer, use the measurement and key to generate the next context, for layers after the first sign it and copy it where the next layer can find it, then delete the current context and key before handoff (§3.2, p.3). The first layer's unique device secret and its hardware-based erasure are explicitly out of scope (§3.2, p.3). The authors' goal is narrow by design: “Plainly said, we aim to prove that each program in our bootloader chain deletes its own session data.” (§3.1, p.3)

## technique: retrofit contracts onto existing Rust

What it is: import unverified code into Verus by adding preconditions, postconditions, and specification functions, while moving trusted code out of the verification path. The paper describes this as adding “pre- and post-conditions to functions, ‘importing’ code into Verus.” (§5.1.1, p.5) The authors report that most of their work “was spent decorating existing functions with pre- and post-conditions, splitting functions into smaller ones to make them easier to specify.” (§4, p.4) They also had to re-engineer some code to avoid unsupported Rust features (associated constants, partial support for static items; one function was downgraded from generic to specific) (§5.1.2, pp.5–6), so the code was not retrofitted untouched.

When to use it: Inference: use this staged approach when a low-level Rust codebase already exists and full verification is too costly. Start with one security property and leave unrelated code trusted, but enumerate every assumption because a proof only covers the contract boundary.

How to apply it:
1. Choose one security property and state it as a specification separate from the code (§3.1–§3.2, p.3; the separation is this study's reading of the paper's approach)
2. Add `requires` and `ensures` clauses to the functions involved in that property (§4, p.4)
3. Move library and assembly functions out of the verification path and give them explicit specifications (§3.3, pp.3–4; §4, p.4; §5.1.1, p.5)
4. Use solver-guiding assertions or proof functions only where the specification does not suffice (§4, p.4; §5.2, p.6)
5. Keep an inventory of trusted code and assumptions, then evaluate proof and source overhead (§4.1, p.5; §5.2, p.6)

Verus form: the paper's Listing 1 (p.4) uses `requires` and `ensures`; Listing 2 (p.5) uses `pub uninterp spec fn addr_cleared(a: int) -> bool`, `pub open spec fn range_cleared(...)`, and quantified `forall`. Inference: a Verus retrofit should keep executable functions separate from `spec fn` predicates, use `proof fn` only for erased proofs, and use `assert`/lemmas to discharge solver obligations. `external_body` belongs only on a trusted implementation boundary whose specification is separately justified; placing it on the function under verification would remove the evidence this technique seeks. (The paper does not mention `external_body`.)

Evidence and limits: Table 4 (p.6) reports application/library/total source counts without Verus of 725/607/1,332 lines and with Verus of 899/1,175/2,074 lines. Proof lines are 174/568/742, giving ratios 0.24/0.94/0.56. Inference from the numbers: each ratio is proof lines divided by the corresponding without-Verus lines (174/725, 568/607, 742/1,332), not the with-Verus lines. The authors call 0.56 “a very positive but also optimistic result” and expect it to worsen as more properties are added (§5.2, p.6). The abstract states that proof annotations increased code size “by slightly more than 50 percent” (p.1). This is one bootloader and one property, so it is not a general cost estimate.

## technique: specify memory erasure as compositional range predicates

What it is: define a pointwise predicate for cleared addresses and quantify it over a half-open memory range. The paper's Listing 2 defines `addr_cleared`, then `range_cleared(start,end)` as `forall i: int | start <= i < end ==> addr_cleared(i)`, and defines `wf(layer)` by applying that range predicate to `layer.begin` and `layer.end` (§4, p.5). The linker-defined `eclear` symbol (`layer.end`) points to an address at least after all data sections of the binary's ELF, and the authors assume the linker sets it correctly; the bootloader binaries have no heap, so allocations are stack-based and data is on the stack, in `.bss`, or explicitly copied (§4, p.5).

When to use it: Inference: use a quantified range predicate when a security property concerns complete clearing of a contiguous region and operations clear disjoint adjacent pieces. It avoids proving every byte individually while preserving a precise boundary condition.

How to apply it:
1. Define the atomic address predicate (`addr_cleared`) as an uninterpreted specification (§4, p.5)
2. Define the range predicate with a bounded universal quantifier (§4, p.5)
3. Define layer well-formedness by applying the range predicate to the layer's begin and the linker-provided `eclear` end (§4, p.5)
4. Specify ordinary Rust copying and the final assembly clearing separately, since they happen in two places (§4, p.5)
5. Specify the two functions so that the SMT solver can deduce that two separate adjacent cleared ranges are equivalent to the overall property (§4, p.5)

Verus form: use the exact `spec fn` style from Listing 2 and place the range predicate in `ensures` (as Listing 1 does, p.4). Inference: for executable byte arrays, add a ghost mathematical sequence or map and prove that the concrete writes establish `addr_cleared`; for raw memory and assembly, retain a trusted specification boundary and state the linker and routine assumptions explicitly.

Evidence: the paper says that specifying the property in the right way “allows the SMT solver to deduce that because the two functions clear two separate, but adjacent ranges, this is equivalent to the overall property.” (§4, p.5) It adds that this “does not require substantial proof effort.” (§4, p.5) No per-byte count or independent memory instrumentation is reported. The `range_cleared` property is attached to Rust and Verus library functions whose correctness is assumed, the linker symbol is assumed, and the assembly routine is trusted (§4, pp.4–5).

## technique: quantify and isolate the trusted computing base

What it is: list every library and low-level routine treated as trusted instead of silently treating a successful solver result as end-to-end correctness. Table 2 (p.5) counts 59,857 lines in Rust core, 8,931 in the M3 base library, 19,598 in Verus vstd, and 53 in trusted assembly; the sum, computed by this study, is 88,439 listed trusted lines (§4.1, p.5). The paper warns, “As these numbers show, trusted libraries significantly inflate the TCB of even a simple project like the bootloader.” (§4.1, p.5) It also notes that only a small subset of library features is used, so the raw number “is a ceiling on the effective trusted lines of code from that source” (§4.1, p.5).

How to apply it:
1. Enumerate each external library and assembly routine used by verified code (§3.3, pp.3–4; §4.1, p.5)
2. Record the raw line count; the paper does not narrow it to the reachable subset, so treat it as a ceiling (§4.1, p.5)
3. State the function contract assumed at each boundary (§3.3, pp.3–4; §4, p.4)
4. Mark hardware, compiler, linker, ownership, and unsafe-code assumptions separately (§3.1, p.3; §4, p.5)
5. Report the trusted inventory beside the proved property (§4.1, p.5)

Verus form: Inference: wrap trusted calls in narrow contracts and prove client code against those contracts. Do not claim that a trusted function's postcondition has been verified; report it as an assumption. For raw pointers, use Verus's supported pointer and tracked/ghost mechanisms only where the current tool supports them, and leave unsupported memory operations behind explicit contracts. The paper says Verus's raw-memory support covers sized object types but not memory extents such as variable-sized byte arrays, so the authors have “no guarantee of pointer uniqueness at the proof level” (§4, p.4).

Evidence and limits: the authors assume the compiler is correct and not malicious, that secrets are not copied elsewhere by side-stepping Rust's ownership semantics, that each program correctly derives its context secrets (§3.1, p.3), and that `eclear` is set correctly by the linker (§4, p.5). They also trust one inline assembly routine (53 lines, “only 2.5% of the total lines of code”) that clears the stack and registers and jumps to the next program binary (§4, p.4). The paper states that a proof of functional correctness establishes that a program does what its specification says (§3.3, p.3). Inference: the result therefore holds only under this TCB. The authors leave availability properties and a no-copy property (that per-layer secrets are not copied anywhere else) as future work (§3.1, p.3; §6, p.7).

## technique: measure source, binary, and runtime overhead separately

What it is: distinguish proof/source growth from deployed binary size and execution latency. Much of the extra code is ghost code erased before Rust compilation, but source rearrangement can still change binary sizes and performance (§5.2, p.6). Table 3 (p.6) reports binary sizes for three stages, original/with Verus: Brom 30K/30K, Blau 58K/42K, and Rosa 109K/110K. Table 5 (p.7) reports gem5 execution times: Brom 1.8/1.5 (−16.78%), Blau 52,977/52,943 (−0.06%), and Rosa 72,205/76,958 (+6.58%). The caption says the numbers are in microseconds, but the text says Brom's improvement “is on the order of a few hundred microseconds against an overall program duration of less than two thousand microseconds” (§5.3, pp.6–7), which suggests Brom's 1.8/1.5 are thousands of microseconds; the paper is inconsistent on this. The paper concludes the results “show no compelling performance loss or gain overall” (§5.3, p.6).

Inference: for VL, measure verification annotation growth, trusted lines, compiled artifact size, and runtime independently; a low proof ratio does not imply low trusted code or no performance effect. The three-stage sample is too small to establish a stable performance distribution, and the paper itself notes that “even slight changes to the code result in significant layout changes by the compiler which influences these results” (§5.3, p.7).

## what is proved, trusted, and relevant to VL

Proved: the specified context-erasure property for the modeled Rust portions, including composition of adjacent cleared ranges. Measured: source/proof ratios, listed trusted lines, three stage binary sizes, and a gem5 timing per stage (the number of runs is not stated). Trusted: Rust compiler semantics, Rust ownership against unsafe bypasses, context derivation, linker symbols, Rust core/M3/vstd libraries, raw-pointer support, and final assembly. The paper itself says, “We use Verus to verify that a key property of our TEE bootloader holds, under some assumptions.” (§6, p.7)

Inference: threat to agent-written verified Rust is high for low-level code that depends on raw memory, assembly, or external libraries, because the measured proof covers a narrow contract while the TCB is 88,439 listed lines. The paper is directly relevant to VL's workflow: begin with a narrow property, add contracts to existing code, expose trusted boundaries, and report denominator-specific overhead. VL should not redo the paper's bootloader experiment; it should adopt its TCB inventory and separate overhead measurements.

## techniques for the catalog

- retrofit verification: add contracts to existing Rust and verify a narrow property incrementally
- quantified range specification: express complete memory clearing as a bounded universal predicate
- trusted-boundary accounting: enumerate assumptions, libraries, and assembly in the trusted computing base
- overhead decomposition: measure proof/source growth, binary size, and runtime latency separately
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Verus is relatively new research software and does not (and does not aim to) support all possible Rust features."): read the whole paper text and checked every quotation, number (Tables 2 to 5, Listing 1 and 2 content), section and page reference, and technique step against it; changed the page numbers (tables, §4 listing, §5 and §6 were one page off), the proof-ratio denominator (it is the without-Verus line count, not the with-Verus one), truncated or bracketed quotes, an overstated "no rewriting" claim, the eclear, availability and boot-time wording, and marked the unmarked conclusions as Inference; flagged the Table 5 unit inconsistency; did not check the cited external works, the PDF figures visually, or the paper's tables against the PDF layout beyond the text extraction.
