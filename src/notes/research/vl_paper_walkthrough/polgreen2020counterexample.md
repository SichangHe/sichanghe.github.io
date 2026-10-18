# CounterExample Guided Neural Synthesis
(authored by agents unless marked 🧑)
Tag: `polgreen2020counterexample`, [paper](http://arxiv.org/abs/2001.09245v1)
## paper and result

Polgreen, Abboud, and Kroening combine a neural program synthesizer with SMT reasoning. The target is loop-invariant predicates over bit-vectors. Example-Guided Neural Synthesis (EGNS) converts a logical invariant specification into input/output examples, asks a neural network for candidate predicates, and verifies them. CounterExample-Guided Neural Synthesis (CEGNS) repeats this with counterexamples from failed candidates. The introduction states: “the counterexample guidance significantly increases the performance of the neural network: CEGNS nearly doubles the number of benchmarks that the neural network can solve on its own.” (Introduction, PDF p. 2.) The abstract says the formal guidance “improves the performance of the neural network substantially, nearly doubling the number of benchmarks it can solve.” (Abstract, PDF p. 1.)

## technique 1: train a neural synthesizer on informative examples

What it is and when to use it. Train a model to map sets of input/output examples to candidate predicates, then use a verifier to enforce the full logical specification. This separates fast neural proposal from exact checking.

Data construction steps. Generate syntactically valid bit-vector programs of at most three input parameters, up to “give” operations (the paper's text; presumably a typo for five), and up to one arbitrary constant plus zero and one (Section 4.2). Remove equivalent mutants with syntactic rules and SMT checks. For an `ite`, recursively inspect leaf branches; if an SMT query shows a branch infeasible, replace the conditional with the feasible branch. Remove programs that always return one constant or one input argument. Generate examples using random inputs plus Z3 (version 4.5.1, random phase selection) so examples cover as many conditional branches as possible.

The paper generated 32 million programs, discarded 2,613,768 as redundant, and retained 29,386,232. It generated ten input/output examples per program. Training used one epoch, Adam, masked cross-entropy, a Tesla Z100 on AWS p3.xlarge, and 75 hours for the complex network. The authors describe the central problem precisely: “Our training data is a set of candidate programs, each accompanied by a corresponding set of input-output examples.” (Section 4.1, PDF p. 8.)

The complex network encodes each example with an input LSTM and output LSTM, pools decoder outputs, and uses greedy or beam decoding. Inputs are 32-bit vectors represented in binary and normalized decimal form; outputs are Boolean. The simpler feed-forward network with max pooling fails except on trivial invariants, so experiments use the recurrent architecture.

Verus form. Inference: train or prompt a generator from finite Rust states and Boolean predicate labels, then emit a Verus `spec fn` candidate. Use SMT/Verus to check inductiveness: initialization implies the predicate, predicate plus transition implies the next predicate, and predicate implies the safety assertion. Verus can express these as proof lemmas and `requires`/`ensures`; the model's finite examples remain training data, not evidence of universal validity.

Limits. The network is trained only for the bit-vector theory and this grammar. The paper's own threat section says performance may be worse for other theories and that the benchmark set is limited.

## technique 2: Example-Guided Neural Synthesis (EGNS)

What it is and when to use it. Use SMT to turn a specification into labeled examples that a neural network can consume, then verify each generated candidate against the original formula. Use EGNS when the network cannot directly ingest logical constraints.

Steps. Start from the invariant formula `(I(x) ⇒ P(x)) ∧ (P(x) ∧ T(x,x′) ⇒ P(x′)) ∧ (P(x) ⇒ A(x))`. Sample inputs over the full bit-vector range. For each input, use SMT to choose a Boolean output consistent with the formula. For invariant synthesis, compute known values from `I`, `T`, and `A`; apply three heuristics: retain only definitively true/false labels, over-approximate by assuming true when the assertion permits it, and under-approximate by assuming false when the initial condition does not hold. When still unknown, randomly choose true or false. The paper reports that the combination of all three heuristics performs best. Generate candidate predicates with the neural network, then pass each to an SMT verifier. Return a candidate only if the verifier proves the full formula; otherwise terminate with no answer.

The paper says: “The first algorithm, Example-Guided Neural Synthesis, comprises of three steps: 1) we use SMT to convert the given logical specification into a set of input-output examples; the goal is to generate a set that captures as much of the specification as possible; 2) we use the neural network to generate candidate programs from the set of input-output examples; 3) finally, we use SMT to verify whether any of the candidate programs returned by the network meets the specification.” (Introduction, PDF pp. 1-2.)

Verus form. Inference: encode a candidate invariant as a `spec fn` over the Rust state and prove initialization, preservation, and safety in a `proof fn`. Generate finite labels with an external SMT model only to guide search. The final Verus proof is the acceptance check. A Rust loop's `invariant` clause can use the synthesized predicate, but it must be written as a clause on the loop, not called as a function.

Evidence. With beam size 100, EGNS solved 12 benchmarks (Section 7.2). The paper reports only solved counts, not the total number of benchmarks; it uses two benchmark sets (SyGuS loop invariants with unbounded integers replaced by bit-vectors, and safety invariants for C programs) and a 600 s timeout (Section 7.1). EGNS is fast (13.7 s average) but solves fewer benchmarks than CEGNS. Inference: a single example set, with some labels chosen at random, may not be enough to guide the network to a globally valid predicate. The paper says CEGNS corrects the over-approximation through counterexamples in later iterations (Section 6).

## technique 3: CounterExample-Guided Neural Synthesis (CEGNS)

What it is and when to use it. Integrate EGNS into a CEGIS loop. When a candidate fails the universal specification, extract a counterexample, label it, and add it to the next neural input set. The loop can refine an over-approximate invariant but “is not guaranteed to terminate.” (Introduction, PDF p. 2.)

Steps. Initialize examples with the EGNS heuristics, intentionally over-approximating the invariant. Generate a beam of candidate predicates. Before expensive verification, test each candidate against the current examples; retain up to `n` candidates that satisfy all examples, or retain the candidate satisfying the most examples if none do. Verify retained candidates with Z3 (Section 6.1). For a counterexample state `x`, negate the candidate's wrong output to form a new input/output example. If the failure is an inductiveness transition, choose the example that removes the predecessor `x` because initialization used an over-approximation. Keep only a finite window of counterexamples and discard duplicates and old entries, since neural candidates are not monotonic. Use Z3's random phase selection to increase counterexample diversity.

The paper gives the key heuristic: “Given k candidate programs and a set of input-output examples, we introduce a pre-verification step which checks each candidate starting with the most probable candidate, against the set of input-output examples.” (Section 6.1, PDF p. 12.)

Verus form. Inference: after Verus rejects a candidate invariant, extract the failing verification state or model if available, convert it into a concrete state predicate example, and add it to the prompt or training buffer. For a Rust loop, distinguish a failed initialization obligation from a failed preservation obligation; label the former as a state that must satisfy the invariant and the latter as a predecessor/ successor pair that exposes the missing strengthening. Verus diagnostics may not expose a single SMT model in a stable format, so a bounded executable harness or custom SMT query may be needed.

Evidence. In the comparison, the authors use beam size 100 and store up to 100 programs per network call (Section 7.2). On the reported benchmark sets with a 600-second timeout, CEGNS solved 21 benchmarks, EGNS 12, the authors' standard CEGIS 23, CEGIS(T) 26, and CVC4 53. Average times were 46.3 s, 13.7 s, 1.5 s, 74.3 s, and 5.5 s respectively (Table 1, PDF p. 14). CEGNS solved five benchmarks that standard CEGIS did not and two that CEGIS(T) did not, but CVC4 was much stronger overall. Inference: the result shows that counterexample guidance improves the network, not that the neural approach beats solver-based tools; the paper itself calls CVC4 “formidable”.

## what is trusted and what remains open

Inference: the SMT verifier, Z3's bit-vector semantics, generated training labels, neural architecture, 600 s timeout, and benchmark translation from unbounded integers to bit-vectors are trusted or fixed assumptions. The paper says the network does not provide the correctness guarantee; the final SMT check does (Abstract, Section 5). The paper says the loop “is not guaranteed to terminate” (Section 1). Inference: finite counterexample retention can discard useful information. The paper's threats to validity (Section 7.3) say results cover only bit-vectors, a limited benchmark set, and one empirically chosen architecture.

## techniques for the catalog

- informative training-data generation — remove equivalent mutants and generate examples that cover conditional branches
- Example-Guided Neural Synthesis — convert a logical specification to SMT-labeled examples, generate candidates, and verify universally
- invariant-label heuristics — combine definite labels, over- and under-approximation, and random labels for unknown states
- CounterExample-Guided Neural Synthesis — add verifier counterexamples as new labeled examples in a CEGIS loop
- candidate pre-verification — filter beam candidates against known examples before invoking the full verifier
- bounded counterexample memory — discard duplicates and old examples to control non-monotonic neural refinement
