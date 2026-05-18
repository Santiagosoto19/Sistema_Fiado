import { useState, useEffect, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import { CONFIG } from '@/config/config';

const API_URL = CONFIG.API_URL;

const avatarColors = ['#4CAF50', '#FFC107', '#FF5252', '#2196F3', '#9C27B0'];

export type Movimiento = {
  id: string;
  tipo: 'CARGO' | 'ABONO';
  descripcion: string;
  fecha: string;
  monto: number;
  bgColor: string;
  amountColor: string;
};

export type Tienda = {
  nombre_tendero: string;
  nombre_tienda: string;
  telefono: string;
  direccion: string;
};

export type UserData = {
  id_cliente: number;
  nombreUsuario: string;
  nombreTienda: string;
  totalDeuda: number;
  fechaLimite: string;
  nivelConfianza: number;
  nivelConfianzaLabel: string;
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

      const meRes = await fetch(`${API_URL}/clientes/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!meRes.ok) {
        const err = await meRes.json().catch(() => ({}));
        throw new Error(err.error || `Error ${meRes.status}`);
      }
      const user = await meRes.json();

      const puntaje = user.scoring?.puntaje ?? 0;
      const nivelConfianza = Math.min(Math.round((puntaje / 1000) * 100), 100);

      let nivelConfianzaLabel = 'Cliente en riesgo';
      if (nivelConfianza >= 70) {
        nivelConfianzaLabel = '¡Excelente Cliente!';
      } else if (nivelConfianza >= 40) {
        nivelConfianzaLabel = 'Cliente normal';
      }

      let telefonoTienda = user.tienda?.telefono || '';
      telefonoTienda = telefonoTienda.replace(/\s/g, '');
      if (telefonoTienda && !telefonoTienda.startsWith('+')) {
        telefonoTienda = '+57' + telefonoTienda;
      }

      setUserData({
        id_cliente: user.id_cliente,
        nombreUsuario: user.nombre_completo,
        nombreTienda: user.tienda?.nombre_tienda || 'Sin tienda asociada',
        totalDeuda: user.totales?.total_deuda ?? 0,
        fechaLimite: 'Sujeto a crédito',
        nivelConfianza,
        nivelConfianzaLabel,
        telefonoTienda,
      });

      const idCliente = user.id_cliente;

      try {
        const historyRes = await fetch(`${API_URL}/clientes/${idCliente}/historial`, {
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
            bgColor: avatarColors[processedMovements.length % avatarColors.length],
            amountColor: '#FF5252',
          });
          item.abonos?.forEach((abono: any) => {
            processedMovements.push({
              id: `abono-${abono.id_abono}`,
              tipo: 'ABONO',
              descripcion: `Abono a ${item.credito.descripcion || 'Crédito'}`,
              fecha: abono.fecha_abono,
              monto: abono.monto,
              bgColor: avatarColors[processedMovements.length % avatarColors.length],
              amountColor: '#3EBF7A',
            });
          });
        });

        const sortedMovements = processedMovements
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        setMovements(sortedMovements);
      } catch (historyError: any) {
        console.error('Error cargando historial:', historyError);
        setMovements([]);
      }
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
