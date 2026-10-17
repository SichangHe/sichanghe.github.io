# Verifying x86 Instruction Implementations
(authored by agents unless marked 🧑)
Tag: `goel2020verifying`, [paper](https://arxiv.org/abs/1912.10285)

## verification boundary

The paper describes Centaur's ACL2 framework for proving one x86 instruction invocation across decode, translation to micro-operations, microcode traps, and execution units.  The abstract states: “All these tasks are performed within one verification framework, which includes a theorem prover, a verified symbolic simulator, and SAT solvers.” (Abstract, PDF p. 1.) The target is a SystemVerilog RTL implementation, related to an x86 ISA model and a microcode model.

Inference: the central product lesson is decomposition around a stable architectural step.  Proving a single instruction avoids whole-program pipeline invariants, while compositional lemmas connect the pieces.

## technique 1: executable ISA and micro-architecture models

What it is.  The x86 ISA model defines state, fetch, decode, execute, and update.  The microcode model defines a state, program counter, uop fetch and execution, next-PC, and state update (Sections 2.1–2.3, PDF pp. 2–5).  The paper's target statements are:

“theorem decode-correctness is
  ∀(bytes, cfg):
    get-instr(SV-DECODE(map-decode(bytes, cfg))) =
    x86-decode(bytes, cfg)”

“theorem xlate/ucode-correctness is
  ∀(instr, state):
    run-xlate/ucode(instr, state) =
    x86-exec(instr, state)”

“theorem exec-correctness is
  ∀(uop, data, cfg):
    get-results(SV-EXEC(map-exec(uop, data, cfg))) =
    ucode-exec(uop, data, cfg)” (Figure 5, Section 3, PDF p. 6).

How it is done.

1. Define ISA state and `x86-model-step` as the composition of fetch, decode, execute, and update (Section 2.1, PDF pp. 2–3)
2. Define ucode state and `ucode-model-step`, including `ucode-exec` and next-PC (Section 2.3, PDF pp. 4–5)
3. Parse SystemVerilog into ACL2 functions and define mapping functions from model objects to RTL signals and extraction functions back (Section 2.4 and Section 3, PDF pp. 5–6)
4. State correspondence theorems for decode, translation/microcode, and execution (Section 3, PDF p. 6)
5. Compose them into `single-instruction-correctness`, equality of ISA and RTL steps (Figure 9, Section 3, PDF p. 8)

Verus form.  Inference: represent ISA and micro-architecture states as ghost models; give executable Rust instruction handlers `requires` legal state and `ensures` an equality to a pure spec function.  A translation function can return a uop sequence with a proof of correspondence, and a loop over uops uses a state invariant.  Inference: memory, scheduling, and pipeline state must be modeled explicitly if included; the paper assumes or abstracts several of them.

Evidence and limits.  The framework proves the stated equalities for targeted RTL blocks, but the authors explicitly make “reasonable (unverified) assumptions on the other RTL blocks” (Section 3, PDF p. 8). The paper's conclusion says “we have done single-instruction correctness proofs of only a small subset of the 3400 x86 instruction variants in this described framework” (Section 8, PDF p. 17).

## technique 2: uop specifications and symbolic execution

What it is.  Each uop has a pure specification over ISA data types.  Figure 10's AND specification extracts sizes and operands, truncates them, computes bitwise AND, and truncates the result (Section 3.1.1, PDF p. 9).  The proof compares `SV-EXEC` results with this function.

Inference: Use it for datapath-heavy execution units, especially fixed-latency operations.  The authors report: “To illustrate the scale of this effort, we proved exec-correctness for about 600 uops for our last project.” (Section 3.1, PDF pp. 8–9.)

Steps.

1. Define a specification function over signed/unsigned integers, vectors, floating-point values, flags, and exceptions (Section 3.1.1, PDF p. 9)
2. Map uop inputs to RTL signals with `map-exec` and extract architectural results with `get-results` (Section 3, PDF p. 6)
3. Symbolically execute the RTL with GL and compare the result to the specification (Section 3.1.2, PDF p. 9)
4. Split complex operations into cases or sub-unit runs, proving the decomposition in ACL2 (Section 3.1.2, PDF p. 9)
5. For variable-latency dividers, discover and prove inductive invariants with ACL2 assistance (Section 3.1.2, PDF p. 9)

The paper says: “About ten percent of the uops and operations still require human assistance” (Section 3.1.2, PDF p. 9).  Inference: this fraction's denominator is the uops and operations in their project, not all processor operations.

Verus form.  Inference: use pure `spec fn` arithmetic and bit-vector functions for each uop, and a Rust implementation with `ensures` equality to that spec.  For loops, use `invariant` clauses and `decreases`; for difficult arithmetic, prove case lemmas as `proof fn`s.  Keep proof functions ghost-only; do not call them at runtime.

Evidence and trust.  GL's BDD/AIG algorithms are ACL2-verified, while external SAT solvers are used and, per the paper, “the proofs from the SAT solvers are checked for validity” (Section 2.4, PDF pp. 5–6).  Inference: the trusted boundary still includes the VL/SV translation of the RTL, the formal model's assumptions (for example the unverified blocks and the memory model), and the proof checker for solver output.

## technique 3: decode proofs generated from an instruction table

What it is.  `inst.lst` lists instruction variants, operand sources, and exceptions (Section 4.3.1, PDF p. 12).  Decode correctness proves that every incoming byte sequence is mapped to the right instruction structure or an exception.

Steps.

1. Add an instruction entry describing mnemonic, opcode, operand fields, modes, and exceptions (Section 4.3.1, PDF p. 12)
2. Generate lemmas by splitting opcode and internal parameters (Section 4.3.2, PDF p. 12; Section 6, PDF p. 16)
3. Check byte parsing and decode-time exceptions, including illegal sequences and the 15-byte maximum (Section 4.3.2, PDF p. 12)
4. Run GL and SAT on each generated case; the paper reports that the generated lemmas take “a range of 5 to 10 seconds” of GL and SAT processing, with “a few thousand cases to check across all opcodes” that “can be checked in parallel across multiple machines” (Section 4.3.2, PDF p. 12)
5. Generate a catch-all proof that a byte sequence matching no `inst.lst` entry raises illegal-instruction (Section 4.3.2, PDF p. 12)

Verus form.  Inference: represent instruction metadata as a Rust enum or ghost table and prove decoder lookup agrees with a pure ISA decoder.  Enumerated variants can drive generated proof lemmas; byte parsing uses bounded sequences and arithmetic invariants.  Inference: generated tables are data, so changes must trigger proof regeneration and review.

## technique 4: candidate instruction population and fixed-uop prechecks

For XLATE/UCODE, the framework takes mnemonic, opcode, variant, mode, fixed register indices, and symbolic operands, and partially fills the instruction structure.  It then asks GL/SAT whether `SV-DECODE` can fail to detect an exception on that structure; a counterexample supplies concrete legal values for the fields left unfilled, which are then generalized to keep the wanted fields symbolic (Section 4.3.3, PDF p. 13).  The paper reports this “typically” takes “around 10 seconds, even for instructions with a more complicated encoding, like AVX512 instructions” (Section 4.3.3, PDF p. 13).

The resulting structures go through `SV-XLATE`; the uop opcodes must be fixed, though data and source/destination fields may be symbolic (Sections 3 and 4.3.3, PDF pp. 7, 13).  Section 6 adds that the framework checks the opcode sequence is fixed in the generated PC and also generates a GL check “to ensure that no other uop opcode sequence is possible for the given instruction specification” (Section 6, PDF p. 16).  `run-ucode-model` then steps until a halt address and the results are extracted (Section 3, Figure 8, PDF p. 8).  The proof compares the effects of `shrd-spec` on ISA-visible state with the effects of the micro-program, symbolically simulated on the ucode model (Section 4.3.3, PDF p. 13).  Inference: a Verus translation proof could similarly run a precheck lemma that the opcode sequence is fixed before attempting a larger symbolic proof; the paper says such criteria keep later GL and SAT steps from being too expensive (Section 3, PDF p. 7).

## SHRD example and automation

SHRD verification reuses the instruction table, decoder, translation, microcode routine, and uop lemmas.  The paper's microcode example contains a prelude followed by a trap to `ent shrdEvGv 64reg` (Section 4.2, PDF p. 11).  The paper describes `VPSHRDQ` (packed shift-right double, five prelude uops plus a trap to `avx double shift or q`), whose decode proof adds EVEX “type-checks” (Section 5, PDF pp. 14–15).

All models are executable in ACL2, enabling concrete tests and waveforms for failed proofs (Section 6, PDF p. 16).  Lemmas are generated for each of “roughly a thousand legal opcode values”, and utilities generate the xlate/ucode-correctness statement for AVX512 instructions (Section 6, PDF p. 16).  Inference: this executable-model-first workflow is applicable to Verus, but tests remain debugging evidence rather than proof.

## what is proved, trusted, and missing

Reported as proved: exec-correctness for about 600 uops in one project; generated decode-correctness lemmas.  The paper uses SHRD and VPSHRDQ as illustrative examples and does not say how many instructions have complete single-instruction proofs beyond “a small subset”.  Reported timings: 5–10 seconds per generated decode lemma, around 10 seconds for candidate population, and about ten percent of uops and operations needing human assistance.  These numbers use the authors' Centaur setup and denominators; they are not universal rates.

The conclusion lists bugs the approach can miss: “There are bugs that our approach can indeed miss—e.g., in the memory system (load/store uops, caches), scheduler (operand dependency and forwarding), register mapping, pipelining (interactions among instructions), etc.” (Section 8, PDF p. 17).  It also says only a small subset of the 3400 variants has single-instruction proofs.  Inference: for agent-written verified Rust, the main threat is false confidence from proving a local handler while omitting memory, scheduler, concurrency, or ISA-table assumptions.  VL should record each abstraction and require composition checks at boundaries.

The paper already demonstrates industrial divide-and-conquer, generated proof obligations, executable models, symbolic simulation, and SAT.  VL should not repeat a generic instruction-decoder case study.  Inference: a differentiated project would measure maintenance under ISA-table and microcode changes, and check whether Verus contracts expose stale assumptions automatically.

## techniques for the catalog

- layered ISA/RTL correspondence: prove decode, translation/microcode, and execution equalities and compose them into one-step correctness
- uop specification proofs: define pure operation specs and check RTL with verified symbolic execution and SAT
- instruction-table decode generation: derive parsing and exception lemmas from structured instruction metadata
- fixed-uop prechecks: check that symbolic translation yields a fixed uop opcode sequence before expensive proofs
- executable proof debugging: run the same ACL2 models concretely to diagnose failed proof cases and generate waveforms
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The benefit of working with the entire EXEC block instead of a specific sub-module for uop verification is that the hardware interface of EXEC changes a lot less frequently than that of the sub-modules"): read the whole paper text and checked every quotation, number, section and page reference and technique step against it; changed the link to the arXiv page given in the paper text (arXiv:1912.10285), corrected PDF page references (decode timings and inst.lst parsing are on p. 12, candidate population on p. 13, Section 2.1 on pp. 2-3), made the 600-uop quote exact, rewrote the fixed-uop precheck technique (the fixed-opcode check is described in Sections 3 and 6, and the XLATE/UCODE proof compares shrd-spec effects with the symbolic micro-program run), added that SAT proofs are checked, and softened claims that SHRD proofs were completed; did not check the cited references, the publisher DOI (dropped as it is not in the paper text), or the ACL2 artifacts.
