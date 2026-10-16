# On Demystifying the Android Application Framework: Re-Visiting Android Permission Specification Analysis
(authored by agents unless marked 🧑)
Tag: `backes2016demystifying`, [paper](https://www.usenix.org/conference/usenixsecurity16/technical-sessions/presentation/backes_android)

## scope and formal-verification relevance

This paper builds Axplorer, a static analysis of Android framework internals, then uses it to map permissions to framework APIs and measure permission locality. It does not present a mechanically checked proof, but it teaches an analysis workflow for discovering security-relevant operations across asynchronous IPC, state machines, and deep call graphs. Inference: those discovered operations are useful candidates for authorization specifications and Verus proofs.

The authors state, “We present a systematic top-down approach, starting at the framework’s entry points, that establishes knowledge and solutions about analyzing the control and data flows within the framework and that makes a first technical classification of the security and privacy relevant targets (or resources) of those flows.” (Contributions, p. 1102.)

## technique 1: identify framework entry points and protected resources

Use this when a security analysis must cover the real framework surface rather than only documented SDK calls.

1. Enumerate classes implementing Binder interfaces. AIDL-generated Stub subclasses and custom Binder implementations are entry classes; define an entry point (EP) as a public method exposed through a Binder interface (Section 4.1, pp. 1105–1106).
2. Exclude protected infrastructure such as Zygote, the service manager, and property service, because third-party apps cannot invoke them with tangible side effects (Section 4.1, pp. 1105–1106).
3. Mark an EP as a permission-protected entry point (PPEP) when a permission check is control-flow reachable from it (Section 4.1, pp. 1105–1106).
4. Manually inspect representative PPEP flows and classify operations that have a tangible system side effect or use privacy. The taxonomy includes field updates, native method invocations, broadcast senders, non-void return values, and runtime exceptions (Section 4.3, pp. 1107–1108).
5. Use the taxonomy as analysis targets. Field updates dominate; native calls are conservatively treated as protected because native code is out of scope; broadcasts depend on receiver configuration; return values can expose sensitive data; and a runtime exception can itself cause a security-sensitive state change such as reboot (Section 4.3, p. 1108).

The authors define protected resources as “security sensitive operations that have a tangible side effect on the system state or use of privacy.” (Section 4.3, p. 1107.) The taxonomy is intentionally high-level: the authors manually investigated 35 entry points and say comprehensive manual coverage would defeat the goal of enabling static analysis (Section 4.3, p. 1108).

Inference: In Verus, each PPEP can become a Rust function with an explicit authorization precondition and a postcondition describing permitted state changes. A protected field update can be represented by a mutable state object and an `ensures` clause; native calls and broadcasts should be wrapped in trusted specifications that state their security-relevant effects. This is an inference because the paper analyzes Java bytecode and does not write Verus contracts. A proof should distinguish caller identity before and after identity-clearing operations; otherwise it may authorize a privileged system UID by mistake.

## technique 2: high-precision call graphs and asynchronous IPC resolution

Use this when framework behavior is hidden behind Binder, Handler, AsyncChannel, Runnable, or StateMachine patterns.

1. For each entry class, generate an interprocedural call graph with object-sensitive points-to resolution. Resolve the runtime target type for virtual and interface calls instead of connecting every subclass (Section 5, p. 1108).
2. Forward-slice from each EP. Stop at native methods, RPC calls to other entry classes, and method return (Section 5, p. 1108).
3. At `sendMessage`, infer the concrete Handler type and add an edge to its `handleMessage`. Use an interprocedural backward slice from the send operation to recover Handler objects stored behind base-class fields (Section 5, p. 1108).
4. Recover message codes by slicing backward through `Message.obtain` or `Handler.obtainMessage`, then continue only along switch branches matching those codes. This recreates path sensitivity and avoids infeasible paths (Section 5, p. 1109).
5. Resolve posted Runnable types similarly and add edges to `run`. For StateMachine, infer subtype, state hierarchy, transitions, and current possible states, then follow each state's `processMessage` switch (Section 4.2 and Section 5, pp. 1106 and 1109).
6. Model AsyncChannel by resolving sender and receiver Handlers and the message codes passed through its delegated send methods (Section 4.2, p. 1107).

The simplified Bluetooth example demonstrates the concrete shape: `enable()` obtains `MESSAGE_ENABLE` and sends it; the associated Looper later dispatches that code to `handleMessage` (Listing 1 and Section 4.2, pp. 1105–1106). The paper reports, “To avoid infeasible paths, we have to recreate path-sensitivity intra-procedurally and map the message code(s) to the individual execution path(s).” (Section 5, p. 1109.)

Inference: A Verus model can represent a message queue as a sequence with a state-transition function and prove that dispatching a message code selects only the corresponding handler branch. `invariant` blocks can maintain queue/state consistency inside loops, while `requires` can constrain message-code domains. IPC and thread scheduling remain trusted abstractions unless the runtime is modeled completely; the paper's static resolution is an approximation and does not prove concurrent executions safe.

## technique 3: reuse interconnection knowledge to scale analyses

Use this when repeated analyses of a large framework would otherwise repeat expensive IPC resolution.

1. Record an RPC map per entry class and resolved sender-to-handler relationships during an initial run (Section 6.1, p. 1110).
2. Use the map as expert knowledge on subsequent runs, and stitch results at RPC boundaries (Section 6.1, p. 1110).
3. Divide the analysis by dependent services: precompute execution-path conditions and analyze only subsets reachable from each service (Section 6.1, p. 1110).

On API level 17, reusing the recorded data reduced processing time by about 75% to about 7 hours (Section 6.1, p. 1110). This is a measured runtime for one framework version and machine, not a soundness theorem. Inference: VL can cache verified summaries for service boundaries, but summaries need explicit assumptions about caller identity, mutable global state, and message queues; otherwise cache reuse can silently invalidate authorization proofs.

## technique 4: permission-map construction and locality analysis

Use this when checking that permission documentation and enforcement correspond to actual framework behavior.

1. Extend PPEP slicing to resolve concrete permission strings at common permission-check calls. Resolve nonconstant strings with the same backward-slicing method used for message codes (Section 7, pp. 1110–1111).
2. Ignore outgoing IPC between `Binder.clearCallingIdentity` and `Binder.restoreCallingIdentity`, because those calls execute under the privileged system-server UID rather than the app's UID (Section 7, p. 1111).
3. Analyze public SDK methods and compute reachability to framework EPs; combine the SDK-to-EP map with EP-to-permission results to produce a documented API permission map (Section 7, p. 1111).
4. For permission locality, map each checked permission to the enclosing class and count how many distinct classes enforce it (Section 7.2, p. 1113).

For API 16, Axplorer resolved 99% of 520 distinct permission-check strings (Section 7, pp. 1110–1111). It found 22 of 110 analyzed permissions (20%) checked in more than one class: 13 in two classes, 5 in three, and 4 in four (Section 7.2, p. 1113). The authors state, “A low permission locality indicates that a certain permission is enforced at different (possibly unrelated) services.” (Section 7.2, p. 1113.)

The comparison with PScout is not apples-to-apples: Axplorer reports 1,012 mappings covering 129 permissions for API 16, whereas PScout reports 32,304 mappings for normal and dangerous permissions; the papers use different entry-point definitions and exclude Intent/ContentProvider permissions from this comparison (Section 7.1.2, p. 1112). The study therefore should not treat the counts as a contradiction without those denominator and scope differences.

Inference: In Verus, permission locality suggests a single verified owner function per permission, with callers proved to route through it. The paper itself proposes one owner service per permission in Section 7.2 (p. 1113); the Verus adaptation here is an inference. A contract can require a caller token and ensure that the protected resource changes only when the token authorizes the operation. Identity-clearing regions should be modeled as an explicit change of subject. This is an inference; the paper's output is a static map, not a proof of authorization correctness.

## evidence, trusted parts, and failures

Axplorer analyzed Android 4.1.1, 4.2.2, 4.4.4, and 5.1. Table 1 reports 27,749–46,192 classes, 242–383 entry classes, 2,583–3,225 EP methods, and 863–1,250 PPEP methods; 38.0%–52.2% of PPEP included message sending (Table 1, p. 1110). Message analysis fully resolved about 76% of message-sending instances. Of unresolved cases, 81% failed Handler inference, 5% failed Runnable inference, and 13% failed message-code inference; incomplete AsyncChannel and `sendToTarget()` support were identified causes (Section 6.1, p. 1110). These percentages are shares of unresolved cases, not all PPEP, and should not be compared with the Table 1 percentages.

Initial processing took 14–126 hours on four Intel Xeon E5-4650L processors with 768 GB RAM; high-precision call-graph generation consumed about 85% of runtime (Section 6.1, p. 1109). Protected-resource distributions were stable: field updates about 75%, native calls about 21–23%, return values 51–69 entries, broadcasts about 0.7–1.0%, and runtime exceptions about 0.7–1.0% (Table 2, Appendix B, p. 1118). The taxonomy rests on manual inspection and conservative assumptions, and native code, reflection, dynamic receiver configuration, and unsupported IPC patterns remain incomplete.

No formal theorem or mechanically checked proof is supplied. Inference: trusted components include WALA's points-to analysis, Android framework source, class hierarchy resolution, hand-selected ground truth, permission-string resolution, and the assumption that every reachable permission check protects a security-sensitive resource. Inference: The threat to a product of agent-written verified Rust is substantial at the authorization boundary: missing asynchronous edges or identity changes can invalidate a proof's model even when individual functions verify. VL should use this paper's discovery workflow before writing contracts, then verify concrete Rust transitions and treat unresolved runtime behavior as explicit trust.

## what VL should not redo

The paper already supplies the entry-point definition, protected-resource taxonomy, asynchronous IPC handling, permission-map construction, and locality metric. Inference: VL should not claim these analyses as new. It should adapt them to the product's actual runtime, close the unsupported cases, and prove the resulting authorization contracts.

## techniques for the catalog

- framework entry-point discovery — find Binder-exposed public methods and mark permission-reachable methods as PPEP
- asynchronous IPC resolution — recover Handler, Runnable, AsyncChannel, and StateMachine targets and message-code paths with interprocedural slicing
- protected-resource taxonomy — classify field updates, native calls, broadcasts, sensitive returns, and security-relevant exceptions
- permission-map and locality analysis — compose SDK-to-entry reachability with permission checks and count enforcing classes per permission

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "The most time-consuming task (about 85% of the overall time) was generation of the high-precision call-graphs."): checked the whole paper including appendices against study quotations, metadata, numbers, references and technique steps; corrected the opening quotation, section/page/table references, message-sending percentage range and inference labels; used the publisher page printed in the paper; did not reproduce the analysis or inspect Axplorer code.
