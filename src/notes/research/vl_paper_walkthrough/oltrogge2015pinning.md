# To Pin or Not to Pin—Helping App Developers Bullet Proof Their TLS Connections
(authored by agents unless marked 🧑)
Tag: `oltrogge2015pinning`, [paper](https://www.usenix.org/conference/usenixsecurity15/technical-sessions/presentation/oltrogge)

## scope and findings

This paper studies whether TLS certificate pinning is practical for non-browser Android software. It analyzes 639,283 Google Play applications, classifies individual TLS connections, measures update delays, surveys developers, and builds a decision-and-code-support web tool. The abstract reports the conservative recommendation: “pinning as an appropriate strategy for 11,547 (1.8%) apps or for 45,247 TLS connections (4.25%) in our sample set.” (Abstract, p. 239.) The optimistic estimate includes assumptions for dynamic origins and reaches 140,020 connections in the abstract but 140,858 total connections in Section 6.2.2 and the conclusion. Section 6.2.2 breaks the total into 140,020 leaf-pinning and 838 CA-pinning candidates (pp. 249–250), which explains the smaller number as a subtype there, but not its use as the abstract’s overall total. The conclusion gives 140,858 connections and 58,817 apps (p. 253), whereas the abstract says 140,020 connections (p. 239).

The security mechanism is leaf pinning (a specific certificate/public key) or CA pinning (a restricted CA set). The decision depends on prior knowledge of the origin, ownership of API calls, and control of the origin’s certificate configuration. The paper’s key operational result is that only 45 apps in the sample actually implemented pinning (Section 3.2, p. 242), while around half of users updated within one week (Section 6.3, pp. 250–251).

## technique 1: classify when pinning is safe to recommend

what it is

The authors formalize a decision procedure with four high-level indicators: prior knowledge of the target origin, ownership of relevant API calls, responsibility for TLS certificate configuration, and origin exclusivity. They start from default certificate validation and recommend pinning only when the developer controls both code and origin. The paper states: “The decision whether or not a TLS connection should be secured by pinning depends on multiple factors and is not trivial in many cases.” (Section 4, p. 242.)

when to use it

Use this classification before adding a pin. Pinning makes certificate changes fail until clients update, so it is appropriate only when an owner can coordinate server and app changes. It is unsuitable for third-party libraries, public origins, user-entered destinations, and unannounced certificate changes.

how to do it

1. Set the strategy to default (Algorithm 1, p. 245).
2. Reject pinning when a dependency is an exposed intent or UI component; reject it conservatively for unexposed intents, variables, or configuration values whose origin cannot be known (Algorithm 1, p. 245).
3. Reject library calls and public hosts because API or origin ownership is absent (Section 4.2, pp. 243–244).
4. If the host is under developer control, inspect its certificate. Recommend CA pinning for an untrusted CA; recommend leaf pinning for a valid chain or self-signed certificate (Algorithm 1, p. 245).
5. Keep default validation in all other cases (Section 4.1, p. 243).

Verus form

Inference: encode the decision as a pure `spec fn strategy(...) -> Strategy` over an enum and prove lemmas that `Leaf` implies a known, owned origin and certificate update authority. Use `requires` on a pinning constructor to require those facts; use `ensures` to state that generated validation accepts only the specified key/certificate. Verus can prove the branch logic, but ownership and certificate rotation are environmental facts that must be supplied as trusted inputs or checked by a separate deployment process.

evidence

The algorithm is evaluated on the 639,283-app corpus. Of 20,020,535 network API calls, 1,062,810 were identified as HTTPS by hard-coded scheme and 16,537,621 had non-hard-coded origins; 81% could not be directly classified from a hard-coded origin (Table 2 and Section 6, pp. 246–247). In custom code, 145,243 TLS connections were identified, covering 11,203 origins; 99,996 shared-origin connections were rejected and 45,247 unique-origin connections were candidates (Section 6.2.1, pp. 248–249).

limits and assumptions

The conservative rule treats unknown origins as unpinnable, which can undercount eligible connections. The optimistic rule assumes 16% of dynamic-origin connections are HTTPS and that 31.1% of those are pinnable, extrapolating from hard-coded custom code (Section 6.2.2, p. 249). These are estimates, not direct observations. Static analysis cannot reliably handle native code, dynamic loading, or obfuscation (Section 5.5, pp. 246–247).

## technique 2: implement the classification with disassembly and slicing

what it is

The authors extend MalloDroid with a four-step static-analysis pipeline. The paper lists the method: “1. Disassemble a given Android application to gain access to the application’s code and call graph ... 2. Identify relevant API calls ... 3. Extract information for remote origins applying program slicing ... 4. Determine whether API and/or origin ownership for relevant API calls is given and decide which certificate validation strategy suits best.” (Section 5, p. 245.)

when to use it

Use this pipeline to audit large APK sets when source code is unavailable. It is intended for triage and recommendation, not proof that every dynamic execution follows the extracted paths.

how to do it

1. Disassemble each APK with androguard and construct call graphs (Section 5.1, p. 245).
2. Find relevant low-level API calls whose arguments establish TLS connections, including packages listed in Table 1 (Section 5.2, p. 245).
3. Backward-slice URL/hostname parameters; join multiple substrings and stop after 80 iterations to guarantee termination (Section 5.3, p. 245).
4. Reconstruct strings using backward constant tracking and forward analysis of StringBuilder, concatenation, formatting, URI builders, resources, preferences, intents, bundles, and UI components (Section 5.3.1, pp. 245–246).
5. Determine whether calls are in shared libraries, whether origins are public or dynamic, and whether the certificate chain is valid; apply Algorithm 1 (Sections 4.2–4.3, pp. 243–245).

The StringBuilder algorithm identifies each object, backtracks constructor/append arguments, stops at `toString`, and joins collected substrings (Algorithm 2, p. 246).

Verus form

Inference: model the analyzer’s abstract values and slice graph as immutable `Seq`/map structures and prove termination with a decreasing iteration counter. Use `proof fn` lemmas for string concatenation and call-graph reachability. The APK parser, bytecode semantics, and native-code boundary would remain trusted unless separately verified.

evidence

The analysis found 42,902 apps with custom TrustManagers; filtering bypassing TrustManagers and unreachable implementations removed 42,042, leaving 858 apps and 189 implementations. Manual review found 13 pinning implementations used by 24 apps. Keystore analysis found 21 apps, 13 leaf-pinning and 8 custom-root apps; total observed pinning was 45 apps among 639,283 (Section 3.2, p. 242).

limits and assumptions

The authors report both false positives (reachable but unused code) and false negatives (shared hosts controlled by one company can be misclassified as public). They do not analyze native code, obfuscated code, or dynamically loaded code (Section 5.5, pp. 246–247).

## technique 3: choose leaf versus CA pinning from certificate evidence

what it is

For candidate hard-coded origins, the tool fetches each origin’s X.509 chain and applies Android’s trust validation. It recommends leaf pinning for valid or self-signed certificates and CA pinning for certificates issued by an untrusted/custom CA. This turns certificate evidence into a concrete implementation choice.

when to use it

Use leaf pins when the exact server identity should be fixed; use CA pins when a controlled custom CA issues rotating leaf certificates. Do not infer ownership from a certificate alone; the algorithm separately requires host ownership.

how to do it

1. Group TLS connections by remote origin and collect the origin certificate chain where possible (Section 6.2.1, pp. 248–249).
2. Validate the chain with Android’s preinstalled roots and hostname checks (p. 249).
3. Count self-signed, unknown-CA, expired, and hostname-mismatch failures (Table 6, p. 249).
4. Mark valid-chain and self-signed connections for leaf pinning; mark custom-CA connections for CA pinning (Table 7, p. 249).

Verus form

Inference: represent a certificate chain and validation result as a spec datatype; prove that a pin-checking function accepts only a matching leaf key or an allowed CA chain. Keep cryptographic signature verification and certificate parsing behind verified library contracts or explicit trusted assumptions. Verus can prove the policy but cannot by itself establish that an external X.509 implementation or root store is current.

evidence

The candidate-origin analysis collected 7,941 unique chains: 7,177 validated and 764 failed. Failures included 182 self-signed, 170 unknown-CA, 335 expired, and 160 hostname-mismatch chains; Inference: these reported category counts cannot be disjoint because they sum to more than 764 (Table 6, p. 249). The conservative recommendation covers 45,247 connections in 11,547 apps; Table 7 reports 44,978 leaf-pinning connections in 11,247 apps and 269 CA-pinning connections in 81 apps (p. 249). The 45,247 total equals 44,978 + 269. The final paragraph of Section 6.2.1 instead says “We recommend leaf pinning for the connections that use a self-signed certiﬁcate and CA pinning for all other connections” (p. 249), contradicting Algorithm 1 and the table; the study retains the algorithm’s rule rather than treating that paragraph as consistent.

limits and assumptions

Certificate status can change after analysis. Pinning can cause outages when an owner rotates certificates without shipping an update. The study does not prove that any candidate’s deployment process will maintain pins.

## technique 4: account for update latency and out-of-band pin delivery

what it is

The paper measures how quickly Android users receive app updates and uses this as a safety criterion. In telemetry from 871,911 consenting users and 784,721 apps, 40% updated on release day, about 50% within one week, 70% within 30 days, and complete update coverage took an average of 200 days (Section 6.3, pp. 250–251). The paper concludes that hard-coded pins are unsuitable for security-critical components and recommends configuration files that the app can update securely out of band (Section 6.4, pp. 251–252).

when to use it

Use this deployment analysis whenever certificate rotation can invalidate old clients. A pin policy must include a recovery channel before the old pin expires.

how to do it

1. Collect version-install timestamps from a consented telemetry population (Section 6.3, pp. 250–251).
2. Exclude Google and device-vendor apps whose update channels differ (pp. 250–251).
3. Compute release-day, one-week, 30-day, and full-coverage delays (p. 251).
4. Prefer securely fetched app-private pin configuration or multiple origin names for staged pin versions; explain the additional server effort (Section 6.4, pp. 251–252).

Verus form

Inference: specify pin rotation as a state machine with current and next pins, an overlap period, and an authenticated configuration update. Use Verus state-machine transitions and `ensures` to prove that a client never accepts an unapproved key and that rotation preserves availability while both pins overlap. Network authentication, secure storage, and server rollout remain assumptions.

evidence

The denominator for update statistics is 871,911 users; the telemetry period is January–December 2014 (p. 250). The paper’s claim that “half of all users of an app would be unable to use the app during the first week after a pin update” follows from the approximately 50% first-week update figure and its assumption that TLS is critical (footnote 6, p. 251). This is a model-based implication, not a directly measured outage.

limits and assumptions

The antivirus telemetry population may update faster than the global population (Section 8, p. 253). Dynamic configuration adds a new trusted update path that itself needs authentication and availability proofs.

## technique 5: generate implementation scaffolding and developer guidance

what it is

The web application accepts an APK, presents extracted API calls and origins, asks the developer to confirm ownership, then emits Android pinning code. The paper’s generation steps are: “1. The remote origin’s certificate is fetched and the corresponding pin is computed. 2. A PinningTrustManager that uses the pin for certificate validation is generated. 3. Surrounding code that includes the PinningTrustManager into the relevant API calls is generated.” (Section 7.2, pp. 252–253.)

when to use it

Use this workflow to reduce API misuse after a candidate has passed the ownership and update checks. It is a support tool, not a substitute for reviewing the generated trust policy.

how to do it

1. Upload an APK and extract relevant calls/origins (Section 7.2, pp. 252–253).
2. Have the developer confirm API ownership and control of each origin (p. 252).
3. Fetch the certificate and compute the pin (p. 253).
4. Generate a `PinningTrustManager`; for `HTTPSUrlConnection`, generate an `SSLContext` initialized with it (p. 253).
5. Include the scaffold and communicate update downsides (p. 253).

Verus form

Inference: generate a Rust/Verus wrapper whose contract names the allowed key set and whose verification function returns an error for all other chains. Generation must preserve the exact contract and avoid `external_body` on the function being verified. A human or CI review must check that the extracted origin and deployment assumptions are correct.

evidence

Seven developers tested the web application and gave positive usability feedback (Section 7.2, pp. 252–253). The survey contacted about 3,200 addresses, emailed 500, received 49 responses (the extracted “498” includes footnote marker 8), and retained 45 understandable responses for qualitative analysis (Sections 7.1–7.2, pp. 251–253). Only 15 of the 45 said they knew what pinning was; the paper rates 80% of those explanations as sensible, while its key result says only a quarter had a basic understanding (p. 252). The different denominators and wording explain the apparent tension.

limits and assumptions

The developer sample is opt-in and drawn from candidate apps, so it is not prevalence evidence. The web service’s dynamic pin configuration creates a security dependency that the paper recommends but does not formally verify.

## what is proved, measured, and trusted

proved: the paper proves no formal program-correctness theorem. It defines and evaluates a static classification procedure, certificate policy, update analysis, and code-generation workflow

measured: app and connection counts, certificate-chain categories, update delays, survey responses, and seven usability tests, with denominators stated above

trusted: Android API behavior, androguard/MalloDroid analyses, certificate-chain checks, telemetry representativeness, the correctness of generated code, and developer ownership answers

Inference: a pin-policy proof alone leaves origin ownership, certificate rotation, parser completeness, and update channels outside its model. This Android study does not establish a competitive threat level for agent-written verified Rust. The paper’s classification criteria are reusable as preconditions for a Verus proof, but they do not prove that an APK’s actual runtime network behavior matches the static slice.

## techniques for the catalog

- ownership-aware pinning classification — require known origins, owned API calls, and controlled certificate configuration before recommending pins
- APK disassembly and slicing — recover TLS calls and origin strings with call graphs, backward slices, and bounded reconstruction
- certificate-based pin choice — select leaf or CA pinning from chain validation and ownership evidence
- update-latency analysis — measure user rollout delay and design overlap or out-of-band pin rotation
- pinning code generation — turn validated candidates into trust-manager scaffolds after developer confirmation

Checked 2026-10-16 against the full paper by a Codex agent (mid-paper quote: "We decided to reverse engineer a large sample of free Android apps and analyze the resulting code."): checked the full extracted paper, all quotations, counts, algorithms, limitations, printed page references, and author/year tag; corrected the publisher link, page references, survey response count (49 plus footnote 8), update-frequency wording and unsupported threat assessment; clarified the paper’s conflicting pinning totals and CA-versus-leaf prose; did not inspect the released analysis code, rerun the Android corpus analysis, or validate the generated pinning code.
