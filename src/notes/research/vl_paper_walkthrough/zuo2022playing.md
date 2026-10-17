# Playing Without Paying: Detecting Vulnerable Payment Verification in Native Binaries of Unity Mobile Games
(authored by agents unless marked 🧑)
Tag: `zuo2022playing`, [paper](https://www.usenix.org/conference/usenixsecurity22/presentation/zuo)

## what PAYMENT SCOPE detects

PAYMENT SCOPE is a static binary-analysis tool for native Android Unity games compiled through IL2CPP. It identifies missing receipt verification and local-only verification from client-side receipt flows; it cannot determine what a server actually verifies. The analysis combines Unity metadata extraction, a payment-aware taint analysis, and policy checks for network and local-verification sinks. It is a vulnerability detector, not a proof that a game is secure.

The abstract reports 8,954 vulnerable games (22.89%) among 39,121 Unity games: “Among them, 8,233 games do not verify the validity of payment transactions and 721 games simply verify the transactions locally.” (abstract, p. 3093). The threat model assumes an attacker can repackage a game, run it in app-level virtualization, or hook payment APIs, so client-only checks cannot be trusted (Secs. 1 and 3.1, pp. 3093–3096).

## technique 1: recover IL2CPP metadata before analyzing native code

Inference: this technique applies when a managed engine compiles to native code but retains usable metadata. Unity's `global-metadata.dat` records function signatures, class names, field offsets, and field types. PAYMENT SCOPE parses it with IL2CPPDumper and builds a global function table GFT indexed by native function address and a global class table GCT indexed by class name. GFT supplies return and argument types; GCT maps a class and byte offset to a field type. This supports resolving native base-address-plus-offset accesses to class fields. The authors state, “We use the class name to index them, and store the extracted class types in a global class table GCT, which will be updated to record the taintedness whenever a class field stores tainted data.” (Sec. 4, p. 3099).

Steps in the paper: extract each function's address, original C# name, return type, argument count, and argument types into GFT; extract each class's name and field offsets/types into GCT; use the call graph and GFT to identify callers of the receipt API; and use GCT during taint propagation to label class fields rather than all primitive values. The authors specifically avoid globally tainting a primitive string type because it occurs in unrelated fields (Sec. 5.2, pp. 3100–3101).

Inference: a Verus translation could use this binary-analysis data model. Define immutable specs for `FunctionMeta`, `ClassMeta`, and `Field`, and prove that a resolved `(class, offset)` lookup returns the unique field recorded in GCT. Contracts can enforce that offsets are within a class layout. Parsing `global-metadata.dat`, pointer arithmetic, and Ghidra's P-Code semantics remain trusted inputs unless separately verified.

## technique 2: seed taint at the canonical payment-receipt API

The analysis treats `UnityEngine.Purchasing.Product.get_receipt` as the sole taint source. Find its native address in GFT, traverse the call graph to every call site, and set a one-bit taint tag on the call's return value in shadow memory. The authors explain, “As such, we focus on this API exclusively as the taint source.” (Sec. 5.1, p. 3099).

The paper describes the resulting workflow: “At a high level, starting from the caller of payment-data definition function (line 3-5 of Algorithm 1), we iterate each instruction to handle propagations (line 9-24), resolve object base address, and infer field taintedness (line 25-39).” (Sec. 5.2, p. 3099). Inference: a Verus implementation could specify that taint starts only at this API and prove that every initial shadow-memory tag corresponds to a call result; completeness still depends on the API inventory.

## technique 3: payment-aware interprocedural taint propagation to a fixed point

The analysis follows a receipt through registers, memory, object fields, JSON APIs, and function calls. Algorithm 1 repeatedly processes every function in GFT while GCT has updates. For a data-move instruction, taint the destination shadow-memory value, resolve its field base address and class, taint the corresponding GCT field, and continue from the destination. For a call, obtain the callee and parameter index. For a system or Unity API, apply an API summary; otherwise recurse into uses of that parameter in the callee. Repeat until no GCT taintedness changes (Algorithm 1 and Sec. 5.2, pp. 3099–3101).

Resolving a field is explicitly three steps: (I) backward-slice from the store to find the base address; (II) resolve its class from a function parameter, call return, or another field, recursively through copies/casts; and (III) taint the class field at the resolved offset. Then iterate callers and functions that access tainted classes so newly tainted fields propagate (Sec. 5.2, pp. 3100–3101).

Inference: a Verus translation could model shadow memory and GCT as finite maps with a monotone `tainted` predicate. A `proof fn` could show that each tag follows an abstract transfer rule from a source tag; this would not eliminate the paper’s type-based over-tainting. A loop `invariant` can state that all entries tainted before an iteration remain tainted and that the number of newly tainted entries is bounded by the finite GCT. A termination proof would also need finite processing within each iteration and a measure that decreases whenever GCT changes.

## technique 4: classify tainted sinks as no-verification, local-verification, or remote-verification

After propagation, rescan all functions for tainted values at two sink categories: network APIs (HTTP/HTTPS and Socket) and Unity's `CrossPlatformValidator.Validate`. A local-verification vulnerability requires tainted data to reach `Validate` and no path that also sends the data to a network API. A no-verification vulnerability requires neither a network sink nor a local-verification API. Everything else is conservatively labeled remote-verification, including cases where the server may only log the receipt and never validate it (Sec. 5.3, p. 3101).

The conservative policy is deliberate: “Being a vulnerability detection tool, we consider this is acceptable, as we cannot guarantee to detect all the vulnerabilities.” (Sec. 5.3, p. 3101). It can miss vulnerabilities when receipts reach a server that does not validate them, or when the tool cannot determine receipt use. Reflection or dynamically loaded code can instead cause false positives by hiding remote verification (Sec. 6.3, p. 3105).

Inference: a Verus translation could specify sink classification as mutually exclusive predicates over a taint-flow graph and prove that the no-verification and local-verification rules imply the required absence of network paths. Do not claim that the remote class is secure; the paper explicitly treats it as unknown. A verified Rust implementation can prove graph classification, but not unseen server behavior.

## technique 5: dynamic confirmation of static findings

The authors manually validate sampled games using AutoForge for virtualization and Frida for local-validation hooks. For no-verification findings, launch a purchase, cancel the real transaction, and use virtualization to hook Android APIs and replace the payment callback's receipt/state with a fake successful transaction. For local-verification games, instrument `CrossPlatformValidator.Validate` at run time with Frida so it returns success without altering the APK signature. If the game delivers the item for the cancelled purchase, the finding is confirmed (Sec. 6.3, pp. 3103–3104).

They sample 280 games: 220 to test false positives (10 from each vulnerable category, ranked by installs, plus 200 random vulnerable games) and 60 to test false negatives (the top 10 remote-verification games plus 50 random games classified as remote-verification). Of the 220, 30 could not be tested: “For the other 190 games, all of them were vulnerable and the attacks succeeded.” Of the 60, 9 could not be tested; 37 resisted the attacks and 14 were exploitable. The paper reports, “Consequently, this eventually leads to the FNs of 29%.” (Sec. 6.3, pp. 3103–3105). Inference: the reported counts imply 14/51 ≈ 27.45%, inconsistent with 29%. This measures missed vulnerabilities within the testable remote-verification sample, rather than the fraction missed among all truly vulnerable games.

Inference: dynamic confirmation is an external validation harness, not a Verus theorem. Contracts can ensure that a test runner's reported transaction state and product delivery correspond to the same game instance, but virtualization hooks, Frida, app-store behavior, and server responses remain outside the proof boundary.

## evidence, assumptions, and product threat

The corpus contains 39,121 Unity games. After filtering out games that never use in-app purchasing APIs, the authors analyze 10,640 IAP games: 8,233 no-verification, 721 local-verification, and 1,686 classified as remote-verification; 597 of the last group use both local and remote verification (Sec. 6.2, p. 3102, PDF image). Inference: 8,954/10,640 ≈ 84.15% of the IAP subset were flagged, while the abstract’s 22.89% uses the full Unity corpus. The scan used 24 parallel Ghidra instances, took 669 hours total (665 hours for P-Code preprocessing and 4 hours for payment-aware analysis), and consumed 5.8 TB for Ghidra projects (Sec. 6.2, p. 3103). Inference: payment-aware analysis took much less time than Ghidra preprocessing in this experiment.

The stated assumptions are that games use APIs for common operations such as logging and networking, and that global-metadata.dat is neither encrypted nor hidden (Sec. 3.1, p. 3097). Indirect flows through conditions or files can cause false positives; type-based over-tainting and unresolved container use can cause false negatives (Sec. 7.2, p. 3106, PDF image). The authors note that receipts sent to a server may be used only for logging, which the detector cannot confirm without server code (Sec. 6.3, p. 3105). Automatic analysis covers Android Unity binaries. Exploratory manual tests find two of five UE4 games and both tested iOS games vulnerable; automatic support for other engines and platforms remains future work (Sec. 7.3, pp. 3106–3107).

Inference: the direct lesson for VL is to treat untrusted input reaching a security sink as a fixed-point data-flow proof obligation. Verus can verify the transfer and classification engine over an explicit intermediate representation, while engine metadata, dynamic dispatch, server behavior, and Ghidra/P-Code correctness must be trusted or separately validated. The vulnerable games show why client-side verification is insufficient under this attacker model. Missed vulnerabilities in the remote-verification sample show why a static result must preserve an unknown category.

Inference: VL could verify the transfer and classification rules rather than repeat the existing detector design. The corpus rate and the proportion of missed vulnerabilities in sampled remote-verification games use different denominators and sampling procedures, so they cannot be combined into one prevalence estimate.

## techniques for the catalog

- metadata-guided native analysis: recover source-level function and field types from IL2CPP metadata and index them by address and offset
- canonical taint seeding: mark the sole documented receipt accessor's return value in shadow memory
- fixed-point interprocedural taint: propagate tags through data moves, fields, calls, API summaries, and tainted classes until GCT stabilizes
- base-class-field resolution: backward-slice a native address, resolve its class recursively, then taint the exact field offset
- sink-policy classification: distinguish no-verification, local-verification, and unknown remote-verification by tainted paths
- dynamic exploit confirmation: hook payment callbacks or local validation and attempt a cancelled purchase on sampled binaries
Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Being a vulnerability detection tool, we consider this is acceptable, as we cannot guarantee to detect all the vulnerabilities."): checked the full paper text and PDF-only pages 3094, 3102, and 3106, quotations, counts, references, and technique steps; corrected the publisher link, page references, IAP denominator, false-positive limitations, platform scope, and the reported 29% versus 14/51 discrepancy; marked proposed Verus work as Inference; did not inspect implementation code, reproduce experiments, or validate the proposed Verus proofs.
