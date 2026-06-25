# Jenkins CI/CD Demo App

This project is a simple Node.js app you can use to test a Jenkins pipeline with three environments:

- Development
- Staging
- Production

Branch flow:

```text
feature/* -> develop -> staging -> main/prod
```

Pipeline rule:

```text
Pull request validates.
Merge deploys.
Production requires approval.
```

## App endpoints

```text
GET  /
GET  /health
POST /echo
```

## Required for the minimum pipeline

Install these on the Jenkins agent:

```text
Git
Node.js 20+
npm
Docker
Docker Compose plugin
Jenkins Pipeline plugin
Jenkins Git or GitHub/GitLab/Bitbucket integration
```

## Optional security/compliance tools

Install these if you enable `RUN_OPTIONAL_SECURITY=true`:

```text
Gitleaks      Secret scanning
Trivy         Dependency and image vulnerability scanning
Semgrep       SAST
Hadolint      Dockerfile linting
Syft          SBOM generation
k6            Performance smoke testing
OWASP ZAP     DAST, executed by Docker image in the Jenkinsfile
```

## Run locally

```bash
if [ -f package-lock.json ]; then npm ci; else npm install; fi
npm run lint
npm test

docker build -t jenkins-cicd-demo:local .
IMAGE_NAME=jenkins-cicd-demo IMAGE_TAG=local docker compose -f compose.dev.yml up -d
npm run smoke:dev
```

Open:

```text
http://localhost:3001/health
```

## Jenkins setup

1. Create a Git repository and push this project.
2. In Jenkins, create a **Multibranch Pipeline** job.
3. Connect the job to your GitHub/GitLab/Bitbucket repository.
4. Configure branch discovery and pull request discovery.
5. Ensure your Jenkins agent can run Docker.
6. Scan the repository.

## Branch behavior

### Push to feature branch

```text
feature/* push
-> CI only
-> no deployment
```

Runs:

```text
Checkout
Install dependencies
Secret scan if enabled
Lint
Unit tests with coverage
Dependency scan if enabled
Build Docker image
```

### Pull request to develop

```text
feature/* -> develop
-> CI validation
-> no deployment
```

Runs stronger CI checks and blocks merge if the build fails.

### Merge to develop

```text
develop
-> deploys to Development
```

Runs:

```text
Build image
Deploy with compose.dev.yml
Smoke test on http://localhost:3001/health
```

### Pull request to staging

```text
develop -> staging
-> release candidate validation
-> no deployment before merge
```

Runs:

```text
CI checks
SAST if enabled
Dockerfile lint if enabled
Container scan if enabled
SBOM generation if Syft is installed
```

### Merge to staging

```text
staging
-> deploys to Staging
```

Runs:

```text
Deploy with compose.staging.yml
API smoke test
DAST if enabled
Performance smoke test if enabled
Staging smoke test on http://localhost:3002/health
Archive reports
```

### Pull request to main/prod

```text
staging -> main/prod
-> production readiness check
-> no deployment before merge
```

Runs:

```text
CI checks
SBOM generation if available
Production readiness message
```

### Merge to main/prod

Production deployment is protected by the `DEPLOY_PRODUCTION` parameter.

```text
main/prod
-> manual approval
-> production deploy
```

To deploy production:

1. Run the pipeline for `main` or `prod`.
2. Set `DEPLOY_PRODUCTION=true`.
3. Approve the Jenkins input gate.

Runs:

```text
Manual approval
Deploy with compose.prod.yml
Production smoke test on http://localhost:3003/health
Archive evidence
```

## Cleanup

```bash
docker compose -f compose.dev.yml down
docker compose -f compose.staging.yml down
docker compose -f compose.prod.yml down
```
