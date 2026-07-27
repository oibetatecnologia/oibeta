import { useCallback, useEffect, useState } from 'react';
import { NotificationPreferenceService } from '../core/notifications/NotificationPreferenceService';
import type {
  NotificationPreference,
  UpdateNotificationPreferenceInput,
} from '../core/notifications/NotificationPreferenceTypes';

export default function useNotificationPreferences() {
  const [preference, setPreference] =
    useState<NotificationPreference>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      setPreference(
        await NotificationPreferenceService.get(),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : String(loadError),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const update = useCallback(
    async (input: UpdateNotificationPreferenceInput) => {
      setIsSaving(true);
      setError(undefined);

      try {
        const updated =
          await NotificationPreferenceService.update(input);
        setPreference(updated);
        return updated;
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? saveError.message
            : String(saveError),
        );
        throw saveError;
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  return {
    preference,
    isLoading,
    isSaving,
    error,
    refresh,
    update,
  };
}
