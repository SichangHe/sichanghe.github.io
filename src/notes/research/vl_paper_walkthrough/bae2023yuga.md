# Yuga: Automatically Detecting Lifetime Annotation Bugs in the Rust Language
(authored by agents unless marked 🧑)
Tag: `bae2023yuga`, [paper](http://arxiv.org/abs/2310.08507v3) (link matches the arXiv identifier printed in the paper text, arXiv:2310.08507v3 [cs.SE] 24 Jan 2025. Authors per the paper are Vikram Nitin, Anne Mulhern, Sanjay Arora, Baishakhi Ray, so the tag prefix "bae" does not match an author; tag kept because it is the file key)

## scope and result
Yuga is a static analyzer for incorrect Rust lifetime annotations (LAs) that can make unsafe raw-pointer code use freed memory or create overlapping mutable references. It is a bug detector, not a proof checker. The paper's core design is a four-stage pipeline: extract borrow lifetimes from signatures and nested values, match lifetime-bug patterns (use-after-free and non-exclusive mutability), run flow- and field-sensitive alias analysis on only candidates, then filter common false positives. The paper states: "We employ a multi-phase analysis approach that starts with a pattern-matching algorithm to quickly identify the potential buggy components." (§1, p. 2).

The reported RustSec result is 16 detected functions out of 23 vulnerable functions, with 2 false positives and 9 false negatives, giving precision 87.5% (14/16 genuine reports) and recall 60.9% (14/23 ground-truth functions) as defined by the paper's table and formulas (§4.3, §5.1, Table 2). The 23 includes 5 functions marked "newly exposed" (not in the original reports); §5.1.1 itself says "21 buggy functions", which the paper does not reconcile with 23. The authors also run 27 synthetic bugs and 372 filtered crates from the top 2,000 downloaded crates; on the crates Yuga gave 85 reports from 27 crates, of which 3 were exploitable bugs and 82 "code smells" (Table 4, §5.1.3, p. 10). Inference: Yuga is a useful pre-check for unsafe/raw-pointer code around a Verus project, but its false negatives and assumptions make it unsuitable as a proof of memory safety.

## technique 1: characterize lifetime-annotation bug patterns

what it is
- classify incorrect signature annotations into argument-to-return (arg-return) and argument-to-argument (arg-arg) transfers
- detect two consequences: use-after-free (UAF) and non-exclusive mutability (NEM)

when to use it
- a function signature contains references, raw pointers, or lifetime-parameterized structures
- the Rust borrow checker accepts code whose unsafe raw-pointer meaning is not represented by the annotations

how to do it
1. identify every value transferred between two arguments (arg-arg) or between an argument and the returned value (arg-return) (§3.1, pp. 4–5)
2. classify a mismatch as arg-return or arg-arg (§3.1, p. 5)
3. flag UAF when a target lifetime can outlive the source value (Rule 1, §2.1.3 and §3.1.1, pp. 3, 5)
4. flag NEM when incorrect LAs can let the lifetimes of multiple mutable borrows overlap (Rule 2, §2.1.3 and §3.1.2, pp. 3, 5); only arg-return NEM is in scope
5. use the corresponding raw-pointer and type checks before expensive alias analysis (§3.2, p. 6)

The paper defines the two classes directly: "Therefore, all LA bugs fall into one of two categories: (i) mismatched arg-arg or (ii) mismatched arg-return." (§3.1, p. 5). It gives a concrete UAF: `bar` returns a `Foo<'a>` whose raw pointer actually derives from `arg2` with lifetime `'b`; dropping the second argument can leave the result pointing to freed memory (Figure 3, §2.2, p. 4). Its NEM example returns a `&'a mut [T]` from a borrow of `self` with anonymous `'_'`, allowing repeated mutable aliases (Table 1, §3.1.2, p. 5).

Verus form
Inference: model the intended outlives relation as a Verus predicate over abstract pointer ownership and lifetimes, and prove each unsafe wrapper's contract. Verus's proof-oriented ownership and state-machine APIs can encode exclusivity, but Yuga's Rust lifetime syntax and raw-pointer propagation are not Verus constructs. A Verus proof must establish the missing relation, not merely report a pattern.

evidence and limits
- The authors observed no NEM bugs caused by arg-arg assignments in their empirical analysis and explicitly exclude that case (§3.1.2, p. 5); this is a scope decision, not evidence that such bugs cannot occur.
- Their UAF/NEM definitions assume type and lifetime relationships visible to the analyzer. Hidden raw pointers, conversions, closures, and external dependencies can evade them (§5.1, p. 9).

## technique 2: extract borrow lifetimes from HIR/MIR values

what it is
- assign an “outlives” lifetime to each nested value in function arguments and returns, including pointees of raw pointers

when to use it
- signatures contain nested structures, references, and raw pointers whose pointee lifetime is implicit

how to do it
1. if a value is borrowed with LA `'b`, assign `'b` to the value and all its fields (§3.2 Step I, p. 6)
2. if a raw pointer is inside a structure with LA `'a`, assign `'a` as the pointee's required lifetime (§3.2 Step I, p. 6)
3. if a raw pointer is inside a structure without an LA, propagate the lifetime the containing structure must outlive (§3.2 Step I, p. 6)
4. record the resulting lifetime for each nested value, as in the value/type/"Borrowed For" table of Figure 4 (§3.2, p. 6); the introduction describes Step I as using "an AST-like representation" (§1, p. 2)

The paper's first rule is: "If a value is borrowed with LA’b, then the value and all its fields must outlive ’b, as per Rule1 in Section 2.1.3." (§3.2 Step I, p. 6). The implementation combines Rust's HIR for struct definitions/signatures with MIR for function-body analysis (§4.1, p. 7).

Verus form
Inference: make lifetime ownership ghost state explicit in a Verus wrapper: a specification map relates each pointer to an allocation and validity interval, and contracts require returned pointers to remain valid. Use `requires`, `ensures`, and invariants to preserve the relation through field projection. Verus does not infer these intervals automatically from Rust HIR/MIR.

evidence and limits
- HIR lacks definitions of external structures, causing precision/recall loss; a MIR-only reimplementation is described as possible "in theory" but hard because "a lot of the source information is lost in the MIR", and is left to future work (§6, p. 11).
- The paper proposes to "treat a raw pointer as though it is “owned” by the structure that it is contained in" (§3.2, p. 6). Inference: this abstraction can over- or under-approximate real allocation behavior.

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
5. for arg-arg (UAF only), take two arguments at a time, pair all values in them, ignore pairs where both values are behind immutable references, and report pairs whose types match; the borrow lifetimes are not compared (§3.2, p. 7)

The paper says: "We consider only the cases where at least one of the two values is held by a raw pointer, because Rust will automatically infer the lifetimes in all other cases." (§3.2, p. 6). For arg-arg, it says: "We ignore cases where both values are behind immutable references because an assignment can only be performed if one value is mutable." (§3.2, p. 7).

Verus form
Inference: express candidate relations as proof predicates and discharge each with a lemma about allocation identity, type compatibility, and exclusivity. A Verus specification should preserve the analyzer's conservative candidate set but prove or reject each candidate; pattern matching alone is not a soundness proof.

evidence and limits
- Type equality is deliberately restrictive. The paper's rusqlite false negative involved conversion of a generic `D` to a `c_void` pointer attached through a C foreign function call, so matching source/target types missed it (§5.1, p. 9).
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
4. for `a = b`, merge `S_b` into `S_a`; for `*a = b`, initialize empty `S_a` and merge `S_b` into each pointee; for `a = *b`, merge each pointee of `S_b` into `S_a` (Algorithm 1, Appendix D, p. 17)
5. for `a = &b`, add `b` to `S_a`; for a call, conservatively connect pairs of argument points-to sets and propagate them to the return set (Algorithm 1, Appendix D, p. 17)
6. report “May Alias” when the source allocation is in the target's points-to set, otherwise “Not Aliased” (Algorithm 1, Appendix D, p. 17); the printed algorithm is a simplified version without field sensitivity, and the paper points to its code for the full one

The authors distinguish their algorithm from Andersen's: "our algorithm is flow-sensitive because we process each statement just once in order, unlike Andersen’s analysis which is flow-insensitive and iterates over the statements till convergence." (§3.2, p. 7). They write "We follow a similar setup to Andersen’s analysis" (§3.2, p. 7). For field sensitivity they "make a deliberate choice to ignore “unknown” fields in function calls", meaning no connection is made to a field of an argument unless that field is already known to the analysis from earlier use (§3.2, p. 7).

Verus form
Inference: the Verus analogue is an ownership invariant stating that a pointer token identifies one allocation and that field projections preserve identity. Use ghost sets/maps and proof lemmas for assignment, dereference, address-taking, and calls. Verus will not infer a points-to set from arbitrary unsafe Rust; either reimplement a verified abstraction or trust the analyzer as a bug-finding pre-pass.

evidence and limits
- Intra-procedural calls are opaque, so cross-function aliasing is approximated by connecting argument pairs; external definitions are a major limitation (§3.2, p. 7; §6, p. 11).
- The authors report empirically that ignoring unknown fields "eliminates false positives and increases precision" (§3.2, p. 7). In the ablation, considering unknown fields raises RustSec recall from 60.9% to 65.2% but drops RustSec precision from 87.5% to 46.9% (Table 5, §5.2, p. 10).

## technique 5: shallow filters for common false positives

what it is
- apply small inter-procedural checks and trait-specific exclusions after alias analysis

when to use it
- candidate aliasing involves custom `Drop` behavior or standard iterator/clone implementations that are known to encode safety semantically

how to do it
1. if the value being re-assigned is behind a raw pointer in both the source and the target structures, mark a violation only if either structure has a custom `Drop` implementation (§3.2 Step IV, p. 7)
2. filter implementations of `Iterator::next`, `Iterator::next_back`, and `Clone::clone` (§3.2 Step IV, p. 7)
3. leave the filter optional so users can disable it when studying those implementations (§3.2 Step IV, p. 7)

The paper explains the ownership check: "A custom Drop implementation would usually involve cleaning up memory, and this means that when that structures gets dropped, the data value might be freed." (§3.2, p. 7). It reports that on the 21 RustSec functions, the filter reduced false positives from 8 to 2, raising precision from 63.6% to 87.5% (§5.2.3, p. 11).

Verus form
Inference: encode explicit destructor contracts and iterator invariants in Verus rather than filtering them heuristically. A `Drop`-like resource protocol should prove whether an allocation is freed; trait exclusions should be replaced by verified trait specifications when possible.

evidence and limits
- Filtering can hide a real bug in a trait implementation; the paper calls it a shallow filter and makes it optional (§3.2, p. 7).
- The 8-to-2 result uses the "21 functions from RustSec reports" (§5.2.3, p. 11), not all crates or all candidate reports.

## technique 6: evaluate with ground truth, synthetic transformations, and ecosystem scans

what it is
- measure precision/recall on confirmed vulnerabilities, test generalization on transformed synthetic bugs, and scan popular crates

when to use it
- static bug detectors need separate correctness evidence for known bugs and realistic code scale

how to do it
1. manually inspect RustSec reports and select 23 buggy functions from 9 crates (§4.2.1, pp. 7–8)
2. create 9 minimal synthetic bugs by slicing one function from each report, then transform each in two ways to reach 27 bugs in total (§4.2.2, p. 8); Inference: 9 minimal + 18 transformed = 27, matching Table 3's n.1–n.3 per report
3. write an "exploit" function for each synthetic bug that triggers the vulnerability (§4.2.2, p. 8)
4. scan the top 2000 most downloaded crates as of November 15th, 2022, "filter out those which do not use unsafe code or lifetime annotations" (leaving 372), and run Yuga as a cargo subcommand (§4.2.3, p. 8)
5. classify reports as genuine only when manually exploitable as undefined behavior; compute precision and recall against the confirmed ground truth (§4.3, p. 8)

The main RustSec denominator is clear: "We evaluate Y UGA in three different settings: (i) 23 real-world vulnerable functions curated from 9 crate libraries, (ii) a synthetic vulnerability dataset, and (iii) running Y UGA across 372 popular Rust crate libraries." (§4.2, p. 7). On synthetic bugs, Yuga detects 16/27, recall 59.3%, with no false positives because the dataset was constructed around bugs (§5.1.2, p. 9).

Verus form
Inference: evaluate a Verus-integrated checker with confirmed unsafe-memory cases, generated variants, and a crate scan, but count proved contracts separately from warnings. Dynamic exploit tests can validate findings; they cannot establish absence of bugs.

evidence and limits
- Existing tools did not detect the same bug classes on the paper's datasets: Rudra detected 0/50 and MirChecker 0/27; Miri detected 27/27 synthetic bugs only when supplied exploit code, and 0/27 without it (Table 6, §5.3, p. 11).
- §6 says the authors "analyzed Y UGA on several popular Rust crates, evaluating a total of 50 vulnerable functions across more than 300 real Rust libraries" (p. 11). Inference: this sentence appears to blend the 23 + 27 = 50 dataset functions with the 372-crate scan; the controlled RustSec and synthetic denominators remain 23 and 27 and should not be combined with the crate scan.
- §5.1.3's summary says Yuga scanned "357 Rust crates" while §4.2.3 and §5.1.3 say 372 (p. 10); the paper does not reconcile this.
- The paper acknowledges limited generalizability, subjective synthetic choices, external dependencies, and the tool's single use case (§6, p. 11).

## techniques for the catalog
- lifetime bug taxonomy — classify arg-arg and arg-return mismatches causing UAF or non-exclusive mutability
- nested lifetime extraction — propagate borrow and raw-pointer outlives requirements through fields and structures
- candidate pattern matching — pair values by type, mutability, and lifetime before alias analysis
- flow-sensitive alias analysis — compute field-sensitive points-to sets in statement order and report may-alias transfers
- shallow false-positive filtering — use `Drop` and iterator/clone patterns to reduce reports, with an opt-out
- grounded detector evaluation — measure precision/recall on RustSec, transformed synthetic bugs, and filtered crate scans
