# UNI:VERSE Market Risk Filter

UNI:VERSE 중고거래 **판매글 등록/수정 시** 제목과 설명을 검사하는 초기 위험문구 필터입니다.
채팅 실시간 감시용이 아닙니다.

## 구조

- TF-IDF: 문자 단위 `char_wb` 2~4 gram
- Logistic Regression 1: `NORMAL / BLOCK`
- Logistic Regression 2: BLOCK 사유 카테고리
- Rule Filter: 전화번호, 이메일, 메신저 링크, 긴 숫자열, 택배 표현 등 명확한 패턴
- 입력: `title + description`

카테고리:

- `EXTERNAL_MESSENGER`
- `CONTACT_INFO`
- `ADVANCE_PAYMENT`
- `ACCOUNT_INFO`
- `DELIVERY`
- `EXTERNAL_LINK`

## 파일

- `market_risk_guard.py`: 전처리, 우회표현 복원, 규칙, 추론
- `build_dataset.py`: 학습 데이터/하드케이스 생성
- `train_market_risk.py`: 재학습 + 평가 + pkl/config 저장
- `serve.py`: FastAPI 서버
- `data/market_dataset.csv`: 학습 데이터
- `data/hard_cases.csv`: 학습에 넣지 않는 평가 데이터
- `models/`: 저장된 TF-IDF/LR 모델과 config
- `reports/errors.csv`: 평가 오탐/미탐
- `tests/smoke_test.py`: 빠른 동작 확인

## 설치

Windows PowerShell / VSCode Terminal:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

PowerShell 실행 정책 때문에 Activate가 막히면 현재 터미널에서만:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

## 모델 재학습

```powershell
python train_market_risk.py
```

재학습이 끝나면 `models/*.pkl`, `models/config.json`, `reports/errors.csv`, `data/market_dataset.csv`가 갱신됩니다.

## 로컬 Smoke Test

```powershell
python tests/smoke_test.py
```

모든 케이스가 PASS면 기본 추론 경로가 정상입니다.

## FastAPI 실행

```powershell
uvicorn serve:app --reload --host 127.0.0.1 --port 8000
```

브라우저:

- Swagger: `http://127.0.0.1:8000/docs`
- Health: `http://127.0.0.1:8000/health`

`POST /predict` 테스트 입력:

```json
{
  "title": "아이패드 에어 판매",
  "description": "상태 좋습니다. 카톡으로 연락주세요."
}
```

예상: `BLOCK`, `EXTERNAL_MESSENGER`

정상 예시:

```json
{
  "title": "아이패드 에어 판매",
  "description": "생활기스 조금 있고 학교 정문에서 직거래 가능합니다."
}
```

예상: `NORMAL`

## Spring Boot 연동

Spring Boot의 `/api/v1/ai/risk/analyze`가 이 FastAPI의 `POST /predict`를 WebClient로 호출하도록 연결하면 됩니다.
클라이언트가 FastAPI를 직접 호출하지 않고, Spring Boot가 중간에서 인증/비즈니스 정책을 담당하는 구조를 권장합니다.

## 주의

현재 데이터는 템플릿 기반 합성 데이터가 중심입니다. 평가 점수는 실서비스 전체 정확도를 의미하지 않습니다.
실제 판매글/신고 데이터가 쌓이면 개인정보 제거 및 라벨 검수 후 데이터셋을 보강하고 재학습해야 합니다.
