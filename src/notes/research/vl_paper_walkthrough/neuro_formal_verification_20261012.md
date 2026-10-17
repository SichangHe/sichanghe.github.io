# Neuro-Formal Verification: Agentic Language-Agnostic Formal Program Reasoning
(authored by agents unless marked 🧑)
Tag: `lahiri2026neuroformal`, [paper](https://arxiv.org/abs/2608.21516v3)

Audit: audited 2026-10-13 against the paper; checked every number, table and page reference, quotation and step; changed the Verus refutation form (proof lemma cannot keep the executable body), the page of the abstention quotation, the attempt definition, the baseline evidence wording and the account of the five mutant proofs, and marked unmarked inferences.

## what is being verified

Neuro-formal verification (NFV) is a staged way to use an LLM to translate an ordinary-language correctness claim about a program into a verification-aware language, then return only a verdict backed by a machine-checked proof. The paper instantiates the idea with Python as source, Dafny as the deductive target, CBMC as a bounded target, and a 206-entry benchmark: 103 reference programs labeled correct and 103 mutants labeled incorrect. Its combined Dafny pipeline issued proofs for 128/206 entries, correctly resolving 118/206 (57.3% recall) at 118/128 (92.2% precision), with 10 wrong verdicts (Table 3, page 12).

The five stages are intent formalization, source translation, specification rendering, agentic proof or refutation search, and a returned verdict plus proof sketch. Inputs include source `P_L`, a natural-language property `S_nl`, and environment documentation `E_nl`. Stage 1 synthesizes an environment model `E_F` and source-language assertion `S_L`; stage 2 emits translated program `P_F`; stage 3 renders formal specification `S_F`; stage 4 adds proof material; stage 5 maps the result back to the developer. The measured implementation stops before stage-5 mapping and does not formally attest the generated environment model against documentation and tests. The paper states this scope explicitly: "Since NFV cannot ensure the soundness of the formalization — a correspondence that can only be loosely defined in the presence of informally stated environment assumptions" (abstract, page 1).

Inference: the proof kernel is the target verifier, but the LLM controls translation, environment modeling, preconditions, and candidate lemmas. A proof therefore establishes the claim about the frozen formal artifact and its formal environment. It does not by itself establish that the artifact means what the Python developer meant.

## technique 1: goal-blind staged translation with provenance and freeze checks

Use this whenever an agent could make a proof easy by changing the program, environment model, precondition, or goal. Before the property is visible, formalize every library surface the source touches and synthesize preconditions from the docstring. Freeze those artifacts. Translate each source line into the target and tag it `src:` if it quotes the source verbatim or `synth:` if it has no source counterpart. Reject untagged lines. Translation may retry on syntax/type/resolution errors only; it receives no verifier-goal feedback. Render the formal specification only after this translation is frozen. During proof repair, mechanically re-check all frozen source lines, environment theory, precondition, and goal on every round; only lemmas, invariants, and proof calls may change.

The paper explains the rationale: "both freeze before the specification is visible, so neither the library theory nor the precondition can be chosen to suit the goal" (Section 3.1.1, page 9). It also says, "Untagged code is rejected — without that rule, rewritten logic hides in lines the audit cannot see" (Section 3.1.1, page 9). The running `shifted_mean` artifact keeps the Python return line as a `src:` line and models `sum` and the generator expression as separate `synth:` functions.

For Verus, use a Rust source snapshot or hash for every translated executable statement, a `spec fn` model for each documented library operation, and explicit `requires`/`ensures` generated before proof search. Treat loop invariants, decreases clauses, and helper `proof fn`s as synthesized. A checker should reject changes to Rust code, specs, or assumptions while accepting changes only in proof blocks. This is an inference: the paper evaluates Dafny and does not provide a Verus implementation.

The evidence is a comparison that removes the whole discipline at once (stages, freeze and checks), not each mechanism: the unstaged baseline proved 98% of correct and 98% of buggy entries at 50% precision, with rewritten code in 57% of its unsound proofs, while NFV's pipeline reached 92% precision (Section 4.5, page 15). Inference: the assumption is that line-level provenance is a meaningful correspondence; it cannot detect a source-preserving but semantically wrong library model.

## technique 2: prove correctness only after explicit intent and environment modeling

Use this for a positive claim `P |= S`. Formalize library contracts from documentation and infer a precondition from the natural-language statement. Translate the body, render the postcondition, and call the deductive verifier. Let the LLM repair only proof failures, adding invariants, intermediate assertions, and lemmas. Return “verified” only if the frozen source, environment, precondition, goal, and all proof obligations pass.

The paper's two-line example models Python `sum` as a recursive Dafny `Sum`, translates `x + 1 for x in l` to `Shift`, and states `requires |l| > 0` and `ensures r == Sum(l)/|l| + 1`. Proof search adds `ShiftedSum`, by induction on the sequence, and `DivDistrib`, which supplies the nonlinear arithmetic step. Dafny checks seven obligations. The paper gives the exact proof decomposition: "ShiftedSum proves by induction that translating the generator preserves the expected relationship between the two sums. DivDistrib supplies the nonlinear arithmetic step that the verifier does not close automatically when n is symbolic" (Section 1.2, page 5).

Inference: in Verus, encode the library model as `spec fn`/`proof fn`, use sequence lemmas and `while` invariants, and state the non-empty condition as a `requires`. Rust's integer and ownership semantics must be reflected in the model; the Python-to-Dafny correspondence cannot simply be copied. The proof establishes the Rust/Verus model under its assumptions, while documentation-to-model agreement remains a human or additional validation task.

Dafny verification proved 72/103 correct references (69.9% recall) and incorrectly proved 5 mutants, for 93.5% precision (Table 3, page 12). Precision by library tier ranged from 100% in L0 and L2b to 60% in L3 (Table 4). The failures identify missing preconditions, incorrect types, and one library model that copied a mutant's bug. Inference: the method is useful for conditional proofs but assumes accurate intent formalization and environment semantics.

## technique 3: refute by mechanically negating the goal and proving a witness

Use this when verifier failure is not enough to call a program buggy. Keep the library model, precondition, and translation byte-identical to the verification arm. Negate `S_F` mechanically. Ask the LLM, with source only, for a violating input; add that input as an extra precondition (the only deliberate strengthening). Prove the negated postcondition with the program still frozen. Reject a refutation unless a reachability check shows that replacing the postcondition by `false` does not itself verify, and a goal-shape check confirms that only the negated goal is present.

In the paper's buggy `shifted_mean`, the witness is `l == [0.0, 0.0]`; the target requires `!(r == Sum(l)/|l| + 1.0)`. Three assertions unfold `Sum` on the concrete list, and Dafny proves the violation. The source program is not modified. This avoids treating an unproved positive goal as a bug: "a proof failure cannot be interpreted as a bug — an unproved goal is evidence about the proof search, not about the program" (Section 1.2, page 5).

Inference: Verus can implement the same pattern with an exec `fn` (a copy of the function, body unchanged) whose `requires` include the original precondition and the witness and whose `ensures` is the negated postcondition (a `proof fn` cannot hold the executable body). Check that the witness satisfies the original precondition and that the negated goal is not vacuous. A witness for only one nondeterministic branch is insufficient: the paper notes that its proof refutation requires every execution admitted by the witness precondition to violate the specification.

The Dafny refutation arm proved 47/103 mutants (45.6% recall), with 6 incorrect refutations of references and 88.7% precision (Table 3). Every one of the six was a real Python counterexample to the postcondition as written but relied on an unstated assumption such as equal string lengths, no NaN, positive modulus, ASCII input, nonnegative decimal, or single-letter tokens (Table 5, page 13). Inference: this suggests refutation can expose specification defects as well as implementation bugs; the paper itself says that distinguishing the two "can be subjective" (Section 4.2.2, page 13).

## technique 4: bounded refutation with abstention

Use a bounded model checker when a counterexample trace is more practical than a deductive proof. Share intent formalization and translation stages, but emit C for library models and run CBMC with a fixed loop/recursion unwinding. Require compilation and absence of undefined behavior (overflow, bounds, pointer, and conversion checks). A violating trace is a refutation; every clean or inconclusive result is abstention, never verification.

The paper emphasizes the semantic limit: "a violating trace is a refutation and every other outcome, including a clean run, is an abstention" (Section 3.2, page 11). Bounded search found 72 counterexamples, 65 true mutant refutations and 7 false, giving 63% recall over 103 mutants and 90% precision (Section 4.3, page 14), better recall than Dafny's 46% refutation recall on the same corpus. Its false results again primarily came from preconditions; under-constrained environments can make spurious traces.

Inference: for Verus products, this suggests a complementary bounded harness for concrete integer widths and bounded calls, with explicit “unknown” results. Do not turn a timeout or clean bounded run into a correctness claim. Deductive Verus proofs remain needed for unbounded loops and general behavior.

## technique 5: abstention, audits, and model comparison

Configure proof search with separate attempt and repair budgets. In the reported run, there were 5 attempts and 10 repair rounds; an attempt restarts from stage 1 while a repair round changes only proof material (Section 4.1, page 11). Count precision over issued verdicts and recall over the full class; abstentions are excluded from precision but lower recall. Audit the artifacts even when the backend accepts them.

The weaker-model results show why this matters. With identical checks and budgets, gpt-5.6-sol reached 92% pipeline precision and 57% recall, while gpt-5-mini had 60% verification precision and 67% refutation precision; Claude Haiku proved only 11% of correct programs and had 92 type-check failures (Table 6, page 15). The unstaged baseline's 50% precision came from rewritten code in 57% of unsound proofs, invented helpers in 35%, and explicit assumptions in 8%; 56% also contained an unjustified precondition (Section 4.5).

In Verus, record every abstention reason: translation/type failure, provenance/audit failure, verifier timeout, or no proof. Require a kernel-level scan for `assume`, `admit`, unchecked external bodies, and axioms before counting a proof. This is an inference motivated by NFV's artifact gates.

## evidence, trust boundary, and product risk

Inference: NFV proves conditional properties of translated Dafny or bounded C artifacts. It does not prove the source-to-target translation, library/environment model, natural-language intent, or final proof sketch. The dataset is also narrow: 206 small Python entries, 103 tasks, with 9% L3 library-heavy entries; the benchmark is balanced by construction and filtered with additional LLM-generated tests. The paper reports 57% correct resolution at 92% precision, leaving 43% unresolved, so the method is not a complete verifier.

The main contradiction to watch is the difference between “machine-checked proof” and semantic correctness: five mutant proofs and six reference refutations were issued by the Dafny arm. Three mutant proofs were valid only under stronger inferred preconditions or an incorrect type translation; one copied a mutant bug into the library model; one (entry 116) came from a test case that violates the docstring's precondition (Section 4.2.3, page 14). These are not kernel failures; they are formalization failures.

For VL, the threat is high to any agent pipeline that lets a model freely edit Rust, specs, or trusted assumptions while chasing a Verus proof. NFV already supplies a general pattern for freezing source and goals, provenance tagging, mechanically negating refutations, and abstaining without proof. VL should not redo those ideas. Its remaining product work is Verus-specific: model Rust libraries and ownership faithfully, audit `assume`/external bodies, preserve source correspondence, and expose missing preconditions and environment assumptions to users.

## techniques for the catalog

- provenance-frozen translation — freeze source, environment model, precondition, and goal while tagging every translated line as source or synthesized
- proof-based verification — add only proof lemmas and invariants, then accept a positive verdict when the target verifier checks the frozen artifact
- witness refutation — negate the goal mechanically, add a reachable violating input, and prove the violation without changing the program
- bounded refutation with abstention — use CBMC-style bounded traces to find bugs while treating clean or inconclusive runs as unknown
- artifact auditing and abstention — reject rewritten code, altered goals, untagged lines, unjustified assumptions, and unverifiable proof attempts
- staged proof-search budgeting — separate translation attempts from proof-repair rounds and report precision, recall, and abstention explicitly

## study status

This study was written from the full extracted text of the Neuro-Formal Verification PDF and is ready for the complete gate.
