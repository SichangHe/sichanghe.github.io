# UtManager: a verified Rust buddy physical memory allocator
(authored by agents unless marked 🧑)

The useful result is a small concrete allocator verification with a real defect found during proof construction. The specification described in the paper emphasizes metadata consistency; a claim about all allocator behavior needs examination of the artifact's exact contracts.

## Implementation and proof structure

§2.1, printed p.74: “it replaces traditional linked lists with a flat, statically indexed array”. A binary buddy tree is encoded by indices: root 1, children 2i and 2i+1, parent obtained by shifting right. `bitmap: Vec<u8>` stores status; `free_areas: Vec<BTreeSet<usize>>` stores free node indices by tree level. Ordered sets select the lowest address at that level. §3.1, p.75: “the least significant three bits of each byte” represent the right child's, left child's and node's free statuses.

The invariant has two parts (§3.1, pp.75–76):

- “A memory block index appears in free_areas at some level if and only if its corresponding bits in the bitmap indicate it is free.” This synchronizes the explicit free-block index with the compact representation.
- “The child status bits within a parent's bitmap byte must match the actual free status derived from the child nodes' own bitmap bytes.” This synchronizes redundant hierarchical metadata.

Initialization establishes the invariant, then each mutator preserves it. §3.1, p.76: “use loop invariants for splitting and merging”. The paper's proof reasons about the state updates in each function body and uses those loop invariants to show that bitmap and free_areas stay synchronized and parent-child status bits are updated consistently.

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

## Validation

Material quotations were checked against the PDF text. A separate reviewer checked all five studies against the primary text; the citation correction and omitted scope qualifications were incorporated. No code or published experimental results were independently reproduced.

The ChatGPT answer was recovered from the diagnostic `buddy_allocator_bv1_diag.json`, not from a normal answer file. Its first paragraph records that the run ended `account_ui_retry_required`, the CLI saved no answer file, and the recovered text is plain text without formatting; whether ChatGPT meant to write more is unverified. The paper-specific claims below were checked against the PDF. External-source claims in the recovered text were not folded into this study.

## ChatGPT cross-check (2026-10-12)

The recovered answer's main assessment holds. This is a manually engineered Verus proof of one concrete Rust allocator, not an agent-generation experiment. The paper reports 1,923 lines of specification and proof code, 349 executable lines, approximately two person-months of effort, and 4.3 seconds for full verification (§4, p. 77). The answer correctly treats the last number as completed-artifact checking time rather than proof-discovery or proof-writing cost.

The answer found a real specification wording conflict. Figure 1's displayed allocation postcondition is guarded by a nonzero result, while the text extraction of §3.2 reads “upon successful allocation (.res = 0)” (p. 77). The PDF page image shows the symbol there is not equals (res ≠ 0), matching Figure 1, where None returns 0 as the failure value. So the apparent conflict is a text-extraction artifact, not an error in the paper.

The answer's stronger specification-completeness concerns are appropriately qualified. The paper explicitly says that the verified result covers “bitmap manipulation, free-block set maintenance, invariant preservation, and memory safety” (§5, p. 78), and its published invariant synchronizes those metadata structures. The PDF does not show a full theorem for global non-overlap, physical-address mapping, allocation completeness, concurrent access, or caller ownership. The countermodel and always-fail discussion in the answer demonstrate that the displayed predicates and conditional postcondition alone do not establish those stronger properties; unpublished predicates or helper contracts could still supply them.

The defect and trusted-base claims are source-supported. The paper says verification uncovered “a previously unknown defect in the original implementation: a control-flow error that bypassed metadata updates during specific allocation paths” (§4, p. 77), and it states, “we assume that the Verus verifier, the underlying Z3 SMT solver, and the Rust compiler are correct” (§4, p. 78). The answer correctly notes that the paper gives no patch or reproducible failing path, so the defect report is evidence of one discovery, not a measured detection rate.
