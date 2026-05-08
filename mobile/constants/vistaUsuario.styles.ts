import { StyleSheet } from 'react-native';
import { Colors, AppFonts } from '@/constants/theme';

const p = Colors.light.palette;

export const vistaUsuarioStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: p.surface,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: p.surface,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 100,
  },
  debtCard: {
    backgroundColor: p.card,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    backgroundColor: p.successSoft2,
  },
  totalLabel: {
    fontSize: 12,
    fontFamily: AppFonts.semiBold,
    color: p.textMuted,
  },
  debtAmount: {
    fontSize: 28,
    fontFamily: AppFonts.black,
    marginTop: 2,
    color: p.text,
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
    color: p.text,
  },
  progressTrack: {
    height: 16,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: p.track,
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
    backgroundColor: p.successSoft2,
  },
  confidenceBadge: {
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontFamily: AppFonts.extraBold,
    backgroundColor: p.successSoft2,
    color: p.text,
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
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 18,
    fontFamily: AppFonts.black,
    color: p.text,
  },
  movementTextColumn: {
    flex: 1,
  },
  movementDesc: {
    fontSize: 13,
    fontFamily: AppFonts.semiBold,
    color: p.text,
  },
  movementDate: {
    fontSize: 10,
    fontFamily: AppFonts.regular,
    marginTop: 2,
    color: p.textMuted,
  },
  movementAmount: {
    fontSize: 12,
    fontFamily: AppFonts.semiBold,
    textAlign: 'right',
    color: p.text,
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
    color: p.text,
  },
});
