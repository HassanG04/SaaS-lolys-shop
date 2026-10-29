# Recovery/export review CI repair

The first review stack passed local verify, coverage, database and focused browser checks. GitHub then exposed two runner failures before application testing:

- CI run 40890942228, job 123507245945: legacy Semgrep 1.108.0 crashed importing protobuf on the runner's Python 3.14. The independent Static analysis workflow passed using the repository's digest-pinned Semgrep 1.179.0 container. CI now uses that same image while retaining its existing planted-violation tests and rule scans.
- CI run 40890947885, job 123507268025: Docker could not bind database port 56322. That port sits in Linux's automatic outbound allocation range. Database/browser jobs now reserve 56320–56329 before downloads, preserving any existing reservations. This follows the [Linux kernel port-reservation documentation](https://kernel.org/doc/html/latest/networking/ip-sysctl.html#ip-variables); an outbound allocation is a plausible cause, not a confirmed identity for the original socket owner.

The legacy fixture test now executes the scanner from its fixture directory so the existing container wrapper mounts both that directory and the repository rules read-only. No rules, test counts, performance budgets, MFA or RLS checks were removed. The changes affect disposable CI runners; local and production network settings remain unchanged. Updated remote checks must pass before owner approval. Review order remains recovery #62, dataset #63, interface #64.
