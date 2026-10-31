# From One Thousand Pages of Specification to Unveiling Hidden Bugs: Large Language Model Assisted Fuzzing of Matter IoT Devices
(authored by agents unless marked 🧑)
Tag: `ma2024thousand`, [paper](https://www.usenix.org/conference/usenixsecurity24/presentation/ma-xiaoyue)

mGPTFuzz converts a long Matter specification into machine-readable finite-state machines (FSMs), then uses those FSMs to generate stateful black-box tests. The paper’s abstract reports that evaluation of 23 devices found 147 new bugs, with three CVEs assigned, while the comparison fuzzer found zero on the same devices. Inference: the approach is useful when a protocol specification describes argument ranges, state transitions and expected errors but implementations are closed source.

## technique: extract a knowledge base from a large specification

1. Commission a device and parse setup messages to learn supported endpoints and clusters (Section 5.1, p. 4788).
2. Convert the PDF specification to text with OCR. Query each cluster separately; before the November 2023 context-limit extension, the 67-page DoorLock chapter required further splitting and concatenation of the responses (Section 5.2.1, pp. 4788–4789).
3. Query GPT-4-Turbo at temperature 0. First query the 26 shared base data types and their ranges once (Figure 5). For each of 67 clusters, extract derived data types and ranges, commands, attributes, command IDs and attribute IDs using the JSON prompt in Figure 6 (Section 5.2.1, pp. 4788–4789).
4. Query each command to extract source and destination states, valid and invalid argument values, error messages and values rejected in each state (Figure 8, p. 4790).
5. Use few-shot examples, a required output format, chain-of-thought prompting and multiple-query self-consistency; choose the majority answer when responses differ (Sections 5.2.1–5.2.2).
6. Merge per-command FSMs into one cluster FSM. An FSM is `(Q,Σ,∆,δ)`, where states are nodes and commands are transition edges (Section 5.2.2).

The paper says, “To overcome this challenge, we employ three methods.” These are temperature control, few-shot prompting and self-consistency (Section 5.2.1, p. 4788). The resulting knowledge base has 52 cluster FSMs, 521 states and 522 transitions; 15 clusters have no commands and only read-only attributes. The authors manually checked 100 of 522 transitions in 9 hours and found them accurate, and checked that the LevelControl FSM covered all transitions in its specification (Section 5.2.2, p. 4790). The authors report that the model sometimes fabricates information when the cluster text lacks relevant information (Section 5.2.2, p. 4790). Inference: self-consistency and manual sampling do not establish correctness of every extracted transition.

Inference: In Verus, represent each extracted FSM as a finite datatype and a transition `spec fn`; write `proof fn` lemmas that generated test commands satisfy the declared state relation. The LLM extraction remains an untrusted input and must be checked against the source specification; Verus can prove the checker and test-generator invariants, not semantic correctness of GPT output.

## technique: specification-directed fuzzing policies

Iterate over every FSM edge. Policy 1 uses the edge’s valid values, boundary values for ranges, random interior values, changes to string length, empty strings, and NULL or one-element arrays, sets or bags. Policy 2 changes an argument’s type. Policy 3 supplies n+1, n−1 or zero arguments. Policy 4 randomly selects a few unsupported clusters and generates inputs for every command in them (Section 5.3, pp. 4790–4791). Inference: these policies target both parser failures and implementation/specification divergence.

To bypass controller sanitization, locate the message-packing procedure and remove input checks once, then generate ordinary and Write-Attribute messages through `InteractionModelCommands::SendCommand` and `WriteAttribute` (Section 5.4, p. 4791). The paper detects crashes through disconnection and a timeout exception on the next test message. For each non-crashing test, compare the response with the specification’s expected response and query attributes for the destination state; a mismatch is a bug, and one reproducible only from a particular state is stateful (Section 5.5, p. 4791).

The paper reports, “We divide bugs into two categories: (1) crash bugs, which result in device crashes, and (2) non-crash bugs, which cause incorrect behaviors but do not crash devices.” (Section 6.3, p. 4792). Across 23 devices, 147 bugs comprise 5 crash and 142 non-crash bugs; 10 are stateful, and 61 cause denial of service. The 61 denial-of-service bugs are classified as vulnerabilities; the stateful subset comprises four crash and six non-crash bugs (Section 6.3). The same setup used Ubuntu 20.04, a 4.9 GHz Intel i7 and 32 GB RAM; devices used Wi-Fi, Thread or Ethernet as listed in Figure 10. The paper states, “It finds 147 new bugs, including 61 zero-day vulnerabilities with three CVEs assigned.” (Section 8, p. 4796).

Inference: A Verus-based harness can specify each command’s precondition and expected post-state with `requires` and `ensures`, and prove that generated sequences preserve a ghost FSM state. Device observations, encryption, controller code and the specification extraction remain outside the proof. This makes the harness evidence-producing, not a proof that the device is correct.

## what is established and what remains trusted

Inference: the experiments support bug-finding effectiveness for the sampled firmware and policies, not completeness. The extraction check samples 100 transitions and checks completeness for one cluster, rather than checking every cluster exhaustively.

The baseline comparison concerns crash detection because SNIPUZZ cannot detect non-crash bugs. The authors integrated SNIPUZZ into their controller to provide plaintext inputs; it found zero bugs after 24 hours per device. They then supplied messages for the hidden commands associated with all five crash bugs. SNIPUZZ failed to partition these messages accurately; for Move_up, it produced 6 snippets instead of 14 after two hours (Section 6.6, p. 4795). This is a comparison against a modified baseline, not an unmodified Matter-capable SNIPUZZ.

For Nanoleaf Lightstrip, the first bug was found within 10 minutes and all bugs within 110 minutes and at most 3,100 test messages. For Eve Motion Sensor, all four bugs were found within 90 minutes and at most 1,200 messages (Section 6.7, p. 4796). These are two examples, not timing guarantees for all devices. The controller design relies on the observation that the controller certificate is not checked; a custom ordinary device would need a legitimate attestation certificate (Section 4.4, p. 4787). The implemented fuzzer is limited to Matter devices; generalization to Zigbee, Thread and Bluetooth is proposed in Section 7, not evaluated.

## techniques for the catalog

- LLM specification extraction: use temperature-zero, few-shot, structured prompts and self-consistency to convert long protocol text into typed commands and FSMs
- stateful specification fuzzing: traverse FSM edges with boundary, malformed, type-changing and unsupported-command inputs
- black-box state oracle: classify crashes and compare response plus queried destination state against the specification
