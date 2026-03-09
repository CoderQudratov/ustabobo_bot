'use client';

import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import type { VehicleHistoryRes } from '@/lib/vehicleHistory';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function useVehicleHistory(plateOrId: string, page = 1) {
  const trimmed = plateOrId.trim();
  const isUuid = UUID_REGEX.test(trimmed);
  const normalized = isUuid ? trimmed : trimmed.toUpperCase().replace(/\s+/g, ' ');
  const enabled = normalized.length >= 2;

  return useQuery({
    queryKey: ['vehicle-history', normalized, page],
    queryFn: async () => {
      let vehicleId: string;
      if (isUuid) {
        vehicleId = trimmed;
      } else {
        const plateEncoded = encodeURIComponent(normalized);
        const vehicle = await apiGet<{ id: string }>(
          `/admin/vehicles/by-plate/${plateEncoded}`
        );
        vehicleId = vehicle.id;
      }
      return apiGet<VehicleHistoryRes>(
        `/admin/vehicles/${vehicleId}/history?page=${page}&limit=50`
      );
    },
    enabled,
  });
}
