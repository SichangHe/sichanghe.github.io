# Learning to Prove, Not Just to Answer: Reinforcement Learning from Formal Verification for Natural-Language Logical Reasoning
(authored by agents unless marked 🧑)
Tag: `zhang2026learning`, [paper](https://doi.org/10.48550/arxiv.2609.37203)

## scope and result

The paper presents PROOF-R1, reinforcement learning in which a language model emits a structured proof trace and each proposed inference is checked before it can be used by later inferences. The target instance has premises, a query, and candidate answers. A successful trace selects the entailed candidate and derives it from the premises with the trusted predicate-logic rule system. The paper's central claim is that formal verification should decide which intermediate conclusions become trusted facts and which actions receive outcome credit, rather than merely scoring a completed answer.

The paper states: “A verifiable solution is a finite derivation in which every intermediate conclusion follows from its declared premises alone under a valid rule, and the root conclusion establishes the target.” (section 1, p. 2). PROOF-R1 represents an action as dependency identifiers, one conclusion, and one declared predicate-logic rule. The terminal action binds the selected candidate. During training, the policy samples K complete rollouts; the method computes per-action formal verdicts and answer-dependency credit, then applies a KL-regularized PPO-style update.

Inference: this decomposition is directly relevant to proof-producing Rust agents because it makes every generated proof step carry explicit dependencies and a checkable specification. The language-logic rules and SMT entailment are the paper's setting; mapping them to Rust and Verus requires a different semantics and is not evaluated here.

## technique 1: structured proof actions

What it is. A rollout is free-form analysis followed by a sequence of structured actions and a selected answer. Each ordinary action is (a_t=(D_t,c_t,\rho_t)): a list of dependency identifiers, an intermediate conclusion, and a declared predicate-logic rule. Every action has a unique identifier. The final action's conclusion is the selected candidate.

When to use it. Use this representation when a generated explanation must be replayed, checked step by step, and connected to a final result. It prevents a verifier from having to infer which earlier text a later claim depends on.

How to do it.

1. Give the model the natural-language premises, formal premises, query, and candidate answer set (section 3.1, p. 3).
2. Ask it to emit any analysis, then serialize the proof as a JSON list of uniquely identified actions (section 3.2, p. 4; Appendix I, p. 22).
3. For each ordinary action, include `id`, `dependencies`, `conclusion`, and `rule`; make the terminal action use the selected answer's identifier and proposition (Appendix I, p. 22).
4. Process actions in generation order and retain only conclusions admitted by the verifier for later dependencies.

The paper's concrete output shape is:

```json
[
 {"id":"s1","dependencies":["p1","p2"],"conclusion":"Q(a)","rule":"IMPLICATION_ELIMINATION"},
 {"id":"option_3","dependencies":["s1"],"conclusion":"Q(a)","rule":"GOAL_BINDING"}
]
```

Verus form. Inference: represent each generated step as a Rust value with identifiers, a mathematical conclusion, and a rule tag; use a `spec fn` to describe dependency resolution and `requires`/`ensures` on proof helpers to state admissibility. A Verus proof function can establish a step's postcondition and can be called from another proof function; executable Rust should consume only data whose proof obligations have been discharged. The paper's JSON and first-order formulas do not carry over unchanged.

Evidence. The method's common evaluator scores answer correctness and proof verifiability for all compared methods (Appendix J.1, p. 23). The structured format is therefore part of every reported denominator, not just a presentation convention.

Assumptions and failure. The representation assumes identifiers are unique, dependencies refer only to premises or earlier actions, and the parser preserves the declared fields. It does not by itself establish semantic validity; that is the next technique.

## technique 2: machine-checkable formal verification (MCFV)

What it is. MCFV maintains a semantic state and a stricter rule-verified state. A conclusion enters the semantic state only when the conjunction of its resolved dependency formulas and the negation of the conclusion is UNSAT. It enters the rule state only when that semantic check and a rule-schema check both pass. A separate proof check rejects non-progressing actions. The paper summarizes the purpose as: “A generated conclusion should pass verification before it can support a subsequent verified inference.” (section 3.3, p. 4).

When to use it. Use MCFV when downstream steps must rely only on machine-checked facts, and when semantic entailment must be separated from faithful use of the declared rule.

How to do it.

1. Initialize semantic and rule states as empty; keep original premises available throughout (section 3.3, p. 4).
2. Resolve each dependency identifier against original premises and prior accepted conclusions. Reject an absent identifier as untrusted (Equation 5, section 3.3, p. 4).
3. Build the semantic obligation (VC_t=\bigwedge\phi\land\neg c_t). Ask an SMT solver for UNSAT. If UNSAT, add the conclusion to semantic state (Equations 6–7, p. 4).
4. Resolve dependencies against the stricter rule state and run `RuleCheck` on the declared rule, principal premises, substitutions, and conclusion. Add the conclusion to rule state only if semantic and rule checks pass (Equations 8–9, pp. 4–5).
5. Run `ProofCheck`, which rejects repeated conclusions, dependency restatements, and tautologies (Appendix H, p. 22).
6. Record schema, semantic, rule, and proof-progress booleans. Convert them to the paper's graded signal: 0.0 for schema failure, 0.1 for semantic failure after schema success, 0.3 for rule or progress failure after semantic success, and 1.0 when all four pass (Equation 12, p. 5).

The rule checker matches a declared rule against finite schemas and a substitution, requiring the resolved premises to entail the instantiated schema premises and the conclusion to be logically equivalent to the instantiated schema conclusion (Appendix F, p. 20). The training ontology includes implication elimination, modus tollens, exclusive-disjunction introduction and elimination, disjunctive syllogism, conjunction introduction and elimination, universal elimination, and goal binding (Table 10, p. 20).

Verus form. Inference: a Verus implementation would make a proof helper for each rule whose `requires` states the dependency facts and whose `ensures` states the conclusion. A `proof fn` can call lemmas that prove entailment; `assert` and `assert forall|...|` can expose intermediate facts to the solver. Keep the executable function separate from proof-only code. There is no direct Verus equivalent of “UNSAT” as a runtime verdict; the verifier discharges the corresponding logical obligation during verification.

Evidence. On ProverQA-Overall with Qwen2.5-7B-Instruct, PROOF-R1 reports FVR 70.17 and RVR 41.19, compared with the backbone's 67.64 and 18.91 (Table 1, p. 6). On Qwen3-8B, it reports FVR 96.56 and RVR 94.36, compared with 81.82 and 61.68 for the backbone (Table 1, p. 6). FVR is the micro-average over semantically eligible generated steps and RVR over rule-eligible steps; K=3 outputs per problem (Appendix B, p. 15). These are percentages of eligible steps, not percentages of problems.

Limitations. The guarantee assumes faithful formal representations, consistent premises, acyclic dependencies, trusted parsing, solver, and rule checker (Appendix D, p. 17). The benchmark covers controlled English deduction and abstracts away ambiguity, implicit background knowledge, and pragmatic interpretation (section 5, p. 9).

## technique 3: answer-supporting dependency closure (ASDC)

What it is. A verified action may be irrelevant to the selected answer. ASDC builds a directed graph from premises and generated conclusions, then traverses dependencies backward from the terminal conclusion to obtain its closed ancestor set. Only actions that generated conclusions in this closure receive answer-outcome credit.

When to use it. Use ASDC when rollouts can contain valid but irrelevant branches and policy learning should reward the proof of the chosen answer rather than every valid statement.

How to do it.

1. Create a node for each premise and conclusion and an edge from each declared dependency to its conclusion (Equation 15, section 3.4, p. 5).
2. Starting at the final conclusion, traverse dependency edges backward until all ancestors are included; induce the subgraph on that closure (Equations 16–17, p. 5).
3. Map closure membership to the action that generated each conclusion (Equation 18, p. 5).
4. Normalize the binary answer-correctness outcome within the rollout group for a problem, then multiply it by the closure mask. Actions outside the closure receive zero outcome advantage even when the answer is correct (Equations 19–20, p. 5).

Verus form. Inference: model the proof graph as ghost data or a `Seq` of identifiers and prove a reachability predicate for the terminal result. A proof function can establish that every node in the closure has an earlier dependency and that the terminal node's `ensures` follows from the closure. Verus does not provide this paper's graph traversal automatically; the closure algorithm and its invariants must be written.

Evidence. The ablation isolates ASDC. On ProverQA-Hard with Qwen2.5-7B-Instruct, full PROOF-R1 obtains Avg@3 44.89, Pass@3 76.88, FVR 58.74, RVR 19.38, and RGD 1.05; removing ASDC gives 41.37, 71.86, 44.18, 16.69, and 1.34, respectively (Table 2, p. 7). Avg@3 and Pass@3 average three sampled answers per problem; FVR/RVR average eligible steps; RGD is log generated/reference closure size (Appendix B, p. 15).

## technique 4: verification-aligned optimization and rule-conditioned centering

What it is. PROOF-R1 combines each action's graded MCFV advantage with its ASDC-masked outcome advantage, then maps that action advantage to the exact token span that emitted the action. It optimizes a KL-regularized clipped PPO objective. The MCFV signal is centered separately for each predicate-logic rule using an exponential moving average, rather than assuming all rules have equal difficulty.

How to do it.

1. For every action, subtract the clipped rule-specific moving-average baseline from its graded verification signal (Equations 12–14, p. 5).
2. Add the masked outcome advantage with weights λv and λo (Equation 21, p. 6).
3. Build an action-to-token matrix that distributes one action's advantage uniformly over its exact token span and gives other tokens zero weight (Appendix A, Equation 22, p. 14).
4. Apply the clipped PPO loss plus a sampled KL penalty to a fixed reference policy; the implementation additionally dual-clips negative advantages (Appendix A, Equations 23–26, p. 14).

Verus form. Inference: this is training infrastructure rather than a Verus proof pattern. A VL system could use the verifier's proof obligations as reward labels while separately compiling accepted Rust/Verus code. Verus proves the generated program and contracts; it does not implement PPO, token alignment, or policy gradients.

Evidence. The rule-conditioned baseline has lower held-out prediction error than a global baseline: at training step 100, error is 0.18 versus 0.24 (section 4.4, p. 8). The paper reports that full PROOF-R1 improves Qwen2.5-7B-Instruct ProverQA-Hard over the strongest baseline by 4.86 Avg@3 points, 11.05 Pass@3 points, 1.15 FVR points, and 3.66 RVR points, while reducing RGD from 1.15 to 1.05 (section 4.2, p. 7). The gradient analysis reports a 96.6° MCFV/ASDC angle in layers 0–8, 126.6° in the final layer, and an MCFV weighted gradient norm about 1.14 times ASDC (section 4.4, pp. 8–9). These are training diagnostics, not proof soundness results.

## technique 5: conditional certificate soundness and expanded rule coverage

The paper proves a conditional theorem: if every generated conclusion in the answer closure passes semantic entailment, dependencies are acyclic and trusted, and goal binding identifies the terminal answer, then the premises entail the selected answer. If rule checks also pass, each inference conforms to its declared schema (Appendix D, p. 17). This is a proof of the checker under explicit assumptions, not a proof that the assumptions hold for arbitrary model outputs.

For out-of-distribution FOLIO, the authors add seven guarded quantifier rule families to the training ontology: universal implication chaining, universal propositional inference, existential introduction, existential conjunction elimination/introduction, existential implication elimination, and quantifier negation (Appendix G, Table 11, p. 21). They replay frozen outputs without changing formulas, identifiers, or goal binding, and classify each step as training-seen or unseen. On unseen rules, PROOF-R1 reaches FVR 86.21 and RVR 63.08, versus the backbone's 63.24 and 34.92 (Table 12, p. 21). Inference: a Verus port would need explicit lemmas for each quantifier pattern and a model of the Rust property being quantified; these first-order rules cannot be copied into Rust proofs mechanically.

## evidence, trust, and product threat

The principal experiments train on ProverQA and test four backbones: Qwen2.5-7B-Instruct, Llama-3.1-8B, Qwen3-8B, and GLM-Z1-9B-0414. Cross-dataset tests use FOLIO and ProofWriter. The paper states: “We recheck the frozen Qwen2.5-7B-Instruct outputs from the main ProverQA comparison.” (Appendix E, p. 18). The frozen comparison contains three responses for each of 681 problems for each of three methods, totaling 6,129 responses. FVR and RVR numerators and denominators are identical across the four backends (Appendix E, pp. 18–19). A blinded GPT-5.5 review of 2,000 sampled steps reports 1,952 agreements out of 1,957 determinate reference cases, weighted 99.73% (Table 9, p. 19); this is an independent semantic review, not a kernel proof of the model.

What is proved or measured: the conditional certificate argument proves entailment assuming trusted components; the experiments measure answer accuracy, eligible-step semantic and rule pass rates, proof-length deviation, backend agreement, and training diagnostics. What remains trusted: parsing, formalization of natural language into formulas, premise consistency, the solver/checker implementations, and the model's goal binding. The authors' limits exclude unrestricted natural-language interpretation and other logical formalisms.

Inference: the threat to a product that asks an agent to write Verus-verified Rust is medium. The useful design is explicit dependency-carrying proof actions, state admission only after checks, and credit restricted to the final proof closure. The threat is that a high answer score can coexist with untrusted or irrelevant proof steps unless every Rust/Verus obligation is checked. PROOF-R1 does not verify Rust, memory safety, API contracts, hardware behavior, or the correctness of a Verus specification. VL should reuse the separation between semantic validity, rule faithfulness, and proof progress, but must replace first-order SMT checks with actual Verus verification and preserve the trust boundary around external code and specifications.

No contradiction appears in the reported main tables. Percentages are rounded means and standard deviations; the paper explicitly says FVR/RVR are micro-averaged over eligible steps, while Avg@3 and Pass@3 use K=3 outputs. The stronger Qwen3 answer accuracy is near saturation, so gains there are mainly proof-verification gains. Training-free LogicAgent sometimes has slightly higher answer accuracy but uses multiple model calls and substantially more inference-time tokens (section 4.2, p. 7).

## techniques for the catalog

- structured proof actions: emit uniquely identified dependency, conclusion, and rule fields so each inference can be replayed
- machine-checkable formal verification: admit conclusions only after semantic UNSAT, rule-schema, and proof-progress checks
- answer-supporting dependency closure: traverse dependencies backward from the final answer and credit only supporting actions
- verification-aligned optimization: combine per-action verification and closure-masked outcome advantages at exact token spans
- rule-conditioned centering: normalize verification rewards by the moving average for each logical rule
- conditional proof-certificate soundness: derive answer entailment from acyclic trusted dependencies and discharged semantic obligations
- expanded rule coverage: add guarded unseen quantifier schemas and replay frozen outputs to test rule generalization

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
