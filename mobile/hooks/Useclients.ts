import { useState, useEffect } from 'react';

const API_URL = 'http://192.168.20.13:3000/api';

export type EstadoCliente = 'al_dia' | 'mora' | 'proximo' | 'sin_deuda';

export type Cliente = {
  id_cliente: number;
  nombre_completo: string;
  initials: string;
  bgColor: string;
  subtitulo: string;
  subtituloTipo: 'normal' | 'mora' | 'proximo';
  monto: string;
  estado: EstadoCliente;
};

type Filtro = 'todos' | 'mora' | 'al_dia' | 'sin_deuda';

const getInitials = (nombre: string) =>
  nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

const avatarColors = ['#4CAF50', '#FFC107', '#FF5252', '#2196F3', '#9C27B0', '#FF9800'];

const getAvatarColor = (id: number) => avatarColors[id % avatarColors.length];

export const useClients = (token: string) => {
  const [clientes, setClientes]         = useState<Cliente[]>([]);
  const [filtrados, setFiltrados]       = useState<Cliente[]>([]);
  const [busqueda, setBusqueda]         = useState('');
  const [filtroActivo, setFiltroActivo] = useState<Filtro>('todos');
  const [loading, setLoading]           = useState(true);
  const [total, setTotal]               = useState(0);

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [busqueda, filtroActivo, clientes]);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/clients`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();

      const mapped: Cliente[] = json.data.map((c: any) => ({
        id_cliente:      c.id_cliente,
        nombre_completo: c.nombre_completo,
        initials:        getInitials(c.nombre_completo),
        bgColor:         getAvatarColor(c.id_cliente),
        subtitulo:       c.subtitulo,
        subtituloTipo:   c.subtitulo_tipo,
        monto:           `$${Number(c.saldo_pendiente).toLocaleString('es-CO')},00`,
        estado:          c.estado_credito,
      }));

      setClientes(mapped);
      setTotal(mapped.length);
    } catch (err) {
      console.error('Error cargando clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let resultado = [...clientes];

    if (busqueda.trim()) {
      resultado = resultado.filter(c =>
        c.nombre_completo.toLowerCase().includes(busqueda.toLowerCase())
      );
    }


    if (filtroActivo !== 'todos') {
      resultado = resultado.filter(c => c.estado === filtroActivo);
    }

    setFiltrados(resultado);
  };

  const handleFiltro = (filtro: Filtro) => setFiltroActivo(filtro);

  const handleNuevoCliente = () => {
    // TODO: router.push('/clients/new');
  };

  const handleClientePress = (id: number) => {
    // TODO: router.push(`/clients/${id}`);
  };

  return {
    clientes: filtrados,
    busqueda,
    setBusqueda,
    filtroActivo,
    loading,
    total,
    handleFiltro,
    handleNuevoCliente,
    handleClientePress,
    refetch: fetchClientes,
  };
};