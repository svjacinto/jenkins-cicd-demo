pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  parameters {
    booleanParam(name: 'RUN_OPTIONAL_SECURITY', defaultValue: false, description: 'Run optional tools if installed: Gitleaks, Trivy, Semgrep, Hadolint, OWASP ZAP, k6')
    booleanParam(name: 'DEPLOY_PRODUCTION', defaultValue: false, description: 'Allow production deployment after approval. Keep false for test runs.')
  }

  environment {
    APP_NAME = 'jenkins-cicd-demo'
    IMAGE_NAME = 'jenkins-cicd-demo'
    IMAGE_TAG = "${env.BUILD_NUMBER}-${env.GIT_COMMIT ? env.GIT_COMMIT.take(7) : 'local'}"
  }

  stages {
    stage('Detect Pipeline Type') {
      steps {
        script {
          env.IS_PR = env.CHANGE_ID ? 'true' : 'false'
          env.TARGET_BRANCH = env.CHANGE_TARGET ?: env.BRANCH_NAME ?: 'local'
          env.SOURCE_BRANCH = env.CHANGE_BRANCH ?: env.BRANCH_NAME ?: 'local'

          echo "Source branch: ${env.SOURCE_BRANCH}"
          echo "Target branch: ${env.TARGET_BRANCH}"
          echo "Is PR: ${env.IS_PR}"
          echo "Image: ${env.IMAGE_NAME}:${env.IMAGE_TAG}"
        }
      }
    }

    /* ============================================================
       CI: runs for feature pushes and all pull requests
       ============================================================ */

    stage('CI - Checkout') {
      steps {
        checkout scm
      }
    }

    stage('CI - Install Dependencies') {
      steps {
        sh '''
          if [ -f package-lock.json ]; then
            npm ci
          else
            npm install
          fi
        '''
      }
    }

    stage('CI - Secret Scan') {
      steps {
        sh '''
          if [ "${RUN_OPTIONAL_SECURITY}" = "true" ] && command -v gitleaks >/dev/null 2>&1; then
            gitleaks detect --source . --no-git --redact
          else
            echo "Skipping Gitleaks. Set RUN_OPTIONAL_SECURITY=true and install gitleaks to enable."
          fi
        '''
      }
    }

    stage('CI - Lint') {
      steps {
        sh 'npm run lint'
      }
    }

    stage('CI - Unit Tests with Coverage') {
      steps {
        sh 'npm test -- --ci --coverage --coverageReporters=text --coverageReporters=cobertura'
      }
      post {
        always {
          junit testResults: 'junit.xml', allowEmptyResults: true
          archiveArtifacts artifacts: 'coverage/**', allowEmptyArchive: true, fingerprint: true
        }
      }
    }

    stage('CI - Dependency Scan') {
      steps {
        sh '''
          if [ "${RUN_OPTIONAL_SECURITY}" = "true" ] && command -v trivy >/dev/null 2>&1; then
            trivy fs --severity HIGH,CRITICAL --exit-code 1 --format table .
          else
            echo "Skipping Trivy filesystem scan. Set RUN_OPTIONAL_SECURITY=true and install trivy to enable."
          fi
        '''
      }
    }

    stage('CI - SAST') {
      when {
        anyOf {
          changeRequest target: 'develop'
          changeRequest target: 'staging'
          branch 'develop'
          branch 'staging'
        }
      }
      steps {
        sh '''
          if [ "${RUN_OPTIONAL_SECURITY}" = "true" ] && command -v semgrep >/dev/null 2>&1; then
            semgrep scan --config auto .
          else
            echo "Skipping Semgrep. Set RUN_OPTIONAL_SECURITY=true and install semgrep to enable."
          fi
        '''
      }
    }

    stage('CI - Build Docker Image') {
      steps {
        sh 'docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .'
      }
    }

    stage('CI - Dockerfile Lint') {
      when {
        anyOf {
          changeRequest target: 'staging'
          branch 'staging'
        }
      }
      steps {
        sh '''
          if [ "${RUN_OPTIONAL_SECURITY}" = "true" ] && command -v hadolint >/dev/null 2>&1; then
            hadolint Dockerfile
          else
            echo "Skipping Hadolint. Set RUN_OPTIONAL_SECURITY=true and install hadolint to enable."
          fi
        '''
      }
    }

    stage('CI - Container Image Scan') {
      when {
        anyOf {
          changeRequest target: 'staging'
          branch 'develop'
          branch 'staging'
        }
      }
      steps {
        sh '''
          if [ "${RUN_OPTIONAL_SECURITY}" = "true" ] && command -v trivy >/dev/null 2>&1; then
            trivy image --severity HIGH,CRITICAL --exit-code 1 ${IMAGE_NAME}:${IMAGE_TAG}
          else
            echo "Skipping Trivy image scan. Set RUN_OPTIONAL_SECURITY=true and install trivy to enable."
          fi
        '''
      }
    }

    stage('CI - Generate SBOM') {
      when {
        anyOf {
          changeRequest target: 'staging'
          changeRequest target: 'main'
          changeRequest target: 'prod'
          branch 'staging'
          branch 'main'
          branch 'prod'
        }
      }
      steps {
        sh '''
          if command -v syft >/dev/null 2>&1; then
            syft ${IMAGE_NAME}:${IMAGE_TAG} -o cyclonedx-json > sbom.json
          else
            echo '{"note":"Syft not installed. SBOM skipped."}' > sbom.json
          fi
        '''
        archiveArtifacts artifacts: 'sbom.json', fingerprint: true
      }
    }

    /* ============================================================
       CD: merge to develop deploys development
       ============================================================ */

    stage('DEV - Deploy') {
      when {
        allOf {
          branch 'develop'
          not { changeRequest() }
        }
      }
      steps {
        sh './scripts/deploy-compose.sh dev'
      }
    }

    stage('DEV - Smoke Test') {
      when {
        allOf {
          branch 'develop'
          not { changeRequest() }
        }
      }
      // steps {
      //   sh 'npm run smoke:dev'
      // }
      steps {
        sh 'node scripts/smoke.js http://host.docker.internal:3001/health'
      }
    }

    /* ============================================================
       CD: merge to staging deploys staging and runs full validation
       ============================================================ */

    stage('STAGING - Deploy') {
      when {
        allOf {
          branch 'staging'
          not { changeRequest() }
        }
      }
      steps {
        sh './scripts/deploy-compose.sh staging'
      }
    }

    stage('STAGING - API Tests') {
      when {
        allOf {
          branch 'staging'
          not { changeRequest() }
        }
      }
      // steps {
      //   sh '''
      //     node scripts/smoke.js http://localhost:3002/health
      //     curl -fsS http://localhost:3002/ | tee staging-root-response.json
      //   '''
      //   archiveArtifacts artifacts: 'staging-root-response.json', fingerprint: true
      // }
      steps {
        sh '''
          node scripts/smoke.js http://host.docker.internal:3002/health
          curl -fsS http://host.docker.internal:3002/ | tee staging-root-response.json
        '''
        archiveArtifacts artifacts: 'staging-root-response.json', fingerprint: true
      }
    }

    stage('STAGING - DAST') {
      when {
        allOf {
          branch 'staging'
          not { changeRequest() }
        }
      }
      // steps {
      //   sh '''
      //     if [ "${RUN_OPTIONAL_SECURITY}" = "true" ] && command -v docker >/dev/null 2>&1; then
      //       docker run --rm --network host -v "$(pwd):/zap/wrk/:rw" ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
      //         -t http://localhost:3002 \
      //         -r zap-staging-report.html || true
      //     else
      //       echo "Skipping OWASP ZAP. Set RUN_OPTIONAL_SECURITY=true to enable."
      //     fi
      //   '''
      //   archiveArtifacts artifacts: 'zap-staging-report.html', allowEmptyArchive: true, fingerprint: true
      // }
      steps {
        sh '''
          if [ "${RUN_OPTIONAL_SECURITY}" = "true" ] && command -v docker >/dev/null 2>&1; then
            docker run --rm -v "$(pwd):/zap/wrk/:rw" ghcr.io/zaproxy/zaproxy:stable zap-baseline.py \
              -t http://host.docker.internal:3002 \
              -r zap-staging-report.html || true
          else
            echo "Skipping OWASP ZAP. Set RUN_OPTIONAL_SECURITY=true to enable."
          fi
        '''
        archiveArtifacts artifacts: 'zap-staging-report.html', allowEmptyArchive: true, fingerprint: true
      }
    }

    stage('STAGING - Performance Smoke Test') {
      when {
        allOf {
          branch 'staging'
          not { changeRequest() }
        }
      }
      steps {
        sh '''
          if [ "${RUN_OPTIONAL_SECURITY}" = "true" ] && command -v k6 >/dev/null 2>&1; then
            k6 run scripts/k6-smoke.js
          else
            echo "Skipping k6. Set RUN_OPTIONAL_SECURITY=true and install k6 to enable."
          fi
        '''
      }
    }

    stage('STAGING - Smoke Test') {
      when {
        allOf {
          branch 'staging'
          not { changeRequest() }
        }
      }
      // steps {
      //   sh 'npm run smoke:staging'
      // }
      steps {
        sh 'node scripts/smoke.js http://host.docker.internal:3002/health'
      }
    }

    /* ============================================================
       CD: PR to main/prod verifies evidence; merge deploys production
       ============================================================ */

    stage('PROD - Readiness Check') {
      when {
        anyOf {
          changeRequest target: 'main'
          changeRequest target: 'prod'
        }
      }
      steps {
        sh '''
          echo "Production readiness checks:"
          echo "- CI passed"
          echo "- Docker image built: ${IMAGE_NAME}:${IMAGE_TAG}"
          echo "- SBOM archived if Syft is installed"
          echo "- Verify staging approval and release notes in your Git provider/Jira"
        '''
      }
    }

    stage('PROD - Approval') {
      when {
        allOf {
          anyOf {
            branch 'main'
            branch 'prod'
          }
          expression { return params.DEPLOY_PRODUCTION }
          not { changeRequest() }
        }
      }
      steps {
        input message: 'Deploy to production?', ok: 'Deploy'
      }
    }

    stage('PROD - Deploy') {
      when {
        allOf {
          anyOf {
            branch 'main'
            branch 'prod'
          }
          expression { return params.DEPLOY_PRODUCTION }
          not { changeRequest() }
        }
      }
      steps {
        sh './scripts/deploy-compose.sh prod'
      }
    }

    stage('PROD - Smoke and Health Check') {
      when {
        allOf {
          anyOf {
            branch 'main'
            branch 'prod'
          }
          expression { return params.DEPLOY_PRODUCTION }
          not { changeRequest() }
        }
      }
      steps {
        sh 'npm run smoke:prod'
      }
    }
  }

  post {
    always {
      sh '''
        mkdir -p evidence
        echo "Build number: ${BUILD_NUMBER}" > evidence/build-info.txt
        echo "Source branch: ${SOURCE_BRANCH}" >> evidence/build-info.txt
        echo "Target branch: ${TARGET_BRANCH}" >> evidence/build-info.txt
        echo "Image: ${IMAGE_NAME}:${IMAGE_TAG}" >> evidence/build-info.txt
        echo "Commit: ${GIT_COMMIT}" >> evidence/build-info.txt
      '''
      archiveArtifacts artifacts: 'evidence/**', allowEmptyArchive: true, fingerprint: true
    }
    success {
      echo 'Pipeline completed successfully.'
    }
    failure {
      echo 'Pipeline failed. Check test, scan, deployment, and smoke-test logs.'
    }
  }
}
