# Security Policy

## Reporting a Vulnerability

If you believe you have found a security issue, report it through the repository issue tracker or the maintainer's currently designated contact channel.

When reporting, include:

- A short summary.
- Affected files, commands, configuration, or workflows.
- Reproduction steps.
- Expected impact.
- Any known mitigation.

Do not include secrets, private keys, tokens, credentials, personal data, or exploit-ready sensitive details in a public report.

## Sensitive Information

Do not commit:

- API keys, tokens, passwords, private certificates, or credentials.
- Personal data.
- Private local configuration.
- Generated files that contain sensitive data.
- Third-party material that cannot be redistributed.

Use local environment files or the deployment platform's secret-management mechanism for secrets. Keep those files out of version control.

## Maintainer Response

Maintainers should:

- Confirm receipt when a credible report is received.
- Reproduce and assess the issue before changing code or documentation.
- Keep sensitive details private until a fix or mitigation is available.
- Document any user-visible security boundary changes.

## Scope

This policy applies to files, configuration, documentation, scripts, and any future deployable services in this repository.
