# Coinductive Proofs for Temporal Hyperliveness
(authored by agents unless marked 🧑)
Tag: `correnson2025coinductive`, [paper](http://arxiv.org/abs/2501.07920v1)

## what the paper proves or measures

HyCo is a Coq framework for deductively proving temporal hyperproperties with alternating trace quantifiers. Its target fragment is `∀*∃* ψ`, where `ψ` is a safety relation over several infinite traces. The abstract says: “We show that hyperproperties of this class – which includes many hyperliveness properties of interest – can always be approximated by coinductive relations.” (Abstract, p.1). The framework applies to labeled transition systems (LTSs), then supplies proof rules and Coq tactics for imperative programs with input, output and nondeterminism.

A hyperproperty relates multiple executions rather than one execution. For example, noninterference can require that every trace has another trace with changed high input but equal low output (Section 1, p.1). The paper proves soundness of its coinductive relations; it does not prove completeness, automatic discovery of witnesses, or soundness of a Verus implementation. Its examples show that a user can prove relational behavior of reactive programs without enumerating infinite traces.

## technique 1: parameterized coinduction for `∀∃` event relations

what it is: given two LTSs and an event relation `φ`, define a greatest-fixed-point relation `fei_φ` over pairs of states. Whenever every transition of the universal system has a matching transition of the existential system whose events satisfy `φ`, and the successor states remain related, the initial states satisfy `∀TS1 ∃TS2 φ` (Section 3.1, pp.6–7).

how to do it:
1. model each system as states, events, an initial state and a labeled transition relation (Section 2.2, p.3)
2. choose an event relation `φ ⊆ E1 × E2`
3. define `feiF_φ(R)` so every left transition has some right transition with `(e1,e2) ∈ φ` and successor pair in `R`
4. take the greatest fixed point `fei_φ = ν feiF_φ`
5. prove the initial-state pair belongs to `fei_φ`; Theorem 3.1 then gives the trace hyperproperty

The paper states: “The `feiφ` relation provides a sound proof technique to verify hyperproperties of the form `∀∃ φ`.” (Section 3.1, p.6). Soundness constructs an infinite right-hand witness trace from a left-hand trace. The mechanized proof defines proof states `(s1,s2,τ1)`, proves a progress lemma, uses functional choice to select one right successor, and recursively constructs `witness(π)` (Section 3.4, pp.10–11).

evidence: Theorem 3.1 proves `(I1,I2) ∈ feiφ ⇒ |= ∀TS1 ∃TS2 φ` (p.6). Example 3.2 proves an alternating `a`/`b` relation by adding state pairs to a coinduction hypothesis and closing a cycle (Sections 3.2, pp.7–8).

limits: the relation is a sound underapproximation; finding a useful postfixed relation remains a human proof task. Functional choice is used to extract an existential witness, so the framework proves existence rather than computing a domain-specific strategy.

Verus form: Inference: represent paired program states and a ghost relation as a `spec fn`; prove a step lemma with `requires` that every left transition has an allowed right successor and `ensures` that the pair remains in the relation. Infinite trace reasoning needs a coinductive proof principle outside ordinary terminating Rust functions; a Verus encoding would use finite-prefix induction plus an explicit coinduction axiom or a separately verified stream library.

## technique 2: incremental proof rules and cycle management

what it is: parameterized coinduction starts from an empty hypothesis and grows it while exploring state pairs. HyCo supplies `Init`, `Step`, `Invariant` and `Cycle` rules (Figure 2, pp.7–8).

how to do it:
1. apply `Init` to relate initial states under the current event relation
2. apply `Step` to match every left transition with a right transition and transfer focus to successor pairs
3. when a useful state relation is discovered, apply `Invariant` to add a set of pairs to the coinduction hypothesis
4. when a previously added pair is reached and the hypothesis is unguarded, apply `Cycle` to close the infinite proof
5. use deterministic-step alignment rules to skip silent deterministic transitions without generating obligations for every intermediate state (Section 3.3, pp.8–9)

`Invariant` trades more obligations now for future cycle closure: after adding a set `H'`, every pair in the enlarged hypothesis must satisfy the goal. `Cycle` is permitted only after a guarded hypothesis has been released by a step (Section 3.2, p.8). The paper’s example explores two states, adds `{(s1,s2)}` and `{(s2,s1)}`, then closes both cycles (Example 3.2, pp.7–8).

evidence: these rules are derived from the soundness theorem and parameterized-coinduction laws, so the rule system preserves soundness (Section 3.2, p.8). They are proof-management rules, not a measured algorithm; the paper reports no success-rate denominator.

Verus form: Inference: use ghost sets of paired states as an invariant candidate and prove transition closure. A finite loop can implement bounded exploration, but the unbounded `Cycle` rule requires a separate theorem that the relation is postfixed. Keep this proof state ghost-only; do not call proof functions at runtime.

## technique 3: derivatives for temporal safety relations

what it is: extend event relations to arbitrary safety relations `ψ` over traces by computing a derivative after each pair of events. `Δe1,e2(ψ)` is the suffix relation required after observing events `e1,e2`. A pair is safe when the derivative is nonempty now and the suffix remains safe under that derivative (Section 4.2, pp.12–13).

how to do it:
1. define safety as closure under compatible finite prefixes
2. define `Δe1,e2(ψ) = {(τ1,τ2) | (e1τ1,e2τ2) ∈ ψ}`
3. reject a transition pair if its derivative is empty
4. otherwise replace the current relation with the derivative and continue coinductively
5. for LTL-style formulas, compute derivatives structurally: next leaves the formula, always conjoins the derivative with the original formula, conjunction/disjunction distribute, and weak-until chooses the right derivative or continues the left condition (Figure 4, p.16)

The paper explains: “The key insight is to observe that given a safety relation ψ and two traces τ1, τ2, there is a systematic way to decompose a proof of `(τ1, τ2) ∈ ψ` into a condition on `τ1[0], τ2[0]` expressing what needs to hold now … and a proof of `(τ1[1...], τ2[1...]) ∈ ψ′`.” (Section 4.1, p.12). The coinductive relation `fe` carries states and the current trace relation; Theorem 4.5 proves that membership of initial states implies `∀TS1 ∃TS2 ψ` (Section 4.3, pp.14–15).

evidence: Example 4.6 proves a weak-until property by matching `a` with `a`, deriving the relation back to itself, then matching `a` with `b`, deriving it to `true`, and closing a cycle (Section 4.4, pp.15–17). The proof is mechanized in Coq; no runtime benchmark is reported.

limits: derivative reasoning assumes `ψ` is a safety relation. The framework does not directly establish liveness properties requiring eventual progress unless they can be expressed in the supported safety-closure form. Derivatives may produce syntactically new relations, so the user must recognize or add useful invariant forms.

Verus form: Inference: represent temporal formulas as an enum and implement a pure derivative function with proof lemmas that preserve trace semantics. A Rust verifier can check finite-prefix safety and derivative nonemptiness, but coinductive infinite traces and functional choice remain outside ordinary Verus specifications unless a trusted stream theory is supplied.

## technique 4: extend to `∀*∃*` and imperative I/O programs

what it is: `hyco_{m,n}` generalizes the relation to `m` universal and `n` existential transition systems and an `(m+n)`-ary safety relation (Section 6, pp.19–20). HyCo then gives syntax-directed rules for an imperative language `IMPio` with loops, input, output, conditionals and nondeterministic `havoc` (Section 7, pp.20–23).

how to do it:
1. interpret each program as an LTS over `(program,memory)` states and `in(v)`/`out(v)` events
2. initialize a coinductive proof with `Init`
3. use `Memory-Invariant` to relate memories independently of program syntax
4. use `Input-input` and `Output-output` to match observable events and derive the temporal relation
5. use `Havoc-L` universally for a left nondeterministic assignment and `Havoc-R` existentially to choose a right value
6. unfold loops with `Loop-L`/`Loop-R`, establish a memory invariant, and close recurring states with `Cycle` (Figure 9, pp.23–24)

Example 7.1 proves an echo server whose right execution doubles every output. The Coq script uses `hyco_init`, synchronization, a chosen doubled input, `hyco_deriv`, and `hyco_cycle` (Section 7.3, pp.24–25). Example 7.2 relates a deterministic incrementer to a nondeterministic adder by choosing `y = 2` and maintaining `x2 = 2*x1` (pp.25–26).

evidence: The examples are mechanized Coq proofs, but the paper gives no count of programs, failure rates or performance denominator. The contribution is a sound proof calculus and tactics, not an empirical verifier benchmark.

Verus form: Inference: model each Rust program state as ghost memory plus a control label; use `requires`/`ensures` for event matching and a loop invariant for the paired-memory relation. Inputs that must have an existential witness can be represented by a ghost choice function, while nondeterministic Rust operations need explicit specifications. Verus’s finite termination discipline means the infinite reactive semantics must be modeled separately.

## trusted boundary, contradictions, and VL implications

The trusted artifacts are Coq’s kernel, the definitions of LTS and trace semantics, the functional-choice principle used to extract witnesses, and the interpretation of a program as an LTS. The framework proves relational safety and hyperliveness soundness under those definitions; it does not prove that a compiler preserves an arbitrary Rust implementation’s LTS semantics. Inference: for VeruLaw, HyCo’s state-pair, derivative and cycle patterns are useful for proving relational policies such as noninterference or behavioral refinement, but they complement rather than replace Verus’s ordinary functional and memory proofs. Inference: threat to agent-written verified Rust is high for reactive policies if the agent omits a trace quantifier or chooses an unsound witness relation; a final proof must expose the exact trace model and temporal relation.

The paper’s claims concern soundness theorems and examples, not percentages. No experimental number needs reconciliation. What VL should not redo (Inference): a bespoke pairwise simulation proof for every temporal safety policy; the derivative and parameterized-coinduction rules already provide a reusable calculus. The missing integration is a verified Rust/Verus trace semantics and a trusted bridge from Rust execution to the LTS model.

## techniques for the catalog

- parameterized coinduction — grow a postfixed relation incrementally while proving `∀∃` trace properties
- cycle and invariant rules — manage recurring state pairs and close infinite reactive proofs
- temporal derivatives — turn a safety relation into a current-event check plus a suffix relation
- aligned deterministic steps — skip silent deterministic transitions without unsoundly ignoring nondeterministic branches
- multi-trace HyCo — generalize the calculus to `∀*∃*` safety relations
- imperative I/O tactics — specialize coinductive rules for input, output, havoc and loops
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
