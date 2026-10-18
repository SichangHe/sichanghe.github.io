# Integrating Owicki-Gries for C11-Style Memory Models into Isabelle/HOL
(authored by agents unless marked 🧑)
Tag: `dalvandi2020integrating`, [paper](http://arxiv.org/abs/2004.02983v2)

## what the paper proves

Dalvandi, Dongol, and Doherty extend Nipkow and Nieto's Isabelle/HOL encoding of Owicki-Gries to an operational C11-style weak-memory model. The concrete instantiation is RC11-RAR (relaxed, release, and acquire accesses, with the load-buffering outcome disallowed). The paper's claim is a mechanised encoding in Isabelle, with its assertion lemmas proved sound against the encoded operational semantics, and successful verification of load-buffering, message passing, three RRC variants, and C11 Peterson mutual exclusion. (Section 5.1, p. 12: “Both lemmas are proved sound with respect to the operational semantics in Section 4.2.”; Section 7, p. 18.) The abstract states: “The technique introduces a set of high-level assertions over C11 states together with a set of basic Hoare-style axioms over atomic weak memory statements (e.g., reads/writes), but retains all other standard proof obligations for compound statements.” (Abstract, p. 1)

The Isabelle development is parameterised by an operational memory model. The authors say, “Our extension is parametric in the memory model, and can be adapted to reason about other C11-style operational models [24].” (Section 1, p. 2) Inference: the trusted base is therefore Isabelle/HOL's kernel plus the encoded operational semantics and its proved lemmas; the paper does not discuss its trusted base. The paper does not claim verification of a compiler, hardware, Rust implementation, or all C11: RC11-RAR disallows the load-buffering litmus test and the paper does not consider release sequences or non-atomic accesses (Section 4, p. 6).

## technique 1: embed weak-memory operations in Owicki-Gries

what it is

Represent the C11 graph state as one special field in the ordinary Isabelle state record, then add annotated commands for relaxed read/write, release write, acquire read, and atomic SWAP. Keep the existing syntax-directed Owicki-Gries rules for sequencing, conditionals, loops, parallel composition, and interference freedom.

when to use it

Use this when a concurrent program has an operational weak-memory semantics with annotated atomic operations. It lets the proof author write imperative proof outlines while reusing the standard compound-command calculus.

how to do it

1. Define a state record containing local registers and a `σ :: Cstate` weak-memory field. The paper says, “A weak memory state can be encoded as a special variable in the standard semantics.” (Section 3, p. 4)
2. Add commands for relaxed write/read, release write, acquire read, and SWAP. The required forms are shown as `AnnWrX`, `AnnWrR`, `AnnRdX`, `AnnRdA`, and `AnnSwap` (Section 3, pp. 4–5).
3. Translate each annotated command to an `AnnBasic` or atomic `AnnAwait` that applies the corresponding transition (`WrX`, `WrR`, `RdX`, `RdA`, or update) to `σ`; the read translation updates both `σ` and the destination register. Reads use an atomic AWAIT wrapper so the state update and register update cannot be interleaved (Section 3, pp. 5–6); SWAP is translated as `AnnBasic r (fst (Upd ´s x v t))`, and the text says only that its translation is similar to a read's (p. 6).
4. Use the existing `oghoare` tactic to generate local-correctness and interference-freedom obligations. The ordinary sequential-consistency example generates 29 obligations, all automatically discharged (Section 2, p. 4).

Verus form (inference)

Inference: model shared memory as a ghost/spec state and expose Rust operations whose `requires`/`ensures` contracts describe the transition. Use `proof fn` lemmas for transition properties and `atomic` Rust code or an explicit lock protocol for indivisible read-modify-write; Verus has no direct Isabelle `AnnAwait` or `oghoare` command. Ordinary Rust control flow remains ordinary, while each loop needs a `while ... invariant ...` clause. This is an inference because the paper targets Isabelle/HOL, not Verus.

evidence and limits

The paper verifies all listed examples, but gives no runtime benchmark and no denominator beyond the stated obligation counts. For Peterson, “The oghoare tactic generates 258 subgoals, but over half of these are discharged by step 2 above, leaving 91 subgoals.” (Section 5.5, p. 15) Repeated sledgehammer calls discharge the remainder, though the authors call this “rather tedious” (Section 5.5, p. 16). The model is limited to the RC11-RAR instantiation. Inference: portability to another memory model requires a new sound instantiation of the transition functions; the paper says only that the framework is parametric (Section 3, p. 4).

## technique 2: high-level C11 state assertions

what it is

Use assertions about observations, synchronisation, write order, value occurrence, and covered writes instead of exposing every graph relation. The assertion language includes definite observation `[x =t n] σ`, possible observation `[x ≈t n] σ`, conditional observation `[x = n]Ly =t mM σ`, possible/definite order `[m ≺x n] σ` and `[m ≺≺x n] σ`, occurrence predicates `[0x n]i` and `[1x n]`, encountered-value `enc[x =t n] σ`, and Peterson's `cvd[x,n] σ` (Sections 5.1–5.4, pp. 11–16).

when to use it

Inference: the selection guidance below is my paraphrase of the assertion definitions in Sections 5.1–5.4, pp. 11–15; the paper gives no decision rule. Choose a definite observation when a thread's viewfront guarantees the next read; a possible observation when a value may be read; a conditional observation for release/acquire transfer from one location to another; order and occurrence assertions for read-read coherence; and `cvd` for Peterson's covered-write reasoning.

how to do it

1. Initialise each thread's viewfront (and, in Fig. 7, the local registers) in the first proof-outline assertion (Figures 7–10, pp. 12–16).
2. For a definite observation, assert that the thread viewfront equals the last write and that write has the required value. The definition is: “[ x =t n ] σ ≡ tview σ t = lastWr σ x ∧ value σ ( lastWr σ x ) = n”. (Section 5.1, p. 11)
3. Preserve definite observations across reads and writes with the supplied lemmas. `d_obs_RdX_pres` handles a read; `d_obs_WrX_diff_var_pres` handles a write to another variable (Section 5.1, p. 12).
4. For message passing, state that all visible writes of value `n` to `x` are releasing and that acquiring `x` transfers a definite value for `y`. Apply `c_obs_intro` after a releasing write and `c_obs_transfer` after an acquiring read (Section 5.2, pp. 12–13).
5. For RRC, state timestamp order and value-occurrence facts. `[m ≺≺x n]` means every `n` write follows every `m` write; `[1x n]` means there has been at most one write with value `n` to `x`. Use these facts in thread assertions to derive the final read-order postcondition (Section 5.3, pp. 13–14).
6. For Peterson, add `cvd[turn,n]` assertions and ghost flags `after1`/`after2`; set a flag after `turn` is changed and clear it on exit. The paper warns that auxiliary variables must not be shared constants inside `σ` (Section 5.4, pp. 14–15).

Verus form (inference)

Inference: represent the weak state and viewfront relation as ghost datatypes, define predicates equivalent to these assertions, and state preservation/transfer as `proof fn` lemmas with `requires` and `ensures`. Use `assert` and quantified ghost facts to discharge read/write transitions. Verus's `invariant` is a loop annotation, not a function call; the paper's Isabelle predicate names and notation do not carry over directly. The conditional-observation proof becomes a lemma connecting an acquire operation's returned value to a release write's ghost state.

evidence and limits

The paper reports that the simple litmus proofs are discharged by the first two automation stages or leave at most six obligations, then sledgehammer closes them (Section 5.5, p. 15). It does not give per-example percentages or wall-clock times. Assertions are sound only relative to the encoded RC11-RAR transitions and well-formedness lemmas; a programmer must still invent the proof outline and suitable assertions.

## technique 3: two-stage proof automation

what it is

Separate structural generation from weak-memory reasoning. First generate standard Owicki-Gries obligations; then normalise assertions so specialised lemmas match; finally invoke automation for residual arithmetic or logical goals.

how to do it

1. Run `oghoare` unchanged on the annotated program. The paper says, “First, we use the built-in oghoare tactic to reduce an Owicki-Gries proof outline into a set of basic Hoare logic proof obligations over weak memory pre-post state assertions.” (Section 5.5, p. 15)
2. Pipe the obligations to Isabelle's simplifier, converting Nipkow–Nieto's set representation into predicate form so adapted weak-memory lemmas match.
3. For simple tests, invoke sledgehammer on the few remaining goals (at most six); for Peterson, apply repeated sledgehammer calls or short `apply` proofs after recognising common patterns (Section 5.5, pp. 15–16).

Verus form (inference)

Inference: an analogous Verus pipeline would generate or write contracts first, run `verus` to simplify and prove routine obligations, then add named `proof fn` lemmas for weak-memory predicates and invoke solver-friendly `assert`/`reveal` steps. There is no Verus equivalent of Isabelle's `sledgehammer` integration described by this paper.

evidence and limits

Every proof outline in the paper is reported verified (Section 7, p. 18). The strongest quantitative detail is Peterson's 258 generated subgoals and 91 left after simplification (Section 5.5, p. 15). Automation remains dependent on assertion design and can be tedious for large goals; no scalability study is reported.

## what is proved, measured, and trusted

The mechanised results the paper reports are lemmas proved sound with respect to the encoded operational semantics, stability of the well-formedness predicate `wfs` under each transition (Section 4.2, p. 11), and checked proof outlines for the examples; Section 6 (p. 17) says “the entire development of our framework is verified in Isabelle, down to the operational semantics”. The paper measures obligation counts, not performance: 29 obligations for the sequential message-passing illustration and 258/91 for Peterson. Inference: Isabelle's kernel, the RC11-RAR transition definitions, well-formedness assumptions, and the correctness of imported Isabelle tactics remain trusted; the paper does not list them. The paper does not claim compiler preservation, hardware implementation correspondence, absence of data races outside the model, or correctness of arbitrary C11 programs.

## contradictions, omissions, and product implications

No numerical contradiction appears in the paper; “over half” of 258 being discharged is consistent with 91 remaining, although the exact number discharged is not stated. Inference: a Verus-based agent product should reuse the separation between structural concurrency obligations and memory-model lemmas, because agents can generate proof outlines while a fixed library checks transitions. Inference: the main threat is specification error—an agent can produce a plausible outline with an unsound or mismatched memory model unless the operational semantics, well-formedness predicates, and lemmas are themselves fixed and reviewed. Existing Isabelle work means VL should not redo generic Owicki-Gries rules or the basic RC11-RAR assertion library without first checking whether equivalent Verus libraries already exist.

## techniques for the catalog

- weak-memory Owicki-Gries embedding — encode C11 state as a special variable and translate annotated reads/writes into atomic transitions while reusing compound-command rules
- high-level C11 assertions — express viewfront observations, release/acquire transfer, write order, value occurrence, and covered writes as reusable predicates and lemmas
- staged proof automation — run `oghoare`, simplify predicate representations, then discharge residual weak-memory goals with solver automation
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Finding such a timestamp is always possible since timestamps are rational numbers (i.e., are dense)."): read the whole paper text and the whole study; checked every quotation, the obligation counts (29; 258 and 91; at most 6), section and page references, the translation and verification-strategy steps, and the tag and arXiv link; changed the SWAP translation description, the release-sequence page reference (p. 6, not p. 9), several page ranges, the soundness and trusted-base claims (now marked Inference where the paper is silent), and the Section 1 quote's trailing citation; did not check the Isabelle ancillary files, the cited literature, or the Verus-form inferences against any tool.
