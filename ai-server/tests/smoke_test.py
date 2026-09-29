from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from market_risk_guard import MarketRiskGuard


def main():
    guard = MarketRiskGuard(ROOT / "models")
    cases = [
        ("아이패드 판매", "생활기스 조금 있고 학교 정문에서 직거래 가능합니다.", "NORMAL"),
        ("전공책 판매", "필기 거의 없고 중앙도서관 앞 직거래만 가능합니다.", "NORMAL"),
        ("라인프렌즈 인형", "브라운 인형 판매합니다. 상태 깨끗합니다.", "NORMAL"),
        ("아이패드 판매", "카톡 아이디 uni123으로 연락주세요.", "BLOCK"),
        ("책 판매", "예약 원하시면 선입금 2만원 먼저 보내주세요.", "BLOCK"),
        ("에어팟 판매", "직거래는 어렵고 택배만 가능합니다.", "BLOCK"),
    ]
    failed = 0
    for title, desc, expected in cases:
        r = guard.predict(f"{title}\n{desc}")
        ok = r["label"] == expected
        print(("PASS" if ok else "FAIL"), expected, "->", r)
        failed += 0 if ok else 1
    if failed:
        raise SystemExit(f"{failed} smoke tests failed")
    print("All smoke tests passed")


if __name__ == "__main__":
    main()
