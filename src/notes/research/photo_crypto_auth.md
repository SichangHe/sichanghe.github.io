# Photo Crypto Auth

- cameras will sign photo cryptographically
- influencer have posted genuine photo but for irrelevant event
- may build system to authenticate photo

problem:

- ~~what about photo without signature?~~don't care

steps:

1. What in photo from C2PA camera?
1. Post-processing on social media site preserve signature?
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
- attack: see [Threat | C2PA Security Considerations :: C2PA
    Specifications](https://c2pa.org/specifications/specifications/1.0/security/Security_Considerations.html#_threat_spoofing_signed_c2pa_metadata_via_stolen_key)
    onward
    - steal private key/ trick claim generator/ make key → penetrate
    - security guidance: "best practice"
        - hardware security module (HSM); revoke
