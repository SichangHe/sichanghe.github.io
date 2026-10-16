# PAL*M: Property Attestation for Large Generative Models
(authored by agents unless marked 🧑)
Tag: `chantasantitam2026property`: [paper](https://www.semanticscholar.org/paper/fcfc079691699f729fa4672b2a74349e1f3e10b7)

## what the paper proves or measures

PAL*M is a property-attestation framework for generative-model operations in a confidential virtual machine (CVM) with a trusted GPU. The abstract states: “PAL*M defines properties across training and inference, leverages confidential virtual machines with security-aware GPUs for coverage of CPU-GPU operations, and proposes using incremental multiset hashing over memory-mapped datasets to efficiently track their integrity.” (Abstract, p.1). Its protocol produces a TDX QUOTE containing measurements of the requested operation, challenge, inputs and outputs; a verifier compares those measurements with trusted reference values. The paper models that protocol in Tamarin and reports that the model confirms the stated security guarantees (Abstract, p.1; Section 6.2, p.11).

The paper’s property-attestation abstraction has three parts: an operation over inputs and outputs, a property expressing their relationship, and evidence proving whether the property holds (Section 3.1, p.3). Attestation measures the operation, inputs and outputs, then binds the measurements with a signing key accessible only to the attestation mechanism. The threat model gives the host adversary control of the VMM, disk, peripherals and network, while trusting the TDX module, TDX CPU, NVIDIA H100 hardware, QE and PAL*M TD; denial of service, side channels and physical attacks are out of scope (Section 3.2, p.3).

## technique 1: measure large or memory-mapped datasets with incremental multiset hashes

what it is: an in-memory dataset is hashed once when loaded; a memory-mapped dataset is measured record by record when sampled. PAL*M uses an incremental multiset hash (MSH), which is insensitive to sampling order. It concatenates each record with its requested index, `d_i | i`, so replacing, repeating or reordering records changes the final MSH (Section 4.2, pp.4–5). A separate ordinary hash can be combined with MSH to bind a full in-memory measurement and a sampled memory-mapped measurement to the same dataset (Definition 3, p.6).

when to use: use MSH when the dataset cannot fit in protected memory or is randomly accessed from untrusted storage. Use ordinary hashing for data fully resident in memory. The paper says: “For accurate attestation, PAL*M must measure the dataset (or its items) upon use, since Adv could tamper with data in external storage at any time.” (Section 4.2, p.4).

how it is done:
1. choose the in-memory or memory-mapped access strategy (Section 4.2)
2. for memory-mapped access, fetch a record and its requested index inside the TD
3. compute the MSH update over the concatenation of record and index; continue for every accessed record
4. include the resulting dataset measurement in the operation’s input measurements
5. for binding, compute `h(h(D) || MSH(D))` and place it in the attestation measurement (Definition 3, p.6)

The paper’s MSH construction uses a 2048-bit prime in the prototype (Section 5.2, p.9). Its formal model has separate rules for starting a memory-mapped operation, locking and looking up a disk record, updating the block multiset, and completing the operation (Appendix D.5, pp.18–20). The model checks that a verifier-accepted quote has the input message that supplied the operation, dataset and challenge before execution (Lemma 12, Appendix D.5).

evidence: Table 2 reports BookCorpus attribute-distribution raw measurement overhead of 68.06% (memory-mapped) and 0.015% (in-memory), with total observed overhead of 42.50% and 0.021%, respectively; each is averaged over five runs on the stated prototype (Table 2, p.9; Section 5.2, p.9). The paper reports 337.5 seconds, or 3.65 ms per record, for binding on its 1/100 BookCorpus subset (Section 6.1.1, p.10). For model evaluation, memory-mapped total observed overhead ranges from 7.69% to 11.24% for MMLU, whereas BLEU evaluation over 3,003 WMT14 records stays at 0.13%–0.50% (Table 5, p.10). The paper also reports a 47.41% reduction in raw measurement overhead when replacing the prototype MSH with elliptic-curve MSH using try-and-increment, but warns that input-dependent timing makes that construction suitable only for public data (Appendix A, p.15).

limits: MSH adds modular exponentiation and multiplication per record, so it dominates cheap per-record operations. The prototype assumes model weights fit GPU memory; distributed-training aggregation, Byzantine resilience and verification complexity are explicitly left for future work (Section 6.3, p.12). The paper’s formal model assumes GPU–TD binding is established before launch and treats the pair as one trust boundary (Section 6.2, p.11).

Verus form: Inference: represent the dataset index and record sequence as ghost state, define a `spec fn` for the abstract MSH accumulator, and prove that each loop iteration extends the accumulator with `(record, index)`; use `requires` and `ensures` on a proof wrapper around the concrete hash implementation. Verus cannot directly establish TDX or H100 hardware claims, so those measurements remain external inputs represented by trusted specifications or `external_body` only at an integration boundary, not on the function being verified.

## technique 2: define operation-specific property measurements

what it is: PAL*M gives a reusable recipe in which each operation has inputs, outputs, a semantic property, and an `Att` tuple of hashes. Definitions 1–8 instantiate it for preprocessing, attribute distributions, measurement binding, training, model optimization, evaluation, single inference and session inference (Sections 4.3.2–4.3.4, pp.6–8).

how it is done:
1. specify the operation and all inputs that influence it
2. specify the output and a mathematical or natural-language property relating inputs and output
3. hash every input and output; use dataset hash `h_D` (ordinary hash or MSH) according to the access strategy
4. include `GPU_att` whenever GPU execution affects the operation, and establish an SPDM session before execution (Section 4.3.1, p.6)
5. extend `{op, challenge, H_I, H_O}` into TDX `REPORTDATA` (Section 4.4, p.7)
6. let the verifier check the QUOTE signature, challenge freshness, platform reference measurements, and property-specific input/output evidence (Section 4.4, pp.7–8)

Examples are explicit. Training measures hashes of the trained model, architecture, training dataset, configuration and tokenizer, and asserts `M_tr = Train(D_tr,T,M_ar)` (Definition 4, p.6). Weight optimization records the optimization identifier and hashes of the source and optimized models, tokenizer, configuration, optional adapter and dataset (Definition 5, p.6). Single inference asserts `r = M(M_tok(q))`; session inference hashes the session history and asserts that the response is computed from the history-prefixed query (Definitions 7–8, p.7).

evidence: Table 4 reports total observed fine-tuning overhead of 0.10%–2.27% across Llama-3.1-8B, Gemma-3-4B and Phi-4-Mini, and 4.81% for Llama quantization (Table 4, p.10). Table 3 reports training overhead of 0.014% in-memory and 5.61% memory-mapped for GPT-2 on full BookCorpus (Table 3, p.9). Table 6 reports single-inference total observed overhead of 66.43%, 45.52% and 55.26% for the three models, but session inference over 50 responses reduces those values to 11.39%, 3.77% and 6.69% (Table 6, p.11). These denominators are the operation runs described in the table captions; the prototype averages five runs (Section 5.2, p.9).

Verus form: Inference: encode each operation’s semantic relation as a `spec fn` or postcondition, use `requires` for input-hash and challenge preconditions, and use `ensures` to bind output hashes to the abstract operation result. A loop over session history needs a loop invariant stating that the accumulated history hash covers exactly the processed `(q_i,r_i)` pairs. Hardware QUOTE verification is outside Verus’s Rust functional proof and must be modeled as an assumed verified API contract.

## technique 3: compose evidence into a TDX and Tamarin-verified protocol

what it is: the online protocol binds a request to measurements and a hardware-authenticated quote. The paper’s protocol is: the initiator sends `{I, op, Chal}`; the provider saves data, imports it into the PAL*M TD, executes and collects `H_I,H_O`; the TD asks TDX for a TDREPORT with `REPORTDATA={op,Chal,H_I,H_O}`; QE verifies the TDREPORT MAC and signs a QUOTE; the initiator forwards QUOTE and non-confidential outputs to the verifier (Figure 5; Section 4.4, pp.7–8). The verifier then checks the signature, freshness challenge, TD and GPU references, and property measurements.

The Tamarin model states six goals: secret-key confidentiality, TD measurement integrity, quote authenticity, quote integrity, output integrity and input-measurement integrity (Appendix D.1, p.16). Four cases are modeled: in-memory/public output, in-memory/private output, memory-mapped/public output and memory-mapped/private output. Rules model TD initialization, input retrieval, operation execution, report generation, QE signing and verifier acceptance (Appendix D.2, pp.16–17). Lemmas connect acceptance to prior installation, exact `runOp(op,I)` output, correct MAC, QE signing and a prior input message (Appendix D.3, p.17).

evidence: The paper reports that under its assumed adversary, “Adv cannot tamper with operation inputs, forge or replay attestation responses, or manipulate the TD configuration without detection by Vrf.” (Section 6.2, p.12). The Tamarin model is symbolic: the operation is abstracted as `runOp`, cryptographic primitives and trusted hardware are idealized, and side channels, denial of service and physical attacks are excluded (Sections 3.2 and 6.2; Appendix D). Thus the result establishes protocol properties under the model, not correctness of PAL*M Python, PyTorch, TDX firmware, H100 firmware or the semantic truth of a trusted reference value.

Verus form: Inference: model the protocol’s software state machine with enums and ghost state; use `requires`/`ensures` to bind a quote record to the challenge and input/output hashes, and prove that acceptance implies a prior execution event. Verus can prove the Rust bookkeeping and hash-binding logic, while TDX MAC/signature and hardware measurement remain trusted assumptions unless separately verified.

## what remains trusted, contradictions, and VL implications

The trusted boundary includes TDX hardware and module, QE, H100 hardware, SPDM channel establishment, the PAL*M TD image, hash/MSH implementations, and trusted-authority reference values. The paper’s prototype is Python, so its measurements are not a machine-checked Rust proof. Inference: a VeruLaw product should treat PAL*M’s measurement-and-quote design as a useful architecture for attesting agent-produced artifacts, but retain independent Verus checking of Rust properties and explicit review of what the attested operation actually means. The paper has already addressed whole-file hashing’s time-of-check/time-of-use weakness for randomly sampled data with indexed MSH; VL should not redo that design. Distributed training proofs and hardware/software side-channel defenses remain open according to the paper.

The abstract claims “incurring <11% overhead for common operations” (p.1). This is consistent with the session-inference, training, fine-tuning, quantization and BLEU results, but single-query inference is 45.52%–66.43% and memory-mapped attribute distribution is 42.50% total observed overhead (Tables 2, 3, 4, 5 and 6, pp.9–11). Inference: the <11% statement therefore describes selected common workloads rather than every operation. Inference: threat to agent-written verified Rust is moderate: QUOTE integrity can attest that a measured binary ran, but it does not prove that the binary’s specification captures the intended safety policy or that an LLM-selected property is adequate.

## techniques for the catalog

- indexed incremental multiset hashing — measure randomly sampled external records in any order while detecting replacement, repetition and reordering
- operation-specific attestation tuples — hash all semantic inputs and outputs and bind them to a property definition
- CPU–GPU evidence binding — include GPU attestation and an SPDM-bound session in the operation measurement
- challenge-bound TDX protocol — extend operation, challenge and measurements into REPORTDATA and verify a signed QUOTE
- Tamarin protocol modeling — state confidentiality, integrity and authenticity goals and discharge them with trace lemmas across four memory/privacy cases

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
