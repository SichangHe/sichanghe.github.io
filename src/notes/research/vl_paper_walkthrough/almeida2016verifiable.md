# Verifiable Side-Channel Security of Cryptographic Implementations: Constant-Time MEE-CBC
(authored by agents unless marked 🧑)
Tag: `almeida2016verifiable`, [paper](https://www.semanticscholar.org/paper/f1e581cd6e7e4c10795c271dffd6bea82d88ab87)

## scope and central method

Almeida, Barbosa, Barthe, and Dupressoir give a machine-checked security argument for an x86 implementation of MAC-then-Encode-then-CBC-Encrypt (MEE-CBC). The motivating fact is a real s2n implementation bug: an off-by-one boundary check caused a dummy hash computation for exactly four padding values, creating a timing oracle. The paper's methodology separates three obligations: black-box cryptographic security of an algorithmic specification, functional correctness of C against that specification, and leakage security of compiled assembly. It then composes those obligations into implementation security. The abstract states: “We provide further evidence that implementing software countermeasures against timing attacks is a non-trivial task and requires domain-specific software development processes.” (Abstract, PDF p.1)

The case study combines EasyCrypt for computational security, Frama-C/WP and ACSL for C functional equivalence, and CompCert plus a certifying x86 information-flow type system for assembly correctness and leakage. The authors explicitly do not justify the chosen leakage model; they verify the implementation relative to it. “Our methodology subsumes previous work connecting provable security and side-channel analysis at the implementation level, and supports the verification of a much larger case study.” (Abstract, PDF p.1)

## technique 1: the three-proof composition

Use this when a cryptographic implementation must retain a high-level security theorem in the presence of timing observations. Step 1: write the functional MEE-CBC specification and prove its IND$-CPA and INT-PTXT properties in EasyCrypt under abstract block-cipher and MAC assumptions. Step 2: annotate a C implementation in ACSL and use Frama-C WP to prove functional equivalence to the specification. Step 3: compile with CompCert and prove semantic preservation from C to x86. Step 4: type-check the generated assembly with the certifying information-flow system, marking leakage-visible inputs public and secrets secret. Step 5: apply the framework theorem: black-box security plus implementation correctness plus leakage security yields x86 implementation security.

The framework's key separation is stated in Section 1 (PDF pp.3–4): “This methodology relies on separating three different concerns: i. black-box specification security, which establishes the computational security of a functional specification ...; ii. implementation correctness ...; and iii. leakage security.” The separation prevents a source-level functional proof from silently standing in for a side-channel proof.

Verus form (Inference). Verus can express the functional layer with `spec fn`, `requires`, `ensures`, and proof functions, and can prove a Rust implementation refines a mathematical encryption specification. A leakage model can be represented by a ghost trace and a relational lemma whose `ensures` states equal public traces for equal public inputs. The composition across a compiler and x86 information-flow checker is outside ordinary Verus; linking such proofs needs an independently modeled compiler semantics or a second checker. A Verus contract therefore covers only the layer whose execution model it states.

## technique 2: implementation-generation correctness and leakage non-interference

Section 4 defines an implementation-generation procedure as a mapping from a specification language to an implementation language. Correctness means the procedure preserves input-output behavior for every adversary and primitive specification. The paper states: “Correctness of the implementation generation procedure C is equivalent to the standard language-based notion of simulation.” (Section 4, PDF p.15). Use it by writing a game that runs the specification and implementation on the same input and randomness, then proves equal outputs.

Inference: leakage security is a separate relational property. Choose a projection τ that marks public inputs (for symmetric encryption, key length and message/ciphertext are public); all other inputs are secret. Run the implementation twice from inputs equal under τ and prove equal leakage traces. The definition is: “Then, P is (M, τ )-non-interferent if, for any two executions ... τ (P, i) = τ (P, i ) ⇒ ℓ = ℓ′.” (Definition 2, Section 4, PDF p.16). This is the exact two-run obligation that connects constant-time coding to cryptographic security.

The composition theorem says: “Let C be correct and produce M-leakage-secure implementations. Then, for all SKE scheme Π that is correct, IND$-CPA-, INT-PTXT- and INT-CTXT-secure, the implementation Π* = C(Π) is M-correct, M-IND$-CPA-, M-INT-PTXT- and M-INT-CTXT-secure with the same advantages.” (Theorem 2, Section 4, PDF p.17). Verus form (Inference): specify a ghost trace `spec fn`, prove output refinement with `ensures`, then prove a relational lemma over two calls with equal public projections and equal traces. Use `requires` for low-equivalence and loop `invariant` for trace accumulation. The theorem's cryptographic game reduction and machine leakage semantics remain external to Verus.

## technique 3: explicit constant-time MEE-CBC countermeasures

The implementation protects decryption against Lucky 13 style timing leakage by four concrete rules (Section 2, PDF pp.7–9): (1) remove and validate padding in constant time; (2) always compute the MAC of the unpadded message, including bad padding; (3) make the number of compression calls independent of decoded-message block count and final-block length; (4) compare transmitted and computed MACs in constant time. The paper states: “Constant-time, here and in the rest of this paper, is used to mean that the trace of program points and memory addresses accessed during the execution is independent from the initial value of secret inputs.” (Section 2, PDF p.9)

The authors' OpenSSL comparison exposes a scope condition: OpenSSL's AES lookup tables still make secret-dependent data accesses, so it is not constant time under this definition. Their verified code reuses NaCl AES, SHA256, and CBC code where possible, modifying HMAC, padding, and composition for the countermeasures. In a Verus model (Inference), each loop handling padding or MAC bytes would need a loop `invariant` that bounds accesses and proves the same iteration count for all secret values; branch conditions on secrets must be replaced by mask-based operations whose functional contracts are proved. A ghost trace lemma can relate two runs, but cache behavior of generated instructions remains an external assumption.

## technique 4: black-box security reductions with leakage

EasyCrypt formalizes IND$-CPA and INT-PTXT for MEE-CBC with fresh uniform IVs and minimal padding. The machine-checked Theorem 1 gives adversary reductions: MEE-CBCx86 security is bounded by AES PRP or HMAC MAC advantages plus the stated birthday term, with query bounds tied to message length. The theorem says: “MEE-CBCx86 is MCT x86 -correct and provides MCT x86 -IND$-CPA and MCT x86 -INT-PTXT security if the underlying components AES128NaCl and HMACSHA256NaCl are black-box secure as a PRP and a MAC, respectively.” (Theorem 1, Section 3.4, PDF p.12)

The proof uses abstract deterministic primitives and then instantiates the block length λ to 16 bytes for AES. It does not formalize the stronger INT-CTXT proof in EasyCrypt; the paper imports known MEE-TLS-CBC results for that extension. This distinction matters: a theorem conditional on black-box AES/MAC assumptions does not prove those concrete implementations secure against every leakage channel.

Verus form (Inference). Verus can encode deterministic functional security games only with substantial ghost state and lemmas; probabilistic adversary reductions and advantage calculations are not its normal execution contract. A practical VL design should keep the cryptographic reduction in a game prover and use Verus for implementation refinement and trace non-interference, with an explicit interface stating which primitive theorem is imported.

## technique 5: refinement through ACSL, Frama-C, and CompCert

Frama-C WP checks that every C function implements ACSL contracts corresponding to the EasyCrypt operators. The authors link ACSL logical constructs to Why3 theories and formally relate them to EasyCrypt theories, closing the specification gap. CompCert then supplies semantic preservation from C to generated assembly. Finally, the x86 information-flow type system checks non-interference in the leakage model. The proof strategy is summarized in Section 5 (PDF pp.17–20): “We first specify and verify the correctness and black-box computational security of the MEE-CBC construction using EasyCrypt.” It continues with Frama-C equivalence and CompCert assembly leakage checking.

Inference: use this pipeline when a trusted compiler is available and source code can satisfy the information-flow type system's restrictions. The paper notes that users must mark inputs public or secret, while the C implementation must be written in an analyzable style. Inference for Verus: `ensures` contracts can play the functional-refinement role, and proof functions can show that a Rust wrapper preserves a spec. CompCert's theorem cannot be replaced by a Verus source proof; a product needs post-compilation checking or a trusted compiler assumption.

## evidence, performance, and failure modes

The performance experiment decrypts a 1.5 KB TLS 1.2 record under AES128-SHA256, reporting medians over 500 runs on a virtualized Intel x86-64 Linux machine with 4 GB RAM (Figure 4, PDF p.21). s2n takes 14K cycles/5 μs, OpenSSL 23K/9 μs, and the fully verified MEE-CBCx86 101M/42 ms. The verified assembly is about 8,400× slower than s2n; profiling attributes 97% of its time to NaCl constant-time AES. The same C under GCC -O2 is 59M cycles/25 ms, only 1.7× faster than the verified CompCert build, supporting the claim that constant-time AES—not proof machinery—is the main cost.

The s2n vulnerability demonstrates that unit tests can miss timing bugs: the dummy compression call was wrong for exactly four public-length-dependent padding values, and a timing oracle recovered plaintext bytes by trial and error. This is a direct threat to agent-written verified Rust if a balancing countermeasure has an off-by-one condition or if a compiler introduces a secret-dependent access after source proof. Inference: VL should treat explicit leakage traces and post-compilation checks as high-priority for cryptographic code, while not assuming that a functional Verus proof establishes constant-time assembly.

The paper's trust boundary includes EasyCrypt's trusted core, Frama-C/Why3 semantics, CompCert correctness, the x86 type-system checker, the C and assembly semantics, and the chosen leakage model. It says: “We insist that we do not claim to formally or empirically justify the validity of any particular leakage model.” (Section 1, PDF p.4). It also reports a limitation: encryption-side plaintext lengths may leak, so the implementation is not length-hiding under the stronger definition in the presence of leakage. Future work must model architectural details such as memory management, scheduling, and stateful leakage.

## what VL should reuse and what it should not redo

Inference: reuse the three-layer decomposition, the concrete four-part MEE-CBC countermeasure checklist, and the discipline of preserving one common specification across security and implementation tools. Do not redo a generic black-box MEE-CBC proof or claim that source-level contracts imply binary CT; this paper already supplies both the composition theorem and a concrete x86 case study. A useful VL experiment (Inference) is to compile verified Rust cryptographic routines, extract branch/address traces for two secret inputs, and compare them against the Verus ghost trace contract, measuring proof effort and compiler-induced violations.

## techniques for the catalog

- three-proof implementation security — compose black-box cryptographic security, functional refinement, and leakage non-interference
- constant-time MEE-CBC countermeasures — equalize padding, MAC, compression, and comparison behavior under secret inputs
- leakage-aware security reduction — carry a chosen trace model through IND$-CPA and INT-PTXT implementation theorems
- ACSL/Frama-C/CompCert refinement — connect a high-level specification to C and then semantics-preserving x86
- certifying information-flow typing — check that compiled assembly traces do not depend on secrets

Checked 2026-10-15 by a Codex agent with scripted checks only: quotations matched word for word against the paper text, title, size, sentence reuse and tag checked by the prerequisite check script; the paper was not read in full (correction 2026-10-16). A full recheck against the paper is pending.
