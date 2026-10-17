# Deductive Software Verification: From Pen-and-Paper Proofs to Industrial Tools
(authored by agents unless marked 🧑)
Tag: `hahnle2019deductive`, [paper](https://doi.org/10.1007/978-3-319-91908-9_18)

## scope and central model
This survey follows deductive verification from Floyd–Hoare proofs in the late 1960s to industrial tools. It defines the aim as verifying “that all possible behaviors of a given program satisfy formally defined, possibly complex properties, where the verification process is based on some form of logical inference” (Introduction, p. 345). Its scope is contract-based verification of imperative and object-oriented programs; it explicitly excludes model checking, SMT solvers, general proof assistants, program synthesis, correctness-by-construction, runtime verification, and abstract interpretation (Introduction, p. 346).

## technique 1: contracts and Hoare decomposition
When to use: specify method assumptions and guarantees, then decompose a program proof into smaller commands. The survey explains that “a precondition specifies the assumptions under which a method may be called; a postcondition specifies what is achieved by its implementation, e.g., the computed result, or its effect on the global state” (section 5.1, pp. 354–355). Its JML binary-search example (section 2, Fig. 1, pp. 346–347) uses a sortedness requirement, an ensures clause on the result, a loop invariant bounding the pivots, and a decreases clause “that becomes strictly smaller in each iteration” to ensure termination.

The composition rule (section 3, p. 350; written here on one line) derives `{P} S1; S2 {Q}` from `{P} S1 {R}` and `{R} S2 {Q}`. Apply it by finding an intermediate assertion `R` that S1 establishes and that is a sufficient precondition for S2 to establish `Q`. The survey notes that a VCG needs “loop invariants and method contracts for all methods called in the verified code” (section 3, p. 350). Inference: the loop invariant must be strong enough, together with the exit condition, to imply the postcondition.

Verus form (Inference): use `requires` for `P`, `ensures` for `Q`, `assert` or a lemma for `R`, `invariant` for loop facts, and `decreases` for termination. Rust ownership adds obligations absent from the survey’s Java examples; the survey’s client example had to state explicitly that two arrays are not aliased (section 2, p. 349).

## technique 2: weakest preconditions and VC generation
Dijkstra observed that one can compute the minimal precondition needed to establish a postcondition, so the intermediate assertion need not be invented; for sequencing, `wp(S1 ; S2 , Q) = wp(S1 , wp(S2 , Q))` (section 3, p. 350). The survey contrasts VCG with symbolic execution: “Tools based on VCG use transformation rules to reduce an annotated program to a set of verification conditions whose correctness entails correctness of the annotated program. Tools that use symbolic execution collect constraints on the program execution by executing the program with symbolic variables.” (section 4, p. 352).

The survey reports, citing Kassios et al., that symbolic execution tends to be faster than VCG but is sometimes less complete and occasionally suffers from path explosion; it attributes the completeness issue to the specific tool architecture in that study, and says path explosion can be mitigated with symbolic state merging (section 4, pp. 352–353). Inference: choose VCG when modular contracts and solver automation fit; choose symbolic execution when speed or path-level feedback matters more.

## technique 3: reuse intermediate verification languages
Boogie is described as “an intermediate specification and verification language and VCG tool chain, most often complemented by the SMT solver Z3”; it is a backend for Chalice, Dafny, Spec#, and VCC, and Silver reuses it as one of its backends; Silver in turn is a backend of VerCors (section 5.2, p. 356). WhyML is used by Frama-C and Krakatoa, and a Boogie-to-WhyML translation links the two strands (p. 356).

Apply this technique by keeping front ends language-specific while sharing a small verification IR and solver interface. The survey’s challenge I.1 asks to equip front-end and back-end languages “with precise, preferably formal, semantics” (p. 357), and challenge C.4 notes that translation to intermediate languages “makes it harder to provide feedback at the source level” (p. 361). Inference: Verus can serve as a Rust-facing proof language and backend, but reuse must preserve Rust ownership, lifetimes, traits, and unsafe boundaries; a Java-style IR cannot carry those facts automatically.

## technique 4: language coverage and graceful boundaries
The survey states that “for every construct of the programming language, verification techniques need to be developed (or at least, clear boundaries have to be provided, detailing what is covered, and what is not)”, and that an unsupported construct should preferably be ignored gracefully with a warning to the user (section 5.3, p. 359). State-of-the-art tools cover “a very large part of the sequential fragment of industrially-used languages” (Java, C, Eiffel, Ada), but reflection and Java lambdas are not supported (pp. 359–360). Many tools abstract away integer overflow or make it optional because it clutters specifications (p. 360).

Use a coverage matrix: list each language construct, its verification rule, supported variations, and warning behavior.

## technique 5: integration and usability evaluation
Integration has three levels: tool integration and reuse, combining different methods for complementary strengths, and fitting verification into a production environment “such that added value is perceived by its users” (section 5.2, p. 356). The survey says effectiveness claims are often backed only by execution statistics, “often micro benchmarks carried out on small language fragments”, or by case studies performed by the researchers themselves (section 6.1, pp. 361–362). It says: “To convince industrial stakeholders of the usefulness of a formal verification approach, it is not only necessary to demonstrate that it can fit into the existing development environment … but also to argue that one can solve tasks more effectively or faster than with a conventional solution.” (section 6.1, p. 362).

The survey finds “very few usability studies around formal verification tools” and poses challenge U.1: claims about increased effectiveness or productivity should be backed by experimental user studies (p. 362).

## what is proved, measured, and trusted
The survey synthesizes prior results; it does not present a new formal proof or a benchmark. Its only own measurement is the section 2 example: about one hour for an expert to specify and verify it, after which KeY verification is fully automatic in about 6 s; search() gave a proof tree of ca. 4,000 nodes and 27 branches (p. 349). Its other claims depend on cited tool papers and success stories.

## techniques for the catalog
- contract decomposition: state preconditions, postconditions, loop invariants, termination measures, and intermediate assertions
- weakest-precondition VCG: reduce annotated programs to solver-checkable conditions
- symbolic execution: accumulate path constraints and compare completeness and path-explosion tradeoffs
- intermediate-language reuse: separate language front ends from shared verification IRs and backends
- coverage matrices: define supported constructs and warn clearly at boundaries
- usability evaluation: compare verification effort and maintenance outcomes with conventional development
