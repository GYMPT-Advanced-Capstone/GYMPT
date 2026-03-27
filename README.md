# GYMPT

> AI 기반 실시간 운동 자세 분석 코칭 시스템

## 기술 스택

| 영역 | 기술                                  |
|------|-------------------------------------|
| Frontend | Vite + React, MediaPipe, TypeScript |
| Backend | FastAPI, SQLAlchemy, Python 3.11+   |
| Database | TiDB Cloud (MySQL 호환)               |
| 실시간 통신 | WebSocket / REST API               |
| 컨테이너 | Docker, Docker Compose              |
| CI/CD | GitHub Actions, Docker Hub          |
| 코드 품질 | Codecov, CodeRabbit, Ruff, Vitest   |
| 모니터링 | Prometheus, Loki, Promtail, Grafana |

## 브랜치 전략
```
main        ← 안정 릴리즈 (Docker Hub 배포)
staging     ← QA / 통합 테스트
develop     ← 개발 통합 브랜치
feature/*   ← 기능 개발
```

## 로컬 실행

### 사전 준비
- Docker Desktop 설치


### 메인 서비스 실행
```bash
docker compose -f docker/docker-compose.yml up -d
```

기본 운동 데이터 초기화:
```bash
docker compose -f docker/docker-compose.yml exec backend python -m app.scripts.seed_exercises
```

### 테스트용 백엔드/DB/Redis 실행
```bash
docker compose -f docker/docker-compose.test.yml up -d --build
```

테스트용 기본 운동 데이터 초기화:
```bash
docker compose -f docker/docker-compose.test.yml exec backend-test python -m app.scripts.seed_exercises
```

테스트용 Swagger:
```text
http://localhost:8001/docs
```

### 모니터링 스택 실행 (선택)
```bash
docker compose -f docker/docker-compose.monitoring.yml up -d
```

### 서비스 접속
| 서비스 | URL |
|--------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Grafana | http://localhost:3000 |

## CI/CD

| 트리거 | 실행 내용 |
|--------|-----------|
| `develop` push | lint + test (front & back) |
| `staging` / `main` push | lint + test |
| PR 오픈/업데이트 | lint + test + CodeRabbit 리뷰 |
| `main` push 성공 시 | Docker Hub 이미지 빌드 & 푸시 |
