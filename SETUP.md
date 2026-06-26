# Jenkins CI/CD Demo App

```bash
# Separate Docker folder

# Delete is existing and has changes
docker rm -f jenkins-cicd

# Build Jenkins image
docker build -t jenkins-node-docker .

# Rebuild Jenkins image
docker build --no-cache -t jenkins-node-docker .

# Run Jenkins
docker run -d --name jenkins-cicd --user root -p 8080:8080 -v jenkins_home:/var/jenkins_home -v //var/run/docker.sock:/var/run/docker.sock jenkins-node-docker

# -p 50000:50000 -> for Jenkins inbound agents
# -p 8080:8080 -> for the Jenkins web UI

# Open Jenkins
http://localhost:8080

# Get initial admin password
docker exec jenkins-cicd cat //var/jenkins_home/secrets/initialAdminPassword
6a6f598c2eed42218db98234836fde64

# Jenkins can run docker
docker exec -it jenkins-cicd bash
root@9a1865cca09b:/# node -v
root@9a1865cca09b:/# npm -v
root@9a1865cca09b:/# docker version
root@9a1865cca09b:/# docker compose version
root@9a1865cca09b:/# exit

docker exec jenkins-cicd syft version
```

```bash
# Docker commands

# List docker
docker ps -a

# Start container
docker start jenkins-cicd

# Delete container
docker rm -f jenkins-cicd

# Delete volume
docker volume rm jenkins_home
```

```bash
# groovy
sh './scripts/deploy-compose.sh dev'

# Do this
git update-index --chmod=+x scripts/deploy-compose.sh
git add scripts/deploy-compose.sh
git commit -m "Make deploy script executable"
git push

# Run trivy dependency scan
MSYS_NO_PATHCONV=1 docker run --rm -v "$(pwd -W):/project" aquasec/trivy fs --severity HIGH,CRITICAL --exit-code 1 --format table /project | tee trivy-dependency-report.txt

MSYS_NO_PATHCONV=1 docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy image --severity HIGH,CRITICAL --exit-code 1 --format table jenkins-cicd-demo:test
```
