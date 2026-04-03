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

        stage('Test') {
            steps {
                echo '🧪 Verificando que la API responde...'
                sh 'curl -f http://host.docker.internal:8000/health'
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