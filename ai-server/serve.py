"""UNI:VERSE 중고거래 판매글 위험문구 분석 FastAPI 서버."""
from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from pydantic import BaseModel, Field

from market_risk_guard import MarketRiskGuard

ROOT = Path(__file__).resolve().parent
MODEL_DIR = ROOT / "models"
guard = MarketRiskGuard(MODEL_DIR)

app = FastAPI(title="UNI:VERSE Market Risk API", version="2.0.0")

CATEGORY_MESSAGE = {
    "EXTERNAL_MESSENGER": "외부 메신저로 이동을 유도하는 표현이 포함되어 있습니다. UNI:VERSE 안에서 거래를 진행해주세요.",
    "CONTACT_INFO": "전화번호·이메일 등 외부 연락처 교환을 유도하는 표현이 포함되어 있습니다.",
    "ADVANCE_PAYMENT": "선입금을 요구하는 표현이 포함되어 있습니다. 물건을 확인한 뒤 결제해주세요.",
    "ACCOUNT_INFO": "계좌 공유 또는 사전 계좌이체를 유도하는 표현이 포함되어 있습니다.",
    "DELIVERY": "UNI:VERSE 중고거래는 교내 직거래를 기준으로 합니다. 택배·배송 유도 표현을 수정해주세요.",
    "EXTERNAL_LINK": "외부 결제·거래 링크를 유도하는 표현이 포함되어 있습니다.",
}


class PredictRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=150, description="중고거래 판매글 제목")
    description: str = Field(..., min_length=1, description="중고거래 판매글 설명")


class PredictResponse(BaseModel):
    label: str
    probability: float
    threshold: float
    category_hint: str | None
    detected_terms: list[str]
    rule_hits: list[str]
    message: str | None = None


@app.get("/health")
def health():
    return {"status": "ok", "purpose": "market_listing_risk_filter", "threshold": guard.threshold}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    text = f"{req.title}\n{req.description}"
    result = guard.predict(text)
    result["message"] = CATEGORY_MESSAGE.get(result["category_hint"]) if result["label"] == "BLOCK" else None
    return result
