import { StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';
import { AppFonts } from '@/constants/theme';

const p = COLORS;

export const vistaUsuarioStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: p.primary,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: p.primary,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: '700',
    color: p.white,
  },
  welcomeSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  card: {
    flex: 1,
    backgroundColor: p.white,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  debtCard: {
    backgroundColor: p.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardTop: {
    alignItems: 'center',
    gap: 8,
  },
  cardSubtitle: {
    textAlign: 'center',
    fontSize: 13,
    fontFamily: AppFonts.semiBold,
    color: p.text,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: p.border,
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: AppFonts.semiBold,
    color: p.primary,
  },
  debtAmount: {
    fontSize: 30,
    fontFamily: AppFonts.black,
    marginTop: 2,
    color: p.primary,
  },
  debtDate: {
    fontSize: 11,
    fontFamily: AppFonts.regular,
    marginTop: -2,
    color: p.textMuted,
  },
  section: {
    marginTop: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: AppFonts.extraBold,
    marginBottom: 10,
    color: p.text,
  },
  progressWrap: {
    marginTop: 10,
  },
  progressPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
    backgroundColor: p.primary,
  },
  progressPillText: {
    fontSize: 11,
    fontFamily: AppFonts.black,
    color: p.white,
  },
  progressTrack: {
    height: 16,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: p.border,
    backgroundColor: p.inputBg,
  },
  progressFillBase: {
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    padding: 2,
    backgroundColor: p.primary,
  },
  progressFillAccent: {
    height: '100%',
    width: '100%',
    borderRadius: 999,
    backgroundColor: p.border,
  },
  confidenceBadge: {
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontFamily: AppFonts.extraBold,
    backgroundColor: p.primary,
    color: p.white,
  },
  motivationalText: {
    marginTop: 6,
    textAlign: 'center',
    fontSize: 11,
    fontFamily: AppFonts.regular,
    fontStyle: 'italic',
    color: p.textMuted,
  },
  movements: {
    marginTop: 10,
    gap: 12,
  },
  movementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 18,
    fontFamily: AppFonts.black,
    color: p.white,
  },
  movementTextColumn: {
    flex: 1,
  },
  movementDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: p.text,
    marginBottom: 2,
  },
  movementDate: {
    fontSize: 12,
    fontFamily: AppFonts.regular,
    color: p.textMuted,
  },
  movementAmount: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  ctaButton: {
    marginTop: 18,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: p.primary,
  },
  ctaButtonText: {
    fontSize: 12,
    fontFamily: AppFonts.extraBold,
    color: p.white,
  },
});
