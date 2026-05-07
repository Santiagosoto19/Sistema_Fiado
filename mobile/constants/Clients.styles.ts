import { StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';

export const clientStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  bellIcon: {
    fontSize: 20,
    color: COLORS.white,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 16,
    gap: 6,
  },
  subHeaderText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '500',
  },

  // Card principal
  card: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
  },

  // Buscador
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 50,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 13,
    fontSize: 14,
    color: COLORS.text,
  },
  searchBtn: {
    backgroundColor: COLORS.text,
    paddingHorizontal: 18,
    paddingVertical: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIcon: {
    color: COLORS.white,
    fontSize: 16,
  },

  // Filtros
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: '500',
  },
  filterTextActive: {
    color: COLORS.white,
  },

  // Lista
  listContent: {
    paddingBottom: 80,
  },
  clientCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 15,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 2,
  },
  clientSub: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  clientSubMora: {
    color: '#FF5252',
  },
  clientSubProximo: {
    color: '#FFA000',
  },
  activityDividerVertical: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
    marginHorizontal: 10,
  },
  amountCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  clientAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
  },

  // Badges
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 50,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeAlDia: {
    backgroundColor: '#E8F5EE',
  },
  badgeAlDiaText: {
    color: COLORS.primary,
  },
  badgeMora: {
    backgroundColor: '#FFE8E8',
  },
  badgeMoraText: {
    color: '#FF5252',
  },
  badgeProximo: {
    backgroundColor: '#FFF3E0',
  },
  badgeProximoText: {
    color: '#FFA000',
  },

  // Botón registrar
  btnRegistrar: {
    backgroundColor: COLORS.primary,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  btnRegistrarText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
});