# Semi-Autonomous Formalization of the Vlasov-Maxwell-Landau Equilibrium
(authored by agents unless marked 🧑)
Tag: `ilin2026semi`, [paper](http://arxiv.org/abs/2603.15929v2)

## what the paper proves and measures

The paper reports a complete Lean 4 formalization of a steady-state characterization for the Vlasov-Maxwell-Landau (VML) system. Its theorem takes twelve hypotheses (positive collision and ion-density parameters, positivity and regularity of the distribution, decay and score bounds, and four steady-state equations) and concludes that the distribution is a spatially uniform Maxwellian, the electric field is zero, and the magnetic field is constant (Section 2.2, pp. 3–4). The authors state: “We present a complete Lean 4 formalization of the equilibrium characterization in the Vlasov-Maxwell-Landau (VML) system, which describes the motion of charged plasma.” (Abstract, p. 1).

The reported artifact has 34 Lean files, 10,445 lines, 39 theorems, 186 lemmas, 28 definitions, and zero `sorry`s after ten days. The project used 213 commits, 229 human prompts, 122 documented automation cycles, and 220 Aristotle submissions. Aristotle proved 111 submissions (50% of 220), disproved 28 (13%), returned 66 with `sorry` (30%), and failed or never started 15 (7%) (Table 3, p. 8). The denominator is all 220 submissions; the percentages sum to 100% after rounding. The paper also reports 2.8 billion input and 11 million output tokens, a 254:1 ratio, and an estimated API cost of about $6,300 with caching versus $42,700 without (Section 5, p. 8).

The Lean kernel checks the final terms, but the theorem statement, definitions, generated code, imported Mathlib facts, and the physical interpretation remain trusted inputs. The authors found a serious definition-alignment error after completion: `ContDiff R ⊤` meant analytic in Mathlib rather than the intended finite smoothness; they replaced it with explicit C3/C2 assumptions (Section 6.3, pp. 11–12). Thus compilation alone did not establish that the formal statement matched the intended mathematics.

## technique 1: generate a natural-language proof blueprint before coding

what it is: ask a reasoning model to resolve the mathematical conjecture and write a detailed proof plan before an agent writes Lean. Gemini DeepThink produced a six-step argument for the VML equilibrium; that argument became the blueprint for the 10K-line development. The paper says: “The final natural-language proof became the blueprint for the formalization.” (Section 4.2, p. 6).

when to use it: use this for a large theorem whose proof has several analytic dependencies. A blueprint exposes the proof architecture and the required library interfaces before syntax and tactic debugging begin.

how to apply it:
1. state the physical system, domain, regularity, and desired conclusion in natural language (Section 4.2, p. 6)
2. obtain a complete argument and identify supporting literature (Section 4.2, p. 6)
3. check the argument by hand before formalization; the paper reports that the mathematician found no mathematical corrections were needed (Section 4.2, p. 7)
4. turn each argument step into a group of Lean definitions and lemmas, keeping the blueprint as the project map (Sections 2.3 and 4.2, pp. 4, 6–7)

Verus form: Inference: VL can first generate a Rust/Verus proof design listing state predicates, loop invariants, and lemma dependencies, then ask a coding agent to implement it. The blueprint is planning text, not evidence; Verus acceptance still requires compiling the resulting `spec fn`, `proof fn`, `requires`, `ensures`, `invariant`, and `assert` constructs.

evidence and limits: the paper provides one successful ten-day case, not a controlled comparison of blueprint versus no blueprint. The proof model was useful for the initial argument but the author says its later advice was “mostly for experimental sake” (Section 6.5, p. 13). The result therefore supports the workflow as an engineering report, not a causal benchmark.

## technique 2: split an abstract proof interface from a concrete representation

what it is: formalize the mathematical argument against a `FlatTorus3` typeclass, then prove that the concrete `Fin 3 → AddCircle 1` torus satisfies the interface. The abstract interface supplied integration-by-parts, curl/divergence identities, a maximum principle, and constancy of harmonic functions; the concrete module discharged its 22 fields (Section 4.4, p. 7). The paper states: “When the torus proofs required rewrites … the abstract proof chain … was completely unaffected.” (Section 6.7, p. 14).

when to use it: use this when the domain representation or library encoding may change while the core argument should remain stable.

how to apply it:
1. define a typeclass containing only domain operations and theorems consumed by the proof (Section 4.4, p. 7)
2. write the entropy, transport, field, and harmonic arguments against that interface (Sections 2.3 and 4.4, pp. 4, 7)
3. choose the concrete torus representation after checking available library support (Section 4.4, p. 7)
4. prove every interface field for the concrete representation, then instantiate the abstract theorem (Section 4.4, p. 7)

Verus form: Inference: put representation-independent state predicates and lemmas in one Rust module, and keep concrete data-structure lemmas in an implementation module. Use `spec fn` for predicates and `proof fn` lemmas with `requires`/`ensures`; do not model a Verus trait as a mathematical theorem unless the verifier accepts the exact trait specification.

evidence and limits: the abstract chain reached zero `sorry`s by March 7 and the Coulomb instantiation reached zero on March 9 (Table 2, p. 7). This measures completion of this project, not portability to other manifolds or Rust representations.

## technique 3: enforce hypothesis discipline and test non-vacuousness

what it is: when an intermediate fact is difficult, leave it as a lemma gap rather than adding it as a main-theorem hypothesis. The final theorem has twelve physically meaningful hypotheses; decay conditions were bundled into `VelocityDecayConditions`, and regularity facts were derived internally (Sections 4.3 and 6.1, pp. 7, 9–10). The authors warn: “a sorry (an acknowledged gap) is preferable to an unnecessary hypothesis (which silently weakens the theorem).” (Section 4.3, p. 7).

when to use it: use this whenever an agent proposes to make a goal an assumption. A passing checker can hide a vacuous theorem if the conclusion is assumed directly or through an unproved condition.

how to apply it:
1. list each top-level assumption and its physical meaning (Section 2.2, pp. 3–4)
2. reject assumptions that are consequences of earlier assumptions; create a lemma obligation instead (Sections 4.3 and 6.1, pp. 7, 9–10)
3. bundle genuinely related analytic premises into a named structure only when they remain assumptions (Section 6.1, p. 10)
4. prove a witness theorem showing that the final assumptions are satisfiable; the Maxwellian with zero fields is the witness (Section 4.7, p. 8)

Verus form: Inference: keep `requires` limited to environmental facts the implementation truly needs; derive postconditions through `proof fn` lemmas. Add a separate proof that a representative input satisfies the preconditions. A verifier result is meaningless if `requires false` or an overstrong precondition makes every call unreachable.

evidence and limits: the project reduced an intermediate 42-hypothesis statement to 12 hypotheses (Section 6.1, p. 9). The non-vacuousness theorem demonstrates one satisfying model, but it does not prove that all physically intended models satisfy the formal assumptions.

## technique 4: adversarial review and an unattended repair loop

what it is: run a hostile review that tries to reject the formalization, then automate repeated critique, proving, prover polling, cleanup, planning, strengthening, logging, committing, and alerting. The review prompt was: “You are a hostile reviewer trying to REJECT this formalization. Your job is to find every weakness, gap, and dishonesty.” (Section 4.5, p. 7). The initial four-step `/babysit` loop grew to eleven steps and ran 122 documented cycles (Section 4.5, p. 7).

when to use it: use this for long agent sessions where regressions, dead code, and unexamined assumptions accumulate.

how to apply it:
1. run a critique that searches for false hypotheses, gaps, dead code, and misleading documentation (Section 4.5, p. 7)
2. ask the agent to plan and attempt proofs, and submit isolated lemmas to Aristotle (Sections 4.5 and 6.4, pp. 7, 12)
3. poll results, integrate only checked proofs, and record changes (Section 4.5, p. 7)
4. run cleanup and linter checks, commit, and alert the human when intervention is needed (Section 4.5, p. 7)
5. retain human control for architectural decisions and theorem integrity; the paper reports that automation was weaker at novel proof strategies (Section 6.4, p. 12)

Verus form: Inference: a VL loop can generate candidate proof blocks, run Verus, inspect diagnostics, and ask a reviewer to search for vacuous `requires`, accidental `external_body`, unconstrained specifications, and runtime calls to erased proof code. Only verifier-passing code should be committed; review text is advisory.

evidence and limits: automation maintained quality and overnight progress, but the key abstract and Coulomb breakthroughs occurred in interactive sessions (Section 6.4, p. 12). This is evidence for an assistive loop, not full autonomy.

## technique 5: decompose lemmas and use an automated prover as a falsifier

what it is: extract small lemma statements, submit them to Aristotle, and use both proofs and refutations. The paper reports 111 proved and 28 disproved submissions out of 220; disprovals exposed missing measurability, Vitali-set counterexamples, and false Coulomb decay estimates (Section 6.2, pp. 9–10). It recommends: “We recommend decomposing proofs aggressively into small lemmas and submitting each to an automated prover – even lemmas that seem hard.” (Section 6.2, p. 10).

when to use it: use this where a large proof hides incorrect intermediate claims. A counterexample is useful feedback even when no proof is found.

how to apply it:
1. split the argument into lemmas with explicit hypotheses and conclusions (Sections 2.3 and 6.2, pp. 4, 10)
2. submit each lemma separately and record proved, disproved, sorry, and failed outcomes (Section 3, p. 5; Table 3, p. 8)
3. inspect disproved statements, repair their assumptions or definitions, and resubmit (Section 6.2, p. 10)
4. integrate only kernel-checked results and keep unresolved lemmas visible (Sections 3 and 6.2, pp. 5, 10)

Verus form: Inference: generate small `proof fn` obligations and run Verus for each. Treat counterexamples and failed verification as specification feedback; never convert a failed obligation into an `external_body` function. Preserve the exact Rust module and verifier version with each result.

evidence and limits: Aristotle's 50% proved fraction is 111/220, and its 13% disproved fraction is 28/220 (Table 3, p. 8). The paper gives median turnarounds of 9 minutes for proved, 29 minutes for disproved, and 5.6 hours for returned-with-`sorry` submissions (Section 6.2, p. 10). These values describe this service and period.

## technique 6: isolate singular analytic obligations and audit definitions

what it is: for the Coulomb kernel, prove each of 17 integrability, differentiability, and continuity conditions by splitting the domain into a ball around the singularity and its complement; use local integrability near zero and Schwartz decay outside (Section 4.6, p. 8). Separately, have an expert inspect definitions and theorem statements, because a compiling theorem can still encode the wrong smoothness notion (Section 6.3, pp. 11–12). The paper says: “compilation is not correctness.” (Section 6.3, p. 12).

when to use it: use local/complement decomposition for kernels with isolated singularities, and use expert definition review whenever library notation has overloaded meanings.

how to apply it:
1. state every integrability and regularity obligation explicitly (Section 4.6, p. 8)
2. split the integral into a neighborhood of the singularity and its complement (Section 4.6, p. 8)
3. discharge the neighborhood with local integrability of the singular bound and the complement with decay estimates (Section 4.6, p. 8)
4. ask a domain expert to compare every formal definition with the intended mathematics (Section 6.3, pp. 11–12)
5. replace ambiguous type-level notation with explicit finite regularity and rerun all proofs (Section 6.3, p. 12)

Verus form: Inference: encode boundary cases and arithmetic side conditions as explicit lemmas and invariants; Verus does not provide Lean's analytic library, so integral and PDE facts would need trusted specifications or separately verified libraries. Definition review remains mandatory for Rust types, contracts, and ghost state.

evidence and limits: Coulomb analysis added about 4,000 lines and was the hardest phase (Section 4.6, p. 8). The post-completion smoothness bug shows that all 10,445 lines and zero `sorry`s did not eliminate semantic review risk (Sections 5 and 6.3, pp. 8, 11–12).

## what remains trusted and what VL should take

Lean's kernel checks accepted proof terms. The paper's process, model outputs, theorem statements, definitions, Mathlib library, and human interpretation remain outside that kernel. Inference: VL should place Verus compilation at the acceptance boundary, record the exact source and verifier versions, and require a human or independent checker to inspect contracts and data-model definitions. Inference: the strongest transferable architecture is a blueprint followed by abstract/concrete separation, small-lemma proving, adversarial review, and a satisfiability witness. Inference: a product that lets an agent weaken `requires` or introduce an unconstrained specification faces a high threat; a product that preserves contract review and verifier checks can use the workflow as an engineering pattern.

The paper argues that the assembled static VML characterization is new, while its individual ingredients are classical: the H-theorem, Landau nullspace characterization, polynomial matching, Killing fields, maximum principle, and harmonic analysis (Section 8, pp. 18–19). Existing work on simpler systems or dynamical stability should not be redone as if it supplied this exact theorem. The paper also reports that the formalization preceded the companion mathematics paper, reversing the usual publication order (Section 9, p. 19).

## techniques for the catalog

- natural-language proof blueprint — resolve and check a complete argument before generating formal code
- abstract/concrete split — prove the argument against a domain interface and instantiate it separately
- hypothesis discipline and witness — keep only meaningful assumptions and prove they are satisfiable
- adversarial babysit loop — repeatedly critique, prove, check, clean, and log agent changes
- automated lemma falsification — submit small lemmas and use disprovals to repair statements
- singularity decomposition and definition audit — split local/complement estimates and expert-check overloaded definitions

Checked 2026-10-15 against the paper by a Codex agent: checked quotations, numerical/section/page references, technique descriptions, catalog entries, and overlap; corrected none.
