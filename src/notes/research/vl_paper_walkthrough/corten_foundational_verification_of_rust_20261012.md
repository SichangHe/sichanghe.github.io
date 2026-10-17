# Corten - Foundational Verification of Rust Programs
(authored by agents unless marked 🧑)
Tag: `farka2026corten`, [paper](https://arxiv.org/abs/2609.04372v1)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## paper and scope

František Farka, Carmine Abate, Sven Linker, and Sebastian Ertel present Corten, a foundational Rust verifier implemented in Rocq and built on Iris separation logic. The paper's concrete contribution is a layered route from compiler-produced THIR (Typed High-level Intermediate Representation), through a weakest-precondition (WP) semantics and Iris program logic, to syntax-directed proof tactics. The target reader is building VeruLaw (VL), whose agents write Rust verified with Verus. Corten is therefore both a source of reusable proof-engineering ideas and a warning about what must be trusted when a Rust frontend is not itself verified.

The abstract states: “We present Corten, a foundational verification framework for Rust programs in the Rocq theorem prover, built on the Iris separation logic framework.” (Abstract, p. 1). It claims “By operating at THIR rather than on internal compiler representations, Corten proof goals display the THIR AST, which pretty-prints to surface Rust” (Abstract, p. 1). This is a design claim supported by the examples and architecture, not evidence that all Rust syntax has this property.

## pipeline: source Rust to a kernel-checked proof

Use Corten's pipeline when the goal is a proof that can compose with other Rocq/Iris developments and the source-level shape matters. The steps are:

1. Compile the Rust crate with rustc through Hax. Hax/hax2rocq emits a THIR AST embedded in Rocq. Static parsing, name resolution, and type checking come from rustc.
2. State a function specification as an Iris proposition over argument values and a return postcondition. Corten's `fn_item_ok` requires that the specification entail the function's `wpfn` for every postcondition and argument list.
3. Apply WP rules for patterns, statements, place/value expressions, control flow, calls, and returns. Each rule is an under-approximation: all generated obligations must be discharged for the original specification to hold.
4. Let the program-logic layer reshape the raw WP goal (sealing, safe reordering, joins, and compact continuation stacks).
5. Run `wp_engage` and specialised tactics (`wp_fn`, `wp_call`, `wp_if`). Finish stalled separation-logic obligations manually in Iris Proof Mode.
6. Check the resulting proof in the Rocq kernel. Corten separately relates the WP axioms to an interaction-tree (ITree) operational model where adequacy proofs exist.

The running example is a branch-sensitive function that either returns `1` or performs an early return of `0` inside an argument to `identity`. The paper gives the actual tactic shape: “The tactics-based proof script mirrors the structure of the function itself” (Sec. 2, p. 4), specifically `wp_fn`, `wp_call`, and `wp_if`. This is a practical recipe for VL: preserve a syntax-directed tactic vocabulary so a generated proof follows the Rust control-flow structure, while exposing a manual escape hatch.

**Verus translation (inference).** Verus already parses Rust plus specification/ghost code and sends verification conditions to SMT. The analogous VL pipeline would keep Verus's `requires`/`ensures` and loop invariants as the specification surface, then use a Rust-AST or MIR/THIR pass to generate obligations in source order. Corten's kernel-checked Rocq term has no direct Verus equivalent; a Verus proof remains solver-checked. THIR pretty-printing is a useful UX requirement, but changing VL's trusted frontend would be a major soundness decision.

## memory and ownership techniques

### fractional points-to forest

Use the abstract memory model when functional properties depend on ownership and stored values rather than byte layout. Corten represents values (integers, booleans, pointers, tuples, structs, enums) and locations as paths from stack, heap, or global roots. A points-to fact `ℓ ↦q v` carries a rational fraction `0 < q ≤ 1`; full permission supports mutation, fractions support shared reads. Structured values are recursively split into field/index facts, while `layoutq` abstracts padding and concrete byte arrangement. The authors explicitly limit representation-sensitive reasoning: unsafe `transmute`, atomics, and memory-mapped I/O require a lower-level model.

Steps for a struct field proof are (i) own `ℓ ↦q struct d fields`, (ii) unfold it into the layout fact and field points-to facts, (iii) consume or split the needed field fraction, and (iv) recombine the facts to re-establish the parent representation. The paper says the interface “captures ownership using fractional permissions” (Sec. 3, p. 6). This quote is the central technique, not merely background.

**Verus translation (inference).** Use `Tracked` ghost tokens or linear ghost state to represent fractional ownership, and predicates describing field layouts. Verus's ordinary `&mut` borrow checker can enforce exclusive Rust access, but shared fractional permissions and arbitrary separation are ghost-level encodings that need explicit invariants. Byte-precise unsafe code should remain outside this abstraction or use a dedicated model.

### borrowing, moves, and reborrows

Corten treats safe and unsafe code with one ownership logic. For safe code, rustc's borrow checker is only an oracle predicting that fractional obligations will be easy; the proof does not consume borrow-checker facts. For unsafe code, the verifier manually splits and recombines ownership.

A move out of `ℓ` is encoded by exchanging `ℓ ↦ v` for `ℓ ↦uninit [[v]]TypeR`, while passing `v` to the continuation. To apply it, prove ownership of the source location, consume it with `wpmove`, and use the uninitialized fact to prevent later reads. Copy types are verified under the same move semantics; reusing the proof for `Copy` monomorphisations is an explicit proof-reuse technique. Temporaries allocate a fresh location containing the value and are dropped at the enclosing drop scope.

For `ref mut r`, the appendix gives a concrete rule requiring full ownership of the borrowed location, returning it behind a separating implication, and binding `r` to a fresh pointer location. The authors explain: “The borrow’s end is not a separate event: it coincides with whichever later WP rule is the next to consume ℓ ↦ 𝑣 again” (Appendix H.1, p. 40). This turns a temporal lifetime fact into a spatial ownership transfer. The same appendix reports that allocator methods thread the single `self ↦ v` fact through every `&mut self` call.

**Verus translation (inference).** Verus's borrow checker remains useful for Rust well-formedness, but VL should make ownership predicates explicit when proving unsafe code or alias-sensitive APIs. A move can be represented by a ghost state transition from initialized to uninitialized; a mutable reborrow can transfer a `Tracked` permission and return it in the postcondition. Verus lifetime syntax alone does not provide Corten's generic fractional separation algebra.

## weakest-precondition semantics

### control-flow-sensitive specification monad

Use a WP predicate transformer when expressions can return, break, continue, fail pattern matching, or complete normally. Corten's `CF A` has six outcomes (`seqCF`, `returnCF`, `breakCF`, `continueCF`, `nomatchCF`, `matchCF`). The specification monad `wpCF A = (CF A -> iProp) -> iProp` combines a continuation monad with an exception transformer over Iris propositions. A `throw` forces an exceptional postcondition; `guard` catches a specific control-flow tag and resumes normal sequencing.

To verify a function: evaluate argument patterns (`wppats`), evaluate the body under the resulting frame, wrap it in `return`, then guard `returnCF`. To verify `if`, first prove the condition then branch; for `match`, each arm runs its pattern and expression and emits `matchCF`, while `nomatchCF` invokes the next arm. Loops are one-unfoldings guarded by `continueCF` and `breakCF`; a user-supplied invariant connects iterations. Calls evaluate arguments in order and apply `wpfn` to the callee.

The paper describes the reason for the design: “Evaluation of an expression can have six possible outcomes: a value is produced and evaluation continues sequentially; a return expression terminates the current function frame passing its operands value; a break expression terminates the corresponding loop body; a continue expression resumes evaluation at the beginning of the loop body; a pattern match fails; and a completed match expression passes control to the remainder of the program.” (Sec. 4.1, p. 9). Corten currently has no labelled breaks/continues or break values.

**Verus translation (inference).** Verus specifications normally encode normal return values; early return and loop control are handled by Rust control flow plus branch-specific assertions. VL could adopt an explicit outcome datatype in ghost reasoning for nested `?`, `return`, and `match`, then discharge each branch with `ensures` and invariants. This would improve generated proof structure but would not replace Verus's solver encoding.

### place/value distinction and expression rules

Use separate `wppexpr` (location result) and `wpvexpr` (value result) so field/index/dereference contexts do not accidentally move values. Apply rules structurally: literals return symbolic values; variables in place context look up their location; variables in value context invoke move/copy; borrows evaluate the operand then create a temporary; binary operators evaluate both operands and assert representability (`nooverflow`); tuples/ADTs collect element WPs and build finite maps; indexing proves the index exists and adds `wpval` ownership.

The arithmetic rule is deliberately partial: unsigned negation is unsatisfiable and integer operations require a no-overflow assertion. The paper does not state a purpose beyond representability; that this avoids proving undefined behavior from an inconsistent arithmetic axiom is the study's inference. Corten's examples use a checked `checked_add(...).checked_shl(...)` chain, demonstrating that idiomatic nested calls can still be decomposed by syntax-directed WPs.

**Verus translation (inference).** Map `nooverflow` to Verus integer range lemmas or machine-integer operators with explicit bounds. Keep location/value distinctions in generated ghost predicates, because a solver proof that treats all expressions as pure values can miss move and alias obligations.

## modular specifications and soundness

Function specs are persistent Iris propositions, reusable at every call site. A caller can assume a callee's proven `fn_item_ok` instead of inlining its body; this is the main scaling technique for a crate. In the buddy allocator, `alloc` requires ownership of `self`, an abstract `buddyRep`, a `layoutRep`, and size/alignment bounds, and returns a new representation while existentially hiding concrete allocator lists.

Corten's soundness method is modular ITrees. First define an ITree denotation with heap and undefined-behavior events; then attach a logical handler assigning pre/postconditions to events; derive `wpi`; and prove each WP axiom adequate. Adding an event type requires one adequacy lemma and does not invalidate completed proofs. The paper's arithmetic example proves `Binop-add` under `nooverflow`; the heap example proves assignment by combining ownership of old and new locations. The authors caution: “full soundness establishes only internal consistency– the axioms are satisfied by an operational model– and does not guarantee that the axioms capture the intended semantics of Rust as a programmer would expect” (Sec. 5, p. 19). Thus the method needs both adequacy and independent validation against the Rust Reference.

**Verus translation (inference).** VL should separate (a) solver proof of each verification condition from (b) evidence that its encoding matches Rust execution. A lightweight executable semantics or differential tests against rustc/Miri can test the latter, but cannot make Z3 certificates foundational. Incremental event/feature adequacy is a sound architecture for extending VL's trusted model.

## program-logic proof compression

Raw semantic WPs become huge for nested control flow. Corten adds four techniques, each with a concrete application procedure.

1. **Definition sealing.** Mark recursive `wpblock` opaque and expose `wp-block-cons`, `wp-block-nil-e`, and `wp-block-nil-ne`. Unfold only the leading statement or base case, leaving the rest sealed. Use this for long straight-line blocks to prevent closure expansion.
2. **Evaluation reordering.** For a constant pattern, evaluate the independent constant expression first, seal it in `delayedcpat`, then evaluate the scrutinee and compare. Reordering is valid only when the two computations have no side effects or dependency. It is not a general commutativity rule.
3. **Join-point reasoning.** For `if`, prove both branches against a shared intermediate postcondition `R`, then prove the continuation once, framing resources `F`. Generalise to `match` arms and loop invariants. This removes duplicated continuation proofs.
4. **Defunctionalized continuation stacks.** Replace nested higher-order closures with first-order `scont` (sequential Kleisli frames) and `hcont` (guard handlers). Keep stacks sealed; unfold one frame with `seqK-unfold`/`rtK-unfold`. Shared tails and one handler stack avoid syntactic duplication across branches.

The paper summarizes the purpose of the last technique: “The result is a proof state that carries a compact pair (𝑆, 𝐻 ) of first-order data structures in place of a deeply nested closure tree, substantially reducing Qed-times and improving readability of intermediate goals.” (Sec. 6, p. 21). All program-logic lemmas are proved from the semantic axioms, so they are sound relative to those axioms.

**Verus translation (inference).** Sealing maps to opaque lemmas and controlled unfolding of recursive predicates. Join points map directly to branch lemmas and shared postconditions; loop invariants already play this role in Verus. Defunctionalized stacks could be implemented as ghost enums or proof-state metadata to stop generated VCs from duplicating continuations, but this is an engineering layer around the SMT backend, not a Verus language feature. Reordering should be generated only after a side-effect/dependency check.

## syntax-directed automation

`wp_engage` repeats four stages: introduce and normalize premises; select the unique rule whose head matches the current syntax; sequentialize control flow; and solve separation-logic side obligations (split, join, frame). Specialized tactics handle function prologues, calls, and if joins. If automation stalls, Iris Proof Mode remains available. The design relies on non-overlapping rule conclusions, making dispatch deterministic. THIR goals pretty-print to source Rust, so users do not reconstruct MIR basic blocks.

The evidence is a ten-collection synthetic suite (`arith`, `arrays`, `assign`, `cf`, `ifs`, `impls`, `matching`, `tuple`, `types`, `unary`). Table 1 reports nonblank cloc lines. Automated proofs are roughly two to four times shorter than raw semantic proofs overall, but the `ifs` collection is an exception: raw 112 lines versus automated 140 because join-point specifications add overhead. Specifications are about twice the source size; automated proofs are about two to four times source size. These are line-count measures, not time, defect, or human-effort measurements.

**Verus translation (inference).** Build deterministic tactic dispatch keyed by the Rust syntax node and use SMT only for local arithmetic and invariant side conditions. Preserve a manual `assert`, lemma, and trigger interface when dispatch cannot solve a goal. Track VC size and solver time by construct; do not claim that fewer generated lines imply fewer trusted assumptions.

## buddy allocator case study

The allocator is approximately 300 lines of idiomatic Rust with extensive matches. Its specification preserves `buddyRep` and free-list well-formedness while existentially hiding updated internal lists. It does not prove best-fit selection, fragmentation bounds, or that allocation physically succeeds. The authors state that the result is memory-safety/representation preservation: returned blocks are disjoint from and do not corrupt remaining state.

The complete Rocq development is approximately 2,800 lines: about 250 function specifications, 800 generic Rust-construct reasoning (including 100 lines of join-point pre/postconditions), 1,400 domain-specific free-list invariant lemmas, and a remainder of generic Rocq lemmas. Core functions are used under unproven specifications. This denominator matters: automation removes proof duplication, but most work is domain invariant design, not generic Rust automation.

**Verus translation (inference).** Encode `buddyRep`, `layoutRep`, and list well-formedness as `spec fn` predicates; use `requires`/`ensures` to thread `&mut self` ownership and existentially quantify updated lists; use loop invariants at each free-list traversal. Expect the same domain-specific invariant burden. Do not infer that Corten's 2,800 lines predicts VL's annotation size because Rocq and Verus proof representations differ.

## what is proved, measured, and trusted

Proved or mechanized: the THIR WP rules are Rocq definitions/lemmas; completed ITree adequacy covers literals, unary/binary operators, expression statements, and let statements. The remaining table lists variable/place, borrow, tuple/ADT, if/block, match, loop, call/return, and all pattern clauses as pending. The program logic derives from the axioms. The allocator proof is a checked Rocq proof relative to its specifications and the covered semantics.

Measured: ten synthetic collections, source/spec/raw/auto nonblank lines, and the allocator's approximate 300 Rust / 2,800 Rocq lines. There is no denominator for total Rust language constructs, no scalability study beyond one allocator, no bug-finding rate, and no independent executable oracle yet.

Trusted: Rocq kernel; rustc parser/name resolver/type checker; the hax/hax2rocq transpiler (not verified against rustc THIR); pinned Rocq/Iris/std++ versions. Untrusted: the borrow checker, whose result is ignored by proof rules. The test-suite oracle is hand-authored expected behavior, not independent execution. Core allocator functions have unproven specifications. The paper plans extraction of the ITree interpreter and differential tests against rustc/Miri, so that evidence is currently missing.

## assumptions, failures, and contradictions

- Corten's memory abstraction is adequate for ownership-oriented safe code but intentionally does not model byte representations needed by `transmute`, atomics, or memory-mapped I/O
- loops need user invariants; labelled control flow and break values are unsupported
- full Rust drop semantics and nontrivial destructors are outside the main treatment; traits and generics are only partial
- adequacy pending entries mean the framework currently relies on axioms for most control flow and borrowing
- internal consistency with ITrees does not establish agreement with Rust; the hand-authored test oracle is a second, non-independent trust point
- the `ifs` automation result (140 auto vs 112 raw lines) contradicts a blanket claim that automation always shortens proofs; the paper correctly reports it as an anomaly
- the allocator's stated safety result is narrower than functional allocator correctness and is relative to unproven core-library specs

## what VL should reuse and what it should not redo

VL should reuse the architecture ideas: source-near proof goals, explicit normal/exceptional control flow, ownership as affine/fractional resources, modular persistent function contracts, join-point invariants, controlled unfolding, deterministic syntax-directed automation, and construct-by-construct semantic validation. These address recurring generated-proof failure modes: duplicated branches, nested continuation terms, and opaque MIR-level goals.

VL should not redo Corten's Rocq/Iris formalization or copy its pending axioms as trusted facts. Instead, test Verus encodings against rustc/Miri, keep frontend translation and standard-library contracts explicit in the TCB, and prioritize executable/differential validation for constructs whose semantics are still axiomatic. Reuse the allocator's invariant decomposition as a benchmark, but do not claim coverage from one 300-line case study.

**Threat to a product of agent-written verified Rust (inference).** The source-near, deterministic pipeline could substantially reduce agent proof repair cost. The larger threat is semantic confidence: if VL accepts generated contracts against an unverified Rust-to-VC translation or trusted library specification, a solver-successful proof can certify the wrong program behavior. Corten's explicit TCB and pending adequacy table suggest product requirements: record every trusted frontend/library boundary, reject unsupported control flow, and differentially test generated semantics. This is an inference from the paper's architecture and limitations, not a measured exploit rate.

## techniques for the catalog

- THIR source-near embedding — transpile Rust THIR with hax2rocq into Rocq so proof goals pretty-print to source-level syntax
- fractional ownership forest — represent values as recursive points-to facts with rational permissions and abstract layout
- move and reborrow WP — exchange initialized ownership for uninitialized ownership and return exclusive borrows through separating implications
- control-flow WP monad — model return, break, continue, match failure, and normal sequencing with tagged outcomes and guards
- syntax-directed expression WPs — separate place/value contexts and structurally account for moves, temporaries, overflow, tuples, ADTs, and calls
- modular function contracts — prove persistent `fn_item_ok` specifications and reuse them at every call site
- ITree adequacy — derive event-aware WPs from interaction-tree denotations and prove semantic rules incrementally
- definition sealing — expose one-step block lemmas while keeping recursive WPs opaque
- independent WP reordering — evaluate side-effect-free pattern constants before scrutinees under a sealed continuation
- join-point reasoning — discharge branches or loop iterations against one shared intermediate postcondition and prove the continuation once
- defunctionalized continuations — replace closure trees with sealed first-order sequential and handler stacks
- deterministic WP automation — normalize, dispatch by syntax, sequentialize control flow, and solve separation side obligations with fallback manual proof
- hand-oracle construct testing — validate axioms against documented Rust behavior separately from ITree adequacy
- invariant-driven allocator proof — preserve abstract free-list representation and ownership through `&mut self` calls while hiding concrete state
Audited 2026-10-12 against the paper: checked Table 1 rows (ifs 112 raw vs 140 auto, ten collections, cloc), the 300 line Rust and 2800 line Rocq allocator breakdown (250, 800, 100, 1400), the six control-flow outcomes, loop 1-unfolding and unsupported labels and break values, fn_item_ok, the four Sec. 6 techniques, the wp_engage stages, Table 4 adequacy status, appendix H TCB and reborrow text, and all quotations and their pages; all matched. Changed the page of the Sec. 3 ownership quotation (p. 6, not p. 7) and one sentence: the rationale for the partial arithmetic rule was unmarked inference and is now marked as such. Verus translation paragraphs are marked inference and are sound as sketches.
