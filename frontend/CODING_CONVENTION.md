# 코딩 컨벤션 (Frontend)

1) 모든 JS/JSX 파일은 UTF-8 인코딩을 사용한다. 코드 식별자(컴포넌트명, 함수명, 변수명)는 영어로, 화면에 노출되는 문구는 한국어로 작성한다.

2) 들여쓰기는 2칸(space)을 사용한다. JSX 속성이 3개 이상이거나 한 줄이 길어지면 속성을 줄바꿈해서 나눠 쓴다.

3) CSS는 `src/index.css` 한 파일에서만 관리한다. 규칙 하나당 한 줄로 압축해서 작성하고(`.class{속성:값; 속성:값;}`), 컴포넌트별로 별도 CSS 파일을 만들지 않는다. 섹션 구분은 `/* ---------- 섹션명 ---------- */` 주석을 사용한다.

4) 주석은 최소화한다. 코드만 봐서는 알 수 없는 "왜"가 있을 때만 짧게 남기고, 무엇을 하는지 설명하는 주석·함수 요약 주석은 쓰지 않는다.

5) 공통 UI 요소(`Nav`, `Footer`, `Avatar`, `VerifiedChip`, `Icon` 등)는 `src/components/`, 라우트 단위 화면은 `src/pages/`에 둔다. 각 파일은 `export default function 컴포넌트명() { ... }` 형태의 함수형 컴포넌트 하나만 내보낸다.

6) 페이지 폭은 px를 직접 지정하지 않고 아래 유틸리티 클래스를 재사용한다.
   - `.container` — 기본 폭(1440px), 목록/홈 화면
   - `.container.mid` — 상세 페이지(1160px)
   - `.container.narrow` — 글쓰기 폼(920px)

7) 색상은 하드코딩하지 않고 `:root`에 정의된 CSS 변수(`--accent`, `--ink`, `--ink-soft`, `--border`, `--surface-sunken` 등)만 사용한다. 새 색이 필요하면 `:root`에 변수로 추가한 뒤 참조한다.

8) 아이콘은 인라인 SVG나 이미지 파일을 직접 쓰지 않고, `src/lib/icons.jsx`에 path를 추가한 뒤 `<Icon name="아이콘명" size={n} />`로 사용한다.

9) 상태는 두 Context로 역할을 분리한다.
   - `AppContext` — 로그인 상태, 게시글/매물/채팅/신고 등 영속 데이터 (`localStorage` 저장)
   - `UIContext` — 토스트, 모달, 바텀시트 등 일시적 UI 상태

   두 상태를 서로 섞어서 관리하지 않는다.

10) 수정(edit) 화면은 별도 페이지를 새로 만들지 않고, 등록(write) 화면 컴포넌트를 `/:id/edit` 라우트로 재사용한다. `useParams()`의 `id` 존재 여부로 등록/수정 모드를 분기한다.

11) 인증이 필요한 라우트는 `RequireAuth`, 관리자 전용 라우트는 `RequireAdmin`으로 감싼다 (`src/App.jsx`).

12) 여러 화면에서 재사용하는 순수 로직(날짜·가격 포맷, 카테고리 메타데이터, 위험 표현 검사 등)은 `src/lib/`에 분리하고 컴포넌트 안에 중복 작성하지 않는다.

## 예시

```jsx
// src/pages/ExamplePage.jsx
import { Link } from 'react-router-dom';
import Icon from '../lib/icons';
import { useApp } from '../context/AppContext';

export default function ExamplePage() {
  const { state } = useApp();

  return (
    <div className="container mid fade-enter">
      <Link className="backlink" to="/market">
        <Icon name="back" size={13} />
        중고거래
      </Link>
      <h1 className="h1">예시 페이지</h1>
    </div>
  );
}
```

```css
/* src/index.css */
.example-card{display:flex; align-items:center; gap:10px; padding:14px 16px; border:1px solid var(--border-soft); border-radius:12px; background:var(--surface);}
.example-card:hover{border-color:var(--border);}
```
