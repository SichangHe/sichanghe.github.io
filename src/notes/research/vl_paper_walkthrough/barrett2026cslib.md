# CSLib: The Lean Computer Science Library
(authored by agents unless marked 🧑)
Tag: `barrett2026cslib`, [paper](https://doi.org/10.48550/arxiv.2602.04846)

## What CSLib proposes

CSLib is a white-paper proposal for a Lean library and verification infrastructure covering computer-science models, algorithms, data structures, and everyday imperative code. It has two pillars. Pillar 1 formalizes reusable computer-science concepts and proofs in Lean. Pillar 2 introduces Boole, an intermediate verification language (IVL) in which imperative code is mixed with Lean specifications; a verification-condition generator translates Boole programs into Lean goals. “In this white paper, we introduce CSLib,1 a library for Lean-based formal verification and computer science research that seeks to change this state of affairs.” (§1, p. 2)

The paper is a roadmap, not an evaluation of an end-to-end verified product. It reports no aggregate theorem count, proof-time benchmark, or completed real-world system. It says the repository already has initial formalizations of operational semantics, program equivalences, automata, linear logic, and elementary sorting/searching algorithms, but the 2026 and 2027 milestones are expectations (§6, pp. 13–14). The reader should therefore treat the techniques below as specified designs and the small Boole example as a prototype demonstration.

## technique 1: a unified, reusable formalization library

When to use it: use a shared library when multiple projects need the same models, logics, algorithms, data structures, or complexity facts. The goal is to avoid isolated proofs and make definitions and theorems composable.

Steps described by the paper:

1. Define computer-science models and logics in Lean, including lambda calculi, deterministic/nondeterministic/probabilistic/quantum computation, temporal logic, Hoare logic, separation logic, linear logic, transition systems, and complexity classes (§2.1).
2. Formalize algorithms and data structures with correctness and complexity theorems, organized as one coherent framework (§2.1).
3. Reuse Mathlib for mathematics and contribute missing lemmas either to Mathlib or CSLib (§2.1).
4. Package APIs so later verified implementations can invoke the same definitions and theorems rather than restating them.

The paper's stated first pillar is “Formalizing all essential computer science concepts in Lean.” (§1, p. 2) It gives a concrete complexity API in which a procedure returns a value together with a computation cost, using a monadic wrapper and explicit `tick` placements (pp. 7–8). The authors say that treating time complexity as a computational effect separates correctness from complexity analysis, while acknowledging that manually placed ticks can be wrong and cannot prove lower bounds (§2.1, p. 8).

Verus form (Inference): build a Rust crate of spec functions, datatypes, and proof lemmas for reusable algorithms, then expose executable wrappers with `requires` and `ensures`. A cost wrapper could return `(value, cost)` and carry a postcondition relating the cost to a chosen model. Verus's `spec fn`, `proof fn`, and `ensures` can encode this split, but the paper's Lean namespace, Mathlib integration, and monadic API do not transfer automatically. Manual cost annotations remain assumptions unless a separate instrumented semantics proves them.

## technique 2: imperative verification through the Boole IVL

When to use it: use Boole when a programmer wants pseudocode-like imperative code with specifications, while keeping verification conditions and proofs in Lean. The long-term design accepts front ends such as Rust, Python, C++, and Java with specifications written in Lean (§2.2, Fig. 5).

Steps in the paper:

1. Write a procedure in Boole with `requires` preconditions, `invariant` loop invariants, and `assert` statements (§2.2).
2. Assign Lean semantics to each Boole construct and generate verification conditions (VCs) for loop-free paths (§2.2).
3. Simplify generated VCs using known facts from the path, such as an initial variable value (§2.2).
4. Prove the resulting Lean goals manually or with proof automation (“hammers”) such as Lean-SMT (§2.2).
5. Replay any SMT proof certificate step by step in the Lean kernel (§2.2).

The paper's executable shape is a sum loop:

```text
procedure loopSimple (n: int) returns (r: int)
spec { requires (n >= 0); }
{
  sum := 0; i := 0;
  while(i < n)
    invariant (i <= n && ((i * (i-1)) div 2 == sum));
  { sum := sum + i; i := i + 1; }
  assert [sum_assert]: ((n * (n-1)) div 2 == sum);
  assert [neg_cond]: (i == n);
  r := sum;
};
```

The paper explains the generated goals: “The first goal, for example, represents a path from the entry to the procedure to the beginning of the loop.” (§2.2, p. 9) Another goal states that the invariant is preserved around one iteration, and two goals correspond to the assertions (§2.2). “This tactic uses the Lean-SMT tool [30] to translate a goal into an SMT formula, call a solver, get a proof certificate, and then replay the proof step-by-step in Lean.” (§2.2, p. 10)

Verus form (Inference): write an executable Rust function with `requires(n >= 0)` and `ensures` that the return equals the mathematical sum. Put the loop invariant in a Verus loop annotation, for example `invariant i <= n` together with a relation between `sum` and `i`; prove arithmetic side facts in `proof fn` lemmas. Verus generates solver obligations directly from Rust-like code, so there is no Boole translation step. Keep the invariant as an invariant clause, not an `invariant(...)` call, and do not put `ensures` on a `spec fn`.

## technique 3: minimize and audit the trusted computing base

When to use it: use this architecture when translating mainstream code into a verifier would otherwise make the translator and VC generator an opaque trusted component. CSLib puts Boole and its tooling inside Lean and aims to make both translation and VC generation minimize the trusted computing base (TCB).

Steps in the paper:

1. Define Boole as an embedded Lean language, drawing on Loom's shallow embeddings and Strata's dialect infrastructure (§2.2).
2. Implement the transpilation from front-end languages to Boole as verified or kernel-visible Lean machinery (§2.2, Fig. 5).
3. Generate VCs as Lean goals that remain connected to the originating code and are readable by humans (§2.2).
4. Use Lean's kernel to check proof terms, including certificates returned by SMT hammers (§2.2).
5. Add front ends only after their language semantics and translation into Boole are formalized; the paper specifically calls Rust and C++ translation an important engineering challenge (§4).

The design principles are explicit: “Boole and its ecosystem will be embedded in Lean, and both the transpilation step and the verification condition generation step should be implemented with the goal of minimizing the trusted computing base.” (§2.2, p. 8) The paper also requires VCs to be intuitive and connectable to source code, and specifications to use the formal universe from Pillar 1 (§2.2).

Verus form (Inference): treat the Verus verifier, Rust compiler, solver, and external specifications as a trust boundary to document. A VL implementation can reduce avoidable trust by keeping contracts in the same source tree, checking generated proof code with Verus, and preserving source-to-proof mapping in diagnostics. Verus does not provide CSLib's Boole embedding, so a Rust-to-Verus translation would need its own semantic argument before generated contracts could be trusted as equivalent to source behavior.

## technique 4: compose code verification with AI proof tools and review

When to use it: use AI as a proof-search assistant over a large, curated formal corpus, while retaining human review as the admission gate. CSLib treats its definitions and proofs as training data and expects AI tools to accelerate future contributions.

Steps described by the paper:

1. Build a coherent corpus of definitions, specifications, executable algorithms, and proofs in Lean (§1–§2).
2. Train or prompt formalization and theorem-proving systems on that corpus (§3).
3. Let AI suggest formalizations or proofs, but submit every committed change to a manual GitHub-based code review (§3).
4. Use Lean's kernel and proof replay as the final soundness check (§2.2–§3).
5. Grow the corpus and tooling together, creating the paper's proposed “flywheel” between AI and human experts (§3).

The authors caution that AI formalizations may be buggy and AI proofs may not be human-comprehensible, even when sound; therefore “AI tools play only an advisory role in the development of CSLib” and committed material is subject to manual review (§3, p. 12). This is a governance technique as much as a proof technique.

Verus form (Inference): use accepted Verus proofs and contracts as training data only after independent review of the specification and implementation. Require the verifier to check every generated patch, and require a human to check that the contract expresses the product requirement. This preserves the useful compiler-in-the-loop workflow while avoiding a product policy that equates verifier acceptance with requirement correctness.

## trust, limitations, and threat to VL

CSLib's promised trusted base includes Lean's kernel, formalized language semantics, the Boole translation and VC generation, and the correctness of front-end translators. The paper's roadmap explicitly plans future support for pointers, concurrency, separation logic, and low-level systems (§2.2, p. 10; §6, p. 14), so those parts are not yet demonstrated at the claimed end-to-end scale. The complexity API relies on manual ticks, and the paper admits that its initial approach does not prove lower bounds (§2.1, p. 8). No experimental denominator supports the 2026/2027 completion forecasts; they are roadmap goals.

Inference: CSLib is relevant to VL as ecosystem infrastructure, not as a drop-in Verus library. Its strongest product lesson is to invest in reusable, searchable specifications and source-linked verification conditions, because those artifacts support both human maintenance and AI training. The threat to agent-written verified Rust is that a translation or contract layer can silently change meaning; the mitigation is a checked semantic bridge, explicit TCB accounting, and review of specifications before proof search.

## techniques for the catalog

- unified formalization corpus: organize reusable computer-science models, algorithms, data structures, and proofs in one Lean framework
- Boole IVL contracts: write imperative procedures with `requires`, loop `invariant`, and `assert`, then generate Lean verification conditions
- kernel-replayed SMT: translate Lean goals to SMT, obtain certificates, and replay them in the Lean kernel
- TCB-minimizing translation: embed the IVL and translation machinery in Lean and keep generated goals source-linked
- reviewed AI assistance: use AI for formalization and proof suggestions while requiring verifier checks and manual code review
Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
