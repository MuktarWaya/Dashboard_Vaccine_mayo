# Separate public and staff web app deployments

The public aggregate dashboard must open without login, but the staff workflows depend on the active organizational user for role checks. A single Google Apps Script web app deployment cannot safely satisfy both needs: `ANYONE_ANONYMOUS` with `USER_DEPLOYING` supports public aggregate access, while `DOMAIN` with `USER_ACCESSING` preserves staff identity for operational actions.

The system will therefore keep two deployment manifests from the same codebase. `appsscript.json` is the public aggregate deployment manifest and uses `USER_DEPLOYING` plus `ANYONE_ANONYMOUS`. `appsscript.staff.json` is the staff deployment manifest and uses `USER_ACCESSING` plus `DOMAIN`. The public endpoint must continue to return only whitelisted aggregate data. Staff imports, approvals, confirmations, exports, audit views, and child-level workflows must be accessed through the staff deployment and existing role checks.

