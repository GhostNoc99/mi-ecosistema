pipeline {
    agent any

    triggers {
        cron('0 2 * * *')
    }

    parameters {
        booleanParam(name: 'RUN_STRESS', defaultValue: false, description: 'Correr stress test manualmente')
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

        stage('Smoke Test') {
            steps {
                echo '🔥 Smoke test — sanidad básica...'
                sh 'k6 run k6/smoke-test.js --env BASE_URL=http://host.docker.internal:8000'
            }
        }

        stage('Load Test') {
            when {
                anyOf {
                    branch 'main'
                    expression { env.GIT_BRANCH == 'origin/main' }
                }
            }
            steps {
                echo '📈 Load test — carga normal...'
                sh 'k6 run k6/load-test.js --env BASE_URL=http://host.docker.internal:8000'
            }
        }

        stage('Stress Test') {
            when {
                anyOf {
                    triggeredBy 'TimerTrigger'
                    expression { params.RUN_STRESS == true }
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