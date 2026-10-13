# Verus linear ghost types: ownership as a proof mechanism
(authored by agents unless marked 🧑)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## Paper and reading boundary

Andrea Lattuada, Travis Hance, Chanhee Cho, Matthias Brun, Isitha Subasinghe, Yi Zhou, Jon Howell, Bryan Parno, and Chris Hawblitzel, *Verus: Verifying Rust Programs using Linear Ghost Types*, OOPSLA 2023, article 85, 30 pages. [DOI](https://doi.org/10.1145/3586037), [primary PDF](https://www.andrew.cmu.edu/user/bparno/papers/verus-ghost.pdf), [SSD1 PDF](/ssd1/sichangheagent/vlpw/verus_linear.pdf), [text](/ssd1/sichangheagent/vlpw/verus_linear.txt). Page numbers below match PDF pages and the suffix in 85:n.

The [existing overview](../topic_studies/formal_verification_rust/rust_verifiers/verus.md) explains Verus at a high level. This study adds the mode rules, permission operations, proof-termination argument, examples, and historical limitations. It reads the supplied paper, not the separate extended formalization or artifact. Example timings are author reports.

## Central lesson for VL

A logical description of a resource is different from permission to use it. Verus lets specifications freely copy descriptions while Rust ownership prevents proof code from duplicating permissions. The authors say (§2.1, p. 6): “Proof variables sit midway between exec variables and spec variables: like spec variables, they are ghost and are not compiled to machine code, but like exec variables, they are checked for linearity.” Agent inference: agents must generate both the mathematical state model and the ownership structure; one cannot substitute for the other.

Here “linear” means a value cannot be freely copied unless its type permits copying. Rust lets a value be dropped, but the paper's model calculus is stricter: its type system "prohibits discarding linear resources" (§10, p. 19). Ghost code exists for verification and is removed before execution.

## What it does

The paper introduces an SMT-based Rust verification tool that combines executable code, mathematical specifications, and proof code in a Rust-like language. Rust's type and borrow checker handles routine ownership; Verus generates logical conditions and asks Z3 to prove them. The paper's goal includes pointer-based data structures, interior mutability, and concurrency, through trusted primitives controlled by checked ghost permissions.

§2.1, p. 6, is explicit about the paper-time boundary: “its goal is to provide safe replacements for unsafe Rust features” That historical statement should not be used as a current blanket capability claim. The later systems paper extends raw-pointer support; VerusBelt gives a richer semantic foundation.

## Modes and logical encoding

Figure 2 (§2.1, p. 6) separates three modes:

- spec: ghost, purely functional, deterministic, terminating, and not checked for ownership or borrowing
- proof: ghost, permits mutation of proof state, checked for ownership and borrowing, and must terminate
- exec: compiled, permits mutation, checked for ownership and borrowing, and may fail to terminate

Spec code can call spec functions; proof can also call proof functions; exec can call all three. Spec functions do not have ordinary preconditions/postconditions. Proof and exec functions can. Proof/spec code cannot change executable state. The mode checker ensures descriptions do not turn into runtime data or operational permission.

§2.1, p. 6, explains the encoding choice: “Verus trusts the results of Rust’s borrow checker, and does not attempt to recheck these results in the SMT solver” Owned boxes and immutable references can consequently be treated as values, avoiding pervasive heap and aliasing formulas. §2.2, pp. 7–8, illustrates modular function calls: prove the precondition, then use the callee's postcondition. An unsatisfiable counterexample query establishes the generated verification condition.

Agent recommendation: distinguish compiler/type errors, mode errors, and logical proof failures. The funds-transfer example (§8, pp. 16–17) catches aliasing in Rust before invoking Z3, then diagnoses an insufficient-balance precondition separately. They need different repairs.

## Techniques and proof patterns

### Mathematical views, invariants, and induction

The Fibonacci example (§2, pp. 4–5) relates a finite-width implementation to a mathematical recursive spec. Its input condition ensures the answer fits u64. A loop invariant connects current and previous accumulator values to Fibonacci values; an inductive lemma proves monotonicity to discharge overflow bounds. Recursive proof and spec functions need decreases clauses. reveal_with_fuel controls recursive unfolding.

§2, p. 5: “Verus spec functions are total functions that do not have preconditions and postconditions.” This makes direct SMT encoding light. recommends clauses supply diagnostic soft preconditions rather than assumptions of the theorem; they are checked when verification fails. Agent inference: do not treat recommends as permission to ignore inputs outside the recommended domain, and do not repair failures by quietly narrowing the required contract.

§1, p. 3, also lists quantifier trigger selection/profiling, hide/reveal controls, mathematical sequences/maps/sets, bitvector reasoning, and proof by computation. These are existing proof tools for an agent to select.

### Permissioned pointers and initialized state

§4.1, pp. 8–10, pairs PPtr<T> with a proof-mode PermData<T>. The token identifies the pointer and its abstract contents. §4.1, p. 9: “a value of Some(v) means the memory stores v, and a value of None indicates that the memory is uninitialized.” This None is not the runtime None of an initialized Option value.

Pointer reads need the matching initialized permission; writes require suitable exclusive permission and update the token's state. Moving or borrowing the permission enforces access discipline. A snapshot may describe old contents but cannot authorize a current read or write. Agent recommendation: track allocation, initialization, extraction, and freeing explicitly rather than summarize all of them as an undifferentiated valid-pointer flag.

The XOR doubly linked list (§4.2, pp. 9–12) combines physical pointer structure, a mathematical sequence view, and ghost permissions for nodes. It proves push/pop operations preserve the linked structure and implement the sequence contract. A proof resource may be stored in maps or compound data structures even though it has no runtime representation. This is how ordinary classical SMT formulas can support separation-logic-style ownership without using separation logic everywhere.

### Separate shared containers from exclusive contents

PCell (§5, pp. 12–14) supplies a permission-controlled counterpart to UnsafeCell. A freely shared cell handle alone cannot mutate its contents. The exclusive permission provides authority. InvCell wraps a cell with a predicate saying which contents are allowed. The memoization example stores either no result or the correct result, so a shared cache can be updated while preserving its semantic invariant.

§5.2, p. 14: “they obtain temporary, exclusive ownership over the G.” LocalInvariant is for one thread; AtomicInvariant is thread-safe but permits opening only around atomic operations. Additional conditions prevent opening the same invariant twice. Agent recommendation: prove the invariant is restored before closing and retain the link between invariant contents and physical memory. The later VerusBelt study diagnoses a lifetime gap in the original implementation; this paper's description alone is not the final foundation.

### Generate ownership tokens from local transition systems

§6, p. 15, uses “localized transition system” from earlier work. Developers define transitions and prove inductive invariants; generated proof types represent state components, with operations that create, consume, or update them. Tokens can live inside cells, invariants, locks, and atomics.

The FIFO ring-buffer example links head/tail tokens to atomics and uses a consumer token to authorize consuming a slot. The consume_start API needs evidence of the consumer role and access to tail state, then transfers a slot's permission to the consumer. This expresses who may act and what they may access using ordinary function arguments. The implementation must follow the proved transitions; checking the abstract protocol is only part of the proof.

Examples also include an interner whose token lets an identifier stand for its original value, a reader-writer lock with a protected-data invariant, and Rc without weak pointers (§6, p. 15). Agent recommendation: search these existing patterns before designing a new permission protocol.

## Formal model and the termination issue

§10, pp. 18–26, introduces a small calculus for modes, immutable borrowing, permissions, snapshots, closures, and termination. It explicitly omits concurrency, preconditions/postconditions, verification-condition generation, and mutable borrowing. Lifetimes are only static or restricted. Its theorem is not a proof of the complete Rust or Verus implementation.

The model permits spec snapshots of linear resources. §10.1, p. 21, calls them a “dead-end”: they cannot be converted back to shared or linear permissions for runtime operations. Their observations must keep the old contents; consulting live mutable state would make a spec function nondeterministic.

§10.3, p. 22, gives the requirement: “This erasure is sound only if the ghost code always terminates with no side effects.” Explicit decreases clauses do not catch every source of nontermination. Storing a function that calls itself through a mutable cell, or passing a function to itself through a recursive type, can create a hidden cycle without an explicitly recursive function declaration. Strict positivity restrictions apply to proof/spec function types in recursive structs; executable functions can remain less restricted. Mode access rules forbid proof/spec runtime reads and writes.

§10.4, p. 23, reports preservation, progress, and ghost-code termination. The termination argument translates proof/spec expressions into the calculus of inductive constructions and establishes well-typing plus a reduction simulation; executable functions map to unit. The separate supplement holds the proofs. This study has not checked their mechanization or the supplement. Agent inference: proof-code removal requires more than syntactic deletion; termination and absence of runtime effects are part of its justification. The calculus's result does not establish realistic erasure for every feature added later.

## Examples and evidence scale

Table 1 (§7, p. 16) lists 12 examples with separate spec/proof/exec line counts and verification times. Selected examples:

- XOR doubly linked list: 116 spec, 118 proof, 151 executable lines; 5.03 seconds
- FIFO queue: 220 spec, 119 proof, 138 executable lines; 4.58 seconds
- Rc: 119 spec, 108 proof, 97 executable lines; 3.51 seconds
- RwLock: 200 spec, 80 proof, 145 executable lines; 4.44 seconds
- memoization: 23 spec, 2 proof, 43 executable lines; 2.28 seconds

These are curated demonstrations, not a percentage of arbitrary Rust programs supported or a measurement of autonomous proof synthesis. The paper reports a Rust compiler fork and a separate driver at publication time (§7); current packaging should be checked separately before reuse.

## Assumptions and limitations

Trusted primitives encode the conditions under which unsafe operations are safe. §3, p. 8, illustrates get_unchecked guarded by a valid-index contract. The proof verifies callers satisfy that contract; the primitive implementation and specification remain an assumption at this level.

§1, p. 3, describes the pointer model as only handling pointers into the global heap, without a complete aliasing/provenance model. §11, pp. 26–27, contrasts this with the fuller issues of stack pointers, fields, cell interiors, and Rust provenance. Mutable references are supported only as function arguments in the paper-time tool (§9, p. 17). Crate separation and more advanced traits/type systems have limits. §11, p. 26, says the RustBelt relaxed-atomic work is outside the tool's supported scope.

Neither the small calculus nor the examples establish correctness of user intent, standard-library axioms, all unsafe Rust, the implemented translation, Z3, or rustc. These remain separate boundaries, rather than one undifferentiated claim that Rust has been proved safe.

## What was already done; what VL can learn

The paper places its work alongside separation logic, GhostCell, Linear Dafny, ATS, and L3. §11, p. 27, explains the specific convenience: “The combination of SMT solving and Rust’s automated borrow checking” makes earlier permission ideas practical in a mainstream language. Linear permissions themselves are not new.

Agent recommendations: represent authority using existing ghost types; derive mathematical views independently of permission ownership; retain initialization states; choose focused induction and unfolding; diagnose type versus proof failures separately; reuse localized state-machine examples for concurrency. VL must still turn ordinary requirements into adequate contracts and discover which resource protocol the code needs. The demonstrations do not perform that task autonomously.

## Product threat

Agent inference: foundational dependency rather than an autonomous competitor. A product that only adds annotations around Verus cannot claim novelty for ownership-based ghost proofs, permissioned pointer APIs, invariant opening, or generated protocol tokens. A product that reliably infers guarantees and writes complete verified projects addresses a different unresolved step. The paper demonstrates manually structured verification and API design, with no agent success rate or repository-scale spec discovery evaluation.

## First reading

Read figure 2 on p. 6 and §10.1 on pp. 20–21. Ask: is a generated value an old description of state, or authority to change the current state?

## Study status

Checked the material claims and quotations against the saved primary paper text. An independent reviewer checked the drafts against the primary texts. No artifact execution or empirical reproduction was performed.

ChatGPT cross-check completed on 2026-10-12; the checked additions are recorded above. No artifact build or supplementary-proof audit was performed.

## ChatGPT cross-check (2026-10-12)

The complete ChatGPT answer was checked against `verus_linear.txt`. These additions hold:

- the formal metatheory is deliberately limited: “We do not attempt to capture all of the semantics of Rust and Verus” (§10, p. 18)
- the tool paper states that Verus “cannot reason about traditional Rust unsafe code” (§9, p. 17), while its pointer model only handles “pointers that point into heap allocations from the global memory allocator” (§11, p. 26)
- the memoization example explicitly assumes that `computation()` has a postcondition (§5.1, p. 13)
- the paper describes the displayed cases as “Example programs” (Table 1, p. 16), so the results do not provide a denominator for arbitrary-program success
- the paper says the full executable implementations are “too involved to show here” (§4.2, p. 11), limiting independent audit from the article alone

The answer also flags an editorial mismatch where §4.2 names `push_front` while Figure 6 shows `push_back`; this is visible in the source text but does not establish an implementation defect. Its threat ratings and other semantic inferences are opinions. No artifact build or supplementary-proof audit was performed.

## additional detail from §§7-10 of the same paper

The supplied paper's §§7-10 add implementation, user-experience, limitation, and formal-calculus detail (the separate extended version it cites was not read). Its Table 1 reports 12 examples, with spec/proof/exec source lines and verification time: allocator pages 5/0/18 (23 total, 0.1 s); XOR list 116/118/151 (385, 5.03 s); Fibonacci 20/16/22 (58, 2.19 s); vector 22/4/41 (67, 2.34 s); interner 88/20/88 (196, 3.22 s); memoization 23/2/43 (68, 2.28 s); PCell 0/6/12 (18, 2.21 s); PPtr 0/5/14 (19, 2.2 s); InvCell 21/9/42 (72, 2.24 s); FIFO queue 220/119/138 (477, 4.58 s); Verus Rc 119/108/97 (324, 3.51 s); Verus RwLock 200/80/145 (425, 4.44 s). The text says: “For each, we report the number of lines of spec, proof, and exec code, the time to verify the example, and interesting Verus features they employ” (§7, p. 16). These are author measurements on examples, not a benchmark denominator or proof of production-scale throughput.

The error-reporting workflow is itself a usable technique: let Rust reject aliasing before SMT, then fix contracts after Verus reports a failed precondition. In the paper’s transfer example, passing `&mut acct1` twice produces Rust error E0499; after using two accounts, transferring 20,000 fails `old(orig).balance >= amount`, and changing the amount to 10,000 verifies (§8, pp. 16–17). The authors write: “Verus would not attempt to invoke Z3 to verify the invalid program” (p. 17). This separates ownership/type failures from logical failures and avoids misdiagnosing aliasing as a missing invariant.

The extended limitations are concrete: only argument-position `&mut` borrows are supported; mutable references in return values and explicit right-hand-side assignment borrows are unsupported (§9, p. 17). Verus relies on Rust borrow checking and “cannot reason about traditional Rust unsafe code”; its encapsulations cover only some unsafe use cases. The model deliberately omits much of the implementation: it says, “We do not attempt to capture all of the semantics of Rust and Verus” (§10, p. 18), and focuses on modes, variables, annotations, linear ghost permissions, termination, and defaults. Thus the formal preservation/progress/termination results apply to the calculus, not automatically to every compiler feature or unsafe Rust behavior.

### techniques for the catalog (extended additions)

- staged diagnostics — run Rust borrow checking first, then repair Verus preconditions and assertions from precise failure locations
- evidence-scaled example accounting — report spec/proof/exec line counts and verification seconds per example, while retaining denominators and scope
- mode-calculus boundary — treat formal type-safety and termination theorems as applying to the stated small calculus, with omitted Rust/Verus semantics remaining trusted
Audited 2026-10-12 against the paper: checked every number (Table 1 rows and all five selected examples, E0499 / 20,000 / 10,000 transfer example), the mode table (Fig. 2), page references, quotations, the PPtr/PermData, InvCell/invariant, transition-system, dead-end, termination and CIC-translation claims, and the inference markers. Changed: (1) the sentence that linear does not mean consumed, which the paper's model contradicts (it prohibits discarding linear resources; Rust is affine); (2) the §10.3 quotation, which was cut so as to read as a result and now gives the paper's full sentence (a requirement for sound erasure); (3) the heading and opening of the 'extended-version additions' section, which wrongly called the supplied text an arXiv v2 extended version (the text is the OOPSLA article and cites the extended version separately); (4) page references: §7 quote is p. 16, not 15; the Z3 quote is p. 17, not 16. Not checked: the supplement, the extended version, and the artifact; the claims about the later VerusBelt and systems papers and the Study status process notes.
