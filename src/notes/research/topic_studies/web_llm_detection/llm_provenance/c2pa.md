C2PA and cryptographic content provenance
(authored by agents unless marked 🧑)

- reviewed 7 Oct 2026
- covers C2PA Content Credentials and related systems
    - standard changes and signer trust
    - security findings and deployment
    - evidence surviving publication
    - readers' interpretation of labels
- builds on the human's existing notes

- `../../../c2pa/papers.md`: papers up to 2024 by theme (intro, extensions,
    zero-knowledge edits, JPEG Trust, blockchain, fake-image detection)
- `../../../c2pa/peripheral_literature.md`: use cases (BBC, CBC, Truepic,
    LinkedIn), the camera apps Click, Capture Cam and ProofMode, Truepic's
    pricing, the three-pillar idea, phone keystores
- `../../../c2pa/camera_apps.md`: the certificates those three apps issue
    and which ones the trust list rejects
- `../../../photo_crypto_auth.md`: how a manifest nests, the threats in the
    spec's own security document, the Canon key leak, PKI and quantum worries,
    which platforms strip, ideas

- sibling reviews cover related evidence
    - [image watermarking](image_watermarking.md)
        - invisible watermarks and Integrity Clash
    - [labeling rules and practice](labeling_rules_and_practice.md)
        - laws, platform displays, and audits

short answer

- C2PA is now shipped by default on a mass-market phone (Pixel 10, Sep
    2025), by OpenAI and Google generators, by Cloudflare's image CDN, and is
    read by LinkedIn, Google Search, Gemini, and soon Chrome and Instagram.
    238 products are on the conformance list as of today, 212 of them
    signers; only 11 reach the hardware-backed level 2.
- The trust model moved in 2025 from an Adobe-run "interim" list to a
    C2PA-run list fed by a conformance program. The program checks paperwork,
    not code. The first independent security analysis (Golaszewski, Krawetz,
    Sherman et al., 2026) says the spec fails even its own two security
    claims: validators need not check revocation, timestamps can be swapped,
    the exclusion range lets GPS be rewritten on a Pixel 10 photo, and
    conforming validators disagree. Two live examples: the Nikon Z6 III
    (Sep 2025) signed an AI image through its multiple-exposure feature,
    Nikon revoked every certificate, and validators still said "valid" six
    months later; and a rooted Pixel 10 Pro (disclosed Aug 2026) signed a
    ChatGPT image as a level 2 camera capture, and Google closed it as
    "Won't Fix".
- Nobody has measured how much of the web carries C2PA. What exists is
    anecdote (Tim Bray: platforms strip it), controlled uploads (Rijsbosch et
    al. 2026: four platforms "commonly strip those signals"), and a
    pre-Pixel-10 side note that X's CDN strips everything. This is the gap
    closest to the human's past work.
- User studies agree on one thing: a label raises stated trust and
    transparency, but people misread what it means. Feng et al. 2023 (N=595)
    found provenance made people doubt real content when the credential was
    incomplete; Forstner et al. 2025 (N=202) found 44% read the label as
    "how trustworthy the article is"; Trattner et al. 2026 (N=6,114) found
    more detail gives more trust, with the largest gains for low-trust
    outlets.
- Alternatives are mostly complements: soft bindings (watermark or
    fingerprint pointing to a manifest store), IPTC's publisher list, JPEG
    Trust (ISO 21617, part 2 published Apr 2026), Krawetz's SEAL (DNS keys,
    reviewed by UMBC in 2026), Apple's proprietary Reference Image (Sep
    2026, sensor-signed, not C2PA), and a steady stream of blockchain
    registries that re-solve the same two problems (stripping, corporate
    trust lists) without evaluation.

how C2PA works, in one paragraph, and what changed per version

- the human's `photo_crypto_auth.md` already has the nesting (manifest, claim, assertions), signing, and hard binding
    - What matters for 2025 and 2026 is the version history
    - I read the change log in the [2.4 specification](https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html) (C2PA, Apr 2026); the quotes are from it

- 2.0 (Jan 2024): "Only X.509 certificates may be used for signing"; the
    W3C Verifiable Credentials section and identity assertions were removed,
    "Removed identified humans from assertion metadata"; the Training and
    Data Mining and Endorsement assertions were removed; the "C2PA Trust
    List" was introduced as the default anchor list. Identity went to a
    separate group, CAWG (below). So anything the human read about "author"
    fields or opt-out-of-training in 1.x no longer lives in the core spec.
- 2.1 (Sep 2024): RFC 3161 timestamps reworked ("sigTst2"), a TSA trust
    list, time-stamp manifests, ingredients v3, richer validation status
    codes.
- 2.2 (May 2025): Soft Binding Resolution API; fields for "soft-binding
    manifest recovery"; "Restricted use of the C2PA Trust List to
    certificates with the `c2pa-kp-claimSigning` EKU"; "claimed signature
    creation time".
- 2.3 (Dec 2025): live video (CMAF segment signing); "Added exclusion
    ranges to box-based hashing"; embedding in unstructured text and more
    containers; validators can declare which spec version and trust list
    they used for ingredients. Golaszewski et al. say 2.3 "incorporated some
    of our suggestions".
- 2.4 (Apr 2026): crJSON, a JSON-LD serialization for "profile evaluation,
    interoperability testing, and validation reporting"; three new assertions
    including an AI Disclosure assertion; embedding in "HTML documents and
    structured text formats (source code, YAML, Markdown)". Golaszewski et
    al.: "Version 2.4 (April 2026) does not address any of our concerns."

C2PA also published a white paper on 30 Jul 2026,
[Use of Content Credentials to identify synthetic and non-synthetic
content](https://c2pa.org/wp-content/uploads/sites/33/2026/07/Use-of-Content-Credentials-to-Identify-Synthetic-and-Non-Synthetic-Content.pdf)
(C2PA, release 1.0): "The digitalSourceType field on an action is the
primary machine-readable signal for classifying AI-generated content", with
the IPTC vocabulary (`trainedAlgorithmicMedia`, `compositeSynthetic`,
`humanEdits`), the new `c2pa.ai-disclosure` assertion, regions of interest
for AI-edited areas, and prompts as `inputTo` ingredients. This is the
field a crawler should read to count "AI-marked" images; the labeling
sibling covers who is obliged to set it.

The HTML and Markdown embedding in 2.4 is new and relevant to DeGenTWeb:
C2PA can now in principle sign a web page, though I found no deployment of
that and the labeling sibling note quotes a 2025 proposal that said "It does
not support HTML text content" (true for 2.2).

trust model: who decides which signers count

Three lists exist, and the official tool still uses the old one. From the
CAI docs on [trust lists](https://opensource.contentauthenticity.org/docs/conformance/trust-lists/)
(Adobe/CAI, read 7 Oct 2026):

- the C2PA Trust List holds "X.509 certificate trust anchors (either root or
    subordinate certification authorities) that issue certificates to
    conforming generator products under the C2PA Certificate Policy";
    "Conforming validator products must refer to the C2PA trust list"
- the Interim Trust List (ITL), the one the human's `camera_apps.md` tested
    against in Dec 2024: as of 1 Jan 2026 "The ITL has been frozen: No new
    certificates will be added to the list, and no updates will be made"
- Adobe's Verify site "currently uses the ITL to validate that Content
    Credentials were signed using a 'known certificate'"; "At some point
    Verify will be updated to use the C2PA trust lists instead of the ITL"

The [conformance program](https://opensource.contentauthenticity.org/docs/conformance/)
(launched Jun 2025, CAI blog post dated 9 Oct 2025
[here](https://contentauthenticity.org/blog/raising-the-bar-for-trust-introducing-the-c2pa-conformance-program))
is what fills the new list. Products are "generator" or "validator"; an
applicant must "sign a legal agreement with the C2PA" and "provide evidence
supporting your application such as diagrams and documentation". The
assurance level is "encoded as the value of a custom X.509 v3 certificate
extension"; level 2 needs hardware-backed keys and attestation.

I pulled the public
[conforming products list](https://github.com/c2pa-org/conformance-public/blob/main/conforming-products/conforming-products-list.json)
(C2PA, GitHub, read 7 Oct 2026) and counted: 238 records, 212 generator
products and 26 validators; 201 at level 1, 11 at level 2, 26 with no level
(the validators); 196 records against spec 2.2, 39 against 2.4. Google alone
has 48 records (Pixel Camera, Photos, and so on), vivo 12, and the rest is a
long tail of small vendors with one or two. The level 2 signers are Pixel
Camera, Qualcomm "Snapdragon 8 Elite Gen 5", and nine small Android apps.
OpenAI has one record. Adobe has two. No Nikon, Sony, Canon, Leica or
Samsung record appears, which I read as: the camera makers are still on
ITL-era certificates or on their own lists. I did not confirm that with the
vendors.

A fourth list sits beside these. IPTC runs the
[Origin Verified Publisher list](http://www.iptc.org/verified-news-publishers-list/)
(IPTC, read 7 Oct 2026): BBC, CBC/Radio-Canada, WDR, Deutsche Welle, AFP,
France Télévisions, NTB and RTÉ, with certificates first from Truepic, then
GlobalSign, now "any C2PA-compliant organisational certificate". "The
certificates confirm organisational identity and do not make any judgement on
editorial position." This is a who-is-a-real-newsroom list, orthogonal to the
is-this-a-real-camera question the C2PA list answers.

Identity of people, removed from the core spec in 2.0, now lives in the
Creator Assertions Working Group (CAWG) under the Decentralized Identity
Foundation. SSL.com sells
[CAWG identity certificates](https://www.ssl.com/products/content-authenticity/content-credentials/cawg/);
the pattern is "a C2PA certificate is needed to sign the overall manifest and
a CAWG certificate to embed a verified creator identity within it". I did not
find any measurement of CAWG use in the wild.

security analyses and attacks

the 2026 UMBC/Hacker Factor/NSA study

[Verifying Provenance of Digital Media: Why the C2PA Specifications Fall
Short](https://arxiv.org/abs/2604.24890), Enis Golaszewski, Neal Krawetz,
Alan T. Sherman, Edward Zieglar, Sai K. Matukumalli, Roberto Yus, Carson L.
Kegley, Michael Barthel, William Bowman, Bharg Barot, Kaur Kullman, arXiv,
Apr 2026, is the short whitepaper. The full technical report is [Verifying
Provenance of Digital Media: Security Analysis of C2PA and its
Implementation](https://eprint.iacr.org/2026/804), same authors, Cryptology
ePrint Archive 2026/804 (Apr 2026, revised Jun 2026). The ePrint PDF sits
behind a Cloudflare challenge, so I read the arXiv whitepaper in full and the
ePrint abstract; the ePrint abstract says they "analyze three C2PA components:
specifications (Version 2.2), selected claim validator implementations, and
conformance program (Version 0.1)". Their framing, verbatim:

- "The C2PA specifications make only two security claims: 1. Claim
    integrity ... 2. Weak file integrity", and "any such provenance system
    should also include ... 3. Timestamp agreement ... 4. Validator
    consistency ... 5. Strong file integrity"
- "the C2PA specifications and implementations do not achieve any of their
    claimed security goals or any of the essential security goals"

The concrete attacks they show:

1. timestamps: "Nothing in the signed data references the timestamp,
    allowing removal and replacement without detection"; "C2PA validators
    display the date without noting that it may not be original" (Fig. 1, on
    CAI Verify)
2. revocation: "the C2PA specifications intentionally make checking for
    revoked certificates optional, and when done, permit such checking only
    via the Online Certificate Status Protocol (OCSP), expressly forbidding
    certificate revocation lists (CRLs)"; their Fig. 2: "Using a Nikon Z6
    III, Adam Horshack demonstrated how to use the camera to sign an AI
    image. In November 2025, Nikon revoked the camera's certificate. Over six
    months later, Adobe Inspect (pictured here) reports the signature as
    valid, while Verifieddit reports it as invalid. Neither conforming
    validator reports the revocation."
3. validator disagreement: "the same image can be labeled valid by one tool
    and invalid by another"
4. exclusion range: "Google's conforming Pixel 10 Pro camera places GPS
    information in an exclusion range, enabling an attacker to insert a false
    GPS location ... The conforming Proofmode Verify validator does not detect
    our alteration and displays the false GPS location."
5. expiry: an Arizona Secretary of State pilot image "validated in January
    2025, but fails to validate a year later ... even though the file has not
    changed"; they contrast this with 22-month election record retention
6. conformance: "Certification is based largely on self-reported compliance
    with no examination of the product's functionality or source code"

Their recommendations: mandatory revocation checks "including via
privacy-preserving methods", timestamps bound to content, "Mandate
consistency across validation tools", protect the whole file, "independent
security audits for certified products". The whitepaper says the formal
analysis exists but does not name the tool. The same UMBC labs reviewed
Krawetz's SEAL with CPSA (the Cryptographic Protocol Shapes Analyzer) in
2026 (below), so I guess the C2PA analysis used CPSA too, but I have not
confirmed that.

RAND made the policy version of the same point a year earlier:
[Overpromising on Digital Provenance and
Security](https://www.rand.org/pubs/commentary/2025/06/overpromising-on-digital-provenance-and-security.html),
Alicia Revitsky Locker, Chad Heitzenrater, Todd C. Helmus, RAND commentary,
4 Jun 2025. "success of the C2PA ecosystem relies on end-to-end compliance
of all image creation elements—from point of capture to posting, which was
realistic when C2PA was originally conceived as a 'closed ecosystem'";
"C2PA's threat model has not been updated since its 1.0 version, released
January 2022, despite the specification itself changing"; and on missing
credentials, "was the content never marked, or was the mark lost during a
mishap with a noncompliant tool?" That last question is exactly what a web
census cannot answer from the file alone, which is why idea 2 below pairs it
with controlled uploads.

What I take from it: items 2, 3 and 5 are the ones a web measurement would
see directly. If we crawl C2PA images and run several validators, we should
expect disagreement and silent expiry, and we can quantify both.

the Nikon Z6 III incident, Sep 2025

The one real-world compromise so far. Per
[heise](https://www.heise.de/en/news/Nikon-struggles-with-security-problems-in-photo-authentication-10667707.html)
(heise online, Sep 2025): "A raw file from any camera without C2PA
capability is copied to the memory card of a suitably equipped Z6 III. Within
the camera, this foreign image is then combined with a neutral, e.g., black,
image using multiple exposures." Adam Horshack, a DPReview forum user, found
it in early Sep 2025, days after firmware 2.00 (27 Aug 2025) added C2PA.
Nikon suspended its Authenticity Service and revoked all issued
certificates; heise adds that cameras "already updated but not yet connected
to Nikon's online service continue signing images" and that "standard C2PA
validation tools don't currently check whether a camera's certification has
been revoked". PetaPixel's piece on why Nikon cannot fix it alone was behind
a 403 for me. As of May 2026, per
[c2paviewer](https://c2paviewer.com/articles/nikon-cameras-c2pa) (a vendor
site, so lower confidence), the service "has not been restored".

This is not a cryptographic break. It is the "trick the claim generator"
threat the human already listed from the spec's security document, done with
a stock camera feature. It also shows the revocation gap is not theoretical.

the Pixel 10 Pro signed an AI image too, Aug 2026

[C2PA and Pixel Glitter Milk](https://hackerfactor.com/blog/index.php?/archives/1102-C2PA-and-Pixel-Glitter-Milk.html),
Neal Krawetz, Hacker Factor blog, 25 Aug 2026. David Buchanan (retr0id)
rooted a Pixel 10 Pro with "a well-known chip-based approach" (hardware;
Krawetz says two software-only root exploits also appeared during the
disclosure window), then had the phone's own signing path sign a ChatGPT
image of a unicorn cow being milked, stripped of its manifest and
re-encoded as a JPEG with copied metadata. Adobe Inspect and CAI Verify both
reported it as captured media from a Pixel Camera with valid signatures and
timestamps of 25 May 2026. Timeline per the post: reported Sep 2025, formal
report Nov 2025, signed proofs May 2026, Google closed it in Jul 2026 as
"Won't Fix" with "The changes that are needed to address the issue are not
reasonably possible", classed "NSBC (Not Security Bulletin Class)", but
paid a bounty. Krawetz: "While they acquired Assurance Level 2 on paper, it
appears to be absent from the implementation."

So the one level 2 mass-market signer can be made to sign anything by a
device owner with root. The Microsoft paper (below) predicted this in
general terms: on local devices, "available protections to stop a key being
used by an unauthorized application are very limited". For measurement this
means: a valid Pixel manifest is evidence that a Pixel signed it, not that a
Pixel sensor saw it, and Google's one-time keys mean a compromised phone
cannot be revoked by certificate at all. I only have Krawetz's account; I
did not find Google's side beyond the quoted ticket text.

Krawetz followed up with
[Validation Workflows](https://hackerfactor.com/blog/index.php?/archives/1106-Validation-Workflows.html),
22 Sep 2026: TLS validation has five fixed steps, C2PA's has "10 steps, 6
optional", and "you can upload the exact same picture to different C2PA
validators and get conflicting results"; he promises worked examples in a
next post, which was not up when I looked.

krawetz's earlier forgeries

The human's notes link the VIDA/SEAL post. The earlier one,
[C2PA's Butterfly Effect](https://www.hackerfactor.com/blog/index.php?/archives/1010-C2PAs-Butterfly-Effect.html),
Neal Krawetz, Hacker Factor blog, Nov 2023, made a copy of Adobe's demo
butterfly with "exiftool and Adobe's c2patool", a self-signed "Hacker
Factor" certificate, backdated timestamps and a fake edit history; both
images validated. His three points still describe the trust model: it
"works for tracking provenance" only if the signer is honest; a valid
signature proves data existed when signed, not that it is true; and two
conflicting valid manifests give the validator no way to pick. His 2024
IPTC talk
([slides](https://iptc.org/download/events/phmdc2024/krawetz-IPTC-PMD-20224.pdf),
IPTC Photo Metadata Conference 2024) frames provenance, watermark and
fingerprint "from the attacker's perspective" and cites the Hackaday
write-up of the forgery.

integrity Clash

[Authenticated Contradictions from Desynchronized Provenance and
Watermarking](https://arxiv.org/abs/2603.02378), Alexander Nemecek, Hengzhi
He, Guang Cheng, Erman Ayday, CVPR 2026 Workshop APAI, 2026: an asset can
carry "a cryptographically valid C2PA manifest asserting human authorship
while its pixels simultaneously carry a watermark identifying it as
AI-generated". The watermark sibling note covers it; the PDF is in the paper
collection.

privacy

Two 2025 and 2026 sources go beyond the human's "choose what metadata to
include" note:

- [Privacy, Identity and Trust in C2PA](https://worldprivacyforum.org/media/documents/c2pa_report.pdf),
    Kate Kaye and Pam Dixon, World Privacy Forum, Sep 2025, a 100-plus page
    report. Its summary: "C2PA's own Harms Modeling documentation recognizes
    the privacy and civil liberties threats posed by C2PA and states that
    loss of control over personal information and enforced suppression of
    speech are possible through use of C2PA", and "the very absence of C2PA
    metadata can negatively affect C2PA-based interpretations of trust". The
    conformance program "has not been reviewed for this report".
- [Privacy and security challenges of content provenance and authenticity
    systems](https://www.nccgroup.com/research/privacy-and-security-challenges-of-content-provenance-and-authenticity-systems/),
    Demi McCollum (University of Bristol), NCC Group research blog, 3 Aug
    2026, summarizing two academic studies: "capture tools can be
    fingerprinted back to unique users" via consistent tool and device
    fields; "public, web-based 'upload-to-verify' services receive the full
    media file, all provenance metadata, the user's IP address, and the
    precise timing"; client-side verifiers send "background requests pinging
    a server at one-minute intervals during an active session"; and "signed
    content can quietly stop validating within a year due to temporal
    fragility, even when the underlying file remains unchanged". I did not
    get the two underlying papers; one is likely the SMPTE 2025 talk
    "Privacy Vulnerabilities in C2PA Content Provenance Systems".

Google's Pixel design is the counterexample to the fingerprinting worry.
From [How Pixel and Android are bringing a new level of trust to your images
with C2PA Content
Credentials](https://blog.google/security/pixel-android-trusted-images-c2pa-content-credentials/),
Google security blog, 10 Sep 2025: "Anonymous, Hardware-Backed Attestation"
with "a strict no-logging policy for information like IP addresses"; a
"One-and-Done" scheme where each key signs one image so it is
"cryptographically impossible to link them"; "a trusted clock in a secure
environment, completely isolated from the user-controlled one in Android" so
timestamps work offline; and the framing "media that comes with verifiable
proof of how it was made or ii) media that doesn't". One certificate per
photo is exactly the PKI scaling question the human raised in
`photo_crypto_auth.md`; Google answers it with hardware attestation and a
Google-run CA, which is not an option open to a small vendor.

microsoft's own status report

[Media Integrity and Authentication: Status, Directions, and
Futures](https://arxiv.org/abs/2602.18681), Jessica Young, Sam Vaughan,
Andrew Jenks, Henrique Malvar, Christian Paquin, Paul England, Thomas Roca,
Juan LaVista Ferres, Forough Poursabzi, Neil Coles, Ken Archer, Eric Horvitz,
arXiv (Microsoft), Feb 2026. Useful because it is insiders admitting limits:

- "local implementations (whereby media is generated, provenance information
    is added, and validation occurs offline on the client) are generally the
    least secure"; "the assertions in the manifest are not necessarily
    accurate"; "the reliability of manifest information is platform-dependent
    with large potential variance"
- "Fingerprinting is not a viable path to high-confidence validation and
    faces significant scaling costs"
- they enumerate "60 unique combinations" of validation outcomes across
    manifest, watermark and fingerprint and say "the red path will be the
    path for most files until C2PA is more prevalent"
- "reversal" attacks: "making authentic content appear synthetic, and
    synthetic content appear authentic"

adoption as of Oct 2026

Primary sources where I could get them; vendor explainer sites otherwise,
marked as such.

Cameras and phones:

- Pixel 10 (Sep 2025): Pixel Camera signs every JPEG; "Assurance Level 2,
    the highest security rating currently defined by the C2PA Conformance
    Program"; Google Photos adds credentials to "JPEG images that already
    have Content Credentials and are edited using AI or non-AI tools, and
    also to any images that are edited using AI tools" (Google blog above).
    Video on Pixel 8, 9 and 10 "in the coming weeks" per Google's 19 May
    2026 [I/O post](https://blog.google/innovation-and-ai/products/identifying-ai-generated-media-online/).
- Samsung Galaxy S25 (Jan 2025): credentials only on images edited with
    Samsung's AI tools, plus a visible "AI-generated content" mark (news
    coverage, e.g. [TelcoNews](https://telconews.com/story/samsung-s-galaxy-s25-to-support-ai-image-provenance)).
- Apple: not C2PA. From Apple's newsroom,
    [Apple debuts iPhone 18 Pro and iPhone 18 Pro Max](https://www.apple.com/newsroom/2026/09/apple-debuts-iphone-18-pro-and-iphone-18-pro-max/),
    Sep 2026: "Apple Reference Image, powered by the new sensor in the Main
    camera that can sign every pixel it sees"; "the camera captures signed
    sensor data that Private Cloud Compute develops into an unalterable
    reference image"; viewed "alongside the main image, like a digital
    negative"; "Image metadata and upcoming support for the SynthID standard
    can also help users identify images generated or edited with AI". Not
    available in China at launch; in the EU, capture is not available at
    launch. Note what it is: a signed raw kept on Apple's servers, compared
    by eye, with Google's watermark as the AI signal. No manifest, no edit
    chain, no public trust list. A vendor site claims a "private revocation
    list"; Apple's page does not say.
- Dedicated cameras: Leica M11-P (Oct 2023, on-chip signing); Sony's
    [Camera Authenticity Solution](https://authenticity.sony.net/camera/en-us/)
    (Sony, read 7 Oct 2026) on the α1 II, α1, α9 III, α7R VI, α7R V, α7S
    III, α7 V, α7 IV, FX3, FX30 and PXW-Z300, where "A digital signature is
    created in-camera at the time of capture", "metadata including 3D depth
    information" is used to tell "an actual 3D subject" from a flat copy
    (the photo-of-a-photo defense the human asked about), and verification
    runs through "Sony's paid Image Validation Site" for news organizations;
    Canon EOS R1 and R5 Mark II, plus an "Authenticity Imaging System" for
    newsrooms announced 11 May 2026 (c2paviewer, vendor site); Nikon Z6 III
    (suspended, above); Fujifilm and Panasonic per vendor sites. The
    Microsoft paper's own list: "Google Pixel 10, Nikon Z6 III, Leica M11-P,
    ... Canon EOS R1 and EOS R5 Mark 2".
- Qualcomm: "Snapdragon 8 Elite Gen 5" is a level 2 conforming generator,
    which means any Android phone on that chip can sign in hardware if the
    OEM turns it on. vivo and Xiaomi have 12 and 3 records.

Generators:

- OpenAI, [Advancing content provenance for a safer, more transparent AI
    ecosystem](https://openai.com/index/advancing-content-provenance/),
    19 May 2026 (page 403'd for me; summary from search snippets and
    c2paviewer): joined the C2PA steering committee, got conformance, added
    SynthID watermarks to ChatGPT, API and Codex images, previewed a public
    verifier. The watermark sibling note quotes OpenAI's help page on C2PA
    plus SynthID. Tim Bray's Sep 2025 test found a ChatGPT image "Fails
    `c2patool` validation" while carrying `trainedAlgorithmicMedia`.
- Google: Gemini, Imagen, Veo images and video carry C2PA plus SynthID; the
    I/O post says SynthID has marked "Over 100 billion images and videos" and
    Gemini's verification was "used 50 million times globally".
- Adobe Firefly, Photoshop, Lightroom since 2023; Tim Bray found in Sep
    2025 that "Neither Lightroom nor Photoshop can handle the P10 C2PA"
    (version mismatch, since fixed per him).
- Meta AI: see the watermark sibling note.

Readers and platforms:

- LinkedIn shows the CR icon (human's notes). Google Search's "About this
    image" reads C2PA since Sep 2024 (labeling sibling). Google's I/O post:
    "adding verification for C2PA Content Credentials, to easily check if
    content is an unaltered original from a camera", in the Gemini app now,
    "coming to Search and Chrome in coming months"; "Meta ... will start
    labeling camera-captured media with Content Credentials on Instagram".
    Note the direction: Google's pitch has shifted from labeling AI to
    labeling real camera captures, which is the "verifiable proof or not"
    framing from the Pixel post.
- Cloudflare Images, [blog](https://blog.cloudflare.com/preserve-content-credentials-with-cloudflare-images/),
    3 Feb 2025: opt-in; "When you use Images to resize or change the file
    format to your images, these transformations will be cryptographically
    signed by Cloudflare"; "If the images you are transforming do not
    contain any Content Credentials, no action is taken." So one CDN can both
    preserve and extend a chain, but only for customers who opt in.
- Newsrooms: the IPTC list above; BBC, CBC, AFP, DW, France TV, NTB, RTÉ,
    WDR.

measurements: how much C2PA is out there and who strips it

This is thin, and that is the finding. I searched for any crawl-based count
of C2PA manifests on the web or on news sites and found none; the labeling
sibling note's audits count platform labels, not manifests.

- [C2PA Investigations](https://www.tbray.org/ongoing/When/202x/2025/09/18/C2PA-Investigations),
    Tim Bray, blog, 18 Sep 2025. Hands-on with a Leica M11-P, Pixel 10,
    ChatGPT, Lightroom and Photoshop. His verdict on distribution: "nearly
    every online photo is delivered either via social media or by
    professional publishing software. In both cases, the metadata is
    routinely stripped, bye-bye C2PA." He also found "the Adobe Content
    Credentials inspector and it's broken" at the time, and that Google
    Photos "Displays very limited C2PA information". He does not tabulate
    per-platform results.
- Rijsbosch, Bekavac, Tari, van Dijck, Kollnig, arXiv 2026 (see labeling
    sibling): controlled uploads to Instagram, TikTok, X and YouTube;
    platforms "labelled only 61% of uploads, and commonly strip those signals
    after uploading". This is the closest thing to a stripping measurement
    and it covers four platforms and ten generators, not cameras.
- the watermark sibling quotes a 2026 paper noting "Twitter's CDN strips all
    embedded metadata on upload".
- The human's own Dec 2024 observations (X and Facebook strip, LinkedIn
    shows) remain the only per-platform notes I have; they predate Pixel 10
    and the Instagram announcement.

So the three numbers we would want, none exist: the share of images on the
open web with a manifest; the share of those that still validate (given
expiry and validator disagreement); and a per-platform keep/strip/rewrite
matrix with dates.

how users understand the labels

Three peer-reviewed experiments, plus BBC's internal numbers. The sibling
labeling note has the broader "labels lower belief" literature; here only
C2PA-specific work.

- [Examining the Impact of Provenance-Enabled Media on Trust and Accuracy
    Perceptions](https://arxiv.org/abs/2303.12118), K. J. Kevin Feng, Nick
    Ritchie, Pia Blumenthal, Andy Parsons, Amy X. Zhang, CSCW 2023. N=595,
    US and UK. "provenance information often lowered trust and caused users
    to doubt deceptive media, particularly when it revealed that the media
    was composited"; but when provenance was incomplete or invalid,
    participants sometimes doubted authentic content; users "conflate media
    credibility with provenance credibility". PDF is in the paper collection.
- [Evaluating Image Trust Labels in a News Recommender
    System](https://ceur-ws.org/Vol-4056/short4.pdf), Svenja Lys Forstner,
    Yelyzaveta Lysova, Alain D. Starke, Christoph Trattner, INRA workshop at
    RecSys 2025. N=202, four conditions. "While image trust and article
    selection were not significantly affected, all labels increased article
    trust." On comprehension: "44% selected 'How trustworthy the article
    is'" as what the label means; clicks on the explanation icon were "C-ITS
    2.0%, BW-ITS 6.0%, C2PA 4.0%"; "C2PA users often overestimated their
    comprehension".
- [C2PA Provenance Labels Increase Trust in News Platforms Across Western
    Countries](https://ojs.aaai.org/index.php/ICWSM/article/download/42749/50309),
    Christoph Trattner, Svenja Lys Forstner, Alain D. Starke, Erik Knudsen,
    ICWSM 2026. N=6,114 across the US, UK and Norway, Oct to Nov 2024, three
    label detail levels. Source trust rose with detail ("Level 1: β = 0.13,
    p < 0.01; Level 2: β = 0.29, p < 0.001; Level 3: β = 0.50, p < 0.001")
    and perceived transparency more so (Level 3: β = 2.01); the gain was
    larger "for low-trust sources (β = 0.053, p = 0.037)". The labels were
    mockups on article previews; participants never saw a failed or stripped
    credential, so this measures the upside only. Their limitation: "The
    controlled environment presented participants with partial news content".
    They also cite BBC's unreviewed internal study (Monday and Strappelli
    2024): "increases trust among 83% of participants, while 96% consider the
    Content Credentials to be useful".

- my reading: every study shows a label is a trust nudge that people do not decode
    - Combined with Krawetz's point that a valid signature is not truth, that is the "liar's dividend in reverse": a signed lie gets a trust bump
    - No study yet tested a forged-but-valid manifest on users

alternatives and complements

- Soft bindings and durable credentials: the Adobe design the human noted
    (TrustMark plus fingerprint) is now in the spec (2.2 Soft Binding API)
    and in a hosted [CAI Soft Binding
    API](https://developer.adobe.com/cai-soft-binding-api) that resolves a
    watermark ID to a manifest in "the Adobe Content Credentials Cloud". This
    makes the manifest store, not the file, the source of truth, and makes
    Adobe the resolver. No one has measured recovery rates in the wild; the
    watermark sibling covers robustness.
- JPEG Trust, ISO/IEC 21617: part 1 published 2025, part 2 "Trust profiles
    and reports" published 14 Apr 2026 (ISO). The human's papers note covers
    the design. It wraps C2PA-style manifests in "trust profiles" a verifier
    chooses. I saw no product shipping it.
- IPTC publisher list and CAWG identities: above. Both move the "who" out
    of the C2PA device list.
- SEAL (Secure Evidence Attribution Label), Krawetz's own alternative,
    [spec on GitHub](https://github.com/hackerfactor/SEAL): a signature over
    the file with the public key published in DNS, like DKIM for media. Per
    [SEAL Tested, Hardened, and Honest](https://hackerfactor.com/blog/index.php?/archives/1105-SEAL-Tested,-Hardened,-and-Honest.html),
    Hacker Factor blog, 18 Sep 2026, UMBC's Protocol Analysis Lab and Cyber
    Defense Lab reviewed it with CPSA and found it "does what it claims. It
    provides a strong cryptographic signature over the file, identifies the
    signer, and prevents impersonation attacks", plus "two exclusion-range
    exploits" since fixed. He contrasts revocation: SEAL validators "treat a
    signature that pre-dates a revocation as suspect", while C2PA "simply
    rel[ies] on a trusted signing authority (TSA)"; and SEAL has "valid,
    invalid, and unverifiable" states where C2PA has "only two OCSP states".
    The reviewer and the author are co-authors on the C2PA critique, so
    read this as one camp's design, but it is the only alternative with a
    formal review. No camera or platform ships it that I know of.
- Signed web content: the obvious web analogue, a signed HTML page, exists
    on paper (C2PA 2.4 HTML embedding) and nowhere else. IETF's HTTP Message
    Signatures work in 2025 and 2026 went into
    [Web Bot Auth](https://datatracker.ietf.org/doc/html/draft-meunier-webbotauth-httpsig-protocol-01)
    (Meunier et al., Internet-Draft, Aug 2026) for crawlers signing
    requests, not publishers signing responses. Signed HTTP Exchanges were
    deprecated by Chrome earlier. So nothing cryptographic tells a crawler who
    authored a page.
- Blockchain registries: the human's notes already cover Numbers, Click,
    DECORAIT and Bureacă. Two more 2026 preprints, neither evaluated against
    real platforms:
    - [The Birthmark Standard: Privacy-Preserving Photo Authentication via
        Hardware Roots of Trust and Consortium
        Blockchain](https://arxiv.org/abs/2602.04933), Sam Ryan, arXiv, Feb
        2026. Motivates itself with C2PA's "technical vulnerability to
        metadata stripping during social media reprocessing, and structural
        dependency on corporate-controlled verification infrastructure", and
        proposes sensor-derived keys and "a journalist-operated blockchain".
    - [Provenance Verification of AI-Generated Images via a Perceptual Hash
        Registry Anchored on Blockchain](https://arxiv.org/abs/2602.02412),
        Apoorv Mohit, Bhavya Aggarwal, Chinmay Gondhalekar, arXiv, Feb 2026.
        A perceptual-hash registry with a BK-tree for lookup; "focuses on
        verifying the provenance of AI-generated content that has been
        registered at creation time". This is fingerprint lookup with a
        ledger instead of a database, and inherits the false-positive problem
        Microsoft and Google both flag.
- Apple Reference Image (above): proprietary, closed revocation list, no
    edit history. If it ships as described, Apple phones will produce signed
    photos that no C2PA validator reads, which splits the ecosystem at
    exactly the moment Google and Meta converge.

what I make of it

- The standard is maturing fast on paper (five versions in 28 months) but
    the trust plumbing is behind: the official verifier still uses a frozen
    list, 85% of conforming signers are at the paperwork level, the one
    camera that got compromised cannot be revoked in practice, and the one
    level 2 phone signs whatever a rooted owner feeds it. "Valid manifest"
    today means "some conforming product signed this", nothing more.
- Adoption is lopsided: generators and one phone sign; publishers and CDNs
    mostly strip; two readers (LinkedIn, Google) show. Google and Meta's May
    2026 moves may change the reading side within a year, which makes now the
    right time to take a baseline measurement.
- Every empirical question a systems person would ask about the deployed
    state is unanswered: prevalence, survival, validator agreement, expiry
    rate, per-platform handling. The human's own tooling (c2patool fork,
    trust list runs in `camera_apps.md`) is most of what is needed.

gaps in this review

- I could not open the ePrint full report (Cloudflare), the OpenAI May 2026
    post, or PetaPixel's Nikon piece; the OpenAI facts come from search
    snippets and a vendor summary.
- Krawetz's promised post with concrete validator-disagreement examples was
    not yet published; Google's view of the Pixel root signing is known only
    through his quotes of the bug ticket.
- Camera-maker details (Sony, Canon, Fujifilm, Panasonic) come from vendor
    and news sites, not from the makers' own pages.
- I did not search Chinese-language sources on vivo's and Xiaomi's C2PA
    rollouts, though their 15 conformance records suggest phones shipped.

research we could do

- each idea names what it builds on
    - ordered by how close it is to the human's past work

1. A C2PA census of the web

- question: what fraction of images on the open web, on news sites, and on
    each social platform carry a manifest, and what fraction of those
    validate today against the C2PA list, the ITL, and the IPTC list?
- method: sample images from Common Crawl (sibling web_infra notes), from a
    news-site crawl, and from platform feeds; detect the JUMBF box; run
    c2patool with each trust list; classify by signer (camera, generator,
    editor, CDN), spec version, assurance level, and validation status
    (valid, expired, untrusted, revoked, malformed)
- builds on: the human's `camera_apps.md` trust-list runs; the conforming
    products list as ground truth for signer identity; Golaszewski et al.'s
    validator-disagreement and expiry findings as hypotheses; the "Is the Web
    HTTP/2 Yet?" pattern the human already flagged
- why now: Pixel 10 (Sep 2025) and OpenAI conformance (May 2026) mean
    signed files exist in volume for the first time; Chrome and Instagram
    reading will change behavior soon, so a baseline has a short window

2. The keep/strip/rewrite matrix

- question: for each platform, CDN, CMS and messaging app, what happens to a
    manifest on upload, on re-share, on download, on screenshot, and does the
    platform re-sign (as Cloudflare does) or only label then strip?
- method: controlled uploads of Pixel 10, Leica, Firefly, ChatGPT and
    Cloudflare-signed files; fetch every delivered variant (thumbnail, feed,
    full-size, API); record keep, strip, partial strip (EXIF kept, JUMBF
    gone), or re-sign; repeat quarterly as a standing monitor
- builds on: Rijsbosch et al. 2026 (four platforms, generators only), Tim
    Bray's anecdotes, the human's X and Facebook observations, the labeling
    sibling's idea 3 ("Where do marks die between the generator and the web
    page?") which this generalizes to cameras and CDNs

3. Validator agreement and credential decay in the wild

- question: on real signed files collected by idea 1, how often do CAI
    Verify, Adobe Inspect, c2patool, ProofMode Verify, Google's reader and
    Verifieddit disagree, and how fast do files stop validating?
- method: run all validators on the census corpus monthly; track status
    changes per file; attribute to certificate expiry, trust-list freeze,
    timestamp absence, or spec-version mismatch
- builds on: Golaszewski et al.'s five goals and their single-image
    examples (Arizona pilot, Nikon); this turns their examples into rates

4. Users facing a valid lie

- question: does a cryptographically valid but false manifest (Nikon-style
    signed AI image, or a Krawetz-style fake edit history) raise trust more
    than no label? Does showing validator disagreement or "revoked" help?
- method: between-subjects experiment like Trattner et al. but with four
    conditions: no label, valid-true, valid-false, conflicting validators
- builds on: Feng et al. 2023 (incomplete provenance lowers trust in real
    content), Forstner et al. 2025 (44% misread), Trattner et al. 2026
    (detail raises trust); none tested forgery

5. Signed pages for DeGenTWeb

- question: can C2PA 2.4's HTML and Markdown embedding, or an HTTP
    response signature, give DeGenTWeb a ground-truth channel for "this page
    was written by a person at this outlet", and would any publisher turn it
    on?
- method: prototype signing a static site with c2pa-rs, measure what
    survives CDNs and archives (Wayback, Common Crawl WARC), then survey IPTC
    list members on willingness
- builds on: the 2.4 spec, IPTC's publisher list, the labeling sibling's
    `ai-disclosure` proposal, Web Bot Auth as the request-side precedent

6. Privacy leakage of deployed signers

- question: across the census corpus, how identifying is a manifest?
    Which signers reuse keys across users (Capture Cam did), which include
    device serials (Leica), which use one-time keys (Pixel)?
- method: cluster manifests by certificate, claim generator string and
    assertion set; estimate how many files link to one device or person
- builds on: McCollum 2026 ("fingerprinted back to unique users"), World
    Privacy Forum 2025, the human's certificate dumps in `camera_apps.md`

7. Open hardware-backed signing for any Android phone

- question: with Qualcomm's Snapdragon 8 Elite Gen 5 at level 2 and Android
    key attestation accepted by the program, can an open-source camera app
    reach level 2 without a Google-scale CA, and what does per-photo
    certificate issuance cost?
- builds on: the human's "build open-source solution for mobile?" idea in
    `photo_crypto_auth.md`, ProofMode (level 1, self-signed root), Google's
    one-time-key design, the conformance program's security requirements
- risk: the Pixel root-signing result says level 2 on today's Android does
    not stop a device owner; an honest version of this idea has to state
    what "the owner is the attacker" means for the claim, or add the
    attestation of boot state that Google evidently did not require

8. What does a signature prove once the owner is the attacker?

- question: Nikon (multiple exposure), Pixel (root), and Krawetz's 2023
    self-signed forgeries are three ways the signer is honest but the input
    is not. Can a validator or a platform tell these apart from clean
    captures using only what is in the file plus public lists, and what
    extra evidence (Sony-style depth, Apple-style raw escrow, boot-state
    attestation in the certificate) closes each one?
- method: build a corpus of signed-but-false files from each known
    technique; run all validators; test cheap discriminators (claim
    generator strings, exclusion-range contents, timestamp sources)
- builds on: Golaszewski et al. goals 2 to 5; Krawetz 2023 and 2026; the
    Microsoft paper's "local implementations ... are generally the least
    secure"; Vilesov et al. 2024 in the human's `papers.md` on 2D vs 3D
    sensing

consultation

- see the [provenance index](index.md) for the current Extra High consultation
