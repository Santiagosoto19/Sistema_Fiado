import { StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';

export const loginStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  topSection: {
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 40,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: COLORS.white,
    lineHeight: 42,
  },
  titleBrand: {
    fontSize: 34,
    fontWeight: '700',
    color: COLORS.white,
  },
  // Card blanca con esquinas redondeadas solo arriba
  card: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 50,
    paddingHorizontal: 22,
    paddingVertical: 15,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingRight: 18,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 22,
    paddingVertical: 15,
    fontSize: 15,
    color: COLORS.text,
  },
  eyeBtn: {
    padding: 4,
  },
  eyeIcon: {
    fontSize: 18,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: 50,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 8,
  },
  btnPrimaryDisabled: {
    opacity: 0.7,
  },
  btnPrimaryText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  forgotBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  forgotText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  btnOutline: {
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    marginBottom: 20,
  },
  btnOutlineText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
  },
  orText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 14,
  },
  googleBtn: {
    alignSelf: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingTop: 32,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  footerLink: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});