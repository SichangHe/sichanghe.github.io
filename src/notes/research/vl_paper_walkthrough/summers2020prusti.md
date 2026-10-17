# Prusti: Deductive Verification for Rust (Keynote)
(authored by agents unless marked 🧑)
Tag: `summers2020prusti`, [paper](https://doi.org/10.1145/3427761.3432348)

## scope and result

This one-page keynote (the abstract calls the session a “tutorial”) is an overview of the Prusti project rather than a complete experiment paper. It states the design target and, in §1, says “To find out more about the Prusti Project, please see the flagship paper [1].” Reference [1] is the 2019 OOPSLA paper. The abstract says the project “leverages Rust’s type system and compiler analyses for formal verification of Rust code.” The abstract says that by combining “the rich information available about a type-checked Rust program with separate user-specification of intended behaviour, Prusti enables a user to verify functional correctness of their code without interacting with a complex program logic.”

The problem is the gap between memory safety and intended behavior. The paper states: “While this rules out a number of common errors, the question of whether a program behaves as intended remains.” The abstract says code type-checked by Rust's ownership system is, with the hedge “(almost; we’ll discuss this..)”, “free from dangling pointers, unexpected aliasing, race conditions and the like.” Inference: this means the type system does not by itself establish arbitrary functional postconditions, and the keynote's contribution is a workflow and abstraction boundary: let Rust and its compiler handle ownership facts, while the user writes behavior specifications.

## technique: compiler-assisted modular deductive verification

What it is. Prusti combines the information available about a type-checked Rust program with separate user specifications of intended behavior (abstract). The paper gives the title and keywords “Deductive Verification”, but does not define it. Inference: deductive here means the tool tries to prove the specified behavior for all executions admitted by its model. The author emphasizes the abstraction boundary: “specifications and all interactions with our implemented tool are at the level of abstraction of Rust expressions.”

When to use it. The abstract's stated use is verifying “functional correctness of their code”. Inference: use it when the desired claim is functional correctness of Rust code and the code falls in the subset Prusti supports (the paper does not describe the subset). Inference: it is most useful when manual ownership/permission reasoning would obscure the functional argument. The keynote presents the project as a response to the complexity of traditional formal methods: “Formal verification offers potential solutions to many of these problems, but typically at a very high price: the mathematical techniques employed are highly-complex, and difficult for even expert researchers to understand and apply.”

How to apply it. The paper gives no step list; steps 1-3 restate its abstract, and steps 4-5 are the study's reading of the abstract and §1 (Inference where marked).

1. Write Rust code that type-checks under Rust's ownership system (paper abstract, p. 1: “code type-checked by this system”)
2. Add user specifications for intended behavior at Rust-expression level (paper abstract, p. 1)
3. Let Prusti use compiler type information and analyses together with those specifications (paper abstract, p. 1)
4. Run the Prusti tool (Inference: and inspect its verification result). The abstract says “The tutorial includes live demos with the tool”; the paper gives no command lines, annotation syntax, benchmark setup, or theorem-prover details (abstract and §1, p. 1)
5. Consult the cited flagship paper [1] and the project website [2] for details the keynote omits (paper §1, p. 1; Inference: the paper says “to find out more”, not that [1] contains these particular details)

Verus form. Inference: the analogous Verus workflow is executable Rust plus `requires`, `ensures`, loop `invariant` clauses, and proof functions/lemmas. Inference: compiler ownership information should be treated as a foundation for the proof, while functional claims still need explicit specifications. Inference: unlike a Prusti implementation, Verus syntax and supported constructs must be checked against the local Verus reference; no Prusti annotation syntax is imported here.

## what the keynote establishes and omits

The keynote establishes a claim about project design, not a quantitative result. It reports no number of verified functions, lines, success rate, run time, solver, benchmark denominator, or soundness theorem. Its only pointers are the flagship paper, “Leveraging Rust types for modular specification and verification” (Proc. ACM Program. Lang. 3, OOPSLA, 2019, 147:1–147:30), the project website prusti.ethz.ch, and a Zulip chat stream. The keynote's one-page format means that steps beyond the high-level workflow are absent from this source and should not be invented as if they were reported here.

Inference: the paper does not discuss a trust boundary; the following is the study's reading. Rust type checking and compiler analyses are inputs to Prusti; Prusti's translation and verification engine, its logic, solver, and the correctness of user specifications would remain trusted or separately justified. Inference: the same boundary applies to agent-written Verus Rust. A passing proof establishes the written contract under the tool's model; it does not establish that the contract captures product intent or that unmodeled libraries and environments behave as assumed.

## relation to VL

Inference: this keynote is background rather than a technique catalog entry with new algorithms. VL can reuse its central separation of concerns: agents should state functional behavior in source-level terms while the verifier exploits ownership information automatically. VL should not claim that this source demonstrates Prusti's coverage, performance, or soundness; those claims require the cited flagship paper or tool artifacts. Inference: the threat to a product of agent-written verified Rust is medium when source-level contracts are explicit, and high when agents rely on Rust's memory safety as if it proved functional behavior.

## techniques for the catalog

- compiler-assisted specification: combine Rust compiler ownership/type facts with user-written functional contracts
- Rust-expression abstraction: keep specifications and tool interaction at the level of source-language expressions
- modular deductive verification: prove intended behavior separately from the language's memory-safety guarantees
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "Alex Summers works broadly on program correctness techniques and tools, specialising in particular on imperative concurrent languages, and modular deductive verification."): I read the whole one-page paper (abstract, biography, §1, references) and checked every quotation, the DOI and the reference [1] title against it; I added the paper's “(almost…)” hedge and the §1/[2]/[3] pointers, moved unsupported claims (what deductive means, when to use it, steps 4-5, trust boundary) under "Inference:", and corrected the step citations (live demos are in the abstract, not §1). Not checked: the flagship OOPSLA paper, the Prusti tool, and the Verus-related Inference lines, which rest on outside knowledge.
