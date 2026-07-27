import { useMemo } from 'react';
import { RuntimeConfigurationService } from '../core/configuration/RuntimeConfigurationService';

export default function useRuntimeConfiguration() {
  return useMemo(() => RuntimeConfigurationService.buildSummary(), []);
}
