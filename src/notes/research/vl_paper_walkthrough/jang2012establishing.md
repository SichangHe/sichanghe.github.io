# Establishing Browser Security Guarantees through Formal Shim Verification
(authored by agents unless marked 🧑)
Tag: `jang2012establishing`, [paper](https://www.usenix.org/system/files/conference/usenixsecurity12/sec12-final217.pdf)

## scope and result
Q UARK is a browser whose small kernel is implemented and verified in Coq while larger components run untrusted in sandboxes. The paper's key reduction is explicit: “formal shim verification addresses the challenge of formally verifying a large system by cleverly reducing the amount of code that must be considered.” (Sec. 1, p. 2) The kernel specification implies response integrity, tab non-interference, socket and cookie isolation, and domain-bar integrity. Tab non-interference compares requests from the same tab under valid traces where that tab is focused in both traces or neither; it concerns interference caused by the kernel, not communication through the network or permitted cookie sharing (Sec. 5.5, pp. 11–12).

## technique: shrink the trusted computing base with a shim
Partition the browser into a kernel and processes for tabs, input, display, network, and cookies. Route every sensitive operation through kernel messages. Tabs cannot access system resources directly; the kernel checks domains and forwards permitted requests. The authors report that Q UARK makes guarantees about “a million lines of code while reasoning about only a few hundred in the mechanical proof assistant Coq.” (Sec. 1, p. 2)

Verus form (Inference): define message enums and a kernel state as ordinary Rust datatypes; expose a `spec fn allowed` for each request and prove the dispatcher sends only allowed messages. Use `requires` and `ensures` on proof-relevant functions. Keep process isolation, OS scheduling, and cryptographic primitives in the trusted assumptions unless separately verified.

Evidence: the actual implementation and kernel are proved against a specification; untrusted WebKit still runs in separate processes. The assumption is that the OS sandbox and IPC mechanism enforce the stated communication boundary.

## technique: specify traces, then prove properties in two phases
Represent every kernel I/O action as a trace element. Define `tcorrect` inductively: an empty trace is valid; a valid trace extended by a request/response pair remains valid when `step_correct` holds. First prove the implementation emits only valid traces. Then prove security theorems over `tcorrect`, independent of monadic implementation details. The paper states: “our specification delineates which sequences of system calls the Q UARK kernel can make.” (Sec. 2, p. 3)

Verus form (Inference): encode a trace as `Seq<Action>`, define a recursive validity predicate, and prove each loop iteration appends a valid fragment. State security as lemmas over valid traces. Verus lacks Coq's Ynot monad, so effectful Rust code needs an abstraction layer or external model; the trace proof remains applicable.

Evidence: the address-bar theorem required only about 300 lines because it reasoned over the trace specification (Sec. 7, p. 15). Trust includes the trace model and its correspondence to OS effects.

## technique: enforce domain policies at the kernel
A tab has a fixed domain suffix. For sockets, allow a request only when host is a subdomain of that suffix; otherwise require `GetURL`, which returns body data without cookies or headers. Cookie stores and retrieves are routed to the cookie process for the tab's suffix only when the cookie domain is a subdomain. The paper summarizes the formal socket theorem as ensuring that “the kernel never delivers a socket bound to domain d to a tab whose domain does not match d.” (Sec. 5.5, p. 12) Section 3.4 also describes manually supplied CDN whitelists, which expand the allowed suffixes; the basic single-suffix rule alone does not describe those exceptions.

Verus form (Inference): define a `subdomain` specification and prove that successful `GetSoc` implies it; prove analogous cookie-domain lemmas. Encode the suffix as an immutable value in tab state. The policy's manually maintained CDN whitelists must be represented as an explicit trusted input or separately verified map.

Evidence: the paper gives Coq theorems `no_xdom_sockets`, `no_xdom_cookie_set`, and `dom_bar_correct` (Fig. 7, p. 11). Limitations include subframe cookie exfiltration and unsupported web features; the authors state that making frames principals would be needed for finer isolation.

## technique: iterate from a working prototype and keep the kernel simple
The authors first wrote a non-verified kernel to debug interfaces, then migrated incrementally from text browser to GUI, sockets, and cookies. They advise: “When forced to choose between adding complexity to the browser kernel or to the untrusted tab implementation, it was always better keep the kernel as simple as possible.” (Sec. 7, p. 15)

Verus form (Inference): prototype message protocols in ordinary Rust, freeze the minimal kernel API, then verify each transition and security lemma before adding features. This is process guidance rather than a theorem.

## techniques for the catalog
- formal shim architecture: isolate complex components and prove a small mediation kernel
- trace-based specification: prove implementation traces valid, then derive security properties from valid traces
- policy-checked IPC: check domain and cookie predicates before every sensitive request
- incremental verification: prototype interfaces, add features gradually, and preserve a simple kernel
