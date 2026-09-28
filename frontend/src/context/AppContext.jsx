import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { seed } from '../lib/seed';
import { uid } from '../lib/format';
import { session, sessionApiOptions } from '../lib/session';
import { createAuthApi } from '../lib/authApi';
import { createChatApi } from '../lib/chatApi';
import { useGlobalChatSocket } from '../lib/useChatSocket';

const authApi = createAuthApi(sessionApiOptions);
const chatApi = createChatApi(sessionApiOptions);

const LS_KEY = 'universe_state_v10';
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
      if (parsed && parsed.users) {
        // 서버 로그인 상태였는데 토큰이 사라졌다면 로그아웃 상태로 시작한다.
        if (parsed.authMode === 'server' && !session.isActive()) return { ...parsed, user: null, isAdmin: false, authMode: null };
        return parsed;
      }
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

  const [accessToken, setAccessToken] = useState(() => session.getAccessToken());
  const [me, setMe] = useState(null);

  // 서버 회원 정보를 목업 화면이 쓰는 users.me 에도 반영해 기존 화면이 그대로 동작하게 한다.
  const applyMe = useCallback((profile) => {
    setMe(profile);
    setState((s) => ({
      ...s,
      user: 'me',
      isAdmin: profile.role === 'ADMIN',
      authMode: 'server',
      users: {
        ...s.users,
        me: {
          ...s.users.me,
          serverId: profile.userId,  // 서버 유저 ID - me vs them 판별에 사용
          name: profile.nickname,
          trustScore: profile.trustScore,
          dept: profile.department || '',
          school: profile.schoolName || '',
          year: undefined,
        },
      },
    }));
  }, []);

  const endSession = useCallback(() => {
    setMe(null);
    setState((s) => ({ ...s, user: null, isAdmin: false, authMode: null }));
  }, []);

  useEffect(() => session.subscribe((current) => {
    setAccessToken(current?.accessToken ?? null);
    if (!current) {
      setMe(null);
      // 재발급 실패 등으로 세션이 끊기면 서버 로그인 사용자만 로그아웃시킨다 (데모 모드는 유지).
      setState((s) => (s.authMode === 'server' ? { ...s, user: null, isAdmin: false, authMode: null } : s));
    }
  }), []);

  // 새로고침 후에도 저장된 토큰으로 회원 정보를 다시 확인한다.
  useEffect(() => {
    if (!session.isActive()) return;
    // Load chats from backend
    async function loadChats(myProfile) {
      try {
        const rooms = await chatApi.getMyRooms();
        const chatDict = {};
        const myId = myProfile?.userId ?? null;
        for (const r of rooms) {
          const cid = String(r.roomId);
          const msgs = await chatApi.getMessages(r.roomId);
          chatDict[cid] = {
            listingId: r.itemId,
            partnerId: r.partnerId || 'unknown',
            partnerName: r.partnerName,
            anonymous: r.profileMode === 'ANONYMOUS',
            showSafety: true,
            status: 'accepted',
            messages: msgs.map(m => ({
              from: myId && String(m.senderId) === String(myId) ? 'me' : 'them',
              text: m.content,
              time: new Date(m.createdAt).getTime()
            }))
          };
        }
        setState(s => {
          const newChats = { ...chatDict };
          // Preserve unread status from existing state
          for (const cid in newChats) {
            const isFromThem = newChats[cid].messages.length > 0 && newChats[cid].messages[newChats[cid].messages.length - 1].from === 'them';
            if (s.chats[cid]?.unread !== undefined) {
              newChats[cid].unread = s.chats[cid].unread;
            } else if (isFromThem) {
              newChats[cid].unread = true;
            }
          }
          return { ...s, chats: newChats };
        });
      } catch (e) {
        console.error('Failed to load chats', e);
      }
    }
    authApi.me().then(profile => { applyMe(profile); loadChats(profile); }).catch(() => {});
  }, [applyMe]);

  const login = useCallback(async (credentials) => {
    session.set(await authApi.login(credentials));
    try {
      const profile = await authApi.me();
      applyMe(profile);
      const myId = profile.userId;
      
      // Load chats on login
      const rooms = await chatApi.getMyRooms();
      const chatDict = {};
      for (const r of rooms) {
        const cid = String(r.roomId);
        const msgs = await chatApi.getMessages(r.roomId);
        chatDict[cid] = {
          listingId: r.itemId,
          partnerId: r.partnerId || 'unknown',
          partnerName: r.partnerName,
          anonymous: r.profileMode === 'ANONYMOUS',
          showSafety: true,
          status: 'accepted',
          messages: msgs.map(m => ({
            from: myId && String(m.senderId) === String(myId) ? 'me' : 'them',
            text: m.content,
            time: new Date(m.createdAt).getTime()
          }))
        };
      }
      setState(s => {
        const newChats = { ...chatDict };
        for (const cid in newChats) {
          const isFromThem = newChats[cid].messages.length > 0 && newChats[cid].messages[newChats[cid].messages.length - 1].from === 'them';
          if (s.chats[cid]?.unread !== undefined) {
            newChats[cid].unread = s.chats[cid].unread;
          } else if (isFromThem) {
            newChats[cid].unread = true;
          }
        }
        return { ...s, chats: newChats };
      });
      
      return profile;
    } catch (error) {
      session.clear();
      throw error;
    }
  }, [applyMe]);

  const signup = useCallback(async (input) => {
    await authApi.signup(input);
    return login({ email: input.email, password: input.password });
  }, [login]);

  const sendEmailCode = useCallback((email) => authApi.sendEmailCode(email), []);
  const confirmEmailCode = useCallback((email, code) => authApi.confirmEmailCode(email, code), []);

  const loginDemo = useCallback(() => {
    setState((s) => ({ ...s, user: 'me', isAdmin: false, authMode: 'demo' }));
  }, []);

  const loginDemoAdmin = useCallback(() => {
    setState((s) => ({ ...s, user: 'me', isAdmin: true, authMode: 'demo' }));
  }, []);

  const logout = useCallback(async () => {
    if (session.isActive()) {
      await authApi.logout().catch(() => {
        /* 서버 세션 무효화 실패와 관계없이 이 기기에서는 로그아웃한다 */
      });
      session.clear();
    }
    endSession();
  }, [endSession]);

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

  const updateTrustScore = useCallback((score) => {
    setState((s) => ({
      ...s,
      users: { ...s.users, me: { ...s.users.me, trustScore: score } },
    }));
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

  const sendChatRequest = useCallback(async (listing, mode) => {
    try {
      const response = await chatApi.createRoom({
        itemId: listing.id,
        receiverId: listing.sellerId,
        profileMode: mode === 'anon' ? 'ANONYMOUS' : 'VERIFIED'
      });
      const roomId = response.roomId;
      const cid = String(roomId); // Use the real DB room ID
      
      setState((s) => ({
        ...s,
        chats: {
          ...s.chats,
          [cid]: {
            listingId: listing.id,
            partnerId: listing.sellerId || 'unknown',
            partnerName: response.partnerName,
            anonymous: mode === 'anon',
            showSafety: true,
            status: 'accepted',
            messages: [{ from: 'me', text: `안녕하세요! "${listing.title}" 구매하고 싶습니다.`, time: Date.now() }],
          },
        }
      }));
      return { cid, existing: false };
    } catch (e) {
      console.error(e);
      return { cid: null, existing: false };
    }
  }, []);

  const sendChatMessage = useCallback((chatId, text) => {
    // Keep local state update for UI responsiveness
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
    // Note: STOMP integration will handle actual sending in Chat.jsx later
  }, []);

  const receiveChatMessage = useCallback((chatId, data) => {
    // data from server: { roomId, senderId, content, createdAt, messageType }
    setState((s) => {
      const chat = s.chats[chatId];
      if (!chat) return s;
      // me state가 있으면 그걸로 판별, 없으면 'them'으로 처리
      const myId = s.users?.me?.serverId ?? null;
      const from = myId && String(data.senderId) === String(myId) ? 'me' : 'them';
      const newMsg = {
        from,
        text: data.content,
        time: data.createdAt ? new Date(data.createdAt).getTime() : Date.now(),
      };
      return {
        ...s,
        chats: {
          ...s.chats,
          [chatId]: {
            ...s.chats[chatId],
            unread: from === 'them' ? true : s.chats[chatId].unread,
            messages: [...s.chats[chatId].messages, newMsg],
          },
        },
      };
    });
  }, []);

  const allChatIds = useMemo(() => Object.keys(state.chats), [state.chats]);
  const myServerId = state.users?.me?.serverId ?? null;

  const handleNewRoom = useCallback(() => {
    // When a new room is created, reload all chats from the backend
    if (session.isActive()) {
      authApi.me().then(profile => {
        chatApi.getMyRooms().then(async rooms => {
          // We need to fetch messages outside of setState because it's async
          const roomData = [];
          for (const r of rooms) {
            const msgs = await chatApi.getMessages(r.roomId);
            roomData.push({ r, msgs });
          }
          
          setState(s => {
            const chatDict = { ...s.chats }; // copy existing
            const myId = profile?.userId ?? null;
            for (const { r, msgs } of roomData) {
              const cid = String(r.roomId);
              const existingChat = s.chats[cid];
              chatDict[cid] = {
                listingId: r.itemId,
                partnerId: r.partnerId || 'unknown',
                partnerName: r.partnerName,
                anonymous: r.profileMode === 'ANONYMOUS',
                showSafety: existingChat ? existingChat.showSafety : true,
                status: existingChat ? existingChat.status : 'accepted',
                unread: existingChat ? existingChat.unread : true, // mark new rooms as unread
                messages: msgs.map(m => ({
                  from: myId && String(m.senderId) === String(myId) ? 'me' : 'them',
                  text: m.content,
                  time: new Date(m.createdAt).getTime()
                }))
              };
            }
            return { ...s, chats: chatDict };
          });
        });
      }).catch(() => {});
    }
  }, []);

  const { connected: stompConnected, sendMessage: publishMessage } = useGlobalChatSocket(myServerId, allChatIds, receiveChatMessage, handleNewRoom);

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

  const deleteChatRoom = useCallback(async (chatId) => {
    try {
      await chatApi.deleteRoom(chatId);
      setState((s) => {
        const chats = { ...s.chats };
        delete chats[chatId];
        return { ...s, chats };
      });
    } catch (e) {
      console.error('Failed to delete chat room', e);
      throw e;
    }
  }, []);

  const markChatRead = useCallback((chatId) => {
    setState((s) => {
      if (!s.chats[chatId] || !s.chats[chatId].unread) return s;
      return {
        ...s,
        chats: { ...s.chats, [chatId]: { ...s.chats[chatId], unread: false } },
      };
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

  const userOf = useCallback((id, fallbackName) => {
    if (state.users[id]) return state.users[id];
    if (id === state.users.me?.id) return state.users.me;
    return { name: fallbackName || '알 수 없음', id };
  }, [state.users]);

  const exposedState = useMemo(() => ({ ...state, accessToken, me }), [state, accessToken, me]);

  const value = {
    state: exposedState,
    userOf,
    login,
    signup,
    sendEmailCode,
    confirmEmailCode,
    loginDemo,
    loginDemoAdmin,
    logout,
    updateProfilePhoto,
    removeProfilePhoto,
    updateTrustScore,
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
    receiveChatMessage,
    markChatRead,
    acceptChatRequest,
    declineChatRequest,
    deleteChatRoom,
    dismissSafety,
    report,
    resolveReport,
    liftSuspension,
    stompConnected,
    publishMessage,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
