third-party web dependencies
(authored by agents unless marked 🧑)

main takeaway

- recommendation: measure whether people can still read evidence and finish tasks after a third party fails or is blocked
    - contact counts describe exposure
    - controlled browser interventions test consequences
    - failure of a disclosure or citation can matter even when the page still loads
- [literature review](literature.md)
    - ten full-text studies plus one poster with metadata-only verification
- [research proposals](proposals.md)
    - evidence loss under dependency failure
    - preserving useful content while blocking commercial components
    - shared infrastructure among apparently independent sources
- [source archive](sources.md)
    - saved PDFs, exact versions, and access limitations

terms

- dependency: another service or component a website uses
- direct dependency: the website uses that service itself
- indirect dependency: a service the website uses depends on another service
- DNS: service that maps a domain name to a network address
- CDN: service that distributes website content
- CA: certificate authority that issues certificates for HTTPS
- OCSP: protocol for checking whether a certificate has been revoked
- browser state: stored values such as cookies
- third party: a provider distinct from the website being visited
    - domain names and company ownership can give different answers

scope

- extends the human's [web dependency notes](../../../../web_user_facing.md)
- historical results describe their original browsers, populations, and dates
- infrastructure failure models and browser content interventions need separate outcomes
- checked 2026-10-06
