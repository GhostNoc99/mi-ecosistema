pipeline {
    agent any

    // 🌙 Stress test automático cada noche a las 2am
    triggers {
        cron('0 2 * * *')
    }

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

        // ✅ Siempre corre — cualquier rama, cualquier push
        stage('Smoke Test') {
            steps {
                echo '🔥 Smoke test — sanidad básica...'
                sh 'k6 run k6/smoke-test.js --env BASE_URL=http://host.docker.internal:8000'
            }
        }

        // ✅ Solo corre en rama main
        stage('Load Test') {
            when { branch 'main' }
            steps {
                echo '📈 Load test — carga normal...'
                sh 'k6 run k6/load-test.js --env BASE_URL=http://host.docker.internal:8000'
            }
        }

        // 🌙 Solo corre en el cron nocturno
        stage('Stress Test') {
            when {
                anyOf {
                    triggeredBy 'TimerTrigger'
                }
            }
            steps {
                echo '💥 Stress test — prueba de límites...'
                sh 'k6 run k6/stress-test.js --env BASE_URL=http://host.docker.internal:8000'
            }
        }

        stage('Done') {
            steps {
                echo '✅ Pipeline completado!'
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