# Hardware/Software Co-Assurance using the Rust Programming Language and ACL2
(authored by agents unless marked 🧑)
Tag: `hardin2022hardware`, [paper](https://doi.org/10.4204/EPTCS.359.16)

## scope and result

Hardin presents Restricted Algorithmic Rust (RAR), a Rust subset transpiled to Restricted Algorithmic C (RAC), then translated to ACL2 for theorem proving and to hardware/software toolchains. The abstract says, “In our first implementation of a RAR toolchain, we simply transpile the RAR source into RAC.” (Abstract, p. 202). The design reuses RAC's existing ACL2 translator and RTL books so one restricted source can target software and hardware.

RAR remains proper Rust and compiles with the standard Rust compiler, but is semantically equivalent to RAC and adopts RAC's restrictions (§4.1, p. 208). The prototype covers array-backed data structures, cryptography (including XChacha20, Poly1305, Blake2b, and X25519), and JSON lexing/parsing (§1, pp. 202–203). The paper's detailed case is a fixed-size array set with two linked lists stored in one `anext` array.

Inference: RAR is a translation-based assurance architecture, not a Verus proof of general Rust. For VL, its strongest lesson is to define a small, analyzable subset and make source-to-model correspondence explicit. The transpiler and RAC/ACL2 semantics become trusted boundaries unless separately verified.

## technique 1: restrict Rust to a hardware-verifiable subset

RAR inherits RAC's semantic restrictions (“we adopt the same semantic restrictions as described in Russinoff’s book”) and adds a macro providing a C-like `for` loop, to enable translation to RAC and ease the transition from C/C++ (§4.1, p. 208). The paper does not list the restrictions; it defers to Russinoff's book. Table 1 (p. 206) contrasts the formal-verification “comfort zone” (total, terminating functions; infinite-precision integers; linear arithmetic) with real-world development (loops, structs, arrays, modular integers, IEEE 754 floating point, non-linear arithmetic); the RAC translator bridges the two (§3, p. 207). §2.4 (p. 205) says the languages the authors favor “restrict pointer operations”.

The runtime library goal is formally verified services (§2.3, p. 204). The paper notes that DO-178C Level A rules “frown on dynamic memory allocation, preferring simple array-based data structure implementations”, that array-based implementations are easier to realize in hardware than dynamic data structures, and that an algebraic data type may have a high-level functional implementation plus a fixed-memory version with a proof that the latter specializes the former (§2.3, pp. 204–205).

Steps supported by the paper: (1) adopt the RAC semantic restrictions; (2) add only syntax that can be translated to RAC (the `for` macro); (3) write code that is still proper Rust and compiles with the standard Rust compiler (all §4.1, p. 208). Inference: a reusable procedure would also (4) require bounded arrays and explicit integer widths where hardware needs them and (5) reject source outside the subset before proof or synthesis; the paper does not describe a subset checker or these two steps.

Inference: a Verus project could define a supported profile with no unsafe code, bounded containers, and explicit termination measures, then prove profile membership before generating contracts. Verus can verify ordinary Rust functions beyond this profile, but the paper's hardware equivalence requires a separately defined translation semantics.

## technique 2: transpile once, reuse compiler and prover backends

The RAR pipeline is `RAR source → Plexi → RAC source → RAC ACL2 translator → ACL2 theorem prover`; the RAC source can also go to a C/C++ compiler or FPGA HLS compiler (Fig. 3, p. 208). Plexi performs lexical and syntactic source-to-source transformations (§4.1, p. 208). The RAC translator converts imperative code into functional ACL2 code, translates loops to tail-recursive functions, automatically generates measure functions for ACL2 admission, and converts structs and arrays to functional records (§3, p. 207).

The translator maps modular arithmetic and bit-vector operations to Russinoff's RTL functions. The paper says, “Loops are translated into tail-recursive functions, with automatic generation of measure functions to guarantee admission into the logic of ACL2.” (§3, p. 207). The paper adds that “RAC subsetting rules ensure that loop measures can be automatically determined” (§3, p. 207). Inference: this makes termination evidence part of translation rather than a separate manual proof for every loop.

Steps in the paper: (1) write RAR; (2) Plexi, built on the plex parser and lexer generator, converts it to RAC (§4.1, p. 208); (3) the RAC source can be compiled with a C/C++ compiler or fed to an HLS-based FPGA compiler (§4.1, p. 208); (4) the RAC ACL2 translator produces ACL2 (§5.2, p. 211); (5) theorems are proved about the generated ACL2 functions (§5.3, p. 211). The paper reports that the generated `aset_add` translation (Fig. 8, p. 213) “is nonetheless quite readable, which is a rare thing for machine-generated code” despite being two translation steps from the RAR source (§5.2, p. 211).

Inference: Verus can play the source-language proof role, but a hardware backend needs a verified refinement theorem from Verus executable code to RTL or another target. An unverified transpiler is a major trust boundary. The RAR pattern suggests keeping generated proof models readable enough for counterexample diagnosis.

## technique 3: maintain a compact invariant for a shared-array data structure

The Arrayset uses fixed arrays `anext` and `avals`, heads `free_head` and `used_head`, and terminator `ARR_SZ = 256`. One `anext` array stores both a free list and a used list; each element belongs to exactly one list, and both lists terminate with `ARR_SZ` (§5.1, pp. 208–210). `aset_add` returns unchanged state when full or when the value already exists; otherwise it moves the free head, stores the value, links the new node at the used head, and updates the used head (Fig. 6, p. 210; text pp. 209–211). `aset_del` is “a bit more complicated”; it depends on `aset_element_prev_from()` (not shown), and its code unlinks the matching used-list node and pushes it onto the free list (Fig. 7, p. 212). The paper says maintaining the integrity of the two lists inside the single array is “a primary obligation of the ACL2 proofs” (§5.1, p. 209).

The paper shows two ACL2 definitions: `free-head-used-head-relation` (free_head differs from used_head) and a combined `good-statep` that also uses `arraysetp`, `no-dups`, `aset_len`, and `aset_len_free` (definitions of those are not shown): “This function states that for a good state, the aset input satisfies the arraysetp wellformedness predicate; the free_head is not equal to the used_head, there are no duplicates of val in the avals array, and that the length of the free list plus the length of the used list is equal to the total length.” (§5.3, p. 211).

The representative theorem shown is `aset_add-works--thm`: if `good-statep`, `integerp val`, and `(aset_len aset)` is below `(arr_sz)`, then `aset_is_element val (aset_add val aset)` equals 1 (§5.3, p. 211). ACL2 proves `aset_add` automatically; `aset_del`, which performs more updates, still requires user assistance (§5.3, p. 213).

Steps shown in the paper (§5.3, p. 211): (1) define a head relation (free_head differs from used_head); (2) define `good-statep` combining wellformedness, the head relation, no duplicates, and free length plus used length equal to the array size; (3) state a functional theorem under `good-statep`, an integer value, and spare capacity. Inference: a full methodology would also prove that every operation preserves `good-statep` and states list disjointness and termination explicitly; the paper shows no preservation theorem and does not say how `arraysetp` handles list termination. The paper reports that `aset_add` is proved automatically and `aset_del` needs user assistance (§5.3, p. 213).

Inference: in Verus, represent `Arrayset` with fixed arrays and ghost predicates for list reachability, disjointness, and no duplicates. A loop `invariant` should state bounds and preservation of `good_state`; `requires` should express capacity and integer constraints; `ensures` should state membership or unchanged-state behavior. Verus's arrays and sequences differ from ACL2 records, so the predicates must be recast rather than copied.

## technique 4: reason about records, loops, modular arithmetic, and bit vectors in ACL2

RAC's translator maps field and array operations to untyped record operators `AG` and `AS`, and maps conditionals and comparisons to RAC/RTL functions (§5.2, pp. 211–213): `IF1` is a RAC-specific macro, and `LOG>=`, `LOGAND1`, and `LOG<` are RTL functions. The authors write that “much of the proof effort involved with RAR code is reasoning about untyped records and RTL”, although “not a lot of RTL-specific knowledge is needed, at least in our experience” (§5.2, p. 211), and that the RTL books are “quite capable of reasoning about a combination of arithmetic and bit-vector operations” (§3, p. 207).

Inference: Verus can retain typed Rust arrays and integers, which may simplify some obligations, but hardware-level modular arithmetic still needs explicit ranges and overflow semantics. A Verus proof should state whether arithmetic is mathematical, wrapping, or target-width and connect that choice to generated hardware behavior.

## technique 5: compare verification engines by scalability bounds

The paper compares Arrayset verification with model checking, symbolic execution, and ACL2. Gryphon model checking proves the example only up to array size 3 before state-space explosion. Bakar Kiasan symbolic execution reaches size 8 before combinatorics overwhelm it (§6, p. 213; §7, p. 214). The Arrayset RAR code is declared with `ARR_SZ = 256` (§5.1, p. 208); for ACL2 the paper reports no size limit or proof time, only that `aset_add` is proved automatically and `aset_del` needs user assistance (§5.3, p. 213), and that the ACL2 effort “required a fair amount of human labor” (§7, p. 214). The paper also compares with its earlier hand-built stobj formalization: the stobj version ran faster, but had to be constructed by hand with no direct connection to imperative code, and reasoning about untyped records is “considerably easier” than about stobjs (§6, p. 214).

Inference: the comparison is not a like-for-like measure of engineer time or theorem strength, since the tools used different encodings (Simulink/Stateflow models for model checking, SPARK for Bakar Kiasan, RAR for ACL2) (§6, p. 213) and the paper reports no ACL2 size bound. A Verus evaluation should report array bound, solver time, proof edits, and whether the result is bounded or parametric. Passing a smaller bound is not evidence of a general proof.

## what is proved, measured, and trusted

The paper details one verified example. For Arrayset, `aset_add` is proved automatically and the more complex `aset_del` with human assistance (§5.3, p. 213; the `aset_del` theorem is not shown). §7 (p. 214) claims correctness was established “through automated formal verification” for several data structures (singly-linked lists, doubly-linked lists, stacks, deques), but gives no details. The cryptography (Monocypher subset) and JSON lexer/parser examples are reported as implemented in RAR (§1, pp. 202–203) and as “successfully applied” (§7, p. 214); the paper reports no proofs for them. Inference: the approach relies on the semantic equivalence of RAR and RAC (§4.1, p. 208), the correctness of Plexi and the RAC translator, ACL2, and the RTL books; the paper does not discuss this trust base. Also, compiling RAR with the standard Rust compiler does not by itself prove equivalence to the RAC/ACL2 model.

The paper's future work is to increase the number of Rust features supported in RAR and to improve the ACL2 libraries to discharge more proofs automatically (§7, p. 214); Inference: this implies the current subset and proof automation are limited. The model-checking and symbolic-execution numbers are bounds for this Arrayset case: 3 and 8, respectively, not general capacities for those tools. The authors say the ACL2 effort “required a fair amount of human labor”, but that “additional proof efforts involving similar data structures should proceed more quickly” (§7, p. 214).

Inference: the threat to agent-written verified Rust is medium to high if VL needs hardware/software equivalence or unbounded low-level arithmetic. RAR already demonstrates the subset-and-transpile approach and the Arrayset invariant pattern; VL should not claim either as new. A possible contribution is a verified or proof-carrying Verus-to-hardware translation with explicit correspondence obligations and measured repair cost.

## techniques for the catalog

- restricted Rust subset: adopt RAC-like syntax and semantics so code is suitable for hardware synthesis and theorem proving
- source-to-source assurance pipeline: translate RAR to RAC, then to ACL2, C/C++, or HLS backends
- automatic loop measures: translate loops to tail recursion with termination measures for ACL2 admission
- shared-array invariant: a `good-statep` predicate combining wellformedness, distinct heads, no duplicates, and free plus used length equal to the array size, over one backing array
- theorem-prover contracts: state `good-statep` preconditions and functional postconditions as ACL2 theorems
- bounded scalability comparison: compare model checking, symbolic execution, and ACL2 with explicit array-size limits
Checked 2026-10-17 against the full paper by a Claude agent (mid-paper quote: "The ingenious bit about this particular array-backed set implementation is the use of a single anext array to hold both the free list and the used list."): read the whole paper text; checked every quotation, section and page reference (pages re-derived from the page headers), the pipeline and Arrayset description, theorem and definitions, and the model-checking (3) and symbolic-execution (8) bounds; changed the link to the paper's DOI, corrected Table 1 and §2.3 descriptions, page cites for §5.3 and §6, removed claims that proofs exist for crypto/JSON, that ACL2 handles size 256, and that preservation theorems and list disjointness are in the paper, and marked reconstructed steps as Inference; did not check the Verus-related inference statements beyond consistency with the paper, the Russinoff book, or the cited external works.
