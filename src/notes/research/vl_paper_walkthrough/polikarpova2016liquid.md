# Liquid Information Flow Control
(authored by agents unless marked 🧑)
Tag: `polikarpova2016liquid`, [paper](https://www.semanticscholar.org/paper/d6b99b44774300d18cd1561a5e08f4e49e2551ea)

## what the paper builds and proves

Polikarpova et al. present Lifty, a domain-specific language for data-centric programs. A programmer annotates sensitive inputs with declarative, data-dependent policies; liquid refinement types check information flow statically; and a repair engine synthesizes policy-enforcing code when the check fails. The abstract states, “We present Lifty, a domain-specific language for data-centric applications that manipulate sensitive data.” (Abstract, p. 1) The security guarantee is noninterference for the core calculus λL, proved by reducing an instrumented semantics to LIO’s mechanized noninterference proof (Section 4.4, pp. 15–17). The repair guarantee is conditional: if `Enforce` succeeds, its output is type safe and therefore noninterfering (Theorem 2, Section 5.3, p. 20).

The implementation extends Synqid with a TIO library, the `Enforce` algorithm, and a Synqid-to-Haskell translator (Section 6, pp. 21–22). The trusted assumptions include policy annotations, the liquid-type/SMT solver, Lifty infrastructure, the runtime, operating system, and absence of side channels. The attacker model explicitly assumes “policies are correct (i.e., the type annotations on input-output actions)” (Section 3.4, p. 12). Inference: for Verus, the analogous trusted boundary includes the verifier and solver, Rust compiler and proof erasure, external specifications, and the correctness of the policy contract; a verified policy can still state the wrong product requirement.

## technique 1: encode information flow as liquid refinements and TIO types

what it is: Lifty uses a security lattice whose labels are predicates over principals. A sensitive computation has type `TIO T ⟨i,o⟩`, where `i` is the input label (what the computation may read) and `o` is the output label (where its result may flow). Refinement types express value-dependent policies, such as `phase ds = Done`; field actions carry labels; `bind`, `get`, and `set` propagate labels through typing rules (Sections 3.1 and 4.1–4.3, pp. 5–15).

when to use: annotate every sensitive store getter/setter and every output action. Use a measure (an uninterpreted specification function) to relate store state to a field’s value and label. The EDAS example gives `getDecision :: ... → TIO Decision <phase ds = Done, false>`; a decision may flow only after the conference phase is `Done` (Section 2.2, p. 4).

how to do it:
1. define a refinement theory whose universally quantified validity is decidable; the implementation uses arrays, uninterpreted functions, and linear integer arithmetic (Section 4.1, p. 13)
2. define refined base types `{B | r}` and labels over the principal variable `υ`
3. encode each store field as `Field T ⟨l⟩` and each getter/setter as a TIO action with a policy label (Sections 3.1–3.2, pp. 5–9)
4. type `bind` so the first action’s output label flows to the second action’s input label; type `get` with the field label and `set` with a requirement that the current output can flow to the field (Fig. 13, p. 14)
5. reduce each flow check to logical validity under the path conditions and refinements in the typing environment (Section 4.3, p. 15)

The central claim is that “Liquid types enable fully automatic checking of complex, data dependent policies” (Introduction, p. 2). Inference: a Verus implementation can represent a policy as a `spec fn` over ghost state and use `requires`/`ensures` plus `assert` and `reveal` to prove that sensitive values do not reach an output. Verus does not provide TIO, a security-label lattice, or automatic liquid inference; an agent would need explicit ghost labels and proof lemmas, while executable Rust remains separate from proof-only code.

limits: policy expressiveness is restricted to the underlying quantifier-free linear-arithmetic, array, and uninterpreted-function theory. Nonlinear arithmetic, arbitrary recursive functions, and direct existential policies are unsupported (Section 6.5, pp. 25–26). The implementation also assumes a language-level attacker and excludes side channels and transient execution attacks (Section 3.4, p. 12).

## technique 2: prove noninterference by instrumented semantics and simulation

what it is: the core calculus has an original semantics with no run-time labels and an instrumented semantics carrying a current program-counter label. Reads raise the current label; writes require the current label to flow to the field label; `downgrade` either returns the boolean result or safely replaces it with `False`. The paper proves instrumented noninterference, proves that well-typed original executions simulate instrumented executions, and combines the lemmas into λL noninterference (Section 4.4, pp. 15–17).

when to use: use this proof pattern when a static type system claims that a dynamic security property follows from typing. Define a reference run-time monitor, prove that monitor secure, then prove that well-typed source executions are simulated by the monitor.

how to do it:
1. define low-equivalence of stores/configurations: states may differ only in fields whose labels are above the observer level (Section 4.4.1, p. 16)
2. instrument `get`, `set`, `bind`, and `downgrade`; `get` joins the field label into the current label, `set` checks flow, and `bind` passes the first action’s final label to the second (Section 4.4.1, pp. 15–16)
3. for `downgrade`, evaluate the boolean computation, but if its actual label cannot flow to the requested label, return `False` (Fig. 14 and surrounding text, p. 16)
4. establish that instrumented evaluation preserves low-equivalence (Lemma 1, p. 17)
5. establish simulation: a well-typed source term has the same result under instrumented execution and raises the current label no higher than its static input label (Lemma 2, p. 17)
6. combine simulation and instrumented noninterference to conclude the source theorem: equal public results and low-equivalent final stores (Theorem 1, p. 17)

The theorem is explicit: “Evaluating a computation t statically visible to ℓ from ℓ-equivalent stores leads to ℓ-equivalent stores” (Theorem 1, p. 17). It is termination-insensitive, although the paper says well-typed programs terminate because recursion is checked by refinement types (Section 4.4.3, p. 17). Inference: a Verus proof could model two executions with ghost states and prove relational invariants, but Verus does not directly provide relational typing or LIO’s dynamic-label semantics; the monitor and simulation lemmas would be additional specification infrastructure.

## technique 3: localize leaks with constrained Horn clauses

what it is: failed liquid typing is translated into constrained Horn clauses (CHCs) over unknown refinements and labels. A Horn solver computes the strongest assignment to unknowns. A failed query is mapped back to the source term and its flow constraint; if the failure is a can-flow check from input label `i` to label `l`, Lifty inserts a cast around that input with expected label equal to the solver’s assignment `A[l]` (Section 5.1, pp. 18–19).

when to use: use this when a program has multiple potential leaks and the repair system needs exact source locations and target types. The method finds all failed information-flow queries in one type-checking pass and gives each leak an independent expected type.

how to do it:
1. translate `Γ ⊢ t :: TIO () ⟨⊤,⊥⟩` into CHC rules and queries
2. solve rules for the strongest assignment A
3. for every query Q with `A ⊭ Q`, recover the source term `ta` and generating subtyping constraint
4. if the query is a flow check `i ⊑ l`, insert a functionally oblivious cast from the actual input label to `A[l]`; otherwise fail because the error is not an information-flow leak (Fig. 15 and Section 5.1, pp. 18–20)
5. pass each cast’s expected type independently to patch generation

The paper’s localization lemma says, “If Γ ⊢ t ,→ tˆ :: T , replacing each subterm of the form ⟨Ti′ ◁ Ti ⟩ ti in tˆ with a type-safe term of type Ti′ yields a type-safe program.” (Lemma 3, p. 19) The cast restrictions—only around `get`, only changing input labels, and trivial result refinements—make the minimal localization unique up to refinement equivalence, but they also make the algorithm incomplete (Section 5.1, pp. 18–20). Inference: a Verus analogue could translate failed proof obligations to source spans and generate a ghost “expected contract” for each unsafe operation, but Rust/Verus errors are not CHCs with a strongest liquid assignment, so the solver and mapping layer would be new tooling.

## technique 4: generate provably safe patches by branch synthesis and logical abduction

what it is: `Generate` receives a cast’s expected TIO type. It synthesizes candidate branches that preserve the original value or apply programmer-designated redactions, abduces the weakest guard making each branch’s actual label flow to the expected label, synthesizes a monadic guard, sorts branches from weakest to strongest, and builds a conditional. The EDAS patch returns the decision only when `phase ds = Done`; otherwise it returns `NoDecision` (Sections 3.3 and 5.2, pp. 10–11 and 19–20).

when to use: use this for a sensitive input whose value can be safely hidden by a default or redaction when its policy is not satisfied. The programmer supplies redaction constructors/functions, controlling the candidate space.

how to do it:
1. enumerate all branch-free terms up to a fixed size with the desired content type but public label `⊤`; restrict the environment to the faulty term and redaction functions
2. for each branch `tb` with actual label `l′`, solve the logical abduction problem for the weakest program-variable formula `rg` such that `rg ⇒ (l′ ⊑ l)` and `rg` does not mention the user variable `υ`
3. reject if no default branch is valid unconditionally; otherwise sort branch conditions from weakest to strongest
4. synthesize a monadic guard of type `TI {Bool | ν ⇔ rg} ⟨l⟩`, ensuring both functional correctness and non-leaky evaluation
5. combine guards and branches with nested `bind`/conditionals; the default branch runs when no stronger condition holds (Fig. 15, Section 5.2, pp. 18–20)

The safety result is stated as: “If Generate succeeds, it produces a type-safe term of the expected type TI B ⟨l⟩.” (Lemma 4, p. 20) The overall theorem then gives noninterference when `Enforce` succeeds (Theorem 2, p. 20). The method is conservative: localization may over-approximate labels and abduction may produce overly strong guards, so functionality can be reduced (Section 5.3, p. 20). It fails when there is no public redaction value or when checking the policy itself would leak a more sensitive field.

Inference: a Verus repair engine can use the same shape—candidate replacement, guard synthesis, and final Verus verification—with `requires`/`ensures`, `if`, and ghost predicates. It must keep the candidate code executable Rust and use proof functions only for proof obligations; Lifty’s TIO labels, `SynthAll`, and liquid abduction do not transfer directly.

## technique 5: safe downgrading for self-referential policies

what it is: `downgrade t` permits lowering a boolean computation’s input label when the computation’s result is provably constant in executions where the original label is not visible. If the actual computation reads too-sensitive data, the instrumented semantics discards its result and returns `False`. This supports policies that refer to the value being protected, such as a self-referential rule that authors are visible to themselves (Sections 3.1 and 3.4, pp. 6–12; Section 4.4.1, p. 16).

how to use it: wrap a runtime membership or authorization test in `downgrade` when the test’s result is guaranteed to be `False` for users who cannot observe the protected data. Lifty’s `filterM` embeds this mechanism in its type, allowing a high-label predicate while exposing only a low-label filtered list (Section 3.4, pp. 11–12).

how to do it:
1. express the self-referential policy with a measure in both the field’s value refinement and label
2. type the check as a boolean refinement whose result implies the downgrade condition
3. invoke `downgrade`; its static rule requires the boolean computation’s output label to flow to the requested label under the implication
4. rely on the dynamic rule to return `False` if the run-time label is too high

Inference: in Verus, this is a ghost proof that a boolean authorization test is constant under an observer’s indistinguishability relation; it requires an explicit relational model and does not arise from ordinary `assert` alone. The paper’s technique is useful conceptually for preventing leaks through search/filter results, but its exact label calculus is Lifty-specific.

## evidence, assumptions, and implications for VL

The evaluation contains nine microbenchmarks and three larger case studies. Table 1 reports every microbenchmark patched in under two seconds; Table 2 reports case-study totals of 31.9 seconds for the conference manager, 28.8 seconds for Gradr, and 61.9 seconds for HealthWeb (Tables 1–2, pp. 21–24). The conference manager has 10 controllers; all required patches are generated, and the manually enforced version has 215 AST nodes of policy code versus 276 generated by Lifty (Table 2, p. 22). The reported times are prototype wall-clock measurements on the listed benchmarks, not a denominator-based success percentage. The paper says, “For each of the three case studies, Lifty takes 30–60 seconds.” (Section 6.3, p. 25) HealthWeb’s 61.9-second total is just above that rounded range, so the sentence is a rounded summary rather than an exact bound.

The system’s proof evidence is semantic: noninterference follows from Theorems 1–2, assuming the policy annotations, solver, and infrastructure. Its engineering evidence is that all three case studies had necessary patches generated and that manually inspected generated code matched functionality and performance (Sections 6.2–6.4, pp. 24–25). What it does not establish is complete repair, preservation of intended functionality under conservative redaction, security against side channels, or correctness of the policies themselves.

Inference: for an agent-written verified-Rust product, Lifty poses medium threat as a workflow idea, not as a drop-in Verus competitor. VL should reuse its separation of localization, expected-contract inference, candidate synthesis, and machine-checked acceptance. VL should not redo liquid-type inference or a custom IFC calculus unless the product requires data-flow confidentiality. The major product risk is specification error: Verus can prove an incorrect policy just as Lifty can enforce an incorrect annotation.

## techniques for the catalog

- liquid policy types — express data-dependent confidentiality as decidable refinements and TIO input/output labels
- monitor-and-simulation proof — prove noninterference for an instrumented semantics, then show well-typed source execution simulates it
- CHC leak localization — solve constrained Horn clauses, map failed queries to source inputs, and infer weakest expected labels
- guarded patch synthesis — enumerate redaction branches, abduce guards, synthesize safe monadic checks, and verify the combined conditional
- safe downgrading — lower a boolean test’s label only when inaccessible executions force a constant safe result

Checked 2026-10-15 against the paper by a Codex agent for liquid_information_flow_control_20261014.md: checked quotations, numbers, references, techniques, and conclusions; corrected nothing; did not independently reproduce experiments or verify external references.
