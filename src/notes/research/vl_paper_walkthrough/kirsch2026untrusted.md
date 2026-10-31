# Untrusted Authors, Trusted Answers: A Calculus of Fidelity-Graded Translations
(authored by agents unless marked 🧑)
Tag: `kirsch2026untrusted`, [paper](https://www.semanticscholar.org/paper/e85205271f8d831f45546f35c9ab43e310b86fc2)

## result and scope

The paper proposes a calculus for answering program questions by translating programs to a language where the question is decidable, then carrying evidence back to the source. Its abstract states: “To answer a question about a program, move the program to where the question is decidable.” (Abstract, p. 1). A translation is modeled as a directional, fidelity-graded pair with a source language, target language, translator, target-to-source carry-back interpreter, kept observables, and direction (`exact` or `over`). The implementation, hurdy-gurdy, has a use plane that answers questions and an evolution plane that records unmet demands and grows the registry.

The paper explicitly says that “All of hurdy-gurdy — framework, interpreters, pairs, solver plumbing, evaluation harness, Lean mechanization — is LLM-generated code” and that “no human reviewed either for semantic correctness.” (Provenance disclaimer, p. 2). Inference: This is directly relevant to agent-written verified Rust: untrusted generators can build artifacts, but every answer must carry replayable evidence and pass independent gates.

## technique 1: directional translation pairs and square checking

what it is

A language is a decidable program set, finite observable fields, and reference semantics (Definition 3.1, Sec. 3.1, p. 4). A pair `P : A → B` contains translator `T`, target-to-source interpreter `Λ`, projection `πP` of preserved source observables, and direction. Exact pairs use the identity witness; over-approximating pairs provide a witness embedding from source valuations to target valuations (Definition 3.4, p. 4).

Faithfulness is checked by running both sides of a square and comparing projected traces. The paper defines the check as: “The square is a directional claim, checked as a projected trace equality along a declared witness embedding.” (Sec. 3.1, p. 4). For an exact pair, every target valuation is covered; for an over pair, target behaviors may be additional, so the square checks only source-to-target simulation on kept observables (Sec. 3.2, pp. 4–5).

when to use it

Use a pair when a source property is easier to decide after lowering to a solver-facing language. Declare precisely which observables survive and whether the translation is exact or over-approximating. Use the per-program square oracle whenever the translation or carry-back can be executed on the concrete program.

how to do it

1. Define source and target languages, interpreters, observables, and a projection (Definitions 3.1 and 3.3, pp. 4–5).
2. Implement a pure translator `T` and target-to-source carry-back `Λ` (Definition 3.4, p. 4).
3. For each source program and closing valuation, apply the witness embedding when the pair is over-approximating (Definition 3.5, p. 5).
4. Run the source interpreter and the target interpreter, carry the target behavior back, and compare projected traces step by step (Sec. 3.2, p. 5).
5. On failure, report the first step and observable where traces differ; the paper calls this a localized defect (Sec. 3.2, p. 5).
6. Keep only programs in the declared pair domain; unsupported constructs fail with a typed verdict (Sec. 3.1, p. 4).

The paper’s concrete example translates RISC-V to BTOR2, runs both interpreters, and catches a taken jump whose `halted` field diverges at step 1 (Sec. 3.2, p. 5).

Verus form

Inference: Treat a Rust implementation plus its Verus specification as the source and a lowered verification model as the target. A pair can carry the source contract’s observables—return values, ownership-relevant state, and invariant predicates—to a target model. The Verus checker is an additional proof gate; a trace square alone does not prove a quantified contract. Use `requires`, `ensures`, `invariant`, `assert`, and proof functions in the source module, then check the generated module with Verus. There is no Verus construct corresponding to the paper’s pair record, so the registry belongs in an external orchestration layer.

what the evidence shows

The paper reports 96/96 conjoined RISC-V constructs in one coverage table and 78/78 compliance-derived questions agreeing and correct across dual routes (Tables 3–6, Secs. 6.1–6.3, pp. 15–17). It also reports 300 seeded RV64IMC programs with zero divergences against the Sail simulator, 10 Csmith seeds against native gcc, and 463 reference cases with zero divergences (Sec. 6.6, p. 18). These are evidence for the evaluated artifacts and denominators, not universal claims about all programs.

where it fails or assumes

Interpreter adequacy is an explicit assumption: `I_A(p) = ⟦p⟧_A` on the interpreter’s domain (Assumption 1, Sec. 3.1, p. 4). The paper’s own audit found a common-mode blind spot: both the RISC-V interpreter and translator mis-decoded MUL as ADD, so their square agreed. It states: “Both legs of every square agreed, so the square was structurally blind.” (Sec. 6.6, p. 18). Inference: A Verus adaptation must assume that the verifier, compiler model, and specification describe the intended semantics. Differential routes can detect independent implementation faults but cannot catch shared assumptions.

## technique 2: compositional pasting and contract meet

what it is

Two pairs compose when the middle language is shared. Their translators and carry-backs compose, while direction meets on `exact > over`. The paper warns that squares “do not paste for free” because an outer carry-back may read a field discarded by the inner pair (Sec. 3.3, p. 5). It therefore requires a support condition: the outer carry-back must depend only on observables preserved by the inner pair (Definition 3.6, p. 5).

A route’s contract is the componentwise meet of assurance class, direction, kept observables, and measured cost. The paper states: “a route’s contract is the componentwise meet, the weakest hop on every axis at once.” (Sec. 3.5, p. 6).

how to do it

1. Check each pair at its concrete program (Theorem 3.7, Sec. 3.3, p. 5).
2. Prove or enforce the support condition for the outer carry-back and inner projection (Definition 3.6, p. 5).
3. Compose translators, carry-backs, witness embeddings, domains, and projections; meet directions and assurance levels (Sec. 3.3 and 3.5, pp. 5–6).
4. Propagate loss: an observable survives only when every hop keeps it and later carry-backs depend on it (Sec. 3.3, p. 6).
5. Report the composed route’s weakest grade and cumulative loss rather than upgrading it based on a stronger hop.

Verus form

Inference: Compose a chain of verified Rust transformations only when downstream proof obligations use facts retained by upstream specifications. For example, a serialization lemma may preserve a data invariant only if the deserializer contract exposes every field used by the next lemma. Encode support as explicit `requires`/`ensures` clauses and prove composition with a proof function. Do not treat a chain of individually accepted functions as a proof of the end-to-end property unless the intermediate relation is stated.

where it fails or assumes

A dropped observable or an undocumented dependency breaks composition even if every inner square passes. Inference: Cached Verus proofs can become unsound as soon as a dependency’s contract changes; route keys must include specifications and toolchain versions.

## technique 3: independent branches and corroboration

what it is

The registry can contain independently derived routes between the same languages. If routes disagree, localized square checks identify a faulty hop. If they agree and their diverse prefixes share no translator or carry-back, their agreement corroborates the result. The paper makes independence an explicit assumption (Assumption 2, Sec. 3.6, p. 8).

how to do it

1. Build two routes with disjoint translator and carry-back implementations over the prefix being corroborated.
2. Run the same source question through both routes.
3. Compare their target answers and source-level replay evidence.
4. On disagreement, inspect each route’s first failing square and observable (Lemma 3.15, Sec. 3.6, p. 8).
5. On agreement, retain both artifacts and record the residual shared trusted base; agreement is corroboration, not a proof that shared code is correct (Lemma 3.16 and Table 1, Sec. 3.6, p. 8).

The paper uses a direct RISC-V-to-BTOR2 route and a route derived through the official Sail model; it repeats the pattern for AArch64 (Overview, pp. 2–3; Sec. 3.6, p. 8).

Verus form

Inference: Generate two proof routes for a Rust theorem: for example, a direct Verus lemma and an independently structured ghost-model proof. Require disjoint generation stacks and compare the resulting checked facts or executable witnesses. Keep common Verus, Rust, and contract assumptions in the trusted-base ledger. This can expose a model bug, but not a shared wrong specification.

what the evidence shows

The common-mode mutation experiment injected six identical misreadings into both reference interpreter and translator. The square and poisoned expected grading were blind on all six; cross-route and external Sail differential checks caught every mutant (Table 10, Sec. 6.7, p. 19). The paper also reports 55 applicable single-leg mutants: 51 caught by the square suite, 4 by the compliance-derived benchmark, and none escaping all gates (Table 9, p. 19). It explicitly cautions that “zero escapes means this mutation family is now covered, not that the escape rate is zero.” (Sec. 6.7, p. 19).

where it fails or assumes

Independence can be overstated when routes share emitters, interpreters, libraries, or specifications. Inference: Two agents using the same model, prompt, and contract are not independent semantic anchors.

## technique 4: witness replay for existential answers and certified universal answers

what it is

A satisfiable solver result carries a concrete model. The platform translates the model back through each hop and replays it in the source interpreter. The abstract says: “witness-carrying answers are self-certifying by replay at the source.” (Abstract, p. 1). Universal answers have no single witness; they require grades, branch agreement, and independently checked certificates (Theorem 3.18, Sec. 3.7, p. 9).

how to do it

1. Ask a solver at the reasoning target for a satisfiable model or an unsatisfiability certificate (Overview, pp. 2–3).
2. Carry a satisfiable model back hop by hop into source vocabulary (Fig. 2 and Sec. 2, p. 3).
3. Replay the resulting source valuation in the source-side interpreter; report the source trace as evidence (Theorem 3.17, Sec. 3.7, p. 9).
4. For universal claims, require independently derived branches and a formally checked certificate. The certified tier uses DRAT/LRAT artifacts and cake_lpr (Sec. 6.5, pp. 17–18).
5. Keep solver engines and untrusted elaborators outside the final trusted base when a formally verified checker rechecks the certificate (Sec. 6.5, p. 17).

Verus form

Inference: For an existential Rust claim, emit concrete inputs and a Verus-checked lemma or executable witness, then replay those inputs through the source implementation. For a universal claim, require Verus to prove the quantified `ensures` statement and retain the exact source, contract, toolchain, and proof module. A solver model or model-checker trace is evidence to translate into Verus obligations, not a substitute for a Verus proof.

what the evidence shows

The certified tier reports an 18-byte LRAT certificate for one 8-bit-style question and an 11.8 MB certificate for a harder 16-bit case, with cake_lpr as the formally verified checker (Table 7, Sec. 6.5, p. 17). The paper reports checker negative controls rejecting bogus proofs and satisfiable CNFs (Sec. 6.5, p. 17). It also reports route translation under 0.1 seconds for an unrolling of N=100 and decision under one second (Sec. 6.9, pp. 20–21).

where it fails or assumes

Certificate checking still trusts the checker and its adapter; the paper found an adapter that accepted every outcome until a negative control ran (Sec. 6.6, p. 18). Inference: Verus integrations need positive and negative controls for the invocation adapter, parser, and acceptance condition.

## technique 5: two-plane demand, human registration, and ratchet

what it is

The use plane reads registered declarations and produces evidence-carrying answers. The evolution plane records unanswerable questions, recommends new pairs from demand, requires a human to register a contract, builds a pair, gates it, and ratchets prior coverage so new additions cannot invalidate earlier verdicts. The paper summarizes: “Answers never write; growth never answers.” (Abstract, p. 1).

how to do it

1. Record an unanswered question verbatim with its obstacle and desired target (Overview, p. 3).
2. Aggregate repeated demand and recommend a translation pair or reasoning hub (Sec. 5.3, pp. 11–12).
3. Have a human register the pair’s language, projection, direction, domain, and evidence contract (Sec. 5.1, p. 11).
4. Build the translator and interpreters independently, then run square, branch, certificate, and negative-control gates (Secs. 5.1–5.3, pp. 11–12).
5. Ratchet coverage: every previous verdict remains standing while new declarations add supported constructs (Theorem 5.2, Sec. 5.2, p. 12).

Verus form

Inference: Maintain a registry of Rust/Verus proof capabilities and unmet proof obligations. Agents can propose new lemmas or verifier adapters, but a human or trusted maintainer must register their contracts. Keep accepted studies and proof regressions immutable; additions must pass the same checks and explicit negative controls.

## what is proved, trusted, and left open

The Lean mechanization covers the compositional core, including directional squares, pasting, contract meet, and the lax telescope (Sec. 3.8, pp. 9–10). The evaluation reports 24 recorded defects, 15 caught by cross-checks, and 7 more caught by audits and controls; the authors explicitly call this case-study evidence with no hit-rate denominator (Sec. 6.6, p. 18). The paper’s finite-behavior scope excludes nondeterminism, divergence, and reactive I/O (Sec. 3.1, p. 4).

Inference: Trusted components include language reference semantics, interpreters, route endpoints, shared libraries, the Lean axioms listed by the mechanization, and the user’s question and projection. The paper’s own MUL/ADD blind spot shows that agreement cannot remove common-mode errors.

## threat to agent-written verified Rust

Inference: The threat to formal soundness is moderate when Verus checks every claim and high when agents or adapters share an incorrect contract. The architecture’s strongest lesson is to make loss, assumptions, route independence, and evidence explicit. A passing model-generated proof is trustworthy only within the exact source, specification, toolchain, and checker boundary recorded with it.

## techniques for the catalog

- directional translation pair — specify a translator, carry-back, observables, direction, and domain, then check a per-program commuting square
- support-aware composition — compose routes only when outer carry-backs read observables preserved by inner hops
- independent branch corroboration — use disjoint translation routes to localize disagreements and strengthen agreement evidence
- witness replay and certificates — replay existential models at the source and re-check universal certificates with trusted checkers
- demand-and-ratchet evolution — record unmet questions, human-register new pairs, gate them, and preserve earlier verdicts
