# Heimdall: Formally Verified Automated Migration of Legacy eBPF Programs to Rust
(authored by agents unless marked 🧑)
Tag: `dasu2026heimdall`, [paper](http://arxiv.org/abs/2605.25411v2)

## problem and layered boundary
Heimdall translates legacy C eBPF to Aya Rust, checks source-level safety, proves the compiled C and Rust eBPF objects equivalent with symbolic execution, and still loads Rust bytecode through the unchanged kernel verifier. The paper’s central statement is: “Every migrated program is checked for memory safety at the source and must still pass the verifier at load time, so an unsafe program reaches the kernel only if two independently constructed checks, working on different representations, both miss it.” Heimdall receives no functional specification, so it enforces obligations such as initialized published bytes, correct helper sizes, and hook-specific action values rather than proving author intent.

Inference: this is directly relevant to VL because it separates translation from equivalence and safety gates. A Verus migration should similarly prove a relation between old and new behavior, then verify Rust contracts; a successful Rust proof alone does not establish equivalence to legacy behavior.

## technique 1: six-stage LLM translation pipeline
The paper’s six stages are: (1) LLM translation, (2) compile and kernel verify, (3) static safety analysis, (4) symbolic execution, (5) equivalence checking, and (6) runtime validation. In the paper’s words, “Stage 1: LLM Translation. The pipeline takes as input a C eBPF source file, the entry point symbol name, and a list of map names with their types.” The prompt includes Aya API mappings, hook macros, map patterns, and a working example.

Step 2 compiles Rust to eBPF with lint guards, then loads the binary into the kernel verifier; compiler errors are fed back to an inner LLM retry loop. The guards deny multiple unsafe operations in one block, undocumented or unnecessary unsafe blocks, and unused `must_use` results. The paper gives `#![deny(unused_unsafe)]` as an example.

Step 3 applies a hand-curated policy rejecting `MaybeUninit`, raw-pointer and unsafe escape paths, checking initialized values, helper results, pointer sizes, hook action namespaces, atomic operations, and map accesses. Step 4 symbolically executes both eBPF objects with angr, modeling registers, call stack, 56 helper stubs, maps, and path outcomes. Step 5 compares the symbolic formulas for return values and map side effects. Step 6 runs paired C and Rust programs under controlled workloads and compares filtered records.

Inference: Verus form: translate C into Rust, write an explicit relation between C’s modeled state and Rust’s state, and use `requires`, `ensures`, `invariant`, `assert`, and proof functions/lemmas only where supported by the Verus reference. Verus cannot automatically prove eBPF helper models or C/Rust compiler equivalence; those remain modeled assumptions or require an external equivalence checker.

## technique 2: source-level bug elimination through safe APIs
Heimdall uses verifier-accepted bug classes as translation tests. For an uninitialized event struct and ignored `bpf_probe_read_user_str` result, Rust’s definite initialization, `Result<T,E>`, and a policy rejecting unsafe escapes prevent the leak. For pointer-size errors, Aya wrappers such as NUL-stopping string reads avoid caller-supplied raw lengths. For C’s `=` versus `==` bug, Rust assignment has unit type and cannot be used as a Boolean; mutable access through a shared immutable reference is also rejected.

The paper reports concrete findings: “Across the 115 programs in our dataset, H EIMDALL identified and fixed 137 unchecked helper returns.” It also describes action-code namespace confusion where XDP value 2 means pass but TC value 2 means drop; Aya binds constants to hook types. These are language/API constraints, not kernel-verifier proofs.

Inference: in Verus, encode helper outcomes as explicit result types and require callers to branch on them; use ownership and borrowing to prevent aliasing; state buffer-length and initialization properties in contracts. Do not claim that Rust type checking replaces the semantic contract or equivalence proof.

## technique 3: symbolic C/Rust equivalence
Heimdall compares eBPF bytecode rather than source to avoid source-language mismatch. The symbolic engine explores paths up to n=50,000, models helper/map behavior, and creates formulas for return values and map side effects. Equivalence passes when corresponding formulas agree under the modeled inputs and state. This catches map-value errors, state-representation mismatches, pointer bounds, reference leaks, invalid accesses, and out-of-range branches.

Evidence: on the full 115-program set, the agentic Opus 4.6 configuration produced 109/115 (94.8%) fully verified translations. Three were partially verified because some entry points timed out; three were unverified because all entry points exceeded solver limits. Across the 109 verified translations, average time was 17.7 minutes/program, average cost $3.04/program, and produced Rust object files averaged 2.91× the C size with 15.5 sanctioned unsafe operations per translation.

Inference: a VL equivalent can use a relational Verus theorem for a hand-defined abstract machine, but byte-for-byte compiler behavior, foreign calls, and kernel helpers need trusted models. A proof that new Rust satisfies its own postconditions is weaker than equivalence to old code.

## technique 4: runtime validation and agentic repair
Runtime validation used 10 verified translations, 100 paired runs per program (1,000 trials), identical filtered event counts in all 1,000/1,000 trials. Runtime ratios were geometric means with Student’s t 95% confidence intervals on log ratios; seven of ten intervals were strictly above 1×, one overlapped 1×, and one was below 1×. The paper says, “All 1,000/1,000 trials match exactly with identical filtered record counts.”

The agentic system searches source and Aya files, reads documentation and verified examples, compiles, inspects binaries, runs equivalence and kernel checks, and delegates focused lookups. Inference: this is test-time retrieval and repair, not proof evidence by itself; only the formal equivalence and safety gates establish the reported guarantees.

## limitations, trust, and product threat
The symbolic model caps path exploration, limits ring-buffer reservations to 512 bytes, and models only 56 helper stubs. Six of 115 translations time out. Atomicity is checked by comparing opcode totals, which the paper calls a “coarse heuristic rather than a per-site atomicity proof.” The paper states, “layered verification narrows the trusted computing base but does not empty it,” naming rustc, Aya, and the kernel verifier as remaining fallible components.

Inference: threat to VL is high for direct LLM C-to-Rust migration without equivalence checks, but moderate for Verus code whose specification is independently designed. What VL should not redo is a single compiler/verifier pass as evidence of semantic preservation. Heimdall’s results support keeping legacy equivalence, source safety, and runtime checks as separate claims with separate denominators.

## techniques for the catalog
- layered translation verification — combine source safety, compiler checks, symbolic C/Rust equivalence, kernel admission, and runtime validation
- verifier-guided LLM repair — feed compiler, kernel, and equivalence failures back into an inner translation loop
- safe API bug elimination — use typed wrappers, ownership, initialization, and hook-specific constants to block verifier-accepted C defects
- bytecode relational checking — compare symbolic return and side-effect formulas on compiled objects rather than trusting source similarity
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
