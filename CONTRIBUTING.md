# Contributing

Thanks for contributing.

Before making changes, read:

- `AGENTS.md`
- `spec.md`
- `plan.md`

## Workflow

- Base decisions on repository facts, command output, user-provided materials, or reproducible results.
- For non-trivial work, update `plan.md` before editing other files.
- Keep the checklist in `plan.md` current as work progresses.
- If new facts invalidate the plan, update `plan.md` before continuing.
- Keep product facts in `spec.md`.
- Keep agent and collaboration rules in `AGENTS.md`.
- Keep broad project introduction in `README.md`.

## Quality Bar

- Do not claim an unimplemented capability as current fact.
- Keep code, tests, and documentation describing the same behavior.
- Add or update tests when behavior changes.
- Run the relevant verification before closing work.
- Record unverified items and remaining risk in `plan.md`.

## Commit Guidance

- Do not commit unrelated changes.
- Do not commit secrets, credentials, personal data, local-only files, or generated sensitive artifacts.
- Use concise commit messages that describe the actual change.
- Do not commit or push unless the maintainer requested it.
