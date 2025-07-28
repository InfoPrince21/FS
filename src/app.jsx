import 'src/global.css';

import { useEffect } from 'react';
import { Provider } from 'react-redux';

import { usePathname } from 'src/routes/hooks';

import { store } from 'src/store'; 
import { LocalizationProvider } from 'src/locales';
import { themeConfig, ThemeProvider } from 'src/theme';
import { I18nProvider } from 'src/locales/i18n-provider';

import { Snackbar } from 'src/components/snackbar';
import { ProgressBar } from 'src/components/progress-bar';
import { MotionLazy } from 'src/components/animate/motion-lazy';
import { SettingsDrawer, defaultSettings, SettingsProvider } from 'src/components/settings';

import { CheckoutProvider } from 'src/sections/checkout/context';

import { AuthProvider as SupabaseAuthProvider } from 'src/auth/context/supabase';

// ----------------------------------------------------------------------

const AuthProvider = SupabaseAuthProvider
// ----------------------------------------------------------------------

export default function App({ children }) {
  useScrollToTop();

  return (
    <Provider store={store}>
      <I18nProvider>
        <AuthProvider>
          <SettingsProvider defaultSettings={defaultSettings}>
            <LocalizationProvider>
              <ThemeProvider
                modeStorageKey={themeConfig.modeStorageKey}
                defaultMode={themeConfig.enableSystemMode ? 'system' : themeConfig.defaultMode}
              >
                <MotionLazy>
                  <CheckoutProvider>
                    <Snackbar />
                    <ProgressBar />
                    <SettingsDrawer defaultSettings={defaultSettings} />
                    {children}
                  </CheckoutProvider>
                </MotionLazy>
              </ThemeProvider>
            </LocalizationProvider>
          </SettingsProvider>
        </AuthProvider>
      </I18nProvider>
    </Provider>
  );
}

// ----------------------------------------------------------------------

function useScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
