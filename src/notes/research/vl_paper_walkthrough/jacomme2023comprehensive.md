# A comprehensive, formal and automated analysis of the EDHOC protocol
(authored by agents unless marked 🧑)
Tag: `jacomme2023comprehensive`, [paper](https://www.usenix.org/conference/usenixsecurity23/presentation/jacomme)

## what the paper proves or measures

The paper models EDHOC draft 12 and analyzes its confidentiality, authentication, identity-protection, and non-repudiation claims under multiple protocol variants and attacker capabilities. It uses the SAPIC+ platform to compile one applied pi-calculus specification to ProVerif, Tamarin, and DeepSec. The abstract states: “For our analysis we use the S APIC+ protocol platform that allows to compile a single specification to 3 state-of-the-art protocol verification tools (P ROVERIF, TAMARIN and D EEP S EC) and take advantage of the strengths of each of the tools.” (Abstract, p. 5881.)

The analysis confirms most properties in the basic threat model but finds weaknesses when advanced primitive models and compromise capabilities are combined. The paper reports: “Our analysis confirms the strong design of the EDHOC protocol as most claimed properties are satisfied when we consider basic threat models.” (Section 4, p. 5889.) It also reports that the fixes were added to draft 14 and then checked again. These are automated symbolic results over the stated models, not proofs about every concrete implementation.

## technique 1: one applied pi-calculus model for protocol roles

what it is: represent protocol messages as symbolic terms and protocol participants as communicating processes. Fresh names model secrets and nonces, function symbols model cryptographic operations, and equations state the algebraic behavior available to the attacker. The paper explains: “As usual in symbolic models, messages are represented as terms: in contrast to concrete bitstrings, terms focus on the message structure, abstracting away implementation details.” (Section 3.1, p. 5885.)

when to use: Inference: use this when a protocol has multiple roles, unbounded sessions, adversary-controlled communication, and cryptographic operations whose concrete bit-level details are not the subject of the first analysis.

how to do it:
1. Define cryptographic constructors and destructors, such as `sign`, `verify`, and `vk`, and add only equations that represent the intended primitive behavior (Section 3.1, p. 5885).
2. Define each role as a process with `in`, `out`, `new`, `let`, conditionals, and event annotations. The initiator example receives setup values, creates `X`, logs `Share(X)`, computes `g^X`, and emits message 1 (Section 3.1, p. 5885).
3. Replicate participants and sessions. The paper uses `!(new sk; new ltdh; (!Init(sk,ltdh)) | (!Resp(sk,ltdh)))` to permit unbounded participants and sessions (Section 3.1, p. 5886).
4. Let the attacker choose network inputs and protocol parameters. The paper says: “This initial input is actually provided by the attacker and a classical trick to model worst case scenarios, by letting the adversary choose the responder, methods, and values that would suit it most.” (Section 3.1, p. 5886.)

Verus form: Inference: Verus can express executable Rust roles and pure specifications with `spec fn`, `requires`, `ensures`, `assert`, and proof functions, but it does not directly provide applied pi-calculus process semantics or symbolic unbounded network replication. Inference: model messages as Rust datatypes, make cryptographic operations specification functions or axiomatized external interfaces, and prove each transition's postcondition; use explicit bounded traces or an abstract transition relation for session composition. Inference: the process-level attacker choices must become explicit nondeterministic inputs and assumptions.

evidence: the model covers four authentication methods, a KEM variant, honest-honest sessions, honest-initiator/attacker-responder sessions, and attacker-initiator/honest-responder sessions (Section 3.2.1, pp. 5886–5887). The paper does not claim that the symbolic equations implement concrete cryptographic code.

limits and assumptions: the symbolic model abstracts bitstrings and normally assumes perfect cryptography. The model omits cipher-suite negotiation, key update, and optional message four (Section 3.2.1, p. 5887). Inference: a Verus proof over concrete Rust would need separate lemmas connecting implementation behavior to the abstract message algebra.

## technique 2: state security properties as event formulas and equivalences

what it is: define events at protocol points and state confidentiality, authentication, uniqueness, and non-repudiation as first-order formulas over all executions. Model anonymity as observational equivalence between two processes. The paper gives the confidentiality pattern `AcceptR(...)@i & Honest(pkI)@k ⇒ not K(k4)@j` and explains that `AcceptR` records acceptance and `K` represents attacker knowledge (Section 3.1, p. 5886).

when to use: Inference: use event formulas for reachability and correspondence claims, and equivalence when the claim is that an attacker cannot distinguish two identity choices.

how to do it:
1. Add `AcceptI`, `AcceptR`, `Honest`, compromise, and leak events at the corresponding process points (Sections 3.1–3.2.3, pp. 5886–5887).
2. Quantify session parameters and timepoints. Require the desired event or secrecy fact, and add disjuncts for explicitly modeled compromises.
3. For authentication, require a prior matching acceptance and then separately prove uniqueness to obtain injective authentication (Section 3.2.3, p. 5887).
4. For anonymity, create two processes differing only in the challenge secret and prove `P1 ≈ P2`; the test responder is fixed to `sk1`, compromise of `sk1` is forbidden, and compromise of `sk2` may be allowed (Section 3.2.4, p. 5888).
5. For non-repudiation, implement a judge that checks a proof and raises `WasActiveR`; prove soundness and an injective variant (Section 3.2.5, p. 5888).

Verus form: Inference: encode an execution trace as a sequence of state records and prove temporal correspondence with predicates over indices; use `requires` for honest-key assumptions and `ensures` for secrecy or matching-event conclusions. Inference: Verus has no direct observational-equivalence checker, so two-run relational properties require a paired-state model and proof that public observations are equal. Inference: a judge becomes an ordinary verified Rust function whose acceptance condition has a postcondition linking evidence to a unique session.

evidence: the analysis checks confidentiality, implicit and explicit key authentication, transcript and algorithm authentication, session-key uniqueness, non-repudiation soundness, and identity protection (Table 4, p. 5892). Identity protection fails in every listed threat column in Table 4; the table marks all six entries with `✗`.

limits and assumptions: Inference: event formulas are only as strong as event placement and compromise predicates. The paper explicitly notes that its confidentiality formula is a strong single property implying four claimed confidentiality properties (Section 3.2.2, p. 5887). Inference: a misplaced event or omitted compromise path can make a Verus theorem vacuously true.

## technique 3: advanced symbolic models for real primitive weaknesses

what it is: replace perfect-cryptography equations with symbolic capabilities for weaknesses that occur in concrete primitives. The paper includes `SigE` and `SigE-proof` for signature malleability and weak key generation, `DHE` for identity and small-subgroup behavior, `HashE` for length extension and chosen-prefix collisions, `⊕E` for malleable XOR, and `AEADE` for ciphertext rerandomization (Section 3.3, pp. 5888–5889).

when to use: Inference: use these models when a protocol claim depends on a primitive property that the perfect model hides, especially when algorithms permit malleability, subgroup attacks, hash extension, or non-deterministic encoding.

how to do it:
1. Identify a primitive behavior omitted by the ideal model, such as the symbolic length-extension equation `h(x||y)=h(h(x)||y)` used in the paper (Section 3.3, p. 5889).
2. Add symbolic equations or attacker capabilities that expose that behavior. For XOR, add equations permitting each encrypted triplet element to be modified; for AEAD, permit ciphertext rerandomization (Section 3.3, p. 5889).
3. Keep attack-finding and proof-strengthening signature models separate: `SigE` is intended for finding attacks, while `SigE-proof` allows only behavior consistent with unforgeability assumptions (Section 3.3, p. 5888).
4. Run the same security properties under combinations of these capabilities.

Verus form: Inference: represent each primitive weakness as an explicit specification relation or lemma, such as a permitted alternate ciphertext or subgroup element, and prove protocol properties under those assumptions. Inference: do not use `external_body` on the function being verified; isolate trusted cryptographic axioms behind small specification functions and state their assumptions in `requires`. Inference: concrete Rust implementations need refinement proofs showing that the modeled behavior is an over-approximation of implementation behavior.

evidence: the paper says: “The latter aim to provide more realistic symbolic models of cryptography, as we explain in Section 3.3.” (Introduction, p. 5882.) It reports that the advanced models were crucial to uncovering weaknesses (Introduction, p. 5882). In Table 5, automated attacks include initiator impersonation found by ProVerif in 846 seconds, transcript collision/downgrade found by Tamarin in 16 hours, final transcript mismatch in 56 seconds, party-controlled session key in 49 seconds, and identity leak in DeepSec in 1 second (p. 5894). These are one attack trace per listed scenario, not success percentages.

limits and assumptions: the models are symbolic approximations of concrete weaknesses. The paper limits this observation to EDHOC’s supported hashes: “While no hash function currently in the standard does have this weakness, we deemed it important to try to future-proof the protocol against such attacks, especially in the IoT context where it can be difficult to deprecate an algorithm.” (Section 4.4, p. 5893.) Inference: the resulting guarantee is conditional on the selected weakness model and does not establish computational security.

## technique 4: modular threat-model lattice and optional checks

what it is: treat compromise and primitive capabilities as atomic elements, combine them into threat models, and use subset monotonicity to prune redundant checks. Add optional checks for a neutral DH element (`DH-Check`) and a peer with the local identity (`Cred-Check`). The latter is an initiator check intended for trust on first use (Section 4.1, pp. 5889–5890).

when to use: Inference: use this when many compromise scenarios and protocol options must be explored systematically and stronger scenarios subsume weaker ones.

how to do it:
1. Define atomic capabilities including `SessKeyE`, `DHShareE`, `SigE`, `DHE`, `HashE`, `⊕E`, and `AEADE` (Table 3, p. 5890).
2. Generate combinations and order them by inclusion. If a property holds in a threat model, it holds in every weaker model; if an attack exists in one model, it exists in every stronger model (Section 4.1, p. 5890).
3. Add optional checks as switches and include them in each generated protocol variant.
4. Verify all combinations needed to identify maximal secure and minimal insecure models.

Verus form: Inference: represent a threat model as a Rust phantom type or a specification record of boolean capabilities, and parameterize lemmas by that record. Inference: prove monotonicity lemmas only when the capability relation really implies inclusion of behaviors; then reuse a proof for weaker assumptions rather than asserting monotonicity globally.

evidence: the authors extract “the 50 maximal and minimal threat scenarios” from 273 single-threaded ProVerif calls, totaling 20.6 hours and less than one hour with 64-core parallelization (Section 4.2, p. 5891). The 50 scenarios account for 3 hours of accumulated ProVerif runtime. Tamarin then runs maximal secure scenarios with a 24-hour timeout (Section 4.1, p. 5890).

limits and assumptions:

## technique 5: single-source generation and multi-tool verification workflow

what it is: generate DH and KEM variants and all four DH authentication methods from shared Jinja2 templates, preprocess capability switches with SAPIC+, and export each generated model to the best backend. The paper states: “Using Jinja2, we generate from a single file both the DH and KEM based protocols.” (Section 4.1, p. 5890.)

when to use: Inference: use this when several protocol variants must stay aligned and tools have different strengths.

how to do it:
1. Maintain one parameterized model and shared primitive headers.
2. Use Jinja2 to instantiate DH/KEM and method variants.
3. Use SAPIC+ preprocessing to enable capabilities and select a target tool.
4. Run ProVerif first for fast sanity checks and broad scenario exploration.
5. Run Tamarin on maximal secure scenarios for a more precise DH theory; use DeepSec for bounded anonymity, then ProVerif for unbounded anonymity where scalable (Section 4.1, pp. 5890–5891).
6. Update one model for a new draft and rerun the batch scripts. The paper says the draft-14 update required “(i) updating a single model, (ii) running the batch P ROVERIF script of step 2, and (iii) the batch TAMARIN script of step 3.” (Section 4.1, p. 5891.)

Verus form: Inference: use Rust macros or generated modules for protocol variants, but retain one specification source and prove each generated variant. Inference: Verus is the trusted checker for Rust proof obligations, whereas ProVerif, Tamarin, and DeepSec have no direct Verus equivalent; their results can guide which Verus lemmas and threat assumptions to encode. Inference: generated code must be inspected or deterministically reproducible because generation itself is outside the proof.

evidence: the authors use ProVerif and Tamarin for reachability properties and DeepSec and ProVerif for anonymity (Section 4.1, p. 5890). They report that ProVerif is generally faster, while Tamarin models DH exponentiation more precisely (Section 4.1, p. 5890). For draft 14, 13 advanced threat models received stronger Tamarin guarantees, with 82 hours of accumulated Tamarin runtime and 8 cores per job, although many scenarios timed out (Section 4.8, p. 5894).

limits and assumptions: DeepSec does not support DH exponentiation or unbounded sessions, so it checks bounded KEM anonymity first. ProVerif then checks unbounded KEM and DH anonymity, restricted to method 0 for efficiency, without advanced primitive models (Section 4.1, pp. 5890–5891). The paper notes that separate manually written models would be possible but harder to maintain (Section 4.1, p. 5891). Inference: multi-tool agreement increases confidence but does not make any backend a trusted implementation proof.

## techniques for the catalog

- applied pi-calculus protocol modeling — represent roles, messages, fresh secrets, attacker-controlled inputs, and cryptographic equations as communicating symbolic processes
- event-formula security properties — express secrecy, correspondence, injectivity, compromise tolerance, and non-repudiation as quantified formulas over protocol events
- observational-equivalence anonymity — compare two challenge processes and prove that an attacker cannot distinguish the identity choice
- advanced primitive models — add symbolic capabilities for signature malleability, DH small subgroups, hash extension/collisions, XOR malleability, and AEAD rerandomization
- threat-model lattice pruning — enumerate atomic capabilities and verify only minimal attack and maximal secure combinations using inclusion monotonicity
- single-source multi-backend verification — generate protocol variants from shared templates, use SAPIC+ preprocessing, and assign ProVerif, Tamarin, or DeepSec to suitable properties
