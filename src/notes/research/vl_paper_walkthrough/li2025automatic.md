# Automatic Generation of Safety-compliant Linear Temporal Logic via Large Language Model: A Self-supervised Framework
(authored by agents unless marked 🧑)
Tag: `li2025automatic`, [paper](https://doi.org/10.48550/arxiv.2503.15840)

## scope and result

AutoSafeLTL generates Linear Temporal Logic (LTL) from natural-language cyber-physical-system tasks, then enforces safety constraints before returning a specification. An edge User LLM performs translation and local repair. Cloud agents align atomic propositions and interpret formal counterexamples. The formal checker converts the candidate task formula and each safety constraint into Büchi automata and checks language inclusion. A candidate is accepted only when its behavior language is included in every safety language.

The paper's abstract states: “We present AutoSafeLTL, a self-supervised, cloud–edge–collaborative framework that automates the generation of safety-compliant LTL specifications while preserving logical consistency and semantic fidelity.” (abstract, p. 1). The key distinction is safety compliance: a literal translation of an unsafe user request must be repaired or rejected. The paper's running traffic example changes a route that violates a safety rule requiring the route to proceed straight or make a right turn first, then checks the repaired formula.

Inference: the technique transfers to Verus at the level of a generate–check–repair loop. LTL language inclusion and Büchi automata are not Verus constructs, so a Rust system must replace them with executable models and Verus proof obligations.

The framework says: “The Automated Verification process consists of two stages: Syntactic Check and Semantic Check.” (section III-A, p. 5).

## technique 1: define safety compliance as language inclusion

What it is. Let (D) be a natural-language task and (\Psi=\{\psi_1,\ldots,\psi_n\}) safety restrictions. The desired formula (\phi) must satisfy (L(A_\phi)\subseteq\bigcap_iL(A_{\psi_i})), where each (A) is a Büchi automaton for the corresponding LTL formula (section II-D, p. 4). A violating behavior is therefore a word accepted by the task automaton but rejected by a safety automaton.

How to apply it.

1. Define atomic propositions and LTL operators `X` (next), `U` (until), Boolean connectives, and `G`/`F` as needed (section II-A, p. 2).
2. Translate the generated task formula and each safety formula into Büchi automata. The authors use Spot's LTL2BA translation (section III-C, p. 5).
3. Run a language-inclusion checker. The authors use RABIT and support multiple constraints in parallel (section III-C, p. 5).
4. Accept only an included candidate. Any non-inclusion yields a witness for repair.

Evidence. The paper says: “The process terminates once a counterexample is found, which in this case is !straight_200m.” (section III-C, p. 6). This is a formal witness, not a language-model judgment.

Verus form. Inference: encode a safety property as a Verus predicate over traces or state transitions, and prove that every reachable transition preserves it. A finite-state protocol can use a ghost state machine and `invariant` clauses. Unlike LTL inclusion, Verus will need a concrete trace model and induction over Rust execution.

## technique 2: syntactic check with proposition alignment

What it is. Before semantic inclusion, AutoSafeLTL normalizes atomic propositions and operators. A cloud LLM-as-an-Aligner maps task propositions to a safety-constraint library. A token-based checker verifies operator usage and balanced parentheses. Errors include type and position, and are sent to the edge User LLM for local correction (section III-C.1, p. 5).

How to apply it.

1. Extract all atomic propositions from the safety constraints to form a canonical library.
2. Ask the Aligner to map task propositions to the closest canonical entries. In the paper's example, `go_straight_500m` becomes `straight_500m` and `go_straight_200m` becomes `straight_200m` (section III-C.1, pp. 5–6).
3. Check every temporal and Boolean operator and parenthesis with a deterministic token pass.
4. Return the error type and position to the User LLM for on-device correction.
5. Re-run the syntactic pass before invoking automata construction.

Verus form. Inference: build a typed Rust specification AST or enum for permitted events and predicates. Parse and validate it before proof generation. A canonical proposition map can prevent two names for one state, but the mapping itself must be reviewed because lexical similarity does not establish semantic equivalence.

## technique 3: counterexample-path extraction from inclusion checking

What it is. A counterexample word can correspond to several automaton paths. AutoSafeLTL stores state pairs during breadth-first search (BFS) so it returns a concrete finite path that is simulable in the task automaton but not the safety automaton. Algorithm 1 stores `post[state][symbol]`, a queue of initial state pairs, and visited state pairs; on a transition mismatch it backtracks and returns the path (section III-C.3, pp. 6–7).

How to apply it.

1. Build the product graph of state pairs ((q_1,q_2)) from the task and safety automata.
2. Initialize the queue with pairs of initial states and a visited map.
3. Dequeue a pair, compare successor sets for each alphabet symbol, and enqueue unseen pairs.
4. On a mismatch, backtrack through the visited map to construct a finite counterexample path.
5. Stop after a configured maximum search depth if no path is found.

The paper gives worst-case path-extraction time (O(n_1n_2m)), where (n_1,n_2) are automaton state counts and (m) is alphabet size (Proposition 1, p. 7). The path length is at most the BFS depth (n_1n_2).

Verus form. Inference: represent a counterexample as a concrete sequence of ghost states and inputs. Prove that each transition is reachable in the generated model and that one state violates the safety predicate. Use this sequence to drive a targeted Rust-contract repair. Verus can prove the witness properties but does not supply BFS or automata algorithms automatically.

## technique 4: critic-guided repair with environmental context

What it is. LLM-as-a-Critic reads the formal counterexample path, explains the violation, and suggests modifications. The edge User LLM applies those modifications with environmental information, such as the fact that a left turn occurs after entering Maple Street. The system repeats inclusion checking and correction until acceptance or a configured repair limit.

How to apply it.

1. Pass the counterexample path and the original LTL to the Critic.
2. Have the Critic identify the violated safety transition and suggest a minimal change.
3. Give the suggestion and environmental information to the User LLM.
4. Regenerate the formula, preserve unaffected clauses, and rerun syntactic and inclusion checks.
5. Stop after a maximum number of rounds or timeout. The paper's ideal is minimal semantic modification, but it sets limits to avoid infinite correction (section III-C.3, p. 8).

In the traffic example, the repaired formula adds `straight_200m` at the start and `X(destinationLeftOnMapleStreet)` before the final arrival condition (section III-C.3, pp. 7–8).

Verus form. Inference: feed a failed Verus obligation, its source span, and relevant state facts to a critic; ask the generator to patch only the failing contract or lemma. Preserve the original requirement in a separate immutable record. A human should approve any change to the requirement itself, since making the specification weaker can make verification easier without improving safety.

## technique 5: progressive self-supervised fine-tuning

The edge model is fine-tuned in three stages, each with a generated–filtered dataset.

1. Stage 1 translation: expand 50 navigation templates with GPT-4, keep 200 NL–LTL pairs after SPOT syntax validation and manual semantic review (section IV-A, p. 8).
2. Stage 2 syntax repair: pair erroneous formulas with corrected SPOT-valid formulas, annotated with 69 error types; the set has 225 instruction–correction pairs (section IV-A, p. 8).
3. Stage 3 semantic repair: use RABIT to collect 50 instruction–counterexample–corrected triples from inclusion failures (section IV-A, p. 8).
4. Fine-tune LLaMA-3-8B-Instruct with 4-bit QLoRA, reusing the stage adapter for the next stage (section IV-B, p. 8).
5. Evaluate on 300 held-out naturalistic navigation tasks with unseen proposition combinations; stage data and evaluation data are disjoint (section IV-A, p. 8).

Verus form. Inference: construct separate datasets for Rust generation, syntax/type repair, and failed-proof repair. Filter stage-1 code by compilation and human specification review, stage-2 by Verus syntax and type diagnostics, and stage-3 by counterexamples or failed proof obligations. Keep examples tied to real APIs and dependency versions.

Evidence. Table III reports initial translation accuracy on 300 cases: LLaMA-Origin 260/300 (86.7%), GPT-4 277/300 (92.3%), Stage 1 287/300 (95.7%), Stage 2 283/300 (94.3%), and Stage 3 281/300 (93.6%). Average syntax fixes fall from 1.72 at Stage 1 to 0.56 at Stage 2 and 0.51 at Stage 3; semantic fixes fall to 4.3 at Stage 3 from 7.1 at Stage 1 (Table III, p. 9). The denominator is the same 300-task held-out benchmark.

## technique 6: cloud–edge division and local data

The edge User LLM generates and locally repairs formulas for latency and data locality. Cloud Aligner and Critic agents handle proposition alignment and interpretation of complex counterexamples. This division keeps raw desired tasks on-device while sending abstracted formal artifacts to the cloud (section III-A, p. 5).

Table V measures one single-stream iteration: LLM generation 0.7600 seconds (95.9%), Büchi construction 0.0097 seconds (1.2%), safety verification 0.0227 seconds (2.9%), total 0.7924 seconds (100%) (p. 10). Inference: the reported timing is for the paper's hardware and implementation, and does not show Verus verification latency.

Verus form. Inference: generate and check ordinary Rust contracts locally when source confidentiality matters; send only minimized proof diagnostics or abstract counterexamples to a cloud critic. Any cloud suggestion remains untrusted until local Verus verification passes.

## evidence, trust, and product threat

The full pipeline reports 0% violation on the 300-task benchmark for LLaMA+B, GPT-4+B, nl2spec+B, AutoSafeLTL, AutoSafeLTL-C, and AutoSafeLTL-D (Table II, p. 10). Their average interaction rounds are 16.2, 7.8, 6.5, 4.3, 15.0, and 11.0 respectively. AutoSafeLTL has the fewest rounds among these variants. The “0%” denominator is the 300 evaluation tasks, and violation means failure of the Inclusion Check.

Semantic consistency is measured separately on 1,000 navigation tasks: S1 94.7%, S2 92.5%, S3 91.1% (section V-C, p. 10). Thus safety compliance and semantic fidelity are different metrics. The paper also reports AutoSafeLTL* without the automated loop at 98% violation, so native safety priors do not replace checking (section V-B, p. 10). These numbers are consistent: the full loop can force 0% checked violations while the unverified generator can fail on nearly all tasks.

The formal guarantee depends on correct LTL semantics, Büchi construction, RABIT inclusion checking, AP alignment, and the safety constraints themselves. It does not prove that a natural-language task was formalized with the intended meaning. The authors explicitly prioritize safety over strict semantic fidelity when the request is unsafe. Their repair loop has maximum rounds and a timeout, so some tasks may remain unresolved rather than produce a candidate.

Inference: the threat to a product that generates Verus Rust is high if an agent is allowed to weaken contracts to satisfy a safety checker, and medium if the requirement is fixed independently and every patch is reverified. The transferable ideas are canonical proposition alignment, deterministic syntax checks, formal counterexample extraction, critic-guided local repair, progressive datasets, and separate safety/fidelity metrics. AutoSafeLTL already demonstrates these generic ideas for LTL; VL should test them against actual Verus obligations, unsafe code, external APIs, and specification drift.

## techniques for the catalog

- language-inclusion safety: accept a generated temporal specification only when its behavior language is contained in every safety language
- proposition and operator checks: canonicalize atomic propositions and reject malformed operators before semantic verification
- counterexample-path extraction: use product-automaton BFS and backtracking to provide a finite actionable violation witness
- critic-guided repair: interpret the witness with a critic and regenerate only the violated specification region
- progressive correction training: train separate translation, syntax-repair, and semantic-repair stages on filtered data
- cloud–edge verification: keep generation and local repair on-device while delegating abstract alignment and critique
- separate safety and fidelity metrics: report verified-violation rates, semantic consistency, repair rounds, and latency independently
Checked 2026-10-14 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
