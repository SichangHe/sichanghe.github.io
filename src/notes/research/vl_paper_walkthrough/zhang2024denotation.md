# Denotation-based Compositional Compiler Verification
(authored by agents unless marked 🧑)
Tag: `cheng2026denotation`, [paper](https://doi.org/10.1145/3797874)

## result

Cheng, Wu, Wang, and Cao develop compiler verification using denotations, mathematical descriptions of program behavior. Their abstract states: “Our denotational semantics is defined by semantic functions that map a syntactic component to a semantic domain composed of multiple behavioral sets, with compiler correctness established through behavior refinement between the semantic domains of the source and target programs.” (Abstract, p. 1). They apply the framework to the CompCert front end and prototype optimizations: “We apply our denotation-based framework to verify the front-end of CompCert and typical optimizations on simple prototypes of imperative languages.” (Abstract, p. 1).

Inference: the reusable workflow is to define behavior sets and their composition, specify source–target correspondence, prove each transformation, and compose the proofs across phases and modules. The Rust/Verus suggestions below are proposed adaptations, not results established by this paper.

## technique: denotations as behavior sets

For the toy WHILE language, normal termination relates initial and final states, while divergence is a predicate on initial states. The paper explains: “The interesting case is that the while statement diverges if and only if either the loop body 𝑐 diverges after a finite number of normally executing 𝑐, or 𝑐 is executed an infinite number of times.” (Section 3.1, p. 10). Its equations define normal sequential execution by relation composition and normal loop execution by reflexive-transitive closure, followed by the false-condition test (Section 3.1, p. 9).

For practical languages, traces record observable events. “Diverging behavior is divided into finite and infinite parts for distinguishing behaviors with finite events and infinite events.” (Section 3.1, p. 10). Thus `fin_dvg` means divergence with finitely many events, not an execution that ends after finitely many steps. Clight's record also separates normal termination, abortion, calls, and control-flow exits: “Additionally, the sets brk, ctn, and rtn are introduced to account for Clight’s structured control flow, corresponding to the break, continue, and return statements.” (Section 6.1, p. 19). Csharpminor and Cminor instead use `blk`, indexed by an exit number (Sections 3.2 and 6.6, pp. 11, 26–27).

Silent and nonsilent filters distinguish iterations that emit no events from those that emit events; their definitions and loop-divergence equations appear in Section 3.3, pp. 11–12. Inference: a Rust model could similarly separate returns, aborts, and divergence, with finite event sequences for completed observations and a separate model for infinite traces. Any Verus implementation would need its own definitions and proofs; this study does not establish their feasibility.

## technique: open modules and semantic linking

An open module may call procedures defined elsewhere. Its semantics depends on an oracle for external calls: “In comparison, the semantics of an open module depends on the semantics of external procedures only.” (Section 4.2.1, p. 14). Equation (7) defines normal behavior by a least fixed point over internal procedure calls, retaining the external oracle (pp. 13–14).

Linking makes calls between the linked modules internal. The paper states: “As we can see, similar to the semantic definition of modules, the semantic linking between two modules is defined by merging their denotations as if all the procedures reside in one module and then taking the fixed point.” (Section 4.2.2, p. 14). Theorem 4.1 identifies this semantic linking with syntactically putting modules together; Theorem 4.2 supplies the Bekić fixed-point theorem used in the proof (pp. 14–15). This least-fixed-point construction describes normal termination; divergence and calls require the additional constructions in Section 4.3, pp. 15–16. Sections 6.4–6.5 extend the construction to Clight's traces and aborts (pp. 24–25).

Inference: to adapt this technique, define a call interface, model unresolved callees with an oracle, define internal-call behavior, and prove that combining the semantic models agrees with combining module definitions. A bounded-call-depth approximation could be a simpler initial Rust/Verus experiment, but would not establish the paper's unbounded result.

## technique: behavior refinement with state matching

When compilation changes state representation, refinement uses a relation between source and target states, rather than plain inclusion of their denotations (Equation (2), Section 1, p. 2). For undefined behavior, the paper permits a source abort after a prefix of the target trace. Its restriction on target aborts is explicit: “Furthermore, though not depicted in Fig. 7, the definition also requires that if the target program may abort, then the corresponding source program may abort as well.” (Section 7.1, pp. 29–30). Example 7.4 gives the exact normal, aborting, and two divergence obligations; the source-abort alternative requires its trace to be a prefix of the target trace (p. 29).

Inference: an adaptation should state the representation relation explicitly, prove normal-result correspondence or the permitted source-abort alternative, prove abort preservation, and cover both kinds of divergence. For Rust/Verus, finite traces could be represented as ghost sequences and representation relations as specification predicates. The choice of relation defines the intended correctness property and needs justification; merely proving a weak relation does not establish the desired property.

## technique: refinement algebra and proof automation

A refinement algebra packages source safe behaviors, source aborting behaviors, target behaviors, and a monotone function `γ` that converts the two source sets into permitted target behaviors (Definition 7.13, p. 33). The two arguments allow matching final states for safe executions without requiring a final source state after an abort (Section 7.6, pp. 40–41). The paper's motivation is: “Since the union and composition operators are ubiquitous in the semantic definition of composite statements, we define the following enhanced RAs to facilitate structured compiler verification.” (Section 7.3, p. 35). Additional preservation laws handle finite and infinite iteration (Definitions 7.25–7.26, pp. 35–36).

The automation separates refinement reasoning from relation algebra: “The gamma_simpl tactic automatically reduces the behavior refinement between source and target programs to relational propositions of extended KATs, by properties of refinement algebras.” (Section 8.1, p. 42). Here KAT means Kleene Algebra with Tests, the algebra of composition, choice, iteration, and condition tests introduced in Sections 2.2–3.1. The next tactic completes those algebraic obligations: “The solvefix tactic mechanically verifies these relational propositions by properties of extended KATs.” (Section 8.1, p. 42). Its scope is limited: “More general cases with infinity operators are undecidable and must be handled manually.” (Section 8.1, p. 44). Atomic statements are proved directly from their definitions, reusing some CompCert expression proofs (pp. 43–44).

Inference: a Rust/Verus adaptation could first prove reusable composition lemmas for a chosen representation relation and abort policy, then apply them to syntax constructors. Reproducing the Rocq tactics is a separate implementation task.

## technique: Kripke interfaces for modules

Kripke worlds index the relations between source and target states. A Kripke interface relation adds an accessibility relation describing allowed changes of world, together with world-indexed query and reply relations (Definitions 7.6–7.7, p. 30). Their purpose is stated explicitly: “Specifically, the evolution of worlds in the callee’s behavior refinement provides the rely condition for the caller’s behavior refinement.” (Section 7.1, p. 31). Section 7.5 instantiates this machinery with memory injections and protection of private memory for Cminorgen (pp. 38–39).

Theorem 8.10 composes compilation phases, and Theorem 8.11 composes modules under a common interface relation (Section 8.3, p. 45). The final Theorem 8.14 gives refinement for syntactically linked Cminor modules separately compiled from Clight modules by the CompCert front end (p. 46). Inference: an API verification experiment could use ghost worlds for memory correspondence and permitted changes across calls, with explicit query/reply proof obligations.

## evidence and limits

The authors report mechanization: “All results of this article are formalized in Rocq (formerly Coq).” (Section 1, p. 4). The verified passes are Cshmgen and Cminorgen (Theorems 8.2–8.3, p. 44); additional results cover constant propagation, dead code elimination, and CFG generation on trace-enriched toy languages (Theorems 8.4–8.8, p. 45). Table 5 reports significant lines relative to CompCert v3.11. The authors state: “Our verification for the CompCert front-end is 5,539 lines in total” and “which increases only 57 lines relative to the CompCert v3.11’s 5,482 lines.” (Section 10, p. 52; excerpts from one sentence). The toy-language demonstrations have 2,151 definition lines and 5,103 proof lines (Section 10, p. 53). Table 7 reports additional code for procedure calls and unconditional branching (pp. 53–54). Inference: these measurements describe mechanization size, not runtime speed.

The connection to CompCert's original small-step semantics remains incomplete. The supplementary equivalence proof covers extended WHILE and CFG with I/O events, but: “However, this proof does not yet cover three features of Clight—namely, procedure calls, unconditional branching (e.g., goto), and structured control flow (e.g., break and continue).” (Section 11, p. 54). Other scope limits are explicit: “Moreover, we have not yet addressed concurrent settings or higher-order features (i.e., features of higher-order languages).” and “Furthermore, unlike interaction trees or small-step semantics, our semantics is not directly executable.” (Section 11, p. 57).

Inference: for VL, the useful experiment is explicit behavior refinement for a Rust API or transformation with a justified state relation. This paper does not establish Rust/Verus results, and its reported Rocq development was not independently rebuilt in this check.

## techniques for the catalog

- behavior-set denotations — separate normal, aborting, and divergent behaviors and compose their traces algebraically
- open-module fixed-point linking — parameterize module semantics by external-call oracles and resolve internal calls using fixed points
- state-matching behavior refinement — relate source and target representations and preserve behavior up to the source-abort policy
- refinement algebra — compose refinement obligations using preservation laws, then solve the resulting relation algebra
- Kripke interface composition — index query/reply relations by worlds and compose compilation phases and modules

Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "Since the union and composition operators are ubiquitous in the semantic definition of composite statements, we define the following enhanced RAs to facilitate structured compiler verification."): checked the whole paper and study, quotations, numbers, section/page references, technique steps, and scope; corrected the author/year tag and DOI link, quotations and references, explained refinement algebra and divergence, marked adaptations as Inference, and added the incomplete Clight semantics-equivalence proof; did not rebuild Rocq proofs, inspect the implementation, or verify the proposed Rust/Verus adaptations.
