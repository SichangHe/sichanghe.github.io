# Proof-Carrying Certificates for LLM Pipelines: A Trust-Boundary Architecture
(authored by agents unless marked 🧑)
Tag: `koomullil2026proofcarrying`, [paper](http://arxiv.org/abs/2605.16407v1)

## scope and central design

The paper verifies deterministic structures around an LLM, rather than claiming that the model or the external world is correct. It places probabilistic generation below an explicit trust boundary and sends typed artifacts to Lean 4. The paper states: “The framework verifies the deterministic structured computations surrounding a large language model rather than the model itself.” (Abstract, p. 1). A certificate is accepted only when its declared Lean type checks and its transitive axioms are audited with `#print axioms`; the allowed kernel set is Ω = `{propext, Classical.choice, Quot.sound}`, extended by named assumptions for mathematics, cryptography, or ML/human judgments (Definition 3.1, p. 10).

How to apply the boundary and audit:

1. Keep the LLM, embedder, NLI model, and random decoding below the boundary; convert each output deterministically into a Lean input and include a cryptographic digest (Section 3.1–3.3, pp. 10–11)
2. Construct the certificate with typed fields and named non-Ω assumptions (Section 3.3, p. 11)
3. An auditor parses the certificate, optionally recomputes the digest, runs the kernel at the declared type, runs transitive `#print axioms`, and checks that the set is contained in Ω plus the declaration's assumptions; then it compares the output with the certificate (audit protocol, Section 3.3, p. 11)
4. Maintain evaluation evidence and scope predicates for each persistent tier-4 oracle; the paper names ParaphraseOracle, SignedSupportOracle, DecompositionOracle, StepConfidenceOracle, and IIDSamples (Section 3.5 and Table 2, pp. 12–13)

The paper's `AttestedInterface` sketch has `coerce`, `digest`, and `declared_axioms` fields (Section 3.3, p. 11). Inference: a Verus implementation would represent the boundary with Rust structs, hash the serialized ML artifact, and verify a certificate in a small deterministic checker. Verus can prove properties of the checker and its state transitions, but the paper's Lean kernel and `#print axioms` mechanism would remain an external trusted component unless reimplemented and modeled. Inference: the named-oracle list is directly useful to VL because a Verus proof can expose which natural-language judgments remain assumptions instead of silently treating them as proved.

The paper distinguishes four statuses: compiled (kernel checked and audited), specified (formal obligation not compiled), architecturally enforced (type signature), and conjectural (informal) (Section 2.1, p. 8). It reports a compiled artifact of 25 modules and 46 audited declarations: 17 axiom-free, 29 using Ω plus declared non-Ω assumptions, and zero `sorryAx` or `Lean.ofReduceBool` (Abstract, pp. 1–2; Table 5, p. 54). Build time is approximately 10 seconds with a warm Mathlib cache; typical per-certificate kernel re-check is under 100 ms and the full axiom pass under one second on the stated 2024-class laptop (Table 5, p. 54). Inference: these measurements indicate that checking a small certificate can be separated from expensive model execution, but they do not establish production throughput.

## conflict-aware bilattice grounding

The grounding technique prevents support-only scores from hiding evidence that contradicts a claim. First decompose answer `y` into weighted atomic claims and require canonical reconstruction: `Canonicalize(Conjoin claims) = Canonicalize y` (Definition 5.1, p. 16). The decomposition's semantic faithfulness is a tier-4 oracle; the equality check itself is decidable. For each claim/chunk pair, compute a three-way NLI vector `(support, contradiction, orthogonality)` summing to one, take the maximum support and refutation over chunks, and classify each claim as Supported, Contradicted, Contested, or Unknown using thresholds θg and θc (Definitions 5.1–5.2, pp. 16–17).

Then normalize claim weights into `W+`, `W−`, `W±`, and `W?`. Emit only when `W+ ≥ θe` and `W− + W± ≤ θr`; a contested claim therefore contributes to the refutation mass. The paper says: “A single contested load-bearing claim is grounds for abstention, not a footnote.” (Section 5.2, p. 17). The Lean structure stores scores, maxima, statuses, aggregate masses, simplex and reconstruction proofs, and oracle hypotheses. Lemma 5.4 proves that an emitted certificate satisfies the refutation bound, conditional on the NLI and decomposition oracles (Section 5.3, pp. 18–19).

Steps for use are: (1) obtain the answer and retrieval chunks; (2) decompose and check canonical reconstruction; (3) calculate all NLI signatures; (4) compute maxima and classify; (5) calculate normalized weighted masses; (6) set `emitted` through the equivalence with the two threshold inequalities; and (7) kernel-check every proof field and audit axioms (Sections 5.1–5.3, pp. 16–19). Inference: in Verus, claims and signatures can be Rust records with `spec` predicates for simplex, maxima, list alignment, and weighted totals; `ensures` belongs on executable functions, while the oracle outputs should be represented as explicit assumptions or external inputs. The paper's result does not prove a Supported claim true, a corpus factual, or a faithful decomposition; it proves the gate respects the recorded scores (Section 5.5, p. 19).

Pilot A is the grounding evidence. The abstract reports a v5 HotpotQA dev-distractor rerun with adversarial perturbations catching 100% of injected contradictions at a 6.4% false-block rate; the cosine baseline's lowest false-block rate at catch 1.0 was 0.266 (Abstract, pp. 1–2). Inference: the denominator for 6.4% is the pilot's benign examples, whose exact count is specified in Section 12's tables, so this percentage cannot be treated as a universal error rate. The paper explicitly limits the guarantee to the oracle and corpus assumptions.

## maximal certifiable residue

All-or-nothing abstention can discard useful claims. The Maximal Certifiable Residue (MCR) receives finite atomic claims, nonnegative weights, and a family of decidable subset constraints such as Supported-only grounding, contradiction consistency, policy restrictions, Hoare preconditions, and budgets. It returns the highest-weight certifiable subset, breaking ties lexicographically (Definitions 6.1–6.2, pp. 20–21). Theorem 6.3 proves well-definedness, weight optimality, idempotence, and non-increasing weight when constraints are added (Section 6.2, pp. 20–21).

To apply MCR: enumerate claims and weights; define each constraint as a downward-closed, empty-admitting predicate; search below the trust boundary; place the candidate residue and its total weight in a certificate; then check subset inclusion, every constraint, nonnegative weights, and the maximality comparison in Lean (Sections 6.1, 6.3, and 6.5, pp. 20–22). The worked five-claim clinical example uses weights 3.0, 2.0, 1.0, 1.5, and 0.5, with θg = 0.70 and θc = 0.50. Grounding and a precondition remove the allergy claim and its dependent drug recommendation, yielding `{c1,c3}` with weight 4.0 (Section 6.4, p. 22). The paper warns that weighted-subset optimization is NP-hard in general; independent constraints admit greedy O(n|C|) search, dependency DAGs admit O(n²) extraction, and SAT/SMT or weighted-MaxSAT can search typical n ≤ 100 instances (Section 6.5, pp. 22–23).

Inference: Verus can encode MCR with `Seq`/`Set`-like finite collections and prove that a returned residue satisfies each constraint and dominates every checked candidate. The optimization solver remains untrusted input to the checker; the proof obligation must quantify over the finite candidate universe or carry a separately checked maximality certificate. Verus has no direct analogue of Lean's `arg max` theorem machinery, so the paper's abstract operator needs concrete finite representations.

## embedding sensitivity and paraphrase stability

Declare finite meaning-invariant edits `G_inv` and meaning-changing edits `G_sig`. For a normalized embedding, compute the maximum squared L2 drift over `G_inv`, the minimum squared drift over `G_sig`, and `Δ² = R_sig² − R_inv²`; positive Δ² is a selective-sensitivity pass (Definition 7.1, p. 23). Family extension can only increase `R_inv²`, weakening the guarantee (Lemma 7.2, p. 23).

Use the certificate by recording the base vector, every variant vector, lengths, unit bounds, upper and lower drift inequalities, and the exact delta equation. Theorem 7.4 applies Cauchy–Schwarz to prove that squared similarity drift against any unit document vector is at most `R_inv²`; a retrieval decision with margin greater than the square-root radius is unchanged (Section 7.2, pp. 23–24). The theorem does not require Δ² > 0; that predicate is a separate policy signal. Floating-point deployments must commit to the API transcript and hashes, quantize to rationals, and record a rounding-error budget (Section 7.2, p. 24).

Inference: a Verus form would use fixed-size `Vec<i64>` or rational encodings, a specification for squared distance, and lemmas for inner-product arithmetic. Floating-point quantization and the embedding service remain assumptions; the checker proves only the rational transcript's bound. Do not model `R_inv` as a universal text-input Lipschitz constant: the paper says the continuous-ball guarantee is on embedding-output space, while text-input coverage remains limited to the declared finite family unless a separate encoder-Lipschitz hypothesis is supplied (Section 9.1, p. 35).

Pilot B used N=209 short HotpotQA queries, 25 invariant and 15 significant variants per query, GPT-5 generation, a three-judge panel, and two encoders. Positive Δ² occurred in 30% of queries for text-embedding-3-large and 20% for mpnet; the paper reports median Δ² of −0.070 and −0.109 respectively (Section 7.4, p. 26). The held-out flip predictor had F1 = 0.131 on both encoders, while top-10 retrieval flipped for 81–85% of query/variant pairs (Section 7.4, p. 26). Pilot B′ used N=64 long-form paragraphs: positive fractions were 64/64 = 1.000 for text-embedding-3-large and 63/64 = 0.984 for mpnet, with exact Clopper–Pearson intervals; flip-prediction F1 remained 0.148 and 0.137, below the 0.40 threshold (Section 7.5, pp. 28–29). Inference: the evidence supports using Δ² as a per-call gate on this benchmark, not as a reliable retrieval-flip predictor or cross-domain guarantee.

## Hoare-style agent action

For every action and argument, define decidable `Pre(state,args)` and `Post(state,state',args)`. The LLM proposes; a typed executor checks the precondition, executes, checks the postcondition, and records an `ActionCertificate`. A trajectory stores a list of action certificates and proves that each next pre-state equals the prior post-state (Section 8.1, p. 31). Five invariant classes are suggested: data scope, budget, safety, state coherence, and trace integrity (Section 8.2, p. 32).

Application steps are: model states and typed actions; write pre/post predicates; verify the proposed precondition; execute through the typed gate; verify the postcondition and state transition; chain steps; reject at the first failing step; and audit the resulting proof. The paper's compiled trajectory proof is axiom-free, but it cautions that “Axiom-freeness is a statement about the proof’s discharge mechanism, not about the semantic adequacy of the human-authored predicates” (Section 8, p. 31). Inference: Verus can express these as Rust state structs, executable action functions with `requires`/`ensures`, and a sequence invariant linking post-state to the next pre-state. Predicate design remains the product's trust-critical modeling decision.

Pilot C used a tempdir-rooted sandbox, nine tools, five predicate constructors, five tasks, and the same GPT-5 ReAct agent across three harnesses. There were 18 injected unsafe proposals and 6 benign destructive proposals; denominators are explicitly separate (Section 8.5, pp. 32–33). Treatment blocked 12/18 = 0.667 (95% CI 0.444–0.889), deny-list blocked 5/18 = 0.278, and unaudited blocked 0/18. False-block rate was 0/6 for benign proposals. Treatment logs were informative for 13/13 blocks, although one was a non-destructive out-of-scope `stat` proposal; among 13 attacks targeting registered predicates, 12 were blocked (Section 8.5, pp. 33–34). HC1 therefore failed its literal ≥0.95 threshold, while HC2–HC5 passed. Inference: the correct product metric is predicate coverage and localization, not an undifferentiated block-rate target.

## compositional stability and assurance card

Model a pipeline as layers with gain `g_i` and margin `m_i`. The compiled two-layer lemma propagates perturbations when each intermediate distance stays below its margin; the n-layer theorem is specified as induction over a list of layers (Section 9.2, pp. 35–37). The budget is the minimum margin divided by the product of preceding gains, with zero-gain gates treated as non-binding later denominators. A seven-layer example uses gains `(1,0,0,0,1,0,0)` and margins `(0.12,50,3,0.08,0.77,1,1)`, yielding budget 0.12 (Section 9.3, p. 37).

Inference: Verus can implement a recursive layer-list proof with a ghost perturbation bound and per-layer `requires`/`ensures`; the n-layer theorem is not yet compiled in the paper, so it should be treated as a proof obligation rather than imported as an established Lean theorem.

The Universal Assurance Card is a specified Lean record carrying a verdict (Certified, Partial, Residue, or Abstain) and vectors for stability, evidence, calibration, scope, freshness, safety, residue, and provenance. Its `VerdictConsistent` predicate is decidable, but `AssuranceCard.lean` is flagged as not yet compiled (Section 10, pp. 37–38; Table 3, p. 15). A downstream application policy interprets the same vector differently by domain. Inference: a Verus card should be a serializable record with a verified consistency predicate and explicit policy inputs; because the paper's card is specified, VL must not claim a compiled proof until the checker exists.

## extended certificate catalogue

The paper's core five are supplemented by 17 catalogue types. It explicitly states: “To these five are added the 17 catalogue types listed in Table 6: self-consistency lattice, chain-of-thought DAG, Curry–Howard structured output (compiled in two flavours, sorted/distinct and parens/quote, counted as one type), Hoeffding concentration (the Lean structure parameterized over eight named concentration inequalities; counted as one type), proof-of-sampling, scope-of-validity, counterexample-guided repair (CEGAR), and ten more (negative-guarantee, counterfactual, calibration, provenance, temporal validity, budget composition, calibrated abstention, diff, multi-hop, meta-audit).” (Section 15, p. 59). Their operational use is:

- self-consistency lattice — canonicalize multiple sampled answers and certify agreement or abstention
- chain-of-thought DAG — record explicit premises and use step-confidence assumptions to check dependency coverage
- Curry–Howard structured output — make sorted/distinct collections or balanced parentheses/quotes type-correct before emission
- Hoeffding concentration — attach an error bound to finite samples, with named concentration assumptions and an IID oracle
- proof-of-sampling — commit seeds, decoder states, and token logs and check no state carryover
- scope-of-validity — gate a certificate by declared domain, length, and model distribution
- CEGAR repair loop — counterexample-guided refinement adds a failing predicate or invariant and reruns checking
- negative-guarantee — prove that forbidden content or behavior is absent from an output
- counterfactual — compare a certified output against a changed input or policy branch
- calibration — use held-out data to check confidence calibration; the paper's no-ground-truth calibration result is only a conjecture
- provenance — bind model, prompt, corpus, and artifact hashes to the certificate
- temporal validity — check freshness and validity intervals against a committed clock or snapshot
- budget composition — add token, API, monetary, or latency bounds across layers
- calibrated abstention — certify that abstention follows a declared risk or confidence policy
- certificate diff — compare certificates across model, prompt, or corpus revisions
- multi-hop reasoning — compose certificates across explicitly linked retrieval or inference hops
- meta-audit — audit the checker, build, and kernel hashes that validate the other certificates

Appendix E also specifies, without compiled modules, semantic text types with role non-interference, conformal prediction, Markov-category uncertainty composition, spectral sensitivity, abstract interpretation, canonical-denotation decoding, dual-model cross-verification, and zero-knowledge proof-carrying outputs (Section 15, p. 59). Inference: these narrative extensions are design candidates for VL, not techniques whose compiled Verus form can be claimed from this paper alone.

## what is proved, measured, and trusted

The artifact proves arithmetic and structural properties: grounding emission soundness, MCR maximality/idempotence, embedding squared-drift bounds, Hoare trajectory safety, and the two-layer composition lemma (Section 13.4, pp. 53–56). It does not prove natural-language truth, corpus correctness, oracle faithfulness, calibration without held-out data, or the semantic adequacy of safety predicates. Persistent tier-4 oracles are explicitly evaluated but remain trusted assumptions (Sections 3.4–3.5, pp. 12–13).

Inference: the main threat to a product that generates Verus Rust is false confidence at the boundary: a proof can be kernel-valid while a decomposition, NLI judgment, edit family, or safety predicate is wrong. The paper's auditable oracle inventory and per-call card provide a concrete integration pattern for VL; its short-query embedding failures and HC1 predicate-coverage failure warn against presenting soundness machinery as universal empirical protection. The paper's own comparison says adjacent work stops at model verification, empirical reliability, or generic proof infrastructure, while this architecture adds a certificate taxonomy for interfaces; VL should therefore reuse these interface patterns rather than redo generic embedding or NLI benchmarking (Section 2.3, pp. 9–10).

## techniques for the catalog

- trust-boundary certificate audit — hash typed ML artifacts, kernel-check certificates, and reject undeclared transitive axioms
- conflict-aware bilattice grounding — classify weighted claims by support and refutation and gate emission on refutation mass
- maximal certifiable residue — return the highest-weight subset satisfying decidable grounding, policy, dependency, and budget constraints
- selective embedding sensitivity — compare finite invariant and significant edit families and prove a squared similarity-drift bound
- Hoare trajectory certificate — require decidable pre/postconditions and state chaining for every agent action
- compositional stability budget — propagate per-layer gains and margins to a pipeline-wide perturbation radius
- universal assurance card — ship a decidable vector of verdict, evidence, stability, scope, safety, residue, and provenance fields
- proof-of-sampling and oracle audit — commit sampling transcripts and maintain held-out evidence for persistent ML/human assumptions

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
