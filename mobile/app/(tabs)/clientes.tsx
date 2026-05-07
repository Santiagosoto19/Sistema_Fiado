import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import { Stack, useFocusEffect } from 'expo-router';
import { clientStyles as styles } from '@/constants/Clients.styles';
import { COLORS } from '@/constants/colors';
import { useClients, Cliente } from '@/hooks/Useclients';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Search, Bell, BadgeCheck } from 'lucide-react-native';

const FILTROS = [
  { key: 'todos',     label: 'Todos'     },
  { key: 'mora',      label: 'En Mora'   },
  { key: 'al_dia',    label: 'Al Día'    },
  { key: 'sin_deuda', label: 'Sin Deuda' },
];

const getBadgeStyle = (estado: string, styles: any) => {
  switch (estado) {
    case 'al_dia':  return { badge: styles.badgeAlDia,   text: styles.badgeAlDiaText,   label: 'Al Día'    };
    case 'mora':    return { badge: styles.badgeMora,    text: styles.badgeMoraText,    label: 'Mora'      };
    case 'proximo': return { badge: styles.badgeProximo, text: styles.badgeProximoText, label: 'Próximo'   };
    default:        return { badge: styles.badgeAlDia,   text: styles.badgeAlDiaText,   label: 'Sin Deuda' };
  }
};

const getSubtituloStyle = (tipo: string) => {
  switch (tipo) {
    case 'mora':    return styles.clientSubMora;
    case 'proximo': return styles.clientSubProximo;
    default:        return {};
  }
};

const ClienteItem = ({ item, onPress }: { item: Cliente; onPress: () => void }) => {
  const badge = getBadgeStyle(item.estado, styles);
  return (
    <TouchableOpacity style={styles.clientCard} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.avatar, { backgroundColor: item.bgColor }]}>
        <Text style={styles.avatarText}>{item.initials}</Text>
      </View>
      <View style={styles.clientInfo}>
        <Text style={styles.clientName}>{item.nombre_completo}</Text>
        <Text style={[styles.clientSub, getSubtituloStyle(item.subtituloTipo)]}>
          {item.subtitulo}
        </Text>
      </View>
      <View style={styles.activityDividerVertical} />
      <View style={styles.amountCol}>
        <Text style={styles.clientAmount}>{item.monto}</Text>
        <View style={[styles.badge, badge.badge]}>
          <Text style={[styles.badgeText, badge.text]}>{badge.label}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function ClientsScreen() {
  const [token, setToken]     = useState<string | null>(null);
  const [tendero, setTendero] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem('token').then(t => setToken(t));
      AsyncStorage.getItem('tendero').then(t => {
        if (t) setTendero(JSON.parse(t));
      });
    }, [])
  );

  const {
    clientes, busqueda, setBusqueda, filtroActivo,
    loading, total, handleFiltro, handleNuevoCliente, handleClientePress,
  } = useClients(token);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

        {/* Header */}
        <View style={styles.header}>
          <View style={{ width: 40 }} />
          <Text style={styles.headerTitle}>Clientes</Text>
          <TouchableOpacity style={styles.bellBtn}>
            <Bell size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Sub header */}
        <View style={styles.subHeader}>
          <BadgeCheck size={16} color={COLORS.white} />
          <Text style={styles.subHeaderText}> {total} Clientes Registrados</Text>
        </View>

        {/* Card blanca */}
        <View style={styles.card}>

          {/* Buscador */}
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar Cliente..."
              placeholderTextColor={COLORS.textMuted}
              value={busqueda}
              onChangeText={setBusqueda}
            />
            <TouchableOpacity style={styles.searchBtn}>
              <Search size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {/* Filtros */}
          <View style={styles.filtersRow}>
            {FILTROS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterBtn, filtroActivo === f.key && styles.filterBtnActive]}
                onPress={() => handleFiltro(f.key as any)}
              >
                <Text style={[styles.filterText, filtroActivo === f.key && styles.filterTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Lista */}
          {loading
            ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
            : (
              <FlatList
                data={clientes}
                keyExtractor={item => item.id_cliente.toString()}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <ClienteItem
                    item={item}
                    onPress={() => handleClientePress(item.id_cliente)}
                  />
                )}
                ListEmptyComponent={
                  <Text style={{ textAlign: 'center', color: COLORS.textMuted, marginTop: 40 }}>
                    No se encontraron clientes
                  </Text>
                }
              />
            )
          }

          {/* Botón registrar dentro de la card */}
          <TouchableOpacity style={styles.btnRegistrar} onPress={handleNuevoCliente}>
            <Text style={styles.btnRegistrarText}>+ Registrar Nuevo Cliente</Text>
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    </>
  );
}