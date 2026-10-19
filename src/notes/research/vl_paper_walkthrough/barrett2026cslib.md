# CSLib: The Lean Computer Science Library
(authored by agents unless marked 🧑)
Tag: `barrett2026cslib`, [paper](https://arxiv.org/abs/2602.04846)

## What CSLib proposes

CSLib is a white-paper proposal for a Lean library and verification infrastructure covering computer-science models, algorithms, data structures, and everyday imperative code. It has two pillars. Pillar 1 formalizes reusable computer-science concepts and proofs in Lean. Pillar 2 introduces Boole, an intermediate verification language (IVL) in which imperative code is mixed with Lean specifications; a verification-condition generator translates Boole programs into Lean goals. “In this white paper, we introduce CSLib,1 a library for Lean-based formal verification and computer science research that seeks to change this state of affairs.” (§1, p. 2)

Inference: the paper should be read as a roadmap rather than an evaluation of an end-to-end verified product. It reports no aggregate theorem count, proof-time benchmark, or completed real-world system. It says the repository already has initial formalizations of operational semantics, program equivalences, automata, linear logic, and elementary sorting/searching algorithms, but the 2026 and 2027 milestones are expectations (§6, pp. 13–14). Inference: treat the techniques below as proposed designs and the small Boole example as a prototype demonstration.

## technique 1: a unified, reusable formalization library

Inference: when to use it: use a shared library when multiple projects need the same models, logics, algorithms, data structures, or complexity facts. The goal is to avoid isolated proofs and make definitions and theorems composable.

Steps described by the paper:

1. Define computer-science models and logics in Lean, including lambda calculi, deterministic/nondeterministic/probabilistic/quantum computation, temporal logic, Hoare logic, separation logic, linear logic, transition systems, and complexity classes (§2.1).
2. Formalize algorithms and data structures with correctness and complexity theorems, organized as one coherent framework (§2.1).
3. Reuse Mathlib for mathematics and contribute missing lemmas either to Mathlib or CSLib (§2.1).
4. Inference: expose shared definitions and theorems through APIs so later implementations can reuse them.

The paper's stated first pillar is “Formalizing all essential computer science concepts in Lean.” (§1, p. 2) It gives a concrete complexity API in which a procedure returns a value together with a computation cost, using a monadic wrapper and explicit `tick` placements (Fig. 3, p. 6; Fig. 4, p. 7; §2.1, p. 8). The authors write: “Treating time complexity as a computational effect makes correctness and complexity analysis orthogonal.” (§2.1, p. 8) The API can contain incorrect manual tick annotations and cannot directly prove algorithmic lower bounds. Figure 4 states that Mergesort returns a sorted permutation with at most n * clog2 n comparisons, where n is the input list length; the proof bodies are omitted (p. 7). This cost counts comparisons, not every execution step.

Inference: a Verus adaptation could collect reusable specifications and proof lemmas in a Rust crate, with executable implementations checked against those specifications. A return-value/cost pair could support a chosen cost model, but manually assigned costs would still need justification. The paper does not describe or evaluate a Verus adaptation.

## technique 2: imperative verification through the Boole IVL

Inference: when to use it: use Boole when a programmer wants pseudocode-like imperative code with specifications, while keeping verification conditions and proofs in Lean. The long-term design envisions front ends such as Rust, Python, C++, and Java with specifications written in Lean (§2.2, Fig. 5).

Steps in the paper:

1. Write a procedure in Boole with `requires` preconditions, `invariant` loop invariants, and `assert` statements (§2.2).
2. Assign Lean semantics to each Boole construct and generate verification conditions (VCs) for loop-free paths (§2.2).
3. Simplify generated VCs using known facts from the path, such as an initial variable value (§2.2).
4. Prove the resulting Lean goals manually or with proof automation (“hammers”) such as Lean-SMT (§2.2).
5. When using Lean-SMT, obtain a proof certificate from the solver and replay its proof step by step in Lean (§2.2, p. 10).

The following excerpt from Figure 6 omits the Lean imports, Strata wrapper, and proof command (p. 10). Inference: the loop sums the integers from 0 through n - 1, giving 0 when n = 0, consistent with its asserted result n * (n - 1) / 2. The caption instead says “for computing the sum of the first n positive integers.” (Fig. 6, p. 10)

```text
procedure loopSimple (n: int) returns (r: int)
spec { requires (n >= 0); }
{
  var sum : int;
  var i : int;
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

Inference: a Verus adaptation could express the same precondition, loop invariant, and result formula in an executable Rust function. Machine-integer overflow and the relationship between machine arithmetic and the paper’s integer arithmetic would require separate treatment. The paper supplies no Rust or Verus implementation.

## technique 3: minimize the trusted computing base

Inference: when to use it: use this architecture when translating mainstream code into a verifier would otherwise make the translator and VC generator an opaque trusted component. CSLib puts Boole and its tooling inside Lean and aims to make both translation and VC generation minimize the trusted computing base (TCB).

Steps in the paper:

1. Embed Boole and its ecosystem in Lean. The prototype extends Strata’s Core dialect; Figure 5 also depicts a shallow-embedding route through Velvet/Loom (§2.2, pp. 8–9).
2. Aim for verified transpilation from front-end languages to Boole, as depicted in Figure 5 (p. 9). The paper plans to formalize source-language semantics and use those semantics for translation (§2.2, pp. 10–11).
3. Generate VCs as Lean goals that remain connected to the originating code and are readable by humans (§2.2).
4. Use Lean proof machinery for the generated goals; Lean-SMT replays solver proofs in Lean (§2.2, p. 10). Figure 5 lists language semantics and the Lean kernel as the intended trusted computing base (p. 9).
5. Build translations from mainstream languages such as Rust and C++; §4 identifies this as important community engineering work (p. 12). The paper specifies no prerequisite ordering for adding front ends.

The design principles are explicit: “Boole and its ecosystem will be embedded in Lean, and both the transpilation step and the verification condition generation step should be implemented with the goal of minimizing the trusted computing base (TCB).” (§2.2, p. 8) The paper also requires VCs to be intuitive and connectable to source code, and specifications to use the formal universe from Pillar 1 (§2.2).

Inference: for a Verus adaptation, document which compiler, verifier, solver, and external specifications must be trusted. A source-to-Verus translator would need a separate argument that it preserves program meaning. Keeping contracts beside implementation code and linking diagnostics to their source could help review, but would not itself prove translation correctness.

## technique 4: compose code verification with AI proof tools and review

Inference: when to use it: use AI as a proof-search assistant over a large, curated formal corpus, while retaining human review as a prerequisite check. CSLib plans to use its formalizations as training data and expects AI tools to accelerate future contributions.

Steps described by the paper:

1. Build a coherent corpus of definitions, specifications, executable algorithms, and proofs in Lean (§1–§2).
2. Use formalizations as training data for formalization and theorem-proving systems (§3, p. 12).
3. Let AI suggest formalizations or proofs, but submit every committed change to a manual GitHub-based code review (§3).
4. Inference: combine proof checking with review of what the formal statements mean. Section 3 warns that AI formalizations may be buggy even when proofs of formal statements are sound (p. 12).
5. Grow the corpus and tooling together, creating the paper's proposed “flywheel” between AI and human experts (§3).

The authors caution that AI formalizations may be buggy and AI proofs may not be human-comprehensible, even when sound; therefore “AI tools play only an advisory role in the development of CSLib” and committed material is subject to manual review (§3, p. 12). Inference: this combines development governance with proof assistance.

Inference: a Verus workflow could require verifier checks for generated proofs and human review of whether contracts express the intended requirements. Verifier acceptance alone would not establish that the requirements were specified correctly. This is a proposed adaptation, not a workflow evaluated in the paper.

## trust, limitations, and threat to VL

Figure 5 labels “Semantics of PL” and “Lean Kernel” as the intended trusted computing base (p. 9). Verified transpilation and trustworthy VC generation are design goals; the prototype is not evidence that all planned front ends already meet them. The roadmap plans future support for pointers, concurrency, separation logic, and low-level systems (§2.2, p. 10; §6, p. 14). The complexity API relies on manual ticks and cannot directly prove algorithmic lower bounds (§2.1, p. 8). The 2026/2027 forecasts are tentative roadmap expectations (§6, pp. 13–14), not measured results.

Inference: CSLib is relevant to VL as ecosystem infrastructure, not as a drop-in Verus library. Its strongest product lesson is to invest in reusable, searchable specifications and source-linked verification conditions, because those artifacts support both human maintenance and AI training. The threat to agent-written verified Rust is that a translation or contract layer can silently change meaning; the mitigation is a checked semantic bridge, explicit TCB accounting, and review of specifications before proof search.

## techniques for the catalog

- unified formalization corpus: organize reusable computer-science models, algorithms, data structures, and proofs in one Lean framework
- Boole IVL contracts: write imperative procedures with `requires`, loop `invariant`, and `assert`, then generate Lean verification conditions
- Lean-replayed SMT: translate Lean goals to SMT, obtain proof certificates, and replay proofs in Lean
- TCB-minimizing translation: aim for verified transpilation, embed the IVL ecosystem in Lean, and keep generated goals connected to source code
- reviewed AI assistance: keep AI advisory and require manual code review of committed formalizations and proofs
Checked 2026-10-19 against the full paper by a Codex agent (mid-paper quote: "The #prove_vcs command in our example invokes a prototype verification condition generator that generates goals in Lean."): read the full paper and study; checked quotations, numbers, page and section references, technique steps, and roadmap status; corrected the TCB description, an incomplete quotation, the complexity-API page reference, and the Boole excerpt; distinguished proposed adaptations from paper results; did not run Lean, inspect repositories, validate cited works, or test Verus adaptations.
