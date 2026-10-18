# The Usability of Advanced Type Systems: Rust as a Case Study
(authored by agents unless marked 🧑)
Tag: `ferdowsi2023usability`, [paper](http://arxiv.org/abs/2301.02308v1)

## focus and evidence

This report (Kasra Ferdowsi, a UC San Diego research exam dated April 27, 2022) is a literature survey of empirical work on Rust ownership, borrowing, lifetimes, unsafe code, error messages, and visualization tools, followed by proposals for future work. It runs no experiments of its own and says nothing about formal verification. Inference: its relevance to Verus is indirect. A verifier adds contracts and proof obligations on top of Rust’s ownership model, so the adoption barriers found here are plausibly a lower bound on the difficulty of verified Rust; the paper does not test this.

The abstract says the surveyed studies found that “these rules come with a steep learning curve and have been repeatedly cited as a barrier to adopting Rust.” (abstract, p. 1; “these rules” are Rust’s Ownership and Lifetime rules). The paper summarizes Rust’s ownership rules, taking them from Crichton 2020, as: “(a) All values have exactly one owner. (b) A reference to a value cannot outlive the owner. (c) A value can have one mutable reference or many immutable references.” (Section 3.1, p. 5)

## technique 1: teach ownership with minimal executable counterexamples

what it is and when to use it

Use small compilable examples that each violate one ownership rule, so the compiler flags the violating line. The paper uses such examples only as illustrations of the three rules (Figure 1); it does not present or test them as a teaching method. The technique as a teaching method is an inference.

steps and examples from the paper

1. show move invalidation: `let v = vec![1, 2]; let v2 = v; print(&v);`; after ownership of the vector moves to `v2`, `v` cannot be borrowed for the call to `print` (Figure 1a, p. 5)
2. show a reference outliving its owner: create `x = &v[0]`, move `v` to `v2`, then use `x` (`let y = *x + 1`); `x` lives until its last use but `v` only lives until the transfer (Figure 1b, p. 5)
3. show conflicting borrows: create an immutable `x = &v[0]` on a `mut` vector, then call `Vec::push(&mut v, 3)` before the last use of `x`, so `v` cannot be mutably borrowed (Figure 1c, p. 5)
4. state the ownership rule that each example breaks; the paper’s description is that the compiler’s borrow-checker “fails if it cannot statically determine that all of these rules are being followed” (Section 3.1, p. 5)

Verus form

Inference: use the same tiny counterexamples before introducing `requires`, `ensures`, or `proof fn`. Verus inherits Rust ownership, so students must first make the executable code borrow-check. Then add one contract at a time and show the verifier’s obligation. Ownership examples teach aliasing discipline; they do not prove functional correctness or establish that a contract is adequate.

Caveat from the paper (Section 4.2.3, p. 11): the borrow-checker is incomplete, and similar-looking code can be accepted or rejected (Figure 3), so counterexamples that teach the three rules do not teach what the checker will actually accept.

## technique 2: make lifetime relationships explicit at API boundaries

what it is and when to use it

The paper says Rust infers all lifetimes in function bodies, but that “when writing functions that have references in their signatures, or data types which store references, Rust requires users to explicitly write them as generic functions/data types over the lifetimes of those references” (Section 3.2, p. 6). Footnote 4 notes an exception: simple signature patterns (no returned reference, or exactly one reference taken and one returned) have their lifetimes elided, which the paper says is not inference. Inference: explicit annotations are therefore what you write when designing APIs or storing references.

The paper quotes Fulton et al. 2021: “A lifetime names a scope, and a lifetime annotation on a reference tells the compiler the reference is valid only within that scope.” (Section 3.2, p. 6) Figure 2 defines `Foo<'small, 'large: 'small>` and `fn new(x: &'s str, y: &'l str)` in `impl<'s, 'l: 's>`, then constructs it from `mystr` and `substr`; it compiles because `substr` borrows `mystr`, so its lifetime must be smaller than that of `mystr`, which satisfies the subtyping requirement (Figure 2, p. 6).

Verus form

Inference: expose lifetime relationships through Rust signatures and use Verus contracts for value relationships that lifetimes cannot express, such as sortedness, ownership-transfer postconditions, or abstract resource invariants. The paper says lifetimes are “notoriously complex and difficult” (Section 3.2, p. 6) and that understanding them remains a problem for experienced developers (Section 4.1.2, p. 9); it gives no guidance on where to place lifetime parameters, so the advice to keep them at boundaries is not from the paper.

## technique 3: use safe wrappers around unsafe implementation

what it is and when to use it

Per Section 3.3 (p. 7), Rust’s ownership rules are sound but undecidable, so the borrow-checker is incomplete and rejects safe code; users can mark code `unsafe`, which allows the code to: dereference raw pointers; call unsafe functions (including C functions, compiler intrinsics, and the raw allocator); implement unsafe traits; mutate statics; access fields of unions. The paper notes that dereferencing raw pointers can create multiple mutable references to a value at once, “which violates the third rule of Ownership.” The paper describes the pattern of library functions that use unsafe blocks internally but expose a safe interface as “interior unsafe” (Section 4.3, p. 12), and notes that `iter_mut` uses unsafe internally yet is safe for novices to call (footnote 8, p. 11). It states good patterns such as interior unsafe, code reviews, and better tools “could alleviate many causes for these bugs” (Section 4.3, p. 12).

Evidence about prevalence (Section 4.3, p. 12): Evans et al. found explicit unsafe blocks in 29% of all libraries on the Rust registry, rising to 52.5% among the most popular libraries (accounting for 90% of downloads). In the 5 applications Qin et al. inspected, they found 4990 uses of unsafe, with a further 1581 unsafe code regions in the standard library. Of the 110 StackOverflow errors Zhu et al. studied, only 3 were fixed by writing unsafe code. Inference: these figures come from different populations (registry libraries, five applications, the standard library, StackOverflow questions) and should not be combined into one rate.

Verus form

Inference: put unsafe operations in a narrow trusted boundary (for example `external_body`) only when the surrounding Verus model supplies a contract for the behavior; do not mark the function under verification as external. Prove safe wrappers’ preconditions and postconditions, and separately document hardware, FFI, allocator, and aliasing assumptions. The paper does not evaluate Verus or show that wrapped unsafe code is sound; it reports, in paraphrase, that Qin et al. found memory bugs related to unsafe code have “more to do with the complexity of the type system (and lifetimes especially), and not developer negligence” (Section 4.3, p. 12).

## technique 4: diagnose adoption barriers with mixed empirical methods

The surveyed work (five major papers on Ownership usability, Section 4, p. 7) combines content analysis, interviews, surveys, controlled experiments, code inspection, and StackOverflow analysis. Zeng and Crichton did content analysis of /r/rust and Hacker News, covering 18 experience reports and language comparisons; Fulton et al. interviewed 16 industry professionals and ran an online survey with 178 more participants. Coblenz et al. ran a controlled study of 428 students in a sophomore-level course after two weeks of Rust lectures. Students using the garbage-collected “Bronze” wrapper on average took only a third as much (self-reported) time and were “approximately 2.44 times more likely to complete the assignment”; the time difference appeared only in the second part of the task (complex aliasing and mutability), not in the ownership-only first part (Section 4.1.1, p. 8).

Experienced programmers also struggle (Section 4.1.2, p. 9). Qin et al. inspected five Rust systems and applications, five popular libraries, and two vulnerability databases, and found that a common reason for blocking bugs was a lack of “good understanding in Rust’s lifetime rules.” The Rust community’s 2020 survey had 8323 responses and found lifetimes the most difficult topic to learn; the paper notes it does not report how this varies with expertise. In 100 sampled StackOverflow questions, Zhu et al. found the most common cause of safety rule violations was “complex lifetime computation”, appearing 74 times (excluding 3 syntax errors from the original 77): 44 in intraprocedural lifetime computation, 16 in explicit lifetime parameters, and 14 in elided ones. Inference: these are observational findings and do not show that lifetimes alone caused each bug.

The paper identifies a gap in this literature: no deep qualitative understanding of how Rust programmers write code (Section 5.3, p. 15).

Inference: VL should measure proof onboarding with the same mixed-method discipline: controlled tasks for contract writing, interviews for mental models, and repository studies for recurring proof failures. A single completion rate will hide whether users fail at Rust ownership, specification design, or solver interaction.

## technique 5: improve diagnostics and visualize hidden state

The paper names three apparent reasons Ownership is difficult: Rust’s different paradigm, unhelpful error messages, and the incompleteness of the borrow-checker (Sections 4.2.1 to 4.2.3, pp. 9 to 11). On messages, rustc messages sometimes suggest local edits but give no high-level design feedback, and Coblenz et al. concluded that they do not “aid design or comprehension” (Section 4.2.2, p. 10). In Zhu et al.’s analysis of 110 Ownership errors, most error messages contained all relevant information, but for 32 errors the message failed to explain “the key steps in computing a lifetime or a borrowing relationship”, for 10 it failed to “explain the relationship between two lifetime annotations”, and for 9 “how a safety rule works on a particular code construct” (Section 4.2.2, p. 10). The paper also notes the community consensus that Rust’s error messages are more helpful than most languages’ (Section 5.1, p. 13).

Three visualization tools are described (Section 5.2, pp. 13 to 14): RustViz requires a teacher to annotate the code being visualized, but the resulting visualization is interactive (hovering shows a description of events). Dietler’s thesis uses Polonius to extract lifetime constraints and show them as a directed graph. Blaser’s thesis added an algorithm that filters the complete graph to a single path containing the constraints relevant to the error, a Visual Studio Code extension called “Rust Life Assistant”, and an algorithm that turns the graph into a bullet-point list of English text. The paper states that none of them has been evaluated on users.

Inference: a Verus IDE should show the contract, borrow/lifetime facts, and failed obligation together, with a minimal dependency path rather than a full solver trace. This is a design recommendation derived from the paper, not a reported Verus result.

## what is established and what VL should not redo

Established by the surveyed studies (paper’s own conclusion, Section 4.1.2, p. 9: “it seems safe to conclude that Rust’s Ownership rules are indeed difficult to learn”): ownership is a barrier for novices, and lifetimes remain a problem for experienced developers; in the one controlled study the difference arose in the complex aliasing and mutability part; explicit unsafe is common (29% to 52.5% of libraries by Evans et al.) but most codebases do not contain it, and few StackOverflow errors needed it. Not established: visualization tools have no user evaluation, and no study shows which diagnostics fix the problem. The paper recommends building a grounded theory of “How Rust Programmers Write Code”: an iterative process of collecting data through interviews and observations and using open-coding (Section 5.3, p. 15).

The paper does not measure Verus proof effort, specification errors, or solver instability, and does not discuss verified Rust or AI-generated code. Inference: VL should not redo a generic claim that Rust ownership is hard. It should measure the additional burden of contracts and proof repair, identify which diagnostics reduce that burden, and test whether safe wrappers and visualization improve verified-code completion without weakening specifications. Inference, untested: agents may generate code that compiles but leaves users unable to maintain contracts, understand failures, or detect an unsafe assumption; nothing in the paper measures this.

## techniques for the catalog
- counterexample teaching: isolate one ownership rule in a tiny Rust program and let compiler diagnostics expose the violation (inference from the paper’s Figure 1)
- explicit lifetime APIs: write lifetime parameters in reference-bearing signatures and data types, and use contracts for properties lifetimes cannot express
- unsafe encapsulation: confine raw-pointer and FFI operations behind small safe interfaces (the paper’s “interior unsafe”) with explicit safety contracts
- mixed usability evaluation: combine content analysis, interviews, surveys, controlled tasks, and repository studies
- obligation visualization: display the minimal lifetime, borrow, and contract facts that explain a failed verification obligation (inference; the paper’s tools are unevaluated)

Checked 2026-10-18 against the full paper by a Claude agent (mid-paper quote: "It conservatively assumes that both lines 2 and 3 in Fig. 3a are mutably borrowing the entire vector, thus violating Rule (c) in Sec. 3.1."): read all 15 pages of text and the reference list, then checked every quotation, number (428, 2.44, 16, 178, 18, 8323, 74/44/16/14, 32/110/10/9, 29%, 52.5%, 4990, 1581), figure and section/page reference, and the arXiv id 2301.02308 (the link is kept; it matches the arXiv stamp in the paper); changed the abstract quotation (the old one spliced non-adjacent text with an ellipsis), the “aid design or comprehension” quotation, attributions (Crichton 2020 rules, Fulton et al. lifetime quote, Evans et al. and Qin et al. figures), “crates” to libraries, the overclaim that Qin et al. “attributed” blocking bugs to lifetimes, the unsafe-capabilities list, the description of Rust Life Assistant versus the filtering algorithm (Blaser) and the graph tool (Dietler), and the unsupported claims about teaching, lifetime placement and agent risk, now marked Inference or removed; did not check the cited primary studies, the Verus-specific advice (`external_body` and trusted boundaries), or pages of the PDF visually (figures were checked in the text extraction only).
