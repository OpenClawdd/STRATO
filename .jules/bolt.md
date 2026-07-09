## 2025-02-18 - Safe Restoring of Data Files
**Learning:** Running validation scripts and tests can modify or create state files in `.strato-reports/` and `data/`. If you run a clean-up command like `rm -rf .strato-reports/`, it deletes tracked files in the repo and breaks the project structure.
**Action:** When cleaning up after running tests/scripts to prepare for commit, always use `git restore --staged .strato-reports/ && git checkout -- .strato-reports/` instead of `rm -rf`.
