"""
UNI:VERSE 판매글 위험 메시지 학습 데이터 생성기

- 문장 틀(template) + 슬롯 값 조합으로 판매글 말투 데이터를 만든다.
- 각 행에 group(= 문장 틀 id)을 붙여 둔다.
  → 같은 틀에서 나온 변형이 train/test에 동시에 들어가면 점수가 부풀기 때문에
    노트북에서 GroupShuffleSplit으로 틀 단위로 나눈다.
- 말투 변형(ㅎㅎ, ~, 이모지, 띄어쓰기 생략, 반말)은 NORMAL/BLOCK 양쪽에 똑같이 적용한다.
  (한쪽에만 쓰면 모델이 'ㅎㅎ = 정상' 같은 엉뚱한 규칙을 배운다)

정책 (0 = NORMAL, 1 = BLOCK)
  BLOCK : 외부 메신저 유도(카톡/오픈판매글/라인/텔레그램/인스타·DM 등), 연락처 교환,
          선입금, 판매글에서 계좌번호 공유·계좌이체 조건 유도, 택배/배송 거래 전부, 외부 링크
  NORMAL: 직거래 약속, 상품 설명, 가격 흥정, "만나서 계좌이체도 돼요" 같은 현장 결제,
          위험 단어와 겹치지만 의미가 다른 말(라인프렌즈, 2호선 라인, 카카오맵 등)

실행: python build_dataset.py  →  data/market_dataset.csv
"""
from __future__ import annotations

import random
import re
from pathlib import Path

import pandas as pd

SEED = 42
rng = random.Random(SEED)

# ---------------------------------------------------------------------------
# 슬롯 값
# ---------------------------------------------------------------------------
MESSENGER = [
    "카톡", "카카오톡", "카카오", "까톡", "캌톡", "카톸", "카 톡", "카.톡", "카-톡", "ㅋㅌ", "ㅋㅏㅌㅗㄱ",
    "kakao", "katalk", "kakaotalk", "k톡", "카talk",
    "오픈판매글", "오픈톡", "오픈카톡", "오톡", "오챗", "오픈 판매글", "오픈판매글방", "오.픈.채.팅", "ㅇㅍㅊㅌ",
    "op픈chㅐㅌl0", "0픈톡", "open판매글", "오픈ㅊㅐㅌㅣㅇ", "오픈챗",
    "라인", "LINE", "Line", "라 인", "line", "ㄹㅏㅇㅣㄴ",
    "텔레그램", "텔레", "텔레 그램", "텔그", "telegram", "텔레그렘", "텔.레", "ㅌㄹㄱㄹ", "tele그램",
    "인스타", "인스타 DM", "인스타 디엠", "인스타그램", "인스타 dm", "insta", "인스타디엠", "인별",
    "디엠", "dm", "DM", "d.m", "페메", "페북 메신저", "디스코드", "디코", "discord", "위챗", "스냅챗",
    "트위터 dm", "엑스 dm", "네이버 톡톡", "왓츠앱", "당근 판매글", "번개장터 판매글", "중고나라 판매글",
    # 끼워넣기 / 뒤집기 / 영문 섞기
    "카, 톡", "톡, 카", "카@톡", "ka톡", "카#톡", "카/톡", "카~톡", "카ㅡ톡", "톡카", "k@톡", "카 카 오 톡",
    "라@인", "라,인", "인라", "텔@레", "텔,레,그,램", "그램텔레", "인@스타", "인.스.타", "디@엠", "엠디",
    "오@픈@채@팅", "팅채픈오", "오픈 톡", "오 픈 톡", "0pen톡", "open톡", "ㅇㅍㅌ",
]
MESSENGER_PARA = [  # 이름을 안 쓰고 돌려 말하기
    "노란색 판매글앱", "노란 말풍선 앱", "국민 메신저", "택시 지도 페이 다 하는 그 회사 메신저",
    "노란 톡", "노랑이 앱", "초록색 메신저", "일본에서 많이 쓰는 초록 메신저", "종이비행기 모양 메신저",
    "보안 좋다는 러시아 메신저", "사진 올리는 SNS 메시지", "게이머들 쓰는 보이스 판매글앱",
    "그 유명한 메신저", "다들 쓰는 그 앱", "대화방 링크로 들어가는 그거", "익명으로 들어가는 판매글방",
]
PLACES = [
    "학교 정문", "정문", "후문", "중앙도서관", "도서관 1층", "학생회관", "학관", "기숙사 정문", "생활관 로비",
    "공대 1호관", "인문관 로비", "경영관 앞", "학식당 앞", "체육관 앞", "본관 앞 벤치", "정문 버스정류장",
    "후문 CU 앞", "학교 앞 스타벅스", "정문 앞 이디야", "과학관 1층", "예술관 앞", "셔틀버스 정류장",
    "지하철역 2번 출구", "학교 앞 사거리", "중도 앞", "공학관 305호 앞",
]
TIMES = [
    "오늘 3시", "내일 오후 2시", "12시 반", "수업 끝나고 5시", "저녁 7시", "내일 점심", "모레 오전 10시",
    "지금", "10분 뒤", "4시 20분", "금요일 1시", "공강 시간", "6시쯤", "내일 아침 9시",
]
ITEMS = [
    "아이패드", "에어팟", "전공책", "자료구조 책", "갤럭시탭", "모니터", "키보드", "자전거", "패딩",
    "토익 교재", "전자사전", "공학용 계산기", "미니 냉장고", "노트북", "책상 스탠드", "후드티", "운동화",
    "기숙사 이불", "마우스", "애플펜슬",
]
NAMES = ["이지민", "김민수", "박서현", "최민재", "정하늘", "김도윤", "한유진", "오세훈", "윤서아", "강연주"]
BANKS = [
    "카카오뱅크", "카뱅", "카카오 뱅크", "ㅋㅏㅋㅏㅇㅗㅂㅐㅇㅋㅡ", "국민은행", "국민", "KB", "신한", "신한은행",
    "우리은행", "하나은행", "농협", "NH농협", "토스뱅크", "토스", "케이뱅크", "기업은행", "IBK", "새마을금고",
    "우체국", "카@오뱅크", "국X은행", "ㅋㅋㅇㅂ",
]
BANK_PARA = [
    "초콜릿 원료 이름 은행", "노란 은행", "파란 송금앱", "노란 판매글앱 회사 은행", "코코아 비슷한 이름 뱅크",
    "국민 이름 들어간 은행", "별 모양 로고 은행", "토끼 캐릭터 은행",
]
ACCOUNT_WORD = ["계좌", "계좌번호", "계 좌", "계.좌", "7ㅕl좌", "ㄱㅈ", "계쫘", "게좌", "개좌", "ㄱㅖ좌", "account", "계좌 번호"]
PREPAY_WORD = ["선입금", "선 입금", "선.입.금", "선입깅", "썬입금", "ㅅㅇㄱ", "선결제", "선송금", "입금 먼저", "먼저 입금", "예약금", "계약금"]
DELIVERY_WORD = [
    "택배", "택 배", "택.배", "탁배", "택빼", "ㅌㅂ", "반택", "반값택배", "끼택", "끼리택배", "편의점택배", "편택",
    "GS택배", "cu택배", "준등기", "등기", "우체국 택배", "퀵", "퀵서비스", "일반택배", "편의점 반값택배", "착불 택배",
]
URLS = [
    "open.kakao.com/o/sAbc12x", "t.me/uni_shop", "bit.ly/3xYz12", "http://safe-pay.kr/o/2931", "line.me/ti/p/abc12",
    "instagram.com/sell_uni", "linktr.ee/unishop", "naver.me/5Gx9aa", "https://pay-secure.shop/p/88",
    "www.univ-market.net", "discord.gg/abcd12",
]
COUNT_WORD = {1: "한개", 2: "두개", 3: "세개", 4: "네개", 5: "다섯개"}
SUPERS = "⁰¹²³⁴⁵⁶⁷⁸⁹"
CIRCLED = "⓪①②③④⑤⑥⑦⑧⑨"


def rand_id():
    base = rng.choice(["yeon", "minji", "uni", "sell", "jh", "dd", "soo", "hana", "ksy", "market", "book"])
    return base + rng.choice(["_", ".", ""]) + str(rng.randint(1, 9999))


def rand_digits(groups):
    return ["".join(str(rng.randint(0, 9)) for _ in range(g)) for g in groups]


def rand_account():
    """계좌번호를 여러 꼼수 형식으로 만든다."""
    groups = rng.choice([(3, 2, 6), (4, 4, 4), (6, 2, 6), (3, 6, 5), (3, 3, 6), (4, 2, 7)])
    parts = rand_digits(groups)
    digits = "".join(parts)
    style = rng.choice(["dash", "dash", "space", "plain", "emoji", "code", "word", "calc", "wide", "super",
                        "circled", "count", "dot", "strike"])
    if style == "strike":  # 취소선 1̶2̶3̶
        return " ".join("".join(c + "\u0336" for c in p) for p in parts)
    if style == "dash":
        return "-".join(parts)
    if style == "space":
        return " ".join(parts)
    if style == "plain":
        return digits
    if style == "dot":
        return ".".join(parts)
    if style == "emoji":
        e = rng.choice(["💕", "❤", "🙂", "⭐", "♡", "💕💕", "🐹"])
        return e.join(parts)
    if style == "code":  # 가=0 나=1 ...
        return "-".join("".join("가나다라마바사아자차"[int(c)] for c in p) for p in parts)
    if style == "word":
        return " ".join("".join("공일이삼사오육칠팔구"[int(c)] for c in p) for p in parts)
    if style == "calc":  # 계산기 꼼수 1,234+5,678+...
        chunks = [digits[i:i + 4] for i in range(0, len(digits), 4)]
        return "+".join(f"{c[:-3]},{c[-3:]}" if len(c) == 4 else c for c in chunks)
    if style == "wide":
        return "－".join("".join(chr(0xFF10 + int(c)) for c in p) for p in parts)
    if style == "super":
        return "".join(SUPERS[int(c)] for c in digits)
    if style == "circled":
        return "".join(CIRCLED[int(c)] for c in digits)
    # count: 3네개-2한개 ... (같은 숫자 반복을 말로)
    out, i = [], 0
    while i < len(digits):
        j = i
        while j < len(digits) and digits[j] == digits[i] and j - i < 4:
            j += 1
        n = j - i
        out.append(digits[i] if n == 1 else f"{digits[i]}{COUNT_WORD[n]}")
        i = j
    return " - ".join(out)


def rand_phone():
    a, b = rand_digits((4, 4))
    style = rng.choice(["dash", "plain", "space", "word", "o", "emoji", "dot", "wide", "mixed"])
    if style == "dash":
        return f"010-{a}-{b}"
    if style == "plain":
        return f"010{a}{b}"
    if style == "space":
        return f"010 {a} {b}"
    if style == "word":
        return "공일공 " + "".join("공일이삼사오육칠팔구"[int(c)] for c in a) + " " + "".join("공일이삼사오육칠팔구"[int(c)] for c in b)
    if style == "o":
        return f"o1o-{a}-{b}"
    if style == "emoji":
        return f"010💕{a}💕{b}"
    if style == "dot":
        return f"010.{a}.{b}"
    if style == "wide":
        return "０１０－" + "".join(chr(0xFF10 + int(c)) for c in a) + "－" + "".join(chr(0xFF10 + int(c)) for c in b)
    return f"공1공-{a}-{b}"


SLOTS = {
    "MSG": lambda: rng.choice(MESSENGER),
    "PARA_MSG": lambda: rng.choice(MESSENGER_PARA),
    "ID": rand_id,
    "PHONE": rand_phone,
    "EMAIL": lambda: rand_id().replace(".", "") + rng.choice(["@naver.com", "@gmail.com", "@daum.net"]),
    "ACCT": rand_account,
    "BANK": lambda: rng.choice(BANKS),
    "PARA_BANK": lambda: rng.choice(BANK_PARA),
    "ACC": lambda: rng.choice(ACCOUNT_WORD),
    "PRE": lambda: rng.choice(PREPAY_WORD),
    "DEL": lambda: rng.choice(DELIVERY_WORD),
    "URL": lambda: rng.choice(URLS),
    "NAME": lambda: rng.choice(NAMES),
    "PLACE": lambda: rng.choice(PLACES),
    "PLACE2": lambda: rng.choice(PLACES),
    "TIME": lambda: rng.choice(TIMES),
    "ITEM": lambda: rng.choice(ITEMS),
    "PRICE": lambda: rng.choice(["1만원", "15000원", "2만", "3만 5천원", "30,000원", "5천원", "12만원", "8만", "40000원", "300,000원"]),
    "N": lambda: str(rng.choice([1, 2, 3, 5])),
    "PCT": lambda: str(rng.randint(80, 100)),
}

# ---------------------------------------------------------------------------
# 문장 틀  (category, [templates])
# ---------------------------------------------------------------------------
BLOCK_TEMPLATES = {
    "EXTERNAL_MESSENGER": [
        "{MSG}(으)로 연락주세요", "{MSG} 주세요", "{MSG} 있으세요?", "{MSG} 아이디 알려드릴게요",
        "{MSG}에서 얘기해요", "{MSG}(으)로 넘어가서 얘기할까요?", "여기 알림이 잘 안 와서 {MSG}(으)로 해요",
        "{MSG} 추가해주시면 사진 더 보내드릴게요", "{MSG} 친추 부탁드려요 아이디 {ID}",
        "아이디 {ID} 검색해서 {MSG} 추가해주세요", "제 {MSG} {ID}(이)에요", "{MSG} 하시나요?",
        "{MSG}(으)로 사진 보내드릴게요", "자세한 건 {MSG}에서 말씀드릴게요", "여기 말고 {MSG}(으)로 연락 가능하세요?",
        "{MSG} 프사 보시면 실물 사진 더 있어요", "{MSG} 방 파서 링크 드릴게요", "여기 불편해서 {MSG}(으)로 옮겨요",
        "여기 판매글 자꾸 끊겨서 {MSG}(이)가 편할 것 같아요", "{MSG} {ID}(으)로 메시지 주세요",
        "혹시 {MSG} 되세요? 그쪽이 편해서요", "제 프로필에 있는 {MSG}(으)로 연락주세요",
        "앱 알림이 늦어서 {MSG} 주시면 바로 답드려요", "구매하고 싶은데 혹시 {MSG} 있으신가요??",
        "{MSG}에 {ID}(이)라고 검색해보실래요?", "{MSG}(으)로 문의해주세요", "{MSG} 주시면 바로 연락드릴게요",
        "{MSG} 알려주세요", "{MSG}에서 봬요", "{MSG}(으)로 와요", "{MSG}에서 대화 이어가요", "{MSG}(으)로 얘기하실래요?",
        "{MSG}(으)로 사진 보내드릴게요 거기서 봐요", "{MSG} 아이디 보내드릴게요", "{MSG} 쓰세요?", "{MSG}에 {ID} 쳐보세요", "{MSG} 가능할까요?", "{MSG}(으)로 연락 가능할까요?", "{MSG} 괜찮으세요?", "{MSG}(으)로 대화해요 ㅎㅎ", "거래 관련은 {MSG}(으)로만 받아요",
        "{MSG} 친구추가 해주세요", "{MSG}(으)로 오세요 거기서 거래해요", "{ID} 이거 {MSG} 아이디에요",
        "그 {PARA_MSG} 있잖아요 거기로 연락주세요", "{PARA_MSG}(으)로 연락 주실 수 있나요?",
        "{PARA_MSG}에서 {ID} 찾아주세요", "그 {PARA_MSG}(으)로 시작하는 거기 아시죠? 거기서 얘기해요",
        "여기 말고 다른 데서 얘기해요", "여기서 말하기 좀 그래서 다른 곳으로 옮길까요?",
        "프로필 보시면 연락할 곳 있어요", "제 상태메시지에 있는 곳으로 연락주세요",
        "여기는 기록 남아서 다른 데서 얘기하는 게 편해요", "사진은 여기 말고 딴 데로 보내드릴게요",
        "다른 앱으로 넘어가서 얘기해요", "@{ID} 여기로 메시지 주세요", "{ID} 검색하면 나와요 거기로 와주세요",
    ],
    "CONTACT_INFO": [
        "{PHONE}(으)로 문자주세요", "번호 남길게요 {PHONE}", "전화번호 알려주시면 제가 연락드릴게요",
        "문자로 연락 주세요", "번호 주시면 전화드릴게요", "도착하면 {PHONE} 여기로 전화주세요",
        "번호 교환할까요?", "연락처 드릴게요 {PHONE}", "이메일 {EMAIL}(으)로 보내주세요",
        "{EMAIL} 여기로 연락주세요", "폰번호 알려주세요", "전화로 얘기하는 게 빠를 것 같아요 번호 주세요",
        "문자 주시면 바로 답해요", "제 번호는 {PHONE}", "연락처 남겨주시면 제가 문자드릴게요",
        "번호 불러주세요 제가 전화할게요", "통화 가능하세요? 번호 드릴게요",
        "문자 주세요", "문자로 얘기해요", "문자 한 통 주세요", "전화 한 통만 주세요", "번호 찍어주세요", "전화 주세요", "전화 가능해요?", "전화로 해요", "통화해요 그게 빨라요",
        "폰번 알려줘", "핸드폰 번호 알려주세요", "ㅈㅎㅂㅎ 주세요", "뭔자 주세요", "문짜 주셈", "전 화 주세요",
        "문,자 주세요", "번호 찍어드릴게요", "연락처 교환해요", "폰으로 연락드릴게요 번호요",
        "제 번호로 문자 남겨주세요 {PHONE}", "{PHONE}", "여기로 전화 {PHONE}", "보이스톡 해요", "페이스톡 가능?",
    ],
    "ADVANCE_PAYMENT": [
        "{PRE} 부탁드려요", "{PRE} 해주시면 챙겨둘게요", "먼저 보내주시면 물건 빼둘게요",
        "{PRE} {PRICE}만 먼저 보내주세요", "{PRE} 먼저 입금해주시면 다른 분들 거절할게요",
        "입금 확인되면 바로 보내드릴게요", "돈 먼저 보내주셔야 거래 가능해요", "{PRE} 해주시면 킵해둘게요",
        "반값만 먼저 보내주세요", "입금하시고 캡쳐 보내주세요", "{PRE} 받고 {DEL} 보내드립니다",
        "{ACC}(으)로 먼저 보내주세요", "입금자명 알려주시고 먼저 보내주세요", "송금 먼저요~",
        "{PRE} 가능하신 분만 연락주세요", "{PRE} 걸어주시면 예약 잡아드려요", "{PRE} 안 하시면 예약 안 받아요",
        "먼저 이체해주시면 내일 들고 갈게요", "돈 먼저 부쳐주시면 물건 챙겨서 나갈게요",
        "찜하신 분 많아서 {PRE} 주시는 분께 드려요", "입금 먼저 해주시면 확정이에요",
        "보내주시면 확인하고 연락드릴게요 {ACC} 알려드릴까요?", "{PRE} 먼저 해주시면 가격 맞춰드릴게요",
        "미리 보내주시면 딴 분 안 받을게요", "{PRE} 가능할까요?", "{PRE} 괜찮으세요?", "돈부터 보내주세요", "이체 먼저 해주셔야 들고 나가요",
    ],
    "ACCOUNT_INFO": [
        "{BANK} {ACCT} {NAME}(이)에요", "{ACC} {ACCT} {BANK}입니다", "예금주 {NAME} {BANK} {ACCT}",
        "{ACC} 알려드릴게요 {BANK} {ACCT}", "{ACC} 먼저 알려주세요", "{ACC} 미리 보내드릴게요",
        "{ACC}(으)로 하시면 {N}천원 빼드릴게요", "계좌이체로 하면 더 싸게 해드릴게요",
        "여기 말고 {ACC}(으)로 바로 하면 할인해드려요", "{BANK}(으)로 보내주시면 돼요 {ACCT}",
        "{ACCT}\n{BANK}\n{NAME}", "{ACCT} {BANK} 예금주 {NAME}", "{ACC} 그대로 보내면 정지먹어서 이렇게 보내요 {ACCT}",
        "그 {PARA_BANK}(으)로 보내주시면 돼요", "{PARA_BANK} {ACCT} 입니다", "예금주명 {NAME}(이)에요 {ACCT}",
        "{ACCT} 여기로 보내주세요", "{BANK} {ACCT}", "{ACC} 입력방식: 가나다라마바사아자차 순서대로 0~9 입니다",
        "{ACCT} 이거 {ACC}에요 {BANK}", "계좌로 쏴주시면 {N}천원 할인해드려요", "현금 말고 {ACC}이체 하시면 더 빼드려요",
        "{ACC} 보내드릴 테니 미리 이체해주세요", "{ACC} 문자로 보내드릴게요",
        "{ACC} 그대로 쓰면 막혀서 이렇게 보내요", "{ACC} 치면 정지당해서요 ㅠ", "{ACC} 쓰면 걸려서 돌려 말할게요",
        "{BANK} 쓰세요? 같은 은행이면 수수료 없어서요", "{ACC} 불러드릴게요", "{ACC} 사진으로 찍어 보낼게요",
        "{BANK}입니다", "{BANK}(이)에요~", "{BANK}입니둥", "은행은 {BANK}(이)에요", "{BANK} 쓰세요?",
        "{ACCT}", "받는 분 {NAME} {BANK}", "사진으로 {ACC} 보내드릴게요 {BANK}(이)에요",
    ],
    "DELIVERY": [
        "{DEL} 가능해요?", "{DEL}(으)로 보내주세요", "{DEL} 거래 돼요?", "{DEL} 되나요?",
        "{DEL}(으)로 해주세요", "{DEL}도 가능한가요??", "{DEL} 편의점 지점과 전화번호도 부탁드려요",
        "받으실 {DEL} 지점 알려주세요~~", "cu편의점 지점과 전화번호 부탁드려요~", "배송비 포함 {PRICE}입니다",
        "{DEL}비 제가 낼게요", "{DEL}(으)로 보내드릴게요", "배송지 주소 알려주세요", "주소 알려주시면 보내드릴게요",
        "운송장 번호 드릴게요", "직거래 어려우면 {DEL}(으)로 해요", "{DEL}만 가능해요", "직거래는 안 되고 {DEL}만요",
        "{DEL}비 포함 {PRICE}입니다", "착불로 보내드릴게요", "배송 가능한가요?", "보내주실 수 있나요? 제가 멀어서요",
        "{DEL} 접수했어요 내일 도착할 거예요", "gs 반값택배 이름 전화번호 지점명 알려주세요", "{DEL}(으)로 부쳐드릴게요",
        "배송비 따로 {PRICE}이에요", "주소랑 이름 보내주세요", "{DEL} 보내면 이틀 걸려요",
        "배송도 되나요?", "{DEL} 접수해드릴게요", "편의점에서 보내드릴게요", "부쳐주실 수 있어요?",
        "만나기 어려우니 {DEL}(으)로 부탁드려요", "{DEL} 가능할까요?", "{DEL}(으)로 가능할까요?",
        "{DEL} 거래 가능할까요?", "혹시 {DEL}도 가능할까요?", "{DEL} 괜찮으세요?", "{DEL} 어떠세요?", "직거래 말고 {DEL} 원해요", "{DEL}(으)로 받을게요 주소 드릴게요",
    ],
    "EXTERNAL_LINK": [
        "여기 링크에서 결제해주세요 {URL}", "이 사이트에서 안전결제 해주세요 {URL}", "{URL} 들어가서 주문해주세요",
        "링크 보내드릴게요 거기서 구매하시면 돼요 {URL}", "번개장터에 같은 거 올려놨어요 거기서 사주세요",
        "당근에 올린 거 있으니까 거기서 거래해요", "{URL} 여기로 들어오세요", "아래 주소로 들어가서 결제 부탁드려요 {URL}",
        "안전결제 링크 드릴게요 {URL}", "제 상점 링크에서 구매해주세요 {URL}",
    ],
}

NORMAL_TEMPLATES = {
    "MEETUP": [
        "{PLACE}에서 직거래 가능합니다", "{PLACE} 앞에서 {TIME}에 만나요", "{TIME} 괜찮으세요?", "{PLACE} 쪽 어떠세요?",
        "저 {TIME}까지 수업이라 그 이후에 가능해요", "도착하시면 여기 판매글 남겨주세요", "도착하면 연락주세요",
        "{PLACE}에서 봬요", "검은 패딩 입고 있을게요", "혹시 {PLACE} 말고 {PLACE2}도 가능하세요?",
        "5분 정도 늦을 것 같아요 죄송해요", "지금 {PLACE} 도착했어요", "어디쯤이세요?", "내일 공강이라 아무 때나 괜찮아요",
        "학교 정문에서 직거래 가능합니다", "{PLACE}에서 거래 가능할까요?", "그럼요~ {PLACE} 앞에서 가능하세요! 언제쯤 시간 되세요?",
        "{TIME}에 {PLACE}(으)로 갈게요", "직거래만 가능해요 {PLACE}에서요", "저 지금 출발해요", "먼저 도착하시면 조금만 기다려주세요",
        "{PLACE} 앞 벤치에 앉아 있을게요", "비 오니까 {PLACE} 안에서 만나요", "혹시 시간 바꿔도 될까요? {TIME} 어떠세요",
        "오 좋네요, {TIME} {PLACE}에서 거래 가능할까요?", "기숙사 살아서 {PLACE}(이)면 좋겠어요",
        "도착해서 여기로 판매글 드릴게요", "직거래 원해요 학교 안에서 만나요",
    ],
    "PRODUCT": [
        "상품 상태 좋고 사용감 조금 있습니다", "{ITEM} 아직 판매중이에요", "생활기스 조금 있어요", "필기 거의 없어요",
        "박스랑 충전기 다 있어요", "배터리 효율 {PCT}%에요", "한 학기만 썼어요", "사진 더 보내드릴까요?",
        "실물 사진 여기 올려드릴게요", "정품 맞아요 영수증 있어요", "구매한 지 1년 됐어요", "하자 없어요",
        "책 안에 밑줄 몇 개 있어요", "안녕하세요! {ITEM} 아직 판매중이에요 :)", "{ITEM} 상태 괜찮나요?",
        "혹시 {ITEM} 사진 한 장만 더 올려주실 수 있나요?", "21단이고 최근에 체인 교체했습니다!", "모서리 살짝 찍힘 있어요",
        "새 거나 다름없어요", "케이스 끼워서 써서 깨끗해요", "구성품 전부 있어요", "직접 보시고 결정하셔도 돼요",
        "{ITEM} 사이즈가 어떻게 되나요?", "작동 잘 돼요 만나서 확인해보세요",
        "사진 몇 장 더 여기 올려드릴게요", "여기 판매글에 사진 더 보내드릴게요", "제품 번호 확인해서 알려드릴게요",
        "사이즈 재서 알려드릴게요", "박스도 같이 챙겨드릴게요", "펜슬도 서비스로 넣어드릴게요", "설명서도 같이 드려요",
        "궁금하신 거 여기로 물어보세요", "필요하시면 파우치도 드릴게요", "모델명 알려드릴까요?", "만나서 직접 보여드릴게요", "충전기도 챙겨드릴게요", "영수증도 같이 드릴게요",
        "쇼핑백에 담아서 드릴게요", "케이스는 서비스로 드릴게요", "궁금한 거 있으면 여기로 물어봐주세요 답해드릴게요",
        "펜슬 팁 여분도 같이 넣어드릴게요", "작동하는 영상 찍어서 여기 올려드릴게요",
    ],
    "PRICE": [
        "{PRICE}에 가능할까요?", "혹시 네고 가능하세요?", "{N}천원만 깎아주실 수 있나요?", "그 가격이면 바로 살게요",
        "이미 최저가로 올린 거라 네고는 어려워요", "{PRICE}에 드릴게요", "학생이라 조금만 빼주세요 ㅠㅠ",
        "{PRICE} 괜찮으시면 오늘 거래해요", "가격 조정 가능합니다", "두 개 같이 사면 {PRICE}에 해드릴게요",
        "{PRICE}은 좀 어렵고 {PRICE} 어떠세요?", "올린 가격 그대로 할게요",
        "{N}천원 깎아드릴게요", "{N}천원 빼드릴게요 직거래니까요", "두 권 사시면 {N}천원 빼드려요", "현장에서 {N}천원 빼드릴게요",
        "{PRICE}(이)면 괜찮으실까요?", "에누리 조금 가능해요", "가격 더 내리긴 어려워요", "학생이니까 {PRICE}에 맞춰드릴게요", "오늘 오시면 {N}천원 빼드릴게요",
    ],
    "PAYMENT_ONSITE": [
        "만나서 계좌이체 할게요", "현금이나 계좌이체 둘 다 돼요", "계좌이체도 돼요", "현금 없으면 만나서 계좌로 보내주셔도 돼요",
        "현장에서 물건 확인하고 입금할게요", "만나서 바로 송금해드릴게요", "물건 보고 이체해드릴게요", "현금으로 준비해갈게요",
        "만나서 토스로 보내드려도 될까요?", "잔돈 없어서 만나서 계좌이체로 할게요", "만나서 물건 확인하시고 이체해주세요",
        "현금 결제만 되나요? 만나서 계좌이체는요?", "직접 보고 입금할게요", "만나서 보고 바로 쏴드릴게요",
        "계좌이체 할 거면 만나서 알려주세요", "현장에서 카카오페이 송금 괜찮으세요?", "현금 뽑아갈게요",
        "만나서 물건 받고 바로 입금할게요", "입금은 만나서 확인하고 할게요",
    ],
    "HARD_NEGATIVE": [
        "라인프렌즈 인형도 같이 드릴게요", "2호선 라인 타고 가요", "인스타360 카메라 아직 있나요?", "인스타 감성 사진 잘 나와요",
        "텔레비전 거치대도 있어요", "카카오프렌즈 키링 포함이에요", "카카오맵 보니까 10분 거리네요", "카카오T 택시 타고 갈게요",
        "택배 받으러 가야 해서 6시 이후에 돼요", "번호표 뽑고 기다리는 중이라 조금 늦어요",
        "학번이 몇이세요?", "버스 번호 몇 번 타세요?", "강의실 번호가 공학관 305호에요", "라인 안 맞으면 수선해서 입으세요",
        "텔레토비 인형이에요", "라인업 보고 샀던 앨범이에요", "선 정리 다 되어 있어요", "먼저 물건 확인하시고 결정하세요",
        "보내주신 사진 확인했어요", "라인 스티커 붙어 있던 거 떼어냈어요", "디스코드 굿즈 아니고 그냥 키보드예요",
        "인스타에서 보고 샀던 옷인데 사이즈가 안 맞아요", "카톡 테마 같은 거 말고 실물 굿즈예요", "오픈 기념으로 샀던 머그컵이에요",
        "배송 온 박스 그대로 있어요 미개봉이에요", "전화 올 수도 있어서 도착하면 판매글 주세요",
        "입금 확인 같은 거 없어요 그냥 만나서 주시면 돼요", "제 방 번호 말고 로비에서 봬요",
        "계좌 관련 질문은 만나서 하면 될 것 같아요", "텔레그램 말고 여기서 계속 얘기해요", "카톡 말고 여기서 얘기해요 그게 안전해요",
        "우체국 들렀다가 가서 조금 늦어요", "편의점 앞에서 만나요", "cu 앞에서 기다릴게요", "연락처 교환 없이 여기서 얘기해요",
        "문자 말고 여기 판매글으로 해주세요", "앱 알림 켜뒀으니 여기로 주세요",
        "라인 굿즈 쿠션이에요", "라인 예쁘게 떨어지는 코트예요", "인스타 광고 보고 산 거예요", "텔레토비 키링 같이 드려요",
        "오픈형 이어폰이에요", "오픈 이벤트 때 받은 텀블러예요", "카카오 캐릭터 인형이에요", "카카오페이지 보다가 산 굿즈예요",
        "우체국 앞에서 만나도 돼요", "배송 박스는 버렸어요", "택배 상자에 담아서 드릴게요 들고 가기 편하게",
        "선입견 없이 봐주세요 상태 좋아요", "번호순으로 정리된 전공책이에요", "전화 받느라 답장 늦었어요",
    ],
    "COMMON_VERB": [  # BLOCK 문장에 자주 나오는 동사를 정상 뜻으로 쓰는 문장 (모델이 '보내'만 보고 막지 않게)
        "사진 보내주세요", "실물 사진 한 장만 보내주세요", "사진 보내드릴게요", "영상 찍어서 보내드릴까요?", "좋은 하루 보내세요",
        "주말 잘 보내세요", "뒷면 사진도 보내주실 수 있나요?", "여기로 사진 보내주시면 확인할게요", "측면 사진 보내드렸어요",
        "도착 시간 알려주세요", "입고 계신 옷 색 알려주세요", "편하신 시간 알려주세요", "사이즈 알려주세요", "모델명 알려주세요",
        "위치 알려주세요", "몇 학번이신지 알려주세요", "어느 건물이신지 알려주세요",
        "잠시만 기다려주세요", "조금만 깎아주세요", "거래 완료 눌러주세요", "후기 부탁드려요", "확인 부탁드려요", "천천히 오세요",
        "오늘 거래 되나요?", "내일도 되나요?", "{TIME}에 되나요?", "{PLACE}에서 되나요?", "네고 되나요?", "교환은 안 되나요?",
        "먼저 도착하면 기다릴게요", "먼저 연락 주셔서 감사해요", "먼저 물어보신 분이 계셔서요", "먼저 오신 분께 드릴게요",
        "거기 정문 앞 맞죠?", "거기서 봬요", "거기 편의점 앞으로 갈게요", "여기로 답장 주세요", "판매글 주세요 바로 볼게요",
        "연락 주셔서 감사합니다", "연락 기다릴게요", "나중에 다시 연락드릴게요", "시간 확인하고 연락드릴게요",
        "{ITEM} 사이즈가 어떻게 되나요?", "이거 몇 년 쓰신 거예요?", "주세요! 살게요", "그걸로 주세요",
    ],
    "GENERAL": [
        "안녕하세요! 아직 판매중이에요 :)", "네 감사합니다", "좋은 하루 보내세요", "거래 감사합니다~", "넵!", "네? 네네..!.!!",
        "혹시 오늘 거래 가능하세요?", "내일 시험이라 모레 가능할까요?", "죄송해요 다른 분이랑 거래하기로 했어요", "후기 남겨드릴게요",
        "안녕하세요 {ITEM} 보고 연락드렸어요", "네 안녕하세요! 혹시 직거래 가능할까요?", "좋습니다! 그때 뵈어요~", "헉 감사합니다!!",
        "잠시만요 확인해볼게요", "혹시 아직 구매 의사 있으신가요?", "예약중으로 바꿔둘게요", "거래 완료 눌러주세요!",
        "오늘은 좀 어려울 것 같아요 ㅠ", "알겠습니다 조심히 오세요", "ㅋㅋㅋ 넵 알겠어요", "감사합니다 잘 쓸게요",
        "혹시 구매 의사 있으시면 말씀 주세요", "다른 분 연락 와서 먼저 여쭤봐요", "네 기다리고 있을게요",
        "답장 늦어서 죄송해요 수업 중이었어요", "물건 잘 쓰세요!", "확인했습니다~", "고민해보고 말씀드릴게요",
        "혹시 다른 색상도 있나요?", "이거 말고 다른 것도 파세요?", "사진으로 보니 상태 괜찮네요", "살게요!",
        "구매 확정할게요", "제가 먼저 연락드렸는데 혹시 가능할까요?", "시간 되실 때 답장 주세요",
    ],
}

# 사용자가 직접 준 정책 예시 (반드시 학습에 포함)
POLICY_EXAMPLES = [
    ("학교 정문에서 직거래 가능합니다", 0, "MEETUP"),
    ("상품 상태 좋고 사용감 조금 있습니다", 0, "PRODUCT"),
    ("카톡으로 연락주세요", 1, "EXTERNAL_MESSENGER"),
    ("라인 주세요", 1, "EXTERNAL_MESSENGER"),
    ("텔레그램으로 문의해주세요", 1, "EXTERNAL_MESSENGER"),
    ("인스타 디엠 주세요", 1, "EXTERNAL_MESSENGER"),
    ("선입금 받고 택배 보내드립니다", 1, "ADVANCE_PAYMENT"),
    ("계좌로 먼저 보내주세요", 1, "ADVANCE_PAYMENT"),
]

# 앞글자 숨기기용 단어장 (글자 → 그 글자로 시작하는 말)
ACRO_WORDS = {
    "오": ["오미자", "오늘도", "오리 인형", "오렌지 주스", "오후에 봐요"], "픈": ["픈픈픈픈", "픈 ㅋㅋ", "픈트"],
    "채": ["채널고정", "채소 먹기", "채점 끝"], "팅": ["팅팅탱탱후라이팬놀이", "팅커벨", "팅글"],
    "카": ["카레 먹고싶다", "카페 가요", "카메라"], "톡": ["톡톡 튀는", "톡쏘는 사이다"],
    "주": ["주말에", "주황색", "주문 완료"], "세": ["세상에", "세탁기", "세 시쯤"], "요": ["요거트", "요즘 바빠요"],
    "라": ["라면 먹자", "라디오", "라떼"], "인": ["인생 뭐있나", "인형 뽑기", "인사드려요"],
    "텔": ["텔레비전", "텔레파시"], "레": ["레몬", "레고 조립", "레알"], "그": ["그래도", "그림 그리기"], "램": ["램프", "램 16기가"],
    "계": ["계란말이", "계절학기", "계속 해요"], "좌": ["좌석 예약", "좌우명", "좌회전"],
    "선": ["선풍기", "선물 받은 거", "선배님"], "입": ["입학 선물", "입맛 없다"], "금": ["금요일에", "금방 가요"],
    "택": ["택시 타고", "택배 아님"], "배": ["배고파요", "배터리 좋음"], "디": ["디저트", "디자인 예뻐요"], "엠": ["엠티 가요", "엠씨"],
    "앞": ["앞글자만 봐주세요!", "앞글자 읽어주세요", "앞에만 보세요 ㅎㅎ"],
}
ACRO_TARGETS = ["오픈판매글", "카톡주세요", "카톡", "라인주세요", "텔레그램", "인스타", "계좌", "선입금", "택배", "디엠"]
ACRO_TARGET_CAT = {"오픈판매글": "EXTERNAL_MESSENGER", "카톡주세요": "EXTERNAL_MESSENGER", "카톡": "EXTERNAL_MESSENGER",
                   "라인주세요": "EXTERNAL_MESSENGER", "텔레그램": "EXTERNAL_MESSENGER", "인스타": "EXTERNAL_MESSENGER",
                   "디엠": "EXTERNAL_MESSENGER", "계좌": "ACCOUNT_INFO", "선입금": "ADVANCE_PAYMENT", "택배": "DELIVERY"}
ACRO_WORDS.setdefault("스", ["스터디 끝", "스벅 가요"])
ACRO_WORDS.setdefault("타", ["타코야끼", "타자 연습"])

NORMAL_MULTILINE = [
    ["상태 좋아요", "구매한 지 1년", "충전기 포함", "직거래만 가능해요"],
    ["안녕하세요!", "{ITEM} 아직 있어요", "{PLACE}에서 {TIME} 가능해요"],
    ["구성품", "- 본체", "- 케이스", "- 설명서"],
    ["네 좋아요", "{TIME}에 {PLACE}", "도착하면 판매글 주세요"],
    ["가격은 {PRICE}", "네고 조금 가능", "학교 안에서만 거래해요"],
    ["사진 보시면", "모서리 찍힘 하나 있고", "나머지는 깨끗해요"],
]

# ---------------------------------------------------------------------------
# 렌더링 도구
# ---------------------------------------------------------------------------
JOSA = {"(으)로": ("으로", "로"), "(이)에요": ("이에요", "에요"), "(을)를": ("을", "를"),
        "(이)랑": ("이랑", "랑"), "(은)는": ("은", "는"), "(이)가": ("이", "가"), "(이)라고": ("이라고", "라고"),
        "(이)나": ("이나", "나"), "(이)면": ("이면", "면")}


def _has_batchim(ch: str) -> bool | None:
    if "가" <= ch <= "힣":
        return (ord(ch) - 0xAC00) % 28 != 0
    return None


def fix_josa(s: str) -> str:
    for mark, (with_b, without_b) in JOSA.items():
        while mark in s:
            i = s.index(mark)
            prev = s[i - 1] if i > 0 else ""
            b = _has_batchim(prev)
            if mark == "(으)로" and b and (ord(prev) - 0xAC00) % 28 == 8:  # ㄹ 받침 + 로
                rep = "로"
            else:
                rep = with_b if b else without_b
            s = s[:i] + rep + s[i + len(mark):]
    return s


def render(tpl: str) -> str:
    s = re.sub(r"\{(\w+)\}", lambda m: SLOTS[m.group(1)](), tpl)
    return fix_josa(s)


CASUAL = [("주세요", "줘"), ("드릴게요", "줄게"), ("가능하세요?", "돼?"), ("할게요", "할게"), ("해요", "해"),
          ("있으세요?", "있어?"), ("입니다", "임"), ("괜찮으세요?", "괜찮아?"), ("부탁드려요", "부탁해")]
TAILS = ["", "", "", "~", "!", "!!", " ㅎㅎ", " ^^", " ㅠㅠ", " :)", " 😊", " 🙏", "~~", " ㅋㅋ", " 💕", "?"]
HEADS = ["", "", "", "", "혹시 ", "아 ", "안녕하세요! ", "네 ", "저기 ", "그럼 "]


def style(s: str) -> str:
    """말투 변형. NORMAL/BLOCK 양쪽에 똑같이 적용."""
    if rng.random() < 0.25:
        for a, b in CASUAL:
            if a in s and rng.random() < 0.7:
                s = s.replace(a, b)
    if rng.random() < 0.4:
        s = rng.choice(HEADS) + s
    if rng.random() < 0.5:
        s = s.rstrip() + rng.choice(TAILS)
    if rng.random() < 0.1:
        s = s.replace(" ", "")
    return s


def make_acrostic(target: str) -> str:
    lines = [rng.choice(ACRO_WORDS.get(ch, [ch + ch + ch])) for ch in target]
    if rng.random() < 0.7:
        lines += ["", rng.choice(ACRO_WORDS["앞"]) + rng.choice(["", " 연락드렸습니다!", " ㅎㅎ"])]
    return "\n".join(lines)


LISTING_CASES = [
    # 판매글 형식의 정상 예시
    ("아이패드 에어 5세대 판매합니다. 생활기스 조금 있고 학교 정문에서 직거래 가능합니다.", 0, "PRODUCT"),
    ("전공책 판매합니다. 필기 거의 없고 중앙도서관 앞 직거래만 가능합니다.", 0, "PRODUCT"),
    ("자전거 판매합니다. 최근 체인 교체했고 교내에서 직접 확인 후 거래 가능합니다.", 0, "PRODUCT"),
    ("에어팟 프로 판매합니다. 구성품 모두 있고 만나서 확인 후 계좌이체 가능합니다.", 0, "PAYMENT_ONSITE"),
    ("라인프렌즈 브라운 인형 판매합니다. 학교 정문 직거래 가능합니다.", 0, "HARD_NEGATIVE"),
    ("카카오프렌즈 라이언 인형 판매합니다. 상태 깨끗합니다.", 0, "HARD_NEGATIVE"),
    ("택배로 받은 새 상품이라 박스 있습니다. 거래는 교내 직거래만 합니다.", 0, "HARD_NEGATIVE"),
    ("카톡 같은 외부 메신저는 사용하지 않습니다. UNI:VERSE에서만 연락해주세요.", 0, "HARD_NEGATIVE"),
    # 판매글 형식의 위험 예시
    ("아이패드 판매합니다. 카톡 아이디 uni123으로 연락주세요.", 1, "EXTERNAL_MESSENGER"),
    ("전공책 판매합니다. 오픈채팅 링크로 문의해주세요.", 1, "EXTERNAL_MESSENGER"),
    ("예약 원하시면 선입금 2만원 먼저 보내주세요.", 1, "ADVANCE_PAYMENT"),
    ("국민은행 계좌로 먼저 입금하시면 거래 확정해드립니다.", 1, "ACCOUNT_INFO"),
    ("직거래는 어렵고 택배만 가능합니다. 배송비 별도입니다.", 1, "DELIVERY"),
    ("안전결제 링크 보내드릴게요. 링크에서 결제해주세요.", 1, "EXTERNAL_LINK"),
]


def generate(per_template_block: int = 8, per_template_normal: int = 16) -> pd.DataFrame:
    rows = []

    def add(text, label, cat, group, source="template"):
        rows.append({"text": text, "label": label, "category": cat, "group": group, "source": source})

    for cat, tpls in BLOCK_TEMPLATES.items():
        for i, tpl in enumerate(tpls):
            n = per_template_block * (2 if any(k in tpl for k in ("{MSG}", "{ACCT}", "{DEL}", "{PRE}")) else 1)
            for _ in range(n):
                add(style(render(tpl)), 1, cat, f"B_{cat}_{i}")

    for cat, tpls in NORMAL_TEMPLATES.items():
        for i, tpl in enumerate(tpls):
            n = per_template_normal * (2 if "{" in tpl else 1)
            for _ in range(n):
                add(style(render(tpl)), 0, cat, f"N_{cat}_{i}")

    # 앞글자 숨기기 (목표 단어별로 group)
    for tgt in ACRO_TARGETS:
        for _ in range(14):
            add(make_acrostic(tgt), 1, ACRO_TARGET_CAT[tgt], f"B_ACRO_{tgt}")
    # 정상 여러 줄 메시지 (여러 줄 = 위험 이라고 배우지 않게)
    for i, lines in enumerate(NORMAL_MULTILINE):
        for _ in range(14):
            add("\n".join(render(l) for l in lines), 0, "MULTILINE", f"N_MULTI_{i}")

    for text, label, cat in POLICY_EXAMPLES:
        for _ in range(3):
            add(style(text), label, cat, "POLICY")

    # 판매글 등록/수정 시 실제 입력 형태를 반영한 보강 데이터
    for i, (text, label, cat) in enumerate(LISTING_CASES):
        for j in range(4):
            add(style(text), label, cat, f"LISTING_{i}", "listing")

    # 이전 평가에서 발견한 오탐·미탐 보강 사례
    for text, label, cat, source in ERROR_CASES:
        add(text, label, cat, "ERROR_CASE", source)

    df = pd.DataFrame(rows).drop_duplicates(subset=["text"]).reset_index(drop=True)
    df.insert(0, "id", range(1, len(df) + 1))
    return df


# ---------------------------------------------------------------------------
# 평가 전용 하드 케이스 (학습에 절대 넣지 않음)
#  - 문장 틀과 다른 표현으로 손으로 쓴 문장 + 실제 커뮤니티에 돌던 꼼수(스크린샷)
#  - 템플릿 test 점수는 "비슷한 말"에 대한 점수, 이 점수는 "처음 보는 말"에 대한 점수
# ---------------------------------------------------------------------------
ERROR_CASES = [
    ("오픈 카톡방 들어오시면 사진 더 있어요", 1, "EXTERNAL_MESSENGER", "error_fn"),
    ("반만 미리 쏴주시면 안 팔고 기다릴게요", 1, "ADVANCE_PAYMENT", "error_fn"),
    ("전화는 어렵고 여기로 메시지 주세요", 0, "HARD_NEGATIVE", "error_fp"),
    ("배터리 성능 91퍼에요 충전기도 드려요", 0, "PRODUCT", "error_fp"),
]

HARD_CASES = [
    # --- 스크린샷에서 가져온 실제 꼼수 ---
    ("배송은 금요일!\n\n계좌 입력방식:\n가나다라마바사자차\n순서대로 0~9 입니다^^", 1, "ACCOUNT_INFO", "screenshot"),
    ("1,234+5,678+9,101", 1, "ACCOUNT_INFO", "screenshot"),
    ("333💕💕33💕23💕💕910\nㅋㅏㅋㅏㅇㅗㅂㅐㅇㅋㅡ💕💕", 1, "ACCOUNT_INFO", "screenshot"),
    ("¹²³⁴⁵⁶⁷⁸⁹⁰", 1, "ACCOUNT_INFO", "screenshot"),
    ("오미자\n픈픈픈픈\n채널고정\n팅팅탱탱후라이팬놀이\n\n앞글자만 봐주세요! 연락드렸습니다!", 1, "EXTERNAL_MESSENGER", "screenshot"),
    ("반택 편의점 지점과 전화번호도 부탁드려요", 1, "DELIVERY", "screenshot"),
    ("끼택도 가능한가요??", 1, "DELIVERY", "screenshot"),
    ("cu편의점 지점과 전화번호 부탁드려요~", 1, "DELIVERY", "screenshot"),
    ("받으실 택배지점 알려주세요~~", 1, "DELIVERY", "screenshot"),
    ("3네개 - 3두개 - 둘l5 네이버에대적하는우리나라대기업의 회사입니다... 예금주명 이지민이에요", 1, "ACCOUNT_INFO", "screenshot"),
    ("죄송해요 7ㅕl좌 그대로 보내면 정지먹어서ㅠㅠㅠ", 1, "ACCOUNT_INFO", "screenshot"),
    ("배송비 포함 34000입니다!", 1, "DELIVERY", "screenshot"),
    ("그 노란색깔 판매글앱으로 시작해서 지금 게임택시지도페이등등다하는거기잇잖아요!!", 1, "EXTERNAL_MESSENGER", "screenshot"),
    ("그 초콜릿 원료인 그거!! 거기 뱅크로 보내주시면돼요!!", 1, "ACCOUNT_INFO", "screenshot"),
    ("구매하고싶은데 혹시 op픈chㅐㅌl0 있으신가요??", 1, "EXTERNAL_MESSENGER", "screenshot"),
    ("op픈chㅐㅌl0에 uni1234라고 gumㅅHㄱ해보실래요?", 1, "EXTERNAL_MESSENGER", "screenshot"),
    ("카뱅입니둥", 1, "ACCOUNT_INFO", "screenshot"),
    ("1̶2̶3̶4̶ 5̶6̶7̶8̶ 9̶1̶0̶0̶", 1, "ACCOUNT_INFO", "screenshot"),
    ("톡, 카 주세요", 1, "EXTERNAL_MESSENGER", "screenshot"),
    ("카@톡 아이디 알려드릴게요", 1, "EXTERNAL_MESSENGER", "screenshot"),
    ("ka톡 되세요?", 1, "EXTERNAL_MESSENGER", "screenshot"),
    # --- 손으로 쓴 BLOCK (템플릿에 없는 표현) ---
    ("저 여기 잘 안 들어와서 카톡 아이디 남겨드려요 minsu77", 1, "EXTERNAL_MESSENGER", "handwritten"),
    ("노란창에서 얘기하는 게 편할 듯요", 1, "EXTERNAL_MESSENGER", "handwritten"),
    ("오픈 카톡방 들어오시면 사진 더 있어요", 1, "EXTERNAL_MESSENGER", "handwritten"),
    ("텔레 아이디 드릴까요", 1, "EXTERNAL_MESSENGER", "handwritten"),
    ("인스타 계정 팔로우하고 디엠 보내주세요", 1, "EXTERNAL_MESSENGER", "handwritten"),
    ("라인 아이디 있으면 그걸로 해요", 1, "EXTERNAL_MESSENGER", "handwritten"),
    ("여기는 답장이 느려서 딴 메신저로 옮기실래요?", 1, "EXTERNAL_MESSENGER", "handwritten"),
    ("ㅋㅏ톡 ㄱㄱ", 1, "EXTERNAL_MESSENGER", "handwritten"),
    ("카\n톡\n주\n세\n요", 1, "EXTERNAL_MESSENGER", "handwritten"),
    ("디코 닉네임 알려드릴게요", 1, "EXTERNAL_MESSENGER", "handwritten"),
    ("공일공 구팔칠육 오사삼이 로 연락주세요", 1, "CONTACT_INFO", "handwritten"),
    ("제 폰으로 문자 한 통만 주세요", 1, "CONTACT_INFO", "handwritten"),
    ("번호 알려주시면 제가 먼저 전화할게요", 1, "CONTACT_INFO", "handwritten"),
    ("010 이공이육 오오칠팔", 1, "CONTACT_INFO", "handwritten"),
    ("입금해주시면 그때부터 예약으로 잡아둘게요", 1, "ADVANCE_PAYMENT", "handwritten"),
    ("찜한 사람 많아서 먼저 돈 보내는 분한테 팔게요", 1, "ADVANCE_PAYMENT", "handwritten"),
    ("반만 미리 쏴주시면 안 팔고 기다릴게요", 1, "ADVANCE_PAYMENT", "handwritten"),
    ("ㅅㅇㄱ만 받아요", 1, "ADVANCE_PAYMENT", "handwritten"),
    ("국민 94750200 123456 받는사람 김민수", 1, "ACCOUNT_INFO", "handwritten"),
    ("신한 110-432-987654", 1, "ACCOUNT_INFO", "handwritten"),
    ("이체로 하면 이천원 빼드릴게요", 1, "ACCOUNT_INFO", "handwritten"),
    ("계좌 찍어드릴 테니 미리 넣어주세요", 1, "ACCOUNT_INFO", "handwritten"),
    ("토스 아이디로 보내주세요", 1, "ACCOUNT_INFO", "handwritten"),
    ("멀어서 그런데 택배 안될까요?", 1, "DELIVERY", "handwritten"),
    ("반값택배로 보내드리면 수령 가능하세요?", 1, "DELIVERY", "handwritten"),
    ("집 주소 알려주시면 내일 부칠게요", 1, "DELIVERY", "handwritten"),
    ("GS25 지점명이랑 받는분 성함 알려주세요", 1, "DELIVERY", "handwritten"),
    ("우체국 가서 보내드릴게요", 1, "DELIVERY", "handwritten"),
    ("퀵 불러서 보내드릴까요?", 1, "DELIVERY", "handwritten"),
    ("이 링크로 결제하시면 제가 바로 발송해요 https://naver-pay.safe-deal.shop/88", 1, "EXTERNAL_LINK", "handwritten"),
    ("open.kakao.com/o/gXyz99 여기요", 1, "EXTERNAL_MESSENGER", "handwritten"),
    # --- 손으로 쓴 NORMAL (위험 단어와 겹치는 것 위주) ---
    ("학교 정문에서 직거래 가능합니다", 0, "MEETUP", "handwritten"),
    ("상품 상태 좋고 사용감 조금 있습니다", 0, "PRODUCT", "handwritten"),
    ("네 그럼 정문 편의점 앞에서 뵐게요", 0, "MEETUP", "handwritten"),
    ("만나서 계좌로 바로 보낼게요", 0, "PAYMENT_ONSITE", "handwritten"),
    ("현금 없으시면 그 자리에서 이체하셔도 돼요", 0, "PAYMENT_ONSITE", "handwritten"),
    ("현장에서 확인하고 입금해드릴게요", 0, "PAYMENT_ONSITE", "handwritten"),
    ("만나서 토스로 쏴드릴게요", 0, "PAYMENT_ONSITE", "handwritten"),
    ("라인프렌즈 브라운 인형 두 개 같이 드려요", 0, "HARD_NEGATIVE", "handwritten"),
    ("지하철 7호선 라인이라 거기서 보면 좋겠어요", 0, "HARD_NEGATIVE", "handwritten"),
    ("인스타360 고프로 같이 팔아요", 0, "HARD_NEGATIVE", "handwritten"),
    ("카카오맵 찍어보니 도서관이랑 가깝네요", 0, "HARD_NEGATIVE", "handwritten"),
    ("원래 택배로 받은 새 상품이라 박스도 있어요", 0, "HARD_NEGATIVE", "handwritten"),
    ("학번 몇이세요? 저 23학번이에요", 0, "HARD_NEGATIVE", "handwritten"),
    ("텔레비전 받침대도 필요하시면 드릴게요", 0, "HARD_NEGATIVE", "handwritten"),
    ("여기 판매글으로 계속 얘기해요", 0, "HARD_NEGATIVE", "handwritten"),
    ("카톡 같은 거 말고 여기서 약속 잡아요", 0, "HARD_NEGATIVE", "handwritten"),
    ("전화는 어렵고 여기로 메시지 주세요", 0, "HARD_NEGATIVE", "handwritten"),
    ("선배한테 물려받은 책이에요", 0, "HARD_NEGATIVE", "handwritten"),
    ("입학할 때 산 거라 3년 썼어요", 0, "PRODUCT", "handwritten"),
    ("배터리 성능 91퍼에요 충전기도 드려요", 0, "PRODUCT", "handwritten"),
    ("책 모서리만 살짝 눌렸어요", 0, "PRODUCT", "handwritten"),
    ("2만 5천에 해주시면 바로 갈게요", 0, "PRICE", "handwritten"),
    ("가격은 고정이에요 죄송해요", 0, "PRICE", "handwritten"),
    ("3시 반 학관 1층 어떠세요?", 0, "MEETUP", "handwritten"),
    ("지금 가는 중이에요 5분이면 도착", 0, "MEETUP", "handwritten"),
    ("회색 후드 입고 있어요!", 0, "MEETUP", "handwritten"),
    ("혹시 내일로 미뤄도 될까요 과제가 밀려서요", 0, "GENERAL", "handwritten"),
    ("잘 받았습니다 좋은 거래 감사해요", 0, "GENERAL", "handwritten"),
    ("ㅋㅋㅋ 네네 괜찮아요", 0, "GENERAL", "handwritten"),
    ("안녕하세요! 아이패드 아직 판매중이에요 :)", 0, "GENERAL", "handwritten"),
    ("네 안녕하세요! 혹시 직거래 가능할까요?", 0, "GENERAL", "handwritten"),
    ("그럼요~ 중앙도서관 앞에서 가능하세요! 언제쯤 시간 되세요?", 0, "MEETUP", "handwritten"),
    ("상태\n깨끗하고\n기스 없어요\n직거래만 해요", 0, "MULTILINE", "handwritten"),
]


def write_hard_cases():
    out = Path(__file__).parent / "data" / "hard_cases.csv"
    df = pd.DataFrame(HARD_CASES, columns=["text", "label", "category", "source"])
    df.insert(0, "id", range(1, len(df) + 1))
    df.to_csv(out, index=False, encoding="utf-8-sig")
    print(f"saved {len(df)} hard cases → {out}")


if __name__ == "__main__":
    out = Path(__file__).parent / "data" / "market_dataset.csv"
    out.parent.mkdir(exist_ok=True)
    df = generate()
    df.to_csv(out, index=False, encoding="utf-8-sig")
    print(f"saved {len(df)} rows → {out}")
    print(df["label"].value_counts().rename({0: "NORMAL", 1: "BLOCK"}))
    print(df.groupby(["label", "category"]).size())
    write_hard_cases()
