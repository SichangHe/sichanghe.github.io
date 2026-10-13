# VerusBelt: sound proof types and the limits of Verus's foundation
(authored by agents unless marked 🧑)
Audit: audited 2026-10-12 against the paper; slips corrected in place; details in the last line.

## Paper and reading boundary

Travis Hance, Laila Elbeheiry, Yusuke Matsushita, and Derek Dreyer, *VerusBelt: A Semantic Foundation for Verus’s Proof-Oriented Extensions to the Rust Type System*, PLDI 2026, 25 pages. [DOI](https://doi.org/10.1145/3808325), [primary PDF](https://iris-project.org/pdfs/2026-pldi-verusbelt.pdf), [SSD1 copy](/ssd1/sichangheagent/vlpw/verusbelt.pdf), [extracted text](/ssd1/sichangheagent/vlpw/verusbelt.txt). Page numbers below are PDF pages, also the article's 247:n page numbers.

This study extends the [existing Verus overview](../topic_studies/formal_verification_rust/rust_verifiers/verus.md) with the semantic mechanisms, the discovered invariant-lifetime error, and the limits of the theorem. It does not reproduce the proofs or run the artifact.

## Central lesson for VL

A proof API needs a sound meaning before agent-written proofs using it can establish anything. This paper checks important Verus proof types in Iris/Rocq, a framework and proof assistant for reasoning about owned and shared resources. It also discovers a real lifetime-checking mistake. It does not certify the implemented Verus pipeline.

The authors state the boundary directly (§1, p. 4): “We do not attempt to verify the actual implementation of Verus itself; rather, our efforts are focused on providing a semantic foundation for Verus’s proof-oriented types.” Agent inference: VL should reuse these supported abstractions and record the remaining assumptions, rather than treat a verifier pass as an unconditional statement about compiled Rust.

## What it does

The abstract (p. 1) reports “the first semantic soundness proof for a significant subset of Verus” and says “All our proofs are mechanized in Iris/Rocq.” The modeled primitives are PPtr, PCell, PointsTo, LocalInvariant, AtomicInvariant, resource algebras, and storage protocols. Resource algebras define how proof resources combine and change; storage protocols are a highly configurable interface for enforcing safe usage of shared state (§1, p. 3).

The model also covers boxes, products, sums, shared and mutable borrows, thread spawning, recursive types, and relevant Copy, Send, and Sync bounds (§6, p. 20). These are modeled typing rules and APIs, not a demonstration that an agent can infer contracts for an arbitrary repository.

Theorem 6.1 (§6, p. 20) concludes: “f executing under VerusBelt semantics will not exhibit undefined behavior.” Its stated entry point is a no-argument function returning unit with the specified trivial predicate transformer. A predicate transformer computes the input condition needed for an output condition. The paper explains a two-stage use: accumulate the rules' transformers while typing, then prove the resulting condition is implied by the trivial condition. This resembles Verus's Rust type checking followed by verification-condition checking, but the correspondence to the implemented translation is not proved.

## Techniques and knowledge to retain

1. **Give each type separate logical and physical meanings.** §3.1–§3.2, pp. 9–11, attach a mathematical interpretation, a physical representation, and an ownership predicate to types. The ownership predicate describes which resources accompany a value; a pointer can be freely copied while its permission cannot. §3, p. 9, describes the transformer as a condition “that must hold on the input value to ensure safe execution of f and have 𝜙 hold at the end.” Agent recommendation: generated APIs should identify the value, its abstract state, and its permission separately.

2. **Use one account of shared borrowing for generic proof APIs.** RustBelt allowed type-specific sharing interpretations. Verus needs a uniform account because abstractions such as Arc and RwLock are built through common storage protocols. §1, p. 3: “we need to develop a unified formal account of the generic sharing provided by storage protocols.” The Leaf Lifetime Logic combines temporary resource sharing with lifetime tokens. An active token permits access; after expiration, the owner can recover the borrowed resource (§3.3, p. 12). This supports borrow splitting and lifetime shortening without inventing a different logic for each abstraction.

3. **Treat shared access as permission to read, not duplicated exclusive ownership.** Leaf's guard relation connects a retained shared resource with what it protects. §3.3, p. 13, says it roughly means “we can treat the proposition 𝐴 as a shared, read-only version of 𝐵.” In §3.4, p. 16, the authors reject combining shared resources through separating conjunction: that would duplicate ownership. They instead use ordinary conjunction, subject to the required technical conditions. Agent inference: combining two borrowed permissions must not manufacture exclusive ownership.

4. **Separate a cell's location from ownership of its contents.** Points-To Cell Logic splits a memory fact through a logical cell identifier. §3.4, p. 14: “we only need ownership over the last link in this chain (Heap-Write2). For the remaining links, read-only access suffices.” This explains mutation through a shared PCell reference when the caller exclusively owns its PointsTo token. Nested cells form chains. Heap-Move-Cell permits relocating the cell without owning its contents token (p. 15). A cell identifier is logical, not an extra runtime allocation.

5. **Track invariant opening and its lifetime at the opening site.** A mask records open invariant names to prevent opening the same invariant twice. Destruction or movement between threads while open needs lifetime constraints too. §4, p. 17, reports that “Verus got this check wrong for several years.” The old check applied extra lifetime constraints at invariant close. The flaw is explicit: “in the event of nonterminating code, the invariant might never be closed, in which case such constraints would have no effect.” The new semantic account carries an invariant lifetime context. Agent recommendation: when checking temporary authority, consider executions that never reach cleanup; do not base soundness on an eventual closing event.

6. **Understand the atomic-region argument's boundary.** AtomicInvariant permits at most one executable atomic operation with ghost work around it. §4.1, p. 17, uses a global atomic lock in the model to keep the whole region atomic. The runtime has no such lock. The authors describe the needed execution-equivalence argument, then say “we leave this argument as an informal one” because the language lacks a formal ghost/executable distinction. Agent inference: the Rocq mechanization does not turn this separate lock-removal argument into a machine-checked erasure theorem.

7. **Model mutable references with current state and a future value, but control information flow.** RustHorn's future value describes the contents when the borrow expires. §5, p. 18, defines a prophecy as “an unknown variable which will be constrained at a later program step.” It enables returned mutable references and borrowing into containers. The new PCell::borrow_mut is a proposed primitive, not evidence that the paper-time tool already supports it.

8. **Prevent prophecy values from constructing their own future.** §5.1, p. 19, constructs a Ghost value from `future(mut_ref) + 1`, then writes it back, yielding a contradiction. The required restriction is: “the input to Ghost(...) cannot depend on any prophesied values.” The model stores a prophecy identifier in ordinary values and puts the assignment table in a separate transformer parameter. Ghost construction cannot consult that table; functions such as future can. This avoids lossy projections of generic values. §5.2, p. 20, combines full borrows for the final cell link with shared borrows for the preceding chain to justify borrow_mut.

## Assurance conditions and limitations

- The language uses sequentially consistent atomics and non-atomic accesses; data races are undefined behavior (§4.1, p. 17). This study provides no justification for treating arbitrary relaxed atomic programs as covered.
- §6, p. 21: “we were not able to prove a Send bound for &mut T, outside of static lifetimes.” Resource-algebra and storage-protocol specs also have documented differences. The authors explicitly do not believe these differences establish errors in the real specs; that is their belief, not an additional soundness theorem.
- The model simplifies type layout, pointer provenance, and two-phase borrows (§6, p. 21). These differences matter when translating a model-level guarantee into a claim about actual Rust.
- Standard-library axioms for Vec and HashMap are outside scope. §6, p. 21: “Verus’s translation of Rust source to verification conditions is also entirely trusted code” The predicate-transformer-to-implementation connection is manual; the paper does not formalize it.
- The solvers are not verified or proof-producing (§6, p. 21).
- §6, p. 21: “potential soundness issues in Verus’s erasure scheme are outside the scope of VerusBelt.” Removing proof code needs a termination and behavior-preservation argument. The paper specifically identifies decreases measures, invariant credits preventing hidden nontermination, and higher-order ghost functions as remaining work.

These are different boundaries. A sound proof type does not establish the correctness of a library axiom, a translation pass, a solver, or proof-code removal.

## What was already done; what VL can reuse

The foundational machinery builds on RustBelt, RustHornBelt, Leaf, and Iris. The paper's specific advances are the uniform lifetime-sharing account, cell-chain logic, proof-type soundness, invariant-lifetime diagnosis, and safe integration of prophecies. §5, p. 18, explicitly says that combining RustHorn's encoding with automated proving “is not novel”; Creusot already did it. The new issue is coexistence with Verus proof types.

Agent recommendations: use existing permission and invariant APIs when shaping generated Rust; retain the lifetime bug and prophecy paradox as examples for assumption reviews; report the precise formalized subset and trust boundary. Full mutable-reference support, realistic erasure verification, and checked source-to-condition correspondence remain separate engineering or research work. These recommendations do not authorize implementation changes.

## Product threat

Agent inference: this strengthens VL's chosen verification backend rather than replacing an agent product. It supplies foundations and APIs that VL should not claim to have invented. It also weakens any differentiation based only on producing Verus proofs, because the underlying proof language already supports sophisticated systems reasoning. The paper contains no evaluated autonomous specification discovery, proof-generation agent, or repository-to-Verus conversion pipeline. Its most direct product implication is assurance: VL must explain which guarantees rest on these semantic results and which still depend on trusted implementation components.

## First reading

Read §4, p. 17, on the invariant-close mistake, then §5.1, p. 19, on the prophecy paradox. Ask: can a generated contract or proof resource depend on an event that execution is not obliged to reach?

## Study status

Checked the material claims and quotations against the saved primary paper text. An independent reviewer checked the drafts against the primary texts. No artifact execution or empirical reproduction was performed.

ChatGPT analysis of the full PDF, 2026-10-12: [answer](/ssd1/sichangheagent/vlpw/verusbelt_chatgpt_answer.md). It agrees with this study on what is proved and what stays trusted. Checked against the paper text and added from it:

- An earlier Verus formalism covers part of what VerusBelt leaves out. §7, p. 21: it “proves termination of ghost code, as well as an erasure-validity theorem, which VerusBelt does not do.” The next sentence adds that it “does not address all the challenges described in §6.”
- The prophecy restriction also appears in later work by another author. Footnote 2, p. 4 (the same work is described in §7, p. 22, in slightly different words): “Lafeychine [22] has adapted RustHornBelt to model “ghost snapshots” (a particular proof-oriented API) using a similar prophecy-stratification to ours.”
- The division of labor the authors intend. §7, p. 22: “VerusBelt uses Iris only to verify the proof-oriented primitive types of Verus, and expects developers to verify these libraries by (safely!) building on” them. Agent inference: VL agents should build on these primitives in Verus and never need Iris.
- Callers see only contracts. §2, p. 5: “Verus treats every function call as opaque and only reasons about it via its declared requires and ensures.”

Not checked: its 30-item technique list beyond the items above, its threat ratings (its opinion), and its section 6 recommendations. Seven of its quotations were checked and all are in the paper; the rest were not checked.

Audited 2026-10-12 against the paper: read the whole study and the whole paper text; checked every quotation location, section and page reference, Theorem 6.1, the limitation list (Send bound, trusted translation, solvers, erasure), the prophecy paradox example, the cell-logic and Leaf-guard claims, and the section 7 claims. Changed three things: the storage-protocol gloss (the exclusive and shared permissions wording was not in the paper; replaced with the paper's own description), the sentence-position slip for the does-not-address-all-challenges remark (it is the next sentence, not the same one), and the Lafeychine quotation reference (the quoted wording is in footnote 2 on p. 4, not in section 7; the paper calls it follow-on work learned of after acceptance, so the word independently was dropped). The agent-marked inferences and recommendations were left as is. Not checked: the ChatGPT answer file beyond the four items quoted, and the Rocq artifact.
