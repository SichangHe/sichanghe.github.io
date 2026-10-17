# ATLAS: A Sequence-based Learning Approach for Attack Investigation
(authored by agents unless marked 🧑)
Tag: `alsaheel2021atlas`, [paper](https://www.usenix.org/conference/usenixsecurity21/presentation/alsaheel)

## scope and assumptions
ATLAS turns audit logs into a causal graph, learns attack and non-attack temporal sequences, and investigates from a known attack symptom. Its three phases are graph construction, semantically augmented sequence construction, and sequence-model learning. The abstract states: “ATLAS leverages a novel combination of causality analysis, natural language processing, and machine learning techniques to build a sequence-based model, which establishes key patterns of attack and non-attack behaviors from a causal graph.” The link above is the publisher page printed on the paper's cover.

The threat model assumes the operating system and auditing applications are trusted and logs are tamperproof; the system is benign initially and an external attacker infiltrates remotely. These are explicit assumptions, not verified conclusions. Inference: a Verus deployment would need to treat log acquisition and timestamp integrity as trusted inputs or verify them separately.

## technique 1: optimize causal graphs
ATLAS removes irrelevant and repetitive graph structure before sequence extraction. Section 4.1 gives three operations: remove nodes/edges unreachable from attack or symptom nodes; keep only the first occurrence of repeated subject-action-object edges; and merge same-type nodes/edges with shared incoming and outgoing relations, retaining the earliest timestamp.

Steps:
1. parse platform logs into a directed causal graph whose nodes are process/file/network entities and whose edges are actions
2. choose attack entities during training, or the alert symptom during investigation
3. retain only nodes and edges reachable from the chosen set
4. collapse repeated actions between the same subject and object to the earliest event
5. merge equivalent sessions or same-type nodes and assign the earliest original timestamp

Section 4.1, pp. 3009–3010, warns: “While this might break the original temporal order of events when building the sequence, it does not affect the identification of expected attack patterns, as the temporal order of events in constructed sequences are consistent between the model learning and attack investigation phases.” This is the authors' claim about merging, not a proof that original timestamp order is preserved.

Inference: a Verus implementation could represent entities and events with unique identifiers and verify reachability filtering, earliest-edge selection, and the specified merging rule. Use `requires`/`ensures` and loop `invariant` clauses for filtering and deduplication. Preservation of the original temporal order cannot be required of the described merge operation.

Evidence: without graph optimization, event precision, recall, and F1 were 87.58%, 41.55%, and 56.36%, versus ATLAS's 99.88%, 99.89%, and 99.88% (Section 6.3, Table 5, p. 3017). These are decreases of 12.30, 58.34, and 43.52 percentage points. The evaluation used ten attacks; each 24-hour emulation generated a reported average of 20,088 entities and 249K events (Table 2, p. 3015).

## technique 2: semantic temporal sequence construction
For an entity or entity set, ATLAS extracts its neighborhood graph, collects all incident events, orders them by timestamp, and lemmatizes event words. For training, it enumerates subsets of at least two labeled attack entities and extracts their complete attack-event sequences. An event is attack-labeled if either endpoint is an attack entity. To construct non-attack sequences, it adds one non-attack entity to each subset of one or more attack entities. It discards a resulting sequence if it matches an attack sequence. During investigation, it combines all known symptom entities with each unknown entity and extracts a sequence for each resulting set (Sections 4.2.1 and 4.3).

The paper explains: “The sequence construction process of ATLAS does not lead to fixed-length sequences as each sequence may consist of different number of events obtained from a causal graph.” (Section 4.2.1, p. 3011.) Steps (Sections 2.1 and 4.2.1–4.2.2):
1. build the unified neighborhood graph of the selected entity set
2. collect each edge event with subject, action, object, and timestamp
3. sort events by timestamp
4. map entities and actions to a 30-word vocabulary grouped into process, file, network, and action types
5. discard non-attack sequences that overlap with attack sequences after lemmatization, then pass sequences to sampling and embedding

Inference: define an `Event` struct and prove that extraction returns every event incident to the selected entities exactly once in the optimized graph and that adjacent timestamps are nondecreasing. These properties concern the optimized graph's timestamps. Lemmatization and embeddings could be external functions with explicit input/output contracts.

## technique 3: balance training sequences
Attack sequences are rare. ATLAS undersamples redundant non-attack sequences using Levenshtein edit distance, filtering sequences whose similarity exceeds 80%. It oversamples attacks by randomly replacing one vocabulary word with another of the same type until the classes have equal counts. The authors claim that this mutation does not fundamentally change the sequence and adds contextual variants (Section 4.2.3, pp. 3011–3012).

Inference: a Verus implementation could verify that no retained non-attack pair exceeds its specified similarity threshold and that mutation preserves sequence length and token category. These properties do not establish that a mutation preserves attack meaning. Randomness could be modeled as an explicit seed or left trusted.

Table 3, p. 3015, reports averages of 61 attack and 20,626 non-attack sequences per attack before sampling and 2,264 sequences per class afterward, not 2,264 total. Section 6.2.2 reports training time falling from 3 h 37 min to 28 min with selective sampling. Inference: class imbalance makes overall classification accuracy insufficient to assess attack recovery.

## technique 4: embeddings and LSTM classifier
ATLAS trains word embeddings over the lemmatized attack and non-attack sequences from the audit logs and maps each sequence to numeric vectors (Section 4.2.4). Appendix A, Table 7, pp. 3021–3022, specifies embedding → Conv1D → max pooling → dropout → LSTM → dense sigmoid output. Section 5 sets a 400-word training limit and reports similar or better test accuracy than other sequence lengths; most extracted sequences are shorter than 400 words. Its wording discusses both shortening and exclusion of long sequences without specifying prefix truncation.

Steps (Sections 4.2.4 and 5):
1. train embeddings on the complete lemmatized corpus
2. convert each sequence to its embedding vectors
3. enforce the 400-word maximum input length, with padding accommodated by an additional vocabulary entry
4. train the LSTM/CNN classifier on balanced attack and non-attack sequences
5. tune parameters by grid search and classify a sequence as attack when its sigmoid probability is at least 0.5 (Appendix A)

Inference: a verified wrapper could enforce maximum sequence length, vector dimensions, and the probability threshold. A prefix-preservation contract would require an explicit implementation choice beyond the paper. Learned weights and floating-point inference remain trusted unless separately verified.

## technique 5: entity investigation and story recovery
Given one or more true symptom entities, ATLAS enumerates each unknown graph entity, forms a subset containing the symptom plus that entity, extracts its sequence, and classifies it. An attack classification marks the unknown entity as attack-related. It then extracts the neighborhoods of all identified attack entities and orders their events by timestamp to produce the attack story. Investigation traverses n unknown entities in O(n) subsets (Section 4.3).

For multi-host investigation, ATLAS uses entities recovered from one host as new symptoms on other hosts. Section 4.3, p. 3013, states: “As a result, ATLAS investigation does not require association of the causal graph among different hosts, which is often necessary for provenance tracking techniques [19].” To construct the multi-host story afterward, it merges compromised-host logs into one optimized causal graph, extracts neighborhoods of the identified attack entities, and orders the events across hosts by timestamp. Per-host identification and merged story construction are distinct steps.

Inference: prove that each reported story event belongs to a selected attack entity's neighborhood and that output timestamps are ordered. Prove coverage of the finite unknown-entity enumeration; classification soundness depends on the learned model and labels. Section 4.3's O(n) claim concerns traversing unknown entities, not a bound independent of sequence length for the complete processing pipeline.

## evidence, trust, and limits
Across ten attacks, Table 4, p. 3016, reports entity-level averages of 91.06% precision, 97.29% recall, and 93.76% F1; event-level averages are 99.88% precision, 99.89% recall, and 99.88% F1. Section 6.2.1 reports average ROC AUC of 97.01% for entities and 99.67% for events. Table 6, p. 3017, reports average training times of 4 min 11 s for graph construction, 26 min 12 s for sequence processing, and 28 min 26 s for model learning, totaling 58 min 49 s. Investigation averages 4 min 16 s including graph construction, 4 s of sequence processing, and 1 s of model inference. The seconds-only figures exclude graph construction (Section 6.4).

Section 6.1 uses four single-host and six two-host attacks recreated from campaign reports on Windows 7 32-bit virtual machines, with manually generated benign activity during an eight-hour daytime window and logs collected over 24 hours. Ten separate models test each attack using the other attacks of the same host category; single-host and multi-host datasets are separated because some use the same campaign reports. The authors claim attack entities constitute less than 0.14% of all entities. Inference: Table 3's S-1 counts, 22 attack and 7,445 non-attack entities, give approximately 0.295%, so this claim does not hold for every row of that table.

Section 7, pp. 3018–3019, requires manually designated training entities and a true attack symptom. The authors say a false-positive symptom yields only non-attack sequences. ATLAS cannot detect mimicry attacks that imitate normal event sequences, and model correctness depends on training-log quality and representative temporal relations. Linux and FreeBSD support is proposed, not evaluated. The graph-traversal comparison is an implemented baseline, not a direct comparison with unavailable prior systems (Section 6.3).

Inference: for VL, candidate verified components are graph filtering, finite enumeration, timestamp ordering, and accounting of reported entities. The graph parser, labels, embedding/training code, weights, and inference would also need explicit trust assumptions or verification beyond the paper's OS/auditing assumptions. Model scores alone do not prove that an entity participates in an attack.

## techniques for the catalog
- causal-graph optimization — filter unreachable structure, deduplicate repeated actions, and merge equivalent nodes before analysis
- semantic temporal sequences — convert entity neighborhoods into timestamped, lemmatized event sequences
- imbalance handling — undersample similar normal sequences and mutate attack vocabulary for oversampling
- sequence classifier — use embeddings plus bounded LSTM/Conv1D inference to score attack relevance
- symptom-paired investigation — test every unknown entity with a known symptom and recover a timestamped attack story
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "We evaluate the effectiveness of ATLAS for each implemented attack based on the model trained on other attacks."): read the full paper including references and appendices; checked quotations, numbers, section/page references, technique steps, assumptions, and evaluation scope; corrected incomplete quotations, timestamp-preservation claims, training subset construction, per-class sample counts, unspecified long-sequence handling, multi-host steps, timing, and model splits; replaced the link with the publisher page printed on the cover and marked proposed verification properties as inference; did not inspect source code, run ATLAS, reproduce experiments, or independently validate external campaign reports.
