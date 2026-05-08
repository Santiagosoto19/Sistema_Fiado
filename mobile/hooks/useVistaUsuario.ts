import { useState, useEffect, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import { CONFIG } from '@/config/config';

const API_URL = CONFIG.API_URL;
const CLIENTE_ID = '1';

export type Movimiento = {
  id: string;
  tipo: 'CARGO' | 'ABONO';
  descripcion: string;
  fecha: string;
  monto: number;
};

export type UserData = {
  nombreUsuario: string;
  nombreTienda: string;
  totalDeuda: number;
  fechaLimite: string;
  nivelConfianza: number;
  telefonoTienda: string;
};

export const useVistaUsuario = (token: string | null) => {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [movements, setMovements] = useState<Movimiento[]>([]);

  const fetchUserData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const userRes = await fetch(`${API_URL}/clientes/${CLIENTE_ID}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!userRes.ok) {
        const err = await userRes.json().catch(() => ({}));
        throw new Error(err.error || `Error ${userRes.status}`);
      }
      const user = await userRes.json();

      const historyRes = await fetch(`${API_URL}/clientes/${CLIENTE_ID}/historial`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!historyRes.ok) {
        const err = await historyRes.json().catch(() => ({}));
        throw new Error(err.error || `Error ${historyRes.status}`);
      }
      const history = await historyRes.json();

      const processedMovements: Movimiento[] = [];
      history.historial?.forEach((item: any) => {
        processedMovements.push({
          id: `cred-${item.credito.id_credito}`,
          tipo: 'CARGO',
          descripcion: item.credito.descripcion || 'Compra en Tienda',
          fecha: item.credito.fecha_credito,
          monto: item.credito.monto_total,
        });
        item.abonos?.forEach((abono: any) => {
          processedMovements.push({
            id: `abono-${abono.id_abono}`,
            tipo: 'ABONO',
            descripcion: `Abono a ${item.credito.descripcion || 'Crédito'}`,
            fecha: abono.fecha_abono,
            monto: abono.monto,
          });
        });
      });

      const sortedMovements = processedMovements.sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );

      setUserData({
        nombreUsuario: user.nombre_completo,
        nombreTienda: 'Mi Viejo San Roque',
        totalDeuda: user.totales?.total_deuda ?? 0,
        fechaLimite: 'Sujeto a crédito',
        nivelConfianza: user.scoring?.puntaje || 0,
        telefonoTienda: user.telefono,
      });

      setMovements(sortedMovements);
    } catch (error: any) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error cargando datos', error.message || 'No se pudieron cargar los datos de la cuenta.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  const handleContactStore = useCallback(() => {
    const phone = userData?.telefonoTienda || '+573000000000';
    const url = `whatsapp://send?phone=${phone}&text=Hola, quiero consultar mi estado de cuenta.`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'No se pudo abrir WhatsApp');
    });
  }, [userData]);

  return {
    loading,
    userData,
    movements,
    handleContactStore,
    refetch: fetchUserData,
  };
};
