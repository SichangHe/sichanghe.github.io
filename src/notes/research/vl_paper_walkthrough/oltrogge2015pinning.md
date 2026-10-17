# To Pin or Not to Pin—Helping App Developers Bullet Proof Their TLS Connections
(authored by agents unless marked 🧑)
Tag: `oltrogge2015pinning`, [paper](https://www.usenix.org/conference/usenixsecurity15/technical-sessions/presentation/oltrogge)

## scope and findings

This paper studies whether TLS certificate pinning is practical for non-browser Android software. It analyzes 639,283 Google Play applications, classifies individual TLS connections, measures update delays, surveys developers, and builds a decision-and-code-support web tool. The abstract reports the conservative recommendation: “pinning as an appropriate strategy for 11,547 (1.8%) apps or for 45,247 TLS connections (4.25%) in our sample set.” (Abstract, p. 239.) The optimistic estimate includes assumptions for dynamic origins and reaches 140,020 connections in the abstract but 140,858 total connections in Section 6.2.2 and the conclusion. Section 6.2.2 breaks the total into 140,020 leaf-pinning and 838 CA-pinning candidates (pp. 249–250), which explains the smaller number as a subtype there, but not its use as the abstract’s overall total. The conclusion also gives 58,817 candidate apps (p. 253). The introduction instead reports 223,655 TLS-enabled apps and 11,481 candidates (p. 240); the conclusion reports 229,317 TLS-enabled apps and 11,547 candidates, but later repeats 11,481 (p. 253). Inference: these totals differ; this study uses the main evaluation’s 11,547-app recommendation without treating the alternatives as reconciled.

The security mechanism is leaf pinning (a specific certificate/public key) or CA pinning (a restricted CA set). The decision depends on prior knowledge of the origin, ownership of API calls, and control of the origin’s certificate configuration. The paper’s key operational result is that only 45 apps in the sample actually implemented pinning (Section 3.2, p. 242), while around half of users updated within one week (Section 6.3, pp. 250–251).

## technique 1: classify when to recommend pinning

what it is

Section 4 names three high-level indicators: prior knowledge of the target origin, ownership of relevant API calls, and responsibility for TLS certificate configuration (p. 243). Section 4.3.4 uses origin exclusivity as a proxy for control of certificate configuration (p. 245). The authors start from default certificate validation and recommend pinning only when the developer controls both code and origin. The paper states: “The decision whether or not a TLS connection should be secured by pinning depends on multiple factors and is not trivial in many cases.” (Section 4, p. 242.)

when to use it

The authors use this classification to decide whether to recommend pinning. A server certificate change outside the configured pins can cause TLS handshakes to fail. Their criteria therefore require coordinated control of code and certificate configuration, and exclude third-party library calls, public origins, and user-entered destinations (Sections 4–4.2, pp. 242–244).

how to do it

1. Set the strategy to default (Algorithm 1, p. 245).
2. Reject pinning when a dependency is an exposed intent or UI component; reject it conservatively for unexposed intents, variables, or configuration values whose origin cannot be known (Algorithm 1, p. 245).
3. Reject library calls and public hosts because API or origin ownership is absent (Section 4.2, p. 244).
4. If the host is under developer control, inspect its certificate. Recommend CA pinning for an untrusted CA; recommend leaf pinning for a valid chain or self-signed certificate (Algorithm 1, p. 245).
5. Keep default validation in all other cases (Section 4.1, p. 243).

Verus form

Inference: encode the decision as a pure `spec fn strategy(...) -> Strategy` over an enum and prove lemmas that `Leaf` implies a known, owned origin and certificate update authority. Use `requires` on a pinning constructor to require those facts; use `ensures` to state that generated validation accepts only the specified key/certificate. Verus can prove the branch logic, but ownership and certificate rotation are environmental facts that must be supplied as trusted inputs or checked by a separate deployment process.

evidence

The algorithm is evaluated on the 639,283-app corpus. Of 20,020,535 network API calls, 1,062,810 were identified as HTTPS by hard-coded scheme and 16,537,621 had non-hard-coded origins; the authors describe the fraction for which TLS use could not be directly determined as 81% (Table 2 and Section 6, p. 247). Inference: the listed non-hard-coded count divided by the total is about 82.6%, so the reported 81% does not match those counts. In custom code, 145,243 TLS connections were identified, covering 11,203 origins; 99,996 shared-origin connections were rejected and 45,247 unique-origin connections were candidates (Section 6.2.1, pp. 248–249).

limits and assumptions

The conservative rule treats unknown origins as unpinnable, which can undercount eligible connections. The optimistic rule assumes 16% of dynamic-origin connections are HTTPS and that 31.1% of those are pinnable, extrapolating from hard-coded custom code (Section 6.2.2, p. 249). These are estimates, not direct observations. Static analysis cannot reliably handle native code, dynamic loading, or obfuscation (Section 5.5, p. 247).

## technique 2: implement the classification with disassembly and slicing

what it is

The authors extend MalloDroid with a four-step static-analysis pipeline: disassemble an app, identify relevant API calls, slice remote-origin parameters, and assess ownership to select a validation strategy (Section 5, p. 245). They state: “In Step 1, we use androguard [4] to disassemble apps and construct call graphs for further processing.” (Section 5.1, p. 245.)

when to use it

The paper applies this pipeline to reverse-engineered free Android apps because obtaining source code at scale is impractical (Section 5.5, p. 247). Inference: its static recommendations do not prove that every runtime execution follows the extracted paths.

how to do it

1. Disassemble each APK with androguard and construct call graphs (Section 5.1, p. 245).
2. Find relevant low-level API calls whose arguments establish TLS connections, including packages listed in Table 1 (Section 5.2, p. 245).
3. Backward-slice URL/hostname parameters; join multiple substrings and stop after 80 iterations to guarantee termination (Section 5.3, pp. 245–246).
4. Reconstruct strings using backward constant tracking and forward analysis of StringBuilder, concatenation, formatting, URI builders, resources, preferences, intents, bundles, and UI components (Section 5.3.1, p. 246).
5. Determine whether calls are in shared libraries, whether origins are public or dynamic, and whether the certificate chain is valid; apply Algorithm 1 (Sections 4.2–4.3, pp. 244–245).

The StringBuilder algorithm identifies each object, backtracks constructor/append arguments, stops at `toString`, and joins collected substrings (Algorithm 2, p. 246).

Verus form

Inference: model the analyzer’s abstract values and slice graph as immutable `Seq`/map structures and prove termination with a decreasing iteration counter. Use `proof fn` lemmas for string concatenation and call-graph reachability. The APK parser, bytecode semantics, and native-code boundary would remain trusted unless separately verified.

evidence

The status-quo analysis reports 42,902 apps with custom TrustManagers, removes 42,042 apps with bypassing or unreachable implementations, and reports 858 remaining apps with 189 implementations. Inference: the subtraction gives 860, so these reported counts are inconsistent. Of the 189 implementations, 124 only added logging; manual review of the other 65 found 13 pinning implementations used by 24 apps. Keystore analysis found 21 apps, 13 leaf-pinning and 8 custom-root apps; total observed pinning was 45 apps among 639,283 (Section 3.2, p. 242).

limits and assumptions

The authors report both false positives (reachable but unused code) and false negatives (shared hosts controlled by one company can be misclassified as public). They do not analyze native code, obfuscated code, or dynamically loaded code (Section 5.5, p. 247).

## technique 3: choose leaf versus CA pinning from certificate evidence

what it is

For candidate hard-coded origins, the tool fetches each origin’s X.509 chain and applies Android’s trust validation. Algorithm 1 recommends leaf pinning for valid or self-signed certificates and CA pinning for certificates issued by an untrusted/custom CA (p. 245). The prose and tables in Section 6.2.1 contain inconsistencies, detailed below.

when to use it

Leaf pinning restricts trust to specific leaf certificates or their public keys; CA pinning allows more flexible certificate reconfiguration (Section 2.3.1, p. 241). The classification separately requires host control before selecting either strategy (Algorithm 1, p. 245).

how to do it

1. Group TLS connections by remote origin and collect the origin certificate chain where possible (Section 6.2.1, pp. 248–249).
2. Validate the chain with Android’s preinstalled roots and hostname checks (p. 249).
3. Count self-signed, unknown-CA, expired, and hostname-mismatch failures (Table 6, p. 249).
4. Apply Algorithm 1: mark valid-chain and self-signed connections for leaf pinning, and untrusted-CA connections for CA pinning (p. 245). Table 7 reports the resulting strategy totals (p. 249).

Verus form

Inference: represent a certificate chain and validation result as a spec datatype; prove that a pin-checking function accepts only a matching leaf key or an allowed CA chain. Keep cryptographic signature verification and certificate parsing behind verified library contracts or explicit trusted assumptions. Verus can prove the policy but cannot by itself establish that an external X.509 implementation or root store is current.

evidence

The candidate-origin analysis collected 7,941 unique chains: 7,177 validated and 764 failed. Failures included 182 self-signed, 170 unknown-CA, 335 expired, and 160 hostname-mismatch chains; Inference: these reported category counts cannot be disjoint if all counts are correct, because they sum to 847, more than 764 (Section 6.2.1, p. 249). The conservative recommendation covers 45,247 connections in 11,547 apps; Table 7 reports 44,978 leaf-pinning connections in 11,247 apps and 269 CA-pinning connections in 81 apps (p. 249). The 45,247 connection total equals 44,978 + 269. Inference: the two Table 7 app counts sum to 11,328, so they cannot account for the 11,547-app total in Table 6, even before considering possible overlap. The final paragraph of Section 6.2.1 instead says “We recommend leaf pinning for the connections that use a self-signed certiﬁcate and CA pinning for all other connections” (p. 249). Inference: that wording conflicts with Algorithm 1 and Table 7, whose 269 CA-pinning connections match the custom-CA count in Table 6. This study describes Algorithm 1’s rule and preserves the conflicting prose as a discrepancy.

limits and assumptions

Inference: certificate status can change after analysis, and a server change outside the configured pins can cause outages. Candidate classification does not establish that the deployment process will maintain pins.

## technique 4: account for update latency and out-of-band pin delivery

what it is

The paper measures how quickly Android users receive app updates to assess whether app releases can distribute new pins promptly. In telemetry from 871,911 consenting users and 784,721 apps, on average 40% updated on release day, about 50% within one week, 70% within 30 days, and complete update coverage took an average of 200 days (Section 6.3, pp. 250–251). The paper states that app updates are unsuitable for security-critical components (Section 6.3, p. 251). It recommends distributing pins through configuration files updated over a secure remote connection rather than embedding pins in app binaries (Section 6.4, p. 251).

when to use it

Inference: use this deployment analysis when certificate rotation can invalidate old clients, and plan how clients will obtain replacement pins before that happens.

how to do it

1. Collect version-install timestamps from a consented telemetry population (Section 6.3, pp. 250–251).
2. Exclude Google and device-vendor apps whose update channels differ (pp. 250–251).
3. Compute release-day, one-week, 30-day, and full-coverage delays (p. 251).
4. Consider configuration files fetched over a secure remote connection or multiple origin names for different pin versions; both require extra developer effort (Section 6.4, p. 251). The conclusion additionally recommends that pin configuration files be accessible only to the app (p. 254).

Verus form

Inference: specify pin rotation as a state machine with current and next pins, an overlap period, and an authenticated configuration update. Use Verus state-machine transitions and `ensures` to specify acceptance of approved keys during an overlap period. Availability would additionally depend on server behavior and delivery of the replacement pins. Network authentication, secure storage, and server rollout remain assumptions.

evidence

The telemetry population includes 871,911 users observed during January–December 2014; the reported update percentages concern third-party apps after excluding Google and device-vendor apps (Section 6.3, pp. 250–251). The paper states: “In case of pinning, half of all users of an app would be unable to use the app during the ﬁrst week after the update is released, since the pinning-secured TLS handshakes would fail” (Section 6.3, p. 251; footnote marker omitted). Footnote 6 assumes TLS connections are critical and the app cannot work properly without Internet access. Inference: this is an implication of the update measurements and assumptions, not a measured outage.

limits and assumptions

The authors suggest that antivirus users may update faster than the global population, but do not measure that comparison (Section 8, p. 253). Inference: dynamic configuration requires a trusted update path whose authentication and availability would need separate justification.

## technique 5: generate implementation scaffolding and developer guidance

what it is

The web application accepts an APK, presents extracted API calls and origins, asks the developer to confirm ownership, then emits Android pinning code. The first two generation steps are: “The remote origin’s certiﬁcate is fetched and the corresponding pin is computed.” and “A PinningTrustManager that uses the pin for certiﬁcate validation is generated.” The third generates surrounding code to integrate that trust manager into the relevant API calls (Section 7.2, p. 253).

when to use it

The tool supports developers in choosing and implementing certificate validation, asks them to confirm ownership, and warns about updating pins (Section 7.2, pp. 252–253). Inference: its recommendations do not replace review of the generated trust policy.

how to do it

1. Upload an APK and extract relevant calls/origins (Section 7.2, pp. 252–253).
2. Have the developer confirm API ownership and control of each origin (p. 252).
3. Fetch the certificate and compute the pin (p. 253).
4. Generate a `PinningTrustManager`; for `HTTPSUrlConnection`, generate an `SSLContext` initialized with it (p. 253).
5. Include the scaffold and communicate update downsides (p. 253).

Verus form

Inference: generate a Rust/Verus wrapper whose contract names the allowed key set and whose verification function returns an error for all other chains. Verifying that wrapper would require checking its implementation against the contract and separately justifying the extracted origin and deployment assumptions.

evidence

Seven developers tested the web application and gave positive usability feedback (Section 7.2, pp. 252–253). The researchers extracted roughly 3,200 developer email addresses, emailed a random sample of 500 developers, received 49 responses (the extracted “498” includes footnote marker 8), and removed four responses judged nonsensical or showing lack of English comprehension, leaving 45 for qualitative analysis (Sections 7.1–7.2, pp. 251–253). Only 15 of the 45 said they knew what pinning was; the paper rates 80% of those explanations as sensible, while its key result says only a quarter had a basic understanding (p. 252). Inference: 80% of 15 is 12, or 26.7% of 45, which is consistent with the approximate phrase “a quarter”.

limits and assumptions

The authors acknowledge self-reporting and opt-in bias in the developer feedback (Section 8, p. 253). Inference: this candidate-app sample cannot establish awareness across all Android developers. Section 6.4 recommends remote pin updates, but Section 7.2 does not establish that the web tool implements or verifies that update mechanism.

## what is proved, measured, and trusted

proved: the paper proves no formal program-correctness theorem. It defines and evaluates a static classification procedure, certificate policy, update analysis, and code-generation workflow

measured: app and connection counts, certificate-chain categories, update delays, survey responses, and seven usability tests, with denominators stated above

Inference: trusting the recommendations requires trusting Android API behavior, androguard/MalloDroid analyses, certificate-chain checks, generated code, and developer ownership answers; generalizing the measurements also requires assumptions about sample representativeness

Inference: a pin-policy proof alone leaves origin ownership, certificate rotation, parser completeness, and update channels outside its model. This Android study does not establish a competitive threat level for agent-written verified Rust. The paper’s classification criteria are reusable as preconditions for a Verus proof, but they do not prove that an APK’s actual runtime network behavior matches the static slice.

## techniques for the catalog

- ownership-aware pinning classification — require known origins, owned API calls, and controlled certificate configuration before recommending pins
- APK disassembly and slicing — recover TLS calls and origin strings with call graphs, backward slices, and bounded reconstruction
- certificate-based pin choice — select leaf or CA pinning from chain validation and ownership evidence
- update-latency analysis — measure user rollout delay and consider remote pin configuration or separate origins for pin versions
- pinning code generation — turn validated candidates into trust-manager scaffolds after developer confirmation

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "We cannot track potential TLS connections in code that was dynamically loaded or when obfuscation was applied."): checked the entire paper, quotations, counts, technique steps, section and printed-page references, and publisher link; corrected quotations, references, survey recruitment wording, unsupported claims, and numerical discrepancies, and marked extrapolations as Inference; did not reproduce the experiments, test the web service or generated code, or verify the proposed Verus adaptations.
