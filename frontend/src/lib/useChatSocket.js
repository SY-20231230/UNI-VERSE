import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { session } from './session';

export function useChatSocket(roomId, onMessageReceived) {
  const [connected, setConnected] = useState(false);
  const clientRef = useRef(null);
  const callbackRef = useRef(onMessageReceived);

  // 최신 콜백을 ref에 저장 (소켓 재연결 방지)
  useEffect(() => {
    callbackRef.current = onMessageReceived;
  }, [onMessageReceived]);

  useEffect(() => {
    if (!roomId || !session.isActive()) return;

    const token = session.getAccessToken();
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws-stomp'),
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: function (str) {
        console.log('[STOMP]', str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = function (frame) {
      console.log('[STOMP] Connected to room', roomId);
      setConnected(true);
      client.subscribe(`/sub/chat/room/${roomId}`, (message) => {
        if (message.body) {
          const parsed = JSON.parse(message.body);
          console.log('[STOMP] Received message:', parsed);
          callbackRef.current(parsed);
        }
      });
    };

    client.onStompError = function (frame) {
      console.error('[STOMP] Error:', frame.headers['message'], frame.body);
    };

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      setConnected(false);
    };
  }, [roomId]); // roomId만 deps - callback은 ref로 처리

  const sendMessage = (content, type = 'TEXT') => {
    if (clientRef.current && clientRef.current.connected) {
      const body = JSON.stringify({ roomId: Number(roomId), type, content });
      console.log('[STOMP] Sending:', body);
      clientRef.current.publish({
        destination: '/pub/chat/message',
        headers: { 'content-type': 'application/json' },
        body
      });
    } else {
      console.error('[STOMP] Not connected! connected=', clientRef.current?.connected);
    }
  };

  return { connected, sendMessage };
}
