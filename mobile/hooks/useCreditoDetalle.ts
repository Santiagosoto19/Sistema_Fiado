import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { CONFIG } from '@/config/config';

const API_URL = CONFIG.API_URL;
const FETCH_TIMEOUT_MS = 15000;

const fetchWithTimeout = async (url: string, options: RequestInit) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

export type AbonoDetalle = {
  id_abono: number;
  monto: number;
  fecha_abono: string;
  created_at: string;
};

export type CreditoDetalleData = {
  id_credito: number;
  id_cliente: string;
  nombre_cliente: string;
  telefono: string;
  direccion: string;
  nombre_tendero: string;
  nombre_tienda: string;
  monto_total: number;
  saldo_pendiente: number;
  total_abonado: number;
  descripcion: string;
  fecha_credito: string;
  fecha_limite_pago: string;
  estado: string;
  dias_atraso: number;
  abonos: AbonoDetalle[];
};

export const useCreditoDetalle = (token: string | null, creditoId: string | null) => {
  const [loading, setLoading] = useState(true);
  const [credito, setCredito] = useState<CreditoDetalleData | null>(null);

  const fetchCredito = useCallback(async () => {
    if (!token || !creditoId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetchWithTimeout(`${API_URL}/creditos/${creditoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Error ${res.status}`);
      }

      const data = await res.json();
      setCredito(data);
    } catch (error: any) {
      const message = error.name === 'AbortError'
        ? 'No se pudo contactar el servidor. Verifica tu conexión.'
        : (error.message || 'No se pudo cargar el detalle del pago.');
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  }, [token, creditoId]);

  useEffect(() => {
    fetchCredito();
  }, [fetchCredito]);

  return { loading, credito, refetch: fetchCredito };
};
