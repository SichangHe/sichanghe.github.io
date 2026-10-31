# Translating C To Rust: Lessons from a User Study
(authored by agents unless marked 🧑)
Tag: `li2024translatingrust`, [paper](http://arxiv.org/abs/2411.14174v2)

## purpose and evidence

This paper studies how people translate real C programs into safe Rust. Thirty-three undergraduate security students translated one of eight BSDCoreUtils or library programs (322–536 C lines) within 20 days; 31 final translations compiled and used no `unsafe`, and 26 of those passed tests reaching at least 85% line coverage on the C source (§III, PDF p.4). Participants knew C memory errors but had minimal prior Rust exposure, and could use any tools, including c2rust and LLMs (§I, §III). The authors say their main goal is analyzing how users succeed, to inform future automatic translators (§I, PDF p.2). They report: “all user-provided Rust translations semantically lift from the low-level abstractions used in the C code to re-express the logic in Rust, rather than trying to mimic the original program and data-flow structure too closely.” (Introduction, PDF p.2)

The study is not a formal-verification evaluation. Its evidence consists of Rust compiler checks, participant tests, differential AFL++ fuzzing, performance runs, participant feedback, and a post-hoc look at the uutils/coreutils Rust project (§VIII). The authors found that none of the 31 translations was fully equivalent to the C code on fuzz tests, although known memory-safety vulnerabilities were eliminated or caught. The sample is small (33 participants, 322–536 line programs); the authors list this under threats to validity (§IX). They emphasize the remaining correctness gap: “nearly all Rust translations have functional discrepancies compared with the corresponding C code.” (Introduction, PDF p.2)

## technique 1: lift C data into semantic Rust types

What it is. Instead of preserving raw pointers and line-by-line control flow, identify what the object means and replace it with a Rust abstraction such as `String`, `Vec`, `Box`, `Option`, a fixed array, or an enum. In the `center_stream` example, a C `char*` buffer becomes a `String`; string methods replace pointer arithmetic and C library calls (Fig. 3 and §IV.A, PDF pp.5–6).

When to use it. Use semantic lifting when C pointers represent text, byte arrays, files, collections, or tagged variants whose operations have safe Rust APIs. It often removes pointer manipulations and makes ownership and bounds explicit. It may change behavior: the paper notes that `String` assumes valid UTF-8, unlike an arbitrary C `char*` (§IV.A, PDF p.6).

How to do it. Inference (a procedure assembled from the paper's examples, not a method the paper states): identify the abstract data represented by each pointer. Choose a Rust type that supplies the required operations. Rewrite C library calls as safe methods or expressions. Re-check behavior for encoding, nullability, and error cases. The paper observes that the first type choice was often not optimal: of 17 participants who shared an initial version, 10 changed their chosen types in the final version (§IV.A, PDF p.6). The observed API choices for translating C library calls were direct safe mappings (36.7% of calls), compound expressions (39%), user API emulation (13.4%), elimination of manual management (7.6%), and third-party crates (3.3%) (§IV.A, PDF p.6).

Verus form. Inference: Define a Rust struct or enum for the semantic object and a `spec fn` for its abstract value. Use `requires` to state encoding or length assumptions and `ensures` to connect each safe method to the abstract operation. Prove bounds and representation lemmas with proof functions. Inference: Verus does not prove that a `String` faithfully models arbitrary C bytes unless the contract includes a UTF-8 assumption or a byte-oriented representation.

Evidence and limits. Across 31 translations, participants used 1,261 reference-like variables: 49.2% owning and 50.8% borrowing (Table III, PDF p.7). The paper reports 95.6% static temporal safety for owning references and 99.7% for borrowing references, but 90.9% of borrowing references may use runtime spatial checks (Table III, PDF p.7). These denominators are all explicitly declared reference-like variables, not all program variables.

## technique 2: resolve aliasing by elision or cloning

What it is. Rust’s aliasing-xor-mutability rule rejects a direct translation when two C pointers overlap with conflicting mutability or lifetimes. The paper reports that users found two strategies that satisfy the static checks, and did not use reference-counted dynamic references for heap and stack data. Elision removes a pointer whose function is subsumed by a semantic type, as Version A removes `p2` after lifting to `String`. Cloning creates a separate object so one reference can remain immutable while writes target the copy (Version B, §IV.B, PDF pp.6–7).

How to do it. First determine whether a pointer is needed after semantic lifting; remove it when the safe API already performs the operation. If simultaneous read and write borrows remain, clone the value, keep the read reference on the original, and mutate the clone. Re-check whether copying preserves the required observable behavior and cost. (This order of steps is Inference; the paper describes the two strategies, not a procedure.) Cloning also helps when a C program has several immutable pointers whose lifetimes must be separated (§IV.B). Elision appeared in 25 final translations and cloning in 13 (§IV.B, PDF p.7).

Verus form. Inference: For elision, prove that the replacement method preserves the abstract sequence or string value with an `ensures` clause. For cloning, prove an equality relation between the clone and source at creation and then reason separately about later mutation. Use explicit ownership and borrow scopes in executable Rust; use proof functions for value-preservation lemmas. Inference: Cloning can alter identity, alias-visible mutation, and performance, so the contract must state which observations are preserved.

Evidence and limits. The paper gives the usage counts above (25 and 13 translations) but no independent equivalence proof for each rewrite. It warns that preserving original C lifetimes and read/write structure may be impossible in safe Rust because `p2` would need to remain mutable while `p1` is active (§IV, PDF p.5). Inference: A compiling elision or clone is evidence of Rust memory safety, not semantic equivalence. Appendix B (PDF p.17) shows a translation that passed tests with 85% coverage yet had an off-by-one padding bug and a display-width bug in lines the tests covered.

## technique 3: choose static or dynamic safety deliberately

The study distinguishes compile-time ownership and borrowing from dynamic references such as `RefCell`, `Rc`, `Mutex`, and `Arc`. Static references avoid runtime checks; dynamic references permit patterns that violate strict AXM but pay runtime cost (§II.A, PDF pp.2–3). For mutable globals, 19 participants moved globals into local objects, 11 grouped them in structs, three retained dynamic globals or thread-locals, and four used atomics (§V.C, PDF p.9).

The paper also reports common patterns: `Option<T>` makes nullable state explicit, while `Atomic` types permit safe mutation of integer globals without mutable references (§V.A and V.C, PDF pp.7–9). Inference: For Verus, prefer an abstract state representation with explicit invariants over hidden global mutation. Model dynamic synchronization with contracts that state the lock or atomic protocol; prove that each operation preserves the invariant. Inference: A Rust runtime check is not a Verus proof of the desired functional property.

## technique 4: translate unions according to their meaning

C unions represent either type punning or variant records. The paper reports two zero-cost safe-Rust mappings. For byte-level type punning, users use `to_le_bytes`/`from_le_bytes` (or big-endian variants), which compile to constant-size conversions. For tagged variants, users use Rust enums and statically checked `match` statements (§V.C, PDF p.9). Among users who handled these unions, three used zero-cost casts and two used enums; three others emulated unions with structs and methods at higher overhead.

How to do it. Inference (a procedure assembled from the paper's two examples): determine whether the union is an endian-dependent byte reinterpretation or a tagged sum. Select byte-conversion APIs for the first case and an enum with exhaustive matches for the second. State the valid tag-to-variant relation and target endianness. Inference: In Verus, specify the byte conversion as an equality between mathematical bit vectors and prove each enum match arm covers its permitted discriminator. Do not assume a union’s arbitrary overlapping memory is represented by a safe Rust enum.

## technique 5: differential fuzzing finds the last-mile gap

What it is. The authors use AFL++ for one hour per C benchmark, sample 300 distinct tests where available, and compare C and every Rust translation, omitting minor error-message differences (§VI, PDF p.9). “We find that none of the 31 translations is fully equivalent to the original C code.” (§VI, PDF p.9) Across programs, 37–100% of fuzz tests differ (68% average). Differences are classified as I/O encoding/decoding, runtime safety aborts, or logical differences (Fig. 10, §VI, PDF p.10). Translations of the same C program often fail the same tests (Fig. 9, §VI).

How to do it. Inference (a procedure assembled from §III and §VI): generate a corpus with greybox fuzzing. Run each input against C and Rust. Compare output, return code, file effects, and termination. Classify discrepancies, then add targeted tests or revise the translation. Participant-created tests reached high line coverage but missed many behavioral differences; 27/31 translations differed on more than half of newly generated tests (§VI, PDF p.10).

Verus form. Inference: Differential fuzzing can produce counterexamples to a Verus contract or expose an incorrect abstraction before proof. A Verus proof should then establish the corrected contract for all inputs, while fuzzing remains a bug-finding heuristic. Inference: If C has undefined behavior, define the intended Rust behavior explicitly rather than requiring equivalence to arbitrary C execution.

## technique 6: measure safety and performance with stated denominators

For performance, the authors select, per benchmark, the Rust translation most similar to the C program on tests (highest test coverage, ties broken toward the shorter translation), use tests where C and Rust outputs match and both exit normally, run 70 trials, discard the first 10 plus the fastest and slowest 10 remaining, and compare mean runtime measured between entry and exit of `main` (§V.B, PDF p.8). For 5 of 8 benchmarks the selected Rust translation runs faster; 6 of 8 are “well below 10% overheads”, and the remaining two have about 10% and 40% overhead at `-O3` (§V.B, PDF p.8). End-to-end runs with hyperfine average about 13% overhead (Appendix C, PDF p.18). These results are post-hoc; participants were not asked to optimize.

Known vulnerabilities in `shoco` and `urlparser` were eliminated or caught in all user translations: a global-array overread (shoco, CVE-2017-11367) and a heap-buffer overflow on a string buffer (urlparser) were caught at runtime, and a use-after-free in urlparser was statically eliminated by Rust's lifetime and borrowing rules (§V.A and Appendix A, PDF pp.8, 15–16). Inference: These are strong memory-safety observations for the eight selected programs, not proof that all translated code is functionally correct.

## automatic tools and decomposition limits

Laertes and Crown compile on many benchmarks but leave most references as raw pointers: Laertes averages 95.3% unsafe data references, while Crown’s safe references are below 3.1% on average (§VII.A, PDF p.10). Flourine and Vert generate more idiomatic snippets but no runnable translation for any complete benchmark in Table IV; both require decomposing programs into components, and the paper reports difficulty merging independently translated functions (§VII.B, PDF p.11).

## what is proved, trusted, and already done

Rust’s compiler enforces memory safety for safe code, but the study does not formally prove functional equivalence. Inference: the trusted base includes Rust compiler correctness, the translation’s abstraction choices, test oracle quality, fuzzing coverage, C library semantics, and any undefined-behavior policy. The authors state that policy choices matter: “there is no one-size-fits-all strategy to take.” (§IX, PDF p.13)

## techniques for the catalog

- semantic data-type lifting: replace raw C pointers and APIs with Rust types and methods representing the object’s meaning
- aliasing resolution by elision or cloning: remove redundant borrows after lifting or copy values to separate conflicting read and write lifetimes
- static/dynamic safety selection: choose compile-time ownership, runtime synchronization, atomics, or explicit nullable types according to access patterns
- union specialization: map endian-dependent unions to byte conversions and tagged unions to Rust enums with exhaustive matches
- differential fuzzing: compare C and Rust executions on generated tests, classify discrepancies, and repair the translation
- policy-aware verification: state which behavior must remain equivalent, then prove that specification with contracts rather than relying on compilation alone
