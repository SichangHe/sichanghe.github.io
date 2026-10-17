# IronSpec: Increasing the Reliability of Formal Specifications
(authored by agents unless marked 🧑)
Tag: `goldweber2024ironspec`, [paper](https://www.usenix.org/conference/osdi24/presentation/goldweber)

## scope and result
IronSpec tests formal specifications with or without a passing implementation proof. The paper's premise is that specs are trusted: a too-weak spec can hide an implementation bug behind a passing proof, while a too-strong spec can exclude desired behavior. It defines a too-weak spec as one that permits an undesired implementation and a too-strong spec as one that rules out desired behavior. “The correctness of specifications is the rock upon which the entire edifice of formal verification is built.” (section 1, p. 875). IronSpec has three components: an Automatic Sanity Checker (ASC), Spec-Testing Proofs (STPs), and proof-guided mutation testing (section 4, p. 879).

Inference: a Verus project should test contracts independently of the Rust implementation. This is a direct defense against a generated proof that proves the wrong property; IronSpec itself is a Dafny prototype, so the Verus mapping below is an inference.

## technique: automatic sanity checking

What it is. ASC traverses a method's abstract syntax tree and flags unconstrained input/output. Table 1 assigns HIGH severity when no postcondition depends on any input or no output is constrained, MED when only part of the output is constrained, and LOW when postconditions depend on only part of the input (p. 879). The paper's incorrect Sort spec only proves output ordering and permits `return []`; the correct spec adds `multiset(input) == multiset(output)` (Specifications 1–2, p. 877). “The Automatic Sanity Checker (ASC) examines the input, output, and spec of verified methods to identify cases where the spec may be weaker than intended.” (section 4.1, p. 879).

How to apply it.
1. Traverse the method's abstract syntax tree, tracking which inputs the postconditions depend on and which outputs they constrain (section 4.1, p. 879).
2. Report complete and partial omissions with the severities in Table 1 (p. 879).
3. Investigate the flags with STPs; unspecified output fields may or may not be critical for safety (section 5.1, p. 883).
4. If unintended behavior is permitted, prove a concrete Counterexample STP to confirm the bug (section 4.2, p. 880). A failed counterexample proof alone does not dismiss the flag.

Verus form. Inference: a Rust tool can inspect `requires` and `ensures` expressions in the Verus AST, collect free variables and output fields, and report unconstrained values before verification. A manual Verus `proof fn` can then instantiate the contract with a concrete input/output pair. This is a lint and proof workflow, not a runtime check.

Evidence and limits. ASC is approximately 300 lines of C# (section 4.1, p. 879). Applying it to six open-source verified systems led to five bugs across three specs; one was found immediately by a high flag and each of the other four in under an hour by STPs from medium flags (section 5.1, p. 883). It only detects under-constraint patterns; it cannot establish that the remaining specification matches intent, and the final oracle is the developer.

## technique: Spec-Testing Proofs

What it is. An STP is a small proof about specific values or a range of values. Four classes test Usefulness, Correctness, Provability, and counterexamples to intended behavior. The paper states, “An STP is, by definition, a proof; this is the key difference between STPs and standard unit tests.” (section 3.1, p. 878).

How to apply it.
1. Write a Usefulness STP with a concrete intended-valid input and `ensures Precondition(in)` (Lemma 3, p. 880).
2. Write a Correctness STP with an intended-invalid output, proving both `Precondition(in)` and `!Postcondition(in,out)`. Ideally, validate the input with a separate Usefulness STP (section 4.2.1, p. 880).
3. Write Provability STPs to check that intended-invalid inputs fail the precondition and intended-valid input/output pairs satisfy the precondition and postcondition. These are most useful before a passing implementation proof, but can also test state-machine transitions afterward (section 4.2.1, p. 880).
4. When an STP fails, first negate its conclusion. A passing Counterexample STP can show either that an intended-invalid case is accepted or that an intended-valid case is rejected (sections 4.2.1–4.2.2, p. 880).
5. Add proof annotations only after this negation test; a failed original STP may otherwise be a missing proof step rather than a spec bug (section 4.2.2).

The paper's Sort example uses `input == [42, 1, 500]`, `sorted == [42, 500]`, and `ensures !SortSpec(input, sorted)` as a Correctness STP (Lemma 5, p. 880). Its QBFT example fixes concrete `ProposalMsg` and `NewBlockMsg` sets and checks `AdversaryNext` (Lemma 8, p. 884).

Verus form. Inference: write standalone `proof fn` lemmas with concrete `requires` and `ensures`; call them only from proof contexts. Use Verus sequences and multisets in the same contract shape. A failed proof alone is inconclusive; a passing counterexample proof confirms the mismatch with the stated intent.

Evidence and limits. In 70 STPs for five contrived specs, all introduced bugs were identified; 21 (30%) needed proof help, averaging 1.7 added lines each (section 5.2.1, p. 884). STPs for the six open-source systems identified ten bugs overall. STPs require understanding intended behavior, and the paper reports from hours to days for comprehensive suites on large QBFT/DVT specs (section 5.4, p. 888).

## technique: proof-guided mutation testing

What it is. IronSpec generates one syntactic mutation at a time and discards mutations proved logically redundant. Retained mutations can be strictly stronger or partly stronger and partly weaker than the original spec (Figure 1, section 4.3.2, p. 882). It then runs three verification-assisted passes: logical redundancy, vacuity, and the full proof. A surviving mutation is “alive” and flags behavior allowed by the original but excluded by the mutation. “The existence of even a single alive spec mutation serves as a flag to the developer.” (section 3.2, p. 878).

How to apply it.
1. Generate single-operator mutations over the Dafny AST; Table 2 lists Arithmetic Operator Replacement, Logical Operator Replacement, Relational Operator Replacement, Constant Operator Insertion, Unary Operator Replacement, Expression Negation Operator, Variable Name Operator Replacement, Set Operator Replacement, and Heap Operator Replacement (p. 881).
2. For a postcondition mutation, try to prove `OriginalPredicate(p) ==> MutatedPredicate(p)`; if proved, discard the mutation as equivalent or weaker. For preconditions, reverse the implication and discard equivalent or stronger predicates, which likewise weaken the overall contract. Test the overall safety property rather than just the mutated subexpression (Lemma 6, section 4.3.2, pp. 881–882).
3. Check vacuity over the full caller path, because a mutation can make a transition false and the caller trivially true (section 4.3.3, p. 882).
4. Re-run the complete implementation proof with the mutated spec; a passing proof leaves the mutation alive (section 4.3.4, p. 882).
5. Build a directed acyclic graph (DAG) ordered by mutation strength and report only roots of connected components (section 4.3.5, p. 882).
6. Work backward from each alive mutation's difference `S - S'` to construct a focused STP; human judgment decides whether the behavior is intended (section 4.4, pp. 882–883).

Verus form. Inference: a mutation tool can rewrite Verus contract ASTs and generate implication lemmas with `requires`/`ensures`; run the Verus verifier on each candidate and retain candidates that survive the redundancy and vacuity checks and whose full proof succeeds. Porting the operators and vacuity analysis would require a Verus implementation.

Evidence and limits. The authors report, “Of the 61 alive mutations identified across all tested specs, we consider 13 to be false positives, because the spec weaknesses they hint at were deemed intended.” (section 5.3.4, p. 887). They discuss restricted adversary behavior and underconstrained ghost state as sources of false positives. For daisy-nfsd, mutation runs took 4.3–4.6 minutes and exposed a known weakness; QBFT runs took 80–162 minutes per target (Table 4, p. 886). The method needs a passing implementation proof and can miss bugs where no mutation survives; it does not replace STPs.

## what is proved, trusted, and already covered
The paper reports verified testing lemmas and author-confirmed spec bugs. It states, “Since a spec is a formal expression of a developer’s intent, proving the spec correct is ultimately impossible.” (section 1, p. 875). Inference: the verifier, tool implementation, and test writer’s understanding remain assumptions of this workflow. IronSpec found ten spec bugs in six open-source systems, including QBFT, DVT, TrueSat, Eth2.0, daisy-nfsd, and AWS ESDK (sections 1 and 5, pp. 876, 883). Section 2 discusses prior findings of spec bugs in verified systems (p. 876). Inference: VL should adopt contract testing and investigate mutation hints rather than repeat that discovery.

Inference: the threat to VeruLaw is high whenever agents generate `ensures` clauses from an informal request: a syntactically valid, automatically proved contract may omit input/output relationships or constrain ghost state only. ASC-style linting, concrete STPs, and mutation survivors provide a practical review queue, but they cannot decide intent. IronSpec's prototype targets Dafny, and its 61/13 mutation result is not a probability of finding bugs in Verus.

## techniques for the catalog
- automatic sanity checking: flag input-independent and partially unconstrained outputs before relying on a proof
- Spec-Testing Proofs: prove concrete usefulness, correctness, provability, and counterexample lemmas against a contract
- proof-guided mutation testing: generate ordered contract mutations, filter by implication/vacuity/full proof, and investigate alive roots
- mutation-focused STPs: derive concrete tests from the behavior difference between an original and alive mutation
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "When testing a spec, the ultimate oracle is the test writer, thus the final step is always to write an STP."): checked every quotation, number, section/page reference, and technique step; corrected page references, STP conditions and failure interpretation, mutation filtering, attribution of the 61/13 result, and the publisher link; marked recommendations and trust assumptions as inferences; did not reproduce experiments, inspect the artifact, or validate the proposed Verus implementation.
