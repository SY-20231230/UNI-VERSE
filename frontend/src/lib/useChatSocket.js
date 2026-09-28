import { useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client/dist/sockjs';
import { session } from './session';

export function useGlobalChatSocket(chatIds, onMessageReceived) {
  const [connected, setConnected] = useState(false);
  const clientRef = useRef(null);
  const subsRef = useRef(new Set());
  const callbackRef = useRef(onMessageReceived);

  useEffect(() => {
    callbackRef.current = onMessageReceived;
  }, [onMessageReceived]);

  useEffect(() => {
    if (!session.isActive()) return;

    const token = session.getAccessToken();
    const client = new Client({
      webSocketFactory: () => new SockJS('/ws-stomp'),
      connectHeaders: { Authorization: `Bearer ${token}` },
      debug: (str) => console.log('[STOMP]', str),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      console.log('[STOMP] Connected to global client');
      setConnected(true);
      subsRef.current.clear();
      
      // Initialize subscriptions for existing rooms
      chatIds.forEach(id => {
        client.subscribe(`/sub/chat/room/${id}`, (msg) => {
          if (msg.body) callbackRef.current(id, JSON.parse(msg.body));
        });
        subsRef.current.add(String(id));
      });
    };

    client.onStompError = (frame) => console.error('[STOMP] Error:', frame);
    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      setConnected(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.isActive()]);

  // Subscribe to new rooms dynamically
  useEffect(() => {
    if (!connected || !clientRef.current) return;
    chatIds.forEach(id => {
      if (!subsRef.current.has(String(id))) {
        clientRef.current.subscribe(`/sub/chat/room/${id}`, (msg) => {
          if (msg.body) callbackRef.current(id, JSON.parse(msg.body));
        });
        subsRef.current.add(String(id));
      }
    });
  }, [chatIds, connected]);

  const sendMessage = useCallback((roomId, content, type = 'TEXT') => {
    if (clientRef.current && clientRef.current.connected) {
      const body = JSON.stringify({ roomId: Number(roomId), type, content });
      clientRef.current.publish({
        destination: '/pub/chat/message',
        headers: { 'content-type': 'application/json' },
        body
      });
    } else {
      console.error('[STOMP] Not connected!');
    }
  }, []);

  return { connected, sendMessage };
}
