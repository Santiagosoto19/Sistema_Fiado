import { StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';

export const welcomeStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 0,
  },

  // Logo section
  logoSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  logoBox: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    marginBottom: -40,
  },
  logoImage: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLight: {
    fontSize: 42,
    fontFamily: 'Poppins_400Regular',
    color: COLORS.white,
    letterSpacing: -1,
  },
  brandBold: {
    fontSize: 42,
    fontFamily: 'Poppins_800ExtraBold',
    color: COLORS.text,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 15,
    fontFamily: 'Poppins_400Regular',
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: -8,
  },

  // Card de botones
  card: {
    width: '100%',
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 32,
    gap: 14,
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: 50,
    paddingVertical: 17,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: COLORS.white,
    fontSize: 16,
    fontFamily: 'Poppins_700Bold',
    letterSpacing: 0.3,
  },
  btnOutline: {
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  btnOutlineText: {
    color: COLORS.text,
    fontSize: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  footerText: {
    textAlign: 'center',
    color: COLORS.textMuted,
    fontSize: 12,
    fontFamily: 'Poppins_400Regular',
    marginTop: 8,
  },
});