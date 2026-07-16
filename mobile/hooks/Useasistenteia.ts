import { useState, useRef, useCallback } from 'react';
import { ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { CONFIG } from '@/config/config';

const API_URL = CONFIG.API_URL;
const SESSION_KEY = 'asistenteSessionId';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoMensaje = 'bot' | 'usuario' | 'sugerencias';

export type Mensaje = {
  id: string;
  tipo: TipoMensaje;
  texto?: string;
  opciones?: string[];
};

type ChatResponse = {
  respuesta?: string;
  mensaje?: string;
  sugerencias?: string[];
  action_executed?: string | null;
  error?: string;
  success?: boolean;
};

// ─── Mensaje de bienvenida ────────────────────────────────────────────────────

const BIENVENIDA: Mensaje[] = [
  {
    id: 'welcome-bot',
    tipo: 'bot',
    texto: 'Hola, soy tu Asistente IA. ¿En qué te puedo ayudar hoy?',
  },
  {
    id: 'welcome-chips',
    tipo: 'sugerencias',
    opciones: ['¿Quién me debe más?', 'Mora', 'Resumen del día', 'Créditos vencidos'],
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

const getOrCreateSessionId = async (): Promise<string> => {
  const stored = await AsyncStorage.getItem(SESSION_KEY);
  if (stored) return stored;

  const nuevo = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  await AsyncStorage.setItem(SESSION_KEY, nuevo);
  return nuevo;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useAsistenteIA = (token: string, id_tendero: string) => {
  const [mensajes, setMensajes] = useState<Mensaje[]>(BIENVENIDA);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const pushMensaje = useCallback((msg: Mensaje) => {
    setMensajes((prev) => [...prev, msg]);
    scrollToBottom();
  }, []);

  const fetchRespuesta = async (pregunta: string): Promise<ChatResponse> => {
    if (!token) {
      throw new Error('No hay sesión activa. Inicia sesión nuevamente.');
    }

    const sessionId = await getOrCreateSessionId();

    const res = await fetch(`${API_URL}/asistente/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        sessionId,
        userId: id_tendero || sessionId,
        message: pregunta,
        metadata: {
          id_tendero,
          platform: 'mobile',
        },
      }),
    });

    const json: ChatResponse = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(json.error || 'No se pudo obtener una respuesta del asistente.');
    }

    return json;
  };

  const enviarMensaje = async (texto: string) => {
    const trimmed = texto.trim();
    if (!trimmed || loading) return;

    pushMensaje({ id: uid(), tipo: 'usuario', texto: trimmed });
    setInput('');
    setLoading(true);

    try {
      const json = await fetchRespuesta(trimmed);
      const respuesta =
        json.respuesta ??
        json.mensaje ??
        'No tengo información sobre eso en este momento.';

      pushMensaje({ id: uid(), tipo: 'bot', texto: respuesta });

      if (json.sugerencias && json.sugerencias.length > 0) {
        pushMensaje({
          id: uid(),
          tipo: 'sugerencias',
          opciones: json.sugerencias,
        });
      }
    } catch (err: any) {
      pushMensaje({
        id: uid(),
        tipo: 'bot',
        texto: err.message || 'Ocurrió un error al procesar tu pregunta.',
      });
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const handleEnviar = () => enviarMensaje(input);

  const handleSugerencia = (opcion: string) => enviarMensaje(opcion);

  const handleCancelar = () => router.back();

  return {
    mensajes,
    input,
    setInput,
    loading,
    scrollRef,
    handleEnviar,
    handleCancelar,
    handleSugerencia,
  };
};
