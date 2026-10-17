# BesFS: A POSIX Filesystem for Enclaves with a Mechanized Safety Proof
(authored by agents unless marked 🧑)
Tag: `shinde2020besfs`, [paper](https://www.usenix.org/conference/usenixsecurity20/presentation/shinde)

## define a small checked interface

BesFS protects an SGX enclave from a hostile operating system by replacing direct POSIX calls with an abstract filesystem interface. The paper's central design is to define a benign OS by state and transition properties, then abort on deviations from those properties. It says: “B ES FS is an abstract filesystem interface which ensures that the OS follows the semantics of a benign filesystem—it is exhibiting observationally equivalent behavior to a good OS.” (§3.1, p. 528).

Inference: Use the method when untrusted syscall results can corrupt paths, file descriptors, sizes, memory mappings, or error handling. The interface has 15 core APIs and five state properties (SP1–SP5) plus 15 transition properties (TP1–TP15) (§3.1, p. 528). The state contains paths and metadata, open handles, file memory, anonymous mappings, and mapping metadata. The five state properties enforce unique path-to-node identifiers, registered handles, unique open entries, cursor bounds, and defined file bytes below EOF (Table 2, p. 529).

Steps:
1. Define an empty initial state satisfying SP1–SP5 (§3.2, p. 529).
2. Define each API's precondition and state transition, including its success or error result (Table 3, p. 530; §3.3, p. 531).
3. Make successful transitions atomic: all changes appear together; on failure, retain the old state (§3.2, p. 529).
4. Prove each transition preserves SP1–SP5 and satisfies its TP properties.
5. Chain the per-call theorem inductively to arbitrary sequences of calls (Theorems 1–2, p. 528).

Inference: In Verus, represent the filesystem state as a struct and each API as a Rust function with `requires` for preconditions and `ensures` for state and result postconditions. A `proof fn` can establish invariant preservation and sequence induction. Verus's mutable references and `old(...)` can express atomic updates; the paper's Coq monad is a design analogy, not a Verus construct.

## make hostile return values observable

BesFS encrypts file pages but also checks metadata and return values, defending against the filesystem attacks described in §3.3 (pp. 530–531). For path mismatch, SP1 requires distinct, unique paths mapped to the right metadata; for descriptor mismatch, BesFS preserves the unique mapping between file names and descriptors while files are open; for size mismatch, atomicity and read/write/truncate postconditions constrain sizes. For error-code manipulation, the paper says: “All state or transition property violations in the interface execution map to a specific error code.” (§3.3, p. 531). Anonymous `mmap` checks that OS-provided memory is zeroed, copies it into enclave memory, and redirects future accesses to the protected copy (§3.3, p. 531).

Inference: Apply this as a check-before-commit pattern:
1. Validate the OS result against the in-enclave state and the operation's precondition.
2. If any check fails, return the specified error and keep the input state.
3. Otherwise, update state and return the new state plus success.
4. Authenticate page content with AES-GCM tags and keep page identifiers and tags in enclave metadata (§4, p. 531).

The paper states: “B ES FS interface performs its own checks to identify error states.” (§3.3, p. 531). The interface formalization also states: “All file and directory paths in the filesystem are captured by path set P , where Path represents the path data type.” (§3.2, p. 529). Inference: In Verus, allow an OS call to return arbitrary values, then prove that validation rejects inconsistent results without changing the state. Cryptographic authenticity should be an explicit assumption unless separately verified.

## implement recursive state and page integrity

The Coq implementation composes standard types (`ascii`, `list`, `nat`, `bool`, `set`, `record`, `string`, and `map`) and represents files as ordered page-ID lists. A virtual memory map maps each page ID to a fixed 4096-byte page, with 4000 bytes of content and 96 bytes of metadata; pages are encrypted outside the enclave and checked on decryption (§4, p. 531). Anonymous mappings have non-overlap invariants; file and directory trees prohibit cycles and duplicate names; open handles contain a file ID and cursor (Table 4, p. 532).

Coq's Gallina language is purely functional, so BesFS passes state explicitly and hides it with a monad (§5, pp. 532–533). To distinguish repeated OS calls with identical ordinary arguments but potentially different results, the authors add an implicit increasing counter: “Therefore, we have to force Coq to treat each call as different.” (§5, p. 533). Recursive tree proofs need a stronger induction principle than Coq's generated `Tree_ind`; BesFS supplies `Tree_ind2` and uses strong induction (§5, p. 533). Atomicity proofs split successful and error cases, retaining the original state when a check fails (§5, p. 533).

Inference: Rust can use a persistent state value or mutable state, with a ghost event counter to distinguish external calls in the model. Recursive directory proofs may need explicit termination measures and induction lemmas. BesFS assumes OS calls terminate and treats nontermination as denial of service: “If the call terminates, the safety is guaranteed; the OS can decide not to terminate which constitutes as denial-of-service.” (§5, p. 533).

## evidence, trusted assumptions, and limits

The paper reports 167 lemmas and two main theorems in 4,625 lines of Coq definitions and proofs (§6, p. 534). Its enclave evaluation uses 1,449 lines of hand-translated C and 724 added lines in Panoply (§6, pp. 534–535). The paper says: “we resorted to a manual line-by-line translation of our machine-checked Coq implementation to C code.” (§6, p. 534). Table 5 separately lists 3,676 lines for Coq definitions and proofs; the paper does not explain this difference. The interface has 15 core APIs and was integrated into Panoply and Privado. The malicious-return experiment used around 687 test cases in 40 C test drivers. All assertion failures observed with malicious values without BesFS, but absent from the benign baseline, were eliminated with BesFS (§7.2, p. 536).

Performance depends on workload. Single filesystem calls average 3.1× overhead; read is 3.7× slower and create+write 5.4× slower because each operation performs page-level AES-GCM (§7.3, p. 537). SPEC CINT2006 averages 12.22% overhead, IOZone bandwidth slows by 4.8×, and FSCQ access patterns average 6.7× overhead (§7.3, p. 537). Of four Panoply applications attempted, OpenSSL shows ±0.2% overhead, Tor ±0.8%, and FreeTDS 72.5%; H2O is incompatible because it shares descriptors across worker threads and accesses file content concurrently (§7.4, p. 537). Ten Privado neural-network applications require 20 LOC changes each and show ±1% overhead because their baseline already decrypts inputs (§7.4, p. 538).

The proof assumes correct SGX hardware and, in one lemma, that the adversary cannot forge AES-GCM tags and does not know the enclave key (§3.1, p. 528; §8, p. 538). BesFS targets integrity; higher-level confidentiality guarantees are outside its scope (§3.1, p. 528). It omits symbolic links, timestamps, multi-enclave or concurrent access to shared enclave files, and explicit synchronization APIs (§4, p. 532). New page and file/directory ID allocators are specified rather than implemented (§5, p. 533). The proof covers the Coq implementation, not the hand-translated enclave executable; certified compilation or a proof relating the C or machine code to Coq remains future work (§§6, 9, pp. 534, 538–539).

Inference: For agent-written verified Rust, reuse the state-transition and check-before-commit patterns for storage and syscall wrappers. BesFS's specification can guide invariant selection, but its Coq proofs do not establish correctness of a new Rust implementation.

## techniques for the catalog

- invariant-defined filesystem — define good state properties and require every API transition to preserve them
- serial composition proof — prove one-call safety, then induct over arbitrary call sequences
- check-before-commit — validate untrusted syscall results and retain old state on any failure
- authenticated page map — track page IDs and tags in enclave metadata to detect reorder and overlap
- explicit state counter — distinguish repeated external calls with an increasing argument in the functional model
- custom recursive induction — strengthen generated induction schemes for mutually recursive directory trees
- atomic error semantics — make every failed operation return a specific error without changing state
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "The state resulting from the operation of each method is explicitly passed as a parameter to the next call."): checked all study quotations, numbers, section and printed-page references, technique steps, assumptions, and evaluation claims; corrected quotations and page references, the hand-translated C description, proof scope, and unsupported conclusions; did not check code, proofs, or reproduce experiments.
