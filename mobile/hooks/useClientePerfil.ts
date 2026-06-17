import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { CONFIG } from '@/config/config';

const API_URL = CONFIG.API_URL;

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export type EstadoBadge = 'al_dia' | 'mora' | 'sin_deuda';

export type CreditoHistorial = {
  id_credito: number;
  titulo: string;
  subtitulo: string;
  monto: string;
  estado: 'pagado' | 'vigente' | 'vencido';
};

export type ClientePerfil = {
  id_cliente: number;
  nombre: string;
  clienteDesde: string;
  estadoBadge: string;
  estadoBadgeTipo: EstadoBadge;
  deudaActual: string;
  nivelConfianza: number;
  telefono: string;
  direccion: string;
  historial: CreditoHistorial[];
};

const formatCOP = (valor: number) =>
  `$${valor.toLocaleString('es-CO')}`;

const formatFechaLarga = (fecha: string) => {
  const d = new Date(fecha);
  return `${d.getDate()} ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
};

const formatFechaCorta = (fecha: string) => {
  const d = new Date(fecha);
  const mes = MESES[d.getMonth()];
  return `${d.getDate()} ${mes.charAt(0).toUpperCase()}${mes.slice(1)}`;
};

const formatClienteDesde = (fecha: string) => {
  const d = new Date(fecha);
  return `Cliente desde ${MESES[d.getMonth()]} ${d.getFullYear()}`;
};

const fetchPuntaje = async (clienteId: string, token: string): Promise<number> => {
  try {
    const res = await fetch(`${API_URL}/scoring/${clienteId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const json = await res.json();
      return json.puntaje_total ?? 50;
    }

    if (res.status === 404) {
      const calcRes = await fetch(`${API_URL}/scoring/${clienteId}/calcular`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (calcRes.ok) {
        const calcJson = await calcRes.json();
        return calcJson.puntaje_total ?? 50;
      }
    }
  } catch (err) {
    console.error('Error obteniendo puntaje:', err);
  }

  return 50;
};

const mapHistorial = (items: any[]): CreditoHistorial[] =>
  items.map((item) => {
    const credito = item.credito;
    const estado = credito.estado as 'pagado' | 'vigente' | 'vencido';

    let subtitulo = '';
    if (estado === 'pagado') {
      subtitulo = 'Pagado completo';
    } else if (estado === 'vigente') {
      subtitulo = `Vence ${formatFechaCorta(credito.fecha_limite_pago)}`;
    } else {
      subtitulo = 'Vencido';
    }

    const titulo = credito.descripcion?.trim()
      ? credito.descripcion
      : `Crédito ${formatFechaLarga(credito.fecha_credito)}`;

    return {
      id_credito: credito.id_credito,
      titulo,
      subtitulo,
      monto: formatCOP(credito.monto_total),
      estado,
    };
  });

export const useClientePerfil = (token: string | null, clienteId: string | undefined) => {
  const [perfil, setPerfil] = useState<ClientePerfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPerfil = useCallback(async () => {
    if (!token || !clienteId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [clienteRes, historialRes, puntaje] = await Promise.all([
        fetch(`${API_URL}/clientes/${clienteId}`, { headers }),
        fetch(`${API_URL}/clientes/${clienteId}/historial`, { headers }),
        fetchPuntaje(clienteId, token),
      ]);

      if (!clienteRes.ok) {
        const err = await clienteRes.json().catch(() => ({}));
        throw new Error(err.error || 'No se pudo cargar el cliente');
      }

      const cliente = await clienteRes.json();
      const historialJson = historialRes.ok
        ? await historialRes.json()
        : { historial: [] };

      const totalDeuda = cliente.totales?.total_deuda ?? 0;
      const creditosVencidos = cliente.totales?.creditos_vencidos ?? 0;

      let estadoBadgeTipo: EstadoBadge = 'al_dia';
      let estadoBadge = 'Al día';

      if (totalDeuda === 0) {
        estadoBadgeTipo = 'sin_deuda';
        estadoBadge = 'Sin deuda';
      } else if (creditosVencidos > 0) {
        estadoBadgeTipo = 'mora';
        estadoBadge = 'Mora';
      }

      setPerfil({
        id_cliente: cliente.id_cliente,
        nombre: cliente.nombre_completo,
        clienteDesde: formatClienteDesde(cliente.created_at),
        estadoBadge,
        estadoBadgeTipo,
        deudaActual: formatCOP(totalDeuda),
        nivelConfianza: Math.min(Math.round(puntaje), 100),
        telefono: cliente.telefono || 'No registrado',
        direccion: cliente.direccion || 'No registrada',
        historial: mapHistorial(historialJson.historial ?? []),
      });
    } catch (err: any) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  }, [token, clienteId]);

  useEffect(() => {
    fetchPerfil();
  }, [fetchPerfil]);

  const handleNuevoCredito = () => {
    Alert.alert('Próximamente', 'La pantalla de nuevo crédito estará disponible pronto.');
  };

  const handleRegistrarPago = () => {
    Alert.alert('Próximamente', 'La pantalla de registrar pago estará disponible pronto.');
  };

  return {
    perfil,
    loading,
    error,
    refetch: fetchPerfil,
    handleNuevoCredito,
    handleRegistrarPago,
  };
};
