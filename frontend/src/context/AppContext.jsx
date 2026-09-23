import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { seed } from '../lib/seed';
import { uid } from '../lib/format';

const LS_KEY = 'universe_state_v8';
const AppContext = createContext(null);

export const REPORT_ACTIONS = {
  reject: { label: '반려', status: '반려됨' },
  warn: { label: '경고 처리', status: '처리완료' },
  suspend_3: { label: '3일 정지', status: '처리완료', days: 3 },
  suspend_7: { label: '7일 정지', status: '처리완료', days: 7 },
  ban: { label: '영구 정지', status: '처리완료', permanent: true },
};

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.users) return parsed;
    }
  } catch (e) {
    /* ignore corrupt storage */
  }
  return seed();
}

export function AppProvider({ children }) {
  const [state, setState] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch (e) {
      /* storage unavailable */
    }
  }, [state]);

  const login = useCallback(() => {
    setState((s) => ({ ...s, user: 'me', isAdmin: false }));
  }, []);

  const loginAsAdmin = useCallback(() => {
    setState((s) => ({ ...s, user: 'me', isAdmin: true }));
  }, []);

  const logout = useCallback(() => {
    setState((s) => ({ ...s, user: null, isAdmin: false }));
  }, []);

  const updateProfilePhoto = useCallback((dataUrl) => {
    setState((s) => ({ ...s, users: { ...s.users, me: { ...s.users.me, avatarUrl: dataUrl } } }));
  }, []);

  const removeProfilePhoto = useCallback(() => {
    setState((s) => {
      const me = { ...s.users.me };
      delete me.avatarUrl;
      return { ...s, users: { ...s.users, me } };
    });
  }, []);

  const setCommunityFilter = useCallback((cat) => {
    setState((s) => ({ ...s, communityFilter: cat }));
  }, []);

  const setMarketFilter = useCallback((cat) => {
    setState((s) => ({ ...s, marketFilter: cat }));
  }, []);

  const setMarketStatusFilter = useCallback((st) => {
    setState((s) => ({ ...s, marketStatusFilter: st }));
  }, []);

  const updateDraft = useCallback((partial) => {
    setState((s) => ({ ...s, draft: { ...s.draft, ...partial } }));
  }, []);

  const clearDraft = useCallback(() => {
    setState((s) => ({ ...s, draft: {} }));
  }, []);

  const likePost = useCallback((id) => {
    setState((s) => {
      const liked = !!s.likedPosts[id];
      return {
        ...s,
        posts: s.posts.map((p) => (p.id === id ? { ...p, likes: p.likes + (liked ? -1 : 1) } : p)),
        likedPosts: { ...s.likedPosts, [id]: !liked },
      };
    });
  }, []);

  const likeListing = useCallback((id) => {
    setState((s) => {
      const liked = !!s.likedListings[id];
      return {
        ...s,
        listings: s.listings.map((l) => (l.id === id ? { ...l, likes: l.likes + (liked ? -1 : 1) } : l)),
        likedListings: { ...s.likedListings, [id]: !liked },
      };
    });
  }, []);

  const addComment = useCallback((postId, text) => {
    setState((s) => ({
      ...s,
      posts: s.posts.map((p) =>
        p.id === postId
          ? { ...p, comments: [...p.comments, { id: uid(), authorLabel: '나', text, time: Date.now(), likes: 0 }] }
          : p
      ),
    }));
  }, []);

  const updateComment = useCallback((postId, commentId, text) => {
    setState((s) => ({
      ...s,
      posts: s.posts.map((p) =>
        p.id === postId
          ? { ...p, comments: p.comments.map((c) => (c.id === commentId && c.authorLabel === '나' ? { ...c, text } : c)) }
          : p
      ),
    }));
  }, []);

  const submitCommunityPost = useCallback(({ category, title, body, anonymous, tags }) => {
    const newPost = {
      id: 'p' + uid(),
      category,
      title,
      body,
      anonymous: !!anonymous,
      authorId: 'me',
      time: Date.now(),
      likes: 0,
      views: 1,
      tags: tags || [],
      comments: [],
    };
    setState((s) => ({ ...s, posts: [newPost, ...s.posts], draft: {} }));
    return newPost.id;
  }, []);

  const updateCommunityPost = useCallback((id, { category, title, body, anonymous, tags }) => {
    setState((s) => ({
      ...s,
      posts: s.posts.map((p) => (p.id === id && p.authorId === 'me' ? { ...p, category, title, body, anonymous: !!anonymous, tags: tags || [] } : p)),
    }));
  }, []);

  const deleteCommunityPost = useCallback((id) => {
    setState((s) => ({
      ...s,
      posts: s.posts.filter((p) => !(p.id === id && p.authorId === 'me')),
    }));
  }, []);

  const submitMarketListing = useCallback(({ category, title, price, condition, desc, originalPrice }) => {
    const newListing = {
      id: 'm' + uid(),
      category,
      title,
      price,
      originalPrice: originalPrice || 0,
      condition,
      status: '판매중',
      sellerId: 'me',
      desc,
      time: Date.now(),
      views: 1,
      likes: 0,
      chatCount: 0,
      icon: 'box',
      loc: '학생회관',
    };
    setState((s) => ({ ...s, listings: [newListing, ...s.listings], draft: {} }));
    return newListing.id;
  }, []);

  const updateMarketListing = useCallback((id, { category, title, price, condition, desc, originalPrice }) => {
    setState((s) => ({
      ...s,
      listings: s.listings.map((l) =>
        l.id === id && l.sellerId === 'me' ? { ...l, category, title, price, condition, desc, originalPrice: originalPrice || 0 } : l
      ),
    }));
  }, []);

  const deleteMarketListing = useCallback((id) => {
    setState((s) => ({
      ...s,
      listings: s.listings.filter((l) => !(l.id === id && l.sellerId === 'me')),
    }));
  }, []);

  const sendChatRequest = useCallback((listingId, mode) => {
    const cid = 'chat-' + listingId;
    let existing = false;
    setState((s) => {
      if (s.chats[cid]) {
        existing = true;
        return s;
      }
      const listing = s.listings.find((x) => x.id === listingId);
      return {
        ...s,
        chats: {
          ...s.chats,
          [cid]: {
            listingId,
            partnerId: listing.sellerId,
            anonymous: mode === 'anon',
            showSafety: true,
            status: 'accepted',
            messages: [{ from: 'them', text: `안녕하세요! "${listing.title}" 문의 주셔서 감사해요 :)`, time: Date.now() }],
          },
        },
        listings: s.listings.map((l) => (l.id === listingId ? { ...l, chatCount: (l.chatCount || 0) + 1 } : l)),
      };
    });
    return { cid, existing };
  }, []);

  const sendChatMessage = useCallback((chatId, text) => {
    setState((s) => ({
      ...s,
      chats: {
        ...s.chats,
        [chatId]: {
          ...s.chats[chatId],
          messages: [...s.chats[chatId].messages, { from: 'me', text, time: Date.now() }],
        },
      },
    }));

    const replies = ['넵 확인했습니다!', '좋아요, 그 시간 괜찮습니다 :)', '네 가능해요! 장소는 어디가 편하세요?', '알겠습니다, 그때 뵙겠습니다~'];
    setTimeout(() => {
      setState((s) => {
        if (!s.chats[chatId]) return s;
        return {
          ...s,
          chats: {
            ...s.chats,
            [chatId]: {
              ...s.chats[chatId],
              messages: [
                ...s.chats[chatId].messages,
                { from: 'them', text: replies[Math.floor(Math.random() * replies.length)], time: Date.now() },
              ],
            },
          },
        };
      });
    }, 1100 + Math.random() * 700);
  }, []);

  const acceptChatRequest = useCallback((chatId) => {
    setState((s) => ({
      ...s,
      chats: { ...s.chats, [chatId]: { ...s.chats[chatId], status: 'accepted' } },
    }));
  }, []);

  const declineChatRequest = useCallback((chatId) => {
    setState((s) => {
      const chats = { ...s.chats };
      delete chats[chatId];
      return { ...s, chats };
    });
  }, []);

  const dismissSafety = useCallback((chatId) => {
    setState((s) => ({
      ...s,
      chats: { ...s.chats, [chatId]: { ...s.chats[chatId], showSafety: false } },
    }));
  }, []);

  const report = useCallback(({ reason, targetUserId, listingId, chatId }) => {
    setState((s) => ({
      ...s,
      reports: (s.reports || 0) + 1,
      reportRecords: [
        {
          id: 'rp' + uid(),
          reporterId: 'me',
          targetUserId: targetUserId || null,
          listingId: listingId || null,
          chatId: chatId || null,
          reason,
          status: '대기중',
          adminNote: '',
          time: Date.now(),
          processedAt: null,
        },
        ...(s.reportRecords || []),
      ],
    }));
  }, []);

  const resolveReport = useCallback((id, action) => {
    const meta = REPORT_ACTIONS[action];
    if (!meta) return;
    setState((s) => {
      const rec = (s.reportRecords || []).find((r) => r.id === id);
      if (!rec) return s;
      let users = s.users;
      if (rec.targetUserId && (meta.days || meta.permanent)) {
        const prev = users[rec.targetUserId];
        users = {
          ...users,
          [rec.targetUserId]: {
            ...prev,
            suspendedUntil: meta.permanent ? null : Date.now() + meta.days * 86400000,
            suspendedPermanently: !!meta.permanent,
          },
        };
      }
      return {
        ...s,
        users,
        reportRecords: s.reportRecords.map((r) =>
          r.id === id ? { ...r, status: meta.status, action, processedAt: Date.now() } : r
        ),
      };
    });
  }, []);

  const liftSuspension = useCallback((userId) => {
    setState((s) => ({
      ...s,
      users: {
        ...s.users,
        [userId]: { ...s.users[userId], suspendedUntil: null, suspendedPermanently: false },
      },
    }));
  }, []);

  const userOf = useCallback((id) => state.users[id] || state.users.me, [state.users]);

  const value = {
    state,
    userOf,
    login,
    loginAsAdmin,
    logout,
    updateProfilePhoto,
    removeProfilePhoto,
    setCommunityFilter,
    setMarketFilter,
    setMarketStatusFilter,
    updateDraft,
    clearDraft,
    likePost,
    likeListing,
    addComment,
    updateComment,
    submitCommunityPost,
    updateCommunityPost,
    deleteCommunityPost,
    submitMarketListing,
    updateMarketListing,
    deleteMarketListing,
    sendChatRequest,
    sendChatMessage,
    acceptChatRequest,
    declineChatRequest,
    dismissSafety,
    report,
    resolveReport,
    liftSuspension,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
