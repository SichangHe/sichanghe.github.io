# Automatic Generation of Safety-compliant Linear Temporal Logic via Large Language Model: A Self-supervised Framework
(authored by agents unless marked 🧑)
Tag: `li2025automatic`, [paper](https://arxiv.org/abs/2503.15840v4)

## scope and result

AutoSafeLTL generates Linear Temporal Logic (LTL) from natural-language cyber-physical-system tasks, then enforces safety constraints before returning a specification. An edge User LLM performs translation and local repair. Cloud agents align atomic propositions and interpret formal counterexamples. The formal checker converts the candidate task formula and each safety constraint into Büchi automata and checks language inclusion. A candidate is accepted only when its behavior language is included in every safety language.

The paper's abstract states: “We present AutoSafeLTL, a self-supervised, cloud–edge–collaborative framework that automates the generation of safety-compliant LTL specifications while preserving logical consistency and semantic fidelity.” (abstract, p. 1). The authors prioritize safety over preserving an unsafe request: “Our framework prioritizes safety-compliance over strict semantic fidelity to the Desired Task: when the original route violates safety, it is reordered with a safe alternative that still reaches the same destination.” (section III-C.3, p. 5). The paper's running traffic example changes a route that violates a safety rule requiring the route to proceed straight or make a right turn first, then checks the repaired formula.

Inference: the technique transfers to Verus at the level of a generate–check–repair loop. LTL language inclusion and Büchi automata are not Verus constructs, so a Rust system must replace them with executable models and Verus proof obligations.

The framework says: “The Automated Verification process consists of two stages: Syntactic Check and Semantic Check.” (section III-A, p. 3).

## technique 1: define safety compliance as language inclusion

What it is. Let (D) be a natural-language task and (\Psi=\{\psi_1,\ldots,\psi_n\}) safety restrictions. The desired formula (\phi) must satisfy (L(A_\phi)\subseteq\bigcap_iL(A_{\psi_i})), where each (A) is a Büchi automaton for the corresponding LTL formula (section II-D, p. 3). A violating behavior is therefore a word accepted by the task automaton but rejected by a safety automaton.

How to apply it.

1. Define atomic propositions and LTL operators `X` (next), `U` (until), Boolean connectives, and `G`/`F` as needed (section II-A, p. 2).
2. Translate the generated task formula and each safety formula into Büchi automata. The authors use Spot's LTL2BA translation (section III-C.2, p. 4).
3. Run a language-inclusion checker. The authors use RABIT and support multiple constraints in parallel (section III-C.2, p. 4).
4. Accept only an included candidate. Any non-inclusion yields a witness for repair.

Evidence. The paper says: “The process terminates once a counterexample is found, which in this case is !straight_200m.” (section III-C.2, p. 4). The witness is produced by the inclusion-checking component.

Verus form. Inference: encode a safety property as a Verus predicate over traces or state transitions, and prove that every reachable transition preserves it. A finite-state protocol can use a ghost state machine and `invariant` clauses. Unlike LTL inclusion, Verus will need a concrete trace model and induction over Rust execution.

## technique 2: syntactic check with proposition alignment

What it is. Before semantic inclusion, AutoSafeLTL aligns atomic propositions and checks operators. The paper states: “For Operator Matching, a token-based algorithm checks operator usage and parenthesis balance.” (section III-C.1, p. 4). A cloud LLM-as-an-Aligner maps task propositions to a safety-constraint library. A token-based checker verifies operator usage and balanced parentheses. Errors include type and position, and are sent to the edge User LLM for local correction (section III-C.1, p. 4).

How to apply it.

1. Extract all atomic propositions from the safety constraints to form a canonical library.
2. Ask the Aligner to map task propositions to the closest canonical entries. In the paper's example, `go_straight_500m` becomes the library entry `straight_500m`; `go_straight_200m` becomes the format-similar `straight_200m`, which is absent from the displayed library (section III-C.1, p. 4).
3. Check every temporal and Boolean operator and parenthesis with a deterministic token pass.
4. Return the error type and position to the User LLM for on-device correction.
5. Re-run the syntactic pass before invoking automata construction.

Verus form. Inference: build a typed Rust specification AST or enum for permitted events and predicates. Parse and validate it before proof generation. A canonical proposition map can prevent two names for one state, but the mapping itself must be reviewed because lexical similarity does not establish semantic equivalence.

## technique 3: counterexample-path extraction from inclusion checking

What it is. The authors propose extracting a concrete path to explain a counterexample word that may drive several automaton paths. Theorem 1 claims existence of a finite path simulable in the task automaton but not the safety automaton (section III-C.3, pp. 4–5). Proof 2 states: “We use the Breadth-first search(BFS) Algorithm to traverse from all state pairs at most once to detect a counterexample.” (p. 5).

The displayed Algorithm 1, “Comparison Path Storage” (p. 5), contains these steps:

1. Initialize `post[state][symbol]`, a queue of initial state pairs, and a visited set.
2. Dequeue a state pair; skip it if already visited, otherwise record it.
3. For each symbol, compare `post[state1][s]` with `post[state2][s]`.
4. If the successor sets differ, build, store, and return the path from the current pair.

Proof 2 describes backtracking through the visited state map. Proposition 1 claims worst-case extraction time \(O(n_1n_2m)\), where \(n_1,n_2\) are state counts and \(m\) is alphabet size; the claimed path-length bound is \(n_1n_2\) (p. 5). Algorithm 1 lists `maxdepth` as input but shows neither a depth check nor successor enqueueing. Inference: the displayed pseudocode is incomplete as a BFS implementation; the complexity and witness claims should be treated as the authors' claims, not independently established results.

Verus form. Inference: represent a counterexample as a concrete sequence of ghost states and inputs. Prove that each transition is reachable in the generated model and that one state violates the safety predicate. Use this sequence to drive a targeted Rust-contract repair. Verus can prove the witness properties but does not supply BFS or automata algorithms automatically.

## technique 4: critic-guided repair with environmental context

What it is. LLM-as-a-Critic reads the formal counterexample path, explains the violation, and suggests modifications. The edge User LLM applies those modifications with environmental information, such as the fact that a left turn occurs after entering Maple Street. The system repeats inclusion checking and correction until acceptance or a configured repair limit.

How to apply it.

1. Pass the counterexample path to the Critic.
2. Have the Critic analyze the violation and suggest LTL modifications.
3. Give the suggestion and environmental information to the User LLM.
4. Modify the formula and rerun automated verification.
5. Stop after a maximum number of rounds or timeout. The paper's ideal is minimal semantic modification, but it sets limits to avoid infinite correction (section III-C.3, Remark 4, p. 6).

In the traffic example, the authors describe three verification-loop iterations and adding a `straight_200m` restriction and `X(destinationLeftOnMapleStreet)`; equation (3) places the latter as its first conjunct (section III-C.3, p. 5). Their stated repair objective is: “Our ideal objective is to search for an LTL specification that satisfies all safety constraints while making the minimal semantic modification to the Desired Task.” (Remark 4, p. 6).

Verus form. Inference: feed a failed Verus obligation, its source span, and relevant state facts to a critic; ask the generator to patch only the failing contract or lemma. Preserve the original requirement in a separate immutable record. A human should approve any change to the requirement itself, since making the specification weaker can make verification easier without improving safety.

## technique 5: progressive self-supervised fine-tuning

The edge model is fine-tuned in three stages. Section IV-A (p. 6) describes a “generate–filter–refine paradigm that ensures syntactic correctness, semantic alignment, and safety-compliance, respectively.” Section IV-B states: “We employ LLaMA-3-8B-Instruct as the edge-side User LLM, fine-tuned using 4-bit QLoRA to ensure on-device efficiency.” (p. 6).

1. Stage 1 translation: expand 50 navigation templates with GPT-4, keep 200 NL–LTL pairs after SPOT syntax validation and manual semantic review (section IV-A, p. 6).
2. Stage 2 syntax repair: pair erroneous formulas with corrected SPOT-valid formulas, annotated with 69 error types; the set has 225 instruction–correction pairs (section IV-A, p. 6).
3. Stage 3 semantic repair: use RABIT to collect 50 instruction–counterexample–corrected triples from inclusion failures (section IV-A, p. 6).
4. Fine-tune LLaMA-3-8B-Instruct progressively with 4-bit QLoRA (section IV-B, p. 6).
5. Evaluate on 300 held-out naturalistic navigation tasks with unseen proposition combinations; stage data and evaluation data are disjoint (section IV-A, p. 6).

Verus form. Inference: construct separate datasets for Rust generation, syntax/type repair, and failed-proof repair. Filter stage-1 code by compilation and human specification review, stage-2 by Verus syntax and type diagnostics, and stage-3 by counterexamples or failed proof obligations. Keep examples tied to real APIs and dependency versions.

Evidence. Table III reports initial translation accuracy on 300 cases: LLaMA-Origin 260/300 (86.7%), GPT-4 277/300 (92.3%), Stage 1 287/300 (95.7%), Stage 2 283/300 (94.3%), and Stage 3 281/300 (93.6%). Average syntax fixes fall from 1.72 at Stage 1 to 0.56 at Stage 2 and 0.51 at Stage 3; semantic fixes fall to 4.3 at Stage 3 from 7.1 at Stage 1 (Table III, p. 8). The denominator is the 300-task held-out benchmark. Section IV-C (pp. 6–7) treats accuracy as initial translation correctness, not the final verified output. Section IV-C also describes a separate 35,000-pair lifted-data baseline; it is not the selected 200-pair Stage-1 training set.

## technique 6: cloud–edge division and local data

The edge User LLM generates and locally repairs formulas for latency and data locality. Cloud Aligner and Critic agents handle proposition alignment and interpretation of complex counterexamples. The introduction describes “on-device LTL generation and correction” and “delegating abstracted tasks—AP alignment and counterexample interpretation—to cloud-side agents” (p. 2). Inference: this is a proposed data-locality architecture; the paper does not demonstrate an enforced boundary preventing raw task disclosure. Section V-A (p. 7) uses GPT-4 via API and prompt engineering for the Agent LLM roles.

Table V measures one single-stream iteration: LLM generation 0.7600 seconds (95.9%), Büchi construction 0.0097 seconds (1.2%), safety verification 0.0227 seconds (2.9%), total 0.7924 seconds (100%) (Table V, p. 8). Inference: the reported timing is for the paper's hardware and implementation, and does not show Verus verification latency.

Section V-E (p. 8) separately reports an NVIDIA A6000 experiment with batch size 20 and five parallel safety constraints: 0.27 seconds per iteration and approximately 1.16 seconds over 4.3 rounds. These are different reported settings from Table V's single-stream breakdown.

Verus form. Inference: generate and check ordinary Rust contracts locally when source confidentiality matters; send only minimized proof diagnostics or abstract counterexamples to a cloud critic. Any cloud suggestion remains untrusted until local Verus verification passes.

## techniques for the catalog

- language-inclusion safety: accept a generated temporal specification only when its behavior language is contained in every safety language
- proposition and operator checks: canonicalize atomic propositions and reject malformed operators before semantic verification
- counterexample-path extraction: the authors propose state-pair BFS and backtracking; the displayed algorithm omits queue expansion
- critic-guided repair: interpret the witness with a critic and modify the specification using environmental information
- progressive correction training: train separate translation, syntax-repair, and semantic-repair stages on filtered data
- cloud–edge verification: keep generation and local repair on-device while delegating abstract alignment and critique
- separate safety and fidelity metrics: report verified-violation rates, semantic consistency, repair rounds, and latency independently
