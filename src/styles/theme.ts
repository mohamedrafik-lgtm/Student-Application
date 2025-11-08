import { Colors } from './colors';

export const theme = {
  navigation: {
    bottomBar: {
      height: 60,
      backgroundColor: Colors.white,
      activeColor: Colors.primary,
      inactiveColor: Colors.textSecondary,
      borderRadius: 12,
      shadow: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: -2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 5,
      }
    }
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  typography: {
    heading1: {
      fontSize: 24,
      fontWeight: 'bold',
      color: Colors.textPrimary,
    },
    heading2: {
      fontSize: 20,
      fontWeight: 'bold',
      color: Colors.textPrimary,
    },
    heading3: {
      fontSize: 18,
      fontWeight: 'bold',
      color: Colors.textPrimary,
    },
    body: {
      fontSize: 16,
      color: Colors.textPrimary,
    },
    caption: {
      fontSize: 14,
      color: Colors.textSecondary,
    },
    small: {
      fontSize: 12,
      color: Colors.textSecondary,
    },
  },
  animations: {
    duration: {
      short: 150,
      medium: 300,
      long: 450,
    },
    scale: {
      pressed: 0.95,
      active: 1.05,
    }
  }
};