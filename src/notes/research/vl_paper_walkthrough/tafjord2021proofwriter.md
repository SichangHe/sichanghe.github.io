# ProofWriter: Generating Implications, Proofs, and Abductive Statements over Natural Language
(authored by agents unless marked 🧑)

Tag: `tafjord2021proofwriter`, [paper](https://doi.org/10.18653/v1/2021.findings-acl.317)

## problem and result

ProofWriter trains a text-to-text transformer to reason over facts and rules written in English. It performs three tasks: answer a question and generate its proof, enumerate every implication of a theory, and perform restricted single-fact abduction. The key engineering choice is iterative one-step generation: generate one rule application and its proof, append the new implication to the context, and repeat until the model emits `None`. Longer proofs are assembled from the one-step fragments, so every iterative step is a decision the model actually made.

The abstract reports: “In particular, iterating a 1-step implication generator results in proofs that are highly reliable, and represent actual model decisions (rather than post-hoc rationalizations).” (Abstract, PDF p. 1.) On the RuleTaker D5 test set, the All-At-Once model reaches 96.2% exact proof accuracy over 20,192 questions, compared with PRover's 87.1%; the Iterative model reaches 97.0% on the same test in Table 4's CWA/OWA experiments when trained as described there. The paper also measures proof verification, implication enumeration, and abduction rather than treating answer accuracy as proof correctness.

## technique 1: make logic semantics explicit with CWA, OWA, and NAF

Use this before training or checking any generated proof. A theory C is a set of English facts F and rules R, and Q is a hypothesis fact. Under Datalog semantics, a fact is true when it is explicit or recursively supported by a rule whose conditions are true. The paper evaluates two negation choices:

- closed-world assumption (CWA): negation as failure (NAF), so every fact not provable is false
- open-world assumption (OWA): negative facts and negative rule conclusions are allowed, and Unknown is a third answer

Steps from Sec. 3.1–3.2 (PDF pp. 2–3):

1. Choose CWA or OWA for the dataset and evaluator.
2. Define truth as explicit membership or recursive rule support.
3. Under CWA, answer a positive question False when neither it nor a proof is found; answer a negative question True by the same convention.
4. Under OWA, distinguish False from Unknown and permit negative facts and conclusions.
5. Require generated proofs to use the selected semantics consistently.

The paper states: “The first, following prior work, makes the closed-world assumption (CWA) and uses negation as failure (NAF), so that any fact not provable is assumed false.” (Sec. 3.2, PDF p. 3.) This is a semantic assumption, not evidence that the natural-language statement is false in the real world.

Verus form (Inference): define a `spec fn supported` as a bounded closure over a finite set of facts and rules. Inference: define separate `spec fn cwa_answer` and `spec fn owa_answer`; the latter returns an enum with `True`, `False`, and `Unknown`. Inference: a proof function should require the chosen semantics and ensure that a NAF step has a failed positive derivation under CWA. Inference: do not silently turn an unproved Verus postcondition into a negated claim; that would import NAF into a setting that normally uses explicit contracts.

## technique 2: represent proofs as acyclic alternating graphs and linearize them

Use this when generated text must identify both the premises and intermediate conclusions. A proof P of fact fq is a directed acyclic graph (N, E). Nodes are facts or rules; each edge connects a fact to a rule that consumes it or a rule to the fact it concludes. Facts are known context facts, NAF facts, or intermediate rule conclusions. The intermediate conclusion nodes are richer than PRover's representation because they expose every derived fact.

Steps from Sec. 3.3–3.4 (PDF pp. 3–4):

1. Give every context fact and rule a stable identifier (`fact1`, `rule1`, and so on).
2. Give a negation-as-failure leaf a `naf*` identifier and each derived intermediate conclusion a `conc*` identifier.
3. Alternate fact and rule nodes along each branch; known and NAF facts are leaves, while derived conclusions are internal facts.
4. Linearize conjunctions with `&`, rule conclusions with `%`, and reverse implication with `#`.
5. Serialize the tree in Polish notation. For example, `((fact1 & fact2) → rule1 → conc1)` becomes `# rule1%conc1 & fact1 fact2`.
6. Append a `with conc...` sequence that maps each generated conclusion identifier to its English sentence.

The paper's definition is precise: “We define a proof P of a fact fq as a directed acyclic graph (N, E) with nodes n ∈ N and (directed, untyped) edges e ∈ E.” (Sec. 3.3, PDF p. 3.) A no-proof answer is serialized as `None`; a depth-0 proof is the known fact itself.

Verus form (Inference): model the graph as a ghost inductive tree or DAG with a finite node sequence and edge sequence. Inference: write `spec fn well_formed` to require acyclicity, alternating node kinds, and valid identifier references. Inference: prove a `proof fn` that each rule edge's premises imply its conclusion, with `ensures` stating that the root derives Q. Inference: an executable parser can check identifiers and topology, while Verus proves that an accepted graph has no dangling or cyclic derivation; the transformer that emits text remains an external producer.

## technique 3: compare all-at-once and iterative generation

Use All-At-Once when a single sequence is short and the required proof depth is represented in training. Use Iterative when depth varies or unseen depths matter.

All-At-Once training maps theory plus question directly to answer plus complete proof. Iterative training maps a theory to one implication and its one-step proof. For each theory, construct examples by adding earlier inferred implications to the context. Preserve dependency order: if I3 depends on I2, include I2 before generating I3. At test time, repeatedly apply the one-step model and append each result until `None`; search the generated implications for Q and its negation.

The training construction is stated in Sec. 3.6.2 (PDF p. 5): “This ensures that all example inferences are depth 1 (i.e., a single rule application).” The stopping procedure is also explicit: “It then looks for the question among them. If found, the answer is True with the proof given.” (Sec. 3.6.2, PDF p. 5.) If neither Q nor its negation appears, the answer follows CWA or OWA.

Evidence: Table 5 trains on D3 and tests on D5, where depths 4 and 5 are unseen. All-At-Once proof verification is 66.1% at depth 4 and 16.4% at depth 5 under OWA; Iterative verification is 94.6% and 90.8% respectively. Table 4's IID D5 results show both methods above 95% proof accuracy for most depths seen in training. The paper attributes Iterative robustness to reliable one-step predictions but notes that errors can accumulate and exhaustive forward chaining is inefficient.

Verus form (Inference): represent one-step inference as a pure function with a contract that the returned implication follows from the current finite context. Inference: run an iterative Rust loop with an `invariant` stating that every appended implication has a valid certificate and that the context grows monotonically. Inference: use a decreasing or bounded measure for termination when the model emits `None`; a finite universe of possible ground facts gives a natural bound. Inference: the proof object's step certificates can be checked with `proof fn`s, while the neural model's probability choice remains trusted.

## technique 4: verify generated proofs step by step

Use this when a complete generated string may be post hoc and need not reflect the model's internal decisions. For each proof edge fragment, form a depth-1 QA query containing the stated premises and rule, and ask the model whether the intermediate conclusion follows. A proof is verified when every step is accepted. OWA proofs can be fully checked this way. CWA proofs with NAF are only partially checkable because NAF depends on failure over the full theory.

The paper gives the method: “For example, if a generated proof step states that fact2 + fact3 + rule4 implies conc1, we can simply ask ProofWriter in QA mode if this is true (Figure 4).” (Sec. 5.3, PDF p. 8.) Verification is separate from correctness: “an unverified proof is not necessarily wrong, rather cannot be verified as right.” (Sec. 5.3, PDF p. 8.)

Table 6 reports the proportion of correct proofs that are verified. With D3 training and CWA, verification is 93.2% at depth 3, 66.7% at depth 4, and 13.8% at depth 5; with Iterative generation it is 96.8%, 94.6%, and 90.8% at those depths. Under D5 training, CWA verification is 95.8% at depth 3, 92.9% at depth 4, and 89.3% at depth 5. Iterative proofs are always verified by construction because they are assembled from the model's one-step outputs.

Verus form (Inference): replace the neural QA check with a deterministic rule checker whose `ensures` states that accepted premises imply the conclusion. Inference: recursively verify each graph edge and use an `invariant` over a traversal stack to connect local checks to the root claim. Inference: NAF checks need an explicit closed-world closure proof; a failed search without that proof is not a Verus certificate. Inference: use exact symbolic facts rather than natural-language strings in the verified core.

## technique 5: enumerate all implications by exhaustive forward chaining

Use this when the system must return consequences rather than answer a preselected question. Iterative ProofWriter already enumerates by generating one implication at a time until `None`. For All-At-Once enumeration, train a model to emit the complete unordered implication list.

Steps from Sec. 3.7 (PDF p. 6):

1. For each theory C, collect every implication I that follows from C using the formal source program and its proofs.
2. Train the All-At-Once model on `C → {I1, ..., In}` outputs, or reuse the Iterative one-step model.
3. At test time, compare the predicted implication set against the gold set using exact-set accuracy and F1.
4. For Iterative mode, append each newly generated implication to C before generating the next one and stop at `None`.

Table 7 shows why the iterative procedure is useful: on D3+Enum, All-At-Once F1/accuracy are 98.9%/92.5%, while Iterative is 99.8%/98.8%; on the harder D5-Enum test, All-At-Once falls to 94.5%/44.6%, while Iterative remains 99.5%/93.9%. The exact-set denominator is the table's D3 or D5 test set, not the 20,192 proof questions.

Verus form (Inference): define closure computation over a finite set and prove with a loop `invariant` that every emitted fact is supported and that no candidate remains unexamined at termination. Inference: a `spec fn` can define the fixed-point closure; an executable enumerator can return a certificate for each rule application. Inference: exact-set comparison is a test metric, not a proof of completeness unless the finite universe and rule instantiation bounds are specified.

## technique 6: restricted single-fact abduction

Use this when an unprovable conclusion should be repaired by identifying one missing fact. The task is evaluated only under OWA: given C and unprovable Q, find every fact fm (other than Q itself) such that C ∪ {fm} implies Q.

Dataset construction steps from Sec. 3.8 (PDF p. 6):

1. Retain the original formal Datalog theory Cf and enumerate all possible candidate conclusions Qf and candidate missing facts fm,f.
2. Use a theorem prover to test whether Cf ∪ {fm,f} implies Qf for every pair.
3. Convert successful formal facts to English with the dataset's generation templates.
4. Train ProofWriter on `C, Q → factM1, ..., factMi` and evaluate predicted fact sets with F1 and exact-match accuracy.

The paper limits the claim: “We do this for a restricted form of abduction, namely single-fact abduction.” (Sec. 3.8, PDF p. 6.) Table 8 reports D3-Ab F1 97.4% and exact accuracy 94.5% on 7,067 test examples; D5-Ab gives F1 97.3% and exact accuracy 93.5% on 7,181 examples. Recall falls with proof depth: Table 9's D3-Ab depth-5 row has 36.84% recall over 19 gold proofs, whereas D5-Ab depth 5 has 78.13% over 96 gold proofs. Zero-shot Electricity abduction drops to 64% F1 and 62% accuracy for one rulebase.

Verus form (Inference): encode abduction as a search over a finite candidate-fact set. Inference: a `spec fn` can state `implies(extend(C, fm), Q)`, and a `proof fn` can check the returned rule chain. Inference: require that fm is distinct from Q and that the logic is OWA; NAF-style absence cannot justify a missing fact. Inference: an optimizer may rank candidates, but Verus should check each accepted candidate's derivation independently.

## evidence, trust boundary, and relevance to VL

ProofWriter's formal source is Datalog, but the model consumes and emits English. The gold implication and abduction labels are generated by a theorem prover over the underlying formal program, so they are data-generation evidence rather than a proof of the transformer. The T5-11B model, tokenization, decoding, stopping criterion, natural-language templates, and dataset annotations remain trusted. Proof exact-match metrics reject any graph that differs from a gold proof, even if it is logically valid by another route; conversely, a gold graph can encode a wrong formalization.

Inference: for VeruLaw, the valuable pattern is to make every agent-generated proof step independently checkable against a typed Rust/Verus relation. Inference: iterative one-step generation maps to a loop that appends a certificate and maintains an `invariant`; the final result can be accepted only after a deterministic closure checker. Inference: All-At-Once output is useful as a proposal but should be decomposed into local obligations before acceptance. Inference: abduction suggests an explicit repair mode that asks for a missing precondition or lemma and verifies the completed chain, while preserving the distinction between “unknown” and “false.”

Inference: VL should not redo natural-language proof generation, generic forward-chaining enumeration, or single-fact Datalog abduction as novel formal-verification algorithms. A product experiment should instead measure whether certificate-checked one-step proposals reduce repair effort and how often agents propose unsupported premises. The paper does not establish memory safety, Rust correctness, Verus solver soundness, or adequacy of the target specification; its threat to agent-written verified Rust is therefore indirect and concentrated in unsound translation from prose to contracts.

## techniques for the catalog

- explicit logic semantics — choose CWA/NAF or OWA/Unknown before generating and checking proofs
- acyclic proof encoding — represent fact, rule, NAF, and conclusion nodes in a serializable alternating graph
- iterative one-step proving — generate and append depth-1 implications until exhaustive forward chaining stops
- proof-step verification — check each generated implication as a separate QA or deterministic rule query
- implication enumeration — emit every logical consequence and score exact sets with F1 and exact match
- restricted abduction — find one missing fact whose addition makes an unprovable conclusion derivable

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
