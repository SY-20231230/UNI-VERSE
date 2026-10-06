import { communityApi } from './communityApi';

// 학교 홈페이지 연동 전까지 프론트에서 관리하는 기본 공지 목록. 최신 공지가 맨 앞에 온다.
export const CAMPUS_NOTICES = [
  { id: 'notice-3', title: '2학기 수강 정정 기간 안내 (~9/26)', body: '수강 정정은 9월 26일까지 학사 시스템에서 가능합니다.', date: '2026-09-22' },
  { id: 'notice-2', title: '가을 축제 부스 신청 접수 시작', body: '동아리·학과 부스 신청을 학생회 게시판에서 받고 있습니다.', date: '2026-09-20' },
  { id: 'notice-1', title: '오늘의 학생식당 메뉴: 제육불고기', body: '중식 11:30~13:30, 학생회관 1층 학생식당.', date: '2026-09-18' },
];

export const NOTICE_CATEGORY = 'NOTICE';

export function isNoticePost(post) {
  return post?.category === NOTICE_CATEGORY;
}

function toNotice(post) {
  return {
    id: `post-${post.postId}`,
    postId: post.postId,
    title: post.title,
    body: post.preview || '',
    date: post.createdAt || '',
    author: post.authorName,
  };
}

// 학교 관리자가 올린 공지 글(NOTICE)을 최신순으로 앞에 두고, 그 뒤에 기본 공지를 붙인다.
export async function fetchCampusNotices({ size = 20 } = {}) {
  const res = await communityApi.getPosts({ category: NOTICE_CATEGORY, sort: 'latest', page: 0, size });
  const posts = (res.content || [])
    .slice()
    .sort((a, b) => (new Date(b.createdAt).getTime() || 0) - (new Date(a.createdAt).getTime() || 0));
  return {
    notices: [...posts.map(toNotice), ...CAMPUS_NOTICES],
    serverCount: res.totalElements ?? posts.length,
  };
}

// 서버는 어떤 정렬이든 공지 글을 맨 앞에 둔다. 공지를 뺀 목록이 페이지 단위로 맞도록
// 공지 개수만큼 건너뛴 위치의 글을 두 페이지에서 잘라 온다.
export async function fetchPostsExceptNotices({ keyword, sort, page, size }) {
  const noticeRes = await communityApi.getPosts({ category: NOTICE_CATEGORY, keyword, page: 0, size: 1 });
  const noticeCount = noticeRes.totalElements ?? 0;
  if (!noticeCount) return communityApi.getPosts({ keyword, sort, page, size });

  const start = noticeCount + page * size;
  const firstPage = Math.floor(start / size);
  const offset = start - firstPage * size;
  const pages = await Promise.all(
    (offset ? [firstPage, firstPage + 1] : [firstPage]).map((p) => communityApi.getPosts({ keyword, sort, page: p, size })),
  );
  const total = Math.max((pages[0].totalElements ?? 0) - noticeCount, 0);
  const content = pages
    .flatMap((r) => r.content || [])
    .slice(offset, offset + size)
    .filter((p) => !isNoticePost(p));
  return { content, totalElements: total, totalPages: Math.ceil(total / size) };
}
