# Photo Crypto Auth

- cameras will sign photo cryptographically
- influencer have posted genuine photo but for irrelevant event
- may build system to authenticate photo

problem:

- ~~what about photo without signature?~~ don't care

steps:

1. What in photo from C2PA camera?
1. Post-processing on social media site preserve signature?
    - X remove C2PA
        - [Twitter joined C2PA](https://c2pa.org/post/twitter_pr/) in
            2021 but [X quit
            C2PA](https://ipcloseup.com/2024/05/21/tiktok-and-google-join-adobe-led-initiative-that-makes-image-and-content-changes-transparent/)
            in 2024 after Elon Musk
    - Facebook remove C2PA
        - although Meta is in C2PA steering committee
    - [LinkedIn display C2PA
        info](https://www.linkedin.com/help/linkedin/answer/a6282984).
        probably the only platform, because of Microsoft
1. Extract info from posts' text

## literature

### *P3: Toward Privacy-Preserving Photo Sharing*, Moo-Ryong Ra, Ramesh Govindan, Antonio Ortega, NSDI 13

split photo into public and private part, encrypt private part

### *Mitigating Image-based Misinformation Campaigns*, Calvin Ardi, Harsha V. Madhyastha

proposal:
compare photo crypto metadata time+location w/ social media post text before
manipulative post go viral. good for news. need to balance privacy

## C2PA

- nesting: manifest (metadata) > claim (wrapper) > assertion (statement)
    ![Example C2PA Manifest of a
    Photograph](https://c2pa.org/specifications/specifications/2.1/specs/_images/Photo_Manifest.svg)
- claim generator: create & sign claim
- manifest consumer, e.g., C2PA validator
- public key encryption (ECDSA/EdDSA/RSA) to sign claim; SHA-2 hash for
    hard binding of manifest & content
- modifying image invalidate previous signature, need new one: [10.3.3.2.
    Multiple Claims | Content Credentials : C2PA Technical Specification ::
    C2PA
    Specifications](https://c2pa.org/specifications/specifications/2.1/specs/C2PA_Specification.html#_multiple_claims)
    - PhotoShop seem to keep private key on cloud, see
        [Content credentials in
        Photoshop](https://helpx.adobe.com/photoshop/using/content-credentials.html)
- attack: see [Threat | C2PA Security Considerations :: C2PA
    Specifications](https://c2pa.org/specifications/specifications/1.0/security/Security_Considerations.html#_threat_spoofing_signed_c2pa_metadata_via_stolen_key)
    onward
    - steal private key/ trick claim generator/ make key → penetrate
    - security guidance: "best practice"
        - hardware security module (HSM); revoke
    - Canon signing key leak from 2010: [Analyst Finds Flaws in
        Canon Image Verification System |
        PCWorld](https://www.pcworld.com/article/499056/article-2356.html)
    - no transitive trust; probably whack-a-mole security patching
    - could add any author name during editing:
        [blog](https://hackerfactor.com/blog/index.php?/archives/1044-From-VIDA-to-SEAL.html)
- how actually done
    - [x] check out C2PA editing software
        - few options.
        - Adobe is biggest
        - PixelStream seems vaporware. blog from CAI: [Community story:
            Pixelstream](https://contentauthenticity.org/blog/community-story-pixelstream).
            but dead GitHub and website; cannot register
        - Photo Mechanic is for camera
        - Cloudinary is for content delivery
            - [x] Try after sign up: only preserve existing, do not add new;
                need to [join beta program](https://cloudinary.com/contact)
        - Microsoft Designer is not advertised; MS Paint
    - [x] check out C2PA image
        - [generated cat picture signed
            later](https://fotoforensics.com/analysis.php?id=b2d0ed23d2bdf3170d8a7a8ac06617569665a2b1.5429555&fmt=orig)
    - [ ] Check out C2PA SDK
- [ ] Note down potential issues
    - Removing metadata rids hard binding. Soft binding improvements?
    - Camera private key leak
    - Editing software lose track
    - Taking photo of photo
        - [ ] ❗Literatures? Difference between photo of photo and photo
            - Bad search term.
                Only found paper on distinguishing manipulated photo.
    - PKI: long term verification support?
        - [ ] ❗Literatures? Trusting signed document long term
            - [ ] Check out signed digest standard
    - [Vilesov arXiv paper](c2pa/papers.html#introduce-c2pa)
- use case: prove my photo is real
    - news, social media
    - legal, forensic
    - artwork
    - research proof
- [ ] figure out concrete use case
- vision: want C2PA be like TLS
    - "three-legged approach": C2PA, watermark, fingerprint
    - need phone to do C2PA; doable similarly to Apple Pay
    - provider companies charging high margin hinder adoption
        - **build open-source solution for mobile?**
- enhancement
    - privacy by choosing metadata to include
    - prove one image is manipulation of another
- surrounding
    - blockchain
    - opting out of ML training

## PKI & blockchain

- cannot scale to 1 certificate per user per period?
    - share pubkey, sign on server
    - blockchain reference instead of certificate, but not same level of
        trust
- current pubkey may eventually be cracked
    - quantum algorithm crack RSA & ECC in quadratic time;
        quantum-safe crypto not adopted
    - 💡 need time interval for key validity → content/hash on blockchain
        - but current blockchain may be cracked too

## idea

- get something then reach out to C2PA people
- RGBD camera to combat taking photo of photo

### difficulties implementing C2PA on mobile

- performance: slow to sign?
- PKI: get certificate? scaling? revocation?
