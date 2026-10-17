# Resource Specifications for Resource-Manipulating Programs
(authored by agents unless marked 🧑)
Tag: `grannan2023resource`, [paper](https://arxiv.org/abs/2304.12530v2)

## scope and result
This paper extends Prusti with first-class, user-defined resources for programs that manipulate assets such as token balances. State-based specifications become verbose because they must spell out frame conditions, e.g. that other accounts' balances are unchanged by a deposit. The authors' methodology makes resource operations explicit. They verify 31 resource-related functions across four applications (IBC token transfer, IBC NFT transfer, an ERC-721 contract, a PSP-22 contract) and report shorter and syntactically simpler specifications but slower verification (Sec. 6). They write that “specifications for resource-manipulating programs quickly become verbose and difficult to interpret” and propose “defined first-class resources”.

## technique: first-class resource abstraction
What it is: declare a resource kind (a Rust struct tagged `#[resource_kind]`); a resource is a resource type plus an integer amount, tracked as ghost state per stack frame. There are three operations: create (`produce!`), destroy (`consume!`), and transfer between stack frames at call and return sites (per callee pre/postconditions). Built-in properties follow: the paper says the amount of a resource “should remain constant unless explicitly created or destroyed” (Sec. 1), and destroying a resource that is not held is a verification error (Sec. 3.1).

When to use it: use it when a Rust contract or systems component moves quantities among accounts and state-based specifications need pointwise frame conditions and case splits on aliasing (Sec. 2).

How to apply: (1) declare resource kinds, e.g. `#[resource_kind] struct Money(AcctId);` (Sec. 3); (2) write `produce!`/`consume!` in implementations and `resource(Money(a), amt)` in `requires`/`ensures` of interfaces (Figs. 7-8); (3) declare a coupling invariant `#[invariant_twostate(...)]` relating the change in `holds(...)` to the change in program state (Fig. 11); it acts as an implicit postcondition on every function taking a mutable reference to the type (Sec. 3.4); (4) Prusti encodes resources into Viper `perm()` expressions and verifies (Sec. 4). The paper stresses that resources are “abstractions decoupled from the program state”, and that coupling invariants give “the mapping between abstract resource notions and concrete program states” (Sec. 1).

Evidence: Sec. 6 compares specifications with and without resources for 31 functions in four applications. Per Sec. 6.1, resource specifications need 48% fewer lines on average (fewer for 25 functions, equal for 3, more for 3, all in NFT transfer). Per Sec. 6.2, 29 have smaller AST depth and 26 smaller AST size (on average 38% and 41% smaller). Per Sec. 6.3, verification is 35% slower overall (e.g. token transfer 61.83 s to 78.37 s, Table 3). Resource definitions and coupling invariants are extra one-time lines (Table 2). Ease of understanding is only a hypothesis; the paper leaves a user study to future work.

Limits stated by the paper: functions that reborrow and return a live mutable reference are not supported (Sec. 4.3); interaction with untrusted external code is not handled (Sec. 7); the case study changed some Prusti-unsupported types and assumed the IBC core standards correct (Sec. 5.3). Inference: the encoding into Viper, the SMT solver and the Rust front end are trusted, and users still design the resource abstraction and coupling invariants; the paper gives no soundness proof.

## what is proved and what remains trusted
Prusti checks function contracts, with coupling invariants enforced as postconditions. The case study proves two properties, two-way peg and preservation of supply (Sec. 5.3), not any unstated requirement. Inference: solver incompleteness can cause false rejections; the paper does not claim a soundness proof.

## techniques for the catalog
- first-class resources — represent conserved assets directly in specifications with explicit operations
- coupling invariants — two-state invariants tying resource state changes to program state changes, enforced as postconditions
- default conservation obligations — make create/destroy/transfer semantics enforce conservation automatically
- concise contract comparison — compare specification lines, AST size/depth and verification time against a state-based baseline

Audited 2026-10-12 against the paper: read the full text; checked operations, steps, quotes and Sec. 5-6 numbers (31 functions, 48% fewer lines, 25/3/3, 29/26, 41%/38%, 35% slower, Table 3). Changed: removed invented `split` operation and "representation relation" (now coupling invariants); replaced invented how-to steps with the paper's; corrected "conservation facts" and "heap predicates" to frame conditions and state-based specifications; replaced one-application, "easier to write" evaluation claim with four applications, the numbers above, longer verification time, and ease of understanding as an untested hypothesis; replaced unsupported soundness claims with the paper's stated limits and marked the rest as inference. Not checked: supplementary material and Appendix-free PDF figures beyond text. Follow-up: the closing implications paragraph is now marked as inference through its end (its first sentence is the paper's quotation), and the claim that overflow cases are absent from the application was replaced by the fact that the paper does not mention overflow.
