"""
UNI:VERSE 중고거래 판매글 위험문구 탐지 - 전처리 / 규칙 / 추론 모듈

흐름
    판매글 제목+설명 → 전처리(normalize + 우회표현 복원 + 신호 토큰) → TF-IDF → Logistic Regression
    → BLOCK 확률 → (규칙 결과와 합쳐) 최종 판정 반환

학습(노트북)과 추론(서빙)이 반드시 같은 전처리를 쓰도록
build_model_text() 하나만 공유한다.
"""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

import joblib
import numpy as np

# ---------------------------------------------------------------------------
# 1. 한글 자모 조합 (ㅋㅏㅋㅏㅇㅗ → 카카오)
# ---------------------------------------------------------------------------
CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"
JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ"
JONG = " ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ"
# 정식 복합모음 + 모양이 비슷해서 꼼수로 쓰는 조합(ㅕ+ㅣ=ㅖ 등)
VOWEL_MERGE = {
    ("ㅗ", "ㅏ"): "ㅘ", ("ㅗ", "ㅐ"): "ㅙ", ("ㅗ", "ㅣ"): "ㅚ",
    ("ㅜ", "ㅓ"): "ㅝ", ("ㅜ", "ㅔ"): "ㅞ", ("ㅜ", "ㅣ"): "ㅟ", ("ㅡ", "ㅣ"): "ㅢ",
    ("ㅏ", "ㅣ"): "ㅐ", ("ㅓ", "ㅣ"): "ㅔ", ("ㅕ", "ㅣ"): "ㅖ", ("ㅑ", "ㅣ"): "ㅒ",
}


def compose_jamo(s: str) -> str:
    """흩어진 호환 자모를 완성형 글자로 합친다. 'ㅋㅋ'처럼 모음이 없으면 그대로 둔다."""
    out, i, n = [], 0, len(s)
    while i < n:
        c = s[i]
        if c in CHO and i + 1 < n and s[i + 1] in JUNG:
            v, j = s[i + 1], i + 2
            if j < n and (v, s[j]) in VOWEL_MERGE:
                v = VOWEL_MERGE[(v, s[j])]
                j += 1
            f = ""
            if j < n and s[j] in JONG[1:] and not (j + 1 < n and s[j + 1] in JUNG):
                f = s[j]
                j += 1
            code = 0xAC00 + (CHO.index(c) * 21 + JUNG.index(v)) * 28 + (JONG.index(f) if f else 0)
            out.append(chr(code))
            i = j
        else:
            out.append(c)
            i += 1
    return "".join(out)


# ---------------------------------------------------------------------------
# 2. 문자 정규화 (특수 숫자, 폭 넓은 문자, 자모+알파벳 섞어쓰기)
# ---------------------------------------------------------------------------
ZERO_WIDTH = re.compile("[\u200b-\u200f\u2060\ufeff\u00ad\u180e]")
EMOJI = re.compile(
    "[\U0001F000-\U0001FAFF\u2600-\u27BF\u2B00-\u2BFF\uFE0F\u200d\u2661\u2665\u2764\u2606\u2605\u266A-\u266F]"
)
ROMAN_CONS = {  # 알파벳 자음 + 한글 모음 자모 → 한글 자음 (chㅐ → ㅊㅐ)
    "ch": "ㅊ", "kk": "ㄲ", "tt": "ㄸ", "pp": "ㅃ", "ss": "ㅆ", "jj": "ㅉ",
    "k": "ㅋ", "c": "ㅋ", "t": "ㅌ", "p": "ㅍ", "g": "ㄱ", "d": "ㄷ", "s": "ㅅ",
    "j": "ㅈ", "m": "ㅁ", "n": "ㄴ", "r": "ㄹ", "l": "ㄹ", "b": "ㅂ", "h": "ㅎ",
}
ROMAN_CONS_RE = re.compile(r"(ch|kk|tt|pp|ss|jj|[ktpgdsjmnrlbhc])(?=[ㅏ-ㅣ])", re.I)
# 자주 나오는 로마자+한글 혼합 표기 (op픈 = 오픈, gum색 = 검색)
ROMAN_FIX = {
    "op픈": "오픈", "o픈": "오픈", "0픈": "오픈", "open채팅": "오픈채팅", "open톡": "오픈톡",
    "gum색": "검색", "kum색": "검색", "ka톡": "카톡", "k톡": "카톡", "카talk": "카톡", "카tok": "카톡",
    "katok": "카톡", "katalk": "카톡", "kakaotalk": "카카오톡", "ka카오": "카카오", "카kao": "카카오",
    "tele그램": "텔레그램", "텔레gram": "텔레그램", "insta그램": "인스타그램",
    "라in": "라인", "la인": "라인", "디m": "디엠", "d엠": "디엠",
}


def normalize(text: str) -> str:
    t = unicodedata.normalize("NFC", str(text))
    # 호환 자모(ㄱ~ㅣ)는 NFKC를 거치면 다른 코드로 바뀌므로 제외하고 NFKC 적용
    #  → 전각/동그라미/위첨자/수학 굵은 숫자 등이 일반 숫자·영문으로 바뀜
    t = "".join(c if "\u3131" <= c <= "\u318e" else unicodedata.normalize("NFKC", c) for c in t)
    t = ZERO_WIDTH.sub("", t)
    # 취소선·밑줄 같은 결합 문자 제거 (1̶2̶3̶4̶ → 1234)
    t = "".join(c for c in t if unicodedata.category(c) not in ("Mn", "Me"))
    # 모양 꼼수: ㅅH → ㅅㅐ, ㅌl → ㅌㅣ, ㅕl → ㅕㅣ, 7ㅕ → ㄱㅕ, ㅣ0 → ㅣㅇ
    t = re.sub(r"(?<=[ㄱ-ㅎ])[Hh](?![a-z])", "ㅐ", t)
    t = ROMAN_CONS_RE.sub(lambda m: ROMAN_CONS[m.group(1).lower()], t)
    t = re.sub(r"(?<=[ㄱ-ㅎㅏ-ㅣ])[lI|1!]", "ㅣ", t)
    t = re.sub(r"7(?=[ㅏ-ㅣ])", "ㄱ", t)
    t = re.sub(r"(?<=[ㅏ-ㅣ])[0oO]", "ㅇ", t)
    t = compose_jamo(t)
    t = t.lower()
    for k, v in ROMAN_FIX.items():
        t = t.replace(k, v)
    # 숫자 사이의 알파벳 o / l → 0 / 1  (o1o-1234 → 010-1234)
    t = re.sub(r"o(?=\d)|(?<=\d)o", "0", t)
    t = re.sub(r"(?<=\d)[l|](?=\d)", "1", t)
    return t


# ---------------------------------------------------------------------------
# 3. 숫자 숨기기 복원 + 신호 토큰
# ---------------------------------------------------------------------------
HANGUL_CODE = "가나다라마바사아자차"  # 가=0, 나=1 ... 로 계좌를 적는 꼼수
HANGUL_CODE_RE = re.compile(r"(?:[가나다라마바사아자차카타파하][\-\.,~ ]?){7,}")
NUMWORD = {"공": "0", "영": "0", "일": "1", "이": "2", "삼": "3", "사": "4",
           "오": "5", "육": "6", "륙": "6", "칠": "7", "팔": "8", "구": "9"}
NUMWORD_RE = re.compile(r"(?:[공영일이삼사오육륙칠팔구0-9][\-\.,~ ]?){8,}")
DIGIT_SEP_RE = re.compile(r"(?<=\d)[^\w가-힣ㄱ-ㅣ\n]{1,5}(?=\d)")  # 1,234+5,678 / 333💕33
PHONE_RE = re.compile(r"(?<!\d)01[016789]\d{7,8}(?!\d)")
LONG_DIGITS_RE = re.compile(r"\d{10,}")
MSG_URL_RE = re.compile(
    r"(open\.kakao|pf\.kakao|kakao\.com|t\.me/|telegram\.(me|org)|line\.me|instagram\.com|"
    r"discord\.(gg|com)|facebook\.com|m\.me/|twitter\.com|x\.com/)"
)
URL_RE = re.compile(r"(https?://|www\.|[a-z0-9\-]+\.(com|net|kr|me|ly|io|co|gg|link|ee|org|shop)\b)")
EMAIL_RE = re.compile(r"[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}")
HANDLE_RE = re.compile(r"(?<![\w.])@[a-z0-9_.]{3,}")
COMPACT_RE = re.compile(r"[\s\.\-_,·*~/!?^@#$%&+=|:;'\"`()\[\]{}<>]+")
# 뒤집어 쓰기(톡카, 팅채픈오) 검사용: 정상 대화에서 거꾸로 나올 일이 거의 없는 단어만
REVERSE_KEYWORDS = {
    "카톡": "EXTERNAL_MESSENGER", "카카오톡": "EXTERNAL_MESSENGER", "오픈채팅": "EXTERNAL_MESSENGER",
    "오픈톡": "EXTERNAL_MESSENGER", "텔레그램": "EXTERNAL_MESSENGER", "인스타": "EXTERNAL_MESSENGER",
    "디엠": "EXTERNAL_MESSENGER", "라인아이디": "EXTERNAL_MESSENGER", "선입금": "ADVANCE_PAYMENT",
    "계좌번호": "ACCOUNT_INFO", "전화번호": "CONTACT_INFO", "택배": "DELIVERY", "반택": "DELIVERY",
}

MARKER_DESC = {
    "__phone__": "전화번호",
    "__longdigits__": "긴 숫자열(계좌/연락처 의심)",
    "__hangulcode__": "한글로 숨긴 숫자",
    "__numword__": "한글 숫자 표기",
    "__msgurl__": "메신저 링크",
    "__url__": "외부 링크",
    "__email__": "이메일",
    "__handle__": "@아이디",
    "__acro__": "앞글자 숨기기",
    "__reversed__": "거꾸로 쓰기",
}


def _decode_hangul_numbers(t: str, found: set) -> str:
    def code_sub(m):
        s = m.group(0)
        chars = [c for c in s if c in "가나다라마바사아자차카타파하"]
        if len(chars) < 7:
            return s
        found.add("__hangulcode__")
        return "".join(str("가나다라마바사아자차카타파하".index(c) % 10) for c in chars) + " "

    def word_sub(m):
        s = m.group(0)
        if sum(c in NUMWORD for c in s) < 2:
            return s
        found.add("__numword__")
        return "".join(NUMWORD.get(c, c) for c in s if c.isdigit() or c in NUMWORD) + " "

    t = HANGUL_CODE_RE.sub(code_sub, t)
    t = NUMWORD_RE.sub(word_sub, t)
    return t


def acrostic(text: str) -> str:
    """세 줄 이상인 메시지의 각 줄 첫 글자를 이어 붙인다 (오미자/픈픈/채널/팅팅 → 오픈채팅)."""
    lines = [ln.strip() for ln in str(text).split("\n") if ln.strip()]
    if len(lines) < 3:
        return ""
    return "".join(ln[0] for ln in lines)


def analyze(text: str) -> dict:
    """전처리 결과와 발견한 신호를 함께 돌려준다 (규칙 판정·설명용)."""
    raw = str(text)
    t = normalize(raw)
    found: set = set()

    if MSG_URL_RE.search(t):
        found.add("__msgurl__")
    if URL_RE.search(t):
        found.add("__url__")
    if EMAIL_RE.search(t):
        found.add("__email__")
    if HANDLE_RE.search(t):
        found.add("__handle__")

    t = _decode_hangul_numbers(t, found)
    digits_view = DIGIT_SEP_RE.sub("", t)
    if PHONE_RE.search(digits_view):
        found.add("__phone__")
    if LONG_DIGITS_RE.search(digits_view):
        found.add("__longdigits__")

    acro = normalize(acrostic(raw))
    compact = COMPACT_RE.sub("", digits_view)
    reversed_hits = [kw for kw in REVERSE_KEYWORDS if kw[::-1] in compact and kw not in compact]
    if reversed_hits:
        found.add("__reversed__")
    return {"normalized": digits_view, "acrostic": acro, "markers": found, "reversed_hits": reversed_hits}


def build_model_text(text: str) -> str:
    """TF-IDF에 들어가는 최종 문자열. 학습/추론 공통."""
    a = analyze(text)
    t = a["normalized"]
    t = PHONE_RE.sub(" __phone__ ", t)
    t = LONG_DIGITS_RE.sub(" __longdigits__ ", t)
    t = EMAIL_RE.sub(" __email__ ", t)
    t = EMOJI.sub(" ", t)
    t = re.sub(r"\d", "0", t)                       # 숫자 값 자체는 의미 없음 → 모양만 남김
    t = re.sub(r"[ \t]+", " ", t).strip()
    compact = COMPACT_RE.sub("", t)  # '카 톡', '카.톡', '카@톡' 같은 끼워넣기 꼼수 대응
    parts = [t.replace("\n", " "), compact]
    for kw in a.get("reversed_hits", []):
        parts.append(kw)
    if a["acrostic"]:
        parts.append("__acro__ " + a["acrostic"])
    for m in sorted(a["markers"]):
        parts.append(m)
    return " ".join(parts)


# ---------------------------------------------------------------------------
# 4. 규칙 기반 필터 (명확한 증거는 모델 확률과 상관없이 BLOCK)
#    기획서의 "관리자 위험문구 관리"를 붙일 때 ACRO_KEYWORDS / BANK_WORDS를 DB에서 불러오면 된다.
# ---------------------------------------------------------------------------
BANK_WORDS = re.compile(
    r"(은행|뱅크|뱅킹|국민|신한|우리|하나|농협|nh|kb|ibk|기업|토스|카뱅|케뱅|새마을|우체국|수협|"
    r"예금주|계좌|입금|송금|이체)"
)
# 직거래가 아닌 배송 거래를 뜻하는 게 분명한 표현 (택배 자체를 언급하는 정상 문장은 모델이 판단)
DELIVERY_RE = re.compile(
    r"(반택|반값택배|끼택|끼리택배|편의점택배|편택|준등기|택배거래|택배비|배송비|착불|운송장|"
    r"택배(로|도|만)?(가능|되|돼|보내|부쳐|부치|해주|해드|할게|해요|거래|접수|원해|부탁)|"
    r"배송(도|으로|이)?(가능|되|돼|해주|해드|원해|부탁))"
)
ACRO_KEYWORDS = {
    "오픈채팅": "EXTERNAL_MESSENGER", "오픈톡": "EXTERNAL_MESSENGER", "오챗": "EXTERNAL_MESSENGER",
    "카톡": "EXTERNAL_MESSENGER", "카카오": "EXTERNAL_MESSENGER", "라인": "EXTERNAL_MESSENGER",
    "텔레": "EXTERNAL_MESSENGER", "인스타": "EXTERNAL_MESSENGER", "디엠": "EXTERNAL_MESSENGER",
    "계좌": "ACCOUNT_INFO", "입금": "ADVANCE_PAYMENT", "선입금": "ADVANCE_PAYMENT",
    "택배": "DELIVERY", "반택": "DELIVERY", "전화": "CONTACT_INFO", "번호": "CONTACT_INFO",
    "연락처": "CONTACT_INFO",
}


def rule_check(text: str, a: dict | None = None) -> list[dict]:
    a = a or analyze(text)
    m, t = a["markers"], a["normalized"]
    hits = []
    if "__phone__" in m:
        hits.append({"rule": "PHONE_NUMBER", "category": "CONTACT_INFO"})
    if "__email__" in m:
        hits.append({"rule": "EMAIL", "category": "CONTACT_INFO"})
    if "__msgurl__" in m:
        hits.append({"rule": "MESSENGER_LINK", "category": "EXTERNAL_MESSENGER"})
    if "__hangulcode__" in m:
        hits.append({"rule": "HANGUL_ENCODED_NUMBER", "category": "ACCOUNT_INFO"})
    if "__longdigits__" in m and (BANK_WORDS.search(t) or re.search(r"\d{11,}", t)):
        hits.append({"rule": "ACCOUNT_NUMBER", "category": "ACCOUNT_INFO"})
    for kw in a.get("reversed_hits", []):
        hits.append({"rule": f"REVERSED:{kw}", "category": REVERSE_KEYWORDS[kw]})
        break
    dm = DELIVERY_RE.search(COMPACT_RE.sub("", t))
    if dm:
        hits.append({"rule": f"DELIVERY:{dm.group(0)}", "category": "DELIVERY"})
    for kw, cat in ACRO_KEYWORDS.items():
        if kw in a["acrostic"]:
            hits.append({"rule": f"ACROSTIC:{kw}", "category": cat})
            break
    return hits


# ---------------------------------------------------------------------------
# 5. 추론 클래스
# ---------------------------------------------------------------------------
class MarketRiskGuard:
    """
    guard = MarketRiskGuard("models")
    guard.predict("아이패드 판매합니다. 카톡으로 연락주세요")
    """

    def __init__(self, model_dir: str | Path = "models", threshold: float | None = None):
        d = Path(model_dir)
        self.vectorizer = joblib.load(d / "tfidf_vectorizer.pkl")
        self.model = joblib.load(d / "fraud_classifier.pkl")
        cat_path = d / "category_classifier.pkl"
        self.cat_model = joblib.load(cat_path) if cat_path.exists() else None
        cfg_path = d / "config.json"
        cfg = json.loads(cfg_path.read_text(encoding="utf-8")) if cfg_path.exists() else {}
        self.threshold = threshold if threshold is not None else cfg.get("threshold", 0.5)
        self.feature_names = self.vectorizer.get_feature_names_out()
        self.coef = self.model.coef_[0]

    # 한 문장 확률
    def _proba(self, text: str):
        x = self.vectorizer.transform([build_model_text(text)])
        return float(self.model.predict_proba(x)[0, 1]), x

    def _detected_terms(self, x, k: int = 5) -> list[str]:
        row = x.tocoo()
        contrib = [(self.coef[j] * v, self.feature_names[j]) for j, v in zip(row.col, row.data)]
        contrib = sorted([c for c in contrib if c[0] > 0], reverse=True)
        marker_words = [mk.strip("_") for mk in MARKER_DESC]
        word_terms, char_terms = [], []
        for _, name in contrib:
            kind, term = name.split("__", 1) if "__" in name else ("", name)
            term = term.strip()
            if term in MARKER_DESC:
                word_terms.append(MARKER_DESC[term])
                continue
            if "_" in term or len(term) < 2:
                continue
            if re.fullmatch(r"[a-z]+", term) and any(term in mw for mw in marker_words):
                continue  # 'hon', 'digi' 같은 신호 토큰 조각
            (word_terms if kind == "word" else char_terms).append(term)
        terms = []
        for term in word_terms + char_terms:  # 단어 특징을 먼저 보여주고 부족하면 글자 특징
            if any(term in t or t in term for t in terms):
                continue
            terms.append(term)
            if len(terms) >= k:
                break
        return terms

    def _category(self, x, rules):
        if rules:
            return rules[0]["category"]
        if self.cat_model is None:
            return None
        return str(self.cat_model.predict(x)[0])

    def predict(self, text: str) -> dict:
        a = analyze(text)
        prob, x = self._proba(text)
        rules = rule_check(text, a)
        is_block = bool(rules) or prob >= self.threshold
        return {
            "label": "BLOCK" if is_block else "NORMAL",
            "probability": round(prob, 4),
            "threshold": self.threshold,
            "category_hint": self._category(x, rules) if is_block else None,
            "detected_terms": self._detected_terms(x) if is_block else [],
            "rule_hits": [r["rule"] for r in rules],
        }
