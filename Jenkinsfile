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
                echo '🔥 Smoke test...'
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
                echo '📈 Load test con reporte...'
                sh '''
                    mkdir -p k6/reports
                    k6 run k6/reporter.js \
                      --env BASE_URL=http://host.docker.internal:8000 \
                      --out influxdb=http://host.docker.internal:8086/k6
                '''
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
                echo '💥 Stress test...'
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
        always {
            script {
                def reportFile = 'k6/reports/report.html'
                if (fileExists(reportFile)) {
                    emailext(
                        to: 'newprojectcv.1999@gmail.com',
                        subject: "k6 Performance Report - Build #${env.BUILD_NUMBER} - ${currentBuild.result}",
                        body: """
                            <h2>🚀 Reporte de Performance</h2>
                            <p><b>Build:</b> #${env.BUILD_NUMBER}</p>
                            <p><b>Estado:</b> ${currentBuild.result}</p>
                            <p><b>Rama:</b> ${env.GIT_BRANCH}</p>
                            <p>Ver reporte completo en el adjunto.</p>
                        """,
                        attachmentsPattern: 'k6/reports/report.html',
                        mimeType: 'text/html'
                    )
                }
            }
        }
        failure {
            echo '❌ Algo salió mal!'
        }
        success {
            echo '🚀 Todo salió perfecto!'
        }
    }
}