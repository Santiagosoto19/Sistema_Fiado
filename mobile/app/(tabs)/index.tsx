import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { styles } from '@/constants/home.styles';
import { COLORS } from '@/constants/colors';

const recentActivity = [
  {
    initials: 'MR',
    name: 'Maria Ruiz',
    subtitle: 'Pago Recibido Hoy',
    amount: '+$45.000,00',
    amountColor: COLORS.upToDate,
    bgColor: '#4CAF50',
  },
  {
    initials: 'JP',
    name: 'Juan Pedroza',
    subtitle: 'Nuevo Crédito Hoy',
    amount: '$80.000,00',
    amountColor: COLORS.amount,
    bgColor: '#FFC107',
  },
  {
    initials: 'LC',
    name: 'Luis Castro',
    subtitle: 'Vencido Hace 3 Días',
    amount: '$80.000,00',
    amountColor: COLORS.overdue,
    bgColor: '#FF5252',
  },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bg} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hola, Carlos</Text>
            <Text style={styles.storeName}>Tienda El Vecino, San Roque</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn}>
            <Text style={styles.bellIcon}>🔔</Text>
          </TouchableOpacity>
        </View>

        {/* Total por Cobrar */}
        <View style={styles.totalCard}>
          <View>
            <Text style={styles.totalLabel}>Total Por Cobrar</Text>
            <Text style={styles.totalAmount}>$1.284.500</Text>
            <Text style={styles.totalSub}>Actualizado Hoy</Text>
          </View>
          <View style={styles.totalIcon}>
            <Text style={{ fontSize: 38 }}>💵</Text>
          </View>
        </View>


        <View style={styles.statsRow}>
          <View style={[styles.statCard, { marginRight: 8 }]}>
            <Text style={styles.statLabel}>En mora</Text>
            <Text style={[styles.statAmount, { color: COLORS.overdue }]}>$7.783.00</Text>
            <View style={[styles.statBadge, { backgroundColor: COLORS.badge }]}>
              <Text style={[styles.statBadgeText, { color: COLORS.badgeText }]}>5 clientes</Text>
            </View>
          </View>
          <View style={[styles.statCard, { marginLeft: 8 }]}>
            <Text style={styles.statLabel}>Al día</Text>
            <Text style={[styles.statAmount, { color: COLORS.upToDate }]}>$7.783.00</Text>
            <View style={[styles.statBadge, { backgroundColor: COLORS.badgeGreen }]}>
              <Text style={[styles.statBadgeText, { color: COLORS.badgeGreenText }]}>10 clientes</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Actividad Reciente</Text>
        <View style={styles.activityCard}>
          {recentActivity.map((item, idx) => (
            <View
              key={idx}
              style={[
                styles.activityRow,
                idx < recentActivity.length - 1 && styles.activityDivider,
              ]}
            >
              <View style={[styles.avatar, { backgroundColor: item.bgColor }]}>
                <Text style={styles.avatarText}>{item.initials}</Text>
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityName}>{item.name}</Text>
                <Text style={styles.activitySub}>{item.subtitle}</Text>
              </View>
              <Text style={[styles.activityAmount, { color: item.amountColor }]}>
                {item.amount}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.btnOutline}>
            <Text style={styles.btnOutlineText}>+ Nuevo Crédito</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnFill}>
            <Text style={styles.btnFillText}>Registrar Pago</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}