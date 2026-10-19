# Heimdall: Formally Verified Automated Migration of Legacy eBPF Programs to Rust
(authored by agents unless marked 🧑)
Tag: `dasu2026heimdall`, [paper](http://arxiv.org/abs/2605.25411v2)

## problem and layered boundary
Heimdall translates legacy C eBPF to Aya Rust, checks source-level safety, checks conditional equivalence of compiled eBPF objects, and loads Rust bytecode through the unchanged kernel verifier. Section 3.1 (p. 3) states: “Every migrated program is checked for memory safety at the source and must still pass the verifier at load time, so an unsafe program reaches the kernel only if two independently constructed checks, working on different representations of the same program, both miss it.” Heimdall receives no functional specification; it enforces source-level obligations rather than proving author intent. The paper identifies the symbolic executor and equivalence checker as Heimdall’s trusted computing base (§2, p. 3).

Inference: this is relevant to VL because it separates translation, equivalence, and source safety. A Verus migration should explicitly relate old and new behavior; proving the new code’s contracts alone does not establish preservation of legacy behavior.

## technique 1: six-stage LLM translation pipeline
The six stages are: (1) LLM translation, (2) compile and kernel verify, (3) static safety analysis, (4) symbolic execution, (5) equivalence checking, and (6) bug triage (§4.1, pp. 5–6). In the paper’s words, “Stage 1: LLM Translation. The pipeline takes as input a C eBPF source file, the entry point symbol name, and a list of map names with their types.” The prompt includes Aya API mappings, hook macros, map patterns, and a working example.

Step 2 compiles Rust to eBPF with lint guards, then loads the binary into the kernel verifier; compiler errors are fed back to an inner LLM retry loop. The guards deny multiple unsafe operations in one block, undocumented or unnecessary unsafe blocks, and unused `must_use` results. The paper gives `#![deny(unused_unsafe)]` as an example.

Step 3 strips comments and applies string, regex, and cross-pattern rules. It requires typed Aya interfaces and explicit handling of fallible helper results, rejecting covered unsafe escape patterns (§4.2, pp. 6–7; §I, pp. 32–33). Step 4 symbolically executes both objects with the authors’ angr backend, covering ELF relocations, instruction lifting, helper models, maps, globals, and path outcomes (§4.3, p. 7). Step 5 compares return values, map state, and ordered output events. UNSAT yields conditional verification; SAT supplies a counterexample to step 6. The LLM classifies it as a translation mismatch, which returns to repair, or a C-bug claim, which stops the pipeline for developer inspection (§4.1, p. 6). Runtime validation is a separate evaluation (§5.6), not stage 6.

Inference: for VL, define a relation between modeled C and Rust states and make repair consume concrete divergences. Any compiler and foreign-helper assumptions must be explicit; this paper does not establish Verus capabilities.

## technique 2: source-level bug elimination through safe APIs
Heimdall uses verifier-accepted bug classes as translation tests. For an uninitialized event struct and ignored `bpf_probe_read_user_str` result, Rust’s definite initialization, `Result<T,E>`, and a policy rejecting unsafe escapes prevent the leak. For pointer-size errors, Aya wrappers such as NUL-stopping string reads avoid caller-supplied raw lengths. For C’s `=` versus `==` bug, Rust assignment has unit type and cannot be used as a Boolean; mutable access through a shared immutable reference is also rejected.

Section 3.2 (p. 4) reports: “Across the 115 programs in our dataset, H EIMDALL identified and fixed 137 unchecked helper returns.” For action-code confusion, `XDP_PASS` is 2, which means `TC_ACT_SHOT` under TC; TC’s pass action is `TC_ACT_OK`, 0. Heimdall’s policy restricts constants by hook (§3.2, p. 5). Across nine real-world programs the paper reports nine bugs, two exposing kernel addresses that defeat KASLR, with eight fixed upstream. Eight findings came from the 115-program dataset; Katran was a separate function-level analysis (§K, p. 33, footnote 12). The benchmark comparison uses C programs after the initial Opus run’s discovered bugs were fixed (§5.4, p. 10).

Inference: in Verus, encode helper outcomes as explicit result types and require callers to branch on them; use ownership and borrowing to prevent aliasing; state buffer-length and initialization properties in contracts. Do not claim that Rust type checking replaces the semantic contract or equivalence proof.

## technique 3: symbolic C/Rust equivalence
Heimdall compares eBPF bytecode rather than source to avoid source-language mismatch. For symbolic map keys, it builds inner if-then-else chains over ordered writes and outer chains over path predicates. Separate presence and value chains track key existence and stored values; pointer-based map updates enter the write trace (§4.4, p. 8). Shared symbolic kernel inputs and initial map state are unified across the two binaries (§G, p. 30).

The guarantee is conditional: helper calls succeed and uninitialized reads return zero (§4.4, pp. 8–9). The checker can disable either condition for bug discovery. Bugs affecting safe paths require fixing the C reference before claiming equivalence to the repaired Rust. The paper explicitly says: “Unless otherwise specified, ‘equivalent’ and ‘verified’ refer to conditional equivalence in Definition 4.5.” Map-value and state-representation differences dominate reported equivalence failures; pointer bounds, unreleased resources, invalid accesses, and out-of-range branches are reported kernel-verifier failures, not equivalence-checker findings (§5.4, p. 11).

Evidence: agentic Opus 4.6 produced 109/115 (94.8%) fully verified translations; three were partially verified and three had all entry points exceed limits (§5.5, p. 11). Across the 109 verified translations, averages were 17.7 minutes and $3.04 per program, 2.91× bytecode size, and 15.5 sanctioned unsafe operations. The size metric counts verifier-loaded `.text/prog_*` sections, excluding debug and symbol sections (§5.4, p. 10).

Inference: a VL equivalent can use a relational Verus theorem for a hand-defined abstract machine, but byte-for-byte compiler behavior, foreign calls, and kernel helpers need trusted models. A proof that new Rust satisfies its own postconditions is weaker than equivalence to old code.

## technique 4: runtime validation and agentic repair
Runtime validation used 10 verified translations and 100 paired trials per program. Section 5.6 (p. 12) says: “All 1,000/1,000 trials match exactly with identical filtered record counts.” The comparison filters to trigger-induced events because timestamps, PIDs, and ports vary between runs. Runtime ratios are geometric means with Student’s t 95% confidence intervals on log ratios. Table 3’s mean Rust/C ratios range from 0.44× to 1.89×. Its eight intervals strictly above 1× conflict with the prose’s count of seven; one overlaps 1× and one lies below it.

The agentic system searches source and Aya files, reads documentation and verified examples, compiles, inspects binaries, runs checks, and delegates focused lookups (§5.5, pp. 11–12). Inference: retrieval and repair help construct candidates; the reported formal guarantee still depends on the checking model and its implementation.

## limitations, trust, and product threat
Section 7 (p. 13) caps exploration at 50,000 paths, models 56 helper stubs, and limits ring-buffer reservations to 512 bytes. Six programs remain short of full verification. Atomicity uses an opcode-count comparison, described as a “coarse heuristic rather than a per-site atomicity proof.” The pattern-based safety policy covers only anticipated patterns; rustc and Aya remain fallible.

The authors test the trusted machinery against an interpreter, the kernel, self-equivalence, and behavior-changing mutants (§J, p. 33). These tests support confidence rather than proving the implementation sound. The synthetic bug-finding evaluation detects 13/16 buggy programs and flags none of 18 correct programs (§K, pp. 33–34). A missed output-size leak was faithfully translated through a valid typed interface, so no divergence appeared. Inference: source safety and equivalence do not guarantee discovery of every legacy bug.

Inference: VL should distinguish preservation of legacy behavior, satisfaction of new contracts, and runtime observations. Heimdall provides a concrete model for conditional migration guarantees, not evidence about VL’s own specifications or implementation.

## techniques for the catalog
- layered translation verification — combine source safety, compiler checks, symbolic C/Rust equivalence, kernel admission, and runtime validation
- verifier-guided LLM repair — return compiler, kernel, safety, and triaged translation mismatches to repair
- safe API bug elimination — use typed wrappers, ownership, initialization, and hook-specific constants to block verifier-accepted C defects
- bytecode relational checking — compare symbolic return and side-effect formulas on compiled objects rather than trusting source similarity
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The fixed-size bpf_probe_read_user copies the full 80-byte host buffer from a user string instead of the string length, so bytes past the NUL are captured and later emitted through the events perf array."): checked the entire paper including appendices against the study’s quotations, numbers, references, and technique steps; corrected stage 6, conditional equivalence, failure attribution, bytecode-size scope, bug-count scope, and a runtime-count inconsistency; did not reproduce experiments or audit the artifact implementation. The arXiv link uses the identifier printed on p. 1.
