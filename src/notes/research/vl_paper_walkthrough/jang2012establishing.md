# Establishing Browser Security Guarantees through Formal Shim Verification
(authored by agents unless marked 🧑)
Tag: `jang2012establishing`, [paper](https://www.usenix.org/system/files/conference/usenixsecurity12/sec12-final217.pdf)

Paper link: link from the fetch record.

## scope and result
QUARK is a browser whose small kernel is implemented and verified in Coq while larger components run untrusted in sandboxes. The paper explains the reduction: “At its core, formal shim verification addresses the challenge of formally verifying a large system by cleverly reducing the amount of code that must be considered; instead of formalizing and reasoning about gigantic system components, all components communicate through a small, lightweight shim which ensures the components are restricted to only exhibit allowed behaviors.” (Sec. 1, p. 2) The kernel specification implies response integrity, tab non-interference, socket and cookie isolation, and domain-bar integrity and correctness.

Tab non-interference compares the same tab request under valid traces where that tab is focused in both traces or neither. Responses are equal, except that forwarding to cookie processes may use different channels with the same payload for the same domain. Its scope is limited: “It is also important to understand that tab NI proves the absence of interference as caused by the kernel, not by other components, such as the network or cookie processes.” (Sec. 5.5, p. 12) Network communication and cookie sharing between tabs of the same domain remain possible.

Inference: VeruLaw can apply this architecture by putting security decisions in a small Rust/Verus mediation core, isolating parsers and complex agents behind message contracts, and proving the core's transitions and security properties. This would require explicit assumptions about component isolation and external effects.

## technique: isolate complex components behind a small kernel
Partition the browser into a kernel and separate tab, input, graphical-output, and cookie processes. The network is a resource managed by the kernel, not a separate network process described by this architecture. Tabs use modified WebKit and a Python wrapper to request resources from the kernel. The kernel can pass connected socket descriptors to tabs, which then read and write those sockets without reconnecting them to another host or port (Secs. 3–3.3, pp. 3–5).

The reduction is quantitative: “Formal shim verification saved substantial effort: we guaranteed our security properties for a million lines of code by reasoning just 859.” (Sec. 6, p. 13) Figure 8 lists 859 lines of Coq kernel code, 4,383 lines of kernel proofs, and 969,109 lines of WebKit code (p. 12).

Inference (Verus form): define message enums and kernel state as Rust datatypes; specify allowed requests and prove the dispatcher sends only permitted responses. Model socket transfer explicitly, including what a component may do after receiving a descriptor. Treat process isolation and external primitives as assumptions unless separately verified.

## technique: specify traces, then prove properties in two phases
Represent kernel calls to primitives as actions in a trace. Define `tcorrect` inductively: the empty trace is valid; if a past trace is valid and `step_correct` relates it to a request and response, then the combined trace is valid. The paper stores the newest actions first, so the combined trace is `rsp ++ req ++ tr`, rather than an append in chronological order (Secs. 5.1–5.2, pp. 8–9).

Use Ynot's monadic preconditions and postconditions to connect code to traces. The opaque predicate `traced tr` represents the actual execution history. Primitive specifications update it; kernel code cannot manufacture a proof for an arbitrary history. Add a proof-only trace field to kernel state and maintain `kcorrect`, which combines `traced s.tr` with `tcorrect s.tr`, as the loop invariant (Secs. 5.3–5.4, pp. 9–10).

The proof is split deliberately: “We ultimately specified correct browser behavior in terms of traces and proved both that (1) the implementation satisfies the spec and (2) the spec implies our security properties.” (Sec. 7, p. 15) The second phase avoids reasoning about monads. The authors report that the later domain-bar correctness proof required only about 300 lines because it used the trace specification (Sec. 7, p. 15).

The request model includes external nondeterministic results: “such nondeterminism is captured in the request” (Sec. 5.5, p. 11) Response integrity therefore does not assert that repeated web fetches return identical documents.

Inference (Verus form): encode traces as `Seq<Action>`, specify valid steps, and prove a loop invariant connecting implementation state to valid traces. Prove security lemmas separately over those traces. Contracts for external effects must justify their trace actions; a trace datatype alone does not establish that connection.

## technique: enforce domain policies at the kernel
A tab has a fixed domain suffix, exactly one level below a public suffix in the prototype. The basic socket rule permits a connection when its host is a subdomain of that suffix. Otherwise, the tab uses `GetURL`, which returns the response body without response headers and sends no cookies. Section 3.4 also describes manually supplied CDN whitelists that expand a tab's allowed suffix into a disjunction of suffixes (pp. 5–6). The basic single-suffix rule does not describe those exceptions.

Cookie stores and retrieves are sent to the cookie process for the tab's suffix only if the requested cookie domain is a subdomain of that suffix (Sec. 3.5, p. 6). Figure 7 gives `no_xdom_sockets`, `no_xdom_cookie_set`, and `dom_bar_correct`; the text also describes `no_xdom_cookie_get` (Sec. 5.5, pp. 11–12). The domain bar displays the fixed suffix, not the full URL, and equals the suffix of the currently selected tab.

Inference (Verus form): define an allowed-socket predicate that includes any whitelist expansion and prove that every transferred socket satisfies it. Make the suffix immutable in tab state and prove analogous cookie-routing and domain-bar lemmas. Treat the manually maintained whitelist as policy input whose correctness needs separate justification.

The isolation is between domain suffixes, not frames. A compromised subframe can take over its tab, steal that tab's cookies, and leak them through a `GetURL` parameter. Finer cookie restrictions within a domain rely on unverified WebKit code. Mashups, third-party cookies, and inter-tab `postMessage` are unsupported; the authors propose frames as principals and controlled communication for future work (Sec. 6, p. 14).

## technique: iterate from a working prototype and keep the kernel simple
The authors first wrote a non-verified kernel to debug interfaces, then developed incrementally from a text browser to a GUI, sockets, and cookies. They advise: “When forced to choose between adding complexity to the browser kernel or to the untrusted tab implementation, it was always better keep the kernel as simple as possible.” (Sec. 7, p. 15)

Inference (Verus form): prototype message protocols in ordinary Rust, then verify the minimal kernel and its security lemmas as features are added. This is development guidance, not a proved property.

## what is proved, trusted, and useful to VL
Coq proves that the kernel implementation satisfies its trace specification and that the specification implies the security properties. The paper lists the trusted computing base as Coq's core calculus and type checker, the formal security-property statements, Ynot and QUARK primitives, the OCaml compiler/runtime, the operating-system kernel, and the chroot sandbox. It excludes WebKit, Python, and the proved kernel code from this list (Sec. 6, p. 13).

The final version's mean page-load overhead was 24% relative to stock WebKit, measured over ten loads of each of ten Alexa sites. Shared-memory bitmaps, rectangle rendering, batched I/O, connected-socket transfer, CDN whitelists, and cookie caching are described as optimizations (Secs. 3.3–3.4 and 6, pp. 5–6, 13). The paper does not formally verify the full same-origin policy; enforcing how loaded data is used would require reasoning inside the complex tab implementation (Sec. 6, p. 14).

Inference: VL can reuse the separation between implementation-to-trace proofs and trace-to-security proofs. Incorrect external-effect models or failed isolation would undermine such an argument, even if the core's local proofs passed.

## techniques for the catalog
- formal shim architecture: isolate complex components and prove a small mediation kernel
- trace-based specification: prove implementation traces valid, then derive security properties from valid traces
- policy-checked IPC: enforce socket and cookie policies through kernel messages
- incremental verification: prototype interfaces, add features gradually, and preserve a simple kernel

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "Now we want to show that kcorrect is an invariant that holds throughout execution of the kernel."): checked every quotation, numerical claim, section and page reference, architecture, technique step, policy exception, proof scope, and trusted assumption against the full paper; corrected quotation boundaries and provenance, removed the separate network process, clarified socket transfer and reverse trace ordering, added the proof invariant and non-interference qualifications, and replaced the scripted-only status; did not rerun the browser, inspect its implementation or proof artifacts, reproduce performance measurements, independently validate the fetch-record link, or verify the proposed Verus/VL adaptations.
