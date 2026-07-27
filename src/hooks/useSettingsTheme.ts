import { useCallback, useMemo } from 'react';
import { useWorkspace } from '../contexts/workspace/WorkspaceContext';

/**
 * useSettingsTheme
 *
 * Hook especializado para Tema, Identidade Visual e Sessão do SettingsWorkspace.
 *
 * Responsabilidade:
 * - consumir o WorkspaceContext;
 * - expor apenas o domínio de tema e sessão;
 * - impedir que SettingsWorkspace dependa diretamente da estrutura completa do contexto;
 * - remover gradualmente o repasse manual de props pelo WorkspaceTabsRouter.
 */
export default function useSettingsTheme() {
  const workspace = useWorkspace();

  const {
    theme,
    setTheme,
    followSystem,
    setFollowSystem,
    onLogout,
  } = workspace.theme;

  const { user } = workspace.tenant;

  const selectTheme = useCallback(
    (nextTheme: string) => {
      setFollowSystem(false);
      setTheme(nextTheme);
    },
    [setFollowSystem, setTheme]
  );

  const toggleFollowSystem = useCallback(
    (value: boolean) => {
      setFollowSystem(value);
    },
    [setFollowSystem]
  );

  return useMemo(
    () => ({
      theme,
      followSystem,
      user,
      onLogout,
      selectTheme,
      toggleFollowSystem,
    }),
    [
      theme,
      followSystem,
      user,
      onLogout,
      selectTheme,
      toggleFollowSystem,
    ]
  );
}
