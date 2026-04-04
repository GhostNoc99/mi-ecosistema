pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                echo '📥 Bajando código de GitHub...'
                checkout scm
            }
        }

        stage('Build') {
            steps {
                echo '🐳 Construyendo imagen Docker...'
                sh 'docker-compose build'
            }
        }

        stage('Health Check') {
            steps {
                echo '🧪 Verificando que la API responde...'
                sh 'curl -f http://host.docker.internal:8000/health'
            }
        }

        stage('Smoke Test k6') {
            steps {
                echo '🔥 Corriendo smoke test con k6...'
                sh 'k6 run k6/smoke-test.js --env BASE_URL=http://host.docker.internal:8000'
            }
        }

        stage('Load Test k6') {
            steps {
                echo '📈 Corriendo load test con k6...'
                sh 'k6 run k6/load-test.js --env BASE_URL=http://host.docker.internal:8000'
            }
        }

        stage('Done') {
            steps {
                echo '✅ Pipeline completado exitosamente!'
            }
        }
    }

    post {
        failure {
            echo '❌ Algo salió mal!'
        }
        success {
            echo '🚀 Todo salió perfecto!'
        }
    }
}