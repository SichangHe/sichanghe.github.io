# X-rated Compliance Theater: An Empirical Evaluation of European Age Verification Systems in Adult Websites
(authored by agents unless marked 🧑)
Tag: `lavermicocca2026compliance`, [paper](https://www.usenix.org/conference/usenixsecurity26/presentation/lavermicocca)

This paper is an empirical security assessment of age-verification deployments on adult websites, not a formal-verification paper. Page numbers below are USENIX Security 2026 proceedings pages (PDF page = proceedings page − 5451). The authors describe the work as “the first exploratory security assessment of regulation-mandated age-verification mechanisms deployed by adult websites” (Abstract, p. 5453). Inference: its reusable verification lesson is to define explicit security properties and adversaries, test the complete deployed workflow, and treat a nominally successful check as insufficient evidence when accounts, cookies, client-side state, or jurisdiction routing can bypass it.

## technique: threat model and security-property specification

The paper separates adversaries who bypass verification (A1 motivated underage user, A2 privacy-conscious adult user, A3 “Fraudulent Identity Provider”, i.e., a black-market “AVaaS (Age-Verification-as-a-Service) provider”) from adversaries who exploit user data (B1 external criminals, B2 insiders such as providers or websites) (§5, p. 5457). It then defines three properties (§5.1, pp. 5457–5458): P1 robustness against evasion, P2 non-shareability and anti-replay, and P3 unlinkability of identity and intent. P1 “includes preventing false self-attestation, blocking the use of third-party credentials, and eliminating reliance on client-side checks that can be altered or revoked by users.” P2 requires that verification outputs be “intrinsically bound to the individual undergoing authentication” and “entails replay protection, prevention of token cloning, and defenses against the automated creation of large-scale synthetic identities.” P3: “No single party should learn both the user’s sensitive identity data and the specific site or content category they access.”

How to apply it (agent recommendation). (1) List attacker goals and capabilities before testing. (2) State each required property as an observable acceptance or rejection condition. (3) Map every verification mechanism and integration path to the properties. (4) Design tests that exercise both the provider and website workflow. (5) Report which property fails, under which adversary, and with what denominator. The paper warns that “mechanism labels alone are a poor proxy for security and privacy outcomes under real implementations” (§9, p. 5466).

Verus form. Inference: represent each property as a `spec fn` over an abstract verification state and put transition obligations in `requires`/`ensures`. Use proof functions for anti-replay and unlinkability lemmas over token identity, audience, expiry, and disclosure fields. Inference: Verus can prove that a Rust protocol implementation satisfies the stated model, but the model must include server-side authorization, device/account binding, and data-flow separation; it cannot prove that an omitted integration path does not exist in production.

Evidence and limits. The study manually inspected 154 high-traffic adult websites across Italy, Germany, France, and the United Kingdom. It found age verification on 69/154 sites when accessed from the UK, 38/154 from France, 7/154 from Germany, and 4/154 from Italy (Table 3 and §6.2, pp. 5458–5459). The authors state under external validity that their evaluation covers sites “observed during a specific time window” and that “websites frequently change providers, adjust enforcement policies, or deploy new countermeasures”; they also say “We expect the high-level insights to remain valid as systems evolve” (§10, p. 5467).

## technique: ecosystem mapping with country-conditioned observation

What it is. The researchers take the top 100 adult websites by traffic in each country (Semrush, November 2025), merge them into 230 unique sites, exclude marketplaces, dating services, and aggregators, and retain 154 sites with explicit pornographic material. For each country they route traffic through a local VPN exit node; they record AV presence, third-party providers, offered methods, and whether verification can be linked to a user account. Two researchers piloted a shared codebook and performed the annotations, and a third researcher adjudicated unresolved cases (§6.1, p. 5458).

How to apply it (agent recommendation). (1) Define the population and sampling frame. (2) Access each target under the relevant jurisdiction. (3) Record presence, provider, method, and workflow integration. (4) Preserve country-specific observations rather than collapsing them. (5) Use a codebook and independent annotation to reduce subjective drift. (6) Report non-exclusive method counts with their denominator.

Verus form.

Evidence and limits. The paper identifies 15 providers, anonymized as VP1–VP15 (§6.2, p. 5458). Table 4 reports age estimation on 60 UK, 36 France, 6 Germany, and 3 Italy sites, and ID checks on 14, 5, 5, and 2 respectively; “Counts are non-exclusive: a website may offer multiple methods” (Table 4, p. 5459). The paper observes “no use of national eID or eIDAS-style credentials” (§6.2, p. 5459).

## technique: mechanism-level adversarial testing

What it is. “Before adversarial testing, researchers completed the relevant flows legitimately to confirm baseline functionality” (§7, p. 5459). For selfie age estimation they control the camera input through three attack channels—presentation on a second screen, emulator camera injection, and rooted-device camera replacement—and media described as images, 3D models, social-media-style filters, deepfakes, videogame avatars, and prerecorded videos (§7.1, p. 5460). The text says “eight media types”, but it describes six and Table 6 has six media columns. Table 6 reports “whether a bypass was obtained for a provider/media/channel combination within the first three attempts” (§7.1, p. 5460).

How to apply it (agent recommendation). (1) Establish a legitimate baseline and document prompts. (2) Select attack channels that control the camera at different layers. (3) Prepare media representing low- to moderate-effort attacks. (4) Repeat each combination under the same workflow. (5) Record acceptance, rejection, and transient failures. (6) Group results by provider and channel, then calculate success against the tested provider count.

Evidence. Ten of 15 providers support selfie age estimation. Presentation attacks succeed on 5/10, emulator-based attacks on 9/10, and rooted-device attacks on 7/10 (§7.1, p. 5460). Filters reach 9/10, videos and deepfakes 8/10, 3D models 7/10, and videogame avatars and images 4/10 (§7.1, pp. 5460–5461; Table 6, p. 5461). The paper says: “No provider is robust to all tested attack channels and media types.” (§7.1, p. 5461.)

Verus form. Inference: model camera input and liveness state as an abstract transition system, and state `ensures` that an accepted proof is bound to a live, untampered challenge transcript. A proof function can establish that a replayed transcript fails a nonce or session-binding predicate. Inference: the paper's empirical media attacks test implementation behavior; they do not become a Verus theorem without a formal model of the camera, operating system, and provider backend.

## technique: document and indirect-channel testing

For document upload, the authors submit “clearly fake identity documents, not associated with any real-world identity”: a clearly fake driving license from public online material when only the front is required, an AI-generated driving license when front and back are required, and a photograph of the document shown on a laptop screen when the provider requires a photo (§7.2, p. 5461). Eight of 15 providers support document upload, and “4 out of 8 operators (VP4, VP12, VP14 and VP15) are ultimately vulnerable to fake document injection” (§7.2, pp. 5461–5462; Table 7, p. 5462). For email, SMS, and credit cards they test temporary email addresses, a temporary phone number, and a realistic but nonexistent card number. Three of 15 providers offer email, one offers SMS, and five offer credit cards; the SMS operator does not detect the virtual number, and “the same phone number can be reused to obtain a new proof of age within a few minutes” (§7.3, p. 5462). Email rejected temporary addresses, and no operator completed verification even with personal email accounts; all card tests failed because the websites perform a transaction (§7.3, p. 5462).

Inference: a Verus protocol model should bind a proof to a verified identity attribute and a non-reusable challenge, and should state that a temporary contact channel is not an age credential. Proof functions can show that a server rejects proofs with a wrong audience, nonce, expiry, or already-consumed marker. These are model-level guarantees; they do not prove the external email, phone, card, or document service behaves as specified.

## technique: deployment-level bypass testing

The authors test provider accounts across multiple devices and networks, website accounts streamed simultaneously from two devices, cookie replay after 24 hours and 7 days, client-side blur removal, and VPN jurisdiction evasion (§8, pp. 5462–5465). Results: of 15 eligible websites, 13 allow simultaneous streaming on different devices and networks with one account (§8.1, p. 5463); of 26 eligible cookie cases, 11 have expiration times from 100 days to 1 year and 16 do not check duplicated parallel sessions (§8.2, p. 5464); in 8 cases the blur was removed by trivial client-side manipulation (§8.3, p. 5464); and among 154 sites “only one appears to implement VPN detection, blocking both tested commercial VPN providers” (§8.4, pp. 5464–5465). The §9 red-flag summary instead states “22/26 sites allowed simultaneous streaming” (p. 5466); the paper does not reconcile this with the 13/15 figure. The architectural finding is: “Any architecture that transmits sensitive content before a server-side authorization decision assumes a benign client—an assumption incompatible with motivated evaders.” (§8.3, p. 5464.)

Verus form. Inference: model an authorization token with explicit audience, device/session binding, expiry, nonce consumption, and server-side authorization state. Prove with `requires`/`ensures` that content is returned only after an accepted authorization transition; use state-machine invariants for consumed nonces and account/device relations. Inference: no proof can recover a server-side check that the actual product omits, so end-to-end refinement testing remains necessary.

## techniques for the catalog

- explicit adversary/property model — define evasion, replay, and unlinkability requirements before testing
- country-conditioned ecosystem mapping — sample deployments by jurisdiction and annotate provider/workflow behavior
- camera-input adversarial testing — compare presentation, emulator, rooted-device, and media attacks
- document-fraud testing — submit fake, AI-generated, and screen-recaptured identity documents
- indirect-credential testing — test disposable email, virtual phone, and payment channels
- account and cookie replay — transfer verified state across devices, networks, and time
- client-side overlay removal test — remove DOM/CSS blur after content delivery
- jurisdictional VPN evasion — compare access under enforcing and non-enforcing exit countries
- end-to-end property rating — map observed bypasses to robustness, anti-replay, and unlinkability scores
