import { useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { CONFIG } from '@/config/config';

const API_URL = CONFIG.API_URL;

type ClienteInfo = {
  nombre: string;
  puntaje: number;
  limite_sugerido: number;
  nivel_riesgo: string;
  confianza: number;
  total_creditos: number;
  total_deuda: number;
  creditos_vencidos: number;
  relacion_estado: string | null;
} | null;

export const useAddCredit = (token: string, id_tendero: string) => {
  const [usuario, setUsuario]         = useState('');
  const [monto, setMonto]             = useState('');
  const [fechaLimite, setFechaLimite] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [scoring, setScoring]         = useState<ClienteInfo>(null);
  const [loadingScoring, setLoadingScoring] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading]         = useState(false);

  // Buscar scoring del cliente por ID/Cédula
  const buscarScoring = async () => {
    if (!usuario.trim()) return;
    setLoadingScoring(true);
    try {
      // 1. Obtener la información del cliente desde /api/clientes/:id
      const res = await fetch(`${API_URL}/clientes/${usuario.trim()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        Alert.alert('Cliente no encontrado', 'Verifica el ID/Cédula del cliente');
        setScoring(null);
        return;
      }
      
      const json = await res.json();
      const totales = json.totales || { total_creditos: 0, total_deuda: 0, creditos_vencidos: 0 };
      const relacionEstado = json.relacion_estado || null;

      // 2. Si no tiene scoring precalculado, intentamos calcularlo vía POST /api/scoring/:id/calcular
      if (!json.scoring) {
        try {
          const calcRes = await fetch(`${API_URL}/scoring/${usuario.trim()}/calcular`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });

          if (calcRes.ok) {
            // Volvemos a consultar para obtener la ficha de cliente con el scoring actualizado
            const retryRes = await fetch(`${API_URL}/clientes/${usuario.trim()}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (retryRes.ok) {
              const retryJson = await retryRes.json();
              if (retryJson.scoring) {
                setScoring({
                  nombre: retryJson.nombre_completo,
                  puntaje: retryJson.scoring.puntaje,
                  limite_sugerido: retryJson.scoring.limite_sugerido,
                  nivel_riesgo: retryJson.scoring.nivel_riesgo,
                  confianza: retryJson.scoring.confianza,
                  total_creditos: retryJson.totales?.total_creditos || 0,
                  total_deuda: retryJson.totales?.total_deuda || 0,
                  creditos_vencidos: retryJson.totales?.creditos_vencidos || 0,
                  relacion_estado: retryJson.relacion_estado || null,
                });
                return;
              }
            }
          }
        } catch (calcErr) {
          // Silenciamos error de cálculo automático, ya se maneja con fallback
        }
      }

      // 3. Si tiene scoring, lo mapeamos al estado
      if (json.scoring) {
        const limite = totales.total_creditos === 0 ? 30000 : json.scoring.limite_sugerido;
        setScoring({
          nombre: json.nombre_completo,
          puntaje: totales.total_creditos === 0 ? 0 : json.scoring.puntaje,
          limite_sugerido: limite,
          nivel_riesgo: totales.total_creditos === 0 ? 'bajo' : json.scoring.nivel_riesgo,
          confianza: totales.total_creditos === 0 ? 0 : json.scoring.confianza,
          total_creditos: totales.total_creditos,
          total_deuda: totales.total_deuda,
          creditos_vencidos: totales.creditos_vencidos,
          relacion_estado: relacionEstado,
        });
      } else {
        // En caso de que no tenga historial crediticio
        setScoring({
          nombre: json.nombre_completo,
          puntaje: 0,
          limite_sugerido: 30000, // Límite inicial base sugerido
          nivel_riesgo: 'bajo',
          confianza: 0,
          total_creditos: totales.total_creditos,
          total_deuda: totales.total_deuda,
          creditos_vencidos: totales.creditos_vencidos,
          relacion_estado: relacionEstado,
        });
      }
    } catch (err: any) {
      Alert.alert('Error', 'No se pudo cargar la información del cliente.');
      setScoring(null);
    } finally {
      setLoadingScoring(false);
    }
  };

  const isValidDate = (str: string) => {
    const parts = str.split('/');
    if (parts.length !== 3) return false;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;

    // Verificar si es un día real (ej. evitar 31/02)
    const dateObj = new Date(year, month - 1, day);
    if (dateObj.getFullYear() !== year || dateObj.getMonth() !== month - 1 || dateObj.getDate() !== day) {
      return false;
    }

    // El año debe ser razonable (año actual o superior)
    const currentYear = new Date().getFullYear();
    if (year < currentYear || year > currentYear + 10) {
      return false;
    }

    return true;
  };

  const handleFechaChange = (text: string) => {
    // Solo números
    let cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length > 8) {
      cleaned = cleaned.slice(0, 8);
    }

    let formatted = cleaned;
    if (cleaned.length > 2) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    }
    if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
    }
    setFechaLimite(formatted);
  };

  const handleGuardar = async () => {
    if (!usuario || !monto || !fechaLimite) {
      Alert.alert('Campos vacíos', 'Completa usuario, monto y fecha límite');
      return;
    }

    if (!isValidDate(fechaLimite)) {
      Alert.alert(
        'Fecha inválida',
        'Ingresa una fecha límite de pago real y válida con formato DD/MM/AAAA (ej: 28/05/2026).'
      );
      return;
    }

    setLoading(true);
    try {
      // Formatear fecha de DD/MM/AAAA a AAAA-MM-DD para la base de datos
      let fechaFormateada = fechaLimite.trim();
      if (fechaFormateada.includes('/')) {
        const partes = fechaFormateada.split('/');
        if (partes.length === 3) {
          const dia = partes[0].padStart(2, '0');
          const mes = partes[1].padStart(2, '0');
          const anio = partes[2];
          fechaFormateada = `${anio}-${mes}-${dia}`;
        }
      }

      const res = await fetch(`${API_URL}/creditos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clienteId: usuario.trim(),
          montoTotal: parseFloat(monto.replace(/[^0-9.]/g, '')),
          fechaLimitePago: fechaFormateada,
          descripcion: observaciones,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error al guardar');

      Alert.alert('¡Crédito creado!', 'El crédito fue registrado correctamente', [
        { text: 'OK', onPress: () => setTimeout(() => router.back(), 300) }
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = () => router.back();

  const getRiesgoColor = (nivel: string) => {
    switch (nivel?.toLowerCase()) {
      case 'bajo':  return '#3EBF7A';
      case 'medio': return '#FFA000';
      case 'alto':  return '#FF5252';
      default:      return '#7A9A85';
    }
  };

  return {
    usuario, setUsuario,
    monto, setMonto,
    fechaLimite, setFechaLimite,
    handleFechaChange,
    observaciones, setObservaciones,
    scoring, loadingScoring,
    showDatePicker, setShowDatePicker,
    loading,
    buscarScoring,
    handleGuardar,
    handleCancelar,
    getRiesgoColor,
  };
};