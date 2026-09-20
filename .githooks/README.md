# .githooks — the law guard

Two hooks that refuse, never fix. They run for every builder on every harness once a clone is armed:

    git config core.hooksPath .githooks
    git config lawguard.gate "/path/to/gate.sh {top}"

- **pre-commit** refuses a commit whose author email is not the one in `law.conf` (Vercel blocks
  other authors without saying so), and refuses a lane that stages a path outside the `## OWNS`
  section of its `work-claims/task-NNN.md`.
- **pre-push** acts only on a push to a protected branch (`main`): refuses a branch delete, a pushed
  commit that is not the checked-out one, and a dirty tree; then runs the gate and refuses unless it
  exits 0. Lane branches push freely.

No network call in either hook. `law.conf` missing, or no gate set = refused.
A pull request merged with GitHub's button never passes through these hooks; branch protection on
`main` covers that door.
