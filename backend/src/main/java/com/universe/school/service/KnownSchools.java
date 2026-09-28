package com.universe.school.service;

import java.util.Map;
import java.util.Optional;

/** 학교 이메일 대표 도메인 → 학교 이름. 목록에 없는 학교는 도메인이 이름으로 등록된다. */
final class KnownSchools {

    private static final Map<String, String> NAMES = Map.ofEntries(
            // 전문대학
            Map.entry("mjc.ac.kr", "명지전문대학"),
            Map.entry("induk.ac.kr", "인덕대학교"),
            Map.entry("dongyang.ac.kr", "동양미래대학교"),
            // 서울
            Map.entry("snu.ac.kr", "서울대학교"),
            Map.entry("yonsei.ac.kr", "연세대학교"),
            Map.entry("korea.ac.kr", "고려대학교"),
            Map.entry("sogang.ac.kr", "서강대학교"),
            Map.entry("hanyang.ac.kr", "한양대학교"),
            Map.entry("cau.ac.kr", "중앙대학교"),
            Map.entry("khu.ac.kr", "경희대학교"),
            Map.entry("hufs.ac.kr", "한국외국어대학교"),
            Map.entry("uos.ac.kr", "서울시립대학교"),
            Map.entry("konkuk.ac.kr", "건국대학교"),
            Map.entry("hongik.ac.kr", "홍익대학교"),
            Map.entry("kookmin.ac.kr", "국민대학교"),
            Map.entry("ssu.ac.kr", "숭실대학교"),
            Map.entry("sejong.ac.kr", "세종대학교"),
            Map.entry("kw.ac.kr", "광운대학교"),
            Map.entry("mju.ac.kr", "명지대학교"),
            Map.entry("ewha.ac.kr", "이화여자대학교"),
            Map.entry("sookmyung.ac.kr", "숙명여자대학교"),
            Map.entry("seoultech.ac.kr", "서울과학기술대학교"),
            // 경기·인천
            Map.entry("inha.ac.kr", "인하대학교"),
            Map.entry("ajou.ac.kr", "아주대학교"),
            Map.entry("dankook.ac.kr", "단국대학교"),
            Map.entry("gachon.ac.kr", "가천대학교"),
            Map.entry("catholic.ac.kr", "가톨릭대학교"),
            // 지방 거점 국립대
            Map.entry("pusan.ac.kr", "부산대학교"),
            Map.entry("knu.ac.kr", "경북대학교"),
            Map.entry("jnu.ac.kr", "전남대학교"),
            Map.entry("jbnu.ac.kr", "전북대학교"),
            Map.entry("cnu.ac.kr", "충남대학교"),
            Map.entry("chungbuk.ac.kr", "충북대학교"),
            // 과학기술원
            Map.entry("kaist.ac.kr", "KAIST"),
            Map.entry("postech.ac.kr", "포항공과대학교"),
            Map.entry("unist.ac.kr", "UNIST"),
            Map.entry("gist.ac.kr", "GIST"),
            Map.entry("dgist.ac.kr", "DGIST"));

    private KnownSchools() {}

    static Optional<String> nameOf(String domain) {
        return Optional.ofNullable(NAMES.get(domain));
    }
}
