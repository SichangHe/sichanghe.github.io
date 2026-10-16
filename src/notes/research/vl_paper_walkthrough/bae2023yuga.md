# Yuga: Automatically Detecting Lifetime Annotation Bugs in the Rust Language
(authored by agents unless marked 🧑)
Tag: `bae2023yuga`, [paper](http://arxiv.org/abs/2310.08507v3)

## scope and result
Yuga is a static analyzer for incorrect Rust lifetime annotations (LAs) that can make unsafe raw-pointer code use freed memory or create overlapping mutable references. It is a bug detector, not a proof checker. The paper's core design is a four-stage pipeline: extract borrow lifetimes from signatures and nested values, match two LA-bug patterns, run flow- and field-sensitive alias analysis on only candidates, then filter common false positives. The paper states: "We employ a multi-phase analysis that starts with a pattern-matching algorithm to quickly identify the potential buggy components." (§1, p. 1).

The reported RustSec result is 16 detected functions out of 23 vulnerable functions, with 2 false positives and 9 false negatives, giving precision 87.5% (14/16 genuine reports) and recall 60.9% (14/23 ground-truth functions) as defined by the paper's table and formulas (§4.3, §5.1, Table 2). The authors also run 27 synthetic bugs and 372 filtered crates from the top 2,000 downloaded crates. Inference: Yuga is a useful pre-check for unsafe/raw-pointer code around a Verus project, but its false negatives and assumptions make it unsuitable as a proof of memory safety.

## technique 1: characterize lifetime-annotation bug patterns

what it is
- classify incorrect signature annotations into argument-to-return (arg-return) and argument-to-argument (arg-arg) transfers
- detect two consequences: use-after-free (UAF) and non-exclusive mutability (NEM)

when to use it
- a function signature contains references, raw pointers, or lifetime-parameterized structures
- the Rust borrow checker accepts code whose unsafe raw-pointer meaning is not represented by the annotations

how to do it
1. identify every value transferred between two arguments or between an argument and the returned value (§3.1, p. 5)
2. classify a mismatch as arg-return or arg-arg (§3.1, p. 5)
3. flag UAF when a target lifetime can outlive the source value (Rule 1, §2.1.3 and §3.1.1, pp. 3, 5)
4. flag NEM when a mutable pointer/reference and another value can have overlapping lifetimes (Rule 2, §2.1.3 and §3.1.2, pp. 3, 5)
5. use the corresponding raw-pointer and type checks before expensive alias analysis (§3.2, p. 6)

The paper defines the two classes directly: "Therefore, all LA bugs fall into one of two categories: (i) mismatched arg-arg or (ii) mismatched arg-return." (§3.1, p. 5). It gives a concrete UAF: `bar` returns a `Foo<'a>` whose raw pointer actually derives from `arg2` with lifetime `'b`; dropping the second argument can leave the result pointing to freed memory (Figure 3, §2.2, pp. 4–5). Its NEM example returns a `&'a mut [T]` from a borrow of `self` with anonymous `'_'`, allowing repeated mutable aliases (Table 1, §3.1.2, p. 5).

Verus form
Inference: model the intended outlives relation as a Verus predicate over abstract pointer ownership and lifetimes, and prove each unsafe wrapper's contract. Verus's proof-oriented ownership and state-machine APIs can encode exclusivity, but Yuga's Rust lifetime syntax and raw-pointer propagation are not Verus constructs. A Verus proof must establish the missing relation, not merely report a pattern.

evidence and limits
- The authors observed no NEM bugs caused by arg-arg assignments in their empirical analysis and explicitly exclude that case (§3.1.2, p. 5); this is a scope decision, not evidence that such bugs cannot occur.
- Their UAF/NEM definitions assume type and lifetime relationships visible to the analyzer. Hidden raw pointers, conversions, closures, and external dependencies can evade them (§5.1, pp. 8–9).

## technique 2: extract borrow lifetimes from HIR/MIR values

what it is
- assign an “outlives” lifetime to each nested value in function arguments and returns, including pointees of raw pointers

when to use it
- signatures contain nested structures, references, and raw pointers whose pointee lifetime is implicit

how to do it
1. if a value is borrowed with LA `'b`, assign `'b` to the value and all its fields (§3.2 Step I, p. 6)
2. if a raw pointer is inside a structure with LA `'a`, assign `'a` as the pointee's required lifetime (§3.2 Step I, p. 6)
3. if a raw pointer is inside a structure without an LA, propagate the lifetime the containing structure must outlive (§3.2 Step I, p. 6)
4. record the resulting lifetime for each nested value in an AST-like table, as in Figure 4 (§3.2, p. 6)

The paper's first rule is: "If a value is borrowed with LA’b, then the value and all its fields must outlive ’b, as per Rule1 in Section 2.1.3." (§3.2 Step I, p. 6). The implementation combines Rust's HIR for struct definitions/signatures with MIR for function-body analysis (§4.1, p. 7).

Verus form
Inference: make lifetime ownership ghost state explicit in a Verus wrapper: a specification map relates each pointer to an allocation and validity interval, and contracts require returned pointers to remain valid. Use `requires`, `ensures`, and invariants to preserve the relation through field projection. Verus does not infer these intervals automatically from Rust HIR/MIR.

evidence and limits
- HIR lacks definitions of external structures, causing precision/recall loss; a complete MIR-only implementation is suggested but would lose source information (§6, p. 11).
- Raw-pointer pointees can be treated as owned by their containing structure, an abstraction that can over- or under-approximate real allocation behavior (§2.2, p. 4; §3.2, p. 6).

## technique 3: pattern matching for arg-return and arg-arg candidates

what it is
- cheaply enumerate type/lifetime pairs that could violate UAF or NEM before alias analysis

when to use it
- after lifetime extraction, when only some argument/return pairs can carry a raw pointer

how to do it
1. for arg-return, pair every argument value with every returned value (§3.2 Step II, p. 6)
2. retain pairs where at least one value is held by a raw pointer (§3.2 Step II, p. 6)
3. flag UAF if types match and the returned lifetime can exceed the argument's lifetime (§3.2, p. 6)
4. flag NEM if one value is `*mut T` or `&mut T` and the other is `T`, with the latter potentially longer-lived (§3.2, p. 6)
5. for arg-arg, pair mutable values from two arguments, ignore two immutable-reference values, and report matching types (§3.2, p. 7)

The paper says: "We consider only the cases where at least one of the two values is held by a raw pointer, because Rust will automatically infer the lifetimes in all other cases." (§3.2, p. 6). For arg-arg, it says: "We ignore cases where both values are behind immutable references because an assignment can only be performed if one value is mutable." (§3.2, p. 7).

Verus form
Inference: express candidate relations as proof predicates and discharge each with a lemma about allocation identity, type compatibility, and exclusivity. A Verus specification should preserve the analyzer's conservative candidate set but prove or reject each candidate; pattern matching alone is not a soundness proof.

evidence and limits
- Type equality is deliberately restrictive. The paper's rusqlite false negative involved conversion from generic `D` to a C `void` pointer, so matching source/target types missed it (§5.1, p. 9).
- The technique only reasons about the two transfer categories; unrelated unsafe memory bugs are outside scope (§6, p. 11).

## technique 4: flow- and field-sensitive points-to alias analysis

what it is
- calculate a points-to set for candidate pointers, respecting control-flow order and separate structure fields

when to use it
- pattern matching has found a possible transfer, but the source and target may not actually alias

how to do it
1. analyze each function body independently and treat calls as opaque (§3.2 Step III, p. 7)
2. keep a separate points-to set for every field (field-sensitive analysis, §3.2, p. 7)
3. process statements in order and update sets at each program point (flow-sensitive analysis, §3.2, p. 7)
4. for `a = b`, merge `S_b` into `S_a`; for `*a = b`, initialize empty `S_a` and merge `S_b` into each pointee; for `a = *b`, merge each pointee of `S_b` into `S_a` (Algorithm 1, p. 15)
5. for `a = &b`, add `b` to `S_a`; for a call, conservatively connect pairs of argument points-to sets and propagate them to the return set (Algorithm 1, p. 15)
6. report “May Alias” when the source allocation is in the target's points-to set, otherwise “Not Aliased” (Algorithm 1, p. 15)

The authors distinguish their algorithm from Andersen's: "Our algorithm is flow-sensitive because we process each statement just once in order, unlike Andersen’s analysis which is flow-insensitive and iterates over the statements till convergence." (§3.2, p. 7). Their field choice is also explicit: "We follow a similar setup to Andersen’s analysis" (§3.2, p. 7), while ignoring unknown fields in calls unless already known.

Verus form
Inference: the Verus analogue is an ownership invariant stating that a pointer token identifies one allocation and that field projections preserve identity. Use ghost sets/maps and proof lemmas for assignment, dereference, address-taking, and calls. Verus will not infer a points-to set from arbitrary unsafe Rust; either reimplement a verified abstraction or trust the analyzer as a bug-finding pre-pass.

evidence and limits
- Intra-procedural calls are opaque, so cross-function aliasing is approximated by connecting argument pairs; external definitions are a major limitation (§3.2, p. 7; §6, p. 11).
- Ignoring unknown fields increased precision empirically, but adding unknown fields later raised recall and reduced precision (Table 5, §5.2, p. 10): RustSec precision falls from 87.5% to 46.9% when unknown fields are considered.

## technique 5: shallow filters for common false positives

what it is
- apply small inter-procedural checks and trait-specific exclusions after alias analysis

when to use it
- candidate aliasing involves custom `Drop` behavior or standard iterator/clone implementations that are known to encode safety semantically

how to do it
1. if a raw pointer is reassigned between source and target structures, require that at least one structure implement custom `Drop` before treating the candidate as a UAF (§3.2 Step IV, p. 7)
2. filter implementations of `Iterator::next`, `Iterator::next_back`, and `Clone::clone` (§3.2 Step IV, p. 7)
3. leave the filter optional so users can disable it when studying those implementations (§3.2 Step IV, p. 7)

The paper explains the ownership check: "A custom Drop implementation would usually involve cleaning up memory, and this means that when that structures gets dropped, the data value might be freed." (§3.2, p. 7). It reports that on the 21 RustSec functions, the filter reduced false positives from 8 to 2, raising precision from 63.6% to 87.5% (§5.2, p. 10).

Verus form
Inference: encode explicit destructor contracts and iterator invariants in Verus rather than filtering them heuristically. A `Drop`-like resource protocol should prove whether an allocation is freed; trait exclusions should be replaced by verified trait specifications when possible.

evidence and limits
- Filtering can hide a real bug in a trait implementation; the paper calls it a shallow filter and makes it optional (§3.2, p. 7).
- The 8-to-2 result uses 21 RustSec functions, not all crates or all candidate reports.

## technique 6: evaluate with ground truth, synthetic transformations, and ecosystem scans

what it is
- measure precision/recall on confirmed vulnerabilities, test generalization on transformed synthetic bugs, and scan popular crates

when to use it
- static bug detectors need separate correctness evidence for known bugs and realistic code scale

how to do it
1. manually inspect RustSec reports and select 23 buggy functions from 9 crates (§4.2.1, p. 7)
2. create 9 minimal synthetic bugs by slicing each report, apply two semantics-preserving transformations to each, and obtain 27 bugs (§4.2.2, p. 7)
3. write exploit functions for synthetic bugs so dynamic tools can trigger them (§4.2.2, p. 7)
4. scan the top 2,000 downloaded crates, retain 372 using unsafe code or lifetime annotations, and run Yuga as a cargo subcommand (§4.2.3, p. 8)
5. classify reports as genuine only when manually exploitable as undefined behavior; compute precision and recall against the confirmed ground truth (§4.3, p. 8)

The main RustSec denominator is clear: "We evaluate Y UGA in three different settings: (i) 23 real-world vulnerable functions curated from 9 crate libraries, (ii) a synthetic vulnerability dataset, and (iii) running Y UGA across 372 popular Rust crate libraries." (§4.2, p. 7). On synthetic bugs, Yuga detects 16/27, recall 59.3%, with no false positives because the dataset was constructed around bugs (§5.1.2, p. 9).

Verus form
Inference: evaluate a Verus-integrated checker with confirmed unsafe-memory cases, generated variants, and a crate scan, but count proved contracts separately from warnings. Dynamic exploit tests can validate findings; they cannot establish absence of bugs.

evidence and limits
- Existing tools did not detect the same bug classes on the paper's datasets: Rudra detected 0/50 and MirChecker 0/27; Miri detected 27/27 synthetic bugs only when supplied exploit code, and 0/27 without it (Table 6, §5.3, pp. 10–11).
- The authors report 50 vulnerable functions across more than 300 libraries in the broader analysis (§6, p. 11), while the controlled RustSec and synthetic denominators remain 23 and 27. These are different settings and must not be combined.
- The paper acknowledges limited generalizability, subjective synthetic choices, external dependencies, and the tool's single use case (§6, p. 11).

## what is proved, trusted, and relevant to VL
Yuga proves no memory-safety theorem; it reports potential lifetime-transfer bugs under its HIR/MIR, type, alias, and filter abstractions. Trusted assumptions include rustc's HIR/MIR, the raw-pointer ownership approximation, opaque calls, matching types, manual exploit classification, and the analyzer implementation. The key numbers are 14/16 genuine RustSec reports (87.5% precision), 14/23 ground-truth functions (60.9% recall), and 16/27 synthetic bugs (59.3% recall). Inference: the threat to an agent-written verified-Rust product is moderate: lifetime-annotation bugs can bypass the borrow checker in unsafe code, but Yuga's false negatives and heuristic filters mean it should be a supplemental lint before Verus proofs, not evidence that a proof obligation is complete.

The paper already covers lifetime pattern taxonomy, nested lifetime extraction, flow/field-sensitive alias analysis, shallow filters, synthetic bug generation, and ecosystem scanning. VL should not redo those as novel techniques. A useful extension would connect Yuga warnings to Verus contracts and measure which warnings correspond to proved or rejected ownership obligations, keeping every denominator and external dependency explicit.

## techniques for the catalog
- lifetime bug taxonomy — classify arg-arg and arg-return mismatches causing UAF or non-exclusive mutability
- nested lifetime extraction — propagate borrow and raw-pointer outlives requirements through fields and structures
- candidate pattern matching — pair values by type, mutability, and lifetime before alias analysis
- flow-sensitive alias analysis — compute field-sensitive points-to sets in statement order and report may-alias transfers
- shallow false-positive filtering — use `Drop` and iterator/clone patterns to reduce reports, with an opt-out
- grounded detector evaluation — measure precision/recall on RustSec, transformed synthetic bugs, and filtered crate scans

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
