# UtManager: a verified Rust buddy physical memory allocator
(authored by agents unless marked 🧑)

Shaojie Wang, Yuting Wang, Qianying Zhang, Weituo Dai, Tian'ao Xie, Shijun Zhao and Yongwang Zhao, *Formal Verification of a Rust-Based Buddy Physical Memory Allocator*, [DOI 10.1007/978-3-032-30693-7_5](https://doi.org/10.1007/978-3-032-30693-7_5). [Saved PDF](/ssd1/sichangheagent/vlpw/buddy_allocator.pdf), [text](/ssd1/sichangheagent/vlpw/buddy_allocator.txt). The collection labels it TASE 2026; the PDF title-page imprint says “TASE 2026, LNCS 16697, pp. 73–80, 2027.” Preserve that distinction rather than silently changing the publication year.

The useful result is a small concrete allocator verification with a real defect found during proof construction. The specification described in the paper emphasizes metadata consistency; a claim about all allocator behavior needs examination of the artifact's exact contracts.

## Implementation and proof structure

§2.1, printed p.74: “it replaces traditional linked lists with a flat, statically indexed array”. A binary buddy tree is encoded by indices: root 1, children 2i and 2i+1, parent obtained by shifting right. `bitmap: Vec<u8>` stores status; `free_areas: Vec<BTreeSet<usize>>` stores free node indices by tree level. Ordered sets select the lowest address at that level. §3.1, p.75: “the least significant three bits of each byte” represent the right child's, left child's and node's free statuses.

The invariant has two parts (§3.1, pp.75–76):

- “A memory block index appears in free_areas at some level if and only if its corresponding bits in the bitmap indicate it is free.” This synchronizes the explicit free-block index with the compact representation.
- “The child status bits within a parent's bitmap byte must match the actual free status derived from the child nodes' own bitmap bytes.” This synchronizes redundant hierarchical metadata.

Initialization establishes the invariant, then each mutator preserves it. §3.1, p.76: “use loop invariants for splitting and merging”. The proof stages the linked metadata updates so intermediate operations can be justified and the global invariant is re-established at the operation boundary.

§3.2, p.77: allocation requires valid state and a size between one 4096-byte frame and the total volume in bytes. It ensures invariant preservation and, on success, that “the corresponding bitmap byte flips from free (0b111) to allocated (0b000).” Free requires a previously allocated block and updates both representations while merging buddies. The authors report proving every allocation path, bounds safety, arithmetic overflow freedom, and termination. “We also employ decreases clauses to establish the termination of all recursive calls and loops.”

## Reusable verification knowledge

Recommendations grounded in those contracts:

1. Give every redundant representation an explicit agreement invariant. An ordered free-set alone does not justify bitmap mutation, and a bitmap alone does not justify lookup.
2. State parent/child agreement separately from free-set agreement. Splitting and merging need both, but the local update obligations differ.
3. Specify each operation's actual state change as well as invariant preservation. A function that does nothing can preserve an invariant.
4. Include machine-integer bounds and index ranges beside mathematical tree arithmetic. The proof must cover the implementation's shifts, multiplication and vector accesses.
5. Use decreasing tree depth or another well-founded progress measure for split/merge traversal; do not infer termination from a successful safety proof.
6. Keep the original failing path as a regression example. §4, p.77: “a control-flow error that bypassed metadata updates during specific allocation paths.” The paper does not expose a sufficiently detailed counterexample or patch in its prose to reconstruct that test precisely.

## Evidence and limits

§4, p.77 reports “specification (spec) and proof (proof) code account for 1,923 lines” and executable code “comprises 349 lines”, approximately 2 person-months and 4.3 seconds for full verification on an Apple M4 with 16 GB RAM. The annotation-to-executable ratio is about 5.5, our arithmetic from those author counts. Fast checking is not evidence that proof generation is cheap.

§4, p.78: “we assume that the Verus verifier, the underlying Z3 SMT solver, and the Rust compiler are correct.” The paper does not provide a complete inventory of trusted collection contracts or external bodies. That omission is not evidence that any particular hidden assumption is present.

The zero-runtime-overhead claim follows from erasing ghost annotations: “the Rust compiler completely erases this verification logic” (§4, p.78). No comparative runtime benchmark is reported in the eight-page paper. Inference: erasure supports zero annotation overhead, but does not establish unchanged performance after executable bug fixes or proof-driven implementation changes.

The prose does not explicitly state a theorem over a set of allocated address intervals proving global non-overlap, completeness of allocation failure, preservation of clients' payloads, or lowest-address selection across all eligible levels. It also does not analyze concurrent access. These remain artifact questions; do not promote the stated metadata invariant into those stronger properties without checking the contracts. Figure 1 contains the allocation specification as an image; a complete code audit requires the artifact, not just text extraction.

## Prior work and VL threat

§5 distinguishes implementation verification from abstract buddy/TLSF models: “but stops short of verifying concrete implementations.” Its references point to the 2019 verified buddy model and code verification for L4 and Zephyr. The paper's contribution is a Rust/Verus bitmap allocator case study, not a new buddy algorithm or proof logic.

Inference: this is prior evidence that manually engineered Verus proofs can cover concrete memory-management code and find control-flow defects. It supplies a useful candidate for VL specification/proof-generation exercises if the code and trusted boundaries can be obtained. It does not establish autonomous agents doing this work. A competing service can use similar libraries and examples; VL's differentiator would need to be intent recovery, automation, proof quality and auditable evidence rather than merely producing a verified allocator.

First artifact question: does the successful-allocation contract prove disjointness from every live allocation, or only that selected metadata changes correctly?

## Evidence and VL context

Page numbers below are PDF pages unless printed pages are explicitly named. Quotations and reported results come from the linked primary paper, not an independent reproduction. Recommendations and competitive assessments are our inferences. VL's current [vision](/ssd1/sichangheagent/VeruLaw/docs/vision.md) says: “The product direction is autonomous Verus project generation.” Its intended inputs are ordinary intent, code, tests and project documents. This study does not establish that VL currently achieves that goal.

## Validation

Material quotations were checked against the PDF text, including a second raw-text extraction for Vosti's two-column layout. A separate reviewer checked all five studies against the primary text; the citation correction and omitted scope qualifications were incorporated. No code or published experimental results were independently reproduced.

ChatGPT offload was attempted with full PDFs. The multi-file upload failed, the combined-PDF job ended with `account_ui_retry_required`, and its retry required login. No ChatGPT answer was used to support the claims in this study. The primary-text synthesis and independent review remain the evidence.
